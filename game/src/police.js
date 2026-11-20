// Solana Bay — Five-Star SBPD Police Pursuit, Officers, Helicopter & Evasion
import * as THREE from 'three';
import { WANTED_CONFIG, ROAD_LINES, clamp } from './config.js';
import { buildCharacterRig } from './player.js';

const UNIT_CALLSIGNS = [
  { callsign: 'UNIT-12', role: 'RAMMING' },
  { callsign: 'UNIT-04', role: 'FLANKING' },
  { callsign: 'UNIT-09', role: 'INTERCEPT' },
  { callsign: 'TAC-07', role: 'MARKSMAN' },
  { callsign: 'FOOT-03', role: 'FOOT CHASE' },
  { callsign: 'AIR-ONE', role: 'AIR SUPPORT' },
];

function createHelicopterMesh() {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.5 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.7 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 5.4), bodyMat);
  fuselage.castShadow = true;
  root.add(fuselage);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.45, 4.2), stripeMat);
  stripe.position.y = -0.1;
  root.add(stripe);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.05, 1.8), glassMat);
  canopy.position.set(0, 0.15, 2.1);
  root.add(canopy);

  const tailBoom = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 4.8), bodyMat);
  tailBoom.position.set(0, 0.35, -4.6);
  root.add(tailBoom);

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 1.1), stripeMat);
  tailFin.position.set(0, 0.9, -6.7);
  root.add(tailFin);

  // Skids
  for (const sx of [-1.25, 1.25]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 4.2), darkMat);
    skid.position.set(sx, -1.35, 0.2);
    root.add(skid);
  }

  // Main spinning rotor
  const rotorPivot = new THREE.Group();
  rotorPivot.position.set(0, 1.25, 0);
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.08, 0.34), darkMat);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 9.6), darkMat);
  rotorPivot.add(blade1, blade2);
  root.add(rotorPivot);

  // Searchlight beam cone
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff8c4,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(7.2, 26, 12, 1, true), coneMat);
  beam.position.set(0, -14, 2.2);
  root.add(beam);

  return { root, rotorPivot, beam };
}

export function createPoliceSystem(scene, city, vehicleSystem) {
  const cruisers = [];
  const officers = [];
  let helicopter = null;
  let nextOfficerId = 1;

  const state = {
    stars: 0,
    heat: 0,
    spotted: false,
    evadeTimer: 0,
    bustTimer: 0,
    lastCrimeLocation: 'Miramar Coast',
    evasionCount: 0,
  };

  function setWantedStars(stars, reason = null, districtName = null) {
    const clamped = clamp(Math.round(stars), 0, WANTED_CONFIG.maxStars);
    state.stars = clamped;
    state.heat = WANTED_CONFIG.heatThresholds[clamped] || 0;
    if (clamped > 0) {
      state.spotted = true;
      state.evadeTimer = WANTED_CONFIG.evadeDuration;
    } else {
      state.spotted = false;
      state.evadeTimer = 0;
      state.bustTimer = 0;
      despawnAllUnits();
    }
    if (districtName) state.lastCrimeLocation = districtName;
    return { stars: state.stars, reason };
  }

  function addHeat(amount, districtName = null) {
    state.heat = Math.min(340, state.heat + amount);
    if (districtName) state.lastCrimeLocation = districtName;
    let newStars = state.stars;
    for (let s = 1; s <= WANTED_CONFIG.maxStars; s++) {
      if (state.heat >= WANTED_CONFIG.heatThresholds[s]) {
        newStars = Math.max(newStars, s);
      }
    }
    if (newStars > state.stars) {
      state.stars = newStars;
    }
    if (state.stars > 0) {
      state.spotted = true;
      state.evadeTimer = WANTED_CONFIG.evadeDuration;
    }
    return state.stars;
  }

  function clearWanted(countAsEscape = false) {
    if (state.stars > 0 && countAsEscape) state.evasionCount += 1;
    state.stars = 0;
    state.heat = 0;
    state.spotted = false;
    state.evadeTimer = 0;
    state.bustTimer = 0;
    despawnAllUnits();
  }

  function despawnAllUnits() {
    for (let i = cruisers.length - 1; i >= 0; i--) {
      vehicleSystem.removeVehicle(cruisers[i].vehicle);
    }
    cruisers.length = 0;
    for (let i = officers.length - 1; i >= 0; i--) {
      scene.remove(officers[i].rig.root);
    }
    officers.length = 0;
    if (helicopter) {
      scene.remove(helicopter.visual.root);
      helicopter = null;
    }
  }

  function spawnCruiserNear(px, pz, index = 0, explicitPose = null) {
    let sx;
    let sz;
    let yaw = 0;
    if (explicitPose) {
      sx = explicitPose.x;
      sz = explicitPose.z;
      yaw = explicitPose.yaw;
    } else {
      const ang = (index * 2.1) + 0.7;
      const dist = 54 + index * 12;
      const rawX = clamp(px + Math.cos(ang) * dist, -175, 175);
      const rawZ = clamp(pz + Math.sin(ang) * dist, -175, 180);
      // Snap near a road corridor
      let nearestRoad = ROAD_LINES[0];
      for (const r of ROAD_LINES) {
        if (Math.abs(rawZ - r) < Math.abs(rawZ - nearestRoad)) nearestRoad = r;
      }
      const resolved = city.resolveCircleCollisions(rawX, nearestRoad, 2.4);
      sx = resolved.x;
      sz = resolved.z;
      yaw = Math.atan2(px - sx, pz - sz);
    }

    const v = vehicleSystem.spawnVehicle({
      classId: 'cruiser',
      x: sx,
      z: sz,
      yaw,
      role: 'police',
    });
    v.sirenOn = true;

    const meta = UNIT_CALLSIGNS[index % 4];
    const unit = {
      id: `cruiser_${v.id}`,
      callsign: explicitPose?.callsign || `${meta.callsign}`,
      role: explicitPose?.role || meta.role,
      vehicle: v,
      dismounted: false,
      flankSide: index % 2 === 0 ? 1 : -1,
    };
    cruisers.push(unit);
    return unit;
  }

  function spawnOfficer({ x, z, yaw = 0, callsign = null, role = 'FOOT CHASE' } = {}) {
    const rig = buildCharacterRig({
      jacketColor: 0x1d4ed8,
      pantsColor: 0x0f172a,
      skinColor: 0xe6bc98,
      hairColor: 0x1e293b,
      shirtColor: 0x60a5fa,
    });
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.11, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x111827 })
    );
    gun.position.set(0, 0, 0.14);
    rig.weaponMount.add(gun);
    rig.root.position.set(x, 0.24, z);
    rig.root.rotation.y = yaw;
    scene.add(rig.root);

    const idNum = nextOfficerId++;
    const off = {
      id: `off_${idNum}`,
      callsign: callsign || `FOOT-0${(idNum % 9) + 1}`,
      role,
      rig,
      x,
      y: 0.24,
      z,
      yaw,
      hp: 60,
      alive: true,
      fireCooldown: 0.9,
      walkPhase: 0,
      radius: 0.52,
    };
    officers.push(off);
    return off;
  }

  function spawnHelicopter(x, y, z) {
    if (helicopter) scene.remove(helicopter.visual.root);
    const visual = createHelicopterMesh();
    visual.root.position.set(x, y, z);
    scene.add(visual.root);
    helicopter = {
      callsign: 'AIR-ONE',
      role: 'AIR SUPPORT',
      visual,
      x,
      y,
      z,
      yaw: 0,
      orbitAngle: 0,
      fireCooldown: 1.8,
      active: true,
    };
    return helicopter;
  }

  function damageOfficer(off, amount, onKilled) {
    if (!off || !off.alive) return false;
    off.hp -= amount;
    if (off.hp <= 0) {
      off.alive = false;
      off.rig.root.rotation.x = Math.PI * 0.5;
      off.rig.root.position.y = 0.34;
      if (onKilled) onKilled(off);
      return true;
    }
    return false;
  }

  function update(dt, player, effects, audio, callbacks = {}) {
    if (state.stars <= 0) return;

    const lvl = WANTED_CONFIG.levels[state.stars] || WANTED_CONFIG.levels[1];
    const px = player.state.x;
    const pz = player.state.z;

    // Maintain target cruiser count
    const aliveCruisers = cruisers.filter((c) => !c.vehicle.destroyed);
    if (aliveCruisers.length < lvl.cruisers) {
      spawnCruiserNear(px, pz, cruisers.length);
    }

    // Spawn helicopter at 4+ stars
    if (lvl.helicopter && !helicopter) {
      spawnHelicopter(px - 22, 26, pz - 18);
    } else if (!lvl.helicopter && helicopter) {
      scene.remove(helicopter.visual.root);
      helicopter = null;
    }

    let anySight = false;
    let closestThreat = 999;

    // Update cruisers
    for (let i = 0; i < cruisers.length; i++) {
      const unit = cruisers[i];
      const v = unit.vehicle;
      if (v.destroyed) continue;

      const dx = px - v.x;
      const dz = pz - v.z;
      const dist = Math.hypot(dx, dz);
      closestThreat = Math.min(closestThreat, dist);

      if (dist < WANTED_CONFIG.sightDistance && city.hasLineOfSight(v.x, v.z, px, pz)) {
        anySight = true;
      }

      // Flanking or ramming target point
      let tx = px;
      let tz = pz;
      if (unit.role === 'FLANKING' && dist > 14) {
        tx = px + Math.cos(player.state.yaw) * 10 * unit.flankSide;
        tz = pz - Math.sin(player.state.yaw) * 10 * unit.flankSide;
      }

      const desiredYaw = Math.atan2(tx - v.x, tz - v.z);
      let yawErr = desiredYaw - v.yaw;
      while (yawErr > Math.PI) yawErr -= Math.PI * 2;
      while (yawErr < -Math.PI) yawErr += Math.PI * 2;

      const steer = clamp(-yawErr * 1.4, -1, 1);
      const stopForDismount = !player.state.vehicle && dist < 13;
      const throttle = stopForDismount ? -0.6 : dist > 7 ? lvl.speedScale : 0.35;

      vehicleSystem.applyVehiclePhysics(v, dt, throttle, steer, false, effects, null, {});

      // Dismount an officer when close to an on-foot player
      const activeOfficers = officers.filter((o) => o.alive).length;
      if (!unit.dismounted && dist < 19 && activeOfficers < lvl.officers) {
        unit.dismounted = true;
        const ox = v.x + Math.cos(v.yaw) * 2.2;
        const oz = v.z - Math.sin(v.yaw) * 2.2;
        const safe = city.resolveCircleCollisions(ox, oz, 0.6);
        spawnOfficer({
          x: safe.x,
          z: safe.z,
          yaw: desiredYaw,
          role: state.stars >= 3 && activeOfficers === 0 ? 'MARKSMAN' : 'FOOT CHASE',
          callsign: state.stars >= 3 && activeOfficers === 0 ? 'TAC-07' : `FOOT-0${activeOfficers + 1}`,
        });
      }
    }

    // Update foot officers
    for (let i = 0; i < officers.length; i++) {
      const off = officers[i];
      if (!off.alive) continue;
      const dx = px - off.x;
      const dz = pz - off.z;
      const dist = Math.hypot(dx, dz);
      closestThreat = Math.min(closestThreat, dist);

      if (dist < WANTED_CONFIG.sightDistance && city.hasLineOfSight(off.x, off.z, px, pz)) {
        anySight = true;
      }

      off.yaw = Math.atan2(dx, dz);
      off.rig.root.rotation.y = off.yaw;
      off.rig.rightArm.rotation.x = -1.35;

      if (dist > 8 && dist < 60) {
        const speed = 4.6;
        const res = city.resolveCircleCollisions(
          off.x + (dx / dist) * speed * dt,
          off.z + (dz / dist) * speed * dt,
          off.radius
        );
        off.x = res.x;
        off.z = res.z;
        off.walkPhase += dt * 9;
        const swing = Math.sin(off.walkPhase) * 0.6;
        off.rig.leftLeg.rotation.x = swing;
        off.rig.rightLeg.rotation.x = -swing;
      } else {
        off.rig.leftLeg.rotation.x = 0;
        off.rig.rightLeg.rotation.x = 0;
      }
      off.rig.root.position.set(off.x, off.y, off.z);

      // Shoot at wanted player
      off.fireCooldown -= dt * lvl.shootRate;
      if (off.fireCooldown <= 0 && dist < 38 && player.state.alive) {
        off.fireCooldown = 1.25;
        if (city.hasLineOfSight(off.x, off.z, px, pz)) {
          const sx = off.x + Math.sin(off.yaw) * 0.6;
          const sz = off.z + Math.cos(off.yaw) * 0.6;
          if (effects) {
            effects.spawnMuzzleFlash(sx, 1.45, sz);
            effects.spawnTracer(sx, 1.45, sz, px, 1.35, pz, 0x7dd3fc);
          }
          if (audio) audio.playGunshot('pistol', 0.32);
          if (Math.random() < 0.36 * lvl.aggression) {
            player.applyDamage(5.5);
          }
        }
      }
    }

    // Update helicopter orbit & spotlight
    if (helicopter) {
      helicopter.orbitAngle += dt * 0.55;
      const targetX = px + Math.cos(helicopter.orbitAngle) * 26;
      const targetZ = pz + Math.sin(helicopter.orbitAngle) * 26;
      helicopter.x += (targetX - helicopter.x) * Math.min(1, dt * 2.2);
      helicopter.z += (targetZ - helicopter.z) * Math.min(1, dt * 2.2);
      helicopter.y = 24 + Math.sin(helicopter.orbitAngle * 2) * 1.4;
      helicopter.yaw = Math.atan2(px - helicopter.x, pz - helicopter.z);

      helicopter.visual.root.position.set(helicopter.x, helicopter.y, helicopter.z);
      helicopter.visual.root.rotation.y = helicopter.yaw;
      helicopter.visual.rotorPivot.rotation.y += dt * 24;

      if (Math.hypot(px - helicopter.x, pz - helicopter.z) < 90) anySight = true;

      helicopter.fireCooldown -= dt;
      if (helicopter.fireCooldown <= 0 && state.stars >= 4 && player.state.alive) {
        helicopter.fireCooldown = 2.4;
        if (effects) {
          effects.spawnTracer(helicopter.x, helicopter.y - 1, helicopter.z, px, 1.3, pz, 0xfef08a);
        }
        if (Math.random() < 0.28) player.applyDamage(4.5);
      }
    }

    // Evasion countdown when out of sight
    state.spotted = anySight;
    if (anySight) {
      state.evadeTimer = WANTED_CONFIG.evadeDuration;
    } else {
      state.evadeTimer = Math.max(0, state.evadeTimer - dt);
      if (state.evadeTimer <= 0) {
        clearWanted(true);
        if (callbacks.onEvaded) callbacks.onEvaded();
        return;
      }
    }

    // Close-range bust timer when player is slow/stopped near police
    const slowEnough = player.state.speed < 2.2;
    if (closestThreat < WANTED_CONFIG.bustDistance && slowEnough && player.state.alive) {
      state.bustTimer += dt;
      if (state.bustTimer >= WANTED_CONFIG.bustDuration) {
        player.state.busted = true;
        if (callbacks.onBusted) callbacks.onBusted();
      }
    } else {
      state.bustTimer = Math.max(0, state.bustTimer - dt * 1.6);
    }
  }

  return {
    state,
    cruisers,
    officers,
    get helicopter() {
      return helicopter;
    },
    setWantedStars,
    addHeat,
    clearWanted,
    despawnAllUnits,
    spawnCruiserNear,
    spawnOfficer,
    spawnHelicopter,
    damageOfficer,
    update,
  };
}
