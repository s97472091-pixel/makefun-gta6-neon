// Solana Bay — live minimap, full-city pause map, GPS route, HUD meters, subtitles, toasts & overlays.

import {
  CITY,
  ROAD_COORDS,
  BLOCK_COORDS,
  DISTRICTS,
  LANDMARKS,
  getDistrictAt,
  dist2D,
} from './config.js';

export function createHud() {
  const el = {
    hud: document.getElementById('hud'),
    crosshair: document.getElementById('crosshair'),
    damageVignette: document.getElementById('damage-vignette'),
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
    cashDisplay: document.getElementById('cash-display'),
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
    titleScreen: document.getElementById('title-screen'),
    pauseScreen: document.getElementById('pause-screen'),
    pauseStats: document.getElementById('pause-stats'),
    overlayScreen: document.getElementById('overlay-screen'),
    overlayKicker: document.getElementById('overlay-kicker'),
    overlayTitle: document.getElementById('overlay-title'),
    overlayDesc: document.getElementById('overlay-desc'),
    overlayStats: document.getElementById('overlay-stats'),
    btnOverlayPrimary: document.getElementById('btn-overlay-primary'),
    btnOverlaySecondary: document.getElementById('btn-overlay-secondary'),
    status: document.getElementById('status'),
  };

  const miniCtx = el.minimap ? el.minimap.getContext('2d') : null;
  const fullCtx = el.fullMap ? el.fullMap.getContext('2d') : null;
  const starSpans = el.wantedStars ? Array.from(el.wantedStars.querySelectorAll('.star')) : [];

  let dialogueTimer = 0;
  let toasts = [];
  let overlayAction = null;

  function showToast(text, tone = 'info') {
    if (!el.toastFeed) return;
    const item = document.createElement('div');
    item.className = `toast ${tone}`;
    item.textContent = text;
    el.toastFeed.appendChild(item);
    toasts.push({ node: item, life: 3.4 });
    while (toasts.length > 4) {
      const old = toasts.shift();
      old.node.remove();
    }
  }

  function showDialogue(speaker, text, duration = 6.5) {
    if (!el.dialogueBox) return;
    el.dialogueSpeaker.textContent = speaker;
    el.dialogueText.textContent = text;
    el.dialogueBox.classList.remove('hidden');
    dialogueTimer = duration;
  }

  function hideDialogue() {
    if (el.dialogueBox) el.dialogueBox.classList.add('hidden');
    dialogueTimer = 0;
  }

  function setStatus(text) {
    if (el.status) el.status.textContent = text;
  }

  function setHudVisible(visible) {
    if (el.hud) el.hud.classList.toggle('hidden', !visible);
  }

  function setTitleVisible(visible) {
    if (el.titleScreen) el.titleScreen.classList.toggle('hidden', !visible);
  }

  function setPauseVisible(visible, player, missions) {
    if (el.pauseScreen) el.pauseScreen.classList.toggle('hidden', !visible);
    if (visible && el.pauseStats && player) {
      const s = player.state.stats;
      el.pauseStats.innerHTML = [
        ['CASH', `$${Math.floor(player.state.cash)}`],
        ['MISSIONS', `${s.missionsDone} / 6`],
        ['CARS STOLEN', `${s.carsStolen}`],
        ['TAKEDOWNS', `${s.takedowns}`],
      ]
        .map(([k, v]) => `<div class="stat-box"><span>${k}</span><b>${v}</b></div>`)
        .join('');
    }
  }

  function showOverlay({ kicker, title, desc, stats = [], primaryLabel = 'CONTINUE', showSecondary = false, tone = '', onPrimary = null }) {
    if (!el.overlayScreen) return;
    el.overlayKicker.textContent = kicker;
    el.overlayTitle.textContent = title;
    el.overlayTitle.className = `overlay-title ${tone}`;
    el.overlayDesc.textContent = desc;
    el.overlayStats.innerHTML = stats
      .map(([k, v]) => `<div class="stat-box"><span>${k}</span><b>${v}</b></div>`)
      .join('');
    el.btnOverlayPrimary.textContent = primaryLabel;
    el.btnOverlaySecondary.classList.toggle('hidden', !showSecondary);
    overlayAction = onPrimary;
    el.overlayScreen.classList.remove('hidden');
  }

  function hideOverlay() {
    if (el.overlayScreen) el.overlayScreen.classList.add('hidden');
    overlayAction = null;
  }

  function triggerOverlayPrimary() {
    const fn = overlayAction;
    hideOverlay();
    if (fn) fn();
  }

  function drawCityMap(ctx, size, centerX, centerZ, scale, rotateYaw, player, vehicles, police, combat, objective) {
    ctx.save();
    ctx.clearRect(0, 0, size, size);

    // Ocean & city backdrop
    ctx.fillStyle = '#0d4c6b';
    ctx.fillRect(0, 0, size, size);

    const half = size * 0.5;
    ctx.translate(half, half);
    if (rotateYaw !== null) {
      // North-up when rotateYaw is null; heading-up when provided
      ctx.rotate(rotateYaw - Math.PI);
    }

    const toX = (wx) => (wx - centerX) * scale;
    const toY = (wz) => (wz - centerZ) * scale;

    // Land & beach bands
    ctx.fillStyle = '#1f2630';
    ctx.fillRect(
      toX(CITY.worldMinX),
      toY(CITY.worldMinZ),
      (CITY.boardwalkStart - CITY.worldMinX) * scale,
      (CITY.worldMaxZ - CITY.worldMinZ) * scale
    );
    ctx.fillStyle = '#a37b56';
    ctx.fillRect(
      toX(CITY.boardwalkStart),
      toY(-CITY.halfSpan),
      (CITY.boardwalkEnd - CITY.boardwalkStart) * scale,
      CITY.halfSpan * 2 * scale
    );
    ctx.fillStyle = '#d9be8b';
    ctx.fillRect(
      toX(CITY.beachStart),
      toY(CITY.worldMinZ),
      (CITY.beachEnd - CITY.beachStart) * scale,
      (CITY.worldMaxZ - CITY.worldMinZ) * scale
    );

    // Marina pier
    ctx.fillStyle = '#b48a62';
    ctx.fillRect(
      toX(CITY.pierStartX),
      toY(CITY.pierZ - CITY.pierHalfWidth),
      (CITY.pierEndX - CITY.pierStartX) * scale,
      CITY.pierHalfWidth * 2 * scale
    );

    // City blocks tinted by district
    for (const bx of BLOCK_COORDS) {
      for (const bz of BLOCK_COORDS) {
        const d = getDistrictAt(bx, bz);
        ctx.fillStyle = d.mapColor;
        const bs = CITY.blockSize * scale;
        ctx.fillRect(toX(bx - CITY.blockSize * 0.5), toY(bz - CITY.blockSize * 0.5), bs, bs);
      }
    }

    // Road grid lines
    ctx.strokeStyle = '#47505c';
    ctx.lineWidth = Math.max(2, CITY.roadWidth * scale * 0.65);
    const span = CITY.halfSpan;
    for (const r of ROAD_COORDS) {
      ctx.beginPath();
      ctx.moveTo(toX(r), toY(-span));
      ctx.lineTo(toX(r), toY(span));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(toX(-span), toY(r));
      ctx.lineTo(toX(span), toY(r));
      ctx.stroke();
    }

    // GPS L-shaped street route from player to objective
    const ps = player.state;
    if (objective) {
      const snap = (v) => ROAD_COORDS.reduce((best, r) => (Math.abs(r - v) < Math.abs(best - v) ? r : best), ROAD_COORDS[0]);
      const midX = snap(ps.x);
      const midZ = snap(objective.z);
      ctx.strokeStyle = '#ffbe0b';
      ctx.lineWidth = Math.max(2, 2.5 * scale * 1.4);
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(toX(ps.x), toY(ps.z));
      ctx.lineTo(toX(midX), toY(midZ));
      ctx.lineTo(toX(objective.x), toY(objective.z));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Landmarks: Respray & Armory
    const drawDot = (wx, wz, color, r = 4) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(toX(wx), toY(wz), r, 0, Math.PI * 2);
      ctx.fill();
    };
    drawDot(LANDMARKS.resprayGarage.x, LANDMARKS.resprayGarage.z, '#ffbe0b', 4.5);
    drawDot(LANDMARKS.armory.x, LANDMARKS.armory.z, '#ef476f', 4.5);

    // Hostiles
    for (const h of combat.hostiles) {
      if (h.alive) drawDot(h.x, h.z, '#ff4d6d', 3.5);
    }

    // Police cruisers & officers
    for (const c of police.cruisers) {
      drawDot(c.x, c.z, '#38bdf8', 4.2);
    }
    for (const o of police.officers) {
      if (o.alive) drawDot(o.x, o.z, '#60a5fa', 3);
    }

    // Mission objective pulsing blip
    if (objective) {
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(toX(objective.x), toY(objective.z), 6.5, 0, Math.PI * 2);
      ctx.stroke();
      drawDot(objective.x, objective.z, '#00f5d4', 3.5);
    }

    // Player directional triangle
    ctx.save();
    ctx.translate(toX(ps.x), toY(ps.z));
    ctx.rotate(-ps.yaw + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(4.6, 5.2);
    ctx.lineTo(-4.6, 5.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function update(dt, elapsed, player, vehicles, police, combat, missions, promptText = '') {
    const ps = player.state;

    // Toasts decay
    for (let i = toasts.length - 1; i >= 0; i--) {
      toasts[i].life -= dt;
      if (toasts[i].life <= 0) {
        toasts[i].node.remove();
        toasts.splice(i, 1);
      }
    }

    // Dialogue decay
    if (dialogueTimer > 0) {
      dialogueTimer -= dt;
      if (dialogueTimer <= 0) hideDialogue();
    }

    // Damage vignette
    if (el.damageVignette) {
      el.damageVignette.style.opacity = String(ps.damageFlash * 0.72);
    }

    // Crosshair
    if (el.crosshair) {
      const w = player.getWeapon();
      const showCross = !ps.dead && !ps.busted && (ps.camAiming || (!ps.vehicle && w.type !== 'melee'));
      el.crosshair.classList.toggle('hidden', !showCross);
    }

    // District badge
    if (el.districtPill) {
      el.districtPill.textContent = getDistrictAt(ps.x, ps.z).name;
    }

    // Cash, HP, Armor
    if (el.cashDisplay) el.cashDisplay.textContent = `$${Math.floor(ps.cash).toLocaleString()}`;
    if (el.hpFill) el.hpFill.style.width = `${Math.max(0, (ps.hp / ps.maxHp) * 100)}%`;
    if (el.armorFill) el.armorFill.style.width = `${Math.max(0, (ps.armor / ps.maxArmor) * 100)}%`;

    // Weapon readout
    const w = player.getWeapon();
    if (el.weaponName) el.weaponName.textContent = w.name;
    if (el.weaponAmmo) {
      if (w.type === 'melee') {
        el.weaponAmmo.textContent = 'MELEE';
      } else if (ps.reloadTimer > 0) {
        el.weaponAmmo.textContent = 'RELOADING...';
      } else {
        const a = ps.ammo[w.id];
        el.weaponAmmo.textContent = `${a.mag} / ${a.reserve}`;
      }
    }

    // Wanted stars & evade/bust bar
    const stars = police.state.stars;
    const flash = Math.floor(elapsed * 6) % 2 === 0;
    for (let i = 0; i < starSpans.length; i++) {
      const lit = i < stars;
      starSpans[i].classList.toggle('active', lit);
      starSpans[i].classList.toggle('flashing', lit && police.state.spotted && flash);
    }

    if (el.evadeBar && el.evadeFill) {
      const showBust = police.state.bustProgress > 0.05;
      const showEvade = stars > 0 && !police.state.spotted;
      el.evadeBar.classList.toggle('hidden', !(showBust || showEvade));
      if (showBust) {
        el.evadeFill.style.width = `${Math.min(100, police.state.bustProgress * 100)}%`;
        el.evadeFill.style.background = '#ff3b5c';
      } else if (showEvade) {
        el.evadeFill.style.width = `${Math.min(100, police.state.evadeProgress * 100)}%`;
        el.evadeFill.style.background = '#38bdf8';
      }
    }

    // Objective bar
    const m = missions.getCurrentMission();
    const step = missions.getCurrentStep();
    const objPt = missions.getObjectivePoint();
    if (el.objectiveBar) {
      if (m && step) {
        el.objectiveBar.classList.remove('hidden');
        el.objectiveTag.textContent = `MISSION ${m.id} / ${missions.MISSION_DEFS.length} — ${m.title}`;
        el.objectiveText.textContent = step.text;
        if (objPt) {
          const dist = Math.round(dist2D(ps.x, ps.z, objPt.x, objPt.z));
          el.objectiveDist.textContent = `${dist}m`;
        } else {
          el.objectiveDist.textContent = '';
        }
      } else {
        el.objectiveBar.classList.remove('hidden');
        el.objectiveTag.textContent = 'FREE ROAM — SOLANA BAY';
        el.objectiveText.textContent = 'Own the coast: explore, trigger 5-star chases, customize rides';
        el.objectiveDist.textContent = '';
      }
    }

    // Interact prompt
    if (el.interactPrompt) {
      if (promptText) {
        el.interactPrompt.textContent = promptText;
        el.interactPrompt.classList.remove('hidden');
      } else {
        el.interactPrompt.classList.add('hidden');
      }
    }

    // Vehicle HUD & Speedometer
    if (el.vehicleHud) {
      if (ps.vehicle) {
        el.vehicleHud.classList.remove('hidden');
        el.vehName.textContent = ps.vehicle.spec.name.toUpperCase();
        const mph = Math.round(Math.abs(ps.vehicle.speed) * 2.55);
        el.speedVal.textContent = String(mph);
        el.vehHpFill.style.width = `${Math.max(0, (ps.vehicle.hp / ps.vehicle.maxHp) * 100)}%`;
      } else {
        el.vehicleHud.classList.add('hidden');
      }
    }

    // Render live circular minimap
    if (miniCtx) {
      drawCityMap(miniCtx, el.minimap.width, ps.x, ps.z, 0.85, null, player, vehicles, police, combat, objPt);
    }

    // Render full-city map when pause modal is open
    if (fullCtx && el.pauseScreen && !el.pauseScreen.classList.contains('hidden')) {
      drawCityMap(fullCtx, el.fullMap.width, 32, 0, 0.72, null, player, vehicles, police, combat, objPt);
    }
  }

  return {
    el,
    showToast,
    showDialogue,
    hideDialogue,
    setStatus,
    setHudVisible,
    setTitleVisible,
    setPauseVisible,
    showOverlay,
    hideOverlay,
    triggerOverlayPrimary,
    update,
  };
}
