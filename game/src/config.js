// Solana Bay — Core World Configuration & Seeded PRNG

export const CURRENCY = '₮';

export const CITY_METRICS = {
  gridBlocks: 6,
  blockSize: 44,
  roadWidth: 16,
  cellSize: 60,
  halfSpan: 180,
  sidewalkWidth: 3.2,
  sidewalkHeight: 0.24,
  beachfrontRoadZ: 180,
  boardwalkStartZ: 188,
  boardwalkEndZ: 204,
  sandEndZ: 248,
  oceanEndZ: 520,
  pierX: -60,
  pierStartZ: 202,
  pierEndZ: 294,
  pierWidth: 12,
  worldMinX: -225,
  worldMaxX: 225,
  worldMinZ: -225,
  worldMaxZ: 300,
};

export const ROAD_LINES = [-180, -120, -60, 0, 60, 120, 180];

export const DISTRICTS = [
  {
    id: 'miramar_coast',
    name: 'Miramar Coast',
    subtitle: 'Art Deco Strip & Marina',
    color: '#ff7b54',
    accent: '#ffd166',
    style: 'artdeco',
    bounds: { minX: -225, maxX: 225, minZ: 90, maxZ: 300 },
    center: { x: 0, z: 150 },
    defaultStanding: 62,
    buildingHeightRange: [12, 28],
  },
  {
    id: 'pasar_senja',
    name: 'Pasar Senja',
    subtitle: 'Lantern Night Market & Spice Quarter',
    color: '#ff4d6d',
    accent: '#ffb703',
    style: 'market',
    bounds: { minX: 30, maxX: 225, minZ: -90, maxZ: 90 },
    center: { x: 90, z: 30 },
    defaultStanding: 74,
    buildingHeightRange: [9, 20],
  },
  {
    id: 'solana_core',
    name: 'Solana Core',
    subtitle: 'Downtown Financial & Neon Plaza',
    color: '#38bdf8',
    accent: '#a78bfa',
    style: 'glass',
    bounds: { minX: -90, maxX: 30, minZ: -90, maxZ: 90 },
    center: { x: -30, z: 0 },
    defaultStanding: 48,
    buildingHeightRange: [26, 62],
  },
  {
    id: 'puerto_bravo',
    name: 'Puerto Bravo',
    subtitle: 'Cargo Docks & Custom Garages',
    color: '#f59e0b',
    accent: '#94a3b8',
    style: 'industrial',
    bounds: { minX: -225, maxX: -90, minZ: -225, maxZ: 90 },
    center: { x: -150, z: -30 },
    defaultStanding: 58,
    buildingHeightRange: [8, 18],
  },
  {
    id: 'altura_heights',
    name: 'Altura Heights',
    subtitle: 'North Ridge & Penthouse Terraces',
    color: '#34d399',
    accent: '#f472b6',
    style: 'modern',
    bounds: { minX: -90, maxX: 225, minZ: -225, maxZ: -90 },
    center: { x: 60, z: -150 },
    defaultStanding: 35,
    buildingHeightRange: [16, 36],
  },
];

export const LANDMARKS = [
  { id: 'marina_pier', name: 'Solana Marina Pier', x: -60, z: 245, district: 'miramar_coast', type: 'pier' },
  { id: 'pasar_plaza', name: 'Pasar Senja Lantern Market', x: 90, z: 30, district: 'pasar_senja', type: 'market' },
  { id: 'solana_tower', name: 'Solana Spire', x: -30, z: -30, district: 'solana_core', type: 'tower' },
  { id: 'respray_garage', name: 'Nori Custom Respray', x: -120, z: 54, district: 'puerto_bravo', type: 'garage' },
  { id: 'armory_shop', name: 'Coral Dock Armory', x: -120, z: -66, district: 'puerto_bravo', type: 'armory' },
  { id: 'miramar_hotel', name: 'Grand Miramar Palms', x: 90, z: 150, district: 'miramar_coast', type: 'hotel' },
  { id: 'altura_overlook', name: 'Altura Sky Lounge', x: 90, z: -150, district: 'altura_heights', type: 'lounge' },
];

export const VEHICLE_CLASSES = {
  sports: {
    id: 'sports',
    name: 'Veloce R8',
    label: 'Sports Coupe',
    maxSpeed: 42,
    accel: 26,
    brake: 36,
    turnRate: 2.55,
    grip: 0.92,
    driftGrip: 0.58,
    hp: 115,
    length: 4.5,
    width: 2.05,
    height: 1.24,
    palette: [0xff3b4e, 0xff7b29, 0x00d2ff, 0xfbbf24, 0xf8fafc],
  },
  muscle: {
    id: 'muscle',
    name: 'Caldera GT',
    label: 'Coastal Muscle',
    maxSpeed: 37,
    accel: 23,
    brake: 30,
    turnRate: 2.25,
    grip: 0.87,
    driftGrip: 0.52,
    hp: 140,
    length: 4.75,
    width: 2.1,
    height: 1.36,
    palette: [0xf97316, 0x1e293b, 0x0ea5e9, 0xbe123c, 0x10b981],
  },
  sedan: {
    id: 'sedan',
    name: 'Solana Crest',
    label: '4-Door Sedan',
    maxSpeed: 31,
    accel: 18,
    brake: 28,
    turnRate: 2.35,
    grip: 0.91,
    driftGrip: 0.62,
    hp: 120,
    length: 4.55,
    width: 1.96,
    height: 1.44,
    palette: [0xe2e8f0, 0x64748b, 0x3b82f6, 0xd97706, 0x14b8a6],
  },
  suv: {
    id: 'suv',
    name: 'Baja Nomad',
    label: 'Coastal SUV',
    maxSpeed: 29,
    accel: 16.5,
    brake: 26,
    turnRate: 2.05,
    grip: 0.89,
    driftGrip: 0.65,
    hp: 175,
    length: 4.85,
    width: 2.18,
    height: 1.78,
    palette: [0x334155, 0x0f766e, 0x9a3412, 0xe2e8f0, 0x475569],
  },
  compact: {
    id: 'compact',
    name: 'Koi Mini',
    label: 'City Hatch',
    maxSpeed: 27,
    accel: 19,
    brake: 30,
    turnRate: 2.75,
    grip: 0.94,
    driftGrip: 0.68,
    hp: 95,
    length: 3.7,
    width: 1.82,
    height: 1.42,
    palette: [0xf43f5e, 0xfacc15, 0x22d3ee, 0xa855f7, 0x4ade80],
  },
  cruiser: {
    id: 'cruiser',
    name: 'SBPD Interceptor',
    label: 'Police Cruiser',
    maxSpeed: 39,
    accel: 24,
    brake: 34,
    turnRate: 2.45,
    grip: 0.92,
    driftGrip: 0.56,
    hp: 150,
    length: 4.7,
    width: 2.05,
    height: 1.46,
    palette: [0x111827],
    isPolice: true,
  },
};

export const TRAFFIC_CLASS_KEYS = ['sports', 'muscle', 'sedan', 'suv', 'compact'];

export const WANTED_CONFIG = {
  maxStars: 5,
  evadeDuration: 18,
  bustDistance: 6.2,
  bustDuration: 3.2,
  sightDistance: 78,
  heatThresholds: [0, 15, 45, 95, 165, 260],
  levels: {
    0: { cruisers: 0, officers: 0, helicopter: false, speedScale: 0.8, aggression: 0.0, shootRate: 0 },
    1: { cruisers: 1, officers: 1, helicopter: false, speedScale: 0.82, aggression: 0.45, shootRate: 0.45 },
    2: { cruisers: 2, officers: 2, helicopter: false, speedScale: 0.88, aggression: 0.62, shootRate: 0.72 },
    3: { cruisers: 3, officers: 3, helicopter: false, speedScale: 0.94, aggression: 0.78, shootRate: 0.95 },
    4: { cruisers: 4, officers: 4, helicopter: true, speedScale: 1.0, aggression: 0.92, shootRate: 1.2 },
    5: { cruisers: 5, officers: 5, helicopter: true, speedScale: 1.06, aggression: 1.05, shootRate: 1.45 },
  },
};

export const RADIO_STATIONS = [
  {
    id: 'sol_synth',
    code: 'SOL 98.4',
    name: 'Coastal Synth',
    color: '#ff6b6b',
    bpm: 112,
    tracks: ['Neon Tide', 'Palms at Midnight', 'Boardwalk Drift'],
    chords: [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [196, 246.94, 293.66],
      [164.81, 196, 246.94],
    ],
    bass: [110, 87.31, 98, 82.41],
  },
  {
    id: 'senja_fm',
    code: 'SENJA FM',
    name: 'Pasar Beats',
    color: '#fbbf24',
    bpm: 104,
    tracks: ['Lantern Glow', 'Night Wok Groove', 'Spice Market Bounce'],
    chords: [
      [293.66, 349.23, 440],
      [261.63, 329.63, 392],
      [220, 261.63, 329.63],
      [246.94, 293.66, 349.23],
    ],
    bass: [146.83, 130.81, 110, 123.47],
  },
  {
    id: 'wave_funk',
    code: 'WAVE 104.7',
    name: 'Sunset Funk',
    color: '#38bdf8',
    bpm: 118,
    tracks: ['Golden Pier', 'Salt Air Cruiser', 'Velvet Horizon'],
    chords: [
      [261.63, 329.63, 392, 493.88],
      [220, 261.63, 329.63, 392],
      [174.61, 220, 261.63, 329.63],
      [196, 246.94, 293.66, 392],
    ],
    bass: [130.81, 110, 87.31, 98],
  },
];

export const CREW_ROSTER = [
  {
    id: 'nori',
    name: 'Nori Tanaka',
    role: 'Plate Forger',
    key: 'Z',
    abilityName: 'Swap Plates',
    abilityDesc: 'Drops active SBPD heat once',
    cooldown: 45,
    accent: '#38bdf8',
    skin: '#f1c7a4',
    hair: '#1e293b',
    jacket: '#0284c7',
    recruitedAtMission: 1,
  },
  {
    id: 'devon',
    name: 'Devon Brooks',
    role: 'Field Tuner',
    key: 'X',
    abilityName: 'Quick Fix',
    abilityDesc: 'Repairs ride to 100% + armor boost',
    cooldown: 30,
    accent: '#fbbf24',
    skin: '#8d5524',
    hair: '#111827',
    jacket: '#d97706',
    recruitedAtMission: 2,
  },
  {
    id: 'talia',
    name: 'Talia Reyes',
    role: 'Comms Spotter',
    key: 'C',
    abilityName: 'Eyes Out',
    abilityDesc: 'Reveals all SBPD units on radar',
    cooldown: 35,
    accent: '#f43f5e',
    skin: '#d9a077',
    hair: '#3b1d2a',
    jacket: '#e11d48',
    recruitedAtMission: 4,
  },
];

export const RANK_TITLES = [
  { title: 'DRIFTER', minRp: 0 },
  { title: 'WHEELMAN', minRp: 350 },
  { title: 'RUNNER', minRp: 900 },
  { title: 'FIXER', minRp: 1700 },
  { title: 'SHOT CALLER', minRp: 2800 },
  { title: 'BAY KINGPIN', minRp: 4200 },
];

export function createRng(seed = 1) {
  let a = (Number(seed) || 1) >>> 0;
  return function mulberry32() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function getDistrictAt(x, z) {
  if (z >= 90) return DISTRICTS[0];
  if (x < -90) return DISTRICTS[3];
  if (z < -90) return DISTRICTS[4];
  if (x >= 30) return DISTRICTS[1];
  return DISTRICTS[2];
}

export function getDistrictById(id) {
  return DISTRICTS.find((d) => d.id === id) || DISTRICTS[0];
}

export function getRankForRp(rp) {
  let idx = 0;
  for (let i = 0; i < RANK_TITLES.length; i++) {
    if (rp >= RANK_TITLES[i].minRp) idx = i;
  }
  const cur = RANK_TITLES[idx];
  const next = RANK_TITLES[idx + 1] || null;
  const span = next ? next.minRp - cur.minRp : 1000;
  const progress = next ? clamp((rp - cur.minRp) / span, 0, 1) : 1;
  return {
    level: idx + 1,
    title: cur.title,
    nextTitle: next ? next.title : 'MAX RANK',
    rp,
    nextRp: next ? next.minRp : cur.minRp,
    progress,
  };
}
