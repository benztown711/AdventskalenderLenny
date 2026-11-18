// Türchen 17 · Pixel-Hüpfer: alles Zeichnen (Kacheln, Hintergründe, Figuren, Partikel, Anzeige).
import { T, SOLID, ONEWAY, ICE, BELT_L, BELT_R, CRUMBLE, GATE, MUSH, FAKE, PHYS } from './engine.js';
import { PAL, HERO, HOG, COIN, NUT, HEART, MUSH as MUSH_ROWS, CROWN, makeSprite, drawText } from './sprites.js';

const PAD = 6; // Zusatz-Zeilen über der Karte (Höhlendecke fortsetzen)
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hash = (a, b, k = 0) => { let h = Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(k + 1, 83492791); h = Math.imul(h ^ (h >>> 13), 2654435761); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export const THEMES = {
  wald: { sky: ['#0b1437', '#1f2c68'], snow: true, stars: true },
  eis: { sky: ['#050b22', '#10265a'], snow: false, stars: false },
  wolken: { sky: ['#0b1437', '#3a2a7c'], snow: false, stars: true },
  fabrik: { sky: ['#1a0d1c', '#3d1a2c'], snow: false, stars: false },
  burg: { sky: ['#0b1437', '#1c2452'], snow: true, stars: true },
};

// ---------- Kachel-Kunst (16x16) ----------
function snowCap(g, x, y, tx, ty, col = '#eef5ff', shade = '#a9c6ea') {
  for (let c = 0; c < 16; c++) {
    const d = 3 + (hash(tx * 16 + c, ty, 1) > 0.55 ? 1 : 0) + (hash(tx * 16 + c, ty, 2) > 0.88 ? 2 : 0);
    g.fillStyle = col; g.fillRect(x + c, y, 1, d);
    g.fillStyle = shade; g.fillRect(x + c, y + d, 1, 1);
  }
  g.fillStyle = '#ffffff'; g.fillRect(x, y, 16, 1);
}
function specks(g, x, y, tx, ty, cols, n) {
  for (let k = 0; k < n; k++) {
    g.fillStyle = cols[k % cols.length];
    g.fillRect(x + Math.floor(hash(tx, ty, k * 3) * 14), y + Math.floor(hash(tx, ty, k * 3 + 1) * 14), 1 + (hash(tx, ty, k * 3 + 2) > 0.5 ? 1 : 0), 1);
  }
}
function edges(g, x, y, nb, col) {
  g.fillStyle = col;
  if (!nb.l) g.fillRect(x, y, 1, 16);
  if (!nb.r) g.fillRect(x + 15, y, 1, 16);
  if (!nb.d) g.fillRect(x, y + 15, 16, 1);
}
function plank(g, x, y, tx, ty, snow = true) {
  g.fillStyle = '#8a5a35'; g.fillRect(x, y + 1, 16, 6);
  g.fillStyle = '#a56c40'; g.fillRect(x, y + 2, 16, 1);
  g.fillStyle = '#5e3b22'; g.fillRect(x, y + 7, 16, 1); g.fillRect(x + (tx % 2 ? 3 : 11), y + 3, 1, 3);
  g.fillStyle = '#3a2416'; g.fillRect(x + 2, y + 4, 1, 1); g.fillRect(x + 13, y + 4, 1, 1);
  if (snow) { g.fillStyle = '#eef5ff'; g.fillRect(x, y, 16, 2); g.fillStyle = '#fff'; g.fillRect(x, y, 16, 1); if (hash(tx, ty, 5) > 0.5) { g.fillStyle = '#eef5ff'; g.fillRect(x + 5, y + 2, 2, 1); } }
}
function cloudCols(tx, c) { const p = ((tx * 16 + c) % 12) / 12; return Math.round(2 + 2 * Math.cos(p * Math.PI * 2)); }

function tileArt(g, th, type, x, y, tx, ty, nb) {
  if (type === ONEWAY) {
    if (th === 'wolken') {
      for (let c = 0; c < 16; c++) {
        const o = cloudCols(tx, c) >> 1;
        g.fillStyle = '#f4f2ff'; g.fillRect(x + c, y + o, 1, 7 - o);
        g.fillStyle = '#fff'; g.fillRect(x + c, y + o, 1, 1);
        g.fillStyle = '#c9c3f3'; g.fillRect(x + c, y + 6, 1, 2);
      }
    } else if (th === 'eis') {
      g.fillStyle = '#8ecae6'; g.fillRect(x, y, 16, 5); g.fillStyle = '#e2f6ff'; g.fillRect(x, y, 16, 2);
      g.fillStyle = '#4a92ba'; g.fillRect(x, y + 5, 16, 1); g.fillRect(x + 4, y + 6, 1, 2); g.fillRect(x + 11, y + 6, 1, 1);
    } else if (th === 'fabrik') {
      g.fillStyle = '#e9c27b'; g.fillRect(x, y, 16, 7);
      g.fillStyle = '#c39348'; for (let k = 2; k < 16; k += 4) g.fillRect(x + k, y, 1, 7); g.fillRect(x, y + 3, 16, 1);
      g.fillStyle = '#f7dc9f'; g.fillRect(x, y, 16, 1); g.fillStyle = '#9b6e2e'; g.fillRect(x, y + 7, 16, 1);
    } else plank(g, x, y, tx, ty);
    return;
  }
  if (type === ICE) {
    g.fillStyle = '#9fdcf5'; g.fillRect(x, y, 16, 16);
    g.fillStyle = '#7cc4e6'; for (let k = 0; k < 16; k++) if ((k + tx * 3) % 7 < 2) g.fillRect(x + k, y + 4 + (k % 3), 1, 9);
    g.fillStyle = '#ffffff'; for (let k = 0; k < 5; k++) g.fillRect(x + ((tx * 5 + 3 + k) % 13), y + 4 + k, 1, 1);
    if (!nb.u) { g.fillStyle = '#e2f6ff'; g.fillRect(x, y, 16, 3); g.fillStyle = '#fff'; g.fillRect(x, y, 16, 1); }
    edges(g, x, y, nb, '#4a92ba');
    return;
  }
  // SOLID (auch Geheimwand)
  if (th === 'wald') {
    g.fillStyle = '#4a2c2a'; g.fillRect(x, y, 16, 16);
    specks(g, x, y, tx, ty, ['#36201f', '#62392f', '#36201f'], 6);
    edges(g, x, y, nb, '#2c1718');
    if (!nb.u) snowCap(g, x, y, tx, ty);
  } else if (th === 'eis') {
    g.fillStyle = '#1b3263'; g.fillRect(x, y, 16, 16);
    g.fillStyle = '#23417c'; g.fillRect(x + Math.floor(hash(tx, ty, 9) * 8), y + Math.floor(hash(tx, ty, 8) * 8), 6, 5);
    specks(g, x, y, tx, ty, ['#12244a', '#2c4f8f'], 5);
    edges(g, x, y, nb, '#0d1a3a');
    if (!nb.u) { g.fillStyle = '#9fd8f0'; g.fillRect(x, y, 16, 2); g.fillStyle = '#5fa9d1'; g.fillRect(x, y + 2, 16, 1); }
    if (!nb.d) { g.fillStyle = '#bfe9ff'; for (let c = 1; c < 16; c += 4) { const l = 1 + Math.floor(hash(tx * 16 + c, ty, 4) * 3); g.fillRect(x + c, y + 15, 2, 1); g.fillRect(x + c, y + 16, 1, l); } }
  } else if (th === 'wolken') {
    for (let c = 0; c < 16; c++) {
      const o = nb.u ? 0 : cloudCols(tx, c), b = nb.d ? 16 : 16 - (cloudCols(tx + 7, c) >> 1);
      g.fillStyle = '#ebe9ff'; g.fillRect(x + c, y + o, 1, b - o);
      if (!nb.u) { g.fillStyle = '#ffffff'; g.fillRect(x + c, y + o, 1, 2); }
      if (!nb.d) { g.fillStyle = '#c9c3f3'; g.fillRect(x + c, y + b - 3, 1, 3); }
    }
    specks(g, x, y + 3, tx, ty, ['#dcd8fb'], 3);
  } else if (th === 'fabrik') {
    g.fillStyle = '#a85a33'; g.fillRect(x, y, 16, 16);
    for (let k = 0; k < 3; k++) { g.fillStyle = '#7e3f22'; const px = Math.floor(hash(tx, ty, k) * 12) + 1, py = Math.floor(hash(tx, ty, k + 7) * 10) + 4; g.fillRect(x + px, y + py, 2, 2); }
    g.fillStyle = '#c47645'; g.fillRect(x + 1, y + 1, 1, 1);
    edges(g, x, y, nb, '#6e351d');
    if (!nb.u) {
      for (let c = 0; c < 16; c++) { const d = 3 + Math.floor(hash(tx * 16 + c, ty, 3) * 2) + ((c + tx * 5) % 7 === 0 ? 3 : 0); g.fillStyle = '#fff3ee'; g.fillRect(x + c, y, 1, d); }
      const sp = ['#ef476f', '#06d6a0', '#ffd166', '#8ecae6'];
      for (let k = 0; k < 3; k++) { g.fillStyle = sp[(tx + k) % 4]; g.fillRect(x + Math.floor(hash(tx, ty, k + 20) * 15), y + 1 + (k % 2), 1, 1); }
    }
  } else { // burg
    g.fillStyle = '#4b5274'; g.fillRect(x, y, 16, 16);
    g.fillStyle = '#30354f'; g.fillRect(x, y + 7, 16, 1); g.fillRect(x, y + 15, 16, 1);
    const o = ty % 2 ? 4 : 11; g.fillRect(x + o, y, 1, 7); g.fillRect(x + ((o + 8) % 16), y + 8, 1, 7);
    g.fillStyle = '#5f6790'; g.fillRect(x + ((o + 1) % 16), y, 5, 1); g.fillRect(x + ((o + 9) % 16), y + 8, 5, 1);
    specks(g, x, y, tx, ty, ['#424867'], 3);
    if (!nb.u) snowCap(g, x, y, tx, ty);
  }
}

// ---------- Hintergründe (Parallax-Streifen) ----------
function bgLayers(th) {
  const L = [];
  const W = 512;
  if (th === 'wald' || th === 'burg') {
    const far = mk(W, 160), g = far.getContext('2d');
    if (th === 'wald') {
      for (let x = 0; x < W; x++) {
        const h = 60 + 34 * Math.sin(x / 47) + 22 * Math.sin(x / 19 + 1) + 10 * Math.sin(x / 7);
        g.fillStyle = '#18225a'; g.fillRect(x, 160 - h, 1, h);
        g.fillStyle = '#9fb3e0'; g.fillRect(x, 160 - h, 1, 3);
      }
    } else {
      g.fillStyle = '#141b48';
      [[20, 70, 40], [90, 40, 30], [150, 90, 50], [250, 60, 36], [330, 100, 44], [420, 55, 34]].forEach(([x, h, w]) => {
        g.fillRect(x, 160 - h, w, h);
        for (let k = 0; k < w; k += 8) g.fillRect(x + k, 160 - h - 6, 5, 6);
        g.fillStyle = '#ffd166'; for (let k = 0; k < 3; k++) g.fillRect(x + 6 + k * 11 % (w - 8), 160 - h + 14 + k * 17 % (h - 20), 3, 4); g.fillStyle = '#141b48';
        g.beginPath(); g.moveTo(x - 4, 160 - h - 6); g.lineTo(x + w / 2, 160 - h - 30); g.lineTo(x + w + 4, 160 - h - 6); g.fill();
      });
    }
    L.push({ c: far, k: 0.15, y: 'bottom', off: 30 });
    const near = mk(W, 130), n = near.getContext('2d');
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(hash(i, 3) * W), h = 50 + Math.floor(hash(i, 4) * 60);
      for (let r = 0; r < h; r++) {
        const hw = Math.floor((r / h) * (14 + h / 8)) * ((r % 12) < 9 ? 1 : 0.7);
        n.fillStyle = th === 'wald' ? '#0d1b3e' : '#10183d'; n.fillRect(x - hw, 130 - h + r, hw * 2 + 1, 1);
        if (r % 12 === 8) { n.fillStyle = '#6e86c0'; n.fillRect(x - hw, 130 - h + r, hw * 2 + 1, 1); }
      }
      for (let xx = -W; xx <= W; xx += W) { /* wrap handled by drawing */ }
    }
    L.push({ c: near, k: 0.4, y: 'bottom', off: 0 });
  } else if (th === 'eis') {
    const far = mk(W, 400), g = far.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(hash(i, 1) * W), w = 8 + Math.floor(hash(i, 2) * 16), h = 40 + Math.floor(hash(i, 3) * 120);
      g.fillStyle = '#0e1c45';
      g.beginPath(); g.moveTo(x - w, 0); g.lineTo(x, h); g.lineTo(x + w, 0); g.fill();
      g.beginPath(); g.moveTo(x - w + 30, 400); g.lineTo(x + 30, 400 - h * 0.8); g.lineTo(x + w + 30, 400); g.fill();
    }
    L.push({ c: far, k: 0.2, y: 'top', off: 0 });
    const near = mk(W, 400), n = near.getContext('2d');
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(hash(i, 7) * W), y = 120 + Math.floor(hash(i, 8) * 220);
      for (let k = 0; k < 4; k++) {
        const h = 10 + Math.floor(hash(i, k + 9) * 22), cx = x + k * 7 - 10;
        n.fillStyle = k % 2 ? '#2d6fa3' : '#3f8cc4'; n.beginPath(); n.moveTo(cx - 4, y); n.lineTo(cx, y - h); n.lineTo(cx + 4, y); n.fill();
        n.fillStyle = '#8ecae6'; n.fillRect(cx - 1, y - h + 4, 1, h - 6);
      }
    }
    L.push({ c: near, k: 0.45, y: 'top', off: 0, glow: true });
  } else if (th === 'wolken') {
    const mkClouds = (seed, col, hi, n, sz) => {
      const c = mk(W, 400), g = c.getContext('2d');
      for (let i = 0; i < n; i++) {
        const x = hash(i, seed) * W, y = 60 + hash(i, seed + 1) * 300, s = sz * (0.6 + hash(i, seed + 2));
        for (let k = 0; k < 5; k++) {
          const r = s * (0.5 + 0.5 * Math.sin(k * 1.3 + i)), cx = x + (k - 2) * s * 0.7, cy = y - Math.abs(k - 2) * -s * 0.15;
          for (const dx of [-W, 0, W]) { g.fillStyle = col; g.beginPath(); g.arc(cx + dx, cy, r, 0, 7); g.fill(); g.fillStyle = hi; g.beginPath(); g.arc(cx + dx - r * 0.2, cy - r * 0.25, r * 0.6, 0, 7); g.fill(); }
        }
      }
      return c;
    };
    L.push({ c: mkClouds(11, '#251d5c', '#2c2368', 7, 26), k: 0.12, y: 'top', off: 0 });
    L.push({ c: mkClouds(21, '#3b2f84', '#47399a', 6, 18), k: 0.35, y: 'top', off: 40 });
  } else if (th === 'fabrik') {
    const far = mk(W, 400), g = far.getContext('2d');
    g.fillStyle = '#2a1420'; g.fillRect(0, 0, W, 400);
    g.fillStyle = '#331a27';
    for (let y = 0; y < 400; y += 12) for (let x = (y / 12) % 2 ? 0 : 12; x < W; x += 24) g.fillRect(x, y, 22, 10);
    for (let i = 0; i < 5; i++) {
      const x = 40 + i * 100, y = 90 + (i % 2) * 60;
      g.fillStyle = '#1a0c14'; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill();
      g.fillStyle = '#ffb35c'; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill();
      g.fillStyle = '#ffd98f'; g.fillRect(x - 1, y - 14, 2, 28); g.fillRect(x - 14, y - 1, 28, 2);
    }
    L.push({ c: far, k: 0.15, y: 'top', off: 0 });
    const near = mk(W, 400), n = near.getContext('2d');
    for (let i = 0; i < 4; i++) {
      const x = 30 + i * 128;
      n.fillStyle = '#4a2533'; n.fillRect(x, 0, 14, 400); n.fillStyle = '#5c2f40'; n.fillRect(x + 2, 0, 3, 400);
      for (let y = 30 + i * 40; y < 400; y += 110) { n.fillStyle = '#4a2533'; n.fillRect(x, y, 60, 10); n.fillStyle = '#6b3a4c'; n.fillRect(x + 56, y - 3, 8, 16); }
      const cx = x + 90, cy = 220 + (i % 2) * 60; // Zuckerstange
      for (let y = 0; y < 150; y++) { n.fillStyle = Math.floor((y + (i * 5)) / 6) % 2 ? '#ef476f' : '#f6e8ee'; n.fillRect(cx, cy + y, 8, 1); }
      for (let a = 0; a < 20; a++) { const an = Math.PI + a / 20 * Math.PI; n.fillStyle = Math.floor(a / 3) % 2 ? '#ef476f' : '#f6e8ee'; n.fillRect(cx + 10 + Math.cos(an) * 10, cy + Math.sin(an) * 10, 8, 3); }
    }
    L.push({ c: near, k: 0.4, y: 'top', off: 0 });
  }
  return L;
}

export function createRenderer(g, VW, VH) {
  const S = {}; // Sprite-Cache
  const spr = (key, rows, flip) => S[key + (flip ? 'f' : '')] || (S[key + (flip ? 'f' : '')] = makeSprite(rows, PAL, '#1a1030', flip));
  const disk = (r, cols) => {
    const c = mk(r * 2 + 2, r * 2 + 2), q = c.getContext('2d');
    for (let y = 0; y < r * 2; y++) for (let x = 0; x < r * 2; x++) {
      const dx = x - r + 0.5, dy = y - r + 0.5, d = Math.hypot(dx, dy);
      if (d > r) continue;
      const l = (-dx - dy) / (r * 1.4) + 0.2;
      q.fillStyle = d > r - 1.2 ? '#1a1030' : l > 0.45 ? cols[0] : l > -0.2 ? cols[1] : cols[2];
      q.fillRect(x + 1, y + 1, 1, 1);
    }
    return c;
  };
  const BOSS = disk(15, ['#ffffff', '#dfeeff', '#a9c6ea']);
  const BALL = disk(5, ['#ffffff', '#dfeeff', '#a9c6ea']);
  const stars = Array.from({ length: 60 }, (_, i) => ({ x: hash(i, 1) * 600, y: hash(i, 2) * 260, p: hash(i, 3) * 6, s: hash(i, 4) > 0.85 ? 2 : 1 }));
  const flakes = Array.from({ length: 45 }, (_, i) => ({ x: hash(i, 5) * VW, y: hash(i, 6) * VH, v: 12 + hash(i, 7) * 22, s: hash(i, 8) > 0.7 ? 2 : 1, ph: hash(i, 9) * 6 }));
  let level = null, layer = null, fakeLayer = null, bgs = [], theme = 'wald';
  let parts = [];

  function setLevel(w) {
    const lv = w.lv; level = lv; theme = w.theme;
    bgs = bgLayers(theme);
    layer = mk(lv.W * T, (lv.H + PAD) * T); fakeLayer = mk(lv.W * T, (lv.H + PAD) * T);
    const lg = layer.getContext('2d'), fg = fakeLayer.getContext('2d');
    const raw = (x, y) => { if (x < 0) x = 0; if (x >= lv.W) x = lv.W - 1; if (y >= lv.H) return 0; if (y < 0) y = 0; return lv.tiles[y * lv.W + x]; };
    const solidish = t => t === SOLID || t === FAKE || t === ICE || t === BELT_L || t === BELT_R || t === GATE;
    for (let y = -PAD; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
      const t = raw(x, y);
      if (y < 0 && t !== SOLID) continue;
      const nb = { u: y <= 0 ? raw(x, 0) === SOLID : solidish(raw(x, y - 1)), d: y + 1 >= lv.H ? true : solidish(raw(x, y + 1)), l: x === 0 || solidish(raw(x - 1, y)), r: x === lv.W - 1 || solidish(raw(x + 1, y)) };
      const px = x * T, py = (y + PAD) * T;
      if (t === SOLID || t === ICE || t === ONEWAY) tileArt(lg, theme, t, px, py, x, y, nb);
      else if (t === FAKE) tileArt(fg, theme, SOLID, px, py, x, y, nb);
    }
    parts = [];
  }

  // ---------- Partikel ----------
  function burst(kind, x, y, n = 8, opt = {}) {
    for (let i = 0; i < n; i++) {
      const a = opt.up ? -Math.PI / 2 + (Math.random() - 0.5) * 2.4 : Math.random() * Math.PI * 2;
      const v = (opt.v || 60) * (0.4 + Math.random() * 0.8);
      parts.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: opt.life || 0.6, max: opt.life || 0.6, c: opt.c || '#fff', g: opt.g ?? 0, s: opt.s || 1, r: Math.random() * 6 });
    }
  }
  function dust(x, y, n = 5, dir = 0) {
    for (let i = 0; i < n; i++) parts.push({ kind: 'dust', x: x + (Math.random() - 0.5) * 8, y: y - 1, vx: (Math.random() - 0.5) * 50 + dir * 30, vy: -8 - Math.random() * 18, life: 0.45, max: 0.45, c: '#e8eefc', g: 0, s: 1 + Math.random() * 2 });
  }
  function text(str, x, y, c = '#ffd166') { parts.push({ kind: 'txt', str, x, y, vx: 0, vy: -28, life: 0.9, max: 0.9, c, g: 0 }); }
  function ring(x, y, c = '#ffd166') { parts.push({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, c, g: 0 }); }
  function updateParts(dt) {
    for (const p of parts) { p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'dust') { p.vx *= 0.92; p.s += dt * 5; } p.r += dt * 4; }
    parts = parts.filter(p => p.life > 0);
  }
  function drawParts(ox, oy) {
    for (const p of parts) {
      const a = Math.max(0, Math.min(1, p.life / p.max * 1.5));
      g.globalAlpha = a;
      const x = Math.round(p.x - ox), y = Math.round(p.y - oy);
      if (p.kind === 'dust') { g.fillStyle = p.c; const s = Math.round(p.s); g.fillRect(x - s, y - s, s * 2, s * 2); }
      else if (p.kind === 'flake') {
        g.fillStyle = p.c; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
        if (p.s > 1) { g.fillRect(x - 2, y - 2, 1, 1); g.fillRect(x + 2, y - 2, 1, 1); g.fillRect(x - 2, y + 2, 1, 1); g.fillRect(x + 2, y + 2, 1, 1); }
      } else if (p.kind === 'txt') drawText(g, p.str, x, y, { s: 1, c: p.c, al: 'center' });
      else if (p.kind === 'ring') { g.strokeStyle = p.c; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, (1 - p.life / p.max) * 26 + 4, 0, 7); g.stroke(); }
      else { g.fillStyle = p.c; g.fillRect(x, y, p.s, p.s); }
    }
    g.globalAlpha = 1;
  }

  // ---------- Hintergrund ----------
  function drawBg(camx, t, mapTop) {
    const th = THEMES[theme];
    const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]);
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    if (th.stars) for (const s of stars) {
      const x = ((s.x - camx * 0.05) % 600 + 600) % 600 - 140; if (x < -2 || x > VW) continue;
      g.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.3 + s.p)); g.fillStyle = s.s > 1 ? '#ffd166' : '#ffffff';
      g.fillRect(Math.round(x), Math.round(s.y), s.s, s.s);
    }
    g.globalAlpha = 1;
    if (theme === 'wald' || theme === 'burg') { // Mond
      const mx = 250 - camx * 0.02, my = 40;
      g.fillStyle = 'rgba(255,240,200,.12)'; g.beginPath(); g.arc(mx, my, 26, 0, 7); g.fill();
      g.fillStyle = '#fff3cf'; g.beginPath(); g.arc(mx, my, 16, 0, 7); g.fill();
      g.fillStyle = '#e8d9a8'; g.fillRect(Math.round(mx - 6), my - 4, 4, 3); g.fillRect(Math.round(mx + 4), my + 5, 3, 3);
    }
    for (const L of bgs) {
      const w = L.c.width, h = L.c.height;
      const y = L.y === 'bottom' ? VH - h - L.off : L.off;
      let x = -((camx * L.k) % w); if (x > 0) x -= w;
      if (L.glow) g.globalAlpha = 0.75 + 0.25 * Math.sin(t * 2);
      for (; x < VW; x += w) g.drawImage(L.c, Math.round(x), y);
      g.globalAlpha = 1;
    }
  }
  function drawWeather(dt, t) {
    const th = THEMES[theme];
    if (th.snow || theme === 'wolken' || theme === 'eis' || theme === 'fabrik') for (const f of flakes) {
      f.y += f.v * dt * (theme === 'eis' ? 0.3 : theme === 'fabrik' ? -0.5 : 1); f.x += Math.sin(t + f.ph) * 6 * dt;
      if (f.y > VH) f.y -= VH; if (f.y < 0) f.y += VH;
      const x = Math.round(((f.x % VW) + VW) % VW), y = Math.round(f.y);
      if (theme === 'wolken') { if (f.s < 2) continue; g.globalAlpha = 0.5; g.fillStyle = '#c77dff'; g.fillRect(x, y, 1, 1); }
      else if (theme === 'eis') { g.globalAlpha = 0.4 + 0.4 * Math.sin(t * 3 + f.ph); g.fillStyle = '#8ecae6'; g.fillRect(x, y, 1, 1); }
      else if (theme === 'fabrik') { if (f.s < 2) continue; g.globalAlpha = 0.18; g.fillStyle = '#ffe8d6'; g.fillRect(x - 2, y - 2, 5, 5); }
      else { g.globalAlpha = 0.85; g.fillStyle = '#ffffff'; g.fillRect(x, y, f.s, f.s); }
    }
    g.globalAlpha = 1;
  }

  // ---------- Einzelteile ----------
  function drawTree(x, y, lit, t, glow) {
    if (glow > 0) {
      const r = 30 + glow * 40;
      const gr = g.createRadialGradient(x + 16, y + 20, 4, x + 16, y + 20, r);
      gr.addColorStop(0, 'rgba(255,209,102,.55)'); gr.addColorStop(1, 'rgba(255,209,102,0)');
      g.fillStyle = gr; g.fillRect(x + 16 - r, y + 20 - r, r * 2, r * 2);
    }
    g.fillStyle = '#1a1030'; g.fillRect(x + 12, y + 39, 8, 9);
    g.fillStyle = '#6b3e22'; g.fillRect(x + 13, y + 40, 6, 8);
    const tiers = [[5, 19, 1, 8], [13, 30, 3, 12], [22, 41, 4, 15]];
    for (const [a, b, w0, w1] of tiers) for (let r = a; r <= b; r++) {
      const hw = Math.round(w0 + (w1 - w0) * (r - a) / (b - a));
      g.fillStyle = '#1a1030'; g.fillRect(x + 16 - hw - 1, y + r, hw * 2 + 2, 1);
      g.fillStyle = '#0f7a53'; g.fillRect(x + 16 - hw, y + r, hw * 2, 1);
      g.fillStyle = '#13a06b'; g.fillRect(x + 16, y + r, Math.max(1, hw - 2), 1);
      if (r === b) { g.fillStyle = '#eef5ff'; for (let k = -hw; k < hw; k += 2) g.fillRect(x + 16 + k, y + r, 1, 1); }
    }
    // Girlande
    for (let k = 0; k < 14; k++) { const yy = 16 + k * 1.8, xx = 16 + Math.sin(k * 0.9) * (4 + k * 0.7); g.fillStyle = lit ? '#ffd166' : '#8a7442'; g.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1); }
    const balls = [[12, 17, '#ef476f'], [20, 23, '#8ecae6'], [10, 28, '#ffd166'], [22, 33, '#c77dff'], [7, 38, '#06d6a0'], [17, 38, '#ef476f'], [26, 39, '#ffd166'], [15, 11, '#c77dff']];
    balls.forEach(([bx, by, c], i) => {
      const on = lit && Math.sin(t * 5 + i * 1.7) > -0.4;
      if (on) { g.fillStyle = c; g.globalAlpha = 0.35; g.fillRect(x + bx - 2, y + by - 2, 5, 5); g.globalAlpha = 1; }
      g.fillStyle = on ? c : '#2b3550'; g.fillRect(x + bx - 1, y + by - 1, 3, 3);
      g.fillStyle = on ? '#fff' : '#45507a'; g.fillRect(x + bx - 1, y + by - 1, 1, 1);
    });
    // Stern
    const sc = lit ? '#ffd166' : '#8a7442';
    if (lit) { g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6); g.fillStyle = '#fff3c4'; g.fillRect(x + 15, y - 6, 2, 13); g.fillRect(x + 10, y + 0, 12, 2); g.globalAlpha = 1; }
    g.fillStyle = '#1a1030'; g.fillRect(x + 13, y - 1, 7, 6); g.fillRect(x + 15, y - 3, 3, 10);
    g.fillStyle = sc; g.fillRect(x + 14, y, 5, 4); g.fillRect(x + 16, y - 2, 1, 8); g.fillRect(x + 12, y + 1, 9, 1);
  }
  function drawFlag(x, y, on, t) {
    g.fillStyle = '#1a1030'; g.fillRect(x + 2, y - 28, 4, 28);
    g.fillStyle = '#cfd6ea'; g.fillRect(x + 3, y - 27, 2, 27);
    g.fillStyle = '#ffd166'; g.fillRect(x + 2, y - 30, 4, 3);
    const c = on ? '#06d6a0' : '#ef476f', d = on ? '#03926c' : '#b02e55';
    for (let k = 0; k < 12; k++) {
      const wav = Math.round(Math.sin(t * 7 - k * 0.6) * (k / 12) * 2);
      const h = Math.round(10 * (1 - k / 13));
      g.fillStyle = k % 4 === 3 ? d : c; g.fillRect(x + 5 + k, y - 26 + (10 - h) / 2 + wav, 1, h);
    }
    if (on) { g.fillStyle = '#fff'; g.fillRect(x + 8, y - 22, 2, 2); }
    g.fillStyle = '#5b6280'; g.fillRect(x, y - 2, 8, 2);
  }
  function drawIcicle(ic) {
    if (ic.state === 'gone') return;
    let sc = ic.state === 'grow' ? Math.min(1, ic.t / 0.8) : 1;
    const ox = ic.state === 'shake' ? (Math.floor(ic.t * 40) % 2 ? 1 : -1) : 0;
    const h = Math.round(15 * sc);
    for (let r = 0; r < h; r++) {
      const w = Math.max(1, Math.round(8 * (1 - r / 15)));
      const x0 = Math.round(ic.x + 4 - w / 2) + ox, y = Math.round(ic.y) + r;
      g.fillStyle = '#1a1030'; g.fillRect(x0 - 1, y, w + 2, 1);
      g.fillStyle = '#d9f3ff'; g.fillRect(x0, y, w, 1);
      if (w > 2) { g.fillStyle = '#8ecae6'; g.fillRect(x0 + Math.ceil(w / 2), y, Math.floor(w / 2), 1); }
    }
    g.fillStyle = '#1a1030'; g.fillRect(Math.round(ic.x + 4) + ox - 1, Math.round(ic.y) + h, 2, 1);
  }
  function drawCube(e, t) {
    const sq = e.squash > 0 ? 0.25 : 0;
    const w = Math.round(12 * (1 + sq * 0.6)), h = Math.round(12 * (1 - sq));
    const x = Math.round(e.x + 6 - w / 2), y = Math.round(e.y + 12 - h);
    const sugar = theme === 'fabrik';
    g.fillStyle = '#1a1030'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = sugar ? '#fff4f8' : '#8ecae6'; g.fillRect(x, y, w, h);
    g.fillStyle = sugar ? '#ffd0df' : '#4a92ba'; g.fillRect(x + w - 2, y + 1, 2, h - 1); g.fillRect(x + 1, y + h - 2, w - 1, 2);
    g.fillStyle = '#ffffff'; g.fillRect(x + 1, y + 1, w - 4, 2); g.fillRect(x + 1, y + 1, 2, 4);
    const ex = e.dir < 0 ? x + 2 : x + w - 7;
    g.fillStyle = '#141020'; g.fillRect(ex, y + 4, 2, 3); g.fillRect(ex + 4, y + 4, 2, 3);
    g.fillStyle = '#ef476f'; g.fillRect(ex + 1, y + h - 4, 4, 1);
  }
  function drawHog(e, t) {
    const fr = Math.floor(e.t * 6) % 2;
    const im = spr('hog' + fr, HOG[fr], e.dir > 0);
    g.drawImage(im, Math.round(e.x - 2), Math.round(e.y - 1));
  }
  function drawBoss(b, t) {
    if (b.hp <= 0) return;
    if (b.inv > 0 && Math.floor(t * 16) % 2) return;
    const sq = !b.ground ? -0.06 : 0;
    const x = Math.round(b.x - 2), y = Math.round(b.y - 3);
    g.drawImage(BOSS, x, y + Math.round(sq * -10), 32, 32);
    // Gesicht
    const fx = b.dir > 0 ? x + 15 : x + 7;
    g.fillStyle = '#141020'; g.fillRect(fx, y + 12, 3, 4); g.fillRect(fx + 7, y + 12, 3, 4);
    g.fillStyle = '#fff'; g.fillRect(fx, y + 12, 1, 1); g.fillRect(fx + 7, y + 12, 1, 1);
    g.fillStyle = '#141020';
    const angry = b.state !== 'wait';
    g.fillRect(fx - 1, y + 9 + (angry ? 0 : 1), 4, 1); g.fillRect(fx + 7, y + 9 + (angry ? 0 : 1), 4, 1);
    if (angry) { g.fillRect(fx + 2, y + 10, 1, 1); g.fillRect(fx + 7, y + 10, 1, 1); }
    g.fillStyle = '#ff8fab'; g.fillRect(fx - 2, y + 17, 3, 2); g.fillRect(fx + 9, y + 17, 3, 2);
    g.fillStyle = '#141020'; g.fillRect(fx + 2, y + 20, 6, 2);
    if (b.state === 'hurt') { g.fillStyle = '#ef476f'; g.fillRect(fx + 3, y + 21, 4, 2); }
    g.fillStyle = '#ff9f43'; g.fillRect(fx + 4, y + 16, 2, 2); // Karotten-Nase
    // Krone
    g.drawImage(spr('crown', CROWN), x + 6, y - 7, 22, 14);
    if (b.state !== 'wait') for (let i = 0; i < 3; i++) {
      const im = spr(i < b.hp ? 'heart' : 'heartE', i < b.hp ? HEART : HEART.map(r => r.replace(/[RZr]/g, 'D')));
      g.drawImage(im, x + 2 + i * 10, y - 18);
    }
    if (b.state === 'wait') drawText(g, 'Z', x + 30, y - 6 + Math.sin(t * 3) * 3, { s: 1, c: '#8ecae6' });
  }
  function drawPlat(p) {
    const x = Math.round(p.x), y = Math.round(p.y);
    if (theme === 'wolken') {
      for (let c = 0; c < 48; c++) {
        const o = Math.round(2 - 2 * Math.cos((c / 47) * Math.PI * 2 * 2)) >> 1;
        g.fillStyle = '#1a1030'; g.fillRect(x + c, y + o - 1, 1, 11 - o);
        g.fillStyle = '#fff'; g.fillRect(x + c, y + o, 1, 8 - o);
        g.fillStyle = '#c9c3f3'; g.fillRect(x + c, y + 7, 1, 2);
      }
      g.fillStyle = '#ffd166'; g.fillRect(x + 22, y + 10, 4, 2);
    } else {
      g.fillStyle = '#1a1030'; g.fillRect(x - 1, y - 1, 50, 10);
      g.fillStyle = theme === 'fabrik' ? '#6b3a22' : '#8a5a35'; g.fillRect(x, y, 48, 8);
      g.fillStyle = theme === 'fabrik' ? '#8a4f30' : '#a56c40'; g.fillRect(x, y + 1, 48, 2);
      g.fillStyle = '#5e3b22'; for (let k = 12; k < 48; k += 12) g.fillRect(x + k, y, 1, 8);
      g.fillStyle = '#a7b0cf'; g.fillRect(x + 2, y + 4, 2, 2); g.fillRect(x + 44, y + 4, 2, 2);
      if (theme !== 'fabrik') { g.fillStyle = '#eef5ff'; g.fillRect(x, y, 48, 1); }
    }
  }
  function drawDynTile(w, t, tx, ty, type, x, y) {
    if (type === BELT_L || type === BELT_R) {
      g.fillStyle = '#1a1030'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#3b3f55'; g.fillRect(x, y + 1, 16, 6);
      const off = Math.floor(((type === BELT_R ? 1 : -1) * t * PHYS.BELT) % 8 + 8) % 8;
      g.fillStyle = '#ffd166';
      for (let k = -8; k < 16; k += 8) {
        const cx = x + k + off;
        for (let r = 0; r < 4; r++) { const dx = type === BELT_R ? r : 3 - r; const px = cx + dx; if (px >= x && px < x + 15) g.fillRect(px, y + 2 + r, 2, 1); }
      }
      g.fillStyle = '#5b6280'; g.fillRect(x, y + 8, 16, 8);
      g.fillStyle = '#a7b0cf'; g.beginPath(); g.arc(x + 8, y + 12, 3, 0, 7); g.fill();
      g.fillStyle = '#2a2f4a'; g.fillRect(x + 8 + Math.round(Math.cos(t * 6 * (type === BELT_R ? 1 : -1)) * 2), y + 12 + Math.round(Math.sin(t * 6) * 2), 1, 1);
    } else if (type === CRUMBLE) {
      const c = w.crumble[tx + ',' + ty];
      if (c && c.state === 'gone') return;
      const sh = c ? (Math.floor(c.t * 30) % 2 ? 1 : -1) : 0;
      const xx = x + sh;
      g.fillStyle = '#1a1030'; g.fillRect(xx, y + 1, 16, 14); g.fillRect(xx + 1, y, 14, 16);
      g.fillStyle = '#d29a5a'; g.fillRect(xx + 1, y + 1, 14, 14);
      g.fillStyle = '#e8b878'; g.fillRect(xx + 2, y + 2, 10, 2);
      g.fillStyle = '#a8713a'; g.fillRect(xx + 1, y + 13, 14, 2);
      g.fillStyle = '#5b3420'; g.fillRect(xx + 4, y + 6, 2, 2); g.fillRect(xx + 10, y + 5, 2, 2); g.fillRect(xx + 7, y + 10, 2, 2); g.fillRect(xx + 12, y + 10, 1, 2);
      if (c) { g.fillStyle = '#5b3420'; g.fillRect(xx + 7, y + 1, 1, 6); g.fillRect(xx + 8, y + 6, 1, 4); g.fillRect(xx + 3, y + 9, 4, 1); }
    } else if (type === GATE) {
      const a = w.gateOpen ? Math.min(1, (w.gateT || 0)) : 0;
      if (a >= 1) return;
      const yy = y - Math.round(a * 70);
      g.fillStyle = 'rgba(10,8,30,.55)'; g.fillRect(x, yy, 16, 16);
      for (const bx of [1, 6, 11]) { g.fillStyle = '#1a1030'; g.fillRect(x + bx, yy, 4, 16); g.fillStyle = '#6a7099'; g.fillRect(x + bx + 1, yy, 2, 16); }
      g.fillStyle = '#3a3f5c'; g.fillRect(x, yy + 3, 16, 2); g.fillRect(x, yy + 11, 16, 2);
      g.fillStyle = '#ffd166'; g.fillRect(x + 2, yy + 3, 1, 1); g.fillRect(x + 13, yy + 11, 1, 1);
    } else if (type === MUSH) {
      const sq = w.mushT[tx + ',' + ty] || 0;
      const k = sq > 0 ? Math.sin((sq / 0.35) * Math.PI) * 0.35 : 0;
      const im = spr('mush', MUSH_ROWS);
      const hh = Math.round(18 * (1 - k)), ww = Math.round(18 * (1 + k * 0.5));
      g.drawImage(im, x + 8 - ww / 2, y + 17 - hh, ww, hh);
    }
  }

  // ---------- Hauptzeichnung ----------
  function drawWorld(w, cam, t, dt, extra) {
    g.imageSmoothingEnabled = false;
    const lv = w.lv;
    const ox = Math.round(cam.x + (extra.shake ? (Math.random() - 0.5) * extra.shake : 0));
    const oy = Math.round(cam.y + (extra.shake ? (Math.random() - 0.5) * extra.shake : 0));
    drawBg(cam.x, t, -oy);
    // Statische Kacheln
    const sy = oy + PAD * T;
    g.drawImage(layer, ox, Math.max(0, sy), VW, VH, 0, Math.max(0, -sy), VW, VH);
    g.save(); g.translate(-ox, -oy);
    // Dynamische Kacheln
    const x0 = Math.max(0, Math.floor(ox / T)), x1 = Math.min(lv.W - 1, Math.floor((ox + VW) / T));
    for (let ty = 0; ty < lv.H; ty++) for (let tx = x0; tx <= x1; tx++) {
      const tp = lv.tiles[ty * lv.W + tx];
      if (tp === BELT_L || tp === BELT_R || tp === CRUMBLE || tp === GATE || tp === MUSH) drawDynTile(w, t, tx, ty, tp, tx * T, ty * T);
    }
    // Ziel-Baum, Fahnen
    if (lv.tree) drawTree(lv.tree.x, lv.tree.y, extra.treeLit, t, extra.treeGlow);
    lv.flags.forEach((f, i) => drawFlag(f.x + 4, f.y, w.flags[i], t));
    // Münzen und Nüsse
    lv.coins.forEach((c, i) => {
      if (w.coins[i] || c.x < ox - 16 || c.x > ox + VW) return;
      const ph = (t * 2.2 + c.x * 0.013) % 1, sc = Math.abs(Math.cos(ph * Math.PI));
      const ww = Math.max(2, Math.round(12 * sc));
      g.drawImage(spr('coin', COIN), Math.round(c.x + 5 - ww / 2), Math.round(c.y - 1 + Math.sin(t * 3 + c.x) * 1), ww, 12);
    });
    lv.nuts.forEach((n, i) => {
      if (w.nuts[i] || n.x < ox - 20 || n.x > ox + VW + 4) return;
      const bob = Math.round(Math.sin(t * 2.5 + i) * 2);
      g.fillStyle = 'rgba(255,209,102,.18)'; g.beginPath(); g.arc(n.x + 7, n.y + 7 + bob, 11 + Math.sin(t * 4) * 1.5, 0, 7); g.fill();
      g.drawImage(spr('nut', NUT), n.x - 1, n.y - 1 + bob);
      if (Math.sin(t * 3 + i * 2) > 0.7) { g.fillStyle = '#fff'; const sx = n.x + 11, sy2 = n.y + 1 + bob; g.fillRect(sx, sy2 - 2, 1, 5); g.fillRect(sx - 2, sy2, 5, 1); }
    });
    // Plattformen, Eiszapfen, Gegner
    w.plats.forEach(drawPlat);
    w.icicles.forEach(drawIcicle);
    for (const e of w.enemies) { if (!e.alive || e.x < ox - 32 || e.x > ox + VW + 16) continue; if (e.type === 'hog') drawHog(e, t); else drawCube(e, t); }
    for (const b of w.balls) { g.drawImage(BALL, Math.round(b.x - 1), Math.round(b.y - 1)); g.fillStyle = '#a9c6ea'; const a = b.x / 5; g.fillRect(Math.round(b.x + 5 + Math.cos(a) * 3), Math.round(b.y + 5 + Math.sin(a) * 3), 1, 1); }
    if (w.boss) drawBoss(w.boss, t);
    // Spieler
    const p = w.player;
    if (w.phase !== 'fall' && !(p.inv > 0 && w.phase === 'play' && Math.floor(t * 14) % 2 && p.inv < 1.45)) {
      let fr = 'idle';
      if (!p.ground) fr = 'jump';
      else if (Math.abs(p.vx) > 12) fr = ['runA', 'runB', 'runC', 'runB'][Math.floor(p.runT / 9) % 4];
      if (extra.dance) fr = ['idle', 'jump'][Math.floor(t * 4) % 2];
      const im = spr('hero_' + fr, HERO[fr], p.face < 0);
      let sx = 1, sy = 1;
      if (p.land > 0) { sx = 1.25; sy = 0.78; }
      else if (!p.ground && p.vy < -250) { sx = 0.85; sy = 1.15; }
      const wdt = Math.round(18 * sx), hgt = Math.round(18 * sy);
      g.drawImage(im, Math.round(p.x + 5 - wdt / 2), Math.round(p.y + 15 - hgt), wdt, hgt);
    }
    // Geheimwände (werden durchsichtig, wenn man drin ist)
    const sx2 = ox, sy3 = oy + PAD * T;
    g.globalAlpha = p.inFake ? 0.35 : 1;
    g.drawImage(fakeLayer, sx2, Math.max(0, sy3), VW, VH, sx2, Math.max(0, sy3) - PAD * T, VW, VH);
    g.globalAlpha = 1;
    updateParts(dt);
    g.restore();
    drawParts(ox, oy);
    drawWeather(dt, t);
  }

  function hud(w, total, t, VW = 320) {
    g.fillStyle = 'rgba(8,10,34,.55)'; g.fillRect(0, 0, VW, 26);
    for (let i = 0; i < 3; i++) {
      const im = spr(i < w.hearts ? 'heart' : 'heartE', i < w.hearts ? HEART : HEART.map(r => r.replace(/[RZr]/g, 'D')));
      const pop = i === w.hearts - 1 ? 1 + Math.max(0, Math.sin(t * 6)) * 0.08 : 1;
      g.drawImage(im, 6 + i * 21, 4, Math.round(22 * pop * 0.82), Math.round(20 * pop * 0.82));
    }
    g.drawImage(spr('coin', COIN), 112, 6, 14, 14);
    drawText(g, String(w.coinsGot), 130, 7, { s: 2, c: '#ffd166' });
    for (let i = 0; i < w.lv.nuts.length; i++) {
      g.globalAlpha = w.nuts[i] ? 1 : 0.28;
      g.drawImage(spr('nut', NUT), VW - 62 + i * 19, 5, 16, 15);
    }
    g.globalAlpha = 1;
  }

  return {
    setLevel, drawWorld, hud, burst, dust, text, ring, drawTree, drawText: (...a) => drawText(g, ...a),
    sprite: (k, rows, flip) => spr(k, rows, flip), drawBg: (camx, t) => drawBg(camx, t, 0), drawWeather,
    setTheme(th) { theme = th; bgs = bgLayers(th); },
    clearParts() { parts = []; },
    drawParticlesScreen(dt) { updateParts(dt); drawParts(0, 0); },
  };
}
