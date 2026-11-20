// Solana Bay — Six procedural vehicle classes, arcade drift physics, lane-following traffic, carjacking, damage & explosions
import * as THREE from 'three';
import { CITY, VEHICLE_CLASSES, TRAFFIC_CLASS_KEYS, rngPick, rngRange } from './config.js';

const WHEEL_GEO = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12);
WHEEL_GEO.rotateZ(Math.PI / 2);
const WHEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.85 });
const RIM_MAT = new THREE.MeshStandardMaterial({ color: 0xd9e1e8, metalness: 0.7, roughness: 0.3 });
const GLASS_MAT = new THREE.MeshStandardMaterial({ color: 0x1a2c3d, roughness: 0.15, metalness: 0.65 });
const HEADLIGHT_MAT = new THREE.MeshBasicMaterial({ color: 0xfff6cf });
const TAILLIGHT_MAT = new THREE.MeshBasicMaterial({ color: 0xff2e44 });
const CHROME_MAT = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.25 });
const CHARRED_MAT = new THREE.MeshStandardMaterial({ color: 0x22201f, roughness: 0.96 });

function buildVehicleMesh(classId, colorHex) {
  const spec = VEHICLE_CLASSES[classId] || VEHICLE_CLASSES.sedan;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: classId === 'van' ? 0.52 : 0.28,
    metalness: classId === 'sports' ? 0.48 : 0.25,
  });

  const w = spec.width;
  const h = spec.height;
  const l = spec.length;
  const bodyParts = [];

  // Lower chassis
  const lowerH = classId === 'van' ? h * 0.55 : h * 0.48;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(w, lowerH, l), bodyMat);
  lower.position.y = 0.38 + lowerH * 0.5;
  lower.castShadow = true;
  lower.receiveShadow = true;
  g.add(lower);
  bodyParts.push(lower);

  // Cabin / greenhouse
  if (classId === 'van') {
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.48, l * 0.72), bodyMat);
    cargo.position.set(0, 0.38 + lowerH + h * 0.22, -l * 0.12);
    cargo.castShadow = true;
    g.add(cargo);
    bodyParts.push(cargo);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, h * 0.36, 0.2), GLASS_MAT);
    windshield.position.set(0, 0.38 + lowerH + h * 0.18, l * 0.28);
    windshield.rotation.x = -0.22;
    g.add(windshield);
  } else {
    const cabLen = classId === 'suv' ? l * 0.64 : classId === 'sports' ? l * 0.44 : l * 0.52;
    const cabH = h * 0.44;
    const cabZ = classId === 'sports' ? -l * 0.06 : -l * 0.03;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.86, cabH, cabLen),
      classId === 'police' ? new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.3 }) : bodyMat
    );
    cabin.position.set(0, 0.38 + lowerH + cabH * 0.46, cabZ);
    cabin.castShadow = true;
    g.add(cabin);
    if (classId !== 'police') bodyParts.push(cabin);

    // Tinted wrap windows
    const winMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, cabH * 0.74, cabLen * 0.92), GLASS_MAT);
    winMesh.position.copy(cabin.position);
    g.add(winMesh);
  }

  // Class-specific signature styling
  if (classId === 'sports') {
    // Rear wing spoiler & racing stripe
    const wing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.08, 0.35), CHROME_MAT);
    wing.position.set(0, 0.38 + lowerH + 0.35, -l * 0.44);
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.14), CHROME_MAT);
    strutL.position.set(-w * 0.32, 0.38 + lowerH + 0.18, -l * 0.44);
    const strutR = strutL.clone();
    strutR.position.x = w * 0.32;
    g.add(wing, strutL, strutR);
  } else if (classId === 'muscle') {
    // Supercharger hood scoop
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.82), CHROME_MAT);
    scoop.position.set(0, 0.38 + lowerH + 0.12, l * 0.26);
    g.add(scoop);
  } else if (classId === 'suv') {
    // Roof rack bars
    const rackL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, l * 0.55), CHROME_MAT);
    rackL.position.set(-w * 0.34, 0.38 + h * 0.94, -0.1);
    const rackR = rackL.clone();
    rackR.position.x = w * 0.34;
    g.add(rackL, rackR);
  }

  // Police livery + dual flashing red/blue lightbar
  let lightRed = null;
  let lightBlue = null;
  if (classId === 'police') {
    const doorWhite = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.03, lowerH * 0.86, l * 0.44),
      new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.35 })
    );
    doorWhite.position.set(0, 0.38 + lowerH * 0.5, -0.05);
    g.add(doorWhite);

    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 0.28), WHEEL_MAT);
    barBase.position.set(0, 0.38 + h * 0.95, 0.05);
    g.add(barBase);

    const redMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x2288ff });
    lightRed = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.24), redMat);
    lightRed.position.set(-0.32, 0.38 + h * 1.01, 0.05);
    lightBlue = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.24), blueMat);
    lightBlue.position.set(0.32, 0.38 + h * 1.01, 0.05);
    g.add(lightRed, lightBlue);
  }

  // Headlights & Taillights
  const hlGeo = new THREE.BoxGeometry(0.42, 0.18, 0.08);
  const hlL = new THREE.Mesh(hlGeo, HEADLIGHT_MAT);
  hlL.position.set(-w * 0.32, 0.38 + lowerH * 0.55, l * 0.5 + 0.02);
  const hlR = hlL.clone();
  hlR.position.x = w * 0.32;

  const tlL = new THREE.Mesh(hlGeo, TAILLIGHT_MAT);
  tlL.position.set(-w * 0.32, 0.38 + lowerH * 0.58, -l * 0.5 - 0.02);
  const tlR = tlL.clone();
  tlR.position.x = w * 0.32;
  g.add(hlL, hlR, tlL, tlR);

  // Bumpers
  const bumpF = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.22, 0.18), CHROME_MAT);
  bumpF.position.set(0, 0.42, l * 0.5 + 0.04);
  const bumpR = bumpF.clone();
  bumpR.position.z = -l * 0.5 - 0.04;
  g.add(bumpF, bumpR);

  // 4 Wheels (front pair steer)
  const wheels = [];
  const wheelZ = l * 0.31;
  const wheelX = w * 0.48;
  const wheelPositions = [
    [-wheelX, 0.38, wheelZ, true],
    [wheelX, 0.38, wheelZ, true],
    [-wheelX, 0.38, -wheelZ, false],
    [wheelX, 0.38, -wheelZ, false],
  ];
  for (const [wx, wy, wz, isFront] of wheelPositions) {
    const pivot = new THREE.Group();
    pivot.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(WHEEL_GEO, WHEEL_MAT);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 8).rotateZ(Math.PI / 2), RIM_MAT);
    tire.add(rim);
    pivot.add(tire);
    g.add(pivot);
    wheels.push({ pivot, tire, isFront });
  }

  return { group: g, bodyMat, bodyParts, wheels, lightRed, lightBlue };
}

export function createVehicleManager(scene, city, rng) {
  const vehicles = [];
  let nextId = 1;

  // Direction vectors for grid traffic: 0:+Z(S), 1:-Z(N), 2:+X(E), 3:-X(W)
  const DIRS = [
    { dx: 0, dz: 1, yaw: 0 },
    { dx: 0, dz: -1, yaw: Math.PI },
    { dx: 1, dz: 0, yaw: Math.PI / 2 },
    { dx: -1, dz: 0, yaw: -Math.PI / 2 },
  ];

  function pickTrafficClass() {
    const r = rng();
    let acc = 0;
    for (const k of TRAFFIC_CLASS_KEYS) {
      acc += VEHICLE_CLASSES[k].trafficWeight;
      if (r <= acc) return k;
    }
    return 'sedan';
  }

  function spawnVehicle(classId, x, z, yaw = 0, options = {}) {
    const spec = VEHICLE_CLASSES[classId] || VEHICLE_CLASSES.sedan;
    const color = options.color || rngPick(rng, spec.colors);
    const built = buildVehicleMesh(classId, color);
    const gy = city.getGroundHeight(x, z);
    built.group.position.set(x, gy, z);
    built.group.rotation.y = yaw;
    scene.add(built.group);

    const v = {
      id: nextId++,
      classId,
      spec,
      color,
      mesh: built.group,
      bodyMat: built.bodyMat,
      bodyParts: built.bodyParts,
      wheels: built.wheels,
      lightRed: built.lightRed,
      lightBlue: built.lightBlue,
      pos: new THREE.Vector3(x, gy, z),
      vel: new THREE.Vector3(),
      yaw,
      speed: 0,
      steerAngle: 0,
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      destroyed: false,
      sirenOn: classId === 'police' && !!options.sirenOn,
      driver: options.driver || null, // 'player' | 'traffic' | 'police' | 'gang' | null
      occupied: !!options.driver,
      drifting: false,
      nitro: 100,
      smokeTimer: 0,
      missionTag: options.missionTag || null,
      // Traffic AI fields
      dirIdx: options.dirIdx ?? 0,
      targetSpeed: options.targetSpeed ?? rngRange(rng, 10, 16),
      turnCooldown: 0,
      stuckTimer: 0,
    };
    vehicles.push(v);
    return v;
  }

  function removeVehicle(v) {
    scene.remove(v.mesh);
    const idx = vehicles.indexOf(v);
    if (idx !== -1) vehicles.splice(idx, 1);
  }

  function repaintAndRepair(v, newColor = null) {
    v.hp = v.maxHp;
    v.destroyed = false;
    const col = newColor || rngPick(rng, v.spec.colors);
    v.color = col;
    v.bodyMat.color.set(col);
    for (const part of v.bodyParts) {
      part.material = v.bodyMat;
    }
  }

  function damageVehicle(v, amount, effects, audio, onExplode) {
    if (v.destroyed) return;
    v.hp = Math.max(0, v.hp - amount);
    if (v.hp <= 0) {
      explodeVehicle(v, effects, audio, onExplode);
    }
  }

  function explodeVehicle(v, effects, audio, onExplode) {
    if (v.destroyed) return;
    v.destroyed = true;
    v.hp = 0;
    v.speed = 0;
    v.vel.set(0, 0, 0);
    v.sirenOn = false;
    for (const part of v.bodyParts) {
      part.material = CHARRED_MAT;
    }
    if (effects) effects.spawnExplosion(v.pos.x, v.pos.y + 1.0, v.pos.z, 1.45);
    if (audio) audio.playExplosion(1.0);
    if (onExplode) onExplode(v);
  }

  // Spawn initial ambient traffic + parked showcase cars
  function populateInitialTraffic(count = 20) {
    const coords = CITY.ROAD_COORDS;
    for (let i = 0; i < count; i++) {
      const dirIdx = i % 4;
      const d = DIRS[dirIdx];
      const roadIdx = Math.floor(rng() * coords.length);
      const along = rngRange(rng, -155, 155);
      // Right-hand driving lane offset
      const rightX = -d.dz * CITY.LANE_OFFSET;
      const rightZ = d.dx * CITY.LANE_OFFSET;
      let x, z;
      if (d.dx === 0) {
        x = coords[roadIdx] + rightX;
        z = along;
      } else {
        x = along;
        z = coords[roadIdx] + rightZ;
      }
      // Avoid crowding start spawn
      if (Math.hypot(x - 180, z - 96) < 20) continue;
      const cls = pickTrafficClass();
      spawnVehicle(cls, x, z, d.yaw, { driver: 'traffic', dirIdx });
    }

    // Parked showcase cars near key spots so player always finds a hot ride fast
    spawnVehicle('sports', 176.2, 82, Math.PI, { color: '#ff3b6b' }); // right up the street from spawn!
    spawnVehicle('muscle', 176.2, 112, 0, { color: '#ff9f1a' });
    spawnVehicle('suv', -82, 56, Math.PI / 2, { color: '#2bcbba' }); // near El Sol Customs
    spawnVehicle('sports', 116, -56, Math.PI, { color: '#00d2d3' }); // Alba Financial
  }

  function findNearestStealable(x, z, maxDist = 5.6) {
    let best = null;
    let bestD = maxDist;
    for (const v of vehicles) {
      if (v.destroyed) continue;
      const d = Math.hypot(v.pos.x - x, v.pos.z - z);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  function updatePlayerVehicle(v, dt, input, effects, audio) {
    const spec = v.spec;
    const throttle = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const steerIn = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const handbrake = !!input.jump;
    const boost = !!input.sprint && throttle > 0 && v.nitro > 4;

    const fwdX = Math.sin(v.yaw);
    const fwdZ = Math.cos(v.yaw);
    const rightX = Math.cos(v.yaw);
    const rightZ = -Math.sin(v.yaw);

    // Decompose velocity into forward & lateral components
    let fwdSpeed = v.vel.x * fwdX + v.vel.z * fwdZ;
    let latSpeed = v.vel.x * rightX + v.vel.z * rightZ;

    const maxSpd = boost ? spec.maxSpeed * 1.28 : spec.maxSpeed;
    const accelRate = boost ? spec.accel * 1.65 : spec.accel;
    if (boost) v.nitro = Math.max(0, v.nitro - dt * 36);
    else v.nitro = Math.min(100, v.nitro + dt * 16);

    if (throttle > 0) {
      if (fwdSpeed < -1) fwdSpeed += spec.brake * dt;
      else fwdSpeed += accelRate * dt;
    } else if (throttle < 0) {
      if (fwdSpeed > 1) fwdSpeed -= spec.brake * dt;
      else fwdSpeed -= spec.accel * 0.65 * dt;
    } else {
      // Natural coasting drag
      fwdSpeed *= Math.max(0, 1 - dt * 1.6);
    }

    if (handbrake) {
      fwdSpeed *= Math.max(0, 1 - dt * 2.1);
    }

    fwdSpeed = Math.max(-spec.reverseSpeed, Math.min(maxSpd, fwdSpeed));

    // Steering scales smoothly with speed & reverses when backing up
    const speedFactor = Math.min(1, Math.abs(fwdSpeed) / 5.5);
    const revSign = fwdSpeed >= -0.2 ? 1 : -1;
    const turnMult = handbrake ? 1.48 : 1.0;
    v.yaw += steerIn * spec.turnRate * turnMult * speedFactor * revSign * dt;
    v.steerAngle += (steerIn * 0.45 - v.steerAngle) * Math.min(1, dt * 10);

    // Lateral grip (lower during handbrake drift)
    const grip = handbrake ? spec.driftGrip : spec.grip;
    latSpeed *= Math.max(0, 1 - grip * dt);

    const newFwdX = Math.sin(v.yaw);
    const newFwdZ = Math.cos(v.yaw);
    const newRightX = Math.cos(v.yaw);
    const newRightZ = -Math.sin(v.yaw);

    v.vel.x = newFwdX * fwdSpeed + newRightX * latSpeed;
    v.vel.z = newFwdZ * fwdSpeed + newRightZ * latSpeed;
    v.speed = fwdSpeed;

    v.drifting = (handbrake || Math.abs(latSpeed) > 5.2) && Math.abs(fwdSpeed) > 7.5;
    if (v.drifting && effects) {
      effects.spawnSmoke(v.pos.x - newFwdX * 1.5, v.pos.y + 0.2, v.pos.z - newFwdZ * 1.5, 0xdde3ea, 0.55);
      if (audio) audio.playScreech(Math.min(1, Math.abs(latSpeed) / 10));
    }
    if (boost && effects) {
      effects.spawnSpark(v.pos.x - newFwdX * (spec.length * 0.52), v.pos.y + 0.45, v.pos.z - newFwdZ * (spec.length * 0.52), 0x38e8ff);
    }
  }

  function updateTrafficVehicle(v, dt, playerPos) {
    v.turnCooldown = Math.max(0, v.turnCooldown - dt);
    const d = DIRS[v.dirIdx];

    // Check distance to nearest ahead vehicle or player to brake politely
    let desiredSpeed = v.targetSpeed;
    const fwdX = Math.sin(v.yaw);
    const fwdZ = Math.cos(v.yaw);

    for (let i = 0; i < vehicles.length; i++) {
      const other = vehicles[i];
      if (other === v) continue;
      const rx = other.pos.x - v.pos.x;
      const rz = other.pos.z - v.pos.z;
      const dist = Math.hypot(rx, rz);
      if (dist < 13 && dist > 0.1) {
        const dot = (rx * fwdX + rz * fwdZ) / dist;
        if (dot > 0.72) {
          desiredSpeed = dist < 7.5 ? 0 : Math.min(desiredSpeed, Math.max(0, other.speed * 0.8));
        }
      }
    }
    if (playerPos) {
      const px = playerPos.x - v.pos.x;
      const pz = playerPos.z - v.pos.z;
      const pd = Math.hypot(px, pz);
      if (pd < 8.5 && pd > 0.1) {
        const dot = (px * fwdX + pz * fwdZ) / pd;
        if (dot > 0.78) desiredSpeed = 0;
      }
    }

    // Check if near an intersection to potentially turn or stay inside city bounds
    if (v.turnCooldown <= 0) {
      let nearestX = null;
      let nearestZ = null;
      for (const rc of CITY.ROAD_COORDS) {
        if (Math.abs(v.pos.x - rc) < 5.2) nearestX = rc;
        if (Math.abs(v.pos.z - rc) < 5.2) nearestZ = rc;
      }
      if (nearestX !== null && nearestZ !== null) {
        // Choose valid directions that remain inside [-180..180]
        const candidates = [];
        for (let di = 0; di < 4; di++) {
          const cand = DIRS[di];
          // Don't U-turn unless forced
          if (cand.dx === -d.dx && cand.dz === -d.dz) continue;
          const nextX = nearestX + cand.dx * CITY.CELL_SIZE;
          const nextZ = nearestZ + cand.dz * CITY.CELL_SIZE;
          if (Math.abs(nextX) <= CITY.HALF_SPAN && Math.abs(nextZ) <= CITY.HALF_SPAN) {
            candidates.push(di);
          }
        }
        if (candidates.length > 0) {
          // Prefer going straight 55% of the time if valid
          if (candidates.includes(v.dirIdx) && rng() < 0.55) {
            // keep straight
          } else {
            v.dirIdx = rngPick(rng, candidates);
          }
          v.turnCooldown = 2.6;
        } else {
          // Reverse if at dead corner
          v.dirIdx = (v.dirIdx ^ 1);
          v.turnCooldown = 2.5;
        }
      }
    }

    // Steer gently toward target lane center
    const curD = DIRS[v.dirIdx];
    let targetYaw = curD.yaw;
    if (curD.dx === 0) {
      // Snap lane X
      let bestRoad = CITY.ROAD_COORDS[0];
      let bestDist = 999;
      for (const rc of CITY.ROAD_COORDS) {
        const dist = Math.abs(v.pos.x - rc);
        if (dist < bestDist) { bestDist = dist; bestRoad = rc; }
      }
      const laneX = bestRoad - curD.dz * CITY.LANE_OFFSET;
      const errX = laneX - v.pos.x;
      targetYaw = Math.atan2(Math.max(-0.5, Math.min(0.5, errX * 0.14)), curD.dz);
    } else {
      let bestRoad = CITY.ROAD_COORDS[0];
      let bestDist = 999;
      for (const rc of CITY.ROAD_COORDS) {
        const dist = Math.abs(v.pos.z - rc);
        if (dist < bestDist) { bestDist = dist; bestRoad = rc; }
      }
      const laneZ = bestRoad + curD.dx * CITY.LANE_OFFSET;
      const errZ = laneZ - v.pos.z;
      targetYaw = Math.atan2(curD.dx, Math.max(-0.5, Math.min(0.5, errZ * 0.14)));
    }

    let dyaw = targetYaw - v.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    v.yaw += dyaw * Math.min(1, dt * 4.5);
    v.steerAngle = Math.max(-0.4, Math.min(0.4, dyaw * 0.8));

    v.speed += (desiredSpeed - v.speed) * Math.min(1, dt * 3.2);
    v.vel.x = Math.sin(v.yaw) * v.speed;
    v.vel.z = Math.cos(v.yaw) * v.speed;
  }

  function update(dt, time, input, playerCtrl, effects, audio, callbacks = {}) {
    const player = playerCtrl.player;

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];

      // Siren lightbar animation
      if (v.lightRed && v.lightBlue) {
        if (v.sirenOn && !v.destroyed) {
          const flash = Math.floor(time * 9) % 2 === 0;
          v.lightRed.material.color.setHex(flash ? 0xff1133 : 0x33050a);
          v.lightBlue.material.color.setHex(flash ? 0x051533 : 0x2299ff);
        } else {
          v.lightRed.material.color.setHex(0x441118);
          v.lightBlue.material.color.setHex(0x112244);
        }
      }

      if (v.destroyed) continue;

      if (v.driver === 'player') {
        updatePlayerVehicle(v, dt, input, effects, audio);
        player.stats.distanceDriven += Math.abs(v.speed) * dt;
      } else if (v.driver === 'traffic') {
        updateTrafficVehicle(v, dt, player.vehicle ? null : player.pos);
      } else if (v.driver === null) {
        // Coast unmanned car to a halt
        v.vel.multiplyScalar(Math.max(0, 1 - dt * 3.2));
        v.speed *= Math.max(0, 1 - dt * 3.2);
      }
      // Note: 'police' and 'gang' drivers set v.vel / v.yaw in police.js / missions.js

      // Integrate position + building collision
      const prevX = v.pos.x;
      const prevZ = v.pos.z;
      const nx = v.pos.x + v.vel.x * dt;
      const nz = v.pos.z + v.vel.z * dt;
      const radius = v.spec.width * 0.56;
      const col = city.resolveCircleCollision(nx, nz, radius);
      v.pos.x = col.x;
      v.pos.z = col.z;
      v.pos.y = city.getGroundHeight(v.pos.x, v.pos.z);

      if (col.hit) {
        const impactSpeed = Math.hypot(v.vel.x, v.vel.z);
        if (impactSpeed > 8 && v.driver === 'player') {
          const dmg = (impactSpeed - 7) * 1.4;
          damageVehicle(v, dmg, effects, audio, callbacks.onVehicleExplode);
          if (effects) effects.spawnSpark(v.pos.x, v.pos.y + 0.8, v.pos.z, 0xffd166);
          if (audio) audio.playCrash(Math.min(1, impactSpeed / 30));
          if (callbacks.onCrash) callbacks.onCrash(v.pos.x, v.pos.z, impactSpeed);
        }
        // Bounce damp
        v.vel.x *= -0.25;
        v.vel.z *= -0.25;
        v.speed *= -0.2;
        if (v.driver === 'traffic') {
          v.dirIdx = (v.dirIdx + 1) % 4;
        }
      }

      // Smoking hood when heavily damaged
      if (v.hp < v.maxHp * 0.42 && effects) {
        v.smokeTimer -= dt;
        if (v.smokeTimer <= 0) {
          v.smokeTimer = 0.08;
          const hoodX = v.pos.x + Math.sin(v.yaw) * (v.spec.length * 0.35);
          const hoodZ = v.pos.z + Math.cos(v.yaw) * (v.spec.length * 0.35);
          effects.spawnSmoke(hoodX, v.pos.y + 1.15, hoodZ, v.hp < v.maxHp * 0.2 ? 0x222222 : 0x777c85, 0.75);
        }
      }

      // Spin & steer wheels visually
      const movedDist = Math.hypot(v.pos.x - prevX, v.pos.z - prevZ);
      const wheelDir = v.speed >= 0 ? 1 : -1;
      for (const wh of v.wheels) {
        wh.tire.rotation.x += (movedDist / 0.38) * wheelDir;
        if (wh.isFront) wh.pivot.rotation.y = v.steerAngle;
      }

      v.mesh.position.copy(v.pos);
      v.mesh.rotation.y = v.yaw;
    }

    // Vehicle-to-vehicle elastic separation & crash damage
    for (let i = 0; i < vehicles.length; i++) {
      const a = vehicles[i];
      for (let j = i + 1; j < vehicles.length; j++) {
        const b = vehicles[j];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const minDist = (a.spec.length + b.spec.length) * 0.34;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDist * minDist && distSq > 1e-4) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = (minDist - dist) * 0.52;
          const totalM = a.spec.mass + b.spec.mass;
          const ra = b.spec.mass / totalM;
          const rb = a.spec.mass / totalM;
          a.pos.x -= nx * overlap * ra;
          a.pos.z -= nz * overlap * ra;
          b.pos.x += nx * overlap * rb;
          b.pos.z += nz * overlap * rb;

          const rvx = a.vel.x - b.vel.x;
          const rvz = a.vel.z - b.vel.z;
          const relSpeed = rvx * nx + rvz * nz;
          if (relSpeed > 3.5) {
            const impulse = relSpeed * 0.65;
            a.vel.x -= nx * impulse * ra;
            a.vel.z -= nz * impulse * ra;
            b.vel.x += nx * impulse * rb;
            b.vel.z += nz * impulse * rb;
            a.speed *= 0.65;
            b.speed *= 0.65;

            if (relSpeed > 8.5) {
              const dmg = (relSpeed - 7) * 1.5;
              if (a.driver === 'player' || b.driver === 'player') {
                damageVehicle(a, dmg * ra, effects, audio, callbacks.onVehicleExplode);
                damageVehicle(b, dmg * rb, effects, audio, callbacks.onVehicleExplode);
                if (effects) effects.spawnSpark((a.pos.x + b.pos.x) * 0.5, a.pos.y + 0.9, (a.pos.z + b.pos.z) * 0.5, 0xffd166);
                if (audio) audio.playCrash(Math.min(1, relSpeed / 28));
                if (callbacks.onCrash) callbacks.onCrash((a.pos.x + b.pos.x) * 0.5, (a.pos.z + b.pos.z) * 0.5, relSpeed);
                // Hitting a police cruiser raises wanted heat!
                if ((a.classId === 'police' || b.classId === 'police') && callbacks.onHitPolice) {
                  callbacks.onHitPolice();
                }
              }
            }
          }
        }
      }
    }
  }

  return {
    vehicles,
    spawnVehicle,
    removeVehicle,
    repaintAndRepair,
    damageVehicle,
    explodeVehicle,
    populateInitialTraffic,
    findNearestStealable,
    update,
  };
}
