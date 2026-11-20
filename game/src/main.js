// Solana Bay — main renderer, game loop, input/pointer lock, service bays, and deterministic ?shot= views.

import * as THREE from 'three';
import { LANDMARKS, clamp, dist2D } from './config.js';
import { buildCity } from './city.js';
import { createPlayer } from './player.js';
import { createVehicleManager } from './vehicles.js';
import { createPedestrianManager } from './pedestrians.js';
import { createPoliceSystem } from './police.js';
import { createCombatSystem } from './combat.js';
import { createMissionManager } from './missions.js';
import { createEffectsSystem } from './effects.js';
import { createAudioSystem } from './audio.js';
import { createHud } from './hud.js';
import { hasSavedCareer, saveCareer, loadCareer, applyCareerSave, clearCareer } from './save.js';

const params = new URLSearchParams(window.location.search);
const SHOT_MODE = params.get('shot'); // 'start' | 'play' | 'end' | null
const SEED = Number(params.get('seed')) || 1;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 720);

const city = buildCity(scene, SEED);
const player = createPlayer(scene);
const vehicles = createVehicleManager(scene, SEED);
const peds = createPedestrianManager(scene, SEED);
const police = createPoliceSystem(scene, vehicles);
const combat = createCombatSystem(scene);
const effects = createEffectsSystem(scene);
const audio = createAudioSystem();
const hud = createHud();
const missions = createMissionManager(scene, combat, vehicles, police, audio);

vehicles.spawnInitialTraffic(20);
peds.spawnInitial(36);
effects.spawnStarterPickups();

const gameState = {
  mode: 'title', // 'title' | 'playing' | 'paused' | 'overlay'
  elapsed: 0,
  autosaveTimer: 0,
  pointerLocked: false,
  draggingLook: false,
  lastMouseX: 0,
  lastMouseY: 0,
};

const input = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  jump: false,
  fire: false,
  aim: false,
};

const missionCallbacks = {
  onDialogue: (speaker, text, dur) => hud.showDialogue(speaker, text, dur),
  onToast: (msg, tone) => hud.showToast(msg, tone),
  onMissionComplete: (mission, allDone) => {
    hud.showToast(`MISSION COMPLETE: ${mission.title} (+$${mission.reward})`, 'success');
    saveCareer(player, missions);
    if (allDone) {
      openOverlay({
        kicker: 'SOLANA BAY CAMPAIGN COMPLETE',
        title: 'COAST RECLAIMED',
        desc: 'Victor Crane is out of Solana Bay and the harbor belongs to you. Free roam is unlocked — keep driving, fighting, and building your empire.',
        tone: 'victory',
        primaryLabel: 'ENTER FREE ROAM',
        showSecondary: true,
        onPrimary: () => resumePlay(),
      });
    }
  },
};

function openOverlay(opts) {
  gameState.mode = 'overlay';
  if (document.pointerLockElement) document.exitPointerLock();
  const s = player.state.stats;
  const stats = opts.stats || [
    ['CASH', `$${Math.floor(player.state.cash)}`],
    ['MISSIONS', `${s.missionsDone} / 6`],
    ['CARS STOLEN', `${s.carsStolen}`],
    ['TAKEDOWNS', `${s.takedowns}`],
  ];
  hud.showOverlay({ ...opts, stats });
}

function handleWastedOrBusted(kind) {
  if (gameState.mode === 'overlay') return;
  const fine = Math.min(Math.floor(player.state.cash * 0.25), 250);
  player.state.cash = Math.max(0, player.state.cash - fine);
  if (player.state.vehicle) {
    player.state.vehicle.driver = 'none';
    player.state.vehicle = null;
  }
  police.clearWanted();
  openOverlay({
    kicker: kind === 'busted' ? 'SBPD ARREST' : 'CRITICAL TRAUMA',
    title: kind === 'busted' ? 'BUSTED' : 'WASTED',
    desc:
      kind === 'busted'
        ? `SBPD booked you at Central Precinct and seized $${fine}.`
        : `Solana General patched you up for $${fine}. Back to the street.`,
    tone: 'danger',
    primaryLabel: 'RESPAWN',
    showSecondary: true,
    onPrimary: () => {
      player.respawnAt(96, -48);
      saveCareer(player, missions);
      resumePlay();
    },
  });
}

function startNewGame() {
  audio.unlock();
  audio.playUiClick();
  clearCareer();
  player.respawnAt(96, -48);
  player.state.cash = 650;
  player.state.armor = 45;
  player.state.stats = { carsStolen: 0, takedowns: 0, distanceDriven: 0, missionsDone: 0 };
  player.refillAllAmmo();
  player.switchWeapon(1);
  police.clearWanted();
  missions.startMission(0, missionCallbacks);
  hud.setTitleVisible(false);
  hud.setPauseVisible(false);
  hud.hideOverlay();
  hud.setHudVisible(true);
  gameState.mode = 'playing';
  hud.setStatus('Playing Solana Bay');
  saveCareer(player, missions);
}

function continueSavedGame() {
  audio.unlock();
  audio.playUiClick();
  const data = loadCareer();
  if (!data) {
    startNewGame();
    return;
  }
  police.clearWanted();
  applyCareerSave(data, player, missions, missionCallbacks);
  hud.setTitleVisible(false);
  hud.setPauseVisible(false);
  hud.hideOverlay();
  hud.setHudVisible(true);
  gameState.mode = 'playing';
  hud.showToast('Career loaded', 'success');
}

function resumePlay() {
  audio.unlock();
  hud.setPauseVisible(false);
  hud.hideOverlay();
  hud.setTitleVisible(false);
  hud.setHudVisible(true);
  gameState.mode = 'playing';
}

function openPauseMenu() {
  if (gameState.mode !== 'playing') return;
  gameState.mode = 'paused';
  if (document.pointerLockElement) document.exitPointerLock();
  hud.setPauseVisible(true, player, missions);
}

function getActiveInteractPrompt() {
  const ps = player.state;
  if (ps.dead || ps.busted) return '';

  // Respray bay check
  const dSpray = dist2D(ps.x, ps.z, LANDMARKS.resprayGarage.x, LANDMARKS.resprayGarage.z);
  if (dSpray <= LANDMARKS.resprayGarage.radius) {
    return ps.vehicle
      ? `[F/E] Palma Spray — Repair, Respray & Clear Wanted ($${LANDMARKS.resprayGarage.cost})`
      : 'Drive a vehicle into Palma Spray to respray & clear wanted';
  }

  // Armory check
  const dArmory = dist2D(ps.x, ps.z, LANDMARKS.armory.x, LANDMARKS.armory.z);
  if (dArmory <= LANDMARKS.armory.radius) {
    return `[F/E] Ironworks Armory — Full Ammo & Body Armor ($${LANDMARKS.armory.cost})`;
  }

  if (ps.vehicle) {
    return '';
  }

  const nearCar = vehicles.findNearestStealable(ps.x, ps.z, 5.4);
  if (nearCar) {
    return `[F/E] ${nearCar.driver === 'traffic' ? 'Steal' : 'Enter'} ${nearCar.spec.name}`;
  }
  return '';
}

function handleInteract() {
  if (gameState.mode !== 'playing') return;
  const ps = player.state;
  if (ps.dead || ps.busted) return;

  // Service bay: Respray Garage
  if (dist2D(ps.x, ps.z, LANDMARKS.resprayGarage.x, LANDMARKS.resprayGarage.z) <= LANDMARKS.resprayGarage.radius) {
    if (!ps.vehicle) {
      hud.showToast('Bring a car into the bay to respray', 'warn');
      return;
    }
    const cost = LANDMARKS.resprayGarage.cost;
    if (ps.cash < cost) {
      hud.showToast(`Need $${cost} for Palma Spray`, 'warn');
      return;
    }
    ps.cash -= cost;
    vehicles.resprayVehicle(ps.vehicle);
    police.clearWanted();
    audio.playMissionChime(false);
    hud.showToast('Vehicle repaired, resprayed & wanted cleared!', 'success');
    saveCareer(player, missions);
    return;
  }

  // Service bay: Ironworks Armory
  if (dist2D(ps.x, ps.z, LANDMARKS.armory.x, LANDMARKS.armory.z) <= LANDMARKS.armory.radius) {
    const cost = LANDMARKS.armory.cost;
    if (ps.cash < cost) {
      hud.showToast(`Need $${cost} for Armory refill`, 'warn');
      return;
    }
    ps.cash -= cost;
    ps.armor = ps.maxArmor;
    ps.hp = ps.maxHp;
    player.refillAllAmmo();
    audio.playPickup();
    hud.showToast('Full ammo, armor & health restocked!', 'success');
    saveCareer(player, missions);
    return;
  }

  // Exit current vehicle
  if (ps.vehicle) {
    const v = ps.vehicle;
    v.driver = 'none';
    ps.vehicle = null;
    const exitX = v.x - Math.cos(v.yaw) * (v.spec.width * 0.78 + 0.75);
    const exitZ = v.z + Math.sin(v.yaw) * (v.spec.width * 0.78 + 0.75);
    const col = city.resolveCircleCollision(exitX, exitZ, ps.radius);
    ps.x = col.x;
    ps.z = col.z;
    ps.y = city.getGroundHeight(ps.x, ps.z);
    player.rig.root.visible = true;
    audio.playUiClick();
    return;
  }

  // Enter / steal nearest vehicle
  const car = vehicles.findNearestStealable(ps.x, ps.z, 5.4);
  if (car) {
    const wasOccupied = car.driver === 'traffic' || car.driver === 'police';
    car.driver = 'player';
    ps.vehicle = car;
    ps.camYaw = car.yaw;
    ps.stats.carsStolen += 1;
    audio.playUiClick();
    hud.showToast(`Driving ${car.spec.name}`);
    if (wasOccupied || car.isPolice) {
      police.addHeat(car.isPolice ? 32 : 14);
      peds.scareAround(car.x, car.z, 24, 5);
    }
  }
}

// Wire buttons
const btnPlay = document.getElementById('btn-play');
const btnContinue = document.getElementById('btn-continue');
const btnControls = document.getElementById('btn-controls');
const btnResume = document.getElementById('btn-resume');
const btnToggleAudio = document.getElementById('btn-toggle-audio');
const btnSaveNow = document.getElementById('btn-save-now');
const btnResetSave = document.getElementById('btn-reset-save');

if (hasSavedCareer() && btnContinue) btnContinue.classList.remove('hidden');

if (btnPlay) btnPlay.addEventListener('click', startNewGame);
if (btnContinue) btnContinue.addEventListener('click', continueSavedGame);
if (btnControls) {
  btnControls.addEventListener('click', () => {
    audio.unlock();
    hud.setTitleVisible(false);
    gameState.mode = 'paused';
    hud.setPauseVisible(true, player, missions);
  });
}
if (btnResume) btnResume.addEventListener('click', resumePlay);
if (btnToggleAudio) {
  btnToggleAudio.addEventListener('click', () => {
    const muted = audio.toggleMute();
    btnToggleAudio.textContent = muted ? 'AUDIO: OFF' : 'AUDIO: ON';
  });
}
if (btnSaveNow) {
  btnSaveNow.addEventListener('click', () => {
    saveCareer(player, missions);
    hud.showToast('Career saved to browser storage', 'success');
  });
}
if (btnResetSave) {
  btnResetSave.addEventListener('click', () => {
    startNewGame();
    hud.showToast('Started fresh Solana Bay career');
  });
}
if (hud.el.btnOverlayPrimary) {
  hud.el.btnOverlayPrimary.addEventListener('click', () => hud.triggerOverlayPrimary());
}
if (hud.el.btnOverlaySecondary) {
  hud.el.btnOverlaySecondary.addEventListener('click', () => {
    hud.hideOverlay();
    hud.setHudVisible(false);
    hud.setTitleVisible(true);
    gameState.mode = 'title';
  });
}

// Keyboard listeners
window.addEventListener('keydown', (e) => {
  if (SHOT_MODE) return;
  const code = e.code;
  if (code === 'KeyW' || code === 'ArrowUp') input.forward = true;
  if (code === 'KeyS' || code === 'ArrowDown') input.backward = true;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = true;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = true;
  if (code === 'ShiftLeft' || code === 'ShiftRight') input.sprint = true;
  if (code === 'Space') input.jump = true;

  if (gameState.mode === 'playing') {
    if (code === 'KeyF' || code === 'KeyE') handleInteract();
    if (code === 'Digit1') player.switchWeapon(0);
    if (code === 'Digit2') player.switchWeapon(1);
    if (code === 'Digit3') player.switchWeapon(2);
    if (code === 'Digit4') player.switchWeapon(3);
    if (code === 'KeyR') {
      if (player.startReload()) hud.showToast('Reloading...');
    }
    if (code === 'KeyH' && player.state.vehicle) {
      audio.unlock();
      audio.playHorn();
    }
    if (code === 'KeyV') {
      const muted = audio.toggleMute();
      if (btnToggleAudio) btnToggleAudio.textContent = muted ? 'AUDIO: OFF' : 'AUDIO: ON';
      hud.showToast(muted ? 'Audio muted' : 'Audio enabled');
    }
    if (code === 'KeyM' || code === 'Escape') {
      openPauseMenu();
    }
  } else if (gameState.mode === 'paused' && (code === 'KeyM' || code === 'Escape')) {
    resumePlay();
  }
});

window.addEventListener('keyup', (e) => {
  const code = e.code;
  if (code === 'KeyW' || code === 'ArrowUp') input.forward = false;
  if (code === 'KeyS' || code === 'ArrowDown') input.backward = false;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = false;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = false;
  if (code === 'ShiftLeft' || code === 'ShiftRight') input.sprint = false;
  if (code === 'Space') input.jump = false;
});

// Mouse & Pointer Lock controls
canvas.addEventListener('mousedown', (e) => {
  if (SHOT_MODE || gameState.mode !== 'playing') return;
  audio.unlock();
  if (e.button === 0) {
    input.fire = true;
    if (!gameState.pointerLocked && canvas.requestPointerLock) {
      try { canvas.requestPointerLock(); } catch {}
    }
  } else if (e.button === 2) {
    input.aim = true;
    player.state.camAiming = true;
  }
  gameState.draggingLook = true;
  gameState.lastMouseX = e.clientX;
  gameState.lastMouseY = e.clientY;
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) input.fire = false;
  if (e.button === 2) {
    input.aim = false;
    player.state.camAiming = false;
  }
  gameState.draggingLook = false;
});

window.addEventListener('mousemove', (e) => {
  if (SHOT_MODE || gameState.mode !== 'playing') return;
  let dx = 0;
  let dy = 0;
  if (gameState.pointerLocked) {
    dx = e.movementX || 0;
    dy = e.movementY || 0;
  } else if (gameState.draggingLook) {
    dx = e.clientX - gameState.lastMouseX;
    dy = e.clientY - gameState.lastMouseY;
    gameState.lastMouseX = e.clientX;
    gameState.lastMouseY = e.clientY;
  } else {
    return;
  }
  player.state.camYaw -= dx * 0.0028;
  player.state.camPitch = clamp(player.state.camPitch + dy * 0.0022, -0.25, 0.88);
});

window.addEventListener('wheel', (e) => {
  if (SHOT_MODE || gameState.mode !== 'playing') return;
  player.switchWeapon(player.state.weaponIndex + (e.deltaY > 0 ? 1 : -1));
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('pointerlockchange', () => {
  gameState.pointerLocked = document.pointerLockElement === canvas;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Deterministic ?shot=start|play|end&seed=1 showcase staging (zero input required)
function configureShotMode(shot) {
  if (shot === 'start') {
    gameState.mode = 'title';
    hud.setTitleVisible(true);
    hud.setHudVisible(false);
    hud.setPauseVisible(false);
    hud.hideOverlay();
    camera.position.set(174, 24, -74);
    camera.lookAt(96, 8, -22);
    hud.setStatus('Solana Bay Title Screen');
  } else if (shot === 'play') {
    gameState.mode = 'playing';
    hud.setTitleVisible(false);
    hud.setPauseVisible(false);
    hud.hideOverlay();
    hud.setHudVisible(true);

    // Stage Marco Reyes driving a hot pink Riptide GT along Coral Promenade with an active mission
    missions.startMission(0, missionCallbacks);
    missions.state.stepIndex = 1;
    const heroCar = vehicles.spawnVehicle('sports', 140.6, -28, 0, {
      driver: 'player',
      color: '#ff006e',
    });
    heroCar.speed = 24;
    heroCar.vz = 24;
    player.state.vehicle = heroCar;
    player.state.x = heroCar.x;
    player.state.z = heroCar.z;
    player.state.cash = 1450;
    player.state.camYaw = 0.08;
    player.state.camPitch = 0.22;
    player.rig.root.visible = false;

    // Nearby cruising traffic and boardwalk life
    vehicles.spawnVehicle('coupe', 147.4, -10, Math.PI, { driver: 'traffic', color: '#00f5d4' });
    vehicles.spawnVehicle('suv', 140.6, 6, 0, { driver: 'traffic', color: '#ffbe0b' });
    effects.spawnSmoke(heroCar.x - 0.8, 0.25, heroCar.z - 2.2, 0.75);

    camera.position.set(139.2, 4.3, -37.2);
    camera.lookAt(142.0, 1.8, -14.0);
    hud.showDialogue('ELENA NAVARRO', 'Coral Strip is live, Marco — open it up and head to Palma Spray.', 10);
    hud.update(0.016, 1.5, player, vehicles, police, combat, missions, '');
    hud.setStatus('Solana Bay Gameplay');
  } else if (shot === 'end') {
    gameState.mode = 'playing';
    hud.setTitleVisible(false);
    hud.setPauseVisible(false);
    hud.hideOverlay();
    hud.setHudVisible(true);

    // High-heat 3-star SBPD pursuit climax near Alta Glass & Coral Promenade
    missions.startMission(4, missionCallbacks);
    missions.state.stepIndex = 2;
    police.setStars(3);
    const heroCar = vehicles.spawnVehicle('sports', 92.6, 18, 0, {
      driver: 'player',
      color: '#00f5d4',
    });
    heroCar.speed = 34;
    heroCar.vz = 34;
    heroCar.hp = 82;
    player.state.vehicle = heroCar;
    player.state.x = heroCar.x;
    player.state.z = heroCar.z;
    player.state.cash = 6850;
    player.state.stats.missionsDone = 5;
    player.state.stats.carsStolen = 9;
    player.state.stats.takedowns = 14;
    player.rig.root.visible = false;

    const c1 = vehicles.spawnVehicle('police', 90.2, 4.5, 0.14, { driver: 'police', sirenOn: true });
    const c2 = vehicles.spawnVehicle('police', 96.8, -1.5, -0.18, { driver: 'police', sirenOn: true });
    police.cruisers.push(c1, c2);
    effects.spawnExplosion(99.5, 1.1, 30, 1.1);
    effects.spawnTracer({ x: 91, y: 1.4, z: 6 }, { x: 92.6, y: 1.2, z: 18 }, 0xffd166);

    camera.position.set(86.4, 5.2, 33.8);
    camera.lookAt(93.0, 1.6, 12.0);
    hud.showToast('3-STAR SBPD PURSUIT — EVADE TO LOCK DOWN SOLANA BAY', 'warn');
    hud.showDialogue('VICTOR CRANE', 'All units on Reyes! Box him in before he hits the marina!', 10);
    hud.update(0.016, 2.2, player, vehicles, police, combat, missions, '');
    hud.setStatus('Solana Bay Pursuit');
  }
}

if (SHOT_MODE) {
  configureShotMode(SHOT_MODE);
} else {
  hud.setTitleVisible(true);
  hud.setHudVisible(false);
  hud.setStatus('Solana Bay Ready');
}

// Main animation loop
let lastTime = performance.now();

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  gameState.elapsed += dt;

  city.update(dt, gameState.elapsed);

  if (SHOT_MODE) {
    // Keep shot framing completely deterministic while letting water & police lights shimmer
    if (SHOT_MODE === 'end') {
      for (const c of police.cruisers) {
        if (c.lightRed && c.lightBlue) {
          c.lightRed.material.emissiveIntensity = 2.4;
          c.lightBlue.material.emissiveIntensity = 2.4;
        }
      }
    }
    renderer.render(scene, camera);
    return;
  }

  if (gameState.mode === 'title') {
    // Gentle aerial orbit over sunlit Coral Promenade & ocean
    const angle = gameState.elapsed * 0.085;
    camera.position.set(125 + Math.cos(angle) * 58, 28 + Math.sin(angle * 0.7) * 4, -20 + Math.sin(angle) * 58);
    camera.lookAt(78, 8, -12);
    vehicles.update(dt, gameState.elapsed, {}, city, null, effects, null);
    renderer.render(scene, camera);
    return;
  }

  if (gameState.mode === 'playing') {
    // Smoothly align camera behind car when moving without mouse override
    if (player.state.vehicle && !gameState.draggingLook && Math.abs(player.state.vehicle.speed) > 3.5) {
      const diff = ((player.state.vehicle.yaw - player.state.camYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      const wrapped = diff < -Math.PI ? diff + Math.PI * 2 : diff;
      player.state.camYaw += wrapped * clamp(dt * 3.2, 0, 1);
    }

    const sharedCallbacks = {
      onHostileKilled: () => {
        player.state.stats.takedowns += 1;
        hud.showToast('Syndicate enforcer down (+$95)');
      },
      onOfficerKilled: () => {
        player.state.stats.takedowns += 1;
        hud.showToast('SBPD officer down', 'warn');
      },
      onPedHitByPlayer: () => {
        police.addHeat(16);
      },
      onPlayerCrash: (other, impact) => {
        if (other && other.isPolice && impact > 10) {
          police.addHeat(22);
        }
      },
      onVehicleExplode: (v) => {
        if (v === player.state.vehicle) {
          player.takeDamage(120);
        }
        police.addHeat(28);
        peds.scareAround(v.x, v.z, 42, 9);
      },
      onEvaded: () => {
        audio.playMissionChime(false);
        hud.showToast('SBPD Evaded! Wanted level cleared', 'success');
      },
      onBusted: () => handleWastedOrBusted('busted'),
    };

    if (input.fire) {
      combat.firePlayerWeapon(player, camera, city, vehicles, peds, police, effects, audio, sharedCallbacks);
    }

    police.update(dt, city, player, effects, audio, sharedCallbacks);
    vehicles.update(dt, gameState.elapsed, input, city, player, effects, audio, sharedCallbacks);
    player.update(dt, input, city);
    peds.update(dt, city, vehicles.vehicles, effects, audio, sharedCallbacks);
    combat.update(dt, city, player, vehicles, effects, audio, sharedCallbacks);
    missions.update(dt, gameState.elapsed, player, missionCallbacks);
    effects.update(dt, gameState.elapsed, player, audio, missionCallbacks);
    audio.updateContinuous(gameState.elapsed, player, police);

    if (player.state.dead) {
      handleWastedOrBusted('wasted');
    }

    player.updateCamera(dt, camera, city);
    hud.update(dt, gameState.elapsed, player, vehicles, police, combat, missions, getActiveInteractPrompt());

    // Periodic autosave every 20 seconds
    gameState.autosaveTimer += dt;
    if (gameState.autosaveTimer >= 20) {
      gameState.autosaveTimer = 0;
      saveCareer(player, missions);
    }
  } else if (gameState.mode === 'paused') {
    hud.update(0, gameState.elapsed, player, vehicles, police, combat, missions, '');
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(tick);
