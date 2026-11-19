// Core constants, world grid metrics, districts, vehicle specs, weapons & seeded PRNG.

export const CITY = {
  gridCount: 6,        // 6x6 blocks => 7 avenues (X) x 7 streets (Z)
  blockSize: 56,       // Building lot footprint
  roadWidth: 18,       // 2-lane road + curbs
  sidewalkWidth: 4,
  get pitch() { return this.blockSize + this.roadWidth; }, // 74m center-to-center
  get span() { return this.gridCount * this.pitch; },      // 444m road-to-road
  get halfSpan() { return this.span * 0.5; },              // 222m
  beachStartX: 235,
  waterStartX: 288,
  worldBoundMinX: -255,
  worldBoundMaxX: 278,
  worldBoundMinZ: -255,
  worldBoundMaxZ: 255,
};

// Road centerlines along X and Z: index 0..6 => -222, -148, -74, 0, 74, 148, 222
export const ROAD_COORDS = Array.from(
  { length: CITY.gridCount + 1 },
  (_, i) => -CITY.halfSpan + i * CITY.pitch
);

export const DISTRICTS = [
  { id: 'miramar', name: 'MIRAMAR STRIP',  minX: 110,  maxX: 360,  minZ: -280, maxZ: 110,  accent: 0xff6b8b },
  { id: 'puerto',  name: 'PUERTO VERDE',   minX: -280, maxX: 360,  minZ: 110,  maxZ: 290,  accent: 0xffa94d },
  { id: 'centro',  name: 'PALMA CENTRO',   minX: -40,  maxX: 110,  minZ: -280, maxZ: 110,  accent: 0x3ce6d8 },
  { id: 'coral',   name: 'BARRIO CORAL',   minX: -280, maxX: -40,  minZ: -280, maxZ: 110,  accent: 0xffd166 },
];

export function getDistrictAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ) return d;
  }
  return DISTRICTS[0];
}

// Key landmarks on fixed road intersections / lots
export const LANDMARKS = {
  coralGarage:   { x: -111, z: -37,  entryX: -111, entryZ: -4,   label: 'CORAL GARAGE (RESPRAY $200)' },
  sunsetArmory:  { x: -111, z: 37,   entryX: -111, entryZ: 70,   label: 'SUNSET ARMORY' },
  miramarHotel:  { x: 185,  z: -111, entryX: 218,  entryZ: -111, label: 'HOTEL MIRAMAR' },
  palmaPlaza:    { x: 37,   z: -37,  entryX: 37,   entryZ: 0,    label: 'PALMA PLAZA' },
  marinaPier:    { x: 256,  z: 0,    entryX: 244,  entryZ: 0,    label: 'SOLANA MARINA PIER' },
  puertoDocks:   { x: 111,  z: 185,  entryX: 111,  entryZ: 152,  label: 'PUERTO VERDE DOCKS' },
  hospital:      { x: -37,  z: -185, entryX: -37,  entryZ: -148, label: 'SOLANA GENERAL HOSPITAL' },
  precinct:      { x: 37,   z: 111,  entryX: 37,   entryZ: 74,   label: 'SBPD CENTRAL PRECINCT' },
  stuntRamp:     { x: 245,  z: -74,  label: 'MARINA STUNT JUMP' },
};

export const VEHICLE_SPECS = {
  solara: {
    id: 'solara', name: 'SOLARA GT', kind: 'sports',
    length: 4.55, width: 2.02, height: 1.18,
    maxSpeed: 46, reverseSpeed: 14, accel: 28, brake: 42, steer: 2.45, grip: 8.8, driftGrip: 2.3, hp: 135,
    colors: [0xff3b6b, 0xff9f1c, 0x2ec4b6, 0xfff1d0, 0x9b5de5],
  },
  marlin: {
    id: 'marlin', name: 'MARLIN V8', kind: 'muscle',
    length: 4.85, width: 2.05, height: 1.32,
    maxSpeed: 41, reverseSpeed: 13, accel: 25, brake: 36, steer: 2.2, grip: 7.4, driftGrip: 1.9, hp: 170,
    colors: [0xe63946, 0x1d3557, 0xffbe0b, 0x2a9d8f, 0x22222e],
  },
  breeze: {
    id: 'breeze', name: 'BREEZE CABRIO', kind: 'cabrio',
    length: 4.45, width: 1.92, height: 1.16,
    maxSpeed: 37, reverseSpeed: 12, accel: 21, brake: 34, steer: 2.5, grip: 8.2, driftGrip: 2.4, hp: 120,
    colors: [0x64dfdf, 0xff8fab, 0xffd166, 0xf8edeb, 0x80ed99],
  },
  palma: {
    id: 'palma', name: 'PALMA SEDAN', kind: 'sedan',
    length: 4.6, width: 1.92, height: 1.4,
    maxSpeed: 33, reverseSpeed: 11, accel: 17.5, brake: 32, steer: 2.25, grip: 8.0, driftGrip: 2.5, hp: 145,
    colors: [0xd9e2ec, 0x5c677d, 0x3d5a80, 0xb5838d, 0xe0c097],
  },
  sierra: {
    id: 'sierra', name: 'SIERRA SUV', kind: 'suv',
    length: 5.0, width: 2.16, height: 1.82,
    maxSpeed: 31, reverseSpeed: 11, accel: 16, brake: 30, steer: 2.0, grip: 7.8, driftGrip: 2.8, hp: 230,
    colors: [0x2b2d42, 0x6c757d, 0x386641, 0x9e2a2b, 0xe9ecef],
  },
  interceptor: {
    id: 'interceptor', name: 'SBPD INTERCEPTOR', kind: 'police',
    length: 4.82, width: 2.04, height: 1.44,
    maxSpeed: 44, reverseSpeed: 14, accel: 25, brake: 40, steer: 2.4, grip: 8.6, driftGrip: 2.3, hp: 185,
    colors: [0x131926],
  },
};

export const WEAPONS = [
  { id: 'fists',   name: 'FISTS',           slot: 1, dmg: 22, range: 2.9,  fireRate: 0.42, spread: 0.0,  pellets: 1, mag: 0,  auto: false, melee: true,  cost: 0 },
  { id: 'pistol',  name: '9MM COASTAL',     slot: 2, dmg: 28, range: 62,   fireRate: 0.28, spread: 0.02, pellets: 1, mag: 12, auto: false, melee: false, cost: 0 },
  { id: 'smg',     name: 'VIPER SMG',       slot: 3, dmg: 16, range: 52,   fireRate: 0.095,spread: 0.055,pellets: 1, mag: 32, auto: true,  melee: false, cost: 400 },
  { id: 'shotgun', name: 'RIPTIDE SHOTGUN', slot: 4, dmg: 18, range: 30,   fireRate: 0.72, spread: 0.11, pellets: 6, mag: 6,  auto: false, melee: false, cost: 700 },
];

export const WANTED_CONFIG = {
  maxStars: 5,
  evadeDuration: [0, 14, 19, 25, 32, 40],
  maxCops: [0, 2, 4, 6, 8, 10],
  maxUnits: [0, 1, 2, 3, 4, 5],
};

// Deterministic PRNG (Mulberry32)
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

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function angleDiff(a, b) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
