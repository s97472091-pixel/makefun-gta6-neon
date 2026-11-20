// Solana Bay — articulated player character (Marco Reyes), inventory, stats, and third-person camera.

import * as THREE from 'three';
import { CITY, WEAPONS, clamp, lerp, lerpAngle } from './config.js';

export function createCharacterMesh(shirtColor = 0x2ec4b6, pantsColor = 0x222831, skinColor = 0xd9a074) {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.75 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1b1e23, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x221b18, roughness: 0.85 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.66, 0.28), shirtMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  root.add(torso);

  // Head + hair + shades
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), skinMat);
  head.position.y = 1.68;
  head.castShadow = true;
  root.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), hairMat);
  hair.position.set(0, 1.84, -0.01);
  root.add(hair);

  const shades = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.08, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.2, metalness: 0.6 })
  );
  shades.position.set(0, 1.71, 0.16);
  root.add(shades);

  // Articulated limbs (pivoted at shoulder/hip)
  function makeLimb(w, h, d, mat, yOffset) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.y = -h * 0.5;
    mesh.castShadow = true;
    pivot.add(mesh);
    pivot.position.y = yOffset;
    return pivot;
  }

  const leftArm = makeLimb(0.16, 0.62, 0.16, shirtMat, 1.44);
  leftArm.position.x = -0.36;
  root.add(leftArm);

  const rightArm = makeLimb(0.16, 0.62, 0.16, shirtMat, 1.44);
  rightArm.position.x = 0.36;
  root.add(rightArm);

  // Simple weapon prop mounted on right hand
  const gunProp = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.11, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x252a32, roughness: 0.4, metalness: 0.65 })
  );
  gunProp.position.set(0, -0.56, 0.2);
  gunProp.visible = false;
  rightArm.add(gunProp);

  const leftLeg = makeLimb(0.2, 0.78, 0.2, pantsMat, 0.82);
  leftLeg.position.x = -0.14;
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.12, 0.28), shoeMat);
  leftShoe.position.set(0, -0.76, 0.04);
  leftLeg.add(leftShoe);
  root.add(leftLeg);

  const rightLeg = makeLimb(0.2, 0.78, 0.2, pantsMat, 0.82);
  rightLeg.position.x = 0.14;
  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.12, 0.28), shoeMat);
  rightShoe.position.set(0, -0.76, 0.04);
  rightLeg.add(rightShoe);
  root.add(rightLeg);

  return {
    root,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    gunProp,
  };
}

export function createPlayer(scene) {
  const rig = createCharacterMesh(0x2ec4b6, 0x1d2633, 0xd89d72);
  scene.add(rig.root);

  const ammo = {};
  for (const w of WEAPONS) {
    ammo[w.id] = {
      mag: w.magSize,
      reserve: w.startReserve || 0,
    };
  }

  const state = {
    x: 96,
    y: 0,
    z: -48,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Math.PI,
    radius: 0.48,
    grounded: true,
    hp: 100,
    maxHp: 100,
    armor: 45,
    maxArmor: 100,
    cash: 650,
    weaponIndex: 1, // starts with Marlin 9mm
    ammo,
    fireCooldown: 0,
    reloadTimer: 0,
    walkCycle: 0,
    punchTimer: 0,
    vehicle: null,
    dead: false,
    busted: false,
    damageFlash: 0,
    stats: {
      carsStolen: 0,
      takedowns: 0,
      distanceDriven: 0,
      missionsDone: 0,
    },
    camYaw: Math.PI,
    camPitch: 0.26,
    camAiming: false,
    camPos: new THREE.Vector3(96, 4, -40),
    camLook: new THREE.Vector3(96, 1.5, -48),
  };

  function getWeapon() {
    return WEAPONS[state.weaponIndex] || WEAPONS[0];
  }

  function switchWeapon(index) {
    const next = ((index % WEAPONS.length) + WEAPONS.length) % WEAPONS.length;
    if (next === state.weaponIndex) return;
    state.weaponIndex = next;
    state.reloadTimer = 0;
    const w = getWeapon();
    rig.gunProp.visible = w.type !== 'melee';
    rig.gunProp.scale.z = w.id === 'shotgun' ? 1.5 : w.id === 'smg' ? 1.15 : 0.85;
  }

  function startReload() {
    const w = getWeapon();
    if (w.type === 'melee' || state.reloadTimer > 0) return false;
    const a = state.ammo[w.id];
    if (a.mag >= w.magSize || a.reserve <= 0) return false;
    state.reloadTimer = w.reloadTime;
    return true;
  }

  function refillAllAmmo() {
    for (const w of WEAPONS) {
      if (w.type !== 'melee') {
        state.ammo[w.id].mag = w.magSize;
        state.ammo[w.id].reserve = w.maxReserve;
      }
    }
  }

  function takeDamage(amount) {
    if (state.dead || state.busted) return;
    state.damageFlash = 1.0;
    let remaining = amount;
    if (state.armor > 0) {
      const absorbed = Math.min(state.armor, remaining * 0.65);
      state.armor -= absorbed;
      remaining -= absorbed;
    }
    state.hp = Math.max(0, state.hp - remaining);
    if (state.hp <= 0) {
      state.dead = true;
    }
  }

  function respawnAt(x, z) {
    state.x = x;
    state.y = 0;
    state.z = z;
    state.vx = 0;
    state.vy = 0;
    state.vz = 0;
    state.hp = state.maxHp;
    state.armor = Math.max(state.armor, 25);
    state.dead = false;
    state.busted = false;
    state.vehicle = null;
    rig.root.visible = true;
    rig.root.position.set(x, 0, z);
  }

  function update(dt, input, city) {
    state.fireCooldown = Math.max(0, state.fireCooldown - dt);
    state.punchTimer = Math.max(0, state.punchTimer - dt);
    state.damageFlash = Math.max(0, state.damageFlash - dt * 2.8);

    // Reload tick
    if (state.reloadTimer > 0) {
      state.reloadTimer -= dt;
      if (state.reloadTimer <= 0) {
        const w = getWeapon();
        const a = state.ammo[w.id];
        const needed = w.magSize - a.mag;
        const take = Math.min(needed, a.reserve);
        a.mag += take;
        a.reserve -= take;
        state.reloadTimer = 0;
      }
    }

    if (state.dead || state.busted) {
      rig.root.rotation.x = state.dead ? -Math.PI * 0.45 : 0;
      return;
    }
    rig.root.rotation.x = 0;

    if (state.vehicle) {
      rig.root.visible = false;
      state.x = state.vehicle.x;
      state.y = state.vehicle.y + 0.5;
      state.z = state.vehicle.z;
      state.yaw = state.vehicle.yaw;
      return;
    }

    rig.root.visible = true;

    // Camera-relative movement on foot
    let moveF = 0;
    let moveR = 0;
    if (input.forward) moveF += 1;
    if (input.backward) moveF -= 1;
    if (input.right) moveR += 1;
    if (input.left) moveR -= 1;

    const len = Math.hypot(moveF, moveR);
    const sprinting = input.sprint && !state.camAiming && moveF > 0;
    const speed = state.camAiming ? 4.4 : sprinting ? 10.6 : 6.6;

    if (len > 0.01) {
      moveF /= len;
      moveR /= len;
      const fx = Math.sin(state.camYaw);
      const fz = Math.cos(state.camYaw);
      const rx = -fz;
      const rz = fx;
      const dx = fx * moveF + rx * moveR;
      const dz = fz * moveF + rz * moveR;
      state.vx = lerp(state.vx, dx * speed, clamp(dt * 14, 0, 1));
      state.vz = lerp(state.vz, dz * speed, clamp(dt * 14, 0, 1));

      if (!state.camAiming) {
        const targetYaw = Math.atan2(dx, dz);
        state.yaw = lerpAngle(state.yaw, targetYaw, clamp(dt * 12, 0, 1));
      }
    } else {
      state.vx = lerp(state.vx, 0, clamp(dt * 12, 0, 1));
      state.vz = lerp(state.vz, 0, clamp(dt * 12, 0, 1));
    }

    if (state.camAiming) {
      state.yaw = lerpAngle(state.yaw, state.camYaw, clamp(dt * 16, 0, 1));
    }

    // Jump & gravity
    if (input.jump && state.grounded) {
      state.vy = 9.2;
      state.grounded = false;
    }
    state.vy -= CITY.gravity * dt;

    const nextX = state.x + state.vx * dt;
    const nextZ = state.z + state.vz * dt;
    const col = city.resolveCircleCollision(nextX, nextZ, state.radius);
    state.x = col.x;
    state.z = col.z;

    const groundY = city.getGroundHeight(state.x, state.z);
    state.y += state.vy * dt;
    if (state.y <= groundY) {
      state.y = groundY;
      state.vy = 0;
      state.grounded = true;
    }

    // Animate character limbs
    const horizSpeed = Math.hypot(state.vx, state.vz);
    if (horizSpeed > 0.35 && state.grounded) {
      state.walkCycle += dt * horizSpeed * 1.45;
      const swing = Math.sin(state.walkCycle) * 0.65;
      rig.leftLeg.rotation.x = swing;
      rig.rightLeg.rotation.x = -swing;
      rig.leftArm.rotation.x = -swing * 0.7;
      rig.rightArm.rotation.x = state.camAiming ? -1.45 : swing * 0.7;
    } else {
      rig.leftLeg.rotation.x = lerp(rig.leftLeg.rotation.x, 0, dt * 10);
      rig.rightLeg.rotation.x = lerp(rig.rightLeg.rotation.x, 0, dt * 10);
      rig.leftArm.rotation.x = lerp(rig.leftArm.rotation.x, 0, dt * 10);
      rig.rightArm.rotation.x = lerp(rig.rightArm.rotation.x, state.camAiming ? -1.45 : 0, dt * 12);
    }

    const w = getWeapon();
    rig.gunProp.visible = w.type !== 'melee';
    if (state.punchTimer > 0) {
      rig.rightArm.rotation.x = -1.65;
    } else if (w.type !== 'melee' && (state.camAiming || state.fireCooldown > 0.05)) {
      rig.rightArm.rotation.x = -1.48;
    }

    rig.root.position.set(state.x, state.y, state.z);
    rig.root.rotation.y = state.yaw;
  }

  function updateCamera(dt, camera, city) {
    let desiredPos;
    let desiredLook;

    if (state.vehicle) {
      const v = state.vehicle;
      const backDist = 7.8 + Math.min(2.6, Math.abs(v.speed) * 0.06);
      const height = 3.45;
      const yaw = state.camYaw;
      desiredPos = new THREE.Vector3(
        v.x - Math.sin(yaw) * backDist * Math.cos(state.camPitch),
        v.y + height + Math.sin(state.camPitch) * 3.8,
        v.z - Math.cos(yaw) * backDist * Math.cos(state.camPitch)
      );
      desiredLook = new THREE.Vector3(
        v.x + Math.sin(yaw) * 4.2,
        v.y + 1.35,
        v.z + Math.cos(yaw) * 4.2
      );
    } else if (state.camAiming) {
      const dist = 2.6;
      const rightX = -Math.cos(state.camYaw) * 0.72;
      const rightZ = Math.sin(state.camYaw) * 0.72;
      desiredPos = new THREE.Vector3(
        state.x + rightX - Math.sin(state.camYaw) * dist * Math.cos(state.camPitch),
        state.y + 1.72 + Math.sin(state.camPitch) * dist,
        state.z + rightZ - Math.cos(state.camYaw) * dist * Math.cos(state.camPitch)
      );
      desiredLook = new THREE.Vector3(
        state.x + rightX * 0.35 + Math.sin(state.camYaw) * 18,
        state.y + 1.62 - Math.sin(state.camPitch) * 10,
        state.z + rightZ * 0.35 + Math.cos(state.camYaw) * 18
      );
    } else {
      const dist = 5.4;
      desiredPos = new THREE.Vector3(
        state.x - Math.sin(state.camYaw) * dist * Math.cos(state.camPitch),
        state.y + 2.25 + Math.sin(state.camPitch) * dist,
        state.z - Math.cos(state.camYaw) * dist * Math.cos(state.camPitch)
      );
      desiredLook = new THREE.Vector3(
        state.x + Math.sin(state.camYaw) * 2.5,
        state.y + 1.55,
        state.z + Math.cos(state.camYaw) * 2.5
      );
    }

    // Pull camera in if a building blocks the arm from pivot to camera
    const pivot = new THREE.Vector3(state.x, state.y + 1.6, state.z);
    const arm = desiredPos.clone().sub(pivot);
    const armLen = arm.length();
    if (armLen > 0.2) {
      const dir = arm.clone().divideScalar(armLen);
      const hit = city.raycastBuildings(pivot, dir, armLen);
      if (hit.hit) {
        desiredPos.copy(pivot).addScaledVector(dir, Math.max(1.0, hit.distance - 0.55));
      }
    }
    desiredPos.y = Math.max(0.9, desiredPos.y);

    const smooth = clamp(dt * (state.camAiming ? 18 : 10), 0, 1);
    state.camPos.lerp(desiredPos, smooth);
    state.camLook.lerp(desiredLook, clamp(dt * 14, 0, 1));

    camera.position.copy(state.camPos);
    camera.lookAt(state.camLook);

    const targetFov = state.camAiming ? 46 : state.vehicle ? 64 + Math.min(10, Math.abs(state.vehicle.speed) * 0.22) : 60;
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov = lerp(camera.fov, targetFov, clamp(dt * 8, 0, 1));
      camera.updateProjectionMatrix();
    }
  }

  // Initialize gun visibility for default pistol
  rig.gunProp.visible = true;

  return {
    state,
    rig,
    getWeapon,
    switchWeapon,
    startReload,
    refillAllAmmo,
    takeDamage,
    respawnAt,
    update,
    updateCamera,
  };
}
