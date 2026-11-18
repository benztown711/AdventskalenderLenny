// Türchen 4: Wichtel-Memo. Paare finden in drei Leveln, ab Level 2 mit Wichtel-Joker.
export const howto = 'Finde alle gleichen Paare! Tippe zwei Karten nacheinander an, oder wähle mit den Pfeiltasten eine Karte und drücke Leertaste. Die Wichtel-Karte zeigt kurz alle Motive.';

const W = 360, H = 560;
const BX = 16, BY = 76, BW = 328, BH = 468, GAP = 10; // Spielfeld-Bereich unter der Titelzeile
const LEVELS = [
  { cols: 3, rows: 4, pairs: 6, joker: false },   // 12 Karten
  { cols: 4, rows: 4, pairs: 8, joker: true },    // 16 Karten (7 Paare + Joker-Paar)
  { cols: 4, rows: 5, pairs: 10, joker: true },   // 20 Karten (9 Paare + Joker-Paar)
];
const MOTIFS = ['stern', 'tanne', 'geschenk', 'glocke', 'kerze', 'schneemann', 'herz', 'mond', 'zucker', 'kugel'];
const JOKER = 'wichtel';
const FACE = '#fff8ec', INK = '#14204f';
const SPARK_COLORS = ['#ffd166', '#ef476f', '#06d6a0', '#8ecae6', '#ffffff', '#c77dff'];

const shuffle = arr => {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
};

// Abgerundetes Rechteck als Pfad
function rrPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Zeichen-Helfer, alle Maße in "Einheiten" (Skalierung passiert außen, Einheit ~ 1 Radius)
function tri(g, top, bot, hw) { g.beginPath(); g.moveTo(0, top); g.lineTo(hw, bot); g.lineTo(-hw, bot); g.closePath(); }
function star(g, R, ri, n, fill) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n, rad = i % 2 ? ri : R;
    g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  g.closePath(); g.fillStyle = fill; g.fill(); g.stroke();
}
function rect(g, x, y, w, h, fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h); }
function circ(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); g.stroke(); }
function dot(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }

const SYMBOLS = {
  stern(g) { star(g, 1, 0.45, 5, '#ffd166'); },
  tanne(g) {
    g.fillStyle = '#1f9d6b';
    [[-0.7, -0.15, 0.5], [-0.45, 0.25, 0.72], [-0.15, 0.6, 0.92]].forEach(([t, b, hw]) => { tri(g, t, b, hw); g.fill(); g.stroke(); });
    rect(g, -0.18, 0.6, 0.36, 0.35, '#8b5a2b');
    g.save(); g.translate(0, -0.92); star(g, 0.2, 0.09, 5, '#ffd166'); g.restore();
  },
  geschenk(g) {
    rect(g, -0.7, -0.15, 1.4, 1.05, '#ef476f');
    rect(g, -0.8, -0.45, 1.6, 0.35, '#d63c63');
    rect(g, -0.12, -0.45, 0.24, 1.35, '#ffd166');
    g.beginPath();
    g.ellipse(-0.25, -0.62, 0.25, 0.18, -0.4, 0, Math.PI * 2);
    g.ellipse(0.25, -0.62, 0.25, 0.18, 0.4, 0, Math.PI * 2);
    g.fillStyle = '#ffd166'; g.fill(); g.stroke();
  },
  glocke(g) {
    g.beginPath();
    g.moveTo(-0.85, 0.5); g.quadraticCurveTo(-0.85, -0.85, 0, -0.85); g.quadraticCurveTo(0.85, -0.85, 0.85, 0.5);
    g.lineTo(1.0, 0.65); g.lineTo(-1.0, 0.65); g.closePath();
    g.fillStyle = '#f4b400'; g.fill(); g.stroke();
    circ(g, 0, -0.98, 0.13, '#f4b400');
    circ(g, 0, 0.85, 0.18, INK);
  },
  kerze(g) {
    rect(g, -0.3, -0.1, 0.6, 1.0, '#ff8fa3');
    g.beginPath();
    g.moveTo(0, -1.05); g.quadraticCurveTo(0.42, -0.6, 0.22, -0.3); g.quadraticCurveTo(0, -0.12, -0.22, -0.3); g.quadraticCurveTo(-0.42, -0.6, 0, -1.05);
    g.fillStyle = '#ffb703'; g.fill(); g.stroke();
  },
  schneemann(g) {
    circ(g, 0, 0.45, 0.55, '#ffffff');
    circ(g, 0, -0.2, 0.42, '#ffffff');
    circ(g, 0, -0.8, 0.3, '#ffffff');
    rect(g, -0.25, -1.32, 0.5, 0.36, INK);
    rect(g, -0.4, -0.98, 0.8, 0.12, INK);
    g.beginPath(); g.moveTo(-0.05, -0.82); g.lineTo(0.55, -0.74); g.lineTo(-0.05, -0.7); g.closePath();
    g.fillStyle = '#ff7b00'; g.fill(); g.stroke();
    dot(g, -0.12, -0.86, 0.05, INK); dot(g, 0.12, -0.86, 0.05, INK);
    dot(g, 0, -0.3, 0.06, INK); dot(g, 0, -0.05, 0.06, INK);
  },
  herz(g) {
    g.beginPath();
    g.moveTo(0, 0.85);
    g.bezierCurveTo(-1.2, 0.1, -0.7, -0.9, 0, -0.35);
    g.bezierCurveTo(0.7, -0.9, 1.2, 0.1, 0, 0.85);
    g.closePath(); g.fillStyle = '#ef476f'; g.fill(); g.stroke();
  },
  mond(g) {
    circ(g, 0, 0, 0.9, '#9d4edd');
    dot(g, 0.45, -0.3, 0.75, FACE); // Fläche, die den Mond zur Sichel macht
  },
  zucker(g) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-0.5, 0.95); g.lineTo(-0.5, -0.35);
    g.arc(0, -0.35, 0.5, Math.PI, 2 * Math.PI);
    g.lineTo(0.5, -0.1);
    g.strokeStyle = '#ef476f'; g.lineWidth = 0.42; g.stroke();
    g.setLineDash([0.28, 0.28]); g.strokeStyle = '#ffffff'; g.stroke(); g.setLineDash([]);
  },
  kugel(g) {
    rect(g, -0.22, -1.0, 0.44, 0.3, '#ffd166');
    circ(g, 0, 0.1, 0.82, '#4cc9f0');
    dot(g, -0.3, -0.2, 0.17, 'rgba(255,255,255,.85)');
  },
  [JOKER](g) {
    circ(g, 0, 0.15, 0.7, '#ffd2a1');
    g.beginPath(); g.moveTo(-0.72, -0.3); g.lineTo(0.45, -1.0); g.lineTo(0.75, -0.3); g.closePath();
    g.fillStyle = '#ef476f'; g.fill(); g.stroke();
    circ(g, 0.45, -1.0, 0.14, '#ffffff');
    rect(g, -0.8, -0.42, 1.6, 0.2, '#ffffff');
    dot(g, -0.25, 0.12, 0.07, INK); dot(g, 0.25, 0.12, 0.07, INK);
    g.globalAlpha = 0.7; dot(g, -0.4, 0.38, 0.13, '#ff8fa3'); dot(g, 0.4, 0.38, 0.13, '#ff8fa3'); g.globalAlpha = 1;
    g.beginPath(); g.arc(0, 0.22, 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
    g.strokeStyle = INK; g.lineWidth = 0.08; g.stroke();
  },
};

function drawBack(g, w, h, rr) {
  rrPath(g, -w / 2, -h / 2, w, h, rr);
  g.fillStyle = '#2b2f7a'; g.fill();
  g.strokeStyle = '#ffd166'; g.lineWidth = 2; g.stroke();
  const m = Math.min(w, h) * 0.12;
  rrPath(g, -w / 2 + m, -h / 2 + m, w - 2 * m, h - 2 * m, rr * 0.6);
  g.strokeStyle = 'rgba(255,209,102,.7)'; g.lineWidth = 1.5; g.stroke();
  const R = Math.min(w, h) * 0.22;
  g.strokeStyle = '#8ecae6'; g.lineWidth = 2.5; g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI / 3;
    g.beginPath(); g.moveTo(-Math.cos(a) * R, -Math.sin(a) * R); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke();
  }
}

export default {
  create(ctx) {
    const { canvas, g, w, h, pos } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none';

    let level = 0, cards = [], open = [], phase = 'intro', timers = [], sparks = [];
    let matches = 0, errors = 0, moves = 0, peekDone = false, cur = 0, finished = false, time = 0;
    const flakes = Array.from({ length: 36 }, () => ({
      x: Math.random() * W, y: Math.random() * H, v: 14 + Math.random() * 24, s: 0.8 + Math.random() * 1.6,
    }));

    const after = (sec, fn) => timers.push({ t: sec, fn });
    function tick(dt) {
      const due = [];
      for (const tm of timers) if ((tm.t -= dt) <= 0) due.push(tm);
      if (due.length) timers = timers.filter(tm => tm.t > 0);
      due.forEach(tm => tm.fn());
    }
    const hud = () => ctx.hud.set({ Level: `${level + 1} / ${LEVELS.length}`, 'Züge': moves });
    const setUp = (c, up) => { c.up = up; c.target = up || c.matched ? 1 : 0; };
    const refresh = () => cards.forEach(c => { c.target = c.up || c.matched ? 1 : 0; });
    const showAll = () => cards.forEach(c => { c.target = 1; });

    function burst(c) {
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 130;
        sparks.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.6 + Math.random() * 0.4, color: SPARK_COLORS[i % SPARK_COLORS.length] });
      }
    }

    function startLevel(i) {
      level = i;
      const L = LEVELS[i];
      const regular = shuffle([...MOTIFS]).slice(0, L.pairs - (L.joker ? 1 : 0));
      const syms = shuffle([...regular, ...regular, ...(L.joker ? [JOKER, JOKER] : [])]);
      const cw = (BW - GAP * (L.cols - 1)) / L.cols, ch = (BH - GAP * (L.rows - 1)) / L.rows;
      cards = syms.map((sym, k) => ({
        sym, joker: sym === JOKER,
        x: BX + (k % L.cols) * (cw + GAP), y: BY + Math.floor(k / L.cols) * (ch + GAP), w: cw, h: ch,
        up: false, matched: false, f: 0, target: 0, wob: 0,
      }));
      matches = 0; open = []; peekDone = false; cur = 0; timers = [];
      phase = 'intro';
      ctx.save('level', i + 1);
      hud();
      if (i > 0) ctx.toast(`Level ${i + 1}!`);
      // Alle Karten 1,5 s offen zeigen, dann verdecken
      showAll();
      after(1.5, () => { refresh(); after(0.3, () => { phase = 'play'; }); });
    }

    function finishGame() {
      if (finished) return;
      finished = true; phase = 'done';
      const stars = errors <= 12 ? 3 : errors <= 20 ? 2 : 1;
      const score = Math.max(100, 1000 - 20 * errors);
      const text = stars === 3
        ? `Alle drei Level geschafft, nur ${errors} Fehlversuche. Richtig stark!`
        : stars === 2
          ? `Du hattest ${errors} Fehlversuche. Für 3 Sterne sind höchstens 12 erlaubt: Die Wichtel-Karte zeigt dir kurz alle Motive, nutz sie!`
          : `Du hattest ${errors} Fehlversuche. Für 2 Sterne sind höchstens 20 erlaubt, für 3 höchstens 12. Merk dir die Motive gut.`;
      ctx.finish({ won: true, stars, score, text });
    }

    function check() {
      const [a, b] = open;
      moves++; hud();
      if (a.sym === b.sym) {
        a.matched = b.matched = true; open = []; matches++;
        ctx.audio.sfx('coin'); burst(a); burst(b);
        if (matches === LEVELS[level].pairs) {
          phase = 'clear'; ctx.audio.sfx('level');
          after(1.0, () => (level + 1 < LEVELS.length ? startLevel(level + 1) : finishGame()));
        }
      } else {
        errors++; ctx.audio.sfx('bad'); phase = 'wobble';
        a.wob = b.wob = 0.8;
        after(0.8, () => { setUp(a, false); setUp(b, false); open = []; phase = 'play'; });
      }
    }

    function flip(c) {
      if (phase !== 'play' || c.up || c.matched || open.length >= 2) return;
      setUp(c, true); open.push(c); ctx.audio.sfx('swoosh');
      if (c.joker && !peekDone) {
        // Wichtel-Karte: beim ersten Aufdecken in diesem Level alle Karten 1 s zeigen
        peekDone = true; phase = 'peek'; ctx.audio.sfx('power');
        ctx.toast('Wichtel-Karte: alle Motive!', 1000);
        showAll();
        after(1.0, () => { phase = 'play'; refresh(); if (open.length === 2) check(); });
        return;
      }
      if (open.length === 2) check();
    }

    // Maus, Finger: Karte antippen
    ctx.on(canvas, 'pointerdown', e => {
      const p = pos(e);
      const i = cards.findIndex(c => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h);
      if (i < 0) return;
      cur = i; flip(cards[i]);
    });

    // Tastatur: Cursor mit Pfeilen bewegen, Leertaste/Enter deckt auf
    ctx.input.onPress(name => {
      if (!cards.length) return;
      const cols = LEVELS[level].cols, total = cards.length, col = cur % cols;
      if (name === 'left' && col > 0) cur--;
      else if (name === 'right' && col < cols - 1 && cur + 1 < total) cur++;
      else if (name === 'up' && cur - cols >= 0) cur -= cols;
      else if (name === 'down' && cur + cols < total) cur += cols;
      else if (name === 'a') flip(cards[cur]);
    });
    ctx.input.pad({ dpad: true, a: 'Aufdecken' });

    function drawCard(c) {
      const sx = Math.max(0.05, Math.abs(Math.cos(c.f * Math.PI))); // Flip: horizontal stauchen
      const ang = c.wob > 0 ? Math.sin(c.wob * 38) * 0.16 * (c.wob / 0.8) : 0; // Wackeln bei falschem Paar
      const rr = Math.min(c.w, c.h) * 0.12;
      g.save();
      g.translate(c.x + c.w / 2, c.y + c.h / 2);
      g.rotate(ang); g.scale(sx, 1);
      if (c.f > 0.5) {
        const r = Math.min(c.w, c.h) * 0.34;
        if (c.matched) { g.shadowColor = '#ffd166'; g.shadowBlur = 14 + 8 * Math.sin(time * 7); }
        rrPath(g, -c.w / 2, -c.h / 2, c.w, c.h, rr);
        g.fillStyle = FACE; g.fill(); g.shadowBlur = 0;
        g.lineWidth = c.joker ? 3 : 2;
        g.strokeStyle = c.matched ? '#06d6a0' : c.joker ? '#ffd166' : '#8ecae6';
        g.stroke();
        g.save(); g.scale(r, r);
        g.lineWidth = 0.1; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round';
        SYMBOLS[c.sym](g);
        g.restore();
      } else {
        drawBack(g, c.w, c.h, rr);
      }
      g.restore();
    }

    function draw() {
      g.fillStyle = '#0b1437'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (const f of flakes) { g.beginPath(); g.arc(f.x, f.y, f.s, 0, Math.PI * 2); g.fill(); }

      const L = LEVELS[level];
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd166'; g.font = 'bold 22px system-ui, sans-serif';
      g.fillText('Wichtel-Memo', w / 2, 26);
      g.fillStyle = '#8ecae6'; g.font = '14px system-ui, sans-serif';
      g.fillText(phase === 'intro' ? 'Merk dir alle Motive!' : `Level ${level + 1} von ${LEVELS.length} · ${L.cols}x${L.rows} Karten`, w / 2, 50);

      for (const c of cards) drawCard(c);

      for (const p of sparks) {
        g.globalAlpha = Math.max(0, Math.min(1, p.life * 2.5));
        g.fillStyle = p.color; g.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
      }
      g.globalAlpha = 1;

      const c = cards[cur];
      if (c) {
        g.save(); g.setLineDash([6, 4]); g.lineDashOffset = -time * 20;
        g.strokeStyle = '#ffd166'; g.lineWidth = 3;
        rrPath(g, c.x - 4, c.y - 4, c.w + 8, c.h + 8, 12); g.stroke();
        g.restore();
      }
    }

    ctx.loop(dt => {
      time += dt;
      for (const f of flakes) {
        f.y += f.v * dt; f.x += Math.sin(time + f.s) * 10 * dt;
        if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
      }
      for (const c of cards) {
        const d = c.target - c.f;
        c.f += Math.sign(d) * Math.min(Math.abs(d), dt * 5);
        if (c.wob > 0) c.wob = Math.max(0, c.wob - dt);
      }
      tick(dt);
      sparks = sparks.filter(p => (p.life -= dt) > 0);
      for (const p of sparks) { p.vy += 160 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      draw();
    });

    startLevel(0);
    return { destroy() {} };
  },
};
