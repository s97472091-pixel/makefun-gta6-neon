// Solana Bay — Procedural CanvasTexture Generators
import * as THREE from 'three';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

function toTexture(canvas, repeatX = 1, repeatY = 1, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function createAsphaltTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#252932';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1800; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    const shade = 30 + ((i * 29) % 24);
    ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 6})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Curb lane lines
  ctx.fillStyle = 'rgba(235, 240, 248, 0.35)';
  ctx.fillRect(10, 0, 4, 256);
  ctx.fillRect(242, 0, 4, 256);

  // Double amber centerline
  ctx.fillStyle = '#eab308';
  ctx.fillRect(123, 0, 4, 256);
  ctx.fillRect(130, 0, 4, 256);

  // Subtle dashed lane divider
  ctx.fillStyle = 'rgba(241, 245, 249, 0.45)';
  for (let y = 12; y < 256; y += 44) {
    ctx.fillRect(66, y, 3, 22);
    ctx.fillRect(187, y, 3, 22);
  }

  return toTexture(canvas, 1, 1);
}

export function createCrosswalkTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#232730';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 900; i++) {
    const x = (i * 97) % 256;
    const y = (i * 53) % 256;
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
  for (let x = 22; x < 236; x += 28) {
    ctx.fillRect(x, 12, 16, 36);
    ctx.fillRect(x, 208, 16, 36);
  }
  for (let y = 22; y < 236; y += 28) {
    ctx.fillRect(12, y, 36, 16);
    ctx.fillRect(208, y, 36, 16);
  }
  return toTexture(canvas, 1, 1);
}

export function createSidewalkTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#c8c3b8';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(84, 80, 74, 0.35)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  for (let i = 0; i < 800; i++) {
    const x = (i * 41) % 256;
    const y = (i * 83) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(40,35,30,0.05)';
    ctx.fillRect(x, y, 2, 2);
  }
  return toTexture(canvas, 4, 4);
}

export function createFacadeTexture(style, seed = 1, nightLit = false) {
  const { canvas, ctx } = makeCanvas(256, 512);
  const palettes = {
    artdeco: ['#f6d6bd', '#f4b998', '#ffd8be', '#b8e0d2', '#f7cad0'],
    glass: ['#243b55', '#1b3a4b', '#1e293b', '#274c77', '#2b2d42'],
    industrial: ['#7f6a58', '#6c757d', '#8d5b4c', '#5c677d', '#6f5e53'],
    market: ['#f2c57c', '#e6a57e', '#e07a5f', '#f4d35e', '#d4a373'],
    modern: ['#e2e8f0', '#cbd5e1', '#d6d3d1', '#dbeafe', '#e7e5e4'],
  };
  const list = palettes[style] || palettes.artdeco;
  const base = list[Math.abs(seed) % list.length];
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 512);

  if (style === 'artdeco') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 14);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(0, 16, 256, 7);
    ctx.fillStyle = '#2ec4b6';
    ctx.fillRect(0, 25, 256, 5);
  } else if (style === 'glass') {
    const grad = ctx.createLinearGradient(0, 0, 256, 512);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.5, base);
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);
  } else if (style === 'industrial') {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < 512; y += 16) ctx.fillRect(0, y, 256, 2);
  }

  const cols = style === 'glass' ? 6 : 4;
  const rows = style === 'glass' ? 12 : 9;
  const padX = 16;
  const padY = 42;
  const stepX = (256 - padX * 2) / cols;
  const stepY = (512 - padY - 26) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = padX + c * stepX + 4;
      const wy = padY + r * stepY + 4;
      const ww = stepX - 8;
      const wh = stepY - 10;
      const hash = ((r * 31 + c * 17 + seed * 13) & 255) / 255;
      if (nightLit) {
        ctx.fillStyle = hash > 0.35 ? (hash > 0.72 ? '#ffe082' : '#7dd3fc') : '#111827';
      } else {
        ctx.fillStyle =
          style === 'glass'
            ? hash > 0.5
              ? '#7dd3fc'
              : '#1e3a5f'
            : hash > 0.75
            ? '#fef08a'
            : '#27364a';
      }
      ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, wy, ww, wh);
    }
  }

  // Ground-floor storefront awning band
  ctx.fillStyle = style === 'market' ? '#d90429' : style === 'artdeco' ? '#0ea5e9' : '#1e293b';
  ctx.fillRect(0, 466, 256, 46);
  ctx.fillStyle = nightLit ? '#fde047' : '#bae6fd';
  for (let x = 16; x < 240; x += 58) {
    ctx.fillRect(x, 476, 42, 26);
  }

  return toTexture(canvas, 1, 1);
}

export function createNeonSignTexture(text, bgColor = '#111827', neonColor = '#ff4d6d') {
  const { canvas, ctx } = makeCanvas(512, 128);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = neonColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = neonColor;
  ctx.lineWidth = 2;
  ctx.strokeText(text, 256, 66);

  return toTexture(canvas, 1, 1);
}

export function createSandTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#f2d398';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const x = (i * 67) % 256;
    const y = (i * 113) % 256;
    ctx.fillStyle = i % 3 === 0 ? '#e6c07b' : '#f9e3b4';
    ctx.fillRect(x, y, 2, 2);
  }
  return toTexture(canvas, 16, 4);
}

export function createBoardwalkTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#b07d4f';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    ctx.fillStyle = y % 32 === 0 ? '#a46f42' : '#bc8858';
    ctx.fillRect(0, y, 256, 14);
    ctx.fillStyle = '#6c492a';
    ctx.fillRect(0, y + 14, 256, 2);
  }
  return toTexture(canvas, 24, 2);
}

export function createCanopyTexture(primary = '#ef4444', secondary = '#fef3c7') {
  const { canvas, ctx } = makeCanvas(256, 128);
  const stripeW = 32;
  for (let x = 0; x < 256; x += stripeW) {
    ctx.fillStyle = (x / stripeW) % 2 === 0 ? primary : secondary;
    ctx.fillRect(x, 0, stripeW, 128);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(0, 108, 256, 20);
  return toTexture(canvas, 1, 1);
}

export function createOceanTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0ea5e9');
  grad.addColorStop(0.5, '#0284c7');
  grad.addColorStop(1, '#0369a1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(224, 242, 254, 0.28)';
  ctx.lineWidth = 3;
  for (let y = 16; y < 256; y += 28) {
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const waveY = y + Math.sin((x / 256) * Math.PI * 4 + y) * 3;
      if (x === 0) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }
  return toTexture(canvas, 18, 8);
}

export function createTexturePack() {
  const styles = ['artdeco', 'glass', 'industrial', 'market', 'modern'];
  const facadesDay = {};
  const facadesNight = {};
  for (const st of styles) {
    facadesDay[st] = [0, 1, 2].map((i) => createFacadeTexture(st, i + 1, false));
    facadesNight[st] = [0, 1, 2].map((i) => createFacadeTexture(st, i + 1, true));
  }

  return {
    asphalt: createAsphaltTexture(),
    crosswalk: createCrosswalkTexture(),
    sidewalk: createSidewalkTexture(),
    sand: createSandTexture(),
    boardwalk: createBoardwalkTexture(),
    ocean: createOceanTexture(),
    canopies: [
      createCanopyTexture('#e11d48', '#fef3c7'),
      createCanopyTexture('#f59e0b', '#fffbeb'),
      createCanopyTexture('#0d9488', '#ecfeff'),
      createCanopyTexture('#7c3aed', '#f5f3ff'),
    ],
    neonSigns: [
      createNeonSignTexture('PASAR SENJA', '#190a14', '#ff4d6d'),
      createNeonSignTexture('SATAY & NOODLES', '#1b1106', '#ffb703'),
      createNeonSignTexture('MIRAMAR PALMS', '#091a24', '#22d3ee'),
      createNeonSignTexture('SOLANA LOUNGE', '#1a0b2e', '#e879f9'),
      createNeonSignTexture('NORI RESPRAY', '#0b192c', '#38bdf8'),
      createNeonSignTexture('CORAL ARMORY', '#1c1208', '#fb923c'),
    ],
    facadesDay,
    facadesNight,
  };
}
