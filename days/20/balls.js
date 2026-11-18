// Kugel-Fusion: die 10 selbst gezeichneten Deko-Stufen (nur Canvas-Formen, kein Emoji).
export const NAMES = ['Haselnuss', 'Lebkuchen', 'Rote Kugel', 'Mandarine', 'Blaue Kugel', 'Schneekugel', 'Glöckchen', 'Goldkugel', 'Schneemann', 'Weihnachtsstern'];
// Hauptfarbe je Stufe (für Partikel, Leiste)
export const TINT = ['#c98d4e', '#c27a3a', '#ef476f', '#ff9f1c', '#4895ef', '#bde0fe', '#06d6a0', '#ffd166', '#f4f9ff', '#ffe27a'];

const TAU = Math.PI * 2;
const circle = (g, r) => { g.beginPath(); g.arc(0, 0, r, 0, TAU); };
function grad(g, r, stops, cx = -0.3, cy = -0.35) {
  const gr = g.createRadialGradient(cx * r, cy * r, r * 0.05, 0, 0, r * 1.05);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
function ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); }
function star(g, cx, cy, ro, ri, n = 5, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rr = i % 2 ? ri : ro;
    g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
}

// ---- Körper (drehen sich mit) ----
const BODY = [
  // 0 Haselnuss
  (g, r) => {
    circle(g, r); g.fillStyle = grad(g, r, [[0, '#e0aa6e'], [0.55, '#a8672f'], [1, '#6e4120']]); g.fill();
    g.save(); circle(g, r); g.clip();
    g.fillStyle = '#5b3417'; g.beginPath(); g.moveTo(-r, -r); g.lineTo(r, -r); g.lineTo(r, -r * 0.28);
    for (let i = 0; i <= 6; i++) g.lineTo(r - (i * 2 * r) / 6, -r * 0.28 + (i % 2 ? -r * 0.12 : r * 0.1));
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = Math.max(0.6, r * 0.04);
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * r * 0.3, -r); g.lineTo(i * r * 0.3 + r * 0.1, -r * 0.45); g.stroke(); }
    g.restore();
  },
  // 1 Lebkuchen (rund, Zuckerguss-Herz)
  (g, r) => {
    circle(g, r); g.fillStyle = grad(g, r, [[0, '#d98a4a'], [0.6, '#b4682c'], [1, '#85471d']]); g.fill();
    g.strokeStyle = 'rgba(255,250,240,.95)'; g.lineWidth = Math.max(1, r * 0.08); g.lineCap = 'round';
    g.setLineDash([r * 0.16, r * 0.17]); g.beginPath(); g.arc(0, 0, r * 0.84, 0, TAU); g.stroke(); g.setLineDash([]);
    // Herz-Glasur
    g.lineWidth = Math.max(1, r * 0.075); g.lineJoin = 'round';
    g.beginPath(); const s = r * 0.5, hy = r * 0.06;
    g.moveTo(0, hy + s * 0.9); g.bezierCurveTo(-s * 1.3, hy + s * 0.05, -s * 0.75, hy - s * 0.95, 0, hy - s * 0.35);
    g.bezierCurveTo(s * 0.75, hy - s * 0.95, s * 1.3, hy + s * 0.05, 0, hy + s * 0.9); g.stroke();
    g.fillStyle = '#ef476f'; for (const [a, b] of [[-0.62, 0.58], [0.62, 0.58], [0, -0.7]]) { g.beginPath(); g.arc(a * r, b * r * (a ? 1 : 1), r * 0.075, 0, TAU); g.fill(); }
  },
  // 2 Rote Kugel
  (g, r) => {
    circle(g, r); g.fillStyle = grad(g, r, [[0, '#ff7b86'], [0.5, '#e63946'], [1, '#9d1230']]); g.fill();
    g.save(); circle(g, r); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, r * 0.1);
    g.beginPath(); g.arc(0, r * 0.15, r * 0.95, Math.PI * 0.12, Math.PI * 0.88); g.stroke();
    g.fillStyle = '#ffd166'; g.fillRect(-r * 0.2, -r * 1.02, r * 0.4, r * 0.24);
    g.fillStyle = '#c28a1d'; g.fillRect(-r * 0.2, -r * 0.84, r * 0.4, r * 0.05);
    g.fillStyle = 'rgba(255,255,255,.7)';
    for (const [a, b] of [[-0.6, 0.45], [0.55, 0.55], [0.72, -0.15], [-0.72, -0.1]]) { g.beginPath(); g.arc(a * r, b * r, r * 0.05, 0, TAU); g.fill(); }
    g.restore();
  },
  // 3 Mandarine
  (g, r) => {
    circle(g, r); g.fillStyle = grad(g, r, [[0, '#ffc766'], [0.5, '#ff9f1c'], [1, '#d4640a']]); g.fill();
    g.fillStyle = 'rgba(160,70,0,.28)';
    for (let i = 0; i < 14; i++) { const a = i * 2.4, d = r * (0.25 + ((i * 37) % 60) / 100); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.03, 0, TAU); g.fill(); }
    g.save(); circle(g, r); g.clip();
    g.fillStyle = '#2f9e44'; ellipse(g, r * 0.22, -r * 0.88, r * 0.34, r * 0.15, -0.5); g.fill();
    g.fillStyle = '#6b4a1f'; g.fillRect(-r * 0.05, -r * 1.02, r * 0.1, r * 0.2);
    g.restore();
  },
  // 4 Blaue Kugel mit Muster
  (g, r) => {
    circle(g, r); g.fillStyle = grad(g, r, [[0, '#7db4ff'], [0.5, '#3a6fe0'], [1, '#1d3a9c']]); g.fill();
    g.save(); circle(g, r); g.clip();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-r, r * 0.3, r * 2, r * 0.42);
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, r * 0.06); g.lineJoin = 'round';
    g.beginPath(); const p = r * 0.24;
    for (let x = -r, i = 0; x <= r + p; x += p, i++) g[i ? 'lineTo' : 'moveTo'](x, r * 0.51 + (i % 2 ? -r * 0.11 : r * 0.11));
    g.stroke();
    g.fillStyle = '#ffd166';
    for (let x = -r * 0.9; x < r; x += p) { g.beginPath(); g.arc(x, r * 0.82, r * 0.045, 0, TAU); g.fill(); g.beginPath(); g.arc(x + p / 2, r * 0.2, r * 0.045, 0, TAU); g.fill(); }
    g.fillStyle = '#d9dde8'; g.fillRect(-r * 0.2, -r * 1.02, r * 0.4, r * 0.24);
    g.restore();
  },
  // 5 Schneekugel
  (g, r) => {
    circle(g, r); g.fillStyle = grad(g, r, [[0, '#f4fbff'], [0.6, '#bfe3fa'], [1, '#7fb4dd']]); g.fill();
    g.save(); circle(g, r); g.clip();
    g.fillStyle = '#ffffff'; ellipse(g, 0, r * 0.95, r * 1.15, r * 0.55); g.fill();
    g.fillStyle = '#8a5a2b'; g.fillRect(-r, r * 0.78, r * 2, r * 0.3);
    g.fillStyle = '#2f9e44';
    for (const [x, s] of [[-0.55, 0.3], [0.58, 0.24]]) { g.beginPath(); g.moveTo(x * r, r * 0.52 - s * r * 1.5); g.lineTo(x * r - s * r * 0.6, r * 0.55); g.lineTo(x * r + s * r * 0.6, r * 0.55); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.95)';
    for (let i = 0; i < 9; i++) { const a = i * 2.1, d = r * (0.2 + ((i * 29) % 55) / 100); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d * 0.9 - r * 0.1, Math.max(0.7, r * 0.04), 0, TAU); g.fill(); }
    g.restore();
  },
  // 6 Kranz (Hintergrund), Glocke kommt in der Gesichtsebene
  (g, r) => {
    circle(g, r); g.fillStyle = grad(g, r, [[0, '#2fa36a'], [0.6, '#1d6b44'], [1, '#124a2e']]); g.fill();
    g.strokeStyle = 'rgba(120,230,150,.55)'; g.lineWidth = Math.max(1, r * 0.06); g.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU, c = Math.cos(a), s = Math.sin(a);
      g.beginPath(); g.moveTo(c * r * 0.97, s * r * 0.97); g.lineTo(c * r * 0.78 - s * r * 0.1, s * r * 0.78 + c * r * 0.1); g.stroke();
    }
    g.fillStyle = '#ef476f';
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.5; g.beginPath(); g.arc(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.075, 0, TAU); g.fill(); }
  },
  // 7 Goldkugel
  (g, r) => {
    circle(g, r); g.fillStyle = grad(g, r, [[0, '#fff3c4'], [0.45, '#ffd166'], [1, '#c9861a']]); g.fill();
    g.strokeStyle = 'rgba(150,90,0,.35)'; g.lineWidth = Math.max(1, r * 0.05);
    for (const k of [0.35, 0.7]) { ellipse(g, 0, 0, r * k, r * 0.96); g.stroke(); }
    g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke();
    g.save(); circle(g, r); g.clip();
    g.fillStyle = '#b9780f'; g.fillRect(-r * 0.2, -r * 1.02, r * 0.4, r * 0.24);
    g.restore();
  },
  // 8 Schneemann-Kopf: Körper
  (g, r) => { circle(g, r); g.fillStyle = grad(g, r, [[0, '#ffffff'], [0.65, '#e4f0fa'], [1, '#a9c6de']]); g.fill(); },
  // 9 Weihnachtsstern
  (g, r) => {
    circle(g, r); g.fillStyle = grad(g, r, [[0, '#fff6c9'], [0.55, '#ffd34d'], [1, '#d9921a']], -0.1, -0.1); g.fill();
    g.save(); circle(g, r); g.clip();
    star(g, 0, 0, r * 0.98, r * 0.46); g.fillStyle = '#fff9d8'; g.fill();
    g.strokeStyle = '#e0a21c'; g.lineWidth = Math.max(1, r * 0.04); g.lineJoin = 'round'; g.stroke();
    star(g, 0, 0, r * 0.98, r * 0.46); g.clip();
    g.strokeStyle = 'rgba(224,162,28,.5)'; g.lineWidth = Math.max(1, r * 0.03);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * TAU) / 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); }
    g.restore();
  },
];

// ---- Gesicht + feste Ebenen (bleiben fast aufrecht) ----
const FACE_CFG = [
  { y: 0.1, s: 0.55 }, { y: 0.02, s: 0.5 }, { y: 0.1, s: 0.55 }, { y: 0.12, s: 0.55 }, { y: -0.06, s: 0.5 },
  { y: -0.05, s: 0.5 }, { y: 0.08, s: 0.34 }, { y: 0.0, s: 0.55 }, { y: 0.02, s: 0.5 }, { y: 0.0, s: 0.36 },
];
function face(g, r, cfg, mood, blink) {
  const s = r * cfg.s, ey = r * cfg.y, ex = s * 0.52, ink = '#2b1b2f';
  g.fillStyle = 'rgba(255,110,140,.5)';
  for (const sx of [-1, 1]) { ellipse(g, sx * ex * 1.55, ey + s * 0.4, s * 0.2, s * 0.12); g.fill(); }
  g.lineCap = 'round'; g.lineWidth = Math.max(0.9, s * 0.09);
  for (const sx of [-1, 1]) {
    const x = sx * ex;
    if (mood === 'happy') { g.strokeStyle = ink; g.beginPath(); g.arc(x, ey + s * 0.08, s * 0.16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else if (blink) { g.strokeStyle = ink; g.beginPath(); g.moveTo(x - s * 0.15, ey); g.lineTo(x + s * 0.15, ey); g.stroke(); }
    else {
      const big = mood === 'scared' ? 1.35 : 1;
      g.fillStyle = ink; ellipse(g, x, ey, s * 0.14 * big, s * 0.19 * big); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x - s * 0.04, ey - s * 0.07, Math.max(0.5, s * 0.05 * big), 0, TAU); g.fill();
    }
  }
  g.strokeStyle = ink; g.fillStyle = ink;
  if (mood === 'happy') { g.beginPath(); g.arc(0, ey + s * 0.3, s * 0.2, 0, Math.PI); g.closePath(); g.fillStyle = '#7a1f3a'; g.fill(); g.stroke(); }
  else if (mood === 'scared') { ellipse(g, 0, ey + s * 0.5, s * 0.12, s * 0.16); g.fill(); }
  else { g.beginPath(); g.arc(0, ey + s * 0.3, s * 0.2, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
}
// feste Teile (nach dem Körper, ohne starke Drehung)
const OVERLAY = {
  6: (g, r) => { // Glocke mit Schleife
    g.save();
    g.beginPath(); g.moveTo(-r * 0.46, r * 0.34); g.bezierCurveTo(-r * 0.4, r * 0.1, -r * 0.3, -r * 0.4, 0, -r * 0.4);
    g.bezierCurveTo(r * 0.3, -r * 0.4, r * 0.4, r * 0.1, r * 0.46, r * 0.34); g.closePath();
    const gr = g.createLinearGradient(-r * 0.4, 0, r * 0.4, 0);
    gr.addColorStop(0, '#ffe08a'); gr.addColorStop(0.45, '#ffd166'); gr.addColorStop(1, '#c9861a');
    g.fillStyle = gr; g.fill(); g.strokeStyle = '#8a5a0a'; g.lineWidth = Math.max(0.8, r * 0.035); g.stroke();
    ellipse(g, 0, r * 0.34, r * 0.46, r * 0.07); g.fillStyle = '#b9780f'; g.fill();
    g.fillStyle = '#8a5a0a'; g.beginPath(); g.arc(0, r * 0.44, r * 0.085, 0, TAU); g.fill();
    g.fillStyle = '#ef476f'; // Schleife
    g.beginPath(); g.moveTo(0, -r * 0.4); g.lineTo(-r * 0.2, -r * 0.55); g.lineTo(-r * 0.2, -r * 0.27); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0, -r * 0.4); g.lineTo(r * 0.2, -r * 0.55); g.lineTo(r * 0.2, -r * 0.27); g.closePath(); g.fill();
    g.beginPath(); g.arc(0, -r * 0.4, r * 0.06, 0, TAU); g.fillStyle = '#c0213f'; g.fill();
    g.restore();
  },
  8: (g, r) => { // Zylinder + Schal + Nase
    g.save(); circle(g, r); g.clip();
    g.fillStyle = '#26232e'; g.fillRect(-r, -r, r * 2, r * 0.5);
    g.fillStyle = '#ef476f'; g.fillRect(-r, -r * 0.55, r * 2, r * 0.09);
    g.fillStyle = '#3a3646'; g.fillRect(-r, -r * 0.46, r * 2, r * 0.07);
    g.fillStyle = '#ef476f'; g.fillRect(-r, r * 0.62, r * 2, r * 0.4);
    g.fillStyle = '#fff'; for (let x = -r; x < r; x += r * 0.34) g.fillRect(x, r * 0.62, r * 0.12, r * 0.4);
    g.restore();
    g.fillStyle = '#ff8c1a'; g.beginPath(); g.moveTo(-r * 0.06, r * 0.04); g.lineTo(r * 0.34, r * 0.14); g.lineTo(-r * 0.06, r * 0.22); g.closePath(); g.fill();
  },
};

export function drawBall(g, lvl, x, y, r, rot = 0, o = {}) {
  const { t = 0, id = 0, sq = 1, alpha = 1, mood = '', glow = 0 } = o;
  g.save(); g.translate(x, y); if (sq !== 1) g.scale(sq, sq); if (alpha !== 1) g.globalAlpha *= alpha;
  if (lvl >= 7 || glow) { g.shadowColor = lvl === 9 ? 'rgba(255,226,122,.95)' : lvl === 7 ? 'rgba(255,209,102,.7)' : 'rgba(255,255,255,.7)'; g.shadowBlur = glow || (lvl === 9 ? r * 0.35 : r * 0.2); }
  g.save(); g.rotate(rot); BODY[lvl](g, r); g.restore();
  g.shadowBlur = 0;
  circle(g, r); g.strokeStyle = 'rgba(25,12,45,.5)'; g.lineWidth = Math.max(1, r * 0.045); g.stroke();
  const fr = Math.sin(rot * 0.8) * 0.28;
  g.save(); g.rotate(fr);
  if (OVERLAY[lvl]) OVERLAY[lvl](g, r);
  if (lvl === 8) { // eigenes Gesicht: Kohle-Augen, Mund aus Punkten
    g.fillStyle = '#26232e';
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * r * 0.28, -r * 0.1, r * 0.075 * (mood === 'scared' ? 1.4 : 1), 0, TAU); g.fill(); }
    for (let i = 0; i < 5; i++) { const a = Math.PI * (0.25 + i * 0.125); g.beginPath(); g.arc(Math.cos(a) * r * 0.36, r * 0.18 + Math.sin(a) * r * 0.2, r * 0.035, 0, TAU); g.fill(); }
  } else {
    const blink = (((t * 0.33 + id * 0.37) % 1) < 0.035) && mood === '';
    face(g, r, FACE_CFG[lvl], mood, blink);
  }
  g.restore();
  // Glanzlicht (fest, links oben)
  g.save(); g.globalCompositeOperation = 'source-over';
  const sh = lvl === 5 ? 0.75 : 0.55;
  g.fillStyle = `rgba(255,255,255,${sh})`; ellipse(g, -r * 0.4, -r * 0.45, r * 0.26, r * 0.13, -0.7); g.fill();
  g.fillStyle = `rgba(255,255,255,${sh * 0.8})`; g.beginPath(); g.arc(-r * 0.12, -r * 0.7, Math.max(0.8, r * 0.055), 0, TAU); g.fill();
  if (lvl >= 7) { // Funkeln
    const k = 0.5 + 0.5 * Math.sin(t * 4 + id);
    g.fillStyle = `rgba(255,255,255,${0.35 + 0.55 * k})`; star(g, r * 0.5, -r * 0.42, r * 0.17 * (0.6 + k * 0.5), r * 0.03, 4, 0); g.fill();
  }
  g.restore();
  g.restore();
}
