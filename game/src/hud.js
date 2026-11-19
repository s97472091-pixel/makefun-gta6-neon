// HUD controller: Canvas minimap, full pause map, wanted stars, status bars, dialogue & modals.
import { CITY, ROAD_COORDS, LANDMARKS, getDistrictAt } from './config.js';

export function createHud(callbacks) {
  const el = {
    hud: document.getElementById('hud'),
    titleScreen: document.getElementById('title-screen'),
    pauseScreen: document.getElementById('pause-screen'),
    overlayScreen: document.getElementById('overlay-screen'),
    crosshair: document.getElementById('crosshair'),
    vignette: document.getElementById('damage-vignette'),
    status: document.getElementById('status'),

    minimap: document.getElementById('minimap'),
    fullMap: document.getElementById('full-map'),
    districtPill: document.getElementById('district-pill'),

    objectiveBar: document.getElementById('objective-bar'),
    objectiveTag: document.getElementById('objective-tag'),
    objectiveText: document.getElementById('objective-text'),
    objectiveDist: document.getElementById('objective-dist'),

    wantedStars: document.getElementById('wanted-stars'),
    evadeBar: document.getElementById('evade-bar'),
    evadeFill: document.getElementById('evade-fill'),
    cash: document.getElementById('cash-display'),
    hpFill: document.getElementById('hp-fill'),
    armorFill: document.getElementById('armor-fill'),
    weaponName: document.getElementById('weapon-name'),
    weaponAmmo: document.getElementById('weapon-ammo'),

    interactPrompt: document.getElementById('interact-prompt'),
    dialogueBox: document.getElementById('dialogue-box'),
    dialogueSpeaker: document.getElementById('dialogue-speaker'),
    dialogueText: document.getElementById('dialogue-text'),
    toastFeed: document.getElementById('toast-feed'),

    vehicleHud: document.getElementById('vehicle-hud'),
    vehName: document.getElementById('veh-name'),
    speedVal: document.getElementById('speed-val'),
    vehHpFill: document.getElementById('veh-hp-fill'),

    btnPlay: document.getElementById('btn-play'),
    btnContinue: document.getElementById('btn-continue'),
    btnControls: document.getElementById('btn-controls'),
    btnResume: document.getElementById('btn-resume'),
    btnToggleAudio: document.getElementById('btn-toggle-audio'),
    btnSaveNow: document.getElementById('btn-save-now'),
    btnResetSave: document.getElementById('btn-reset-save'),
    pauseStats: document.getElementById('pause-stats'),

    overlayKicker: document.getElementById('overlay-kicker'),
    overlayTitle: document.getElementById('overlay-title'),
    overlayDesc: document.getElementById('overlay-desc'),
    overlayStats: document.getElementById('overlay-stats'),
    btnOverlayPrimary: document.getElementById('btn-overlay-primary'),
    btnOverlaySecondary: document.getElementById('btn-overlay-secondary'),
  };

  const miniCtx = el.minimap.getContext('2d');
  const fullCtx = el.fullMap.getContext('2d');
  let dialogueTimer = 0;
  let overlayPrimaryAction = null;
  let overlaySecondaryAction = null;
  let flashClock = 0;

  el.btnPlay.addEventListener('click', () => callbacks.onPlay?.(false));
  el.btnContinue.addEventListener('click', () => callbacks.onPlay?.(true));
  el.btnControls.addEventListener('click', () => callbacks.onOpenControls?.());
  el.btnResume.addEventListener('click', () => callbacks.onResume?.());
  el.btnToggleAudio.addEventListener('click', () => callbacks.onToggleAudio?.());
  el.btnSaveNow.addEventListener('click', () => callbacks.onSaveNow?.());
  el.btnResetSave.addEventListener('click', () => callbacks.onResetSave?.());
  el.btnOverlayPrimary.addEventListener('click', () => overlayPrimaryAction?.());
  el.btnOverlaySecondary.addEventListener('click', () => overlaySecondaryAction?.());

  function showTitle(hasSave) {
    el.titleScreen.classList.remove('hidden');
    el.hud.classList.add('hidden');
    el.pauseScreen.classList.add('hidden');
    el.overlayScreen.classList.add('hidden');
    el.crosshair.classList.add('hidden');
    el.btnContinue.classList.toggle('hidden', !hasSave);
  }

  function showGameplay() {
    el.titleScreen.classList.add('hidden');
    el.pauseScreen.classList.add('hidden');
    el.overlayScreen.classList.add('hidden');
    el.hud.classList.remove('hidden');
  }

  function showPause(statsObj, audioEnabled, city, worldSnap) {
    el.pauseScreen.classList.remove('hidden');
    el.crosshair.classList.add('hidden');
    el.btnToggleAudio.textContent = `AUDIO: ${audioEnabled ? 'ON' : 'OFF'}`;
    renderStats(el.pauseStats, statsObj);
    drawFullMap(city, worldSnap);
  }

  function hidePause() {
    el.pauseScreen.classList.add('hidden');
  }

  function showOverlay({ kicker, title, desc, stats = null, primaryLabel = 'CONTINUE', onPrimary, secondaryLabel = null, onSecondary = null }) {
    el.titleScreen.classList.add('hidden');
    el.pauseScreen.classList.add('hidden');
    el.overlayKicker.textContent = kicker;
    el.overlayTitle.textContent = title;
    el.overlayDesc.textContent = desc;
    renderStats(el.overlayStats, stats || {});
    el.overlayStats.classList.toggle('hidden', !stats);
    el.btnOverlayPrimary.textContent = primaryLabel;
    overlayPrimaryAction = onPrimary;
    if (secondaryLabel) {
      el.btnOverlaySecondary.textContent = secondaryLabel;
      el.btnOverlaySecondary.classList.remove('hidden');
      overlaySecondaryAction = onSecondary;
    } else {
      el.btnOverlaySecondary.classList.add('hidden');
      overlaySecondaryAction = null;
    }
    el.overlayScreen.classList.remove('hidden');
    el.crosshair.classList.add('hidden');
  }

  function hideOverlay() {
    el.overlayScreen.classList.add('hidden');
  }

  function renderStats(container, statsObj) {
    container.innerHTML = '';
    for (const [label, value] of Object.entries(statsObj)) {
      const cell = document.createElement('div');
      cell.className = 'stat-cell';
      cell.innerHTML = `<div class="stat-label">${label}</div><div class="stat-value">${value}</div>`;
      container.appendChild(cell);
    }
  }

  function showDialogue(speaker, text, duration = 6.5) {
    el.dialogueSpeaker.textContent = speaker.toUpperCase();
    el.dialogueText.textContent = text;
    el.dialogueBox.classList.remove('hidden');
    dialogueTimer = duration;
    el.status.textContent = `${speaker}: ${text}`;
  }

  function toast(msg, duration = 2.8) {
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = msg;
    el.toastFeed.appendChild(div);
    setTimeout(() => div.remove(), duration * 1000);
  }

  function drawMap(ctx, size, city, snap, centered) {
    ctx.clearRect(0, 0, size, size);
    ctx.save();

    const scale = centered ? 0.68 : size / 610;
    const cx = size * 0.5;
    const cy = size * 0.5;
    const px = snap.player.x;
    const pz = snap.player.z;

    const toX = (wx) => centered ? cx + (wx - px) * scale : cx + (wx - 20) * scale;
    const toY = (wz) => centered ? cy + (wz - pz) * scale : cy + wz * scale;

    // Water & beach background
    ctx.fillStyle = '#122038';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#146f85';
    ctx.fillRect(toX(282), 0, size, size);
    ctx.fillStyle = '#c4a878';
    ctx.fillRect(toX(234), 0, 50 * scale, size);

    // Roads
    ctx.fillStyle = '#363d4f';
    const rw = CITY.roadWidth * scale;
    const minCoord = ROAD_COORDS[0] - CITY.roadWidth * 0.5;
    const spanLen = (ROAD_COORDS[ROAD_COORDS.length - 1] - ROAD_COORDS[0] + CITY.roadWidth) * scale;
    for (const coord of ROAD_COORDS) {
      ctx.fillRect(toX(coord) - rw * 0.5, toY(minCoord), rw, spanLen);
      ctx.fillRect(toX(minCoord), toY(coord) - rw * 0.5, spanLen, rw);
    }

    // Pier
    ctx.fillStyle = '#8b6a48';
    ctx.fillRect(toX(241), toY(-8), 80 * scale, 16 * scale);

    // Buildings
    for (let i = 0; i < city.buildingRects.length; i++) {
      const b = city.buildingRects[i];
      ctx.fillStyle = b.color || '#6a7288';
      ctx.fillRect(toX(b.x), toY(b.z), b.w * scale, b.d * scale);
    }

    // Landmarks: Coral Garage & Sunset Armory
    ctx.fillStyle = '#2ee6d6';
    ctx.beginPath();
    ctx.arc(toX(LANDMARKS.coralGarage.entryX), toY(LANDMARKS.coralGarage.entryZ), centered ? 4.5 : 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff5e7e';
    ctx.beginPath();
    ctx.arc(toX(LANDMARKS.sunsetArmory.entryX), toY(LANDMARKS.sunsetArmory.entryZ), centered ? 4.5 : 5, 0, Math.PI * 2);
    ctx.fill();

    // Traffic blips
    if (snap.vehicles) {
      for (const v of snap.vehicles) {
        if (v === snap.player.vehicle) continue;
        ctx.fillStyle = v.isPolice ? (Math.sin(flashClock * 12) > 0 ? '#ff3b5c' : '#3aa8ff') : 'rgba(210,220,235,0.45)';
        ctx.beginPath();
        ctx.arc(toX(v.x), toY(v.z), v.isPolice ? 3.8 : 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hostile enemies
    if (snap.enemies) {
      ctx.fillStyle = '#ff3b5c';
      for (const e of snap.enemies) {
        if (e.dead) continue;
        ctx.beginPath();
        ctx.arc(toX(e.x), toY(e.z), 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Mission objective marker + GPS line
    if (snap.objectivePos) {
      const ox = toX(snap.objectivePos.x);
      const oy = toY(snap.objectivePos.z);
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.72)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(toX(px), toY(pz));
      ctx.lineTo(ox, oy);
      ctx.stroke();
      ctx.setLineDash([]);

      const pulse = 5.5 + Math.sin(flashClock * 6) * 1.8;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(ox, oy, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#140c1a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Player directional chevron
    const ptx = toX(px);
    const pty = toY(pz);
    ctx.translate(ptx, pty);
    // In Three.js: yaw=0 faces +Z (down on map), yaw=PI faces -Z (up on map)
    ctx.rotate(-snap.player.yaw + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0c0e1a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5.5, 5.5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5.5, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function drawFullMap(city, snap) {
    drawMap(fullCtx, el.fullMap.width, city, snap, false);
  }

  function update(dt, city, snap) {
    flashClock += dt;
    const p = snap.player;

    if (dialogueTimer > 0) {
      dialogueTimer -= dt;
      if (dialogueTimer <= 0) el.dialogueBox.classList.add('hidden');
    }

    // District badge
    const dist = getDistrictAt(p.x, p.z);
    el.districtPill.textContent = dist.name;

    // Cash & vitals
    el.cash.textContent = `$${Math.floor(p.cash).toLocaleString()}`;
    el.hpFill.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
    el.armorFill.style.width = `${Math.max(0, (p.armor / p.maxArmor) * 100)}%`;
    el.vignette.style.opacity = `${Math.min(0.85, p.damageFlash * 0.85)}`;

    // Weapon card
    const w = snap.weapon;
    el.weaponName.textContent = w.name;
    if (w.melee) {
      el.weaponAmmo.textContent = 'MELEE';
    } else if (p.reloadTimer > 0) {
      el.weaponAmmo.textContent = 'RELOADING...';
    } else {
      el.weaponAmmo.textContent = `${p.mag[w.id] || 0} / ${p.ammo[w.id] || 0}`;
    }

    // Crosshair visible when playing & armed or aiming
    const showCross = !el.hud.classList.contains('hidden') && el.pauseScreen.classList.contains('hidden') && el.overlayScreen.classList.contains('hidden') && (!p.vehicle || !w.melee);
    el.crosshair.classList.toggle('hidden', !showCross);

    // Wanted stars
    const stars = snap.wanted?.stars ?? 0;
    const evading = snap.wanted?.evading ?? false;
    const starEls = el.wantedStars.children;
    for (let i = 0; i < starEls.length; i++) {
      starEls[i].classList.toggle('active', i < stars);
    }
    el.wantedStars.classList.toggle('flashing', stars > 0 && !evading && Math.sin(flashClock * 10) > 0);
    el.wantedStars.classList.toggle('evading', stars > 0 && evading && Math.sin(flashClock * 6) > 0);
    el.evadeBar.classList.toggle('hidden', !(stars > 0 && evading));
    if (stars > 0 && evading) {
      el.evadeFill.style.width = `${Math.round((snap.wanted.evadeProgress || 0) * 100)}%`;
    }

    // Objective bar
    if (snap.objectiveText) {
      el.objectiveBar.classList.remove('hidden');
      el.objectiveTag.textContent = snap.objectiveTag || 'MISSION';
      el.objectiveText.textContent = snap.objectiveText;
      if (snap.objectivePos) {
        const d = Math.round(Math.hypot(snap.objectivePos.x - p.x, snap.objectivePos.z - p.z));
        el.objectiveDist.textContent = `${d}m`;
      } else {
        el.objectiveDist.textContent = '';
      }
    } else {
      el.objectiveBar.classList.add('hidden');
    }

    // Interact prompt
    if (snap.prompt) {
      el.interactPrompt.textContent = snap.prompt;
      el.interactPrompt.classList.remove('hidden');
    } else {
      el.interactPrompt.classList.add('hidden');
    }

    // Speedometer when driving
    if (p.vehicle) {
      el.vehicleHud.classList.remove('hidden');
      el.vehName.textContent = p.vehicle.spec.name;
      el.speedVal.textContent = `${Math.round(Math.abs(p.vehicle.speed) * 2.237)}`;
      el.vehHpFill.style.width = `${Math.max(0, (p.vehicle.hp / p.vehicle.spec.hp) * 100)}%`;
    } else {
      el.vehicleHud.classList.add('hidden');
    }

    // Minimap
    drawMap(miniCtx, el.minimap.width, city, snap, true);
  }

  return {
    el,
    showTitle,
    showGameplay,
    showPause,
    hidePause,
    showOverlay,
    hideOverlay,
    showDialogue,
    toast,
    update,
  };
}
