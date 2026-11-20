// Solana Bay — pooled particles (tire smoke, sparks, explosions, tracers) and spinning pickups.

import * as THREE from 'three';
import { dist2D } from './config.js';

export function createEffectsSystem(scene) {
  const MAX_PARTICLES = 140;
  const particleGeom = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  const particles = [];

  for (let i = 0; i < MAX_PARTICLES; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(particleGeom, mat);
    mesh.visible = false;
    scene.add(mesh);
    particles.push({
      mesh,
      active: false,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1,
      grow: 0,
      gravity: 0,
    });
  }

  let cursor = 0;
  function allocParticle() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const idx = (cursor + i) % MAX_PARTICLES;
      if (!particles[idx].active) {
        cursor = (idx + 1) % MAX_PARTICLES;
        return particles[idx];
      }
    }
    const p = particles[cursor];
    cursor = (cursor + 1) % MAX_PARTICLES;
    return p;
  }

  function spawnParticle(x, y, z, vx, vy, vz, color, size, life, gravity = 0, grow = 0.8) {
    const p = allocParticle();
    p.active = true;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = life;
    p.maxLife = life;
    p.gravity = gravity;
    p.grow = grow;
    p.mesh.visible = true;
    p.mesh.position.set(x, y, z);
    p.mesh.scale.setScalar(size);
    p.mesh.material.color.setHex(color);
    p.mesh.material.opacity = 0.92;
  }

  function spawnSmoke(x, y, z, scale = 0.7, color = 0xd8dce0) {
    spawnParticle(
      x + (Math.random() - 0.5) * 0.4,
      y,
      z + (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 1.1,
      1.6 + Math.random() * 1.2,
      (Math.random() - 0.5) * 1.1,
      color,
      scale,
      0.8 + Math.random() * 0.45,
      -0.4,
      1.4
    );
  }

  function spawnSparks(x, y, z, count = 7) {
    for (let i = 0; i < count; i++) {
      spawnParticle(
        x,
        y,
        z,
        (Math.random() - 0.5) * 9,
        2.5 + Math.random() * 5,
        (Math.random() - 0.5) * 9,
        i % 2 === 0 ? 0xffd166 : 0xff7b00,
        0.24,
        0.3 + Math.random() * 0.25,
        16,
        -0.3
      );
    }
  }

  function spawnExplosion(x, y, z, scale = 1.0) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (2.5 + Math.random() * 8) * scale;
      const color = i < 8 ? 0xffbe0b : i < 14 ? 0xfb5607 : 0x2b2d42;
      spawnParticle(
        x,
        y,
        z,
        Math.cos(angle) * spd,
        2.5 + Math.random() * 6.5 * scale,
        Math.sin(angle) * spd,
        color,
        (0.8 + Math.random() * 1.1) * scale,
        0.55 + Math.random() * 0.5,
        6,
        1.5
      );
    }
  }

  // Pooled tracer beams
  const MAX_TRACERS = 24;
  const tracers = [];
  for (let i = 0; i < MAX_TRACERS; i++) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 1, 0),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffe49e, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geom, mat);
    line.visible = false;
    scene.add(line);
    tracers.push({ line, active: false, life: 0, maxLife: 0.09 });
  }

  let tracerCursor = 0;
  function spawnTracer(start, end, color = 0xffe49e) {
    const t = tracers[tracerCursor];
    tracerCursor = (tracerCursor + 1) % MAX_TRACERS;
    const pos = t.line.geometry.attributes.position;
    pos.setXYZ(0, start.x, start.y, start.z);
    pos.setXYZ(1, end.x, end.y, end.z);
    pos.needsUpdate = true;
    t.line.material.color.setHex(color);
    t.line.material.opacity = 0.95;
    t.line.visible = true;
    t.active = true;
    t.life = 0.085;
    t.maxLife = 0.085;
  }

  // Spinning pickups (cash, health, armor)
  const pickups = [];
  const pickupConfigs = {
    cash: { color: 0x2ec4b6, emissive: 0x06d6a0, geom: new THREE.BoxGeometry(0.62, 0.36, 0.16) },
    health: { color: 0xff4d6d, emissive: 0xe63946, geom: new THREE.BoxGeometry(0.55, 0.55, 0.55) },
    armor: { color: 0x3a86ff, emissive: 0x00bbf9, geom: new THREE.OctahedronGeometry(0.42, 0) },
  };

  function spawnPickup(kind, x, z, value = 50) {
    const cfg = pickupConfigs[kind] || pickupConfigs.cash;
    const mat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      emissiveIntensity: 0.55,
      roughness: 0.35,
    });
    const mesh = new THREE.Mesh(cfg.geom, mat);
    mesh.position.set(x, 0.85, z);
    scene.add(mesh);
    pickups.push({ kind, x, z, value, mesh, age: 0 });
  }

  function spawnStarterPickups() {
    spawnPickup('armor', 106, -42, 40);
    spawnPickup('health', 148, 8, 50);
    spawnPickup('cash', 154, -44, 150);
    spawnPickup('armor', -44, -84, 50);
    spawnPickup('health', 94, 72, 50);
    spawnPickup('cash', 194, 96, 250);
  }

  function update(dt, elapsed, player, audio, callbacks = {}) {
    // Update particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.08, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      const ratio = p.life / p.maxLife;
      p.mesh.material.opacity = ratio * 0.9;
      const s = Math.max(0.05, p.mesh.scale.x + p.grow * dt);
      p.mesh.scale.setScalar(s);
    }

    // Update tracers
    for (let i = 0; i < MAX_TRACERS; i++) {
      const t = tracers[i];
      if (!t.active) continue;
      t.life -= dt;
      if (t.life <= 0) {
        t.active = false;
        t.line.visible = false;
      } else {
        t.line.material.opacity = t.life / t.maxLife;
      }
    }

    // Update & collect spinning pickups
    const ps = player ? player.state : null;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pk = pickups[i];
      pk.age += dt;
      pk.mesh.rotation.y = elapsed * 2.6 + i;
      pk.mesh.position.y = 0.8 + Math.sin(elapsed * 3.5 + i) * 0.18;

      if (ps && !ps.dead && !ps.busted && dist2D(ps.x, ps.z, pk.x, pk.z) < (ps.vehicle ? 3.2 : 1.9)) {
        if (pk.kind === 'cash') {
          ps.cash += pk.value;
          if (callbacks.onToast) callbacks.onToast(`+$${pk.value} Cash`);
        } else if (pk.kind === 'health') {
          ps.hp = Math.min(ps.maxHp, ps.hp + pk.value);
          if (callbacks.onToast) callbacks.onToast(`+${pk.value} Health`);
        } else if (pk.kind === 'armor') {
          ps.armor = Math.min(ps.maxArmor, ps.armor + pk.value);
          if (callbacks.onToast) callbacks.onToast(`+${pk.value} Body Armor`);
        }
        if (audio) audio.playPickup();
        scene.remove(pk.mesh);
        pickups.splice(i, 1);
      }
    }
  }

  return {
    pickups,
    spawnSmoke,
    spawnSparks,
    spawnExplosion,
    spawnTracer,
    spawnPickup,
    spawnStarterPickups,
    update,
  };
}
