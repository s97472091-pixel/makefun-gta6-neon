// Solana Bay — Sidewalk & boardwalk pedestrians: strolling, fleeing chaos, impact reactions & cash drops
import * as THREE from 'three';
import { CITY, rngRange, rngPick, rngInt } from './config.js';

const SKIN_TONES = [0xf2c9a0, 0xdba57a, 0xb87a52, 0x8d5538, 0xe8b892];
const TOP_COLORS = [0xff5e9c, 0x38e8ff, 0xffd166, 0x2ce6d2, 0xff7043, 0xf8f9fa, 0xa29bfe, 0x55efc4];
const BOTTOM_COLORS = [0x2c3e50, 0x34495e, 0xd4a373, 0x1e272e, 0x57606f, 0xf1f2f6];
const HAIR_COLORS = [0x1c1816, 0x4a3121, 0x8d5b34, 0xd4a559, 0x2d2a32];

const HEAD_GEO = new THREE.BoxGeometry(0.24, 0.26, 0.24);
const TORSO_GEO = new THREE.BoxGeometry(0.4, 0.52, 0.22);
const LIMB_GEO = new THREE.BoxGeometry(0.14, 0.66, 0.16);
const ARM_GEO = new THREE.BoxGeometry(0.12, 0.48, 0.13);

function buildPedMesh(rng) {
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: rngPick(rng, SKIN_TONES), roughness: 0.78 });
  const topMat = new THREE.MeshStandardMaterial({ color: rngPick(rng, TOP_COLORS), roughness: 0.72 });
  const botMat = new THREE.MeshStandardMaterial({ color: rngPick(rng, BOTTOM_COLORS), roughness: 0.82 });
  const hairMat = new THREE.MeshStandardMaterial({ color: rngPick(rng, HAIR_COLORS), roughness: 0.88 });

  const body = new THREE.Group();
  body.position.y = 0.78;
  g.add(body);

  const torso = new THREE.Mesh(TORSO_GEO, topMat);
  torso.position.y = 0.26;
  torso.castShadow = true;
  body.add(torso);

  const head = new THREE.Mesh(HEAD_GEO, skinMat);
  head.position.y = 0.66;
  head.castShadow = true;
  body.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.26), hairMat);
  hair.position.y = 0.79;
  body.add(hair);

  const legL = new THREE.Mesh(LIMB_GEO, botMat);
  legL.position.set(-0.11, -0.34, 0);
  const legR = new THREE.Mesh(LIMB_GEO, botMat);
  legR.position.set(0.11, -0.34, 0);
  const armL = new THREE.Mesh(ARM_GEO, topMat);
  armL.position.set(-0.27, 0.25, 0);
  const armR = new THREE.Mesh(ARM_GEO, topMat);
  armR.position.set(0.27, 0.25, 0);

  body.add(legL, legR, armL, armR);
  return { group: g, body, legL, legR, armL, armR };
}

export function createPedestrianManager(scene, city, rng) {
  const peds = [];

  function pickSidewalkSpawn() {
    // 25% spawn on Miramar Boardwalk, 75% on city block sidewalks
    if (rng() < 0.26) {
      const x = rngRange(rng, CITY.BOARDWALK_MIN_X + 2.5, CITY.BOARDWALK_MAX_X - 2.5);
      const z = rngRange(rng, -165, 165);
      return { x, z, dirX: 0, dirZ: rng() < 0.5 ? 1 : -1 };
    }
    const bx = rngPick(rng, CITY.BLOCK_CENTERS);
    const bz = rngPick(rng, CITY.BLOCK_CENTERS);
    const edge = rngInt(rng, 0, 3);
    const offset = CITY.BLOCK_SIZE * 0.5 - 1.6;
    const along = rngRange(rng, -offset + 2, offset - 2);
    if (edge === 0) return { x: bx + along, z: bz - offset, dirX: rng() < 0.5 ? 1 : -1, dirZ: 0 };
    if (edge === 1) return { x: bx + along, z: bz + offset, dirX: rng() < 0.5 ? 1 : -1, dirZ: 0 };
    if (edge === 2) return { x: bx - offset, z: bz + along, dirX: 0, dirZ: rng() < 0.5 ? 1 : -1 };
    return { x: bx + offset, z: bz + along, dirX: 0, dirZ: rng() < 0.5 ? 1 : -1 };
  }

  function spawnPed(posOverride = null) {
    const sp = posOverride || pickSidewalkSpawn();
    const built = buildPedMesh(rng);
    const gy = city.getGroundHeight(sp.x, sp.z);
    built.group.position.set(sp.x, gy, sp.z);
    scene.add(built.group);

    const ped = {
      mesh: built.group,
      parts: built,
      pos: new THREE.Vector3(sp.x, gy, sp.z),
      vel: new THREE.Vector3(),
      dirX: sp.dirX ?? 0,
      dirZ: sp.dirZ ?? 1,
      yaw: Math.atan2(sp.dirX ?? 0, sp.dirZ ?? 1),
      walkSpeed: rngRange(rng, 1.5, 2.3),
      fleeSpeed: rngRange(rng, 5.2, 6.6),
      hp: 45,
      alive: true,
      state: 'stroll', // 'stroll' | 'flee' | 'down'
      fleeTimer: 0,
      turnTimer: rngRange(rng, 3, 9),
      downTimer: 0,
      cycle: rng() * 10,
      cashDrop: rngInt(rng, 25, 95),
    };
    peds.push(ped);
    return ped;
  }

  function populate(count = 46) {
    for (let i = 0; i < count; i++) {
      spawnPed();
    }
  }

  function alertPanic(x, z, radius = 34) {
    for (const p of peds) {
      if (!p.alive) continue;
      const dx = p.pos.x - x;
      const dz = p.pos.z - z;
      const d = Math.hypot(dx, dz);
      if (d < radius && d > 0.01) {
        p.state = 'flee';
        p.fleeTimer = rngRange(rng, 6, 11);
        p.dirX = dx / d;
        p.dirZ = dz / d;
      }
    }
  }

  function damagePed(p, amount, knockX = 0, knockZ = 0, effects = null, onKill = null) {
    if (!p.alive) return;
    p.hp -= amount;
    p.vel.x += knockX;
    p.vel.z += knockZ;
    if (effects) effects.spawnSpark(p.pos.x, p.pos.y + 1.1, p.pos.z, 0xff4d6d);

    if (p.hp <= 0) {
      p.alive = false;
      p.state = 'down';
      p.downTimer = 14;
      p.parts.body.rotation.x = Math.PI / 2;
      p.parts.body.position.y = 0.25;
      if (effects) {
        effects.spawnPickup('cash', p.pos.x, p.pos.z, p.cashDrop);
      }
      if (onKill) onKill(p);
    } else {
      p.state = 'flee';
      p.fleeTimer = 8;
      const len = Math.hypot(knockX, knockZ);
      if (len > 0.1) {
        p.dirX = knockX / len;
        p.dirZ = knockZ / len;
      }
    }
  }

  function update(dt, vehicles, effects, onPedHitByPlayer) {
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];

      if (!p.alive) {
        p.downTimer -= dt;
        p.vel.multiplyScalar(Math.max(0, 1 - dt * 5));
        p.pos.x += p.vel.x * dt;
        p.pos.z += p.vel.z * dt;
        p.mesh.position.copy(p.pos);
        if (p.downTimer <= 0) {
          // Respawn pedestrian cleanly elsewhere
          const sp = pickSidewalkSpawn();
          p.pos.set(sp.x, city.getGroundHeight(sp.x, sp.z), sp.z);
          p.dirX = sp.dirX;
          p.dirZ = sp.dirZ;
          p.vel.set(0, 0, 0);
          p.hp = 45;
          p.alive = true;
          p.state = 'stroll';
          p.parts.body.rotation.x = 0;
          p.parts.body.position.y = 0.78;
        }
        continue;
      }

      // Check vehicle impact
      for (let vIdx = 0; vIdx < vehicles.length; vIdx++) {
        const v = vehicles[vIdx];
        if (v.destroyed) continue;
        const speed = Math.hypot(v.vel.x, v.vel.z);
        if (speed < 3.5) continue;
        const dx = p.pos.x - v.pos.x;
        const dz = p.pos.z - v.pos.z;
        const hitR = v.spec.width * 0.62 + 0.45;
        if (dx * dx + dz * dz < hitR * hitR) {
          const d = Math.max(0.1, Math.hypot(dx, dz));
          const dmg = speed * 4.5;
          damagePed(
            p,
            dmg,
            (dx / d) * speed * 0.7,
            (dz / d) * speed * 0.7,
            effects,
            v.driver === 'player' ? onPedHitByPlayer : null
          );
          if (v.driver === 'player' && p.alive && onPedHitByPlayer) {
            onPedHitByPlayer(p);
          }
          break;
        }
      }
      if (!p.alive) continue;

      if (p.state === 'flee') {
        p.fleeTimer -= dt;
        if (p.fleeTimer <= 0) p.state = 'stroll';
      } else {
        p.turnTimer -= dt;
        if (p.turnTimer <= 0) {
          p.turnTimer = rngRange(rng, 4, 11);
          // Turn 90 degrees or keep walking
          if (rng() < 0.55) {
            const tmp = p.dirX;
            p.dirX = rng() < 0.5 ? p.dirZ : -p.dirZ;
            p.dirZ = rng() < 0.5 ? tmp : -tmp;
            if (p.dirX === 0 && p.dirZ === 0) p.dirZ = 1;
          }
        }
      }

      const spd = p.state === 'flee' ? p.fleeSpeed : p.walkSpeed;
      const nx = p.pos.x + (p.dirX * spd + p.vel.x) * dt;
      const nz = p.pos.z + (p.dirZ * spd + p.vel.z) * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - dt * 6));

      const col = city.resolveCircleCollision(nx, nz, 0.42);
      p.pos.x = col.x;
      p.pos.z = col.z;
      p.pos.y = city.getGroundHeight(p.pos.x, p.pos.z);

      if (col.hit) {
        // Turn along wall / away from obstacle
        const tmp = p.dirX;
        p.dirX = -p.dirZ || -tmp;
        p.dirZ = tmp || -p.dirZ;
        if (Math.abs(col.nx) > 0.5) p.dirX = col.nx;
        if (Math.abs(col.nz) > 0.5) p.dirZ = col.nz;
      }

      p.yaw = Math.atan2(p.dirX, p.dirZ);
      p.cycle += dt * (p.state === 'flee' ? 14 : 6.5);
      const sw = Math.sin(p.cycle) * (p.state === 'flee' ? 0.82 : 0.42);
      p.parts.legL.rotation.x = sw;
      p.parts.legR.rotation.x = -sw;
      p.parts.armL.rotation.x = p.state === 'flee' ? -2.4 + sw * 0.25 : -sw * 0.6;
      p.parts.armR.rotation.x = p.state === 'flee' ? -2.4 - sw * 0.25 : sw * 0.6;

      p.mesh.position.copy(p.pos);
      p.mesh.rotation.y = p.yaw;
    }
  }

  return {
    peds,
    spawnPed,
    populate,
    alertPanic,
    damagePed,
    update,
  };
}
