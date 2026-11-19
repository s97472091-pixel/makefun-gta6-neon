// Solana Bay — Procedural Offscreen Canvas Textures (zero external assets)
import * as THREE from 'three';

const cache = new Map();

function makeCanvasTexture(key, width, height, drawFn, repeatX = 1, repeatY = 1) {
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

export function getRoadTexture(vertical = false) {
  return makeCanvasTexture(`road_${vertical ? 'v' : 'h'}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#252932';
    ctx.fillRect(0, 0, w, h);
    // Asphalt speckle
    for (let i = 0; i < 1400; i++) {
      const x = (i * 73) % w;
      const y = (i * 137) % h;
      const v = 32 + ((i * 19) % 22);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      ctx.fillRect(x, y, 2, 2);
    }
    if (!vertical) {
      // Curbs & edge lines along top/bottom
      ctx.fillStyle = '#404754';
      ctx.fillRect(0, 0, w, 12);
      ctx.fillRect(0, h - 12, w, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.fillRect(0, 16, w, 4);
      ctx.fillRect(0, h - 20, w, 4);
      // Double yellow center line
      ctx.fillStyle = '#f4b942';
      ctx.fillRect(0, h / 2 - 5, w, 3);
      ctx.fillRect(0, h / 2 + 2, w, 3);
      // Dashed lane dividers
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (let x = 14; x < w; x += 48) {
        ctx.fillRect(x, h * 0.27, 24, 3);
        ctx.fillRect(x, h * 0.73, 24, 3);
      }
    } else {
      ctx.fillStyle = '#404754';
      ctx.fillRect(0, 0, 12, h);
      ctx.fillRect(w - 12, 0, 12, h);
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.fillRect(16, 0, 4, h);
      ctx.fillRect(w - 20, 0, 4, h);
      ctx.fillStyle = '#f4b942';
      ctx.fillRect(w / 2 - 5, 0, 3, h);
      ctx.fillRect(w / 2 + 2, 0, 3, h);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (let y = 14; y < h; y += 48) {
        ctx.fillRect(w * 0.27, y, 3, 24);
        ctx.fillRect(w * 0.73, y, 3, 24);
      }
    }
  });
}

export function getIntersectionTexture() {
  return makeCanvasTexture('intersection', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#252932';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const v = 33 + ((i * 23) % 18);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      ctx.fillRect((i * 59) % w, (i * 97) % h, 2, 2);
    }
    // Zebra crosswalk stripes on all 4 edges
    ctx.fillStyle = 'rgba(245, 246, 250, 0.78)';
    for (let k = 28; k < w - 28; k += 22) {
      ctx.fillRect(k, 8, 12, 22);
      ctx.fillRect(k, h - 30, 12, 22);
      ctx.fillRect(8, k, 22, 12);
      ctx.fillRect(w - 30, k, 22, 12);
    }
  });
}

export function getSidewalkTexture() {
  return makeCanvasTexture('sidewalk', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#cdc5b8';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(95, 88, 78, 0.28)';
    ctx.lineWidth = 2;
    const step = 64;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 800; i++) {
      const v = 182 + ((i * 31) % 34);
      ctx.fillStyle = `rgba(${v},${v - 6},${v - 14},0.35)`;
      ctx.fillRect((i * 89) % w, (i * 53) % h, 2, 2);
    }
  }, 16, 16);
}

export function getSandTexture() {
  return makeCanvasTexture('sand', 256, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#f4d59c');
    grad.addColorStop(0.7, '#ecc584');
    grad.addColorStop(1, '#d8aa69');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      const x = (i * 67) % w;
      const y = (i * 113) % h;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,248,225,0.45)' : 'rgba(176,132,76,0.28)';
      ctx.fillRect(x, y, 2, 2);
    }
  }, 4, 14);
}

export function getWaterTexture() {
  return makeCanvasTexture('water', 256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0997b8');
    g.addColorStop(0.5, '#0bb8cc');
    g.addColorStop(1, '#087ca7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = (i * 43) % w;
      const y = (i * 71) % h;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(180,250,255,0.22)' : 'rgba(255,220,175,0.16)';
      ctx.beginPath();
      ctx.ellipse(x, y, 18 + (i % 14), 3.5, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 10, 14);
}

export function getBuildingTexture(style, hexColor, variant = 0) {
  const key = `bld_${style}_${hexColor}_${variant}`;
  return makeCanvasTexture(key, 256, 256, (ctx, w, h) => {
    const base = `#${hexColor.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    if (style === 'artdeco') {
      // Pastel Art-Deco vertical pilasters + warm sunset-lit windows
      ctx.fillStyle = 'rgba(255, 252, 245, 0.42)';
      for (let x = 0; x < w; x += 64) {
        ctx.fillRect(x, 0, 8, h);
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(0, 0, w, 14);
      ctx.fillRect(0, h - 18, w, 18);

      const cols = 4;
      const rows = 5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = 16 + c * 62;
          const wy = 24 + r * 44;
          const lit = ((r * 7 + c * 13 + variant * 5) % 5) < 3;
          ctx.fillStyle = lit ? '#ffdf9e' : '#283d54';
          ctx.fillRect(wx, wy, 34, 24);
          // Balcony / eyebrow ledge
          ctx.fillStyle = 'rgba(255,255,255,0.72)';
          ctx.fillRect(wx - 3, wy - 4, 40, 4);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(wx, wy + 24, 34, 3);
        }
      }
    } else if (style === 'downtown') {
      // Sleek glass curtain wall with sunset sky reflection bands
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, base);
      grad.addColorStop(0.55, '#477699');
      grad.addColorStop(1, '#d98c72');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(18, 28, 42, 0.45)';
      for (let y = 0; y < h; y += 32) ctx.fillRect(0, y, w, 5);
      for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 4, h);

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (((r * 11 + c * 17 + variant * 3) % 7) === 0) {
            ctx.fillStyle = 'rgba(255, 224, 150, 0.65)';
            ctx.fillRect(c * 32 + 5, r * 32 + 6, 25, 22);
          }
        }
      }
    } else if (style === 'villa') {
      // Warm stucco + arched coastal windows
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(120,80,50,0.08)';
        ctx.fillRect((i * 47) % w, (i * 83) % h, 4, 4);
      }
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const wx = 26 + c * 78;
          const wy = 40 + r * 105;
          ctx.fillStyle = '#3b4e63';
          ctx.fillRect(wx, wy + 12, 44, 52);
          ctx.beginPath();
          ctx.arc(wx + 22, wy + 12, 22, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 220, 155, 0.55)';
          ctx.fillRect(wx + 6, wy + 16, 32, 42);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.strokeRect(wx, wy + 12, 44, 52);
        }
      }
    } else {
      // Industrial / Shipping Container corrugated ribs
      for (let x = 0; x < w; x += 16) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x, 0, 5, h);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 5, 0, 3, h);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('SOLANA FREIGHT', 18, 48);
    }
  });
}

export function getSignTexture(label, bgHex = '#150d26', textHex = '#ff5ca8', accentHex = '#00f5d4') {
  const key = `sign_${label}_${bgHex}_${textHex}`;
  return makeCanvasTexture(key, 512, 128, (ctx, w, h) => {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.shadowColor = textHex;
    ctx.shadowBlur = 18;
    ctx.fillStyle = textHex;
    ctx.font = '900 54px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2 + 3);
  });
}

export function getRampTexture() {
  return makeCanvasTexture('stunt_ramp', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#252932';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffb703';
    for (let y = -w; y < h + w; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 32);
      ctx.lineTo(w, y + 48);
      ctx.lineTo(0, y + 16);
      ctx.closePath();
      ctx.fill();
    }
  });
}
