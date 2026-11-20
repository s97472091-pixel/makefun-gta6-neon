// Solana Bay — Three Procedural WebAudio Radio Stations
import { RADIO_STATIONS } from './config.js';

export function createRadioSystem() {
  let ctx = null;
  let masterGain = null;
  let stepTimer = null;
  let stepIndex = 0;

  const state = {
    stationIndex: 0,
    trackIndex: 0,
    playing: false,
    muted: false,
    volume: 0.16,
  };

  function ensureContext() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = state.muted ? 0 : state.volume;
      masterGain.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function playNote(freq, dur, type = 'triangle', gainVal = 0.08, delay = 0) {
    if (!ctx || !masterGain || state.muted) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainVal, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function tickLoop() {
    if (!state.playing || state.muted || !ctx || ctx.state !== 'running') return;
    const station = RADIO_STATIONS[state.stationIndex];
    const bar = Math.floor(stepIndex / 4) % station.chords.length;
    const beat = stepIndex % 4;
    const beatDur = 60 / station.bpm;

    // Bass groove on beats 0 and 2
    const bassFreq = station.bass[bar];
    if (beat === 0 || beat === 2) {
      playNote(bassFreq, beatDur * 0.8, 'sawtooth', 0.11);
    } else if (beat === 3) {
      playNote(bassFreq * 1.125, beatDur * 0.45, 'triangle', 0.07);
    }

    // Chord stab on beat 0 and syncopated arpeggio
    const chord = station.chords[bar];
    if (beat === 0) {
      for (const f of chord) {
        playNote(f, beatDur * 1.5, 'triangle', 0.042);
      }
    } else {
      const arp = chord[(beat + state.trackIndex) % chord.length] * 2;
      playNote(arp, beatDur * 0.42, 'sine', 0.036);
    }

    stepIndex = (stepIndex + 1) % 64;
    if (stepIndex === 0) {
      state.trackIndex = (state.trackIndex + 1) % station.tracks.length;
    }
  }

  function startScheduler() {
    stopScheduler();
    const station = RADIO_STATIONS[state.stationIndex];
    const ms = Math.round((60 / station.bpm) * 1000);
    stepTimer = setInterval(tickLoop, ms);
  }

  function stopScheduler() {
    if (stepTimer) {
      clearInterval(stepTimer);
      stepTimer = null;
    }
  }

  function setDrivingState(inVehicle, vehicleStationIndex = 0) {
    if (inVehicle) {
      state.stationIndex = ((vehicleStationIndex % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
      if (!state.playing) {
        state.playing = true;
        if (ensureContext() && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        startScheduler();
      }
    } else if (state.playing) {
      state.playing = false;
      stopScheduler();
    }
  }

  function nextStation(vehicle = null) {
    state.stationIndex = (state.stationIndex + 1) % RADIO_STATIONS.length;
    state.trackIndex = 0;
    if (vehicle) vehicle.radioStationIndex = state.stationIndex;
    if (state.playing) {
      if (ensureContext() && ctx.state === 'suspended') ctx.resume().catch(() => {});
      startScheduler();
    }
    return getCurrentInfo();
  }

  function setStation(index, vehicle = null) {
    state.stationIndex = ((index % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    if (vehicle) vehicle.radioStationIndex = state.stationIndex;
    if (state.playing) startScheduler();
  }

  function setMuted(muted) {
    state.muted = Boolean(muted);
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(state.muted ? 0 : state.volume, ctx.currentTime, 0.05);
    }
  }

  function getCurrentInfo() {
    const st = RADIO_STATIONS[state.stationIndex];
    return {
      id: st.id,
      code: st.code,
      name: st.name,
      color: st.color,
      track: st.tracks[state.trackIndex % st.tracks.length],
      playing: state.playing,
      muted: state.muted,
    };
  }

  return {
    state,
    stations: RADIO_STATIONS,
    setDrivingState,
    nextStation,
    setStation,
    setMuted,
    getCurrentInfo,
  };
}
