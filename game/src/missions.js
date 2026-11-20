// Solana Bay — Mission Manager, Stage Beacons & Completion Ratings
import * as THREE from 'three';
import { STORY_MISSIONS, computeMissionRating, getMissionById } from './story.js';

export function createMissionSystem(scene) {
  // Glowing golden vertical beacon ring for active mission stage
  const beaconGroup = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.6, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.32;
  beaconGroup.add(ring);

  const pillarMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 24, 16, 1, true), pillarMat);
  pillar.position.y = 12.2;
  beaconGroup.add(pillar);
  beaconGroup.visible = false;
  scene.add(beaconGroup);

  const state = {
    activeMissionId: 1,
    stageIndex: 0, // 0-based index into mission.stages
    completedIds: [],
    ratings: {}, // missionId -> 'G' | 'S' | 'B'
    freeRoam: false,
    stageKills: 0,
    stageTargetKills: 0,
    stageTargetVehicle: null,
    missionElapsed: 0,
    activeDialogue: null, // { speaker, crewId, text, timer }
  };

  function getActiveMission() {
    if (state.freeRoam || !state.activeMissionId) return null;
    return getMissionById(state.activeMissionId);
  }

  function getActiveStage() {
    const m = getActiveMission();
    if (!m) return null;
    return m.stages[state.stageIndex] || null;
  }

  function showDialogue(speaker, crewId, text, duration = 6.5) {
    state.activeDialogue = { speaker, crewId, text, timer: duration };
  }

  function setupStageEntities(stage, ctx) {
    state.stageKills = 0;
    state.stageTargetKills = stage.killCount || 0;
    state.stageTargetVehicle = null;

    if (ctx.combat) ctx.combat.clearMissionHostiles('mission');

    if (stage.type === 'kill' && stage.spawns && ctx.combat) {
      for (const sp of stage.spawns) {
        ctx.combat.spawnHostile({
          x: sp.x,
          z: sp.z,
          missionTag: 'mission',
          hp: 65,
        });
      }
    }

    if (stage.type === 'steal' && ctx.vehicles) {
      const targetCar = ctx.vehicles.spawnVehicle({
        classId: stage.vehicleClass || 'sports',
        x: stage.target.x,
        z: stage.target.z,
        yaw: Math.PI * 0.5,
        color: 0xff3b4e,
        role: 'mission',
      });
      state.stageTargetVehicle = targetCar;
    }

    if (stage.wantedGain && ctx.police && !ctx.skipWanted) {
      if (ctx.police.state.stars < stage.wantedGain) {
        ctx.police.setWantedStars(stage.wantedGain);
        if (ctx.dispatch) ctx.dispatch.recordCrime('shots', 'Solana Bay');
      }
    }

    if (stage.target) {
      beaconGroup.position.set(stage.target.x, 0, stage.target.z);
      beaconGroup.visible = true;
    } else {
      beaconGroup.visible = false;
    }

    if (stage.dialogue) {
      showDialogue(stage.dialogue.speaker, stage.dialogue.crewId, stage.dialogue.text, 7.5);
    }
  }

  function startMission(missionId, ctx = {}) {
    const m = getMissionById(missionId);
    if (!m) {
      state.freeRoam = true;
      state.activeMissionId = null;
      beaconGroup.visible = false;
      return;
    }
    state.freeRoam = false;
    state.activeMissionId = m.id;
    state.stageIndex = 0;
    state.missionElapsed = 0;
    if (ctx.player) ctx.player.state.damageTakenThisMission = 0;
    setupStageEntities(m.stages[0], ctx);
  }

  function setExactStage(missionId, oneBasedStage, ctx = {}) {
    const m = getMissionById(missionId);
    if (!m) return;
    state.freeRoam = false;
    state.activeMissionId = m.id;
    state.stageIndex = Math.max(0, Math.min(m.stages.length - 1, oneBasedStage - 1));
    setupStageEntities(m.stages[state.stageIndex], { ...ctx, skipWanted: true });
  }

  function advanceStage(ctx = {}) {
    const m = getActiveMission();
    if (!m) return;

    if (state.stageIndex + 1 < m.stages.length) {
      state.stageIndex += 1;
      setupStageEntities(m.stages[state.stageIndex], ctx);
      if (ctx.audio) ctx.audio.playChime('stage');
      if (ctx.onToast) ctx.onToast(`STAGE ${state.stageIndex + 1}/${m.stages.length} · ${m.stages[state.stageIndex].label}`);
      return;
    }

    // Mission complete
    const damageTaken = ctx.player ? ctx.player.state.damageTakenThisMission : 0;
    const rating = computeMissionRating(m, state.missionElapsed, damageTaken);
    if (!state.completedIds.includes(m.id)) state.completedIds.push(m.id);
    const prev = state.ratings[m.id];
    const order = { G: 3, S: 2, B: 1 };
    if (!prev || order[rating] > order[prev]) {
      state.ratings[m.id] = rating;
    }

    if (ctx.player) ctx.player.addCash(m.rewardCash);
    if (ctx.reputation) {
      ctx.reputation.addRp(m.rewardRp);
      ctx.reputation.changeStanding(m.districtId, 18);
    }
    if (m.unlockCrew && ctx.crew) ctx.crew.recruitMember(m.unlockCrew);
    if (m.unlockWeapon && ctx.weapons) ctx.weapons.unlockWeapon(m.unlockWeapon);
    if (ctx.audio) ctx.audio.playChime('mission');

    const ratingName = rating === 'G' ? 'GOLD' : rating === 'S' ? 'SILVER' : 'BRONZE';
    if (ctx.onToast) {
      ctx.onToast(`MISSION COMPLETE: ${m.name} [${ratingName}] +₮${m.rewardCash} +${m.rewardRp} RP`);
    }

    const nextId = m.id + 1;
    if (getMissionById(nextId)) {
      startMission(nextId, ctx);
    } else {
      state.freeRoam = true;
      state.activeMissionId = null;
      beaconGroup.visible = false;
      if (ctx.onCampaignComplete) ctx.onCampaignComplete();
    }
    if (ctx.onAutosave) ctx.onAutosave();
  }

  function recordMissionHostileKill(hostile, ctx = {}) {
    const stage = getActiveStage();
    if (!stage || stage.type !== 'kill') return;
    if (hostile.missionTag === 'mission') {
      state.stageKills += 1;
      if (state.stageKills >= state.stageTargetKills) {
        advanceStage(ctx);
      }
    }
  }

  function update(dt, ctx = {}) {
    if (state.activeDialogue) {
      state.activeDialogue.timer -= dt;
      if (state.activeDialogue.timer <= 0) state.activeDialogue = null;
    }

    const stage = getActiveStage();
    if (!stage || !ctx.player) return;

    state.missionElapsed += dt;

    // Pulse beacon ring
    if (beaconGroup.visible) {
      const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.12;
      ring.scale.setScalar(pulse);
    }

    const px = ctx.player.state.x;
    const pz = ctx.player.state.z;

    if ((stage.type === 'goto' || stage.type === 'collect') && stage.target) {
      const dist = Math.hypot(px - stage.target.x, pz - stage.target.z);
      if (dist <= (stage.radius || 10)) {
        advanceStage(ctx);
      }
    } else if (stage.type === 'steal') {
      if (ctx.player.state.vehicle && state.stageTargetVehicle && ctx.player.state.vehicle === state.stageTargetVehicle) {
        advanceStage(ctx);
      } else if (ctx.player.state.vehicle && ctx.player.state.vehicle.classId === (stage.vehicleClass || 'sports')) {
        advanceStage(ctx);
      }
    }
  }

  function getHudData(playerState) {
    const m = getActiveMission();
    const s = getActiveStage();
    if (!m || !s) {
      return {
        freeRoam: true,
        missionId: null,
        act: 'FREE ROAM',
        name: 'SOLANA BAY FREE ROAM',
        stageNum: 0,
        stageTotal: 0,
        objective: 'Explore Solana Bay, win street races, and collect Golden Herons',
        nextHint: 'Open Pause Menu [ESC] to track 100% completion',
        distance: null,
        target: null,
        killProgress: null,
      };
    }

    const dist = s.target && playerState
      ? Math.round(Math.hypot(s.target.x - playerState.x, s.target.z - playerState.z))
      : null;

    return {
      freeRoam: false,
      missionId: m.id,
      act: m.act,
      name: m.name,
      stageNum: state.stageIndex + 1,
      stageTotal: m.stages.length,
      objective:
        s.type === 'kill'
          ? `${s.label} (${state.stageKills}/${state.stageTargetKills})`
          : s.label,
      nextHint: s.nextHint,
      distance: dist,
      target: s.target || null,
      killProgress: s.type === 'kill' ? { done: state.stageKills, total: state.stageTargetKills } : null,
    };
  }

  function exportProgress() {
    return {
      activeMissionId: state.activeMissionId,
      stageIndex: state.stageIndex,
      completedIds: [...state.completedIds],
      ratings: { ...state.ratings },
      freeRoam: state.freeRoam,
    };
  }

  function importProgress(data, ctx = {}) {
    if (!data) return;
    state.completedIds = Array.isArray(data.completedIds) ? [...data.completedIds] : [];
    state.ratings = data.ratings ? { ...data.ratings } : {};
    state.freeRoam = Boolean(data.freeRoam);
    if (state.freeRoam) {
      state.activeMissionId = null;
      beaconGroup.visible = false;
    } else {
      const mId = data.activeMissionId || 1;
      const st = (data.stageIndex || 0) + 1;
      setExactStage(mId, st, ctx);
    }
  }

  return {
    state,
    beaconGroup,
    getActiveMission,
    getActiveStage,
    showDialogue,
    startMission,
    setExactStage,
    advanceStage,
    recordMissionHostileKill,
    update,
    getHudData,
    exportProgress,
    importProgress,
  };
}
