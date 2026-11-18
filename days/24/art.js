// Türchen 24: Zeichen-Bausteine (alles Canvas-Formen, keine Emoji)
export const C = { night: '#0b1437', gold: '#ffd166', red: '#ef476f', green: '#06d6a0', ice: '#8ecae6', violet: '#c77dff', pink: '#ff5d8f', snow: '#eef6ff' };
export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function circle(g, x, y, r, fill) { g.fillStyle = fill; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, 6.2832); g.fill(); }

export function heartPath(g, x, y, s) {
  const k = s / 20;
  g.beginPath(); g.moveTo(x, y + 7 * k);
  g.bezierCurveTo(x - 12 * k, y - 1 * k, x - 7 * k, y - 11 * k, x, y - 4.5 * k);
  g.bezierCurveTo(x + 7 * k, y - 11 * k, x + 12 * k, y - 1 * k, x, y + 7 * k); g.closePath();
}
export function heart(g, x, y, s, fill, stroke) {
  heartPath(g, x, y, s); g.fillStyle = fill; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
}

export function flake(g, x, y, r, color, rot = 0, lw = 1.5) {
  g.save(); g.translate(x, y); g.rotate(rot); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
    g.moveTo(0, 0); g.lineTo(c * r, s * r);
    if (r > 5) {
      const m = r * 0.55, b = r * 0.3;
      g.moveTo(c * m, s * m); g.lineTo(c * m + Math.cos(a + 0.8) * b, s * m + Math.sin(a + 0.8) * b);
      g.moveTo(c * m, s * m); g.lineTo(c * m + Math.cos(a - 0.8) * b, s * m + Math.sin(a - 0.8) * b);
    }
  }
  g.stroke(); g.restore();
}

export function text(g, str, x, y, size, color = '#fff', align = 'center', outline = 'rgba(5,10,35,.85)', weight = 'bold') {
  g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle';
  if (outline) { g.lineJoin = 'round'; g.lineWidth = Math.max(3, size / 5); g.strokeStyle = outline; g.strokeText(str, x, y); }
  g.fillStyle = color; g.fillText(str, x, y);
}

// ---------- Spieler: Raketen-Schlitten (von oben, Spitze nach oben) ----------
export function drawSleigh(g, x, y, t, o = {}) {
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.scale) g.scale(o.scale, o.scale);
  // Flammen
  if (!o.noFlame) for (const sx of [-7, 7]) {
    const f = 13 + Math.sin(t * 47 + sx) * 3 + Math.random() * 5 + (o.boost || 0);
    g.fillStyle = 'rgba(255,120,40,.85)'; g.beginPath(); g.moveTo(sx - 5, 17); g.lineTo(sx + 5, 17); g.lineTo(sx, 17 + f); g.fill();
    g.fillStyle = '#ffe28a'; g.beginPath(); g.moveTo(sx - 2.6, 17); g.lineTo(sx + 2.6, 17); g.lineTo(sx, 17 + f * 0.6); g.fill();
  }
  // Kufen
  g.strokeStyle = C.gold; g.lineWidth = 3; g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * 16, 17); g.lineTo(s * 16, -10); g.quadraticCurveTo(s * 16, -23, s * 7, -22); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.moveTo(s * 16, -4); g.lineTo(s * 11, -4); g.moveTo(s * 16, 10); g.lineTo(s * 11, 10); g.stroke(); g.lineWidth = 3;
  }
  // Düsen
  g.fillStyle = '#56688f'; g.fillRect(-11, 13, 8, 6); g.fillRect(3, 13, 8, 6);
  // Körper
  rr(g, -12, -18, 24, 35, 8); g.fillStyle = '#b3173f'; g.fill();
  rr(g, -10, -16, 20, 31, 7); g.fillStyle = C.red; g.fill();
  g.strokeStyle = C.gold; g.lineWidth = 1.4; g.stroke();
  // Windschutz
  g.fillStyle = 'rgba(190,235,255,.85)'; g.beginPath(); g.ellipse(0, -12, 7, 3.5, 0, Math.PI, 0); g.fill();
  // Geschenkesack hinten
  circle(g, 0, 9, 6, '#8a5a3b'); circle(g, -1.5, 7.5, 2.2, '#a87452');
  // Fahrer: Schultern, Kopf, Mütze
  g.fillStyle = '#1aa37a'; g.beginPath(); g.ellipse(0, 0, 8.5, 5, 0, 0, 6.3); g.fill();
  circle(g, 0, -3, 5.5, '#f2c6a0');
  g.fillStyle = C.green; g.beginPath(); g.moveTo(-5.6, -3.5); g.quadraticCurveTo(0, -9.5, 5.6, -3.5);
  const wob = Math.sin(t * 9) * 2;
  g.lineTo(2 + wob, 7); g.closePath(); g.fill();
  circle(g, 2 + wob, 7.5, 2.4, '#fff');
  g.fillStyle = '#fff'; g.fillRect(-5.8, -4.6, 11.6, 2.2);
  // Schal flattert
  g.strokeStyle = C.gold; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-4, 1);
  g.quadraticCurveTo(-9, 7 + Math.sin(t * 12) * 3, -7 + Math.sin(t * 10) * 2, 14); g.stroke();
  g.restore();
}

// ---------- Frost-Fledermaus ----------
export function drawBat(g, x, y, t, o = {}) {
  const flap = Math.sin(t * 15 + (o.seed || 0));
  const wing = o.gold ? '#d99a1c' : '#3f68aa', body = o.gold ? C.gold : '#9fd5ee';
  g.save(); g.translate(x, y);
  for (const s of [-1, 1]) {
    g.save(); g.scale(s, 1); g.fillStyle = wing; g.beginPath();
    g.moveTo(5, -3); g.quadraticCurveTo(14, -12 - flap * 6, 24, -5 - flap * 9);
    g.lineTo(20, 3 - flap * 3); g.quadraticCurveTo(17, -1, 14, 5); g.quadraticCurveTo(11, 1, 7, 6); g.closePath(); g.fill();
    g.restore();
  }
  g.fillStyle = body; g.beginPath(); g.ellipse(0, 0, 8.5, 9.5, 0, 0, 6.3); g.fill();
  g.beginPath(); g.moveTo(-7, -5); g.lineTo(-5, -14); g.lineTo(-1.5, -7); g.moveTo(7, -5); g.lineTo(5, -14); g.lineTo(1.5, -7); g.fill();
  const eye = o.glow ? C.pink : '#fff';
  circle(g, -3.2, -1.5, 2.8, eye); circle(g, 3.2, -1.5, 2.8, eye);
  circle(g, -3, -0.8, 1.3, '#13204a'); circle(g, 3, -0.8, 1.3, '#13204a');
  g.strokeStyle = '#13204a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-6, -5.5); g.lineTo(-1.2, -3.6); g.moveTo(6, -5.5); g.lineTo(1.2, -3.6); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-2.4, 3.5); g.lineTo(-1.2, 6.5); g.lineTo(0, 3.5); g.lineTo(1.2, 6.5); g.lineTo(2.4, 3.5); g.fill();
  if (o.gold) { circle(g, 0, 15, 6, 'rgba(255,255,255,.25)'); g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 15, 6, 0, 6.3); g.stroke(); }
  if (o.flash > 0) { g.globalAlpha = Math.min(1, o.flash * 10); circle(g, 0, 0, 11, '#fff'); }
  g.restore();
}

// ---------- Eiszapfen-Drohne ----------
export function drawDrone(g, x, y, t, o = {}) {
  g.save(); g.translate(x, y);
  // Rotor
  g.strokeStyle = 'rgba(220,240,255,.7)'; g.lineWidth = 2.5;
  const a = t * 25;
  g.beginPath(); g.moveTo(Math.cos(a) * 20, -14 + Math.sin(a) * 4); g.lineTo(-Math.cos(a) * 20, -14 - Math.sin(a) * 4); g.stroke();
  g.fillStyle = '#56688f'; g.fillRect(-1.5, -15, 3, 6);
  // Eiszapfen
  g.fillStyle = '#dff3ff'; g.beginPath(); g.moveTo(-6, 9); g.lineTo(6, 9); g.lineTo(0, 27); g.fill();
  g.fillStyle = '#9fd5ee'; g.beginPath(); g.moveTo(0, 9); g.lineTo(6, 9); g.lineTo(0, 27); g.fill();
  // Sechseck-Körper
  g.beginPath();
  for (let i = 0; i < 6; i++) { const b = i * Math.PI / 3 + Math.PI / 6; g.lineTo(Math.cos(b) * 14, Math.sin(b) * 13); }
  g.closePath(); g.fillStyle = '#bfe3f5'; g.fill(); g.strokeStyle = '#5f8fc0'; g.lineWidth = 2; g.stroke();
  g.strokeStyle = 'rgba(95,143,192,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-12, -6); g.lineTo(0, 0); g.lineTo(12, -6); g.moveTo(0, 0); g.lineTo(0, 13); g.stroke();
  // Auge
  const ch = o.charge || 0;
  if (ch > 0) { g.globalAlpha = 0.35 + 0.3 * Math.sin(t * 30); circle(g, 0, 0, 7 + ch * 12, C.pink); g.globalAlpha = 1; }
  circle(g, 0, 0, 6, '#1b2a5a'); circle(g, 0, 0.5, 3, ch > 0 ? '#fff' : C.pink);
  if (o.flash > 0) { g.globalAlpha = Math.min(1, o.flash * 10); circle(g, 0, 0, 15, '#fff'); }
  g.restore();
}

// ---------- Geschenk ----------
export function drawGift(g, x, y, s, color, rot = 0, ribbon = C.gold) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = color; g.fillRect(-s / 2, -s / 2 + s * 0.12, s, s * 0.88);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-s / 2, -s / 2 + s * 0.12, s, s * 0.16);
  g.fillStyle = ribbon; g.fillRect(-s * 0.09, -s / 2 + s * 0.12, s * 0.18, s * 0.88); g.fillRect(-s / 2, -s * 0.05, s, s * 0.16);
  g.beginPath(); g.ellipse(-s * 0.18, -s / 2 + s * 0.06, s * 0.2, s * 0.12, 0.5, 0, 6.3); g.ellipse(s * 0.18, -s / 2 + s * 0.06, s * 0.2, s * 0.12, -0.5, 0, 6.3); g.fill();
  g.restore();
}

// ---------- Power-ups ----------
export const POWER = {
  double: { color: '#8ecae6', label: 'DOPPEL' },
  spread: { color: '#c77dff', label: 'FÄCHER' },
  shield: { color: '#06d6a0', label: 'SCHILD' },
  heart: { color: '#ef476f', label: 'HERZ' },
};
export function drawPower(g, x, y, t, kind) {
  const P = POWER[kind], r = 14 + Math.sin(t * 6) * 1.2;
  g.save(); g.translate(x, y);
  g.globalAlpha = 0.25; circle(g, 0, 0, r + 6, P.color); g.globalAlpha = 1;
  circle(g, 0, 0, r, 'rgba(11,20,55,.85)'); g.strokeStyle = P.color; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, r, 0, 6.3); g.stroke();
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
  if (kind === 'double') { g.beginPath(); g.moveTo(-4, 6); g.lineTo(-4, -6); g.moveTo(4, 6); g.lineTo(4, -6); g.stroke(); circle(g, -4, -7, 2.6, '#fff'); circle(g, 4, -7, 2.6, '#fff'); }
  if (kind === 'spread') { g.beginPath(); g.moveTo(0, 7); g.lineTo(0, -7); g.moveTo(0, 7); g.lineTo(-7, -4); g.moveTo(0, 7); g.lineTo(7, -4); g.stroke(); }
  if (kind === 'shield') { g.strokeStyle = C.green; g.beginPath(); g.arc(0, 0, 7, 0, 6.3); g.stroke(); circle(g, 0, 0, 3, '#fff'); }
  if (kind === 'heart') heart(g, 0, 1, 16, C.red, '#fff');
  text(g, P.label, 0, r + 9, 8, P.color);
  g.restore();
}

export function drawOrb(g, x, y, r, color, t = 0) {
  g.globalAlpha = 0.28; circle(g, x, y, r * 1.75 + Math.sin(t * 12) * 1, color); g.globalAlpha = 1;
  circle(g, x, y, r, color); circle(g, x - r * 0.15, y - r * 0.15, r * 0.48, '#fff');
}

export function drawBigBall(g, x, y, r, rot) {
  g.globalAlpha = 0.35; g.fillStyle = '#05091f'; g.beginPath(); g.ellipse(x + 4, y + r * 0.7, r, r * 0.4, 0, 0, 6.3); g.fill(); g.globalAlpha = 1;
  circle(g, x, y, r, '#e8f3ff');
  g.fillStyle = '#b6d0ea'; g.beginPath(); g.arc(x, y, r, 0.2, Math.PI - 0.2); g.fill();
  g.strokeStyle = 'rgba(120,150,190,.7)'; g.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const a = rot + i * 2.1; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.18, 0, 6.3); g.stroke(); }
  g.strokeStyle = C.pink; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.stroke();
}

// ---------- Festung ----------
export function drawFortress(g, fy, t, W, f) {
  const bottom = fy + 118;
  // Mauer
  const gr = g.createLinearGradient(0, fy - 200, 0, bottom);
  gr.addColorStop(0, '#5f86b8'); gr.addColorStop(1, '#a9d3ef');
  g.fillStyle = gr; g.fillRect(0, fy - 260, W, bottom - fy + 260);
  g.strokeStyle = 'rgba(40,70,120,.35)'; g.lineWidth = 1;
  for (let row = 0; row < 12; row++) {
    const yy = bottom - 12 - row * 22; if (yy < -30) break;
    g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy);
    for (let x = (row % 2) * 22; x < W; x += 44) { g.moveTo(x, yy); g.lineTo(x, yy + 22); }
    g.stroke();
  }
  // Zinnen
  g.fillStyle = '#c9e6f8';
  for (let x = 4; x < W; x += 30) { g.fillRect(x, bottom - 6, 20, 14); }
  g.fillStyle = '#fff'; for (let x = 4; x < W; x += 30) g.fillRect(x, bottom - 8, 20, 4);
  // Seitentürme
  for (const sx of [26, W - 26]) {
    circle(g, sx, fy + 40, 30, '#7da6d3'); circle(g, sx, fy + 40, 22, '#a9d3ef');
    g.fillStyle = '#6a8fbf'; g.beginPath(); g.moveTo(sx - 24, fy + 40); g.lineTo(sx, fy - 5); g.lineTo(sx + 24, fy + 40); g.fill();
    g.fillStyle = C.pink; g.fillRect(sx - 1, fy - 22, 2, 18); g.beginPath(); g.moveTo(sx + 1, fy - 22); g.lineTo(sx + 14 + Math.sin(t * 5) * 3, fy - 17); g.lineTo(sx + 1, fy - 12); g.fill();
  }
  // Tor (Gesicht)
  const gx = W / 2;
  g.fillStyle = '#4b6c9e'; rr(g, gx - 66, fy - 2, 132, 124, 30); g.fill();
  g.fillStyle = f.broken ? '#0a1130' : '#20305e';
  g.beginPath(); g.moveTo(gx - 52, bottom + 4); g.lineTo(gx - 52, fy + 50); g.arc(gx, fy + 50, 52, Math.PI, 0); g.lineTo(gx + 52, bottom + 4); g.fill();
  if (!f.broken) {
    // Torflügel mit Frostmuster
    g.fillStyle = '#9cc8e8'; g.fillRect(gx - 48, fy + 64, 46, bottom - fy - 60); g.fillRect(gx + 2, fy + 64, 46, bottom - fy - 60);
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(gx + s * 25, fy + 70); g.lineTo(gx + s * 25, bottom); g.moveTo(gx + s * 10, fy + 90); g.lineTo(gx + s * 40, fy + 90); g.stroke(); }
    if (f.cracks) {
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath();
      for (const c of f.cracks) { g.moveTo(gx, fy + 66); g.lineTo(gx + c[0], fy + 66 + c[1]); g.lineTo(gx + c[2], fy + 66 + c[3]); }
      g.stroke();
    }
    // Eiszapfen-Zähne
    g.fillStyle = '#e6f6ff';
    for (let i = -4; i <= 4; i++) { const xx = gx + i * 11, len = 10 + (i % 2 ? 0 : 7); g.beginPath(); g.moveTo(xx - 5, fy + 60); g.lineTo(xx + 5, fy + 60); g.lineTo(xx, fy + 60 + len); g.fill(); }
  }
  // Tor-Auge
  const ex = gx, ey = fy + 30, open = f.eyeOpen || 0;
  g.fillStyle = '#20305e'; g.beginPath(); g.ellipse(ex, ey, 30, 22, 0, 0, 6.3); g.fill();
  if (!f.broken) {
    if (open > 0.02) {
      g.save(); g.beginPath(); g.ellipse(ex, ey, 27, 19 * open, 0, 0, 6.3); g.clip();
      circle(g, ex, ey, 27, f.eyeGlow ? '#ffe7f0' : '#fff');
      const px = ex + (f.lookX || 0) * 9, py = ey + 4;
      circle(g, px, py, 11, C.violet); circle(g, px, py, 5.5, '#13204a'); circle(g, px - 3, py - 3, 2.2, '#fff');
      g.restore();
      if (f.eyeGlow) { g.globalAlpha = 0.4 + 0.3 * Math.sin(t * 30); g.strokeStyle = C.pink; g.lineWidth = 4; g.beginPath(); g.ellipse(ex, ey, 32, 24, 0, 0, 6.3); g.stroke(); g.globalAlpha = 1; }
    } else {
      g.strokeStyle = '#9cc8e8'; g.lineWidth = 3; g.beginPath(); g.moveTo(ex - 26, ey); g.quadraticCurveTo(ex, ey + 10, ex + 26, ey); g.stroke();
      g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(ex + i * 9, ey + 4); g.lineTo(ex + i * 11, ey + 11); g.stroke(); }
    }
    // böse Augenbraue
    g.fillStyle = '#dff1ff'; g.beginPath(); g.moveTo(ex - 40, ey - 30); g.lineTo(ex, ey - 16); g.lineTo(ex + 40, ey - 30); g.lineTo(ex + 40, ey - 22); g.lineTo(ex, ey - 9); g.lineTo(ex - 40, ey - 22); g.fill();
    if (f.eyeFlash > 0) { g.globalAlpha = Math.min(1, f.eyeFlash * 10); circle(g, ex, ey, 28, '#fff'); g.globalAlpha = 1; }
  }
  // Schnee oben auf dem Tor
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(gx, fy - 2, 70, 8, 0, Math.PI, 0); g.fill();
}

export function drawTurret(g, x, y, t, o) {
  g.save(); g.translate(x, y);
  circle(g, 0, 4, 23, 'rgba(5,9,31,.35)');
  circle(g, 0, 0, 22, '#5f7fb0');
  g.strokeStyle = 'rgba(30,50,90,.5)'; g.lineWidth = 1;
  for (let i = 0; i < 10; i++) { const a = i * 0.628; g.beginPath(); g.moveTo(Math.cos(a) * 16, Math.sin(a) * 16); g.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); g.stroke(); }
  circle(g, 0, 0, 16, '#a9d3ef');
  if (o.charge > 0) { g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 32); circle(g, 0, 0, 16 + (1 - o.charge) * 14, C.gold); g.globalAlpha = 1; }
  g.rotate(o.aim - Math.PI / 2);
  g.fillStyle = '#34466f'; rr(g, -5.5, 0, 11, 25, 3); g.fill();
  g.fillStyle = o.charge > 0 ? C.gold : '#1b2a5a'; g.fillRect(-4, 20, 8, 5);
  circle(g, 0, 0, 9, '#34466f'); circle(g, 0, 0, 4, o.charge > 0 ? C.gold : C.pink);
  g.restore();
  if (o.flash > 0) { g.globalAlpha = Math.min(1, o.flash * 10); circle(g, x, y, 22, '#fff'); g.globalAlpha = 1; }
  // Lebensbalken
  if (o.hp < o.maxHp) { g.fillStyle = 'rgba(5,9,31,.7)'; g.fillRect(x - 18, y - 31, 36, 5); g.fillStyle = C.green; g.fillRect(x - 17, y - 30, 34 * o.hp / o.maxHp, 3); }
}
export function drawRubble(g, x, y, t) {
  g.fillStyle = '#6d86ad'; g.beginPath(); g.ellipse(x, y + 4, 20, 11, 0, 0, 6.3); g.fill();
  circle(g, x - 8, y, 7, '#8fb0d6'); circle(g, x + 7, y + 2, 6, '#8fb0d6'); circle(g, x, y - 3, 8, '#eef6ff');
  g.strokeStyle = '#ddd'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 2, y - 2); g.lineTo(x + 2, y - 22); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x + 2, y - 22); g.lineTo(x + 14, y - 19 + Math.sin(t * 6) * 2); g.lineTo(x + 2, y - 14); g.fill();
}

// ---------- Der Grummel-Yeti ----------
export function drawYeti(g, x, y, t, o = {}) {
  const mood = o.mood || 'angry', arms = o.arms || 0, sq = o.squash || 0;
  g.save(); g.translate(x, y); g.scale(1 + sq * 0.12, 1 - sq * 0.12);
  // Schatten
  g.fillStyle = 'rgba(5,9,31,.35)'; g.beginPath(); g.ellipse(0, 92, 80, 16, 0, 0, 6.3); g.fill();
  // Füße
  g.fillStyle = '#c9dcef'; g.beginPath(); g.ellipse(-36, 82, 27, 14, 0, 0, 6.3); g.ellipse(36, 82, 27, 14, 0, 0, 6.3); g.fill();
  g.fillStyle = '#7aa0c4'; for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) circle(g, s * 36 + i * 10, 90, 4, '#7aa0c4');
  // Arme
  const wave = mood === 'happy' ? Math.sin(t * 8) * 0.5 : 0;
  for (const s of [-1, 1]) {
    const up = Math.min(1, Math.max(0, arms + (s === 1 ? wave : 0)));
    const hx = s * (78 + up * 10), hy = 38 - up * 112 + Math.sin(t * 3 + s) * 3;
    g.strokeStyle = '#dbe9f7'; g.lineWidth = 32; g.lineCap = 'round';
    g.beginPath(); g.moveTo(s * 48, -8); g.quadraticCurveTo(s * 86, -10 - up * 30, hx, hy); g.stroke();
    g.strokeStyle = '#eef5fd'; g.lineWidth = 24; g.stroke();
    circle(g, hx, hy, 17, '#9fb7d3'); for (let i = -1; i <= 1; i++) circle(g, hx + i * 8, hy + (up > 0.5 ? -13 : 13), 5, '#9fb7d3');
  }
  // Fell-Körper
  g.beginPath();
  for (let i = 0; i <= 60; i++) {
    const a = i / 60 * Math.PI * 2, bump = 1 + 0.05 * Math.sin(a * 16 + t * 3) + 0.03 * Math.sin(a * 7);
    g.lineTo(Math.cos(a) * 70 * bump, 4 + Math.sin(a) * 80 * bump);
  }
  g.closePath(); g.fillStyle = '#eef5fd'; g.fill();
  g.fillStyle = '#d3e3f3'; g.beginPath(); g.ellipse(0, 40, 44, 38, 0, 0, 6.3); g.fill();
  // Hörner
  g.fillStyle = '#bfe3f5';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 22, -60); g.quadraticCurveTo(s * 40, -84, s * 30, -100); g.quadraticCurveTo(s * 34, -78, s * 10, -66); g.fill(); }
  // Gesicht
  const rage = mood === 'rage';
  g.fillStyle = rage ? '#a587b8' : mood === 'happy' ? '#8fb6da' : '#7aa0c4';
  g.beginPath(); g.ellipse(0, -22, 44, 35, 0, 0, 6.3); g.fill();
  const lx = (o.look || 0) * 3;
  if (mood === 'happy') {
    g.strokeStyle = '#13204a'; g.lineWidth = 4; g.lineCap = 'round';
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 16, -26, 8, Math.PI + 0.3, -0.3); g.stroke(); }
    g.globalAlpha = 0.6; circle(g, -28, -12, 7, C.pink); circle(g, 28, -12, 7, C.pink); g.globalAlpha = 1;
    g.fillStyle = '#13204a'; g.beginPath(); g.arc(0, -10, 18, 0.1, Math.PI - 0.1); g.closePath(); g.fill();
    g.fillStyle = C.red; g.beginPath(); g.ellipse(0, 0, 9, 5, 0, 0, 6.3); g.fill();
    g.fillStyle = '#fff'; g.fillRect(-9, -10, 7, 5); g.fillRect(2, -10, 7, 5);
  } else if (mood === 'dizzy') {
    g.strokeStyle = '#13204a'; g.lineWidth = 2.5;
    for (const s of [-1, 1]) { g.beginPath(); for (let i = 0; i < 30; i++) { const a = i * 0.45 + t * 6, r = i * 0.33; g.lineTo(s * 16 + Math.cos(a) * r, -26 + Math.sin(a) * r); } g.stroke(); }
    g.beginPath(); g.moveTo(-14, 0); for (let i = 0; i <= 8; i++) g.lineTo(-14 + i * 3.5, i % 2 ? 3 : -2); g.stroke();
    for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.57; star(g, Math.cos(a) * 46, -74 + Math.sin(a) * 10, 6, C.gold); }
  } else {
    for (const s of [-1, 1]) {
      circle(g, s * 16, -26, 10.5, rage ? '#ffd6e0' : '#fff');
      circle(g, s * 16 + lx, -24, 5, rage ? C.red : '#13204a'); circle(g, s * 16 + lx - 1.5, -26, 1.6, '#fff');
    }
    g.fillStyle = '#13204a'; g.beginPath();
    g.moveTo(-32, -44); g.lineTo(-6, -32); g.lineTo(-6, -36 + (rage ? 4 : 0)); g.lineTo(-30, -50); g.closePath();
    g.moveTo(32, -44); g.lineTo(6, -32); g.lineTo(6, -36 + (rage ? 4 : 0)); g.lineTo(30, -50); g.closePath(); g.fill();
    if (o.mouth > 0) {
      g.fillStyle = '#13204a'; g.beginPath(); g.ellipse(0, -3, 16, 9 + o.mouth * 5, 0, 0, 6.3); g.fill();
      g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 30); circle(g, 0, -3, 6 + o.mouth * 5, C.pink); g.globalAlpha = 1;
    } else {
      g.strokeStyle = '#13204a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.arc(0, 12, 18, -2.4, -0.74); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-9, -1); g.lineTo(-6, 5); g.lineTo(-3, -2); g.moveTo(9, -1); g.lineTo(6, 5); g.lineTo(3, -2); g.fill();
    }
    if (rage) { // Dampfwölkchen
      for (const s of [-1, 1]) { const p = (t * 1.5 + (s > 0 ? 0.5 : 0)) % 1; g.globalAlpha = 1 - p; circle(g, s * (50 + p * 20), -60 - p * 30, 6 + p * 8, '#fff'); g.globalAlpha = 1; }
    }
  }
  // Schal
  if (o.scarf) {
    g.fillStyle = C.red; rr(g, -50, 8, 100, 16, 8); g.fill();
    g.fillStyle = C.green; for (let i = -40; i < 45; i += 18) g.fillRect(i, 8, 7, 16);
    g.fillStyle = C.red; g.save(); g.translate(28, 18); g.rotate(0.25 + Math.sin(t * 4) * 0.1); g.fillRect(-7, 0, 14, 40); g.fillStyle = C.green; g.fillRect(-7, 12, 14, 6); g.fillRect(-7, 26, 14, 6); g.restore();
    circle(g, 28 - Math.sin(0.25) * 40, 62, 7, '#fff');
  }
  if (o.gift) drawGift(g, 0, 42, 36, C.red, Math.sin(t * 5) * 0.08);
  if (o.flash > 0) { g.globalAlpha = Math.min(0.7, o.flash * 7); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 4, 72, 82, 0, 0, 6.3); g.fill(); }
  g.restore();
}

export function star(g, x, y, r, fill, rot = 0) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  g.closePath(); g.fillStyle = fill; g.fill();
}

// Porträts für die Sprechblasen
export function portrait(g, who, x, y, t) {
  g.save(); g.translate(x, y);
  circle(g, 0, 0, 22, who === 'yeti' || who === 'yetiFroh' ? '#2d4579' : '#1d3a4a');
  g.beginPath(); g.arc(0, 0, 22, 0, 6.3); g.clip();
  if (who === 'yeti' || who === 'yetiFroh') {
    g.scale(0.36, 0.36); g.translate(0, 30);
    drawYeti(g, 0, 0, t, { mood: who === 'yetiFroh' ? 'happy' : 'angry', scarf: who === 'yetiFroh' });
  } else if (who === 'wichtel') {
    circle(g, 0, 8, 13, '#f2c6a0');
    g.fillStyle = C.green; g.beginPath(); g.moveTo(-15, 2); g.quadraticCurveTo(0, -24, 22, -18); g.lineTo(15, 2); g.fill();
    circle(g, 22, -18, 4, '#fff'); g.fillStyle = '#fff'; g.fillRect(-16, -1, 32, 5);
    circle(g, -5, 9, 1.8, '#13204a'); circle(g, 5, 9, 1.8, '#13204a');
    g.strokeStyle = '#13204a'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 12, 5, 0.3, Math.PI - 0.3); g.stroke();
    g.strokeStyle = '#ccc'; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, 8); g.quadraticCurveTo(-16, 22, -4, 21); g.stroke(); circle(g, -3, 21, 2.5, '#555');
    g.fillStyle = '#f2c6a0'; g.beginPath(); g.moveTo(-13, 6); g.lineTo(-21, 1); g.lineTo(-13, 11); g.fill(); g.beginPath(); g.moveTo(13, 6); g.lineTo(21, 1); g.lineTo(13, 11); g.fill();
  } else {
    g.scale(1.1, 1.1); drawSleigh(g, 0, 2, t, { noFlame: true });
  }
  g.restore();
}
