// Solana Bay — SBPD Tactical Dispatch Panel Data & Pursuit Log

export function createDispatchSystem() {
  const logs = [];
  const syntheticUnits = [];
  let maxLogs = 5;

  function pushLog(message, priority = 'normal') {
    const entry = {
      id: Date.now() + Math.random(),
      text: message,
      priority, // 'normal' | 'alert' | 'air'
    };
    logs.unshift(entry);
    if (logs.length > maxLogs) logs.length = maxLogs;
    return entry;
  }

  function clearLogs() {
    logs.length = 0;
  }

  function setSyntheticUnits(units) {
    syntheticUnits.length = 0;
    for (const u of units) syntheticUnits.push({ ...u });
  }

  function clearSyntheticUnits() {
    syntheticUnits.length = 0;
  }

  function recordCrime(kind, districtName) {
    const label = districtName || 'Solana Bay';
    if (kind === 'shots') {
      pushLog(`10-71 Shots fired in ${label}`, 'alert');
    } else if (kind === 'carjack') {
      pushLog(`10-99 Stolen vehicle reported — ${label}`, 'normal');
    } else if (kind === 'officer_down') {
      pushLog(`10-00 Officer down! All units to ${label}`, 'alert');
    } else if (kind === 'air_launch') {
      pushLog(`AIR-ONE airborne over ${label}`, 'air');
    } else if (kind === 'ram') {
      pushLog(`10-50 Suspect rammed cruiser — ${label}`, 'normal');
    } else if (kind === 'evaded') {
      pushLog(`Visual lost — units returning to patrol`, 'normal');
    } else {
      pushLog(`Suspect sighted in ${label}`, 'normal');
    }
  }

  function getDispatchSnapshot(police, playerState) {
    const stars = police.state.stars;
    if (stars <= 0 && syntheticUnits.length === 0) {
      return {
        active: false,
        stars: 0,
        code: 'CODE 1 · CLEAR',
        airStatus: 'STANDBY',
        spotted: false,
        evadeTimer: 0,
        bustProgress: 0,
        units: [],
        logs: [],
      };
    }

    const px = playerState.x;
    const pz = playerState.z;
    const units = [];

    for (const c of police.cruisers) {
      if (c.vehicle.destroyed) continue;
      const dist = Math.round(Math.hypot(c.vehicle.x - px, c.vehicle.z - pz));
      units.push({
        callsign: c.callsign,
        role: c.role,
        distance: dist,
        kind: 'cruiser',
      });
    }

    for (const o of police.officers) {
      if (!o.alive) continue;
      const dist = Math.round(Math.hypot(o.x - px, o.z - pz));
      units.push({
        callsign: o.callsign,
        role: o.role,
        distance: dist,
        kind: 'officer',
      });
    }

    const heli = police.helicopter;
    if (heli && heli.active) {
      const dist = Math.round(Math.hypot(heli.x - px, heli.z - pz));
      units.push({
        callsign: heli.callsign,
        role: heli.role,
        distance: dist,
        kind: 'air',
      });
    }

    for (const su of syntheticUnits) {
      if (!units.some((u) => u.callsign === su.callsign)) {
        units.push({ ...su });
      }
    }

    units.sort((a, b) => a.distance - b.distance);

    const codeMap = {
      1: 'CODE 2 · CAUTION',
      2: 'CODE 3 · PURSUIT',
      3: 'CODE 3 · TACTICAL',
      4: 'CODE 4 · AIR + SWAT',
      5: 'CODE 5 · LOCKDOWN',
    };

    return {
      active: true,
      stars,
      code: codeMap[stars] || 'CODE 3 · PURSUIT',
      airStatus: heli && heli.active ? 'AIR-ONE ON STATION' : stars >= 3 ? 'SCRAMBLING' : 'STANDBY',
      spotted: police.state.spotted,
      evadeTimer: police.state.evadeTimer,
      bustProgress: Math.min(1, police.state.bustTimer / 3.2),
      units: units.slice(0, 6),
      logs: logs.slice(0, 4),
    };
  }

  return {
    logs,
    pushLog,
    clearLogs,
    setSyntheticUnits,
    clearSyntheticUnits,
    recordCrime,
    getDispatchSnapshot,
  };
}
