// Solana Bay — localStorage career save/load/reset with autosave.

const STORAGE_KEY = 'solana_bay_career_v1';

export function hasSavedCareer() {
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

export function saveCareer(player, missions) {
  try {
    const ps = player.state;
    const payload = {
      version: 1,
      savedAt: Date.now(),
      cash: Math.floor(ps.cash),
      hp: Math.round(ps.hp),
      armor: Math.round(ps.armor),
      x: Number(ps.x.toFixed(2)),
      z: Number(ps.z.toFixed(2)),
      weaponIndex: ps.weaponIndex,
      ammo: ps.ammo,
      stats: ps.stats,
      missionIndex: missions.state.missionIndex,
      freeRoam: missions.state.freeRoam,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadCareer() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function applyCareerSave(data, player, missions, callbacks = {}) {
  if (!data) return false;
  const ps = player.state;
  ps.cash = typeof data.cash === 'number' ? data.cash : 650;
  ps.hp = typeof data.hp === 'number' && data.hp > 10 ? data.hp : ps.maxHp;
  ps.armor = typeof data.armor === 'number' ? data.armor : 45;
  if (typeof data.x === 'number' && typeof data.z === 'number') {
    ps.x = data.x;
    ps.z = data.z;
    player.rig.root.position.set(ps.x, 0, ps.z);
  }
  if (data.ammo && typeof data.ammo === 'object') {
    for (const [k, v] of Object.entries(data.ammo)) {
      if (ps.ammo[k] && v && typeof v.mag === 'number' && typeof v.reserve === 'number') {
        ps.ammo[k].mag = v.mag;
        ps.ammo[k].reserve = v.reserve;
      }
    }
  }
  if (data.stats && typeof data.stats === 'object') {
    Object.assign(ps.stats, data.stats);
  }
  if (typeof data.weaponIndex === 'number') {
    player.switchWeapon(data.weaponIndex);
  }
  const mIdx = typeof data.missionIndex === 'number' ? data.missionIndex : 0;
  missions.startMission(data.freeRoam ? missions.MISSION_DEFS.length : mIdx, callbacks);
  return true;
}

export function clearCareer() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
