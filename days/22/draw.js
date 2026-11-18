// Türchen 22: Zeichen-Funktionen (alles Canvas-Formen, keine Emoji)
import { W, MAP_H, PATH, SPOTS, posAt } from './logic.js';

export const C = { night: '#0b1437', gold: '#ffd166', red: '#ef476f', green: '#06d6a0', ice: '#8ecae6', violet: '#c77dff', snow: '#f4f7ff' };
const TAU = Math.PI * 2;
export const FONT = '"Baloo 2", "Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fill(); }
export function ring(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.stroke(); }
export function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); g.fill(); }
export function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function text(g, s, x, y, size, color, { align = 'center', weight = 800, stroke = null, sw = 4, base = 'middle' } = {}) {
  g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = base;
  if (stroke) { g.lineJoin = 'round'; g.strokeStyle = stroke; g.lineWidth = sw; g.strokeText(s, x, y); }
  g.fillStyle = color; g.fillText(s, x, y);
}
export function star(g, x, y, r, rot = 0, pts = 5, inner = 0.45) {
  g.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = rot - Math.PI / 2 + i * Math.PI / pts, rr = i % 2 ? r * inner : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
}
export function cookie(g, x, y, r) {
  g.fillStyle = '#d99a4e'; circle(g, x, y, r);
  g.fillStyle = '#f2c27b'; circle(g, x - r * 0.15, y - r * 0.15, r * 0.78);
  g.fillStyle = '#5b3a1e';
  circle(g, x - r * 0.35, y - r * 0.2, r * 0.15); circle(g, x + r * 0.3, y - r * 0.05, r * 0.15); circle(g, x, y + r * 0.35, r * 0.15);
}
function snowflake(g, x, y, r, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
  for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(-Math.cos(a) * r, -Math.sin(a) * r); }
  g.stroke(); g.restore();
}
export { snowflake };

// ---------- Hintergrund (einmal vorgerendert) ----------
function seeded(a) { return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; }
export function makeBackground() {
  const S = 2, cv = document.createElement('canvas');
  cv.width = W * S; cv.height = MAP_H * S;
  const g = cv.getContext('2d'); g.scale(S, S);
  const rnd = seeded(2212);
  // Nacht-Schneefeld
  const gr = g.createLinearGradient(0, 0, 0, MAP_H);
  gr.addColorStop(0, '#16245e'); gr.addColorStop(0.55, '#14215a'); gr.addColorStop(1, '#0f1a4a');
  g.fillStyle = gr; g.fillRect(0, 0, W, MAP_H);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(190,210,255,${0.025 + rnd() * 0.035})`;
    ell(g, rnd() * W, rnd() * MAP_H, 18 + rnd() * 40, 8 + rnd() * 16);
  }
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.35})`; circle(g, rnd() * W, rnd() * MAP_H, 0.5 + rnd() * 0.8); }
  // Pfad
  const line = (w, col) => {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    PATH.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
  };
  line(44, 'rgba(5,10,35,.55)'); line(38, '#5d74b8'); line(32, '#8ea6dc'); line(20, '#a9bdea');
  // Fußspuren
  g.fillStyle = 'rgba(70,95,160,.45)';
  for (let d = 10; d < PATH.len; d += 11) {
    const p = posAt(d), side = (Math.floor(d / 11) % 2 ? 1 : -1) * 5;
    const nx = -Math.sin(p.ang), ny = Math.cos(p.ang);
    g.save(); g.translate(p.x + nx * side, p.y + ny * side); g.rotate(p.ang); ell(g, 0, 0, 2.6, 1.6); g.restore();
  }
  // Eishöhle am Start
  g.fillStyle = '#050a22'; ell(g, 2, 62, 26, 30);
  g.strokeStyle = C.ice; g.lineWidth = 3; g.beginPath(); g.ellipse(2, 62, 26, 30, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
  g.fillStyle = '#d6ecff';
  for (let i = 0; i < 6; i++) { const a = -1.3 + i * 0.5, x = 2 + Math.cos(a) * 24, y = 62 + Math.sin(a) * 28; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.lineTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9 + 2); g.fill(); }
  // Tannen-Deko (nicht auf Pfad oder Bauplätzen)
  const trees = [];
  for (let k = 0; k < 400 && trees.length < 22; k++) {
    const x = 8 + rnd() * (W - 16), y = 14 + rnd() * (MAP_H - 30);
    let ok = Math.hypot(x - 180, y - 500) > 70;
    for (const p of PATH.pts) if (Math.hypot(p[0] - x, p[1] - y) < 30) { ok = false; break; }
    for (const s of SPOTS) if (Math.hypot(s.x - x, s.y - y) < 34) ok = false;
    for (const t of trees) if (Math.hypot(t.x - x, t.y - y) < 22) ok = false;
    if (ok) trees.push({ x, y, s: 0.7 + rnd() * 0.5 });
  }
  trees.sort((a, b) => a.y - b.y).forEach(t => pine(g, t.x, t.y, t.s));
  return cv;
}
function pine(g, x, y, s) {
  g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, x + 3, y + 2, 9 * s, 3 * s);
  g.fillStyle = '#4a2f22'; g.fillRect(x - 1.5 * s, y - 3 * s, 3 * s, 5 * s);
  for (let i = 0; i < 3; i++) {
    const yy = y - 4 * s - i * 6 * s, ww = (10 - i * 2.5) * s;
    g.fillStyle = i % 2 ? '#1d6b4c' : '#17583f';
    g.beginPath(); g.moveTo(x - ww, yy); g.lineTo(x + ww, yy); g.lineTo(x, yy - 9 * s); g.fill();
    g.fillStyle = 'rgba(244,247,255,.85)';
    g.beginPath(); g.moveTo(x - ww * 0.5, yy - 4.5 * s); g.lineTo(x, yy - 9 * s); g.lineTo(x + ww * 0.45, yy - 4 * s); g.lineTo(x, yy - 6 * s); g.fill();
  }
}

// ---------- Weihnachtsbaum + Geschenke ----------
export const TREE = { x: 180, y: 500 };
const GIFT_COLORS = ['#ef476f', '#06d6a0', '#c77dff', '#ffd166', '#8ecae6'];
export const GIFTS = (() => {
  const out = [];
  const pile = (cx, dir) => {
    const rows = [4, 3, 2, 1];
    rows.forEach((n, r) => { for (let i = 0; i < n; i++) out.push({ x: cx + dir * (i * 12 + r * 6), y: 540 - r * 10, s: 10 - r * 0.6 }); });
  };
  pile(150, -1); pile(210, 1);
  // die 20 sichtbaren Geschenke (die oberen zuletzt weg)
  return out.sort((a, b) => b.y - a.y).slice(0, 20);
})();
export function drawTree(g, lives, T, flash) {
  const { x, y } = TREE;
  g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, x, y + 42, 46, 8);
  g.fillStyle = '#5a3a26'; g.fillRect(x - 6, y + 24, 12, 18);
  const layers = [[44, 30, 26], [36, 10, 24], [27, -10, 22], [18, -28, 20]];
  layers.forEach(([w, yy, h], i) => {
    g.fillStyle = i % 2 ? '#1f8a5b' : '#18734b';
    g.beginPath(); g.moveTo(x - w, y + yy); g.quadraticCurveTo(x, y + yy + 7, x + w, y + yy); g.lineTo(x, y + yy - h - 10); g.closePath(); g.fill();
    g.fillStyle = 'rgba(244,247,255,.9)';
    g.beginPath(); g.moveTo(x - w, y + yy); g.quadraticCurveTo(x, y + yy + 7, x + w, y + yy); g.quadraticCurveTo(x, y + yy + 2, x - w, y + yy); g.fill();
  });
  // Lichterkette
  for (let i = 0; i < 14; i++) {
    const row = i % 4, k = Math.floor(i / 4), ly = y + 24 - row * 19, lw = 38 - row * 8;
    const lx = x + (((i * 37) % 13) / 13 - 0.5) * lw * 1.6 + k * 2;
    const c = GIFT_COLORS[i % 5], on = Math.sin(T * 4 + i * 1.7) > -0.2;
    g.shadowColor = c; g.shadowBlur = on ? 8 : 0; g.fillStyle = on ? c : '#3d4a7a'; circle(g, lx, ly, 2.4);
  }
  g.shadowBlur = 0;
  // Stern
  g.shadowColor = C.gold; g.shadowBlur = 14 + Math.sin(T * 3) * 5; g.fillStyle = C.gold;
  star(g, x, y - 60, 10, Math.sin(T * 1.5) * 0.15);
  g.shadowBlur = 0;
  // Geschenke
  for (let i = 0; i < lives && i < GIFTS.length; i++) gift(g, GIFTS[i].x, GIFTS[i].y, GIFTS[i].s, GIFT_COLORS[i % 5], T, i);
  if (flash > 0) { g.fillStyle = `rgba(239,71,111,${flash * 0.5})`; ell(g, x, y + 10, 70, 60); }
}
export function gift(g, x, y, s, col, T = 0, i = 0) {
  const h = s * 0.85, wob = Math.sin(T * 2 + i) * 0.3;
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - s / 2 + 1, y - h / 2 + 2, s, h);
  g.fillStyle = col; g.fillRect(x - s / 2, y - h / 2, s, h);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x - 1.2, y - h / 2, 2.4, h); g.fillRect(x - s / 2, y - 1, s, 2);
  g.fillStyle = C.gold; ell(g, x - 2.2 + wob, y - h / 2 - 1.2, 2.2, 1.4); ell(g, x + 2.2 - wob, y - h / 2 - 1.2, 2.2, 1.4);
}

// ---------- Bauplatz ----------
export function drawSpot(g, s, T, hi) {
  g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, s.x, s.y + 4, 20, 9);
  g.fillStyle = hi ? 'rgba(255,209,102,.18)' : 'rgba(142,202,230,.10)'; circle(g, s.x, s.y, 18);
  g.strokeStyle = hi ? C.gold : 'rgba(200,220,255,.45)'; g.lineWidth = 2;
  g.setLineDash([5, 4]); g.lineDashOffset = -T * 8; ring(g, s.x, s.y, 18); g.setLineDash([]);
  g.strokeStyle = hi ? C.gold : 'rgba(220,235,255,.6)'; g.lineWidth = 2.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(s.x - 5, s.y); g.lineTo(s.x + 5, s.y); g.moveTo(s.x, s.y - 5); g.lineTo(s.x, s.y + 5); g.stroke();
}

// ---------- Türme ----------
function base(g, x, y, lvl) {
  g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, x, y + 6, 20, 9);
  g.fillStyle = '#5b3d2c'; circle(g, x, y + 2, 17);
  g.fillStyle = lvl === 2 ? '#c9952f' : lvl === 1 ? '#8f6a4a' : '#7a523a'; circle(g, x, y, 17);
  g.fillStyle = '#4a3020'; circle(g, x, y, 13);
  g.fillStyle = 'rgba(244,247,255,.9)';
  g.beginPath(); g.arc(x, y, 17, Math.PI * 1.05, Math.PI * 1.95); g.arc(x, y, 14.5, Math.PI * 1.9, Math.PI * 1.1, true); g.fill();
}
function pips(g, x, y, lvl) {
  for (let i = 0; i <= lvl; i++) {
    const px = x + (i - lvl / 2) * 8;
    g.fillStyle = '#2a1a10'; circle(g, px, y + 15, 3.4); g.fillStyle = C.gold; star(g, px, y + 15, 3.4, 0);
  }
}
export function drawTower(g, t, T, icon = false) {
  const { x, y } = t, lvl = t.lvl || 0, k = t.kick || 0, a = t.ang ?? -Math.PI / 2;
  if (!icon) base(g, x, y, lvl);
  if (t.type === 'sling') {
    // Steinschleuder steht aufrecht und lehnt sich zum Ziel
    const lean = Math.max(-0.55, Math.min(0.55, Math.cos(a) * 0.55)), pull = (1 - k) * 5;
    g.fillStyle = '#e8f0ff'; circle(g, x - 9, y + 5, 3.2); circle(g, x - 5, y + 7, 3.2); circle(g, x - 7.5, y + 2.5, 3);
    g.save(); g.translate(x + 2, y + 6); g.rotate(lean);
    g.strokeStyle = '#3b2414'; g.lineWidth = 6.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -11); g.lineTo(-7, -21); g.moveTo(0, -11); g.lineTo(7, -21); g.stroke();
    g.strokeStyle = lvl === 2 ? '#d89b45' : lvl === 1 ? '#b57a42' : '#9b6236'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -11); g.lineTo(-7, -21); g.moveTo(0, -11); g.lineTo(7, -21); g.stroke();
    g.strokeStyle = C.red; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(-7, -21); g.lineTo(0, -15 + pull); g.lineTo(7, -21); g.stroke();
    if (k < 0.5) { g.fillStyle = '#fff'; circle(g, 0, -15 + pull, 4); g.fillStyle = '#c9d6f2'; circle(g, 1, -14 + pull, 1.8); }
    g.restore();
  } else if (t.type === 'cannon') {
    g.fillStyle = '#2d2f4a'; circle(g, x, y - 1, 9);
    g.save(); g.translate(x, y - 2); g.rotate(a);
    const back = -k * 4, len = 18 + lvl * 2, bw = 7 + lvl;
    g.save(); rrect(g, back - 4, -bw / 2, len, bw, 3); g.clip();
    g.fillStyle = '#fff'; g.fillRect(back - 6, -bw, len + 4, bw * 2);
    g.fillStyle = C.red; for (let i = -8; i < len + 6; i += 6) { g.beginPath(); g.moveTo(back + i, -bw); g.lineTo(back + i + 3, -bw); g.lineTo(back + i - 3, bw); g.lineTo(back + i - 6, bw); g.fill(); }
    g.restore();
    g.lineCap = 'round';
    g.strokeStyle = '#fff'; g.lineWidth = bw * 0.6; g.beginPath(); g.arc(back - 3, -bw * 0.75, bw * 0.75, Math.PI * 0.5, Math.PI * 1.4); g.stroke();
    g.strokeStyle = C.red; g.lineWidth = bw * 0.6; g.setLineDash([2.5, 2.5]); g.beginPath(); g.arc(back - 3, -bw * 0.75, bw * 0.75, Math.PI * 0.5, Math.PI * 1.4); g.stroke(); g.setLineDash([]);
    g.restore();
    g.fillStyle = '#4b4e78'; circle(g, x, y - 2, 4.5);
    if (lvl === 2) { g.fillStyle = C.gold; circle(g, x, y - 2, 2.2); }
  } else if (t.type === 'frost') {
    const glow = 6 + k * 14 + Math.sin(T * 3) * 2;
    g.shadowColor = C.ice; g.shadowBlur = glow;
    const hgt = 22 + lvl * 3;
    const crystal = (cx, cy, w, h, c1, c2) => {
      g.fillStyle = c1; g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx + w, cy - h * 0.35); g.lineTo(cx + w * 0.7, cy); g.lineTo(cx - w * 0.7, cy); g.lineTo(cx - w, cy - h * 0.35); g.closePath(); g.fill();
      g.fillStyle = c2; g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx + w, cy - h * 0.35); g.lineTo(cx + w * 0.7, cy); g.lineTo(cx, cy); g.closePath(); g.fill();
    };
    crystal(x - 8, y + 3, 4.5, hgt * 0.55, '#a8d8f0', '#6fb3d6');
    crystal(x + 8, y + 3, 4.5, hgt * 0.6, '#a8d8f0', '#6fb3d6');
    crystal(x, y + 4, 7, hgt, '#e6f5ff', '#9fd2ee');
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,.9)'; circle(g, x - 2, y - hgt + 8, 1.6);
    if (lvl >= 1) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.2; snowflake(g, x, y - hgt * 0.45, 3.5 + lvl, T); }
  } else if (t.type === 'zap') {
    g.strokeStyle = '#2b3460'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x, y - 14); g.stroke();
    const cols = ['#ef476f', '#06d6a0', '#ffd166', '#8ecae6', '#c77dff', '#ff9f1c'];
    const n = 5 + lvl * 2;
    g.strokeStyle = '#174a2e'; g.lineWidth = 1.2; g.beginPath();
    for (let i = 0; i <= 24; i++) { const an = i / 24 * TAU; const px = x + Math.cos(an) * 11, py = y - 6 + Math.sin(an) * 5; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke();
    for (let i = 0; i < n; i++) {
      const an = i / n * TAU + T * 0.8, c = cols[i % cols.length], on = Math.sin(T * 6 + i * 1.3) > -0.4 || k > 0.3;
      g.shadowColor = c; g.shadowBlur = on ? 7 : 0; g.fillStyle = on ? c : '#3d4a7a';
      circle(g, x + Math.cos(an) * 11, y - 6 + Math.sin(an) * 5, 2.4);
    }
    g.shadowColor = C.gold; g.shadowBlur = 8 + k * 18; g.fillStyle = k > 0.3 ? '#fff' : C.gold;
    circle(g, x, y - 18, 4.5 + k * 2);
    g.shadowBlur = 0;
  }
  if (!icon) pips(g, x, y, lvl);
}

// ---------- Gegner ----------
function face(g, x, y, s, look, angry = true, col = '#1b2240') {
  const ex = look * 1.5 * s;
  g.fillStyle = col;
  circle(g, x - 3.6 * s + ex, y, 1.7 * s); circle(g, x + 3.6 * s + ex, y, 1.7 * s);
  g.fillStyle = '#fff'; circle(g, x - 3.2 * s + ex, y - 0.6 * s, 0.6 * s); circle(g, x + 4 * s + ex, y - 0.6 * s, 0.6 * s);
  g.strokeStyle = col; g.lineWidth = 1.5 * s; g.lineCap = 'round'; g.beginPath();
  if (angry) { g.moveTo(x - 6 * s + ex, y - 4 * s); g.lineTo(x - 1.5 * s + ex, y - 2.5 * s); g.moveTo(x + 6 * s + ex, y - 4 * s); g.lineTo(x + 1.5 * s + ex, y - 2.5 * s); }
  g.stroke();
}
function hpBar(g, e) {
  if (e.hp >= e.maxHp || e.boss) return;
  const w = e.r * 2 + 4, x = e.x - w / 2, y = e.y - e.r - (e.air ? 26 : 9), f = Math.max(0, e.hp / e.maxHp);
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x - 1, y - 1, w + 2, 5);
  g.fillStyle = f > 0.5 ? C.green : f > 0.25 ? C.gold : C.red; g.fillRect(x, y, w * f, 3);
}
export function drawEnemy(g, e, T) {
  const look = Math.cos(e.ang) > 0.3 ? 1 : Math.cos(e.ang) < -0.3 ? -1 : 0;
  const ph = T * 8 + e.wob, x = e.x;
  let y = e.y;
  if (e.air) {
    g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, x, y + 6, 8, 3);
    y -= 16 + Math.sin(ph * 0.5) * 3;
  } else { g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, x, y + e.r * 0.8, e.r * 0.95, e.r * 0.35); }
  if (e.gold) { g.shadowColor = C.gold; g.shadowBlur = 12; }
  const body = (r, c1, c2, yy) => {
    const gr = g.createRadialGradient(x - r * 0.35, yy - r * 0.4, r * 0.1, x, yy, r);
    gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; circle(g, x, yy, r);
  };
  if (e.type === 'grummel') {
    const b = Math.abs(Math.sin(ph)) * 2.5, s = Math.sin(ph) * 3;
    g.fillStyle = '#9fb3e0'; ell(g, x - 5 + s * 0.4, y + e.r - 2, 4, 2.6); ell(g, x + 5 - s * 0.4, y + e.r - 2, 4, 2.6);
    body(e.r, e.gold ? '#fff6d6' : '#ffffff', e.gold ? '#f0b93a' : '#b7c6ea', y - b);
    g.shadowBlur = 0;
    face(g, x, y - b - 2, 0.9, look);
    g.strokeStyle = '#1b2240'; g.lineWidth = 1.3; g.beginPath(); g.arc(x + look * 1.3, y - b + 5, 3, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  } else if (e.type === 'flitzer') {
    const b = Math.abs(Math.sin(ph * 1.6)) * 2;
    g.strokeStyle = 'rgba(142,202,230,.6)'; g.lineWidth = 1.5; g.lineCap = 'round';
    const bx = -Math.cos(e.ang), by = -Math.sin(e.ang);
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + bx * 10 - by * i * 4, y - b + by * 10 + bx * i * 4); g.lineTo(x + bx * 18 - by * i * 4, y - b + by * 18 + bx * i * 4); g.stroke(); }
    g.save(); g.translate(x, y - b); g.rotate(e.ang);
    const gr = g.createRadialGradient(-2, -3, 1, 0, 0, 11);
    gr.addColorStop(0, e.gold ? '#fff6d6' : '#e8f7ff'); gr.addColorStop(1, e.gold ? '#f0b93a' : '#5fa8d3'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(12, 0); g.quadraticCurveTo(4, -10, -8, -6); g.quadraticCurveTo(-13, 0, -8, 6); g.quadraticCurveTo(4, 10, 12, 0); g.fill();
    g.restore(); g.shadowBlur = 0;
    face(g, x + Math.cos(e.ang) * 3, y - b - 1, 0.75, look, true);
    g.strokeStyle = '#1b2240'; g.lineWidth = 1.2; g.beginPath(); g.arc(x + Math.cos(e.ang) * 3, y - b + 2, 2.5, 0.2, Math.PI - 0.2); g.stroke();
  } else if (e.type === 'yeti' || e.type === 'boss') {
    const r = e.r, boss = e.type === 'boss', b = Math.abs(Math.sin(ph * 0.6)) * 2.5, yy = y - b;
    const arm = Math.sin(ph * 0.6) * 4;
    g.fillStyle = boss ? '#c4cfee' : '#dfe7fb';
    ell(g, x - r * 0.95, yy + r * 0.15 + arm, r * 0.32, r * 0.5); ell(g, x + r * 0.95, yy + r * 0.15 - arm, r * 0.32, r * 0.5);
    ell(g, x - r * 0.4, y + r * 0.8, r * 0.3, r * 0.2); ell(g, x + r * 0.4, y + r * 0.8, r * 0.3, r * 0.2);
    body(r, '#ffffff', boss ? '#9fb0dc' : '#c3cfee', yy);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + 0.3; circle(g, x + Math.cos(an) * r * 0.85, yy + Math.sin(an) * r * 0.85 - 1, r * 0.25); }
    g.fillStyle = boss ? '#4b5a94' : '#7b8cc4'; ell(g, x + look * 1.5, yy - r * 0.05, r * 0.58, r * 0.45);
    face(g, x + look * 1.5, yy - r * 0.15, r / 13, look, true, boss ? '#ef476f' : '#141a35');
    g.fillStyle = '#141a35'; ell(g, x + look * 1.5, yy + r * 0.22, r * 0.22, r * 0.1);
    g.fillStyle = '#fff'; g.fillRect(x + look * 1.5 - r * 0.15, yy + r * 0.13, r * 0.1, r * 0.08); g.fillRect(x + look * 1.5 + r * 0.05, yy + r * 0.13, r * 0.1, r * 0.08);
    g.fillStyle = '#c9d6f2';
    g.beginPath(); g.moveTo(x - r * 0.6, yy - r * 0.7); g.lineTo(x - r * 0.95, yy - r * 1.25); g.lineTo(x - r * 0.35, yy - r * 0.85); g.fill();
    g.beginPath(); g.moveTo(x + r * 0.6, yy - r * 0.7); g.lineTo(x + r * 0.95, yy - r * 1.25); g.lineTo(x + r * 0.35, yy - r * 0.85); g.fill();
    if (boss) { // Eiszapfen-Krone
      g.shadowColor = C.ice; g.shadowBlur = 10;
      g.fillStyle = C.ice;
      g.beginPath(); g.moveTo(x - 13, yy - r * 0.82);
      for (let i = 0; i <= 4; i++) { const px = x - 13 + i * 6.5; g.lineTo(px, yy - r * 0.82 - (i % 2 ? 7 : 13)); g.lineTo(px + 3.25, yy - r * 0.82); }
      g.closePath(); g.fill(); g.shadowBlur = 0;
      g.fillStyle = C.gold; circle(g, x, yy - r * 0.82 - 3, 2.2);
    }
    g.shadowBlur = 0;
  } else if (e.type === 'bat') {
    const flap = Math.sin(ph * 2.2);
    g.fillStyle = '#7a3fb0';
    for (const side of [-1, 1]) {
      g.beginPath(); g.moveTo(x + side * 4, y - 2);
      g.quadraticCurveTo(x + side * 14, y - 12 - flap * 7, x + side * 20, y - 4 - flap * 9);
      g.quadraticCurveTo(x + side * 15, y - 1 - flap * 3, x + side * 13, y + 3 - flap * 2);
      g.quadraticCurveTo(x + side * 9, y + 1, x + side * 4, y + 3); g.fill();
    }
    body(8, '#d9a8ff', '#8a4cc4', y);
    g.fillStyle = '#8a4cc4';
    g.beginPath(); g.moveTo(x - 6, y - 5); g.lineTo(x - 5, y - 11); g.lineTo(x - 2, y - 7); g.fill();
    g.beginPath(); g.moveTo(x + 6, y - 5); g.lineTo(x + 5, y - 11); g.lineTo(x + 2, y - 7); g.fill();
    g.fillStyle = C.gold; circle(g, x - 2.6, y - 1, 1.8); circle(g, x + 2.6, y - 1, 1.8);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 2, y + 3); g.lineTo(x - 1, y + 5.5); g.lineTo(x, y + 3); g.moveTo(x + 2, y + 3); g.lineTo(x + 1, y + 5.5); g.lineTo(x, y + 3); g.fill();
  }
  g.shadowBlur = 0;
  // verlangsamt
  if (e.slow > 0) {
    g.fillStyle = 'rgba(142,202,230,.32)'; circle(g, x, y - (e.air ? 0 : 1), e.r + 2);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1;
    snowflake(g, x - e.r * 0.7, y - e.r * 0.6, 3, T * 2); snowflake(g, x + e.r * 0.8, y + e.r * 0.2, 2.5, -T * 2);
  }
  if (e.hitT > 0) { g.fillStyle = `rgba(255,255,255,${e.hitT * 4})`; circle(g, x, y - 1, e.r + 1); }
  if (e.gold) { g.fillStyle = C.gold; star(g, x + Math.cos(T * 3) * (e.r + 5), y + Math.sin(T * 3) * (e.r + 5) - 2, 3, T * 4); }
  hpBar(g, e);
}
