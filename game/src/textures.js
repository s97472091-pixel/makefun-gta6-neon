// Procedural CanvasTexture generators for Solana Bay (zero network requests or external images).

import * as THREE from 'three';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function finalizeTexture(canvas, { repeatX = 1, repeatY = 1, srgb = true, nearest = false } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (nearest) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
  }
  tex.needsUpdate = true;
  return tex;
}

function addNoise(ctx, w, h, alpha = 0.06, step = 4, seed = 13) {
  let s = seed >>> 0;
  const rand = () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const v = Math.floor(rand() * 255);
      ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
      ctx.fillRect(x, y, step, step);
    }
  }
}

export function createAsphaltTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2d3138';
  ctx.fillRect(0, 0, 256, 256);
  addNoise(ctx, 256, 256, 0.075, 2, 101);

  // Subtle tire wear lanes
  ctx.fillStyle = 'rgba(20, 22, 26, 0.25)';
  ctx.fillRect(46, 0, 32, 256);
  ctx.fillRect(178, 0, 32, 256);

  // Double amber center line
  ctx.fillStyle = '#f2b749';
  ctx.fillRect(123, 0, 3, 256);
  ctx.fillRect(130, 0, 3, 256);

  // Subtle shoulder markings
  ctx.fillStyle = 'rgba(240, 240, 240, 0.35)';
  ctx.fillRect(8, 0, 3, 256);
  ctx.fillRect(245, 0, 3, 256);

  return finalizeTexture(c);
}

export function createIntersectionTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2c3037';
  ctx.fillRect(0, 0, 256, 256);
  addNoise(ctx, 256, 256, 0.07, 2, 202);

  // Zebra crosswalk stripes on all 4 borders
  ctx.fillStyle = 'rgba(242, 244, 248, 0.85)';
  for (let i = 28; i <= 216; i += 24) {
    ctx.fillRect(i, 6, 13, 28);
    ctx.fillRect(i, 222, 13, 28);
    ctx.fillRect(6, i, 28, 13);
    ctx.fillRect(222, i, 28, 13);
  }

  // Stop bars
  ctx.fillStyle = 'rgba(245, 245, 245, 0.55)';
  ctx.fillRect(36, 39, 184, 4);
  ctx.fillRect(36, 213, 184, 4);
  ctx.fillRect(39, 36, 4, 184);
  ctx.fillRect(213, 36, 4, 184);

  return finalizeTexture(c);
}

export function createSidewalkTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d4cabd';
  ctx.fillRect(0, 0, 256, 256);
  addNoise(ctx, 256, 256, 0.055, 3, 303);

  ctx.strokeStyle = 'rgba(110, 102, 92, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  // Sun-warmed terrazzo speckles
  ctx.fillStyle = 'rgba(255, 245, 232, 0.25)';
  for (let i = 0; i < 120; i++) {
    const x = (i * 53) % 256;
    const y = (i * 97) % 256;
    ctx.fillRect(x, y, 2, 2);
  }

  return finalizeTexture(c, { repeatX: 4, repeatY: 4 });
}

export function createBoardwalkTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a87b54';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 16) {
    const shade = ((y / 16) % 3) * 8 - 8;
    ctx.fillStyle = `rgb(${168 + shade}, ${123 + shade}, ${84 + Math.floor(shade * 0.7)})`;
    ctx.fillRect(0, y, 256, 15);
    ctx.fillStyle = 'rgba(54, 34, 20, 0.45)';
    ctx.fillRect(0, y + 15, 256, 1);

    // Plank seam
    const seamX = ((y * 7) % 192) + 32;
    ctx.fillRect(seamX, y, 2, 15);
  }
  addNoise(ctx, 256, 256, 0.05, 2, 404);
  return finalizeTexture(c, { repeatX: 2, repeatY: 22 });
}

export function createSandTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ebd4a2';
  ctx.fillRect(0, 0, 256, 256);

  // Wind ripples
  ctx.fillStyle = 'rgba(220, 190, 134, 0.35)';
  for (let y = 0; y < 256; y += 14) {
    ctx.fillRect(0, y, 256, 4);
  }
  addNoise(ctx, 256, 256, 0.065, 2, 505);
  return finalizeTexture(c, { repeatX: 6, repeatY: 20 });
}

export function createFacadeTexture(style, baseColor, accentColor, seed = 1) {
  const c = makeCanvas(256, 512);
  const ctx = c.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 512);
  addNoise(ctx, 256, 512, 0.035, 3, seed * 31 + 17);

  let s = (seed * 9973 + 11) >>> 0;
  const rand = () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };

  if (style === 'deco') {
    // Art Deco pastel bands, curved-feel cornices, turquoise trim & warm lit windows
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, 256, 18);
    ctx.fillRect(0, 248, 256, 10);
    ctx.fillRect(0, 444, 256, 8);

    // Vertical pilasters
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fillRect(10, 18, 12, 426);
    ctx.fillRect(122, 18, 12, 426);
    ctx.fillRect(234, 18, 12, 426);

    for (let row = 0; row < 6; row++) {
      const wy = 34 + row * 68;
      // Eyebrow overhang
      ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.fillRect(26, wy - 6, 204, 5);
      for (let col = 0; col < 4; col++) {
        const wx = 32 + col * 50;
        const lit = rand() > 0.45;
        ctx.fillStyle = lit ? '#ffdf9e' : '#2d4756';
        ctx.fillRect(wx, wy, 34, 42);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, wy, 34, 42);
        // Venetian blinds line
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(wx + 2, wy + 14, 30, 3);
      }
    }

    // Ground-floor coastal storefront awning
    ctx.fillStyle = '#253342';
    ctx.fillRect(20, 458, 216, 48);
    ctx.fillStyle = accentColor;
    ctx.fillRect(14, 452, 228, 12);
    ctx.fillStyle = '#ffe9b8';
    ctx.fillRect(32, 468, 76, 30);
    ctx.fillRect(148, 468, 76, 30);
  } else if (style === 'glass') {
    // Sleek downtown curtain wall with sky reflection gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#a6d2ec');
    grad.addColorStop(0.45, '#467494');
    grad.addColorStop(1, '#1d3448');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    // Subtle diagonal sky sheen
    ctx.fillStyle = 'rgba(255, 250, 235, 0.14)';
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.lineTo(256, 20);
    ctx.lineTo(256, 140);
    ctx.lineTo(0, 240);
    ctx.closePath();
    ctx.fill();

    // Mullion grid and interior office glows
    for (let row = 0; row < 12; row++) {
      const y = row * 40;
      for (let col = 0; col < 6; col++) {
        const x = col * 42 + 2;
        if (rand() > 0.62) {
          ctx.fillStyle = 'rgba(255, 226, 165, 0.42)';
          ctx.fillRect(x + 3, y + 6, 34, 24);
        }
      }
      ctx.fillStyle = 'rgba(20, 32, 44, 0.65)';
      ctx.fillRect(0, y, 256, 5);
    }
    for (let col = 0; col <= 6; col++) {
      ctx.fillStyle = 'rgba(18, 28, 38, 0.55)';
      ctx.fillRect(col * 42, 0, 4, 512);
    }

    // Lobby entrance
    ctx.fillStyle = '#182430';
    ctx.fillRect(0, 460, 256, 52);
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 456, 256, 5);
    ctx.fillStyle = 'rgba(255, 232, 180, 0.65)';
    ctx.fillRect(34, 468, 188, 38);
  } else if (style === 'industrial') {
    // Corrugated harbor warehouses & concrete pilasters
    for (let x = 0; x < 256; x += 8) {
      ctx.fillStyle = x % 16 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, 0, 4, 512);
    }
    ctx.fillStyle = 'rgba(40, 35, 32, 0.35)';
    ctx.fillRect(0, 310, 256, 202);

    // Hazard stripe band
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 304, 256, 10);

    // Clerestory warehouse windows
    for (let row = 0; row < 3; row++) {
      const wy = 48 + row * 82;
      for (let col = 0; col < 3; col++) {
        const wx = 20 + col * 76;
        ctx.fillStyle = rand() > 0.5 ? '#f7cf86' : '#2a3338';
        ctx.fillRect(wx, wy, 58, 36);
        ctx.strokeStyle = '#3d3935';
        ctx.lineWidth = 3;
        ctx.strokeRect(wx, wy, 58, 36);
      }
    }

    // Roll-up freight bay doors
    for (let i = 0; i < 2; i++) {
      const dx = 22 + i * 118;
      ctx.fillStyle = '#4e555b';
      ctx.fillRect(dx, 354, 92, 158);
      for (let sy = 364; sy < 510; sy += 12) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(dx, sy, 92, 3);
      }
    }
  } else {
    // Sunset Palms warm stucco mid-rise apartments with balconies
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, 256, 14);
    for (let row = 0; row < 6; row++) {
      const wy = 34 + row * 68;
      for (let col = 0; col < 3; col++) {
        const wx = 18 + col * 78;
        ctx.fillStyle = rand() > 0.42 ? '#ffd98e' : '#323f4b';
        ctx.fillRect(wx, wy, 58, 38);
        ctx.strokeStyle = '#f4ead8';
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, wy, 58, 38);
        // Balcony rail
        ctx.fillStyle = 'rgba(42, 34, 30, 0.65)';
        ctx.fillRect(wx - 4, wy + 28, 66, 12);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(wx - 4, wy + 28, 66, 2);
      }
    }
    // Street-level bodega / cafe strip
    ctx.fillStyle = '#332824';
    ctx.fillRect(14, 446, 228, 66);
    ctx.fillStyle = accentColor;
    ctx.fillRect(10, 440, 236, 10);
    ctx.fillStyle = '#ffe5ad';
    ctx.fillRect(28, 458, 84, 38);
    ctx.fillRect(144, 458, 84, 38);
  }

  return finalizeTexture(c);
}

export function createNeonSignTexture(text, color = '#ff4fa3', bg = '#151026') {
  const c = makeCanvas(256, 96);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 96);

  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.strokeRect(8, 8, 240, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 49);

  return finalizeTexture(c, { repeatX: 1, repeatY: 1 });
}

export function createWaterTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, '#2ec4b6');
  grad.addColorStop(0.35, '#1ca3b8');
  grad.addColorStop(1, '#0b5f8a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  for (let y = 8; y < 256; y += 18) {
    const x = (y * 13) % 180;
    ctx.fillRect(x, y, 52, 3);
  }
  return finalizeTexture(c, { repeatX: 3, repeatY: 16 });
}

export function createTexturePack() {
  const asphalt = createAsphaltTexture();
  const intersection = createIntersectionTexture();
  const sidewalk = createSidewalkTexture();
  const boardwalk = createBoardwalkTexture();
  const sand = createSandTexture();
  const water = createWaterTexture();

  const facades = {
    deco: [
      createFacadeTexture('deco', '#f7d8c6', '#2ec4b6', 1),
      createFacadeTexture('deco', '#fad0dd', '#ff5e99', 2),
      createFacadeTexture('deco', '#d8f3ee', '#ff9f43', 3),
      createFacadeTexture('deco', '#f5e6be', '#00bbf9', 4),
    ],
    glass: [
      createFacadeTexture('glass', '#789bb8', '#38d9ff', 11),
      createFacadeTexture('glass', '#5f82a0', '#ffd166', 12),
      createFacadeTexture('glass', '#8fb2cc', '#69f0ae', 13),
    ],
    industrial: [
      createFacadeTexture('industrial', '#866b59', '#f4a261', 21),
      createFacadeTexture('industrial', '#6d757c', '#ff9f43', 22),
      createFacadeTexture('industrial', '#8a6252', '#e76f51', 23),
    ],
    residential: [
      createFacadeTexture('residential', '#e5b889', '#ff6b6b', 31),
      createFacadeTexture('residential', '#d99e7c', '#ffd166', 32),
      createFacadeTexture('residential', '#e6c999', '#3a86ff', 33),
    ],
  };

  const neonSigns = [
    createNeonSignTexture('PALMA LOUNGE', '#ff4fa3', '#1a0e29'),
    createNeonSignTexture('CORAL MOTEL', '#2ef2e0', '#0d2229'),
    createNeonSignTexture('SOLANA CLUB', '#ffbe0b', '#22170a'),
    createNeonSignTexture('BAY COFFEE', '#ff6e7f', '#241118'),
    createNeonSignTexture('ALTA BANK', '#38d9ff', '#0c1c2c'),
    createNeonSignTexture('DOCK 9 BAR', '#ff9f43', '#23160c'),
    createNeonSignTexture('SURF & INK', '#a594f9', '#19132e'),
    createNeonSignTexture('EL MIRAGE', '#00f5d4', '#0e2420'),
  ];

  const specialSigns = {
    respray: createNeonSignTexture('PALMA SPRAY', '#ffbe0b', '#231a08'),
    armory: createNeonSignTexture('IRONWORKS', '#ff4d6d', '#240b12'),
  };

  return {
    asphalt,
    intersection,
    sidewalk,
    boardwalk,
    sand,
    water,
    facades,
    neonSigns,
    specialSigns,
  };
}
