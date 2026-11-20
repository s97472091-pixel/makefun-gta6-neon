// Solana Bay — Articulated player character (Dante Vega), movement, weapons, stats & third-person camera
import * as THREE from 'three';
import { WEAPONS, GAME_CONSTANTS } from './config.js';

export function createPlayer(scene, city) {
  const group = new THREE.Group();
  scene.add(group);

  // Materials — sun-soaked coastal style for Dante Vega
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a077, roughness: 0.75 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1a18, roughness: 0.85 });
  const glassesMat = new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.15, metalness: 0.7 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x168aad, roughness: 0.65 }); // coastal teal jacket
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f2, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x262a34, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 });
  const gunMetalMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, metalness: 0.7, roughness: 0.35 });
  const gunAccentMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.65 });

  // Articulated rig
  const hips = new THREE.Group();
  hips.position.y = 0.88;
  group.add(hips);

  // Torso (white shirt core + teal jacket sides)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.26), jacketMat);
  torso.position.y = 0.3;
  torso.castShadow = true;
  hips.add(torso);

  const shirtFront = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.56, 0.275), shirtMat);
  shirtFront.position.y = 0.3;
  hips.add(shirtFront);

  // Head + hair + sunglasses
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.72;
  hips.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), hairMat);
  hair.position.set(0, 0.14, -0.01);
  headGroup.add(hair);

  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.075, 0.05), glassesMat);
  shades.position.set(0, 0.03, 0.14);
  headGroup.add(shades);

  // Legs
  function makeLimb(w, h, d, mat, yOffset) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.y = yOffset;
    mesh.castShadow = true;
    pivot.add(mesh);
    return pivot;
  }

  const leftLeg = makeLimb(0.18, 0.78, 0.2, pantsMat, -0.39);
  leftLeg.position.set(-0.13, 0, 0);
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.28), shoeMat);
  leftShoe.position.set(0, -0.8, 0.04);
  leftLeg.add(leftShoe);
  hips.add(leftLeg);

  const rightLeg = makeLimb(0.18, 0.78, 0.2, pantsMat, -0.39);
  rightLeg.position.set(0.13, 0, 0);
  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.28), shoeMat);
  rightShoe.position.set(0, -0.8, 0.04);
  rightLeg.add(rightShoe);
  hips.add(rightLeg);

  // Arms
  const leftArm = makeLimb(0.15, 0.56, 0.16, jacketMat, -0.26);
  leftArm.position.set(-0.31, 0.54, 0);
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), skinMat);
  leftHand.position.y = -0.56;
  leftArm.add(leftHand);
  hips.add(leftArm);

  const rightArm = makeLimb(0.15, 0.56, 0.16, jacketMat, -0.26);
  rightArm.position.set(0.31, 0.54, 0);
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), skinMat);
  rightHand.position.y = -0.56;
  rightArm.add(rightHand);
  hips.add(rightArm);

  // Weapon models attached to right hand
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0, -0.55, 0.14);
  rightArm.add(weaponPivot);

  const weaponMeshes = {};

  // Pistol mesh
  const pistolMesh = new THREE.Group();
  const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.3), gunMetalMat);
  pSlide.position.set(0, 0.04, 0.1);
  const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.08), gunAccentMat);
  pGrip.position.set(0, -0.05, 0.0);
  pistolMesh.add(pSlide, pGrip);
  weaponPivot.add(pistolMesh);
  weaponMeshes.pistol = pistolMesh;

  // SMG mesh
  const smgMesh = new THREE.Group();
  const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.48), gunMetalMat);
  sBody.position.set(0, 0.04, 0.16);
  const sMag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.07), gunMetalMat);
  sMag.position.set(0, -0.11, 0.22);
  smgMesh.add(sBody, sMag);
  weaponPivot.add(smgMesh);
  weaponMeshes.smg = smgMesh;

  // Shotgun mesh
  const sgMesh = new THREE.Group();
  const sgBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.72), gunMetalMat);
  sgBarrel.position.set(0, 0.05, 0.28);
  const sgStock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.24), gunAccentMat);
  sgStock.position.set(0, 0.01, -0.08);
  sgMesh.add(sgBarrel, sgStock);
  weaponPivot.add(sgMesh);
  weaponMeshes.shotgun = sgMesh;

  // Player state
  const inventory = {};
  for (const w of WEAPONS) {
    inventory[w.id] = {
      unlocked: !!w.unlockedDefault,
      mag: w.magSize,
      reserve: w.id === 'pistol' ? 60 : w.maxReserve,
    };
  }

  const player = {
    mesh: group,
    pos: new THREE.Vector3(GAME_CONSTANTS.START_SPAWN.x, 0, GAME_CONSTANTS.START_SPAWN.z),
    vel: new THREE.Vector3(),
    yaw: Math.PI, // facing direction on foot
    camYaw: Math.PI,
    camPitch: 0.22,
    onGround: true,
    health: 100,
    maxHealth: 100,
    armor: 40,
    maxArmor: 100,
    cash: 500,
    vehicle: null,
    weaponIndex: 1, // starts with M9 Coastal pistol
    inventory,
    fireCooldown: 0,
    reloadTimer: 0,
    punchTimer: 0,
    aiming: false,
    dead: false,
    busted: false,
    invulnTimer: 0,
    walkCycle: 0,
    damageFlash: 0,
    stats: {
      kills: 0,
      carsStolen: 0,
      missionsCompleted: 0,
      distanceDriven: 0,
      maxWanted: 0,
    },
    camPos: new THREE.Vector3(GAME_CONSTANTS.START_SPAWN.x, 4, GAME_CONSTANTS.START_SPAWN.z + 8),
    camLook: new THREE.Vector3(GAME_CONSTANTS.START_SPAWN.x, 1.5, GAME_CONSTANTS.START_SPAWN.z),
  };

  function getWeapon() {
    return WEAPONS[player.weaponIndex];
  }

  function getWeaponState(id = null) {
    return player.inventory[id || getWeapon().id];
  }

  function syncWeaponVisual() {
    const id = getWeapon().id;
    for (const k of Object.keys(weaponMeshes)) {
      weaponMeshes[k].visible = (k === id && !player.vehicle);
    }
  }
  syncWeaponVisual();

  function selectWeapon(index) {
    if (index < 0 || index >= WEAPONS.length) return false;
    const w = WEAPONS[index];
    if (!player.inventory[w.id].unlocked) return false;
    if (player.weaponIndex !== index) {
      player.weaponIndex = index;
      player.reloadTimer = 0;
      syncWeaponVisual();
    }
    return true;
  }

  function cycleWeapon(dir) {
    for (let step = 1; step <= WEAPONS.length; step++) {
      const idx = (player.weaponIndex + dir * step + WEAPONS.length) % WEAPONS.length;
      if (player.inventory[WEAPONS[idx].id].unlocked) {
        selectWeapon(idx);
        return true;
      }
    }
    return false;
  }

  function unlockWeapon(id, bonusReserve = null) {
    const w = WEAPONS.find((x) => x.id === id);
    if (!w) return;
    const inv = player.inventory[id];
    inv.unlocked = true;
    inv.mag = w.magSize;
    inv.reserve = Math.min(w.maxReserve, inv.reserve + (bonusReserve ?? Math.floor(w.maxReserve * 0.75)));
    syncWeaponVisual();
  }

  function startReload() {
    const w = getWeapon();
    if (w.type !== 'gun' || player.reloadTimer > 0) return false;
    const inv = player.inventory[w.id];
    if (inv.mag >= w.magSize || inv.reserve <= 0) return false;
    player.reloadTimer = w.reloadTime;
    return true;
  }

  function takeDamage(amount) {
    if (player.dead || player.busted || player.invulnTimer > 0) return;
    let remaining = amount;
    if (player.armor > 0) {
      const absorbed = Math.min(player.armor, remaining * 0.65);
      player.armor = Math.max(0, player.armor - absorbed);
      remaining -= absorbed;
    }
    player.health = Math.max(0, player.health - remaining);
    player.damageFlash = 1.0;
    if (player.health <= 0) {
      player.dead = true;
    }
  }

  function heal(hp = 100, armor = 0) {
    player.health = Math.min(player.maxHealth, player.health + hp);
    player.armor = Math.min(player.maxArmor, player.armor + armor);
  }

  function addCash(amount) {
    player.cash = Math.max(0, Math.round(player.cash + amount));
  }

  function setPosition(x, z, yaw = player.yaw) {
    const gy = city.getGroundHeight(x, z);
    player.pos.set(x, gy, z);
    player.vel.set(0, 0, 0);
    player.yaw = yaw;
    group.position.copy(player.pos);
    group.rotation.y = yaw;
  }

  function enterVehicle(veh) {
    player.vehicle = veh;
    veh.driver = 'player';
    veh.occupied = true;
    group.visible = false;
    player.reloadTimer = 0;
    player.vel.set(0, 0, 0);
    // Align camera behind vehicle
    player.camYaw = veh.yaw + Math.PI;
    player.camPitch = 0.22;
  }

  function exitVehicle() {
    if (!player.vehicle) return null;
    const veh = player.vehicle;
    veh.driver = null;
    veh.occupied = false;
    player.vehicle = null;
    group.visible = true;

    // Place Dante beside driver door (left side)
    const sideX = Math.cos(veh.yaw) * (veh.spec.width * 0.65 + 0.9);
    const sideZ = -Math.sin(veh.yaw) * (veh.spec.width * 0.65 + 0.9);
    let tx = veh.pos.x - sideX;
    let tz = veh.pos.z - sideZ;
    const res = city.resolveCircleCollision(tx, tz, GAME_CONSTANTS.PLAYER_RADIUS);
    tx = res.x;
    tz = res.z;
    const gy = city.getGroundHeight(tx, tz);
    player.pos.set(tx, gy, tz);
    player.vel.set(0, 0, 0);
    player.yaw = veh.yaw;
    player.onGround = true;
    group.position.copy(player.pos);
    group.rotation.y = player.yaw;
    syncWeaponVisual();
    return veh;
  }

  function getMuzzleWorldPos() {
    if (player.vehicle) {
      const v = player.vehicle;
      return new THREE.Vector3(v.pos.x, v.pos.y + 1.35, v.pos.z);
    }
    const forwardX = Math.sin(player.yaw);
    const forwardZ = Math.cos(player.yaw);
    const rightX = Math.cos(player.yaw);
    const rightZ = -Math.sin(player.yaw);
    return new THREE.Vector3(
      player.pos.x + forwardX * 0.65 - rightX * 0.25,
      player.pos.y + 1.38,
      player.pos.z + forwardZ * 0.65 - rightZ * 0.25
    );
  }

  function update(dt, input, camera) {
    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    player.punchTimer = Math.max(0, player.punchTimer - dt);
    player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    player.damageFlash = Math.max(0, player.damageFlash - dt * 2.4);

    // Handle reload countdown
    if (player.reloadTimer > 0) {
      player.reloadTimer -= dt;
      if (player.reloadTimer <= 0) {
        player.reloadTimer = 0;
        const w = getWeapon();
        const inv = player.inventory[w.id];
        const needed = w.magSize - inv.mag;
        const load = Math.min(needed, inv.reserve);
        inv.mag += load;
        inv.reserve -= load;
      }
    }

    // Mouse look
    player.aiming = !!input.rightMouse && !player.vehicle && !player.dead;
    const sens = player.aiming ? 0.0018 : 0.0028;
    if (input.mouseDX) player.camYaw -= input.mouseDX * sens;
    if (input.mouseDY) player.camPitch = Math.max(-0.22, Math.min(0.85, player.camPitch + input.mouseDY * sens));

    if (player.vehicle) {
      // Sync player position to vehicle
      player.pos.copy(player.vehicle.pos);
      player.yaw = player.vehicle.yaw;

      // Smoothly follow behind car when moving and not actively looking around
      const speed = Math.abs(player.vehicle.speed);
      if (speed > 2.5 && Math.abs(input.mouseDX) < 0.5) {
        const targetYaw = player.vehicle.yaw + Math.PI;
        let diff = targetYaw - player.camYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        player.camYaw += diff * Math.min(1, dt * 3.8);
      }
      updateCamera(dt, camera);
      return;
    }

    if (player.dead) {
      group.rotation.x = Math.min(Math.PI / 2, group.rotation.x + dt * 4);
      updateCamera(dt, camera);
      return;
    }
    group.rotation.x = 0;

    // On-foot movement relative to camera yaw
    const moveFwd = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const moveRight = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const moving = moveFwd !== 0 || moveRight !== 0;

    // Camera forward vector projected onto XZ
    const camFwdX = -Math.sin(player.camYaw);
    const camFwdZ = -Math.cos(player.camYaw);
    const camRightX = Math.cos(player.camYaw);
    const camRightZ = -Math.sin(player.camYaw);

    let dirX = camFwdX * moveFwd + camRightX * moveRight;
    let dirZ = camFwdZ * moveFwd + camRightZ * moveRight;
    const len = Math.hypot(dirX, dirZ);
    if (len > 0.001) {
      dirX /= len;
      dirZ /= len;
    }

    const sprinting = input.sprint && moving && !player.aiming;
    const moveSpeed = player.aiming
      ? GAME_CONSTANTS.WALK_SPEED * 0.62
      : sprinting
        ? GAME_CONSTANTS.SPRINT_SPEED
        : GAME_CONSTANTS.WALK_SPEED;

    const targetVX = dirX * moveSpeed;
    const targetVZ = dirZ * moveSpeed;
    const accel = player.onGround ? 18 : 6;
    player.vel.x += (targetVX - player.vel.x) * Math.min(1, dt * accel);
    player.vel.z += (targetVZ - player.vel.z) * Math.min(1, dt * accel);

    // Jump
    if (input.jump && player.onGround) {
      player.vel.y = GAME_CONSTANTS.JUMP_VELOCITY;
      player.onGround = false;
    }
    player.vel.y -= GAME_CONSTANTS.GRAVITY * dt;

    // Integrate & collide
    const nx = player.pos.x + player.vel.x * dt;
    const nz = player.pos.z + player.vel.z * dt;
    const col = city.resolveCircleCollision(nx, nz, GAME_CONSTANTS.PLAYER_RADIUS);
    player.pos.x = col.x;
    player.pos.z = col.z;
    player.pos.y += player.vel.y * dt;

    const groundY = city.getGroundHeight(player.pos.x, player.pos.z);
    if (player.pos.y <= groundY) {
      player.pos.y = groundY;
      player.vel.y = 0;
      player.onGround = true;
    } else if (player.pos.y > groundY + 0.12) {
      player.onGround = false;
    }

    // Character yaw facing
    if (player.aiming || input.fire) {
      const aimYaw = Math.atan2(camFwdX, camFwdZ);
      let d = aimYaw - player.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      player.yaw += d * Math.min(1, dt * 16);
    } else if (moving) {
      const targetYaw = Math.atan2(dirX, dirZ);
      let d = targetYaw - player.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      player.yaw += d * Math.min(1, dt * 12);
    }

    // Limb animation
    const horizSpeed = Math.hypot(player.vel.x, player.vel.z);
    if (horizSpeed > 0.35 && player.onGround) {
      player.walkCycle += dt * (sprinting ? 13 : 9);
      const swing = Math.sin(player.walkCycle) * (sprinting ? 0.72 : 0.48);
      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
      leftArm.rotation.x = -swing * 0.85;
      rightArm.rotation.x = getWeapon().type === 'gun' ? -1.15 : swing * 0.85;
      hips.position.y = 0.88 + Math.abs(Math.sin(player.walkCycle * 2)) * 0.045;
    } else {
      leftLeg.rotation.x *= 0.8;
      rightLeg.rotation.x *= 0.8;
      leftArm.rotation.x *= 0.8;
      rightArm.rotation.x = getWeapon().type === 'gun' ? -1.2 : rightArm.rotation.x * 0.8;
      hips.position.y = 0.88;
    }

    // Aim / punch arm pose
    if (player.aiming && getWeapon().type === 'gun') {
      rightArm.rotation.x = -1.48;
      leftArm.rotation.x = -1.1;
    } else if (player.punchTimer > 0) {
      rightArm.rotation.x = -1.75;
    }

    group.position.copy(player.pos);
    group.rotation.y = player.yaw;
    syncWeaponVisual();
    updateCamera(dt, camera);
  }

  function updateCamera(dt, camera) {
    let dist = 5.4;
    let height = 2.4;
    let shoulder = 0.55;
    let lookH = 1.45;
    let targetFov = 62;

    if (player.vehicle) {
      const speedRatio = Math.min(1, Math.abs(player.vehicle.speed) / 38);
      dist = 8.4 + speedRatio * 2.2;
      height = 3.2 + speedRatio * 0.5;
      shoulder = 0;
      lookH = 1.5;
      targetFov = 64 + speedRatio * 12;
    } else if (player.aiming) {
      dist = 2.6;
      height = 1.82;
      shoulder = 0.68;
      lookH = 1.52;
      targetFov = 46;
    }

    const base = player.vehicle ? player.vehicle.pos : player.pos;
    const rightX = Math.cos(player.camYaw);
    const rightZ = -Math.sin(player.camYaw);

    const lookTarget = new THREE.Vector3(
      base.x + rightX * shoulder,
      base.y + lookH,
      base.z + rightZ * shoulder
    );

    const horiz = Math.cos(player.camPitch) * dist;
    const desiredCam = new THREE.Vector3(
      lookTarget.x + Math.sin(player.camYaw) * horiz,
      lookTarget.y + Math.sin(player.camPitch) * dist + (height - lookH),
      lookTarget.z + Math.cos(player.camYaw) * horiz
    );

    // Prevent camera from clipping inside buildings
    const rayDir = desiredCam.clone().sub(lookTarget);
    const rayLen = rayDir.length();
    if (rayLen > 0.2) {
      rayDir.divideScalar(rayLen);
      const hit = city.raycastBuildings(lookTarget, rayDir, rayLen);
      if (hit.hit && hit.dist < rayLen - 0.35) {
        desiredCam.copy(lookTarget).addScaledVector(rayDir, Math.max(1.1, hit.dist - 0.35));
      }
    }
    desiredCam.y = Math.max(city.getGroundHeight(desiredCam.x, desiredCam.z) + 0.65, desiredCam.y);

    const smooth = Math.min(1, dt * 11);
    player.camPos.lerp(desiredCam, smooth);
    player.camLook.lerp(lookTarget, Math.min(1, dt * 14));

    camera.position.copy(player.camPos);
    camera.lookAt(player.camLook);
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8);
      camera.updateProjectionMatrix();
    }
  }

  return {
    player,
    getWeapon,
    getWeaponState,
    selectWeapon,
    cycleWeapon,
    unlockWeapon,
    startReload,
    takeDamage,
    heal,
    addCash,
    setPosition,
    enterVehicle,
    exitVehicle,
    getMuzzleWorldPos,
    update,
    syncWeaponVisual,
  };
}
