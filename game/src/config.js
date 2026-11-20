// Solana Bay — core configuration, world metrics, vehicles, weapons, wanted levels, and seeded PRNG.

export const CITY = {
  gridBlocks: 6,
  blockSize: 34,
  roadWidth: 14,
  sidewalkWidth: 3.2,
  cellStep: 48, // blockSize + roadWidth
  laneOffset: 3.4,
  halfSpan: 144, // (6 / 2) * 48
  roadEdge: 151, // halfSpan + roadWidth / 2
  boardwalkStart: 151,
  boardwalkEnd: 161,
  beachStart: 161,
  beachEnd: 204,
  oceanStart: 204,
  worldMinX: -158,
  worldMaxX: 252,
  worldMinZ: -158,
  worldMaxZ: 158,
  pierZ: 96,
  pierStartX: 159,
  pierEndX: 244,
  pierHalfWidth: 5.5,
  gravity: 26,
};

export function roadCoord(index) {
  return (index - CITY.gridBlocks / 2) * CITY.cellStep;
}

export function blockCoord(index) {
  return (index - (CITY.gridBlocks - 1) / 2) * CITY.cellStep;
}

export const ROAD_COORDS = Array.from({ length: CITY.gridBlocks + 1 }, (_, i) => roadCoord(i));
export const BLOCK_COORDS = Array.from({ length: CITY.gridBlocks }, (_, i) => blockCoord(i));

export const DISTRICTS = [
  {
    id: 'coral-promenade',
    name: 'CORAL PROMENADE',
    subtitle: 'Art Deco Beachfront & Strip',
    style: 'deco',
    minX: 0,
    maxX: 260,
    minZ: -170,
    maxZ: 0,
    accent: '#ff6b9d',
    mapColor: '#3a2c3d',
    minFloors: 3,
    maxFloors: 7,
    palette: ['#f8d8c8', '#ffe4d1', '#d8f3ee', '#fbd1dc', '#f5e6be'],
    neonColors: ['#ff4fa3', '#2ef2e0', '#ffb347', '#ff6e7f'],
  },
  {
    id: 'alta-glass',
    name: 'ALTA GLASS',
    subtitle: 'Downtown Financial Towers',
    style: 'glass',
    minX: -170,
    maxX: 0,
    minZ: -170,
    maxZ: 0,
    accent: '#4cc9f0',
    mapColor: '#253244',
    minFloors: 7,
    maxFloors: 14,
    palette: ['#87a9c4', '#7093b0', '#9ab5cc', '#607d96', '#aac2d4'],
    neonColors: ['#38d9ff', '#ffd166', '#69f0ae', '#a594f9'],
  },
  {
    id: 'harbor-docks',
    name: 'HARBOR DOCKS',
    subtitle: 'Warehouses & Marina Pier',
    style: 'industrial',
    minX: 0,
    maxX: 260,
    minZ: 0,
    maxZ: 170,
    accent: '#f4a261',
    mapColor: '#332e2a',
    minFloors: 2,
    maxFloors: 4,
    palette: ['#8b6f5c', '#766b63', '#997c66', '#6c757d', '#8e6353'],
    neonColors: ['#ff9f43', '#ff5e57', '#48dbfb', '#feca57'],
  },
  {
    id: 'sunset-palms',
    name: 'SUNSET PALMS',
    subtitle: 'Mid-Rise Strip & Backstreets',
    style: 'residential',
    minX: -170,
    maxX: 0,
    minZ: 0,
    maxZ: 170,
    accent: '#ffd166',
    mapColor: '#3b332b',
    minFloors: 3,
    maxFloors: 6,
    palette: ['#e8b98a', '#dfb08a', '#d99e7c', '#e6c999', '#cfa07e'],
    neonColors: ['#ffbe0b', '#ff006e', '#fb5607', '#3a86ff'],
  },
];

export function getDistrictAt(x, z) {
  if (x >= CITY.boardwalkStart && z < 48) {
    return DISTRICTS[0];
  }
  for (const d of DISTRICTS) {
    if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ) {
      return d;
    }
  }
  return DISTRICTS[0];
}

export const LANDMARKS = {
  resprayGarage: {
    id: 'respray',
    name: 'Palma Spray & Customs',
    shortName: 'RESPRAY',
    x: -96,
    z: 84,
    radius: 7.5,
    cost: 200,
    color: '#ffbe0b',
  },
  armory: {
    id: 'armory',
    name: 'Ironworks Armory',
    shortName: 'ARMORY',
    x: 96,
    z: 84,
    radius: 7.0,
    cost: 150,
    color: '#ef476f',
  },
  coralHotel: {
    id: 'coral-hotel',
    name: 'The Mirage Palms',
    x: 120,
    z: -48,
  },
  altaTower: {
    id: 'alta-tower',
    name: 'Alta Zenith Plaza',
    x: -48,
    z: -96,
  },
  marinaPier: {
    id: 'marina-pier',
    name: 'Solana Marina Pier',
    x: 224,
    z: 96,
  },
  syndicateDepot: {
    id: 'syndicate-depot',
    name: 'Pelican Syndicate Depot',
    x: 120,
    z: 144,
  },
  sunsetPlaza: {
    id: 'sunset-plaza',
    name: 'Sunset Palms Corner',
    x: -48,
    z: 48,
  },
  policeHQ: {
    id: 'police-hq',
    name: 'SBPD Central Precinct',
    x: -48,
    z: 0,
  },
  boardwalkSouth: {
    id: 'boardwalk',
    name: 'Coral Boardwalk',
    x: 156,
    z: -24,
  },
};

export const VEHICLE_CLASSES = {
  coupe: {
    id: 'coupe',
    name: 'Solara Coupe',
    width: 2.05,
    height: 1.32,
    length: 4.35,
    maxSpeed: 37,
    reverseSpeed: 12,
    accel: 22,
    brake: 36,
    turnRate: 2.45,
    grip: 7.5,
    driftGrip: 2.4,
    mass: 1.15,
    maxHp: 115,
    colors: ['#ff5e7e', '#2ec4b6', '#ffbe0b', '#fb5607', '#8338ec', '#e9ecef'],
    spawnWeight: 24,
  },
  sedan: {
    id: 'sedan',
    name: 'Bayrunner Sedan',
    width: 2.0,
    height: 1.42,
    length: 4.6,
    maxSpeed: 32,
    reverseSpeed: 11,
    accel: 18,
    brake: 32,
    turnRate: 2.25,
    grip: 8.2,
    driftGrip: 2.9,
    mass: 1.3,
    maxHp: 130,
    colors: ['#d8e2dc', '#457b9d', '#a8dadc', '#6d6875', '#e5989b', '#2b2d42'],
    spawnWeight: 28,
  },
  suv: {
    id: 'suv',
    name: 'Coastline SUV',
    width: 2.25,
    height: 1.78,
    length: 4.85,
    maxSpeed: 29,
    reverseSpeed: 10,
    accel: 15.5,
    brake: 28,
    turnRate: 2.0,
    grip: 8.6,
    driftGrip: 3.3,
    mass: 1.85,
    maxHp: 175,
    colors: ['#264653', '#2a9d8f', '#e9c46a', '#4a4e69', '#bc6c25', '#f4f1de'],
    spawnWeight: 18,
  },
  sports: {
    id: 'sports',
    name: 'Riptide GT',
    width: 2.15,
    height: 1.18,
    length: 4.55,
    maxSpeed: 46,
    reverseSpeed: 14,
    accel: 30,
    brake: 42,
    turnRate: 2.75,
    grip: 8.4,
    driftGrip: 2.1,
    mass: 1.05,
    maxHp: 105,
    colors: ['#ff006e', '#00f5d4', '#ff9f1c', '#3a86ff', '#ffee32', '#ffffff'],
    spawnWeight: 14,
  },
  van: {
    id: 'van',
    name: 'Dockhand Van',
    width: 2.22,
    height: 2.05,
    length: 5.1,
    maxSpeed: 25,
    reverseSpeed: 9,
    accel: 13.5,
    brake: 25,
    turnRate: 1.85,
    grip: 8.0,
    driftGrip: 3.6,
    mass: 2.1,
    maxHp: 190,
    colors: ['#f8f9fa', '#495057', '#d4a373', '#52796f', '#e07a5f'],
    spawnWeight: 16,
  },
  police: {
    id: 'police',
    name: 'SBPD Interceptor',
    width: 2.08,
    height: 1.46,
    length: 4.75,
    maxSpeed: 41,
    reverseSpeed: 13,
    accel: 25,
    brake: 38,
    turnRate: 2.55,
    grip: 8.8,
    driftGrip: 2.6,
    mass: 1.5,
    maxHp: 160,
    colors: ['#161a24'],
    spawnWeight: 0,
    isPolice: true,
  },
};

export const CIVILIAN_VEHICLE_KEYS = Object.keys(VEHICLE_CLASSES).filter(
  (k) => !VEHICLE_CLASSES[k].isPolice
);

export const WEAPONS = [
  {
    id: 'fists',
    slot: 1,
    name: 'BARE FISTS',
    shortName: 'FISTS',
    type: 'melee',
    damage: 26,
    range: 2.6,
    fireRate: 0.42,
    magSize: 0,
    maxReserve: 0,
    reloadTime: 0,
    spread: 0,
    pellets: 1,
    driveBy: false,
    tracerColor: 0xffffff,
  },
  {
    id: 'pistol',
    slot: 2,
    name: 'MARLIN 9MM',
    shortName: '9MM',
    type: 'hitscan',
    damage: 28,
    range: 72,
    fireRate: 0.24,
    magSize: 12,
    maxReserve: 96,
    startReserve: 60,
    reloadTime: 1.15,
    spread: 0.014,
    pellets: 1,
    driveBy: true,
    tracerColor: 0xffe49e,
  },
  {
    id: 'smg',
    slot: 3,
    name: 'TIDEBREAKER SMG',
    shortName: 'SMG',
    type: 'hitscan',
    damage: 18,
    range: 62,
    fireRate: 0.095,
    magSize: 30,
    maxReserve: 210,
    startReserve: 120,
    reloadTime: 1.45,
    spread: 0.036,
    pellets: 1,
    driveBy: true,
    tracerColor: 0xffc857,
  },
  {
    id: 'shotgun',
    slot: 4,
    name: 'REEF 12G',
    shortName: '12G',
    type: 'hitscan',
    damage: 16,
    range: 34,
    fireRate: 0.72,
    magSize: 6,
    maxReserve: 42,
    startReserve: 24,
    reloadTime: 1.8,
    spread: 0.085,
    pellets: 6,
    driveBy: false,
    tracerColor: 0xff9f43,
  },
];

export const WANTED_LEVELS = [
  { stars: 0, heatMin: 0, maxCars: 0, maxOfficers: 0, evadeSeconds: 0, copSpeedScale: 1.0, shootAccuracy: 0.0 },
  { stars: 1, heatMin: 18, maxCars: 1, maxOfficers: 2, evadeSeconds: 12, copSpeedScale: 0.88, shootAccuracy: 0.45 },
  { stars: 2, heatMin: 50, maxCars: 2, maxOfficers: 4, evadeSeconds: 16, copSpeedScale: 0.96, shootAccuracy: 0.56 },
  { stars: 3, heatMin: 100, maxCars: 3, maxOfficers: 6, evadeSeconds: 20, copSpeedScale: 1.04, shootAccuracy: 0.66 },
  { stars: 4, heatMin: 170, maxCars: 4, maxOfficers: 8, evadeSeconds: 25, copSpeedScale: 1.12, shootAccuracy: 0.74 },
  { stars: 5, heatMin: 260, maxCars: 5, maxOfficers: 10, evadeSeconds: 30, copSpeedScale: 1.2, shootAccuracy: 0.82 },
];

export const POLICE_CONFIG = {
  sightRange: 64,
  dismountDistance: 24,
  bustRange: 6.2,
  bustSpeedThreshold: 4.0,
  bustSeconds: 3.4,
  officerHp: 65,
  officerSpeed: 7.4,
  officerFireRate: 0.95,
  officerDamage: 7,
  spawnMinDist: 52,
  spawnMaxDist: 92,
};

export function createPRNG(seed = 1) {
  let state = (Number(seed) || 1) >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export function dist2D(ax, az, bx, bz) {
  return Math.hypot(bx - ax, bz - az);
}
