// Solana Bay — Twenty Hidden Golden Heron Collectibles
import * as THREE from 'three';

export const HERON_LOCATIONS = [
  { id: 1, name: 'Marina Pier End', district: 'miramar_coast', x: -60, z: 288 },
  { id: 2, name: 'Miramar West Palms', district: 'miramar_coast', x: -150, z: 196 },
  { id: 3, name: 'Boardwalk Bandstand', district: 'miramar_coast', x: 18, z: 196 },
  { id: 4, name: 'Grand Miramar Steps', district: 'miramar_coast', x: 145, z: 195 },
  { id: 5, name: 'Pasar Lantern Arch', district: 'pasar_senja', x: 90, z: 46 },
  { id: 6, name: 'Spice Alley East', district: 'pasar_senja', x: 155, z: 32 },
  { id: 7, name: 'Night Market Courtyard', district: 'pasar_senja', x: 90, z: 18 },
  { id: 8, name: 'Senja North Gate', district: 'pasar_senja', x: 120, z: -56 },
  { id: 9, name: 'Solana Spire Fountain', district: 'solana_core', x: -18, z: -18 },
  { id: 10, name: 'Neon Plaza Corner', district: 'solana_core', x: 16, z: 42 },
  { id: 11, name: 'Core Skybridge Base', district: 'solana_core', x: -46, z: 46 },
  { id: 12, name: 'Financial Arcade', district: 'solana_core', x: -46, z: -48 },
  { id: 13, name: 'Nori Respray Yard', district: 'puerto_bravo', x: -138, z: 46 },
  { id: 14, name: 'Coral Dock Armory Bay', district: 'puerto_bravo', x: -138, z: -74 },
  { id: 15, name: 'Container Row West', district: 'puerto_bravo', x: -176, z: -18 },
  { id: 16, name: 'Bravo South Slipway', district: 'puerto_bravo', x: -176, z: 108 },
  { id: 17, name: 'Altura Sky Terrace', district: 'altura_heights', x: 90, z: -120 },
  { id: 18, name: 'North Ridge Promenade', district: 'altura_heights', x: 0, z: -176 },
  { id: 19, name: 'Penthouse Garden', district: 'altura_heights', x: 165, z: -165 },
  { id: 20, name: 'West Ridge Overlook', district: 'altura_heights', x: -75, z: -165 },
];

function createGoldenHeronMesh() {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    metalness: 0.85,
    roughness: 0.2,
  });

  // Pedestal ring
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.16, 10), goldMat);
  base.position.y = 0.08;
  g.add(base);

  // Stylized heron body & wings
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.85, 6), goldMat);
  body.position.y = 0.65;
  g.add(body);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.55, 6), goldMat);
  neck.position.set(0, 1.12, 0.12);
  neck.rotation.x = 0.25;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 5), goldMat);
  head.position.set(0, 1.38, 0.26);
  head.rotation.x = Math.PI * 0.45;
  g.add(head);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.28), goldMat);
    wing.position.set(side * 0.36, 0.78, -0.04);
    wing.rotation.z = side * 0.48;
    g.add(wing);
  }

  return g;
}

export function createCollectibleSystem(scene) {
  const items = HERON_LOCATIONS.map((loc) => {
    const mesh = createGoldenHeronMesh();
    mesh.position.set(loc.x, 0.6, loc.z);
    scene.add(mesh);
    return {
      ...loc,
      mesh,
      collected: false,
      rewardCash: 350,
    };
  });

  let bobTime = 0;

  function collectItem(item, player, reputation, audio, onToast) {
    if (!item || item.collected) return;
    item.collected = true;
    item.mesh.visible = false;
    if (player) player.addCash(item.rewardCash);
    if (reputation) reputation.recordAction('collectible', item.x, item.z);
    if (audio) audio.playChime('collect');
    const count = getCollectedCount();
    if (onToast) {
      onToast(`GOLDEN HERON ${count}/${items.length}: ${item.name} (+₮${item.rewardCash})`);
    }
  }

  function update(dt, player, reputation, audio, onToast) {
    bobTime += dt;
    const px = player.state.x;
    const pz = player.state.z;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.collected) continue;
      it.mesh.rotation.y += dt * 1.9;
      it.mesh.position.y = 0.65 + Math.sin(bobTime * 3 + it.id) * 0.16;

      if (Math.hypot(px - it.x, pz - it.z) < 2.9) {
        collectItem(it, player, reputation, audio, onToast);
      }
    }
  }

  function getCollectedCount() {
    let n = 0;
    for (const it of items) if (it.collected) n++;
    return n;
  }

  function setCollectedCount(count) {
    for (let i = 0; i < items.length; i++) {
      items[i].collected = i < count;
      items[i].mesh.visible = !items[i].collected;
    }
  }

  function exportState() {
    return items.filter((it) => it.collected).map((it) => it.id);
  }

  function importState(ids) {
    const set = new Set(Array.isArray(ids) ? ids : []);
    for (const it of items) {
      it.collected = set.has(it.id);
      it.mesh.visible = !it.collected;
    }
  }

  return {
    items,
    total: items.length,
    getCollectedCount,
    setCollectedCount,
    update,
    exportState,
    importState,
  };
}
