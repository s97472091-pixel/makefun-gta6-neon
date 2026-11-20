// Solana Bay — Dense Readable HUD Renderer & Live Canvas Minimap
import { CURRENCY, ROAD_LINES, LANDMARKS, clamp } from './config.js';

export function createHudSystem() {
  const el = {
    root: document.getElementById('hud'),
    minimap: document.getElementById('minimap-canvas'),
    districtName: document.getElementById('hud-district-name'),
    districtStanding: document.getElementById('hud-district-standing'),
    healthBar: document.getElementById('hud-health-bar'),
    healthVal: document.getElementById('hud-health-val'),
    armorBar: document.getElementById('hud-armor-bar'),
    armorVal: document.getElementById('hud-armor-val'),
    wantedStars: document.getElementById('hud-wanted-stars'),
    wantedSub: document.getElementById('hud-wanted-sub'),
    cash: document.getElementById('hud-cash'),
    clock: document.getElementById('hud-clock'),
    rankTitle: document.getElementById('hud-rank-title'),
    rankRp: document.getElementById('hud-rank-rp'),
    rankBar: document.getElementById('hud-rank-bar'),
    missionPanel: document.getElementById('hud-mission-panel'),
    missionHeader: document.getElementById('hud-mission-header'),
    missionStage: document.getElementById('hud-mission-stage'),
    missionObjective: document.getElementById('hud-mission-objective'),
    missionNext: document.getElementById('hud-mission-next'),
    dispatchPanel: document.getElementById('hud-dispatch-panel'),
    dispatchCode: document.getElementById('hud-dispatch-code'),
    dispatchAir: document.getElementById('hud-dispatch-air'),
    dispatchUnits: document.getElementById('hud-dispatch-units'),
    dispatchLogs: document.getElementById('hud-dispatch-logs'),
    weaponSlots: document.getElementById('hud-weapon-slots'),
    crewPanel: document.getElementById('hud-crew-panel'),
    vehiclePanel: document.getElementById('hud-vehicle-panel'),
    speedVal: document.getElementById('hud-speed-val'),
    vehicleName: document.getElementById('hud-vehicle-name'),
    vehicleCondBar: document.getElementById('hud-vehicle-cond-bar'),
    radioCode: document.getElementById('hud-radio-code'),
    radioTrack: document.getElementById('hud-radio-track'),
    racePanel: document.getElementById('hud-race-panel'),
    racePos: document.getElementById('hud-race-pos'),
    raceCp: document.getElementById('hud-race-cp'),
    raceTime: document.getElementById('hud-race-time'),
    dialogueBox: document.getElementById('hud-dialogue'),
    dialoguePortrait: document.getElementById('hud-dialogue-portrait'),
    dialogueSpeaker: document.getElementById('hud-dialogue-speaker'),
    dialogueText: document.getElementById('hud-dialogue-text'),
    toastFeed: document.getElementById('hud-toast-feed'),
    crosshair: document.getElementById('hud-crosshair'),
    speedLines: document.getElementById('hud-speedlines'),
    interactHint: document.getElementById('hud-interact-hint'),
    overlay: document.getElementById('state-overlay'),
    overlayTitle: document.getElementById('overlay-title'),
    overlaySub: document.getElementById('overlay-sub'),
    overlayBtn: document.getElementById('overlay-btn'),
  };

  const mapCtx = el.minimap ? el.minimap.getContext('2d') : null;
  const toasts = [];
  let lastWeaponSig = '';
  let lastCrewSig = '';

  function setVisible(visible) {
    if (el.root) el.root.classList.toggle('hidden', !visible);
  }

  function pushToast(text, duration = 4.2) {
    toasts.unshift({ text, timer: duration });
    if (toasts.length > 4) toasts.length = 4;
    renderToasts();
  }

  function renderToasts() {
    if (!el.toastFeed) return;
    el.toastFeed.innerHTML = toasts
      .map((t) => `<div class="hud-toast">${escapeHtml(t.text)}</div>`)
      .join('');
  }

  function showOverlay(kind, title, sub, buttonText = 'CONTINUE') {
    if (!el.overlay) return;
    el.overlay.className = `state-overlay ${kind}`;
    if (el.overlayTitle) el.overlayTitle.textContent = title;
    if (el.overlaySub) el.overlaySub.textContent = sub;
    if (el.overlayBtn) el.overlayBtn.textContent = buttonText;
  }

  function hideOverlay() {
    if (el.overlay) el.overlay.className = 'state-overlay hidden';
  }

  function renderMinimap(data) {
    if (!mapCtx || !el.minimap) return;
    const w = el.minimap.width;
    const h = el.minimap.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const scale = 0.62; // px per world meter
    const px = data.player.x;
    const pz = data.player.z;

    mapCtx.clearRect(0, 0, w, h);

    // Base land fill
    mapCtx.fillStyle = '#182230';
    mapCtx.fillRect(0, 0, w, h);

    // Beach & Ocean region south of z=204
    const sandY = cy + (204 - pz) * scale;
    const oceanY = cy + (248 - pz) * scale;
    if (sandY < h) {
      mapCtx.fillStyle = '#5c4b32';
      mapCtx.fillRect(0, Math.max(0, sandY), w, h - Math.max(0, sandY));
    }
    if (oceanY < h) {
      mapCtx.fillStyle = '#0c4a6e';
      mapCtx.fillRect(0, Math.max(0, oceanY), w, h - Math.max(0, oceanY));
    }

    // Pasar Senja plaza highlight
    const pmx = cx + (90 - px) * scale;
    const pmz = cy + (30 - pz) * scale;
    mapCtx.fillStyle = 'rgba(255, 77, 109, 0.25)';
    mapCtx.fillRect(pmx - 14, pmz - 14, 28, 28);

    // City road grid
    mapCtx.strokeStyle = '#475569';
    mapCtx.lineWidth = 5;
    for (const r of ROAD_LINES) {
      const rx = cx + (r - px) * scale;
      mapCtx.beginPath();
      mapCtx.moveTo(rx, cy + (-185 - pz) * scale);
      mapCtx.lineTo(rx, cy + (185 - pz) * scale);
      mapCtx.stroke();

      const rz = cy + (r - pz) * scale;
      mapCtx.beginPath();
      mapCtx.moveTo(cx + (-185 - px) * scale, rz);
      mapCtx.lineTo(cx + (185 - px) * scale, rz);
      mapCtx.stroke();
    }

    // Marina pier
    mapCtx.fillStyle = '#92400e';
    mapCtx.fillRect(cx + (-66 - px) * scale, cy + (202 - pz) * scale, 12 * scale, 92 * scale);

    // Landmarks (garage / armory)
    for (const lm of LANDMARKS) {
      if (lm.type !== 'garage' && lm.type !== 'armory') continue;
      const lx = cx + (lm.x - px) * scale;
      const lz = cy + (lm.z - pz) * scale;
      if (lx < 4 || lx > w - 4 || lz < 4 || lz > h - 4) continue;
      mapCtx.fillStyle = lm.type === 'garage' ? '#38bdf8' : '#fb923c';
      mapCtx.fillRect(lx - 3, lz - 3, 6, 6);
    }

    // Hostile gang blips
    if (data.hostiles) {
      mapCtx.fillStyle = '#f43f5e';
      for (const hst of data.hostiles) {
        if (!hst.alive) continue;
        const hx = clamp(cx + (hst.x - px) * scale, 6, w - 6);
        const hz = clamp(cy + (hst.z - pz) * scale, 6, h - 6);
        mapCtx.beginPath();
        mapCtx.arc(hx, hz, 3.2, 0, Math.PI * 2);
        mapCtx.fill();
      }
    }

    // Police units (flashing blue/red)
    const blinkRed = Math.floor(performance.now() / 220) % 2 === 0;
    const showAllPolice = data.radarReveal || data.wantedStars > 0;
    if (showAllPolice && data.police) {
      for (const c of data.police.cruisers) {
        if (c.vehicle.destroyed) continue;
        const ux = clamp(cx + (c.vehicle.x - px) * scale, 6, w - 6);
        const uz = clamp(cy + (c.vehicle.z - pz) * scale, 6, h - 6);
        mapCtx.fillStyle = blinkRed ? '#ef4444' : '#3b82f6';
        mapCtx.beginPath();
        mapCtx.arc(ux, uz, 4, 0, Math.PI * 2);
        mapCtx.fill();
      }
      for (const o of data.police.officers) {
        if (!o.alive) continue;
        const ux = clamp(cx + (o.x - px) * scale, 6, w - 6);
        const uz = clamp(cy + (o.z - pz) * scale, 6, h - 6);
        mapCtx.fillStyle = '#60a5fa';
        mapCtx.beginPath();
        mapCtx.arc(ux, uz, 2.8, 0, Math.PI * 2);
        mapCtx.fill();
      }
      if (data.police.helicopter && data.police.helicopter.active) {
        const hx = clamp(cx + (data.police.helicopter.x - px) * scale, 8, w - 8);
        const hz = clamp(cy + (data.police.helicopter.z - pz) * scale, 8, h - 8);
        mapCtx.strokeStyle = '#fde047';
        mapCtx.lineWidth = 2;
        mapCtx.beginPath();
        mapCtx.moveTo(hx - 5, hz);
        mapCtx.lineTo(hx + 5, hz);
        mapCtx.moveTo(hx, hz - 5);
        mapCtx.lineTo(hx, hz + 5);
        mapCtx.stroke();
      }
    }

    // Mission objective beacon or race checkpoint
    const target = data.race?.target || data.mission?.target || data.waypoint;
    if (target) {
      const tx = clamp(cx + (target.x - px) * scale, 8, w - 8);
      const tz = clamp(cy + (target.z - pz) * scale, 8, h - 8);
      mapCtx.fillStyle = data.race ? '#38bdf8' : '#facc15';
      mapCtx.beginPath();
      mapCtx.arc(tx, tz, 5.2, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.strokeStyle = '#0f172a';
      mapCtx.lineWidth = 1.5;
      mapCtx.stroke();
    }

    // Player directional arrow at center
    mapCtx.save();
    mapCtx.translate(cx, cy);
    mapCtx.rotate(-data.player.yaw + Math.PI);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -6.5);
    mapCtx.lineTo(5, 5.5);
    mapCtx.lineTo(0, 2.8);
    mapCtx.lineTo(-5, 5.5);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();

    // North badge
    mapCtx.fillStyle = '#f8fafc';
    mapCtx.font = 'bold 10px sans-serif';
    mapCtx.fillText('N', cx - 3, 12);
  }

  function renderDispatchPanel(dispatch) {
    if (!el.dispatchPanel) return;
    if (!dispatch || !dispatch.active) {
      el.dispatchPanel.classList.add('hidden');
      return;
    }
    el.dispatchPanel.classList.remove('hidden');
    if (el.dispatchCode) el.dispatchCode.textContent = dispatch.code;
    if (el.dispatchAir) {
      el.dispatchAir.textContent = dispatch.airStatus;
      el.dispatchAir.classList.toggle('air-hot', dispatch.airStatus.includes('AIR-ONE'));
    }
    if (el.dispatchUnits) {
      el.dispatchUnits.innerHTML = dispatch.units
        .map(
          (u) =>
            `<div class="dispatch-unit">
              <span class="du-call">${escapeHtml(u.callsign)}</span>
              <span class="du-role role-${u.role.toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(u.role)}</span>
              <span class="du-dist">${u.distance}m</span>
            </div>`
        )
        .join('');
    }
    if (el.dispatchLogs) {
      el.dispatchLogs.innerHTML = dispatch.logs
        .map((l) => `<div class="dispatch-log prio-${l.priority}">▸ ${escapeHtml(l.text)}</div>`)
        .join('');
    }
  }

  function update(dt, data) {
    // Update toast expiry
    let toastDirty = false;
    for (let i = toasts.length - 1; i >= 0; i--) {
      toasts[i].timer -= dt;
      if (toasts[i].timer <= 0) {
        toasts.splice(i, 1);
        toastDirty = true;
      }
    }
    if (toastDirty) renderToasts();

    // District + Standing
    if (data.district) {
      if (el.districtName) el.districtName.textContent = data.district.name.toUpperCase();
      if (el.districtStanding) {
        el.districtStanding.textContent = `${data.district.tierLabel} · ${data.district.standing}`;
        el.districtStanding.style.color = data.district.tierColor;
      }
    }

    // Health & Armor
    const hpPct = Math.round((data.player.health / data.player.maxHealth) * 100);
    const armPct = Math.round((data.player.armor / data.player.maxArmor) * 100);
    if (el.healthBar) el.healthBar.style.width = `${hpPct}%`;
    if (el.healthVal) el.healthVal.textContent = `${Math.ceil(data.player.health)}`;
    if (el.armorBar) el.armorBar.style.width = `${armPct}%`;
    if (el.armorVal) el.armorVal.textContent = `${Math.ceil(data.player.armor)}`;

    // Cash & Clock
    if (el.cash) el.cash.textContent = `${CURRENCY}${data.player.cash.toLocaleString()}`;
    if (el.clock) el.clock.textContent = data.clock;

    // Rank & RP bar
    if (data.rank) {
      if (el.rankTitle) el.rankTitle.textContent = `LVL ${data.rank.level} · ${data.rank.title}`;
      if (el.rankRp) el.rankRp.textContent = `${data.rank.rp} RP`;
      if (el.rankBar) el.rankBar.style.width = `${Math.round(data.rank.progress * 100)}%`;
    }

    // Wanted Stars
    if (el.wantedStars) {
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        starsHtml += `<span class="star ${i <= data.wantedStars ? 'lit' : ''}">★</span>`;
      }
      el.wantedStars.innerHTML = starsHtml;
    }
    if (el.wantedSub) {
      if (data.wantedStars > 0) {
        if (data.dispatch && data.dispatch.bustProgress > 0.05) {
          el.wantedSub.textContent = `BUSTING ${Math.round(data.dispatch.bustProgress * 100)}%`;
          el.wantedSub.className = 'wanted-sub hot';
        } else if (data.dispatch && !data.dispatch.spotted) {
          el.wantedSub.textContent = `EVADING · ${Math.ceil(data.dispatch.evadeTimer)}s`;
          el.wantedSub.className = 'wanted-sub cool';
        } else {
          el.wantedSub.textContent = `SBPD PURSUIT · ${data.wantedStars}★`;
          el.wantedSub.className = 'wanted-sub hot';
        }
      } else {
        el.wantedSub.textContent = '';
        el.wantedSub.className = 'wanted-sub';
      }
    }

    // Mission Stage Panel
    if (data.mission && el.missionPanel) {
      if (data.mission.freeRoam) {
        el.missionHeader.textContent = 'FREE ROAM · SOLANA BAY';
        el.missionStage.textContent = 'OPEN WORLD';
      } else {
        el.missionHeader.textContent = `MISSION ${data.mission.missionId} · ${data.mission.name}`;
        el.missionStage.textContent = `${data.mission.act} · STAGE ${data.mission.stageNum}/${data.mission.stageTotal}`;
      }
      const distTxt = data.mission.distance !== null ? ` (${data.mission.distance}m)` : '';
      el.missionObjective.textContent = `${data.mission.objective}${distTxt}`;
      el.missionNext.textContent = `NEXT: ${data.mission.nextHint}`;
    }

    // Dispatch Panel
    renderDispatchPanel(data.dispatch);

    // Weapon Slots Strip
    if (data.weapons && el.weaponSlots) {
      const sig = data.weapons.slots
        .map((s) => `${s.slot}:${s.unlocked ? 1 : 0}:${s.active ? 1 : 0}:${s.mag}/${s.reserve}`)
        .join('|') + (data.weapons.reloading ? ':R' : '');
      if (sig !== lastWeaponSig) {
        lastWeaponSig = sig;
        el.weaponSlots.innerHTML = data.weapons.slots
          .map((s) => {
            const ammoStr =
              s.kind === 'melee'
                ? 'MELEE'
                : data.weapons.reloading && s.active
                ? 'RELOAD'
                : `${s.mag}/${s.reserve}`;
            return `<div class="weapon-slot ${s.active ? 'active' : ''} ${s.unlocked ? '' : 'locked'}">
              <span class="ws-num">${s.slot}</span>
              <span class="ws-name">${s.shortName}</span>
              <span class="ws-ammo">${s.unlocked ? ammoStr : 'LOCKED'}</span>
            </div>`;
          })
          .join('');
      }
    }

    // Crew Ability Panel with procedural portraits
    if (data.crew && el.crewPanel) {
      const sig = data.crew
        .map((c) => `${c.id}:${c.recruited ? 1 : 0}:${Math.ceil(c.cooldownRemaining)}:${Math.ceil(c.activeTimer)}`)
        .join('|');
      if (sig !== lastCrewSig) {
        lastCrewSig = sig;
        el.crewPanel.innerHTML = data.crew
          .map((c) => {
            const status = !c.recruited
              ? 'LOCKED'
              : c.activeTimer > 0
              ? `ACTIVE ${Math.ceil(c.activeTimer)}s`
              : c.cooldownRemaining > 0
              ? `${Math.ceil(c.cooldownRemaining)}s`
              : 'READY';
            return `<div class="crew-card ${c.ready ? 'ready' : ''} ${c.recruited ? '' : 'locked'}">
              <img class="crew-portrait" src="${c.portrait}" alt="${escapeHtml(c.name)}">
              <div class="crew-meta">
                <div class="crew-top"><span class="crew-key">${c.key}</span> ${escapeHtml(c.abilityName)}</div>
                <div class="crew-sub">${escapeHtml(c.name.split(' ')[0])} · <span class="crew-status">${status}</span></div>
              </div>
            </div>`;
          })
          .join('');
      }
    }

    // Vehicle Speedometer, Condition & Radio
    if (el.vehiclePanel) {
      const v = data.player.vehicle;
      if (v) {
        el.vehiclePanel.classList.remove('hidden');
        const mph = Math.round(Math.abs(v.speed) * 3.1);
        if (el.speedVal) el.speedVal.textContent = `${mph}`;
        if (el.vehicleName) el.vehicleName.textContent = v.name.toUpperCase();
        const condPct = Math.round((v.hp / v.maxHp) * 100);
        if (el.vehicleCondBar) el.vehicleCondBar.style.width = `${condPct}%`;
        if (data.radio) {
          if (el.radioCode) {
            el.radioCode.textContent = `${data.radio.code} · ${data.radio.name}`;
            el.radioCode.style.color = data.radio.color;
          }
          if (el.radioTrack) el.radioTrack.textContent = `♪ ${data.radio.track} [Q]`;
        }
        if (el.speedLines) {
          el.speedLines.style.opacity = mph > 78 ? String(Math.min(0.45, (mph - 78) / 70)) : '0';
        }
      } else {
        el.vehiclePanel.classList.add('hidden');
        if (el.speedLines) el.speedLines.style.opacity = '0';
      }
    }

    // Race HUD
    if (el.racePanel) {
      if (data.race && data.race.active) {
        el.racePanel.classList.remove('hidden');
        if (el.racePos) el.racePos.textContent = `POS ${data.race.position}/${data.race.totalRacers}`;
        if (el.raceCp) el.raceCp.textContent = `CP ${data.race.checkpoint}/${data.race.totalCheckpoints}`;
        if (el.raceTime) el.raceTime.textContent = formatRaceTime(data.race.elapsed);
      } else {
        el.racePanel.classList.add('hidden');
      }
    }

    // Dialogue Subtitle with Speaker Portrait
    if (el.dialogueBox) {
      if (data.dialogue) {
        el.dialogueBox.classList.remove('hidden');
        if (el.dialoguePortrait && data.dialoguePortrait) {
          el.dialoguePortrait.src = data.dialoguePortrait;
        }
        if (el.dialogueSpeaker) el.dialogueSpeaker.textContent = data.dialogue.speaker.toUpperCase();
        if (el.dialogueText) el.dialogueText.textContent = data.dialogue.text;
      } else {
        el.dialogueBox.classList.add('hidden');
      }
    }

    // Crosshair & Interaction prompt
    if (el.crosshair) {
      el.crosshair.classList.toggle('hidden', Boolean(data.player.vehicle));
    }
    if (el.interactHint) {
      if (data.interactPrompt) {
        el.interactHint.textContent = data.interactPrompt;
        el.interactHint.classList.remove('hidden');
      } else {
        el.interactHint.classList.add('hidden');
      }
    }

    // Minimap
    renderMinimap(data);
  }

  return {
    setVisible,
    pushToast,
    showOverlay,
    hideOverlay,
    renderDispatchPanel,
    update,
  };
}

function formatRaceTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
