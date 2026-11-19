// Combat: player firearms, melee, drive-by shooting, hitscan tracers & hostile syndicate enemies.
import * as THREE from 'three';
import { WEAPONS, angleDiff } from './config.js';
import { buildCharacterMesh } from './player.js';

export function createCombatManager(scene, rng) {
  const enemies = []; // Mission gang enemies (Los Vipers / Cartel guards)

  function spawnEnemy(x, z, opts = {}) {
    const mesh = buildCharacterMesh(opts.shirtColor ?? 0xb81d48, 0x1a1824, 0xd1956c);
    mesh.userData.gun.visible = true;
    mesh.position.set(x, 0.22, z);
    scene.add(mesh);

    const e = {
      mesh,
      x,
      y: 0.22,
      z,
      yaw: opts.yaw ?? rng() * Math.PI * 2,
      hp: opts.hp ?? 75,
      maxHp: opts.hp ?? 75,
      dead: false,
      tag: opts.tag || 'gang',
      weapon: opts.weapon || 'pistol',
      fireCooldown: 0.5 + rng() * 0.9,
      walkCycle: 0,
      aggroRange: opts.aggroRange ?? 46,
    };
    enemies.push(e);
    return e;
  }

  function clearEnemies() {
    for (const e of enemies) scene.remove(e.mesh);
    enemies.length = 0;
  }

  function damageEnemy(e, dmg, fx, onKill) {
    if (e.dead) return;
    e.hp -= dmg;
    fx?.spawnSparks(e.x, e.y + 1.15, e.z, 5, 0xff4d6d);
    if (e.hp <= 0) {
      e.dead = true;
      e.mesh.rotation.x = Math.PI * 0.48;
      e.mesh.position.y = 0.24;
      fx?.spawnPickup(e.x, e.z, 'cash', 120);
      if (rng() < 0.35) fx?.spawnPickup(e.x + 0.8, e.z, 'med', 35);
      onKill?.(e);
    }
  }

  function tryPlayerFire(player, camera, city, vehicleMgr, pedMgr, policeMgr, fx, audio, hud) {
    const p = player.state;
    if (p.dead || p.busted || p.fireCooldown > 0 || p.reloadTimer > 0) return false;

    const w = player.currentWeapon();
    if (p.vehicle && w.melee) return false; // Need firearm for drive-by

    if (!w.melee) {
      const inMag = p.mag[w.id] || 0;
      if (inMag <= 0) {
        if ((p.ammo[w.id] || 0) > 0) {
          p.reloadTimer = 1.15;
          hud.toast(`RELOADING ${w.name}...`);
        } else {
          hud.toast('OUT OF AMMO — VISIT SUNSET ARMORY');
        }
        return false;
      }
      p.mag[w.id] = inMag - 1;
      if (p.mag[w.id] === 0 && (p.ammo[w.id] || 0) > 0) {
        p.reloadTimer = 1.15;
      }
    } else {
      p.punchAnim = 1.0;
    }

    p.fireCooldown = w.fireRate;
    p.shake = Math.min(0.45, p.shake + (w.id === 'shotgun' ? 0.26 : w.melee ? 0.08 : 0.1));
    audio.playGunshot(w.id);

    // Fire origin & aim direction along camera forward
    const origin = new THREE.Vector3(p.x, p.y + (p.vehicle ? 1.25 : 1.42), p.z);
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    if (!w.melee) {
      pedMgr.scareAround(p.x, p.z, 30);
    }

    // Gather all shootable entities
    const targets = [
      ...enemies.filter((e) => !e.dead).map((e) => ({ kind: 'enemy', ref: e, x: e.x, y: e.y + 1.1, z: e.z, r: 0.85 })),
      ...policeMgr.officers.filter((o) => !o.dead).map((o) => ({ kind: 'cop', ref: o, x: o.x, y: o.y + 1.1, z: o.z, r: 0.85 })),
      ...pedMgr.peds.filter((d) => !d.dead).map((d) => ({ kind: 'ped', ref: d, x: d.x, y: d.y + 1.1, z: d.z, r: 0.8 })),
      ...vehicleMgr.vehicles.filter((v) => v !== p.vehicle && !v.destroyed).map((v) => ({ kind: 'veh', ref: v, x: v.x, y: v.y + 0.9, z: v.z, r: v.spec.width * 0.78 })),
    ];

    for (let pellet = 0; pellet < w.pellets; pellet++) {
      const dir = camDir.clone();
      if (w.spread > 0) {
        dir.x += (Math.random() - 0.5) * w.spread;
        dir.y += (Math.random() - 0.5) * w.spread * 0.6;
        dir.z += (Math.random() - 0.5) * w.spread;
        dir.normalize();
      }
      // Face player toward shot on foot
      if (!p.vehicle) {
        p.yaw = Math.atan2(dir.x, dir.z);
      }

      let bestDist = w.range;
      let hitTarget = null;

      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const vx = t.x - origin.x;
        const vy = t.y - origin.y;
        const vz = t.z - origin.z;
        const proj = vx * dir.x + vy * dir.y + vz * dir.z;
        if (proj < 0.4 || proj > bestDist) continue;
        const perpSq = (vx - dir.x * proj) ** 2 + (vy - dir.y * proj) ** 2 + (vz - dir.z * proj) ** 2;
        if (perpSq <= t.r * t.r) {
          // Verify no building blocks line of fire
          if (!city.rayHitsBuilding(origin.x, origin.z, t.x, t.z)) {
            bestDist = proj;
            hitTarget = t;
          }
        }
      }

      const endX = origin.x + dir.x * bestDist;
      const endY = Math.max(0.2, origin.y + dir.y * bestDist);
      const endZ = origin.z + dir.z * bestDist;

      if (!w.melee) {
        fx.spawnTracer(origin.x, origin.y, origin.z, endX, endY, endZ, 0xffe48a);
      }

      if (hitTarget) {
        if (hitTarget.kind === 'enemy') {
          damageEnemy(hitTarget.ref, w.dmg, fx, () => {
            p.stats.enemiesDefeated++;
          });
        } else if (hitTarget.kind === 'cop') {
          policeMgr.addHeat(42, 2, audio, hud);
          policeMgr.damageOfficer(hitTarget.ref, w.dmg, fx, () => {
            p.stats.enemiesDefeated++;
            policeMgr.addHeat(75, 3, audio, hud);
          });
        } else if (hitTarget.kind === 'ped') {
          policeMgr.addHeat(35, 1, audio, hud);
          pedMgr.damagePed(hitTarget.ref, w.dmg, fx, () => {
            policeMgr.addHeat(55, 1, audio, hud);
          });
        } else if (hitTarget.kind === 'veh') {
          fx.spawnSparks(endX, endY, endZ, 5);
          vehicleMgr.applyVehicleDamage(hitTarget.ref, w.dmg * 0.9, fx, audio, () => {
            policeMgr.addHeat(70, 2, audio, hud);
          });
          if (hitTarget.ref.isPolice) policeMgr.addHeat(40, 2, audio, hud);
        }
      }
    }
    return true;
  }

  function updateEnemies(dt, city, player, vehicleMgr, fx, audio) {
    const p = player.state;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = p.x - e.x;
      const dz = p.z - e.z;
      const dist = Math.hypot(dx, dz);

      // Run over by player's vehicle
      if (p.vehicle && Math.hypot(p.vehicle.vx, p.vehicle.vz) > 6.5 && dist < 2.4) {
        damageEnemy(e, 140, fx, () => { p.stats.enemiesDefeated++; });
        continue;
      }

      if (dist > e.aggroRange) continue;

      const clearLOS = !city.rayHitsBuilding(e.x, e.z, p.x, p.z);
      const desiredYaw = Math.atan2(dx, dz);
      e.yaw += angleDiff(e.yaw, desiredYaw) * Math.min(1, dt * 8);

      let moveSpd = 0;
      if (dist > 14 || !clearLOS) {
        moveSpd = 4.6;
        e.x += Math.sin(e.yaw) * moveSpd * dt;
        e.z += Math.cos(e.yaw) * moveSpd * dt;
        const col = city.resolveCircleCollision(e.x, e.z, 0.5);
        e.x = col.x;
        e.z = col.z;
      }
      e.y = city.getGroundHeight(e.x, e.z);

      // Shoot at player
      e.fireCooldown -= dt;
      if (clearLOS && dist < 40 && e.fireCooldown <= 0 && !p.dead) {
        e.fireCooldown = (e.weapon === 'smg' ? 0.55 : 1.15) + rng() * 0.45;
        fx.spawnTracer(e.x, e.y + 1.35, e.z, p.x, p.y + 1.1, p.z, 0xff9a56);
        audio.playGunshot(e.weapon);
        if (rng() < (p.vehicle ? 0.3 : 0.48)) {
          if (p.vehicle) vehicleMgr.applyVehicleDamage(p.vehicle, 7, fx, audio);
          else player.takeDamage(8);
        }
      }

      const { leftLeg, rightLeg, rightArm } = e.mesh.userData;
      if (moveSpd > 0.2) {
        e.walkCycle += dt * moveSpd * 1.9;
        const sw = Math.sin(e.walkCycle) * 0.6;
        leftLeg.rotation.x = sw;
        rightLeg.rotation.x = -sw;
      } else {
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
      }
      rightArm.rotation.x = -1.3;
      e.mesh.position.set(e.x, e.y, e.z);
      e.mesh.rotation.y = e.yaw;
    }
  }

  return {
    enemies,
    spawnEnemy,
    clearEnemies,
    damageEnemy,
    tryPlayerFire,
    updateEnemies,
  };
}
