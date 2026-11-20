// Solana Bay — Procedural coastal city builder, sky/sun/fog, boardwalk, marina pier & collision/raycast helpers
import * as THREE from 'three';
import { CITY, DISTRICTS, LANDMARKS, getDistrictAt, rngRange, rngInt, rngPick } from './config.js';
import { createTextureLibrary } from './textures.js';

export function buildCity(scene, rng) {
  const textures = createTextureLibrary();
  const colliders = []; // { minX, maxX, minZ, maxZ, height, color, style }
  const buildingRects = []; // for minimap
  const animatedObjects = [];
  const lampGlows = [];

  // 1. Sky Dome (warm sun-soaked coastal gradient) + Sun Disc
  const skyGeo = new THREE.SphereGeometry(750, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x1f79c4) },
      midColor: { value: new THREE.Color(0x63c5e8) },
      horizonColor: { value: new THREE.Color(0xffc994) },
      sunDir: { value: new THREE.Vector3(0.68, 0.34, 0.45).normalize() },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDir;
      varying vec3 vWorldPos;
      void main() {
        vec3 d = normalize(vWorldPos);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.28, h));
        col = mix(col, topColor, smoothstep(0.24, 0.85, h));
        float sunAmt = max(dot(d, sunDir), 0.0);
        col += vec3(1.0, 0.88, 0.65) * pow(sunAmt, 14.0) * 0.45;
        col += vec3(1.0, 0.96, 0.82) * smoothstep(0.9965, 0.9992, sunAmt) * 0.95;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  // Atmospheric coastal haze
  scene.fog = new THREE.Fog(0xd8dfe8, 175, 470);

  // 2. Lighting — golden afternoon coastal sun + turquoise sky bounce
  const hemi = new THREE.HemisphereLight(0xaee6ff, 0xe8bc8c, 0.88);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1d6, 1.75);
  sun.position.set(170, 145, 110);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 520;
  const sCam = 190;
  sun.shadow.camera.left = -sCam;
  sun.shadow.camera.right = sCam;
  sun.shadow.camera.top = sCam;
  sun.shadow.camera.bottom = -sCam;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Subtle cool fill light from west for architectural readability
  const fillLight = new THREE.DirectionalLight(0x88c9ff, 0.35);
  fillLight.position.set(-140, 70, -90);
  scene.add(fillLight);

  // 3. Base Asphalt Foundation & Road Grid
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  const basePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(430, 430),
    new THREE.MeshStandardMaterial({ color: 0x262a33, roughness: 0.92 })
  );
  basePlane.rotation.x = -Math.PI / 2;
  basePlane.position.set(-5, -0.02, 0);
  basePlane.receiveShadow = true;
  cityGroup.add(basePlane);

  // Asphalt road strips between intersections
  const roadMatV = new THREE.MeshStandardMaterial({
    map: textures.asphalt.clone(),
    roughness: 0.85,
  });
  roadMatV.map.repeat.set(1, 3);
  roadMatV.map.needsUpdate = true;

  const roadMatH = new THREE.MeshStandardMaterial({
    map: textures.asphalt.clone(),
    roughness: 0.85,
  });
  roadMatH.map.repeat.set(1, 3);
  roadMatH.map.needsUpdate = true;

  const interMat = new THREE.MeshStandardMaterial({
    map: textures.intersection,
    roughness: 0.84,
  });

  const segGeo = new THREE.PlaneGeometry(CITY.ROAD_WIDTH, CITY.BLOCK_SIZE);
  const interGeo = new THREE.PlaneGeometry(CITY.ROAD_WIDTH, CITY.ROAD_WIDTH);

  // Vertical road segments (along Z)
  for (const rx of CITY.ROAD_COORDS) {
    for (const bz of CITY.BLOCK_CENTERS) {
      const m = new THREE.Mesh(segGeo, roadMatV);
      m.rotation.x = -Math.PI / 2;
      m.position.set(rx, 0.01, bz);
      m.receiveShadow = true;
      cityGroup.add(m);
    }
  }
  // Horizontal road segments (along X)
  for (const rz of CITY.ROAD_COORDS) {
    for (const bx of CITY.BLOCK_CENTERS) {
      const m = new THREE.Mesh(segGeo, roadMatH);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = Math.PI / 2;
      m.position.set(bx, 0.012, rz);
      m.receiveShadow = true;
      cityGroup.add(m);
    }
  }
  // Intersections with zebra crosswalks
  for (const rx of CITY.ROAD_COORDS) {
    for (const rz of CITY.ROAD_COORDS) {
      const m = new THREE.Mesh(interGeo, interMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(rx, 0.018, rz);
      m.receiveShadow = true;
      cityGroup.add(m);
    }
  }

  // Helper to register solid AABB collider + minimap rect
  function addBuildingCollider(cx, cz, w, d, h, color, style) {
    const hw = w * 0.5;
    const hd = d * 0.5;
    colliders.push({
      minX: cx - hw,
      maxX: cx + hw,
      minZ: cz - hd,
      maxZ: cz + hd,
      height: h,
    });
    buildingRects.push({
      x: cx - hw,
      z: cz - hd,
      w,
      d,
      color,
      style,
    });
  }

  // Reusable geometries & materials for details
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalk,
    roughness: 0.88,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b404c, roughness: 0.9 });
  const trimGoldMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    roughness: 0.35,
    metalness: 0.5,
  });
  const neonPinkMat = new THREE.MeshStandardMaterial({
    color: 0xff5e9c,
    emissive: 0xff3b8b,
    emissiveIntensity: 0.95,
  });
  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38e8ff,
    emissive: 0x1fd4f0,
    emissiveIntensity: 0.95,
  });
  const neonAmberMat = new THREE.MeshStandardMaterial({
    color: 0xffa73b,
    emissive: 0xff8811,
    emissiveIntensity: 0.95,
  });

  // Palm tree builder
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b6747, roughness: 0.92 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.72, side: THREE.DoubleSide });
  const frondLightMat = new THREE.MeshStandardMaterial({ color: 0x3da368, roughness: 0.72, side: THREE.DoubleSide });

  function createPalmTree(x, y, z, scale = 1.0, leanAngle = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const h = 6.8 * scale;
    const segs = 4;
    let curY = 0;
    let curX = 0;
    for (let i = 0; i < segs; i++) {
      const segH = h / segs;
      const rBot = (0.34 - i * 0.045) * scale;
      const rTop = (0.29 - i * 0.045) * scale;
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, segH + 0.12, 6), trunkMat);
      const tilt = 0.08 * i;
      cyl.position.set(curX + Math.sin(tilt) * segH * 0.4, curY + segH * 0.5, 0);
      cyl.rotation.z = -tilt;
      cyl.castShadow = true;
      g.add(cyl);
      curX += Math.sin(tilt) * segH * 0.85;
      curY += Math.cos(tilt) * segH * 0.95;
    }

    // Lush crown of 7 drooping fronds
    const crown = new THREE.Group();
    crown.position.set(curX, curY, 0);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + leanAngle;
      const frond = new THREE.Mesh(
        new THREE.ConeGeometry(0.65 * scale, 3.3 * scale, 4),
        i % 2 === 0 ? frondMat : frondLightMat
      );
      frond.scale.set(1.0, 1.0, 0.24);
      frond.position.set(Math.cos(a) * 1.35 * scale, 0.15 * scale, Math.sin(a) * 1.35 * scale);
      frond.rotation.y = -a + Math.PI / 2;
      frond.rotation.x = 1.15;
      frond.castShadow = true;
      crown.add(frond);
    }
    g.add(crown);
    g.rotation.y = leanAngle;
    cityGroup.add(g);
    return g;
  }

  // Street lamp builder
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x353c47, metalness: 0.6, roughness: 0.4 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c2,
    emissive: 0xffd27d,
    emissiveIntensity: 1.1,
  });
  function createStreetLamp(x, y, z, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 6.2, 6), poleMat);
    pole.position.y = 3.1;
    g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.14), poleMat);
    arm.position.set(0.75, 6.1, 0);
    g.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.34), bulbMat);
    head.position.set(1.45, 5.98, 0);
    g.add(head);
    cityGroup.add(g);
    lampGlows.push(head);
  }

  // Helper for standard textured building
  function createBuilding(cx, cz, w, d, h, style, district) {
    const facadePool = textures.facades[style] || textures.facades.artdeco;
    const tex = rngPick(rng, facadePool);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: style === 'glass' ? 0.28 : 0.78,
      metalness: style === 'glass' ? 0.42 : 0.08,
    });
    const mats = [mat, mat, roofMat, roofMat, mat, mat];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    mesh.position.set(cx, 0.16 + h * 0.5, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cityGroup.add(mesh);

    // Architectural rooftop details
    if (style === 'artdeco') {
      // Stepped crown + neon rim
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.72, 2.2, d * 0.72),
        new THREE.MeshStandardMaterial({ color: rngPick(rng, district.buildingPalette), roughness: 0.7 })
      );
      crown.position.set(cx, 0.16 + h + 1.1, cz);
      crown.castShadow = true;
      cityGroup.add(crown);

      const neonBand = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.3, 0.45, d + 0.3),
        rng() > 0.45 ? neonPinkMat : neonCyanMat
      );
      neonBand.position.set(cx, 0.16 + h - 0.5, cz);
      cityGroup.add(neonBand);
    } else if (style === 'glass') {
      // Upper setback penthouse + gold antenna
      const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 4.0, d * 0.65), mat);
      top.position.set(cx, 0.16 + h + 2.0, cz);
      top.castShadow = true;
      cityGroup.add(top);

      const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.4, d + 0.25), trimGoldMat);
      rim.position.set(cx, 0.16 + h, cz);
      cityGroup.add(rim);
    } else if (style === 'stucco') {
      // Terracotta roof parapet
      const para = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.4, 0.9, d + 0.4),
        new THREE.MeshStandardMaterial({ color: 0xc85a32, roughness: 0.85 })
      );
      para.position.set(cx, 0.16 + h + 0.45, cz);
      cityGroup.add(para);
    } else {
      // Industrial rooftop HVAC & vents
      const ac = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(4, w * 0.35), 1.4, Math.min(3, d * 0.35)),
        new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.75 })
      );
      ac.position.set(cx + w * 0.15, 0.16 + h + 0.7, cz - d * 0.12);
      cityGroup.add(ac);
    }

    addBuildingCollider(cx, cz, w, d, h, district.accent, style);
  }

  // 4. Populate all 36 city blocks
  const blockGeo = new THREE.BoxGeometry(CITY.BLOCK_SIZE, 0.32, CITY.BLOCK_SIZE);

  for (let bxIdx = 0; bxIdx < CITY.BLOCK_CENTERS.length; bxIdx++) {
    for (let bzIdx = 0; bzIdx < CITY.BLOCK_CENTERS.length; bzIdx++) {
      const bx = CITY.BLOCK_CENTERS[bxIdx];
      const bz = CITY.BLOCK_CENTERS[bzIdx];
      const district = getDistrictAt(bx, bz);

      // Raised sidewalk pad for block
      const pad = new THREE.Mesh(blockGeo, sidewalkMat);
      pad.position.set(bx, 0, bz);
      pad.receiveShadow = true;
      cityGroup.add(pad);

      // Corner street lamps on every other block
      if ((bxIdx + bzIdx) % 2 === 0) {
        createStreetLamp(bx + 20.5, 0.16, bz + 20.5, -Math.PI * 0.75);
        createStreetLamp(bx - 20.5, 0.16, bz - 20.5, Math.PI * 0.25);
      }

      // Special landmark blocks
      if (bx === -90 && bz === 90) {
        // EL SOL CUSTOMS (Respray Garage) — bay opens north toward z=60
        buildGarageBlock(bx, bz);
        continue;
      }
      if (bx === -90 && bz === -90) {
        // IRONWORKS ARMORY — bay opens south toward z=-60
        buildArmoryBlock(bx, bz);
        continue;
      }
      if (bx === 90 && bz === -90) {
        // ALBA SKY PLAZA — iconic skyscraper + courtyard plaza
        buildAlbaPlazaBlock(bx, bz, district);
        continue;
      }
      if (bx === 150 && bz === 90) {
        // HOTEL SOLAMAR — flagship Art Deco neon beachfront hotel
        buildHotelSolamarBlock(bx, bz, district);
        continue;
      }
      if (bx === -150 && bz === -150) {
        // PUERTO FERRO CONTAINER YARD
        buildContainerYardBlock(bx, bz, district);
        continue;
      }

      // Standard varied city block (2 to 4 buildings + palms)
      const layout = rngInt(rng, 0, 2);
      const [hMin, hMax] = district.heightRange;

      if (layout === 0) {
        // Two twin-ish towers or wide buildings
        const h1 = rngRange(rng, hMin, hMax);
        const h2 = rngRange(rng, hMin, hMax);
        createBuilding(bx - 9, bz, 15, 32, h1, district.style, district);
        createBuilding(bx + 9, bz, 15, 32, h2, district.style, district);
      } else if (layout === 1) {
        // Four-quadrant neighborhood block
        const offsets = [[-9, -9], [9, -9], [-9, 9], [9, 9]];
        for (const [ox, oz] of offsets) {
          const w = rngRange(rng, 12.5, 15.2);
          const d = rngRange(rng, 12.5, 15.2);
          const h = rngRange(rng, hMin, hMax);
          createBuilding(bx + ox, bz + oz, w, d, h, district.style, district);
        }
      } else {
        // One dominant centerpiece + side annex + corner palms
        const hMain = rngRange(rng, hMin + 4, hMax + 6);
        createBuilding(bx - 4, bz - 3, 24, 24, hMain, district.style, district);
        createBuilding(bx + 12, bz + 10, 10.5, 13, rngRange(rng, hMin, hMin + 8), district.style, district);
        createPalmTree(bx + 14, 0.16, bz - 14, 0.95, rng() * Math.PI * 2);
      }

      // Coastal boulevard palms along eastern Miramar blocks and Calle Verde
      if (bx === 150) {
        createPalmTree(bx + 19.8, 0.16, bz - 12, 1.05, 0.4);
        createPalmTree(bx + 19.8, 0.16, bz + 12, 1.0, 2.3);
      } else if (district.id === 'calle_verde' && rng() > 0.35) {
        createPalmTree(bx + 19.5, 0.16, bz - 17, 0.85, rng() * 6);
      }
    }
  }

  function buildGarageBlock(bx, bz) {
    // Rear workshop building (z from bz-2 to bz+18), open forecourt at z=bz-14..bz-2 (facing z=60 avenue)
    createBuilding(bx, bz + 8, 34, 18, 11, 'industrial', DISTRICTS[2]);
    // Side walls framing the respray forecourt
    createBuilding(bx - 14, bz - 8, 6, 14, 7, 'stucco', DISTRICTS[2]);
    createBuilding(bx + 14, bz - 8, 6, 14, 7, 'stucco', DISTRICTS[2]);
    // Overhead canopy arch
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(24, 1.4, 7),
      new THREE.MeshStandardMaterial({ color: 0x1e2b33, roughness: 0.5 })
    );
    canopy.position.set(bx, 6.2, bz - 11);
    cityGroup.add(canopy);

    // Neon sign
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 4.2),
      new THREE.MeshBasicMaterial({ map: textures.signs.customs })
    );
    sign.position.set(bx, 7.6, bz - 14.6);
    sign.rotation.y = Math.PI;
    cityGroup.add(sign);

    // Glowing respray pad
    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 5.2, 32),
      new THREE.MeshBasicMaterial({ color: 0x2ce6d2, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(LANDMARKS.garage.x, 0.22, LANDMARKS.garage.z);
    cityGroup.add(padRing);
    animatedObjects.push({ type: 'pulse', mesh: padRing, baseScale: 1 });
  }

  function buildArmoryBlock(bx, bz) {
    // Depot building north side, open entry south toward z=-60
    createBuilding(bx, bz - 8, 34, 18, 12, 'industrial', DISTRICTS[3]);
    createBuilding(bx - 14, bz + 8, 6, 14, 8, 'industrial', DISTRICTS[3]);
    createBuilding(bx + 14, bz + 8, 6, 14, 8, 'industrial', DISTRICTS[3]);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 4.2),
      new THREE.MeshBasicMaterial({ map: textures.signs.armory })
    );
    sign.position.set(bx, 7.5, bz + 14.6);
    cityGroup.add(sign);

    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 4.5, 32),
      new THREE.MeshBasicMaterial({ color: 0xff9640, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(LANDMARKS.armory.x, 0.22, LANDMARKS.armory.z);
    cityGroup.add(padRing);
    animatedObjects.push({ type: 'pulse', mesh: padRing, baseScale: 1 });
  }

  function buildAlbaPlazaBlock(bx, bz, district) {
    // Flagship glass skyscraper set back, leaving an open plaza courtyard for Mission 5 shootout!
    createBuilding(bx - 8, bz - 8, 18, 18, 64, 'glass', district);
    // Gold spire needle on top
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.9, 14, 8), trimGoldMat);
    spire.position.set(bx - 8, 0.16 + 64 + 7, bz - 8);
    cityGroup.add(spire);
    // Sign
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4),
      new THREE.MeshBasicMaterial({ map: textures.signs.alba })
    );
    sign.position.set(bx - 8, 18, bz + 1.3);
    cityGroup.add(sign);

    // Decorative courtyard fountain in the open SE corner of the block
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 5.0, 0.9, 16),
      new THREE.MeshStandardMaterial({ color: 0xd9e2ec, roughness: 0.5 })
    );
    basin.position.set(bx + 9, 0.6, bz + 9);
    cityGroup.add(basin);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(4.1, 4.1, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x38e8ff, roughness: 0.15, metalness: 0.3 })
    );
    water.position.set(bx + 9, 1.0, bz + 9);
    cityGroup.add(water);
    addBuildingCollider(bx + 9, bz + 9, 8.8, 8.8, 1.2, '#38e8ff', 'plaza');

    createPalmTree(bx + 17, 0.16, bz - 15, 1.05, 1.2);
    createPalmTree(bx - 16, 0.16, bz + 16, 1.0, 3.8);
  }

  function buildHotelSolamarBlock(bx, bz, district) {
    // Iconic stepped Art Deco hotel facing the ocean boardwalk
    createBuilding(bx - 3, bz, 26, 32, 36, 'artdeco', district);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 5),
      new THREE.MeshBasicMaterial({ map: textures.signs.solamar })
    );
    sign.position.set(bx + 10.3, 27, bz);
    sign.rotation.y = Math.PI / 2;
    cityGroup.add(sign);

    // Neon pool deck sign on west side too
    const signW = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 4.5),
      new THREE.MeshBasicMaterial({ map: textures.signs.club })
    );
    signW.position.set(bx - 16.3, 14, bz);
    signW.rotation.y = -Math.PI / 2;
    cityGroup.add(signW);

    createPalmTree(bx + 16, 0.16, bz - 14, 1.15, 0.7);
    createPalmTree(bx + 16, 0.16, bz + 14, 1.15, 2.4);
  }

  function buildContainerYardBlock(bx, bz, district) {
    // Shipping containers in vibrant harbor colors + gantry frame
    const containerColors = [0xd94e34, 0x2a6f97, 0xe9a825, 0x2b9348, 0x5c677d];
    const slots = [
      [-10, -10, 12, 4.5, 4.5],
      [-10, -3, 12, 4.5, 9.0],
      [8, -10, 13, 4.5, 4.5],
      [8, 6, 13, 4.5, 9.0],
      [-10, 11, 12, 4.5, 4.5],
    ];
    for (let i = 0; i < slots.length; i++) {
      const [ox, oz, w, d, h] = slots[i];
      const mat = new THREE.MeshStandardMaterial({
        color: containerColors[i % containerColors.length],
        roughness: 0.7,
        metalness: 0.25,
      });
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(bx + ox, 0.16 + h * 0.5, bz + oz);
      m.castShadow = true;
      m.receiveShadow = true;
      cityGroup.add(m);
      addBuildingCollider(bx + ox, bz + oz, w, d, h, district.accent, 'industrial');
    }
    // Tall orange port crane gantry
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.55, metalness: 0.35 });
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 22, 1.4), craneMat);
    leg1.position.set(bx + 15, 11, bz - 16);
    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 22, 1.4), craneMat);
    leg2.position.set(bx + 15, 11, bz + 16);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 36), craneMat);
    beam.position.set(bx + 15, 22, bz);
    cityGroup.add(leg1, leg2, beam);
  }

  // 5. Beachfront Boardwalk (x = 188..202)
  const boardwalk = new THREE.Mesh(
    new THREE.BoxGeometry(CITY.BOARDWALK_MAX_X - CITY.BOARDWALK_MIN_X, 0.56, 420),
    new THREE.MeshStandardMaterial({ map: textures.boardwalk, roughness: 0.82 })
  );
  boardwalk.position.set((CITY.BOARDWALK_MIN_X + CITY.BOARDWALK_MAX_X) * 0.5, 0.0, 0);
  boardwalk.receiveShadow = true;
  cityGroup.add(boardwalk);

  // Boardwalk palms, benches & coastal lamps
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 });
  for (let z = -176; z <= 176; z += 22) {
    if (Math.abs(z) < 15) continue; // Keep marina pier entrance wide open
    createPalmTree(191.5, 0.28, z, rngRange(rng, 0.95, 1.2), rng() * Math.PI * 2);
    createStreetLamp(199.5, 0.28, z + 10, Math.PI);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 3.2), benchMat);
    bench.position.set(198.2, 0.6, z);
    bench.castShadow = true;
    cityGroup.add(bench);
  }

  // 6. Golden Sand Beach (x = 202..248) with umbrellas & lifeguard tower
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 430),
    new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 0.96 })
  );
  beach.rotation.x = -Math.PI / 2;
  beach.rotation.y = 0.012; // subtle slope toward sea
  beach.position.set(227, 0.05, 0);
  beach.receiveShadow = true;
  cityGroup.add(beach);

  // Colorful beach umbrellas & towels
  const umbrellaColors = [0xff5e9c, 0x38e8ff, 0xffd166, 0xff7043, 0x2ce6d2, 0xffffff];
  for (let z = -165; z <= 165; z += 18) {
    if (Math.abs(z) < 18) continue;
    const ux = rngRange(rng, 210, 232);
    const uz = z + rngRange(rng, -5, 5);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6),
      new THREE.MeshStandardMaterial({ color: 0xf4f4f4 })
    );
    pole.position.set(ux, 1.25, uz);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.1, 0.85, 8),
      new THREE.MeshStandardMaterial({ color: rngPick(rng, umbrellaColors), roughness: 0.7 })
    );
    canopy.position.set(ux, 2.45, uz);
    canopy.castShadow = true;
    const towel = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.05, 2.4),
      new THREE.MeshStandardMaterial({ color: rngPick(rng, umbrellaColors), roughness: 0.9 })
    );
    towel.position.set(ux + 1.1, 0.08, uz + 0.6);
    cityGroup.add(pole, canopy, towel);
  }

  // Lifeguard tower on Miramar beach
  const lgGroup = new THREE.Group();
  lgGroup.position.set(220, 0, 72);
  const lgWood = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const lgBlue = new THREE.MeshStandardMaterial({ color: 0x1e90ff, roughness: 0.6 });
  for (const [lx, lz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 0.22), lgWood);
    post.position.set(lx, 1.6, lz);
    lgGroup.add(post);
  }
  const lgCabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 3.2), lgWood);
  lgCabin.position.set(0, 4.3, 0);
  const lgRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.1, 4), lgBlue);
  lgRoof.position.set(0, 6.0, 0);
  lgRoof.rotation.y = Math.PI / 4;
  lgGroup.add(lgCabin, lgRoof);
  cityGroup.add(lgGroup);

  // 7. Shimmering Turquoise Ocean + Shoreline Foam
  const oceanGeo = new THREE.PlaneGeometry(340, 760, 20, 32);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0ca6c4,
    roughness: 0.16,
    metalness: 0.28,
    transparent: true,
    opacity: 0.94,
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(410, -0.35, 0);
  ocean.receiveShadow = true;
  cityGroup.add(ocean);

  const foamStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 450),
    new THREE.MeshBasicMaterial({ color: 0xe6fbff, transparent: true, opacity: 0.65 })
  );
  foamStrip.rotation.x = -Math.PI / 2;
  foamStrip.position.set(245, -0.18, 0);
  cityGroup.add(foamStrip);

  // 8. Coral Key Marina Pier (x = 198..278, z = -11..11)
  const pierLen = CITY.PIER.maxX - CITY.PIER.minX;
  const pierW = CITY.PIER.maxZ - CITY.PIER.minZ;
  const pierDeck = new THREE.Mesh(
    new THREE.BoxGeometry(pierLen, 0.55, pierW),
    new THREE.MeshStandardMaterial({ map: textures.boardwalk, roughness: 0.8 })
  );
  pierDeck.position.set((CITY.PIER.minX + CITY.PIER.maxX) * 0.5, CITY.PIER.y - 0.275, 0);
  pierDeck.receiveShadow = true;
  pierDeck.castShadow = true;
  cityGroup.add(pierDeck);

  // Pier approach ramp from boardwalk (x = 194..202)
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 0.4, pierW - 2),
    new THREE.MeshStandardMaterial({ map: textures.boardwalk, roughness: 0.85 })
  );
  ramp.position.set(197.5, 0.72, 0);
  ramp.rotation.z = 0.14;
  cityGroup.add(ramp);

  // Timber pilings under pier
  const pilingMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });
  for (let px = 204; px <= 274; px += 10) {
    for (const pz of [-9.5, 0, 9.5]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 3.8, 7), pilingMat);
      pile.position.set(px, -0.5, pz);
      cityGroup.add(pile);
    }
    // Bollards along pier edge
    for (const pz of [-10.2, 10.2]) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.85, 8), poleMat);
      bollard.position.set(px, CITY.PIER.y + 0.42, pz);
      cityGroup.add(bollard);
    }
  }

  // Glowing Coral Key Marina entrance arch
  const archL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7.5, 0.8), neonCyanMat);
  archL.position.set(206, CITY.PIER.y + 3.75, -9.8);
  const archR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7.5, 0.8), neonCyanMat);
  archR.position.set(206, CITY.PIER.y + 3.75, 9.8);
  const marinaSign = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 4.2),
    new THREE.MeshBasicMaterial({ map: textures.signs.marina, side: THREE.DoubleSide })
  );
  marinaSign.position.set(206, CITY.PIER.y + 7.2, 0);
  marinaSign.rotation.y = -Math.PI / 2;
  cityGroup.add(archL, archR, marinaSign);

  // Pier end pavilion / gazebo
  const pavRoof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 2.6, 8), neonPinkMat);
  pavRoof.position.set(272, CITY.PIER.y + 5.6, 0);
  cityGroup.add(pavRoof);
  for (const [ox, oz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.6, 6), lgWood);
    col.position.set(272 + ox, CITY.PIER.y + 2.3, oz);
    cityGroup.add(col);
  }

  // Moored yachts bobbing beside the pier
  function createYacht(x, z, rotY, accentHex) {
    const yacht = new THREE.Group();
    yacht.position.set(x, -0.05, z);
    yacht.rotation.y = rotY;
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 1.3, 10.5),
      new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.3, metalness: 0.15 })
    );
    hull.position.y = 0.35;
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(3.9, 0.28, 10.2),
      new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.35 })
    );
    stripe.position.y = 0.72;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.25, 4.8),
      new THREE.MeshStandardMaterial({ color: 0x1e3545, roughness: 0.2, metalness: 0.45 })
    );
    cabin.position.set(0, 1.5, -0.6);
    yacht.add(hull, stripe, cabin);
    cityGroup.add(yacht);
    animatedObjects.push({ type: 'boat', mesh: yacht, baseY: -0.05, phase: x * 0.17 + z * 0.11 });
  }
  createYacht(236, -18, 0.12, 0xff5e9c);
  createYacht(258, -19, -0.08, 0x38e8ff);
  createYacht(244, 18, Math.PI - 0.1, 0xffd166);
  createYacht(264, 17, Math.PI + 0.06, 0x2ce6d2);

  // 9. Western & Northern/Southern Seawall / Highway Perimeter Curbs
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x5c6470, roughness: 0.85 });
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 412), wallMat);
  westWall.position.set(-203, 1.1, 0);
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(408, 2.2, 2), wallMat);
  northWall.position.set(0, 1.1, -203);
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(408, 2.2, 2), wallMat);
  southWall.position.set(0, 1.1, 203);
  cityGroup.add(westWall, northWall, southWall);

  // ---------- Collision & Ground Helpers ----------

  function isOnPier(x, z) {
    return (
      x >= CITY.PIER.minX - 4 &&
      x <= CITY.PIER.maxX + 0.5 &&
      z >= CITY.PIER.minZ - 0.5 &&
      z <= CITY.PIER.maxZ + 0.5
    );
  }

  function getGroundHeight(x, z) {
    if (x >= CITY.PIER.minX && x <= CITY.PIER.maxX && Math.abs(z) <= CITY.PIER.maxZ) {
      return CITY.PIER.y;
    }
    if (x >= 193 && x < CITY.PIER.minX && Math.abs(z) <= CITY.PIER.maxZ - 0.8) {
      const t = Math.max(0, Math.min(1, (x - 193) / (CITY.PIER.minX - 193)));
      return 0.28 + t * (CITY.PIER.y - 0.28);
    }
    if (x >= CITY.BOARDWALK_MIN_X && x <= CITY.BOARDWALK_MAX_X) {
      return 0.28;
    }
    if (x > CITY.BOARDWALK_MAX_X) {
      const t = Math.min(1, (x - CITY.BOARDWALK_MAX_X) / 42);
      return 0.22 - t * 0.45;
    }
    // Check if inside any road strip
    const halfRoad = CITY.ROAD_WIDTH * 0.5;
    for (const rc of CITY.ROAD_COORDS) {
      if (Math.abs(x - rc) <= halfRoad || Math.abs(z - rc) <= halfRoad) {
        return 0.0;
      }
    }
    return 0.16; // sidewalk
  }

  function resolveCircleCollision(x, z, radius) {
    let rx = x;
    let rz = z;
    let hit = false;
    let nx = 0;
    let nz = 0;

    // World bounds (keep off deep ocean unless on pier)
    const minX = CITY.WORLD_BOUNDS.minX + radius;
    const minZ = CITY.WORLD_BOUNDS.minZ + radius;
    const maxZ = CITY.WORLD_BOUNDS.maxZ - radius;
    const maxX = isOnPier(rx, rz) ? CITY.PIER.maxX - radius : CITY.BEACH_MAX_X - 4 - radius;

    if (rx < minX) { rx = minX; hit = true; nx = 1; }
    if (rx > maxX) { rx = maxX; hit = true; nx = -1; }
    if (rz < minZ) { rz = minZ; hit = true; nz = 1; }
    if (rz > maxZ) { rz = maxZ; hit = true; nz = -1; }

    // Keep pier edges safe once out over the ocean
    if (rx > CITY.BEACH_MAX_X - 4) {
      const pMinZ = CITY.PIER.minZ + radius;
      const pMaxZ = CITY.PIER.maxZ - radius;
      if (rz < pMinZ) { rz = pMinZ; hit = true; nz = 1; }
      if (rz > pMaxZ) { rz = pMaxZ; hit = true; nz = -1; }
    }

    // Building AABB push-out
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      const closestX = Math.max(b.minX, Math.min(rx, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(rz, b.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        hit = true;
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          const ux = dx / dist;
          const uz = dz / dist;
          rx += ux * push;
          rz += uz * push;
          nx = ux;
          nz = uz;
        } else {
          // Center inside AABB — push along shallowest axis
          const dl = Math.abs(rx - b.minX);
          const dr = Math.abs(b.maxX - rx);
          const dt = Math.abs(rz - b.minZ);
          const db = Math.abs(b.maxZ - rz);
          const m = Math.min(dl, dr, dt, db);
          if (m === dl) { rx = b.minX - radius; nx = -1; }
          else if (m === dr) { rx = b.maxX + radius; nx = 1; }
          else if (m === dt) { rz = b.minZ - radius; nz = -1; }
          else { rz = b.maxZ + radius; nz = 1; }
        }
      }
    }

    return { x: rx, z: rz, hit, nx, nz };
  }

  // Exact ray-AABB intersection against all buildings (for hitscan & police LOS)
  function raycastBuildings(origin, dir, maxDist = 120) {
    let bestT = maxDist;
    let hit = false;
    const ox = origin.x;
    const oy = origin.y;
    const oz = origin.z;
    const dx = dir.x;
    const dy = dir.y;
    const dz = dir.z;
    const invX = Math.abs(dx) > 1e-7 ? 1 / dx : 1e9;
    const invY = Math.abs(dy) > 1e-7 ? 1 / dy : 1e9;
    const invZ = Math.abs(dz) > 1e-7 ? 1 / dz : 1e9;

    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      const t1 = (b.minX - ox) * invX;
      const t2 = (b.maxX - ox) * invX;
      const t3 = (0 - oy) * invY;
      const t4 = (b.height + 0.2 - oy) * invY;
      const t5 = (b.minZ - oz) * invZ;
      const t6 = (b.maxZ - oz) * invZ;

      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));
      if (tmax >= 0 && tmin <= tmax && tmin >= 0 && tmin < bestT) {
        bestT = tmin;
        hit = true;
      }
    }

    return {
      hit,
      dist: bestT,
      point: new THREE.Vector3(ox + dx * bestT, oy + dy * bestT, oz + dz * bestT),
    };
  }

  function hasLineOfSight(ax, ay, az, bx, by, bz) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.1) return true;
    const res = raycastBuildings(
      { x: ax, y: ay, z: az },
      { x: dx / dist, y: dy / dist, z: dz / dist },
      dist - 0.5
    );
    return !res.hit;
  }

  function update(dt, time) {
    // Gentle shoreline shimmer & yacht bobbing
    ocean.position.y = -0.35 + Math.sin(time * 1.4) * 0.08;
    foamStrip.position.x = 245 + Math.sin(time * 1.9) * 1.3;
    for (const item of animatedObjects) {
      if (item.type === 'boat') {
        item.mesh.position.y = item.baseY + Math.sin(time * 1.8 + item.phase) * 0.12;
        item.mesh.rotation.z = Math.sin(time * 1.4 + item.phase) * 0.035;
      } else if (item.type === 'pulse') {
        const s = 1 + Math.sin(time * 3.5) * 0.07;
        item.mesh.scale.set(s, s, 1);
      }
    }
  }

  function getMinimapData() {
    return {
      buildings: buildingRects,
      roads: CITY.ROAD_COORDS,
      roadWidth: CITY.ROAD_WIDTH,
      boardwalkMinX: CITY.BOARDWALK_MIN_X,
      beachMinX: CITY.BEACH_MIN_X,
      oceanMinX: CITY.OCEAN_MIN_X,
      pier: CITY.PIER,
      districts: DISTRICTS,
    };
  }

  return {
    group: cityGroup,
    sun,
    textures,
    colliders,
    resolveCircleCollision,
    raycastBuildings,
    hasLineOfSight,
    getGroundHeight,
    getMinimapData,
    update,
  };
}
