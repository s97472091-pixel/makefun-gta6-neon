// Solana Bay — Core configuration, city grid metrics, districts, vehicles, weapons, wanted params & seeded PRNG

export const CITY = {
  GRID_BLOCKS: 6,
  BLOCK_SIZE: 44,
  ROAD_WIDTH: 16,
  CELL_SIZE: 60, // BLOCK_SIZE + ROAD_WIDTH
  HALF_SPAN: 180, // outermost road centerlines at -180 .. +180
  SIDEWALK_WIDTH: 3.6,
  LANE_OFFSET: 3.8,
  ROAD_COORDS: [-180, -120, -60, 0, 60, 120, 180],
  BLOCK_CENTERS: [-150, -90, -30, 30, 90, 150],
  BOARDWALK_MIN_X: 188,
  BOARDWALK_MAX_X: 202,
  BEACH_MIN_X: 202,
  BEACH_MAX_X: 248,
  OCEAN_MIN_X: 242,
  OCEAN_MAX_X: 540,
  PIER: {
    minX: 198,
    maxX: 278,
    minZ: -11,
    maxZ: 11,
    y: 1.35,
  },
  WORLD_BOUNDS: {
    minX: -202,
    maxX: 276,
    minZ: -202,
    maxZ: 202,
  },
};

export const DISTRICTS = [
  {
    id: 'miramar',
    name: 'MIRAMAR STRIP',
    subtitle: 'Neon Hotels & Coral Coast',
    style: 'artdeco',
    accent: '#ff5e9c',
    mapColor: '#3a2b3f',
    buildingPalette: ['#f7d6d0', '#ffe9c7', '#c9f0eb', '#ffd1e3', '#f4f0e8'],
    heightRange: [14, 34],
    test: (x, z) => x >= 0 && z >= 0,
  },
  {
    id: 'alba',
    name: 'ALBA FINANCIAL',
    subtitle: 'Glass Towers & Sky Plaza',
    style: 'glass',
    accent: '#38e8ff',
    mapColor: '#1f3647',
    buildingPalette: ['#7ec8d9', '#5aa6bf', '#9ad4df', '#b8d7e0', '#4f8ea8'],
    heightRange: [26, 56],
    test: (x, z) => x >= 0 && z < 0,
  },
  {
    id: 'calle_verde',
    name: 'CALLE VERDE',
    subtitle: 'Sunlit Terracotta & Customs',
    style: 'stucco',
    accent: '#ffb84d',
    mapColor: '#3d3023',
    buildingPalette: ['#e8a87c', '#f2cc8f', '#d98a6c', '#e6b89c', '#f4d9a6'],
    heightRange: [10, 22],
    test: (x, z) => x < 0 && z >= 0,
  },
  {
    id: 'puerto_ferro',
    name: 'PUERTO FERRO',
    subtitle: 'Docks, Yards & Ironworks',
    style: 'industrial',
    accent: '#ff7043',
    mapColor: '#2d2c30',
    buildingPalette: ['#7c7e85', '#96897b', '#6d757d', '#8c7465', '#5e666e'],
    heightRange: [9, 18],
    test: (x, z) => x < 0 && z < 0,
  },
];

export function getDistrictAt(x, z) {
  if (x > CITY.BOARDWALK_MIN_X) {
    return {
      id: 'coast',
      name: x > CITY.BEACH_MAX_X ? 'CORAL KEY MARINA' : 'SOLANA BEACHFRONT',
      subtitle: 'Golden Sands & Pier',
      style: 'artdeco',
      accent: '#2ce6d2',
    };
  }
  for (const d of DISTRICTS) {
    if (d.test(x, z)) return d;
  }
  return DISTRICTS[0];
}

export const LANDMARKS = {
  garage: {
    id: 'garage',
    name: 'El Sol Customs',
    type: 'garage',
    district: 'calle_verde',
    x: -90,
    z: 68, // bay opening right onto the z=60 avenue
    blockX: -90,
    blockZ: 90,
    radius: 7.5,
    color: '#2ce6d2',
    description: 'Respray & Repair ($250) — Clears Wanted Stars',
  },
  armory: {
    id: 'armory',
    name: 'Ironworks Armory',
    type: 'armory',
    district: 'puerto_ferro',
    x: -90,
    z: -68, // bay opening onto z=-60 avenue
    blockX: -90,
    blockZ: -90,
    radius: 6.5,
    color: '#ff9640',
    description: 'Weapons, Ammo & Body Armor',
  },
  marina: {
    id: 'marina',
    name: 'Coral Key Marina',
    type: 'landmark',
    district: 'miramar',
    x: 248,
    z: 0,
    radius: 10,
    color: '#38e8ff',
  },
  albaPlaza: {
    id: 'albaPlaza',
    name: 'Alba Sky Plaza',
    type: 'landmark',
    district: 'alba',
    x: 90,
    z: -90,
    radius: 12,
    color: '#ffd166',
  },
  miramarHotel: {
    id: 'miramarHotel',
    name: 'Hotel Solamar',
    type: 'landmark',
    district: 'miramar',
    x: 150,
    z: 90,
    radius: 10,
    color: '#ff5e9c',
  },
  ferroDepot: {
    id: 'ferroDepot',
    name: 'Puerto Ferro Depot',
    type: 'landmark',
    district: 'puerto_ferro',
    x: -150,
    z: -120,
    radius: 9,
    color: '#ff7043',
  },
  penthouse: {
    id: 'penthouse',
    name: 'Miramar Terrace',
    type: 'landmark',
    district: 'miramar',
    x: 180,
    z: 120,
    radius: 9,
    color: '#ff5e9c',
  },
};

// Six distinct vehicle classes
export const VEHICLE_CLASSES = {
  sports: {
    id: 'sports',
    name: 'Solara GT',
    width: 2.15,
    height: 1.28,
    length: 4.55,
    maxSpeed: 42,
    reverseSpeed: 14,
    accel: 28,
    brake: 38,
    turnRate: 2.55,
    grip: 7.2,
    driftGrip: 2.1,
    mass: 1.0,
    maxHp: 130,
    trafficWeight: 0.16,
    colors: ['#ff3b6b', '#00d2d3', '#ff9f1a', '#ffd32a', '#ff5e57', '#f5f6fa'],
  },
  muscle: {
    id: 'muscle',
    name: 'Vaquero V8',
    width: 2.2,
    height: 1.38,
    length: 4.8,
    maxSpeed: 38,
    reverseSpeed: 13,
    accel: 25,
    brake: 34,
    turnRate: 2.35,
    grip: 6.2,
    driftGrip: 1.85,
    mass: 1.25,
    maxHp: 160,
    trafficWeight: 0.18,
    colors: ['#ff6b35', '#f7b731', '#2bcbba', '#eb3b5a', '#4b7bec', '#2d3436'],
  },
  sedan: {
    id: 'sedan',
    name: 'Palma LX',
    width: 2.05,
    height: 1.44,
    length: 4.5,
    maxSpeed: 31,
    reverseSpeed: 12,
    accel: 19,
    brake: 32,
    turnRate: 2.3,
    grip: 7.0,
    driftGrip: 2.4,
    mass: 1.1,
    maxHp: 145,
    trafficWeight: 0.34,
    colors: ['#dfe6e9', '#74b9ff', '#ffeaa7', '#fab1a0', '#81ecec', '#636e72', '#a29bfe'],
  },
  suv: {
    id: 'suv',
    name: 'Cabo XL',
    width: 2.28,
    height: 1.82,
    length: 4.85,
    maxSpeed: 29,
    reverseSpeed: 11,
    accel: 17,
    brake: 30,
    turnRate: 2.05,
    grip: 6.8,
    driftGrip: 2.6,
    mass: 1.65,
    maxHp: 210,
    trafficWeight: 0.2,
    colors: ['#2f3542', '#eccc68', '#5352ed', '#2ed573', '#ced6e0', '#b33939'],
  },
  van: {
    id: 'van',
    name: 'Brutus Cargo',
    width: 2.35,
    height: 2.2,
    length: 5.3,
    maxSpeed: 26,
    reverseSpeed: 10,
    accel: 14,
    brake: 28,
    turnRate: 1.85,
    grip: 6.4,
    driftGrip: 2.9,
    mass: 2.1,
    maxHp: 270,
    trafficWeight: 0.12,
    colors: ['#f1f2f6', '#ff7f50', '#57606f', '#70a1ff', '#e1b12c'],
  },
  police: {
    id: 'police',
    name: 'SBPD Interceptor',
    width: 2.12,
    height: 1.48,
    length: 4.75,
    maxSpeed: 40,
    reverseSpeed: 14,
    accel: 26,
    brake: 36,
    turnRate: 2.45,
    grip: 7.4,
    driftGrip: 2.3,
    mass: 1.35,
    maxHp: 190,
    trafficWeight: 0,
    colors: ['#161b26'],
  },
};

export const TRAFFIC_CLASS_KEYS = ['sports', 'muscle', 'sedan', 'suv', 'van'];

// Three firearms + melee fists (slots 1..4)
export const WEAPONS = [
  {
    id: 'fists',
    slot: 1,
    name: 'FISTS',
    type: 'melee',
    damage: 24,
    fireRate: 0.42,
    range: 2.7,
    magSize: 0,
    maxReserve: 0,
    reloadTime: 0,
    spread: 0,
    pellets: 1,
    auto: false,
    unlockedDefault: true,
    cost: 0,
    ammoCost: 0,
    tracerColor: 0xffffff,
  },
  {
    id: 'pistol',
    slot: 2,
    name: 'M9 COASTAL',
    type: 'gun',
    damage: 28,
    fireRate: 0.24,
    range: 75,
    magSize: 12,
    maxReserve: 96,
    reloadTime: 1.25,
    spread: 0.018,
    pellets: 1,
    auto: false,
    unlockedDefault: true,
    cost: 0,
    ammoCost: 60,
    tracerColor: 0xffe48f,
  },
  {
    id: 'smg',
    slot: 3,
    name: 'VIPER SMG',
    type: 'gun',
    damage: 16,
    fireRate: 0.09,
    range: 62,
    magSize: 30,
    maxReserve: 180,
    reloadTime: 1.55,
    spread: 0.042,
    pellets: 1,
    auto: true,
    unlockedDefault: false,
    cost: 400,
    ammoCost: 110,
    tracerColor: 0xffc048,
  },
  {
    id: 'shotgun',
    slot: 4,
    name: 'BREACHER 12G',
    type: 'gun',
    damage: 18,
    fireRate: 0.78,
    range: 34,
    magSize: 6,
    maxReserve: 36,
    reloadTime: 1.85,
    spread: 0.095,
    pellets: 6,
    auto: false,
    unlockedDefault: false,
    cost: 600,
    ammoCost: 120,
    tracerColor: 0xff7b47,
  },
];

// Five-star wanted escalation table
export const WANTED_LEVELS = [
  { stars: 0, heatMin: 0, maxCruisers: 0, maxOfficers: 0, chaseSpeed: 0, shootAcc: 0, evadeTime: 0, spawnInterval: 99 },
  { stars: 1, heatMin: 20, maxCruisers: 1, maxOfficers: 2, chaseSpeed: 24, shootAcc: 0.35, evadeTime: 12, spawnInterval: 7.0 },
  { stars: 2, heatMin: 55, maxCruisers: 2, maxOfficers: 4, chaseSpeed: 29, shootAcc: 0.48, evadeTime: 16, spawnInterval: 5.5 },
  { stars: 3, heatMin: 110, maxCruisers: 3, maxOfficers: 6, chaseSpeed: 33, shootAcc: 0.58, evadeTime: 20, spawnInterval: 4.5 },
  { stars: 4, heatMin: 185, maxCruisers: 4, maxOfficers: 8, chaseSpeed: 37, shootAcc: 0.68, evadeTime: 25, spawnInterval: 3.8 },
  { stars: 5, heatMin: 280, maxCruisers: 5, maxOfficers: 10, chaseSpeed: 40, shootAcc: 0.78, evadeTime: 30, spawnInterval: 3.2 },
];

export const GAME_CONSTANTS = {
  WALK_SPEED: 5.8,
  SPRINT_SPEED: 9.8,
  JUMP_VELOCITY: 7.6,
  GRAVITY: 21.0,
  PLAYER_RADIUS: 0.48,
  PLAYER_HEIGHT: 1.78,
  RESPRAY_COST: 250,
  ARMOR_COST: 150,
  HOSPITAL_FEE: 150,
  BAIL_FEE: 200,
  BUST_DISTANCE: 4.5,
  BUST_TIME: 2.6,
  HOSPITAL_SPAWN: { x: 120, z: 60 },
  PRECINCT_SPAWN: { x: 0, z: -60 },
  START_SPAWN: { x: 180, z: 96 },
};

// Seeded mulberry32 PRNG for deterministic city & screenshot modes
export function createRng(seed = 1) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function rngInt(rng, min, maxInclusive) {
  return Math.floor(rngRange(rng, min, maxInclusive + 0.9999));
}

export function rngPick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
