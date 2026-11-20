// Solana Bay — Sidewalk, Boardwalk & Market Pedestrians with Fleeing & Cash Drops
import * as THREE from 'three';
import { ROAD_LINES, createRng, pick, randRange } from './config.js';
import { buildCharacterRig } from './player.js';

const JACKET_COLORS = [0xf43f5e, 0x10b981, 0xf59e0b, 0x3b82f6, 0xa855f7, 0xec4899, 0x14b8a6, 0xe2e8f0];
const PANTS_COLORS = [0x1e293b, 0x334155, 0x475569, 0x3f3f46, 0x1d4ed8, 0x713f12];
const SKIN_COLORS = [0xf5cba7, 0xe0ac69, 0xc68642, 0x8d5524, 0xd9a077];
const HAIR_COLORS = [0x111827, 0x3b2f2f, 0x78350f, 0xd97706, 0x4b5563];

export function createPedestrianSystem(scene, city, seed = 1) {
  const rng = createRng(seed * 9137 + 19);
  const peds = [];
  const cashDrops = [];
  let nextId = 1;

  const cashGeo = new THREE.BoxGeometry(0.42, 0.14, 0.24);
  const cashMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.65,
    roughness: 0.4,
  });

  function spawnPed({ x, z, zone = 'sidewalk', yaw = null } = {}) {
    const rig = buildCharacterRig({
      jacketColor: pick(rng, JACKET_COLORS),
      pantsColor: pick(rng, PANTS_COLORS),
      skinColor: pick(rng, SKIN_COLORS),
      hairColor: pick(rng, HAIR_COLORS),
      shirtColor: 0xfef9c3,
      scale: randRange(rng, 0.94, 1.04),
    });
    const initYaw = yaw !== null ? yaw : rng() * Math.PI * 2;
    rig.root.position.set(x, 0.24, z);
    rig.root.rotation.y = initYaw;
    scene.add(rig.root);

    const ped = {
      id: nextId++,
      rig,
      x,
      y: 0.24,
      z,
      yaw: initYaw,
      zone,
      speed: randRange(rng, 1.7, 2.5),
      walkPhase: rng() * Math.PI * 2,
      turnTimer: randRange(rng, 2.5, 6.5),
      panicTimer: 0,
      panicDirX: 0,
      panicDirZ: 0,
      hp: 45,
      alive: true,
      radius: 0.48,
      cashAmount: Math.round(randRange(rng, 18, 65)),
    };
    peds.push(ped);
    return ped;
  }

  function populatePedestrians(count = 34) {
    // Market shoppers in Pasar Senja (cx=90, cz=30)
    const marketSpots = [
      [84, 24], [95, 27], [88, 36], [93, 20], [82, 34], [96, 35], [89, 29], [85, 42],
    ];
    for (const [mx, mz] of marketSpots) {
      spawnPed({ x: mx, z: mz, zone: 'market' });
    }

    // Boardwalk strollers along z = 194..198
    for (let i = 0; i < 10; i++) {
      const bx = -140 + i * 31 + randRange(rng, -5, 5);
      const bz = randRange(rng, 193, 199);
      spawnPed({ x: bx, z: bz, zone: 'boardwalk', yaw: i % 2 === 0 ? Math.PI * 0.5 : -Math.PI * 0.5 });
    }

    // Sidewalk pedestrians across city grid
    const remaining = Math.max(0, count - peds.length);
    for (let i = 0; i < remaining; i++) {
      const rx = ROAD_LINES[(i * 3) % ROAD_LINES.length];
      const rz = ROAD_LINES[(i * 2 + 1) % ROAD_LINES.length];
      const sx = rx + (i % 2 === 0 ? 10.5 : -10.5);
      const sz = rz + randRange(rng, -24, 24);
      const safe = city.resolveCircleCollisions(sx, sz, 0.6);
      spawnPed({ x: safe.x, z: safe.z, zone: 'sidewalk' });
    }
  }

  function dropCash(x, z, amount) {
    const mesh = new THREE.Mesh(cashGeo, cashMat);
    mesh.position.set(x, 0.38, z);
    scene.add(mesh);
    cashDrops.push({ mesh, x, z, amount, age: 0 });
  }

  function alertPanic(originX, originZ, radius = 38) {
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      if (!p.alive) continue;
      const dx = p.x - originX;
      const dz = p.z - originZ;
      const dist = Math.hypot(dx, dz);
      if (dist < radius) {
        p.panicTimer = 7.5;
        const len = Math.max(0.01, dist);
        p.panicDirX = dx / len;
        p.panicDirZ = dz / len;
      }
    }
  }

  function damagePed(ped, amount, onKilled) {
    if (!ped || !ped.alive) return false;
    ped.hp -= amount;
    ped.panicTimer = 8;
    if (ped.hp <= 0) {
      ped.alive = false;
      ped.rig.root.rotation.x = Math.PI * 0.5;
      ped.rig.root.position.y = 0.35;
      dropCash(ped.x + 0.4, ped.z + 0.2, ped.cashAmount);
      if (onKilled) onKilled(ped);
      return true;
    }
    return false;
  }

  function update(dt, playerState, vehicles, onPickupCash, onPedHitByCar) {
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      if (!p.alive) continue;

      let moveSpeed = p.speed;
      if (p.panicTimer > 0) {
        p.panicTimer = Math.max(0, p.panicTimer - dt);
        p.yaw = Math.atan2(p.panicDirX, p.panicDirZ);
        moveSpeed = 6.2;
      } else {
        p.turnTimer -= dt;
        if (p.turnTimer <= 0) {
          if (p.zone === 'boardwalk') {
            p.yaw = p.x > 160 ? -Math.PI * 0.5 : p.x < -160 ? Math.PI * 0.5 : p.yaw + (rng() - 0.5) * 0.4;
          } else if (p.zone === 'market') {
            p.yaw = Math.atan2(90 + randRange(rng, -11, 11) - p.x, 30 + randRange(rng, -11, 11) - p.z);
          } else {
            p.yaw += (rng() - 0.5) * 1.4;
          }
          p.turnTimer = randRange(rng, 2.2, 5.5);
        }
      }

      const nx = p.x + Math.sin(p.yaw) * moveSpeed * dt;
      const nz = p.z + Math.cos(p.yaw) * moveSpeed * dt;
      const col = city.resolveCircleCollisions(nx, nz, p.radius);
      if (col.hit) {
        p.yaw += Math.PI * 0.75;
        if (p.panicTimer > 0) {
          p.panicDirX = Math.sin(p.yaw);
          p.panicDirZ = Math.cos(p.yaw);
        }
      }
      p.x = col.x;
      p.z = col.z;

      // Keep market peds loosely inside Pasar Senja unless panicking
      if (p.zone === 'market' && p.panicTimer <= 0) {
        if (Math.abs(p.x - 90) > 17 || Math.abs(p.z - 30) > 17) {
          p.yaw = Math.atan2(90 - p.x, 30 - p.z);
        }
      }

      // Check vehicle impact
      for (let vIdx = 0; vIdx < vehicles.length; vIdx++) {
        const v = vehicles[vIdx];
        if (Math.abs(v.speed) < 3.5) continue;
        const d = Math.hypot(v.x - p.x, v.z - p.z);
        if (d < v.radius + 0.6) {
          const killed = damagePed(p, Math.abs(v.speed) * 4.2);
          alertPanic(p.x, p.z, 30);
          if (onPedHitByCar && v.driver === 'player') {
            onPedHitByCar(p, killed);
          }
          break;
        }
      }

      // Limb walk animation
      p.walkPhase += dt * (p.panicTimer > 0 ? 14 : 6.8);
      const swing = Math.sin(p.walkPhase) * (p.panicTimer > 0 ? 0.85 : 0.45);
      p.rig.leftLeg.rotation.x = swing;
      p.rig.rightLeg.rotation.x = -swing;
      p.rig.leftArm.rotation.x = p.panicTimer > 0 ? -2.4 : -swing * 0.6;
      p.rig.rightArm.rotation.x = p.panicTimer > 0 ? -2.4 : swing * 0.6;
      p.rig.root.position.set(p.x, p.y, p.z);
      p.rig.root.rotation.y = p.yaw;
    }

    // Collect dropped cash
    for (let i = cashDrops.length - 1; i >= 0; i--) {
      const c = cashDrops[i];
      c.age += dt;
      c.mesh.rotation.y += dt * 2.6;
      c.mesh.position.y = 0.38 + Math.sin(c.age * 4) * 0.08;
      if (playerState && Math.hypot(playerState.x - c.x, playerState.z - c.z) < 2.2) {
        scene.remove(c.mesh);
        cashDrops.splice(i, 1);
        if (onPickupCash) onPickupCash(c.amount);
      } else if (c.age > 45) {
        scene.remove(c.mesh);
        cashDrops.splice(i, 1);
      }
    }
  }

  return {
    peds,
    cashDrops,
    spawnPed,
    populatePedestrians,
    alertPanic,
    damagePed,
    update,
  };
}
