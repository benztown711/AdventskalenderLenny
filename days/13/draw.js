// Schneeball-Arena: alles Zeichnen (Canvas-Formen, keine Emoji).
import { T, N, WORLD, CX, CY, EMPTY, WALL, ICE, CRATE, ICE_HP, CRATE_HP, idx } from './world.js';
import { HEROES, STAT_NAMES } from './heroes.js';

export const VW = 360, VH = 560;
export const SUPER_BTN = { x: VW - 42, y: VH - 46, r: 28 };
export const cardRect = i => ({ x: 14, y: 128 + i * 128, w: VW - 28, h: 116 });
const TAU = Math.PI * 2;
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
function txt(g, s, x, y, size, color, align = 'center', stroke = 'rgba(8,14,40,.9)', weight = 800) {
  g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle';
  if (stroke) { g.lineWidth = Math.max(2, size / 6); g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  g.fillStyle = color; g.fillText(s, x, y);
}

// ---------- Figuren ----------
export function drawHero(g, e, t, alpha = 1) {
  const h = e.hero, r = e.r, a = Math.atan2(e.fy, e.fx), fx = Math.cos(a), fy = Math.sin(a), px = -fy, py = fx;
  g.save(); g.translate(e.x, e.y); g.globalAlpha = alpha;
  // Schatten + Markierung am Boden
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, r * 0.55, r * 1.05, r * 0.5, 0, 0, TAU); g.fill();
  g.strokeStyle = e.isPlayer ? '#ffd166' : '#ef476f'; g.lineWidth = 2.5;
  g.beginPath(); g.ellipse(0, r * 0.5, r + 4, (r + 4) * 0.5, 0, 0, TAU); g.stroke();
  if (e.sup >= 1) { g.strokeStyle = `rgba(199,125,255,${0.5 + 0.4 * Math.sin(t * 8)})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r + 8, 0, TAU); g.stroke(); }
  let lift = 0, sc = 1;
  if (e.stompT > 0) { const p = 1 - e.stompT / 0.32; lift = Math.sin(p * Math.PI) * 16; sc = 1 + Math.sin(p * Math.PI) * 0.2; }
  const bob = Math.sin(e.walkT * 14) * 1.3;
  g.translate(0, -lift - Math.abs(bob)); g.scale(sc, sc);
  if (e.throwT > 0) { const k = e.throwT / 0.2; g.scale(1 + k * 0.08, 1 - k * 0.06); }
  const flash = e.flash > 0;
  const arm = (side, reach) => {
    const ang = a + side * 1.15 - (reach ? side * 0.9 : 0);
    const d = reach ? r * 1.15 : r * 0.92;
    g.fillStyle = flash ? '#fff' : (h.key === 'brummer' ? '#e9e2d4' : e.color);
    g.beginPath(); g.arc(Math.cos(ang) * d, Math.sin(ang) * d, h.key === 'brummer' ? 6 : 4.5, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.stroke();
  };
  arm(-1, false); arm(1, e.throwT > 0.05);
  if (h.key === 'brummer') {
    // Eisbär: Ohren, Körper, Schal, Schnauze
    for (const s of [-1, 1]) {
      const ea = a + s * 2.2;
      g.fillStyle = flash ? '#fff' : '#f3efe6'; g.beginPath(); g.arc(Math.cos(ea) * r * 0.78, Math.sin(ea) * r * 0.78, 6, 0, TAU); g.fill();
      g.fillStyle = '#e8b4b8'; g.beginPath(); g.arc(Math.cos(ea) * r * 0.78, Math.sin(ea) * r * 0.78, 3, 0, TAU); g.fill();
    }
    g.fillStyle = flash ? '#ffffff' : '#f3efe6'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.strokeStyle = '#cbbfa8'; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = e.color; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, r * 0.72, a + Math.PI - 1.1, a + Math.PI + 1.1); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = '#e6dccb'; g.beginPath(); g.arc(fx * r * 0.62, fy * r * 0.62, 6.5, 0, TAU); g.fill();
    g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(fx * r * 0.86, fy * r * 0.86, 2.8, 0, TAU); g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.arc(fx * r * 0.3 + px * s * 5.5, fy * r * 0.3 + py * s * 5.5, 1.9, 0, TAU); g.fill(); }
  } else {
    // Wichtel-Kind mit Mantel, Gesicht, Mütze
    g.fillStyle = flash ? '#fff' : h.coat; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.stroke();
    const hx = fx * 2, hy = fy * 2, hr = r * 0.7;
    g.fillStyle = '#ffd9b8'; g.beginPath(); g.arc(hx, hy, hr, 0, TAU); g.fill();
    if (h.key === 'flocke') {
      g.fillStyle = e.color; g.beginPath(); g.arc(hx, hy, hr + 1, a + Math.PI / 2 - 0.2, a + Math.PI * 1.5 + 0.2); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2;
      g.beginPath(); g.arc(hx, hy, hr - 2, a + Math.PI / 2 + 0.2, a + Math.PI * 1.5 - 0.2); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(hx - fx * (hr + 3), hy - fy * (hr + 3), 4.5, 0, TAU); g.fill();
    } else {
      // Zapfen: spitze Eiszapfen-Mütze nach hinten
      const bx = hx - fx * 2, by = hy - fy * 2, tipx = hx - fx * (hr + 15), tipy = hy - fy * (hr + 15);
      g.fillStyle = '#bfe6f7';
      g.beginPath(); g.moveTo(bx + px * (hr + 1), by + py * (hr + 1)); g.lineTo(tipx, tipy); g.lineTo(bx - px * (hr + 1), by - py * (hr + 1));
      g.arc(hx, hy, hr + 1, a - Math.PI / 2, a - Math.PI * 1.5, true); g.closePath(); g.fill();
      g.strokeStyle = '#8ecae6'; g.lineWidth = 1.2; g.stroke();
      g.strokeStyle = e.color; g.lineWidth = 3.5;
      g.beginPath(); g.arc(hx, hy, hr - 1, a + Math.PI / 2 + 0.1, a + Math.PI * 1.5 - 0.1); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(tipx + fx * 2, tipy + fy * 2, 2.5, 0, TAU); g.fill();
    }
    g.fillStyle = '#1b1b1b';
    for (const s of [-1, 1]) { g.beginPath(); g.arc(hx + fx * hr * 0.45 + px * s * 3.6, hy + fy * hr * 0.45 + py * s * 3.6, 1.7, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(239,71,111,.45)';
    for (const s of [-1, 1]) { g.beginPath(); g.arc(hx + fx * hr * 0.2 + px * s * 6, hy + fy * hr * 0.2 + py * s * 6, 2, 0, TAU); g.fill(); }
  }
  g.restore();
  g.save(); g.translate(e.x, e.y);
  if (e.shieldT > 0) {
    g.globalAlpha = 0.35 + 0.25 * Math.sin(t * 10);
    g.strokeStyle = '#8ecae6'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, r + 9, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(142,202,230,.15)'; g.fill();
  }
  if (e.stunT > 0) {
    g.globalAlpha = 1; g.fillStyle = '#ffd166';
    for (let i = 0; i < 3; i++) { const sa = t * 6 + i * TAU / 3; g.beginPath(); g.arc(Math.cos(sa) * 12, -r - 4 + Math.sin(sa) * 4, 2.5, 0, TAU); g.fill(); }
  }
  if (e.dashT > 0) {
    g.globalAlpha = 0.7; g.strokeStyle = '#e3f6ff'; g.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, r + 6 + i * 6, t * 18 + i * 2, t * 18 + i * 2 + 2.2); g.stroke(); }
  }
  g.restore();
}

function drawBars(g, e, W) {
  const w = e.hero.key === 'brummer' ? 40 : 34, x = e.x - w / 2, y = e.y - e.r - 17;
  g.fillStyle = 'rgba(8,14,40,.85)'; rr(g, x - 1.5, y - 1.5, w + 3, 8, 3); g.fill();
  g.fillStyle = '#ffffff'; g.fillRect(x, y, w * Math.max(0, e.ghost / e.maxHp), 5);
  g.fillStyle = e.isPlayer ? '#06d6a0' : '#ef476f'; g.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 5);
  txt(g, String(Math.ceil(e.hp)), e.x, y - 7, 9, '#ffffff', 'center', 'rgba(8,14,40,.95)', 800);
  if (e.crystals > 0) {
    const cx = x - 7, cy = y + 2;
    g.fillStyle = '#c77dff'; g.beginPath(); g.moveTo(cx, cy - 6); g.lineTo(cx + 4.5, cy); g.lineTo(cx, cy + 6); g.lineTo(cx - 4.5, cy); g.closePath(); g.fill();
    txt(g, String(e.crystals), cx, cy + 0.5, 7, '#ffffff', 'center', null, 900);
  }
  if (e.isPlayer) {
    const sw = (w - 4) / 3;
    for (let i = 0; i < 3; i++) {
      const f = Math.max(0, Math.min(1, e.ammo - i));
      g.fillStyle = 'rgba(8,14,40,.85)'; g.fillRect(x + i * (sw + 2), y + 7, sw, 4);
      g.fillStyle = f >= 1 ? '#ffd166' : (W.noAmmoT > 0 ? '#ef476f' : '#a07a2a'); g.fillRect(x + i * (sw + 2), y + 7, sw * f, 4);
    }
  }
}

// ---------- Karte ----------
function drawFloor(g, W, tx0, ty0, tx1, ty1) {
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const i = idx(tx, ty), x = tx * T, y = ty * T;
    g.fillStyle = (tx + ty) & 1 ? '#1b2a60' : '#1e2f68'; g.fillRect(x, y, T, T);
    g.fillStyle = 'rgba(255,255,255,.18)';
    for (let k = 0; k < 3; k++) { const hx = hash(i * 7 + k), hy = hash(i * 13 + k + 5); g.fillRect(x + hx * 36 + 2, y + hy * 36 + 2, 2, 2); }
  }
}
function drawBush(g, x, y, i, t, W) {
  const sway = Math.sin(t * 1.6 + i) * 1.2;
  for (let k = 0; k < 2; k++) {
    const ox = x + 10 + hash(i * 3 + k) * 20 + sway, oy = y + 10 + hash(i * 5 + k * 7) * 20, R = 14 + hash(i + k * 11) * 4;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(ox + 3, oy + 5, R, 0, TAU); g.fill();
    const layers = [['#145a3a', R], ['#1f7a4d', R * 0.74], ['#2a9d5c', R * 0.46]];
    for (const [c, rr2] of layers) {
      g.fillStyle = c; g.beginPath();
      for (let p = 0; p < 16; p++) { const a = p * TAU / 16 + k, rad = p % 2 ? rr2 * 0.72 : rr2; g.lineTo(ox + Math.cos(a) * rad, oy + Math.sin(a) * rad); }
      g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let s = 0; s < 3; s++) { const a = hash(i * 17 + s + k) * TAU, d = R * 0.55; g.beginPath(); g.arc(ox + Math.cos(a) * d, oy + Math.sin(a) * d, 2, 0, TAU); g.fill(); }
  }
}
function drawBlock(g, W, i, x, y, t) {
  const type = W.tiles[i];
  const hitAgo = W.t - (W.tileHit.get(i) ?? -9);
  const jig = hitAgo < 0.15 ? Math.sin(hitAgo * 120) * 2 : 0;
  x += jig;
  if (type === WALL) {
    g.fillStyle = '#34508a'; g.fillRect(x, y + T - 9, T, 9);
    g.fillStyle = '#6d8fc9'; g.fillRect(x, y - 8, T, T + 1);
    g.strokeStyle = '#5576b2'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y + 12); g.lineTo(x + T, y + 12); g.moveTo(x + (W.tiles[i] && (i & 1) ? 14 : 26), y - 8); g.lineTo(x + ((i & 1) ? 14 : 26), y + 12); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y - 8, T, 3);
  } else if (type === ICE) {
    g.fillStyle = '#5fa3cc'; g.fillRect(x, y + T - 9, T, 9);
    g.fillStyle = '#a9dcf3'; g.fillRect(x, y - 8, T, T + 1);
    g.fillStyle = '#d7f1fc'; g.fillRect(x + 5, y - 3, T - 10, T - 10);
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 9, y + 2); g.lineTo(x + 17, y - 4 + 2); g.stroke();
    const f = W.hp[i] / ICE_HP;
    if (f < 0.7) {
      g.strokeStyle = '#3d7ea8'; g.lineWidth = 1.5; g.beginPath();
      g.moveTo(x + 20, y - 8); g.lineTo(x + 16, y + 6); g.lineTo(x + 24, y + 14); g.lineTo(x + 19, y + T - 9);
      if (f < 0.4) { g.moveTo(x, y + 10); g.lineTo(x + 12, y + 12); g.lineTo(x + 16, y + 6); g.moveTo(x + 24, y + 14); g.lineTo(x + T, y + 18); }
      g.stroke();
    }
  } else if (type === CRATE) {
    g.fillStyle = '#7d3fb3'; g.fillRect(x + 2, y + T - 10, T - 4, 9);
    g.fillStyle = '#c77dff'; g.fillRect(x + 2, y - 6, T - 4, T - 3);
    g.fillStyle = '#ffd166'; g.fillRect(x + T / 2 - 3, y - 6, 6, T + 6); g.fillRect(x + 2, y + 11, T - 4, 6);
    g.fillStyle = '#ffe9a8';
    g.beginPath(); g.ellipse(x + T / 2 - 6, y - 5, 6, 4, -0.5, 0, TAU); g.ellipse(x + T / 2 + 6, y - 5, 6, 4, 0.5, 0, TAU); g.fill();
    const glow = 0.25 + 0.2 * Math.sin(t * 3 + i);
    g.fillStyle = `rgba(255,255,255,${glow})`; g.fillRect(x + 5, y - 3, 8, 3);
    const f = W.hp[i] / CRATE_HP;
    if (f < 1) {
      g.fillStyle = 'rgba(8,14,40,.8)'; g.fillRect(x + 4, y - 14, T - 8, 4);
      g.fillStyle = '#c77dff'; g.fillRect(x + 4, y - 14, (T - 8) * f, 4);
    }
  }
}
function drawCrystal(g, c, t) {
  let x = c.x, y = c.y, hop = 0;
  if (c.t < 0.45) { const p = c.t / 0.45; x = c.sx + (c.x - c.sx) * p; y = c.sy + (c.y - c.sy) * p; hop = Math.sin(p * Math.PI) * 22; }
  const b = Math.sin(t * 4 + c.x) * 2;
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y + 8, 7, 3, 0, 0, TAU); g.fill();
  g.save(); g.translate(x, y - hop - 4 + b);
  g.shadowColor = '#c77dff'; g.shadowBlur = 12;
  g.fillStyle = '#c77dff'; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, -2); g.lineTo(0, 10); g.lineTo(-8, -2); g.closePath(); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = '#e9c9ff'; g.beginPath(); g.moveTo(0, -11); g.lineTo(3, -2); g.lineTo(0, 6); g.lineTo(-3, -2); g.closePath(); g.fill();
  g.restore();
}
function drawShot(g, s) {
  if (s.delay > 0) return;
  if (s.kind === 'roll') {
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(s.x + 3, s.y + s.r * 0.7, s.r, s.r * 0.45, 0, 0, TAU); g.fill();
    g.fillStyle = '#f4fbff'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
    g.strokeStyle = '#bcd9ec'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = 'rgba(142,202,230,.8)'; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const a = s.spin + k * 2.1; g.beginPath(); g.arc(s.x + Math.cos(a) * s.r * 0.45, s.y + Math.sin(a) * s.r * 0.45, s.r * 0.3, a, a + 2); g.stroke(); }
    return;
  }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(s.x + 2, s.y + 7, s.r, s.r * 0.5, 0, 0, TAU); g.fill();
  if (s.kind === 'icicle') {
    const a = Math.atan2(s.vy, s.vx);
    g.save(); g.translate(s.x, s.y); g.rotate(a);
    g.fillStyle = 'rgba(191,230,247,.35)'; g.fillRect(-30, -2, 22, 4);
    g.fillStyle = '#bfe6f7'; g.beginPath(); g.moveTo(12, 0); g.lineTo(-8, -5); g.lineTo(-12, 0); g.lineTo(-8, 5); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(10, 0); g.lineTo(-6, -2); g.lineTo(-6, 2); g.closePath(); g.fill();
    g.restore();
    return;
  }
  g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(s.x - s.vx * 0.02, s.y - s.vy * 0.02, s.r * 0.8, 0, TAU); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
  g.strokeStyle = '#a9c9e0'; g.lineWidth = 1; g.stroke();
}
function drawTumble(g, tb, t) {
  const p = tb.t / 1.8, e = tb.e, r = (e.r + 2) * (1 - p * 0.35);
  g.save(); g.globalAlpha = p > 0.8 ? (1 - p) * 5 : 1;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(tb.x + 2, tb.y + r * 0.7, r, r * 0.45, 0, 0, TAU); g.fill();
  g.translate(tb.x, tb.y); g.rotate(tb.rot);
  g.fillStyle = '#f4fbff'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.strokeStyle = e.color; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r * 0.6, 0, 2.4); g.stroke();
  g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(r * 0.3, -r * 0.2, 1.6, 0, TAU); g.arc(r * 0.3, r * 0.2, 1.6, 0, TAU); g.fill();
  g.restore();
  if (tb.t < 1.3) txt(g, 'Purzel!', tb.x, tb.y - 26 - tb.t * 14, 13, '#ffffff', 'center', 'rgba(8,14,40,.9)');
}
function drawStorm(g, W, t) {
  const R = W.ringR;
  if (R > 1030) return;
  g.save();
  g.beginPath(); g.rect(-60, -60, WORLD + 120, WORLD + 120); g.arc(CX, CY, Math.max(0, R), 0, TAU, true);
  g.fillStyle = 'rgba(200,225,255,.30)'; g.fill('evenodd');
  g.clip('evenodd');
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5;
  const x0 = W.cam.x - 40, y0 = W.cam.y - 40;
  for (let k = 0; k < 60; k++) {
    const sx = x0 + ((hash(k) * 460 + t * 260) % 460), sy = y0 + ((hash(k + 99) * 660 + t * 120) % 660);
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 14, sy - 6); g.stroke();
  }
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3;
  g.beginPath(); g.arc(CX, CY, Math.max(0, R), 0, TAU); g.stroke();
  g.setLineDash([10, 12]); g.lineDashOffset = -t * 30; g.strokeStyle = 'rgba(142,202,230,.9)'; g.lineWidth = 2;
  g.beginPath(); g.arc(CX, CY, Math.max(0, R + 8), 0, TAU); g.stroke(); g.setLineDash([]);
}

// ---------- Spielbild ----------
export function drawGame(g, W, S) {
  const t = S.t, P = W.player;
  const sx = (Math.random() - 0.5) * W.shake * 2, sy = (Math.random() - 0.5) * W.shake * 2;
  g.save();
  g.fillStyle = '#0b1437'; g.fillRect(0, 0, VW, VH);
  g.translate(-Math.round(W.cam.x) + sx, -Math.round(W.cam.y) + sy);
  const tx0 = Math.max(0, Math.floor(W.cam.x / T) - 1), tx1 = Math.min(N - 1, Math.floor((W.cam.x + VW) / T) + 1);
  const ty0 = Math.max(0, Math.floor(W.cam.y / T) - 1), ty1 = Math.min(N - 1, Math.floor((W.cam.y + VH) / T) + 1);
  drawFloor(g, W, tx0, ty0, tx1, ty1);
  g.fillStyle = 'rgba(160,190,230,.25)';
  for (const p of W.prints) { g.globalAlpha = Math.min(1, p.life); g.beginPath(); g.ellipse(p.x, p.y, 3, 2, 0, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const i = idx(tx, ty); if (W.bush[i]) drawBush(g, tx * T, ty * T, i, t, W); }
  for (const c of W.crystals) drawCrystal(g, c, t);
  // Zielhilfe für den Spieler
  if (P.alive && W.aimTarget) {
    const o = W.aimTarget;
    g.strokeStyle = 'rgba(255,209,102,.35)'; g.lineWidth = 2; g.setLineDash([6, 8]); g.lineDashOffset = -t * 40;
    g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(o.x, o.y); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(255,209,102,.8)'; g.beginPath(); g.arc(o.x, o.y, o.r + 10 + Math.sin(t * 8) * 1.5, 0, TAU); g.stroke();
  }
  // Blöcke zeilenweise, Figuren dazwischen nach y sortiert
  const ents = W.ents.filter(e => e.alive && (e === P || W.canSeeP(e))).sort((a, b) => a.y - b.y);
  let ei = 0;
  for (let ty = ty0; ty <= ty1; ty++) {
    while (ei < ents.length && ents[ei].y < ty * T + T - 8) { const e = ents[ei++]; drawHero(g, e, t, e.inBush ? (e === P ? 0.55 : 0.7) : 1); }
    for (let tx = tx0; tx <= tx1; tx++) { const i = idx(tx, ty); if (W.tiles[i] !== EMPTY) drawBlock(g, W, i, tx * T, ty * T, t); }
  }
  while (ei < ents.length) { const e = ents[ei++]; drawHero(g, e, t, e.inBush ? (e === P ? 0.55 : 0.7) : 1); }
  for (const s of W.shots) drawShot(g, s);
  for (const tb of W.tumbles) drawTumble(g, tb, t);
  for (const f of W.fx) {
    if (f.kind === 'wave') {
      const p = f.t / f.dur;
      g.strokeStyle = `rgba(255,255,255,${1 - p})`; g.lineWidth = 8 * (1 - p) + 2;
      g.beginPath(); g.arc(f.x, f.y, f.R * p, 0, TAU); g.stroke();
      g.strokeStyle = `rgba(142,202,230,${(1 - p) * 0.8})`; g.lineWidth = 3;
      g.beginPath(); g.arc(f.x, f.y, f.R * p * 0.7, 0, TAU); g.stroke();
    }
  }
  for (const p of W.parts) {
    g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5)); g.fillStyle = p.color;
    g.beginPath(); g.arc(p.x, p.y, p.size * (0.5 + 0.5 * p.life / p.max), 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  for (const e of ents) drawBars(g, e, W);
  drawStorm(g, W, t);
  for (const n of W.nums) {
    g.globalAlpha = Math.min(1, n.life * 3);
    const s = n.big ? 17 : 13, pop = n.life > 0.7 ? 1 + (n.life - 0.7) * 3 : 1;
    txt(g, n.text, n.x, n.y, s * pop, n.color);
  }
  g.globalAlpha = 1;
  g.restore();
  drawUI(g, W, S, ents);
}

function drawUI(g, W, S, visEnts) {
  const t = S.t, P = W.player;
  // Treffer-Vignette
  if (W.hurt > 0) {
    const gr = g.createRadialGradient(VW / 2, VH / 2, VH * 0.25, VW / 2, VH / 2, VH * 0.7);
    gr.addColorStop(0, 'rgba(239,71,111,0)'); gr.addColorStop(1, `rgba(239,71,111,${W.hurt})`);
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  }
  const inStorm = P.alive && Math.hypot(P.x - CX, P.y - CY) > W.ringR;
  if (inStorm) {
    g.strokeStyle = `rgba(142,202,230,${0.5 + 0.3 * Math.sin(t * 8)})`; g.lineWidth = 10; g.strokeRect(0, 0, VW, VH);
    txt(g, 'Raus aus dem Sturm!', VW / 2, 92, 18, '#e3f6ff');
  }
  // Pfeile zu Gegnern außerhalb des Bildes
  for (const e of visEnts) {
    if (e === P) continue;
    const x = e.x - W.cam.x, y = e.y - W.cam.y;
    if (x > 0 && x < VW && y > 0 && y < VH) continue;
    if (Math.hypot(e.x - P.x, e.y - P.y) > 650) continue;
    const a = Math.atan2(y - VH / 2, x - VW / 2);
    const ex = Math.max(16, Math.min(VW - 16, x)), ey = Math.max(70, Math.min(VH - 80, y));
    g.save(); g.translate(ex, ey); g.rotate(a);
    g.fillStyle = 'rgba(239,71,111,.9)'; g.beginPath(); g.moveTo(10, 0); g.lineTo(-6, -7); g.lineTo(-6, 7); g.closePath(); g.fill();
    g.restore();
  }
  // Minikarte
  const mm = 78, mx = VW - mm - 8, my = 8, k = mm / WORLD;
  g.fillStyle = 'rgba(8,14,40,.75)'; rr(g, mx - 3, my - 3, mm + 6, mm + 6, 6); g.fill();
  g.fillStyle = 'rgba(200,225,255,.35)'; g.fillRect(mx, my, mm, mm);
  g.save(); g.beginPath(); g.rect(mx, my, mm, mm); g.clip();
  g.fillStyle = '#1e2f68'; g.beginPath(); g.arc(mx + CX * k, my + CY * k, Math.max(0, W.ringR * k), 0, TAU); g.fill();
  g.restore();
  for (let i = 0; i < N * N; i++) {
    const tt = W.tiles[i]; if (tt === EMPTY) continue;
    g.fillStyle = tt === CRATE ? '#c77dff' : tt === ICE ? '#a9dcf3' : '#6d8fc9';
    g.fillRect(mx + (i % N) * T * k, my + ((i / N) | 0) * T * k, T * k + 0.3, T * k + 0.3);
  }
  for (const e of visEnts) {
    g.fillStyle = e === P ? '#ffd166' : '#ef476f';
    g.beginPath(); g.arc(mx + e.x * k, my + e.y * k, e === P ? 3 : 2.3, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.strokeRect(mx + W.cam.x * k, my + W.cam.y * k, VW * k, VH * k);
  // Sturm-Info und Meldungen links oben
  let info;
  if (W.t < 18) info = `Sturm in ${Math.ceil(18 - W.t)} s`;
  else if (W.ringPhase % 2 === 1) info = 'Sturm zieht zu';
  else info = 'Sturm macht Pause';
  g.fillStyle = 'rgba(8,14,40,.7)'; rr(g, 8, 8, 122, 22, 8); g.fill();
  txt(g, info, 69, 19.5, 11, '#8ecae6', 'center', null, 800);
  W.feed.forEach((f, i) => {
    g.globalAlpha = Math.min(1, (4 - f.t) * 2);
    txt(g, f.text, 10, 42 + i * 16, 11, f.color, 'left');
  });
  g.globalAlpha = 1;
  // Unten: Würfe und Super
  if (P.alive) {
    g.fillStyle = 'rgba(8,14,40,.72)'; rr(g, 8, VH - 38, 128, 30, 10); g.fill();
    txt(g, 'Würfe', 16, VH - 23, 11, '#ffffff', 'left', null);
    for (let i = 0; i < 3; i++) {
      const f = Math.max(0, Math.min(1, P.ammo - i)), x = 56 + i * 26;
      g.fillStyle = 'rgba(255,255,255,.15)'; rr(g, x, VH - 30, 22, 14, 4); g.fill();
      g.fillStyle = f >= 1 ? '#ffd166' : (W.noAmmoT > 0 ? '#ef476f' : '#a07a2a'); rr(g, x, VH - 30, 22 * f, 14, 4); g.fill();
    }
    const B = SUPER_BTN, ready = P.sup >= 1;
    g.fillStyle = 'rgba(8,14,40,.75)'; g.beginPath(); g.arc(B.x, B.y, B.r + 4, 0, TAU); g.fill();
    g.fillStyle = ready ? `rgba(199,125,255,${0.75 + 0.25 * Math.sin(t * 8)})` : 'rgba(199,125,255,.25)';
    g.beginPath(); g.moveTo(B.x, B.y); g.arc(B.x, B.y, B.r, -Math.PI / 2, -Math.PI / 2 + TAU * P.sup); g.closePath(); g.fill();
    g.strokeStyle = ready ? '#ffffff' : '#c77dff'; g.lineWidth = 2.5; g.beginPath(); g.arc(B.x, B.y, B.r, 0, TAU); g.stroke();
    txt(g, 'SUPER', B.x, B.y - 4, 11, '#ffffff', 'center', 'rgba(8,14,40,.8)');
    txt(g, ready ? 'bereit!' : Math.floor(P.sup * 100) + '%', B.x, B.y + 9, 9, ready ? '#ffd166' : '#e9c9ff', 'center', 'rgba(8,14,40,.8)');
  }
  // große Mitte-Meldungen
  W.msgs.forEach((m, i) => {
    const p = m.t / m.dur, pop = m.t < 0.15 ? 0.6 + m.t / 0.15 * 0.5 : 1.1 - Math.min(0.1, (m.t - 0.15));
    g.globalAlpha = p > 0.75 ? (1 - p) * 4 : 1;
    txt(g, m.text, VW / 2, VH * 0.3 + i * 40, m.size * pop, m.color);
  });
  g.globalAlpha = 1;
}

// ---------- Heldenwahl ----------
export function drawSelect(g, S, stufe, pokale) {
  const t = S.t;
  g.fillStyle = '#0b1437'; g.fillRect(0, 0, VW, VH);
  g.fillStyle = 'rgba(255,255,255,.7)';
  for (const f of S.flakes) { g.beginPath(); g.arc(f.x, f.y, f.s, 0, TAU); g.fill(); }
  txt(g, 'Schneeball-Arena', VW / 2, 40, 28 + Math.sin(t * 3) * 0.8, '#ffd166');
  txt(g, `Stufe ${stufe} von 3   ·   Pokale: ${pokale}`, VW / 2, 74, 14, '#8ecae6', 'center', null, 700);
  txt(g, 'Wähle deinen Helden', VW / 2, 104, 15, '#ffffff', 'center', null, 800);
  HEROES.forEach((h, i) => {
    const r = cardRect(i), sel = i === S.sel;
    g.fillStyle = sel ? '#22357a' : '#141f4d'; rr(g, r.x, r.y, r.w, r.h, 14); g.fill();
    g.strokeStyle = sel ? '#ffd166' : 'rgba(142,202,230,.35)'; g.lineWidth = sel ? 3 : 1.5; g.stroke();
    const e = { hero: h, r: h.r, x: 0, y: 0, fx: Math.sin(t * 1.2 + i) * 0.6, fy: 1, sup: sel ? 1 : 0, walkT: sel ? t : 0, throwT: 0, flash: 0, shieldT: 0, stunT: 0, dashT: 0, stompT: 0, color: '#ffd166', isPlayer: true };
    g.save(); g.translate(r.x + 58, r.y + r.h / 2 + 4); g.scale(2.1, 2.1); drawHero(g, e, t); g.restore();
    txt(g, h.name, r.x + 112, r.y + 22, 20, sel ? '#ffd166' : '#ffffff', 'left', null, 900);
    txt(g, h.tag, r.x + 112, r.y + 41, 11.5, '#8ecae6', 'left', null, 600);
    STAT_NAMES.forEach((s, k) => {
      const y = r.y + 56 + k * 12;
      txt(g, s, r.x + 112, y, 10, '#c9d6f5', 'left', null, 600);
      for (let p = 0; p < 3; p++) { g.fillStyle = p < h.stats[k] ? '#06d6a0' : 'rgba(255,255,255,.15)'; rr(g, r.x + 180 + p * 18, y - 4, 15, 8, 3); g.fill(); }
    });
    txt(g, `Super: ${h.superName}`, r.x + 112, r.y + 94, 11.5, '#c77dff', 'left', null, 800);
    txt(g, h.superText, r.x + 112, r.y + 107, 10, '#9fb0d8', 'left', null, 600);
  });
  const blink = 0.6 + 0.4 * Math.sin(t * 4);
  g.globalAlpha = blink;
  txt(g, 'Antippen oder Leertaste: Los geht\'s!', VW / 2, VH - 22, 13, '#ffd166', 'center', null, 800);
  g.globalAlpha = 1;
}
