// Türchen 14: Schlitten frei! (Schiebe-Rätsel auf 6x6-Hof)
import { LEVELS } from './levels.js';
import { N, ROW, parse, grid, pathClear, range, solve } from './solver.js';

export const howto = {
  touch: 'Der rote Schlitten muss nach rechts aus dem Hof. Zieh die Blöcke aus dem Weg, sie gleiten nur vor und zurück.',
  keys: 'Der rote Schlitten muss nach rechts aus dem Hof. Mit Tab wählst du einen Block, die Pfeiltasten schieben ihn (oder zieh ihn mit der Maus).',
};
export const starsInfo = '★ 4 Höfe · ★★ 8 Höfe · ★★★ alle 12 Höfe befreit';

const W = 360, H = 600, CS = 52, BX = 24, BY = 84, BS = CS * N;
const NAMES = ['Vorgarten', 'Hofeinfahrt', 'Garage', 'Scheune', 'Marktplatz', 'Werkstatt', 'Holzlager', 'Geschenke-Lager', 'Rathaushof', 'Rentierstall', 'Nordpol-Tor', 'Santas Hof'];
const GOLD = '#ffd166', RED = '#ef476f', GREEN = '#06d6a0', ICE = '#8ecae6', VIOLET = '#c77dff';
const MAX_HINTS = 3;
const PLOW_COL = ['#3a86c8', '#2a9d8f', '#7b6fd6', '#5c7aa8'];
const GIFT_COL = [VIOLET, GOLD, ICE, '#f78c6b', GREEN];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };

export default {
  create(ctx) {
    const { canvas, g, w, h, pos: ptr } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none';

    // ---------- Speicher ----------
    const sanitize = a => Array.from({ length: LEVELS.length }, (_, i) => (Array.isArray(a) && Number.isFinite(a[i]) ? Math.max(0, a[i]) : 0));
    let bestMoves = sanitize(ctx.load('bestMoves', []));
    const solvedCount = () => bestMoves.filter(b => b > 0).length;
    const maxSolved = () => bestMoves.reduce((m, b, i) => (b > 0 ? i : m), -1);
    const unlocked = i => i <= maxSolved() + 2;
    const starsNow = () => { const s = solvedCount(); return s >= 12 ? 3 : s >= 8 ? 2 : s >= 4 ? 1 : 0; };

    // ---------- Zustand ----------
    let mode = 'select';          // 'select' | 'play'
    let time = 0, lvl = 0, vs = [], init = [], pos = [];
    let hist = [], sel = -1, drag = null, hint = null, hintsUsed = [], busy = false, over = false;
    let exitAnim = null, press = null, bumps = {}, blink = {}, cursor = Math.min(LEVELS.length - 1, maxSolved() + 1), shakeT = 0;
    let parts = [];
    const flakes = Array.from({ length: 36 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 1.6, s: 8 + Math.random() * 16, ph: Math.random() * 6 }));
    hintsUsed = LEVELS.map(() => 0);

    const emit = (x, y, n, o = {}) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, v = (o.v || 40) * (0.3 + Math.random());
        parts.push({ x, y, vx: Math.cos(a) * v + (o.vx || 0), vy: Math.sin(a) * v + (o.vy || 0) - (o.up || 0), life: (o.life || 0.5) * (0.6 + Math.random() * 0.6), max: o.life || 0.5, r: (o.r || 3) * (0.6 + Math.random() * 0.7), c: o.c || '#fff' });
      }
    };

    // ---------- Level laden ----------
    function loadLevel(i) {
      lvl = i; mode = 'play'; vs = parse(LEVELS[i].v);
      init = vs.map(v => v.p); pos = init.slice();
      vs.forEach((v, k) => {
        v.vp = v.p; v.tp = v.p; v.k = k;
        v.kind = k === 0 ? 'sled' : v.len === 3 ? (k % 2 ? 'wood' : 'gift') : (k % 3 === 0 ? 'gift' : 'plow');
        v.col = k % 4; v.flip = k % 2 === 0;
      });
      hist = []; sel = -1; drag = null; hint = null; busy = false; exitAnim = null; bumps = {}; blink = {};
      sel = 0;
      updateHud();
    }
    function updateHud() {
      if (mode === 'select') ctx.hud.set({ 'Gelöst': `${solvedCount()}/${LEVELS.length}` });
      else ctx.hud.set({ Level: lvl + 1, 'Züge': hist.length, 'Profi:': LEVELS[lvl].min });
    }
    function toSelect() {
      mode = 'select'; drag = null; hint = null; busy = false; exitAnim = null;
      cursor = clamp(lvl, 0, LEVELS.length - 1);
      updateHud();
    }

    // ---------- Spiel-Logik ----------
    const gridNow = () => grid(vs, pos);
    function rangeOf(i) { return range(vs, pos, i, gridNow()); }

    function commit(i, from, to) {
      if (from === to) return;
      const last = hist[hist.length - 1];
      if (last && last.i === i) { last.to = to; if (last.to === last.from) hist.pop(); }
      else hist.push({ i, from, to });
      hint = null;
      updateHud();
    }
    function afterMove() {
      if (busy || !pathClear(vs, pos)) return false;
      win(); return true;
    }
    // Zug blockiert: Block wackelt, der Nachbar im Weg blitzt auf, leiser Ton
    function bump(i, dirSign, p) {
      bumps[i] = { t: 0, d: dirSign };
      const v = vs[i], at = p === undefined ? pos[i] : p;
      const nx = v.h ? (dirSign > 0 ? at + v.len : at - 1) : v.x, ny = v.h ? v.y : (dirSign > 0 ? at + v.len : at - 1);
      if (nx >= 0 && ny >= 0 && nx < N && ny < N) {
        const j = gridNow()[ny * N + nx];
        if (j >= 0 && j !== i) blink[j] = 0.6;
      }
      ctx.audio.tone(150, 0.06, 'triangle', 0.07, 110);
    }
    function nudge(i, d) { // Tastatur: ein Feld schieben
      if (busy || over || i < 0) return;
      const v = vs[i];
      if (v.h !== (d === 'left' || d === 'right')) { bumps[i] = { t: 0, d: 0, side: true }; ctx.audio.tone(150, 0.06, 'triangle', 0.07, 110); return; }
      const s = (d === 'left' || d === 'up') ? -1 : 1;
      const { lo, hi } = rangeOf(i);
      const np = pos[i] + s;
      if (np < lo || np > hi) { bump(i, s); return; }
      const from = pos[i];
      pos[i] = np; v.p = np; v.tp = np;
      ctx.audio.sfx('tick'); ctx.audio.tone(420 + np * 40, 0.05, 'sine', 0.08);
      puff(v, s);
      commit(i, from, np);
      afterMove();
    }
    function puff(v, s) {
      const cx = v.h ? BX + (v.tp + (s > 0 ? 0 : v.len)) * CS : BX + (v.x + 0.5) * CS;
      const cy = v.h ? BY + (v.y + 0.5) * CS : BY + (v.tp + (s > 0 ? 0 : v.len)) * CS;
      emit(cx, cy, 5, { v: 35, life: 0.45, r: 2.6, c: '#ffffff' });
    }

    function undo() {
      if (busy || over || mode !== 'play') return;
      const e = hist.pop();
      if (!e) { ctx.audio.sfx('bad'); return; }
      const v = vs[e.i];
      pos[e.i] = e.from; v.p = e.from; v.tp = e.from; sel = e.i; hint = null;
      ctx.audio.tone(500, 0.12, 'sine', 0.14, 300); updateHud();
    }
    function restart(quiet) {
      if (busy || over || mode !== 'play') return;
      vs.forEach((v, k) => { v.p = init[k]; v.tp = init[k]; });
      pos = init.slice(); hist = []; hint = null; sel = 0; drag = null;
      if (!quiet) { ctx.audio.sfx('swoosh'); emit(W / 2, BY + BS / 2, 20, { v: 120, life: 0.6, r: 3 }); }
      updateHud();
    }
    function useHint() {
      if (busy || over || mode !== 'play') return;
      if (hintsUsed[lvl] >= MAX_HINTS) { ctx.toast('Keine Tipps mehr für dieses Level', 1200); ctx.audio.sfx('bad'); return; }
      const r = solve(vs, pos);
      if (!r || !r.first) return;
      hintsUsed[lvl]++;
      hint = { i: r.first.i, to: r.first.to, left: r.n };
      sel = r.first.i;
      ctx.audio.sfx('power');
    }
    function cycle(dir) {
      if (busy || over || mode !== 'play') return;
      sel = (sel + dir + vs.length) % vs.length; ctx.audio.tone(900, 0.04, 'square', 0.07);
    }

    // ---------- Level geschafft ----------
    function win() {
      busy = true; drag = null; hint = null;
      const moves = hist.length, prof = LEVELS[lvl].min, wasNew = bestMoves[lvl] === 0;
      const better = bestMoves[lvl] === 0 || moves < bestMoves[lvl];
      if (better) bestMoves[lvl] = Math.max(1, moves);
      ctx.save('bestMoves', bestMoves);
      ctx.save('reached', Math.min(LEVELS.length - 1, maxSolved() + 1));
      const s = vs[0];
      exitAnim = { x: BX + pos[0] * CS, v: 90, t: 0, bells: 0, wait: 0.35, moves, prof };
      s.sel = false;
      ctx.audio.sfx('power');
      const sm = summary(false); if (sm.stars > 0) ctx.progress(sm);
      ctx.fx.confetti(25 + (moves <= prof ? 35 : 0));
      updateHud();
      void wasNew;
    }
    function afterExit() {
      const done = lvl >= LEVELS.length - 1;
      if (done) return finishGame(true);
      loadLevel(lvl + 1);
      ctx.audio.sfx('swoosh');
    }
    function summary(last) {
      const n = solvedCount(), st = starsNow();
      let text;
      if (n >= 12) text = 'Alle 12 Höfe frei! Der Nikolaus kommt pünktlich an. Du bist ein echter Schlitten-Profi!';
      else {
        const need = n < 4 ? 4 : n < 8 ? 8 : 12;
        text = `${n} von 12 Höfen befreit. Noch ${need - n} Level mehr für ${'★'.repeat(st + 1)}.`;
        if (last) text = 'Letztes Level geschafft! ' + text + ' Die übrigen Level findest du in der Auswahl.';
      }
      return { won: st >= 1, stars: st, score: n * 10, text };
    }
    function finishGame(last) {
      if (over) return; over = true;
      ctx.finish(summary(last));
    }

    // ---------- Eingabe ----------
    const BUTTONS = {
      undo: { x: 20, y: 440, w: 104, h: 46 }, reset: { x: 128, y: 440, w: 104, h: 46 }, hint: { x: 236, y: 440, w: 104, h: 46 },
      menu: { x: 20, y: 500, w: 156, h: 46 }, done: { x: 184, y: 500, w: 156, h: 46 },
      doneSel: { x: 70, y: 520, w: 220, h: 50 },
    };
    const inside = (b, p) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    const TILE = (i) => ({ x: 16 + (i % 4) * 84, y: 168 + Math.floor(i / 4) * 94, w: 76, h: 84 });

    function onButton(name) {
      ctx.audio.sfx('click');
      if (name === 'undo') undo();
      else if (name === 'reset') restart();
      else if (name === 'hint') useHint();
      else if (name === 'menu') toSelect();
      else if (name === 'done' || name === 'doneSel') finishGame(false);
    }
    function pointerDown(e) {
      if (over) return;
      ctx.audio.unlock?.();
      const p = ptr(e);
      if (mode === 'select') {
        for (let i = 0; i < LEVELS.length; i++) if (inside(TILE(i), p)) {
          if (!unlocked(i)) { ctx.audio.sfx('bad'); bumps['t' + i] = { t: 0 }; return; }
          cursor = i; ctx.audio.sfx('pop'); loadLevel(i); return;
        }
        if (inside(BUTTONS.doneSel, p)) { press = { name: 'doneSel', t: 0 }; onButton('doneSel'); }
        return;
      }
      for (const name of ['undo', 'reset', 'hint', 'menu', 'done']) if (inside(BUTTONS[name], p)) { press = { name, t: 0 }; onButton(name); return; }
      if (busy) return;
      const cx = Math.floor((p.x - BX) / CS), cy = Math.floor((p.y - BY) / CS);
      if (cx < 0 || cy < 0 || cx >= N || cy >= N) return;
      const i = gridNow()[cy * N + cx];
      if (i < 0) return;
      const v = vs[i];
      sel = i;
      const r = rangeOf(i);
      const axis = v.h ? (p.x - BX) / CS : (p.y - BY) / CS;
      drag = { i, start: pos[i], off: axis - v.vp, lo: r.lo, hi: r.hi, moved: false, id: e.pointerId, last: pos[i], atWall: false };
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      ctx.audio.tone(700, 0.04, 'sine', 0.08);
    }
    function pointerMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const p = ptr(e), v = vs[drag.i];
      const axis = v.h ? (p.x - BX) / CS : (p.y - BY) / CS;
      const raw = axis - drag.off, t = clamp(raw, drag.lo, drag.hi);
      v.tp = t;
      if (Math.abs(t - drag.start) > 0.12) drag.moved = true;
      const cell = Math.round(t);
      if (cell !== drag.last) { drag.last = cell; ctx.audio.sfx('tick'); puff(v, cell > drag.start ? 1 : -1); }
      const hit = (raw < drag.lo - 0.15 || raw > drag.hi + 0.15) && drag.hi - drag.lo >= 0;
      if (hit && !drag.atWall) { drag.atWall = true; if (Math.abs(raw - t) > 0.15) { bump(drag.i, raw > t ? 1 : -1, Math.round(t)); } }
      if (!hit) drag.atWall = false;
    }
    function pointerUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag, v = vs[d.i]; drag = null;
      if (!d.moved) { // Tippen = auswählen
        v.tp = d.start; ctx.audio.tone(900, 0.04, 'square', 0.07); return;
      }
      const np = clamp(Math.round(v.tp), d.lo, d.hi);
      v.tp = np; v.p = np; pos[d.i] = np;
      if (np !== d.start) {
        ctx.audio.sfx('pop'); ctx.audio.tone(300 + np * 30, 0.08, 'triangle', 0.1);
        emit(BX + (v.h ? (np + v.len / 2) : v.x + 0.5) * CS, BY + (v.h ? v.y + 0.5 : np + v.len / 2) * CS, 8, { v: 50, life: 0.5, r: 3 });
        commit(d.i, d.start, np);
        afterMove();
      }
    }
    ctx.on(canvas, 'pointerdown', pointerDown);
    ctx.on(canvas, 'pointermove', pointerMove);
    ctx.on(canvas, 'pointerup', pointerUp);
    ctx.on(canvas, 'pointercancel', e => { if (drag && e.pointerId === drag.id) { vs[drag.i].tp = drag.start; drag = null; } });

    let lastKey = '';
    ctx.on(window, 'keydown', e => { lastKey = e.key; }, true); // Shift soll nicht als B zählen (Shift+Tab)
    ctx.input.onPress(n => {
      if (over || ctx.paused) return;
      if (n === 'b' && lastKey === 'Shift') return;
      if (mode === 'select') {
        const cols = 4;
        if (n === 'left') cursor = Math.max(0, cursor - 1);
        else if (n === 'right') cursor = Math.min(LEVELS.length - 1, cursor + 1);
        else if (n === 'up') cursor = Math.max(0, cursor - cols);
        else if (n === 'down') cursor = Math.min(LEVELS.length - 1, cursor + cols);
        else if (n === 'a' || n === 'b') { if (unlocked(cursor)) { ctx.audio.sfx('pop'); loadLevel(cursor); } else ctx.audio.sfx('bad'); return; }
        ctx.audio.tone(900, 0.04, 'square', 0.07);
        return;
      }
      if (n === 'b') cycle(1);
      else if (n === 'a') cycle(1);
      else nudge(sel, n);
    });
    ctx.on(window, 'keydown', e => {
      if (over || ctx.paused) return;
      if (e.key === 'Tab') { e.preventDefault(); if (mode === 'play') cycle(e.shiftKey ? -1 : 1); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (mode === 'play') {
        if (k === 'u' || k === 'z' || k === 'backspace') { e.preventDefault(); undo(); }
        else if (k === 'r') restart();
        else if (k === 'h' || k === 't') useHint();
        else if (k === 'escape' || k === 'l') toSelect();
      }
    });

    // ---------- Zeichnen ----------
    function drawSnowBg(dt) {
      g.fillStyle = '#0b1437'; g.fillRect(0, 0, W, H);
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#16235a'); gr.addColorStop(1, '#0b1437');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.8)';
      for (const f of flakes) {
        f.y += f.s * dt; f.x += Math.sin(time + f.ph) * 6 * dt; if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
        g.globalAlpha = 0.25 + f.r * 0.2; g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.3); g.fill();
      }
      g.globalAlpha = 1;
    }
    function fir(x, y, s) {
      g.fillStyle = '#0f3b3a';
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x, y - s + k * s * 0.32); g.lineTo(x + s * (0.28 + k * 0.1), y - s * 0.3 * (2 - k) * 0.5 + k * s * 0.18 + s * 0.1); g.lineTo(x - s * (0.28 + k * 0.1), y - s * 0.3 * (2 - k) * 0.5 + k * s * 0.18 + s * 0.1); g.closePath(); g.fill(); }
      g.fillStyle = '#4a2f1c'; g.fillRect(x - 2, y - s * 0.05, 4, s * 0.12);
    }

    function drawBoard() {
      // Holzzaun (mit Lücke rechts bei Zeile 2)
      g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, BX - 9, BY - 6, BS + 18, BS + 20, 14); g.fill();
      g.fillStyle = '#7a4b2a'; rr(g, BX - 12, BY - 12, BS + 24, BS + 24, 12); g.fill();
      g.fillStyle = '#946037'; rr(g, BX - 12, BY - 12, BS + 24, 6, 3); g.fill();
      // Schnee-Hof
      g.save(); rr(g, BX, BY, BS, BS, 6); g.clip();
      g.fillStyle = '#e4f3fb'; g.fillRect(BX, BY, BS, BS);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if ((x + y) % 2) { g.fillStyle = 'rgba(142,202,230,.22)'; g.fillRect(BX + x * CS, BY + y * CS, CS, CS); }
      }
      // Schneewehen in den Ecken
      g.fillStyle = '#ffffff';
      for (const [cx, cy, r] of [[0, 0, 26], [BS, 0, 22], [0, BS, 24], [BS, BS, 28], [BS * 0.5, BS + 6, 34], [BS * 0.3, -4, 20]]) { g.beginPath(); g.arc(BX + cx, BY + cy, r, 0, 6.3); g.fill(); }
      // Spuren der Fahrbahn
      g.fillStyle = 'rgba(120,170,200,.28)'; g.fillRect(BX, BY + ROW * CS + CS * 0.5 - 14, BS, 4); g.fillRect(BX, BY + ROW * CS + CS * 0.5 + 10, BS, 4);
      g.restore();
      // Zaunpfosten
      g.fillStyle = '#5e3a20';
      for (let k = 0; k <= N; k++) {
        for (const [px, py] of [[BX + k * CS, BY - 8], [BX + k * CS, BY + BS + 8], [BX - 8, BY + k * CS], [BX + BS + 8, BY + k * CS]]) {
          if (px === BX + BS + 8 && py >= BY + ROW * CS - 1 && py <= BY + (ROW + 1) * CS + 1) continue;
          g.beginPath(); g.arc(px, py, 5, 0, 6.3); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py - 2, 3.5, Math.PI, 0); g.fill(); g.fillStyle = '#5e3a20';
        }
      }
      // Ausgang: Lücke im Zaun, geräumter Weg
      const ey = BY + ROW * CS;
      g.fillStyle = '#e4f3fb'; g.fillRect(BX + BS - 2, ey, 14 + 2, CS);
      g.fillStyle = '#cfe6f3'; g.fillRect(BX + BS + 12, ey + 4, W - (BX + BS + 12), CS - 8);
      g.fillStyle = '#e4f3fb'; g.fillRect(BX + BS + 12, ey + 6, W - (BX + BS + 12), CS - 12);
      // Laternen am Ausgang
      for (const dy of [-8, CS + 8]) {
        g.fillStyle = '#3a2a1e'; g.fillRect(BX + BS + 8, ey + dy - 1, 4, 3);
        const glow = 0.6 + Math.sin(time * 4 + dy) * 0.2;
        g.fillStyle = `rgba(255,209,102,${glow})`; g.shadowColor = GOLD; g.shadowBlur = 12;
        g.beginPath(); g.arc(BX + BS + 10, ey + dy, 5, 0, 6.3); g.fill(); g.shadowBlur = 0;
      }
      // Pfeile
      for (let k = 0; k < 2; k++) {
        const a = 0.35 + 0.65 * Math.max(0, Math.sin(time * 4 - k * 1.2));
        g.strokeStyle = `rgba(6,214,160,${a})`; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
        const ax = BX + BS + 16 + k * 10; g.beginPath(); g.moveTo(ax, ey + CS / 2 - 9); g.lineTo(ax + 9, ey + CS / 2); g.lineTo(ax, ey + CS / 2 + 9); g.stroke();
      }
      // Tannen
      fir(34, BY - 14, 46); fir(W - 30, BY - 14, 40); fir(W - 24, BY + BS + 40, 34);
    }

    // Fahrzeug in lokalen Koordinaten (waagerecht, Front = +x) zeichnen
    function drawVehicle(v, ax, ay, o = {}) {
      const L = v.len * CS, wd = CS;
      const hw = L / 2 - 3, hh = wd / 2 - 3;
      const cx = ax + (v.h ? L / 2 : wd / 2), cy = ay + (v.h ? wd / 2 : L / 2);
      // Schatten
      g.save(); g.translate(cx, cy + 3); if (!v.h) g.rotate(Math.PI / 2);
      g.fillStyle = 'rgba(30,60,100,.28)'; rr(g, -hw, -hh, hw * 2, hh * 2, 10); g.fill(); g.restore();
      g.save(); g.translate(cx, cy);
      if (!v.h) g.rotate(Math.PI / 2);
      if (o.wob) g.rotate(o.wob);
      const lift = o.lift ? 1.04 : 1; g.scale(lift, lift);
      if (v.kind === 'sled') drawSled(hw, hh);
      else if (v.kind === 'plow') { if (v.flip) g.scale(-1, 1); drawPlow(hw, hh, PLOW_COL[v.col]); }
      else if (v.kind === 'wood') drawWood(hw, hh);
      else drawGift(hw, hh, v);
      g.restore();
    }
    function drawSled(hw, hh) {
      // Kufen
      g.strokeStyle = '#d99a1f'; g.lineWidth = 5; g.lineCap = 'round';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-hw + 2, s * (hh - 3)); g.lineTo(hw - 8, s * (hh - 3)); g.quadraticCurveTo(hw + 1, s * (hh - 3), hw - 1, s * (hh - 9)); g.stroke(); }
      g.strokeStyle = GOLD; g.lineWidth = 2.5;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-hw + 3, s * (hh - 4)); g.lineTo(hw - 9, s * (hh - 4)); g.stroke(); }
      // Korpus
      g.fillStyle = '#c9304f'; rr(g, -hw + 4, -hh + 6, hw * 2 - 12, hh * 2 - 12, 9); g.fill();
      g.fillStyle = RED; rr(g, -hw + 4, -hh + 5, hw * 2 - 12, hh * 2 - 15, 9); g.fill();
      g.strokeStyle = GOLD; g.lineWidth = 2; rr(g, -hw + 8, -hh + 9, hw * 2 - 20, hh * 2 - 23, 6); g.stroke();
      // Geschenke-Sack hinten
      g.fillStyle = '#c98b4b'; g.beginPath(); g.arc(-hw + 20, 0, 12, 0, 6.3); g.fill();
      g.fillStyle = '#a56d33'; g.beginPath(); g.arc(-hw + 17, -3, 6, 0, 6.3); g.fill();
      g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); g.arc(-hw + 20, 0, 4, 0, 6.3); g.stroke();
      // Nikolaus (von oben): Kopf + Mütze
      g.fillStyle = '#ffd9bd'; g.beginPath(); g.arc(hw - 30, 0, 9, 0, 6.3); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(hw - 26, 0, 8, -1.6, 1.6); g.fill(); // Bart
      g.fillStyle = '#d62839'; g.beginPath(); g.arc(hw - 33, 0, 8.5, 0, 6.3); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(hw - 33, 0, 8.5, -1.4, 1.4); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(hw - 43, 4, 3.6, 0, 6.3); g.fill();
      // Glöckchen vorn
      g.fillStyle = GOLD; g.shadowColor = GOLD; g.shadowBlur = 8;
      for (const s of [-1, 1]) { g.beginPath(); g.arc(hw - 8, s * 12, 4.5, 0, 6.3); g.fill(); }
      g.shadowBlur = 0; g.fillStyle = '#fff6'; g.beginPath(); g.arc(hw - 9.5, -13.5, 1.5, 0, 6.3); g.fill();
    }
    function drawPlow(hw, hh, col) {
      // Räder/Ketten
      g.fillStyle = '#23283a';
      for (const s of [-1, 1]) { rr(g, -hw + 8, s * (hh - 6) - 5, hw * 2 - 28, 10, 5); g.fill(); }
      // Körper
      g.fillStyle = col; rr(g, -hw + 3, -hh + 4, hw * 2 - 18, hh * 2 - 8, 9); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; rr(g, -hw + 5, -hh + 5, hw * 2 - 22, 7, 4); g.fill();
      // Kabine mit Fenster
      g.fillStyle = 'rgba(0,0,0,.22)'; rr(g, -hw + 10, -hh + 11, 24, hh * 2 - 22, 6); g.fill();
      g.fillStyle = '#bfe9ff'; rr(g, -hw + 14, -hh + 14, 16, hh * 2 - 28, 4); g.fill();
      // Rundumleuchte
      const on = Math.sin(time * 8) > 0;
      g.fillStyle = on ? '#ffb703' : '#a86a00'; g.shadowColor = '#ffb703'; g.shadowBlur = on ? 10 : 0;
      g.beginPath(); g.arc(-hw + 22, 0, 4, 0, 6.3); g.fill(); g.shadowBlur = 0;
      // Schneeschild vorn
      g.fillStyle = '#ffb703'; rr(g, hw - 14, -hh + 1, 11, hh * 2 - 2, 4); g.fill();
      g.strokeStyle = '#7a4a00'; g.lineWidth = 2;
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(hw - 13, k * 7 + 3); g.lineTo(hw - 5, k * 7 - 3); g.stroke(); }
      // Scheinwerfer-Augen
      for (const s of [-1, 1]) {
        g.fillStyle = '#fff'; g.beginPath(); g.arc(hw - 22, s * 9, 5.2, 0, 6.3); g.fill();
        g.fillStyle = '#1b1f33'; g.beginPath(); g.arc(hw - 20.5, s * 9, 2.4, 0, 6.3); g.fill();
      }
    }
    function drawWood(hw, hh) {
      // Ladefläche
      g.fillStyle = '#4a3020'; rr(g, -hw + 2, -hh + 3, hw * 2 - 4, hh * 2 - 6, 7); g.fill();
      g.strokeStyle = '#2f1e12'; g.lineWidth = 4; g.lineCap = 'round';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-hw + 4, s * (hh - 2)); g.lineTo(hw - 4, s * (hh - 2)); g.stroke(); }
      // Baumstämme (längs)
      const cols = ['#a9703c', '#8c5a2c', '#b9803f'];
      for (let k = -1; k <= 1; k++) {
        g.fillStyle = cols[k + 1]; rr(g, -hw + 6, k * 13 - 6.5, hw * 2 - 12, 13, 6); g.fill();
        g.strokeStyle = 'rgba(60,30,10,.45)'; g.lineWidth = 1;
        for (let q = -hw + 22; q < hw - 12; q += 26) { g.beginPath(); g.moveTo(q, k * 13 - 3); g.lineTo(q + 9, k * 13 - 3); g.moveTo(q + 5, k * 13 + 3); g.lineTo(q + 14, k * 13 + 3); g.stroke(); }
        g.fillStyle = '#e8c48a'; g.beginPath(); g.ellipse(hw - 8, k * 13, 3.2, 6, 0, 0, 6.3); g.fill();
        g.strokeStyle = '#a9703c'; g.lineWidth = 1; g.beginPath(); g.ellipse(hw - 8, k * 13, 1.5, 3, 0, 0, 6.3); g.stroke();
      }
      // Gurte
      g.fillStyle = RED;
      for (const q of [-hw * 0.4, hw * 0.35]) { rr(g, q - 3, -hh + 4, 6, hh * 2 - 8, 2); g.fill(); }
      // Schneehaube
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(-hw * 0.1, -4, 17, 6, 0.1, 0, 6.3); g.fill();
      g.beginPath(); g.ellipse(hw * 0.55, 6, 10, 4, -0.1, 0, 6.3); g.fill();
    }
    function drawGift(hw, hh, v) {
      // Wagen
      g.fillStyle = '#1d6e55'; rr(g, -hw + 2, -hh + 4, hw * 2 - 4, hh * 2 - 8, 8); g.fill();
      g.fillStyle = '#23262f';
      for (const q of [-hw + 14, hw - 14]) for (const s of [-1, 1]) { rr(g, q - 7, s * (hh - 2) - 3, 14, 6, 3); g.fill(); }
      g.strokeStyle = '#7f5b32'; g.lineWidth = 3; g.beginPath(); g.moveTo(hw - 3, 0); g.lineTo(hw + 0, 0); g.stroke();
      const n = v.len, bw = (hw * 2 - 8) / n;
      for (let k = 0; k < n; k++) {
        const col = GIFT_COL[(v.k + k) % GIFT_COL.length], sz = Math.min(bw - 4, 33) - (k % 2 ? 3 : 0);
        const bx = -hw + 4 + bw * (k + 0.5);
        g.fillStyle = col; rr(g, bx - sz / 2, -sz / 2, sz, sz, 4); g.fill();
        g.fillStyle = 'rgba(255,255,255,.28)'; rr(g, bx - sz / 2, -sz / 2, sz, sz * 0.3, 3); g.fill();
        g.fillStyle = (k + v.k) % 2 ? '#fff' : '#ef476f';
        g.fillRect(bx - 2, -sz / 2, 4, sz); g.fillRect(bx - sz / 2, -2, sz, 4);
        g.beginPath(); g.arc(bx - 4, -1, 3.4, 0, 6.3); g.arc(bx + 4, -1, 3.4, 0, 6.3); g.fill();
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(bx, -1, 1.6, 0, 6.3); g.fill();
      }
    }

    function drawVehicles() {
      const order = vs.map((_, i) => i).sort((a, b) => (a === sel) - (b === sel) || (drag && (a === drag.i) - (b === drag.i)));
      for (const i of order) {
        const v = vs[i];
        if (v.kind === 'sled' && exitAnim && exitAnim.x !== undefined && exitAnim.wait <= 0) continue; // wird separat gezeichnet
        const ax = v.h ? BX + v.vp * CS : BX + v.x * CS, ay = v.h ? BY + v.y * CS : BY + v.vp * CS;
        let wob = 0;
        const b = bumps[i];
        if (b) wob = b.side ? Math.sin(b.t * 40) * 0.05 * (1 - b.t / 0.25) : Math.sin(b.t * 50) * 0.03 * (1 - b.t / 0.25);
        let ox = 0, oy = 0;
        if (b && !b.side) { const k = Math.sin(b.t * 40) * 2.5 * (1 - b.t / 0.25) * b.d; if (v.h) ox = k; else oy = k; }
        drawVehicle(v, ax + ox, ay + oy, { wob, lift: drag && drag.i === i });
        if (blink[i] > 0) {
          const a = Math.min(1, blink[i] / 0.3) * (0.55 + 0.45 * Math.sin(time * 40)), L = v.len * CS;
          g.save(); g.fillStyle = `rgba(255,255,255,${0.35 * a})`; rr(g, ax + 2, ay + 2, (v.h ? L : CS) - 4, (v.h ? CS : L) - 4, 10); g.fill();
          g.strokeStyle = RED; g.globalAlpha = Math.max(0, a); g.lineWidth = 4; g.shadowColor = RED; g.shadowBlur = 10; g.stroke(); g.restore();
        }
        if (i === sel && !busy) drawSelection(v, ax + ox, ay + oy);
      }
      if (hint && !busy) drawHint();
    }
    function drawSelection(v, ax, ay) {
      const L = v.len * CS, pulse = 0.5 + Math.sin(time * 6) * 0.5;
      const bx = ax + 1, by = ay + 1, bw = (v.h ? L : CS) - 2, bh = (v.h ? CS : L) - 2;
      g.save(); g.strokeStyle = GOLD; g.lineWidth = 3; g.shadowColor = GOLD; g.shadowBlur = 8 + pulse * 8;
      rr(g, bx + 1, by + 1, bw - 2, bh - 2, 10); g.stroke(); g.restore();
      // Pfeile, wohin es geht
      const r = rangeOf(v.k), cx = ax + (v.h ? L / 2 : CS / 2), cy = ay + (v.h ? CS / 2 : L / 2);
      const can = [r.lo < pos[v.k], r.hi > pos[v.k]];
      g.fillStyle = GOLD;
      [-1, 1].forEach((s, k) => {
        if (!can[k]) return;
        const off = (v.h ? L : L) / 2 + 2 + pulse * 3;
        const px = v.h ? cx + s * off : cx, py = v.h ? cy : cy + s * off;
        g.beginPath();
        if (v.h) { g.moveTo(px + s * 6, py); g.lineTo(px - s * 1, py - 7); g.lineTo(px - s * 1, py + 7); }
        else { g.moveTo(px, py + s * 6); g.lineTo(px - 7, py - s * 1); g.lineTo(px + 7, py - s * 1); }
        g.closePath(); g.fill();
      });
    }
    function drawHint() {
      const v = vs[hint.i], L = v.len * CS, pulse = 0.5 + Math.sin(time * 7) * 0.5;
      const tx = v.h ? BX + hint.to * CS : BX + v.x * CS, ty = v.h ? BY + v.y * CS : BY + hint.to * CS;
      g.save(); g.setLineDash([7, 5]); g.lineDashOffset = -time * 20; g.strokeStyle = GREEN; g.lineWidth = 3;
      g.shadowColor = GREEN; g.shadowBlur = 6 + pulse * 8;
      rr(g, tx + 2, ty + 2, (v.h ? L : CS) - 4, (v.h ? CS : L) - 4, 10); g.stroke(); g.restore();
      // Pfeil in Zugrichtung
      const s = hint.to > pos[hint.i] ? 1 : -1;
      const mx = v.h ? BX + (pos[hint.i] + v.len / 2) * CS : BX + (v.x + 0.5) * CS, my = v.h ? BY + (v.y + 0.5) * CS : BY + (pos[hint.i] + v.len / 2) * CS;
      g.fillStyle = GREEN; g.globalAlpha = 0.9;
      const m = (Math.abs(hint.to - pos[hint.i]) * CS) / 2 + pulse * 5;
      const px = v.h ? mx + s * (m + 8) : mx, py = v.h ? my : my + s * (m + 8);
      g.beginPath();
      if (v.h) { g.moveTo(px + s * 10, py); g.lineTo(px - s * 4, py - 11); g.lineTo(px - s * 4, py + 11); }
      else { g.moveTo(px, py + s * 10); g.lineTo(px - 11, py - s * 4); g.lineTo(px + 11, py - s * 4); }
      g.closePath(); g.fill(); g.globalAlpha = 1;
    }

    function btn(name, label, sub, on = true) {
      const b = BUTTONS[name], pr = press && press.name === name ? Math.max(0, 1 - press.t / 0.15) : 0;
      const y = b.y + pr * 2;
      g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, b.x, b.y + 4, b.w, b.h, 14); g.fill();
      g.fillStyle = on ? (name === 'done' || name === 'doneSel' ? '#2a3b86' : '#243174') : '#1a2250'; rr(g, b.x, y, b.w, b.h, 14); g.fill();
      g.strokeStyle = on ? (name === 'hint' ? GOLD : 'rgba(142,202,230,.6)') : 'rgba(142,202,230,.2)'; g.lineWidth = 2; rr(g, b.x + 1, y + 1, b.w - 2, b.h - 2, 13); g.stroke();
      g.fillStyle = on ? '#fff' : '#7d88b8'; g.font = '700 15px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, b.x + b.w / 2, y + b.h / 2 + (sub ? -6 : 1));
      if (sub) { g.fillStyle = on ? GOLD : '#7d88b8'; g.font = '600 12px system-ui, sans-serif'; g.fillText(sub, b.x + b.w / 2, y + b.h / 2 + 11); }
    }
    function drawPlay() {
      drawBoard();
      // Titel
      g.fillStyle = '#fff'; g.font = '800 19px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(`Level ${lvl + 1} · ${NAMES[lvl]}`, W / 2, 30);
      g.fillStyle = ICE; g.font = '600 14px system-ui, sans-serif';
      const sub = exitAnim ? (exitAnim.moves <= exitAnim.prof ? `Profi! Nur ${exitAnim.moves} Züge!` : `Frei in ${exitAnim.moves} Zügen! Profi: ${exitAnim.prof}`)
        : hint ? `Tipp: noch ${hint.left} ${hint.left === 1 ? 'Zug' : 'Züge'} · folge dem grünen Rahmen`
        : lvl === 0 && !hist.length ? 'Zieh die Blöcke aus dem Weg!' : 'Bring den roten Schlitten nach rechts hinaus!';
      g.fillStyle = exitAnim || hint ? (exitAnim ? GOLD : GREEN) : ICE;
      g.fillText(sub, W / 2, 52);
      drawVehicles();
      // Info unter dem Hof
      const bm = bestMoves[lvl];
      g.fillStyle = ICE; g.font = '600 13px system-ui, sans-serif';
      g.fillText(`Züge: ${hist.length}   ·   Profi: ${LEVELS[lvl].min}   ·   Dein Bestwert: ${bm > 0 ? bm : '–'}`, W / 2, BY + BS + 30);
      btn('undo', '↶ Zurück', hist.length ? '' : '', hist.length > 0 && !busy);
      btn('reset', '⟲ Neu', '', !busy);
      const left = MAX_HINTS - hintsUsed[lvl];
      btn('hint', 'Tipp', `${left} übrig`, left > 0 && !busy);
      btn('menu', '▦ Level wählen', '', true);
      btn('done', 'Fertig für heute', '', true);
      g.fillStyle = 'rgba(142,202,230,.85)'; g.font = '500 13px system-ui, sans-serif';
      g.fillText(ctx.input.isTouch ? 'Block ziehen: er gleitet nur entlang seiner Achse.' : 'Maus: ziehen · Tab/B: wählen · Pfeile: schieben', W / 2, 572);
    }

    function lock(x, y) {
      g.fillStyle = '#7d88b8'; rr(g, x - 9, y - 4, 18, 14, 3); g.fill();
      g.strokeStyle = '#7d88b8'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 4, 6, Math.PI, 0); g.stroke();
      g.fillStyle = '#1a2250'; g.beginPath(); g.arc(x, y + 3, 2, 0, 6.3); g.fill();
    }
    function drawSelect() {
      fir(46, 120, 60); fir(W - 46, 120, 56); fir(78, 120, 40); fir(W - 80, 120, 36);
      g.fillStyle = GOLD; g.font = '800 30px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = GOLD; g.shadowBlur = 14; g.fillText('Schlitten frei!', W / 2, 40); g.shadowBlur = 0;
      g.fillStyle = ICE; g.font = '600 13px system-ui, sans-serif';
      g.fillText('Wähle einen Hof und befreie den Nikolaus', W / 2, 68);
      // Mini-Schlitten als Deko
      const sv = { len: 2, h: true, kind: 'sled', k: 0 };
      drawVehicle(sv, W / 2 - CS + Math.sin(time * 2) * 6, 80);
      const n = solvedCount();
      for (let i = 0; i < LEVELS.length; i++) {
        const t = TILE(i), open = unlocked(i), done = bestMoves[i] > 0, cur = i === cursor;
        const bmp = bumps['t' + i], sh = bmp ? Math.sin(bmp.t * 50) * 3 * (1 - bmp.t / 0.25) : 0;
        g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, t.x + sh, t.y + 4, t.w, t.h, 14); g.fill();
        g.fillStyle = done ? '#1f5a56' : open ? '#243174' : '#161d46'; rr(g, t.x + sh, t.y, t.w, t.h, 14); g.fill();
        g.strokeStyle = cur ? GOLD : done ? GREEN : open ? 'rgba(142,202,230,.55)' : 'rgba(142,202,230,.15)'; g.lineWidth = cur ? 3 : 2;
        rr(g, t.x + 1 + sh, t.y + 1, t.w - 2, t.h - 2, 13); g.stroke();
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (open) {
          g.fillStyle = '#fff'; g.font = '800 26px system-ui, sans-serif'; g.fillText(String(i + 1), t.x + t.w / 2 + sh, t.y + 30);
          g.fillStyle = ICE; g.font = '600 12px system-ui, sans-serif'; g.fillText(`Profi ${LEVELS[i].min}`, t.x + t.w / 2 + sh, t.y + 54);
          g.fillStyle = done ? GOLD : '#9aa6d6'; g.font = '700 12px system-ui, sans-serif';
          g.fillText(done ? `Du: ${bestMoves[i]}${bestMoves[i] <= LEVELS[i].min ? ' ★' : ''}` : 'neu', t.x + t.w / 2 + sh, t.y + 70);
        } else { lock(t.x + t.w / 2, t.y + 30); g.fillStyle = '#7d88b8'; g.font = '700 13px system-ui, sans-serif'; g.fillText(String(i + 1), t.x + t.w / 2, t.y + 60); }
      }
      // Sterne-Fortschritt
      const st = starsNow();
      g.font = '800 26px system-ui, sans-serif'; g.textAlign = 'center';
      for (let k = 0; k < 3; k++) { g.fillStyle = k < st ? GOLD : '#2c3a78'; g.fillText('★', W / 2 - 34 + k * 34, 468); }
      g.fillStyle = ICE; g.font = '600 13px system-ui, sans-serif';
      const need = n < 4 ? 4 : n < 8 ? 8 : 12;
      g.fillText(n >= 12 ? 'Alle Höfe befreit!' : `${n}/12 gelöst · bei ${need} Leveln gibt es ${'★'.repeat(st + 1)}`, W / 2, 500);
      btn('doneSel', 'Fertig für heute', '', true);
      g.fillStyle = 'rgba(142,202,230,.85)'; g.font = '500 13px system-ui, sans-serif';
      g.fillText(ctx.input.isTouch ? 'Tippe ein Level an' : 'Anklicken oder Pfeile + Leertaste', W / 2, 582);
    }

    // ---------- Schleife ----------
    ctx.loop((dt, t) => {
      time += dt;
      drawSnowBg(dt);
      // Gleiten
      for (const v of vs) {
        const d = v.tp - v.vp;
        if (Math.abs(d) < 0.002) v.vp = v.tp; else v.vp += d * Math.min(1, dt * (drag && drag.i === v.k ? 28 : 16));
      }
      for (const k of Object.keys(blink)) { blink[k] -= dt; if (blink[k] <= 0) delete blink[k]; }
      for (const k of Object.keys(bumps)) { bumps[k].t += dt; if (bumps[k].t > 0.25) delete bumps[k]; }
      if (press) { press.t += dt; if (press.t > 0.2) press = null; }
      if (mode === 'play') {
        if (exitAnim) updateExit(dt);
        drawPlay();
        if (exitAnim && exitAnim.wait <= 0) drawExitSled();
      } else drawSelect();
      // Partikel
      for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
      parts = parts.filter(p => p.life > 0);
      for (const p of parts) { g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;
    });

    function updateExit(dt) {
      const e = exitAnim;
      if (e.wait > 0) { e.wait -= dt; if (e.wait <= 0) { ctx.audio.sfx('swoosh'); ctx.audio.sfx('level'); } return; }
      e.t += dt; e.v += 620 * dt; e.x += e.v * dt;
      e.bells -= dt;
      if (e.bells <= 0) { e.bells = 0.09; ctx.audio.tone(1760 + Math.random() * 900, 0.12, 'sine', 0.1, null, 0); }
      const cy = BY + ROW * CS + CS / 2;
      emit(e.x + 4, cy + (Math.random() - 0.5) * 30, 2, { v: 40, vx: -60, life: 0.7, r: 3.2, c: '#ffffff' });
      emit(e.x + 8, cy + (Math.random() - 0.5) * 30, 1, { v: 20, vx: -30, life: 0.6, r: 2, c: GOLD });
      if (e.x > W + 30 && !e.done) {
        e.done = true;
        ctx.timeout(afterExit, 450);
      }
    }
    function drawExitSled() {
      const e = exitAnim, cy = BY + ROW * CS;
      drawVehicle(vs[0], e.x, cy, {});
    }

    updateHud();
    return { destroy() { parts = []; } };
  },
};
