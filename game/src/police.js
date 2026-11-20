// Solana Bay — 5-star SBPD wanted system, cruiser pursuit, dismounting officers, bust timer & evasion countdown.

import {
  ROAD_COORDS,
  WANTED_LEVELS,
  POLICE_CONFIG,
  clamp,
  lerp,
  lerpAngle,
  dist2D,
} from './config.js';
import { createCharacterMesh } from './player.js';

export function createPoliceSystem(scene, vehicleManager) {
  const state = {
    stars: 0,
    heat: 0,
    evadeProgress: 0, // 0..1 (1 = evaded)
    spotted: false,
    bustProgress: 0, // 0..1 (1 = busted)
    spawnCooldown: 0,
  };

  const cruisers = [];
  const officers = [];

  function syncStarsFromHeat() {
    let target = 0;
    for (let i = WANTED_LEVELS.length - 1; i >= 1; i--) {
      if (state.heat >= WANTED_LEVELS[i].heatMin) {
        target = i;
        break;
      }
    }
    if (target > state.stars) {
      state.stars = target;
      state.evadeProgress = 0;
    }
  }

  function addHeat(amount) {
    state.heat = clamp(state.heat + amount, 0, 320);
    state.evadeProgress = 0;
    state.spotted = true;
    syncStarsFromHeat();
  }

  function setStars(stars) {
    const s = clamp(Math.round(stars), 0, 5);
    state.stars = s;
    state.heat = WANTED_LEVELS[s].heatMin + (s > 0 ? 6 : 0);
    state.evadeProgress = 0;
    state.bustProgress = 0;
    state.spotted = s > 0;
    if (s === 0) clearPursuit();
  }

  function clearWanted() {
    state.stars = 0;
    state.heat = 0;
    state.evadeProgress = 0;
    state.bustProgress = 0;
    state.spotted = false;
    clearPursuit();
  }

  function clearPursuit() {
    for (const c of cruisers) {
      if (c.driver === 'police') {
        c.driver = 'none';
        c.sirenOn = false;
      }
      if (c.driver !== 'player') {
        vehicleManager.removeVehicle(c);
      }
    }
    cruisers.length = 0;
    for (const o of officers) {
      scene.remove(o.rig.root);
    }
    officers.length = 0;
  }

  function spawnOfficer(x, z) {
    const rig = createCharacterMesh(0x1b365d, 0x101824, 0xd8a27c);
    rig.gunProp.visible = true;
    rig.root.position.set(x, 0, z);
    scene.add(rig.root);

    const officer = {
      rig,
      x,
      y: 0,
      z,
      yaw: 0,
      hp: POLICE_CONFIG.officerHp,
      alive: true,
      fireCooldown: 0.7 + Math.random() * 0.5,
      walkCycle: 0,
      radius: 0.45,
    };
    officers.push(officer);
    return officer;
  }

  function spawnCruiserNear(px, pz) {
    // Pick a road coordinate at medium-long distance from player
    let bestX = px + 60;
    let bestZ = pz;
    let bestScore = Infinity;

    for (const rx of ROAD_COORDS) {
      for (const rz of ROAD_COORDS) {
        const d = dist2D(rx, rz, px, pz);
        if (d < POLICE_CONFIG.spawnMinDist || d > POLICE_CONFIG.spawnMaxDist) continue;
        const tooCloseToCar = vehicleManager.vehicles.some((v) => dist2D(v.x, v.z, rx, rz) < 12);
        if (tooCloseToCar) continue;
        const score = Math.abs(d - 68);
        if (score < bestScore) {
          bestScore = score;
          bestX = rx;
          bestZ = rz;
        }
      }
    }

    const yaw = Math.atan2(px - bestX, pz - bestZ);
    const cruiser = vehicleManager.spawnVehicle('police', bestX, bestZ, yaw, {
      driver: 'police',
      sirenOn: true,
    });
    cruisers.push(cruiser);
    return cruiser;
  }

  function damageOfficer(officer, amount, effects, callbacks = {}) {
    if (!officer.alive) return;
    officer.hp -= amount;
    if (officer.hp <= 0) {
      officer.alive = false;
      scene.remove(officer.rig.root);
      const idx = officers.indexOf(officer);
      if (idx !== -1) officers.splice(idx, 1);
      if (effects) effects.spawnPickup('cash', officer.x, officer.z, 65);
      addHeat(24);
      if (callbacks.onOfficerKilled) callbacks.onOfficerKilled(officer);
    }
  }

  function update(dt, city, player, effects, audio, callbacks = {}) {
    const ps = player.state;
    if (state.stars <= 0 || ps.dead || ps.busted) {
      state.bustProgress = 0;
      return;
    }

    const tier = WANTED_LEVELS[state.stars];

    // Prune stolen/destroyed/faraway cruisers
    for (let i = cruisers.length - 1; i >= 0; i--) {
      const c = cruisers[i];
      if (c.destroyed || c.driver === 'player' || dist2D(c.x, c.z, ps.x, ps.z) > 175) {
        if (c.driver !== 'player' && dist2D(c.x, c.z, ps.x, ps.z) > 175) {
          vehicleManager.removeVehicle(c);
        }
        cruisers.splice(i, 1);
      }
    }

    // Spawn interceptors up to wanted tier cap
    state.spawnCooldown -= dt;
    if (cruisers.length < tier.maxCars && state.spawnCooldown <= 0) {
      spawnCruiserNear(ps.x, ps.z);
      state.spawnCooldown = Math.max(2.2, 5.2 - state.stars * 0.6);
    }

    let anySight = false;
    let closeCop = false;

    // Update police cruisers
    for (let i = 0; i < cruisers.length; i++) {
      const c = cruisers[i];
      if (c.driver !== 'police') continue;

      const d = dist2D(c.x, c.z, ps.x, ps.z);
      const canSee =
        d < POLICE_CONFIG.sightRange &&
        city.hasLineOfSight(c.x, 1.5, c.z, ps.x, ps.y + 1.4, ps.z);
      if (canSee) anySight = true;

      if (d < POLICE_CONFIG.bustRange + 2.2) closeCop = true;

      // Pursuit steering toward player with light obstacle avoidance
      const targetYaw = Math.atan2(ps.x - c.x, ps.z - c.z);
      c.yaw = lerpAngle(c.yaw, targetYaw, clamp(dt * 3.8, 0, 1));
      const desiredSpeed =
        d < 13 ? 8 : c.spec.maxSpeed * 0.72 * tier.copSpeedScale;
      c.speed = lerp(c.speed, desiredSpeed, clamp(dt * 2.8, 0, 1));
      c.vx = Math.sin(c.yaw) * c.speed;
      c.vz = Math.cos(c.yaw) * c.speed;
      c.sirenOn = true;

      // Dismount officers when close enough and under officer cap
      if (
        !c.dismounted &&
        d < POLICE_CONFIG.dismountDistance &&
        officers.length < tier.maxOfficers
      ) {
        c.dismounted = true;
        const sideX = Math.cos(c.yaw) * 2.4;
        const sideZ = -Math.sin(c.yaw) * 2.4;
        spawnOfficer(c.x + sideX, c.z + sideZ);
        if (officers.length < tier.maxOfficers && state.stars >= 2) {
          spawnOfficer(c.x - sideX, c.z - sideZ);
        }
      }
    }

    // Update dismounted officers
    for (let i = officers.length - 1; i >= 0; i--) {
      const o = officers[i];
      if (!o.alive) continue;

      const d = dist2D(o.x, o.z, ps.x, ps.z);
      if (d > 140) {
        scene.remove(o.rig.root);
        officers.splice(i, 1);
        continue;
      }

      // Check if player ran over the officer
      if (ps.vehicle && Math.hypot(ps.vehicle.vx, ps.vehicle.vz) > 7.5 && d < ps.vehicle.radius + o.radius) {
        damageOfficer(o, 120, effects, callbacks);
        if (audio) audio.playCrash(0.4);
        continue;
      }

      const canSee =
        d < POLICE_CONFIG.sightRange &&
        city.hasLineOfSight(o.x, 1.5, o.z, ps.x, ps.y + 1.4, ps.z);
      if (canSee) anySight = true;
      if (d < POLICE_CONFIG.bustRange) closeCop = true;

      const targetYaw = Math.atan2(ps.x - o.x, ps.z - o.z);
      o.yaw = lerpAngle(o.yaw, targetYaw, clamp(dt * 8, 0, 1));

      if (d > 11 || !canSee) {
        const nx = o.x + Math.sin(o.yaw) * POLICE_CONFIG.officerSpeed * dt;
        const nz = o.z + Math.cos(o.yaw) * POLICE_CONFIG.officerSpeed * dt;
        const col = city.resolveCircleCollision(nx, nz, o.radius);
        o.x = col.x;
        o.z = col.z;
        o.walkCycle += dt * 9.5;
        const swing = Math.sin(o.walkCycle) * 0.6;
        o.rig.leftLeg.rotation.x = swing;
        o.rig.rightLeg.rotation.x = -swing;
      } else {
        o.rig.leftLeg.rotation.x = 0;
        o.rig.rightLeg.rotation.x = 0;
      }

      o.rig.rightArm.rotation.x = canSee ? -1.45 : 0;
      o.y = city.getGroundHeight(o.x, o.z);
      o.rig.root.position.set(o.x, o.y, o.z);
      o.rig.root.rotation.y = o.yaw;

      // Shoot at player when in sight
      o.fireCooldown -= dt;
      if (canSee && d < 46 && o.fireCooldown <= 0) {
        o.fireCooldown = POLICE_CONFIG.officerFireRate * (1.25 - state.stars * 0.1);
        const start = { x: o.x, y: o.y + 1.45, z: o.z };
        const end = {
          x: ps.x + (Math.random() - 0.5) * 1.4,
          y: ps.y + 1.2 + (Math.random() - 0.5) * 0.6,
          z: ps.z + (Math.random() - 0.5) * 1.4,
        };
        if (effects) effects.spawnTracer(start, end, 0xffd166);
        if (audio) audio.playGunshot('pistol', 0.45);
        if (Math.random() < tier.shootAccuracy) {
          if (ps.vehicle) {
            vehicleManager.damageVehicle(ps.vehicle, 6, effects, audio, callbacks.onVehicleExplode);
            if (Math.random() < 0.35) player.takeDamage(POLICE_CONFIG.officerDamage * 0.6);
          } else {
            player.takeDamage(POLICE_CONFIG.officerDamage);
          }
        }
      }
    }

    state.spotted = anySight;

    // Out-of-sight evasion countdown
    if (anySight) {
      state.evadeProgress = Math.max(0, state.evadeProgress - dt * 0.35);
    } else {
      state.evadeProgress += dt / Math.max(6, tier.evadeSeconds);
      if (state.evadeProgress >= 1) {
        clearWanted();
        if (callbacks.onEvaded) callbacks.onEvaded();
        return;
      }
    }

    // Close-range bust timer when player is slow or on foot next to police
    const playerSpeed = ps.vehicle
      ? Math.hypot(ps.vehicle.vx, ps.vehicle.vz)
      : Math.hypot(ps.vx, ps.vz);
    if (closeCop && playerSpeed < POLICE_CONFIG.bustSpeedThreshold) {
      state.bustProgress += dt / POLICE_CONFIG.bustSeconds;
      if (state.bustProgress >= 1) {
        ps.busted = true;
        if (callbacks.onBusted) callbacks.onBusted();
      }
    } else {
      state.bustProgress = Math.max(0, state.bustProgress - dt * 0.8);
    }
  }

  return {
    state,
    cruisers,
    officers,
    addHeat,
    setStars,
    clearWanted,
    spawnCruiserNear,
    spawnOfficer,
    damageOfficer,
    update,
  };
}
