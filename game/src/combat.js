// Solana Bay — Hitscan firearms, melee, drive-by shooting, tracers, damage & Marea Roja hostile gang AI
import * as THREE from 'three';
import { WEAPONS, rngRange } from './config.js';

const GANG_SHIRT_MAT = new THREE.MeshStandardMaterial({ color: 0xb81d38, roughness: 0.7 }); // Marea Roja crimson
const GANG_BOSS_MAT = new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.45 }); // Hector's white linen suit
const GANG_GOLD_MAT = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.75, roughness: 0.25 });
const GANG_PANTS_MAT = new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.85 });
const GANG_SKIN_MAT = new THREE.MeshStandardMaterial({ color: 0xd49a72, roughness: 0.75 });
const GANG_GUN_MAT = new THREE.MeshStandardMaterial({ color: 0x22262e, metalness: 0.7, roughness: 0.35 });

function buildGangMesh(isBoss = false) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = isBoss ? 0.9 : 0.82;
  g.add(body);
  const scale = isBoss ? 1.14 : 1.0;
  body.scale.setScalar(scale);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.56, 0.25),
    isBoss ? GANG_BOSS_MAT : GANG_SHIRT_MAT
  );
  torso.position.y = 0.28;
  torso.castShadow = true;
  body.add(torso);

  if (isBoss) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.27), GANG_SHIRT_MAT);
    tie.position.y = 0.3;
    body.add(tie);
  } else {
    const bandana = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.28), GANG_SHIRT_MAT);
    bandana.position.y = 0.76;
    body.add(bandana);
  }

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), GANG_SKIN_MAT);
  head.position.y = 0.68;
  body.add(head);

  if (isBoss) {
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.08, 0.05), GANG_GOLD_MAT);
    shades.position.set(0, 0.7, 0.14);
    body.add(shades);
  }

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.18), GANG_PANTS_MAT);
  legL.position.set(-0.12, -0.36, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.18), GANG_PANTS_MAT);
  legR.position.set(0.12, -0.36, 0);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.15), isBoss ? GANG_BOSS_MAT : GANG_SHIRT_MAT);
  armL.position.set(-0.29, 0.28, 0);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.15), isBoss ? GANG_BOSS_MAT : GANG_SHIRT_MAT);
  armR.position.set(0.29, 0.28, 0);

  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.44), GANG_GUN_MAT);
  gun.position.set(0, -0.22, 0.24);
  armR.add(gun);

  body.add(legL, legR, armL, armR);
  return { group: g, body, legL, legR, armL, armR };
}

export function createCombatSystem(scene, city, vehicleMgr, pedMgr, policeSys, effects, audio, rng) {
  const gangMembers = [];

  function spawnGangMember(x, z, options = {}) {
    const isBoss = !!options.isBoss;
    const built = buildGangMesh(isBoss);
    const gy = city.getGroundHeight(x, z);
    built.group.position.set(x, gy, z);
    scene.add(built.group);

    const enemy = {
      id: options.id || `gang_${Date.now()}_${Math.floor(rng() * 1e5)}`,
      name: options.name || (isBoss ? 'Hector Salgado' : 'Marea Roja Enforcer'),
      isBoss,
      missionTag: options.missionTag || null,
      mesh: built.group,
      parts: built,
      pos: new THREE.Vector3(x, gy, z),
      homePos: new THREE.Vector3(x, gy, z),
      yaw: options.yaw ?? 0,
      hp: options.hp ?? (isBoss ? 240 : 65),
      maxHp: options.hp ?? (isBoss ? 240 : 65),
      alive: true,
      fireCooldown: rngRange(rng, 0.6, 1.4),
      aggroRange: options.aggroRange ?? 46,
      accuracy: options.accuracy ?? (isBoss ? 0.66 : 0.44),
      damage: options.damage ?? (isBoss ? 12 : 7),
      cycle: rng() * 6,
      strafeDir: rng() < 0.5 ? 1 : -1,
      strafeTimer: rngRange(rng, 1.5, 3.2),
    };
    gangMembers.push(enemy);
    return enemy;
  }

  function clearMissionEnemies(tag = null) {
    for (let i = gangMembers.length - 1; i >= 0; i--) {
      const g = gangMembers[i];
      if (!tag || g.missionTag === tag) {
        scene.remove(g.mesh);
        gangMembers.splice(i, 1);
      }
    }
  }

  function damageGangMember(enemy, amount, player) {
    if (!enemy.alive) return;
    enemy.hp -= amount;
    if (effects) effects.spawnSpark(enemy.pos.x, enemy.pos.y + 1.15, enemy.pos.z, 0xff4d6d);
    if (enemy.hp <= 0) {
      enemy.alive = false;
      enemy.parts.body.rotation.x = Math.PI / 2;
      enemy.parts.body.position.y = 0.24;
      if (player) player.stats.kills += 1;
      if (effects) {
        effects.spawnPickup('cash', enemy.pos.x, enemy.pos.z, enemy.isBoss ? 500 : 120);
        if (rng() < 0.45) {
          effects.spawnPickup(rng() < 0.5 ? 'health' : 'ammo', enemy.pos.x + 0.9, enemy.pos.z + 0.6, 30);
        }
      }
    }
  }

  // Ray-cylinder / sphere hit test helper
  function rayHitActor(origin, dir, maxDist, pos, radius, height) {
    const cx = pos.x;
    const cy = pos.y + height * 0.5;
    const cz = pos.z;
    const ox = origin.x - cx;
    const oy = origin.y - cy;
    const oz = origin.z - cz;
    const b = ox * dir.x + oy * dir.y + oz * dir.z;
    const r = Math.max(radius, height * 0.46);
    const c = ox * ox + oy * oy + oz * oz - r * r;
    const disc = b * b - c;
    if (disc < 0) return -1;
    const t = -b - Math.sqrt(disc);
    if (t >= 0.2 && t <= maxDist) return t;
    return -1;
  }

  function firePlayerWeapon(playerCtrl, camera, callbacks = {}) {
    const player = playerCtrl.player;
    if (player.dead || player.busted || player.fireCooldown > 0 || player.reloadTimer > 0) return false;

    // Pick effective weapon (drive-by forces pistol or smg if unlocked)
    let weapon = playerCtrl.getWeapon();
    if (player.vehicle) {
      if (weapon.type !== 'gun' || weapon.id === 'shotgun') {
        weapon = player.inventory.smg.unlocked ? WEAPONS[2] : WEAPONS[1];
      }
    }

    if (weapon.type === 'melee') {
      player.fireCooldown = weapon.fireRate;
      player.punchTimer = 0.24;
      if (audio) audio.playPunch();
      const fwdX = Math.sin(player.yaw);
      const fwdZ = Math.cos(player.yaw);

      // Melee cone check against gang, police, peds
      const meleeCheck = (list, onHit) => {
        for (const t of list) {
          if (!t.alive) continue;
          const dx = t.pos.x - player.pos.x;
          const dz = t.pos.z - player.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < weapon.range && d > 0.01) {
            const dot = (dx * fwdX + dz * fwdZ) / d;
            if (dot > 0.25) onHit(t, dx / d, dz / d);
          }
        }
      };

      meleeCheck(gangMembers, (e) => damageGangMember(e, weapon.damage, player));
      meleeCheck(policeSys.officers, (o) => {
        policeSys.damageOfficer(o, weapon.damage, effects, () => {
          player.stats.kills += 1;
        });
        policeSys.addHeat(24, player, 2);
      });
      meleeCheck(pedMgr.peds, (p, ux, uz) => {
        pedMgr.damagePed(p, weapon.damage, ux * 6, uz * 6, effects, () => {
          player.stats.kills += 1;
          policeSys.addHeat(18, player, 1);
        });
        policeSys.addHeat(10, player, 1);
      });
      return true;
    }

    // Firearm check
    const inv = player.inventory[weapon.id];
    if (inv.mag <= 0) {
      if (inv.reserve > 0) {
        playerCtrl.startReload();
      } else if (audio) {
        audio.playUiClick(240);
      }
      return false;
    }

    inv.mag -= 1;
    player.fireCooldown = weapon.fireRate;
    if (inv.mag === 0 && inv.reserve > 0) {
      playerCtrl.startReload();
    }

    if (audio) audio.playGunshot(weapon.id, 0.9);
    pedMgr.alertPanic(player.pos.x, player.pos.z, 40);
    // Firing in public gently raises heat if already near cops or spamming
    if (policeSys.state.stars > 0) {
      policeSys.addHeat(4, player);
    }

    // Aim ray from camera center, then trace from muzzle to hit point
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const muzzle = playerCtrl.getMuzzleWorldPos();

    // Find camera aim point so third-person crosshair aligns cleanly
    const aimBuilding = city.raycastBuildings(camera.position, camDir, weapon.range + 12);
    const aimPoint = aimBuilding.point;

    const baseDir = aimPoint.clone().sub(muzzle).normalize();

    for (let p = 0; p < weapon.pellets; p++) {
      const spread = weapon.spread * (player.aiming ? 0.45 : 1.0) * (player.vehicle ? 1.35 : 1.0);
      const shotDir = baseDir.clone();
      shotDir.x += (rng() - 0.5) * spread * 2;
      shotDir.y += (rng() - 0.5) * spread * 1.6;
      shotDir.z += (rng() - 0.5) * spread * 2;
      shotDir.normalize();

      const bHit = city.raycastBuildings(muzzle, shotDir, weapon.range);
      let bestDist = bHit.dist;
      let hitKind = bHit.hit ? 'building' : null;
      let hitTarget = null;

      // Test gang enemies
      for (const e of gangMembers) {
        if (!e.alive) continue;
        const t = rayHitActor(muzzle, shotDir, bestDist, e.pos, 0.65, 1.85);
        if (t > 0 && t < bestDist) {
          bestDist = t;
          hitKind = 'gang';
          hitTarget = e;
        }
      }

      // Test police officers
      for (const o of policeSys.officers) {
        if (!o.alive) continue;
        const t = rayHitActor(muzzle, shotDir, bestDist, o.pos, 0.62, 1.8);
        if (t > 0 && t < bestDist) {
          bestDist = t;
          hitKind = 'police';
          hitTarget = o;
        }
      }

      // Test pedestrians
      for (const ped of pedMgr.peds) {
        if (!ped.alive) continue;
        const t = rayHitActor(muzzle, shotDir, bestDist, ped.pos, 0.55, 1.75);
        if (t > 0 && t < bestDist) {
          bestDist = t;
          hitKind = 'ped';
          hitTarget = ped;
        }
      }

      // Test vehicles (excluding player's own vehicle)
      for (const v of vehicleMgr.vehicles) {
        if (v === player.vehicle || v.destroyed) continue;
        const t = rayHitActor(muzzle, shotDir, bestDist, v.pos, v.spec.length * 0.48, v.spec.height + 0.5);
        if (t > 0 && t < bestDist) {
          bestDist = t;
          hitKind = 'vehicle';
          hitTarget = v;
        }
      }

      const endPoint = muzzle.clone().addScaledVector(shotDir, bestDist);
      if (effects) effects.spawnTracer(muzzle, endPoint, weapon.tracerColor);

      if (hitKind === 'building') {
        if (effects) effects.spawnSpark(endPoint.x, endPoint.y, endPoint.z, 0xffe49c);
      } else if (hitKind === 'gang' && hitTarget) {
        damageGangMember(hitTarget, weapon.damage, player);
      } else if (hitKind === 'police' && hitTarget) {
        policeSys.damageOfficer(hitTarget, weapon.damage, effects, () => {
          player.stats.kills += 1;
        });
        policeSys.addHeat(26, player, 2);
      } else if (hitKind === 'ped' && hitTarget) {
        pedMgr.damagePed(hitTarget, weapon.damage, shotDir.x * 5, shotDir.z * 5, effects, () => {
          player.stats.kills += 1;
          policeSys.addHeat(22, player, 1);
        });
        policeSys.addHeat(14, player, 1);
      } else if (hitKind === 'vehicle' && hitTarget) {
        if (effects) effects.spawnSpark(endPoint.x, endPoint.y, endPoint.z, 0xffd166);
        vehicleMgr.damageVehicle(hitTarget, weapon.damage * 0.7, effects, audio, callbacks.onVehicleExplode);
        if (hitTarget.classId === 'police') {
          policeSys.addHeat(20, player, 2);
        } else {
          policeSys.addHeat(6, player, 1);
        }
      }
    }

    return true;
  }

  function updateGangAI(dt, playerCtrl, callbacks = {}) {
    const player = playerCtrl.player;
    if (player.dead || player.busted) return;

    for (let i = 0; i < gangMembers.length; i++) {
      const e = gangMembers[i];
      if (!e.alive) continue;

      const dx = player.pos.x - e.pos.x;
      const dz = player.pos.z - e.pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist > e.aggroRange) {
        e.parts.legL.rotation.x *= 0.85;
        e.parts.legR.rotation.x *= 0.85;
        e.parts.armR.rotation.x = -0.3;
        continue;
      }

      const hasLOS = city.hasLineOfSight(
        e.pos.x,
        e.pos.y + 1.35,
        e.pos.z,
        player.pos.x,
        player.pos.y + 1.2,
        player.pos.z
      );

      e.yaw = Math.atan2(dx, dz);
      e.mesh.rotation.y = e.yaw;

      // Strafe / advance tactically
      e.strafeTimer -= dt;
      if (e.strafeTimer <= 0) {
        e.strafeTimer = rngRange(rng, 1.4, 3.0);
        e.strafeDir = -e.strafeDir;
      }

      let moveX = 0;
      let moveZ = 0;
      if (!hasLOS || dist > 18) {
        moveX = dx / Math.max(0.1, dist);
        moveZ = dz / Math.max(0.1, dist);
      } else if (dist < 8) {
        moveX = -(dx / Math.max(0.1, dist)) * 0.6;
        moveZ = -(dz / Math.max(0.1, dist)) * 0.6;
      } else {
        // Lateral strafe
        moveX = -(dz / Math.max(0.1, dist)) * e.strafeDir * 0.65;
        moveZ = (dx / Math.max(0.1, dist)) * e.strafeDir * 0.65;
      }

      const spd = e.isBoss ? 4.4 : 3.9;
      const nx = e.pos.x + moveX * spd * dt;
      const nz = e.pos.z + moveZ * spd * dt;
      const col = city.resolveCircleCollision(nx, nz, 0.45);
      e.pos.x = col.x;
      e.pos.z = col.z;
      e.pos.y = city.getGroundHeight(e.pos.x, e.pos.z);
      e.mesh.position.copy(e.pos);

      const moved = Math.hypot(moveX, moveZ) > 0.1;
      if (moved) {
        e.cycle += dt * 9.5;
        const sw = Math.sin(e.cycle) * 0.6;
        e.parts.legL.rotation.x = sw;
        e.parts.legR.rotation.x = -sw;
      }
      e.parts.armR.rotation.x = hasLOS ? -1.48 : -0.5;

      // Fire at player
      e.fireCooldown -= dt;
      if (hasLOS && dist < 42 && e.fireCooldown <= 0) {
        e.fireCooldown = e.isBoss ? rngRange(rng, 0.35, 0.72) : rngRange(rng, 0.75, 1.35);
        const muzzle = new THREE.Vector3(e.pos.x, e.pos.y + 1.38, e.pos.z);
        const spread = (1.0 - e.accuracy) * 2.1;
        const target = new THREE.Vector3(
          player.pos.x + (rng() - 0.5) * spread,
          player.pos.y + 1.15 + (rng() - 0.5) * 0.5,
          player.pos.z + (rng() - 0.5) * spread
        );
        if (effects) effects.spawnTracer(muzzle, target, 0xff5e9c);
        if (audio) audio.playGunshot(e.isBoss ? 'smg' : 'pistol', 0.42);

        if (rng() < e.accuracy * (player.vehicle ? 0.52 : 0.78)) {
          if (player.vehicle) {
            vehicleMgr.damageVehicle(player.vehicle, e.damage * 0.9, effects, audio, callbacks.onVehicleExplode);
          } else {
            playerCtrl.takeDamage(e.damage);
          }
        }
      }
    }
  }

  return {
    gangMembers,
    spawnGangMember,
    clearMissionEnemies,
    damageGangMember,
    firePlayerWeapon,
    updateGangAI,
  };
}
