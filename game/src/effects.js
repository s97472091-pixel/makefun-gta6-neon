// Visual particle effects: muzzle flashes, bullet tracers, tire smoke, sparks, explosions & cash pickups.
import * as THREE from 'three';

export function createEffects(scene) {
  const particles = [];
  const tracers = [];
  const pickups = [];

  const boxGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  const sparkGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  const cashGeo = new THREE.BoxGeometry(0.62, 0.2, 0.34);
  const cashMat = new THREE.MeshBasicMaterial({ color: 0x4ef09c });
  const medGeo = new THREE.BoxGeometry(0.56, 0.42, 0.42);
  const medMat = new THREE.MeshBasicMaterial({ color: 0xff5e7e });

  function spawnParticle(x, y, z, vx, vy, vz, color, size, life, gravity = 0) {
    if (particles.length > 160) return;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 });
    const mesh = new THREE.Mesh(size < 0.25 ? sparkGeo : boxGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(size);
    scene.add(mesh);
    particles.push({ mesh, vx, vy, vz, life, maxLife: life, gravity, size });
  }

  function spawnSmoke(x, y, z, color = 0xdddddd, size = 0.65) {
    spawnParticle(
      x + (Math.random() - 0.5) * 0.5,
      y,
      z + (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 1.2,
      1.6 + Math.random() * 1.2,
      (Math.random() - 0.5) * 1.2,
      color,
      size,
      0.65 + Math.random() * 0.35,
      -0.8
    );
  }

  function spawnSparks(x, y, z, count = 6, color = 0xffd166) {
    for (let i = 0; i < count; i++) {
      spawnParticle(
        x, y, z,
        (Math.random() - 0.5) * 11,
        2.5 + Math.random() * 6,
        (Math.random() - 0.5) * 11,
        color,
        0.22,
        0.28 + Math.random() * 0.22,
        18
      );
    }
  }

  function spawnExplosion(x, y, z) {
    for (let i = 0; i < 24; i++) {
      const col = i % 3 === 0 ? 0xff4500 : i % 3 === 1 ? 0xffb703 : 0x2a2a32;
      spawnParticle(
        x + (Math.random() - 0.5) * 1.4,
        y + 0.4,
        z + (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 16,
        4 + Math.random() * 11,
        (Math.random() - 0.5) * 16,
        col,
        0.8 + Math.random() * 1.1,
        0.55 + Math.random() * 0.55,
        12
      );
    }
  }

  function spawnTracer(x0, y0, z0, x1, y1, z1, color = 0xffe48a) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x0, y0, z0),
      new THREE.Vector3(x1, y1, z1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geom, mat);
    scene.add(line);
    tracers.push({ line, life: 0.085 });
  }

  function spawnPickup(x, z, kind = 'cash', value = 75) {
    const mesh = new THREE.Mesh(kind === 'med' ? medGeo : cashGeo, kind === 'med' ? medMat : cashMat);
    mesh.position.set(x, 0.65, z);
    scene.add(mesh);
    pickups.push({ mesh, x, z, kind, value, age: 0 });
  }

  function update(dt, playerState, onPickup) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const ratio = p.life / p.maxLife;
      p.mesh.material.opacity = ratio * 0.9;
      p.mesh.scale.setScalar(p.size * (1.3 - ratio * 0.4));
    }

    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        tracers.splice(i, 1);
      } else {
        t.line.material.opacity = t.life / 0.085;
      }
    }

    for (let i = pickups.length - 1; i >= 0; i--) {
      const pk = pickups[i];
      pk.age += dt;
      pk.mesh.rotation.y += dt * 2.6;
      pk.mesh.position.y = 0.65 + Math.sin(pk.age * 4) * 0.14;
      const dist = Math.hypot(pk.x - playerState.x, pk.z - playerState.z);
      if (dist < 2.2) {
        scene.remove(pk.mesh);
        pickups.splice(i, 1);
        onPickup?.(pk);
      } else if (pk.age > 45) {
        scene.remove(pk.mesh);
        pickups.splice(i, 1);
      }
    }
  }

  return {
    spawnSmoke,
    spawnSparks,
    spawnExplosion,
    spawnTracer,
    spawnPickup,
    update,
  };
}
