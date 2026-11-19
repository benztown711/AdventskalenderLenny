// Türchen 12: Pixel-Geheimnis (Zahlen-Bilderrätsel / Nonogramm)
import { PICS, PAL, TUT, maskOf, cluesOf } from './bilder.js';

export const howto = {
  touch: 'Die Zahlen am Rand sagen, wie viele Kästchen in der Reihe am Stück gefüllt werden. Tippe oder ziehe zum Füllen, "Kreuz" markiert sichere Leer-Felder.',
  keys: 'Die Zahlen am Rand sagen, wie viele Kästchen in der Reihe am Stück gefüllt werden. Pfeiltasten bewegen, Leertaste füllt, X macht ein Kreuz.',
};
export const starsInfo = '★ 2 Bilder · ★★ 4 Bilder · ★★★ alle 6 Bilder';

const W = 360, H = 560, MAXH = 5;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const C = { bg: '#0b1437', cell: '#17235a', cell2: '#1c2a66', gold: '#ffd166', red: '#ef476f', green: '#06d6a0', ice: '#8ecae6', violet: '#c77dff', paper: '#e6eefb' };
const THRESH = [2, 4, 6];

const ease = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none';
    let gal = ctx.load('gal', {}); if (!gal || typeof gal !== 'object') gal = {};
    let tutSeen = !!ctx.load('tut', false);
    let screen = 'menu', time = 0, tool = 'fill', hits = [], sparks = [], flakes = [];
    let b = null, stroke = null, cur = { x: 0, y: 0 }, curShow = false, focus = null;
    let sel = 0, rev = null, finished = false, keyStroke = null, solving = false;
    for (let i = 0; i < 28; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 1.6, v: 8 + Math.random() * 18 });

    const solvedCount = () => Object.keys(gal).length;
    const starsFor = n => (n >= 6 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0);
    const nextUnsolved = from => { for (let k = 1; k <= 6; k++) { const i = (from + k) % 6; if (gal[i] === undefined) return i; } return -1; };
    const hud = () => ctx.hud.set({ Bilder: `${solvedCount()}/6` });
    hud();

    /* ---------- Hilfen zum Zeichnen ---------- */
    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
    const txt = (s, x, y, size, color = '#fff', align = 'center', weight = 700) => {
      g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(s, x, y);
    };
    const wrap = (s, maxW, size, weight = 600) => {
      g.font = `${weight} ${size}px ${FONT}`; const out = []; let line = '';
      for (const word of s.split(' ')) { const t = line ? line + ' ' + word : word; if (g.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t; }
      if (line) out.push(line); return out;
    };
    function button(x, y, w, h, label, fn, o = {}) {
      hits.push({ x, y, w, h, fn });
      const press = o.active ? 1 : 0;
      g.save();
      g.shadowColor = o.glow || 'transparent'; g.shadowBlur = o.glow ? 14 : 0;
      rr(x, y, w, h, 14); g.fillStyle = o.fill || (press ? C.gold : '#1d2b6e'); g.fill();
      g.restore();
      rr(x, y, w, h, 14); g.lineWidth = 2; g.strokeStyle = o.stroke || (press ? '#fff3c4' : '#34458f'); g.stroke();
      txt(label, x + w / 2, y + h / 2 + 1, o.size || 17, o.color || (press ? '#2a2000' : '#fff'));
    }
    const burst = (x, y, color, n = 8, sp = 70) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, v = sp * (0.4 + Math.random()); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.55, color }); } };
    function heart(x, y, s, color, a = 1) {
      g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s / 10, s / 10); g.fillStyle = color; g.beginPath();
      g.moveTo(0, 3.5); g.bezierCurveTo(-8, -2, -4, -8, 0, -3.5); g.bezierCurveTo(4, -8, 8, -2, 0, 3.5); g.fill(); g.restore();
    }
    function miniPic(art, x, y, size, opts = {}) {
      const n = art.length, s = size / n;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const c = art[j][i]; if (c === '.') continue;
        const d = opts.delay ? opts.delay(i, j) : 0;
        let k = 1; if (opts.t !== undefined) { k = Math.max(0, Math.min(1, (opts.t - d) / 0.45)); if (k <= 0) continue; k = ease(k); }
        const cx = x + (i + 0.5) * s, cy = y + (j + 0.5) * s, q = s * 0.5 * k;
        g.fillStyle = PAL[c] || C.gold; g.fillRect(cx - q - 0.3, cy - q - 0.3, q * 2 + 0.6, q * 2 + 0.6);
      }
    }

    /* ---------- Rätsel-Brett ---------- */
    function makeBoard(art, o = {}) {
      const m = maskOf(art), n = art.length, cl = cluesOf(art);
      const bd = { art, n, sol: m.flat(), rows: cl.rows, cols: cl.cols, st: new Array(n * n).fill(0), bad: new Array(n * n).fill(0), t0: new Array(n * n).fill(-9), flash: new Array(n * n).fill(-9),
        hearts: MAXH, lost: 0, rowDone: new Array(n).fill(false), colDone: new Array(n).fill(false), idx: o.idx, tut: !!o.tut, helped: false, shakeT: -9, lastDone: -9 };
      const fs = n <= 5 ? 17 : n <= 8 ? 15 : 13;
      g.font = `700 ${fs}px ${FONT}`;
      const numW = s => g.measureText(String(s)).width + 5;
      const clueW = Math.max(...bd.rows.map(r => r.reduce((a, v) => a + numW(v), 0))) + 8;
      const clueH = Math.max(...bd.cols.map(c => c.length)) * (fs + 3) + 8;
      const areaTop = o.tut ? 60 : 72, areaH = o.tut ? 250 : 400;
      const s = Math.max(20, Math.min(o.tut ? 64 : 56, Math.floor((W - 16 - clueW) / n), Math.floor((areaH - clueH) / n)));
      const totalH = clueH + n * s, totalW = clueW + n * s;
      bd.s = s; bd.fs = fs; bd.cw = clueW; bd.ch = clueH;
      bd.ox = Math.round((W - totalW) / 2 + clueW);
      bd.oy = Math.round(areaTop + (areaH - totalH) / 2 + clueH);
      b = bd;
      for (let y = 0; y < n; y++) updateLine('r', y, true);
      for (let x = 0; x < n; x++) updateLine('c', x, true);
      return bd;
    }
    function lineCells(kind, k) { const n = b.n; return Array.from({ length: n }, (_, i) => (kind === 'r' ? k * n + i : i * n + k)); }
    function updateLine(kind, k, silent) {
      const cells = lineCells(kind, k), arr = kind === 'r' ? b.rowDone : b.colDone;
      if (arr[k]) return;
      if (!cells.every(i => !b.sol[i] || b.st[i] === 1)) return;
      arr[k] = true;
      cells.forEach(i => { if (b.st[i] === 0) { b.st[i] = 2; b.t0[i] = silent ? -9 : time; } });
      if (!silent) {
        ctx.audio.sfx('coin');
        cells.forEach((i, j) => { const x = b.ox + (kind === 'r' ? j : k) * b.s + b.s / 2, y = b.oy + (kind === 'r' ? k : j) * b.s + b.s / 2; if (b.sol[i]) burst(x, y, C.gold, 2, 50); });
        b.lastDone = time;
      }
    }
    const cellAt = p => {
      if (!b) return null;
      const x = Math.floor((p.x - b.ox) / b.s), y = Math.floor((p.y - b.oy) / b.s);
      return x >= 0 && y >= 0 && x < b.n && y < b.n ? { x, y } : null;
    };
    function loseHeart() {
      if (b.tut) return;
      b.hearts--; b.lost++; b.shakeT = time; ctx.fx.shake();
      if (b.hearts <= 0) {
        stroke = null; keyStroke = null;
        b.helped = true;
        ctx.toast('Neue Herzen, weiter geht es!', 2200);
        ctx.timeout(() => { if (b && screen === 'play' && b.hearts <= 0) b.hearts = MAXH; }, 900);
      }
    }
    // setzt ein Feld; gibt false zurück, wenn ein Fehler passiert ist (Strich endet)
    function applyCell(x, y, st, first) {
      if (solving || b.hearts <= 0) return false;
      const i = y * b.n + x, c = b.st[i];
      if (st.mode === 'clear') { if (c === st.v) { b.st[i] = 0; b.bad[i] = 0; b.t0[i] = time; ctx.audio.tone(300, 0.04, 'triangle', 0.08); } return true; }
      if (c === st.v) return true;
      if (c !== 0 && !first) return true;
      if (c === 1 && b.sol[i] && !first) return true;
      const x0 = b.ox + x * b.s + b.s / 2, y0 = b.oy + y * b.s + b.s / 2;
      if (st.v === 1 && !b.sol[i]) {          // falsch gefüllt: rot, wird zum Kreuz
        b.st[i] = 2; b.bad[i] = 1; b.flash[i] = time; b.t0[i] = time;
        ctx.audio.sfx('bad'); burst(x0, y0, C.red, 10); loseHeart(); return false;
      }
      if (st.v === 2 && b.sol[i]) {           // falsch gekreuzt: wird zum richtigen Feld
        b.st[i] = 1; b.bad[i] = 0; b.flash[i] = time; b.t0[i] = time;
        ctx.audio.sfx('bad'); burst(x0, y0, C.red, 10); loseHeart(); updateAfter(x, y); return false;
      }
      b.st[i] = st.v; b.bad[i] = 0; b.t0[i] = time; st.n++;
      if (st.v === 1) { ctx.audio.tone(420 + Math.min(st.n, 12) * 38, 0.07, 'triangle', 0.16); burst(x0, y0, C.gold, 3, 45); }
      else ctx.audio.tone(200, 0.05, 'square', 0.07);
      updateAfter(x, y); return true;
    }
    function updateAfter(x, y) {
      updateLine('r', y); updateLine('c', x);
      if (!solving && b.sol.every((v, i) => !v || b.st[i] === 1)) complete();
    }
    function complete() {
      solving = true; stroke = null; keyStroke = null;
      for (let i = 0; i < b.st.length; i++) if (b.st[i] === 0) b.st[i] = 2;
      if (b.tut) { ctx.audio.sfx('level'); ctx.fx.confetti(); ctx.save('tut', true); tutSeen = true; return; }
      const helped = b.helped, hearts = helped ? 0 : b.hearts, idx = b.idx;
      const old = gal[idx]; gal[idx] = Math.max(old === undefined ? 0 : old, hearts); ctx.save('gal', gal); hud();
      const sm = summary(); if (sm.stars > 0) ctx.progress(sm);
      ctx.audio.sfx('level');
      ctx.timeout(() => { rev = { idx, t: 0, hearts, helped, all: solvedCount() >= 6 }; screen = 'reveal'; solving = false; ctx.fx.confetti(); ctx.audio.sfx('win'); }, 900);
    }

    /* ---------- Bildschirme wechseln ---------- */
    function openPic(i) { b = makeBoard(PICS[i].art, { idx: i }); screen = 'play'; solving = false; stroke = null; focus = null; curShow = false; cur = { x: 0, y: 0 }; ctx.audio.sfx('swoosh'); }
    function openTut() { b = makeBoard(TUT.art, { tut: true }); screen = 'tut'; solving = false; stroke = null; focus = null; curShow = false; cur = { x: 0, y: 0 }; tool = 'fill'; ctx.audio.sfx('swoosh'); }
    function toMenu() { screen = 'menu'; b = null; stroke = null; solving = false; ctx.audio.sfx('swoosh'); }
    function summary() {
      const n = solvedCount(), stars = starsFor(n);
      const score = Object.values(gal).reduce((a, v) => a + 100 + v * 20, 0);
      const nextT = THRESH.find(t => t > n);
      const text = n >= 6 ? 'Alle 6 Geheimnisse gelüftet. Du bist ein echter Pixel-Detektiv!'
        : `Du hast ${n} von 6 Bildern enthüllt. Noch ${nextT - n} Bild${nextT - n > 1 ? 'er' : ''} für den ${stars + 1}. Stern${n === 1 ? ' (2 Bilder = 1 Stern, 4 = 2, 6 = 3)' : ''}!`;
      return { won: stars > 0, stars, score, text };
    }
    function done() {
      if (finished) return; finished = true;
      ctx.finish(summary());
    }

    /* ---------- Eingabe ---------- */
    const hit = p => { for (let k = hits.length - 1; k >= 0; k--) { const h = hits[k]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; };
    ctx.on(canvas, 'contextmenu', e => e.preventDefault());
    ctx.on(canvas, 'pointerdown', e => {
      ctx.audio.unlock?.();
      const p = pos(e);
      const h = hit(p); if (h) { e.preventDefault(); ctx.audio.sfx('click'); h.fn(); return; }
      if ((screen === 'play' || screen === 'tut') && b && !solving) {
        const c = cellAt(p); if (!c) return;
        canvas.setPointerCapture?.(e.pointerId); e.preventDefault();
        const v = e.button === 2 ? 2 : (tool === 'cross' ? 2 : 1);
        const cs = b.st[c.y * b.n + c.x];
        stroke = { v, mode: cs === v ? 'clear' : 'set', sx: c.x, sy: c.y, lx: c.x, ly: c.y, ax: null, n: 0 };
        focus = c; curShow = false;
        if (!applyCell(c.x, c.y, stroke, true)) stroke = null;
      }
    });
    ctx.on(canvas, 'pointermove', e => {
      if (!stroke || !b) return;
      const c = cellAt(pos(e)); if (!c) return;
      focus = c;
      if (!stroke.ax) { if (c.x === stroke.sx && c.y === stroke.sy) return; stroke.ax = Math.abs(c.x - stroke.sx) >= Math.abs(c.y - stroke.sy) ? 'h' : 'v'; }
      const tx = stroke.ax === 'h' ? c.x : stroke.sx, ty = stroke.ax === 'v' ? c.y : stroke.sy;
      while (stroke && (stroke.lx !== tx || stroke.ly !== ty)) {
        stroke.lx += Math.sign(tx - stroke.lx); stroke.ly += Math.sign(ty - stroke.ly);
        if (!applyCell(stroke.lx, stroke.ly, stroke, false)) { stroke = null; }
      }
    });
    const up = () => { stroke = null; };
    ctx.on(canvas, 'pointerup', up); ctx.on(canvas, 'pointercancel', up);

    ctx.input.onPress(n => {
      ctx.audio.unlock?.();
      if (screen === 'menu') {
        if (n === 'left') sel = (sel + 5) % 6; else if (n === 'right') sel = (sel + 1) % 6;
        else if (n === 'up') sel = (sel + 4) % 6; else if (n === 'down') sel = (sel + 2) % 6;
        else if (n === 'a') openPic(sel);
        else if (n === 'b' && solvedCount() > 0) done();
        return;
      }
      if (screen === 'reveal') { if (n === 'a') revNext(); else if (n === 'b') toMenu(); return; }
      if ((screen !== 'play' && screen !== 'tut') || !b || solving) {
        if (screen === 'tut' && solving && n === 'a') finishTut();
        return;
      }
      if (['left', 'right', 'up', 'down'].includes(n)) {
        if (!curShow) curShow = true;
        else cur = { x: Math.max(0, Math.min(b.n - 1, cur.x + (n === 'right') - (n === 'left'))), y: Math.max(0, Math.min(b.n - 1, cur.y + (n === 'down') - (n === 'up'))) };
        focus = cur;
        if (keyStroke) {
          const k = keyStroke; if (!applyCell(cur.x, cur.y, k, false)) keyStroke = null;
        }
        return;
      }
      if (n === 'a' || n === 'b') {
        if (!curShow) { curShow = true; focus = cur; }
        const v = n === 'a' ? 1 : 2, cs = b.st[cur.y * b.n + cur.x];
        keyStroke = { v, mode: cs === v ? 'clear' : 'set', n: 0 };
        if (!applyCell(cur.x, cur.y, keyStroke, true)) keyStroke = null;
      }
    });
    ctx.input.onRelease(n => { if (n === 'a' || n === 'b') keyStroke = null; });

    function revNext() { const nx = rev.all ? -1 : nextUnsolved(rev.idx); if (rev.all) done(); else if (nx >= 0) openPic(nx); else toMenu(); }
    function finishTut() { toMenu(); }

    /* ---------- Zeichnen ---------- */
    function drawBg() {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b1437'); gr.addColorStop(1, '#101c4d');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (const f of flakes) { g.globalAlpha = 0.25 + f.r / 4; g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;
    }
    function drawHearts(x, y, size = 18) {
      for (let i = 0; i < MAXH; i++) {
        const lost = i >= b.hearts, shake = !lost ? 0 : 0;
        const pulse = (time - b.shakeT < 0.4 && i === b.hearts) ? 1 + (0.4 - (time - b.shakeT)) * 1.2 : 1;
        heart(x + i * (size + 3), y, size * pulse, lost ? '#3a4577' : C.red, lost ? 0.8 : 1);
      }
    }
    function drawBoard() {
      const { n, s, ox, oy, fs } = b;
      // Fokus-Band
      if (focus) {
        g.fillStyle = 'rgba(255,209,102,.10)';
        g.fillRect(ox, oy + focus.y * s, n * s, s); g.fillRect(ox + focus.x * s, oy, s, n * s);
      }
      // Vorschau-Bild in der Ecke
      const pv = Math.min(b.cw - 10, b.ch - 10, 54);
      if (pv >= 24) {
        const px = ox - b.cw + (b.cw - pv) / 2, py = oy - b.ch + (b.ch - pv) / 2;
        g.fillStyle = 'rgba(255,255,255,.07)'; rr(px - 2, py - 2, pv + 4, pv + 4, 5); g.fill();
        const q = pv / n; g.fillStyle = C.gold;
        for (let i = 0; i < b.st.length; i++) if (b.st[i] === 1) g.fillRect(px + (i % n) * q, py + Math.floor(i / n) * q, Math.ceil(q), Math.ceil(q));
      }
      // Zahlen
      g.font = `700 ${fs}px ${FONT}`; g.textBaseline = 'middle';
      for (let y = 0; y < n; y++) {
        const dn = b.rowDone[y], act = focus && focus.y === y;
        g.fillStyle = dn ? '#5d6aa0' : act ? C.gold : '#fff';
        let x = ox - 7; g.textAlign = 'right';
        for (let k = b.rows[y].length - 1; k >= 0; k--) { const t = String(b.rows[y][k]); g.fillText(t, x, oy + y * s + s / 2 + 1); x -= g.measureText(t).width + 5; }
      }
      for (let x = 0; x < n; x++) {
        const dn = b.colDone[x], act = focus && focus.x === x;
        g.fillStyle = dn ? '#5d6aa0' : act ? C.gold : '#fff'; g.textAlign = 'center';
        const cl = b.cols[x];
        for (let k = cl.length - 1, yy = oy - 8 - fs / 2; k >= 0; k--, yy -= fs + 3) g.fillText(String(cl[k]), ox + x * s + s / 2, yy);
      }
      // Felder
      const pad = Math.max(1, s * 0.05);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const i = y * n + x, cx = ox + x * s, cy = oy + y * s, st = b.st[i];
        const grp = n === 10 ? (((x >= 5) ^ (y >= 5)) ? 1 : 0) : ((x + y) & 1);
        rr(cx + pad, cy + pad, s - pad * 2, s - pad * 2, s * 0.14); g.fillStyle = grp ? C.cell2 : C.cell; g.fill();
        const age = time - b.t0[i];
        if (st === 1) {
          const k = age < 0.3 ? 0.78 + 0.22 * ease(Math.min(1, age / 0.3)) : 1, fl = time - b.flash[i];
          const q = (s - pad * 2) * k, o = (s - q) / 2;
          rr(cx + o, cy + o, q, q, s * 0.14);
          g.fillStyle = fl < 0.7 ? (Math.floor(fl * 10) % 2 ? C.gold : C.red) : C.gold; g.fill();
          if (!b.rowDone[y] || !b.colDone[x]) { g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(cx + o + q * 0.12, cy + o + q * 0.1, q * 0.5, q * 0.12); }
        } else if (st === 2) {
          const bad = b.bad[i], fl = time - b.flash[i];
          if (bad && fl < 0.8) { rr(cx + pad, cy + pad, s - pad * 2, s - pad * 2, s * 0.14); g.fillStyle = `rgba(239,71,111,${0.85 - fl * 0.8})`; g.fill(); }
          const k = age < 0.25 ? ease(Math.min(1, age / 0.25)) : 1, r = s * 0.22 * k;
          g.strokeStyle = bad ? C.red : (b.rowDone[y] || b.colDone[x]) && age > 0.4 ? 'rgba(142,202,230,.35)' : C.ice; g.lineWidth = Math.max(2, s * 0.09); g.lineCap = 'round';
          g.beginPath(); g.moveTo(cx + s / 2 - r, cy + s / 2 - r); g.lineTo(cx + s / 2 + r, cy + s / 2 + r); g.moveTo(cx + s / 2 + r, cy + s / 2 - r); g.lineTo(cx + s / 2 - r, cy + s / 2 + r); g.stroke();
        }
      }
      // Cursor
      if (curShow) {
        const pulse = 0.6 + 0.4 * Math.sin(time * 8);
        g.strokeStyle = `rgba(255,255,255,${pulse})`; g.lineWidth = 3; rr(ox + cur.x * s + 1, oy + cur.y * s + 1, s - 2, s - 2, s * 0.16); g.stroke();
      }
    }
    function drawToggle(y) {
      const w = 160, h = 52;
      button(18, y, w, h, '■  Füllen', () => { tool = 'fill'; }, { active: tool === 'fill', glow: tool === 'fill' ? C.gold : null, size: 18 });
      button(W - 18 - w, y, w, h, '✕  Kreuz', () => { tool = 'cross'; }, { active: tool === 'cross', fill: tool === 'cross' ? C.ice : null, color: tool === 'cross' ? '#07203a' : '#fff', stroke: tool === 'cross' ? '#d8f1ff' : null, glow: tool === 'cross' ? C.ice : null, size: 18 });
    }
    function drawMenu() {
      txt('Pixel-Geheimnis', W / 2, 30, 26, C.gold);
      txt(`${solvedCount()} von 6 Bildern enthüllt`, W / 2, 56, 14, '#b8c4ee', 'center', 600);
      const nx = (() => { for (let i = 0; i < 6; i++) if (gal[i] === undefined) return i; return -1; })();
      for (let i = 0; i < 6; i++) {
        const x = 20 + (i % 2) * 170, y = 74 + Math.floor(i / 2) * 124, w = 150, h = 112, solved = gal[i] !== undefined;
        hits.push({ x, y, w, h, fn: () => openPic(i) });
        const pulse = i === nx ? 0.5 + 0.5 * Math.sin(time * 4) : 0;
        g.save(); if (i === nx) { g.shadowColor = C.gold; g.shadowBlur = 8 + pulse * 10; }
        rr(x, y, w, h, 16); g.fillStyle = solved ? C.paper : '#16235e'; g.fill(); g.restore();
        rr(x, y, w, h, 16); g.lineWidth = sel === i && !ctx.input.isTouch ? 3 : 2; g.strokeStyle = sel === i && !ctx.input.isTouch ? '#fff' : (i === nx ? C.gold : '#34458f'); g.stroke();
        const sz = PICS[i].art.length;
        if (solved) {
          miniPic(PICS[i].art, x + 14, y + 29, 56);
          txt(PICS[i].name.replace(/^Ein[e]? /, '').replace('!', ''), x + w / 2, y + 15, 14, '#1b2557', 'center');
          for (let k = 0; k < 5; k++) heart(x + 22 + k * 17, y + h - 12, 13, k < gal[i] ? C.red : '#c4cde6');
          txt(`${sz}×${sz}`, x + w - 34, y + 57, 14, '#6674a8', 'center', 600);
        } else {
          txt('?', x + w / 2, y + 44, 52, '#4a5aa6');
          txt(`${sz}×${sz} Pixel`, x + w / 2, y + h - 18, 14, '#9fb0e6', 'center', 600);
        }
      }
      const by = 74 + 3 * 124 + 4;
      button(20, by, 150, 46, '❓ So geht das', openTut, { size: 15 });
      const ok = solvedCount() > 0;
      const stars = starsFor(solvedCount());
      button(190, by, 150, 46, ok ? 'Fertig für heute' : 'Löse ein Bild', ok ? done : () => ctx.toast('Löse zuerst ein Bild!'), { fill: ok ? C.green : '#1a2557', color: ok ? '#052b22' : '#7482b8', stroke: ok ? '#b9ffe9' : '#2c3a80', glow: ok ? C.green : null, size: 15 });
      txt(`Sterne: 2 Bilder ★ · 4 ★★ · 6 ★★★ (jetzt ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)})`, W / 2, by + 66, 12, '#9fb0e6', 'center', 600);
    }
    function drawPlay() {
      const tut = b.tut;
      button(10, 10, 92, 38, tut ? 'Zurück' : '‹ Galerie', tut ? toMenu : toMenu, { size: 14 });
      if (tut) txt('Mini-Beispiel', W / 2 + 20, 29, 18, C.gold);
      else {
        txt(`Bild ${b.idx + 1}  ·  ${b.n}×${b.n}`, 175, 29, 15, '#fff', 'center', 700);
        drawHearts(W - 5 * 21 - 6, 29, 18);
      }
      drawBoard();
      const gy = b.oy + b.n * b.s;
      if (tut) {
        let msg;
        const rowOK = b.rowDone[0], colsOK = b.colDone[1] && b.colDone[2];
        if (solving) msg = 'Super, geschafft! So sieht ein Pixel-Rätsel aus. Jetzt geht es richtig los.';
        else if (!rowOK) msg = 'Die 4 neben der ersten Zeile heißt: 4 Kästchen am Stück. Fülle die ganze erste Zeile. Tippe oder ziehe mit dem Finger!';
        else if (!colsOK) msg = 'Nicht passende Kästchen werden rot. Hier gilt: Die 3 über Spalte 2 und 3 geht von oben nach unten, weil oben schon ein Kästchen gefüllt ist.';
        else msg = 'Fast! Die Zahlen 1 1 bedeuten zwei einzelne Kästchen mit Lücke. Mit "Kreuz" markierst du Felder, die sicher leer sind. Fülle den Rest.';
        const lines = wrap(msg, 296, 14);
        rr(26, gy + 14, 308, lines.length * 20 + 18, 12); g.fillStyle = 'rgba(142,202,230,.14)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(142,202,230,.5)'; g.stroke();
        lines.forEach((l, i) => txt(l, W / 2, gy + 31 + i * 20, 14, '#e8f3ff', 'center', 600));
        if (solving) button(80, 470, 200, 50, "Los geht's!", finishTut, { fill: C.green, color: '#052b22', glow: C.green, size: 18 });
        else drawToggle(490);
      } else {
        txt('Falsch gefüllt? Rot, ein Herz weg, wird zum Kreuz.', W / 2, 468, 13, '#9fb0e6', 'center', 600);
        drawToggle(490);
      }
    }
    function drawReveal(dt) {
      rev.t += dt;
      const p = PICS[rev.idx], t = rev.t, n = p.art.length;
      const nk = Math.max(0, Math.min(1, (t - 0.1) / 0.5));
      g.save(); g.translate(W / 2, 54); g.scale(0.6 + 0.4 * ease(nk), 0.6 + 0.4 * ease(nk));
      txt(p.name, 0, 0, 30, C.gold); g.restore();
      const size = 290, x = (W - size) / 2, y = 94;
      g.save(); g.shadowColor = C.gold; g.shadowBlur = 24; rr(x - 10, y - 10, size + 20, size + 20, 22); g.fillStyle = C.paper; g.fill(); g.restore();
      miniPic(p.art, x, y, size, { t: t - 0.15, delay: (i, j) => (i + j) * 0.035 + (i * 7 + j * 3) % 5 * 0.01 });
      if (t > 1.2) txt(rev.helped ? 'Mit Hilfe gelöst (weniger Bonuspunkte)' : rev.hearts === MAXH ? 'Fehlerfrei!' : `Noch ${rev.hearts} von 5 Herzen übrig`, W / 2, y + size + 30, 16, rev.helped ? C.gold : rev.hearts === MAXH ? C.green : '#b8c4ee');
      const nx = nextUnsolved(rev.idx);
      if (rev.all) button(40, 470, 280, 54, 'Fertig für heute', revNext, { fill: C.green, color: '#052b22', glow: C.green, size: 19 });
      else {
        button(18, 480, 190, 50, nx >= 0 ? 'Nächstes Bild ▶' : 'Zur Galerie', revNext, { fill: C.gold, color: '#2a2000', stroke: '#fff3c4', glow: C.gold, size: 18 });
        button(222, 480, 120, 50, 'Galerie', toMenu, { size: 16 });
      }
      if (Math.random() < dt * 5 && t < 4) burst(60 + Math.random() * 240, 90 + Math.random() * 280, [C.gold, C.red, C.ice, C.green, C.violet][Math.floor(Math.random() * 5)], 6, 90);
    }
    function frame(dt) {
      time += dt;
      for (const f of flakes) { f.y += f.v * dt; if (f.y > H + 3) { f.y = -3; f.x = Math.random() * W; } }
      hits = [];
      drawBg();
      if (screen === 'menu') drawMenu();
      else if (screen === 'play' || screen === 'tut') drawPlay();
      else if (screen === 'reveal') drawReveal(dt);
      sparks = sparks.filter(p => (p.life -= dt) > 0);
      for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt; g.globalAlpha = Math.max(0, p.life * 2); g.fillStyle = p.color; g.fillRect(p.x - 2, p.y - 2, 4, 4); }
      g.globalAlpha = 1;
    }
    ctx.loop(frame);
    if (!tutSeen && solvedCount() === 0) openTut();
    return { destroy() {} };
  },
};
