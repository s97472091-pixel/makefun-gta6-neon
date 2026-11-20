// Solana Bay — 3D City World Builder & Collision Helpers
import * as THREE from 'three';
import {
  CITY_METRICS,
  ROAD_LINES,
  getDistrictAt,
  createRng,
  randRange,
  pick,
} from './config.js';

export function buildCityWorld(scene, textures, seed = 1) {
  const rng = createRng(seed * 7919 + 13);
  const group = new THREE.Group();
  group.name = 'SolanaBayCity';

  const colliders = []; // { minX, maxX, minZ, maxZ, height, tag }
  const lampBulbs = [];
  const lampLights = [];
  const neonMeshes = [];
  const lanternMeshes = [];
  const buildingMaterials = [];

  // Base ground slab under city
  const baseGeo = new THREE.PlaneGeometry(660, 620);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x3b3f47, roughness: 0.95 });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.rotation.x = -Math.PI / 2;
  baseMesh.position.set(0, -0.08, 40);
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Roads: 7 horizontal and 7 vertical road corridors
  const asphaltV = textures.asphalt.clone();
  asphaltV.needsUpdate = true;
  asphaltV.repeat.set(1, 22);
  const roadMatV = new THREE.MeshStandardMaterial({ map: asphaltV, roughness: 0.88 });

  const asphaltH = textures.asphalt.clone();
  asphaltH.needsUpdate = true;
  asphaltH.repeat.set(1, 22);
  const roadMatH = new THREE.MeshStandardMaterial({ map: asphaltH, roughness: 0.88 });

  const roadLen = 376;
  const roadW = CITY_METRICS.roadWidth;

  for (const x of ROAD_LINES) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(roadW, roadLen), roadMatV);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.01, 0);
    road.receiveShadow = true;
    group.add(road);
  }

  for (const z of ROAD_LINES) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(roadW, roadLen), roadMatH);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = Math.PI / 2;
    road.position.set(0, 0.015, z);
    road.receiveShadow = true;
    group.add(road);
  }

  // Intersections with crosswalks
  const crossMat = new THREE.MeshStandardMaterial({ map: textures.crosswalk, roughness: 0.85 });
  const crossGeo = new THREE.PlaneGeometry(roadW + 0.4, roadW + 0.4);
  for (const x of ROAD_LINES) {
    for (const z of ROAD_LINES) {
      const ix = new THREE.Mesh(crossGeo, crossMat);
      ix.rotation.x = -Math.PI / 2;
      ix.position.set(x, 0.025, z);
      ix.receiveShadow = true;
      group.add(ix);
    }
  }

  // Sidewalk slab material
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalk,
    roughness: 0.9,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.5 });

  function addStreetLamp(x, z, rotY = 0) {
    const lamp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 6.2, 6), lampPoleMat);
    pole.position.y = 3.1;
    lamp.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.5), lampPoleMat);
    arm.position.set(0, 6.15, 0.65);
    lamp.add(arm);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff3c4,
      emissive: 0xffc86b,
      emissiveIntensity: 0.15,
    });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.65), bulbMat);
    bulb.position.set(0, 6.02, 1.25);
    lamp.add(bulb);
    lampBulbs.push(bulbMat);

    lamp.position.set(x, CITY_METRICS.sidewalkHeight, z);
    lamp.rotation.y = rotY;
    group.add(lamp);
  }

  function addPalmTree(x, z, scale = 1) {
    const palm = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.92 });
    const lean = (rng() - 0.5) * 0.18;
    const h = 7.4 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.34 * scale, h, 7), trunkMat);
    trunk.position.y = h * 0.5;
    trunk.rotation.z = lean;
    trunk.castShadow = true;
    palm.add(trunk);

    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x2f9e44,
      roughness: 0.78,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + rng() * 0.25;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55 * scale, 3.6 * scale, 4), frondMat);
      frond.position.set(
        -Math.sin(lean) * h * 0.45 + Math.cos(ang) * 1.45 * scale,
        h - 0.15 * scale,
        Math.sin(ang) * 1.45 * scale
      );
      frond.rotation.z = -Math.PI / 2.55;
      frond.rotation.y = -ang;
      palm.add(frond);
    }
    palm.position.set(x, 0, z);
    group.add(palm);
  }

  function addNeonSign(x, y, z, rotY, signIdx, width = 7, height = 1.8) {
    const tex = textures.neonSigns[signIdx % textures.neonSigns.length];
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.35,
      roughness: 0.4,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    group.add(mesh);
    neonMeshes.push(mat);
  }

  // Build 6x6 blocks between ROAD_LINES
  for (let bx = 0; bx < CITY_METRICS.gridBlocks; bx++) {
    for (let bz = 0; bz < CITY_METRICS.gridBlocks; bz++) {
      const cx = (ROAD_LINES[bx] + ROAD_LINES[bx + 1]) * 0.5;
      const cz = (ROAD_LINES[bz] + ROAD_LINES[bz + 1]) * 0.5;
      const district = getDistrictAt(cx, cz);

      // Sidewalk block platform
      const sw = new THREE.Mesh(
        new THREE.BoxGeometry(CITY_METRICS.blockSize, CITY_METRICS.sidewalkHeight, CITY_METRICS.blockSize),
        sidewalkMat
      );
      sw.position.set(cx, CITY_METRICS.sidewalkHeight * 0.5, cz);
      sw.receiveShadow = true;
      group.add(sw);

      // Corner street lamps
      addStreetLamp(cx - 19.5, cz - 19.5, Math.PI * 0.25);
      addStreetLamp(cx + 19.5, cz + 19.5, -Math.PI * 0.75);

      // Special block: Pasar Senja Night Market Plaza (cx=90, cz=30)
      if (Math.abs(cx - 90) < 1 && Math.abs(cz - 30) < 1) {
        buildPasarSenjaMarket(group, cx, cz, textures, colliders, lanternMeshes, lampLights, addNeonSign);
        continue;
      }

      // Special block: Nori Custom Respray Garage (cx=-150, cz=30) - leave entrance alcove
      const isGarageBlock = Math.abs(cx + 150) < 1 && Math.abs(cz - 30) < 1;
      const isArmoryBlock = Math.abs(cx + 150) < 1 && Math.abs(cz + 90) < 1;

      const subOffsets = [
        [-9.5, -9.5],
        [9.5, -9.5],
        [-9.5, 9.5],
        [9.5, 9.5],
      ];

      for (let s = 0; s < subOffsets.length; s++) {
        if ((isGarageBlock || isArmoryBlock) && s === 3) continue; // courtyard for service bay
        const ox = cx + subOffsets[s][0];
        const oz = cz + subOffsets[s][1];
        const bw = randRange(rng, 13.5, 16.5);
        const bd = randRange(rng, 13.5, 16.5);
        const [minH, maxH] = district.buildingHeightRange;
        let bh = randRange(rng, minH, maxH);
        if (Math.abs(cx + 30) < 1 && Math.abs(cz + 30) < 1 && s === 0) bh = 68; // Solana Spire

        const style = district.style;
        const variantIdx = Math.floor(rng() * 3);
        const dayTex = textures.facadesDay[style][variantIdx];
        const nightTex = textures.facadesNight[style][variantIdx];
        const sideMat = new THREE.MeshStandardMaterial({
          map: dayTex,
          emissiveMap: nightTex,
          emissive: new THREE.Color(0xfff1c1),
          emissiveIntensity: 0.0,
          roughness: style === 'glass' ? 0.28 : 0.78,
          metalness: style === 'glass' ? 0.45 : 0.08,
        });
        buildingMaterials.push(sideMat);

        const bMesh = new THREE.Mesh(
          new THREE.BoxGeometry(bw, bh, bd),
          [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat]
        );
        bMesh.position.set(ox, CITY_METRICS.sidewalkHeight + bh * 0.5, oz);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        group.add(bMesh);

        // Rooftop AC/crown detail for skyline silhouette
        if (bh > 22) {
          const crown = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.55, 2.6, bd * 0.55), roofMat);
          crown.position.set(ox, CITY_METRICS.sidewalkHeight + bh + 1.3, oz);
          group.add(crown);
        }

        // Neon signage on coastal & market facades
        if ((district.id === 'miramar_coast' || district.id === 'pasar_senja') && s >= 2) {
          addNeonSign(ox, 6.5, oz + bd * 0.5 + 0.14, 0, bx + bz + s, Math.min(8.5, bw * 0.65), 1.9);
        }

        colliders.push({
          minX: ox - bw * 0.5,
          maxX: ox + bw * 0.5,
          minZ: oz - bd * 0.5,
          maxZ: oz + bd * 0.5,
          height: bh,
          tag: 'building',
        });
      }

      if (isGarageBlock) {
        addNeonSign(cx + 9.5, 5.2, cz + 19.5, 0, 4, 9.5, 2.2);
      }
      if (isArmoryBlock) {
        addNeonSign(cx + 9.5, 5.2, cz + 19.5, 0, 5, 9.5, 2.2);
      }
    }
  }

  // Beachfront Boardwalk, Palms, Umbrellas, Sand & Ocean
  const boardwalk = new THREE.Mesh(
    new THREE.BoxGeometry(430, 0.35, 16),
    new THREE.MeshStandardMaterial({ map: textures.boardwalk, roughness: 0.85 })
  );
  boardwalk.position.set(0, 0.18, 196);
  boardwalk.receiveShadow = true;
  group.add(boardwalk);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(540, 62),
    new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 0.96 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, -0.02, 227);
  sand.receiveShadow = true;
  group.add(sand);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(820, 320),
    new THREE.MeshStandardMaterial({
      map: textures.ocean,
      roughness: 0.24,
      metalness: 0.18,
    })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.32, 392);
  group.add(ocean);

  // Palm trees along Miramar beachfront boulevard & boardwalk
  for (let px = -190; px <= 190; px += 19) {
    if (Math.abs(px - CITY_METRICS.pierX) < 10) continue;
    addPalmTree(px, 190.5, randRange(rng, 0.92, 1.18));
    if (px % 38 === 0) addStreetLamp(px + 6, 189.2, Math.PI);
  }

  // Beach umbrellas and towels on the sand
  const umbrellaColors = [0xff4d6d, 0x38bdf8, 0xfbbf24, 0x34d399, 0xf97316];
  for (let ux = -170; ux <= 170; ux += 26) {
    if (Math.abs(ux - CITY_METRICS.pierX) < 14) continue;
    const uz = 216 + (Math.abs(ux) % 14);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
    );
    pole.position.set(ux, 1.4, uz);
    group.add(pole);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 0.85, 8),
      new THREE.MeshStandardMaterial({ color: pick(rng, umbrellaColors), roughness: 0.7 })
    );
    canopy.position.set(ux, 2.75, uz);
    group.add(canopy);
  }

  // Marina Pier extending over the ocean at x = -60
  const pierDeck = new THREE.Mesh(
    new THREE.BoxGeometry(CITY_METRICS.pierWidth, 0.6, 94),
    new THREE.MeshStandardMaterial({ map: textures.boardwalk, roughness: 0.86 })
  );
  pierDeck.position.set(CITY_METRICS.pierX, 0.65, 248);
  pierDeck.receiveShadow = true;
  group.add(pierDeck);

  const pilingMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.92 });
  for (let pz = 208; pz <= 292; pz += 14) {
    for (const side of [-5.2, 5.2]) {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 3.2, 6), pilingMat);
      piling.position.set(CITY_METRICS.pierX + side, -0.5, pz);
      group.add(piling);
    }
    if (pz % 28 === 0) addStreetLamp(CITY_METRICS.pierX - 5.2, pz, Math.PI * 0.5);
  }

  // Two moored speedboats beside the pier
  for (let b = 0; b < 2; b++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.1, 8.2),
      new THREE.MeshStandardMaterial({ color: b === 0 ? 0xf8fafc : 0xff6b6b, roughness: 0.35 })
    );
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.0, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25 })
    );
    cabin.position.set(0, 0.9, -0.6);
    boat.add(hull, cabin);
    boat.position.set(CITY_METRICS.pierX + (b === 0 ? 11 : -11), 0.15, 258 + b * 18);
    group.add(boat);
  }

  scene.add(group);

  // Circle-vs-AABB collision resolution for players, peds, vehicles
  function resolveCircleCollisions(x, z, radius) {
    let rx = Math.max(CITY_METRICS.worldMinX + 4, Math.min(CITY_METRICS.worldMaxX - 4, x));
    let rz = Math.max(CITY_METRICS.worldMinZ + 4, Math.min(CITY_METRICS.worldMaxZ - 6, z));
    let hit = false;

    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      const closestX = Math.max(c.minX, Math.min(rx, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(rz, c.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        hit = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        } else {
          // Inside box: push out to nearest edge
          const penL = Math.abs(rx - c.minX);
          const penR = Math.abs(c.maxX - rx);
          const penT = Math.abs(rz - c.minZ);
          const penB = Math.abs(c.maxZ - rz);
          const minP = Math.min(penL, penR, penT, penB);
          if (minP === penL) rx = c.minX - radius;
          else if (minP === penR) rx = c.maxX + radius;
          else if (minP === penT) rz = c.minZ - radius;
          else rz = c.maxZ + radius;
        }
      }
    }
    return { x: rx, z: rz, hit };
  }

  // 2D raycast against building colliders for line-of-sight & gunfire occlusion
  function raycastBuildings(ox, oz, dx, dz, maxDist) {
    let bestT = maxDist;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      let tmin = 0;
      let tmax = bestT;
      if (Math.abs(dx) < 1e-6) {
        if (ox < c.minX || ox > c.maxX) continue;
      } else {
        let t1 = (c.minX - ox) / dx;
        let t2 = (c.maxX - ox) / dx;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (Math.abs(dz) < 1e-6) {
        if (oz < c.minZ || oz > c.maxZ) continue;
      } else {
        let t1 = (c.minZ - oz) / dz;
        let t2 = (c.maxZ - oz) / dz;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (tmin >= 0 && tmin < bestT) bestT = tmin;
    }
    return bestT;
  }

  function hasLineOfSight(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.01) return true;
    const hitT = raycastBuildings(x1, z1, dx / dist, dz / dist, dist);
    return hitT >= dist - 0.5;
  }

  return {
    group,
    colliders,
    lampBulbs,
    lampLights,
    neonMeshes,
    lanternMeshes,
    buildingMaterials,
    ocean,
    resolveCircleCollisions,
    raycastBuildings,
    hasLineOfSight,
  };
}

function buildPasarSenjaMarket(group, cx, cz, textures, colliders, lanternMeshes, lampLights, addNeonSign) {
  // Decorative dark stone plaza floor
  const plaza = new THREE.Mesh(
    new THREE.BoxGeometry(42, 0.3, 42),
    new THREE.MeshStandardMaterial({ color: 0x3b2f2f, roughness: 0.9 })
  );
  plaza.position.set(cx, 0.16, cz);
  plaza.receiveShadow = true;
  group.add(plaza);

  // Entrance archway facing west & south with PASAR SENJA neon signs
  const archMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.55 });
  for (const [ax, az, rot] of [
    [cx, cz + 19.5, 0],
    [cx - 19.5, cz, Math.PI * 0.5],
  ]) {
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.2, 0.9), archMat);
    const p2 = p1.clone();
    const beam = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.2, 1.1), archMat);
    const arch = new THREE.Group();
    p1.position.set(-4.6, 3.6, 0);
    p2.position.set(4.6, 3.6, 0);
    beam.position.set(0, 7.2, 0);
    arch.add(p1, p2, beam);
    arch.position.set(ax, 0.25, az);
    arch.rotation.y = rot;
    group.add(arch);
  }
  addNeonSign(cx, 7.4, cz + 20.1, 0, 0, 8.8, 2.0);
  addNeonSign(cx - 20.1, 7.4, cz, -Math.PI * 0.5, 1, 8.8, 2.0);

  // Market stalls arranged in two glowing aisles
  const stallPositions = [
    [-13.5, -12], [-13.5, -2], [-13.5, 8],
    [13.5, -12], [13.5, -2], [13.5, 8],
    [-4.5, -14], [4.5, -14],
  ];

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.78 });

  stallPositions.forEach(([sx, sz], idx) => {
    const stall = new THREE.Group();
    const counter = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.15, 2.4), counterMat);
    counter.position.y = 0.58;
    stall.add(counter);

    for (const px of [-2.4, 2.4]) {
      for (const pz of [-1.0, 1.0]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.3, 5), woodMat);
        post.position.set(px, 1.65, pz);
        stall.add(post);
      }
    }

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.22, 3.2),
      new THREE.MeshStandardMaterial({ map: textures.canopies[idx % textures.canopies.length], roughness: 0.7 })
    );
    canopy.position.set(0, 3.3, 0);
    canopy.rotation.x = 0.14;
    stall.add(canopy);

    // Colorful goods crates on the counter
    const goodsColors = [0xfef08a, 0xfb7185, 0x4ade80, 0xfb923c];
    for (let g = -1.6; g <= 1.6; g += 1.6) {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.42, 0.85),
        new THREE.MeshStandardMaterial({ color: goodsColors[(idx + Math.abs(Math.round(g))) % 4] })
      );
      crate.position.set(g, 1.38, 0);
      stall.add(crate);
    }

    const wx = cx + sx;
    const wz = cz + sz;
    stall.position.set(wx, 0.3, wz);
    if (sx < -8) stall.rotation.y = Math.PI * 0.5;
    else if (sx > 8) stall.rotation.y = -Math.PI * 0.5;
    group.add(stall);

    const halfX = Math.abs(sx) > 8 ? 1.5 : 2.7;
    const halfZ = Math.abs(sx) > 8 ? 2.7 : 1.5;
    colliders.push({
      minX: wx - halfX,
      maxX: wx + halfX,
      minZ: wz - halfZ,
      maxZ: wz + halfZ,
      height: 3.4,
      tag: 'stall',
    });
  });

  // Overhead hanging paper lanterns criss-crossing the market aisles
  const lanternColors = [0xff4d6d, 0xffb703, 0xff7b54, 0xf43f5e, 0xfde047];
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 });
  for (let row = -12; row <= 12; row += 6) {
    const wire = new THREE.Mesh(new THREE.BoxGeometry(26, 0.05, 0.05), wireMat);
    wire.position.set(cx, 5.8, cz + row);
    group.add(wire);

    for (let col = -10; col <= 10; col += 4) {
      const colHex = lanternColors[Math.abs(row + col) % lanternColors.length];
      const lMat = new THREE.MeshStandardMaterial({
        color: colHex,
        emissive: new THREE.Color(colHex),
        emissiveIntensity: 0.45,
        roughness: 0.4,
      });
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.46, 8, 8), lMat);
      lantern.scale.set(1, 1.25, 1);
      lantern.position.set(cx + col, 5.25 - Math.abs(col) * 0.03, cz + row);
      group.add(lantern);
      lanternMeshes.push(lMat);
    }
  }

  // Warm point lights illuminating Pasar Senja at night
  for (const [lx, lz, col] of [
    [cx - 6, cz - 4, 0xff8c42],
    [cx + 6, cz + 5, 0xff4d6d],
    [cx, cz + 14, 0xffb703],
  ]) {
    const pt = new THREE.PointLight(col, 0, 34, 1.4);
    pt.position.set(lx, 5.2, lz);
    group.add(pt);
    lampLights.push(pt);
  }
}
