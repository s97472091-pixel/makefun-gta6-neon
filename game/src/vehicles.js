// Vehicles: 6 procedural 3D models, arcade drift driving physics, traffic AI, stealing, damage & explosions.
import * as THREE from 'three';
import { CITY, ROAD_COORDS, VEHICLE_SPECS, clamp, lerp, angleDiff } from './config.js';

const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.28, 12);
wheelGeo.rotateZ(Math.PI / 2);
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1b1d24 });
const hubMat = new THREE.MeshLambertMaterial({ color: 0xcbd2dc });
const glassMat = new THREE.MeshPhongMaterial({ color: 0x1e2c3e, specular: 0xffd7b0, shininess: 90, transparent: true, opacity: 0.86 });
const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff2e44 });
const darkTrimMat = new THREE.MeshLambertMaterial({ color: 0x20232c });

export function buildVehicleMesh(spec, bodyColor) {
  const g = new THREE.Group();
  const L = spec.length;
  const W = spec.width;
  const H = spec.height;
  const bodyMat = new THREE.MeshPhongMaterial({ color: bodyColor, specular: 0xffe4c4, shininess: 75 });
  const bodyMeshes = [];

  // Lower chassis
  const chassisH = H * 0.46;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(W, chassisH, L), bodyMat);
  chassis.position.y = 0.4 + chassisH * 0.5;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  g.add(chassis);
  bodyMeshes.push(chassis);

  // Police white doors / hood contrast
  if (spec.kind === 'police') {
    const whiteMat = new THREE.MeshPhongMaterial({ color: 0xf4f6fa, specular: 0xffffff, shininess: 65 });
    const doorBand = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, chassisH * 0.9, L * 0.42), whiteMat);
    doorBand.position.set(0, 0.4 + chassisH * 0.5, -0.05);
    g.add(doorBand);
  }

  // Cabin / greenhouse
  const cabW = W * 0.86;
  const cabH = spec.kind === 'suv' ? H * 0.48 : spec.kind === 'cabrio' ? H * 0.25 : H * 0.4;
  const cabL = spec.kind === 'suv' ? L * 0.64 : spec.kind === 'sports' ? L * 0.44 : L * 0.5;
  const cabZ = spec.kind === 'suv' ? -0.22 : -0.18;

  if (spec.kind === 'cabrio') {
    // Open convertible interior + raked windshield
    const seat = new THREE.Mesh(new THREE.BoxGeometry(cabW * 0.92, 0.32, cabL), darkTrimMat);
    seat.position.set(0, 0.4 + chassisH + 0.1, cabZ);
    g.add(seat);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(cabW, 0.38, 0.08), glassMat);
    shield.position.set(0, 0.4 + chassisH + 0.22, cabZ + cabL * 0.5);
    shield.rotation.x = -0.35;
    g.add(shield);
  } else {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabW, cabH, cabL), spec.kind === 'police' ? new THREE.MeshPhongMaterial({ color: 0xf4f6fa, shininess: 65 }) : bodyMat);
    cabin.position.set(0, 0.4 + chassisH + cabH * 0.46, cabZ);
    cabin.castShadow = true;
    g.add(cabin);
    if (spec.kind !== 'police') bodyMeshes.push(cabin);

    // Side & front/rear tinted glass bands
    const glassSide = new THREE.Mesh(new THREE.BoxGeometry(cabW + 0.04, cabH * 0.64, cabL * 0.84), glassMat);
    glassSide.position.copy(cabin.position);
    g.add(glassSide);
    const glassFront = new THREE.Mesh(new THREE.BoxGeometry(cabW * 0.86, cabH * 0.64, cabL + 0.04), glassMat);
    glassFront.position.copy(cabin.position);
    g.add(glassFront);
  }

  // Sports spoiler
  if (spec.kind === 'sports') {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, 0.08, 0.34), darkTrimMat);
    wing.position.set(0, 0.4 + chassisH + 0.24, -L * 0.44);
    g.add(wing);
  }

  // Muscle hood intake
  if (spec.kind === 'muscle') {
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.9), darkTrimMat);
    scoop.position.set(0, 0.4 + chassisH + 0.06, L * 0.22);
    g.add(scoop);
  }

  // Bumpers
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.24, 0.18), darkTrimMat);
  frontBumper.position.set(0, 0.44, L * 0.5);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.24, 0.18), darkTrimMat);
  rearBumper.position.set(0, 0.44, -L * 0.5);
  g.add(frontBumper, rearBumper);

  // Headlights (+Z front) & taillights (-Z rear)
  for (const sx of [-W * 0.34, W * 0.34]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.08), headlightMat);
    hl.position.set(sx, 0.4 + chassisH * 0.62, L * 0.5 + 0.02);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.08), taillightMat);
    tl.position.set(sx, 0.4 + chassisH * 0.62, -L * 0.5 - 0.02);
    g.add(hl, tl);
  }

  // Police lightbar
  let redBar = null;
  let blueBar = null;
  if (spec.kind === 'police') {
    const barY = 0.4 + chassisH + cabH + 0.08;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 0.26), darkTrimMat);
    base.position.set(0, barY, cabZ);
    redBar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.15, 0.24), new THREE.MeshBasicMaterial({ color: 0xff2244 }));
    redBar.position.set(-0.32, barY + 0.08, cabZ);
    blueBar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.15, 0.24), new THREE.MeshBasicMaterial({ color: 0x2299ff }));
    blueBar.position.set(0.32, barY + 0.08, cabZ);
    g.add(base, redBar, blueBar);
  }

  // 4 Wheels
  const wheels = [];
  const wheelZ = L * 0.32;
  const wheelX = W * 0.48;
  for (const [wx, wz] of [[-wheelX, wheelZ], [wheelX, wheelZ], [-wheelX, -wheelZ], [wheelX, -wheelZ]]) {
    const wg = new THREE.Group();
    wg.position.set(wx, 0.4, wz);
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 8).rotateZ(Math.PI / 2), hubMat);
    wg.add(tire, hub);
    g.add(wg);
    wheels.push(wg);
  }

  return { group: g, wheels, bodyMat, bodyMeshes, redBar, blueBar };
}

export function createVehicleManager(scene, rng) {
  const vehicles = [];
  const trafficKinds = ['solara', 'marlin', 'breeze', 'palma', 'sierra'];

  // Lane helper: right-hand traffic offset = 4.2m from road centerline
  function spawnVehicle(specId, x, z, yaw, opts = {}) {
    const spec = VEHICLE_SPECS[specId] || VEHICLE_SPECS.palma;
    const color = opts.color ?? spec.colors[Math.floor(rng() * spec.colors.length)];
    const built = buildVehicleMesh(spec, color);
    built.group.position.set(x, opts.y ?? 0.05, z);
    built.group.rotation.y = yaw;
    scene.add(built.group);

    const v = {
      id: vehicles.length + 1,
      spec,
      color,
      mesh: built.group,
      wheels: built.wheels,
      bodyMat: built.bodyMat,
      redBar: built.redBar,
      blueBar: built.blueBar,
      x,
      y: opts.y ?? 0.05,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw,
      speed: 0,
      steerAngle: 0,
      hp: spec.hp,
      destroyed: false,
      sirenOn: !!opts.sirenOn,
      isPolice: spec.kind === 'police',
      isMissionCar: !!opts.isMissionCar,
      missionTag: opts.missionTag || null,
      driver: opts.driver || (opts.parked ? null : 'ai'),
      aiAxis: opts.aiAxis || (Math.abs(Math.sin(yaw)) > 0.7 ? 'x' : 'z'),
      aiDir: opts.aiDir || 1,
      aiSpeed: opts.aiSpeed ?? (11 + rng() * 6),
      aiTurnCooldown: 0,
      airborne: false,
      airTime: 0,
      smokeTimer: 0,
      despawnable: opts.despawnable ?? true,
    };
    vehicles.push(v);
    return v;
  }

  // Spawn signature parked rides near player start & landmarks + moving coastal traffic
  function spawnInitialFleet() {
    // Showcase sports car & convertible right on Miramar Strip for immediate stealing/cover shot
    spawnVehicle('solara', 222 + 4.3, -34, Math.PI, { color: 0xff3b6b, parked: true, despawnable: false });
    spawnVehicle('breeze', 222 - 4.3, -58, 0, { color: 0x2ee6d6, parked: true, despawnable: false });
    spawnVehicle('marlin', 148 + 4.3, -12, Math.PI, { color: 0xffbe0b, parked: true, despawnable: false });
    spawnVehicle('sierra', -111 + 6, -4, Math.PI / 2, { color: 0x2b2d42, parked: true, despawnable: false });

    // Ambient traffic cars distributed across the 7x7 road grid
    for (let i = 0; i < 20; i++) {
      const alongZ = i % 2 === 0;
      const roadIdx = Math.floor(rng() * ROAD_COORDS.length);
      const dir = rng() < 0.5 ? 1 : -1;
      const laneOffset = 4.2;
      let x, z, yaw;
      if (alongZ) {
        // Traveling along Z on avenue ROAD_COORDS[roadIdx]
        x = ROAD_COORDS[roadIdx] + (dir > 0 ? -laneOffset : laneOffset);
        z = -195 + rng() * 390;
        yaw = dir > 0 ? 0 : Math.PI;
      } else {
        // Traveling along X on street ROAD_COORDS[roadIdx]
        z = ROAD_COORDS[roadIdx] + (dir > 0 ? laneOffset : -laneOffset);
        x = -195 + rng() * 390;
        yaw = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      const kind = trafficKinds[Math.floor(rng() * trafficKinds.length)];
      spawnVehicle(kind, x, z, yaw, { aiAxis: alongZ ? 'z' : 'x', aiDir: dir });
    }
  }

  function repaintVehicle(v, newColor = null) {
    const palette = v.spec.colors;
    const c = newColor ?? palette[Math.floor(rng() * palette.length)];
    v.color = c;
    v.bodyMat.color.setHex(c);
    v.hp = v.spec.hp;
    v.destroyed = false;
  }

  function findNearestVehicle(x, z, maxDist = 5.2) {
    let best = null;
    let bestD = maxDist;
    for (const v of vehicles) {
      if (v.destroyed) continue;
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  function removeVehicle(v) {
    const idx = vehicles.indexOf(v);
    if (idx >= 0) vehicles.splice(idx, 1);
    scene.remove(v.mesh);
  }

  function applyVehicleDamage(v, dmg, fx, audio, onExplode) {
    if (v.destroyed) return;
    v.hp = Math.max(0, v.hp - dmg);
    if (v.hp <= 0) {
      v.destroyed = true;
      v.driver = null;
      v.speed *= 0.2;
      v.bodyMat.color.setHex(0x232024);
      fx?.spawnExplosion(v.x, v.y + 0.9, v.z);
      audio?.playExplosion();
      onExplode?.(v);
    }
  }

  // Player arcade-drift driving controller
  function updatePlayerVehicle(v, dt, input, city, fx, audio, onStunt) {
    const throttle = (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0) - (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0);
    const steerIn = (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0) - (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0);
    const handbrake = !!input.keys.Space;
    const boost = !!(input.keys.ShiftLeft || input.keys.ShiftRight) && throttle > 0;

    const fwdX = Math.sin(v.yaw);
    const fwdZ = Math.cos(v.yaw);
    const rightX = Math.cos(v.yaw);
    const rightZ = -Math.sin(v.yaw);

    // Project current velocity into local forward & lateral components
    let forwardVel = v.vx * fwdX + v.vz * fwdZ;
    let lateralVel = v.vx * rightX + v.vz * rightZ;

    const maxSpd = v.spec.maxSpeed * (boost ? 1.2 : 1.0);
    const accel = v.spec.accel * (boost ? 1.35 : 1.0);

    if (throttle > 0) {
      if (forwardVel < -1) forwardVel += v.spec.brake * dt;
      else forwardVel = Math.min(maxSpd, forwardVel + accel * dt);
    } else if (throttle < 0) {
      if (forwardVel > 1) forwardVel -= v.spec.brake * dt;
      else forwardVel = Math.max(-v.spec.reverseSpeed, forwardVel - accel * 0.72 * dt);
    } else {
      // Rolling drag
      forwardVel *= Math.exp(-1.55 * dt);
    }

    if (handbrake) {
      forwardVel *= Math.exp(-1.4 * dt);
    }

    // Steering response scales smoothly with speed
    const speedFactor = clamp(Math.abs(forwardVel) / 7.5, 0, 1);
    const revSign = forwardVel >= -0.3 ? 1 : -1;
    const turnRate = v.spec.steer * (handbrake ? 1.38 : 1.0) * speedFactor;
    v.yaw += steerIn * turnRate * revSign * dt;
    v.steerAngle = lerp(v.steerAngle, steerIn * 0.45, Math.min(1, dt * 12));

    // Recompute basis after yaw update and damp lateral slip (drift when handbraking)
    const nfX = Math.sin(v.yaw);
    const nfZ = Math.cos(v.yaw);
    const nrX = Math.cos(v.yaw);
    const nrZ = -Math.sin(v.yaw);
    const grip = handbrake ? v.spec.driftGrip : v.spec.grip;
    lateralVel *= Math.exp(-grip * dt);

    v.vx = nfX * forwardVel + nrX * lateralVel;
    v.vz = nfZ * forwardVel + nrZ * lateralVel;
    v.speed = forwardVel;

    // Drift tire smoke & screech
    if ((handbrake || Math.abs(lateralVel) > 6.5) && Math.abs(forwardVel) > 10 && !v.airborne) {
      if (Math.random() < 0.45) {
        fx?.spawnSmoke(v.x - nfX * 1.6, v.y + 0.25, v.z - nfZ * 1.6, 0xdddddf, 0.55);
      }
      audio?.playScreech(dt);
    }

    // Integrate + ramp launch / gravity
    v.x += v.vx * dt;
    v.z += v.vz * dt;
    const groundY = city.getGroundHeight(v.x, v.z);

    if (v.y <= groundY + 0.08 && v.vy <= 0) {
      if (v.airborne && v.airTime > 0.65) {
        onStunt?.(v.airTime);
      }
      // Check if launching off top of stunt ramp
      if (groundY > 1.8 && forwardVel > 16) {
        v.vy = Math.min(13, forwardVel * 0.34);
        v.airborne = true;
        v.airTime = 0;
      } else {
        v.y = groundY;
        v.vy = 0;
        v.airborne = false;
        v.airTime = 0;
      }
    } else {
      v.airborne = true;
      v.airTime += dt;
      v.vy -= 22 * dt;
      v.y += v.vy * dt;
      if (v.y < groundY) {
        v.y = groundY;
        v.vy = 0;
      }
    }

    // Building collision bounce
    const col = city.resolveCircleCollision(v.x, v.z, v.spec.width * 0.66);
    if (col.hit) {
      v.x = col.x;
      v.z = col.z;
      const impact = Math.hypot(v.vx, v.vz);
      if (impact > 9) {
        audio?.playCrash(Math.min(1, impact / 32));
        fx?.spawnSparks(v.x, v.y + 0.7, v.z, 8);
        applyVehicleDamage(v, impact * 0.55, fx, audio);
      }
      v.vx *= -0.25;
      v.vz *= -0.25;
      v.speed *= -0.25;
    }

    // Subtle chassis pitch & roll for juicy driving feel
    v.mesh.rotation.z = lerp(v.mesh.rotation.z, -steerIn * speedFactor * 0.065, Math.min(1, dt * 10));
    v.mesh.rotation.x = lerp(v.mesh.rotation.x, v.airborne ? -v.vy * 0.03 : -throttle * 0.025, Math.min(1, dt * 8));
  }

  // Ambient traffic AI following road lanes & making clean intersection turns
  function updateTrafficAI(v, dt, city, playerState) {
    v.aiTurnCooldown = Math.max(0, v.aiTurnCooldown - dt);

    // Slow down if another car or player is directly ahead
    let blocked = false;
    const fx = Math.sin(v.yaw);
    const fz = Math.cos(v.yaw);
    for (const other of vehicles) {
      if (other === v) continue;
      const dx = other.x - v.x;
      const dz = other.z - v.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 11) {
        const dot = (dx * fx + dz * fz) / (dist || 1);
        if (dot > 0.72) { blocked = true; break; }
      }
    }
    if (!blocked && !playerState.vehicle) {
      const dx = playerState.x - v.x;
      const dz = playerState.z - v.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 9 && (dx * fx + dz * fz) / (dist || 1) > 0.75) blocked = true;
    }

    const targetSpd = blocked ? 0 : v.aiSpeed;
    v.speed = lerp(v.speed, targetSpd, Math.min(1, dt * (blocked ? 7 : 3)));

    // Intersection turning / city edge wrap-around
    if (v.aiTurnCooldown <= 0) {
      for (let i = 0; i < ROAD_COORDS.length; i++) {
        const c = ROAD_COORDS[i];
        if (v.aiAxis === 'z' && Math.abs(v.z - c) < 1.2) {
          // At an intersection along Z
          const atEdge = (v.aiDir > 0 && i === ROAD_COORDS.length - 1) || (v.aiDir < 0 && i === 0);
          if (atEdge || rng() < 0.28) {
            v.aiAxis = 'x';
            if (v.x <= ROAD_COORDS[0] + 10) v.aiDir = 1;
            else if (v.x >= ROAD_COORDS[ROAD_COORDS.length - 1] - 10) v.aiDir = -1;
            else v.aiDir = rng() < 0.5 ? 1 : -1;
            v.z = c + (v.aiDir > 0 ? 4.2 : -4.2);
            v.yaw = v.aiDir > 0 ? Math.PI / 2 : -Math.PI / 2;
            v.aiTurnCooldown = 2.2;
          } else {
            v.aiTurnCooldown = 1.4;
          }
          break;
        }
        if (v.aiAxis === 'x' && Math.abs(v.x - c) < 1.2) {
          const atEdge = (v.aiDir > 0 && i === ROAD_COORDS.length - 1) || (v.aiDir < 0 && i === 0);
          if (atEdge || rng() < 0.28) {
            v.aiAxis = 'z';
            if (v.z <= ROAD_COORDS[0] + 10) v.aiDir = 1;
            else if (v.z >= ROAD_COORDS[ROAD_COORDS.length - 1] - 10) v.aiDir = -1;
            else v.aiDir = rng() < 0.5 ? 1 : -1;
            v.x = c + (v.aiDir > 0 ? -4.2 : 4.2);
            v.yaw = v.aiDir > 0 ? 0 : Math.PI;
            v.aiTurnCooldown = 2.2;
          } else {
            v.aiTurnCooldown = 1.4;
          }
          break;
        }
      }
    }

    v.vx = Math.sin(v.yaw) * v.speed;
    v.vz = Math.cos(v.yaw) * v.speed;
    v.x += v.vx * dt;
    v.z += v.vz * dt;
    v.y = city.getGroundHeight(v.x, v.z);

    // Bounce cleanly back onto road if pushed
    const col = city.resolveCircleCollision(v.x, v.z, v.spec.width * 0.65);
    if (col.hit) {
      v.x = col.x;
      v.z = col.z;
      v.yaw += Math.PI;
      v.aiDir = -v.aiDir;
    }
  }

  function update(dt, time, input, city, playerState, fx, audio, callbacks = {}) {
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];

      if (v.destroyed) {
        v.vx *= Math.exp(-3 * dt);
        v.vz *= Math.exp(-3 * dt);
        v.x += v.vx * dt;
        v.z += v.vz * dt;
        v.smokeTimer -= dt;
        if (v.smokeTimer <= 0) {
          v.smokeTimer = 0.24;
          fx?.spawnSmoke(v.x, v.y + 1.0, v.z, 0x222228, 0.95);
        }
      } else if (v.driver === 'player') {
        updatePlayerVehicle(v, dt, input, city, fx, audio, callbacks.onStunt);
      } else if (v.driver === 'ai') {
        updateTrafficAI(v, dt, city, playerState);
      } else if (v.driver === 'police') {
        // Handled by police.js, just apply building clamp & ground height
        v.y = city.getGroundHeight(v.x, v.z);
      } else {
        // Parked / coasting
        v.vx *= Math.exp(-2.8 * dt);
        v.vz *= Math.exp(-2.8 * dt);
        v.speed = Math.hypot(v.vx, v.vz);
        v.x += v.vx * dt;
        v.z += v.vz * dt;
        v.y = city.getGroundHeight(v.x, v.z);
        const col = city.resolveCircleCollision(v.x, v.z, v.spec.width * 0.66);
        v.x = col.x;
        v.z = col.z;
      }

      // Low HP engine smoke warning
      if (!v.destroyed && v.hp < v.spec.hp * 0.42) {
        v.smokeTimer -= dt;
        if (v.smokeTimer <= 0) {
          v.smokeTimer = 0.18;
          const fxDir = Math.sin(v.yaw);
          const fzDir = Math.cos(v.yaw);
          fx?.spawnSmoke(v.x + fxDir * 1.5, v.y + 0.9, v.z + fzDir * 1.5, 0x3b3d44, 0.65);
        }
      }

      // Sync Three.js transform + spinning wheels + police lightbar flash
      v.mesh.position.set(v.x, v.y, v.z);
      v.mesh.rotation.y = v.yaw;

      const spin = v.speed * dt * 2.1;
      for (let w = 0; w < v.wheels.length; w++) {
        v.wheels[w].children[0].rotation.x += spin;
        if (w < 2) v.wheels[w].rotation.y = v.steerAngle;
      }

      if (v.redBar && v.blueBar) {
        const flash = v.sirenOn && Math.sin(time * 16 + v.id) > 0;
        v.redBar.material.color.setHex(v.sirenOn ? (flash ? 0xff2244 : 0x440812) : 0x55111c);
        v.blueBar.material.color.setHex(v.sirenOn ? (!flash ? 0x22aaff : 0x0a2244) : 0x102844);
      }
    }

    // Vehicle-to-vehicle elastic collisions
    for (let i = 0; i < vehicles.length; i++) {
      const a = vehicles[i];
      for (let j = i + 1; j < vehicles.length; j++) {
        const b = vehicles[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const minDist = (a.spec.width + b.spec.width) * 0.72;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDist * minDist && distSq > 1e-4) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          const pen = (minDist - dist) * 0.5;
          a.x -= nx * pen;
          a.z -= nz * pen;
          b.x += nx * pen;
          b.z += nz * pen;

          const relSpeed = Math.hypot(a.vx - b.vx, a.vz - b.vz);
          if (relSpeed > 6) {
            const imp = relSpeed * 0.42;
            a.vx -= nx * imp;
            a.vz -= nz * imp;
            b.vx += nx * imp;
            b.vz += nz * imp;
            if (a.driver === 'player' || b.driver === 'player') {
              audio?.playCrash(Math.min(1, relSpeed / 28));
              fx?.spawnSparks((a.x + b.x) * 0.5, a.y + 0.8, (a.z + b.z) * 0.5, 6);
              if (relSpeed > 12) {
                applyVehicleDamage(a, relSpeed * 0.45, fx, audio, callbacks.onExplode);
                applyVehicleDamage(b, relSpeed * 0.45, fx, audio, callbacks.onExplode);
                if (b.isPolice || a.isPolice) callbacks.onHitPoliceCar?.();
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
    spawnInitialFleet,
    repaintVehicle,
    findNearestVehicle,
    removeVehicle,
    applyVehicleDamage,
    update,
  };
}
