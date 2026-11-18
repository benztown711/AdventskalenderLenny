// Türchen 24: Das Feuerwerk über dem Weihnachtsdorf
import { C, FONT, circle, rr, star, text, drawYeti, drawSleigh, drawGift } from './art.js';

const COLORS = ['#ffd166', '#ef476f', '#06d6a0', '#8ecae6', '#c77dff', '#ffffff', '#ff9f43'];
const KINDS = ['peony', 'ring', 'heart', 'willow', 'flake', 'star', 'double', 'crackle'];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

export function createFinale({ g, W, H, audio, music, onDone, freeAfter = 15, doneLabel = 'Fertig!' }) {
  let t = 0, rockets = [], parts = [], nextAuto = 0.4, taps = 0, kindIdx = 0;
  const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.62, r: rnd(0.4, 1.5), p: Math.random() * 6 }));
  const flakes = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rnd(0.8, 2.4), v: rnd(15, 40), p: Math.random() * 6 }));
  const houses = [
    { x: 8, w: 52, h: 34, roof: '#7a2e46' }, { x: 64, w: 40, h: 44, roof: '#2e5d7a' }, { x: 250, w: 46, h: 40, roof: '#2e7a5a' },
    { x: 300, w: 56, h: 32, roof: '#7a2e46' },
  ];
  const smoke = [];
  const BTN = { x: W / 2 - 75, y: H - 62, w: 150, h: 46 };

  // "Frohe Weihnachten!" als Lichtpunkte
  const dots = [];
  (() => {
    const c = document.createElement('canvas'); c.width = W; c.height = 150;
    const q = c.getContext('2d'); q.fillStyle = '#fff'; q.textAlign = 'center'; q.textBaseline = 'middle';
    const fit = (str, size) => { q.font = `bold ${size}px ${FONT}`; const m = q.measureText(str).width; return m > W - 24 ? size * (W - 24) / m : size; };
    q.font = `bold ${fit('Frohe', 56)}px ${FONT}`; q.fillText('Frohe', W / 2, 40);
    q.font = `bold ${fit('Weihnachten!', 56)}px ${FONT}`; q.fillText('Weihnachten!', W / 2, 104);
    const d = q.getImageData(0, 0, W, 150).data, step = 4;
    for (let y = 0; y < 150; y += step) for (let x = 0; x < W; x += step) {
      if (d[(y * W + x) * 4 + 3] > 140) dots.push({ tx: x, ty: y + 70, x: W / 2, y: 150, sx: 0, sy: 0, d: rnd(0, 0.6), p: Math.random() * 6, c: Math.random() < 0.8 ? C.gold : pick(['#fff', C.red, C.green, C.ice]) });
    }
    for (const p of dots) { const a = Math.random() * 6.28, v = rnd(30, 170); p.sx = W / 2 + Math.cos(a) * v; p.sy = 150 + Math.sin(a) * v; p.x = W / 2; p.y = 150; }
  })();

  // Baum-Lichter
  const tree = { x: W / 2, base: H - 70, h: 230 };
  const lights = [];
  for (let i = 0; i < 46; i++) {
    const f = Math.random(), yy = tree.base - 20 - f * (tree.h - 40), half = (1 - f) * 76 + 8;
    lights.push({ x: tree.x + rnd(-half, half) * 0.85, y: yy + rnd(-4, 4), c: COLORS[i % 5], p: Math.random() * 6 });
  }

  function boom(x, y, kind, color) {
    const c2 = pick(COLORS.filter(c => c !== color));
    const add = (vx, vy, o = {}) => parts.length < 2200 && parts.push({ x, y, vx, vy, life: o.life || rnd(1.2, 1.8), max: 0, c: o.c || color, s: o.s || rnd(1.6, 2.6), drag: o.drag || 1.6, grav: o.grav ?? 40, tw: o.tw || 0, crack: o.crack || 0 });
    if (kind === 'peony' || kind === 'crackle') for (let i = 0; i < 80; i++) { const a = Math.random() * 6.283, v = Math.sqrt(Math.random()) * 170; add(Math.cos(a) * v, Math.sin(a) * v, { crack: kind === 'crackle' ? rnd(0.6, 1.1) : 0, tw: kind === 'crackle' ? 1 : 0 }); }
    if (kind === 'double') for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283, v = i % 2 ? 160 : 90; add(Math.cos(a) * v, Math.sin(a) * v, { c: i % 2 ? color : c2 }); }
    if (kind === 'ring') { const tilt = rnd(0.35, 1); for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283; add(Math.cos(a) * 160, Math.sin(a) * 160 * tilt, { s: 2.4 }); } for (let i = 0; i < 20; i++) { const a = Math.random() * 6.283; add(Math.cos(a) * 40, Math.sin(a) * 40, { c: c2 }); } }
    if (kind === 'heart') for (let i = 0; i < 70; i++) { const a = i / 70 * 6.283, hx = 16 * Math.sin(a) ** 3, hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); add(hx * 9.5, hy * 9.5, { c: i % 7 ? C.red : '#fff', grav: 20 }); }
    if (kind === 'willow') for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283, v = Math.sqrt(Math.random()) * 150; add(Math.cos(a) * v, Math.sin(a) * v, { c: C.gold, life: rnd(2.4, 3.2), drag: 2.4, grav: 70, tw: 1, s: 1.8 }); }
    if (kind === 'star') for (let i = 0; i < 80; i++) { const a = i / 80 * 6.283, k = (i % 16) / 16, r = 0.5 + 0.5 * Math.abs(1 - 2 * k); const ang = a; add(Math.cos(ang) * 175 * (0.45 + 0.55 * Math.pow(Math.abs(Math.cos(ang * 2.5)), 3)), Math.sin(ang) * 175 * (0.45 + 0.55 * Math.pow(Math.abs(Math.cos(ang * 2.5)), 3)), { c: r > 0 ? color : c2, grav: 25 }); }
    if (kind === 'flake') for (let arm = 0; arm < 6; arm++) {
      const a = arm * Math.PI / 3 - Math.PI / 2;
      for (let k = 1; k <= 9; k++) add(Math.cos(a) * k * 17, Math.sin(a) * k * 17, { c: C.ice, grav: 15, s: 2.4 });
      for (const side of [-0.6, 0.6]) for (let k = 1; k <= 3; k++) add(Math.cos(a) * 95 + Math.cos(a + side) * k * 16, Math.sin(a) * 95 + Math.sin(a + side) * k * 16, { c: '#fff', grav: 15 });
    }
    parts.push({ flash: true, x, y, life: 0.25 });
    audio.noise(0.55, 0.14);
    audio.tone(rnd(70, 95), 0.4, 'sine', 0.22, 35);
  }

  function launch(x, ty, kind) {
    const color = pick(COLORS);
    rockets.push({ x, y: H - 30, vx: rnd(-12, 12), vy: -Math.sqrt(2 * 260 * Math.max(60, H - 30 - ty)), ty, kind: kind || pick(KINDS), color, trail: [] });
    audio.tone(rnd(500, 700), 0.6, 'sine', 0.035, 1600);
  }

  function update(dt) {
    t += dt;
    music.update(dt);
    // automatische Show
    nextAuto -= dt;
    if (nextAuto <= 0) {
      if (t < 2) { launch(W / 2, 150, 'peony'); nextAuto = 0.9; }
      else { launch(rnd(40, W - 40), rnd(70, 260)); if (Math.random() < 0.3) launch(rnd(40, W - 40), rnd(70, 260)); nextAuto = taps > 0 ? rnd(1.4, 2.4) : rnd(0.7, 1.4); }
    }
    for (const r of rockets) {
      r.vy += 260 * dt; r.x += r.vx * dt; r.y += r.vy * dt;
      r.trail.push({ x: r.x, y: r.y, l: 0.4 }); if (r.trail.length > 14) r.trail.shift();
      if (r.vy >= -30 || r.y <= r.ty) { r.dead = true; boom(r.x, r.y, r.kind, r.color); }
    }
    rockets = rockets.filter(r => !r.dead);
    for (const p of parts) {
      p.life -= dt; if (p.flash) continue;
      const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.crack && (p.crack -= dt) <= 0) { p.crack = 0; p.life = Math.min(p.life, 0.15); if (Math.random() < 0.25) audio.tone(rnd(1800, 2600), 0.03, 'square', 0.02); for (let i = 0; i < 3; i++) parts.push({ x: p.x, y: p.y, vx: rnd(-50, 50), vy: rnd(-50, 50), life: 0.25, c: '#fff', s: 1.4, drag: 3, grav: 0 }); }
    }
    parts = parts.filter(p => p.life > 0);
    // Lichtpunkt-Schrift
    const tt = t - 1.3;
    if (tt > 0) for (const p of dots) {
      const k = Math.min(1, Math.max(0, (tt - p.d * 0.5) / 1.6)), e = 1 - Math.pow(1 - k, 3);
      const ex = p.sx + (p.tx - p.sx) * e, ey = p.sy + (p.ty - p.sy) * e;
      p.x = k < 0.02 ? p.sx : ex; p.y = ey;
    }
    for (const f of flakes) { f.y += f.v * dt; f.x += Math.sin(t + f.p) * 10 * dt; if (f.y > H) { f.y = -4; f.x = Math.random() * W; } }
    if (Math.random() < dt * 3) { const h = pick(houses); smoke.push({ x: h.x + h.w * 0.75, y: H - 46 - h.h - 16, l: 2.5 }); }
    for (const s of smoke) { s.y -= 14 * dt; s.x += 6 * dt; s.l -= dt; }
    for (let i = smoke.length - 1; i >= 0; i--) if (smoke[i].l <= 0) smoke.splice(i, 1);
  }

  function drawTree() {
    const { x, base, h } = tree;
    g.fillStyle = '#5a3a28'; g.fillRect(x - 9, base - 12, 18, 22);
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const top = base - h + i * (h / tiers) * 0.78, bot = top + h / tiers * 1.35, half = 30 + i * 15;
      g.fillStyle = i % 2 ? '#0e6b4e' : '#0f7a57'; g.beginPath(); g.moveTo(x, top); g.lineTo(x + half, bot); g.lineTo(x - half, bot); g.closePath(); g.fill();
      g.fillStyle = '#eaf6ff'; g.beginPath(); g.moveTo(x - half, bot);
      for (let k = 0; k <= 8; k++) g.lineTo(x - half + k * half / 4, bot - (k % 2 ? 5 : 1));
      g.lineTo(x + half, bot); g.lineTo(x - half, bot); g.fill();
    }
    // Girlande
    g.strokeStyle = 'rgba(255,209,102,.6)'; g.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const yy = base - 40 - i * 45, half = 70 - i * 15; g.beginPath(); g.moveTo(x - half, yy - 8); g.quadraticCurveTo(x, yy + 14, x + half, yy - 16); g.stroke(); }
    for (const l of lights) {
      const on = Math.sin(t * 3 + l.p + l.y * 0.05) > -0.2;
      if (on) { g.globalAlpha = 0.35; circle(g, l.x, l.y, 6, l.c); g.globalAlpha = 1; }
      circle(g, l.x, l.y, 2.4, on ? l.c : '#334');
    }
    // Stern
    const sy = base - h - 4;
    g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 4); circle(g, x, sy, 26, C.gold); g.globalAlpha = 1;
    star(g, x, sy, 15, C.gold, Math.sin(t) * 0.15); star(g, x, sy, 7, '#fff8dc', Math.sin(t) * 0.15);
  }

  function draw() {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#060c26'); sky.addColorStop(0.6, C.night); sky.addColorStop(1, '#1d2b6b');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (const s of stars) { g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + s.p)); circle(g, s.x, s.y, s.r, '#fff'); }
    g.globalAlpha = 1;
    // Mond
    circle(g, 306, 58, 30, 'rgba(255,240,200,.12)'); circle(g, 306, 58, 20, '#fff4d6'); circle(g, 314, 52, 18, '#0a1232');
    // Feuerwerk (leuchtend)
    g.globalCompositeOperation = 'lighter';
    for (const r of rockets) {
      r.trail.forEach((p, i) => { g.globalAlpha = i / r.trail.length * 0.8; circle(g, p.x, p.y, 1.8, '#ffcf8a'); });
      g.globalAlpha = 1; circle(g, r.x, r.y, 2.6, '#fff');
    }
    for (const p of parts) {
      if (p.flash) { g.globalAlpha = p.life * 2.4; circle(g, p.x, p.y, 40 * (1 - p.life * 2), '#fff'); continue; }
      const a = Math.min(1, p.life / 0.6) * (p.tw ? 0.5 + 0.5 * Math.sin(t * 40 + p.x) : 1);
      g.globalAlpha = a * 0.3; circle(g, p.x, p.y, p.s * 2.4, p.c);
      g.globalAlpha = a; circle(g, p.x, p.y, p.s, p.c);
    }
    // Lichtschrift
    if (t > 1.3) for (const p of dots) {
      const tw = 0.6 + 0.4 * Math.sin(t * 5 + p.p);
      g.globalAlpha = 0.25 * tw; circle(g, p.x, p.y, 4.2, p.c);
      g.globalAlpha = tw; circle(g, p.x, p.y, 1.8, p.c);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // Hügel
    g.fillStyle = '#c9def3'; g.beginPath(); g.moveTo(0, H - 60); g.quadraticCurveTo(W * 0.3, H - 96, W * 0.55, H - 70); g.quadraticCurveTo(W * 0.8, H - 50, W, H - 82); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = '#eef6ff'; g.beginPath(); g.moveTo(0, H - 44); g.quadraticCurveTo(W * 0.5, H - 64, W, H - 44); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    // Häuser
    for (const h of houses) {
      const by = H - 46, top = by - h.h;
      g.fillStyle = '#3b2f4f'; g.fillRect(h.x, top, h.w, h.h);
      g.fillStyle = '#2a2240'; g.fillRect(h.x + h.w * 0.68, top - 20, 8, 16);
      g.fillStyle = h.roof; g.beginPath(); g.moveTo(h.x - 5, top + 2); g.lineTo(h.x + h.w / 2, top - 20); g.lineTo(h.x + h.w + 5, top + 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(h.x - 6, top + 2); g.lineTo(h.x + h.w / 2, top - 22); g.lineTo(h.x + h.w + 6, top + 2); g.lineTo(h.x + h.w + 2, top - 2); g.lineTo(h.x + h.w / 2, top - 15); g.lineTo(h.x - 2, top - 2); g.fill();
      for (let k = 0; k < 2; k++) {
        const wx = h.x + 8 + k * (h.w - 26), wy = top + 9;
        g.globalAlpha = 0.35; circle(g, wx + 5, wy + 5, 11, '#ffd166'); g.globalAlpha = 1;
        g.fillStyle = Math.sin(t * 0.7 + h.x + k) > -0.9 ? '#ffd166' : '#8a6a2c'; g.fillRect(wx, wy, 10, 10);
        g.fillStyle = '#3b2f4f'; g.fillRect(wx + 4.3, wy, 1.4, 10); g.fillRect(wx, wy + 4.3, 10, 1.4);
      }
    }
    for (const s of smoke) { g.globalAlpha = Math.max(0, s.l / 2.5) * 0.35; circle(g, s.x, s.y, 4 + (2.5 - s.l) * 4, '#c8d4ea'); }
    g.globalAlpha = 1;
    drawTree();
    // Geschenkeberg, Schlitten und ein glücklicher Yeti
    const gc = [C.red, C.green, C.violet, C.ice, C.gold, C.red, C.green];
    gc.forEach((c, i) => drawGift(g, W / 2 - 50 + i * 16, H - 52 - (i % 2) * 8, 15, c, (i - 3) * 0.06, i % 2 ? '#fff' : C.gold));
    drawSleigh(g, 52, H - 112, t, { noFlame: true, rot: -0.3, scale: 1.05 });
    g.save(); g.translate(300, H - 100); g.scale(0.42, 0.42); drawYeti(g, 0, 0, t, { mood: 'happy', scarf: true, arms: 0.2 }); g.restore();
    // Schneefall
    for (const f of flakes) circle(g, f.x, f.y, f.r, 'rgba(255,255,255,.8)');
    // Hinweise
    if (t > 3.5 && taps === 0) { g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4); text(g, 'Tippe in den Himmel: eigene Raketen!', W / 2, 232, 14, '#fff'); g.globalAlpha = 1; }
    if (t > 4 && t < 12) { g.globalAlpha = Math.min(1, (t - 4)) * Math.min(1, 12 - t); text(g, 'Du hast Weihnachten gerettet!', W / 2, 46, 17, C.gold); g.globalAlpha = 1; }
    if (t >= freeAfter) {
      const p = 1 + Math.sin(t * 4) * 0.04, k = Math.min(1, (t - freeAfter) * 3);
      g.save(); g.globalAlpha = k; g.translate(BTN.x + BTN.w / 2, BTN.y + BTN.h / 2); g.scale(p, p);
      g.globalAlpha = 0.3 * k; rr(g, -BTN.w / 2 - 6, -BTN.h / 2 - 6, BTN.w + 12, BTN.h + 12, 26); g.fillStyle = C.gold; g.fill(); g.globalAlpha = k;
      rr(g, -BTN.w / 2, -BTN.h / 2, BTN.w, BTN.h, 23); g.fillStyle = C.gold; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      text(g, doneLabel, 0, 1, 20, '#3a2400', 'center', null);
      g.restore();
    }
  }

  function inBtn(x, y) { return t >= freeAfter && x > BTN.x - 6 && x < BTN.x + BTN.w + 6 && y > BTN.y - 6 && y < BTN.y + BTN.h + 6; }
  return {
    update, draw,
    get t() { return t; },
    tap(x, y) {
      if (inBtn(x, y)) { audio.sfx('click'); onDone(); return; }
      taps++; launch(x, Math.min(y, H - 120), KINDS[kindIdx++ % KINDS.length]);
    },
    key(n) {
      if (n === 'a') { taps++; launch(rnd(40, W - 40), rnd(80, 260), KINDS[kindIdx++ % KINDS.length]); }
      if (n === 'b' && t >= freeAfter) onDone();
    },
  };
}
