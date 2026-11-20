// Solana Bay — Main engine loop, input, pointer lock, respray garage, armory & deterministic shot modes
import * as THREE from 'three';
import { LANDMARKS, WEAPONS, GAME_CONSTANTS, createRng } from './config.js';
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
import { hasSavedCareer, saveCareer, loadCareer, resetCareer } from './save.js';

const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot'); // 'start' | 'play' | 'end' | null
const seedVal = Number(params.get('seed')) || 1;
const rng = createRng(seedVal);

// Renderer & Scene
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if ('SRGBColorSpace' in THREE) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.25, 950);

// Instantiate core game systems
const city = buildCity(scene, rng);
const audio = createAudioSystem();
const effects = createEffectsSystem(scene, city, rng);
const playerCtrl = createPlayer(scene, city);
const vehicleMgr = createVehicleManager(scene, city, rng);
const pedMgr = createPedestrianManager(scene, city, rng);
const policeSys = createPoliceSystem(scene, city, vehicleMgr, rng);
const combatSys = createCombatSystem(scene, city, vehicleMgr, pedMgr, policeSys, effects, audio, rng);
const missionMgr = createMissionManager(scene, city, vehicleMgr, combatSys, policeSys, effects, audio);
const hud = createHud(city);

vehicleMgr.populateInitialTraffic(22);
pedMgr.populate(46);
effects.populateWorldPickups();

// Game mode state
let mode = 'title'; // 'title' | 'play' | 'pause' | 'overlay'
let overlayAction = null;
let simTime = 0;
let autosaveTimer = 30;
let shotFreezeCamera = null; // { pos, look } when shotMode needs exact hero framing

// Input state
const input = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  sprint: false,
  fire: false,
  rightMouse: false,
  mouseDX: 0,
  mouseDY: 0,
  dragging: false,
};

// Title button visibility for saved career
const btnPlay = document.getElementById('btn-play');
const btnContinue = document.getElementById('btn-continue');
const btnControls = document.getElementById('btn-controls');
const btnResume = document.getElementById('btn-resume');
const btnToggleAudio = document.getElementById('btn-toggle-audio');
const btnSaveNow = document.getElementById('btn-save-now');
const btnResetSave = document.getElementById('btn-reset-save');
const btnOverlayPrimary = document.getElementById('btn-overlay-primary');
const btnOverlaySecondary = document.getElementById('btn-overlay-secondary');

if (hasSavedCareer() && btnContinue) {
  btnContinue.classList.remove('hidden');
}

function lockPointer() {
  if (shotMode || mode !== 'play') return;
  if (canvas.requestPointerLock) {
    try {
      const p = canvas.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      // Ignore pointer lock rejection
    }
  }
}

function unlockPointer() {
  if (document.pointerLockElement && document.exitPointerLock) {
    try { document.exitPointerLock(); } catch { /* ignore */ }
  }
}

function startNewOrPlay(loadSaved = false) {
  audio.unlock();
  audio.playUiClick(620);
  if (loadSaved) {
    loadCareer(playerCtrl, missionMgr);
    hud.showToast('CAREER LOADED', 'cyan');
  } else {
    playerCtrl.setPosition(GAME_CONSTANTS.START_SPAWN.x, GAME_CONSTANTS.START_SPAWN.z, Math.PI);
    hud.showDialogue('SORA', 'Dante — grab that Solara GT parked ahead on Miramar Blvd and meet me at the golden beacon!', 7.5);
  }
  mode = 'play';
  hud.showTitle(false);
  hud.showPause(false);
  hud.hideOverlay();
  hud.showHud(true);
  hud.setStatus('Playing Solana Bay');
  lockPointer();
}

function togglePause(forceState = null) {
  if (mode === 'title' || mode === 'overlay') return;
  const nextPause = forceState !== null ? forceState : mode !== 'pause';
  mode = nextPause ? 'pause' : 'play';
  hud.showPause(nextPause, playerCtrl.player, missionMgr.state);
  if (nextPause) unlockPointer();
  else lockPointer();
}

function triggerWasted() {
  if (mode === 'overlay') return;
  mode = 'overlay';
  unlockPointer();
  missionMgr.failMission('Dante was incapacitated', hud);
  policeSys.clearWanted();
  audio.playMissionChime('fail');
  hud.showOverlay({
    kicker: 'SOLANA BAY GENERAL HOSPITAL',
    title: 'WASTED',
    desc: `Medical patch-up cost $${GAME_CONSTANTS.HOSPITAL_FEE}. Your weapons and mission progress are intact.`,
    statsHtml: hud.buildStatsMarkup(playerCtrl.player, missionMgr.state),
    primaryLabel: 'RESPAWN AT HOSPITAL',
    secondaryLabel: 'TITLE SCREEN',
    tone: 'red',
  });
  overlayAction = () => {
    const p = playerCtrl.player;
    if (p.vehicle) playerCtrl.exitVehicle();
    p.dead = false;
    p.health = p.maxHealth;
    p.armor = Math.max(p.armor, 25);
    p.invulnTimer = 2.5;
    playerCtrl.addCash(-Math.min(p.cash, GAME_CONSTANTS.HOSPITAL_FEE));
    playerCtrl.setPosition(GAME_CONSTANTS.HOSPITAL_SPAWN.x, GAME_CONSTANTS.HOSPITAL_SPAWN.z, Math.PI);
    hud.hideOverlay();
    mode = 'play';
    lockPointer();
  };
}

function triggerBusted() {
  if (mode === 'overlay') return;
  mode = 'overlay';
  unlockPointer();
  missionMgr.failMission('Arrested by SBPD', hud);
  policeSys.clearWanted();
  audio.playMissionChime('fail');
  hud.showOverlay({
    kicker: 'SOLANA BAY POLICE DEPARTMENT',
    title: 'BUSTED',
    desc: `SBPD impounded your ride and took $${GAME_CONSTANTS.BAIL_FEE} bail. Back on the street outside precinct.`,
    statsHtml: hud.buildStatsMarkup(playerCtrl.player, missionMgr.state),
    primaryLabel: 'PAY BAIL & CONTINUE',
    secondaryLabel: 'TITLE SCREEN',
    tone: 'blue',
  });
  overlayAction = () => {
    const p = playerCtrl.player;
    if (p.vehicle) playerCtrl.exitVehicle();
    p.busted = false;
    p.health = p.maxHealth;
    p.invulnTimer = 2.5;
    playerCtrl.addCash(-Math.min(p.cash, GAME_CONSTANTS.BAIL_FEE));
    playerCtrl.setPosition(GAME_CONSTANTS.PRECINCT_SPAWN.x, GAME_CONSTANTS.PRECINCT_SPAWN.z, 0);
    hud.hideOverlay();
    mode = 'play';
    lockPointer();
  };
}

function triggerStoryVictory() {
  mode = 'overlay';
  unlockPointer();
  saveCareer(playerCtrl, missionMgr);
  hud.showOverlay({
    kicker: 'STORY COMPLETE — ALL 6 MISSIONS CLEARED',
    title: 'KING OF SOLANA BAY',
    desc: 'Hector Salgado’s Marea Roja syndicate is finished. The Miramar skyline and Coral Key Marina belong to Dante Vega. Continue in Free Roam anytime!',
    statsHtml: hud.buildStatsMarkup(playerCtrl.player, missionMgr.state),
    primaryLabel: 'ENTER FREE ROAM',
    secondaryLabel: 'TITLE SCREEN',
    tone: 'gold',
  });
  overlayAction = () => {
    hud.hideOverlay();
    mode = 'play';
    lockPointer();
  };
}

function handleVehicleExplosion(v) {
  const p = playerCtrl.player;
  if (p.vehicle === v) {
    playerCtrl.exitVehicle();
    playerCtrl.takeDamage(80);
  }
  const dist = Math.hypot(p.pos.x - v.pos.x, p.pos.z - v.pos.z);
  if (dist < 10) {
    playerCtrl.takeDamage((10 - dist) * 6);
  }
  pedMgr.alertPanic(v.pos.x, v.pos.z, 48);
  policeSys.addHeat(22, p, 1);
}

// Interact with vehicles, El Sol Customs respray garage, or Ironworks Armory
function handleInteract() {
  const p = playerCtrl.player;
  if (p.dead || p.busted) return;

  // 1. Check El Sol Customs Respray Garage
  const dGarage = Math.hypot(p.pos.x - LANDMARKS.garage.x, p.pos.z - LANDMARKS.garage.z);
  if (dGarage < LANDMARKS.garage.radius + 2.5) {
    const cost = GAME_CONSTANTS.RESPRAY_COST;
    if (p.cash >= cost || policeSys.state.stars > 0) {
      const charge = p.cash >= cost ? cost : 0;
      if (charge > 0) playerCtrl.addCash(-charge);
      if (p.vehicle) {
        vehicleMgr.repaintAndRepair(p.vehicle);
      }
      playerCtrl.heal(100, 50);
      policeSys.clearWanted();
      audio.playMissionChime('start');
      hud.showToast(
        charge > 0 ? `EL SOL CUSTOMS: RESPRAYED & HEAT CLEARED (-$${charge})` : 'EL SOL CUSTOMS: FREE FRIENDLY PATCH-UP!',
        'cyan'
      );
      saveCareer(playerCtrl, missionMgr);
      return;
    }
  }

  // 2. Check Ironworks Armory
  const dArmory = Math.hypot(p.pos.x - LANDMARKS.armory.x, p.pos.z - LANDMARKS.armory.z);
  if (dArmory < LANDMARKS.armory.radius + 2.5 && !p.vehicle) {
    if (!p.inventory.smg.unlocked && p.cash >= WEAPONS[2].cost) {
      playerCtrl.addCash(-WEAPONS[2].cost);
      playerCtrl.unlockWeapon('smg', 150);
      playerCtrl.selectWeapon(2);
      audio.playPickup();
      hud.showToast(`BOUGHT VIPER SMG (-$${WEAPONS[2].cost})`, 'gold');
      saveCareer(playerCtrl, missionMgr);
      return;
    }
    if (!p.inventory.shotgun.unlocked && p.cash >= WEAPONS[3].cost) {
      playerCtrl.addCash(-WEAPONS[3].cost);
      playerCtrl.unlockWeapon('shotgun', 30);
      playerCtrl.selectWeapon(3);
      audio.playPickup();
      hud.showToast(`BOUGHT BREACHER 12G (-$${WEAPONS[3].cost})`, 'gold');
      saveCareer(playerCtrl, missionMgr);
      return;
    }
    if (p.cash >= GAME_CONSTANTS.ARMOR_COST) {
      playerCtrl.addCash(-GAME_CONSTANTS.ARMOR_COST);
      playerCtrl.heal(100, 100);
      for (const w of WEAPONS) {
        if (w.type === 'gun' && p.inventory[w.id].unlocked) {
          p.inventory[w.id].mag = w.magSize;
          p.inventory[w.id].reserve = w.maxReserve;
        }
      }
      audio.playPickup();
      hud.showToast(`ARMORY RESUPPLY: FULL ARMOR & AMMO (-$${GAME_CONSTANTS.ARMOR_COST})`, 'cyan');
      saveCareer(playerCtrl, missionMgr);
      return;
    }
    hud.showToast(`NEED $${GAME_CONSTANTS.ARMOR_COST} FOR ARMORY RESUPPLY`, 'red');
    return;
  }

  // 3. Exit or Steal/Enter vehicle
  if (p.vehicle) {
    playerCtrl.exitVehicle();
    audio.playUiClick(360);
    return;
  }

  const nearest = vehicleMgr.findNearestStealable(p.pos.x, p.pos.z, 5.8);
  if (nearest) {
    const wasOwnedByNpc = nearest.driver === 'traffic' || nearest.driver === 'police';
    const wasPolice = nearest.classId === 'police';
    playerCtrl.enterVehicle(nearest);
    p.stats.carsStolen += 1;
    audio.playUiClick(480);
    if (wasPolice) {
      policeSys.addHeat(55, p, 2);
      hud.showToast('STOLE SBPD INTERCEPTOR! 2-STAR HEAT!', 'red');
    } else if (wasOwnedByNpc) {
      policeSys.addHeat(22, p, 1);
      pedMgr.alertPanic(nearest.pos.x, nearest.pos.z, 26);
      hud.showToast(`JACKED ${nearest.spec.name.toUpperCase()}`, 'gold');
    } else {
      hud.showToast(`DRIVING ${nearest.spec.name.toUpperCase()}`, 'cyan');
    }
  }
}

function updateContextPrompt() {
  const p = playerCtrl.player;
  if (mode !== 'play' || p.dead || p.busted) {
    hud.setInteractPrompt(null);
    return;
  }
  const dGarage = Math.hypot(p.pos.x - LANDMARKS.garage.x, p.pos.z - LANDMARKS.garage.z);
  if (dGarage < LANDMARKS.garage.radius + 2.5) {
    hud.setInteractPrompt(`[E / F] El Sol Customs — Respray, Repair & Clear Heat ($${GAME_CONSTANTS.RESPRAY_COST})`);
    return;
  }
  const dArmory = Math.hypot(p.pos.x - LANDMARKS.armory.x, p.pos.z - LANDMARKS.armory.z);
  if (dArmory < LANDMARKS.armory.radius + 2.5 && !p.vehicle) {
    if (!p.inventory.smg.unlocked) {
      hud.setInteractPrompt(`[E / F] Ironworks Armory — Buy Viper SMG ($${WEAPONS[2].cost})`);
    } else if (!p.inventory.shotgun.unlocked) {
      hud.setInteractPrompt(`[E / F] Ironworks Armory — Buy Breacher 12G ($${WEAPONS[3].cost})`);
    } else {
      hud.setInteractPrompt(`[E / F] Ironworks Armory — Full Armor & Ammo Resupply ($${GAME_CONSTANTS.ARMOR_COST})`);
    }
    return;
  }
  if (!p.vehicle) {
    const v = vehicleMgr.findNearestStealable(p.pos.x, p.pos.z, 5.8);
    if (v) {
      hud.setInteractPrompt(`[F / E] ${v.driver ? 'Steal' : 'Enter'} ${v.spec.name}`);
      return;
    }
  }
  hud.setInteractPrompt(null);
}

// Button handlers
btnPlay?.addEventListener('click', () => startNewOrPlay(false));
btnContinue?.addEventListener('click', () => startNewOrPlay(true));
btnControls?.addEventListener('click', () => {
  startNewOrPlay(false);
  togglePause(true);
});
btnResume?.addEventListener('click', () => togglePause(false));
btnToggleAudio?.addEventListener('click', () => {
  audio.setMuted(!audio.isMuted());
  btnToggleAudio.textContent = audio.isMuted() ? 'AUDIO: OFF' : 'AUDIO: ON';
});
btnSaveNow?.addEventListener('click', () => {
  saveCareer(playerCtrl, missionMgr);
  hud.showToast('CAREER SAVED', 'green');
});
btnResetSave?.addEventListener('click', () => {
  resetCareer();
  window.location.reload();
});
btnOverlayPrimary?.addEventListener('click', () => {
  if (overlayAction) overlayAction();
});
btnOverlaySecondary?.addEventListener('click', () => {
  hud.hideOverlay();
  hud.showHud(false);
  hud.showTitle(true);
  mode = 'title';
});

// Keyboard events
window.addEventListener('keydown', (e) => {
  const code = e.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
    e.preventDefault();
  }
  audio.unlock();

  if (code === 'KeyM' || code === 'Escape') {
    if (mode === 'play' || mode === 'pause') togglePause();
    return;
  }
  if (mode !== 'play') return;

  if (code === 'KeyW' || code === 'ArrowUp') input.forward = true;
  if (code === 'KeyS' || code === 'ArrowDown') input.backward = true;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = true;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = true;
  if (code === 'Space') input.jump = true;
  if (code === 'ShiftLeft' || code === 'ShiftRight') input.sprint = true;

  if (code === 'KeyF' || code === 'KeyE') handleInteract();
  if (code === 'KeyR') {
    if (playerCtrl.startReload()) hud.showToast('RELOADING...', 'cyan');
  }
  if (code === 'KeyH' && playerCtrl.player.vehicle) {
    audio.playHorn();
    pedMgr.alertPanic(playerCtrl.player.pos.x, playerCtrl.player.pos.z, 14);
  }
  if (code === 'KeyV') {
    audio.setMuted(!audio.isMuted());
    if (btnToggleAudio) btnToggleAudio.textContent = audio.isMuted() ? 'AUDIO: OFF' : 'AUDIO: ON';
    hud.showToast(audio.isMuted() ? 'AUDIO MUTED' : 'AUDIO ON', 'cyan');
  }
  if (code === 'Digit1') playerCtrl.selectWeapon(0);
  if (code === 'Digit2') playerCtrl.selectWeapon(1);
  if (code === 'Digit3') playerCtrl.selectWeapon(2);
  if (code === 'Digit4') playerCtrl.selectWeapon(3);
});

window.addEventListener('keyup', (e) => {
  const code = e.code;
  if (code === 'KeyW' || code === 'ArrowUp') input.forward = false;
  if (code === 'KeyS' || code === 'ArrowDown') input.backward = false;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = false;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = false;
  if (code === 'Space') input.jump = false;
  if (code === 'ShiftLeft' || code === 'ShiftRight') input.sprint = false;
});

// Mouse events (Pointer lock + drag fallback + wheel weapon switch)
canvas.addEventListener('mousedown', (e) => {
  audio.unlock();
  if (mode !== 'play') return;
  if (e.button === 0) {
    if (document.pointerLockElement !== canvas) lockPointer();
    input.fire = true;
    input.dragging = true;
    combatSys.firePlayerWeapon(playerCtrl, camera, { onVehicleExplode: handleVehicleExplosion });
  } else if (e.button === 2) {
    input.rightMouse = true;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    input.fire = false;
    input.dragging = false;
  } else if (e.button === 2) {
    input.rightMouse = false;
  }
});

window.addEventListener('contextmenu', (e) => {
  if (mode === 'play') e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  if (mode !== 'play') return;
  if (document.pointerLockElement === canvas || input.dragging || input.rightMouse) {
    input.mouseDX += e.movementX || 0;
    input.mouseDY += e.movementY || 0;
  }
});

window.addEventListener('wheel', (e) => {
  if (mode !== 'play') return;
  if (Math.abs(e.deltaY) > 4) {
    playerCtrl.cycleWeapon(e.deltaY > 0 ? 1 : -1);
  }
}, { passive: true });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Deterministic Screenshot Framing (?shot=start|play|end&seed=1) ----------
function configureShotMode(kind) {
  if (kind === 'start') {
    mode = 'title';
    hud.showTitle(true);
    hud.showHud(false);
    hud.hideOverlay();
    // Place showcase sports car cruising Miramar Blvd beside palms & Hotel Solamar
    const heroCar = vehicleMgr.spawnVehicle('sports', 176.5, 86, Math.PI, { color: '#ff3b6b' });
    heroCar.speed = 14;
    vehicleMgr.spawnVehicle('muscle', 183.5, 58, 0, { color: '#00d2d3' });
    shotFreezeCamera = {
      pos: new THREE.Vector3(212, 22, 134),
      look: new THREE.Vector3(156, 12, 46),
    };
    camera.fov = 56;
    camera.position.copy(shotFreezeCamera.pos);
    camera.lookAt(shotFreezeCamera.look);
    camera.updateProjectionMatrix();
    hud.setStatus('Solana Bay — Title Cover');
  } else if (kind === 'play') {
    mode = 'play';
    hud.showTitle(false);
    hud.hideOverlay();
    hud.showHud(true);

    const p = playerCtrl.player;
    p.cash = 1850;
    p.health = 92;
    p.armor = 65;
    playerCtrl.unlockWeapon('smg', 120);
    playerCtrl.selectWeapon(2);

    // Put Dante in a coral-red Solara GT speeding north along Miramar Strip with SBPD chasing!
    const playerCar = vehicleMgr.spawnVehicle('sports', 176.2, 108, Math.PI, {
      color: '#ff3b6b',
      driver: 'player',
    });
    playerCar.speed = 29;
    playerCar.vel.set(0, 0, -29);
    playerCtrl.enterVehicle(playerCar);

    // Pursuing SBPD Interceptor right behind with flashing lightbar
    const cop1 = policeSys.spawnCruiser(p.pos, { x: 181.5, z: 126 }, Math.PI - 0.14);
    cop1.speed = 26;
    cop1.vel.set(-3, 0, -26);
    const cop2 = policeSys.spawnCruiser(p.pos, { x: 173.0, z: 138 }, Math.PI + 0.08);
    cop2.speed = 24;
    policeSys.setStars(3, p);
    policeSys.state.spotted = true;

    // Mission 1 active state for rich objective HUD + GPS line
    missionMgr.state.active = true;
    missionMgr.state.currentIndex = 0;
    missionMgr.state.objectiveText = 'Deliver the Solara GT to El Sol Customs (Calle Verde)';
    missionMgr.state.objectiveTarget = { x: LANDMARKS.garage.x, z: LANDMARKS.garage.z, color: '#2ce6d2' };

    hud.showDialogue('SORA', 'SBPD interceptors right on your bumper — drift left on Calle Verde to hit El Sol Customs!', 99);
    effects.spawnSmoke(177.2, 0.25, 111, 0xe8edf2, 0.9);
    effects.spawnSmoke(175.4, 0.25, 112.5, 0xe8edf2, 0.8);

    // Frame cinematic third-person driving angle showing sports car, pursuing cop, Art Deco hotels & ocean palms!
    shotFreezeCamera = {
      pos: new THREE.Vector3(186.5, 5.2, 120.5),
      look: new THREE.Vector3(174.5, 2.1, 95.0),
    };
    camera.fov = 66;
    camera.position.copy(shotFreezeCamera.pos);
    camera.lookAt(shotFreezeCamera.look);
    camera.updateProjectionMatrix();
    hud.setStatus('Solana Bay — Active Pursuit Gameplay');
  } else if (kind === 'end') {
    mode = 'overlay';
    hud.showTitle(false);
    hud.showHud(true);

    const p = playerCtrl.player;
    p.cash = 11650;
    p.health = 88;
    p.armor = 50;
    p.stats = {
      kills: 24,
      carsStolen: 9,
      missionsCompleted: 6,
      distanceDriven: 14820,
      maxWanted: 5,
    };
    missionMgr.loadProgress(6);

    // Stage dramatic victory scene at Coral Key Marina Pier overlooking Solana Bay & Miramar skyline!
    playerCtrl.setPosition(234, 2, -Math.PI * 0.42);
    playerCtrl.unlockWeapon('shotgun', 24);
    playerCtrl.selectWeapon(3);

    const getawayCar = vehicleMgr.spawnVehicle('sports', 226, -3.5, Math.PI * 0.35, { color: '#00d2d3' });
    const wreckedVan = vehicleMgr.spawnVehicle('van', 252, -2, -Math.PI * 0.65, { color: '#2c3e50' });
    vehicleMgr.explodeVehicle(wreckedVan, effects, null, null);
    effects.spawnExplosion(252, 2.2, -2, 1.3);

    const copPier = policeSys.spawnCruiser(p.pos, { x: 204, z: 4 }, Math.PI * 0.45);
    copPier.sirenOn = true;

    shotFreezeCamera = {
      pos: new THREE.Vector3(244, 7.5, 17.5),
      look: new THREE.Vector3(224, 3.0, -3.0),
    };
    camera.fov = 58;
    camera.position.copy(shotFreezeCamera.pos);
    camera.lookAt(shotFreezeCamera.look);
    camera.updateProjectionMatrix();

    hud.showOverlay({
      kicker: 'MISSION ACCOMPLISHED — ALL 6 MISSIONS CLEARED',
      title: 'CROWN OF SOLANA BAY',
      desc: 'Hector Salgado’s syndicate fell at Coral Key Marina. Solana Bay belongs to Dante Vega.',
      statsHtml: hud.buildStatsMarkup(p, missionMgr.state),
      primaryLabel: 'ENTER FREE ROAM',
      secondaryLabel: 'TITLE SCREEN',
      tone: 'gold',
    });
    hud.setStatus('Solana Bay — Victory & Free Roam');
  }
}

if (shotMode) {
  configureShotMode(shotMode);
} else {
  hud.showTitle(true);
  hud.showHud(false);
  hud.setStatus('Solana Bay ready');
}

// Render initial frame synchronously so headless/screenshot capture is immediately crisp before first rAF
city.update(0.016, 0.5);
if (shotFreezeCamera) {
  effects.update(0.016, 0.5, playerCtrl, null, null);
  for (const c of policeSys.cruisers) {
    if (c.lightRed && c.lightBlue) {
      c.lightRed.material.color.setHex(0xff1133);
      c.lightBlue.material.color.setHex(0x2299ff);
    }
  }
  camera.position.copy(shotFreezeCamera.pos);
  camera.lookAt(shotFreezeCamera.look);
} else {
  camera.position.set(226, 28, 54);
  camera.lookAt(140, 11, 28);
}
hud.update(0.016, 0.5, playerCtrl, missionMgr.state, policeSys, combatSys, false);
renderer.render(scene, camera);

// ---------- Main Loop ----------
let lastTime = performance.now();

function stepFrame(now) {
  requestAnimationFrame(stepFrame);
  const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;
  simTime += dt;

  city.update(dt, simTime);

  if (shotFreezeCamera) {
    // Keep gentle life in scene (ocean waves, lights, particles) while holding hero framing
    effects.update(dt * 0.25, simTime, playerCtrl, null, null);
    if (shotMode === 'play') {
      // Animate flashing lightbars cleanly
      for (const c of policeSys.cruisers) {
        if (c.lightRed && c.lightBlue) {
          c.lightRed.material.color.setHex(0xff1133);
          c.lightBlue.material.color.setHex(0x2299ff);
        }
      }
    }
    hud.update(dt, simTime, playerCtrl, missionMgr.state, policeSys, combatSys, false);
    camera.position.copy(shotFreezeCamera.pos);
    camera.lookAt(shotFreezeCamera.look);
    renderer.render(scene, camera);
    return;
  }

  if (mode === 'title') {
    // Scenic slow aerial orbit over Miramar Strip & Solana Beachfront on title screen
    const a = simTime * 0.14;
    const cx = 178 + Math.cos(a) * 48;
    const cz = 54 + Math.sin(a) * 62;
    camera.position.set(cx, 28 + Math.sin(simTime * 0.35) * 4, cz);
    camera.lookAt(140, 11, 28);
    vehicleMgr.update(dt, simTime, input, playerCtrl, effects, null, {});
    pedMgr.update(dt, vehicleMgr.vehicles, effects, null);
    renderer.render(scene, camera);
    return;
  }

  if (mode === 'play') {
    // Continuous auto-fire for automatic weapons (SMG)
    if (input.fire && playerCtrl.getWeapon().auto) {
      combatSys.firePlayerWeapon(playerCtrl, camera, { onVehicleExplode: handleVehicleExplosion });
    }

    playerCtrl.update(dt, input, camera);
    vehicleMgr.update(dt, simTime, input, playerCtrl, effects, audio, {
      onVehicleExplode: handleVehicleExplosion,
      onCrash: (x, z) => pedMgr.alertPanic(x, z, 28),
      onHitPolice: () => policeSys.addHeat(22, playerCtrl.player, 1),
    });
    pedMgr.update(dt, vehicleMgr.vehicles, effects, () => {
      policeSys.addHeat(24, playerCtrl.player, 1);
    });
    policeSys.update(dt, playerCtrl, effects, audio, {
      onVehicleExplode: handleVehicleExplosion,
      onBusted: triggerBusted,
      onEvaded: () => {
        audio.playMissionChime('start');
        hud.showToast('SBPD EVADED! WANTED LEVEL CLEARED', 'cyan');
      },
    });
    combatSys.updateGangAI(dt, playerCtrl, { onVehicleExplode: handleVehicleExplosion });
    missionMgr.update(dt, simTime, playerCtrl, hud, {
      onMissionComplete: (_def, storyFinished) => {
        saveCareer(playerCtrl, missionMgr);
        if (storyFinished) triggerStoryVictory();
      },
    });
    effects.update(dt, simTime, playerCtrl, audio, hud);

    const p = playerCtrl.player;
    audio.updateContinuous(
      dt,
      simTime,
      !!p.vehicle,
      p.vehicle ? Math.abs(p.vehicle.speed) : 0,
      policeSys.state.stars > 0 || (p.vehicle && p.vehicle.sirenOn)
    );

    if (p.dead) triggerWasted();

    // Periodic autosave
    autosaveTimer -= dt;
    if (autosaveTimer <= 0) {
      autosaveTimer = 30;
      saveCareer(playerCtrl, missionMgr);
    }

    updateContextPrompt();
  }

  // Clear per-frame mouse deltas
  input.mouseDX = 0;
  input.mouseDY = 0;

  hud.update(dt, simTime, playerCtrl, missionMgr.state, policeSys, combatSys, mode === 'pause');
  renderer.render(scene, camera);
}

requestAnimationFrame(stepFrame);
