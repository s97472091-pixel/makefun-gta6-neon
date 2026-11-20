// Solana Bay — Procedural WebAudio synthesizer (engine, siren, guns, explosions, crashes, horn, chimes — zero audio files)

export function createAudioSystem() {
  let ctx = null;
  let masterGain = null;
  let noiseBuffer = null;
  let muted = false;

  // Continuous nodes
  let engineOsc1 = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;

  let sirenOsc = null;
  let sirenGain = null;

  let screechCooldown = 0;

  function ensureContext() {
    if (muted) return false;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.45;
        masterGain.connect(ctx.destination);

        // Pre-build 1.5s white noise buffer
        const len = Math.floor(ctx.sampleRate * 1.5);
        noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        // Engine hum synth
        engineFilter = ctx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.value = 260;

        engineGain = ctx.createGain();
        engineGain.gain.value = 0;

        engineOsc1 = ctx.createOscillator();
        engineOsc1.type = 'sawtooth';
        engineOsc1.frequency.value = 55;
        engineOsc2 = ctx.createOscillator();
        engineOsc2.type = 'triangle';
        engineOsc2.frequency.value = 110;

        engineOsc1.connect(engineFilter);
        engineOsc2.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(masterGain);
        engineOsc1.start();
        engineOsc2.start();

        // Police siren synth
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'triangle';
        sirenOsc.frequency.value = 660;
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(masterGain);
        sirenOsc.start();
      } catch {
        return false;
      }
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx.state === 'running';
  }

  function unlock() {
    ensureContext();
  }

  function setMuted(val) {
    muted = !!val;
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.45, ctx.currentTime, 0.04);
    }
  }

  function isMuted() {
    return muted;
  }

  function updateContinuous(dt, time, inVehicle, speedAbs, sirenActive) {
    screechCooldown = Math.max(0, screechCooldown - dt);
    if (!ctx || ctx.state !== 'running' || muted) return;
    const now = ctx.currentTime;

    if (inVehicle) {
      const ratio = Math.min(1.4, speedAbs / 34);
      const baseHz = 52 + ratio * 125;
      engineOsc1.frequency.setTargetAtTime(baseHz, now, 0.06);
      engineOsc2.frequency.setTargetAtTime(baseHz * 2.01, now, 0.06);
      engineFilter.frequency.setTargetAtTime(220 + ratio * 520, now, 0.06);
      engineGain.gain.setTargetAtTime(0.11 + ratio * 0.08, now, 0.08);
    } else {
      engineGain.gain.setTargetAtTime(0, now, 0.08);
    }

    if (sirenActive) {
      const wail = 640 + Math.sin(time * 5.2) * 240;
      sirenOsc.frequency.setTargetAtTime(wail, now, 0.03);
      sirenGain.gain.setTargetAtTime(0.065, now, 0.12);
    } else {
      sirenGain.gain.setTargetAtTime(0, now, 0.12);
    }
  }

  function playNoiseBurst(duration, filterType, freq, gainPeak, q = 1) {
    if (!ensureContext() || !noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, now);
    filter.Q.value = q;

    const g = ctx.createGain();
    g.gain.setValueAtTime(gainPeak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  function playTone(type, freqStart, freqEnd, duration, gainPeak, delay = 0) {
    if (!ensureContext()) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainPeak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playGunshot(weaponId = 'pistol', vol = 0.8) {
    if (weaponId === 'shotgun') {
      playNoiseBurst(0.28, 'lowpass', 950, 0.52 * vol, 0.8);
      playTone('triangle', 150, 38, 0.22, 0.45 * vol);
    } else if (weaponId === 'smg') {
      playNoiseBurst(0.09, 'bandpass', 1750, 0.32 * vol, 1.1);
      playTone('square', 220, 70, 0.07, 0.16 * vol);
    } else {
      playNoiseBurst(0.14, 'bandpass', 1400, 0.38 * vol, 0.9);
      playTone('triangle', 190, 55, 0.11, 0.28 * vol);
    }
  }

  function playPunch() {
    playNoiseBurst(0.08, 'lowpass', 520, 0.26, 0.7);
    playTone('sine', 140, 48, 0.1, 0.28);
  }

  function playExplosion(vol = 1.0) {
    playNoiseBurst(0.85, 'lowpass', 360, 0.7 * vol, 0.6);
    playTone('sine', 120, 26, 0.65, 0.6 * vol);
  }

  function playCrash(intensity = 0.6) {
    const v = Math.max(0.15, Math.min(1.0, intensity));
    playNoiseBurst(0.24, 'bandpass', 620, 0.42 * v, 0.9);
    playTone('sawtooth', 130, 42, 0.18, 0.25 * v);
  }

  function playScreech(intensity = 0.5) {
    if (screechCooldown > 0) return;
    screechCooldown = 0.14;
    playNoiseBurst(0.16, 'bandpass', 1850, 0.1 * Math.min(1, intensity), 5.0);
  }

  function playHorn() {
    playTone('sawtooth', 392, 392, 0.32, 0.14);
    playTone('sawtooth', 494, 494, 0.32, 0.14);
  }

  function playPickup() {
    playTone('sine', 587, 587, 0.1, 0.18, 0);
    playTone('sine', 880, 880, 0.16, 0.18, 0.08);
  }

  function playUiClick(freq = 520) {
    playTone('triangle', freq, freq * 0.85, 0.06, 0.12);
  }

  function playMissionChime(kind = 'start') {
    if (kind === 'complete') {
      playTone('triangle', 523.25, 523.25, 0.15, 0.22, 0);
      playTone('triangle', 659.25, 659.25, 0.15, 0.22, 0.12);
      playTone('triangle', 783.99, 783.99, 0.18, 0.22, 0.24);
      playTone('triangle', 1046.5, 1046.5, 0.35, 0.25, 0.38);
    } else if (kind === 'fail') {
      playTone('sawtooth', 311, 277, 0.25, 0.18, 0);
      playTone('sawtooth', 233, 185, 0.4, 0.2, 0.22);
    } else {
      playTone('triangle', 440, 440, 0.12, 0.18, 0);
      playTone('triangle', 659.25, 659.25, 0.22, 0.2, 0.11);
    }
  }

  return {
    unlock,
    setMuted,
    isMuted,
    updateContinuous,
    playGunshot,
    playPunch,
    playExplosion,
    playCrash,
    playScreech,
    playHorn,
    playPickup,
    playUiClick,
    playMissionChime,
  };
}
