// Solana Bay — procedural 3D city builder, coastal environment, landmarks, and collision helpers.

import * as THREE from 'three';
import {
  CITY,
  ROAD_COORDS,
  BLOCK_COORDS,
  LANDMARKS,
  getDistrictAt,
  createPRNG,
  clamp,
} from './config.js';
import { createTexturePack } from './textures.js';

function createSkyDome() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#16467a');
  grad.addColorStop(0.32, '#3a86b7');
  grad.addColorStop(0.56, '#f6a77e');
  grad.addColorStop(0.72, '#ffd49b');
  grad.addColorStop(1.0, '#7db7d4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
  return new THREE.Mesh(new THREE.SphereGeometry(520, 24, 16), mat);
}

function createPalmTree(trunkMat, frondMat, scale = 1, lean = 0.14) {
  const group = new THREE.Group();
  const segs = 4;
  let y = 0;
  let offsetX = 0;
  for (let i = 0; i < segs; i++) {
    const h = 1.65 * scale;
    const rTop = (0.24 - i * 0.03) * scale;
    const rBot = (0.29 - i * 0.03) * scale;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 7), trunkMat);
    seg.position.set(offsetX, y + h * 0.5, 0);
    seg.rotation.z = -lean * (i + 1) * 0.35;
    group.add(seg);
    y += h * 0.96;
    offsetX += Math.sin(lean * (i + 1) * 0.35) * h * 0.5;
  }

  const crown = new THREE.Group();
  crown.position.set(offsetX, y, 0);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.08 * scale, 3.1 * scale), frondMat);
    frond.position.set(Math.sin(angle) * 1.3 * scale, 0.15 * scale, Math.cos(angle) * 1.3 * scale);
    frond.rotation.y = angle;
    frond.rotation.x = 0.32;
    crown.add(frond);
  }
  group.add(crown);
  return group;
}

function createStreetLamp(poleMat, bulbMat) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 6.2, 6), poleMat);
  pole.position.y = 3.1;
  g.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.12), poleMat);
  arm.position.set(0.65, 6.05, 0);
  g.add(arm);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.35), bulbMat);
  head.position.set(1.25, 5.95, 0);
  g.add(head);
  return g;
}

export function buildCity(scene, seed = 1) {
  const rand = createPRNG(seed * 7919 + 17);
  const textures = createTexturePack();
  const colliders = []; // { minX, maxX, minZ, maxZ, maxY }
  const buildingMeshes = [];
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  // Sky, fog, and warm golden-hour coastal lighting
  scene.fog = new THREE.FogExp2(0xebb894, 0.0023);
  cityGroup.add(createSkyDome());

  const hemi = new THREE.HemisphereLight(0xffe7cb, 0x3b5870, 0.95);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffdfb0, 1.85);
  sun.position.set(150, 130, -90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 480;
  const d = 185;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Visible warm coastal sun disc
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(14, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe4a8, fog: false })
  );
  sunDisc.position.set(290, 145, -170);
  cityGroup.add(sunDisc);

  // Base urban ground
  const baseGround = new THREE.Mesh(
    new THREE.PlaneGeometry(340, 340),
    new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.95 })
  );
  baseGround.rotation.x = -Math.PI / 2;
  baseGround.position.set(-10, -0.04, 0);
  baseGround.receiveShadow = true;
  cityGroup.add(baseGround);

  // Road segments & intersections
  const roadMatNS = new THREE.MeshStandardMaterial({ map: textures.asphalt, roughness: 0.88 });
  const asphaltEW = textures.asphalt.clone();
  asphaltEW.needsUpdate = true;
  asphaltEW.center.set(0.5, 0.5);
  asphaltEW.rotation = Math.PI / 2;
  const roadMatEW = new THREE.MeshStandardMaterial({ map: asphaltEW, roughness: 0.88 });
  const interMat = new THREE.MeshStandardMaterial({ map: textures.intersection, roughness: 0.86 });

  const roadSegLen = CITY.blockSize;
  const roadGeomNS = new THREE.PlaneGeometry(CITY.roadWidth, roadSegLen);
  const roadGeomEW = new THREE.PlaneGeometry(roadSegLen, CITY.roadWidth);
  const interGeom = new THREE.PlaneGeometry(CITY.roadWidth, CITY.roadWidth);

  for (let i = 0; i < ROAD_COORDS.length; i++) {
    const r = ROAD_COORDS[i];
    for (let j = 0; j < BLOCK_COORDS.length; j++) {
      const b = BLOCK_COORDS[j];
      const segNS = new THREE.Mesh(roadGeomNS, roadMatNS);
      segNS.rotation.x = -Math.PI / 2;
      segNS.position.set(r, 0.01, b);
      segNS.receiveShadow = true;
      cityGroup.add(segNS);

      const segEW = new THREE.Mesh(roadGeomEW, roadMatEW);
      segEW.rotation.x = -Math.PI / 2;
      segEW.position.set(b, 0.01, r);
      segEW.receiveShadow = true;
      cityGroup.add(segEW);
    }
    for (let j = 0; j < ROAD_COORDS.length; j++) {
      const inter = new THREE.Mesh(interGeom, interMat);
      inter.rotation.x = -Math.PI / 2;
      inter.position.set(r, 0.02, ROAD_COORDS[j]);
      inter.receiveShadow = true;
      cityGroup.add(inter);
    }
  }

  // Materials shared across blocks
  const sidewalkMat = new THREE.MeshStandardMaterial({ map: textures.sidewalk, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.9 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf4ece1, roughness: 0.65 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a573d, roughness: 0.92 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3b8c4f, roughness: 0.75 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x343a40, roughness: 0.5, metalness: 0.5 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff1c9,
    emissive: 0xffc864,
    emissiveIntensity: 0.85,
  });

  const facadeMats = {};
  for (const [style, list] of Object.entries(textures.facades)) {
    facadeMats[style] = list.map(
      (tex) =>
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: style === 'glass' ? 0.28 : 0.78,
          metalness: style === 'glass' ? 0.45 : 0.08,
        })
    );
  }
  const neonMats = textures.neonSigns.map(
    (tex) =>
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.85,
        roughness: 0.4,
      })
  );

  // Build 6x6 blocks: sidewalks, buildings, neon signs, rooftop details, lamps, palms
  const curbHeight = 0.24;
  const blockGeom = new THREE.BoxGeometry(CITY.blockSize, curbHeight, CITY.blockSize);

  for (let bx = 0; bx < CITY.gridBlocks; bx++) {
    for (let bz = 0; bz < CITY.gridBlocks; bz++) {
      const cx = BLOCK_COORDS[bx];
      const cz = BLOCK_COORDS[bz];
      const district = getDistrictAt(cx, cz);

      const slab = new THREE.Mesh(blockGeom, sidewalkMat);
      slab.position.set(cx, curbHeight * 0.5, cz);
      slab.receiveShadow = true;
      cityGroup.add(slab);

      // Street lamps on opposing corners
      const corner = CITY.blockSize * 0.5 - 1.1;
      const lamp1 = createStreetLamp(poleMat, bulbMat);
      lamp1.position.set(cx + corner, curbHeight, cz + corner);
      lamp1.rotation.y = Math.PI * 0.25;
      cityGroup.add(lamp1);

      if ((bx + bz) % 2 === 0) {
        const lamp2 = createStreetLamp(poleMat, bulbMat);
        lamp2.position.set(cx - corner, curbHeight, cz - corner);
        lamp2.rotation.y = -Math.PI * 0.75;
        cityGroup.add(lamp2);
      }

      // Check special landmark blocks (Respray Garage / Armory) so we leave drive-in bays clear
      const nearRespray = Math.hypot(cx - LANDMARKS.resprayGarage.x, cz - LANDMARKS.resprayGarage.z) < 22;
      const nearArmory = Math.hypot(cx - LANDMARKS.armory.x, cz - LANDMARKS.armory.z) < 22;

      const innerSpan = CITY.blockSize - CITY.sidewalkWidth * 2;
      const slots = nearRespray || nearArmory
        ? [{ dx: 0, dz: -4.5, w: innerSpan - 4, d: innerSpan * 0.46 }]
        : rand() > 0.35
          ? [
              { dx: -innerSpan * 0.26, dz: -innerSpan * 0.26, w: innerSpan * 0.44, d: innerSpan * 0.44 },
              { dx: innerSpan * 0.26, dz: -innerSpan * 0.26, w: innerSpan * 0.44, d: innerSpan * 0.44 },
              { dx: -innerSpan * 0.26, dz: innerSpan * 0.26, w: innerSpan * 0.44, d: innerSpan * 0.44 },
              { dx: innerSpan * 0.26, dz: innerSpan * 0.26, w: innerSpan * 0.44, d: innerSpan * 0.44 },
            ]
          : [
              { dx: -innerSpan * 0.25, dz: 0, w: innerSpan * 0.45, d: innerSpan * 0.88 },
              { dx: innerSpan * 0.25, dz: 0, w: innerSpan * 0.45, d: innerSpan * 0.88 },
            ];

      for (const slot of slots) {
        const floors =
          nearRespray || nearArmory
            ? 2
            : Math.floor(district.minFloors + rand() * (district.maxFloors - district.minFloors + 1));
        const height = floors * 3.4 + rand() * 1.4;
        const w = slot.w * (0.86 + rand() * 0.12);
        const dLen = slot.d * (0.86 + rand() * 0.12);
        const px = cx + slot.dx;
        const pz = cz + slot.dz;

        const matPool = facadeMats[district.style] || facadeMats.deco;
        const fMat = matPool[Math.floor(rand() * matPool.length)];
        const mats = [fMat, fMat, roofMat, roofMat, fMat, fMat];

        const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, height, dLen), mats);
        bldg.position.set(px, curbHeight + height * 0.5, pz);
        bldg.castShadow = true;
        bldg.receiveShadow = true;
        cityGroup.add(bldg);
        buildingMeshes.push(bldg);

        colliders.push({
          minX: px - w * 0.5,
          maxX: px + w * 0.5,
          minZ: pz - dLen * 0.5,
          maxZ: pz + dLen * 0.5,
          maxY: curbHeight + height,
        });

        // Rooftop parapet / penthouse crown
        if (district.style === 'deco' || district.style === 'glass') {
          const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 1.3, dLen * 0.72), trimMat);
          cap.position.set(px, curbHeight + height + 0.65, pz);
          cityGroup.add(cap);
        }

        // Neon sign on street-facing buildings
        if (rand() > 0.52 && !nearRespray && !nearArmory) {
          const signMat = neonMats[Math.floor(rand() * neonMats.length)];
          const sign = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.7, 6.2), 1.7, 0.25), signMat);
          const signY = curbHeight + Math.min(height - 1.5, 4.8);
          sign.position.set(px, signY, pz + dLen * 0.5 + 0.18);
          cityGroup.add(sign);
        }
      }

      // Corner palms on coastal & sunset blocks
      if ((district.style === 'deco' || district.style === 'residential') && rand() > 0.35) {
        const palm = createPalmTree(trunkMat, frondMat, 0.9 + rand() * 0.35, 0.12);
        palm.position.set(cx + corner - 1.4, curbHeight, cz - corner + 1.4);
        palm.rotation.y = rand() * Math.PI * 2;
        cityGroup.add(palm);
      }
    }
  }

  // Build Landmark Bays: Palma Spray & Customs (Respray) and Ironworks Armory
  function addServiceBay(landmark, signTex, padColor) {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(landmark.radius * 0.78, landmark.radius * 0.85, 0.12, 24),
      new THREE.MeshStandardMaterial({
        color: padColor,
        emissive: padColor,
        emissiveIntensity: 0.45,
        roughness: 0.4,
      })
    );
    pad.position.set(landmark.x, 0.1, landmark.z);
    cityGroup.add(pad);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 2.2, 0.35),
      new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.9,
      })
    );
    sign.position.set(landmark.x, 5.4, landmark.z - 5.2);
    cityGroup.add(sign);
  }
  addServiceBay(LANDMARKS.resprayGarage, textures.specialSigns.respray, 0xffbe0b);
  addServiceBay(LANDMARKS.armory, textures.specialSigns.armory, 0xef476f);

  // Beachfront Boardwalk (east edge of the city)
  const bwWidth = CITY.boardwalkEnd - CITY.boardwalkStart;
  const bwLength = CITY.halfSpan * 2 + CITY.roadWidth;
  const boardwalk = new THREE.Mesh(
    new THREE.BoxGeometry(bwWidth, 0.36, bwLength),
    new THREE.MeshStandardMaterial({ map: textures.boardwalk, roughness: 0.85 })
  );
  boardwalk.position.set(CITY.boardwalkStart + bwWidth * 0.5, 0.18, 0);
  boardwalk.receiveShadow = true;
  cityGroup.add(boardwalk);

  // Boardwalk palms & lamps
  for (let z = -140; z <= 140; z += 22) {
    const palm = createPalmTree(trunkMat, frondMat, 1.05 + rand() * 0.35, 0.18);
    palm.position.set(CITY.boardwalkEnd - 1.6, 0.36, z);
    palm.rotation.y = rand() * Math.PI * 2;
    cityGroup.add(palm);

    if (Math.abs(z) % 44 < 22) {
      const lamp = createStreetLamp(poleMat, bulbMat);
      lamp.position.set(CITY.boardwalkStart + 1.1, 0.36, z + 6);
      lamp.rotation.y = Math.PI;
      cityGroup.add(lamp);
    }
  }

  // Golden Beach Sand
  const beachWidth = CITY.beachEnd - CITY.beachStart;
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(beachWidth, bwLength + 90),
    new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 0.95 })
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(CITY.beachStart + beachWidth * 0.5, -0.02, 0);
  beach.receiveShadow = true;
  cityGroup.add(beach);

  // Colorful Beach Umbrellas & Towels
  const umbrellaColors = [0xff4fa3, 0x2ec4b6, 0xffbe0b, 0xff6b6b, 0x3a86ff];
  for (let z = -126; z <= 126; z += 18) {
    if (Math.abs(z - CITY.pierZ) < 12) continue;
    const ux = CITY.beachStart + 10 + rand() * 22;
    const uz = z + (rand() - 0.5) * 6;
    const color = umbrellaColors[Math.floor(rand() * umbrellaColors.length)];

    const uGroup = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), trimMat);
    pole.position.y = 1.25;
    uGroup.add(pole);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.1, 0.72, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
    );
    canopy.position.y = 2.55;
    uGroup.add(canopy);

    const towel = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.04, 2.1),
      new THREE.MeshStandardMaterial({ color: 0xfff8ec, roughness: 0.9 })
    );
    towel.position.set(1.2, 0.02, 0.3);
    uGroup.add(towel);

    uGroup.position.set(ux, 0, uz);
    cityGroup.add(uGroup);
  }

  // Ocean plane (animated gently in update)
  const oceanMat = new THREE.MeshStandardMaterial({
    map: textures.water,
    roughness: 0.25,
    metalness: 0.22,
    color: 0x26b0c4,
  });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(340, 720), oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(CITY.oceanStart + 170, -0.32, 0);
  cityGroup.add(ocean);

  // Solana Marina Pier extending into the bay
  const pierLen = CITY.pierEndX - CITY.pierStartX;
  const pierDeck = new THREE.Mesh(
    new THREE.BoxGeometry(pierLen, 0.55, CITY.pierHalfWidth * 2),
    new THREE.MeshStandardMaterial({ map: textures.boardwalk, roughness: 0.88 })
  );
  pierDeck.position.set(CITY.pierStartX + pierLen * 0.5, 0.38, CITY.pierZ);
  pierDeck.receiveShadow = true;
  cityGroup.add(pierDeck);

  // Pier pilings & docked pleasure boat
  const pilingMat = new THREE.MeshStandardMaterial({ color: 0x5c4636, roughness: 0.95 });
  for (let x = CITY.pierStartX + 4; x <= CITY.pierEndX - 2; x += 12) {
    for (const side of [-1, 1]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 3.2, 7), pilingMat);
      pile.position.set(x, -0.4, CITY.pierZ + side * (CITY.pierHalfWidth - 0.5));
      cityGroup.add(pile);
    }
  }

  // Docked speedboat beside the marina pier
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 1.3, 3.0),
    new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.35 })
  );
  boat.add(hull);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(8.6, 0.35, 3.06),
    new THREE.MeshStandardMaterial({ color: 0x00bbf9, roughness: 0.3 })
  );
  stripe.position.y = 0.22;
  boat.add(stripe);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.0, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.25 })
  );
  cabin.position.set(-0.8, 1.05, 0);
  boat.add(cabin);
  boat.position.set(CITY.pierEndX - 10, 0.15, CITY.pierZ - CITY.pierHalfWidth - 2.6);
  cityGroup.add(boat);

  // Circle vs AABB collision resolution against buildings + world bounds
  function resolveCircleCollision(x, z, radius) {
    let rx = x;
    let rz = z;
    let hit = false;
    let nx = 0;
    let nz = 0;

    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      const closestX = clamp(rx, b.minX, b.maxX);
      const closestZ = clamp(rz, b.minZ, b.maxZ);
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        hit = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          nx = dx / dist;
          nz = dz / dist;
          rx += nx * push;
          rz += nz * push;
        } else {
          // Inside box fallback: push out along nearest edge
          const dLeft = Math.abs(rx - b.minX);
          const dRight = Math.abs(b.maxX - rx);
          const dTop = Math.abs(rz - b.minZ);
          const dBot = Math.abs(b.maxZ - rz);
          const m = Math.min(dLeft, dRight, dTop, dBot);
          if (m === dLeft) { rx = b.minX - radius; nx = -1; }
          else if (m === dRight) { rx = b.maxX + radius; nx = 1; }
          else if (m === dTop) { rz = b.minZ - radius; nz = -1; }
          else { rz = b.maxZ + radius; nz = 1; }
        }
      }
    }

    // Clamp to outer boundaries (allow walking onto marina pier over water)
    const onPierZ = Math.abs(rz - CITY.pierZ) <= CITY.pierHalfWidth - 0.5;
    const maxX = onPierZ ? CITY.pierEndX - radius : CITY.oceanStart - 2 - radius;
    if (rx < CITY.worldMinX + radius) { rx = CITY.worldMinX + radius; hit = true; nx = 1; }
    if (rx > maxX) { rx = maxX; hit = true; nx = -1; }
    if (rz < CITY.worldMinZ + radius) { rz = CITY.worldMinZ + radius; hit = true; nz = 1; }
    if (rz > CITY.worldMaxZ - radius) { rz = CITY.worldMaxZ - radius; hit = true; nz = -1; }

    return { x: rx, z: rz, hit, nx, nz };
  }

  // Slab raycast against all building AABBs (used for gunfire & police line-of-sight)
  function raycastBuildings(origin, dir, maxDist) {
    let bestT = maxDist;
    let hit = false;
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      let tmin = 0;
      let tmax = bestT;

      // X slab
      if (Math.abs(dir.x) < 1e-6) {
        if (origin.x < b.minX || origin.x > b.maxX) continue;
      } else {
        const inv = 1 / dir.x;
        let t1 = (b.minX - origin.x) * inv;
        let t2 = (b.maxX - origin.x) * inv;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }

      // Z slab
      if (Math.abs(dir.z) < 1e-6) {
        if (origin.z < b.minZ || origin.z > b.maxZ) continue;
      } else {
        const inv = 1 / dir.z;
        let t1 = (b.minZ - origin.z) * inv;
        let t2 = (b.maxZ - origin.z) * inv;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }

      // Y slab (0..maxY)
      if (Math.abs(dir.y) < 1e-6) {
        if (origin.y < 0 || origin.y > b.maxY) continue;
      } else {
        const inv = 1 / dir.y;
        let t1 = (0 - origin.y) * inv;
        let t2 = (b.maxY - origin.y) * inv;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }

      if (tmin >= 0 && tmin < bestT) {
        bestT = tmin;
        hit = true;
      }
    }
    return { hit, distance: bestT };
  }

  function hasLineOfSight(ax, ay, az, bx, by, bz) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.01) return true;
    const res = raycastBuildings(
      { x: ax, y: ay, z: az },
      { x: dx / dist, y: dy / dist, z: dz / dist },
      dist
    );
    return !res.hit;
  }

  function getGroundHeight(x, z) {
    if (
      x >= CITY.pierStartX &&
      x <= CITY.pierEndX &&
      Math.abs(z - CITY.pierZ) <= CITY.pierHalfWidth
    ) {
      return 0.65;
    }
    if (x >= CITY.boardwalkStart && x <= CITY.boardwalkEnd && Math.abs(z) <= CITY.halfSpan + 7) {
      return 0.36;
    }
    return 0;
  }

  function update(dt, elapsed) {
    textures.water.offset.y = (elapsed * 0.05) % 1;
    boat.position.y = 0.12 + Math.sin(elapsed * 2.1) * 0.09;
    boat.rotation.z = Math.sin(elapsed * 1.7) * 0.03;
  }

  return {
    group: cityGroup,
    colliders,
    buildingMeshes,
    resolveCircleCollision,
    raycastBuildings,
    hasLineOfSight,
    getGroundHeight,
    update,
  };
}
