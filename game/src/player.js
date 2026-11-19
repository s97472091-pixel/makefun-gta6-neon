// Player controller: 3D Mateo Reyes character, on-foot physics, vehicle boarding, camera rig & stats.
import * as THREE from 'three';
import { WEAPONS, LANDMARKS, clamp, lerp, angleDiff } from './config.js';

export function buildCharacterMesh(shirtColor, pantsColor, skinColor = 0xd9a07c) {
  const g = new THREE.Group();

  const skinMat = new THREE.MeshLambertMaterial({ color: skinColor });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirtColor });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pantsColor });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x1b161a });
  const shoeMat = new THREE.MeshLambertMaterial({ color: 0x22252e });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.7, 0.32), shirtMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  g.add(torso);

  // Head + sunglasses
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skinMat);
  head.position.y = 1.72;
  head.castShadow = true;
  g.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.38), hairMat);
  hair.position.set(0, 1.88, -0.02);
  g.add(hair);

  const shades = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.08, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x11131a })
  );
  shades.position.set(0, 1.74, 0.17);
  g.add(shades);

  // Articulated limbs
  const legGeo = new THREE.BoxGeometry(0.22, 0.76, 0.24);
  const armGeo = new THREE.BoxGeometry(0.18, 0.64, 0.2);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.15, 0.78, 0);
  const llMesh = new THREE.Mesh(legGeo, pantsMat);
  llMesh.position.y = -0.38;
  llMesh.castShadow = true;
  const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.32), shoeMat);
  lShoe.position.set(0, -0.74, 0.05);
  leftLeg.add(llMesh, lShoe);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.15, 0.78, 0);
  const rlMesh = new THREE.Mesh(legGeo, pantsMat);
  rlMesh.position.y = -0.38;
  rlMesh.castShadow = true;
  const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.32), shoeMat);
  rShoe.position.set(0, -0.74, 0.05);
  rightLeg.add(rlMesh, rShoe);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.39, 1.42, 0);
  const laMesh = new THREE.Mesh(armGeo, shirtMat);
  laMesh.position.y = -0.28;
  laMesh.castShadow = true;
  leftArm.add(laMesh);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.39, 1.42, 0);
  const raMesh = new THREE.Mesh(armGeo, shirtMat);
  raMesh.position.y = -0.28;
  raMesh.castShadow = true;
  rightArm.add(raMesh);

  // Gun prop attached to right hand
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.14, 0.45),
    new THREE.MeshLambertMaterial({ color: 0x202530 })
  );
  gun.position.set(0, -0.52, 0.22);
  gun.visible = false;
  rightArm.add(gun);

  g.add(leftLeg, rightLeg, leftArm, rightArm);
  g.userData = { leftLeg, rightLeg, leftArm, rightArm, gun };
  return g;
}

export function createPlayer(scene, saved = null) {
  // Mateo Reyes: crisp coral-teal coastal jacket & dark jeans
  const mesh = buildCharacterMesh(0x1f9e9a, 0x20263a, 0xd89e76);
  scene.add(mesh);

  const state = {
    mesh,
    x: saved?.x ?? 218,
    y: 0.22,
    z: saved?.z ?? -42,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: saved?.yaw ?? Math.PI,
    onGround: true,

    hp: saved?.hp ?? 100,
    maxHp: 100,
    armor: saved?.armor ?? 40,
    maxArmor: 100,
    cash: saved?.cash ?? 500,

    // Weapons & ammo
    weaponIndex: saved?.weaponIndex ?? 1, // 9mm Coastal Pistol
    unlockedWeapons: saved?.unlockedWeapons ?? ['fists', 'pistol'],
    ammo: saved?.ammo ?? { pistol: 72, smg: 0, shotgun: 0 },
    mag: saved?.mag ?? { pistol: 12, smg: 32, shotgun: 6 },
    fireCooldown: 0,
    reloadTimer: 0,
    punchAnim: 0,

    // Driving link
    vehicle: null,

    // Camera state
    camYaw: saved?.yaw ?? Math.PI,
    camPitch: 0.22,
    camPos: new THREE.Vector3(218, 6, -34),
    camLook: new THREE.Vector3(218, 2, -42),
    shake: 0,
    aiming: false,

    // Alive / status
    dead: false,
    busted: false,
    walkCycle: 0,
    damageFlash: 0,

    // Career stats
    stats: saved?.stats ?? {
      missionsCompleted: 0,
      carsStolen: 0,
      enemiesDefeated: 0,
      stuntsDone: 0,
      totalEarned: 500,
    },
  };

  mesh.position.set(state.x, state.y, state.z);
  mesh.rotation.y = state.yaw;

  function currentWeapon() {
    return WEAPONS[state.weaponIndex] || WEAPONS[0];
  }

  function selectWeapon(idx) {
    if (idx < 0 || idx >= WEAPONS.length) return;
    if (!state.unlockedWeapons.includes(WEAPONS[idx].id)) return;
    state.weaponIndex = idx;
    state.reloadTimer = 0;
  }

  function unlockWeapon(id, bonusAmmo = 0) {
    if (!state.unlockedWeapons.includes(id)) state.unlockedWeapons.push(id);
    const w = WEAPONS.find((item) => item.id === id);
    if (w && !w.melee) {
      state.ammo[id] = (state.ammo[id] || 0) + bonusAmmo;
      if ((state.mag[id] || 0) === 0) state.mag[id] = w.mag;
    }
  }

  function addCash(amount) {
    state.cash = Math.max(0, state.cash + amount);
    if (amount > 0) state.stats.totalEarned += amount;
  }

  function takeDamage(amount) {
    if (state.dead || state.busted || amount <= 0) return;
    state.damageFlash = 1.0;
    state.shake = Math.min(0.6, state.shake + 0.22);
    let rem = amount;
    if (state.armor > 0) {
      const absorbed = Math.min(state.armor, rem * 0.72);
      state.armor -= absorbed;
      rem -= absorbed;
    }
    state.hp = Math.max(0, state.hp - rem);
    if (state.hp <= 0) {
      state.dead = true;
    }
  }

  function respawn(reason = 'wasted') {
    const spot = reason === 'busted' ? LANDMARKS.precinct : LANDMARKS.hospital;
    if (state.vehicle) {
      state.vehicle.driver = null;
      state.vehicle = null;
    }
    state.x = spot.entryX;
    state.z = spot.entryZ;
    state.y = 0.22;
    state.vx = 0;
    state.vy = 0;
    state.vz = 0;
    state.hp = state.maxHp;
    state.dead = false;
    state.busted = false;
    state.mesh.visible = true;
    state.cash = Math.max(0, state.cash - 100);
    state.camPos.set(state.x, 5, state.z + 9);
  }

  function updateOnFoot(dt, input, city) {
    const forward = (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0) - (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0);
    const strafe = (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0) - (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0);
    const sprinting = !!(input.keys.ShiftLeft || input.keys.ShiftRight) && !state.aiming;
    const speed = state.aiming ? 4.4 : sprinting ? 10.6 : 6.8;

    // Camera-relative horizontal movement
    const sinY = Math.sin(state.camYaw);
    const cosY = Math.cos(state.camYaw);
    let mx = -sinY * forward + cosY * strafe;
    let mz = -cosY * forward - sinY * strafe;
    const mLen = Math.hypot(mx, mz);

    if (mLen > 0.01) {
      mx /= mLen;
      mz /= mLen;
      state.vx = lerp(state.vx, mx * speed, Math.min(1, dt * 14));
      state.vz = lerp(state.vz, mz * speed, Math.min(1, dt * 14));
      const desiredYaw = Math.atan2(mx, mz);
      state.yaw += angleDiff(state.yaw, desiredYaw) * Math.min(1, dt * 13);
    } else {
      state.vx = lerp(state.vx, 0, Math.min(1, dt * 14));
      state.vz = lerp(state.vz, 0, Math.min(1, dt * 14));
    }

    if (state.aiming) {
      const aimYaw = state.camYaw + Math.PI;
      state.yaw += angleDiff(state.yaw, aimYaw) * Math.min(1, dt * 18);
    }

    // Jump & gravity
    if (input.keys.Space && state.onGround) {
      state.vy = 7.4;
      state.onGround = false;
    }
    state.vy -= 21 * dt;

    state.x += state.vx * dt;
    state.z += state.vz * dt;
    state.y += state.vy * dt;

    const col = city.resolveCircleCollision(state.x, state.z, 0.55);
    state.x = col.x;
    state.z = col.z;

    const groundY = city.getGroundHeight(state.x, state.z);
    if (state.y <= groundY) {
      state.y = groundY;
      state.vy = 0;
      state.onGround = true;
    }

    // Animate limbs
    const hSpeed = Math.hypot(state.vx, state.vz);
    const { leftLeg, rightLeg, leftArm, rightArm, gun } = mesh.userData;
    const w = currentWeapon();
    gun.visible = !w.melee;

    if (hSpeed > 0.35 && state.onGround) {
      state.walkCycle += dt * hSpeed * 1.65;
      const swing = Math.sin(state.walkCycle) * 0.72;
      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
      leftArm.rotation.x = -swing * 0.7;
      rightArm.rotation.x = (state.aiming || !w.melee) ? -1.25 : swing * 0.7;
    } else {
      leftLeg.rotation.x = lerp(leftLeg.rotation.x, 0, dt * 10);
      rightLeg.rotation.x = lerp(rightLeg.rotation.x, 0, dt * 10);
      leftArm.rotation.x = lerp(leftArm.rotation.x, 0, dt * 10);
      rightArm.rotation.x = lerp(rightArm.rotation.x, (state.aiming || !w.melee) ? -1.25 : 0, dt * 10);
    }

    if (state.punchAnim > 0) {
      state.punchAnim = Math.max(0, state.punchAnim - dt * 5);
      rightArm.rotation.x = -1.65 * Math.sin(state.punchAnim * Math.PI);
    }

    mesh.visible = true;
    mesh.position.set(state.x, state.y, state.z);
    mesh.rotation.y = state.yaw;
  }

  function updateCamera(dt, camera, input, city) {
    // Keyboard camera assist (Q / E) for trackpad players
    if (input.keys.KeyQ) state.camYaw += 1.9 * dt;
    if (input.keys.KeyE && !state.vehicle) {
      // E also interacts, so only Q rotates or mouse rotates
    }

    state.aiming = !!input.mouseRight && !state.vehicle;
    state.shake = Math.max(0, state.shake - dt * 1.9);
    state.damageFlash = Math.max(0, state.damageFlash - dt * 2.4);

    let targetX = state.x;
    let targetY = state.y + 1.55;
    let targetZ = state.z;
    let dist = state.aiming ? 3.2 : 6.4;
    let heightOff = state.aiming ? 1.85 : 2.55;
    let desiredFov = state.aiming ? 48 : 62;

    if (state.vehicle) {
      const v = state.vehicle;
      targetX = v.x;
      targetY = v.y + 1.45;
      targetZ = v.z;
      dist = 8.4 + Math.min(2.6, Math.abs(v.speed) * 0.06);
      heightOff = 3.25;
      desiredFov = 64 + Math.min(14, Math.abs(v.speed) * 0.32);

      // Auto-align camera behind vehicle when moving and mouse isn't actively turning
      if (Math.abs(v.speed) > 1.5 && input.mouseIdleTime > 0.75) {
        const behindYaw = v.yaw + Math.PI;
        state.camYaw += angleDiff(state.camYaw, behindYaw) * Math.min(1, dt * 3.4);
      }
      state.camPitch = lerp(state.camPitch, 0.24, Math.min(1, dt * 2.5));
    }

    camera.fov = lerp(camera.fov, desiredFov, Math.min(1, dt * 8));
    camera.updateProjectionMatrix();

    const horiz = Math.cos(state.camPitch) * dist;
    const vert = Math.sin(state.camPitch) * dist + heightOff * 0.45;
    const shoulder = state.aiming ? 0.85 : 0;

    let desiredX = targetX + Math.sin(state.camYaw) * horiz + Math.cos(state.camYaw) * shoulder;
    let desiredY = Math.max(1.1, targetY + vert);
    let desiredZ = targetZ + Math.cos(state.camYaw) * horiz - Math.sin(state.camYaw) * shoulder;

    // Keep camera outside buildings
    const camCol = city.resolveCircleCollision(desiredX, desiredZ, 0.75);
    if (camCol.hit) {
      desiredX = lerp(targetX, camCol.x, 0.85);
      desiredZ = lerp(targetZ, camCol.z, 0.85);
    }

    const smooth = Math.min(1, dt * (state.vehicle ? 8.5 : 12));
    state.camPos.x = lerp(state.camPos.x, desiredX, smooth);
    state.camPos.y = lerp(state.camPos.y, desiredY, smooth);
    state.camPos.z = lerp(state.camPos.z, desiredZ, smooth);

    const shakeAmt = state.shake * 0.45;
    camera.position.set(
      state.camPos.x + (Math.random() - 0.5) * shakeAmt,
      state.camPos.y + (Math.random() - 0.5) * shakeAmt,
      state.camPos.z + (Math.random() - 0.5) * shakeAmt
    );

    const lookAhead = state.aiming ? 14 : 2.0;
    state.camLook.set(
      targetX - Math.sin(state.camYaw) * lookAhead,
      targetY - Math.sin(state.camPitch) * (state.aiming ? 6 : 0.4),
      targetZ - Math.cos(state.camYaw) * lookAhead
    );
    camera.lookAt(state.camLook);
  }

  function update(dt, input, city, camera) {
    if (state.fireCooldown > 0) state.fireCooldown = Math.max(0, state.fireCooldown - dt);
    if (state.reloadTimer > 0) {
      state.reloadTimer -= dt;
      if (state.reloadTimer <= 0) {
        const w = currentWeapon();
        if (!w.melee) {
          const need = w.mag - (state.mag[w.id] || 0);
          const take = Math.min(need, state.ammo[w.id] || 0);
          state.mag[w.id] = (state.mag[w.id] || 0) + take;
          state.ammo[w.id] = (state.ammo[w.id] || 0) - take;
        }
      }
    }

    if (!state.dead && !state.busted) {
      if (state.vehicle) {
        state.x = state.vehicle.x;
        state.y = state.vehicle.y;
        state.z = state.vehicle.z;
        state.yaw = state.vehicle.yaw;
        mesh.visible = false;
      } else {
        updateOnFoot(dt, input, city);
      }
    }
    updateCamera(dt, camera, input, city);
  }

  return {
    state,
    currentWeapon,
    selectWeapon,
    unlockWeapon,
    addCash,
    takeDamage,
    respawn,
    update,
  };
}
