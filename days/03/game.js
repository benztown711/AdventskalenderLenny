// Türchen 3: Eisblock-Stapler (Fallblock-Puzzle mit Eis, Geschenk-Stein und Feuer-Stein)
export const howto = 'Stapel die Eisblöcke zu vollen Reihen, dann zerspringen sie! Tastatur: ◀ ▶ bewegen, ▲ drehen, ▼ schneller, Leertaste fallen lassen, C halten. Touch: Tippen = drehen, ziehen = bewegen, nach unten wischen = fallen lassen. 🎁 räumt seine Reihe ab, 🔥 schmilzt 3×3.';

const COLS = 10, ROWS = 18, C = 26, W = 360, H = 500;
const BX = 10, BY = 16, BW = COLS * C, BH = ROWS * C;
const PX = BX + BW + 10, PW = W - PX - 8;
const PAL = ['#7fdcff', '#ffd166', '#c77dff', '#06d6a0', '#ef476f', '#5b8def', '#ff9a5c'];
const SHAPES = [
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[1, 1], [1, 1]],                                           // O
  [[0, 1, 0], [1, 1, 1], [0, 0, 0]],                          // T
  [[0, 1, 1], [1, 1, 0], [0, 0, 0]],                          // S
  [[1, 1, 0], [0, 1, 1], [0, 0, 0]],                          // Z
  [[1, 0, 0], [1, 1, 1], [0, 0, 0]],                          // J
  [[0, 0, 1], [1, 1, 1], [0, 0, 0]],                          // L
];
const LOCK = 0.5, CLEAR_T = 0.36, WIN_LINES = 40, STAR_LINES = [8, 20, 40];
const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1], [0, -2]];

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (h, to, a) => { const k = to === 'w' ? 255 : 0; return `rgb(${rgb(h).map(v => Math.round(v + (k - v) * a)).join(',')})`; };
const rnd = (a, b) => a + Math.random() * (b - a);
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const rotCW = m => { const n = m.length; return m.map((row, r) => row.map((_, c) => m[n - 1 - c][r])); };
const copy = m => m.map(r => r.slice());

function rr(q, x, y, w, h, r) {
  q.beginPath(); q.moveTo(x + r, y); q.arcTo(x + w, y, x + w, y + h, r); q.arcTo(x + w, y + h, x, y + h, r);
  q.arcTo(x, y + h, x, y, r); q.arcTo(x, y, x + w, y, r); q.closePath();
}
function star4(q, x, y, r) {
  q.beginPath(); q.moveTo(x, y - r); q.quadraticCurveTo(x, y, x + r, y); q.quadraticCurveTo(x, y, x, y + r);
  q.quadraticCurveTo(x, y, x - r, y); q.quadraticCurveTo(x, y, x, y - r); q.fill();
}

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none'; canvas.style.userSelect = 'none';

    // ---------- Sprites ----------
    const sprites = new Map();
    function sprite(ci, s) {
      const key = ci * 1000 + s; let cv = sprites.get(key); if (cv) return cv;
      cv = document.createElement('canvas'); cv.width = cv.height = s * 2;
      const q = cv.getContext('2d'); q.scale(2, 2);
      const col = PAL[ci], p = s * 0.04, w = s - 2 * p, r = s * 0.2;
      rr(q, p, p, w, w, r);
      const gr = q.createLinearGradient(0, 0, s, s);
      gr.addColorStop(0, mix(col, 'w', 0.6)); gr.addColorStop(0.45, col); gr.addColorStop(1, mix(col, 'k', 0.32));
      q.fillStyle = gr; q.fill();
      q.save(); rr(q, p, p, w, w, r); q.clip();
      q.fillStyle = 'rgba(255,255,255,.15)'; rr(q, p + s * 0.14, p + s * 0.14, w - s * 0.28, w - s * 0.28, r * 0.6); q.fill();
      q.fillStyle = 'rgba(255,255,255,.3)'; q.beginPath();
      q.moveTo(p + w * 0.1, p + w * 0.75); q.lineTo(p + w * 0.75, p + w * 0.1); q.lineTo(p + w * 0.9, p + w * 0.25); q.lineTo(p + w * 0.25, p + w * 0.9); q.fill();
      q.strokeStyle = 'rgba(255,255,255,.75)'; q.lineWidth = Math.max(1, s * 0.06); q.lineCap = 'round';
      q.beginPath(); q.moveTo(p + r, p + s * 0.07); q.lineTo(p + w - r, p + s * 0.07); q.moveTo(p + s * 0.07, p + r); q.lineTo(p + s * 0.07, p + w - r); q.stroke();
      q.strokeStyle = 'rgba(0,0,40,.25)';
      q.beginPath(); q.moveTo(p + r, p + w - s * 0.07); q.lineTo(p + w - r, p + w - s * 0.07); q.moveTo(p + w - s * 0.07, p + r); q.lineTo(p + w - s * 0.07, p + w - r); q.stroke();
      q.restore();
      q.strokeStyle = 'rgba(255,255,255,.35)'; q.lineWidth = 0.7; rr(q, p, p, w, w, r); q.stroke();
      sprites.set(key, cv); return cv;
    }
    function drawGift(q, x, y, s, t) {
      const k = 1 + Math.sin(t * 8) * 0.04, cx = x + s / 2, cy = y + s / 2, w = (s - 2) * k;
      q.save(); q.shadowColor = '#ffd166'; q.shadowBlur = 8;
      const gr = q.createLinearGradient(x, y, x + s, y + s); gr.addColorStop(0, '#ff7d97'); gr.addColorStop(1, '#c42a52');
      rr(q, cx - w / 2, cy - w / 2, w, w, s * 0.18); q.fillStyle = gr; q.fill(); q.restore();
      q.fillStyle = '#ffd166'; q.fillRect(cx - s * 0.09, cy - w / 2, s * 0.18, w); q.fillRect(cx - w / 2, cy - s * 0.09, w, s * 0.18);
      q.beginPath(); q.ellipse(cx - s * 0.14, cy - s * 0.12, s * 0.14, s * 0.09, -0.5, 0, 6.3); q.ellipse(cx + s * 0.14, cy - s * 0.12, s * 0.14, s * 0.09, 0.5, 0, 6.3); q.fill();
      q.fillStyle = '#fff3c4'; q.beginPath(); q.arc(cx, cy - s * 0.1, s * 0.06, 0, 6.3); q.fill();
      q.strokeStyle = 'rgba(255,255,255,.6)'; q.lineWidth = 1; rr(q, cx - w / 2, cy - w / 2, w, w, s * 0.18); q.stroke();
    }
    function drawFire(q, x, y, s, t) {
      const cx = x + s / 2, cy = y + s / 2, w = s - 2;
      q.save(); q.shadowColor = '#ff7b00'; q.shadowBlur = 10;
      const gr = q.createLinearGradient(x, y, x, y + s); gr.addColorStop(0, '#7a1d2b'); gr.addColorStop(1, '#ef2b2b');
      rr(q, cx - w / 2, cy - w / 2, w, w, s * 0.18); q.fillStyle = gr; q.fill(); q.restore();
      const flame = (sc, col) => {
        const wob = Math.sin(t * 13) * s * 0.06 * sc, h = s * 0.62 * sc, b = s * 0.26 * sc, by = cy + s * 0.3;
        q.fillStyle = col; q.beginPath(); q.moveTo(cx, by);
        q.bezierCurveTo(cx - b * 1.4, by - h * 0.2, cx - b * 0.5, by - h * 0.55, cx + wob, by - h);
        q.bezierCurveTo(cx + b * 0.5, by - h * 0.5, cx + b * 1.4, by - h * 0.2, cx, by); q.fill();
      };
      flame(1, '#ffb703'); flame(0.55, '#fff3c4');
      q.strokeStyle = 'rgba(255,255,255,.4)'; q.lineWidth = 1; rr(q, cx - w / 2, cy - w / 2, w, w, s * 0.18); q.stroke();
    }
    function drawCell(q, v, ci, x, y, s, t) {
      if (v === 2) drawGift(q, x, y, s, t); else if (v === 3) drawFire(q, x, y, s, t);
      else q.drawImage(sprite(ci, s), x, y, s, s);
    }

    // ---------- Zustand ----------
    const emptyRow = () => new Array(COLS).fill(null);
    let grid, cur, queue, bag, holdP, holdUsed, state, stateT, clearSet, parts, floaters, glints, flakes;
    let score, lines, level, combo, pieceCount, sinceSpecial, gravT, lockT, lockResets, softBlock, winning;
    let shakeT, shakeA, flashA, time = 0, dasDir = 0, dasT = 0, dasRep = 0, ended = false, maxLevel;
    grid = Array.from({ length: ROWS }, emptyRow);
    queue = []; bag = []; holdP = null; holdUsed = false; state = 'play'; stateT = 0; clearSet = new Set();
    parts = []; floaters = []; glints = []; score = 0; lines = 0; level = 1; combo = 0; pieceCount = 0; sinceSpecial = 0;
    gravT = -0.4; lockT = 0; lockResets = 0; softBlock = false; winning = false; shakeT = 0; shakeA = 0; flashA = 0; maxLevel = 1;
    flakes = Array.from({ length: 30 }, () => ({ x: rnd(0, W), y: rnd(0, H), v: rnd(8, 26), r: rnd(0.8, 2), ph: rnd(0, 6) }));

    const noise = (...a) => ctx.audio.noise && ctx.audio.noise(...a);
    const tone = (...a) => ctx.audio.tone(...a);
    const gravity = () => Math.max(0.07, 1.0 * Math.pow(0.8, level - 1));
    const hud = () => ctx.hud.set({ Punkte: score, Reihen: lines });
    const topRow = () => { for (let y = 0; y < ROWS; y++) if (grid[y].some(Boolean)) return y; return ROWS; };

    // ---------- Steine ----------
    function newPiece() {
      if (!bag.length) { bag = [0, 1, 2, 3, 4, 5, 6]; for (let i = 6; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
      const ci = bag.pop(), base = copy(SHAPES[ci]);
      pieceCount++; sinceSpecial++;
      const danger = topRow() <= 6;
      if (pieceCount >= 6 && sinceSpecial >= (danger ? 3 : 5)) {
        const p = (danger ? 0.35 : 0.16) + (sinceSpecial - 5) * 0.06;
        if (Math.random() < p) {
          const cells = []; base.forEach((row, r) => row.forEach((v, c) => { if (v) cells.push([r, c]); }));
          const [r, c] = cells[Math.floor(Math.random() * cells.length)];
          base[r][c] = Math.random() < 0.5 ? 2 : 3; sinceSpecial = 0;
        }
      }
      return { ci, base };
    }
    const fillQueue = () => { while (queue.length < 4) queue.push(newPiece()); };
    function collides(m, x, y) {
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++) {
        if (!m[r][c]) continue;
        const gx = x + c, gy = y + r;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
        if (gy >= 0 && grid[gy][gx]) return true;
      }
      return false;
    }
    function place(p) {
      const m = copy(p.base), n = m.length;
      let minRow = 0; while (minRow < n && !m[minRow].some(Boolean)) minRow++;
      cur = { ci: p.ci, base: p.base, m, x: Math.floor((COLS - n) / 2), y: -minRow, dx: 0, dy: 0 };
      cur.dx = cur.x; cur.dy = cur.y; gravT = Math.min(gravT, 0); lockT = 0; lockResets = 0;
      if (collides(m, cur.x, cur.y)) { die(); return false; }
      return true;
    }
    function spawnNext() { fillQueue(); holdUsed = false; place(queue.shift()); fillQueue(); }
    const dropY = () => { let y = cur.y; while (!collides(cur.m, cur.x, y + 1)) y++; return y; };

    function move(dx) {
      if (state !== 'play' || !cur) return false;
      if (collides(cur.m, cur.x + dx, cur.y)) return false;
      const grounded = collides(cur.m, cur.x, cur.y + 1);
      cur.x += dx; if (grounded && lockResets < 12) { lockT = 0; lockResets++; }
      tone(380 + (cur.x % 5) * 18, 0.03, 'triangle', 0.05); return true;
    }
    function rotate() {
      if (state !== 'play' || !cur) return;
      const nm = rotCW(cur.m), grounded = collides(cur.m, cur.x, cur.y + 1);
      for (const [kx, ky] of KICKS) {
        if (collides(nm, cur.x + kx, cur.y + ky)) continue;
        cur.m = nm; cur.x += kx; cur.y += ky;
        if (grounded && lockResets < 12) { lockT = 0; lockResets++; }
        tone(520, 0.05, 'triangle', 0.09, 760); return;
      }
      tone(150, 0.04, 'square', 0.04);
    }
    function holdSwap() {
      if (state !== 'play' || !cur || holdUsed) return;
      const old = holdP; holdP = { ci: cur.ci, base: cur.base };
      ctx.audio.sfx('swoosh'); sparkle(BX + BW / 2, BY + 30, '#8ecae6', 8);
      if (old) place(old); else { fillQueue(); place(queue.shift()); fillQueue(); }
      holdUsed = true;
    }
    function hardDrop() {
      if (state !== 'play' || !cur) return;
      const y = dropY(), d = y - cur.y;
      for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m.length; c++) if (cur.m[r][c]) {
        parts.push({ k: 'streak', x: BX + (cur.x + c) * C + 3, y: BY + (cur.y + r) * C, h: Math.max(0, d) * C, w: C - 6, life: 0.2, max: 0.2, col: PAL[cur.ci] });
      }
      score += 2 * d; cur.y = y; cur.dy = y; hud();
      ctx.audio.sfx('swoosh'); lockPiece(true);
    }

    // ---------- Effekte ----------
    function shards(x, y, col, n, power = 1) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, 6.3), v = rnd(60, 260) * power;
        parts.push({ k: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90 * power, g: 700, rot: rnd(0, 6), vr: rnd(-12, 12), s: rnd(3, 8.5), life: rnd(0.5, 1.0), max: 1, col: Math.random() < 0.3 ? '#ffffff' : col });
      }
    }
    function sparkle(x, y, col, n) {
      for (let i = 0; i < n; i++) { const a = rnd(0, 6.3), v = rnd(20, 90); parts.push({ k: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: 120, s: rnd(1, 2.5), life: rnd(0.3, 0.6), max: 0.6, col }); }
    }
    function fireBurst(x, y) {
      for (let i = 0; i < 9; i++) {
        const a = rnd(0, 6.3), v = rnd(30, 170);
        parts.push({ k: 'fire', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: -80, s: rnd(5, 11), life: rnd(0.35, 0.7), max: 0.7, col: Math.random() < 0.5 ? '#ffb703' : '#ff5d2a' });
      }
      for (let i = 0; i < 3; i++) parts.push({ k: 'smoke', x: x + rnd(-6, 6), y, vx: rnd(-14, 14), vy: rnd(-60, -30), g: 0, s: rnd(6, 10), life: rnd(0.6, 1.0), max: 1, col: '#cfd8ff' });
    }
    const floater = (text, x, y, col = '#ffd166', size = 22) => floaters.push({ text, x, y, life: 1.3, max: 1.3, col, size });
    const bump = (a, t = 0.25) => { shakeA = Math.max(shakeA, a); shakeT = Math.max(shakeT, t); };
    function chime(n, cb) {
      const base = 72 + Math.min(8, cb - 1) * 2, sc = [0, 4, 7, 12, 16, 19, 24];
      for (let i = 0; i < n + 2; i++) tone(midi(base + sc[Math.min(i, 6)]), 0.16, 'triangle', 0.2, null, i * 0.065);
      noise(0.22, 0.28); for (let i = 0; i < 4; i++) tone(rnd(2200, 3400), 0.07, 'sine', 0.07, rnd(3500, 4500), i * 0.04);
    }

    // ---------- Landen ----------
    function lockPiece(hard) {
      const cells = []; let giftY = null, fireAt = null, above = false;
      for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m.length; c++) {
        const v = cur.m[r][c]; if (!v) continue;
        const x = cur.x + c, y = cur.y + r;
        if (y < 0) { above = true; continue; }
        cells.push({ x, y, v });
      }
      if (above) { for (const { x, y } of cells) grid[y][x] = { c: cur.ci }; return die(); }
      for (const { x, y, v } of cells) {
        grid[y][x] = { c: cur.ci };
        if (v === 2) giftY = y; if (v === 3) fireAt = { x, y };
        if (y + 1 >= ROWS || grid[y + 1][x] && !cells.some(o => o.x === x && o.y === y + 1)) sparkle(BX + x * C + C / 2, BY + y * C + C, '#e8f6ff', hard ? 7 : 3);
        parts.push({ k: 'flash', x: BX + x * C, y: BY + y * C, life: 0.16, max: 0.16 });
      }
      softBlock = ctx.input.down('down'); cur = null;
      tone(hard ? 120 : 160, 0.09, 'sine', 0.22, 60); if (hard) { noise(0.08, 0.12); bump(2.5, 0.12); }
      let melted = 0, nclear;
      if (fireAt) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const gx = fireAt.x + dx, gy = fireAt.y + dy;
          if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS || !grid[gy][gx]) continue;
          fireBurst(BX + gx * C + C / 2, BY + gy * C + C / 2); shards(BX + gx * C + C / 2, BY + gy * C + C / 2, '#bfe9ff', 3, 0.6);
          grid[gy][gx] = null; melted++;
        }
        const fx = BX + fireAt.x * C + C / 2, fy = BY + fireAt.y * C + C / 2;
        parts.push({ k: 'ring', x: fx, y: fy, life: 0.45, max: 0.45, rmax: C * 2.2, col: '#ffb703' });
        flashA = 0.35; bump(7, 0.35); ctx.fx.shake(); ctx.audio.sfx('boom');
        for (let i = 0; i < 5; i++) tone(rnd(300, 900), 0.2, 'sawtooth', 0.06, rnd(80, 200), i * 0.03);
        score += melted * 15 * level; floater('Schmelz!', fx, Math.max(60, fy - 20), '#ffb703', 24);
      }
      const rows = new Set();
      for (let y = 0; y < ROWS; y++) if (grid[y].every(Boolean)) rows.add(y);
      if (giftY !== null) { rows.add(giftY); floater('Geschenk!', BX + BW / 2, BY + giftY * C - 6, '#ff7d97', 24); ctx.audio.sfx('power'); }
      nclear = rows.size;
      if (nclear) {
        clearSet = rows; state = 'clear'; stateT = CLEAR_T; combo++;
        for (const y of rows) {
          for (let x = 0; x < COLS; x++) {
            const cell = grid[y][x], cx = BX + x * C + C / 2, cy = BY + y * C + C / 2;
            shards(cx, cy, cell ? PAL[cell.c] : '#cfeaff', cell ? 4 : 2, 1 + nclear * 0.12);
            if (giftY === y) for (let i = 0; i < 2; i++) parts.push({ k: 'rect', x: cx, y: cy, vx: rnd(-160, 160), vy: rnd(-260, -60), g: 500, rot: rnd(0, 6), vr: rnd(-10, 10), s: rnd(4, 8), life: rnd(0.7, 1.2), max: 1.2, col: Math.random() < 0.5 ? '#ffd166' : '#ef476f' });
          }
        }
        const base = [0, 100, 300, 500, 800][Math.min(nclear, 4)] + Math.max(0, nclear - 4) * 300;
        let pts = base * level; if (combo >= 2) pts += 50 * (combo - 1) * level;
        score += pts; lines += nclear;
        const names = ['', 'Klirr!', 'Doppel!', 'Dreifach!', 'EIS-BRUCH!!'];
        const cyy = BY + [...rows][0] * C;
        floater(names[Math.min(nclear, 4)] + (nclear > 4 ? '!' : ''), BX + BW / 2, Math.max(70, cyy - 14), '#ffffff', nclear >= 4 ? 30 : 24);
        floater('+' + pts, BX + BW / 2, Math.max(96, cyy + 14), '#ffd166', 18);
        if (combo >= 2) floater('Kombo x' + combo + '!', BX + BW / 2, Math.max(122, cyy + 40), '#c77dff', 18);
        chime(nclear, combo); flashA = Math.max(flashA, 0.12 + nclear * 0.06);
        bump(3 + nclear * 2.5, 0.2 + nclear * 0.05); if (nclear >= 3) ctx.fx.shake(); if (nclear >= 4) { ctx.audio.sfx('boom'); ctx.audio.sfx('coin'); }
        const nl = 1 + Math.floor(lines / 8);
        if (nl > level) { level = nl; maxLevel = Math.max(maxLevel, level); ctx.save('level', Math.max(ctx.load('level', 1), level)); ctx.timeout(() => { ctx.audio.sfx('level'); ctx.toast('Level ' + level + '! Es wird schneller ❄️'); floater('LEVEL ' + level, BX + BW / 2, BY + BH / 2, '#8ecae6', 30); }, 350); }
        if (lines >= WIN_LINES) winning = true;
      } else { combo = 0; state = 'wait'; stateT = melted ? 0.18 : 0.08; }
      hud();
    }
    function finishClear() {
      if (state === 'clear') {
        grid = grid.filter((_, y) => !clearSet.has(y)); while (grid.length < ROWS) grid.unshift(emptyRow()); clearSet = new Set();
        if (grid.every(r => r.every(c => !c))) { score += 500 * level; floater('Eisfrei! +' + 500 * level, BX + BW / 2, BY + BH / 2, '#ffd166', 26); ctx.audio.sfx('win'); ctx.fx.confetti(40); hud(); }
      }
      if (winning) return win();
      state = 'play'; spawnNext();
    }
    function result() {
      const stars = lines >= STAR_LINES[2] ? 3 : lines >= STAR_LINES[1] ? 2 : lines >= STAR_LINES[0] ? 1 : 0;
      let text;
      if (stars === 3) text = `Eisblock-Meister! ${lines} Reihen zerschmettert.`;
      else if (stars === 2) text = `${lines} Reihen. Noch ${STAR_LINES[2] - lines} Reihen bis zum dritten Stern (${STAR_LINES[2]})!`;
      else if (stars === 1) text = `${lines} Reihen. Noch ${STAR_LINES[1] - lines} Reihen bis zum zweiten Stern (${STAR_LINES[1]})!`;
      else text = `${lines} Reihen. Ab ${STAR_LINES[0]} Reihen gibt es den ersten Stern. Tipp: 🎁 und 🔥 helfen dir!`;
      return { won: stars >= 2, stars, score, text };
    }
    function win() {
      state = 'over'; ended = true; ctx.audio.sfx('level'); ctx.fx.confetti(120); floater(WIN_LINES + ' Reihen!', BX + BW / 2, BY + BH / 2, '#ffd166', 32);
      ctx.timeout(() => ctx.finish(result()), 1100);
    }
    function die() {
      if (state === 'dead' || state === 'over') return; state = 'dead'; stateT = 0; cur = null;
      ctx.audio.sfx('lose'); ctx.audio.sfx('boom'); ctx.fx.shake(); bump(8, 0.5);
      for (let i = 0; i < 40; i++) shards(rnd(BX, BX + BW), rnd(BY, BY + 150), '#bfe9ff', 1, 1.2);
      floater('Brrr! Eis-Stau!', BX + BW / 2, BY + BH / 2, '#8ecae6', 28);
      ctx.timeout(() => { ended = true; ctx.finish(result()); }, 1300);
    }

    // ---------- Eingabe ----------
    ctx.input.pad({ dpad: true, a: 'Fallen', b: 'Drehen' });
    ctx.input.onPress(n => {
      if (n === 'left' || n === 'right') { dasDir = n === 'left' ? -1 : 1; dasT = 0; dasRep = 0; move(dasDir); }
      else if (n === 'up' || n === 'b') rotate();
      else if (n === 'a') hardDrop();
      else if (n === 'down' && state === 'play' && cur && !collides(cur.m, cur.x, cur.y + 1)) { cur.y++; score++; gravT = 0; hud(); }
    });
    ctx.input.onRelease(n => {
      if (n === 'left' || n === 'right') { dasDir = ctx.input.down('right') ? 1 : ctx.input.down('left') ? -1 : 0; dasT = 0; dasRep = 0; }
      if (n === 'down') softBlock = false;
    });
    ctx.on(window, 'keydown', e => { if ((e.key === 'c' || e.key === 'C' || e.key === 'h' || e.key === 'H') && !e.repeat && !ctx.paused) holdSwap(); });

    const HOLD_BOX = { x: PX, y: 172, w: PW, h: 66 };
    let gest = null;
    ctx.on(canvas, 'pointerdown', e => {
      if (ctx.paused) return; e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      const p = pos(e);
      if (p.x >= HOLD_BOX.x && p.x <= HOLD_BOX.x + HOLD_BOX.w && p.y >= HOLD_BOX.y - 14 && p.y <= HOLD_BOX.y + HOLD_BOX.h) { holdSwap(); gest = null; return; }
      gest = { id: e.pointerId, sx: p.x, sy: p.y, ax: p.x, t0: performance.now(), moved: false };
    });
    ctx.on(canvas, 'pointermove', e => {
      if (!gest || e.pointerId !== gest.id || ctx.paused) return;
      const p = pos(e), step = C * 0.85;
      while (p.x - gest.ax >= step) { gest.ax += step; gest.moved = true; move(1); }
      while (gest.ax - p.x >= step) { gest.ax -= step; gest.moved = true; move(-1); }
    });
    const endGest = e => {
      if (!gest || e.pointerId !== gest.id) return;
      const gs = gest; gest = null; if (e.type === 'pointercancel' || ctx.paused) return;
      const p = pos(e), dx = p.x - gs.sx, dy = p.y - gs.sy, dt = performance.now() - gs.t0;
      if (!gs.moved && dy > 50 && dy > Math.abs(dx) * 1.5) hardDrop();
      else if (!gs.moved && Math.hypot(dx, dy) < 14 && dt < 400) rotate();
    };
    ctx.on(canvas, 'pointerup', endGest); ctx.on(canvas, 'pointercancel', endGest);

    // ---------- Update ----------
    function update(dt) {
      for (const f of flakes) { f.y += f.v * dt; f.x += Math.sin(time * 0.8 + f.ph) * 6 * dt; if (f.y > H + 3) { f.y = -3; f.x = rnd(0, W); } }
      for (const p of parts) {
        p.life -= dt; if (p.vx !== undefined) { p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        if (p.vr) p.rot += p.vr * dt;
      }
      parts = parts.filter(p => p.life > 0); if (parts.length > 500) parts.splice(0, parts.length - 500);
      for (const f of floaters) { f.life -= dt; f.y -= 22 * dt; } floaters = floaters.filter(f => f.life > 0);
      for (const s of glints) s.life -= dt; glints = glints.filter(s => s.life > 0);
      if (Math.random() < dt * 7) { const x = Math.floor(rnd(0, COLS)), y = Math.floor(rnd(0, ROWS)); if (grid[y][x]) glints.push({ x: BX + x * C + rnd(5, C - 5), y: BY + y * C + rnd(5, C - 5), life: 0.5, max: 0.5 }); }
      shakeT = Math.max(0, shakeT - dt); flashA = Math.max(0, flashA - dt * 1.6);
      if (state === 'play' && cur) {
        if (dasDir) { dasT += dt; if (dasT > 0.16) { dasRep += dt; while (dasRep >= 0.05) { dasRep -= 0.05; move(dasDir); } } }
        const soft = ctx.input.down('down') && !softBlock, grounded = collides(cur.m, cur.x, cur.y + 1);
        if (!grounded) {
          lockT = 0; gravT += dt; const iv = soft ? Math.min(0.045, gravity()) : gravity();
          while (gravT >= iv) { gravT -= iv; if (collides(cur.m, cur.x, cur.y + 1)) break; cur.y++; if (soft) { score++; hud(); } }
        } else { gravT = 0; lockT += dt * (soft ? 4 : 1); if (lockT >= LOCK) lockPiece(false); }
        if (cur) { const k = Math.min(1, dt * 28); cur.dx += (cur.x - cur.dx) * k; cur.dy += (cur.y - cur.dy) * k; }
      } else if (state === 'clear' || state === 'wait') { stateT -= dt; if (stateT <= 0) finishClear(); }
      else if (state === 'dead') stateT += dt;
    }

    // ---------- Zeichnen ----------
    function drawMini(p, bx, by, bw, bh, s, alpha = 1) {
      const m = p.base; let x0 = 9, x1 = -1, y0 = 9, y1 = -1;
      m.forEach((row, r) => row.forEach((v, c) => { if (v) { x0 = Math.min(x0, c); x1 = Math.max(x1, c); y0 = Math.min(y0, r); y1 = Math.max(y1, r); } }));
      const ox = bx + (bw - (x1 - x0 + 1) * s) / 2, oy = by + (bh - (y1 - y0 + 1) * s) / 2;
      g.globalAlpha = alpha;
      m.forEach((row, r) => row.forEach((v, c) => { if (v) drawCell(g, v, p.ci, ox + (c - x0) * s, oy + (r - y0) * s, s, time); }));
      g.globalAlpha = 1;
    }
    function box(x, y, w, h, label) {
      g.fillStyle = 'rgba(142,202,230,.10)'; rr(g, x, y, w, h, 10); g.fill();
      g.strokeStyle = 'rgba(142,202,230,.4)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#8ecae6'; g.font = 'bold 10px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText(label, x + w / 2, y - 4);
    }
    function draw() {
      g.setTransform(2, 0, 0, 2, 0, 0);
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1437'); bg.addColorStop(1, '#13245e');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.55)'; for (const f of flakes) { g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.3); g.fill(); }

      // Brett
      const danger = state !== 'dead' && topRow() <= 4, sx = shakeT > 0 ? rnd(-1, 1) * shakeA * Math.min(1, shakeT * 4) : 0, sy = shakeT > 0 ? rnd(-1, 1) * shakeA * Math.min(1, shakeT * 4) : 0;
      g.save(); g.translate(sx, sy);
      g.save(); g.shadowColor = danger ? `rgba(239,71,111,${0.5 + Math.sin(time * 9) * 0.4})` : '#8ecae6'; g.shadowBlur = danger ? 18 : 12;
      rr(g, BX - 3, BY - 3, BW + 6, BH + 6, 10); g.fillStyle = '#0a1230'; g.fill(); g.restore();
      const bgr = g.createLinearGradient(0, BY, 0, BY + BH); bgr.addColorStop(0, '#0e1c4f'); bgr.addColorStop(1, '#152a6b');
      g.fillStyle = bgr; g.fillRect(BX, BY, BW, BH);
      g.strokeStyle = 'rgba(142,202,230,.07)'; g.lineWidth = 1; g.beginPath();
      for (let i = 1; i < COLS; i++) { g.moveTo(BX + i * C, BY); g.lineTo(BX + i * C, BY + BH); }
      for (let i = 1; i < ROWS; i++) { g.moveTo(BX, BY + i * C); g.lineTo(BX + BW, BY + i * C); }
      g.stroke();
      g.save(); g.beginPath(); g.rect(BX, BY, BW, BH); g.clip();
      // feste Blöcke
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const cell = grid[y][x]; if (!cell) continue;
        const px = BX + x * C, py = BY + y * C;
        if (clearSet.has(y) && state === 'clear') {
          const p = 1 - stateT / CLEAR_T, k = 1 - p * 0.35;
          g.globalAlpha = Math.max(0, 1 - p * 1.1); g.drawImage(sprite(cell.c, C), px + C * (1 - k) / 2, py + C * (1 - k) / 2, C * k, C * k);
          g.fillStyle = `rgba(255,255,255,${Math.max(0, 0.95 - p * 1.3)})`; g.fillRect(px, py, C, C); g.globalAlpha = 1;
        } else {
          g.drawImage(sprite(cell.c, C), px, py, C, C);
          if (state === 'dead') { g.fillStyle = `rgba(190,230,255,${Math.min(0.55, stateT * 0.9)})`; g.fillRect(px, py, C, C); }
        }
      }
      if (state === 'clear') for (const y of clearSet) {
        const p = 1 - stateT / CLEAR_T, py = BY + y * C;
        const beam = g.createLinearGradient(BX, 0, BX + BW, 0); beam.addColorStop(0, 'rgba(255,255,255,0)'); beam.addColorStop(0.5, `rgba(255,255,255,${Math.sin(p * 3.14) * 0.9})`); beam.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = beam; g.fillRect(BX, py - 3, BW, C + 6);
        g.strokeStyle = `rgba(255,255,255,${Math.min(1, p * 2.2) * (1 - p * 0.6)})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(BX, py + C / 2);
        for (let i = 1; i <= 14; i++) g.lineTo(BX + (BW * i / 14) * Math.min(1, p * 3), py + C / 2 + (i % 2 ? -1 : 1) * (4 + (i * 7 % 5)));
        g.stroke();
      }
      // Geister-Stein + aktueller Stein
      if (cur && state === 'play') {
        const gy = dropY();
        for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m.length; c++) if (cur.m[r][c]) {
          const px = BX + (cur.x + c) * C, py = BY + (gy + r) * C;
          g.fillStyle = PAL[cur.ci] + '30'; rr(g, px + 2, py + 2, C - 4, C - 4, 5); g.fill();
          g.strokeStyle = PAL[cur.ci]; g.globalAlpha = 0.65; g.lineWidth = 1.6; g.setLineDash([4, 3]); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
        }
        for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m.length; c++) if (cur.m[r][c]) {
          const px = BX + (cur.dx + c) * C, py = BY + (cur.dy + r) * C;
          drawCell(g, cur.m[r][c], cur.ci, px, py, C, time);
          if (collides(cur.m, cur.x, cur.y + 1) && lockT > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(0.4, lockT / LOCK * 0.45)})`; g.fillRect(px + 2, py + 2, C - 4, C - 4); }
        }
      }
      for (const s of glints) { g.fillStyle = `rgba(255,255,255,${Math.sin(s.life / s.max * 3.14)})`; star4(g, s.x, s.y, 5 * Math.sin(s.life / s.max * 3.14) + 1); }
      for (const p of parts) if (p.k === 'flash') { g.fillStyle = `rgba(255,255,255,${p.life / p.max * 0.8})`; g.fillRect(p.x, p.y, C, C); } else if (p.k === 'streak') {
        const a = p.life / p.max; const sg = g.createLinearGradient(0, p.y, 0, p.y + p.h); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(1, p.col);
        g.globalAlpha = a * 0.5; g.fillStyle = sg; g.fillRect(p.x, p.y, p.w, p.h); g.globalAlpha = 1;
      }
      g.restore();
      // Partikel (auch über den Rand hinaus)
      for (const p of parts) {
        const a = Math.max(0, Math.min(1, p.life / p.max));
        if (p.k === 'shard') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, a * 1.6); g.fillStyle = p.col; g.beginPath(); g.moveTo(-p.s, p.s * 0.6); g.lineTo(p.s * 0.2, -p.s); g.lineTo(p.s, p.s * 0.7); g.fill(); g.restore(); }
        else if (p.k === 'rect') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, a * 1.6); g.fillStyle = p.col; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
        else if (p.k === 'dot') { g.globalAlpha = a; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 6.3); g.fill(); }
        else if (p.k === 'fire') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.s * a + 1, 0, 6.3); g.fill(); g.globalCompositeOperation = 'source-over'; }
        else if (p.k === 'smoke') { g.globalAlpha = a * 0.35; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.s * (2 - a), 0, 6.3); g.fill(); }
        else if (p.k === 'ring') { const k = 1 - a; g.globalAlpha = a; g.strokeStyle = p.col; g.lineWidth = 4 * a + 1; g.beginPath(); g.arc(p.x, p.y, p.rmax * k, 0, 6.3); g.stroke(); }
        g.globalAlpha = 1;
      }
      g.restore();

      // Seitenleiste
      box(PX, 30, PW, 66, 'NÄCHSTER'); if (queue[0]) drawMini(queue[0], PX, 30, PW, 66, 14);
      box(PX, 116, PW, 36, 'DANACH'); if (queue[1]) drawMini(queue[1], PX, 116, PW, 36, 8, 0.85);
      box(HOLD_BOX.x, HOLD_BOX.y, HOLD_BOX.w, HOLD_BOX.h, 'HALTEN (C)'); if (holdP) drawMini(holdP, HOLD_BOX.x, HOLD_BOX.y, HOLD_BOX.w, HOLD_BOX.h, 14, holdUsed ? 0.4 : 1);
      else { g.fillStyle = 'rgba(142,202,230,.5)'; g.font = '10px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('tippen', PX + PW / 2, HOLD_BOX.y + 38); }
      g.fillStyle = '#8ecae6'; g.font = 'bold 10px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('LEVEL', PX + PW / 2, 262);
      g.fillStyle = '#ffd166'; g.font = 'bold 28px system-ui, sans-serif'; g.fillText(level, PX + PW / 2, 292);
      g.fillStyle = 'rgba(142,202,230,.25)'; rr(g, PX + 6, 300, PW - 12, 7, 3.5); g.fill();
      const prog = (lines % 8) / 8; if (prog > 0) { g.fillStyle = '#06d6a0'; rr(g, PX + 6, 300, Math.max(7, (PW - 12) * prog), 7, 3.5); g.fill(); }
      if (combo >= 2) { const k = 1 + Math.sin(time * 10) * 0.06; g.save(); g.translate(PX + PW / 2, 336); g.scale(k, k); g.fillStyle = '#c77dff'; g.font = 'bold 14px system-ui, sans-serif'; g.fillText('KOMBO x' + combo, 0, 0); g.restore(); }
      g.textAlign = 'left';
      const leg = (fn, y, t1, t2) => { fn(g, PX, y, 20, time); g.fillStyle = '#e8f6ff'; g.font = 'bold 10px system-ui, sans-serif'; g.fillText(t1, PX + 24, y + 9); g.fillStyle = '#8ecae6'; g.font = '9px system-ui, sans-serif'; g.fillText(t2, PX + 24, y + 20); };
      leg(drawGift, 372, 'Geschenk', 'Reihe weg'); leg(drawFire, 410, 'Feuer', 'schmilzt 3×3');
      g.fillStyle = 'rgba(142,202,230,.6)'; g.textAlign = 'center'; g.fillText('Ziel: 40 Reihen', PX + PW / 2, 468);

      for (const f of floaters) {
        const a = Math.min(1, f.life / f.max * 1.8), k = 1 + Math.max(0, f.life / f.max - 0.8) * 2;
        g.save(); g.translate(f.x, f.y); g.scale(k, k); g.globalAlpha = a; g.textAlign = 'center'; g.font = `bold ${f.size}px system-ui, sans-serif`;
        g.lineWidth = 4; g.strokeStyle = 'rgba(5,10,40,.85)'; g.lineJoin = 'round'; g.strokeText(f.text, 0, 0); g.fillStyle = f.col; g.fillText(f.text, 0, 0); g.restore();
      }
      if (flashA > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(0.5, flashA)})`; g.fillRect(0, 0, W, H); }
    }

    spawnNext(); hud();
    ctx.toast(ctx.input.isTouch ? 'Tippen = drehen · Ziehen = bewegen · Runter wischen = fallen' : '◀ ▶ bewegen · ▲ drehen · Leertaste = fallen · C = halten', 3200);
    ctx.loop(dt => { time += dt; update(dt); draw(); });
    return {
      destroy() {},
      _dbg: { get grid() { return grid; }, get cur() { return cur; }, get state() { return state; }, get lines() { return lines; }, setLines(n) { lines = n; }, get ended() { return ended; }, get level() { return level; } },
    };
  },
};
