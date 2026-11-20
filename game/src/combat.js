// Solana Bay — hitscan firearms, melee combat, drive-by shooting, tracers, and hostile gang AI.

import * as THREE from 'three';
import { clamp, lerpAngle, dist2D } from './config.js';
import { createCharacterMesh } from './player.js';

export function createCombatSystem(scene) {
  const hostiles = [];

  function spawnHostile(x, z, options = {}) {
    const rig = createCharacterMesh(
      options.shirtColor || 0xd62828,
      options.pantsColor || 0x1a1c22,
      options.skinColor || 0xd49a6a
    );
    rig.gunProp.visible = true;
    rig.root.position.set(x, 0, z);
    scene.add(rig.root);

    const enemy = {
      rig,
      x,
      y: 0,
      z,
      yaw: options.yaw || 0,
      hp: options.hp || 70,
      maxHp: options.hp || 70,
      alive: true,
      speed: options.speed || 5.4,
      damage: options.damage || 8,
      fireRate: options.fireRate || 1.05,
      fireCooldown: 0.5 + Math.random() * 0.7,
      aggroRange: options.aggroRange || 52,
      tag: options.tag || 'syndicate',
      walkCycle: 0,
      radius: 0.46,
    };
    hostiles.push(enemy);
    return enemy;
  }

  function clearHostiles(tag = null) {
    for (let i = hostiles.length - 1; i >= 0; i--) {
      if (tag && hostiles[i].tag !== tag) continue;
      scene.remove(hostiles[i].rig.root);
      hostiles.splice(i, 1);
    }
  }

  function damageHostile(enemy, amount, effects, callbacks = {}) {
    if (!enemy.alive) return;
    enemy.hp -= amount;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      scene.remove(enemy.rig.root);
      const idx = hostiles.indexOf(enemy);
      if (idx !== -1) hostiles.splice(idx, 1);
      if (effects) {
        effects.spawnPickup('cash', enemy.x, enemy.z, 95);
        if (Math.random() < 0.35) effects.spawnPickup('health', enemy.x + 1.1, enemy.z, 35);
      }
      if (callbacks.onHostileKilled) callbacks.onHostileKilled(enemy);
    }
  }

  function rayHitsCylinder(origin, dir, cx, cy, cz, radius, height, maxDist) {
    // Intersect ray with vertical cylinder approx (2D closest approach + height check)
    const ox = cx - origin.x;
    const oz = cz - origin.z;
    const horizLen = Math.hypot(dir.x, dir.z);
    if (horizLen < 1e-5) return null;
    const t = ox * dir.x + oz * dir.z + (cy + height * 0.5 - origin.y) * dir.y;
    if (t < 0 || t > maxDist) return null;
    const px = origin.x + dir.x * t;
    const py = origin.y + dir.y * t;
    const pz = origin.z + dir.z * t;
    const dHoriz = Math.hypot(px - cx, pz - cz);
    if (dHoriz <= radius && py >= cy - 0.1 && py <= cy + height + 0.2) {
      return t;
    }
    return null;
  }

  function firePlayerWeapon(player, camera, city, vehicles, peds, police, effects, audio, callbacks = {}) {
    const ps = player.state;
    if (ps.dead || ps.busted || ps.fireCooldown > 0 || ps.reloadTimer > 0) return false;

    const weapon = player.getWeapon();
    if (ps.vehicle && !weapon.driveBy) {
      // Auto-fallback to pistol or smg if player tries drive-by with shotgun/fists
      if (ps.ammo.smg.mag > 0) player.switchWeapon(2);
      else if (ps.ammo.pistol.mag > 0) player.switchWeapon(1);
      else return false;
    }

    const w = player.getWeapon();
    if (w.type === 'melee') {
      ps.fireCooldown = w.fireRate;
      ps.punchTimer = 0.26;
      if (audio) audio.playPunch();
      const fx = Math.sin(ps.yaw);
      const fz = Math.cos(ps.yaw);
      const hitX = ps.x + fx * 1.4;
      const hitZ = ps.z + fz * 1.4;

      let landed = false;
      for (const e of [...hostiles]) {
        if (dist2D(hitX, hitZ, e.x, e.z) < w.range) {
          damageHostile(e, w.damage, effects, callbacks);
          if (effects) effects.spawnSparks(e.x, 1.3, e.z, 6);
          landed = true;
        }
      }
      for (const o of [...police.officers]) {
        if (dist2D(hitX, hitZ, o.x, o.z) < w.range) {
          police.damageOfficer(o, w.damage, effects, callbacks);
          police.addHeat(16);
          landed = true;
        }
      }
      for (const p of peds.peds) {
        if (p.alive && dist2D(hitX, hitZ, p.x, p.z) < w.range) {
          peds.damagePed(p, w.damage, effects, callbacks);
          police.addHeat(12);
          landed = true;
        }
      }
      if (landed && audio) audio.playCrash(0.25);
      return true;
    }

    // Firearm check ammo
    const slotAmmo = ps.ammo[w.id];
    if (slotAmmo.mag <= 0) {
      player.startReload();
      if (audio) audio.playUiClick();
      return false;
    }

    slotAmmo.mag -= 1;
    ps.fireCooldown = w.fireRate;
    if (slotAmmo.mag === 0 && slotAmmo.reserve > 0) {
      player.startReload();
    }

    if (audio) audio.playGunshot(w.id, 0.8);
    peds.scareAround(ps.x, ps.z, 38, 8);
    police.addHeat(w.id === 'shotgun' ? 8 : 4);

    // Determine aim direction from camera center
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const camPos = camera.position;
    const bldgAim = city.raycastBuildings(camPos, camDir, w.range);
    const aimPoint = camPos.clone().addScaledVector(camDir, bldgAim.distance);

    const origin = {
      x: ps.x + Math.sin(ps.yaw) * 0.45,
      y: ps.y + (ps.vehicle ? 1.25 : 1.45),
      z: ps.z + Math.cos(ps.yaw) * 0.45,
    };

    const baseDir = new THREE.Vector3(
      aimPoint.x - origin.x,
      aimPoint.y - origin.y,
      aimPoint.z - origin.z
    ).normalize();

    // Rotate character toward shot direction on foot
    if (!ps.vehicle) {
      ps.yaw = Math.atan2(baseDir.x, baseDir.z);
    }

    for (let pellet = 0; pellet < w.pellets; pellet++) {
      const dir = baseDir.clone();
      if (w.spread > 0) {
        dir.x += (Math.random() - 0.5) * w.spread;
        dir.y += (Math.random() - 0.5) * w.spread * 0.65;
        dir.z += (Math.random() - 0.5) * w.spread;
        dir.normalize();
      }

      const bHit = city.raycastBuildings(origin, dir, w.range);
      let bestT = bHit.distance;
      let hitKind = bHit.hit ? 'building' : 'none';
      let hitTarget = null;

      for (const e of hostiles) {
        if (!e.alive) continue;
        const t = rayHitsCylinder(origin, dir, e.x, e.y, e.z, 0.65, 1.9, bestT);
        if (t !== null && t < bestT) {
          bestT = t;
          hitKind = 'hostile';
          hitTarget = e;
        }
      }

      for (const o of police.officers) {
        if (!o.alive) continue;
        const t = rayHitsCylinder(origin, dir, o.x, o.y, o.z, 0.65, 1.9, bestT);
        if (t !== null && t < bestT) {
          bestT = t;
          hitKind = 'officer';
          hitTarget = o;
        }
      }

      for (const p of peds.peds) {
        if (!p.alive) continue;
        const t = rayHitsCylinder(origin, dir, p.x, p.y, p.z, 0.6, 1.85, bestT);
        if (t !== null && t < bestT) {
          bestT = t;
          hitKind = 'ped';
          hitTarget = p;
        }
      }

      for (const v of vehicles.vehicles) {
        if (v === ps.vehicle || v.destroyed) continue;
        const t = rayHitsCylinder(origin, dir, v.x, v.y, v.z, v.radius * 0.9, v.spec.height + 0.3, bestT);
        if (t !== null && t < bestT) {
          bestT = t;
          hitKind = 'vehicle';
          hitTarget = v;
        }
      }

      const end = {
        x: origin.x + dir.x * bestT,
        y: origin.y + dir.y * bestT,
        z: origin.z + dir.z * bestT,
      };
      if (effects) effects.spawnTracer(origin, end, w.tracerColor);

      if (hitKind === 'hostile' && hitTarget) {
        damageHostile(hitTarget, w.damage, effects, callbacks);
        if (effects) effects.spawnSparks(end.x, end.y, end.z, 6);
      } else if (hitKind === 'officer' && hitTarget) {
        police.damageOfficer(hitTarget, w.damage, effects, callbacks);
        police.addHeat(18);
        if (effects) effects.spawnSparks(end.x, end.y, end.z, 6);
      } else if (hitKind === 'ped' && hitTarget) {
        peds.damagePed(hitTarget, w.damage, effects, callbacks);
        police.addHeat(14);
        if (effects) effects.spawnSparks(end.x, end.y, end.z, 5);
      } else if (hitKind === 'vehicle' && hitTarget) {
        vehicles.damageVehicle(hitTarget, w.damage * 0.9, effects, audio, callbacks.onVehicleExplode);
        if (hitTarget.isPolice) police.addHeat(16);
        if (effects) effects.spawnSparks(end.x, end.y, end.z, 7);
      } else if (hitKind === 'building') {
        if (effects) effects.spawnSparks(end.x, end.y, end.z, 4);
      }
    }
    return true;
  }

  function update(dt, city, player, vehicles, effects, audio, callbacks = {}) {
    const ps = player.state;
    if (ps.dead || ps.busted) return;

    for (let i = hostiles.length - 1; i >= 0; i--) {
      const e = hostiles[i];
      if (!e.alive) continue;

      const d = dist2D(e.x, e.z, ps.x, ps.z);

      // Check player running over hostile gang member
      if (ps.vehicle && Math.hypot(ps.vehicle.vx, ps.vehicle.vz) > 7 && d < ps.vehicle.radius + e.radius) {
        damageHostile(e, 150, effects, callbacks);
        if (audio) audio.playCrash(0.45);
        continue;
      }

      if (d > e.aggroRange) continue;

      const canSee = city.hasLineOfSight(e.x, e.y + 1.45, e.z, ps.x, ps.y + 1.3, ps.z);
      const targetYaw = Math.atan2(ps.x - e.x, ps.z - e.z);
      e.yaw = lerpAngle(e.yaw, targetYaw, clamp(dt * 7, 0, 1));

      if (d > 14 || !canSee) {
        const nx = e.x + Math.sin(e.yaw) * e.speed * dt;
        const nz = e.z + Math.cos(e.yaw) * e.speed * dt;
        const col = city.resolveCircleCollision(nx, nz, e.radius);
        e.x = col.x;
        e.z = col.z;
        e.walkCycle += dt * 8.2;
        const swing = Math.sin(e.walkCycle) * 0.55;
        e.rig.leftLeg.rotation.x = swing;
        e.rig.rightLeg.rotation.x = -swing;
      } else {
        e.rig.leftLeg.rotation.x = 0;
        e.rig.rightLeg.rotation.x = 0;
      }

      e.rig.rightArm.rotation.x = canSee ? -1.48 : 0;
      e.y = city.getGroundHeight(e.x, e.z);
      e.rig.root.position.set(e.x, e.y, e.z);
      e.rig.root.rotation.y = e.yaw;

      e.fireCooldown -= dt;
      if (canSee && d < 42 && e.fireCooldown <= 0) {
        e.fireCooldown = e.fireRate;
        const start = { x: e.x, y: e.y + 1.45, z: e.z };
        const end = {
          x: ps.x + (Math.random() - 0.5) * 1.5,
          y: ps.y + 1.2 + (Math.random() - 0.5) * 0.5,
          z: ps.z + (Math.random() - 0.5) * 1.5,
        };
        if (effects) effects.spawnTracer(start, end, 0xff595e);
        if (audio) audio.playGunshot('pistol', 0.42);
        if (Math.random() < 0.55) {
          if (ps.vehicle) {
            vehicles.damageVehicle(ps.vehicle, 5, effects, audio, callbacks.onVehicleExplode);
            if (Math.random() < 0.35) player.takeDamage(e.damage * 0.6);
          } else {
            player.takeDamage(e.damage);
          }
        }
      }
    }
  }

  return {
    hostiles,
    spawnHostile,
    clearHostiles,
    damageHostile,
    firePlayerWeapon,
    update,
  };
}
