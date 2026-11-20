// Solana Bay — six procedural vehicle classes, arcade drift physics, lane traffic AI, stealing, damage & explosions.

import * as THREE from 'three';
import {
  CITY,
  ROAD_COORDS,
  VEHICLE_CLASSES,
  CIVILIAN_VEHICLE_KEYS,
  createPRNG,
  clamp,
  lerp,
  lerpAngle,
  dist2D,
} from './config.js';

const WHEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.9 });
const RIM_MAT = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.6 });
const GLASS_MAT = new THREE.MeshStandardMaterial({ color: 0x1e2c3a, roughness: 0.18, metalness: 0.55 });
const HEADLIGHT_MAT = new THREE.MeshStandardMaterial({
  color: 0xfff4d1,
  emissive: 0xffe4a0,
  emissiveIntensity: 0.85,
});
const TAILLIGHT_MAT = new THREE.MeshStandardMaterial({
  color: 0xff3b3b,
  emissive: 0xe61c24,
  emissiveIntensity: 0.75,
});
const BUMPER_MAT = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.7 });

function buildVehicleMesh(spec, colorHex) {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.32,
    metalness: 0.25,
  });

  const w = spec.width;
  const h = spec.height;
  const l = spec.length;
  const chassisH = spec.id === 'van' ? h * 0.78 : spec.id === 'suv' ? h * 0.54 : h * 0.46;

  // Main chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(w, chassisH, l), bodyMat);
  chassis.position.y = 0.36 + chassisH * 0.5;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  root.add(chassis);

  // Cabin / greenhouse
  const cabinL = spec.id === 'van' ? l * 0.86 : spec.id === 'suv' ? l * 0.66 : spec.id === 'sports' ? l * 0.46 : l * 0.52;
  const cabinH = spec.id === 'van' ? h * 0.32 : h * 0.44;
  const cabinZ = spec.id === 'van' ? -0.1 : spec.id === 'sports' ? -0.22 : -0.15;
  const cabinMat = spec.isPolice
    ? new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.35 })
    : bodyMat;

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, cabinH, cabinL), cabinMat);
  cabin.position.set(0, 0.36 + chassisH + cabinH * 0.45, cabinZ);
  cabin.castShadow = true;
  root.add(cabin);

  // Windshield & rear glass
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, cabinH * 0.68, cabinL * 0.82), GLASS_MAT);
  glass.position.set(0, cabin.position.y + 0.02, cabinZ);
  root.add(glass);

  // Bumpers
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.24, 0.22), BUMPER_MAT);
  frontBumper.position.set(0, 0.42, l * 0.5 + 0.04);
  root.add(frontBumper);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.24, 0.22), BUMPER_MAT);
  rearBumper.position.set(0, 0.42, -l * 0.5 - 0.04);
  root.add(rearBumper);

  // Sports spoiler
  if (spec.id === 'sports') {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.1, 0.36), BUMPER_MAT);
    wing.position.set(0, 0.36 + chassisH + 0.28, -l * 0.44);
    root.add(wing);
  }

  // Headlights & taillights
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.08), HEADLIGHT_MAT);
    hl.position.set(sx * (w * 0.33), 0.36 + chassisH * 0.55, l * 0.5 + 0.02);
    root.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), TAILLIGHT_MAT);
    tl.position.set(sx * (w * 0.33), 0.36 + chassisH * 0.58, -l * 0.5 - 0.02);
    root.add(tl);
  }

  // Wheels
  const wheels = [];
  const wheelGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10);
  wheelGeom.rotateZ(Math.PI / 2);
  const rimGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8);
  rimGeom.rotateZ(Math.PI / 2);

  const zOff = l * 0.32;
  const xOff = w * 0.5;
  for (const [wx, wz] of [
    [-xOff, zOff],
    [xOff, zOff],
    [-xOff, -zOff],
    [xOff, -zOff],
  ]) {
    const wGroup = new THREE.Group();
    wGroup.add(new THREE.Mesh(wheelGeom, WHEEL_MAT));
    wGroup.add(new THREE.Mesh(rimGeom, RIM_MAT));
    wGroup.position.set(wx, 0.38, wz);
    root.add(wGroup);
    wheels.push(wGroup);
  }

  // Police lightbar & side white doors
  let lightRed = null;
  let lightBlue = null;
  if (spec.isPolice) {
    const doorStripe = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.03, chassisH * 0.85, l * 0.42),
      new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.35 })
    );
    doorStripe.position.set(0, chassis.position.y, 0);
    root.add(doorStripe);

    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.28), BUMPER_MAT);
    barBase.position.set(0, cabin.position.y + cabinH * 0.5 + 0.07, cabinZ + 0.1);
    root.add(barBase);

    lightRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.26),
      new THREE.MeshStandardMaterial({ color: 0xff2a3c, emissive: 0xff1e2d, emissiveIntensity: 0.2 })
    );
    lightRed.position.set(-0.28, barBase.position.y + 0.08, barBase.position.z);
    root.add(lightRed);

    lightBlue = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x2a9dff, emissive: 0x1e88ff, emissiveIntensity: 0.2 })
    );
    lightBlue.position.set(0.28, barBase.position.y + 0.08, barBase.position.z);
    root.add(lightBlue);
  }

  return { root, bodyMat, wheels, lightRed, lightBlue };
}

export function createVehicleManager(scene, seed = 1) {
  const rand = createPRNG(seed * 4129 + 33);
  const vehicles = [];
  let nextId = 1;

  function pickCivilianClass() {
    let total = 0;
    for (const k of CIVILIAN_VEHICLE_KEYS) total += VEHICLE_CLASSES[k].spawnWeight;
    let r = rand() * total;
    for (const k of CIVILIAN_VEHICLE_KEYS) {
      r -= VEHICLE_CLASSES[k].spawnWeight;
      if (r <= 0) return k;
    }
    return 'sedan';
  }

  function spawnVehicle(classId, x, z, yaw = 0, options = {}) {
    const spec = VEHICLE_CLASSES[classId] || VEHICLE_CLASSES.sedan;
    const color = options.color || spec.colors[Math.floor(rand() * spec.colors.length)];
    const meshObj = buildVehicleMesh(spec, color);
    meshObj.root.position.set(x, 0, z);
    meshObj.root.rotation.y = yaw;
    scene.add(meshObj.root);

    const v = {
      id: nextId++,
      classId: spec.id,
      spec,
      color,
      mesh: meshObj.root,
      bodyMat: meshObj.bodyMat,
      wheels: meshObj.wheels,
      lightRed: meshObj.lightRed,
      lightBlue: meshObj.lightBlue,
      x,
      y: 0,
      z,
      vx: 0,
      vz: 0,
      yaw,
      speed: 0,
      steerAngle: 0,
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      radius: Math.max(spec.width, spec.length) * 0.42,
      driver: options.driver || 'traffic', // 'player' | 'traffic' | 'police' | 'parked' | 'none'
      isPolice: Boolean(spec.isPolice),
      missionTag: options.missionTag || null,
      destroyed: false,
      sirenOn: Boolean(options.sirenOn),
      smokeTimer: 0,
      nitro: 1.0,
      // Traffic lane state
      axis: options.axis || (Math.abs(Math.sin(yaw)) > 0.5 ? 'x' : 'z'),
      dir: options.dir || 1,
      roadCoord: options.roadCoord ?? 0,
      turnCooldown: 0,
      stuckTimer: 0,
      dismounted: false,
    };

    vehicles.push(v);
    return v;
  }

  function removeVehicle(v) {
    const idx = vehicles.indexOf(v);
    if (idx !== -1) vehicles.splice(idx, 1);
    scene.remove(v.mesh);
  }

  function spawnInitialTraffic(count = 20) {
    // Spawn several showcase parked/curbside cars plus moving road traffic
    const parkedSpots = [
      { cls: 'sports', x: 99.6, z: -36, yaw: 0, color: '#ff006e' },
      { cls: 'coupe', x: 147.6, z: -20, yaw: 0, color: '#00f5d4' },
      { cls: 'suv', x: -44.4, z: 36, yaw: Math.PI, color: '#e9c46a' },
      { cls: 'van', x: 99.6, z: 62, yaw: 0, color: '#e07a5f' },
    ];
    for (const p of parkedSpots) {
      spawnVehicle(p.cls, p.x, p.z, p.yaw, { driver: 'parked', color: p.color });
    }

    for (let i = 0; i < count; i++) {
      const axis = i % 2 === 0 ? 'z' : 'x';
      const roadIdx = Math.floor(rand() * ROAD_COORDS.length);
      const rc = ROAD_COORDS[roadIdx];
      const dir = rand() > 0.5 ? 1 : -1;
      const along = (rand() * 2 - 1) * (CITY.halfSpan - 12);

      let x, z, yaw;
      if (axis === 'z') {
        // North/South road: right-hand lane
        x = rc + (dir > 0 ? -CITY.laneOffset : CITY.laneOffset);
        z = along;
        yaw = dir > 0 ? 0 : Math.PI;
      } else {
        // East/West road: right-hand lane
        x = along;
        z = rc + (dir > 0 ? CITY.laneOffset : -CITY.laneOffset);
        yaw = dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      }

      // Avoid spawning overlapping existing vehicles
      if (vehicles.some((o) => dist2D(o.x, o.z, x, z) < 12)) continue;
      spawnVehicle(pickCivilianClass(), x, z, yaw, {
        driver: 'traffic',
        axis,
        dir,
        roadCoord: rc,
      });
    }
  }

  function resprayVehicle(v) {
    if (!v || v.destroyed) return;
    const pool = v.spec.colors.length > 1 ? v.spec.colors : ['#00f5d4', '#ffbe0b', '#ff006e', '#3a86ff'];
    const nextColor = pool[Math.floor(Math.random() * pool.length)];
    v.color = nextColor;
    v.bodyMat.color.set(nextColor);
    v.hp = v.maxHp;
  }

  function damageVehicle(v, amount, effects, audio, onExplode) {
    if (v.destroyed) return;
    v.hp = Math.max(0, v.hp - amount);
    if (v.hp <= 0) {
      v.destroyed = true;
      v.driver = 'none';
      v.sirenOn = false;
      v.speed *= 0.2;
      v.bodyMat.color.set(0x222225);
      v.bodyMat.roughness = 0.95;
      if (effects) effects.spawnExplosion(v.x, 1.0, v.z, 1.35);
      if (audio) audio.playExplosion();
      if (onExplode) onExplode(v);
    }
  }

  function findNearestStealable(x, z, maxDist = 5.4) {
    let best = null;
    let bestDist = maxDist;
    for (const v of vehicles) {
      if (v.destroyed) continue;
      const d = dist2D(x, z, v.x, v.z);
      if (d < bestDist) {
        bestDist = d;
        best = v;
      }
    }
    return best;
  }

  function nearestRoadCoord(val) {
    let best = ROAD_COORDS[0];
    let bestD = Infinity;
    for (const r of ROAD_COORDS) {
      const d = Math.abs(val - r);
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }
    return best;
  }

  function updatePlayerVehicle(v, dt, input, effects, audio) {
    const spec = v.spec;
    const fwdX = Math.sin(v.yaw);
    const fwdZ = Math.cos(v.yaw);
    const rightX = Math.cos(v.yaw);
    const rightZ = -Math.sin(v.yaw);

    let forwardVel = v.vx * fwdX + v.vz * fwdZ;
    let lateralVel = v.vx * rightX + v.vz * rightZ;

    const throttle = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const handbrake = Boolean(input.jump);
    const boosting = Boolean(input.sprint) && throttle > 0 && v.nitro > 0.05;

    if (boosting) {
      v.nitro = Math.max(0, v.nitro - dt * 0.42);
    } else {
      v.nitro = Math.min(1, v.nitro + dt * 0.16);
    }

    const maxSpd = spec.maxSpeed * (boosting ? 1.25 : 1.0);
    if (throttle > 0) {
      forwardVel += spec.accel * (boosting ? 1.45 : 1.0) * dt;
    } else if (throttle < 0) {
      if (forwardVel > 1.5) {
        forwardVel = Math.max(0, forwardVel - spec.brake * dt);
      } else {
        forwardVel -= spec.accel * 0.65 * dt;
      }
    } else {
      forwardVel *= Math.max(0, 1 - dt * 1.4);
    }

    if (handbrake) {
      forwardVel *= Math.max(0, 1 - dt * 2.2);
    }

    forwardVel = clamp(forwardVel, -spec.reverseSpeed, maxSpd);

    // Steering scales with speed and reverses when backing up
    const speedFactor = clamp(Math.abs(forwardVel) / 7.5, 0, 1);
    const dirSign = forwardVel >= -0.2 ? 1 : -1;
    const driftBoost = handbrake ? 1.38 : 1.0;
    v.yaw += steer * spec.turnRate * driftBoost * speedFactor * dirSign * dt;
    v.steerAngle = lerp(v.steerAngle, steer * 0.42, clamp(dt * 12, 0, 1));

    // Lateral grip (lower when handbrake drifting)
    const grip = handbrake ? spec.driftGrip : spec.grip;
    lateralVel *= Math.max(0, 1 - grip * dt);

    // Recombine velocity
    const nFwdX = Math.sin(v.yaw);
    const nFwdZ = Math.cos(v.yaw);
    const nRightX = Math.cos(v.yaw);
    const nRightZ = -Math.sin(v.yaw);
    v.vx = nFwdX * forwardVel + nRightX * lateralVel;
    v.vz = nFwdZ * forwardVel + nRightZ * lateralVel;
    v.speed = forwardVel;

    // Tire smoke & screech on hard drift
    const slip = Math.abs(lateralVel);
    if ((handbrake && Math.abs(forwardVel) > 9) || slip > 6.5) {
      if (effects && Math.random() < dt * 26) {
        effects.spawnSmoke(v.x - nFwdX * 1.6, 0.25, v.z - nFwdZ * 1.6, 0.7);
      }
      if (audio) audio.playTireScreech(clamp(slip / 14, 0.15, 0.8));
    }
  }

  function updateTrafficVehicle(v, dt, player) {
    const cruiseSpeed = v.spec.maxSpeed * 0.36;
    v.turnCooldown = Math.max(0, v.turnCooldown - dt);

    // Check obstacle ahead (other vehicles or player)
    const fx = Math.sin(v.yaw);
    const fz = Math.cos(v.yaw);
    let blocked = false;
    for (const o of vehicles) {
      if (o === v) continue;
      const dx = o.x - v.x;
      const dz = o.z - v.z;
      const d = Math.hypot(dx, dz);
      if (d < 10.5 && dx * fx + dz * fz > 0.65 * d) {
        blocked = true;
        break;
      }
    }
    if (!blocked && player && !player.state.vehicle) {
      const dx = player.state.x - v.x;
      const dz = player.state.z - v.z;
      const d = Math.hypot(dx, dz);
      if (d < 7.5 && dx * fx + dz * fz > 0.75 * d) blocked = true;
    }

    const targetSpd = blocked ? 0 : cruiseSpeed;
    v.speed = lerp(v.speed, targetSpd, clamp(dt * (blocked ? 6.5 : 2.6), 0, 1));

    // At intersections, occasionally turn 90 degrees or reverse at city edges
    const nearX = nearestRoadCoord(v.x);
    const nearZ = nearestRoadCoord(v.z);
    const atIntersection = Math.abs(v.x - nearX) < 3.8 && Math.abs(v.z - nearZ) < 3.8;

    if (atIntersection && v.turnCooldown <= 0) {
      const atEdge =
        (v.axis === 'z' && ((v.dir > 0 && nearZ >= CITY.halfSpan - 1) || (v.dir < 0 && nearZ <= -CITY.halfSpan + 1))) ||
        (v.axis === 'x' && ((v.dir > 0 && nearX >= CITY.halfSpan - 1) || (v.dir < 0 && nearX <= -CITY.halfSpan + 1)));

      if (atEdge || rand() < 0.34) {
        const candidates = [];
        if (nearZ < CITY.halfSpan - 1) candidates.push({ axis: 'z', dir: 1, rc: nearX });
        if (nearZ > -CITY.halfSpan + 1) candidates.push({ axis: 'z', dir: -1, rc: nearX });
        if (nearX < CITY.halfSpan - 1) candidates.push({ axis: 'x', dir: 1, rc: nearZ });
        if (nearX > -CITY.halfSpan + 1) candidates.push({ axis: 'x', dir: -1, rc: nearZ });

        // Prefer not doing a 180 unless forced
        const nonReverse = candidates.filter((c) => !(c.axis === v.axis && c.dir === -v.dir));
        const pool = nonReverse.length ? nonReverse : candidates;
        if (pool.length) {
          const pick = pool[Math.floor(rand() * pool.length)];
          v.axis = pick.axis;
          v.dir = pick.dir;
          v.roadCoord = pick.rc;
          v.turnCooldown = 2.6;
        }
      } else {
        v.turnCooldown = 1.6;
      }
    }

    // Steer smoothly back onto target lane line
    let targetYaw;
    if (v.axis === 'z') {
      const laneX = v.roadCoord + (v.dir > 0 ? -CITY.laneOffset : CITY.laneOffset);
      const err = clamp((laneX - v.x) * 0.14, -0.5, 0.5);
      targetYaw = v.dir > 0 ? err : Math.PI - err;
    } else {
      const laneZ = v.roadCoord + (v.dir > 0 ? CITY.laneOffset : -CITY.laneOffset);
      const err = clamp((laneZ - v.z) * 0.14, -0.5, 0.5);
      targetYaw = v.dir > 0 ? Math.PI * 0.5 - err : -Math.PI * 0.5 + err;
    }

    v.yaw = lerpAngle(v.yaw, targetYaw, clamp(dt * 4.5, 0, 1));
    v.vx = Math.sin(v.yaw) * v.speed;
    v.vz = Math.cos(v.yaw) * v.speed;
  }

  function update(dt, elapsed, input, city, player, effects, audio, callbacks = {}) {
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];

      if (v.destroyed) {
        v.vx *= Math.max(0, 1 - dt * 3);
        v.vz *= Math.max(0, 1 - dt * 3);
        v.speed = Math.hypot(v.vx, v.vz);
        v.smokeTimer -= dt;
        if (v.smokeTimer <= 0 && effects) {
          effects.spawnSmoke(v.x, 1.1, v.z, 1.15, 0x222222);
          v.smokeTimer = 0.22;
        }
      } else if (v.driver === 'player') {
        updatePlayerVehicle(v, dt, input, effects, audio);
        if (player) {
          player.state.stats.distanceDriven += Math.hypot(v.vx, v.vz) * dt;
        }
      } else if (v.driver === 'traffic') {
        updateTrafficVehicle(v, dt, player);
      } else if (v.driver === 'parked' || v.driver === 'none') {
        v.vx *= Math.max(0, 1 - dt * 4.2);
        v.vz *= Math.max(0, 1 - dt * 4.2);
        v.speed = Math.hypot(v.vx, v.vz);
      }
      // Note: driver === 'police' steering/velocity is updated in police.js before or alongside vehicles.update

      // Integrate position & resolve building collisions
      const prevSpeed = Math.hypot(v.vx, v.vz);
      v.x += v.vx * dt;
      v.z += v.vz * dt;

      const col = city.resolveCircleCollision(v.x, v.z, v.radius);
      if (col.hit) {
        v.x = col.x;
        v.z = col.z;
        const dot = v.vx * col.nx + v.vz * col.nz;
        if (dot < 0) {
          v.vx -= col.nx * dot * 1.25;
          v.vz -= col.nz * dot * 1.25;
          v.vx *= 0.6;
          v.vz *= 0.6;
          if (prevSpeed > 11 && !v.destroyed) {
            const dmg = (prevSpeed - 10) * 1.3;
            damageVehicle(v, dmg, effects, audio, callbacks.onVehicleExplode);
            if (effects) effects.spawnSparks(v.x, 0.8, v.z, 8);
            if (audio && v.driver === 'player') audio.playCrash(clamp(prevSpeed / 30, 0.25, 1));
          }
        }
      }

      // Smoking when critically damaged
      if (!v.destroyed && v.hp < v.maxHp * 0.35) {
        v.smokeTimer -= dt;
        if (v.smokeTimer <= 0 && effects) {
          const hoodX = v.x + Math.sin(v.yaw) * (v.spec.length * 0.38);
          const hoodZ = v.z + Math.cos(v.yaw) * (v.spec.length * 0.38);
          effects.spawnSmoke(hoodX, 1.0, hoodZ, 0.75, 0x454545);
          v.smokeTimer = 0.14;
        }
      }

      // Police flashing lightbar
      if (v.lightRed && v.lightBlue) {
        if (v.sirenOn && !v.destroyed) {
          const flash = Math.floor(elapsed * 8) % 2 === 0;
          v.lightRed.material.emissiveIntensity = flash ? 2.4 : 0.15;
          v.lightBlue.material.emissiveIntensity = flash ? 0.15 : 2.4;
        } else {
          v.lightRed.material.emissiveIntensity = 0.15;
          v.lightBlue.material.emissiveIntensity = 0.15;
        }
      }

      // Spin wheels & sync mesh transform
      const wheelSpin = v.speed * dt * 2.2;
      for (let w = 0; w < v.wheels.length; w++) {
        v.wheels[w].rotation.x += wheelSpin;
        if (w < 2) v.wheels[w].rotation.y = v.steerAngle;
      }
      v.y = city.getGroundHeight(v.x, v.z);
      v.mesh.position.set(v.x, v.y, v.z);
      v.mesh.rotation.y = v.yaw;
    }

    // Vehicle-to-vehicle collisions
    for (let i = 0; i < vehicles.length; i++) {
      const a = vehicles[i];
      for (let j = i + 1; j < vehicles.length; j++) {
        const b = vehicles[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const minD = a.radius + b.radius;
        const distSq = dx * dx + dz * dz;
        if (distSq < minD * minD && distSq > 0.0001) {
          const d = Math.sqrt(distSq);
          const nx = dx / d;
          const nz = dz / d;
          const overlap = (minD - d) * 0.5;
          a.x -= nx * overlap;
          a.z -= nz * overlap;
          b.x += nx * overlap;
          b.z += nz * overlap;

          const relVx = b.vx - a.vx;
          const relVz = b.vz - a.vz;
          const sepVel = relVx * nx + relVz * nz;
          if (sepVel < 0) {
            const totalMass = a.spec.mass + b.spec.mass;
            const impulse = -(1.35 * sepVel) / totalMass;
            a.vx -= impulse * b.spec.mass * nx;
            a.vz -= impulse * b.spec.mass * nz;
            b.vx += impulse * a.spec.mass * nx;
            b.vz += impulse * a.spec.mass * nz;

            const impact = Math.abs(sepVel);
            if (impact > 9) {
              const dmg = (impact - 8) * 1.4;
              damageVehicle(a, dmg, effects, audio, callbacks.onVehicleExplode);
              damageVehicle(b, dmg, effects, audio, callbacks.onVehicleExplode);
              if (effects) effects.spawnSparks((a.x + b.x) * 0.5, 0.9, (a.z + b.z) * 0.5, 10);
              if (audio && (a.driver === 'player' || b.driver === 'player')) {
                audio.playCrash(clamp(impact / 28, 0.3, 1));
              }
              if (callbacks.onPlayerCrash && (a.driver === 'player' || b.driver === 'player')) {
                callbacks.onPlayerCrash(a.driver === 'player' ? b : a, impact);
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
    spawnInitialTraffic,
    resprayVehicle,
    damageVehicle,
    findNearestStealable,
    update,
  };
}
