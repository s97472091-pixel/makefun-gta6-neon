// Solana Bay — Six-mission story chain, original characters, dialogue, glowing 3D beacons & Free Roam
import * as THREE from 'three';
import { LANDMARKS } from './config.js';

export const MISSION_DEFS = [
  {
    id: 1,
    title: 'Hot Wheels on Miramar',
    giver: 'SORA',
    reward: 600,
    startBeacon: { x: 180, z: 60 },
    introDialogue: [
      { speaker: 'SORA', text: 'Dante! Salgado’s crew parked a custom Solara GT outside Hotel Solamar. Boost it and bring it to El Sol Customs.' },
    ],
    completeDialogue: [
      { speaker: 'SORA', text: 'Clean lines, zero dents. Welcome back to Solana Bay, Dante. Tessa needs a wheelman down at the pier next.' },
    ],
  },
  {
    id: 2,
    title: 'Pier Pressure',
    giver: 'TESSA',
    reward: 950,
    unlockWeapon: 'smg',
    startBeacon: { x: 196, z: 0 },
    introDialogue: [
      { speaker: 'TESSA', text: 'Marea Roja locked down Coral Key Marina Pier. Clear their dock guards, grab the manifest, and run it to Puerto Ferro.' },
    ],
    completeDialogue: [
      { speaker: 'TESSA', text: 'You just cost Hector half a cargo ship. Take this Viper SMG from my crate — Vince wants to see you.' },
    ],
  },
  {
    id: 3,
    title: 'Neon Shakedown',
    giver: 'VINCE',
    reward: 1300,
    startBeacon: { x: 120, z: 120 },
    introDialogue: [
      { speaker: 'VINCE', text: 'Three syndicate cash drops are sitting unguarded-ish across Calle Verde and Miramar. Smash all three and shake SBPD.' },
    ],
    completeDialogue: [
      { speaker: 'VINCE', text: 'Hector is foaming at the mouth right now. Sora spotted one of his armored cargo vans rolling through Alba Financial.' },
    ],
  },
  {
    id: 4,
    title: 'Armored Intercept',
    giver: 'SORA',
    reward: 1600,
    unlockWeapon: 'shotgun',
    startBeacon: { x: 60, z: -60 },
    introDialogue: [
      { speaker: 'SORA', text: 'A Marea Roja Brutus Cargo van is staged in Alba Financial. Hijack it and stash the hardware at Puerto Ferro Depot.' },
    ],
    completeDialogue: [
      { speaker: 'SORA', text: 'Jackpot — military hardware and a Breacher 12G with your name on it. One more push and Alba is wide open.' },
    ],
  },
  {
    id: 5,
    title: 'High-Rise Ambush',
    giver: 'VINCE',
    reward: 2200,
    startBeacon: { x: 120, z: -60 },
    introDialogue: [
      { speaker: 'VINCE', text: 'Salgado’s lieutenants are meeting in Alba Sky Plaza. Wipe the courtyard, then burn rubber to El Sol Customs before SBPD boxes you in!' },
    ],
    completeDialogue: [
      { speaker: 'SORA', text: 'Fresh paint, cold plates. Hector ran straight to Coral Key Marina to bolt on his yacht. Finish this, Dante.' },
    ],
  },
  {
    id: 6,
    title: 'Crown of Solana Bay',
    giver: 'TESSA',
    reward: 4500,
    startBeacon: { x: 202, z: 0 },
    introDialogue: [
      { speaker: 'TESSA', text: 'Hector Salgado is cornered at the end of Coral Key Marina Pier! Take him down, grab the syndicate ledger, and escape to Miramar Terrace.' },
    ],
    completeDialogue: [
      { speaker: 'SORA', text: 'Salgado is history, the sirens are fading, and the whole coast knows your name. Solana Bay is yours, Dante!' },
    ],
  },
];

export function createMissionManager(scene, city, vehicleMgr, combatSys, policeSys, effects, audio) {
  // Glowing 3D objective beacon (vertical translucent beam + spinning floor ring)
  const beaconGroup = new THREE.Group();
  const beamGeo = new THREE.CylinderGeometry(1.1, 2.2, 34, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = 17;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 3.2, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.28;
  beaconGroup.add(beam, ring);
  beaconGroup.visible = false;
  scene.add(beaconGroup);

  const state = {
    currentIndex: 0, // 0..5 = story missions, >=6 = free roam
    active: false,
    stage: 0,
    objectiveText: 'Head to the golden beacon to start Mission 1',
    objectiveTarget: null, // { x, z, color }
    missionVehicle: null,
    subTargets: [],
    completedCount: 0,
    freeRoam: false,
  };

  function setBeacon(x, z, colorHex = 0xffd166) {
    if (x == null || z == null) {
      beaconGroup.visible = false;
      state.objectiveTarget = null;
      return;
    }
    const gy = city.getGroundHeight(x, z);
    beaconGroup.position.set(x, gy, z);
    beamMat.color.setHex(colorHex);
    ring.material.color.setHex(colorHex);
    beaconGroup.visible = true;
    state.objectiveTarget = { x, z, color: `#${colorHex.toString(16).padStart(6, '0')}` };
  }

  function setupWaitingForMission() {
    combatSys.clearMissionEnemies('mission');
    state.active = false;
    state.stage = 0;
    state.missionVehicle = null;
    state.subTargets = [];

    if (state.currentIndex >= MISSION_DEFS.length) {
      state.freeRoam = true;
      state.objectiveText = 'Free Roam — Own Solana Bay';
      setBeacon(null, null);
      return;
    }
    const def = MISSION_DEFS[state.currentIndex];
    state.objectiveText = `Mission ${def.id}: Meet ${def.giver} (${def.title})`;
    setBeacon(def.startBeacon.x, def.startBeacon.z, 0xffd166);
  }

  function startCurrentMission(playerCtrl, hud) {
    if (state.currentIndex >= MISSION_DEFS.length) return;
    const def = MISSION_DEFS[state.currentIndex];
    state.active = true;
    state.stage = 0;
    combatSys.clearMissionEnemies('mission');

    if (audio) audio.playMissionChime('start');
    if (hud) {
      hud.showToast(`MISSION ${def.id}: ${def.title.toUpperCase()}`, 'gold');
      const line = def.introDialogue[0];
      if (line) hud.showDialogue(line.speaker, line.text, 7.5);
    }

    if (def.id === 1) {
      // Spawn target Solara GT at Hotel Solamar forecourt road & 2 guards
      const targetCar = vehicleMgr.spawnVehicle('sports', 176.2, 46, Math.PI, {
        color: '#ff3b6b',
        missionTag: 'mission',
      });
      state.missionVehicle = targetCar;
      combatSys.spawnGangMember(172, 43, { missionTag: 'mission', hp: 50 });
      combatSys.spawnGangMember(172, 50, { missionTag: 'mission', hp: 50 });
      state.objectiveText = 'Steal the crimson Solara GT outside Hotel Solamar';
      setBeacon(targetCar.pos.x, targetCar.pos.z, 0x38e8ff);
    } else if (def.id === 2) {
      // Spawn 4 Marea Roja dock guards along Coral Key Marina Pier
      combatSys.spawnGangMember(228, -5, { missionTag: 'mission', hp: 60 });
      combatSys.spawnGangMember(238, 5, { missionTag: 'mission', hp: 60 });
      combatSys.spawnGangMember(252, -4, { missionTag: 'mission', hp: 65 });
      combatSys.spawnGangMember(264, 3, { missionTag: 'mission', hp: 70 });
      state.objectiveText = 'Clear the 4 Marea Roja guards on Coral Key Marina Pier';
      setBeacon(248, 0, 0xff4d6d);
    } else if (def.id === 3) {
      // 3 syndicate drop points across Calle Verde & Miramar
      state.subTargets = [
        { x: -60, z: 120, done: false },
        { x: 60, z: 120, done: false },
        { x: 120, z: 60, done: false },
      ];
      for (const pt of state.subTargets) {
        combatSys.spawnGangMember(pt.x - 5, pt.z + 4, { missionTag: 'mission', hp: 60 });
        combatSys.spawnGangMember(pt.x + 5, pt.z - 4, { missionTag: 'mission', hp: 60 });
      }
      state.objectiveText = 'Hit Marea Roja drop-box (1 / 3)';
      setBeacon(state.subTargets[0].x, state.subTargets[0].z, 0xff5e9c);
    } else if (def.id === 4) {
      // Spawn armored Brutus Cargo van in Alba Financial + 3 guards
      const van = vehicleMgr.spawnVehicle('van', 60, -96, 0, {
        color: '#2c3e50',
        missionTag: 'mission',
      });
      van.maxHp = 380;
      van.hp = 380;
      state.missionVehicle = van;
      combatSys.spawnGangMember(55, -92, { missionTag: 'mission', hp: 65 });
      combatSys.spawnGangMember(65, -92, { missionTag: 'mission', hp: 65 });
      combatSys.spawnGangMember(60, -104, { missionTag: 'mission', hp: 75 });
      state.objectiveText = 'Hijack the Marea Roja Brutus Cargo van in Alba Financial';
      setBeacon(van.pos.x, van.pos.z, 0x38e8ff);
    } else if (def.id === 5) {
      // Spawn 6 enforcers in Alba Sky Plaza open courtyard
      const pts = [
        [98, -76], [104, -84], [92, -72], [106, -96], [82, -72], [102, -70],
      ];
      for (const [gx, gz] of pts) {
        combatSys.spawnGangMember(gx, gz, { missionTag: 'mission', hp: 70 });
      }
      state.objectiveText = 'Eliminate Marea Roja enforcers at Alba Sky Plaza (6 left)';
      setBeacon(98, -78, 0xff4d6d);
    } else if (def.id === 6) {
      // Final Showdown: Hector Salgado (Boss) + 4 bodyguards at Coral Key Marina Pier!
      combatSys.spawnGangMember(266, 0, {
        missionTag: 'mission',
        isBoss: true,
        name: 'Hector Salgado',
        hp: 250,
      });
      combatSys.spawnGangMember(242, -6, { missionTag: 'mission', hp: 80 });
      combatSys.spawnGangMember(242, 6, { missionTag: 'mission', hp: 80 });
      combatSys.spawnGangMember(256, -5, { missionTag: 'mission', hp: 85 });
      combatSys.spawnGangMember(256, 5, { missionTag: 'mission', hp: 85 });
      state.objectiveText = 'Take down Hector Salgado & his guards on Coral Key Marina Pier';
      setBeacon(262, 0, 0xff4d6d);
    }
  }

  function completeCurrentMission(playerCtrl, hud, callbacks) {
    const def = MISSION_DEFS[state.currentIndex];
    const player = playerCtrl.player;
    playerCtrl.addCash(def.reward);
    playerCtrl.heal(45, 35);
    player.stats.missionsCompleted = Math.max(player.stats.missionsCompleted, def.id);
    state.completedCount = Math.max(state.completedCount, def.id);

    if (def.unlockWeapon) {
      playerCtrl.unlockWeapon(def.unlockWeapon);
      if (hud) hud.showToast(`WEAPON UNLOCKED: ${def.unlockWeapon.toUpperCase()}`, 'cyan');
    }

    if (audio) audio.playMissionChime('complete');
    if (hud) {
      hud.showToast(`MISSION COMPLETE! +$${def.reward}`, 'gold');
      const line = def.completeDialogue[0];
      if (line) hud.showDialogue(line.speaker, line.text, 7.5);
    }

    state.currentIndex += 1;
    state.active = false;
    state.missionVehicle = null;
    combatSys.clearMissionEnemies('mission');

    const storyFinished = state.currentIndex >= MISSION_DEFS.length;
    setupWaitingForMission();
    if (callbacks.onMissionComplete) callbacks.onMissionComplete(def, storyFinished);
  }

  function failMission(reason, hud) {
    if (!state.active) return;
    if (audio) audio.playMissionChime('fail');
    if (hud) hud.showToast(`MISSION FAILED: ${reason}`, 'red');
    combatSys.clearMissionEnemies('mission');
    if (state.missionVehicle) {
      vehicleMgr.removeVehicle(state.missionVehicle);
      state.missionVehicle = null;
    }
    setupWaitingForMission();
  }

  function countAliveMissionEnemies() {
    let n = 0;
    for (const g of combatSys.gangMembers) {
      if (g.alive && g.missionTag === 'mission') n++;
    }
    return n;
  }

  function update(dt, time, playerCtrl, hud, callbacks = {}) {
    // Animate beacon
    if (beaconGroup.visible) {
      ring.rotation.z = time * 1.4;
      const pulse = 1 + Math.sin(time * 4) * 0.08;
      ring.scale.set(pulse, pulse, 1);
      beamMat.opacity = 0.2 + Math.sin(time * 3.2) * 0.06;
    }

    const player = playerCtrl.player;
    if (player.dead || player.busted) return;

    if (!state.active) {
      if (state.currentIndex < MISSION_DEFS.length) {
        const def = MISSION_DEFS[state.currentIndex];
        const dist = Math.hypot(player.pos.x - def.startBeacon.x, player.pos.z - def.startBeacon.z);
        if (dist < 6.2) {
          startCurrentMission(playerCtrl, hud);
        }
      }
      return;
    }

    const def = MISSION_DEFS[state.currentIndex];
    if (!def) return;

    // Mission-specific objective progression
    if (def.id === 1) {
      const car = state.missionVehicle;
      if (!car || car.destroyed) {
        failMission('The Solara GT was wrecked!', hud);
        return;
      }
      if (state.stage === 0) {
        setBeacon(car.pos.x, car.pos.z, 0x38e8ff);
        if (player.vehicle === car) {
          state.stage = 1;
          policeSys.addHeat(24, player, 1);
          state.objectiveText = 'Deliver the Solara GT to El Sol Customs (Calle Verde)';
          setBeacon(LANDMARKS.garage.x, LANDMARKS.garage.z, 0x2ce6d2);
          if (hud) hud.showDialogue('SORA', 'Nice grab! Cops spotted the boost — bring it to my bay in Calle Verde.', 6);
        }
      } else if (state.stage === 1) {
        if (player.vehicle !== car) {
          state.objectiveText = 'Get back in the Solara GT!';
          setBeacon(car.pos.x, car.pos.z, 0x38e8ff);
        } else {
          state.objectiveText = 'Deliver the Solara GT to El Sol Customs';
          setBeacon(LANDMARKS.garage.x, LANDMARKS.garage.z, 0x2ce6d2);
          const d = Math.hypot(car.pos.x - LANDMARKS.garage.x, car.pos.z - LANDMARKS.garage.z);
          if (d < 9.5) {
            vehicleMgr.repaintAndRepair(car, '#00d2d3');
            policeSys.clearWanted();
            completeCurrentMission(playerCtrl, hud, callbacks);
          }
        }
      }
    } else if (def.id === 2) {
      if (state.stage === 0) {
        const alive = countAliveMissionEnemies();
        state.objectiveText = `Clear Marea Roja pier guards (${alive} left)`;
        if (alive === 0) {
          state.stage = 1;
          effects.spawnPickup('health', 258, 0, 40);
          state.objectiveText = 'Deliver the manifest to Puerto Ferro Depot';
          setBeacon(-120, -120, 0xffd166);
          if (hud) hud.showDialogue('TESSA', 'Manifest secured! Get it back to Puerto Ferro Depot fast.', 6);
        }
      } else if (state.stage === 1) {
        const d = Math.hypot(player.pos.x - (-120), player.pos.z - (-120));
        if (d < 9.5) {
          completeCurrentMission(playerCtrl, hud, callbacks);
        }
      }
    } else if (def.id === 3) {
      if (state.stage < 3) {
        const cur = state.subTargets[state.stage];
        setBeacon(cur.x, cur.z, 0xff5e9c);
        state.objectiveText = `Hit Marea Roja drop-box (${state.stage + 1} / 3)`;
        if (Math.hypot(player.pos.x - cur.x, player.pos.z - cur.z) < 7.5) {
          cur.done = true;
          effects.spawnExplosion(cur.x, 1.0, cur.z, 0.8);
          if (audio) audio.playExplosion(0.6);
          playerCtrl.addCash(150);
          state.stage += 1;
          if (state.stage >= 3) {
            policeSys.addHeat(65, player, 2);
            state.objectiveText = 'Lose the 2-star SBPD heat (evade or respray at El Sol Customs)';
            setBeacon(LANDMARKS.garage.x, LANDMARKS.garage.z, 0x2ce6d2);
            if (hud) hud.showDialogue('VINCE', 'All three drops torched! SBPD is swarming — ditch them or hit El Sol Customs!', 6.5);
          } else if (hud) {
            hud.showToast(`DROP-BOX ${state.stage} / 3 DESTROYED! +$150`, 'gold');
          }
        }
      } else if (state.stage === 3) {
        if (policeSys.state.stars === 0) {
          completeCurrentMission(playerCtrl, hud, callbacks);
        }
      }
    } else if (def.id === 4) {
      const van = state.missionVehicle;
      if (!van || van.destroyed) {
        failMission('The Brutus Cargo van was destroyed!', hud);
        return;
      }
      if (state.stage === 0) {
        setBeacon(van.pos.x, van.pos.z, 0x38e8ff);
        if (player.vehicle === van) {
          state.stage = 1;
          policeSys.addHeat(60, player, 2);
          state.objectiveText = 'Deliver the Brutus Cargo van to Puerto Ferro Depot';
          setBeacon(-120, -120, 0xffd166);
          if (hud) hud.showDialogue('SORA', 'Heavy steel, slow turns — watch out for cruisers on your tail!', 6);
        }
      } else if (state.stage === 1) {
        if (player.vehicle !== van) {
          state.objectiveText = 'Get back in the Brutus Cargo van!';
          setBeacon(van.pos.x, van.pos.z, 0x38e8ff);
        } else {
          state.objectiveText = 'Deliver the Brutus Cargo van to Puerto Ferro Depot';
          setBeacon(-120, -120, 0xffd166);
          if (Math.hypot(van.pos.x - (-120), van.pos.z - (-120)) < 10.5) {
            policeSys.clearWanted();
            completeCurrentMission(playerCtrl, hud, callbacks);
          }
        }
      }
    } else if (def.id === 5) {
      if (state.stage === 0) {
        const alive = countAliveMissionEnemies();
        state.objectiveText = `Eliminate Alba Sky Plaza enforcers (${alive} left)`;
        if (alive === 0) {
          state.stage = 1;
          policeSys.addHeat(120, player, 3);
          state.objectiveText = 'Escape 3-star SBPD — Reach El Sol Customs for a free respray!';
          setBeacon(LANDMARKS.garage.x, LANDMARKS.garage.z, 0x2ce6d2);
          if (hud) hud.showDialogue('VINCE', 'Plaza cleared, but choppers and interceptors are closing in! Get to El Sol Customs!', 6.5);
        }
      } else if (state.stage === 1) {
        const d = Math.hypot(player.pos.x - LANDMARKS.garage.x, player.pos.z - LANDMARKS.garage.z);
        if (d < 9.5 || policeSys.state.stars === 0) {
          if (player.vehicle) vehicleMgr.repaintAndRepair(player.vehicle);
          policeSys.clearWanted();
          completeCurrentMission(playerCtrl, hud, callbacks);
        }
      }
    } else if (def.id === 6) {
      if (state.stage === 0) {
        const alive = countAliveMissionEnemies();
        state.objectiveText = `Defeat Hector Salgado & his pier guards (${alive} left)`;
        if (alive === 0) {
          state.stage = 1;
          policeSys.addHeat(195, player, 4);
          state.objectiveText = '4-Star Escape! Reach Miramar Terrace with the Syndicate Ledger';
          setBeacon(LANDMARKS.penthouse.x, LANDMARKS.penthouse.z, 0xff5e9c);
          if (hud) hud.showDialogue('TESSA', 'Salgado is down! Grab the ledger and get to Miramar Terrace — every cruiser in the Bay is rolling!', 7);
        }
      } else if (state.stage === 1) {
        const d = Math.hypot(player.pos.x - LANDMARKS.penthouse.x, player.pos.z - LANDMARKS.penthouse.z);
        if (d < 10.5) {
          policeSys.clearWanted();
          completeCurrentMission(playerCtrl, hud, callbacks);
        }
      }
    }
  }

  function loadProgress(missionIndex) {
    state.currentIndex = Math.max(0, Math.min(MISSION_DEFS.length, missionIndex || 0));
    state.completedCount = state.currentIndex;
    setupWaitingForMission();
  }

  setupWaitingForMission();

  return {
    state,
    MISSION_DEFS,
    setupWaitingForMission,
    startCurrentMission,
    failMission,
    loadProgress,
    update,
  };
}
