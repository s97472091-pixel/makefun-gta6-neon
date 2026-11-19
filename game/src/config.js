// Solana Bay — Central Configuration, World Constants, Specs & Seeded PRNG

export const WORLD = {
  // Playable city spans x in [-260, 260], z in [-260, 260]
  // East of x = 185 is the sandy beachfront, boardwalk, and turquoise Solana Bay ocean.
  // South of z = 195 is the southern harbor & marina bay.
  minX: -240,
  maxX: 255,
  minZ: -240,
  maxZ: 245,
  beachStartX: 182,
  oceanStartX: 224,
  southHarborZ: 188,
  waterLevel: -0.45,
  roadWidth: 16,
  sidewalkWidth: 4.5,
  blockSize: 64,
  // Road centerlines along X (North-South avenues) and Z (East-West streets)
  roadX: [-192, -128, -64, 0, 64, 128, 170],
  roadZ: [-192, -128, -64, 0, 64, 128, 174],
};

// Seeded deterministic PRNG (Mulberry32)
export function createRng(seed = 1) {
  let a = (seed >>> 0) || 1;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let activeRng = Math.random;
export function setGlobalSeed(seed) {
  activeRng = seed != null ? createRng(seed) : Math.random;
}
export function rand() {
  return activeRng();
}
export function randRange(min, max) {
  return min + (max - min) * activeRng();
}
export function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}
export function pick(arr) {
  return arr[Math.floor(activeRng() * arr.length)];
}

export const DISTRICTS = [
  {
    id: 'miramar',
    name: 'MIRAMAR STRIP',
    subtitle: 'Art-Deco hotels, neon palms & golden surf',
    color: '#ff6b9d',
    check: (x, z) => x >= 32 && z >= -32,
  },
  {
    id: 'downtown',
    name: 'DOWNTOWN CORONA',
    subtitle: 'Glass financial towers & skyline avenues',
    color: '#38d9f5',
    check: (x, z) => x >= -32 && z < -32,
  },
  {
    id: 'docks',
    name: 'SUNSET DOCKS',
    subtitle: 'Container yards, marina pier & Vega Auto',
    color: '#ffb347',
    check: (x, z) => x < 32 && z >= 0,
  },
  {
    id: 'palma',
    name: 'PALMA HEIGHTS',
    subtitle: 'Hillside terracotta villas & Solis Estate',
    color: '#7ef29d',
    check: (x, z) => x < -32 && z < 0,
  },
];

export function getDistrict(x, z) {
  if (x >= WORLD.beachStartX) {
    return { id: 'beach', name: 'SOLANA BEACH', color: '#ffd166' };
  }
  for (const d of DISTRICTS) {
    if (d.check(x, z)) return d;
  }
  return DISTRICTS[0];
}

export const LANDMARKS = {
  resprayGarage: { x: -96, z: 96, radius: 11, name: "Vega's Respray Garage", cost: 250 },
  armory: { x: -32, z: 32, radius: 9, name: "Kira's Coastal Armory" },
  hospital: { x: 32, z: -96, name: 'Solana Bay Medical Center' },
  precinct: { x: -32, z: -96, name: 'SBPD Central Precinct' },
  marinaPier: { x: -96, z: 215, name: 'Sunset Marina Pier' },
  solisVilla: { x: -160, z: -160, name: 'Solis Villa Estate' },
  clubVerano: { x: 148, z: 32, name: 'Club Verano' },
  helipad: { x: -32, z: 218, name: 'Marina Penthouse Helipad' },
};

export const VEHICLE_CLASSES = {
  solara: {
    id: 'solara',
    name: 'Solara GT',
    category: 'Sports',
    width: 2.15,
    height: 1.18,
    length: 4.55,
    maxSpeed: 50,
    reverseSpeed: 16,
    accel: 34,
    brake: 46,
    turnRate: 2.45,
    driftGrip: 0.91,
    grip: 0.96,
    hp: 115,
    mass: 1.25,
    colors: [0xff4f79, 0x00d4d8, 0xff9f1c, 0xfff3d6, 0x7b5cff, 0xff2a55],
    trafficWeight: 18,
  },
  miramar: {
    id: 'miramar',
    name: 'Miramar Convertible',
    category: 'Cruiser',
    width: 2.05,
    height: 1.16,
    length: 4.6,
    maxSpeed: 42,
    reverseSpeed: 14,
    accel: 26,
    brake: 40,
    turnRate: 2.35,
    driftGrip: 0.9,
    grip: 0.955,
    hp: 105,
    mass: 1.3,
    colors: [0x5be7c4, 0xff9ebb, 0xffe082, 0x80d8ff, 0xfaf0e6],
    trafficWeight: 22,
  },
  muscle: {
    id: 'muscle',
    name: 'Vega Muscle',
    category: 'Muscle',
    width: 2.15,
    height: 1.32,
    length: 4.85,
    maxSpeed: 46,
    reverseSpeed: 15,
    accel: 32,
    brake: 38,
    turnRate: 2.2,
    driftGrip: 0.88,
    grip: 0.945,
    hp: 135,
    mass: 1.55,
    colors: [0xe63946, 0xf4a261, 0x2a9d8f, 0x264653, 0xffc300, 0x9b5de5],
    trafficWeight: 20,
  },
  suv: {
    id: 'suv',
    name: 'Palma SUV',
    category: 'SUV',
    width: 2.25,
    height: 1.75,
    length: 4.9,
    maxSpeed: 38,
    reverseSpeed: 13,
    accel: 23,
    brake: 36,
    turnRate: 2.05,
    driftGrip: 0.91,
    grip: 0.955,
    hp: 185,
    mass: 2.1,
    colors: [0xf1faee, 0x1d3557, 0x457b9d, 0x2b2d42, 0xd4a373],
    trafficWeight: 20,
  },
  van: {
    id: 'van',
    name: 'Harbor Van',
    category: 'Utility',
    width: 2.3,
    height: 2.15,
    length: 5.3,
    maxSpeed: 33,
    reverseSpeed: 11,
    accel: 18,
    brake: 32,
    turnRate: 1.85,
    driftGrip: 0.92,
    grip: 0.96,
    hp: 210,
    mass: 2.5,
    colors: [0xe9ecef, 0xf6bd60, 0x52b788, 0x4ea8de],
    trafficWeight: 14,
  },
  interceptor: {
    id: 'interceptor',
    name: 'SBPD Interceptor',
    category: 'Police',
    width: 2.15,
    height: 1.38,
    length: 4.85,
    maxSpeed: 49,
    reverseSpeed: 16,
    accel: 33,
    brake: 45,
    turnRate: 2.45,
    driftGrip: 0.91,
    grip: 0.96,
    hp: 165,
    mass: 1.65,
    colors: [0x151b26],
    isPolice: true,
    trafficWeight: 6,
  },
  enforcer: {
    id: 'enforcer',
    name: 'SBPD Enforcer',
    category: 'SWAT',
    width: 2.45,
    height: 2.35,
    length: 5.75,
    maxSpeed: 40,
    reverseSpeed: 12,
    accel: 24,
    brake: 36,
    turnRate: 1.9,
    driftGrip: 0.92,
    grip: 0.965,
    hp: 300,
    mass: 3.1,
    colors: [0x1b263b],
    isPolice: true,
    isSwat: true,
    trafficWeight: 0,
  },
};

export const WEAPONS = [
  {
    id: 'fists',
    key: '1',
    name: 'FISTS',
    damage: 24,
    fireRate: 0.42,
    range: 2.9,
    magSize: 0,
    maxAmmo: 0,
    spread: 0,
    pellets: 1,
    automatic: false,
    melee: true,
    reloadTime: 0,
    color: 0xffffff,
  },
  {
    id: 'pistol',
    key: '2',
    name: '9MM PISTOL',
    damage: 28,
    fireRate: 0.24,
    range: 78,
    magSize: 12,
    maxAmmo: 144,
    spread: 0.018,
    pellets: 1,
    automatic: false,
    melee: false,
    reloadTime: 1.15,
    color: 0xffe066,
  },
  {
    id: 'smg',
    key: '3',
    name: 'VIPER SMG',
    damage: 18,
    fireRate: 0.095,
    range: 66,
    magSize: 30,
    maxAmmo: 270,
    spread: 0.044,
    pellets: 1,
    automatic: true,
    melee: false,
    reloadTime: 1.35,
    color: 0xff9f43,
  },
  {
    id: 'shotgun',
    key: '4',
    name: 'BREAKER SHOTGUN',
    damage: 17,
    fireRate: 0.78,
    range: 42,
    magSize: 8,
    maxAmmo: 64,
    spread: 0.095,
    pellets: 6,
    automatic: false,
    melee: false,
    reloadTime: 1.75,
    color: 0xff6b6b,
  },
];

export const WANTED_TIERS = [
  { stars: 0, maxCars: 0, maxFoot: 0, chopper: false, swat: false, evadeSeconds: 0 },
  { stars: 1, maxCars: 2, maxFoot: 2, chopper: false, swat: false, evadeSeconds: 10 },
  { stars: 2, maxCars: 3, maxFoot: 3, chopper: false, swat: false, evadeSeconds: 14 },
  { stars: 3, maxCars: 4, maxFoot: 4, chopper: true, swat: false, evadeSeconds: 18 },
  { stars: 4, maxCars: 5, maxFoot: 5, chopper: true, swat: true, evadeSeconds: 22 },
  { stars: 5, maxCars: 6, maxFoot: 6, chopper: true, swat: true, evadeSeconds: 26 },
];

export const PALETTE = {
  pastelHotels: [0xff9ebb, 0x7de2d1, 0xffc88a, 0xfff1d6, 0x9be0ff, 0xf7a8ff],
  downtownGlass: [0x2b4560, 0x355c7d, 0x456990, 0x23394d, 0x3c6e71, 0x4a5568],
  villaStucco: [0xfae1c3, 0xf4cfb0, 0xf7e7ce, 0xe8c5a5, 0xf2d7b6],
  containers: [0xd94e4e, 0x2b7cb3, 0xe89b3c, 0x2e8b7a, 0x6c5ce7],
  neonAccents: [0xff4fa3, 0x00f5d4, 0xffbe0b, 0x38d9f5, 0xff6b6b],
};
