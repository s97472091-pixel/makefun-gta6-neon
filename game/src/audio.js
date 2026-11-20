// Solana Bay — 100% procedural WebAudio synthesizer (engine, weapons, explosions, crashes, siren, UI).

import { clamp } from './config.js';

export function createAudioSystem() {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let lastScreech = 0;

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.42;
      master.connect(ctx.destination);

      // Reusable 1-second white noise buffer
      const length = ctx.sampleRate;
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

      // Continuous engine hum oscillator
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 240;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();

      // Continuous police siren oscillator
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 680;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    ensureContext();
  }

  function setMuted(val) {
    muted = Boolean(val);
    if (master && ctx) {
      master.gain.setTargetAtTime(muted ? 0 : 0.42, ctx.currentTime, 0.03);
    }
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function playNoiseBurst(duration, filterFreq, gainVal, q = 1.0, filterType = 'bandpass') {
    if (muted || !ctx || ctx.state !== 'running' || !noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainVal, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + duration);
  }

  function playTone(freqStart, freqEnd, duration, type = 'sine', gainVal = 0.18, delay = 0) {
    if (muted || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainVal, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playGunshot(weaponId = 'pistol', vol = 0.75) {
    if (weaponId === 'shotgun') {
      playNoiseBurst(0.28, 720, 0.55 * vol, 0.7, 'lowpass');
      playTone(135, 36, 0.22, 'triangle', 0.35 * vol);
    } else if (weaponId === 'smg') {
      playNoiseBurst(0.09, 1500, 0.32 * vol, 1.1, 'bandpass');
      playTone(210, 75, 0.07, 'square', 0.14 * vol);
    } else {
      playNoiseBurst(0.14, 1150, 0.42 * vol, 0.9, 'bandpass');
      playTone(185, 58, 0.11, 'triangle', 0.22 * vol);
    }
  }

  function playPunch() {
    playNoiseBurst(0.08, 420, 0.25, 0.8, 'lowpass');
    playTone(140, 62, 0.08, 'sine', 0.2);
  }

  function playExplosion() {
    playNoiseBurst(0.85, 360, 0.75, 0.5, 'lowpass');
    playTone(95, 22, 0.7, 'sawtooth', 0.45);
  }

  function playCrash(intensity = 0.6) {
    const v = clamp(intensity, 0.15, 1.0);
    playNoiseBurst(0.26, 620, 0.48 * v, 0.8, 'lowpass');
    playTone(130, 42, 0.18, 'triangle', 0.25 * v);
  }

  function playTireScreech(intensity = 0.5) {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (now - lastScreech < 0.14) return;
    lastScreech = now;
    playNoiseBurst(0.16, 2400, 0.11 * clamp(intensity, 0.1, 0.9), 5.5, 'bandpass');
  }

  function playHorn() {
    playTone(392, 392, 0.32, 'sawtooth', 0.14);
    playTone(494, 494, 0.32, 'sawtooth', 0.12);
  }

  function playPickup() {
    playTone(587, 880, 0.14, 'triangle', 0.18, 0);
    playTone(880, 1175, 0.16, 'triangle', 0.16, 0.08);
  }

  function playUiClick() {
    playTone(520, 660, 0.07, 'sine', 0.11);
  }

  function playMissionChime(completed = false) {
    if (completed) {
      playTone(523, 523, 0.16, 'triangle', 0.2, 0);
      playTone(659, 659, 0.16, 'triangle', 0.2, 0.12);
      playTone(784, 784, 0.18, 'triangle', 0.2, 0.24);
      playTone(1046, 1046, 0.38, 'triangle', 0.22, 0.36);
    } else {
      playTone(440, 554, 0.14, 'triangle', 0.16, 0);
      playTone(659, 659, 0.2, 'triangle', 0.16, 0.12);
    }
  }

  function updateContinuous(elapsed, player, police) {
    if (!ctx || ctx.state !== 'running' || muted) return;
    const now = ctx.currentTime;

    // Engine hum proportional to vehicle speed
    const v = player.state.vehicle;
    if (v && !v.destroyed) {
      const spdRatio = clamp(Math.abs(v.speed) / v.spec.maxSpeed, 0, 1.25);
      engineOsc.frequency.setTargetAtTime(48 + spdRatio * 145, now, 0.05);
      engineGain.gain.setTargetAtTime(0.08 + spdRatio * 0.11, now, 0.06);
    } else {
      engineGain.gain.setTargetAtTime(0, now, 0.08);
    }

    // Police siren sweep when wanted or driving a cruiser with sirens
    const sirenActive = police.state.stars > 0 || (v && v.isPolice && v.sirenOn);
    if (sirenActive && !player.state.dead && !player.state.busted) {
      const wail = 620 + Math.sin(elapsed * 4.8) * 230;
      sirenOsc.frequency.setTargetAtTime(wail, now, 0.04);
      sirenGain.gain.setTargetAtTime(0.055, now, 0.08);
    } else {
      sirenGain.gain.setTargetAtTime(0, now, 0.1);
    }
  }

  return {
    unlock,
    setMuted,
    toggleMute,
    isMuted,
    playGunshot,
    playPunch,
    playExplosion,
    playCrash,
    playTireScreech,
    playHorn,
    playPickup,
    playUiClick,
    playMissionChime,
    updateContinuous,
  };
}
