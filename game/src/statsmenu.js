// Solana Bay — Pause Menu (MAP / STORY / STATS / CREW / SETTINGS)
import { CURRENCY, DISTRICTS, ROAD_LINES, LANDMARKS } from './config.js';
import { STORY_MISSIONS } from './story.js';
import { computeCompletionPercent } from './save.js';

export function createStatsMenuSystem(callbacks = {}) {
  const root = document.getElementById('pause-menu');
  const tabsBar = document.getElementById('pause-tabs');
  const body = document.getElementById('pause-body');
  const resumeBtn = document.getElementById('pause-resume-btn');
  const titleBtn = document.getElementById('pause-title-btn');

  let activeTab = 'STATS';
  let lastSnapshot = null;

  if (tabsBar) {
    tabsBar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (!btn) return;
      activeTab = btn.dataset.tab;
      render();
    });
  }

  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      if (callbacks.onResume) callbacks.onResume();
    });
  }
  if (titleBtn) {
    titleBtn.addEventListener('click', () => {
      if (callbacks.onReturnTitle) callbacks.onReturnTitle();
    });
  }

  function open(snapshot, tab = 'STATS') {
    activeTab = tab;
    lastSnapshot = snapshot;
    if (root) root.classList.remove('hidden');
    render();
  }

  function close() {
    if (root) root.classList.add('hidden');
  }

  function setTab(tab) {
    activeTab = tab;
    render();
  }

  function render() {
    if (!root || !body || !lastSnapshot) return;

    // Highlight active tab button
    if (tabsBar) {
      for (const b of tabsBar.querySelectorAll('[data-tab]')) {
        b.classList.toggle('active', b.dataset.tab === activeTab);
      }
    }

    if (activeTab === 'STATS') renderStatsTab(lastSnapshot);
    else if (activeTab === 'MAP') renderMapTab(lastSnapshot);
    else if (activeTab === 'STORY') renderStoryTab(lastSnapshot);
    else if (activeTab === 'CREW') renderCrewTab(lastSnapshot);
    else if (activeTab === 'SETTINGS') renderSettingsTab(lastSnapshot);
  }

  function renderStatsTab(snap) {
    const missionsDone = snap.missionsCompleted;
    const racesWon = snap.racesWon;
    const collDone = snap.collectiblesFound;
    const crewCount = snap.crewRecruited;
    const friendlyCount = snap.districtsFriendly;
    const goldCount = Object.values(snap.missionRatings || {}).filter((r) => r === 'G').length;

    const pct =
      typeof snap.overrideCompletionPct === 'number'
        ? snap.overrideCompletionPct
        : computeCompletionPercent({
            missionsCompleted: missionsDone,
            racesWon,
            collectibles: collDone,
            crewRecruited: crewCount,
            districtsFriendly: friendlyCount,
            goldRatings: goldCount,
          });

    const radius = 44;
    const circ = 2 * Math.PI * radius;
    const dashOffset = circ * (1 - pct / 100);

    const ratingsHtml = STORY_MISSIONS.map((m) => {
      const r = snap.missionRatings?.[m.id] || '-';
      const cls = r === 'G' ? 'gold' : r === 'S' ? 'silver' : r === 'B' ? 'bronze' : 'none';
      return `<div class="rating-pill ${cls}">
        <span class="rp-id">M${m.id}</span>
        <span class="rp-name">${m.name}</span>
        <span class="rp-badge">${r}</span>
      </div>`;
    }).join('');

    const slotsHtml = (snap.saveSlots || [null, null, null])
      .map((slot, idx) => {
        if (!slot) {
          return `<div class="pause-slot empty">
            <div class="ps-head">SLOT ${idx + 1} · EMPTY</div>
            <div class="ps-meta">No career saved</div>
            <div class="ps-actions">
              <button class="mini-btn" data-save-slot="${idx}">SAVE HERE</button>
            </div>
          </div>`;
        }
        return `<div class="pause-slot filled">
          <div class="ps-head">SLOT ${idx + 1} · ${slot.act} <span class="ps-pct">${slot.completionPct}%</span></div>
          <div class="ps-meta">${slot.districtName} · ${slot.missionsDone}/${slot.missionsTotal} Missions · ${CURRENCY}${slot.cash.toLocaleString()} · ${slot.clock}</div>
          <div class="ps-actions">
            <button class="mini-btn" data-save-slot="${idx}">SAVE</button>
            <button class="mini-btn alt" data-load-slot="${idx}">LOAD</button>
          </div>
        </div>`;
      })
      .join('');

    body.innerHTML = `
      <div class="stats-layout">
        <div class="stats-col-left">
          <div class="panel-card completion-card">
            <div class="ring-wrap">
              <svg viewBox="0 0 108 108" class="completion-svg">
                <circle cx="54" cy="54" r="${radius}" class="ring-bg" />
                <circle cx="54" cy="54" r="${radius}" class="ring-fg"
                  stroke-dasharray="${circ.toFixed(1)}"
                  stroke-dashoffset="${dashOffset.toFixed(1)}" />
              </svg>
              <div class="ring-label">
                <div class="ring-pct">${pct}%</div>
                <div class="ring-sub">COMPLETE</div>
              </div>
            </div>
            <div class="checklist">
              <div class="check-row"><span>Story Missions</span><strong>${missionsDone} / 6</strong></div>
              <div class="check-row"><span>Street Races Won</span><strong>${racesWon} / 4</strong></div>
              <div class="check-row"><span>Golden Herons</span><strong>${collDone} / 20</strong></div>
              <div class="check-row"><span>Crew Recruited</span><strong>${crewCount} / 3</strong></div>
              <div class="check-row"><span>Districts Friendly</span><strong>${friendlyCount} / 5</strong></div>
              <div class="check-row"><span>Gold Mission Ratings</span><strong>${goldCount} / 6</strong></div>
            </div>
          </div>

          <div class="panel-card">
            <div class="card-title">MISSION RATINGS (G / S / B)</div>
            <div class="ratings-grid">${ratingsHtml}</div>
          </div>

          <div class="panel-card">
            <div class="card-title">CAREER STATS</div>
            <div class="career-grid">
              <div class="stat-box"><span>Cars Stolen</span><strong>${snap.careerStats.carsStolen}</strong></div>
              <div class="stat-box"><span>Cops Escaped</span><strong>${snap.careerStats.copsEscaped}</strong></div>
              <div class="stat-box"><span>Distance Driven</span><strong>${(snap.careerStats.distanceDriven / 1000).toFixed(1)} km</strong></div>
              <div class="stat-box"><span>People Taken Out</span><strong>${snap.careerStats.peopleTakenOut}</strong></div>
              <div class="stat-box"><span>Longest Jump</span><strong>${snap.careerStats.longestJump.toFixed(1)} m</strong></div>
              <div class="stat-box"><span>Current Rank</span><strong>${snap.rank.title} (${snap.rank.rp} RP)</strong></div>
            </div>
          </div>
        </div>

        <div class="stats-col-right">
          <div class="panel-card map-card">
            <div class="card-title">SOLANA BAY · DISTRICT STANDING MAP</div>
            <canvas id="pause-city-map" width="460" height="250"></canvas>
            <div class="district-pills">
              ${snap.districts
                .map(
                  (d) => `<div class="d-pill">
                    <span class="d-dot" style="background:${d.color}"></span>
                    <span class="d-name">${d.name}</span>
                    <span class="d-val" style="color:${d.tierColor}">${d.label} ${d.value}</span>
                  </div>`
                )
                .join('')}
            </div>
          </div>

          <div class="panel-card">
            <div class="card-title">SAVE SLOTS</div>
            <div class="pause-slots-grid">${slotsHtml}</div>
          </div>
        </div>
      </div>
    `;

    drawCityMapCanvas('pause-city-map', snap);
    bindSlotButtons();
  }

  function renderMapTab(snap) {
    body.innerHTML = `
      <div class="map-tab-layout">
        <div class="panel-card map-big-card">
          <div class="card-title">SOLANA BAY INTERACTIVE MAP — CLICK TO SET WAYPOINT</div>
          <canvas id="pause-full-map" width="760" height="440"></canvas>
        </div>
        <div class="panel-card map-legend-card">
          <div class="card-title">DISTRICTS & LANDMARKS</div>
          ${snap.districts
            .map(
              (d) => `<div class="legend-row">
                <span class="d-dot" style="background:${d.color}"></span>
                <div>
                  <div class="lr-name">${d.name}</div>
                  <div class="lr-sub">${d.subtitle}</div>
                </div>
                <strong style="color:${d.tierColor}">${d.label} (${d.value})</strong>
              </div>`
            )
            .join('')}
          <div class="card-title" style="margin-top:12px">KEY POINTS</div>
          <div class="legend-key">🟡 Active Mission Beacon · 🔵 Race Start · 🟦 Nori Respray · 🟧 Coral Armory</div>
        </div>
      </div>
    `;
    drawCityMapCanvas('pause-full-map', snap, true);
  }

  function renderStoryTab(snap) {
    body.innerHTML = `
      <div class="story-list">
        ${STORY_MISSIONS.map((m) => {
          const done = snap.completedMissionIds.includes(m.id);
          const active = snap.activeMissionId === m.id;
          const rating = snap.missionRatings?.[m.id] || '—';
          return `<div class="panel-card story-card ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}">
            <div class="sc-top">
              <span>${m.act} · MISSION ${m.id} · ${m.name}</span>
              <span class="sc-status">${done ? `COMPLETED [${rating}]` : active ? 'IN PROGRESS' : 'UPCOMING'}</span>
            </div>
            <div class="sc-meta">Contact: ${m.giver} · Reward: ${CURRENCY}${m.rewardCash} + ${m.rewardRp} RP · ${m.stages.length} Stages</div>
            <div class="sc-stages">
              ${m.stages.map((st) => `<div class="sc-stage">Stage ${st.index}: ${st.label}</div>`).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function renderCrewTab(snap) {
    body.innerHTML = `
      <div class="crew-tab-grid">
        ${snap.crew
          .map(
            (c) => `<div class="panel-card crew-bio-card ${c.recruited ? '' : 'locked'}">
              <img src="${c.portrait}" alt="${c.name}" class="crew-bio-img">
              <div class="cb-info">
                <div class="cb-name">${c.name} <span class="cb-key">[${c.key}]</span></div>
                <div class="cb-role">${c.role} · ${c.recruited ? 'RECRUITED' : 'LOCKED'}</div>
                <div class="cb-ability">${c.abilityName}: ${c.abilityDesc}</div>
                <div class="cb-cd">Cooldown: ${c.cooldownMax}s</div>
              </div>
            </div>`
          )
          .join('')}
      </div>
    `;
  }

  function renderSettingsTab(snap) {
    body.innerHTML = `
      <div class="panel-card settings-card">
        <div class="card-title">AUDIO & CONTROLS</div>
        <div class="setting-row">
          <span>Master SFX Audio</span>
          <button class="mini-btn" id="set-toggle-sfx">${snap.sfxMuted ? 'MUTED' : 'ENABLED'}</button>
        </div>
        <div class="setting-row">
          <span>Vehicle Radio Music</span>
          <button class="mini-btn" id="set-toggle-radio">${snap.radioMuted ? 'MUTED' : 'ENABLED'}</button>
        </div>
        <div class="card-title" style="margin-top:16px">SOLANA BAY KEYBOARD CONTROLS</div>
        <div class="controls-help">
          <div><strong>W A S D</strong> — Move / Drive · <strong>SHIFT</strong> — Sprint · <strong>SPACE</strong> — Jump / Handbrake Drift</div>
          <div><strong>F / E</strong> — Enter / Exit / Carjack / Interact · <strong>LMB</strong> — Fire · <strong>RMB</strong> — Aim · <strong>R</strong> — Reload</div>
          <div><strong>1–5</strong> — Weapons · <strong>Z / X / C</strong> — Crew Abilities · <strong>Q</strong> — Radio Station · <strong>H</strong> — Horn · <strong>ESC / P</strong> — Pause</div>
        </div>
      </div>
    `;
    const sfxBtn = document.getElementById('set-toggle-sfx');
    if (sfxBtn) {
      sfxBtn.onclick = () => {
        if (callbacks.onToggleSfx) callbacks.onToggleSfx();
        lastSnapshot.sfxMuted = !lastSnapshot.sfxMuted;
        renderSettingsTab(lastSnapshot);
      };
    }
    const radBtn = document.getElementById('set-toggle-radio');
    if (radBtn) {
      radBtn.onclick = () => {
        if (callbacks.onToggleRadio) callbacks.onToggleRadio();
        lastSnapshot.radioMuted = !lastSnapshot.radioMuted;
        renderSettingsTab(lastSnapshot);
      };
    }
  }

  function drawCityMapCanvas(canvasId, snap, clickable = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const minX = -225;
    const maxX = 225;
    const minZ = -210;
    const maxZ = 295;
    const toX = (wx) => ((wx - minX) / (maxX - minX)) * w;
    const toY = (wz) => ((wz - minZ) / (maxZ - minZ)) * h;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Ocean band
    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(0, toY(242), w, h - toY(242));
    // Sand band
    ctx.fillStyle = '#5c4b32';
    ctx.fillRect(0, toY(202), w, toY(242) - toY(202));

    // District tinted zones
    for (const d of snap.districts) {
      const b = d.bounds;
      ctx.fillStyle = `${d.color}26`;
      ctx.fillRect(toX(b.minX), toY(b.minZ), toX(b.maxX) - toX(b.minX), toY(b.maxZ) - toY(b.minZ));
    }

    // Road grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.lineWidth = 2;
    for (const r of ROAD_LINES) {
      ctx.beginPath();
      ctx.moveTo(toX(r), toY(-180));
      ctx.lineTo(toX(r), toY(180));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(toX(-180), toY(r));
      ctx.lineTo(toX(180), toY(r));
      ctx.stroke();
    }

    // District labels with standing numbers
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    for (const d of snap.districts) {
      const lx = toX(d.center.x);
      const ly = toY(d.center.z);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(lx - 52, ly - 12, 104, 24);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(d.name.toUpperCase(), lx, ly - 1);
      ctx.fillStyle = d.tierColor;
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`${d.label} ${d.value}`, lx, ly + 9);
      ctx.font = 'bold 11px sans-serif';
    }

    // Landmarks
    for (const lm of LANDMARKS) {
      if (lm.type !== 'garage' && lm.type !== 'armory') continue;
      ctx.fillStyle = lm.type === 'garage' ? '#38bdf8' : '#fb923c';
      ctx.fillRect(toX(lm.x) - 4, toY(lm.z) - 4, 8, 8);
    }

    // Player marker
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(toX(snap.playerPos.x), toY(snap.playerPos.z), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Waypoint marker
    if (snap.waypoint) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(toX(snap.waypoint.x), toY(snap.waypoint.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (clickable) {
      canvas.onclick = (ev) => {
        const rect = canvas.getBoundingClientRect();
        const nx = (ev.clientX - rect.left) / rect.width;
        const ny = (ev.clientY - rect.top) / rect.height;
        const wx = minX + nx * (maxX - minX);
        const wz = minZ + ny * (maxZ - minZ);
        snap.waypoint = { x: Math.round(wx), z: Math.round(wz) };
        if (callbacks.onSetWaypoint) callbacks.onSetWaypoint(snap.waypoint);
        drawCityMapCanvas(canvasId, snap, true);
      };
    }
  }

  function bindSlotButtons() {
    for (const btn of body.querySelectorAll('[data-save-slot]')) {
      btn.onclick = () => {
        const idx = Number(btn.dataset.saveSlot);
        if (callbacks.onSaveSlot) {
          callbacks.onSaveSlot(idx);
          if (callbacks.getFreshSnapshot) lastSnapshot = callbacks.getFreshSnapshot();
          render();
        }
      };
    }
    for (const btn of body.querySelectorAll('[data-load-slot]')) {
      btn.onclick = () => {
        const idx = Number(btn.dataset.loadSlot);
        if (callbacks.onLoadSlot) callbacks.onLoadSlot(idx);
      };
    }
  }

  return {
    open,
    close,
    setTab,
    render,
  };
}
