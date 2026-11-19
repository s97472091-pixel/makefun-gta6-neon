// SBPD Police system: 5-star wanted level, interceptor cruiser pursuit, dismounting officers, arrest & evasion.
import { ROAD_COORDS, WANTED_CONFIG, angleDiff, clamp, lerp } from './config.js';
import { buildCharacterMesh } from './player.js';

export function createPoliceManager(scene, rng, vehicleMgr) {
  let stars = 0;
  let heat = 0;
  let evadeTimer = 0;
  let evading = false;
  let bustTimer = 0;
  let spawnCooldown = 0;

  const units = [];    // Police vehicles spawned by SBPD
  const officers = []; // On-foot police officers

  function addHeat(amount, minStar = 0, audio = null, hud = null) {
    const prevStars = stars;
    heat = Math.min(500, heat + amount);
    const computed = Math.min(WANTED_CONFIG.maxStars, Math.floor(heat / 80) + (heat > 0 ? 1 : 0));
    stars = Math.max(stars, minStar, computed);
    if (stars > 0) {
      heat = Math.max(heat, (stars - 1) * 80 + 20);
      evadeTimer = 0;
      evading = false;
    }
    if (stars > prevStars) {
      audio?.playWantedUp();
      hud?.toast(`WANTED LEVEL ${stars} ★ — SBPD RESPONDING`);
    }
  }

  function clearWanted(hud = null, reason = null) {
    stars = 0;
    heat = 0;
    evadeTimer = 0;
    evading = false;
    bustTimer = 0;
    for (const u of units) {
      u.sirenOn = false;
      u.driver = 'ai';
    }
    for (const o of officers) {
      scene.remove(o.mesh);
    }
    officers.length = 0;
    if (reason) hud?.toast(reason);
  }

  function spawnOfficer(x, z, hp = 65) {
    // SBPD navy uniform
    const mesh = buildCharacterMesh(0x1b325f, 0x141d33, 0xd8a27c);
    mesh.userData.gun.visible = true;
    mesh.position.set(x, 0.22, z);
    scene.add(mesh);

    const o = {
      mesh,
      x,
      y: 0.22,
      z,
      yaw: 0,
      hp,
      maxHp: hp,
      dead: false,
      isPolice: true,
      fireCooldown: 0.6 + rng() * 0.8,
      walkCycle: 0,
      deathTimer: 0,
    };
    officers.push(o);
    return o;
  }

  function spawnPursuitCar(playerState) {
    // Pick a road intersection 65-115m away from the player
    let bestX = ROAD_COORDS[3];
    let bestZ = ROAD_COORDS[3];
    for (let tries = 0; tries < 14; tries++) {
      const rx = ROAD_COORDS[Math.floor(rng() * ROAD_COORDS.length)];
      const rz = ROAD_COORDS[Math.floor(rng() * ROAD_COORDS.length)];
      const d = Math.hypot(rx - playerState.x, rz - playerState.z);
      if (d >= 55 && d <= 135) {
        bestX = rx;
        bestZ = rz;
        break;
      }
    }
    const yaw = Math.atan2(playerState.x - bestX, playerState.z - bestZ);
    const car = vehicleMgr.spawnVehicle('interceptor', bestX, bestZ, yaw, {
      driver: 'police',
      sirenOn: true,
      despawnable: true,
    });
    car.policeState = 'chase';
    car.dismounted = false;
    units.push(car);
    return car;
  }

  function damageOfficer(o, dmg, fx, onKill) {
    if (o.dead) return;
    o.hp -= dmg;
    fx?.spawnSparks(o.x, o.y + 1.15, o.z, 5, 0xff4d6d);
    if (o.hp <= 0) {
      o.dead = true;
      o.deathTimer = 14;
      o.mesh.rotation.x = Math.PI * 0.48;
      o.mesh.position.y = 0.24;
      fx?.spawnPickup(o.x, o.z, 'cash', 90);
      onKill?.(o);
    }
  }

  function update(dt, city, player, fx, audio, hud, onBusted) {
    const p = player.state;

    // Cleanup destroyed or distant police cars
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if (u.driver === 'player') {
        // Player hijacked a police cruiser!
        units.splice(i, 1);
        continue;
      }
      const dist = Math.hypot(u.x - p.x, u.z - p.z);
      if (u.destroyed || (stars === 0 && dist > 110) || dist > 230) {
        if (u.destroyed) units.splice(i, 1);
        else {
          vehicleMgr.removeVehicle(u);
          units.splice(i, 1);
        }
      }
    }

    if (stars <= 0) {
      bustTimer = 0;
      return;
    }

    // Spawn pursuit units up to star cap
    spawnCooldown = Math.max(0, spawnCooldown - dt);
    const desiredUnits = WANTED_CONFIG.maxUnits[stars] || 1;
    const aliveOfficers = officers.filter((o) => !o.dead).length;
    if (units.length < desiredUnits && spawnCooldown <= 0) {
      spawnPursuitCar(p);
      spawnCooldown = Math.max(2.5, 6.2 - stars * 0.8);
    }

    let playerSpotted = false;

    // Update police interceptors
    for (const u of units) {
      if (u.destroyed || u.driver !== 'police') continue;
      const dx = p.x - u.x;
      const dz = p.z - u.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 62 && !city.rayHitsBuilding(u.x, u.z, p.x, p.z)) {
        playerSpotted = true;
      }

      // If close and player is on foot or slow, dismount officers
      const playerSlow = !p.vehicle || Math.abs(p.vehicle.speed) < 7;
      if (dist < 17 && playerSlow && !u.dismounted && aliveOfficers < (WANTED_CONFIG.maxCops[stars] || 2)) {
        u.dismounted = true;
        u.speed *= 0.2;
        u.vx *= 0.2;
        u.vz *= 0.2;
        const sideX = Math.cos(u.yaw) * 2.1;
        const sideZ = -Math.sin(u.yaw) * 2.1;
        spawnOfficer(u.x + sideX, u.z + sideZ, 55 + stars * 10);
        if (stars >= 2) spawnOfficer(u.x - sideX, u.z - sideZ, 55 + stars * 10);
        continue;
      }

      // Steer toward player (with slight obstacle avoidance)
      const desiredYaw = Math.atan2(dx, dz);
      const diff = angleDiff(u.yaw, desiredYaw);
      u.yaw += clamp(diff, -2.5 * dt, 2.5 * dt);
      u.steerAngle = clamp(diff, -0.45, 0.45);

      const maxChase = 24 + stars * 3.8;
      const targetSpd = dist < 11 ? 6 : maxChase;
      u.speed = lerp(u.speed, targetSpd, Math.min(1, dt * 3.2));
      u.vx = Math.sin(u.yaw) * u.speed;
      u.vz = Math.cos(u.yaw) * u.speed;
      u.x += u.vx * dt;
      u.z += u.vz * dt;

      const col = city.resolveCircleCollision(u.x, u.z, u.spec.width * 0.68);
      if (col.hit) {
        u.x = col.x;
        u.z = col.z;
        // Slide along wall
        u.yaw += (diff >= 0 ? 1 : -1) * 1.4 * dt;
        u.speed *= 0.55;
      }
    }

    // Update on-foot SBPD officers
    let closeCopForBust = false;
    for (let i = officers.length - 1; i >= 0; i--) {
      const o = officers[i];
      if (o.dead) {
        o.deathTimer -= dt;
        if (o.deathTimer <= 0) {
          scene.remove(o.mesh);
          officers.splice(i, 1);
        }
        continue;
      }

      const dx = p.x - o.x;
      const dz = p.z - o.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 150) {
        scene.remove(o.mesh);
        officers.splice(i, 1);
        continue;
      }

      const clearLOS = dist < 48 && !city.rayHitsBuilding(o.x, o.z, p.x, p.z);
      if (clearLOS) playerSpotted = true;

      const desiredYaw = Math.atan2(dx, dz);
      o.yaw += angleDiff(o.yaw, desiredYaw) * Math.min(1, dt * 9);

      // Chase if far, hold firing range at ~12m
      let moveSpd = 0;
      if (dist > 11 || !clearLOS) {
        moveSpd = 5.6 + stars * 0.25;
        o.x += Math.sin(o.yaw) * moveSpd * dt;
        o.z += Math.cos(o.yaw) * moveSpd * dt;
        const col = city.resolveCircleCollision(o.x, o.z, 0.52);
        o.x = col.x;
        o.z = col.z;
      }
      o.y = city.getGroundHeight(o.x, o.z);

      // Vehicle hit on officer
      if (p.vehicle && Math.hypot(p.vehicle.vx, p.vehicle.vz) > 7) {
        if (Math.hypot(o.x - p.vehicle.x, o.z - p.vehicle.z) < 2.3) {
          damageOfficer(o, 120, fx, () => {
            p.stats.enemiesDefeated++;
            addHeat(45, 2, audio, hud);
          });
          continue;
        }
      }

      // Close range arrest check (on foot or stopped car)
      if (dist < 3.4 && (!p.vehicle || Math.abs(p.vehicle.speed) < 3.5)) {
        closeCopForBust = true;
      }

      // Shoot at player when spotted & 2+ stars (or 1 star if distant)
      o.fireCooldown -= dt;
      if (clearLOS && dist < 38 && o.fireCooldown <= 0 && (stars >= 2 || dist > 6)) {
        o.fireCooldown = Math.max(0.55, 1.55 - stars * 0.16) + rng() * 0.35;
        const spread = 0.08;
        const tx = p.x + (rng() - 0.5) * spread * dist;
        const tz = p.z + (rng() - 0.5) * spread * dist;
        fx?.spawnTracer(o.x, o.y + 1.35, o.z, tx, p.y + 1.15, tz, 0xff6b8b);
        audio?.playGunshot('pistol');
        const hitChance = p.vehicle ? 0.35 : 0.55;
        if (rng() < hitChance) {
          if (p.vehicle) {
            vehicleMgr.applyVehicleDamage(p.vehicle, 6 + stars * 1.5, fx, audio);
          } else {
            player.takeDamage(6 + stars * 2.2);
          }
        }
      }

      // Animate officer
      const { leftLeg, rightLeg, leftArm, rightArm } = o.mesh.userData;
      if (moveSpd > 0.2) {
        o.walkCycle += dt * moveSpd * 1.8;
        const sw = Math.sin(o.walkCycle) * 0.65;
        leftLeg.rotation.x = sw;
        rightLeg.rotation.x = -sw;
        leftArm.rotation.x = -sw * 0.6;
      } else {
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
      }
      rightArm.rotation.x = -1.3;
      o.mesh.position.set(o.x, o.y, o.z);
      o.mesh.rotation.y = o.yaw;
    }

    // Arrest progress if pinned by officer
    if (closeCopForBust && !p.dead && !p.busted) {
      bustTimer += dt;
      if (bustTimer > 2.4) {
        p.busted = true;
        onBusted?.();
      }
    } else {
      bustTimer = Math.max(0, bustTimer - dt * 1.5);
    }

    // Evasion countdown when out of police line of sight
    if (playerSpotted) {
      evading = false;
      evadeTimer = 0;
    } else {
      evading = true;
      evadeTimer += dt;
      const req = WANTED_CONFIG.evadeDuration[stars] || 15;
      if (evadeTimer >= req) {
        clearWanted(hud, 'ESCAPED SBPD PURSUIT!');
      }
    }
  }

  function getState() {
    const req = WANTED_CONFIG.evadeDuration[stars] || 15;
    return {
      stars,
      evading,
      evadeProgress: stars > 0 ? clamp(evadeTimer / req, 0, 1) : 0,
      hasSirens: stars > 0 && units.some((u) => !u.destroyed && u.sirenOn),
    };
  }

  return {
    units,
    officers,
    addHeat,
    clearWanted,
    damageOfficer,
    update,
    getState,
  };
}
