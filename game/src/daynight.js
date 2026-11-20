// Solana Bay — Day/Night Cycle, Sky Dome & Lighting Controller
import * as THREE from 'three';
import { clamp } from './config.js';

function createGradientSkyDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x0ea5e9) },
      horizonColor: { value: new THREE.Color(0xfde68a) },
      bottomColor: { value: new THREE.Color(0x0369a1) },
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
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        vec3 col = h >= 0.0
          ? mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.55))
          : mix(horizonColor, bottomColor, clamp(-h * 3.0, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(720, 24, 16), mat);
  return { dome, mat };
}

const KEYFRAMES = [
  { h: 0.0, top: 0x050816, horizon: 0x161c36, fog: 0x10152a, sunCol: 0x64748b, sunInt: 0.25, ambInt: 0.42 },
  { h: 5.5, top: 0x1e293b, horizon: 0xfb7185, fog: 0x6b3a5b, sunCol: 0xffa67a, sunInt: 0.65, ambInt: 0.55 },
  { h: 8.5, top: 0x0284c7, horizon: 0xfef3c7, fog: 0x93c5fd, sunCol: 0xfff3d6, sunInt: 1.55, ambInt: 0.78 },
  { h: 13.0, top: 0x0ea5e9, horizon: 0xbae6fd, fog: 0x9bd7f8, sunCol: 0xfff9e6, sunInt: 1.85, ambInt: 0.88 },
  { h: 17.7, top: 0x2a1b4e, horizon: 0xff6b57, fog: 0xd96b52, sunCol: 0xff8c42, sunInt: 1.35, ambInt: 0.68 },
  { h: 19.5, top: 0x0c0e24, horizon: 0x3b1d45, fog: 0x171329, sunCol: 0x94a3b8, sunInt: 0.35, ambInt: 0.46 },
  { h: 24.0, top: 0x050816, horizon: 0x161c36, fog: 0x10152a, sunCol: 0x64748b, sunInt: 0.25, ambInt: 0.42 },
];

export function createDayNightSystem(scene, city) {
  const { dome, mat: skyMat } = createGradientSkyDome();
  scene.add(dome);

  const fog = new THREE.FogExp2(0x9bd7f8, 0.0022);
  scene.fog = fog;

  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f3f46, 0.85);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff5db, 1.7);
  sunLight.position.set(110, 140, 80);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 420;
  const d = 145;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Visible Sun & Moon discs
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(18, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe082, fog: false })
  );
  scene.add(sunDisc);

  const moonDisc = new THREE.Mesh(
    new THREE.SphereGeometry(12, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xe2e8f0, fog: false })
  );
  scene.add(moonDisc);

  const state = {
    hours: 13.0, // 0..24
    rate: 0.14, // in-game hours per real second (~170s full day)
    paused: false,
    nightFactor: 0,
  };

  const cTopA = new THREE.Color();
  const cTopB = new THREE.Color();
  const cHorA = new THREE.Color();
  const cHorB = new THREE.Color();
  const cFogA = new THREE.Color();
  const cFogB = new THREE.Color();
  const cSunA = new THREE.Color();
  const cSunB = new THREE.Color();

  function applyLighting(focusX = 0, focusZ = 0) {
    const h = ((state.hours % 24) + 24) % 24;
    let k0 = KEYFRAMES[0];
    let k1 = KEYFRAMES[KEYFRAMES.length - 1];
    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (h >= KEYFRAMES[i].h && h <= KEYFRAMES[i + 1].h) {
        k0 = KEYFRAMES[i];
        k1 = KEYFRAMES[i + 1];
        break;
      }
    }
    const span = Math.max(0.0001, k1.h - k0.h);
    const t = clamp((h - k0.h) / span, 0, 1);

    cTopA.setHex(k0.top);
    cTopB.setHex(k1.top);
    skyMat.uniforms.topColor.value.copy(cTopA).lerp(cTopB, t);

    cHorA.setHex(k0.horizon);
    cHorB.setHex(k1.horizon);
    skyMat.uniforms.horizonColor.value.copy(cHorA).lerp(cHorB, t);

    cFogA.setHex(k0.fog);
    cFogB.setHex(k1.fog);
    fog.color.copy(cFogA).lerp(cFogB, t);

    cSunA.setHex(k0.sunCol);
    cSunB.setHex(k1.sunCol);
    sunLight.color.copy(cSunA).lerp(cSunB, t);
    sunLight.intensity = k0.sunInt + (k1.sunInt - k0.sunInt) * t;
    hemiLight.intensity = k0.ambInt + (k1.ambInt - k0.ambInt) * t;

    // Sun & Moon arc across coastal sky
    const sunAngle = ((h - 6) / 12) * Math.PI;
    const sunDist = 420;
    const sx = Math.cos(sunAngle) * sunDist;
    const sy = Math.sin(sunAngle) * sunDist;
    const sz = 160;
    sunDisc.position.set(focusX + sx, sy, focusZ + sz);
    sunDisc.visible = sy > -25;

    const moonAngle = sunAngle + Math.PI;
    moonDisc.position.set(
      focusX + Math.cos(moonAngle) * sunDist,
      Math.sin(moonAngle) * sunDist,
      focusZ + 120
    );
    moonDisc.visible = Math.sin(moonAngle) > -10;

    // Directional light tracks sun during day and moon at night
    if (sy > 5) {
      sunLight.position.set(focusX + sx * 0.35, Math.max(35, sy * 0.4), focusZ + sz * 0.45);
    } else {
      sunLight.position.set(focusX - 80, 95, focusZ + 60);
    }
    sunLight.target.position.set(focusX, 0, focusZ);
    dome.position.set(focusX, 0, focusZ);

    // Night intensity factor: switches on lamps, building windows, neon, market lanterns at dusk
    let nightFactor = 0;
    if (h >= 17.8) nightFactor = clamp((h - 17.8) / 1.5, 0, 1);
    else if (h <= 6.2) nightFactor = clamp((6.2 - h) / 1.4, 0, 1);
    state.nightFactor = nightFactor;

    fog.density = 0.002 + nightFactor * 0.0014;

    if (city) {
      for (let i = 0; i < city.lampBulbs.length; i++) {
        city.lampBulbs[i].emissiveIntensity = 0.1 + nightFactor * 2.2;
      }
      for (let i = 0; i < city.neonMeshes.length; i++) {
        city.neonMeshes[i].emissiveIntensity = 0.25 + nightFactor * 1.45;
      }
      for (let i = 0; i < city.lanternMeshes.length; i++) {
        city.lanternMeshes[i].emissiveIntensity = 0.3 + nightFactor * 1.9;
      }
      for (let i = 0; i < city.buildingMaterials.length; i++) {
        city.buildingMaterials[i].emissiveIntensity = nightFactor * 0.72;
      }
      for (let i = 0; i < city.lampLights.length; i++) {
        city.lampLights[i].intensity = nightFactor * 2.8;
      }
    }
  }

  function setTime(hours) {
    state.hours = ((hours % 24) + 24) % 24;
    applyLighting(0, 0);
  }

  function update(dt, focusX = 0, focusZ = 0) {
    if (!state.paused) {
      state.hours = (state.hours + dt * state.rate) % 24;
    }
    applyLighting(focusX, focusZ);
  }

  function getClockString() {
    const h = Math.floor(((state.hours % 24) + 24) % 24);
    const m = Math.floor((state.hours - Math.floor(state.hours)) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  applyLighting(0, 0);

  return {
    state,
    setTime,
    update,
    applyLighting,
    getClockString,
    isNight: () => state.nightFactor > 0.45,
  };
}
