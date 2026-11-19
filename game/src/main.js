// Solana Bay — Bootloader, input dispatcher, world interactions (garage/armory), and main loop.
import * as THREE from 'three';
import { LANDMARKS, createRng, clamp } from './config.js';
import { buildSkyAndLights, createCity } from './city.js';
import { createPlayer } from './player.js';
import { createVehicleManager } from './vehicles.js';
import { createPedestrianManager } from './pedestrians.js';
import { createPoliceManager } from './police.js';
import { createCombatManager } from './combat.js';
import { createMissionManager, MISSION_DEFS } from './missions.js';
import { createEffects } from './effects.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { loadCareer, saveCareer, clearCareer } from './save.js';

const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot'); // 'start' | 'play' | 'end' | null
const seed = Number(params.get('seed')) || 1;
const rng = createRng(seed);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.14;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.25, 1150);

const { sun } = buildSkyAndLights(scene);
const city = createCity(scene, rng);
const fx = createEffects(scene);
const audio = createAudio();
const savedData = shotMode ? null : loadCareer();

const player = createPlayer(scene, null);
const vehicleMgr = createVehicleManager(scene, rng);
vehicleMgr.spawnInitialFleet();
const pedMgr = createPedestrianManager(scene, rng);
pedMgr.spawnInitialCrowd(36);
const policeMgr = createPoliceManager(scene, rng, vehicleMgr);
const combatMgr = createCombatManager(scene, rng);

let mode = 'title'; // 'title' | 'play' | 'pause' | 'overlay'
let elapsed = 0;
let autoSaveTimer = 0;
let currentPrompt = null;
let currentInteractAction = null;

const input = {
  keys: Object.create(null),
  mouseLeft: false,
  mouseRight: false,
  mouseIdleTime: 10,
  dragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
};

const hud = createHud({
  onPlay: (loadSaved) => startGame(loadSaved),
  onOpenControls: () => openPause(),
  onResume: () => resumeGame(),
  onToggleAudio: () => {
    const on = audio.toggle();
    hud.el.btnToggleAudio.textContent = `AUDIO: ${on ? 'ON' : 'OFF'}`;
    hud.toast(on ? 'AUDIO ENABLED' : 'AUDIO MUTED');
  },
  onSaveNow: () => {
    saveCareer(player.state, missionMgr.getMissionIndex());
    hud.toast('CAREER SAVED TO LOCAL STORAGE');
  },
  onResetSave: () => {
    clearCareer();
    window.location.reload();
  },
});

const missionMgr = createMissionManager(scene, vehicleMgr, combatMgr, policeMgr, fx, audio, hud);

function applySavedCareer(data) {
  if (!data) return;
  const p = player.state;
  p.x = data.x ?? p.x;
  p.z = data.z ?? p.z;
  p.yaw = data.yaw ?? p.yaw;
  p.hp = data.hp ?? p.hp;
  p.armor = data.armor ?? p.armor;
  p.cash = data.cash ?? p.cash;
  p.weaponIndex = data.weaponIndex ?? p.weaponIndex;
  if (Array.isArray(data.unlockedWeapons)) p.unlockedWeapons = [...data.unlockedWeapons];
  if (data.ammo) p.ammo = { ...p.ammo, ...data.ammo };
  if (data.mag) p.mag = { ...p.mag, ...data.mag };
  if (data.stats) p.stats = { ...p.stats, ...data.stats };
  missionMgr.setMissionIndex(data.missionIndex ?? 0);
}

function startGame(loadSaved = false) {
  audio.ensure();
  if (loadSaved && savedData) {
    applySavedCareer(savedData);
    hud.toast('CAREER LOADED');
  }
  mode = 'play';
  hud.showGameplay();
  if (!loadSaved) {
    hud.showDialogue('RICO VEGA', 'Welcome back to Solana Bay, Mateo. Grab a ride on Miramar Strip and hit the gold beacon ahead!', 7.5);
  }
}

function openPause() {
  if (mode === 'overlay') return;
  mode = 'pause';
  if (document.pointerLockElement) document.exitPointerLock?.();
  hud.showPause(getStatsSummary(), audio.isEnabled(), city, buildHudSnapshot());
}

function resumeGame() {
  mode = 'play';
  hud.hidePause();
  hud.showGameplay();
}

function getStatsSummary() {
  const s = player.state.stats;
  return {
    CASH: `$${Math.floor(player.state.cash).toLocaleString()}`,
    MISSIONS: `${s.missionsCompleted} / ${MISSION_DEFS.length}`,
    'CARS STOLEN': s.carsStolen,
    'ENEMIES DOWN': s.enemiesDefeated,
    'STUNT JUMPS': s.stuntsDone,
    'TOTAL EARNED': `$${Math.floor(s.totalEarned).toLocaleString()}`,
  };
}

function buildHudSnapshot() {
  const mInfo = missionMgr.getHudInfo();
  const wanted = policeMgr.getState();
  return {
    player: player.state,
    weapon: player.currentWeapon(),
    wanted,
    vehicles: vehicleMgr.vehicles,
    enemies: combatMgr.enemies,
    objectiveTag: mInfo.tag,
    objectiveText: mInfo.text,
    objectivePos: mInfo.pos,
    prompt: currentPrompt,
  };
}

function triggerEndOverlay(kind) {
  mode = 'overlay';
  if (document.pointerLockElement) document.exitPointerLock?.();

  if (kind === 'wasted') {
    missionMgr.failMission('MATEO INCAPACITATED');
    hud.showOverlay({
      kicker: 'SOLANA GENERAL HOSPITAL',
      title: 'WASTED',
      desc: 'Medics patched you up at Solana General. Hospital bill: $100. Your weapons and progress remain intact.',
      stats: getStatsSummary(),
      primaryLabel: 'RESPAWN AT HOSPITAL',
      onPrimary: () => {
        policeMgr.clearWanted();
        player.respawn('wasted');
        hud.hideOverlay();
        mode = 'play';
        hud.showGameplay();
      },
      secondaryLabel: 'TITLE SCREEN',
      onSecondary: () => {
        hud.hideOverlay();
        mode = 'title';
        hud.showTitle(!!loadCareer());
      },
    });
  } else if (kind === 'busted') {
    missionMgr.failMission('ARRESTED BY SBPD');
    hud.showOverlay({
      kicker: 'SBPD CENTRAL PRECINCT',
      title: 'BUSTED',
      desc: 'Solana Bay Police booked you at Central Precinct. Bail posted: $100. Stay sharp out there.',
      stats: getStatsSummary(),
      primaryLabel: 'WALK OUT ON BAIL',
      onPrimary: () => {
        policeMgr.clearWanted();
        player.respawn('busted');
        hud.hideOverlay();
        mode = 'play';
        hud.showGameplay();
      },
      secondaryLabel: 'TITLE SCREEN',
      onSecondary: () => {
        hud.hideOverlay();
        mode = 'title';
        hud.showTitle(!!loadCareer());
      },
    });
  } else if (kind === 'victory') {
    saveCareer(player.state, missionMgr.getMissionIndex());
    hud.showOverlay({
      kicker: 'SOLANA BAY CAMPAIGN COMPLETE',
      title: 'KINGPIN OF THE COAST',
      desc: 'You took Miramar Strip, swept Puerto Verde Docks, outran a 4-star dragnet, and claimed the Solana Bay Score.',
      stats: getStatsSummary(),
      primaryLabel: 'KEEP PLAYING (FREE ROAM)',
      onPrimary: () => {
        hud.hideOverlay();
        mode = 'play';
        hud.showGameplay();
      },
      secondaryLabel: 'TITLE SCREEN',
      onSecondary: () => {
        hud.hideOverlay();
        mode = 'title';
        hud.showTitle(true);
      },
    });
  }
}

// Handle vehicle entering/stealing, exiting, garage respray & armory purchases
function handleInteract() {
  const p = player.state;
  if (p.dead || p.busted) return;

  // Priority: contextual landmark interaction (Garage / Armory)
  if (currentInteractAction) {
    currentInteractAction();
    return;
  }

  // Exit current vehicle
  if (p.vehicle) {
    const v = p.vehicle;
    v.driver = null;
    p.vehicle = null;
    const sideX = Math.cos(v.yaw) * (v.spec.width * 0.65 + 0.9);
    const sideZ = -Math.sin(v.yaw) * (v.spec.width * 0.65 + 0.9);
    const safe = city.resolveCircleCollision(v.x + sideX, v.z + sideZ, 0.55);
    p.x = safe.x;
    p.z = safe.z;
    p.y = city.getGroundHeight(p.x, p.z);
    p.vx = 0;
    p.vz = 0;
    p.mesh.visible = true;
    return;
  }

  // Steal / enter nearest vehicle
  const near = vehicleMgr.findNearestVehicle(p.x, p.z, 5.2);
  if (near) {
    const wasOccupied = near.driver === 'ai' || near.driver === 'police';
    near.driver = 'player';
    near.sirenOn = near.isPolice;
    p.vehicle = near;
    p.mesh.visible = false;
    p.stats.carsStolen++;
    audio.playHorn();
    hud.toast(`DRIVING ${near.spec.name}`);
    if (wasOccupied) {
      policeMgr.addHeat(near.isPolice ? 120 : 45, near.isPolice ? 2 : 1, audio, hud);
      pedMgr.scareAround(near.x, near.z, 18);
    }
  }
}

function updateContextPrompts() {
  const p = player.state;
  currentPrompt = null;
  currentInteractAction = null;

  // Coral Garage respray bay (works inside car: repair + repaint + clear wanted!)
  const dGarage = Math.hypot(p.x - LANDMARKS.coralGarage.entryX, p.z - LANDMARKS.coralGarage.entryZ);
  if (p.vehicle && dGarage < 9.5) {
    currentPrompt = '[F] CORAL GARAGE — REPAIR, RESPRAY & CLEAR WANTED ($200)';
    currentInteractAction = () => {
      if (p.cash < 200) {
        hud.toast('NEED $200 FOR RESPRAY');
        return;
      }
      player.addCash(-200);
      vehicleMgr.repaintVehicle(p.vehicle);
      policeMgr.clearWanted(hud, 'FRESH COAT — SBPD HEAT CLEARED!');
      audio.playPickup();
      fx.spawnSmoke(p.x, p.y + 1.0, p.z, 0x2ee6d6, 1.3);
      saveCareer(p, missionMgr.getMissionIndex());
    };
    return;
  }

  // Sunset Armory (on foot: buy armor, ammo & unlock weapons)
  const dArmory = Math.hypot(p.x - LANDMARKS.sunsetArmory.entryX, p.z - LANDMARKS.sunsetArmory.entryZ);
  if (!p.vehicle && dArmory < 8.5) {
    const needsSmg = !p.unlockedWeapons.includes('smg');
    const needsShotgun = !p.unlockedWeapons.includes('shotgun');
    if (needsSmg) {
      currentPrompt = '[F] SUNSET ARMORY — BUY VIPER SMG + AMMO ($400)';
      currentInteractAction = () => {
        if (p.cash < 400) { hud.toast('NEED $400 FOR VIPER SMG'); return; }
        player.addCash(-400);
        player.unlockWeapon('smg', 160);
        player.selectWeapon(2);
        audio.playPickup();
        hud.toast('PURCHASED VIPER SMG!');
      };
    } else if (needsShotgun) {
      currentPrompt = '[F] SUNSET ARMORY — BUY RIPTIDE SHOTGUN ($700)';
      currentInteractAction = () => {
        if (p.cash < 700) { hud.toast('NEED $700 FOR RIPTIDE SHOTGUN'); return; }
        player.addCash(-700);
        player.unlockWeapon('shotgun', 30);
        player.selectWeapon(3);
        audio.playPickup();
        hud.toast('PURCHASED RIPTIDE SHOTGUN!');
      };
    } else {
      currentPrompt = '[F] SUNSET ARMORY — FULL ARMOR, HEALTH & AMMO ($250)';
      currentInteractAction = () => {
        if (p.cash < 250) { hud.toast('NEED $250 FOR RESUPPLY'); return; }
        player.addCash(-250);
        p.hp = p.maxHp;
        p.armor = p.maxArmor;
        p.ammo.pistol += 60;
        p.ammo.smg += 120;
        p.ammo.shotgun += 24;
        audio.playPickup();
        hud.toast('ARMOR & AMMO RESTOCKED!');
      };
    }
    return;
  }

  // Vehicle enter prompt
  if (!p.vehicle) {
    const near = vehicleMgr.findNearestVehicle(p.x, p.z, 5.2);
    if (near) {
      currentPrompt = `[F] ${near.driver ? 'HIJACK' : 'DRIVE'} ${near.spec.name}`;
    }
  }
}

// Event bindings
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', (e) => {
  input.keys[e.code] = true;
  audio.ensure();

  if (e.code === 'Escape' || e.code === 'KeyM') {
    if (mode === 'play') openPause();
    else if (mode === 'pause') resumeGame();
    return;
  }
  if (e.code === 'KeyV') {
    const on = audio.toggle();
    hud.toast(on ? 'AUDIO ON' : 'AUDIO MUTED');
  }
  if (mode !== 'play') return;

  if (e.code === 'KeyF' || e.code === 'KeyE') handleInteract();
  if (e.code === 'Digit1') player.selectWeapon(0);
  if (e.code === 'Digit2') player.selectWeapon(1);
  if (e.code === 'Digit3') player.selectWeapon(2);
  if (e.code === 'Digit4') player.selectWeapon(3);
  if (e.code === 'KeyR') {
    const w = player.currentWeapon();
    if (!w.melee && (player.state.ammo[w.id] || 0) > 0 && player.state.reloadTimer <= 0) {
      player.state.reloadTimer = 1.1;
      hud.toast(`RELOADING ${w.name}...`);
    }
  }
  if (e.code === 'KeyH' && player.state.vehicle) {
    audio.playHorn();
    if (player.state.vehicle.isPolice) {
      player.state.vehicle.sirenOn = !player.state.vehicle.sirenOn;
    }
  }
});

window.addEventListener('keyup', (e) => {
  input.keys[e.code] = false;
});

window.addEventListener('wheel', (e) => {
  if (mode !== 'play') return;
  const unlocked = player.state.unlockedWeapons;
  if (unlocked.length <= 1) return;
  const curId = player.currentWeapon().id;
  const idx = unlocked.indexOf(curId);
  const nextId = unlocked[(idx + (e.deltaY > 0 ? 1 : -1) + unlocked.length) % unlocked.length];
  const slotMap = { fists: 0, pistol: 1, smg: 2, shotgun: 3 };
  player.selectWeapon(slotMap[nextId] ?? 0);
});

canvas.addEventListener('mousedown', (e) => {
  audio.ensure();
  if (mode !== 'play') return;
  if (e.button === 0) {
    input.mouseLeft = true;
    input.dragging = true;
    input.lastMouseX = e.clientX;
    input.lastMouseY = e.clientY;
    combatMgr.tryPlayerFire(player, camera, city, vehicleMgr, pedMgr, policeMgr, fx, audio, hud);
    if (!document.pointerLockElement && canvas.requestPointerLock) {
      try {
        const res = canvas.requestPointerLock();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch { /* ignore */ }
    }
  }
  if (e.button === 2) input.mouseRight = true;
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) { input.mouseLeft = false; input.dragging = false; }
  if (e.button === 2) input.mouseRight = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousemove', (e) => {
  if (mode !== 'play') return;
  let dx = 0, dy = 0;
  if (document.pointerLockElement === canvas) {
    dx = e.movementX || 0;
    dy = e.movementY || 0;
  } else if (input.dragging) {
    dx = e.clientX - input.lastMouseX;
    dy = e.clientY - input.lastMouseY;
    input.lastMouseX = e.clientX;
    input.lastMouseY = e.clientY;
  } else {
    return;
  }
  player.state.camYaw -= dx * 0.0032;
  player.state.camPitch = clamp(player.state.camPitch + dy * 0.0028, -0.18, 0.88);
  input.mouseIdleTime = 0;
});

// Deterministic ?shot= staging for clean screenshots (start / play / end)
function configureShotMode() {
  if (shotMode === 'start') {
    mode = 'title';
    hud.showTitle(false);
    return;
  }
  if (shotMode === 'play') {
    // Stage an exciting coastal action scene: driving the ruby Solara GT down Miramar Strip with a 2-star chase
    const heroCar = vehicleMgr.vehicles[0];
    heroCar.driver = 'player';
    heroCar.x = 222;
    heroCar.z = 12;
    heroCar.yaw = Math.PI;
    heroCar.speed = 28;
    heroCar.vx = 0;
    heroCar.vz = -28;
    player.state.vehicle = heroCar;
    player.state.x = heroCar.x;
    player.state.z = heroCar.z;
    player.state.yaw = heroCar.yaw;
    player.state.camYaw = 0.08;
    player.state.camPitch = 0.21;
    player.state.camPos.set(heroCar.x + 1.5, 4.4, heroCar.z + 9.2);
    player.state.cash = 2450;
    player.unlockWeapon('smg', 140);
    player.selectWeapon(2);
    policeMgr.addHeat(120, 2, null, null);
    const copCar = vehicleMgr.spawnVehicle('interceptor', 216, 32, Math.PI - 0.12, {
      driver: 'police',
      sirenOn: true,
    });
    policeMgr.units.push(copCar);
    mode = 'play';
    hud.showGameplay();
    hud.showDialogue('RICO VEGA', 'SBPD on your bumper! Cut left toward Palma Centro and lose them at Coral Garage!', 12);
    input.keys.KeyW = true;
    setTimeout(() => { input.keys.KeyW = false; }, 1600);
    return;
  }
  if (shotMode === 'end') {
    player.state.cash = 9850;
    player.state.stats = {
      missionsCompleted: 6,
      carsStolen: 14,
      enemiesDefeated: 29,
      stuntsDone: 4,
      totalEarned: 11400,
    };
    missionMgr.setMissionIndex(6);
    triggerEndOverlay('victory');
    return;
  }
  // Normal interactive launch
  mode = 'title';
  hud.showTitle(!!savedData);
}

configureShotMode();

// Main simulation loop
let lastTime = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  elapsed += dt;
  input.mouseIdleTime += dt;

  city.update(elapsed);

  if (mode === 'title') {
    // Showcase cover view looking down palm-lined Miramar Strip with ruby Solara GT & neon hotels
    const sway = Math.sin(elapsed * 0.22) * 0.14;
    camera.position.set(228.5 + sway * 10, 4.6, -21.5);
    camera.lookAt(210, 5.2, -92);
    vehicleMgr.update(dt * 0.35, elapsed, { keys: {} }, city, player.state, fx, null);
    pedMgr.update(dt * 0.6, city, vehicleMgr.vehicles, player.state, fx);
  } else if (mode === 'play') {
    // Auto-fire for automatic weapons (SMG)
    if (input.mouseLeft && player.currentWeapon().auto) {
      combatMgr.tryPlayerFire(player, camera, city, vehicleMgr, pedMgr, policeMgr, fx, audio, hud);
    }

    vehicleMgr.update(dt, elapsed, input, city, player.state, fx, audio, {
      onStunt: (airTime) => {
        const bonus = Math.round(airTime * 250);
        player.addCash(bonus);
        player.state.stats.stuntsDone++;
        audio.playPickup();
        hud.toast(`INSANE STUNT BONUS! +$${bonus}`);
      },
      onHitPoliceCar: () => policeMgr.addHeat(55, 1, audio, hud),
      onExplode: (v) => {
        if (v === player.state.vehicle) {
          player.takeDamage(120);
        }
      },
    });

    player.update(dt, input, city, camera);

    pedMgr.update(dt, city, vehicleMgr.vehicles, player.state, fx, {
      onPlayerHitPed: () => policeMgr.addHeat(45, 1, audio, hud),
    });

    policeMgr.update(dt, city, player, fx, audio, hud, () => {
      triggerEndOverlay('busted');
    });

    combatMgr.updateEnemies(dt, city, player, vehicleMgr, fx, audio);

    missionMgr.update(dt, elapsed, player, () => {
      triggerEndOverlay('victory');
    });

    fx.update(dt, player.state, (pk) => {
      audio.playPickup();
      if (pk.kind === 'med') {
        player.state.hp = Math.min(player.state.maxHp, player.state.hp + pk.value);
        hud.toast(`+${pk.value} HEALTH`);
      } else {
        player.addCash(pk.value);
        hud.toast(`+$${pk.value}`);
      }
    });

    updateContextPrompts();

    // Check player death
    if (player.state.dead) {
      triggerEndOverlay('wasted');
    }

    // Continuous engine & police siren audio
    const wState = policeMgr.getState();
    audio.updateContinuous(
      dt,
      !!player.state.vehicle,
      player.state.vehicle ? Math.abs(player.state.vehicle.speed) : 0,
      wState.hasSirens || !!(player.state.vehicle && player.state.vehicle.isPolice && player.state.vehicle.sirenOn)
    );

    // Keep shadow frustum centered near player
    sun.position.set(player.state.x + 170, 95, player.state.z - 145);
    sun.target.position.set(player.state.x, 0, player.state.z);

    // Periodic silent autosave every 15s (skip during screenshot mode)
    if (!shotMode) {
      autoSaveTimer += dt;
      if (autoSaveTimer >= 15) {
        autoSaveTimer = 0;
        saveCareer(player.state, missionMgr.getMissionIndex());
      }
    }

    hud.update(dt, city, buildHudSnapshot());
  } else if (mode === 'overlay') {
    // Gentle camera backdrop orbit behind victory/wasted card
    const a = elapsed * 0.16;
    camera.position.set(player.state.x + Math.sin(a) * 18, 9, player.state.z + Math.cos(a) * 18);
    camera.lookAt(player.state.x, 2, player.state.z);
    audio.updateContinuous(dt, false, 0, false);
  } else {
    audio.updateContinuous(dt, false, 0, false);
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(frame);
