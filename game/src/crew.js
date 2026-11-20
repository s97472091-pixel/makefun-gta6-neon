// Solana Bay — Crew Roster, Procedural Canvas Portraits & Z/X/C Abilities
import { CREW_ROSTER } from './config.js';

function drawCrewPortraitDataUrl(member) {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  const ctx = c.getContext('2d');

  // Stylized coastal neon background
  const grad = ctx.createLinearGradient(0, 0, 96, 96);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, member.accent);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 96, 96);

  // Subtle scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let y = 0; y < 96; y += 6) ctx.fillRect(0, y, 96, 2);

  // Shoulders / jacket
  ctx.fillStyle = member.jacket;
  ctx.beginPath();
  ctx.moveTo(12, 96);
  ctx.quadraticCurveTo(48, 60, 84, 96);
  ctx.closePath();
  ctx.fill();

  // Inner collar
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(38, 72);
  ctx.lineTo(48, 86);
  ctx.lineTo(58, 72);
  ctx.closePath();
  ctx.fill();

  // Neck
  ctx.fillStyle = member.skin;
  ctx.fillRect(41, 56, 14, 16);

  // Head
  ctx.fillStyle = member.skin;
  ctx.beginPath();
  ctx.arc(48, 42, 20, 0, Math.PI * 2);
  ctx.fill();

  // Hair silhouette per member
  ctx.fillStyle = member.hair;
  ctx.beginPath();
  ctx.arc(48, 36, 21, Math.PI, Math.PI * 2);
  ctx.fill();
  if (member.id === 'talia') {
    ctx.fillRect(27, 34, 7, 22);
    ctx.fillRect(62, 34, 7, 22);
  } else if (member.id === 'nori') {
    ctx.fillRect(28, 22, 40, 12);
  }

  // Sunglasses / visor
  ctx.fillStyle = '#090d16';
  ctx.fillRect(34, 38, 12, 6);
  ctx.fillRect(50, 38, 12, 6);
  ctx.fillRect(46, 40, 4, 2);

  // Rim highlight on shades
  ctx.fillStyle = member.accent;
  ctx.fillRect(35, 39, 5, 2);
  ctx.fillRect(51, 39, 5, 2);

  // Mouth
  ctx.strokeStyle = '#5c3324';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(48, 50, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // Border frame
  ctx.strokeStyle = member.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 92, 92);

  return c.toDataURL('image/png');
}

export function createCrewSystem() {
  const portraits = {};
  const members = CREW_ROSTER.map((spec) => {
    const portrait = drawCrewPortraitDataUrl(spec);
    portraits[spec.id] = portrait;
    return {
      ...spec,
      portrait,
      recruited: spec.id === 'nori', // Nori starts ready for quick play; others recruit in story
      cooldownRemaining: 0,
      activeTimer: 0,
    };
  });

  function getMember(id) {
    return members.find((m) => m.id === id) || null;
  }

  function getPortrait(id) {
    return portraits[id] || portraits.nori;
  }

  function recruitMember(id) {
    const m = getMember(id);
    if (!m) return false;
    m.recruited = true;
    return true;
  }

  function recruitAll() {
    for (const m of members) m.recruited = true;
  }

  function triggerAbilityByKey(key, ctx = {}) {
    const k = String(key).toUpperCase();
    const m = members.find((item) => item.key === k);
    if (!m) return { ok: false, reason: 'unknown' };
    if (!m.recruited) {
      if (ctx.onToast) ctx.onToast(`${m.name} is not recruited yet.`);
      return { ok: false, reason: 'locked' };
    }
    if (m.cooldownRemaining > 0) {
      if (ctx.onToast) ctx.onToast(`${m.abilityName} recharging (${Math.ceil(m.cooldownRemaining)}s)`);
      return { ok: false, reason: 'cooldown' };
    }

    if (m.id === 'nori') {
      // Swap Plates: clear wanted heat once
      if (ctx.police) ctx.police.clearWanted(true);
      if (ctx.dispatch) ctx.dispatch.pushLog('Plates spoofed — SBPD lost vehicle match', 'normal');
      if (ctx.missions) {
        ctx.missions.showDialogue(m.name, m.id, 'Fresh tags pushed to dispatch. Keep cool and roll clean.', 5);
      }
      if (ctx.onToast) ctx.onToast('SWAP PLATES [Z] — Wanted level cleared!');
    } else if (m.id === 'devon') {
      // Quick Fix: repair vehicle and top up armor
      if (ctx.player && ctx.player.state.vehicle && ctx.vehicles) {
        ctx.vehicles.repairVehicle(ctx.player.state.vehicle);
      }
      if (ctx.player) {
        ctx.player.state.armor = Math.min(ctx.player.state.maxArmor, ctx.player.state.armor + 40);
      }
      if (ctx.missions) {
        ctx.missions.showDialogue(m.name, m.id, 'Bypass kit engaged — chassis patched and kevlar topped off!', 5);
      }
      if (ctx.onToast) ctx.onToast('QUICK FIX [X] — Ride repaired +40 Armor!');
    } else if (m.id === 'talia') {
      // Eyes Out: reveal all SBPD units on minimap for 20s
      m.activeTimer = 20;
      if (ctx.missions) {
        ctx.missions.showDialogue(m.name, m.id, 'Radar sweep live. Every SBPD cruiser and chopper is tagged.', 5);
      }
      if (ctx.onToast) ctx.onToast('EYES OUT [C] — All SBPD units revealed on minimap (20s)');
    }

    m.cooldownRemaining = m.cooldown;
    if (ctx.audio) ctx.audio.playChime('ability');
    return { ok: true, member: m };
  }

  function update(dt) {
    for (const m of members) {
      if (m.cooldownRemaining > 0) m.cooldownRemaining = Math.max(0, m.cooldownRemaining - dt);
      if (m.activeTimer > 0) m.activeTimer = Math.max(0, m.activeTimer - dt);
    }
  }

  function isRadarRevealActive() {
    const talia = getMember('talia');
    return Boolean(talia && talia.activeTimer > 0);
  }

  function getHudData() {
    return members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      key: m.key,
      abilityName: m.abilityName,
      abilityDesc: m.abilityDesc,
      accent: m.accent,
      portrait: m.portrait,
      recruited: m.recruited,
      cooldownRemaining: m.cooldownRemaining,
      cooldownMax: m.cooldown,
      activeTimer: m.activeTimer,
      ready: m.recruited && m.cooldownRemaining <= 0,
    }));
  }

  function exportState() {
    return members.filter((m) => m.recruited).map((m) => m.id);
  }

  function importState(ids) {
    const set = new Set(Array.isArray(ids) ? ids : ['nori']);
    for (const m of members) {
      m.recruited = set.has(m.id);
      m.cooldownRemaining = 0;
      m.activeTimer = 0;
    }
  }

  return {
    members,
    portraits,
    getMember,
    getPortrait,
    recruitMember,
    recruitAll,
    triggerAbilityByKey,
    update,
    isRadarRevealActive,
    getHudData,
    exportState,
    importState,
  };
}
