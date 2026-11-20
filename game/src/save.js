// Solana Bay — localStorage career save/load/reset with autosave

const SAVE_KEY = 'solana_bay_career_v1';

export function hasSavedCareer() {
  try {
    return !!window.localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function saveCareer(playerCtrl, missionMgr) {
  try {
    const p = playerCtrl.player;
    const payload = {
      version: 1,
      savedAt: Date.now(),
      cash: p.cash,
      health: Math.max(25, Math.round(p.health)),
      armor: Math.round(p.armor),
      weaponIndex: p.weaponIndex,
      inventory: p.inventory,
      stats: p.stats,
      missionIndex: missionMgr.state.currentIndex,
      pos: { x: Math.round(p.pos.x), z: Math.round(p.pos.z) },
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadCareer(playerCtrl, missionMgr) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return false;

    const p = playerCtrl.player;
    if (typeof data.cash === 'number') p.cash = data.cash;
    if (typeof data.health === 'number') p.health = Math.max(25, Math.min(p.maxHealth, data.health));
    if (typeof data.armor === 'number') p.armor = Math.max(0, Math.min(p.maxArmor, data.armor));

    if (data.inventory) {
      for (const k of Object.keys(p.inventory)) {
        if (data.inventory[k]) {
          p.inventory[k] = { ...p.inventory[k], ...data.inventory[k] };
        }
      }
    }
    if (typeof data.weaponIndex === 'number') {
      playerCtrl.selectWeapon(data.weaponIndex);
    }
    if (data.stats) {
      p.stats = { ...p.stats, ...data.stats };
    }
    if (typeof data.missionIndex === 'number') {
      missionMgr.loadProgress(data.missionIndex);
    }
    if (data.pos && typeof data.pos.x === 'number' && typeof data.pos.z === 'number') {
      playerCtrl.setPosition(data.pos.x, data.pos.z);
    }
    return true;
  } catch {
    return false;
  }
}

export function resetCareer() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
