// Procedural coastal city: roads, blocks, districts, landmarks, beach, ocean, palm trees, colliders.
import * as THREE from 'three';
import { CITY, ROAD_COORDS, LANDMARKS, getDistrictAt } from './config.js';
import {
  createRoadTexture,
  createIntersectionTexture,
  createSidewalkTexture,
  createFacadeTexture,
  createNeonSignTexture,
  createSandTexture,
} from './textures.js';

export function buildSkyAndLights(scene) {
  // Warm golden-hour sunset sky dome via custom GLSL shader
  const skyGeo = new THREE.SphereGeometry(900, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor:     { value: new THREE.Color(0x1f2854) },
      midColor:     { value: new THREE.Color(0xe05a7a) },
      horizonColor: { value: new THREE.Color(0xffb86c) },
      sunDir:       { value: new THREE.Vector3(0.74, 0.23, -0.63).normalize() },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDir;
      varying vec3 vWorldDir;
      void main() {
        vec3 d = normalize(vWorldDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.28, h));
        col = mix(col, topColor, smoothstep(0.24, 0.78, h));
        float sunAmt = max(dot(d, sunDir), 0.0);
        col += vec3(1.0, 0.78, 0.42) * pow(sunAmt, 12.0) * 0.55;
        col += vec3(1.0, 0.96, 0.82) * smoothstep(0.9965, 0.9992, sunAmt) * 1.4;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Warm atmospheric coastal haze
  scene.fog = new THREE.FogExp2(0xea9a7d, 0.00185);

  const hemi = new THREE.HemisphereLight(0xffd7b0, 0x3b3559, 0.95);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffbe7b, 2.05);
  sun.position.set(220, 95, -185);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 560;
  const sc = 155;
  sun.shadow.camera.left = -sc;
  sun.shadow.camera.right = sc;
  sun.shadow.camera.top = sc;
  sun.shadow.camera.bottom = -sc;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);

  return { sky, sun };
}

export function createCity(scene, rng) {
  const colliders = [];    // { minX, maxX, minZ, maxZ, height, kind }
  const buildingRects = []; // For minimap rendering
  const ramps = [];         // { minX, maxX, minZ, maxZ, dirZ, maxY }
  const neonMeshes = [];

  const root = new THREE.Group();
  scene.add(root);

  const roadTex = createRoadTexture();
  const interTex = createIntersectionTexture();
  const sidewalkTex = createSidewalkTexture();
  const sandTex = createSandTexture();

  // Base earth slab
  const baseGround = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshLambertMaterial({ color: 0x2a2f3a })
  );
  baseGround.rotation.x = -Math.PI / 2;
  baseGround.position.y = -0.06;
  baseGround.receiveShadow = true;
  root.add(baseGround);

  // Sandy Miramar Beach strip along the east coast
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(78, 900),
    new THREE.MeshLambertMaterial({ map: sandTex })
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(264, 0.01, 0);
  beach.receiveShadow = true;
  root.add(beach);

  // Turquoise coastal bay water (animated gently in update)
  const oceanGeo = new THREE.PlaneGeometry(760, 1400, 28, 42);
  const oceanMat = new THREE.MeshPhongMaterial({
    color: 0x16a8b8,
    emissive: 0x0a3948,
    specular: 0xffc68a,
    shininess: 85,
    flatShading: true,
    transparent: true,
    opacity: 0.94,
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(665, -0.35, 0);
  root.add(ocean);

  // Shoreline foam ribbon
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 920),
    new THREE.MeshBasicMaterial({ color: 0xfff5e4, transparent: true, opacity: 0.72 })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(288, -0.02, 0);
  root.add(foam);

  // Roads: straight segments between intersections + crosswalk tiles
  const rw = CITY.roadWidth;
  const segLen = CITY.blockSize;

  const roadMatNS = new THREE.MeshLambertMaterial({ map: roadTex.clone() });
  roadMatNS.map.needsUpdate = true;
  roadMatNS.map.repeat.set(1, 3);

  const roadMatEW = new THREE.MeshLambertMaterial({ map: roadTex.clone() });
  roadMatEW.map.needsUpdate = true;
  roadMatEW.map.repeat.set(1, 3);

  const interMat = new THREE.MeshLambertMaterial({ map: interTex });
  const segGeoNS = new THREE.PlaneGeometry(rw, segLen);
  const segGeoEW = new THREE.PlaneGeometry(rw, segLen);
  const interGeo = new THREE.PlaneGeometry(rw, rw);

  for (let i = 0; i < ROAD_COORDS.length; i++) {
    const rx = ROAD_COORDS[i];
    for (let j = 0; j < ROAD_COORDS.length; j++) {
      const rz = ROAD_COORDS[j];
      const inter = new THREE.Mesh(interGeo, interMat);
      inter.rotation.x = -Math.PI / 2;
      inter.position.set(rx, 0.02, rz);
      inter.receiveShadow = true;
      root.add(inter);

      if (j < ROAD_COORDS.length - 1) {
        const seg = new THREE.Mesh(segGeoNS, roadMatNS);
        seg.rotation.x = -Math.PI / 2;
        seg.position.set(rx, 0.02, rz + CITY.pitch * 0.5);
        seg.receiveShadow = true;
        root.add(seg);
      }
      if (i < ROAD_COORDS.length - 1) {
        const seg = new THREE.Mesh(segGeoEW, roadMatEW);
        seg.rotation.x = -Math.PI / 2;
        seg.rotation.z = Math.PI / 2;
        seg.position.set(rx + CITY.pitch * 0.5, 0.02, rz);
        seg.receiveShadow = true;
        root.add(seg);
      }
    }
  }

  // Boardwalk promenade along Miramar Beach (X = 231..241)
  const boardwalk = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.24, CITY.span + rw),
    new THREE.MeshLambertMaterial({ map: sidewalkTex })
  );
  boardwalk.position.set(236, 0.12, 0);
  boardwalk.receiveShadow = true;
  root.add(boardwalk);

  // Solana Marina Pier extending into the bay at Z = 0
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x9c724c });
  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(82, 0.5, 16), pierMat);
  pierDeck.position.set(282, 0.45, 0);
  pierDeck.receiveShadow = true;
  root.add(pierDeck);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x5c422c });
  for (let px = 248; px <= 318; px += 14) {
    for (const pz of [-7.4, 7.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 2.2, 6), postMat);
      post.position.set(px, 0.4, pz);
      root.add(post);
    }
  }
  // Marina Stunt Jump Ramp near the beach boardwalk
  const rampGeo = new THREE.BoxGeometry(8, 0.5, 16);
  const rampMat = new THREE.MeshLambertMaterial({ color: 0xffb703 });
  const rampMesh = new THREE.Mesh(rampGeo, rampMat);
  rampMesh.position.set(LANDMARKS.stuntRamp.x, 1.45, LANDMARKS.stuntRamp.z);
  rampMesh.rotation.x = -0.22;
  rampMesh.castShadow = true;
  rampMesh.receiveShadow = true;
  root.add(rampMesh);
  ramps.push({
    minX: LANDMARKS.stuntRamp.x - 4.2,
    maxX: LANDMARKS.stuntRamp.x + 4.2,
    minZ: LANDMARKS.stuntRamp.z - 8,
    maxZ: LANDMARKS.stuntRamp.z + 8,
    maxY: 3.3,
  });

  // Shared facade materials per district style
  const pastelPalette = ['#ffd7c9', '#ffc4d6', '#c9f2e3', '#ffeab6', '#f7d9c4', '#d8e2ff'];
  const pastelMats = pastelPalette.map((hex, idx) =>
    new THREE.MeshLambertMaterial({ map: createFacadeTexture('pastel', hex, idx + 1) })
  );
  const glassMats = [
    new THREE.MeshPhongMaterial({ map: createFacadeTexture('glass', '#2d4c6b', 1), specular: 0xffcf99, shininess: 65 }),
    new THREE.MeshPhongMaterial({ map: createFacadeTexture('glass', '#38587a', 2), specular: 0x99f0ff, shininess: 75 }),
    new THREE.MeshPhongMaterial({ map: createFacadeTexture('glass', '#453e66', 3), specular: 0xffa6c1, shininess: 60 }),
  ];
  const indMats = [
    new THREE.MeshLambertMaterial({ map: createFacadeTexture('industrial', '#6d7782', 1) }),
    new THREE.MeshLambertMaterial({ map: createFacadeTexture('industrial', '#8a6b54', 2) }),
    new THREE.MeshLambertMaterial({ map: createFacadeTexture('industrial', '#4e6372', 3) }),
  ];
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x3b3d4a });
  const sidewalkMat = new THREE.MeshLambertMaterial({ map: sidewalkTex });

  // Helper to place a solid building with collider + minimap footprint
  function addBuilding(x, z, w, d, h, mat, colorHint, neonColor = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, h * 0.5 + 0.18, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);

    // Roof cap parapet
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), roofMat);
    cap.position.set(x, h + 0.4, z);
    root.add(cap);

    // Art Deco / Neon roof accent strip
    if (neonColor) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.7, 0.45, d + 0.7),
        new THREE.MeshBasicMaterial({ color: neonColor })
      );
      strip.position.set(x, h + 0.05, z);
      root.add(strip);
      neonMeshes.push(strip);
    }

    colliders.push({
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
      height: h,
      kind: 'building',
    });
    buildingRects.push({ x: x - w * 0.5, z: z - d * 0.5, w, d, color: colorHint });
  }

  // Helper to build a stylized coastal palm tree
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b6748 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2ea062, side: THREE.DoubleSide });
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.34, 7.6, 6);
  const frondGeo = new THREE.ConeGeometry(0.85, 3.8, 4);

  function addPalmTree(x, z, scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.8;
    trunk.rotation.z = (rng() - 0.5) * 0.14;
    trunk.castShadow = true;
    g.add(trunk);

    const top = new THREE.Group();
    top.position.set(-Math.sin(trunk.rotation.z) * 3.6, 7.5, 0);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(frondGeo, frondMat);
      const ang = (i / 6) * Math.PI * 2 + rng() * 0.25;
      f.rotation.order = 'YXZ';
      f.rotation.y = ang;
      f.rotation.x = 1.15;
      f.position.set(Math.sin(ang) * 1.45, -0.25, Math.cos(ang) * 1.45);
      f.castShadow = true;
      top.add(f);
    }
    g.add(top);
    g.position.set(x, 0.18, z);
    g.scale.setScalar(scale);
    root.add(g);
  }

  // Helper for neon signage boards
  function addNeonBillboard(x, y, z, w, h, rotY, label, bg, glow) {
    const mat = new THREE.MeshBasicMaterial({ map: createNeonSignTexture(label, bg, glow) });
    const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), mat);
    board.position.set(x, y, z);
    board.rotation.y = rotY;
    root.add(board);
    neonMeshes.push(board);
  }

  // Build each of the 6x6 city blocks
  const neonSigns = [
    ['HOTEL MIRAMAR', '#1a1026', '#ff6b9d'],
    ['SOLANA PALACE', '#101d2c', '#2ee6d6'],
    ['CAFE CORAL',    '#261510', '#ffd166'],
    ['CLUB AZUL',     '#101530', '#58c4ff'],
    ['SUNSET LOUNGE', '#24101f', '#ff9a56'],
  ];
  let signIdx = 0;

  for (let bx = 0; bx < CITY.gridCount; bx++) {
    for (let bz = 0; bz < CITY.gridCount; bz++) {
      const cx = ROAD_COORDS[bx] + CITY.pitch * 0.5;
      const cz = ROAD_COORDS[bz] + CITY.pitch * 0.5;
      const district = getDistrictAt(cx, cz);

      // Sidewalk platform
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(CITY.blockSize, 0.22, CITY.blockSize),
        sidewalkMat
      );
      pad.position.set(cx, 0.11, cz);
      pad.receiveShadow = true;
      root.add(pad);

      // Special landmark blocks
      if (bx === 3 && bz === 2) {
        // Palma Plaza central park with fountain & palms
        const grass = new THREE.Mesh(
          new THREE.BoxGeometry(46, 0.28, 46),
          new THREE.MeshLambertMaterial({ color: 0x3b8f56 })
        );
        grass.position.set(cx, 0.17, cz);
        grass.receiveShadow = true;
        root.add(grass);

        const basin = new THREE.Mesh(
          new THREE.CylinderGeometry(7.2, 7.8, 1.1, 16),
          new THREE.MeshLambertMaterial({ color: 0xe6dccb })
        );
        basin.position.set(cx, 0.72, cz);
        root.add(basin);
        const fWater = new THREE.Mesh(
          new THREE.CylinderGeometry(6.3, 6.3, 0.3, 16),
          new THREE.MeshPhongMaterial({ color: 0x2ee6d6, emissive: 0x0b4c52, shininess: 90 })
        );
        fWater.position.set(cx, 1.18, cz);
        root.add(fWater);
        colliders.push({ minX: cx - 7.5, maxX: cx + 7.5, minZ: cz - 7.5, maxZ: cz + 7.5, height: 2, kind: 'prop' });

        for (const [ox, oz] of [[-17, -17], [17, -17], [-17, 17], [17, 17]]) {
          addPalmTree(cx + ox, cz + oz, 1.15);
        }
        buildingRects.push({ x: cx - 23, z: cz - 23, w: 46, d: 46, color: '#2b6e44' });
        continue;
      }

      if (bx === 1 && bz === 2) {
        // Coral Garage (Pay & Respray safehouse block)
        addBuilding(cx, cz - 10, 40, 22, 10, indMats[1], '#b87d52', 0x2ee6d6);
        addNeonBillboard(cx, 9.2, cz + 1.5, 18, 3.2, 0, 'CORAL GARAGE', '#111928', '#2ee6d6');
        // Open drive-in respray bay awning
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(16, 0.6, 12),
          new THREE.MeshLambertMaterial({ color: 0x1d2d44 })
        );
        canopy.position.set(cx, 5.2, cz + 11);
        root.add(canopy);
        const bayGlow = new THREE.Mesh(
          new THREE.PlaneGeometry(11, 11),
          new THREE.MeshBasicMaterial({ color: 0x2ee6d6, transparent: true, opacity: 0.35 })
        );
        bayGlow.rotation.x = -Math.PI / 2;
        bayGlow.position.set(cx, 0.26, cz + 13);
        root.add(bayGlow);
        addPalmTree(cx - 22, cz + 20, 1.0);
        addPalmTree(cx + 22, cz + 20, 1.0);
        continue;
      }

      if (bx === 1 && bz === 3) {
        // Sunset Armory & Barrio Coral block
        addBuilding(cx - 10, cz - 10, 22, 22, 12, pastelMats[0], '#d99b8c', 0xff5e7e);
        addBuilding(cx + 12, cz - 6, 18, 28, 15, pastelMats[3], '#e3c888');
        addNeonBillboard(cx - 10, 8.5, cz + 1.6, 14, 2.8, 0, 'SUNSET ARMORY', '#260d18', '#ff5e7e');
        const shopGlow = new THREE.Mesh(
          new THREE.PlaneGeometry(8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff5e7e, transparent: true, opacity: 0.35 })
        );
        shopGlow.rotation.x = -Math.PI / 2;
        shopGlow.position.set(cx, 0.26, cz + 17);
        root.add(shopGlow);
        continue;
      }

      // District-specific procedural architecture
      if (district.id === 'miramar') {
        // Stepped Art Deco beachfront hotels with glowing neon trim
        const h1 = 18 + rng() * 18;
        const mat = pastelMats[(bx + bz) % pastelMats.length];
        const neon = (bz % 2 === 0) ? 0xff5e7e : 0x2ee6d6;
        addBuilding(cx, cz, 38, 38, h1, mat, '#e8a5b5', neon);
        // Upper setback crown
        addBuilding(cx, cz, 22, 22, h1 + 8, mat, '#f2bcc7', 0xffd166);
        const [lbl, bg, glow] = neonSigns[signIdx++ % neonSigns.length];
        addNeonBillboard(cx + 19.3, h1 * 0.55, cz, 14, 3.2, Math.PI / 2, lbl, bg, glow);
        addPalmTree(cx + 24, cz - 18, 1.05);
        addPalmTree(cx + 24, cz + 18, 1.05);
      } else if (district.id === 'centro') {
        // Tall Midtown glass skyscrapers (2 towers per block)
        const hA = 34 + rng() * 34;
        const hB = 24 + rng() * 24;
        addBuilding(cx - 10, cz - 8, 20, 24, hA, glassMats[(bx + bz) % glassMats.length], '#4f7396', 0x3ce6d8);
        addBuilding(cx + 12, cz + 10, 18, 20, hB, glassMats[(bx + bz + 1) % glassMats.length], '#5d7ca0');
        addPalmTree(cx - 22, cz + 22, 0.95);
        addPalmTree(cx + 22, cz - 22, 0.95);
      } else if (district.id === 'puerto') {
        // Shipping warehouses & colorful cargo container yards
        addBuilding(cx - 8, cz - 10, 26, 18, 9 + rng() * 5, indMats[bx % indMats.length], '#757f8a');
        const cColors = [0xd94848, 0x2b7cb3, 0xe09f3e, 0x2d8a68];
        for (let k = 0; k < 3; k++) {
          const contMat = new THREE.MeshLambertMaterial({ color: cColors[(bx + bz + k) % cColors.length] });
          addBuilding(cx - 12 + k * 12, cz + 12, 8.5, 16, 3.6 + (k === 1 ? 3.2 : 0), contMat, '#8c6d56');
        }
      } else {
        // Barrio Coral: colorful mid-rise residential & shops
        const slots = [
          [-11, -11, 20, 20],
          [11, -11, 18, 19],
          [-11, 11, 19, 18],
          [11, 11, 20, 20],
        ];
        for (let s = 0; s < slots.length; s++) {
          if (rng() < 0.15) continue; // Occasional open courtyard
          const [ox, oz, w, d] = slots[s];
          const h = 9 + rng() * 14;
          const mat = pastelMats[(bx * 3 + bz + s) % pastelMats.length];
          addBuilding(cx + ox, cz + oz, w, d, h, mat, '#d9b091', s === 0 && rng() < 0.35 ? 0xff9a56 : 0);
        }
        addPalmTree(cx, cz, 0.95);
      }
    }
  }

  // Beachfront palms & colorful beach umbrellas along Miramar Beach
  const umbrellaColors = [0xff5e7e, 0x2ee6d6, 0xffd166, 0xff9a56];
  const umbGeo = new THREE.ConeGeometry(2.1, 0.9, 8);
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 5);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xf4efe6 });

  for (let z = -210; z <= 210; z += 26) {
    addPalmTree(238, z, 1.15);
    if (Math.abs(z) > 16) {
      const ug = new THREE.Group();
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.2;
      const top = new THREE.Mesh(umbGeo, new THREE.MeshLambertMaterial({ color: umbrellaColors[Math.abs(z) % 4] }));
      top.position.y = 2.45;
      ug.add(pole, top);
      ug.position.set(258 + (z % 2 === 0 ? 5 : -4), 0.02, z);
      root.add(ug);
    }
  }

  // Street lamps at road intersections
  const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x242833 });
  const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffe0a3 });
  const lampPoleGeo = new THREE.CylinderGeometry(0.11, 0.15, 6.2, 5);
  const lampHeadGeo = new THREE.BoxGeometry(1.1, 0.25, 0.45);
  for (let i = 0; i < ROAD_COORDS.length; i += 2) {
    for (let j = 0; j < ROAD_COORDS.length; j += 2) {
      const lx = ROAD_COORDS[i] + rw * 0.5 + 1.1;
      const lz = ROAD_COORDS[j] + rw * 0.5 + 1.1;
      const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
      pole.position.set(lx, 3.1, lz);
      const bulb = new THREE.Mesh(lampHeadGeo, lampBulbMat);
      bulb.position.set(lx - 0.5, 6.1, lz);
      root.add(pole, bulb);
    }
  }

  // Resolve 2D circle vs building AABBs
  function resolveCircleCollision(x, z, radius) {
    let rx = x;
    let rz = z;
    let hit = false;
    let hitNormalX = 0;
    let hitNormalZ = 0;

    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      const closestX = rx < b.minX ? b.minX : rx > b.maxX ? b.maxX : rx;
      const closestZ = rz < b.minZ ? b.minZ : rz > b.maxZ ? b.maxZ : rz;
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        hit = true;
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const pen = radius - dist;
          const nx = dx / dist;
          const nz = dz / dist;
          rx += nx * pen;
          rz += nz * pen;
          hitNormalX += nx;
          hitNormalZ += nz;
        } else {
          // Inside box fallback: push to nearest edge
          const dLeft = Math.abs(rx - b.minX);
          const dRight = Math.abs(b.maxX - rx);
          const dTop = Math.abs(rz - b.minZ);
          const dBot = Math.abs(b.maxZ - rz);
          const m = Math.min(dLeft, dRight, dTop, dBot);
          if (m === dLeft) { rx = b.minX - radius; hitNormalX -= 1; }
          else if (m === dRight) { rx = b.maxX + radius; hitNormalX += 1; }
          else if (m === dTop) { rz = b.minZ - radius; hitNormalZ -= 1; }
          else { rz = b.maxZ + radius; hitNormalZ += 1; }
        }
      }
    }

    // Clamp to playable city + pier bounds
    const onPier = Math.abs(rz) < 7.2 && rx >= 240 && rx <= 318;
    const maxX = onPier ? 318 : CITY.worldBoundMaxX;
    if (rx < CITY.worldBoundMinX) { rx = CITY.worldBoundMinX; hit = true; hitNormalX = 1; }
    if (rx > maxX) { rx = maxX; hit = true; hitNormalX = -1; }
    if (rz < CITY.worldBoundMinZ) { rz = CITY.worldBoundMinZ; hit = true; hitNormalZ = 1; }
    if (rz > CITY.worldBoundMaxZ) { rz = CITY.worldBoundMaxZ; hit = true; hitNormalZ = -1; }

    return { x: rx, z: rz, hit, nx: hitNormalX, nz: hitNormalZ };
  }

  function getGroundHeight(x, z) {
    // Pier height
    if (Math.abs(z) < 7.8 && x >= 241 && x <= 322) return 0.7;
    // Stunt ramp height
    for (const r of ramps) {
      if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
        const t = (r.maxZ - z) / (r.maxZ - r.minZ);
        return Math.max(0.2, t * r.maxY);
      }
    }
    // Check if on road
    const halfRoad = CITY.roadWidth * 0.5;
    for (let i = 0; i < ROAD_COORDS.length; i++) {
      if (Math.abs(x - ROAD_COORDS[i]) <= halfRoad || Math.abs(z - ROAD_COORDS[i]) <= halfRoad) {
        return 0.04;
      }
    }
    if (x > 241) return 0.04; // Beach sand
    return 0.22; // Sidewalk height
  }

  function rayHitsBuilding(x0, z0, x1, z1) {
    const steps = 14;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const px = x0 + (x1 - x0) * t;
      const pz = z0 + (z1 - z0) * t;
      for (let i = 0; i < colliders.length; i++) {
        const b = colliders[i];
        if (px >= b.minX && px <= b.maxX && pz >= b.minZ && pz <= b.maxZ) return true;
      }
    }
    return false;
  }

  function update(time) {
    ocean.position.y = -0.35 + Math.sin(time * 1.4) * 0.14;
    foam.position.x = 288 + Math.sin(time * 1.8) * 1.1;
  }

  return {
    root,
    colliders,
    buildingRects,
    ramps,
    resolveCircleCollision,
    getGroundHeight,
    rayHitsBuilding,
    update,
  };
}
