// Solana Bay — District Reputation Standing & RP Rank Progression
import { DISTRICTS, clamp, getDistrictAt, getRankForRp } from './config.js';

export function getStandingTier(score) {
  if (score >= 65) return { label: 'FRIENDLY', color: '#34d399' };
  if (score >= 35) return { label: 'NEUTRAL', color: '#fbbf24' };
  return { label: 'WARY', color: '#f87171' };
}

export function createReputationSystem() {
  const standings = {};
  for (const d of DISTRICTS) {
    standings[d.id] = d.defaultStanding;
  }

  const state = {
    rp: 420,
    standings,
  };

  function getStanding(districtId) {
    const val = clamp(Math.round(state.standings[districtId] ?? 50), 0, 100);
    const tier = getStandingTier(val);
    return {
      districtId,
      value: val,
      label: tier.label,
      color: tier.color,
    };
  }

  function changeStanding(districtId, delta) {
    if (!districtId) return;
    const prev = state.standings[districtId] ?? 50;
    state.standings[districtId] = clamp(Math.round(prev + delta), 0, 100);
  }

  function recordAction(actionType, x, z) {
    const dist = getDistrictAt(x, z);
    if (!dist) return;
    if (actionType === 'mission') {
      changeStanding(dist.id, 14);
      addRp(120);
    } else if (actionType === 'race_win') {
      changeStanding(dist.id, 10);
      addRp(140);
    } else if (actionType === 'collectible') {
      changeStanding(dist.id, 4);
      addRp(55);
    } else if (actionType === 'ped_harm') {
      changeStanding(dist.id, -8);
    } else if (actionType === 'carjack') {
      changeStanding(dist.id, -4);
      addRp(20);
    } else if (actionType === 'police_evade') {
      changeStanding(dist.id, 5);
      addRp(95);
    } else if (actionType === 'hostile_kill') {
      changeStanding(dist.id, 3);
      addRp(35);
    }
  }

  function addRp(delta) {
    state.rp = Math.max(0, Math.round(state.rp + delta));
    return getRankForRp(state.rp);
  }

  function setRp(rp) {
    state.rp = Math.max(0, Math.round(rp));
  }

  function getFriendlyCount() {
    let count = 0;
    for (const d of DISTRICTS) {
      if ((state.standings[d.id] ?? 0) >= 65) count += 1;
    }
    return count;
  }

  function getDistrictHud(x, z) {
    const d = getDistrictAt(x, z);
    const s = getStanding(d.id);
    return {
      id: d.id,
      name: d.name,
      subtitle: d.subtitle,
      color: d.color,
      standing: s.value,
      tierLabel: s.label,
      tierColor: s.color,
    };
  }

  function getAllDistrictStandings() {
    return DISTRICTS.map((d) => ({
      ...d,
      ...getStanding(d.id),
    }));
  }

  function getRankHud() {
    return getRankForRp(state.rp);
  }

  function exportState() {
    return {
      rp: state.rp,
      standings: { ...state.standings },
    };
  }

  function importState(data) {
    if (!data) return;
    if (typeof data.rp === 'number') state.rp = data.rp;
    if (data.standings) {
      for (const d of DISTRICTS) {
        if (typeof data.standings[d.id] === 'number') {
          state.standings[d.id] = clamp(data.standings[d.id], 0, 100);
        }
      }
    }
  }

  return {
    state,
    getStanding,
    changeStanding,
    recordAction,
    addRp,
    setRp,
    getFriendlyCount,
    getDistrictHud,
    getAllDistrictStandings,
    getRankHud,
    exportState,
    importState,
  };
}
