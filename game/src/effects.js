// Solana Bay — Pooled particles (smoke, sparks, explosions, tracers) & spinning pickups
import * as THREE from 'three';

export function createEffectsSystem(scene, city, rng) {
  const MAX_PARTICLES = 180;
  const MAX_TRACERS = 40;

  // Pooled box/sphere particles
  const particleGeo = new THREE.DodecahedronGeometry(0.32, 0);
  const particles = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(particleGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    particles.push({
      mesh,
      mat,
      active: false,
      age: 0,
      life: 1,
      vx: 0,
      vy: 0,
      vz: 0,
      gravity: 0,
      scaleStart: 1,
      scaleEnd: 2,
    });
  }
  let pCursor = 0;

  function allocParticle(x, y, z, vx, vy, vz, color, life, scaleStart, scaleEnd, gravity = 0) {
    const p = particles[pCursor];
    pCursor = (pCursor + 1) % MAX_PARTICLES;
    p.active = true;
    p.age = 0;
    p.life = life;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.gravity = gravity;
    p.scaleStart = scaleStart;
    p.scaleEnd = scaleEnd;
    p.mat.color.setHex(color);
    p.mat.opacity = 0.92;
    p.mesh.position.set(x, y, z);
    p.mesh.scale.setScalar(scaleStart);
    p.mesh.visible = true;
  }

  function spawnSmoke(x, y, z, color = 0xdbe2ea, scale = 0.65) {
    allocParticle(
      x + (rng() - 0.5) * 0.45,
      y,
      z + (rng() - 0.5) * 0.45,
      (rng() - 0.5) * 1.1,
      1.6 + rng() * 1.4,
      (rng() - 0.5) * 1.1,
      color,
      0.55 + rng() * 0.35,
      scale * 0.55,
      scale * 2.1,
      -0.4
    );
  }

  function spawnSpark(x, y, z, color = 0xffd166, count = 4) {
    for (let i = 0; i < count; i++) {
      allocParticle(
        x,
        y,
        z,
        (rng() - 0.5) * 8,
        2.5 + rng() * 4.5,
        (rng() - 0.5) * 8,
        color,
        0.25 + rng() * 0.22,
        0.28,
        0.04,
        14.0
      );
    }
  }

  function spawnExplosion(x, y, z, scale = 1.0) {
    // Core flash + fireballs
    for (let i = 0; i < 16; i++) {
      const a = rng() * Math.PI * 2;
      const spd = (2 + rng() * 9) * scale;
      allocParticle(
        x + (rng() - 0.5) * 0.8,
        y + rng() * 0.6,
        z + (rng() - 0.5) * 0.8,
        Math.cos(a) * spd,
        3.5 + rng() * 7.5 * scale,
        Math.sin(a) * spd,
        i % 3 === 0 ? 0xfff3b0 : i % 3 === 1 ? 0xff7b00 : 0xff3b30,
        0.45 + rng() * 0.35,
        0.9 * scale,
        2.6 * scale,
        3.5
      );
    }
    // Billowing dark smoke plume
    for (let i = 0; i < 12; i++) {
      allocParticle(
        x + (rng() - 0.5) * 1.6,
        y + 0.5 + rng() * 1.0,
        z + (rng() - 0.5) * 1.6,
        (rng() - 0.5) * 3.5,
        2.5 + rng() * 4.0,
        (rng() - 0.5) * 3.5,
        0x2a2d34,
        1.1 + rng() * 0.6,
        1.0 * scale,
        3.4 * scale,
        -0.8
      );
    }
  }

  // Pooled bullet tracers (thin elongated meshes)
  const tracerGeo = new THREE.BoxGeometry(0.055, 0.055, 1.0);
  const tracers = [];
  for (let i = 0; i < MAX_TRACERS; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe48f, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(tracerGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    tracers.push({ mesh, mat, active: false, age: 0, life: 0.08 });
  }
  let tCursor = 0;

  function spawnTracer(startVec, endVec, colorHex = 0xffe48f) {
    const t = tracers[tCursor];
    tCursor = (tCursor + 1) % MAX_TRACERS;
    const dist = startVec.distanceTo(endVec);
    if (dist < 0.2) return;
    t.active = true;
    t.age = 0;
    t.life = 0.09;
    t.mat.color.setHex(colorHex);
    t.mat.opacity = 0.95;
    t.mesh.position.copy(startVec).lerp(endVec, 0.5);
    t.mesh.scale.set(1, 1, dist);
    t.mesh.lookAt(endVec);
    t.mesh.visible = true;
  }

  // Spinning pickups (cash, health, armor, ammo)
  const pickups = [];
  const pickupStyles = {
    cash: { color: 0x2ecc71, geo: new THREE.BoxGeometry(0.65, 0.32, 0.42) },
    health: { color: 0xff4d6d, geo: new THREE.OctahedronGeometry(0.42, 0) },
    armor: { color: 0x38e8ff, geo: new THREE.OctahedronGeometry(0.42, 0) },
    ammo: { color: 0xffd166, geo: new THREE.BoxGeometry(0.46, 0.46, 0.46) },
  };

  function spawnPickup(kind, x, z, value = 50, persistent = false) {
    const st = pickupStyles[kind] || pickupStyles.cash;
    const g = new THREE.Group();
    const gy = city.getGroundHeight(x, z);
    const mesh = new THREE.Mesh(
      st.geo,
      new THREE.MeshStandardMaterial({
        color: st.color,
        emissive: st.color,
        emissiveIntensity: 0.45,
        roughness: 0.3,
      })
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 16),
      new THREE.MeshBasicMaterial({ color: st.color, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.62;
    g.add(mesh, ring);
    g.position.set(x, gy + 0.85, z);
    scene.add(g);

    const item = {
      kind,
      value,
      persistent,
      mesh: g,
      core: mesh,
      x,
      z,
      baseY: gy + 0.85,
      age: 0,
      ttl: persistent ? 99999 : 45,
    };
    pickups.push(item);
    return item;
  }

  function populateWorldPickups() {
    // Helpful world pickups around landmarks
    spawnPickup('armor', 176, 72, 40, true);
    spawnPickup('health', 194, 42, 40, true);
    spawnPickup('ammo', 102, -74, 1, true);
    spawnPickup('health', 228, 0, 40, true);
    spawnPickup('armor', -116, -116, 40, true);
  }

  function update(dt, time, playerCtrl, audio, hud) {
    // Update particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      const k = p.age / p.life;
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const s = p.scaleStart + (p.scaleEnd - p.scaleStart) * k;
      p.mesh.scale.setScalar(Math.max(0.01, s));
      p.mat.opacity = Math.max(0, 1 - k);
    }

    // Update tracers
    for (let i = 0; i < MAX_TRACERS; i++) {
      const t = tracers[i];
      if (!t.active) continue;
      t.age += dt;
      if (t.age >= t.life) {
        t.active = false;
        t.mesh.visible = false;
      } else {
        t.mat.opacity = 1 - t.age / t.life;
      }
    }

    // Update & collect pickups
    const player = playerCtrl.player;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pk = pickups[i];
      pk.age += dt;
      pk.core.rotation.y = time * 2.4 + i;
      pk.mesh.position.y = pk.baseY + Math.sin(time * 3.2 + i) * 0.18;

      if (!pk.persistent && pk.age >= pk.ttl) {
        scene.remove(pk.mesh);
        pickups.splice(i, 1);
        continue;
      }

      if (!player.dead && !player.busted) {
        const d = Math.hypot(player.pos.x - pk.x, player.pos.z - pk.z);
        if (d < (player.vehicle ? 3.2 : 1.9)) {
          if (pk.kind === 'cash') {
            playerCtrl.addCash(pk.value);
            if (hud) hud.showToast(`+$${pk.value}`, 'green');
          } else if (pk.kind === 'health') {
            playerCtrl.heal(pk.value, 0);
            if (hud) hud.showToast(`+${pk.value} HEALTH`, 'green');
          } else if (pk.kind === 'armor') {
            playerCtrl.heal(0, pk.value);
            if (hud) hud.showToast(`+${pk.value} ARMOR`, 'cyan');
          } else if (pk.kind === 'ammo') {
            for (const key of ['pistol', 'smg', 'shotgun']) {
              const inv = player.inventory[key];
              if (inv && inv.unlocked) inv.reserve += 24;
            }
            if (hud) hud.showToast('+AMMO REFILL', 'gold');
          }
          if (audio) audio.playPickup();
          scene.remove(pk.mesh);
          pickups.splice(i, 1);
        }
      }
    }
  }

  return {
    pickups,
    spawnSmoke,
    spawnSpark,
    spawnExplosion,
    spawnTracer,
    spawnPickup,
    populateWorldPickups,
    update,
  };
}
