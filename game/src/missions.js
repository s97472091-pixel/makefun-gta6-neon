// Story campaign: 6 handcrafted missions across Solana Bay with glowing 3D markers, dialogue & progression.
import * as THREE from 'three';
import { LANDMARKS } from './config.js';

export const MISSION_DEFS = [
  {
    id: 'm1_hot_wheels',
    title: 'HOT WHEELS ON MIRAMAR',
    contact: 'RICO VEGA',
    reward: 600,
    startPos: { x: 222, z: -26 },
    intro: 'Mateo! Vipers repo-man parked a ruby Solara GT up by Hotel Miramar. Boost it and bring it to Coral Garage.',
    outro: 'Clean boost! Keep the cash — come see me at Coral Garage when you want real money.',
  },
  {
    id: 'm2_dock_sweep',
    title: 'VIPER DOCK SWEEP',
    contact: 'ELENA CRUZ',
    reward: 950,
    startPos: { x: LANDMARKS.coralGarage.entryX, z: LANDMARKS.coralGarage.entryZ },
    intro: 'Los Vipers hijacked my courier crates at Puerto Verde Docks. Take this Viper SMG, clear the yard, and grab the manifest.',
    outro: 'Docks are ours again. Sunset Armory just stocked the Riptide Shotgun for you.',
  },
  {
    id: 'm3_neon_sprint',
    title: 'SUNSET STRIP SPRINT',
    contact: 'RICO VEGA',
    reward: 1100,
    startPos: { x: LANDMARKS.palmaPlaza.entryX, z: LANDMARKS.palmaPlaza.entryZ },
    intro: 'High-rollers are betting on a street run from Palma Plaza to Miramar Beach and down to Solana Pier. Hit every checkpoint fast!',
    outro: 'Unstoppable behind the wheel. Word is spreading all over Palma Centro.',
  },
  {
    id: 'm4_armored_drop',
    title: 'THE MARINA STASH',
    contact: 'ELENA CRUZ',
    reward: 1400,
    startPos: { x: LANDMARKS.sunsetArmory.entryX, z: LANDMARKS.sunsetArmory.entryZ },
    intro: 'Cartel runners left a cartel Sierra SUV loaded with cash near Solana Marina Pier. Expect armed guards and SBPD heat.',
    outro: 'You shook the sirens and delivered the goods. One more step before we hit the top.',
  },
  {
    id: 'm5_hotel_takedown',
    title: 'MIRAMAR TAKEDOWN',
    contact: 'RICO VEGA',
    reward: 1800,
    startPos: { x: LANDMARKS.coralGarage.entryX, z: LANDMARKS.coralGarage.entryZ },
    intro: 'Viper lieutenants are meeting outside Hotel Miramar. Neutralize their crew and clear the strip!',
    outro: 'The strip belongs to us now. Meet me at Palma Plaza for the big score — Solana Vault.',
  },
  {
    id: 'm6_solana_heist',
    title: 'THE SOLANA BAY SCORE',
    contact: 'ELENA CRUZ',
    reward: 4000,
    startPos: { x: LANDMARKS.palmaPlaza.entryX, z: LANDMARKS.palmaPlaza.entryZ },
    intro: 'This is it, Mateo. Hit the Syndicate vault convoy in Palma Centro, escape a 4-star SBPD dragnet, and reach Coral Garage!',
    outro: 'We did it! Solana Bay is officially yours. Keep cruising the city anytime in Free Roam.',
  },
];

export function createMissionManager(scene, vehicleMgr, combatMgr, policeMgr, fx, audio, hud) {
  let missionIndex = 0; // Next story mission index (0..6)
  let active = null;    // { def, step, targetPos, missionCar, checkpoints, timer }

  // Glowing golden 3D vertical beacon ring for active objectives / mission starters
  const markerGroup = new THREE.Group();
  const ringMesh = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.22, 10, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd166 })
  );
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.position.y = 0.45;

  const beamMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 2.3, 18, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
  );
  beamMesh.position.y = 9.2;
  markerGroup.add(ringMesh, beamMesh);
  scene.add(markerGroup);

  function setMarker(pos, colorHex = 0xffd166) {
    if (!pos) {
      markerGroup.visible = false;
      return;
    }
    markerGroup.visible = true;
    markerGroup.position.set(pos.x, 0.1, pos.z);
    ringMesh.material.color.setHex(colorHex);
    beamMesh.material.color.setHex(colorHex);
  }

  function startMission(idx, player) {
    const def = MISSION_DEFS[idx];
    if (!def) return;
    combatMgr.clearEnemies();

    active = {
      def,
      step: 0,
      targetPos: null,
      missionCar: null,
      checkpoints: [],
      cpIndex: 0,
    };

    hud.toast(`MISSION STARTED: ${def.title}`, 3.5);
    hud.showDialogue(def.contact, def.intro, 8.0);

    if (def.id === 'm1_hot_wheels') {
      const car = vehicleMgr.spawnVehicle('solara', 222 + 4.2, -112, Math.PI, {
        color: 0xff2e63,
        parked: true,
        isMissionCar: true,
        despawnable: false,
      });
      active.missionCar = car;
      active.targetPos = { x: car.x, z: car.z };
    } else if (def.id === 'm2_dock_sweep') {
      player.unlockWeapon('smg', 160);
      hud.toast('UNLOCKED: VIPER SMG (KEY 3)');
      const spots = [
        [100, 170], [116, 174], [126, 186], [105, 194], [118, 198],
      ];
      for (const [ex, ez] of spots) combatMgr.spawnEnemy(ex, ez, { hp: 70, weapon: 'pistol' });
      active.targetPos = { x: 112, z: 184 };
    } else if (def.id === 'm3_neon_sprint') {
      active.checkpoints = [
        { x: 148, z: -74 },
        { x: 222, z: -74 },
        { x: 222, z: 0 },
        { x: 292, z: 0 },
        { x: 222, z: 74 },
        { x: 148, z: 74 },
      ];
      active.cpIndex = 0;
      active.targetPos = active.checkpoints[0];
    } else if (def.id === 'm4_armored_drop') {
      player.unlockWeapon('shotgun', 24);
      const suv = vehicleMgr.spawnVehicle('sierra', 222 + 4.2, 6, Math.PI, {
        color: 0x1b2234,
        parked: true,
        isMissionCar: true,
        despawnable: false,
      });
      active.missionCar = suv;
      combatMgr.spawnEnemy(228, 12, { hp: 85, weapon: 'smg' });
      combatMgr.spawnEnemy(228, -4, { hp: 85, weapon: 'pistol' });
      combatMgr.spawnEnemy(216, 10, { hp: 85, weapon: 'pistol' });
      active.targetPos = { x: suv.x, z: suv.z };
    } else if (def.id === 'm5_hotel_takedown') {
      const spots = [
        [208, -118], [214, -104], [228, -110], [204, -96], [220, -126], [228, -98],
      ];
      for (const [ex, ez] of spots) combatMgr.spawnEnemy(ex, ez, { hp: 90, weapon: 'smg' });
      active.targetPos = { x: 218, z: -111 };
    } else if (def.id === 'm6_solana_heist') {
      const vaultCar = vehicleMgr.spawnVehicle('marlin', 74, -74, 0, {
        color: 0xffd166,
        parked: true,
        isMissionCar: true,
        despawnable: false,
      });
      active.missionCar = vaultCar;
      const guards = [[68, -68], [80, -68], [68, -80], [80, -80], [74, -62]];
      for (const [ex, ez] of guards) combatMgr.spawnEnemy(ex, ez, { hp: 100, weapon: 'smg' });
      active.targetPos = { x: vaultCar.x, z: vaultCar.z };
    }
  }

  function completeMission(player, onAllComplete) {
    const def = active.def;
    player.addCash(def.reward);
    player.state.stats.missionsCompleted = Math.max(player.state.stats.missionsCompleted, missionIndex + 1);
    audio.playMissionComplete();
    hud.toast(`MISSION PASSED! +$${def.reward.toLocaleString()}`, 4.0);
    hud.showDialogue(def.contact, def.outro, 7.5);
    combatMgr.clearEnemies();
    active = null;
    missionIndex++;
    if (missionIndex >= MISSION_DEFS.length) {
      onAllComplete?.();
    }
  }

  function failMission(reason) {
    if (!active) return;
    hud.toast(`MISSION FAILED: ${reason}`, 3.5);
    combatMgr.clearEnemies();
    active = null;
  }

  function update(dt, time, player, onAllComplete) {
    const p = player.state;
    ringMesh.rotation.z = time * 1.8;
    const pulse = 1 + Math.sin(time * 4) * 0.08;
    ringMesh.scale.set(pulse, pulse, 1);

    // Waiting for player to step into next story mission beacon
    if (!active) {
      if (missionIndex < MISSION_DEFS.length) {
        const nextDef = MISSION_DEFS[missionIndex];
        setMarker(nextDef.startPos, 0xffd166);
        const d = Math.hypot(p.x - nextDef.startPos.x, p.z - nextDef.startPos.z);
        if (d < 4.5 && !p.dead) {
          startMission(missionIndex, player);
        }
      } else {
        setMarker(null);
      }
      return;
    }

    const def = active.def;
    const aliveEnemies = combatMgr.enemies.filter((e) => !e.dead);

    if (active.missionCar && active.missionCar.destroyed) {
      failMission('TARGET VEHICLE DESTROYED');
      return;
    }

    if (def.id === 'm1_hot_wheels') {
      if (active.step === 0) {
        active.targetPos = { x: active.missionCar.x, z: active.missionCar.z };
        setMarker(active.targetPos, 0x2ee6d6);
        if (p.vehicle === active.missionCar) {
          active.step = 1;
          policeMgr.addHeat(90, 1, audio, hud);
          hud.showDialogue('RICO', 'Alarm tripped! Get that Solara GT to Coral Garage before SBPD boxes you in!');
        }
      } else {
        const drop = { x: LANDMARKS.coralGarage.entryX, z: LANDMARKS.coralGarage.entryZ };
        active.targetPos = drop;
        setMarker(drop, 0xffd166);
        if (p.vehicle === active.missionCar && Math.hypot(p.x - drop.x, p.z - drop.z) < 7.5) {
          policeMgr.clearWanted(hud, 'CLEAN RESPRAY — HEAT CLEARED');
          completeMission(player, onAllComplete);
        }
      }
    } else if (def.id === 'm2_dock_sweep') {
      if (aliveEnemies.length > 0) {
        active.targetPos = { x: aliveEnemies[0].x, z: aliveEnemies[0].z };
        setMarker(active.targetPos, 0xff5e7e);
      } else {
        const drop = { x: LANDMARKS.puertoDocks.entryX, z: LANDMARKS.puertoDocks.entryZ };
        active.targetPos = drop;
        setMarker(drop, 0xffd166);
        if (Math.hypot(p.x - drop.x, p.z - drop.z) < 5.5) {
          completeMission(player, onAllComplete);
        }
      }
    } else if (def.id === 'm3_neon_sprint') {
      const cp = active.checkpoints[active.cpIndex];
      active.targetPos = cp;
      setMarker(cp, 0x2ee6d6);
      if (Math.hypot(p.x - cp.x, p.z - cp.z) < 9.5) {
        audio.playPickup();
        active.cpIndex++;
        if (active.cpIndex >= active.checkpoints.length) {
          completeMission(player, onAllComplete);
        } else {
          hud.toast(`CHECKPOINT ${active.cpIndex} / ${active.checkpoints.length}`);
        }
      }
    } else if (def.id === 'm4_armored_drop') {
      if (active.step === 0) {
        active.targetPos = { x: active.missionCar.x, z: active.missionCar.z };
        setMarker(active.targetPos, 0x2ee6d6);
        if (p.vehicle === active.missionCar) {
          active.step = 1;
          policeMgr.addHeat(170, 2, audio, hud);
          hud.showDialogue('ELENA', 'SBPD spotted the SUV! Floor it back to Coral Garage!');
        }
      } else {
        const drop = { x: LANDMARKS.coralGarage.entryX, z: LANDMARKS.coralGarage.entryZ };
        active.targetPos = drop;
        setMarker(drop, 0xffd166);
        if (p.vehicle === active.missionCar && Math.hypot(p.x - drop.x, p.z - drop.z) < 8) {
          policeMgr.clearWanted(hud);
          completeMission(player, onAllComplete);
        }
      }
    } else if (def.id === 'm5_hotel_takedown') {
      if (aliveEnemies.length > 0) {
        active.targetPos = { x: aliveEnemies[0].x, z: aliveEnemies[0].z };
        setMarker(active.targetPos, 0xff5e7e);
      } else {
        completeMission(player, onAllComplete);
      }
    } else if (def.id === 'm6_solana_heist') {
      if (active.step === 0) {
        active.targetPos = { x: active.missionCar.x, z: active.missionCar.z };
        setMarker(active.targetPos, 0xffd166);
        if (p.vehicle === active.missionCar) {
          active.step = 1;
          policeMgr.addHeat(330, 4, audio, hud);
          hud.showDialogue('ELENA', 'Vault gold is in the trunk! 4-star lockdown — lose the heat or punch straight into Coral Garage!');
        }
      } else {
        const drop = { x: LANDMARKS.coralGarage.entryX, z: LANDMARKS.coralGarage.entryZ };
        active.targetPos = drop;
        setMarker(drop, 0x2ee6d6);
        if (p.vehicle === active.missionCar && Math.hypot(p.x - drop.x, p.z - drop.z) < 8.5) {
          policeMgr.clearWanted(hud, 'ALL UNITS STAND DOWN — SOLANA BAY IS YOURS');
          completeMission(player, onAllComplete);
        }
      }
    }
  }

  function getHudInfo() {
    if (!active) {
      if (missionIndex < MISSION_DEFS.length) {
        const next = MISSION_DEFS[missionIndex];
        return {
          tag: `STORY ${missionIndex + 1}/6`,
          text: `Meet ${next.contact} — ${next.title}`,
          pos: next.startPos,
        };
      }
      return {
        tag: 'FREE ROAM',
        text: 'Kingpin of Solana Bay — Cruise, stunt jump, or cause chaos',
        pos: null,
      };
    }

    const def = active.def;
    const alive = combatMgr.enemies.filter((e) => !e.dead).length;
    let text = def.title;
    if (def.id === 'm1_hot_wheels') {
      text = active.step === 0 ? 'Steal the ruby Solara GT at Hotel Miramar' : 'Deliver the Solara GT to Coral Garage';
    } else if (def.id === 'm2_dock_sweep') {
      text = alive > 0 ? `Eliminate Viper gang at Puerto Docks (${alive} left)` : 'Collect the courier manifest at the docks';
    } else if (def.id === 'm3_neon_sprint') {
      text = `Hit Sunset Strip checkpoints (${active.cpIndex}/${active.checkpoints.length})`;
    } else if (def.id === 'm4_armored_drop') {
      text = active.step === 0 ? 'Steal the cartel Sierra SUV at Marina Pier' : 'Deliver the SUV to Coral Garage';
    } else if (def.id === 'm5_hotel_takedown') {
      text = `Take down Viper lieutenants at Hotel Miramar (${alive} left)`;
    } else if (def.id === 'm6_solana_heist') {
      text = active.step === 0 ? 'Hijack the gold Marlin V8 in Palma Centro' : 'Escape SBPD & deliver the gold to Coral Garage';
    }
    return { tag: def.title, text, pos: active.targetPos };
  }

  function setMissionIndex(idx) {
    missionIndex = Math.max(0, Math.min(MISSION_DEFS.length, idx));
    active = null;
  }

  function getMissionIndex() {
    return missionIndex;
  }

  return {
    update,
    getHudInfo,
    failMission,
    setMissionIndex,
    getMissionIndex,
  };
}
