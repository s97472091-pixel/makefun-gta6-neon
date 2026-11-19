// Procedural CanvasTexture generators — zero external image assets.
import * as THREE from 'three';

function makeCanvas(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createRoadTexture() {
  const tex = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2d313b';
    ctx.fillRect(0, 0, w, h);
    // Subtle asphalt grain
    for (let i = 0; i < 1600; i++) {
      const x = (i * 73) % w;
      const y = (i * 137) % h;
      const v = 36 + (i % 20);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 7})`;
      ctx.fillRect(x, y, 2, 2);
    }
    // Outer white lane edges
    ctx.fillStyle = 'rgba(245, 240, 228, 0.78)';
    ctx.fillRect(14, 0, 5, h);
    ctx.fillRect(w - 19, 0, 5, h);
    // Double amber center line
    ctx.fillStyle = '#f5b841';
    ctx.fillRect(w / 2 - 5, 0, 3, h);
    ctx.fillRect(w / 2 + 2, 0, 3, h);
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createIntersectionTexture() {
  return makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2b2f38';
    ctx.fillRect(0, 0, w, h);
    // Crosswalk stripes on all 4 edges
    ctx.fillStyle = 'rgba(244, 240, 230, 0.72)';
    for (let i = 28; i < w - 28; i += 24) {
      ctx.fillRect(i, 6, 12, 24);
      ctx.fillRect(i, h - 30, 12, 24);
      ctx.fillRect(6, i, 24, 12);
      ctx.fillRect(w - 30, i, 24, 12);
    }
  });
}

export function createSidewalkTexture() {
  const tex = makeCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d7ccb9';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(130, 118, 102, 0.42)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

export function createFacadeTexture(style, baseHex, seed = 1) {
  const tex = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);

    if (style === 'glass') {
      // Modern Midtown reflective curtain wall
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#365878');
      grad.addColorStop(0.55, '#27405c');
      grad.addColorStop(1, '#5d4766');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      const cols = 8, rows = 10;
      const cw = w / cols, rh = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = ((r * 13 + c * 7 + seed * 19) % 11) < 3;
          ctx.fillStyle = lit ? 'rgba(255, 224, 162, 0.72)' : 'rgba(135, 210, 232, 0.24)';
          ctx.fillRect(c * cw + 3, r * rh + 4, cw - 6, rh - 8);
        }
        // Horizontal spandrel band
        ctx.fillStyle = 'rgba(20, 28, 42, 0.55)';
        ctx.fillRect(0, r * rh, w, 3);
      }
      return;
    }

    if (style === 'industrial') {
      // Corrugated metal warehouse siding
      for (let x = 0; x < w; x += 8) {
        ctx.fillStyle = x % 16 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, 0, 4, h);
      }
      ctx.fillStyle = '#252a36';
      for (let c = 0; c < 4; c++) {
        ctx.fillRect(20 + c * 60, 24, 34, 24);
      }
      ctx.fillStyle = 'rgba(255, 168, 76, 0.85)';
      ctx.fillRect(0, h - 22, w, 10);
      return;
    }

    // Art Deco / Coastal Pastel residential & hotel facade
    // Horizontal decorative molding bands
    ctx.fillStyle = 'rgba(255, 250, 242, 0.32)';
    for (let y = 0; y < h; y += 32) {
      ctx.fillRect(0, y, w, 4);
    }
    const cols = 6, rows = 8;
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hash = (r * 17 + c * 31 + seed * 11) % 13;
        const warm = hash < 4;
        ctx.fillStyle = warm ? '#ffd89a' : '#2c4257';
        ctx.fillRect(c * cw + 8, r * rh + 7, cw - 16, rh - 13);
        // Window frame / balcony bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
        ctx.fillRect(c * cw + 6, r * rh + rh - 6, cw - 12, 3);
      }
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createNeonSignTexture(text, bgHex, glowHex) {
  return makeCanvas(256, 64, (ctx, w, h) => {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = glowHex;
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = glowHex;
    ctx.font = 'bold 28px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 1);
  });
}

export function createSandTexture() {
  const tex = makeCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#edd3a6';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,244,218,0.4)' : 'rgba(196,158,108,0.28)';
      ctx.fillRect((i * 53) % w, (i * 97) % h, 2, 2);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 28);
  return tex;
}
