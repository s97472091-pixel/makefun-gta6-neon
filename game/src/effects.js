// Solana Bay — Pooled 3D Particles, Tracers, Muzzle Flashes, Explosions & Siren Glows
import * as THREE from 'three';

function createGlowTexture(innerColor = '#ffffff', outerColor = 'rgba(255,100,50,0)') {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, innerColor);
  g.addColorStop(0.45, outerColor.replace(',0)', ',0.55)'));
  g.addColorStop(1, outerColor);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createEffectsSystem(scene) {
  const particles = [];
  const tracers = [];
  const flashes = [];

  const sphereGeo = new THREE.SphereGeometry(0.32, 6, 6);
  const sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0xd1d5db, transparent: true, opacity: 0.55 });
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff6b2b, transparent: true, opacity: 0.9 });
  const flashTex = createGlowTexture('#fffbeb', 'rgba(255,170,40,0)');

  // Pre-build a pool of reusable particle meshes
  const poolSize = 90;
  const pool = [];
  for (let i = 0; i < poolSize; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(i % 2 === 0 ? sphereGeo : sparkGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    pool.push({
      mesh,
      mat,
      active: false,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1,
      gravity: 0,
      grow: 0,
    });
  }

  function acquireParticle() {
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].active) return pool[i];
    }
    return pool[0];
  }

  function spawnParticle({ x, y, z, vx, vy, vz, color, life, scale = 1, gravity = 0, grow = 0 }) {
    const p = acquireParticle();
    p.active = true;
    p.mesh.visible = true;
    p.mesh.position.set(x, y, z);
    p.mesh.scale.setScalar(scale);
    p.mat.color.setHex(color);
    p.mat.opacity = 0.9;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = life;
    p.maxLife = life;
    p.gravity = gravity;
    p.grow = grow;
    if (!particles.includes(p)) particles.push(p);
  }

  function spawnTireSmoke(x, y, z) {
    spawnParticle({
      x: x + (Math.random() - 0.5) * 0.5,
      y,
      z: z + (Math.random() - 0.5) * 0.5,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 0.8 + Math.random() * 0.6,
      vz: (Math.random() - 0.5) * 1.4,
      color: 0xe2e8f0,
      life: 0.65,
      scale: 0.9,
      gravity: -0.3,
      grow: 2.2,
    });
  }

  function spawnSparks(x, y, z, count = 6, color = 0xfbbf24) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 5.5;
      spawnParticle({
        x,
        y,
        z,
        vx: Math.cos(ang) * spd,
        vy: 1.8 + Math.random() * 3.8,
        vz: Math.sin(ang) * spd,
        color,
        life: 0.35 + Math.random() * 0.25,
        scale: 0.85,
        gravity: 11,
        grow: -0.5,
      });
    }
  }

  function spawnExplosion(x, y, z) {
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 9;
      spawnParticle({
        x,
        y: y + 0.3,
        z,
        vx: Math.cos(ang) * spd,
        vy: 2 + Math.random() * 8,
        vz: Math.sin(ang) * spd,
        color: i % 3 === 0 ? 0xfef08a : i % 2 === 0 ? 0xff5a1f : 0x4b5563,
        life: 0.6 + Math.random() * 0.55,
        scale: 1.8,
        gravity: 4,
        grow: 3.4,
      });
    }
    spawnMuzzleFlash(x, y + 0.8, z, 5.2, 0.28);
  }

  function spawnMuzzleFlash(x, y, z, size = 1.65, duration = 0.09) {
    const mat = new THREE.SpriteMaterial({
      map: flashTex,
      color: 0xffd166,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(size, size, 1);
    scene.add(sprite);
    flashes.push({ sprite, mat, life: duration, maxLife: duration });
    return sprite;
  }

  function spawnTracer(x1, y1, z1, x2, y2, z2, color = 0xffe066, duration = 0.08) {
    const points = [new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.92 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    tracers.push({ line, geo, mat, life: duration, maxLife: duration });
    return line;
  }

  function update(dt) {
    for (let i = 0; i < particles.length; i++) {
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
      if (p.grow !== 0) {
        const s = Math.max(0.15, p.mesh.scale.x + p.grow * dt);
        p.mesh.scale.setScalar(s);
      }
      p.mat.opacity = Math.max(0, (p.life / p.maxLife) * 0.85);
    }

    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        scene.remove(t.line);
        t.geo.dispose();
        t.mat.dispose();
        tracers.splice(i, 1);
      } else {
        t.mat.opacity = t.life / t.maxLife;
      }
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.life -= dt;
      if (f.life <= 0) {
        scene.remove(f.sprite);
        f.mat.dispose();
        flashes.splice(i, 1);
      } else {
        f.mat.opacity = f.life / f.maxLife;
      }
    }
  }

  return {
    smokeMat,
    fireMat,
    spawnTireSmoke,
    spawnSparks,
    spawnExplosion,
    spawnMuzzleFlash,
    spawnTracer,
    update,
  };
}
