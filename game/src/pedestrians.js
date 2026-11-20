// Solana Bay — sidewalk & boardwalk pedestrians who stroll, panic from gunfire/crashes, react to impacts & drop cash.

import { CITY, BLOCK_COORDS, createPRNG, clamp, lerpAngle, dist2D } from './config.js';
import { createCharacterMesh } from './player.js';

const SHIRT_PALETTE = [0xff5e7e, 0xffbe0b, 0x3a86ff, 0x06d6a0, 0xfb5607, 0xf8f9fa, 0xb5179e, 0x4cc9f0];
const PANTS_PALETTE = [0x1f242c, 0x364958, 0xd8c3a5, 0x4a4e69, 0x2b2d42];
const SKIN_PALETTE = [0xf1c29b, 0xd9a074, 0xb87a52, 0x8d5534, 0xe8b594];

export function createPedestrianManager(scene, seed = 1) {
  const rand = createPRNG(seed * 6131 + 79);
  const peds = [];

  function pickSidewalkSpot() {
    if (rand() < 0.25) {
      // Boardwalk stroller
      return {
        x: CITY.boardwalkStart + 2.2 + rand() * (CITY.boardwalkEnd - CITY.boardwalkStart - 4.4),
        z: (rand() * 2 - 1) * (CITY.halfSpan - 12),
        onBoardwalk: true,
      };
    }
    const bx = BLOCK_COORDS[Math.floor(rand() * BLOCK_COORDS.length)];
    const bz = BLOCK_COORDS[Math.floor(rand() * BLOCK_COORDS.length)];
    const edge = CITY.blockSize * 0.5 - 1.5;
    const side = Math.floor(rand() * 4);
    const along = (rand() * 2 - 1) * (edge - 1.5);
    if (side === 0) return { x: bx + edge, z: bz + along, onBoardwalk: false };
    if (side === 1) return { x: bx - edge, z: bz + along, onBoardwalk: false };
    if (side === 2) return { x: bx + along, z: bz + edge, onBoardwalk: false };
    return { x: bx + along, z: bz - edge, onBoardwalk: false };
  }

  function spawnPed() {
    const spot = pickSidewalkSpot();
    const shirt = SHIRT_PALETTE[Math.floor(rand() * SHIRT_PALETTE.length)];
    const pants = PANTS_PALETTE[Math.floor(rand() * PANTS_PALETTE.length)];
    const skin = SKIN_PALETTE[Math.floor(rand() * SKIN_PALETTE.length)];
    const rig = createCharacterMesh(shirt, pants, skin);
    rig.root.position.set(spot.x, 0, spot.z);
    scene.add(rig.root);

    const ped = {
      rig,
      x: spot.x,
      y: 0,
      z: spot.z,
      vx: 0,
      vz: 0,
      yaw: rand() * Math.PI * 2,
      hp: 40,
      alive: true,
      respawnTimer: 0,
      fleeTimer: 0,
      fleeX: 0,
      fleeZ: 0,
      wanderTimer: 2 + rand() * 5,
      walkCycle: rand() * 6,
      speed: 2.1 + rand() * 0.9,
      cashValue: 25 + Math.floor(rand() * 55),
      radius: 0.42,
    };
    peds.push(ped);
    return ped;
  }

  function spawnInitial(count = 36) {
    for (let i = 0; i < count; i++) spawnPed();
  }

  function scareAround(x, z, radius = 34, duration = 7) {
    for (const p of peds) {
      if (!p.alive) continue;
      if (dist2D(p.x, p.z, x, z) <= radius) {
        p.fleeTimer = Math.max(p.fleeTimer, duration);
        p.fleeX = x;
        p.fleeZ = z;
      }
    }
  }

  function killPed(p, effects, callbacks = {}) {
    if (!p.alive) return;
    p.alive = false;
    p.respawnTimer = 16;
    p.rig.root.rotation.x = -Math.PI * 0.48;
    p.rig.root.position.y = p.y + 0.16;
    if (effects) {
      effects.spawnPickup('cash', p.x, p.z, p.cashValue);
    }
    if (callbacks.onPedKilled) callbacks.onPedKilled(p);
  }

  function damagePed(p, amount, effects, callbacks = {}) {
    if (!p.alive) return;
    p.hp -= amount;
    p.fleeTimer = 8;
    if (p.hp <= 0) {
      killPed(p, effects, callbacks);
    }
  }

  function update(dt, city, vehicles, effects, audio, callbacks = {}) {
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      if (!p.alive) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          const spot = pickSidewalkSpot();
          p.x = spot.x;
          p.z = spot.z;
          p.hp = 40;
          p.alive = true;
          p.fleeTimer = 0;
          p.rig.root.rotation.x = 0;
        }
        continue;
      }

      // Check vehicle impacts
      for (let j = 0; j < vehicles.length; j++) {
        const v = vehicles[j];
        const vSpd = Math.hypot(v.vx, v.vz);
        if (vSpd < 3.5) continue;
        const d = dist2D(p.x, p.z, v.x, v.z);
        if (d < v.radius + p.radius) {
          if (vSpd > 7.5) {
            killPed(p, effects, callbacks);
            if (effects) effects.spawnSparks(p.x, 0.8, p.z, 5);
            if (audio && v.driver === 'player') audio.playCrash(0.35);
            if (callbacks.onPedHitByPlayer && v.driver === 'player') {
              callbacks.onPedHitByPlayer(p);
            }
            break;
          } else {
            // Bump away & panic
            const nx = (p.x - v.x) / (d || 1);
            const nz = (p.z - v.z) / (d || 1);
            p.x += nx * 1.1;
            p.z += nz * 1.1;
            p.fleeTimer = 6;
            p.fleeX = v.x;
            p.fleeZ = v.z;
          }
        }
      }
      if (!p.alive) continue;

      let moveSpeed = p.speed;
      if (p.fleeTimer > 0) {
        p.fleeTimer -= dt;
        const dx = p.x - p.fleeX;
        const dz = p.z - p.fleeZ;
        const targetYaw = Math.atan2(dx, dz);
        p.yaw = lerpAngle(p.yaw, targetYaw, clamp(dt * 8, 0, 1));
        moveSpeed = 6.2;
      } else {
        p.wanderTimer -= dt;
        if (p.wanderTimer <= 0) {
          // Turn along cardinal sidewalk directions
          const cardinals = [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5];
          p.yaw = cardinals[Math.floor(rand() * cardinals.length)] + (rand() - 0.5) * 0.25;
          p.wanderTimer = 3.5 + rand() * 5.5;
        }
      }

      const nx = p.x + Math.sin(p.yaw) * moveSpeed * dt;
      const nz = p.z + Math.cos(p.yaw) * moveSpeed * dt;
      const col = city.resolveCircleCollision(nx, nz, p.radius);
      p.x = col.x;
      p.z = col.z;
      if (col.hit) {
        p.yaw += Math.PI * 0.5 + (rand() - 0.5) * 0.5;
      }

      p.y = city.getGroundHeight(p.x, p.z);
      p.walkCycle += dt * moveSpeed * 1.8;
      const swing = Math.sin(p.walkCycle) * 0.55;
      p.rig.leftLeg.rotation.x = swing;
      p.rig.rightLeg.rotation.x = -swing;
      p.rig.leftArm.rotation.x = p.fleeTimer > 0 ? -2.2 : -swing * 0.6;
      p.rig.rightArm.rotation.x = p.fleeTimer > 0 ? -2.2 : swing * 0.6;
      p.rig.root.position.set(p.x, p.y, p.z);
      p.rig.root.rotation.y = p.yaw;
    }
  }

  return {
    peds,
    spawnInitial,
    scareAround,
    damagePed,
    update,
  };
}
