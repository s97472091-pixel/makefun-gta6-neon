// Solana Bay — Three-Slot localStorage Career Save/Load & Completion Calculator
import { getDistrictAt } from './config.js';
import { STORY_MISSIONS } from './story.js';

const STORAGE_KEY = 'solana_bay_v3_saves';

export function computeCompletionPercent({
  missionsCompleted = 0,
  racesWon = 0,
  collectibles = 0,
  crewRecruited = 1,
  districtsFriendly = 1,
  goldRatings = 0,
}) {
  // Weighted 100% career breakdown
  const mScore = (Math.min(6, missionsCompleted) / 6) * 42;
  const rScore = (Math.min(4, racesWon) / 4) * 14;
  const cScore = (Math.min(20, collectibles) / 20) * 18;
  const crewScore = (Math.min(3, crewRecruited) / 3) * 10;
  const dScore = (Math.min(5, districtsFriendly) / 5) * 10;
  const gScore = (Math.min(6, goldRatings) / 6) * 6;
  return Math.round(mScore + rScore + cScore + crewScore + dScore + gScore);
}

export function createSaveSystem() {
  let activeSlotIndex = 0;

  function readAllSlots() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [null, null, null];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [null, null, null];
      return [parsed[0] || null, parsed[1] || null, parsed[2] || null];
    } catch {
      return [null, null, null];
    }
  }

  function writeAllSlots(slots) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slots.slice(0, 3)));
      return true;
    } catch {
      return false;
    }
  }

  function buildSnapshot(gameSystems) {
    const {
      player,
      dayNight,
      missions,
      crew,
      races,
      reputation,
      collectibles,
      careerStats,
    } = gameSystems;

    const mExport = missions.exportProgress();
    const crewIds = crew.exportState();
    const raceIds = races.exportState();
    const repExport = reputation.exportState();
    const collIds = collectibles.exportState();

    const goldRatings = Object.values(mExport.ratings).filter((r) => r === 'G').length;
    const friendlyCount = reputation.getFriendlyCount();
    const completionPct = computeCompletionPercent({
      missionsCompleted: mExport.completedIds.length,
      racesWon: raceIds.length,
      collectibles: collIds.length,
      crewRecruited: crewIds.length,
      districtsFriendly: friendlyCount,
      goldRatings,
    });

    const activeMission = STORY_MISSIONS.find((m) => m.id === mExport.activeMissionId);
    const act = mExport.freeRoam ? 'FREE ROAM' : activeMission ? activeMission.act : 'ACT II';
    const dist = getDistrictAt(player.state.x, player.state.z);

    return {
      version: 3,
      savedAt: Date.now(),
      act,
      completionPct,
      missionsDone: mExport.completedIds.length,
      missionsTotal: STORY_MISSIONS.length,
      districtId: dist.id,
      districtName: dist.name,
      cash: player.state.cash,
      clock: dayNight.getClockString(),
      hours: dayNight.state.hours,
      playerPos: { x: Math.round(player.state.x), z: Math.round(player.state.z), yaw: player.state.yaw },
      health: player.state.health,
      armor: player.state.armor,
      missions: mExport,
      crew: crewIds,
      races: raceIds,
      reputation: repExport,
      collectibles: collIds,
      careerStats: { ...careerStats },
    };
  }

  function saveToSlot(slotIndex, gameSystems) {
    const idx = Math.max(0, Math.min(2, slotIndex));
    activeSlotIndex = idx;
    const slots = readAllSlots();
    slots[idx] = buildSnapshot(gameSystems);
    writeAllSlots(slots);
    return slots[idx];
  }

  function autosave(gameSystems) {
    return saveToSlot(activeSlotIndex, gameSystems);
  }

  function loadSlot(slotIndex) {
    const idx = Math.max(0, Math.min(2, slotIndex));
    const slots = readAllSlots();
    if (slots[idx]) activeSlotIndex = idx;
    return slots[idx];
  }

  function deleteSlot(slotIndex) {
    const idx = Math.max(0, Math.min(2, slotIndex));
    const slots = readAllSlots();
    slots[idx] = null;
    writeAllSlots(slots);
  }

  function getLatestSlotIndex() {
    const slots = readAllSlots();
    let bestIdx = -1;
    let bestTime = -1;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] && (slots[i].savedAt || 0) > bestTime) {
        bestTime = slots[i].savedAt || 0;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  function getShowcaseSlots() {
    return [
      {
        version: 3,
        savedAt: 1732000000000,
        act: 'ACT II',
        completionPct: 66,
        missionsDone: 5,
        missionsTotal: 6,
        districtName: 'Miramar Coast',
        cash: 18450,
        clock: '13:45',
      },
      {
        version: 3,
        savedAt: 1731900000000,
        act: 'ACT II',
        completionPct: 44,
        missionsDone: 3,
        missionsTotal: 6,
        districtName: 'Pasar Senja',
        cash: 7280,
        clock: '19:30',
      },
      null,
    ];
  }

  return {
    get activeSlotIndex() {
      return activeSlotIndex;
    },
    setActiveSlotIndex(idx) {
      activeSlotIndex = Math.max(0, Math.min(2, idx));
    },
    readAllSlots,
    saveToSlot,
    autosave,
    loadSlot,
    deleteSlot,
    getLatestSlotIndex,
    getShowcaseSlots,
  };
}
