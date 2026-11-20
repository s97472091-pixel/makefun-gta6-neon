// Solana Bay — Five-star SBPD wanted system, pursuing cruisers, dismounting officers, bust timer & evasion countdown
import * as THREE from 'three';
import { CITY, WANTED_LEVELS, GAME_CONSTANTS, rngPick } from './config.js';

const COP_UNIFORM_MAT = new THREE.MeshStandardMaterial({ color: 0x1a2847, roughness: 0.75 });
const COP_PANTS_MAT = new THREE.MeshStandardMaterial({ color: 0x101829, roughness: 0.85 });
const COP_SKIN_MAT = new THREE.MeshStandardMaterial({ color: 0xdba57a, roughness: 0.75 });
const COP_BADGE_MAT = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.8, roughness: 0.25 });
const COP_GUN_MAT = new THREE.MeshStandardMaterial({ color: 0x22262e, metalness: 0.7, roughness: 0.35 });

function buildOfficerMesh() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.82;
  g.add(body);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.25), COP_UNIFORM_MAT);
  torso.position.y = 0.28;
  torso.castShadow = true;
  body.add(torso);

  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.03), COP_BADGE_MAT);
  badge.position.set(0.11, 0.36, 0.13);
  body.add(badge);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), COP_SKIN_MAT);
  head.position.y = 0.68;
  body.add(head);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.11, 0.32), COP_UNIFORM_MAT);
  cap.position.set(0, 0.84, 0.02);
  body.add(cap);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.18), COP_PANTS_MAT);
  legL.position.set(-0.12, -0.36, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.18), COP_PANTS_MAT);
  legR.position.set(0.12, -0.36, 0);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.15), COP_UNIFORM_MAT);
  armL.position.set(-0.29, 0.28, 0);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.15), COP_UNIFORM_MAT);
  armR.position.set(0.29, 0.28, 0);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.34), COP_GUN_MAT);
  gun.position.set(0, -0.22, 0.22);
  armR.add(gun);

  body.add(legL, legR, armL, armR);
  return { group: g, body, legL, legR, armL, armR };
}

export function createPoliceSystem(scene, city, vehicleMgr, rng) {
  const cruisers = []; // references to vehicle objects driven by police
  const officers = []; // dismounted SBPD officers

  const state = {
    stars: 0,
    heat: 0,
    spotted: false,
    evadeTimer: 0,
    evadeProgress: 0, // 0..1
    bustTimer: 0,
    bustProgress: 0, // 0..1
    spawnTimer: 1.5,
  };

  function recomputeStars(player) {
    let s = 0;
    for (let i = WANTED_LEVELS.length - 1; i >= 1; i--) {
      if (state.heat >= WANTED_LEVELS[i].heatMin) {
        s = i;
        break;
      }
    }
    if (s > state.stars) {
      state.stars = s;
      state.evadeTimer = 0;
      state.evadeProgress = 0;
      if (player && s > player.stats.maxWanted) {
        player.stats.maxWanted = s;
      }
    }
  }

  function addHeat(amount, player, minStars = 0) {
    state.heat = Math.min(400, state.heat + amount);
    if (minStars > 0) {
      const targetHeat = WANTED_LEVELS[Math.min(5, minStars)].heatMin;
      if (state.heat < targetHeat) state.heat = targetHeat;
    }
    state.evadeTimer = 0;
    state.evadeProgress = 0;
    recomputeStars(player);
  }

  function setStars(stars, player) {
    const clamped = Math.max(0, Math.min(5, stars));
    state.stars = clamped;
    state.heat = WANTED_LEVELS[clamped].heatMin;
    state.evadeTimer = 0;
    state.evadeProgress = 0;
    if (player && clamped > player.stats.maxWanted) {
      player.stats.maxWanted = clamped;
    }
    if (clamped === 0) clearWanted();
  }

  function clearWanted() {
    state.stars = 0;
    state.heat = 0;
    state.spotted = false;
    state.evadeTimer = 0;
    state.evadeProgress = 0;
    state.bustTimer = 0;
    state.bustProgress = 0;

    for (const c of cruisers) {
      if (c.driver === 'police') {
        c.driver = 'traffic';
        c.sirenOn = false;
      }
    }
    cruisers.length = 0;

    for (const off of officers) {
      scene.remove(off.mesh);
    }
    officers.length = 0;
  }

  function pickCruiserSpawn(playerPos) {
    // Spawn on an intersection 55..110m from player
    const candidates = [];
    for (const rx of CITY.ROAD_COORDS) {
      for (const rz of CITY.ROAD_COORDS) {
        const d = Math.hypot(rx - playerPos.x, rz - playerPos.z);
        if (d > 52 && d < 120) {
          candidates.push({ x: rx, z: rz });
        }
      }
    }
    if (candidates.length === 0) return { x: 0, z: 0 };
    return rngPick(rng, candidates);
  }

  function spawnCruiser(playerPos, forcedPos = null, forcedYaw = null) {
    const sp = forcedPos || pickCruiserSpawn(playerPos);
    const yaw = forcedYaw ?? Math.atan2(playerPos.x - sp.x, playerPos.z - sp.z);
    const v = vehicleMgr.spawnVehicle('police', sp.x, sp.z, yaw, {
      driver: 'police',
      sirenOn: true,
    });
    v.dismounted = false;
    v.chaseStuck = 0;
    cruisers.push(v);
    return v;
  }

  function spawnOfficer(x, z) {
    const built = buildOfficerMesh();
    const gy = city.getGroundHeight(x, z);
    built.group.position.set(x, gy, z);
    scene.add(built.group);

    const off = {
      mesh: built.group,
      parts: built,
      pos: new THREE.Vector3(x, gy, z),
      yaw: 0,
      hp: 65,
      alive: true,
      fireCooldown: 0.8 + rng() * 0.6,
      cycle: rng() * 6,
      downTimer: 0,
    };
    officers.push(off);
    return off;
  }

  function damageOfficer(off, amount, effects, onKill) {
    if (!off.alive) return;
    off.hp -= amount;
    if (effects) effects.spawnSpark(off.pos.x, off.pos.y + 1.1, off.pos.z, 0xff4d6d);
    if (off.hp <= 0) {
      off.alive = false;
      off.downTimer = 10;
      off.parts.body.rotation.x = Math.PI / 2;
      off.parts.body.position.y = 0.25;
      if (effects) effects.spawnPickup('ammo', off.pos.x, off.pos.z, 1);
      if (onKill) onKill(off);
    }
  }

  function update(dt, playerCtrl, effects, audio, callbacks = {}) {
    const player = playerCtrl.player;
    if (state.stars <= 0 || player.dead || player.busted) {
      state.bustTimer = Math.max(0, state.bustTimer - dt * 2);
      state.bustProgress = state.bustTimer / GAME_CONSTANTS.BUST_TIME;
      return;
    }

    const level = WANTED_LEVELS[state.stars];

    // Prune destroyed/stolen cruisers from active pursuit list
    for (let i = cruisers.length - 1; i >= 0; i--) {
      const c = cruisers[i];
      if (c.destroyed || c.driver !== 'police') {
        cruisers.splice(i, 1);
      }
    }

    // Spawn cruisers up to star limit
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && cruisers.length < level.maxCruisers) {
      spawnCruiser(player.pos);
      state.spawnTimer = level.spawnInterval;
    }

    let anySight = false;
    let closestOfficerDist = 999;

    // Update pursuing cruisers
    for (let i = 0; i < cruisers.length; i++) {
      const c = cruisers[i];
      const dx = player.pos.x - c.pos.x;
      const dz = player.pos.z - c.pos.z;
      const dist = Math.hypot(dx, dz);

      const hasLOS = dist < 74 && city.hasLineOfSight(c.pos.x, c.pos.y + 1.4, c.pos.z, player.pos.x, player.pos.y + 1.2, player.pos.z);
      if (hasLOS) anySight = true;

      // Steer toward player (or nearest road axis if building blocks direct line)
      let desiredX = dx;
      let desiredZ = dz;
      if (!hasLOS && dist > 18) {
        // Simple grid navigation bias: align to nearest road axis toward player
        const snapX = Math.round(c.pos.x / CITY.CELL_SIZE) * CITY.CELL_SIZE;
        const snapZ = Math.round(c.pos.z / CITY.CELL_SIZE) * CITY.CELL_SIZE;
        if (Math.abs(c.pos.x - snapX) < Math.abs(c.pos.z - snapZ)) {
          desiredX = (snapX - c.pos.x) * 2 + dx * 0.25;
          desiredZ = dz;
        } else {
          desiredX = dx;
          desiredZ = (snapZ - c.pos.z) * 2 + dz * 0.25;
        }
      }

      const targetYaw = Math.atan2(desiredX, desiredZ);
      let dyaw = targetYaw - c.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      c.yaw += dyaw * Math.min(1, dt * 4.2);
      c.steerAngle = Math.max(-0.45, Math.min(0.45, dyaw));

      // Brake & dismount officers when close to player (especially if player is on foot or slow)
      const playerSpeed = player.vehicle ? Math.abs(player.vehicle.speed) : 0;
      const shouldStop = dist < (player.vehicle && playerSpeed > 8 ? 9 : 16);
      const targetSpd = shouldStop ? 0 : Math.min(level.chaseSpeed, dist * 1.35 + 8);
      c.speed += (targetSpd - c.speed) * Math.min(1, dt * 3.8);
      c.vel.x = Math.sin(c.yaw) * c.speed;
      c.vel.z = Math.cos(c.yaw) * c.speed;

      // Dismount up to 2 officers when pulled up near target
      if (dist < 22 && !c.dismounted && officers.filter((o) => o.alive).length < level.maxOfficers) {
        c.dismounted = true;
        const sideX = Math.cos(c.yaw) * 2.2;
        const sideZ = -Math.sin(c.yaw) * 2.2;
        spawnOfficer(c.pos.x + sideX, c.pos.z + sideZ);
        if (state.stars >= 2 && officers.filter((o) => o.alive).length < level.maxOfficers) {
          spawnOfficer(c.pos.x - sideX, c.pos.z - sideZ);
        }
      }
      // If player zoomed far away, allow cruiser to keep chasing & re-dismount later
      if (dist > 45) c.dismounted = false;
    }

    // Update dismounted officers
    for (let i = officers.length - 1; i >= 0; i--) {
      const off = officers[i];
      if (!off.alive) {
        off.downTimer -= dt;
        if (off.downTimer <= 0) {
          scene.remove(off.mesh);
          officers.splice(i, 1);
        }
        continue;
      }

      const dx = player.pos.x - off.pos.x;
      const dz = player.pos.z - off.pos.z;
      const dist = Math.hypot(dx, dz);

      // Despawn officers left very far behind
      if (dist > 135) {
        scene.remove(off.mesh);
        officers.splice(i, 1);
        continue;
      }

      const hasLOS = dist < 68 && city.hasLineOfSight(off.pos.x, off.pos.y + 1.3, off.pos.z, player.pos.x, player.pos.y + 1.2, player.pos.z);
      if (hasLOS) anySight = true;
      if (dist < closestOfficerDist) closestOfficerDist = dist;

      // Face player
      off.yaw = Math.atan2(dx, dz);
      off.mesh.rotation.y = off.yaw;

      // Move closer if beyond comfortable firing/arrest distance
      const desiredStandOff = state.stars === 1 ? 3.2 : 13.5;
      if (dist > desiredStandOff || !hasLOS) {
        const spd = 4.9;
        const nx = off.pos.x + (dx / Math.max(0.1, dist)) * spd * dt;
        const nz = off.pos.z + (dz / Math.max(0.1, dist)) * spd * dt;
        const col = city.resolveCircleCollision(nx, nz, 0.45);
        off.pos.x = col.x;
        off.pos.z = col.z;
        off.pos.y = city.getGroundHeight(off.pos.x, off.pos.z);
        off.cycle += dt * 10;
        const sw = Math.sin(off.cycle) * 0.65;
        off.parts.legL.rotation.x = sw;
        off.parts.legR.rotation.x = -sw;
      } else {
        off.parts.legL.rotation.x *= 0.8;
        off.parts.legR.rotation.x *= 0.8;
      }

      off.parts.armR.rotation.x = hasLOS ? -1.45 : -0.35;
      off.mesh.position.copy(off.pos);

      // Shoot at player when in LOS (2+ stars, or if player fired at cops)
      off.fireCooldown -= dt;
      if (hasLOS && dist < 44 && off.fireCooldown <= 0 && (state.stars >= 2 || state.heat >= 32)) {
        off.fireCooldown = Math.max(0.45, 1.35 - state.stars * 0.14) + rng() * 0.35;
        const muzzle = new THREE.Vector3(off.pos.x, off.pos.y + 1.38, off.pos.z);
        const spread = (1.0 - level.shootAcc) * 2.2;
        const targetPt = new THREE.Vector3(
          player.pos.x + (rng() - 0.5) * spread,
          player.pos.y + 1.1 + (rng() - 0.5) * 0.6,
          player.pos.z + (rng() - 0.5) * spread
        );
        if (effects) effects.spawnTracer(muzzle, targetPt, 0xff6b6b);
        if (audio) audio.playGunshot('pistol', 0.45);

        if (rng() < level.shootAcc * (player.vehicle ? 0.55 : 0.82)) {
          if (player.vehicle) {
            vehicleMgr.damageVehicle(player.vehicle, 6 + state.stars * 1.5, effects, audio, callbacks.onVehicleExplode);
          } else {
            playerCtrl.takeDamage(6 + state.stars * 1.8);
          }
        }
      }
    }

    // Close-range BUST timer
    const playerSpeed = player.vehicle ? Math.abs(player.vehicle.speed) : Math.hypot(player.vel.x, player.vel.z);
    const canBust = closestOfficerDist < GAME_CONSTANTS.BUST_DISTANCE && (!player.vehicle || playerSpeed < 3.6);
    if (canBust) {
      state.bustTimer += dt;
      state.bustProgress = Math.min(1, state.bustTimer / GAME_CONSTANTS.BUST_TIME);
      if (state.bustTimer >= GAME_CONSTANTS.BUST_TIME) {
        player.busted = true;
        if (callbacks.onBusted) callbacks.onBusted();
      }
    } else {
      state.bustTimer = Math.max(0, state.bustTimer - dt * 1.5);
      state.bustProgress = state.bustTimer / GAME_CONSTANTS.BUST_TIME;
    }

    // Out-of-sight evasion countdown
    state.spotted = anySight;
    if (anySight) {
      state.evadeTimer = Math.max(0, state.evadeTimer - dt * 2.5);
    } else {
      state.evadeTimer += dt;
      if (state.evadeTimer >= level.evadeTime) {
        clearWanted();
        if (callbacks.onEvaded) callbacks.onEvaded();
        return;
      }
    }
    state.evadeProgress = level.evadeTime > 0 ? Math.min(1, state.evadeTimer / level.evadeTime) : 0;
  }

  return {
    state,
    cruisers,
    officers,
    addHeat,
    setStars,
    clearWanted,
    spawnCruiser,
    spawnOfficer,
    damageOfficer,
    update,
  };
}
