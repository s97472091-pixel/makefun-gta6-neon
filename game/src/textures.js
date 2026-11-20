// Solana Bay — Procedural CanvasTexture generators (zero external image files)
import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { canvas: c, ctx: c.getContext('2d') };
}

function finalizeTexture(canvas, repeatX = 1, repeatY = 1, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb && 'SRGBColorSpace' in THREE) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function addNoise(ctx, w, h, alpha = 0.06, step = 2) {
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const v = ((x * 73856093) ^ (y * 19349663)) & 255;
      const shade = v > 128 ? 255 : 0;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${(v / 255) * alpha})`;
      ctx.fillRect(x, y, step, step);
    }
  }
}

export function createAsphaltTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#2b2f38';
  ctx.fillRect(0, 0, 256, 256);
  addNoise(ctx, 256, 256, 0.08, 2);

  // Subtle tire wear tracks
  ctx.fillStyle = 'rgba(20,22,28,0.22)';
  ctx.fillRect(46, 0, 26, 256);
  ctx.fillRect(184, 0, 26, 256);

  // Outer shoulder curb strips
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(8, 0, 4, 256);
  ctx.fillRect(244, 0, 4, 256);

  // Double amber centerline
  ctx.fillStyle = '#f2b84b';
  ctx.fillRect(122, 0, 4, 256);
  ctx.fillRect(130, 0, 4, 256);

  // Dashed white lane dividers
  ctx.fillStyle = 'rgba(245,247,250,0.75)';
  for (let y = 16; y < 256; y += 64) {
    ctx.fillRect(62, y, 3, 28);
    ctx.fillRect(191, y, 3, 28);
  }

  return finalizeTexture(canvas, 1, 1);
}

export function createIntersectionTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#292d36';
  ctx.fillRect(0, 0, 256, 256);
  addNoise(ctx, 256, 256, 0.08, 2);

  // Crisp zebra crosswalks on all 4 edges
  ctx.fillStyle = '#edf1f7';
  const stripeCount = 7;
  const start = 30;
  const span = 196;
  const step = span / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    const pos = start + i * step + 4;
    // Top & bottom crosswalks
    ctx.fillRect(pos, 8, step * 0.56, 28);
    ctx.fillRect(pos, 220, step * 0.56, 28);
    // Left & right crosswalks
    ctx.fillRect(8, pos, 28, step * 0.56);
    ctx.fillRect(220, pos, 28, step * 0.56);
  }

  // Stop bars
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillRect(28, 42, 92, 4);
  ctx.fillRect(136, 210, 92, 4);
  ctx.fillRect(42, 136, 4, 92);
  ctx.fillRect(210, 28, 4, 92);

  return finalizeTexture(canvas, 1, 1);
}

export function createSidewalkTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#d6cfc2';
  ctx.fillRect(0, 0, 256, 256);
  addNoise(ctx, 256, 256, 0.05, 2);

  // Warm coastal concrete pavers
  ctx.strokeStyle = 'rgba(110,100,88,0.32)';
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

  // Subtle tile bevel highlight
  ctx.strokeStyle = 'rgba(255,252,244,0.38)';
  ctx.lineWidth = 1;
  for (let i = 2; i < 256; i += 64) {
    ctx.strokeRect(i, i, 60, 60);
  }

  return finalizeTexture(canvas, 4, 4);
}

export function createBoardwalkTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#b9895b';
  ctx.fillRect(0, 0, 256, 256);

  // Sun-bleached horizontal timber planks
  for (let y = 0; y < 256; y += 16) {
    const tone = ((y * 17) % 24) - 12;
    ctx.fillStyle = `rgb(${182 + tone}, ${134 + tone}, ${90 + tone})`;
    ctx.fillRect(0, y, 256, 15);
    ctx.fillStyle = 'rgba(72,46,24,0.45)';
    ctx.fillRect(0, y + 15, 256, 1);
    // Plank seam
    const seam = (y * 37) % 220 + 18;
    ctx.fillRect(seam, y, 2, 16);
  }
  addNoise(ctx, 256, 256, 0.05, 2);
  return finalizeTexture(canvas, 3, 18);
}

export function createSandTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#efd39c';
  ctx.fillRect(0, 0, 256, 256);

  // Gentle wind ripples
  ctx.strokeStyle = 'rgba(214,174,108,0.38)';
  ctx.lineWidth = 3;
  for (let y = 12; y < 256; y += 22) {
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const dy = Math.sin((x / 256) * Math.PI * 2 + y * 0.1) * 3;
      if (x === 0) ctx.moveTo(x, y + dy);
      else ctx.lineTo(x, y + dy);
    }
    ctx.stroke();
  }
  addNoise(ctx, 256, 256, 0.07, 2);
  return finalizeTexture(canvas, 6, 24);
}

export function createFacadeTexture(style, baseHex, accentHex = '#38e8ff') {
  const { canvas, ctx } = makeCanvas(256, 512);

  if (style === 'artdeco') {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 512);
    addNoise(ctx, 256, 512, 0.035, 2);

    // Art Deco horizontal speed-lines & accent stripes
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 12, 256, 10);
    ctx.fillRect(0, 28, 256, 4);
    ctx.fillRect(0, 444, 256, 8);

    // Recessed pastel ribs
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let x = 8; x < 256; x += 64) {
      ctx.fillRect(x, 42, 8, 396);
    }

    // Arched / rounded hotel windows with teal reflection
    for (let row = 0; row < 7; row++) {
      const y = 52 + row * 56;
      for (let col = 0; col < 4; col++) {
        const x = 22 + col * 60;
        // Eyebrow awning
        ctx.fillStyle = accentHex;
        ctx.fillRect(x - 3, y - 5, 38, 5);
        // Window glass
        const lit = ((row * 7 + col * 3) % 5) === 0;
        const grad = ctx.createLinearGradient(x, y, x, y + 36);
        if (lit) {
          grad.addColorStop(0, '#ffe8a8');
          grad.addColorStop(1, '#f4a261');
        } else {
          grad.addColorStop(0, '#2a5a75');
          grad.addColorStop(1, '#58a4b0');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, 32, 36);
        // Mullion
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 32, 36);
      }
    }
    // Ground-floor lobby glass
    ctx.fillStyle = '#1e3244';
    ctx.fillRect(16, 460, 224, 48);
    ctx.fillStyle = accentHex;
    ctx.fillRect(16, 456, 224, 5);
  } else if (style === 'glass') {
    // Sleek coastal curtain-wall tower
    const bgGrad = ctx.createLinearGradient(0, 0, 256, 512);
    bgGrad.addColorStop(0, '#1f4961');
    bgGrad.addColorStop(0.45, baseHex);
    bgGrad.addColorStop(1, '#1a384c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 256, 512);

    // Glass reflection diagonal sheen
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.moveTo(0, 80);
    ctx.lineTo(256, 0);
    ctx.lineTo(256, 130);
    ctx.lineTo(0, 210);
    ctx.closePath();
    ctx.fill();

    // Window grid + interior office glow
    for (let row = 0; row < 12; row++) {
      const y = 8 + row * 42;
      for (let col = 0; col < 6; col++) {
        const x = 6 + col * 42;
        const hash = (row * 13 + col * 29) % 11;
        if (hash < 3) {
          ctx.fillStyle = 'rgba(255, 226, 150, 0.35)';
        } else if (hash < 6) {
          ctx.fillStyle = 'rgba(130, 232, 255, 0.28)';
        } else {
          ctx.fillStyle = 'rgba(15, 38, 56, 0.45)';
        }
        ctx.fillRect(x, y, 34, 30);
      }
      // Spandrel metallic band
      ctx.fillStyle = 'rgba(230,245,255,0.35)';
      ctx.fillRect(0, y + 32, 256, 6);
    }

    // Vertical aluminum mullions
    ctx.fillStyle = 'rgba(16,28,38,0.55)';
    for (let x = 0; x <= 256; x += 42) {
      ctx.fillRect(x, 0, 4, 512);
    }
  } else if (style === 'stucco') {
    // Calle Verde warm terracotta / stucco
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 512);
    addNoise(ctx, 256, 512, 0.06, 2);

    // Terracotta trim band
    ctx.fillStyle = '#c85a32';
    ctx.fillRect(0, 0, 256, 16);
    ctx.fillRect(0, 250, 256, 10);

    // Shuttered windows & wrought balconies
    for (let row = 0; row < 5; row++) {
      const y = 36 + row * 82;
      for (let col = 0; col < 3; col++) {
        const x = 22 + col * 80;
        // Shutters
        ctx.fillStyle = '#2e6f68';
        ctx.fillRect(x - 10, y, 10, 46);
        ctx.fillRect(x + 48, y, 10, 46);
        // Window
        ctx.fillStyle = ((row + col) % 3 === 0) ? '#f7d58b' : '#2c3e50';
        ctx.fillRect(x, y, 48, 46);
        ctx.strokeStyle = '#f5ebe0';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, 48, 46);
        // Balcony rail
        ctx.fillStyle = '#2c2623';
        ctx.fillRect(x - 8, y + 40, 64, 4);
      }
    }
    // Storefront awning
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = (x / 32) % 2 === 0 ? '#e76f51' : '#f4f1de';
      ctx.fillRect(x, 448, 32, 20);
    }
    ctx.fillStyle = '#242933';
    ctx.fillRect(14, 468, 228, 44);
  } else {
    // Industrial corrugated metal & concrete depot
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 512);
    // Vertical corrugation ribs
    for (let x = 0; x < 256; x += 8) {
      ctx.fillStyle = x % 16 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(x, 0, 4, 512);
    }
    // Lower concrete base
    ctx.fillStyle = '#575a61';
    ctx.fillRect(0, 340, 256, 172);
    // Hazard stripe
    ctx.fillStyle = '#f5a623';
    ctx.fillRect(0, 332, 256, 12);
    ctx.fillStyle = '#1f2329';
    for (let x = -12; x < 268; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 344);
      ctx.lineTo(x + 12, 344);
      ctx.lineTo(x + 20, 332);
      ctx.lineTo(x + 8, 332);
      ctx.closePath();
      ctx.fill();
    }
    // High clerestory warehouse windows
    for (let col = 0; col < 4; col++) {
      const x = 16 + col * 60;
      ctx.fillStyle = col % 2 === 0 ? '#ffd88a' : '#25313c';
      ctx.fillRect(x, 76, 44, 28);
      ctx.strokeStyle = '#1d2026';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, 76, 44, 28);
    }
    // Roll-up steel shutter door
    ctx.fillStyle = '#3d434d';
    ctx.fillRect(48, 372, 160, 140);
    for (let y = 382; y < 512; y += 14) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(48, y, 160, 2);
    }
  }

  return finalizeTexture(canvas, 1, 1);
}

export function createNeonSignTexture(text, colorHex = '#ff4f9a', bgHex = '#120d1d') {
  const { canvas, ctx } = makeCanvas(512, 128);
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);

  // Neon frame border
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 6;
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 18;
  ctx.strokeRect(10, 10, 492, 108);

  // Neon lettering
  ctx.font = '900 54px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 24;
  ctx.fillText(text, 256, 66);
  ctx.fillStyle = colorHex;
  ctx.globalAlpha = 0.45;
  ctx.fillText(text, 256, 66);
  ctx.globalAlpha = 1;

  const tex = finalizeTexture(canvas, 1, 1);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function createTextureLibrary() {
  const lib = {
    asphalt: createAsphaltTexture(),
    intersection: createIntersectionTexture(),
    sidewalk: createSidewalkTexture(),
    boardwalk: createBoardwalkTexture(),
    sand: createSandTexture(),
    facades: {
      artdeco: [
        createFacadeTexture('artdeco', '#f7d6d0', '#ff5e9c'),
        createFacadeTexture('artdeco', '#ffe9c7', '#2ce6d2'),
        createFacadeTexture('artdeco', '#d1f2eb', '#ff7eb3'),
        createFacadeTexture('artdeco', '#f4f0e8', '#ffb84d'),
      ],
      glass: [
        createFacadeTexture('glass', '#5aa6bf', '#38e8ff'),
        createFacadeTexture('glass', '#7ec8d9', '#ffd166'),
        createFacadeTexture('glass', '#4f8ea8', '#38e8ff'),
      ],
      stucco: [
        createFacadeTexture('stucco', '#e8a87c', '#ffb84d'),
        createFacadeTexture('stucco', '#f2cc8f', '#e76f51'),
        createFacadeTexture('stucco', '#d98a6c', '#2a9d8f'),
      ],
      industrial: [
        createFacadeTexture('industrial', '#7c7e85', '#ff7043'),
        createFacadeTexture('industrial', '#8c7465', '#f5a623'),
      ],
    },
    signs: {
      solamar: createNeonSignTexture('HOTEL SOLAMAR', '#ff5e9c', '#180d22'),
      customs: createNeonSignTexture('EL SOL CUSTOMS', '#2ce6d2', '#0b1c20'),
      armory: createNeonSignTexture('IRONWORKS ARMORY', '#ff9640', '#1d120a'),
      marina: createNeonSignTexture('CORAL KEY MARINA', '#38e8ff', '#091826'),
      club: createNeonSignTexture('PALMA LOUNGE', '#ff4f9a', '#1b0c24'),
      alba: createNeonSignTexture('ALBA TOWER', '#ffd166', '#101d2c'),
    },
  };
  return lib;
}
