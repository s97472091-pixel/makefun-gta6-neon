// Career persistence via localStorage — offline, no network requests.

const SAVE_KEY = 'solana_bay_career_v1';

export function loadCareer() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function saveCareer(playerState, missionIndex) {
  try {
    const payload = {
      version: 1,
      savedAt: Date.now(),
      x: playerState.x,
      z: playerState.z,
      yaw: playerState.yaw,
      hp: playerState.hp,
      armor: playerState.armor,
      cash: playerState.cash,
      weaponIndex: playerState.weaponIndex,
      unlockedWeapons: [...playerState.unlockedWeapons],
      ammo: { ...playerState.ammo },
      mag: { ...playerState.mag },
      stats: { ...playerState.stats },
      missionIndex,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearCareer() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch { /* ignore */ }
}
