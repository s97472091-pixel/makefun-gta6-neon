// Solana Bay — Hitscan Combat, Melee, Drive-By Shooting & Hostile Gang AI
import * as THREE from 'three';
import { buildCharacterRig } from './player.js';

export function createCombatSystem(scene, city) {
  const hostiles = [];
  let nextHostileId = 1;

  function spawnHostile({
    x,
    z,
    yaw = 0,
    hp = 65,
    faction = 'Red Tide Syndicate',
    jacketColor = 0xb91c1c,
    pantsColor = 0x111827,
    missionTag = null,
    downed = false,
  } = {}) {
    const rig = buildCharacterRig({
      jacketColor,
      pantsColor,
      skinColor: 0xd9a077,
      hairColor: 0x0f172a,
      shirtColor: 0x1f2937,
    });
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.11, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 })
    );
    gun.position.set(0, 0, 0.14);
    rig.weaponMount.add(gun);

    rig.root.position.set(x, 0.24, z);
    rig.root.rotation.y = yaw;
    if (downed) {
      rig.root.rotation.x = Math.PI * 0.5;
      rig.root.position.y = 0.34;
    }
    scene.add(rig.root);

    const h = {
      id: nextHostileId++,
      rig,
      x,
      y: 0.24,
      z,
      yaw,
      hp: downed ? 0 : hp,
      maxHp: hp,
      alive: !downed,
      faction,
      missionTag,
      fireCooldown: 0.8 + Math.random() * 0.8,
      walkPhase: 0,
      radius: 0.55,
      aggroRange: 44,
    };
    hostiles.push(h);
    return h;
  }

  function clearMissionHostiles(tag = null) {
    for (let i = hostiles.length - 1; i >= 0; i--) {
      if (tag === null || hostiles[i].missionTag === tag) {
        scene.remove(hostiles[i].rig.root);
        hostiles.splice(i, 1);
      }
    }
  }

  function damageHostile(h, amount, onKill) {
    if (!h || !h.alive) return false;
    h.hp -= amount;
    if (h.hp <= 0) {
      h.alive = false;
      h.hp = 0;
      h.rig.root.rotation.x = Math.PI * 0.5;
      h.rig.root.position.y = 0.34;
      if (onKill) onKill(h);
      return true;
    }
    return false;
  }

  function rayCircleHit(ox, oz, dx, dz, cx, cz, radius, maxT) {
    const fx = cx - ox;
    const fz = cz - oz;
    const proj = fx * dx + fz * dz;
    if (proj < 0 || proj > maxT) return null;
    const perpSq = fx * fx + fz * fz - proj * proj;
    if (perpSq <= radius * radius) return proj;
    return null;
  }

  function firePlayerWeapon({
    player,
    weapons,
    vehicles,
    pedestrians,
    police,
    effects,
    audio,
    callbacks = {},
  }) {
    const inVehicle = Boolean(player.state.vehicle);
    if (!weapons.canFire(inVehicle)) return false;

    const w = weapons.consumeShot();
    const muzzle = player.getMuzzlePosition();
    const fwd = player.getForwardVector();
    const flatLen = Math.hypot(fwd.x, fwd.z) || 1;
    const baseDx = fwd.x / flatLen;
    const baseDz = fwd.z / flatLen;

    if (w.kind === 'melee') {
      if (audio) audio.playMelee();
      // Check melee arc in front of player
      for (const h of hostiles) {
        if (!h.alive) continue;
        if (Math.hypot(h.x - player.state.x, h.z - player.state.z) <= w.range) {
          const killed = damageHostile(h, w.damage, callbacks.onHostileKilled);
          if (effects) effects.spawnSparks(h.x, 1.2, h.z, 5);
          if (killed && callbacks.onTakedown) callbacks.onTakedown('hostile');
        }
      }
      for (const p of pedestrians.peds) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - player.state.x, p.z - player.state.z) <= w.range) {
          const killed = pedestrians.damagePed(p, w.damage, callbacks.onPedKilled);
          if (killed && callbacks.onTakedown) callbacks.onTakedown('ped');
        }
      }
      if (police) {
        for (const off of police.officers) {
          if (!off.alive) continue;
          if (Math.hypot(off.x - player.state.x, off.z - player.state.z) <= w.range) {
            police.damageOfficer(off, w.damage, callbacks.onOfficerKilled);
          }
        }
      }
      return true;
    }

    // Firearm hitscan pellets
    if (audio) audio.playGunshot(w.id);
    if (effects) effects.spawnMuzzleFlash(muzzle.x, muzzle.y, muzzle.z);
    pedestrians.alertPanic(player.state.x, player.state.z, 45);
    if (callbacks.onShotsFired) callbacks.onShotsFired(player.state.x, player.state.z, w);

    for (let p = 0; p < w.pellets; p++) {
      const angleOffset = (Math.random() - 0.5) * w.spread * 2;
      const cosA = Math.cos(angleOffset);
      const sinA = Math.sin(angleOffset);
      const dx = baseDx * cosA - baseDz * sinA;
      const dz = baseDx * sinA + baseDz * cosA;

      let bestDist = city.raycastBuildings(muzzle.x, muzzle.z, dx, dz, w.range);
      let hitTarget = null;
      let hitKind = 'wall';

      // Check hostile gang members
      for (const h of hostiles) {
        if (!h.alive) continue;
        const t = rayCircleHit(muzzle.x, muzzle.z, dx, dz, h.x, h.z, 0.85, bestDist);
        if (t !== null && t < bestDist) {
          bestDist = t;
          hitTarget = h;
          hitKind = 'hostile';
        }
      }

      // Check police officers
      if (police) {
        for (const off of police.officers) {
          if (!off.alive) continue;
          const t = rayCircleHit(muzzle.x, muzzle.z, dx, dz, off.x, off.z, 0.85, bestDist);
          if (t !== null && t < bestDist) {
            bestDist = t;
            hitTarget = off;
            hitKind = 'officer';
          }
        }
      }

      // Check pedestrians
      for (const ped of pedestrians.peds) {
        if (!ped.alive) continue;
        const t = rayCircleHit(muzzle.x, muzzle.z, dx, dz, ped.x, ped.z, 0.72, bestDist);
        if (t !== null && t < bestDist) {
          bestDist = t;
          hitTarget = ped;
          hitKind = 'ped';
        }
      }

      // Check vehicles (excluding player's current vehicle)
      for (const v of vehicles.vehicles) {
        if (v === player.state.vehicle) continue;
        const t = rayCircleHit(muzzle.x, muzzle.z, dx, dz, v.x, v.z, v.radius * 0.9, bestDist);
        if (t !== null && t < bestDist) {
          bestDist = t;
          hitTarget = v;
          hitKind = 'vehicle';
        }
      }

      const endX = muzzle.x + dx * bestDist;
      const endZ = muzzle.z + dz * bestDist;
      if (effects) {
        effects.spawnTracer(muzzle.x, muzzle.y, muzzle.z, endX, 1.35, endZ, 0xffe066);
      }

      if (hitKind === 'hostile' && hitTarget) {
        if (effects) effects.spawnSparks(endX, 1.3, endZ, 6, 0xff4d6d);
        const killed = damageHostile(hitTarget, w.damage, callbacks.onHostileKilled);
        if (killed && callbacks.onTakedown) callbacks.onTakedown('hostile');
      } else if (hitKind === 'officer' && hitTarget) {
        if (effects) effects.spawnSparks(endX, 1.3, endZ, 6, 0x38bdf8);
        const killed = police.damageOfficer(hitTarget, w.damage, callbacks.onOfficerKilled);
        if (killed && callbacks.onTakedown) callbacks.onTakedown('officer');
      } else if (hitKind === 'ped' && hitTarget) {
        if (effects) effects.spawnSparks(endX, 1.25, endZ, 4, 0xfb7185);
        const killed = pedestrians.damagePed(hitTarget, w.damage, callbacks.onPedKilled);
        if (killed && callbacks.onTakedown) callbacks.onTakedown('ped');
      } else if (hitKind === 'vehicle' && hitTarget) {
        if (effects) effects.spawnSparks(endX, 1.0, endZ, 7, 0xfbbf24);
        vehicles.damageVehicle(hitTarget, w.damage * 0.65, effects, audio, callbacks.onVehicleExplode);
      } else if (bestDist < w.range - 0.2 && effects) {
        effects.spawnSparks(endX, 1.35, endZ, 4, 0xe2e8f0);
      }
    }

    return true;
  }

  function update(dt, player, effects, audio) {
    const px = player.state.x;
    const pz = player.state.z;

    for (let i = 0; i < hostiles.length; i++) {
      const h = hostiles[i];
      if (!h.alive) continue;

      const dx = px - h.x;
      const dz = pz - h.z;
      const dist = Math.hypot(dx, dz);
      if (dist > h.aggroRange) continue;

      h.yaw = Math.atan2(dx, dz);
      h.rig.root.rotation.y = h.yaw;
      h.rig.rightArm.rotation.x = -1.35;

      // Advance to ideal firing distance
      if (dist > 14 && dist < 38) {
        const nx = h.x + (dx / dist) * 3.4 * dt;
        const nz = h.z + (dz / dist) * 3.4 * dt;
        const col = city.resolveCircleCollisions(nx, nz, h.radius);
        h.x = col.x;
        h.z = col.z;
        h.walkPhase += dt * 7;
        const swing = Math.sin(h.walkPhase) * 0.5;
        h.rig.leftLeg.rotation.x = swing;
        h.rig.rightLeg.rotation.x = -swing;
      } else {
        h.rig.leftLeg.rotation.x = 0;
        h.rig.rightLeg.rotation.x = 0;
      }
      h.rig.root.position.set(h.x, h.y, h.z);

      // Fire back if clear line of sight
      h.fireCooldown -= dt;
      if (h.fireCooldown <= 0 && dist < 34 && player.state.alive) {
        h.fireCooldown = 1.15 + Math.random() * 0.75;
        if (city.hasLineOfSight(h.x, h.z, px, pz)) {
          const sx = h.x + Math.sin(h.yaw) * 0.65;
          const sz = h.z + Math.cos(h.yaw) * 0.65;
          if (effects) {
            effects.spawnMuzzleFlash(sx, 1.45, sz);
            effects.spawnTracer(sx, 1.45, sz, px, 1.35, pz, 0xff5a5f);
          }
          if (audio) audio.playGunshot('pistol', 0.35);
          if (Math.random() < 0.42) {
            player.applyDamage(6.5);
          }
        }
      }
    }
  }

  return {
    hostiles,
    spawnHostile,
    clearMissionHostiles,
    damageHostile,
    firePlayerWeapon,
    update,
  };
}
