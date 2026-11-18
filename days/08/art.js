// Türchen 8: Zeichen-Helfer (alles Canvas-Formen, keine Bilder).
import { TAU, WW, LAND_Y, WH } from './world.js';

export const C = { night: '#0b1437', gold: '#ffd166', red: '#ef476f', green: '#06d6a0', ice: '#8ecae6', violet: '#c77dff' };
const LIGHTS = [C.red, C.gold, C.green, C.ice, C.violet];

function blobPath(g, isl, k) {
  const n = isl.rs.length;
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU, r = isl.rs[i % n] * k;
    const x = isl.x + Math.cos(a) * r, y = isl.y + Math.sin(a) * r;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}

export function drawShallows(g, isl, t) {
  g.fillStyle = 'rgba(70,170,200,.16)'; blobPath(g, isl, 1.42 + Math.sin(t * 1.3 + isl.seed) * 0.02); g.fill();
  g.fillStyle = 'rgba(100,210,220,.2)'; blobPath(g, isl, 1.2); g.fill();
  g.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(t * 2 + isl.seed) * 0.15})`; g.lineWidth = 2;
  blobPath(g, isl, 1.07 + Math.sin(t * 2 + isl.seed) * 0.025); g.stroke();
}

function palm(g, x, y, s, rot, t, lights) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(4, 5, 13, 7, 0, 0, TAU); g.fill();
  g.strokeStyle = '#2e9e57'; g.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = rot + i / 6 * TAU + Math.sin(t * 1.5 + i) * 0.05;
    g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(Math.cos(a + 0.3) * 9, Math.sin(a + 0.3) * 9, Math.cos(a) * 15, Math.sin(a) * 15); g.stroke();
  }
  g.fillStyle = '#7a4a22'; g.beginPath(); g.arc(0, 0, 3.2, 0, TAU); g.fill();
  if (lights) for (let i = 0; i < 6; i++) {
    const a = rot + i / 6 * TAU, on = Math.sin(t * 4 + i * 1.7) > -0.2;
    g.fillStyle = on ? LIGHTS[i % 5] : '#33415f'; g.beginPath(); g.arc(Math.cos(a) * 12, Math.sin(a) * 12, 1.6, 0, TAU); g.fill();
  }
  g.restore();
}
function pine(g, x, y, s, t, lights) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(3, 4, 11, 0, TAU); g.fill();
  const layers = [[11, '#1d6b45'], [8, '#24804f'], [5, '#2c9a5c']];
  for (const [r, c] of layers) {
    g.fillStyle = c; g.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rr = i % 2 ? r : r * 0.72; i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.beginPath(); g.arc(-3, -3, 2.4, 0, TAU); g.arc(3, -5, 1.6, 0, TAU); g.arc(-5, 3, 1.5, 0, TAU); g.fill();
  if (lights) for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU + 0.4, on = Math.sin(t * 5 + i * 2) > -0.3;
    g.fillStyle = on ? LIGHTS[i] : '#33415f'; g.beginPath(); g.arc(Math.cos(a) * 7, Math.sin(a) * 7, 1.5, 0, TAU); g.fill();
  }
  g.fillStyle = C.gold; g.beginPath(); g.arc(0, 0, 1.8, 0, TAU); g.fill();
  g.restore();
}

export function drawIsland(g, isl, t, showX) {
  g.fillStyle = '#d9bd7c'; blobPath(g, isl, 1.0); g.fill();
  g.fillStyle = '#ecd497'; blobPath(g, isl, 0.92); g.fill();
  if (isl.treasure < 0) {
    g.fillStyle = '#3d8f5a'; blobPath(g, isl, 0.74); g.fill();
    g.fillStyle = '#e8f1fb'; blobPath(g, isl, 0.42); g.fill(); // Schnee auf dem Hügel
    g.fillStyle = 'rgba(255,255,255,.6)';
    for (let i = 0; i < 6; i++) { const a = isl.seed + i * 1.9, d = isl.r * (0.45 + (i % 3) * 0.08); g.beginPath(); g.arc(isl.x + Math.cos(a) * d, isl.y + Math.sin(a) * d, 3 + (i % 2) * 2, 0, TAU); g.fill(); }
  } else {
    g.fillStyle = 'rgba(160,120,60,.25)';
    for (let i = 0; i < 7; i++) { const a = isl.seed + i * 2.3, d = isl.r * 0.5 * ((i * 37) % 10) / 10; g.beginPath(); g.arc(isl.x + Math.cos(a) * d, isl.y + Math.sin(a) * d, 1.6, 0, TAU); g.fill(); }
  }
  for (const tr of isl.trees) {
    if (tr.kind === 'palm') palm(g, isl.x + tr.x, isl.y + tr.y, tr.s, tr.rot, t, tr.lights);
    else pine(g, isl.x + tr.x, isl.y + tr.y, tr.s, t, tr.lights);
  }
  if (isl.treasure >= 0) {
    if (isl.dug) {
      g.fillStyle = '#b8945a'; g.beginPath(); g.ellipse(isl.x + 13, isl.y + 3, 9, 6, 0.3, 0, TAU); g.fill();
      g.fillStyle = '#5b3d1d'; g.beginPath(); g.ellipse(isl.x, isl.y, 10, 7, 0, 0, TAU); g.fill();
    } else if (showX) {
      const p = 1 + Math.sin(t * 5) * 0.08;
      g.save(); g.translate(isl.x, isl.y); g.scale(p, p);
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-10, -9); g.lineTo(11, 11); g.moveTo(11, -9); g.lineTo(-10, 11); g.stroke();
      g.strokeStyle = C.red; g.lineWidth = 5;
      g.beginPath(); g.moveTo(-11, -11); g.lineTo(10, 10); g.moveTo(10, -11); g.lineTo(-11, 10); g.stroke();
      g.restore();
    }
  }
}

export function drawRock(g, r, t) {
  const f = 1 + Math.sin(t * 2.2 + r.ph) * 0.12;
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
  g.beginPath(); g.arc(r.x, r.y, r.r * 1.35 * f, 0, TAU); g.stroke();
  for (const b of r.bits) {
    g.fillStyle = '#4a5468'; g.beginPath(); g.arc(r.x + b.x, r.y + b.y + 1.5, b.r, 0, TAU); g.fill();
    g.fillStyle = '#7d889e'; g.beginPath(); g.arc(r.x + b.x - 1, r.y + b.y - 1, b.r * 0.8, 0, TAU); g.fill();
    g.fillStyle = '#eef4ff'; g.beginPath(); g.arc(r.x + b.x - 2, r.y + b.y - 2.5, b.r * 0.4, 0, TAU); g.fill();
  }
}

export function drawBank(g, b, t) {
  g.save(); g.translate(b.x, b.y); g.rotate(b.rot);
  g.fillStyle = 'rgba(70,200,190,.28)'; g.beginPath(); g.ellipse(0, 0, b.rx, b.ry, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(240,215,150,.42)'; g.beginPath(); g.ellipse(0, 0, b.rx * 0.6, b.ry * 0.55, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.setLineDash([4, 6]); g.lineDashOffset = -t * 8; g.lineWidth = 1.5;
  g.beginPath(); g.ellipse(0, 0, b.rx, b.ry, 0, 0, TAU); g.stroke(); g.setLineDash([]);
  g.restore();
}

export function drawHarbor(g, map, t, glow) {
  const { harbor: h, pier: p, houses } = map;
  // Hafenring
  g.save();
  g.strokeStyle = glow ? `rgba(255,209,102,${0.55 + Math.sin(t * 6) * 0.35})` : 'rgba(255,255,255,.22)';
  g.lineWidth = glow ? 4 : 2; g.setLineDash([10, 8]); g.lineDashOffset = -t * 20;
  g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
  // Bojen
  for (const [dx, c] of [[-h.r - 6, C.red], [h.r + 6, C.green]]) {
    const by = h.y - 30 + Math.sin(t * 2 + dx) * 2;
    g.fillStyle = c; g.beginPath(); g.arc(h.x + dx, by, 5, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(h.x + dx - 1.5, by - 1.5, 1.6, 0, TAU); g.fill();
  }
  // Land mit Schnee
  g.fillStyle = '#c8b27a'; g.fillRect(0, LAND_Y - 6, WW, 10);
  g.fillStyle = '#dfe9f6'; g.fillRect(0, LAND_Y, WW, WH - LAND_Y);
  g.fillStyle = '#c3d3ea'; for (let x = 0; x < WW; x += 40) { g.beginPath(); g.arc(x + 20, LAND_Y + 30, 14, 0, TAU); g.fill(); }
  // Steg
  g.fillStyle = '#6b4321'; g.fillRect(p.x - 2, p.y, p.w + 4, p.h + 6);
  g.fillStyle = '#a8713f'; g.fillRect(p.x, p.y, p.w, p.h + 6);
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1;
  for (let y = p.y + 6; y < p.y + p.h; y += 7) { g.beginPath(); g.moveTo(p.x, y); g.lineTo(p.x + p.w, y); g.stroke(); }
  g.fillStyle = '#4a2e15'; for (const y of [p.y + 3, p.y + 40, p.y + 80]) { g.beginPath(); g.arc(p.x - 2, y, 3, 0, TAU); g.arc(p.x + p.w + 2, y, 3, 0, TAU); g.fill(); }
  // Häuser (Dächer von oben)
  for (const ho of houses) {
    const y = LAND_Y + 14;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(ho.x - ho.w / 2 + 3, y + 3, ho.w, ho.h);
    g.fillStyle = ho.c; g.fillRect(ho.x - ho.w / 2, y, ho.w, ho.h);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(ho.x, y, ho.w / 2, ho.h);
    g.fillStyle = '#fff'; g.fillRect(ho.x - ho.w / 2, y, ho.w, 4);
    g.fillStyle = `rgba(255,209,102,${0.7 + Math.sin(t * 3 + ho.x) * 0.3})`; g.fillRect(ho.x - 3, y + ho.h + 1, 6, 3);
  }
  // Weihnachtsbaum am Hafen
  pine(g, WW / 2 + 60, LAND_Y + 26, 1.4, t, true);
  // Leuchtturm
  const lx = WW / 2 + 130, ly = LAND_Y + 18;
  g.save(); g.translate(lx, ly); g.rotate(t * 0.9);
  const grad = g.createLinearGradient(0, 0, 160, 0); grad.addColorStop(0, 'rgba(255,230,150,.35)'); grad.addColorStop(1, 'rgba(255,230,150,0)');
  g.fillStyle = grad; g.beginPath(); g.moveTo(0, 0); g.lineTo(160, -26); g.lineTo(160, 26); g.closePath(); g.fill(); g.restore();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(lx, ly, 11, 0, TAU); g.fill();
  g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.arc(lx, ly, 7.5, 0, TAU); g.stroke();
  g.fillStyle = C.gold; g.beginPath(); g.arc(lx, ly, 3.5, 0, TAU); g.fill();
}

// Schiff, lokal: +x = Bug
export function drawShip(g, s, t, o = {}) {
  g.save(); g.translate(s.x, s.y); g.rotate(s.ang + (o.tilt || 0));
  const k = o.scale || 1; g.scale(k, k);
  g.globalAlpha *= o.alpha ?? 1;
  const ghost = !!o.ghost;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(-1, 3, 17, 9, 0, 0, TAU); g.fill();
  const hull = () => { g.beginPath(); g.moveTo(18, 0); g.quadraticCurveTo(9, -9.5, -12, -8); g.quadraticCurveTo(-16, 0, -12, 8); g.quadraticCurveTo(9, 9.5, 18, 0); };
  if (ghost) { g.shadowColor = C.violet; g.shadowBlur = 12; }
  hull(); g.fillStyle = ghost ? 'rgba(120,170,210,.75)' : '#7b4a22'; g.fill();
  g.shadowBlur = 0;
  g.lineWidth = 1.6; g.strokeStyle = ghost ? '#e3d1ff' : '#3f230d'; g.stroke();
  g.save(); g.scale(0.8, 0.72); hull(); g.fillStyle = ghost ? 'rgba(170,200,230,.6)' : '#b9824a'; g.fill(); g.restore();
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 0.8;
  for (const y of [-3, 0, 3]) { g.beginPath(); g.moveTo(-10, y); g.lineTo(12, y); g.stroke(); }
  // Kanonen
  g.fillStyle = ghost ? '#5d4a8a' : '#2a2a35';
  for (const x of [-6, 3]) { g.fillRect(x, -10.5, 4, 3); g.fillRect(x, 7.5, 4, 3); }
  // Lichterkette am Rand
  if (!ghost) for (let i = 0; i < 8; i++) {
    const u = i / 7, x = -11 + u * 27, y = (1 - Math.abs(u - 0.35) * 1.15) * 7.6 + 0.4;
    const on = Math.sin(t * 6 + i * 1.3) > -0.2;
    for (const sy of [-1, 1]) { g.fillStyle = on ? LIGHTS[(i + (sy > 0 ? 2 : 0)) % 5] : '#333c55'; g.beginPath(); g.arc(x, y * sy, 1.2, 0, TAU); g.fill(); }
  }
  if (o.chest) { g.fillStyle = '#8a5a1e'; g.fillRect(-11, -3.5, 7, 7); g.fillStyle = C.gold; g.fillRect(-11, -0.6, 7, 1.4); g.fillRect(-8.2, -3.5, 1.4, 7); }
  // Segel
  const fill = o.sail ?? 0.6;
  const sail = (x, h, c) => {
    g.beginPath(); g.moveTo(x, -h); g.quadraticCurveTo(x + 4 + fill * 9, 0, x, h); g.quadraticCurveTo(x + 1 + fill * 3, 0, x, -h); g.closePath();
    g.fillStyle = c; g.fill(); g.strokeStyle = ghost ? 'rgba(255,255,255,.5)' : '#c9bb98'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = ghost ? '#6b5a9a' : '#5b3a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 0.5, -h - 1); g.lineTo(x - 0.5, h + 1); g.stroke();
  };
  sail(-7, 9, ghost ? 'rgba(199,125,255,.55)' : '#efe4c8');
  sail(3, 14, ghost ? 'rgba(220,200,255,.7)' : '#fbf4e2');
  if (ghost) { // Geistergesicht auf dem Segel
    g.fillStyle = '#2b1a4a'; g.beginPath(); g.arc(6 + fill * 3, -4, 1.6, 0, TAU); g.arc(6 + fill * 3, 4, 1.6, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(8.5 + fill * 3, 0, 1.6, 1.2, 0, 0, TAU); g.fill();
  } else {
    g.fillStyle = C.red; star(g, 5 + fill * 4, 0, 3.4);
  }
  // Wimpel
  const fl = Math.sin(t * 10) * 1.6;
  g.fillStyle = ghost ? C.green : '#1a1a22';
  g.beginPath(); g.moveTo(3, -1.6); g.quadraticCurveTo(-3, -1.6 + fl, -9, fl * 0.6); g.quadraticCurveTo(-3, 1.6 + fl, 3, 1.6); g.fill();
  if (!ghost) { g.fillStyle = '#fff'; g.beginPath(); g.arc(-1.5, fl * 0.4, 1.1, 0, TAU); g.fill(); }
  // Laterne
  g.fillStyle = ghost ? C.green : C.gold; g.shadowColor = g.fillStyle; g.shadowBlur = 8;
  g.beginPath(); g.arc(-13, 0, 1.8, 0, TAU); g.fill(); g.shadowBlur = 0;
  if (o.flash) { g.globalAlpha = 0.7; hull(); g.fillStyle = '#fff'; g.fill(); }
  g.restore();
}

export function star(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

export function heartPath(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.3);
  g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.32);
  g.bezierCurveTo(x - s * 0.5, y + s * 0.62, x, y + s * 0.78, x, y + s);
  g.bezierCurveTo(x, y + s * 0.78, x + s * 0.5, y + s * 0.62, x + s * 0.5, y + s * 0.32);
  g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3); g.closePath();
}

export function drawPlankHeart(g, x, y, s, full, pulse) {
  g.save();
  if (full) {
    g.translate(x, y + s / 2); g.scale(pulse, pulse); g.translate(-x, -y - s / 2);
    heartPath(g, x, y, s); g.fillStyle = '#c4874a'; g.fill();
    g.save(); g.clip(); g.strokeStyle = '#8d5626'; g.lineWidth = 1.2;
    for (let yy = y + s * 0.3; yy < y + s; yy += s * 0.26) { g.beginPath(); g.moveTo(x - s, yy); g.lineTo(x + s, yy); g.stroke(); }
    g.fillStyle = '#5a3414'; g.beginPath(); g.arc(x - s * 0.26, y + s * 0.42, 1.1, 0, TAU); g.arc(x + s * 0.26, y + s * 0.42, 1.1, 0, TAU); g.fill();
    g.restore();
    heartPath(g, x, y, s); g.strokeStyle = '#ef476f'; g.lineWidth = 2; g.stroke();
  } else {
    heartPath(g, x, y, s); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([3, 3]); g.lineWidth = 1.5; g.stroke(); g.setLineDash([]);
  }
  g.restore();
}

export function drawChest(g, x, y, s, open) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 9, 13, 4, 0, 0, TAU); g.fill();
  g.fillStyle = '#8a5a1e'; g.fillRect(-11, -2, 22, 11);
  g.fillStyle = '#6a4214'; g.fillRect(-11, 5, 22, 4);
  if (open > 0) {
    g.fillStyle = C.gold; g.shadowColor = C.gold; g.shadowBlur = 14 * open;
    g.beginPath(); g.ellipse(0, -2, 10, 3.5, 0, 0, TAU); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(-4, -3, 1.4, 0, TAU); g.arc(3, -2.5, 1.2, 0, TAU); g.fill();
  }
  g.save(); g.translate(0, -2); g.scale(1, Math.cos(open * 2.4));
  g.fillStyle = '#a06b2a'; g.beginPath(); g.moveTo(-11, 0); g.lineTo(-11, -6); g.quadraticCurveTo(0, -12, 11, -6); g.lineTo(11, 0); g.closePath(); g.fill();
  g.fillStyle = C.gold; g.fillRect(-1.6, -9, 3.2, 9);
  g.restore();
  g.fillStyle = C.gold; g.fillRect(-11, 0, 22, 2); g.fillRect(-2, 1, 4, 5);
  g.restore();
}

// Kleiner Pirat mit Schaufel (von oben)
export function drawDigger(g, x, y, t) {
  const sw = Math.sin(t * 14);
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(2, 3, 8, 5, 0, 0, TAU); g.fill();
  g.strokeStyle = '#7a4a22'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(11 + sw * 3, -4 + sw * 2); g.stroke();
  g.fillStyle = '#b8c4d6'; g.beginPath(); g.arc(12 + sw * 3, -4 + sw * 2, 3, 0, TAU); g.fill();
  g.fillStyle = '#2b3a67'; g.beginPath(); g.ellipse(0, 0, 6, 4.5, 0, 0, TAU); g.fill();
  g.fillStyle = '#f2c79a'; g.beginPath(); g.arc(0, 0, 3.6, 0, TAU); g.fill();
  g.fillStyle = C.red; g.beginPath(); g.arc(-0.6, -0.6, 3.4, Math.PI * 0.9, Math.PI * 2.1); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-3.5, 1, 1.2, 0, TAU); g.fill(); // Bommel der Mütze
  g.restore();
}

export function drawTentacle(g, te, t) {
  const up = te.ph === 'up' ? Math.min(1, te.t / 0.25) : te.ph === 'down' ? Math.max(0, 1 - te.t / 0.4) : 0;
  if (te.ph === 'warn' || te.ph === 'up') {
    const k = te.ph === 'warn' ? te.t / 1.1 : 1;
    g.strokeStyle = `rgba(239,71,111,${0.35 + 0.4 * Math.abs(Math.sin(t * 10))})`; g.lineWidth = 2.5;
    g.beginPath(); g.arc(te.x, te.y, 26 - k * 6, 0, TAU); g.stroke();
    g.fillStyle = `rgba(80,20,90,${0.15 + 0.25 * k})`; g.beginPath(); g.arc(te.x, te.y, 20, 0, TAU); g.fill();
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6 + t * 3, r = 8 + ((t * 20 + i * 5) % 12);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(te.x + Math.cos(a) * r * 0.7, te.y + Math.sin(a) * r * 0.7, 1.6, 0, TAU); g.fill();
    }
  }
  if (up <= 0) return;
  g.save(); g.translate(te.x, te.y);
  g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(0, 4, 15 * up, 7 * up, 0, 0, TAU); g.fill();
  // Tentakel als gebogene Reihe von Kreisen (wächst nach oben)
  const n = 9, sway = Math.sin(t * 3 + te.sway) * 0.5;
  let x = 0, y = 0, a = -Math.PI / 2;
  const pts = [];
  for (let i = 0; i < n; i++) { pts.push({ x, y, r: (9 - i * 0.8) * (0.6 + 0.4 * up) }); a += (0.18 + sway * 0.12) * (te.dir || 1); x += Math.cos(a) * 4.2 * up; y += Math.sin(a) * 4.2 * up; }
  g.fillStyle = te.flash > 0 ? '#fff' : '#8a3fb8';
  for (const p of pts) { g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
  g.fillStyle = te.flash > 0 ? '#fff' : '#b46ae0';
  for (const p of pts) { g.beginPath(); g.arc(p.x - p.r * 0.3, p.y - p.r * 0.2, p.r * 0.6, 0, TAU); g.fill(); }
  g.fillStyle = '#f5c6ff';
  for (let i = 1; i < n - 1; i += 1) { const p = pts[i]; g.beginPath(); g.arc(p.x + p.r * 0.45, p.y, p.r * 0.28, 0, TAU); g.fill(); }
  g.restore();
}

export function drawKrakenHead(g, x, y, k, t, dizzy) {
  g.save(); g.translate(x, y); g.scale(k, k);
  g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(0, 10, 40, 16, 0, 0, TAU); g.fill();
  g.fillStyle = '#7b34a6'; g.beginPath(); g.ellipse(0, 0, 30, 26, 0, 0, TAU); g.fill();
  g.fillStyle = '#9c52cc'; g.beginPath(); g.ellipse(-6, -8, 18, 13, -0.3, 0, TAU); g.fill();
  for (const sx of [-11, 11]) {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(sx, 4, 8, 0, TAU); g.fill();
    g.strokeStyle = '#2b1a4a'; g.lineWidth = 2;
    if (dizzy) { g.beginPath(); for (let i = 0; i < 18; i++) { const a = i * 0.7 + t * 8, r = i * 0.33; i ? g.lineTo(sx + Math.cos(a) * r, 4 + Math.sin(a) * r) : g.moveTo(sx, 4); } g.stroke(); }
    else { g.fillStyle = '#2b1a4a'; g.beginPath(); g.arc(sx + 2, 5, 3.5, 0, TAU); g.fill(); }
  }
  g.restore();
}

export function drawCoin(g, x, y, t, r = 5) {
  const sx = Math.abs(Math.cos(t * 4 + x));
  g.fillStyle = '#b9791b'; g.beginPath(); g.ellipse(x, y + 1, r * sx + 0.8, r, 0, 0, TAU); g.fill();
  g.fillStyle = C.gold; g.beginPath(); g.ellipse(x, y, r * sx + 0.5, r, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff6d0'; g.beginPath(); g.ellipse(x - r * 0.3 * sx, y - r * 0.3, r * 0.3 * sx + 0.2, r * 0.3, 0, 0, TAU); g.fill();
}

export function drawPickup(g, p, t) {
  const bob = Math.sin(t * 2.5 + p.ph) * 1.5, x = p.x, y = p.y + bob;
  g.strokeStyle = `rgba(255,255,255,${0.25 + Math.sin(t * 2.5 + p.ph) * 0.15})`; g.lineWidth = 1.5;
  g.beginPath(); g.arc(x, y, 12 + Math.sin(t * 2.5 + p.ph), 0, TAU); g.stroke();
  if (p.type === 'coin') return drawCoin(g, x, y, t);
  if (p.type === 'bottle') {
    g.save(); g.translate(x, y); g.rotate(p.ph + Math.sin(t * 1.5 + p.ph) * 0.3);
    g.fillStyle = 'rgba(6,214,160,.55)'; g.beginPath(); g.ellipse(0, 0, 9, 4.5, 0, 0, TAU); g.fill();
    g.fillRect(7, -1.8, 6, 3.6);
    g.fillStyle = '#8a5a1e'; g.fillRect(12, -2, 3, 4);
    g.fillStyle = '#f4ecd8'; g.fillRect(-5, -2, 9, 4);
    g.strokeStyle = C.red; g.lineWidth = 1; g.beginPath(); g.moveTo(-1, -2); g.lineTo(-1, 2); g.stroke();
    g.restore(); return;
  }
  // Fass (von oben): Kreis mit Reifen
  const rep = p.type === 'repair';
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + 1.5, y + 2, 9, 0, TAU); g.fill();
  g.fillStyle = rep ? '#9a6a34' : '#8a5a2b'; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();
  g.strokeStyle = rep ? C.green : '#3a3f4f'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 7.8, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.stroke();
  if (rep) { g.fillStyle = C.green; g.fillRect(x - 1.6, y - 5, 3.2, 10); g.fillRect(x - 5, y - 1.6, 10, 3.2); }
  else { g.fillStyle = C.gold; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); }
}

export function drawIceBorder(g, cam, VW, VH, t) {
  // Eisschollen am Kartenrand
  const step = 34;
  g.fillStyle = 'rgba(220,235,255,.9)';
  const piece = (x, y, r) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + x * 0.1; const rr = r * (0.75 + 0.25 * Math.sin(i * 2.1 + y)); i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  if (cam.y < 30) for (let x = Math.floor(cam.x / step) * step; x < cam.x + VW + step; x += step) piece(x, 4 + Math.sin(x) * 4, 15 + Math.sin(x * 0.7) * 4);
  if (cam.x < 30) for (let y = Math.floor(cam.y / step) * step; y < Math.min(LAND_Y, cam.y + VH + step); y += step) piece(4 + Math.sin(y) * 4, y, 15 + Math.sin(y * 0.7) * 4);
  if (cam.x + VW > WW - 30) for (let y = Math.floor(cam.y / step) * step; y < Math.min(LAND_Y, cam.y + VH + step); y += step) piece(WW - 4 - Math.sin(y) * 4, y, 15 + Math.sin(y * 0.9) * 4);
}
