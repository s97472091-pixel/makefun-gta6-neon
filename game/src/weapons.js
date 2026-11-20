// Solana Bay — Five-Slot Weapon Inventory, Ammo & Reload Manager

export const WEAPON_CATALOG = [
  {
    slot: 1,
    id: 'fists',
    name: 'Fists',
    shortName: 'FIST',
    kind: 'melee',
    damage: 24,
    range: 2.8,
    fireRate: 0.42,
    magSize: 0,
    maxReserve: 0,
    reloadTime: 0,
    pellets: 1,
    spread: 0,
    auto: false,
    driveBy: false,
    ammoPrice: 0,
  },
  {
    slot: 2,
    id: 'pistol',
    name: '9mm Bay Sidearm',
    shortName: '9MM',
    kind: 'firearm',
    damage: 28,
    range: 62,
    fireRate: 0.28,
    magSize: 15,
    maxReserve: 120,
    reloadTime: 1.25,
    pellets: 1,
    spread: 0.02,
    auto: false,
    driveBy: true,
    ammoPrice: 120,
  },
  {
    slot: 3,
    id: 'smg',
    name: 'Solana Micro-SMG',
    shortName: 'SMG',
    kind: 'firearm',
    damage: 17,
    range: 54,
    fireRate: 0.1,
    magSize: 32,
    maxReserve: 256,
    reloadTime: 1.55,
    pellets: 1,
    spread: 0.045,
    auto: true,
    driveBy: true,
    ammoPrice: 220,
  },
  {
    slot: 4,
    id: 'shotgun',
    name: 'Dockside Pump',
    shortName: 'SHG',
    kind: 'firearm',
    damage: 18,
    range: 28,
    fireRate: 0.78,
    magSize: 8,
    maxReserve: 64,
    reloadTime: 1.85,
    pellets: 6,
    spread: 0.11,
    auto: false,
    driveBy: false,
    ammoPrice: 260,
  },
  {
    slot: 5,
    id: 'rifle',
    name: 'Miramar Carbine',
    shortName: 'CARB',
    kind: 'firearm',
    damage: 34,
    range: 85,
    fireRate: 0.14,
    magSize: 30,
    maxReserve: 210,
    reloadTime: 1.75,
    pellets: 1,
    spread: 0.025,
    auto: true,
    driveBy: false,
    ammoPrice: 340,
  },
];

export function createWeaponSystem() {
  const slots = WEAPON_CATALOG.map((spec) => ({
    ...spec,
    unlocked: spec.slot <= 3,
    mag: spec.magSize,
    reserve: Math.round(spec.maxReserve * 0.6),
  }));

  const state = {
    activeIndex: 1, // Pistol ready by default
    cooldown: 0,
    reloading: false,
    reloadTimer: 0,
  };

  function getActiveWeapon() {
    return slots[state.activeIndex];
  }

  function selectSlot(slotNumber) {
    const idx = slotNumber - 1;
    if (idx < 0 || idx >= slots.length) return false;
    if (!slots[idx].unlocked) return false;
    if (idx !== state.activeIndex) {
      state.activeIndex = idx;
      state.reloading = false;
      state.reloadTimer = 0;
      state.cooldown = 0.15;
    }
    return true;
  }

  function cycleSlot(dir = 1) {
    for (let step = 1; step <= slots.length; step++) {
      const idx = (state.activeIndex + dir * step + slots.length) % slots.length;
      if (slots[idx].unlocked) {
        selectSlot(idx + 1);
        return slots[idx];
      }
    }
    return getActiveWeapon();
  }

  function unlockAllWeapons() {
    for (const s of slots) {
      s.unlocked = true;
      s.mag = s.magSize;
      s.reserve = s.maxReserve;
    }
  }

  function unlockWeapon(id) {
    const w = slots.find((s) => s.id === id);
    if (!w) return;
    w.unlocked = true;
    w.mag = w.magSize;
    w.reserve = Math.max(w.reserve, Math.round(w.maxReserve * 0.75));
  }

  function refillAllAmmo() {
    for (const s of slots) {
      if (s.kind === 'firearm') {
        s.unlocked = true;
        s.mag = s.magSize;
        s.reserve = s.maxReserve;
      }
    }
  }

  function startReload() {
    const w = getActiveWeapon();
    if (w.kind !== 'firearm' || state.reloading) return false;
    if (w.mag >= w.magSize || w.reserve <= 0) return false;
    state.reloading = true;
    state.reloadTimer = w.reloadTime;
    return true;
  }

  function canFire(inVehicle = false) {
    const w = getActiveWeapon();
    if (state.cooldown > 0 || state.reloading) return false;
    if (inVehicle && !w.driveBy) return false;
    if (w.kind === 'firearm' && w.mag <= 0) {
      startReload();
      return false;
    }
    return true;
  }

  function consumeShot() {
    const w = getActiveWeapon();
    state.cooldown = w.fireRate;
    if (w.kind === 'firearm') {
      w.mag = Math.max(0, w.mag - 1);
      if (w.mag === 0 && w.reserve > 0) {
        startReload();
      }
    }
    return w;
  }

  function update(dt) {
    if (state.cooldown > 0) state.cooldown = Math.max(0, state.cooldown - dt);
    if (state.reloading) {
      state.reloadTimer -= dt;
      if (state.reloadTimer <= 0) {
        const w = getActiveWeapon();
        const needed = w.magSize - w.mag;
        const load = Math.min(needed, w.reserve);
        w.mag += load;
        w.reserve -= load;
        state.reloading = false;
        state.reloadTimer = 0;
      }
    }
  }

  function getHudData() {
    return {
      activeIndex: state.activeIndex,
      active: getActiveWeapon(),
      reloading: state.reloading,
      reloadProgress: state.reloading
        ? 1 - state.reloadTimer / Math.max(0.01, getActiveWeapon().reloadTime)
        : 0,
      slots: slots.map((s, idx) => ({
        slot: s.slot,
        id: s.id,
        name: s.name,
        shortName: s.shortName,
        kind: s.kind,
        unlocked: s.unlocked,
        active: idx === state.activeIndex,
        mag: s.mag,
        magSize: s.magSize,
        reserve: s.reserve,
      })),
    };
  }

  return {
    slots,
    state,
    getActiveWeapon,
    selectSlot,
    cycleSlot,
    unlockWeapon,
    unlockAllWeapons,
    refillAllAmmo,
    startReload,
    canFire,
    consumeShot,
    update,
    getHudData,
  };
}
