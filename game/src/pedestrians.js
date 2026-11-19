// Pedestrians: coastal crowd AI strolling sidewalks, beachgoers, fleeing from shots & vehicle impacts.
import { CITY, ROAD_COORDS, angleDiff, lerp } from './config.js';
import { buildCharacterMesh } from './player.js';

export function createPedestrianManager(scene, rng) {
  const peds = [];
  const shirtPalette = [0xff6b8b, 0x2ee6d6, 0xffd166, 0xff9a56, 0xf4f1ea, 0x6c8cff, 0x80ed99, 0xe07a5f];
  const pantsPalette = [0x22293d, 0x3b4252, 0xd9cbb8, 0x4a3b47, 0x2b506e];
  const skinPalette = [0xf2c29b, 0xd89e76, 0xb87a52, 0x8d5524, 0xe5b18a];

  function spawnPed(x, z) {
    const shirt = shirtPalette[Math.floor(rng() * shirtPalette.length)];
    const pants = pantsPalette[Math.floor(rng() * pantsPalette.length)];
    const skin = skinPalette[Math.floor(rng() * skinPalette.length)];
    const mesh = buildCharacterMesh(shirt, pants, skin);
    mesh.position.set(x, 0.22, z);
    scene.add(mesh);

    const p = {
      mesh,
      x,
      y: 0.22,
      z,
      yaw: rng() * Math.PI * 2,
      speed: 1.9 + rng() * 0.9,
      hp: 40,
      dead: false,
      fleeTimer: 0,
      fleeX: 0,
      fleeZ: 0,
      turnTimer: 1 + rng() * 4,
      walkCycle: rng() * 6,
      respawnTimer: 0,
    };
    peds.push(p);
    return p;
  }

  function spawnInitialCrowd(count = 36) {
    for (let i = 0; i < count; i++) {
      // Half on sidewalks near avenues, a quarter on Miramar Beach boardwalk
      if (i < 9) {
        spawnPed(235 + rng() * 14, -190 + rng() * 380);
      } else {
        const rx = ROAD_COORDS[Math.floor(rng() * ROAD_COORDS.length)];
        const side = rng() < 0.5 ? 1 : -1;
        const x = rx + side * (CITY.roadWidth * 0.5 + 2.2);
        const z = -195 + rng() * 390;
        spawnPed(x, z);
      }
    }
  }

  function scareAround(x, z, radius = 26) {
    for (const p of peds) {
      if (p.dead) continue;
      if (Math.hypot(p.x - x, p.z - z) < radius) {
        p.fleeTimer = 6 + rng() * 4;
        p.fleeX = x;
        p.fleeZ = z;
      }
    }
  }

  function damagePed(p, dmg, fx, onKill) {
    if (p.dead) return;
    p.hp -= dmg;
    p.fleeTimer = 8;
    fx?.spawnSparks(p.x, p.y + 1.1, p.z, 4, 0xff4d6d);
    if (p.hp <= 0) {
      p.dead = true;
      p.respawnTimer = 20;
      p.mesh.rotation.x = Math.PI * 0.48;
      p.mesh.position.y = 0.24;
      fx?.spawnPickup(p.x, p.z, 'cash', 35 + Math.floor(rng() * 55));
      onKill?.(p);
    }
  }

  function update(dt, city, vehicles, playerState, fx, callbacks = {}) {
    for (const p of peds) {
      if (p.dead) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          // Respawn away from player
          const rx = ROAD_COORDS[Math.floor(rng() * ROAD_COORDS.length)];
          p.x = rx + (CITY.roadWidth * 0.5 + 2.2);
          p.z = -180 + rng() * 360;
          if (Math.hypot(p.x - playerState.x, p.z - playerState.z) > 45) {
            p.dead = false;
            p.hp = 40;
            p.fleeTimer = 0;
            p.mesh.rotation.x = 0;
          }
        }
        continue;
      }

      let moveSpeed = p.speed;
      if (p.fleeTimer > 0) {
        p.fleeTimer -= dt;
        moveSpeed = 6.2;
        const desired = Math.atan2(p.x - p.fleeX, p.z - p.fleeZ);
        p.yaw += angleDiff(p.yaw, desired) * Math.min(1, dt * 8);
      } else {
        p.turnTimer -= dt;
        if (p.turnTimer <= 0) {
          p.turnTimer = 2.5 + rng() * 4.5;
          p.yaw += (rng() - 0.5) * 1.4;
        }
      }

      p.x += Math.sin(p.yaw) * moveSpeed * dt;
      p.z += Math.cos(p.yaw) * moveSpeed * dt;

      const col = city.resolveCircleCollision(p.x, p.z, 0.5);
      if (col.hit) {
        p.x = col.x;
        p.z = col.z;
        p.yaw += Math.PI * 0.75 + rng() * 0.5;
      }

      p.y = city.getGroundHeight(p.x, p.z);

      // Check vehicle run-over collisions
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const spd = Math.hypot(v.vx, v.vz);
        if (spd < 4.5) continue;
        const dx = p.x - v.x;
        const dz = p.z - v.z;
        if (dx * dx + dz * dz < 3.6) {
          damagePed(p, spd * 3.5, fx, () => {
            if (v.driver === 'player') callbacks.onPlayerHitPed?.(p);
          });
          if (!p.dead) {
            p.fleeTimer = 6;
            p.fleeX = v.x;
            p.fleeZ = v.z;
          }
          break;
        }
      }

      // Limb animation
      p.walkCycle += dt * moveSpeed * 2.1;
      const swing = Math.sin(p.walkCycle) * 0.65;
      const { leftLeg, rightLeg, leftArm, rightArm } = p.mesh.userData;
      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
      leftArm.rotation.x = -swing * 0.7;
      rightArm.rotation.x = swing * 0.7;

      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y = lerp(p.mesh.rotation.y, p.yaw, Math.min(1, dt * 10));
    }
  }

  return {
    peds,
    spawnPed,
    spawnInitialCrowd,
    scareAround,
    damagePed,
    update,
  };
}
