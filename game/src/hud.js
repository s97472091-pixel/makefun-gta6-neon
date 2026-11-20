// Solana Bay — Live canvas minimap, full-city pause map, GPS routing, wanted stars, speedometer, dialogue, toasts & overlays
import { CITY, LANDMARKS, getDistrictAt } from './config.js';

export function createHud(city) {
  const mapData = city.getMinimapData();

  const el = {
    hud: document.getElementById('hud'),
    titleScreen: document.getElementById('title-screen'),
    pauseScreen: document.getElementById('pause-screen'),
    overlayScreen: document.getElementById('overlay-screen'),
    crosshair: document.getElementById('crosshair'),
    damageVignette: document.getElementById('damage-vignette'),

    minimap: document.getElementById('minimap'),
    fullMap: document.getElementById('full-map'),
    districtPill: document.getElementById('district-pill'),

    objectiveBar: document.getElementById('objective-bar'),
    objectiveTag: document.getElementById('objective-tag'),
    objectiveText: document.getElementById('objective-text'),
    objectiveDist: document.getElementById('objective-dist'),

    wantedStars: Array.from(document.querySelectorAll('#wanted-stars .star')),
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

    pauseStats: document.getElementById('pause-stats'),
    overlayKicker: document.getElementById('overlay-kicker'),
    overlayTitle: document.getElementById('overlay-title'),
    overlayDesc: document.getElementById('overlay-desc'),
    overlayStats: document.getElementById('overlay-stats'),
    btnOverlayPrimary: document.getElementById('btn-overlay-primary'),
    btnOverlaySecondary: document.getElementById('btn-overlay-secondary'),
    status: document.getElementById('status'),
  };

  const mmCtx = el.minimap ? el.minimap.getContext('2d') : null;
  const fmCtx = el.fullMap ? el.fullMap.getContext('2d') : null;

  let dialogueTimer = 0;

  function setStatus(msg) {
    if (el.status) el.status.textContent = msg;
  }

  function showHud(visible) {
    if (el.hud) el.hud.classList.toggle('hidden', !visible);
  }

  function showTitle(visible) {
    if (el.titleScreen) el.titleScreen.classList.toggle('hidden', !visible);
  }

  function showPause(visible, player = null, missionState = null) {
    if (el.pauseScreen) el.pauseScreen.classList.toggle('hidden', !visible);
    if (visible && player && el.pauseStats) {
      el.pauseStats.innerHTML = buildStatsMarkup(player, missionState);
    }
  }

  function buildStatsMarkup(player, missionState) {
    const missionsDone = missionState ? missionState.completedCount : player.stats.missionsCompleted;
    const miles = (player.stats.distanceDriven / 1609).toFixed(1);
    return `
      <div class="stat-box"><span>CASH</span><strong>$${player.cash.toLocaleString()}</strong></div>
      <div class="stat-box"><span>MISSIONS</span><strong>${missionsDone} / 6</strong></div>
      <div class="stat-box"><span>TAKEDOWNS</span><strong>${player.stats.kills}</strong></div>
      <div class="stat-box"><span>CARS BOOSTED</span><strong>${player.stats.carsStolen}</strong></div>
      <div class="stat-box"><span>MILES DRIVEN</span><strong>${miles} MI</strong></div>
      <div class="stat-box"><span>PEAK HEAT</span><strong>${player.stats.maxWanted} &#9733;</strong></div>
    `;
  }

  function showOverlay({ kicker, title, desc, statsHtml = '', primaryLabel = 'CONTINUE', secondaryLabel = null, tone = 'gold' }) {
    if (!el.overlayScreen) return;
    el.overlayScreen.dataset.tone = tone;
    el.overlayKicker.textContent = kicker;
    el.overlayTitle.textContent = title;
    el.overlayDesc.textContent = desc;
    el.overlayStats.innerHTML = statsHtml;
    el.btnOverlayPrimary.textContent = primaryLabel;
    if (secondaryLabel) {
      el.btnOverlaySecondary.textContent = secondaryLabel;
      el.btnOverlaySecondary.classList.remove('hidden');
    } else {
      el.btnOverlaySecondary.classList.add('hidden');
    }
    el.overlayScreen.classList.remove('hidden');
  }

  function hideOverlay() {
    if (el.overlayScreen) el.overlayScreen.classList.add('hidden');
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

  function showToast(message, tone = 'gold') {
    if (!el.toastFeed) return;
    const item = document.createElement('div');
    item.className = `toast toast-${tone}`;
    item.textContent = message;
    el.toastFeed.appendChild(item);
    while (el.toastFeed.children.length > 4) {
      el.toastFeed.removeChild(el.toastFeed.firstChild);
    }
    setTimeout(() => {
      item.classList.add('fade-out');
      setTimeout(() => item.remove(), 350);
    }, 3400);
  }

  function setInteractPrompt(text) {
    if (!el.interactPrompt) return;
    if (!text) {
      el.interactPrompt.classList.add('hidden');
    } else {
      el.interactPrompt.textContent = text;
      el.interactPrompt.classList.remove('hidden');
    }
  }

  // Road-snapped GPS polyline from (px, pz) to (tx, tz)
  function computeGpsRoute(px, pz, tx, tz) {
    const snap = (v) => {
      let best = CITY.ROAD_COORDS[0];
      let bd = 9999;
      for (const rc of CITY.ROAD_COORDS) {
        const d = Math.abs(v - rc);
        if (d < bd) { bd = d; best = rc; }
      }
      return best;
    };
    const rpx = snap(px);
    const rpz = snap(pz);
    const rtx = snap(tx);
    const rtz = snap(tz);
    return [
      { x: px, z: pz },
      { x: rpx, z: pz },
      { x: rpx, z: rtz },
      { x: rtx, z: rtz },
      { x: tx, z: tz },
    ];
  }

  function drawCityMap(ctx, width, height, viewCenterX, viewCenterZ, scale, player, missionState, policeSys, combatSys, showLabels = false) {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    const toX = (wx) => width * 0.5 + (wx - viewCenterX) * scale;
    const toY = (wz) => height * 0.5 + (wz - viewCenterZ) * scale;

    // Ocean backdrop
    ctx.fillStyle = '#0d4e66';
    ctx.fillRect(0, 0, width, height);

    // City landmass
    const landLeft = toX(-210);
    const landRight = toX(mapData.beachMinX);
    const landTop = toY(-210);
    const landBot = toY(210);
    ctx.fillStyle = '#1b202b';
    ctx.fillRect(landLeft, landTop, landRight - landLeft, landBot - landTop);

    // Golden beach strip
    ctx.fillStyle = '#cfa96e';
    ctx.fillRect(toX(mapData.beachMinX), landTop, (mapData.oceanMinX - mapData.beachMinX) * scale, landBot - landTop);

    // Boardwalk strip
    ctx.fillStyle = '#8b6342';
    ctx.fillRect(toX(mapData.boardwalkMinX), landTop, (mapData.beachMinX - mapData.boardwalkMinX) * scale, landBot - landTop);

    // Coral Key Marina Pier
    const pier = mapData.pier;
    ctx.fillStyle = '#a4754b';
    ctx.fillRect(toX(pier.minX), toY(pier.minZ), (pier.maxX - pier.minX) * scale, (pier.maxZ - pier.minZ) * scale);

    // Road grid
    ctx.fillStyle = '#384152';
    const rw = mapData.roadWidth * scale;
    for (const rx of mapData.roads) {
      ctx.fillRect(toX(rx) - rw * 0.5, toY(-188), rw, 376 * scale);
    }
    for (const rz of mapData.roads) {
      ctx.fillRect(toX(-188), toY(rz) - rw * 0.5, 376 * scale, rw);
    }

    // Building footprints
    for (let i = 0; i < mapData.buildings.length; i++) {
      const b = mapData.buildings[i];
      ctx.fillStyle = b.style === 'glass' ? '#2c5870' : b.style === 'artdeco' ? '#584159' : b.style === 'stucco' ? '#594533' : '#3c3e45';
      ctx.fillRect(toX(b.x), toY(b.z), b.w * scale, b.d * scale);
    }

    // GPS Route polyline
    if (missionState && missionState.objectiveTarget) {
      const t = missionState.objectiveTarget;
      const pts = computeGpsRoute(player.pos.x, player.pos.z, t.x, t.z);
      ctx.strokeStyle = t.color || '#ffd166';
      ctx.lineWidth = showLabels ? 3 : 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const sx = toX(pts[i].x);
        const sy = toY(pts[i].z);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Landmarks (Respray Garage & Armory)
    const drawDot = (wx, wz, color, r = 4.5, ring = false) => {
      const sx = toX(wx);
      const sy = toY(wz);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      if (ring) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    drawDot(LANDMARKS.garage.x, LANDMARKS.garage.z, '#2ce6d2', showLabels ? 5.5 : 4.2, true);
    drawDot(LANDMARKS.armory.x, LANDMARKS.armory.z, '#ff9640', showLabels ? 5.5 : 4.2, true);

    // Hostile gang members
    if (combatSys) {
      for (const e of combatSys.gangMembers) {
        if (!e.alive) continue;
        drawDot(e.pos.x, e.pos.z, e.isBoss ? '#ff2e63' : '#ff5e9c', e.isBoss ? 5 : 3.2);
      }
    }

    // Pursuing police cruisers & officers
    if (policeSys && policeSys.state.stars > 0) {
      const flash = Math.floor(performance.now() / 180) % 2 === 0;
      const copCol = flash ? '#ff3355' : '#3399ff';
      for (const c of policeSys.cruisers) {
        drawDot(c.pos.x, c.pos.z, copCol, 4.2, true);
      }
      for (const o of policeSys.officers) {
        if (o.alive) drawDot(o.pos.x, o.pos.z, copCol, 3);
      }
    }

    // Mission beacon
    if (missionState && missionState.objectiveTarget) {
      const t = missionState.objectiveTarget;
      drawDot(t.x, t.z, t.color || '#ffd166', showLabels ? 6.5 : 5.2, true);
    }

    // District labels on full map
    if (showLabels) {
      ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fillText('PUERTO FERRO', toX(-105), toY(-115));
      ctx.fillText('ALBA FINANCIAL', toX(95), toY(-115));
      ctx.fillText('CALLE VERDE', toX(-105), toY(115));
      ctx.fillText('MIRAMAR STRIP', toX(95), toY(115));
      ctx.fillStyle = '#38e8ff';
      ctx.fillText('CORAL KEY', toX(240), toY(-24));
    }

    // Player directional triangle
    const px = toX(player.pos.x);
    const py = toY(player.pos.z);
    ctx.save();
    ctx.translate(px, py);
    // In Three.js, yaw=0 faces +Z (down on map), yaw=PI/2 faces +X (right on map)
    ctx.rotate(-player.yaw);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#09111a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 7.5);
    ctx.lineTo(-5.2, -5.5);
    ctx.lineTo(0, -2.5);
    ctx.lineTo(5.2, -5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function update(dt, time, playerCtrl, missionState, policeSys, combatSys, isPaused) {
    const player = playerCtrl.player;

    // Dialogue auto-hide
    if (dialogueTimer > 0) {
      dialogueTimer -= dt;
      if (dialogueTimer <= 0) hideDialogue();
    }

    // Damage vignette
    if (el.damageVignette) {
      const flash = Math.max(player.damageFlash, policeSys.state.bustProgress * 0.75);
      el.damageVignette.style.opacity = flash.toFixed(2);
    }

    // Crosshair
    if (el.crosshair) {
      const showCross = !player.dead && !player.busted && !isPaused && el.titleScreen.classList.contains('hidden');
      el.crosshair.classList.toggle('hidden', !showCross);
      el.crosshair.classList.toggle('aiming', player.aiming);
    }

    // District badge
    const dist = getDistrictAt(player.pos.x, player.pos.z);
    if (el.districtPill) {
      el.districtPill.textContent = dist.name;
      el.districtPill.style.borderColor = dist.accent;
    }

    // Objective bar
    if (el.objectiveBar) {
      el.objectiveBar.classList.remove('hidden');
      el.objectiveTag.textContent = missionState.active
        ? `MISSION ${missionState.currentIndex + 1} / 6`
        : missionState.freeRoam
          ? 'FREE ROAM'
          : `NEXT MISSION (${missionState.currentIndex + 1} / 6)`;
      el.objectiveText.textContent = missionState.objectiveText;
      if (missionState.objectiveTarget) {
        const meters = Math.round(Math.hypot(
          player.pos.x - missionState.objectiveTarget.x,
          player.pos.z - missionState.objectiveTarget.z
        ));
        el.objectiveDist.textContent = `${meters}m`;
      } else {
        el.objectiveDist.textContent = '';
      }
    }

    // Wanted stars & evade bar
    const stars = policeSys.state.stars;
    const flash = Math.floor(time * 7) % 2 === 0;
    for (let i = 0; i < el.wantedStars.length; i++) {
      const starEl = el.wantedStars[i];
      const active = i < stars;
      starEl.classList.toggle('active', active);
      starEl.classList.toggle('evading', active && !policeSys.state.spotted && flash);
    }
    if (el.evadeBar && el.evadeFill) {
      const showBar = stars > 0 && (!policeSys.state.spotted || policeSys.state.bustProgress > 0.05);
      el.evadeBar.classList.toggle('hidden', !showBar);
      if (policeSys.state.bustProgress > 0.05) {
        el.evadeFill.style.width = `${Math.round(policeSys.state.bustProgress * 100)}%`;
        el.evadeFill.style.background = '#ff3b5c';
      } else {
        el.evadeFill.style.width = `${Math.round(policeSys.state.evadeProgress * 100)}%`;
        el.evadeFill.style.background = '#38e8ff';
      }
    }

    // Cash, HP, Armor
    if (el.cashDisplay) el.cashDisplay.textContent = `$${player.cash.toLocaleString()}`;
    if (el.hpFill) el.hpFill.style.width = `${Math.max(0, Math.round((player.health / player.maxHealth) * 100))}%`;
    if (el.armorFill) el.armorFill.style.width = `${Math.max(0, Math.round((player.armor / player.maxArmor) * 100))}%`;

    // Weapon card
    const w = playerCtrl.getWeapon();
    const inv = playerCtrl.getWeaponState();
    if (el.weaponName) el.weaponName.textContent = w.name;
    if (el.weaponAmmo) {
      if (w.type === 'melee') el.weaponAmmo.textContent = 'MELEE';
      else if (player.reloadTimer > 0) el.weaponAmmo.textContent = 'RELOADING...';
      else el.weaponAmmo.textContent = `${inv.mag} / ${inv.reserve}`;
    }

    // Speedometer & Vehicle HUD
    if (el.vehicleHud) {
      if (player.vehicle) {
        el.vehicleHud.classList.remove('hidden');
        el.vehName.textContent = player.vehicle.spec.name.toUpperCase();
        const mph = Math.round(Math.abs(player.vehicle.speed) * 2.45);
        el.speedVal.textContent = String(mph);
        const pct = Math.max(0, Math.round((player.vehicle.hp / player.vehicle.maxHp) * 100));
        el.vehHpFill.style.width = `${pct}%`;
        el.vehHpFill.style.background = pct < 35 ? '#ff3b5c' : pct < 65 ? '#ffd166' : '#2ce6d2';
      } else {
        el.vehicleHud.classList.add('hidden');
      }
    }

    // Live minimap (zoomed around player)
    if (mmCtx && el.minimap) {
      drawCityMap(
        mmCtx,
        el.minimap.width,
        el.minimap.height,
        player.pos.x,
        player.pos.z,
        0.76,
        player,
        missionState,
        policeSys,
        combatSys,
        false
      );
    }

    // Full city pause map when open
    if (isPaused && fmCtx && el.fullMap) {
      drawCityMap(
        fmCtx,
        el.fullMap.width,
        el.fullMap.height,
        32,
        0,
        0.62,
        player,
        missionState,
        policeSys,
        combatSys,
        true
      );
    }
  }

  return {
    el,
    setStatus,
    showHud,
    showTitle,
    showPause,
    showOverlay,
    hideOverlay,
    showDialogue,
    hideDialogue,
    showToast,
    setInteractPrompt,
    buildStatsMarkup,
    update,
  };
}
