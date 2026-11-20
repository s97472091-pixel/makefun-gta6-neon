// Solana Bay — 6-mission original story campaign, dialogue, 3D objective beacons, and free-roam unlock.

import * as THREE from 'three';
import { LANDMARKS, dist2D } from './config.js';

export const MISSION_DEFS = [
  {
    id: 1,
    title: 'HOT WIRE ON CORAL',
    speaker: 'ELENA NAVARRO',
    intro: 'Marco, the Pelican Syndicate torched your slip. Grab that Riptide GT on Coral Strip and meet me at Palma Spray.',
    outro: 'Clean wheels. Paint is wet, plates are fresh. Now we hit back.',
    reward: 500,
    steps: [
      {
        type: 'enter_vehicle',
        text: 'Steal any car on Coral Promenade (Press F/E)',
        x: 99.6,
        z: -36,
        radius: 10,
      },
      {
        type: 'goto',
        requireVehicle: true,
        text: 'Drive to Palma Spray & Customs in Sunset Palms',
        x: LANDMARKS.resprayGarage.x,
        z: LANDMARKS.resprayGarage.z,
        radius: 9,
      },
    ],
  },
  {
    id: 2,
    title: 'DOCKSIDE DEBT',
    speaker: 'TITO MENDEZ',
    intro: 'Syndicate collectors are holding Harbor Docks. Drive down to the depot and clear their three enforcers.',
    outro: 'Harbor crew sends their thanks, Marco. Here is your cut.',
    reward: 850,
    steps: [
      {
        type: 'goto',
        text: 'Head to Pelican Syndicate Depot in Harbor Docks',
        x: LANDMARKS.syndicateDepot.x,
        z: LANDMARKS.syndicateDepot.z,
        radius: 14,
      },
      {
        type: 'eliminate',
        text: 'Eliminate the Syndicate enforcers at the depot',
        x: LANDMARKS.syndicateDepot.x,
        z: LANDMARKS.syndicateDepot.z,
        enemies: [
          { x: 112, z: 140, hp: 65 },
          { x: 126, z: 146, hp: 65 },
          { x: 120, z: 132, hp: 75 },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'ALTA EXPRESS',
    speaker: 'ELENA NAVARRO',
    intro: 'SBPD spotted our ledger courier in Alta Glass. Pick up the drop at Zenith Plaza and outrun the patrol.',
    outro: 'Smooth getaway. We have Crane’s shipping manifest now.',
    reward: 1100,
    steps: [
      {
        type: 'goto',
        text: 'Collect the ledger drop at Alta Zenith Plaza',
        x: LANDMARKS.altaTower.x,
        z: LANDMARKS.altaTower.z,
        radius: 11,
        triggerStars: 2,
      },
      {
        type: 'evade',
        text: 'Lose your 2-star SBPD wanted level (or visit Palma Spray)',
        x: LANDMARKS.resprayGarage.x,
        z: LANDMARKS.resprayGarage.z,
      },
    ],
  },
  {
    id: 4,
    title: 'IRON & SALT',
    speaker: 'TITO MENDEZ',
    intro: 'Crane’s crew parked two supply vans near Sunset Plaza. Torch both vans before they leave the district.',
    outro: 'That will cut Crane’s street supply for a month.',
    reward: 1400,
    steps: [
      {
        type: 'destroy_vehicles',
        text: 'Destroy both Pelican supply vans at Sunset Plaza',
        x: LANDMARKS.sunsetPlaza.x,
        z: LANDMARKS.sunsetPlaza.z,
        targets: [
          { cls: 'van', x: -52, z: 44, yaw: 0, color: '#d62828' },
          { cls: 'van', x: -42, z: 54, yaw: Math.PI * 0.5, color: '#d62828' },
        ],
        guards: [
          { x: -56, z: 50, hp: 70 },
          { x: -38, z: 46, hp: 70 },
        ],
      },
    ],
  },
  {
    id: 5,
    title: 'NEON AMBUSH',
    speaker: 'ELENA NAVARRO',
    intro: 'Victor Crane’s lieutenants are meeting outside The Mirage Palms. Hit them hard and shake the cops.',
    outro: 'Crane is spooked. He is pulling his yacht onto Solana Marina Pier.',
    reward: 1800,
    steps: [
      {
        type: 'goto',
        text: 'Go to The Mirage Palms on Coral Promenade',
        x: LANDMARKS.coralHotel.x,
        z: LANDMARKS.coralHotel.z,
        radius: 15,
      },
      {
        type: 'eliminate',
        text: 'Take out Crane’s four lieutenants outside the hotel',
        x: LANDMARKS.coralHotel.x,
        z: LANDMARKS.coralHotel.z,
        triggerStars: 2,
        enemies: [
          { x: 114, z: -42, hp: 80 },
          { x: 126, z: -44, hp: 80 },
          { x: 118, z: -56, hp: 85 },
          { x: 130, z: -52, hp: 85 },
        ],
      },
      {
        type: 'evade',
        text: 'Escape the SBPD response across Solana Bay',
        x: LANDMARKS.resprayGarage.x,
        z: LANDMARKS.resprayGarage.z,
      },
    ],
  },
  {
    id: 6,
    title: 'HIGH TIDE RECKONING',
    speaker: 'VICTOR CRANE',
    intro: 'You want your harbor back, Reyes? Come to Solana Marina Pier and take it from me yourself!',
    outro: 'Solana Bay belongs to the coast again. Free roam unlocked — the whole city is yours, Marco.',
    reward: 3500,
    steps: [
      {
        type: 'goto',
        text: 'Storm Solana Marina Pier at the east docks',
        x: LANDMARKS.marinaPier.x - 36,
        z: LANDMARKS.marinaPier.z,
        radius: 16,
      },
      {
        type: 'eliminate',
        text: 'Defeat Victor Crane and his dockside guards on the pier',
        x: LANDMARKS.marinaPier.x,
        z: LANDMARKS.marinaPier.z,
        triggerStars: 3,
        enemies: [
          { x: 192, z: 94, hp: 85, shirtColor: 0x9b2226 },
          { x: 204, z: 98, hp: 85, shirtColor: 0x9b2226 },
          { x: 214, z: 95, hp: 95, shirtColor: 0x9b2226 },
          { x: 226, z: 96, hp: 160, shirtColor: 0xffbe0b, damage: 11 }, // Victor Crane
        ],
      },
      {
        type: 'evade',
        text: 'Outrun the 3-star SBPD pursuit to lock down Solana Bay',
        x: LANDMARKS.resprayGarage.x,
        z: LANDMARKS.resprayGarage.z,
      },
    ],
  },
];

export function createMissionManager(scene, combat, vehicles, police, audio) {
  const state = {
    missionIndex: 0, // 0..5, >=6 means free roam complete
    stepIndex: 0,
    freeRoam: false,
    activeTargetVehicles: [],
    initializedStepKey: '',
  };

  // Tall glowing cyan-gold objective beacon column + ground ring
  const beaconGroup = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x00f5d4,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.5, 42, 16, 1, true), beamMat);
  beam.position.y = 21;
  beaconGroup.add(beam);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffbe0b,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.9, 28), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.28;
  beaconGroup.add(ring);

  scene.add(beaconGroup);

  function getCurrentMission() {
    if (state.freeRoam || state.missionIndex >= MISSION_DEFS.length) return null;
    return MISSION_DEFS[state.missionIndex];
  }

  function getCurrentStep() {
    const m = getCurrentMission();
    if (!m) return null;
    return m.steps[state.stepIndex] || null;
  }

  function clearMissionEntities() {
    combat.clearHostiles('mission');
    for (const v of state.activeTargetVehicles) {
      if (v.driver !== 'player') vehicles.removeVehicle(v);
    }
    state.activeTargetVehicles.length = 0;
  }

  function setupCurrentStep(callbacks = {}) {
    const m = getCurrentMission();
    const step = getCurrentStep();
    if (!m || !step) {
      beaconGroup.visible = false;
      return;
    }

    const key = `${m.id}:${state.stepIndex}`;
    if (state.initializedStepKey === key) return;
    state.initializedStepKey = key;

    clearMissionEntities();

    if (step.triggerStars) {
      police.setStars(Math.max(police.state.stars, step.triggerStars));
    }

    if (step.type === 'eliminate' && step.enemies) {
      for (const e of step.enemies) {
        combat.spawnHostile(e.x, e.z, {
          hp: e.hp,
          shirtColor: e.shirtColor || 0xd62828,
          damage: e.damage || 8,
          tag: 'mission',
        });
      }
    }

    if (step.type === 'destroy_vehicles' && step.targets) {
      for (const t of step.targets) {
        const v = vehicles.spawnVehicle(t.cls, t.x, t.z, t.yaw, {
          driver: 'parked',
          color: t.color,
          missionTag: 'target',
        });
        state.activeTargetVehicles.push(v);
      }
      if (step.guards) {
        for (const g of step.guards) {
          combat.spawnHostile(g.x, g.z, { hp: g.hp, tag: 'mission' });
        }
      }
    }

    if (state.stepIndex === 0 && callbacks.onDialogue) {
      callbacks.onDialogue(m.speaker, m.intro, 7.5);
    }
  }

  function startMission(index, callbacks = {}) {
    state.initializedStepKey = '';
    if (index >= MISSION_DEFS.length) {
      state.missionIndex = MISSION_DEFS.length;
      state.stepIndex = 0;
      state.freeRoam = true;
      beaconGroup.visible = false;
      clearMissionEntities();
      return;
    }
    state.missionIndex = index;
    state.stepIndex = 0;
    state.freeRoam = false;
    setupCurrentStep(callbacks);
  }

  function getObjectivePoint() {
    const step = getCurrentStep();
    if (!step) return null;

    if (step.type === 'eliminate') {
      const target = combat.hostiles.find((h) => h.alive && h.tag === 'mission');
      if (target) return { x: target.x, z: target.z };
    }
    if (step.type === 'destroy_vehicles') {
      const target = state.activeTargetVehicles.find((v) => !v.destroyed);
      if (target) return { x: target.x, z: target.z };
    }
    if (typeof step.x === 'number' && typeof step.z === 'number') {
      return { x: step.x, z: step.z };
    }
    return null;
  }

  function advanceStep(player, callbacks = {}) {
    const m = getCurrentMission();
    if (!m) return;
    if (state.stepIndex + 1 < m.steps.length) {
      state.stepIndex += 1;
      if (audio) audio.playMissionChime(false);
      setupCurrentStep(callbacks);
      if (callbacks.onToast) callbacks.onToast('Objective updated');
    } else {
      // Mission complete!
      player.state.cash += m.reward;
      player.state.stats.missionsDone = Math.max(player.state.stats.missionsDone, state.missionIndex + 1);
      if (audio) audio.playMissionChime(true);
      if (callbacks.onDialogue) callbacks.onDialogue(m.speaker, m.outro, 6.5);
      if (callbacks.onMissionComplete) callbacks.onMissionComplete(m, state.missionIndex + 1 >= MISSION_DEFS.length);
      startMission(state.missionIndex + 1, callbacks);
    }
  }

  function update(dt, elapsed, player, callbacks = {}) {
    const m = getCurrentMission();
    const step = getCurrentStep();
    if (!m || !step) {
      beaconGroup.visible = false;
      return;
    }

    setupCurrentStep(callbacks);

    const pt = getObjectivePoint();
    if (pt) {
      beaconGroup.visible = true;
      beaconGroup.position.set(pt.x, 0, pt.z);
      const pulse = 1 + Math.sin(elapsed * 4.5) * 0.14;
      ring.scale.set(pulse, pulse, 1);
      beamMat.opacity = 0.24 + Math.sin(elapsed * 3.2) * 0.08;
    } else {
      beaconGroup.visible = false;
    }

    const ps = player.state;
    if (ps.dead || ps.busted) return;

    if (step.type === 'enter_vehicle') {
      if (ps.vehicle) advanceStep(player, callbacks);
    } else if (step.type === 'goto') {
      const d = dist2D(ps.x, ps.z, step.x, step.z);
      if (d <= (step.radius || 10) && (!step.requireVehicle || ps.vehicle)) {
        advanceStep(player, callbacks);
      }
    } else if (step.type === 'eliminate') {
      const remaining = combat.hostiles.filter((h) => h.alive && h.tag === 'mission').length;
      if (remaining === 0) {
        advanceStep(player, callbacks);
      }
    } else if (step.type === 'destroy_vehicles') {
      const remaining = state.activeTargetVehicles.filter((v) => !v.destroyed).length;
      if (remaining === 0) {
        advanceStep(player, callbacks);
      }
    } else if (step.type === 'evade') {
      if (police.state.stars === 0) {
        advanceStep(player, callbacks);
      }
    }
  }

  return {
    state,
    MISSION_DEFS,
    getCurrentMission,
    getCurrentStep,
    getObjectivePoint,
    startMission,
    update,
  };
}
