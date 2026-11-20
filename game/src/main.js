// Solana Bay v3 — Main Entrypoint, Renderer, Input & State Machine
import * as THREE from 'three';
import { LANDMARKS, getDistrictAt } from './config.js';
import { createTexturePack } from './textures.js';
import { buildCityWorld } from './city.js';
import { createDayNightSystem } from './daynight.js';
import { createPlayerSystem } from './player.js';
import { createVehicleSystem } from './vehicles.js';
import { createPedestrianSystem } from './pedestrians.js';
import { createWeaponSystem } from './weapons.js';
import { createCombatSystem } from './combat.js';
import { createPoliceSystem } from './police.js';
import { createDispatchSystem } from './dispatch.js';
import { createMissionSystem } from './missions.js';
import { createCrewSystem } from './crew.js';
import { createRaceSystem } from './races.js';
import { createReputationSystem } from './reputation.js';
import { createCollectibleSystem } from './collectibles.js';
import { createRadioSystem } from './radio.js';
import { createAudioSystem } from './audio.js';
import { createEffectsSystem } from './effects.js';
import { createHudSystem } from './hud.js';
import { createSaveSystem } from './save.js';
import { createStatsMenuSystem } from './statsmenu.js';
import { createTitleScreenSystem } from './title.js';

const params = new URLSearchParams(window.location.search);
const shotParam = (params.get('shot') || '').toLowerCase();
const seedParam = Math.max(1, parseInt(params.get('seed') || '1', 10) || 1);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.3, 950);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Game state machine: 'title' | 'play' | 'pause' | 'dialogue' | 'wasted' | 'busted' | 'victory'
const gameState = {
  mode: 'title',
  shotMode: shotParam || null,
  frozen: false,
  cameraOverride: null,
  waypoint: null,
  titleOrbitAngle: 0.4,
  careerStats: {
    carsStolen: 0,
    copsEscaped: 0,
    distanceDriven: 0,
    peopleTakenOut: 0,
    longestJump: 0,
  },
};

const input = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  jump: false,
  handbrake: false,
  aim: false,
  fire: false,
  lookDX: 0,
  lookDY: 0,
};

let onKeyPressAction = null;

function bindInputHandlers() {
  window.addEventListener('keydown', (e) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') input.forward = true;
    if (code === 'KeyS' || code === 'ArrowDown') input.backward = true;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = true;
    if (code === 'KeyD' || code === 'ArrowRight') input.right = true;
    if (code === 'ShiftLeft' || code === 'ShiftRight') input.sprint = true;
    if (code === 'Space') {
      input.jump = true;
      input.handbrake = true;
    }
    if (!e.repeat && onKeyPressAction) onKeyPressAction(code);
  });

  window.addEventListener('keyup', (e) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') input.forward = false;
    if (code === 'KeyS' || code === 'ArrowDown') input.backward = false;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = false;
    if (code === 'KeyD' || code === 'ArrowRight') input.right = false;
    if (code === 'ShiftLeft' || code === 'ShiftRight') input.sprint = false;
    if (code === 'Space') {
      input.jump = false;
      input.handbrake = false;
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    if (gameState.mode !== 'play') return;
    if (document.pointerLockElement !== canvas && !gameState.shotMode) {
      canvas.requestPointerLock?.();
    }
    if (e.button === 0) input.fire = true;
    if (e.button === 2) input.aim = true;
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.fire = false;
    if (e.button === 2) input.aim = false;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('mousemove', (e) => {
    if (gameState.mode !== 'play') return;
    if (document.pointerLockElement === canvas || input.aim) {
      input.lookDX += e.movementX || 0;
      input.lookDY += e.movementY || 0;
    }
  });

  window.addEventListener('wheel', (e) => {
    if (gameState.mode === 'play' && onKeyPressAction) {
      onKeyPressAction(e.deltaY > 0 ? 'WHEEL_NEXT' : 'WHEEL_PREV');
    }
  }, { passive: true });
}

bindInputHandlers();

let stepGameFrame = () => {};
let lastFrameTime = performance.now();

function animationLoop(now) {
  requestAnimationFrame(animationLoop);
  const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
  lastFrameTime = now;
  stepGameFrame(dt);
  input.lookDX = 0;
  input.lookDY = 0;
  renderer.render(scene, camera);
}

// Instantiate every Solana Bay system
const textures = createTexturePack();
const city = buildCityWorld(scene, textures, seedParam);
const dayNight = createDayNightSystem(scene, city);
const player = createPlayerSystem(scene, city);
const vehicles = createVehicleSystem(scene, city, seedParam);
const pedestrians = createPedestrianSystem(scene, city, seedParam);
const weapons = createWeaponSystem();
const combat = createCombatSystem(scene, city);
const police = createPoliceSystem(scene, city, vehicles);
const dispatch = createDispatchSystem();
const missions = createMissionSystem(scene);
const crew = createCrewSystem();
const races = createRaceSystem(scene, vehicles);
const reputation = createReputationSystem();
const collectibles = createCollectibleSystem(scene);
const radio = createRadioSystem();
const audio = createAudioSystem();
const effects = createEffectsSystem(scene);
const hud = createHudSystem();
const save = createSaveSystem();

const garagePos = LANDMARKS.find((l) => l.id === 'respray_garage');
const armoryPos = LANDMARKS.find((l) => l.id === 'armory_shop');
const allSystems = { player, dayNight, missions, crew, races, reputation, collectibles, careerStats: gameState.careerStats };

function buildMissionContext() {
  return {
    player,
    combat,
    vehicles,
    police,
    dispatch,
    reputation,
    crew,
    weapons,
    audio,
    onToast: (msg) => hud.pushToast(msg),
    onAutosave: () => save.autosave(allSystems),
    onCampaignComplete: () => {
      gameState.mode = 'victory';
      hud.showOverlay('victory', 'SOLANA BAY CONQUERED', 'All 6 story missions complete — continue free roam!', 'FREE ROAM');
    },
  };
}

function buildPauseSnapshot(overrideSlots = null, overridePct = null) {
  const mProg = missions.exportProgress();
  return {
    missionsCompleted: mProg.completedIds.length,
    completedMissionIds: mProg.completedIds,
    activeMissionId: mProg.activeMissionId,
    missionRatings: mProg.ratings,
    racesWon: races.state.wonIds.length,
    collectiblesFound: collectibles.getCollectedCount(),
    crewRecruited: crew.members.filter((m) => m.recruited).length,
    districtsFriendly: reputation.getFriendlyCount(),
    overrideCompletionPct: overridePct,
    careerStats: { ...gameState.careerStats },
    rank: reputation.getRankHud(),
    districts: reputation.getAllDistrictStandings(),
    crew: crew.getHudData(),
    playerPos: { x: player.state.x, z: player.state.z },
    waypoint: gameState.waypoint,
    saveSlots: overrideSlots || save.readAllSlots(),
    sfxMuted: audio.state.muted,
    radioMuted: radio.state.muted,
  };
}

function applyLoadedSave(data) {
  if (!data) return;
  player.setPosition(data.playerPos?.x ?? 0, data.playerPos?.z ?? 162, data.playerPos?.yaw ?? Math.PI);
  player.state.health = data.health ?? 100;
  player.state.armor = data.armor ?? 60;
  player.state.cash = data.cash ?? 1250;
  dayNight.setTime(typeof data.hours === 'number' ? data.hours : 13.0);
  reputation.importState(data.reputation);
  crew.importState(data.crew);
  races.importState(data.races);
  collectibles.importState(data.collectibles);
  if (data.careerStats) Object.assign(gameState.careerStats, data.careerStats);
  missions.importProgress(data.missions, buildMissionContext());
  police.clearWanted(false);
  dispatch.clearLogs();
}

function startFreshCareer(slotIdx = 0) {
  save.setActiveSlotIndex(slotIdx);
  if (player.state.vehicle) player.exitVehicle();
  player.healFull(true);
  player.state.cash = 1250;
  player.setPosition(0, 164, Math.PI);
  dayNight.setTime(13.2);
  police.clearWanted(false);
  dispatch.clearLogs();
  races.cancelRace();
  crew.importState(['nori']);
  collectibles.importState([]);
  reputation.importState({ rp: 420 });
  missions.startMission(1, buildMissionContext());
  enterPlayMode();
  save.saveToSlot(slotIdx, allSystems);
}

function enterPlayMode() {
  gameState.mode = 'play';
  titleScreen.hide();
  statsMenu.close();
  hud.hideOverlay();
  hud.setVisible(true);
  audio.unlock();
}

const statsMenu = createStatsMenuSystem({
  onResume: () => enterPlayMode(),
  onReturnTitle: () => {
    statsMenu.close();
    hud.setVisible(false);
    gameState.mode = 'title';
    titleScreen.show(save.readAllSlots());
  },
  onSaveSlot: (idx) => {
    save.saveToSlot(idx, allSystems);
    hud.pushToast(`Career saved to Slot 0${idx + 1}`);
  },
  onLoadSlot: (idx) => {
    const slot = save.loadSlot(idx);
    if (slot) {
      applyLoadedSave(slot);
      enterPlayMode();
      hud.pushToast(`Loaded Slot 0${idx + 1}`);
    }
  },
  getFreshSnapshot: () => buildPauseSnapshot(),
  onSetWaypoint: (wp) => {
    gameState.waypoint = wp;
    hud.pushToast(`Waypoint set (${wp.x}, ${wp.z})`);
  },
  onToggleSfx: () => audio.setMuted(!audio.state.muted),
  onToggleRadio: () => radio.setMuted(!radio.state.muted),
});

const titleScreen = createTitleScreenSystem({
  onContinue: () => {
    const latest = save.getLatestSlotIndex();
    if (latest >= 0) {
      applyLoadedSave(save.loadSlot(latest));
      enterPlayMode();
    } else {
      startFreshCareer(0);
    }
  },
  onNewGame: () => startFreshCareer(0),
  onNewGameInSlot: (idx) => startFreshCareer(idx),
  onLoadSlot: (idx) => {
    applyLoadedSave(save.loadSlot(idx));
    enterPlayMode();
  },
  onOpenSettings: () => {
    titleScreen.hide();
    gameState.mode = 'pause';
    statsMenu.open(buildPauseSnapshot(), 'SETTINGS');
  },
});

const overlayBtn = document.getElementById('overlay-btn');
if (overlayBtn) {
  overlayBtn.addEventListener('click', () => {
    if (gameState.mode === 'wasted' || gameState.mode === 'busted') {
      if (player.state.vehicle) player.exitVehicle();
      player.healFull(true);
      player.addCash(-250);
      player.setPosition(-120, 58, 0);
      police.clearWanted(false);
      dispatch.clearLogs();
      enterPlayMode();
      hud.pushToast('Back on the street — ₮250 hospital/bail fee');
    } else if (gameState.mode === 'victory') {
      enterPlayMode();
    }
  });
}

function getNearbyInteractionPrompt() {
  const px = player.state.x;
  const pz = player.state.z;
  if (garagePos && Math.hypot(px - garagePos.x, pz - garagePos.z) < 11) {
    return '[E] Nori Custom Respray — Repair, Repaint & Clear Heat (₮250)';
  }
  if (armoryPos && Math.hypot(px - armoryPos.x, pz - armoryPos.z) < 11) {
    return '[E] Coral Dock Armory — Unlock Weapons, Max Ammo & Armor (₮400)';
  }
  const nearRace = races.findNearbyRaceStart(px, pz, 11);
  if (nearRace) return `[E] Start Street Race: ${nearRace.name} (Prize ₮${nearRace.rewardCash})`;
  if (!player.state.vehicle) {
    const nearCar = vehicles.findNearestVehicle(px, pz, 5.2);
    if (nearCar) return `[F] Enter / Steal ${nearCar.name}`;
  }
  return '';
}

function handleInteractAction() {
  const px = player.state.x;
  const pz = player.state.z;
  if (garagePos && Math.hypot(px - garagePos.x, pz - garagePos.z) < 11) {
    if (player.state.cash >= 250) {
      player.addCash(-250);
      if (player.state.vehicle) {
        const colors = [0xff3b4e, 0x00d2ff, 0xfbbf24, 0x34d399, 0xa855f7];
        vehicles.repairVehicle(player.state.vehicle, colors[Math.floor(Math.random() * colors.length)]);
      }
      police.clearWanted(true);
      dispatch.clearLogs();
      audio.playChime('ability');
      hud.pushToast('Nori Respray: Chassis repaired, new paint & SBPD heat cleared!');
    } else hud.pushToast('Need ₮250 for Nori Custom Respray');
    return;
  }
  if (armoryPos && Math.hypot(px - armoryPos.x, pz - armoryPos.z) < 11) {
    if (player.state.cash >= 400) {
      player.addCash(-400);
      weapons.refillAllAmmo();
      player.state.armor = player.state.maxArmor;
      audio.playChime('collect');
      hud.pushToast('Coral Armory: All 5 weapons unlocked, ammo & armor maxed!');
    } else hud.pushToast('Need ₮400 for Coral Dock Armory restock');
    return;
  }
  const nearRace = races.findNearbyRaceStart(px, pz, 11);
  if (nearRace) {
    races.startRace(nearRace.id, player, (m) => hud.pushToast(m));
    audio.playChime('stage');
  }
}

onKeyPressAction = (code) => {
  if (code === 'Escape' || code === 'KeyP') {
    if (gameState.mode === 'play') {
      gameState.mode = 'pause';
      document.exitPointerLock?.();
      statsMenu.open(buildPauseSnapshot(), 'STATS');
    } else if (gameState.mode === 'pause') {
      enterPlayMode();
    }
    return;
  }
  if (gameState.mode !== 'play') return;

  audio.unlock();
  if (code === 'Digit1') weapons.selectSlot(1);
  else if (code === 'Digit2') weapons.selectSlot(2);
  else if (code === 'Digit3') weapons.selectSlot(3);
  else if (code === 'Digit4') weapons.selectSlot(4);
  else if (code === 'Digit5') weapons.selectSlot(5);
  else if (code === 'WHEEL_NEXT') weapons.cycleSlot(1);
  else if (code === 'WHEEL_PREV') weapons.cycleSlot(-1);
  else if (code === 'KeyR') weapons.startReload();
  else if (code === 'KeyQ' && player.state.vehicle) {
    const info = radio.nextStation(player.state.vehicle);
    hud.pushToast(`Radio: ${info.code} — ${info.name}`);
  } else if (code === 'KeyH' && player.state.vehicle) audio.playHorn();
  else if (code === 'KeyZ' || code === 'KeyX' || code === 'KeyC') {
    crew.triggerAbilityByKey(code.slice(-1), { player, vehicles, police, dispatch, missions, audio, onToast: (m) => hud.pushToast(m) });
  } else if (code === 'KeyE') handleInteractAction();
  else if (code === 'KeyF') {
    if (player.state.vehicle) {
      player.exitVehicle();
      radio.setDrivingState(false);
    } else {
      const car = vehicles.findNearestVehicle(player.state.x, player.state.z, 5.2);
      if (car) {
        const wasTraffic = car.driver === 'ai';
        player.enterVehicle(car);
        radio.setDrivingState(true, car.radioStationIndex);
        if (wasTraffic) {
          gameState.careerStats.carsStolen += 1;
          const dist = getDistrictAt(car.x, car.z);
          police.addHeat(16, dist.name);
          dispatch.recordCrime('carjack', dist.name);
          reputation.recordAction('carjack', car.x, car.z);
          hud.pushToast(`Boosted ${car.name} — SBPD alerted!`);
        }
      }
    }
  }
};

function updateHudFrame(dt, customDispatch = null) {
  const distHud = reputation.getDistrictHud(player.state.x, player.state.z);
  const dlg = missions.state.activeDialogue;
  hud.update(dt, {
    player: player.state,
    district: distHud,
    clock: dayNight.getClockString(),
    rank: reputation.getRankHud(),
    wantedStars: police.state.stars,
    mission: missions.getHudData(player.state),
    dispatch: customDispatch || dispatch.getDispatchSnapshot(police, player.state),
    weapons: weapons.getHudData(),
    crew: crew.getHudData(),
    radio: radio.getCurrentInfo(),
    race: races.getHudData(),
    dialogue: dlg,
    dialoguePortrait: dlg ? crew.getPortrait(dlg.crewId) : null,
    interactPrompt: gameState.mode === 'play' ? getNearbyInteractionPrompt() : '',
    police,
    hostiles: combat.hostiles,
    radarReveal: crew.isRadarRevealActive(),
    waypoint: gameState.waypoint,
  });
}

stepGameFrame = (dt) => {
  if (gameState.frozen) {
    if (gameState.cameraOverride) player.updateCamera(camera, dt, gameState.cameraOverride);
    return;
  }
  if (gameState.mode === 'title') {
    gameState.titleOrbitAngle += dt * 0.08;
    const ox = Math.cos(gameState.titleOrbitAngle) * 105;
    const oz = 155 + Math.sin(gameState.titleOrbitAngle) * 55;
    dayNight.applyLighting(0, 120);
    camera.position.set(ox, 34, oz);
    camera.lookAt(0, 12, 80);
    return;
  }
  if (gameState.mode !== 'play') return;

  dayNight.update(dt, player.state.x, player.state.z);
  weapons.update(dt);
  crew.update(dt);
  player.update(dt, input, weapons.getActiveWeapon());

  if (input.fire) {
    combat.firePlayerWeapon({
      player,
      weapons,
      vehicles,
      pedestrians,
      police,
      effects,
      audio,
      callbacks: {
        onShotsFired: (x, z) => {
          const d = getDistrictAt(x, z);
          police.addHeat(8, d.name);
          dispatch.recordCrime('shots', d.name);
        },
        onHostileKilled: (h) => {
          reputation.recordAction('hostile_kill', h.x, h.z);
          missions.recordMissionHostileKill(h, buildMissionContext());
        },
        onOfficerKilled: (o) => {
          const d = getDistrictAt(o.x, o.z);
          police.addHeat(48, d.name);
          dispatch.recordCrime('officer_down', d.name);
        },
        onPedKilled: (p) => {
          const d = getDistrictAt(p.x, p.z);
          police.addHeat(24, d.name);
          reputation.recordAction('ped_harm', p.x, p.z);
        },
        onTakedown: () => {
          gameState.careerStats.peopleTakenOut += 1;
        },
      },
    });
  }

  vehicles.update(dt, input, player.state, effects, audio, {
    onDistanceDriven: (m) => {
      gameState.careerStats.distanceDriven += m;
    },
    onVehicleCrash: (other) => {
      if (other.role === 'police') {
        const d = getDistrictAt(player.state.x, player.state.z);
        police.addHeat(25, d.name);
        dispatch.recordCrime('ram', d.name);
      }
    },
    onExplode: (v) => {
      if (v === player.state.vehicle) player.applyDamage(120);
    },
  });

  pedestrians.update(
    dt,
    player.state,
    vehicles.vehicles,
    (amt) => {
      player.addCash(amt);
      audio.playChime('collect');
      hud.pushToast(`Picked up ₮${amt}`);
    },
    (ped, killed) => {
      if (killed) {
        gameState.careerStats.peopleTakenOut += 1;
        police.addHeat(22, getDistrictAt(ped.x, ped.z).name);
        reputation.recordAction('ped_harm', ped.x, ped.z);
      }
    }
  );

  combat.update(dt, player, effects, audio);
  police.update(dt, player, effects, audio, {
    onEvaded: () => {
      gameState.careerStats.copsEscaped += 1;
      dispatch.recordCrime('evaded', '');
      reputation.recordAction('police_evade', player.state.x, player.state.z);
      hud.pushToast('EVADED SBPD — +95 RP');
    },
    onBusted: () => {
      gameState.mode = 'busted';
      document.exitPointerLock?.();
      hud.showOverlay('busted', 'BUSTED', 'SBPD took you into custody on Solana Bay.', 'POST BAIL (₮250)');
    },
  });

  races.update(dt, player, effects, audio, {
    onRaceFinished: ({ race, position, won, prize, rp }) => {
      reputation.addRp(rp);
      if (won) reputation.recordAction('race_win', player.state.x, player.state.z);
      audio.playChime('mission');
      hud.pushToast(`RACE FINISHED #${position}: ${race.name} (+₮${prize}, +${rp} RP)`);
      save.autosave(allSystems);
    },
  });

  missions.update(dt, buildMissionContext());
  collectibles.update(dt, player, reputation, audio, (m) => hud.pushToast(m));
  effects.update(dt);
  audio.update(dt, player.state, police.state.stars);

  if (!player.state.alive && gameState.mode === 'play') {
    gameState.mode = 'wasted';
    document.exitPointerLock?.();
    hud.showOverlay('wasted', 'WASTED', 'You went down in Solana Bay.', 'RESPAWN (₮250)');
  }

  player.updateCamera(camera, dt);
  updateHudFrame(dt);
};

// Populate world traffic and pedestrians deterministically
vehicles.populateInitialTraffic(22);
pedestrians.populatePedestrians(36);

function setupShotCover() {
  dayNight.setTime(13.25);
  dayNight.state.paused = true;
  dayNight.applyLighting(18, 180);

  crew.recruitAll();
  weapons.unlockAllWeapons();
  weapons.selectSlot(3);
  reputation.setRp(2150);
  reputation.changeStanding('miramar_coast', 16);

  const heroCar = vehicles.spawnVehicle({
    classId: 'sports',
    x: 24,
    z: 180,
    yaw: -Math.PI * 0.5,
    color: 0xff3b4e,
    role: 'player',
    stationIndex: 0,
  });
  heroCar.speed = 31;
  heroCar.hp = 96;
  player.enterVehicle(heroCar);
  player.state.health = 88;
  player.state.armor = 74;
  player.state.cash = 18450;
  radio.setStation(0, heroCar);

  // Three pursuing SBPD cruisers + overhead helicopter
  police.setWantedStars(4, 'chase', 'Miramar Coast');
  police.spawnCruiserNear(24, 180, 0, { x: 40, z: 178.5, yaw: -Math.PI * 0.52, callsign: 'UNIT-12', role: 'RAMMING' });
  police.spawnCruiserNear(24, 180, 1, { x: 46, z: 183.2, yaw: -Math.PI * 0.46, callsign: 'UNIT-04', role: 'FLANKING' });
  police.spawnCruiserNear(24, 180, 2, { x: 56, z: 179.4, yaw: -Math.PI * 0.5, callsign: 'UNIT-09', role: 'INTERCEPT' });
  police.spawnHelicopter(8, 22, 168);

  // Extra visible traffic & boardwalk pedestrians right in frame
  vehicles.spawnVehicle({ classId: 'muscle', x: -12, z: 175.5, yaw: Math.PI * 0.5, color: 0xfbbf24, role: 'traffic' });
  vehicles.spawnVehicle({ classId: 'compact', x: 10, z: 184.2, yaw: -Math.PI * 0.5, color: 0x22d3ee, role: 'traffic' });
  pedestrians.spawnPed({ x: 8, z: 193.5, zone: 'boardwalk', yaw: 0.4 });
  pedestrians.spawnPed({ x: 26, z: 194.2, zone: 'boardwalk', yaw: -0.7 });
  pedestrians.spawnPed({ x: -4, z: 195.0, zone: 'boardwalk', yaw: 1.1 });

  dispatch.clearLogs();
  dispatch.pushLog('AIR-ONE on station over Miramar Coast', 'air');
  dispatch.pushLog('10-50 High-speed sports coupe westbound Miramar Blvd', 'alert');
  dispatch.pushLog('UNIT-12 closing for PIT ramming maneuver', 'normal');
  dispatch.setSyntheticUnits([
    { callsign: 'TAC-07', role: 'MARKSMAN', distance: 64, kind: 'officer' },
    { callsign: 'FOOT-03', role: 'FOOT CHASE', distance: 82, kind: 'officer' },
  ]);

  missions.setExactStage(6, 3, buildMissionContext());
  missions.showDialogue('Talia Reyes', 'talia', 'Four-star heat — cruisers flanking and AIR-ONE overhead! Push west to the Marina Pier!', 99);

  // Tire smoke & sparks trailing the chase
  effects.spawnTireSmoke(28, 0.28, 180.4);
  effects.spawnTireSmoke(30, 0.35, 179.6);
  effects.spawnSparks(38, 0.7, 179.2, 8);

  titleScreen.hide();
  statsMenu.close();
  hud.setVisible(true);
  gameState.mode = 'play';
  gameState.frozen = true;
  gameState.cameraOverride = { px: 49, py: 9.2, pz: 194.5, tx: 14, ty: 3.4, tz: 179 };
  player.updateCamera(camera, 0.016, gameState.cameraOverride);
  updateHudFrame(0.016);
}

function setupShotNight() {
  dayNight.setTime(19.55);
  dayNight.state.paused = true;
  dayNight.applyLighting(90, 30);

  crew.recruitAll();
  weapons.unlockAllWeapons();
  weapons.selectSlot(2);
  const w2 = weapons.getActiveWeapon();
  w2.mag = 11;
  w2.reserve = 96;

  reputation.setRp(1420);
  reputation.changeStanding('pasar_senja', 12);

  player.setPosition(90, 39.5, Math.PI);
  player.state.health = 78;
  player.state.armor = 52;
  player.state.cash = 7280;
  player.state.aiming = true;
  player.rig.rightArm.rotation.x = -1.45;
  player.rig.root.position.set(90, 0.24, 39.5);
  player.rig.root.rotation.y = Math.PI;

  // Active & downed Red Tide gang enemies in Pasar Senja market
  combat.clearMissionHostiles();
  combat.spawnHostile({ x: 88.5, z: 26.5, yaw: 0.1, downed: true, missionTag: 'mission' });
  combat.spawnHostile({ x: 94.2, z: 24.5, yaw: -0.3, hp: 45, missionTag: 'mission' });
  combat.spawnHostile({ x: 84.5, z: 22.0, yaw: 0.35, hp: 65, missionTag: 'mission' });

  // Visible muzzle flash + tracer across the lantern-lit aisle
  effects.spawnMuzzleFlash(89.8, 1.55, 38.4, 2.2, 99);
  effects.spawnTracer(89.8, 1.55, 38.4, 94.1, 1.38, 24.6, 0xffe066, 99);
  effects.spawnSparks(94.1, 1.38, 24.6, 10, 0xff4d6d);

  police.setWantedStars(2, 'shots', 'Pasar Senja');
  police.spawnCruiserNear(90, 30, 0, { x: 64, z: 58, yaw: 0.65, callsign: 'UNIT-04', role: 'FLANKING' });
  police.spawnOfficer({ x: 78, z: 48, yaw: 0.55, callsign: 'FOOT-01', role: 'FOOT CHASE' });

  dispatch.clearLogs();
  dispatch.pushLog('10-71 Shots fired in Pasar Senja Lantern Market', 'alert');
  dispatch.pushLog('FOOT-01 entering market archway on foot', 'normal');

  missions.setExactStage(2, 2, buildMissionContext());
  missions.state.stageKills = 1;
  missions.state.stageTargetKills = 4;
  missions.showDialogue('Devon Brooks', 'devon', 'Keep low between the stalls! Two more Red Tide enforcers under the lanterns!', 99);

  titleScreen.hide();
  statsMenu.close();
  hud.setVisible(true);
  gameState.mode = 'play';
  gameState.frozen = true;
  gameState.cameraOverride = { px: 93.8, py: 3.3, pz: 46.2, tx: 89.5, ty: 2.3, tz: 26.5 };
  player.updateCamera(camera, 0.016, gameState.cameraOverride);
  updateHudFrame(0.016);
}

function setupShotStats() {
  dayNight.setTime(16.8);
  dayNight.state.paused = true;
  dayNight.applyLighting(0, 120);

  crew.recruitAll();
  reputation.setRp(2450);
  reputation.importState({
    rp: 2450,
    standings: {
      miramar_coast: 84,
      pasar_senja: 78,
      solana_core: 68,
      puerto_bravo: 54,
      altura_heights: 32,
    },
  });
  missions.importProgress(
    {
      activeMissionId: 6,
      stageIndex: 2,
      completedIds: [1, 2, 3, 4, 5],
      ratings: { 1: 'G', 2: 'G', 3: 'S', 4: 'G', 5: 'S' },
      freeRoam: false,
    },
    buildMissionContext()
  );
  races.importState(['miramar_sprint']);
  collectibles.setCollectedCount(12);
  player.setPosition(18, 165, Math.PI);
  player.state.cash = 18450;
  Object.assign(gameState.careerStats, {
    carsStolen: 29,
    copsEscaped: 14,
    distanceDriven: 48600,
    peopleTakenOut: 67,
    longestJump: 38.4,
  });

  titleScreen.hide();
  hud.setVisible(false);
  gameState.mode = 'pause';
  gameState.frozen = true;
  gameState.cameraOverride = { px: 55, py: 28, pz: 205, tx: 0, ty: 10, tz: 110 };
  player.updateCamera(camera, 0.016, gameState.cameraOverride);
  statsMenu.open(buildPauseSnapshot(save.getShowcaseSlots(), 66), 'STATS');
}

function setupShotTitle() {
  dayNight.setTime(17.75);
  dayNight.state.paused = true;
  dayNight.applyLighting(0, 130);

  hud.setVisible(false);
  statsMenu.close();
  gameState.mode = 'title';
  gameState.frozen = true;
  gameState.cameraOverride = { px: 82, py: 32, pz: 224, tx: -12, ty: 12, tz: 85 };
  player.updateCamera(camera, 0.016, gameState.cameraOverride);
  titleScreen.show(save.getShowcaseSlots());
}

// Boot into requested shot mode or live sunset title screen
if (shotParam === 'cover') setupShotCover();
else if (shotParam === 'night') setupShotNight();
else if (shotParam === 'stats') setupShotStats();
else if (shotParam === 'title') setupShotTitle();
else {
  dayNight.setTime(17.75);
  hud.setVisible(false);
  const existing = save.readAllSlots();
  titleScreen.show(existing.some(Boolean) ? existing : save.getShowcaseSlots());
}

renderer.render(scene, camera);
requestAnimationFrame(animationLoop);
