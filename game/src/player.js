// Solana Bay — Articulated Player Character, Movement & Third-Person Camera
import * as THREE from 'three';
import { clamp } from './config.js';

export function buildCharacterRig({
  jacketColor = 0xe11d48,
  pantsColor = 0x1e293b,
  skinColor = 0xe8b896,
  hairColor = 0x18181b,
  shirtColor = 0xf8fafc,
  scale = 1,
} = {}) {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.72 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.65 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.82 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });

  const hips = new THREE.Group();
  hips.position.y = 0.92;
  root.add(hips);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.66, 0.3), jacketMat);
  torso.position.y = 0.36;
  torso.castShadow = true;
  hips.add(torso);

  const shirtStrip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.56, 0.31), shirtMat);
  shirtStrip.position.set(0, 0.34, 0.01);
  hips.add(shirtStrip);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.78, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), skinMat);
  head.position.y = 0.17;
  head.castShadow = true;
  headGroup.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), hairMat);
  hair.position.set(0, 0.32, -0.01);
  headGroup.add(hair);

  // Shades
  const shades = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.08, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.6, roughness: 0.2 })
  );
  shades.position.set(0, 0.19, 0.16);
  headGroup.add(shades);
  hips.add(headGroup);

  // Arms
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.37, 0.64, 0);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.56, 0.16), jacketMat);
    upper.position.y = -0.26;
    upper.castShadow = true;
    pivot.add(upper);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), skinMat);
    hand.position.y = -0.58;
    pivot.add(hand);
    return pivot;
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  hips.add(leftArm, rightArm);

  // Weapon mount on right hand
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -0.56, 0.18);
  rightArm.add(weaponMount);

  // Legs
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.15, 0.04, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.78, 0.22), pantsMat);
    leg.position.y = -0.39;
    leg.castShadow = true;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.14, 0.32), shoeMat);
    shoe.position.set(0, -0.82, 0.05);
    pivot.add(shoe);
    return pivot;
  }
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  hips.add(leftLeg, rightLeg);

  root.scale.setScalar(scale);

  return {
    root,
    hips,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponMount,
  };
}

export function createPlayerSystem(scene, city) {
  const rig = buildCharacterRig({
    jacketColor: 0x0ea5e9,
    pantsColor: 0x1e293b,
    skinColor: 0xe3b18d,
    hairColor: 0x111827,
    shirtColor: 0xffedd5,
  });
  scene.add(rig.root);

  // Simple rifle/pistol prop in right hand
  const gunMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.44),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.6, roughness: 0.35 })
  );
  gunMesh.position.set(0, 0, 0.14);
  rig.weaponMount.add(gunMesh);

  const state = {
    x: 0,
    y: 0.24,
    z: 162,
    vy: 0,
    yaw: Math.PI,
    pitch: 0.18,
    cameraYaw: Math.PI,
    cameraPitch: 0.22,
    speed: 0,
    walkPhase: 0,
    grounded: true,
    health: 100,
    maxHealth: 100,
    armor: 60,
    maxArmor: 100,
    cash: 1250,
    vehicle: null,
    aiming: false,
    alive: true,
    busted: false,
    invulnTimer: 0,
    damageTakenThisMission: 0,
    radius: 0.55,
  };

  const camPos = new THREE.Vector3(0, 5, 170);
  const camTarget = new THREE.Vector3(0, 1.8, 162);

  function setPosition(x, z, yaw = state.yaw) {
    state.x = x;
    state.z = z;
    state.y = 0.24;
    state.vy = 0;
    state.yaw = yaw;
    state.cameraYaw = yaw;
    rig.root.position.set(x, state.y, z);
    rig.root.rotation.y = yaw;
  }

  function enterVehicle(vehicle) {
    if (!vehicle || vehicle.destroyed) return false;
    state.vehicle = vehicle;
    vehicle.driver = 'player';
    vehicle.isPlayerOwned = true;
    rig.root.visible = false;
    state.cameraYaw = vehicle.yaw;
    return true;
  }

  function exitVehicle() {
    if (!state.vehicle) return null;
    const v = state.vehicle;
    const sideX = Math.cos(v.yaw) * 2.15;
    const sideZ = -Math.sin(v.yaw) * 2.15;
    const resolved = city.resolveCircleCollisions(v.x + sideX, v.z + sideZ, state.radius);
    v.driver = null;
    state.vehicle = null;
    state.x = resolved.x;
    state.z = resolved.z;
    state.y = 0.24;
    state.vy = 0;
    state.yaw = v.yaw;
    rig.root.visible = true;
    rig.root.position.set(state.x, state.y, state.z);
    rig.root.rotation.y = state.yaw;
    return v;
  }

  function applyDamage(amount) {
    if (!state.alive || state.invulnTimer > 0) return;
    let dmg = Math.max(0, amount);
    state.damageTakenThisMission += dmg;
    if (state.armor > 0) {
      const absorbed = Math.min(state.armor, dmg * 0.65);
      state.armor -= absorbed;
      dmg -= absorbed;
    }
    state.health = Math.max(0, state.health - dmg);
    if (state.health <= 0) {
      state.alive = false;
    }
  }

  function healFull(withArmor = true) {
    state.health = state.maxHealth;
    if (withArmor) state.armor = state.maxArmor;
    state.alive = true;
    state.busted = false;
  }

  function addCash(delta) {
    state.cash = Math.max(0, Math.round(state.cash + delta));
  }

  function update(dt, input, activeWeapon) {
    if (state.invulnTimer > 0) state.invulnTimer = Math.max(0, state.invulnTimer - dt);

    state.aiming = Boolean(input.aim) && !state.vehicle;

    // Mouse look adjusts camera yaw & pitch
    if (input.lookDX || input.lookDY) {
      state.cameraYaw -= input.lookDX * 0.0026;
      state.cameraPitch = clamp(state.cameraPitch + input.lookDY * 0.002, -0.22, 0.72);
    }

    if (state.vehicle) {
      state.x = state.vehicle.x;
      state.z = state.vehicle.z;
      state.y = state.vehicle.y;
      state.yaw = state.vehicle.yaw;
      state.speed = Math.abs(state.vehicle.speed);
      rig.root.visible = false;
      return;
    }

    rig.root.visible = true;
    gunMesh.visible = Boolean(activeWeapon && activeWeapon.id !== 'fists');

    // On-foot movement relative to cameraYaw
    const fwdInput = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const strafeInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const moving = fwdInput !== 0 || strafeInput !== 0;

    const baseSpeed = state.aiming ? 4.4 : input.sprint ? 10.6 : 6.4;
    if (moving && state.alive) {
      const moveAngle = Math.atan2(strafeInput, fwdInput);
      const worldDir = state.cameraYaw + moveAngle;
      const dx = Math.sin(worldDir) * baseSpeed * dt;
      const dz = Math.cos(worldDir) * baseSpeed * dt;
      const res = city.resolveCircleCollisions(state.x + dx, state.z + dz, state.radius);
      state.x = res.x;
      state.z = res.z;
      state.speed = baseSpeed;

      const targetYaw = state.aiming ? state.cameraYaw : worldDir;
      let diff = targetYaw - state.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      state.yaw += diff * Math.min(1, dt * 12);
      state.walkPhase += dt * (input.sprint ? 13 : 8.5);
    } else {
      state.speed = 0;
      if (state.aiming) {
        let diff = state.cameraYaw - state.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        state.yaw += diff * Math.min(1, dt * 14);
      }
    }

    // Jump & gravity
    if (input.jump && state.grounded && state.alive) {
      state.vy = 6.6;
      state.grounded = false;
    }
    state.vy -= 18 * dt;
    state.y += state.vy * dt;
    const floorY = 0.24;
    if (state.y <= floorY) {
      state.y = floorY;
      state.vy = 0;
      state.grounded = true;
    }

    // Limb animation
    const swing = moving ? Math.sin(state.walkPhase) * 0.65 : 0;
    rig.leftLeg.rotation.x = swing;
    rig.rightLeg.rotation.x = -swing;
    rig.leftArm.rotation.x = -swing * 0.8;
    rig.rightArm.rotation.x = state.aiming ? -1.42 : swing * 0.8;
    rig.hips.position.y = 0.92 + (moving ? Math.abs(Math.cos(state.walkPhase)) * 0.05 : 0);

    rig.root.position.set(state.x, state.y, state.z);
    rig.root.rotation.y = state.yaw;
  }

  function updateCamera(camera, dt, overridePose = null) {
    if (overridePose) {
      camera.position.set(overridePose.px, overridePose.py, overridePose.pz);
      camera.lookAt(overridePose.tx, overridePose.ty, overridePose.tz);
      return;
    }

    let desiredPos;
    let desiredTarget;
    if (state.vehicle) {
      const v = state.vehicle;
      // Gently align camera behind driving direction
      let yawDiff = v.yaw - state.cameraYaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      state.cameraYaw += yawDiff * Math.min(1, dt * 2.8);

      const dist = 9.4 + Math.min(2.6, Math.abs(v.speed) * 0.06);
      const height = 3.8;
      desiredPos = new THREE.Vector3(
        v.x - Math.sin(state.cameraYaw) * dist,
        v.y + height,
        v.z - Math.cos(state.cameraYaw) * dist
      );
      desiredTarget = new THREE.Vector3(
        v.x + Math.sin(v.yaw) * 4.5,
        v.y + 1.35,
        v.z + Math.cos(v.yaw) * 4.5
      );
    } else if (state.aiming) {
      const dist = 3.2;
      const shoulder = 0.72;
      const sx = Math.cos(state.cameraYaw) * shoulder;
      const sz = -Math.sin(state.cameraYaw) * shoulder;
      desiredPos = new THREE.Vector3(
        state.x - Math.sin(state.cameraYaw) * dist + sx,
        state.y + 1.85 + Math.sin(state.cameraPitch) * 0.8,
        state.z - Math.cos(state.cameraYaw) * dist + sz
      );
      desiredTarget = new THREE.Vector3(
        state.x + Math.sin(state.cameraYaw) * 14,
        state.y + 1.55 - Math.sin(state.cameraPitch) * 5,
        state.z + Math.cos(state.cameraYaw) * 14
      );
    } else {
      const dist = 6.2;
      const height = 2.75 + Math.sin(state.cameraPitch) * 2.2;
      desiredPos = new THREE.Vector3(
        state.x - Math.sin(state.cameraYaw) * dist,
        state.y + Math.max(1.4, height),
        state.z - Math.cos(state.cameraYaw) * dist
      );
      desiredTarget = new THREE.Vector3(state.x, state.y + 1.45, state.z);
    }

    const alpha = Math.min(1, dt * 10);
    camPos.lerp(desiredPos, alpha);
    camTarget.lerp(desiredTarget, alpha);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
  }

  function getForwardVector() {
    return {
      x: Math.sin(state.cameraYaw),
      y: -Math.sin(state.cameraPitch) * 0.45,
      z: Math.cos(state.cameraYaw),
    };
  }

  function getMuzzlePosition() {
    const yaw = state.vehicle ? state.cameraYaw : state.yaw;
    return {
      x: state.x + Math.sin(yaw) * 0.85,
      y: state.y + 1.45,
      z: state.z + Math.cos(yaw) * 0.85,
    };
  }

  return {
    rig,
    state,
    setPosition,
    enterVehicle,
    exitVehicle,
    applyDamage,
    healFull,
    addCash,
    update,
    updateCamera,
    getForwardVector,
    getMuzzlePosition,
  };
}
