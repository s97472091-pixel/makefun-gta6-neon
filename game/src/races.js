// Solana Bay — Four Street Races with Checkpoint Rings, Rivals & Rewards
import * as THREE from 'three';
import { clamp } from './config.js';

export const RACE_DEFINITIONS = [
  {
    id: 'miramar_sprint',
    name: 'Miramar Sunset Sprint',
    districtId: 'miramar_coast',
    rewardCash: 850,
    rewardRp: 180,
    start: { x: -120, z: 180, yaw: Math.PI * 0.5 },
    checkpoints: [
      { x: -60, z: 180 },
      { x: 0, z: 180 },
      { x: 60, z: 180 },
      { x: 120, z: 180 },
      { x: 120, z: 120 },
      { x: 0, z: 120 },
      { x: -120, z: 120 },
      { x: -120, z: 180 },
    ],
  },
  {
    id: 'pasar_circuit',
    name: 'Pasar Lantern Circuit',
    districtId: 'pasar_senja',
    rewardCash: 1050,
    rewardRp: 220,
    start: { x: 60, z: 60, yaw: 0 },
    checkpoints: [
      { x: 60, z: 0 },
      { x: 120, z: 0 },
      { x: 120, z: 60 },
      { x: 180, z: 60 },
      { x: 180, z: -60 },
      { x: 60, z: -60 },
      { x: 60, z: 60 },
    ],
  },
  {
    id: 'core_apex',
    name: 'Solana Core Apex',
    districtId: 'solana_core',
    rewardCash: 1250,
    rewardRp: 260,
    start: { x: -60, z: 60, yaw: Math.PI },
    checkpoints: [
      { x: -60, z: -60 },
      { x: 0, z: -60 },
      { x: 0, z: 0 },
      { x: 60, z: 0 },
      { x: 60, z: -120 },
      { x: -60, z: -120 },
      { x: -60, z: 60 },
    ],
  },
  {
    id: 'bay_grand_loop',
    name: 'Bay Grand Perimeter',
    districtId: 'altura_heights',
    rewardCash: 1750,
    rewardRp: 360,
    start: { x: -180, z: 180, yaw: Math.PI * 0.5 },
    checkpoints: [
      { x: 180, z: 180 },
      { x: 180, z: -180 },
      { x: -180, z: -180 },
      { x: -180, z: 0 },
      { x: -180, z: 180 },
    ],
  },
];

export function createRaceSystem(scene, vehicleSystem) {
  // Glowing checkpoint ring for the active race
  const cpGroup = new THREE.Group();
  const torusMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.28, 10, 28), torusMat);
  torus.position.y = 3.2;
  cpGroup.add(torus);

  const floorRing = new THREE.Mesh(
    new THREE.RingGeometry(3.4, 4.4, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = 0.25;
  cpGroup.add(floorRing);
  cpGroup.visible = false;
  scene.add(cpGroup);

  // Start markers on the map for idle races
  const startMarkers = RACE_DEFINITIONS.map((r) => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.9, 20),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(r.start.x, 0.26, r.start.z);
    scene.add(m);
    return { raceId: r.id, mesh: m };
  });

  const state = {
    activeRace: null,
    checkpointIndex: 0,
    elapsed: 0,
    rivals: [], // { vehicle, checkpointIndex, speedScale }
    wonIds: [],
    position: 1,
    totalRacers: 4,
  };

  function cleanupRivals() {
    for (const r of state.rivals) {
      vehicleSystem.removeVehicle(r.vehicle);
    }
    state.rivals = [];
  }

  function startRace(raceId, player, onToast) {
    const def = RACE_DEFINITIONS.find((r) => r.id === raceId);
    if (!def) return false;
    cleanupRivals();

    state.activeRace = def;
    state.checkpointIndex = 0;
    state.elapsed = 0;
    state.position = 1;

    // Give player a sports car if on foot
    if (!player.state.vehicle) {
      const car = vehicleSystem.spawnVehicle({
        classId: 'sports',
        x: def.start.x,
        z: def.start.z,
        yaw: def.start.yaw,
        color: 0xff3b4e,
        role: 'player',
      });
      player.enterVehicle(car);
    } else {
      const v = player.state.vehicle;
      v.x = def.start.x;
      v.z = def.start.z;
      v.yaw = def.start.yaw;
      v.vx = 0;
      v.vz = 0;
      v.speed = 0;
    }

    // Spawn 3 AI rivals beside/ahead on the starting grid
    const rivalColors = [0xfbbf24, 0x22d3ee, 0xa855f7];
    const rivalClasses = ['sports', 'muscle', 'sports'];
    for (let i = 0; i < 3; i++) {
      const side = (i % 2 === 0 ? 1 : -1) * 3.4;
      const back = -5.5 * Math.floor(i / 2 + 1);
      const rx = def.start.x + Math.sin(def.start.yaw) * back + Math.cos(def.start.yaw) * side;
      const rz = def.start.z + Math.cos(def.start.yaw) * back - Math.sin(def.start.yaw) * side;
      const rv = vehicleSystem.spawnVehicle({
        classId: rivalClasses[i],
        x: rx,
        z: rz,
        yaw: def.start.yaw,
        color: rivalColors[i],
        role: 'racer',
      });
      state.rivals.push({
        vehicle: rv,
        checkpointIndex: 0,
        speedScale: 0.72 + i * 0.06,
      });
    }

    const firstCp = def.checkpoints[0];
    cpGroup.position.set(firstCp.x, 0, firstCp.z);
    cpGroup.visible = true;
    for (const sm of startMarkers) sm.mesh.visible = false;
    if (onToast) onToast(`RACE STARTED: ${def.name} (${def.checkpoints.length} checkpoints)`);
    return true;
  }

  function cancelRace() {
    cleanupRivals();
    state.activeRace = null;
    cpGroup.visible = false;
    for (const sm of startMarkers) sm.mesh.visible = true;
  }

  function findNearbyRaceStart(x, z, maxDist = 11) {
    if (state.activeRace) return null;
    for (const def of RACE_DEFINITIONS) {
      if (Math.hypot(x - def.start.x, z - def.start.z) <= maxDist) {
        return def;
      }
    }
    return null;
  }

  function update(dt, player, effects, audio, callbacks = {}) {
    if (!state.activeRace) return;

    const def = state.activeRace;
    state.elapsed += dt;
    torus.rotation.y += dt * 1.8;

    const cp = def.checkpoints[state.checkpointIndex];
    cpGroup.position.set(cp.x, 0, cp.z);

    // Update AI rivals steering along checkpoints
    for (const rival of state.rivals) {
      const v = rival.vehicle;
      if (v.destroyed) continue;
      const rCp = def.checkpoints[Math.min(rival.checkpointIndex, def.checkpoints.length - 1)];
      const dx = rCp.x - v.x;
      const dz = rCp.z - v.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 10 && rival.checkpointIndex < def.checkpoints.length) {
        rival.checkpointIndex += 1;
      }
      const desiredYaw = Math.atan2(dx, dz);
      let err = desiredYaw - v.yaw;
      while (err > Math.PI) err -= Math.PI * 2;
      while (err < -Math.PI) err += Math.PI * 2;
      const steer = clamp(-err * 1.5, -1, 1);
      vehicleSystem.applyVehiclePhysics(v, dt, rival.speedScale, steer, false, effects, null, {});
    }

    // Check player passing active checkpoint
    const pDist = Math.hypot(player.state.x - cp.x, player.state.z - cp.z);
    if (pDist < 10.5) {
      state.checkpointIndex += 1;
      if (audio) audio.playChime('stage');
      if (state.checkpointIndex >= def.checkpoints.length) {
        // Race finished!
        const finalPos = state.position;
        const won = finalPos === 1;
        const prize = won ? def.rewardCash : Math.round(def.rewardCash * 0.35);
        const rp = won ? def.rewardRp : Math.round(def.rewardRp * 0.4);
        if (won && !state.wonIds.includes(def.id)) state.wonIds.push(def.id);
        player.addCash(prize);
        if (callbacks.onRaceFinished) callbacks.onRaceFinished({ race: def, position: finalPos, won, prize, rp });
        cancelRace();
        return;
      }
    }

    // Compute live position against rivals
    const nextCp = def.checkpoints[Math.min(state.checkpointIndex, def.checkpoints.length - 1)];
    const playerScore = state.checkpointIndex * 1000 - Math.hypot(player.state.x - nextCp.x, player.state.z - nextCp.z);
    let pos = 1;
    for (const r of state.rivals) {
      const rCp = def.checkpoints[Math.min(r.checkpointIndex, def.checkpoints.length - 1)];
      const rScore = r.checkpointIndex * 1000 - Math.hypot(r.vehicle.x - rCp.x, r.vehicle.z - rCp.z);
      if (rScore > playerScore) pos += 1;
    }
    state.position = pos;
  }

  function getHudData() {
    if (!state.activeRace) return null;
    const cp = state.activeRace.checkpoints[state.checkpointIndex] || null;
    return {
      active: true,
      name: state.activeRace.name,
      position: state.position,
      totalRacers: state.totalRacers,
      checkpoint: state.checkpointIndex + 1,
      totalCheckpoints: state.activeRace.checkpoints.length,
      elapsed: state.elapsed,
      target: cp,
    };
  }

  function exportState() {
    return [...state.wonIds];
  }

  function importState(wonIds) {
    state.wonIds = Array.isArray(wonIds) ? [...wonIds] : [];
  }

  return {
    state,
    races: RACE_DEFINITIONS,
    startRace,
    cancelRace,
    findNearbyRaceStart,
    update,
    getHudData,
    exportState,
    importState,
  };
}
