// Solana Bay — Six Vehicle Classes, Arcade Driving/Drift Physics & Lane Traffic
import * as THREE from 'three';
import {
  VEHICLE_CLASSES,
  TRAFFIC_CLASS_KEYS,
  ROAD_LINES,
  RADIO_STATIONS,
  createRng,
  pick,
  clamp,
} from './config.js';

function createVehicleMesh(spec, bodyColor) {
  const root = new THREE.Group();
  const { width: w, height: h, length: l, isPolice } = spec;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    metalness: 0.45,
    roughness: 0.3,
  });
  const cabinMat = new THREE.MeshStandardMaterial({
    color: isPolice ? 0xf8fafc : bodyColor,
    metalness: 0.35,
    roughness: 0.35,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.7,
    roughness: 0.15,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });

  // Lower chassis
  const lowerH = h * 0.52;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(w, lowerH, l), bodyMat);
  chassis.position.y = 0.42 + lowerH * 0.5;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  root.add(chassis);

  // Police white side doors stripe
  if (isPolice) {
    const doorBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, lowerH * 0.88, l * 0.44), cabinMat);
    doorBand.position.set(0, 0.42 + lowerH * 0.5, -0.05);
    root.add(doorBand);
  }

  // Cabin upper section
  const cabinLen = spec.id === 'suv' ? l * 0.68 : spec.id === 'sports' ? l * 0.48 : l * 0.54;
  const cabinH = h * 0.46;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, cabinH, cabinLen), cabinMat);
  cabin.position.set(0, 0.42 + lowerH + cabinH * 0.45, -l * 0.05);
  cabin.castShadow = true;
  root.add(cabin);

  // Windshield & rear glass
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, cabinH * 0.72, cabinLen * 0.82), glassMat);
  glass.position.set(0, 0.42 + lowerH + cabinH * 0.48, -l * 0.05);
  root.add(glass);

  // Headlights & Taillights
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.9,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.85,
  });
  for (const sx of [-w * 0.34, w * 0.34]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.08), headMat);
    hl.position.set(sx, 0.62, l * 0.5 + 0.02);
    root.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), tailMat);
    tl.position.set(sx, 0.64, -l * 0.5 - 0.02);
    root.add(tl);
  }

  // Wheels
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  wheelGeo.rotateZ(Math.PI * 0.5);
  const wheelOffsets = [
    [-w * 0.48, 0.36, l * 0.31],
    [w * 0.48, 0.36, l * 0.31],
    [-w * 0.48, 0.36, -l * 0.31],
    [w * 0.48, 0.36, -l * 0.31],
  ];
  for (const [wx, wy, wz] of wheelOffsets) {
    const wm = new THREE.Mesh(wheelGeo, darkMat);
    wm.position.set(wx, wy, wz);
    root.add(wm);
    wheels.push(wm);
  }

  // Optional police lightbar
  let lightbar = null;
  if (isPolice) {
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.14, 0.3), darkMat);
    barBase.position.set(0, 0.42 + lowerH + cabinH + 0.04, -0.05);
    root.add(barBase);
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xff2a2a,
      emissive: 0xff1e1e,
      emissiveIntensity: 2.2,
    });
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x2563eb,
      emissiveIntensity: 2.2,
    });
    const redL = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.28), redMat);
    redL.position.set(-0.32, 0.42 + lowerH + cabinH + 0.08, -0.05);
    const blueL = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.28), blueMat);
    blueL.position.set(0.32, 0.42 + lowerH + cabinH + 0.08, -0.05);
    root.add(redL, blueL);
    lightbar = { redMat, blueMat };
  }

  // Sports rear spoiler
  if (spec.id === 'sports') {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.08, 0.35), darkMat);
    wing.position.set(0, 0.42 + lowerH + 0.22, -l * 0.44);
    root.add(wing);
  }

  return { root, bodyMat, wheels, lightbar };
}

export function createVehicleSystem(scene, city, seed = 1) {
  const rng = createRng(seed * 3571 + 42);
  const vehicles = [];
  let nextId = 1;

  function spawnVehicle({
    classId = 'sedan',
    x = 0,
    z = 180,
    yaw = 0,
    color = null,
    role = 'traffic',
    stationIndex = null,
  } = {}) {
    const spec = VEHICLE_CLASSES[classId] || VEHICLE_CLASSES.sedan;
    const bodyColor = color !== null ? color : pick(rng, spec.palette);
    const visual = createVehicleMesh(spec, bodyColor);
    visual.root.position.set(x, 0.04, z);
    visual.root.rotation.y = yaw;
    scene.add(visual.root);

    const v = {
      id: nextId++,
      classId: spec.id,
      spec,
      name: spec.name,
      role, // 'traffic' | 'parked' | 'police' | 'racer' | 'mission' | 'player'
      mesh: visual.root,
      bodyMat: visual.bodyMat,
      wheels: visual.wheels,
      lightbar: visual.lightbar,
      x,
      y: 0.04,
      z,
      vx: 0,
      vz: 0,
      yaw,
      speed: 0,
      steer: 0,
      drifting: false,
      hp: spec.hp,
      maxHp: spec.hp,
      destroyed: false,
      driver: role === 'traffic' ? 'ai' : null,
      isPlayerOwned: false,
      radioStationIndex:
        stationIndex !== null ? stationIndex : Math.floor(rng() * RADIO_STATIONS.length),
      sirenOn: Boolean(spec.isPolice),
      sirenPhase: rng() * Math.PI * 2,
      laneAxis: Math.abs(Math.sin(yaw)) > 0.5 ? 'x' : 'z',
      laneDir: 1,
      turnCooldown: 0,
      airTime: 0,
      radius: Math.max(spec.width, spec.length) * 0.42,
    };

    if (v.laneAxis === 'x') {
      v.laneDir = Math.sin(yaw) >= 0 ? 1 : -1;
    } else {
      v.laneDir = Math.cos(yaw) >= 0 ? 1 : -1;
    }

    vehicles.push(v);
    return v;
  }

  function populateInitialTraffic(count = 20) {
    for (let i = 0; i < count; i++) {
      const classId = TRAFFIC_CLASS_KEYS[i % TRAFFIC_CLASS_KEYS.length];
      const onX = i % 2 === 0;
      const roadLine = ROAD_LINES[(i * 2) % ROAD_LINES.length];
      const dir = i % 4 < 2 ? 1 : -1;
      const offset = -150 + ((i * 53) % 300);
      const laneShift = 3.6 * dir;
      const x = onX ? offset : roadLine + laneShift;
      const z = onX ? roadLine - laneShift : offset;
      const yaw = onX ? (dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5) : dir > 0 ? 0 : Math.PI;
      spawnVehicle({ classId, x, z, yaw, role: 'traffic' });
    }
  }

  function findNearestVehicle(x, z, maxDist = 5.5) {
    let best = null;
    let bestD = maxDist;
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.destroyed) continue;
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  function damageVehicle(v, amount, effects, audio, onExplode) {
    if (!v || v.destroyed) return;
    v.hp = Math.max(0, v.hp - amount);
    if (v.hp <= 0) {
      v.destroyed = true;
      v.speed = 0;
      v.vx = 0;
      v.vz = 0;
      v.driver = null;
      v.bodyMat.color.setHex(0x1f2937);
      if (effects) effects.spawnExplosion(v.x, 1.1, v.z);
      if (audio) audio.playExplosion();
      if (onExplode) onExplode(v);
    }
  }

  function repairVehicle(v, repaintColor = null) {
    if (!v) return;
    v.destroyed = false;
    v.hp = v.maxHp;
    if (repaintColor !== null) {
      v.bodyMat.color.setHex(repaintColor);
    }
  }

  function applyVehiclePhysics(v, dt, throttle, steerInput, handbrake, effects, audio, callbacks) {
    const spec = v.spec;
    const fx = Math.sin(v.yaw);
    const fz = Math.cos(v.yaw);
    const rx = Math.cos(v.yaw);
    const rz = -Math.sin(v.yaw);

    // Decompose velocity into forward & lateral
    let fwdSpeed = v.vx * fx + v.vz * fz;
    let latSpeed = v.vx * rx + v.vz * rz;

    if (throttle > 0) {
      fwdSpeed += throttle * spec.accel * dt;
    } else if (throttle < 0) {
      if (fwdSpeed > 1) {
        fwdSpeed = Math.max(0, fwdSpeed + throttle * spec.brake * dt);
      } else {
        fwdSpeed += throttle * (spec.accel * 0.55) * dt;
      }
    } else {
      fwdSpeed *= Math.pow(0.28, dt);
    }

    if (handbrake) {
      fwdSpeed *= Math.pow(0.18, dt);
    }

    fwdSpeed = clamp(fwdSpeed, -spec.maxSpeed * 0.35, spec.maxSpeed);

    const speedFactor = clamp(Math.abs(fwdSpeed) / 7, 0, 1);
    const steerDir = fwdSpeed >= -0.2 ? 1 : -1;
    const turnBoost = handbrake ? 1.38 : 1.0;
    v.yaw -= steerInput * spec.turnRate * turnBoost * speedFactor * steerDir * dt;

    // Drift lateral grip
    const grip = handbrake ? spec.driftGrip : spec.grip;
    latSpeed *= Math.pow(1 - grip, dt * 8);
    v.drifting = Boolean(handbrake && Math.abs(fwdSpeed) > 10 && Math.abs(steerInput) > 0.15);

    const nfx = Math.sin(v.yaw);
    const nfz = Math.cos(v.yaw);
    const nrx = Math.cos(v.yaw);
    const nrz = -Math.sin(v.yaw);

    v.vx = nfx * fwdSpeed + nrx * latSpeed;
    v.vz = nfz * fwdSpeed + nrz * latSpeed;
    v.speed = fwdSpeed;

    const nextX = v.x + v.vx * dt;
    const nextZ = v.z + v.vz * dt;
    const col = city.resolveCircleCollisions(nextX, nextZ, v.radius);
    if (col.hit) {
      const impact = Math.hypot(v.vx, v.vz);
      if (impact > 9) {
        damageVehicle(v, impact * 0.55, effects, audio, callbacks?.onExplode);
        if (effects) effects.spawnSparks(col.x, 0.8, col.z, 8);
        if (audio && v.driver === 'player') audio.playCrash(Math.min(1, impact / 32));
      }
      v.vx *= -0.25;
      v.vz *= -0.25;
      v.speed *= -0.25;
    }
    v.x = col.x;
    v.z = col.z;

    if (v.drifting && effects && Math.random() < 0.55) {
      effects.spawnTireSmoke(v.x - nfx * 1.4, 0.22, v.z - nfz * 1.4);
      if (audio && v.driver === 'player') audio.playTireScreech();
    }
  }

  function updateTrafficAI(v, dt, playerState) {
    const cruiseSpeed = 12.5;
    v.turnCooldown = Math.max(0, v.turnCooldown - dt);

    // Check distance to nearest road intersection for lane turns
    let nearX = null;
    let nearZ = null;
    for (const r of ROAD_LINES) {
      if (Math.abs(v.x - r) < 4.5) nearX = r;
      if (Math.abs(v.z - r) < 4.5) nearZ = r;
    }

    if (nearX !== null && nearZ !== null && v.turnCooldown <= 0) {
      // At an intersection: maybe turn 90 degrees or keep straight
      if (rng() < 0.35) {
        if (v.laneAxis === 'x') {
          v.laneAxis = 'z';
          v.laneDir = nearZ >= 175 ? -1 : nearZ <= -175 ? 1 : rng() < 0.5 ? 1 : -1;
        } else {
          v.laneAxis = 'x';
          v.laneDir = nearX >= 175 ? -1 : nearX <= -175 ? 1 : rng() < 0.5 ? 1 : -1;
        }
      } else {
        if (v.laneAxis === 'x' && (nearX >= 175 || nearX <= -175)) v.laneDir = nearX >= 175 ? -1 : 1;
        if (v.laneAxis === 'z' && (nearZ >= 175 || nearZ <= -175)) v.laneDir = nearZ >= 175 ? -1 : 1;
      }
      v.turnCooldown = 2.6;
    }

    const targetYaw =
      v.laneAxis === 'x'
        ? v.laneDir > 0
          ? Math.PI * 0.5
          : -Math.PI * 0.5
        : v.laneDir > 0
        ? 0
        : Math.PI;

    let diff = targetYaw - v.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    v.yaw += diff * Math.min(1, dt * 5.2);

    // Slow down if player or another vehicle is right ahead
    let blocked = false;
    const fx = Math.sin(v.yaw);
    const fz = Math.cos(v.yaw);
    if (playerState) {
      const pdx = playerState.x - v.x;
      const pdz = playerState.z - v.z;
      const pdist = Math.hypot(pdx, pdz);
      if (pdist < 9 && pdx * fx + pdz * fz > 2) blocked = true;
    }
    for (let j = 0; j < vehicles.length; j++) {
      const other = vehicles[j];
      if (other === v) continue;
      const odx = other.x - v.x;
      const odz = other.z - v.z;
      const odist = Math.hypot(odx, odz);
      if (odist < 8.5 && odx * fx + odz * fz > 2.5) {
        blocked = true;
        break;
      }
    }

    const desired = blocked ? 0 : cruiseSpeed;
    v.speed += (desired - v.speed) * Math.min(1, dt * 4);
    v.vx = fx * v.speed;
    v.vz = fz * v.speed;
    const col = city.resolveCircleCollisions(v.x + v.vx * dt, v.z + v.vz * dt, v.radius);
    if (col.hit) {
      v.laneDir *= -1;
      v.yaw += Math.PI;
    }
    v.x = col.x;
    v.z = col.z;
  }

  function update(dt, playerInput, playerState, effects, audio, callbacks = {}) {
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (!v.destroyed) {
        if (v.driver === 'player') {
          const throttle = (playerInput.forward ? 1 : 0) - (playerInput.backward ? 1 : 0);
          const steer = (playerInput.right ? 1 : 0) - (playerInput.left ? 1 : 0);
          applyVehiclePhysics(v, dt, throttle, steer, Boolean(playerInput.handbrake), effects, audio, callbacks);
          if (callbacks.onDistanceDriven) {
            callbacks.onDistanceDriven(Math.abs(v.speed) * dt);
          }
        } else if (v.role === 'traffic' && v.driver === 'ai') {
          updateTrafficAI(v, dt, playerState);
        } else if (v.role !== 'police' && v.role !== 'racer') {
          v.vx *= Math.pow(0.12, dt);
          v.vz *= Math.pow(0.12, dt);
          v.speed *= Math.pow(0.12, dt);
          const col = city.resolveCircleCollisions(v.x + v.vx * dt, v.z + v.vz * dt, v.radius);
          v.x = col.x;
          v.z = col.z;
        }
      }

      // Vehicle-vs-vehicle simple bump resolution
      for (let j = i + 1; j < vehicles.length; j++) {
        const b = vehicles[j];
        const dx = b.x - v.x;
        const dz = b.z - v.z;
        const dist = Math.hypot(dx, dz);
        const minD = v.radius + b.radius;
        if (dist > 0.01 && dist < minD) {
          const overlap = (minD - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;
          v.x -= nx * overlap;
          v.z -= nz * overlap;
          b.x += nx * overlap;
          b.z += nz * overlap;
          const relSpeed = Math.hypot(v.vx - b.vx, v.vz - b.vz);
          if (relSpeed > 10) {
            if (effects) effects.spawnSparks((v.x + b.x) * 0.5, 0.75, (v.z + b.z) * 0.5, 6);
            if (audio && (v.driver === 'player' || b.driver === 'player')) {
              audio.playCrash(Math.min(1, relSpeed / 30));
            }
            damageVehicle(v, relSpeed * 0.32, effects, audio, callbacks.onExplode);
            damageVehicle(b, relSpeed * 0.32, effects, audio, callbacks.onExplode);
            if (callbacks.onVehicleCrash && (v.driver === 'player' || b.driver === 'player')) {
              callbacks.onVehicleCrash(v.driver === 'player' ? b : v);
            }
          }
        }
      }

      // Sync visual transform & wheel spin
      v.mesh.position.set(v.x, v.y, v.z);
      v.mesh.rotation.y = v.yaw;
      for (let w = 0; w < v.wheels.length; w++) {
        v.wheels[w].rotation.x += v.speed * dt * 2.4;
      }

      // Police lightbar flash
      if (v.lightbar) {
        if (v.sirenOn && !v.destroyed) {
          v.sirenPhase += dt * 11;
          const flash = Math.sin(v.sirenPhase) > 0;
          v.lightbar.redMat.emissiveIntensity = flash ? 3.4 : 0.25;
          v.lightbar.blueMat.emissiveIntensity = flash ? 0.25 : 3.4;
        } else {
          v.lightbar.redMat.emissiveIntensity = 0.15;
          v.lightbar.blueMat.emissiveIntensity = 0.15;
        }
      }
    }
  }

  function removeVehicle(v) {
    const idx = vehicles.indexOf(v);
    if (idx !== -1) vehicles.splice(idx, 1);
    if (v && v.mesh) scene.remove(v.mesh);
  }

  return {
    vehicles,
    spawnVehicle,
    populateInitialTraffic,
    findNearestVehicle,
    damageVehicle,
    repairVehicle,
    applyVehiclePhysics,
    update,
    removeVehicle,
  };
}
