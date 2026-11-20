// Solana Bay — Procedural WebAudio SFX (Engine, Gunshots, Explosions, Sirens, Chimes)

export function createAudioSystem() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let noiseBuffer = null;
  let screechCooldown = 0;

  const state = {
    muted: false,
    volume: 0.28,
    sirenPhase: 0,
  };

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = state.muted ? 0 : state.volume;
      master.connect(ctx.destination);

      // Build white-noise buffer for gunshots, crashes, explosions, screech
      const len = ctx.sampleRate * 1.2;
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      // Continuous engine hum oscillator
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 260;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();

      // Continuous SBPD siren oscillator
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 660;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
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

  function playNoiseBurst(duration, filterFreq, gainAmount, filterType = 'bandpass') {
    if (state.muted || !ensureContext() || !noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainAmount, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  function playTone(freqStart, freqEnd, duration, type = 'sine', gainAmount = 0.22, delay = 0) {
    if (state.muted || !ensureContext()) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    g.gain.setValueAtTime(gainAmount, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playGunshot(weaponId = 'pistol', scale = 1) {
    if (weaponId === 'shotgun') {
      playNoiseBurst(0.28, 700, 0.55 * scale, 'lowpass');
      playTone(135, 38, 0.18, 'triangle', 0.35 * scale);
    } else if (weaponId === 'smg') {
      playNoiseBurst(0.09, 1600, 0.28 * scale, 'bandpass');
      playTone(240, 85, 0.07, 'square', 0.16 * scale);
    } else if (weaponId === 'rifle') {
      playNoiseBurst(0.14, 1300, 0.4 * scale, 'bandpass');
      playTone(190, 58, 0.11, 'sawtooth', 0.22 * scale);
    } else {
      playNoiseBurst(0.13, 1200, 0.34 * scale, 'bandpass');
      playTone(210, 72, 0.1, 'triangle', 0.22 * scale);
    }
  }

  function playMelee() {
    playNoiseBurst(0.08, 600, 0.22, 'bandpass');
    playTone(160, 75, 0.09, 'sine', 0.18);
  }

  function playExplosion() {
    playNoiseBurst(0.85, 380, 0.72, 'lowpass');
    playTone(110, 26, 0.65, 'sawtooth', 0.45);
  }

  function playCrash(intensity = 0.6) {
    playNoiseBurst(0.22 + intensity * 0.18, 820, 0.22 + intensity * 0.35, 'bandpass');
    playTone(120, 42, 0.2, 'triangle', 0.24 * intensity);
  }

  function playTireScreech() {
    if (screechCooldown > 0) return;
    screechCooldown = 0.28;
    playNoiseBurst(0.24, 2400, 0.12, 'bandpass');
  }

  function playHorn() {
    playTone(340, 340, 0.28, 'sawtooth', 0.16);
    playTone(428, 428, 0.28, 'sawtooth', 0.14);
  }

  function playChime(kind = 'ui') {
    if (kind === 'mission') {
      playTone(523.25, 523.25, 0.18, 'triangle', 0.24, 0);
      playTone(659.25, 659.25, 0.18, 'triangle', 0.24, 0.12);
      playTone(783.99, 783.99, 0.36, 'triangle', 0.28, 0.24);
    } else if (kind === 'stage' || kind === 'collect') {
      playTone(587.33, 587.33, 0.14, 'triangle', 0.2, 0);
      playTone(880, 880, 0.24, 'triangle', 0.22, 0.1);
    } else if (kind === 'ability') {
      playTone(440, 880, 0.22, 'sine', 0.22, 0);
    } else {
      playTone(620, 620, 0.08, 'sine', 0.12, 0);
    }
  }

  function update(dt, playerState, wantedStars) {
    if (screechCooldown > 0) screechCooldown = Math.max(0, screechCooldown - dt);
    if (!ctx || ctx.state !== 'running') return;

    // Continuous engine hum pitch & volume
    if (engineOsc && engineGain) {
      if (playerState && playerState.vehicle && !state.muted) {
        const spd = Math.abs(playerState.vehicle.speed);
        const freq = 52 + spd * 3.1;
        engineOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.06);
        engineGain.gain.setTargetAtTime(0.08 + Math.min(0.1, spd * 0.003), ctx.currentTime, 0.08);
      } else {
        engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      }
    }

    // Continuous wail siren when wanted
    if (sirenOsc && sirenGain) {
      if (wantedStars > 0 && !state.muted) {
        state.sirenPhase += dt * 2.8;
        const sirenFreq = 640 + Math.sin(state.sirenPhase) * 240;
        sirenOsc.frequency.setTargetAtTime(sirenFreq, ctx.currentTime, 0.04);
        sirenGain.gain.setTargetAtTime(0.055, ctx.currentTime, 0.12);
      } else {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      }
    }
  }

  function setMuted(muted) {
    state.muted = Boolean(muted);
    if (master && ctx) {
      master.gain.setTargetAtTime(state.muted ? 0 : state.volume, ctx.currentTime, 0.04);
    }
  }

  return {
    state,
    unlock,
    playGunshot,
    playMelee,
    playExplosion,
    playCrash,
    playTireScreech,
    playHorn,
    playChime,
    update,
    setMuted,
  };
}
