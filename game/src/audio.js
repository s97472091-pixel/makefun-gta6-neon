// WebAudio procedural synthesizer — engine hum, gunshots, explosions, sirens, drift, horn, UI chimes.
// Zero external audio files required.

export function createAudio() {
  let ctx = null;
  let enabled = true;
  let unlocked = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenPhase = 0;
  let screechCooldown = 0;

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!unlocked && ctx) {
      unlocked = true;
      setupLoops();
    }
    return ctx;
  }

  function setupLoops() {
    if (!ctx) return;
    // Continuous engine hum
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const engFilter = ctx.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.value = 210;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0001;
    engineOsc.connect(engFilter);
    engFilter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();

    // Police wail siren
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 620;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0.0001;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(ctx.destination);
    sirenOsc.start();
  }

  function playNoiseBurst(duration, filterFreq, gainPeak, filterType = 'bandpass') {
    const c = ensure();
    if (!c) return;
    const len = Math.floor(c.sampleRate * duration);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const g = c.createGain();
    const now = c.currentTime;
    g.gain.setValueAtTime(gainPeak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(c.destination);
    src.start(now);
    src.stop(now + duration);
  }

  function playTone(freqStart, freqEnd, duration, type = 'sine', gainPeak = 0.14) {
    const c = ensure();
    if (!c) return;
    const osc = c.createOscillator();
    osc.type = type;
    const now = c.currentTime;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    const g = c.createGain();
    g.gain.setValueAtTime(gainPeak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playGunshot(weaponId) {
    if (weaponId === 'shotgun') {
      playNoiseBurst(0.28, 520, 0.34, 'lowpass');
      playTone(140, 42, 0.2, 'triangle', 0.24);
    } else if (weaponId === 'smg') {
      playNoiseBurst(0.09, 1300, 0.18, 'bandpass');
      playTone(260, 95, 0.06, 'square', 0.08);
    } else if (weaponId === 'fists') {
      playNoiseBurst(0.09, 420, 0.16, 'lowpass');
    } else {
      playNoiseBurst(0.14, 980, 0.24, 'bandpass');
      playTone(220, 68, 0.1, 'triangle', 0.14);
    }
  }

  function playExplosion() {
    playNoiseBurst(0.65, 240, 0.45, 'lowpass');
    playTone(110, 28, 0.55, 'sawtooth', 0.28);
  }

  function playCrash(intensity = 0.6) {
    playNoiseBurst(0.18, 480, 0.22 * intensity, 'lowpass');
    playTone(130, 50, 0.15, 'triangle', 0.12 * intensity);
  }

  function playScreech(dt) {
    screechCooldown -= dt;
    if (screechCooldown > 0) return;
    screechCooldown = 0.22;
    playNoiseBurst(0.16, 2600, 0.055, 'bandpass');
  }

  function playHorn() {
    playTone(392, 392, 0.26, 'sawtooth', 0.09);
    playTone(494, 494, 0.26, 'sawtooth', 0.07);
  }

  function playPickup() {
    playTone(587, 880, 0.12, 'sine', 0.12);
    setTimeout(() => playTone(880, 1175, 0.16, 'sine', 0.11), 80);
  }

  function playMissionComplete() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, idx) => {
      setTimeout(() => playTone(f, f * 1.01, 0.26, 'triangle', 0.14), idx * 110);
    });
  }

  function playWantedUp() {
    playTone(440, 660, 0.16, 'square', 0.08);
  }

  function updateContinuous(dt, inVehicle, speedAbs, sirenActive) {
    if (!ctx || !engineOsc || !sirenOsc) return;
    const now = ctx.currentTime;
    if (!enabled) {
      engineGain.gain.setTargetAtTime(0.0001, now, 0.08);
      sirenGain.gain.setTargetAtTime(0.0001, now, 0.08);
      return;
    }

    if (inVehicle) {
      const pitch = 52 + Math.min(130, speedAbs * 3.1);
      engineOsc.frequency.setTargetAtTime(pitch, now, 0.06);
      engineGain.gain.setTargetAtTime(0.055 + Math.min(0.045, speedAbs * 0.0012), now, 0.08);
    } else {
      engineGain.gain.setTargetAtTime(0.0001, now, 0.08);
    }

    if (sirenActive) {
      sirenPhase += dt * 2.4;
      const freq = 620 + Math.sin(sirenPhase * Math.PI) * 240;
      sirenOsc.frequency.setTargetAtTime(freq, now, 0.04);
      sirenGain.gain.setTargetAtTime(0.032, now, 0.1);
    } else {
      sirenGain.gain.setTargetAtTime(0.0001, now, 0.1);
    }
  }

  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  return {
    ensure,
    toggle,
    isEnabled,
    playGunshot,
    playExplosion,
    playCrash,
    playScreech,
    playHorn,
    playPickup,
    playMissionComplete,
    playWantedUp,
    updateContinuous,
  };
}
