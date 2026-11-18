// Türchen 19: Klötzchen-Puzzle (Lege-Puzzle auf 8x8, Geschenk- und Eissteine)
import * as L from './logic.js';

export const howto = 'Zieh die Klötzchen unten mit Finger oder Maus ins Gitter. Volle Reihen und Spalten lösen sich auf! Tastatur: Tab/B = Form wechseln, Pfeile = bewegen, Leertaste = ablegen.';

const W = 360, H = 600, C = 40, GX = 20, GY = 76, N = L.N;
const TRAY_Y = 418, SLOT_W = 120, HOME_CS = 22, HOME_Y = 508;
const COLORS = L.COLORS, GOLD = '#ffd166';

function shade(hex, amt) { // amt -1..1: dunkler/heller
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
  return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
function starPath(g, cx, cy, R) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.45 : R; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.closePath();
}

// ein glänzender Stein; (x,y) = linke obere Ecke, s = Kantenlänge
function block(g, x, y, s, ci, star, t) {
  const col = COLORS[ci], p = Math.max(1, s * 0.04), r = s * 0.22;
  const gr = g.createLinearGradient(x, y, x + s * 0.4, y + s);
  gr.addColorStop(0, shade(col, 0.35)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, -0.35));
  g.fillStyle = gr; rr(g, x + p, y + p, s - 2 * p, s - 2 * p, r); g.fill();
  g.lineWidth = Math.max(1, s * 0.05); g.strokeStyle = shade(col, -0.5); g.globalAlpha *= 0.6; g.stroke(); g.globalAlpha /= 0.6;
  if (ci % 2 === 0) { // Geschenk: Schleifenband
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.fillRect(x + s * 0.43, y + p * 2, s * 0.14, s - p * 4); g.fillRect(x + p * 2, y + s * 0.43, s - p * 4, s * 0.14);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + s * 0.57, y + p * 2, s * 0.03, s - p * 4); g.fillRect(x + p * 2, y + s * 0.57, s - p * 4, s * 0.03);
  } else { // Eis: Facette
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = Math.max(1, s * 0.04);
    rr(g, x + s * 0.22, y + s * 0.22, s * 0.56, s * 0.56, s * 0.08); g.stroke();
    g.beginPath(); g.moveTo(x + s * 0.22, y + s * 0.22); g.lineTo(x + s * 0.1, y + s * 0.1); g.moveTo(x + s * 0.78, y + s * 0.78); g.lineTo(x + s * 0.9, y + s * 0.9); g.stroke();
  }
  // Glanz oben links
  const gl = g.createLinearGradient(x, y, x, y + s * 0.5);
  gl.addColorStop(0, 'rgba(255,255,255,.65)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gl; rr(g, x + s * 0.12, y + s * 0.08, s * 0.76, s * 0.32, s * 0.14); g.fill();
  if (star) {
    const pulse = 1 + Math.sin(t * 6) * 0.08;
    g.save(); g.shadowColor = '#fff3b0'; g.shadowBlur = s * 0.35;
    starPath(g, x + s / 2, y + s / 2 + s * 0.02, s * 0.33 * pulse); g.fillStyle = '#fff3b0'; g.fill();
    g.shadowBlur = 0; g.lineWidth = Math.max(1, s * 0.05); g.strokeStyle = '#e09f1f'; g.stroke(); g.restore();
  }
}

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none';
    const rng = Math.random;
    const board = L.newBoard();
    const st = { streak: 0, miss: 0 };
    let score = 0, shown = 0, over = false, time = 0, lastShownHud = -1;
    const pops = Array.from({ length: N }, () => Array(N).fill(0));
    let ghosts = [], parts = [], floaters = [], banner = null, flash = 0;
    let snow = Array.from({ length: 26 }, () => ({ x: rng() * W, y: rng() * H, r: 0.6 + rng() * 1.6, v: 6 + rng() * 14, ph: rng() * 6 }));
    let held = null; // { i, cx, cy, col, row, valid, lines, kb }
    const kb = { on: false, sel: 0, x: 3, y: 3 };
    let setNo = 0;

    const slots = [0, 1, 2].map(i => ({ piece: null, x: SLOT_W * i + SLOT_W / 2, y: HOME_Y, cs: HOME_CS, home: { x: SLOT_W * i + SLOT_W / 2, y: HOME_Y }, fits: true }));

    function refill() {
      const set = L.genSet(board, score, rng);
      set.forEach((p, i) => { slots[i].piece = p; slots[i].x = slots[i].home.x + (i - 1) * 40; slots[i].y = HOME_Y + 130; slots[i].cs = HOME_CS * 0.6; });
      setNo++;
      refits();
    }
    function refits() { slots.forEach(s => { s.fits = !!s.piece && L.fitsAnywhere(board, s.piece); }); }

    const hud = () => {
      const v = Math.round(shown);
      if (v === lastShownHud) return; lastShownHud = v;
      ctx.hud.set({ Punkte: v, Rekord: Math.max(ctx.best(), score) });
    };

    // ---------- Effekte ----------
    function burst(x, y, color, n = 10, spd = 140, life = 0.7) {
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.283, v = spd * (0.35 + rng());
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life, max: life, color, size: 2 + rng() * 3, star: rng() < 0.25 });
      }
    }
    function floatText(text, x, y, color = '#fff', size = 22, dur = 1.1) { floaters.push({ text, x, y, color, size, t: 0, dur }); }
    function setBanner(text, sub, mult) { banner = { text, sub, mult, t: 0, dur: 1.5 }; }

    // ---------- Halten / Ziehen ----------
    const pieceOf = i => slots[i]?.piece;
    function computeHeld(i, cx, cy, isKb) {
      const p = pieceOf(i); if (!p) return null;
      const col = Math.round((cx - p.w * C / 2 - GX) / C), row = Math.round((cy - p.h * C / 2 - GY) / C);
      const valid = L.canPlace(board, p, col, row);
      return { i, cx, cy, col, row, valid, lines: valid ? L.linesAfter(board, p, col, row) : null, kb: isKb };
    }
    function kbHeld() {
      const p = pieceOf(kb.sel); if (!p) return null;
      kb.x = Math.max(0, Math.min(N - p.w, kb.x)); kb.y = Math.max(0, Math.min(N - p.h, kb.y));
      return computeHeld(kb.sel, GX + kb.x * C + p.w * C / 2, GY + kb.y * C + p.h * C / 2, true);
    }
    let pointerId = null, lift = 56;
    function dragTo(e) {
      const q = pos(e);
      const px = Math.max(0, Math.min(W, q.x)), py = Math.max(0, Math.min(H, q.y));
      const p = pieceOf(held.i);
      held = computeHeld(held.i, px, py - lift - p.h * C / 2, false);
      held.px = px; held.py = py;
    }
    ctx.on(canvas, 'pointerdown', e => {
      if (over || ctx.paused) return;
      ctx.audio.unlock();
      const q = pos(e);
      if (q.y < TRAY_Y - 30) return;
      let i = Math.max(0, Math.min(2, Math.floor(q.x / SLOT_W)));
      if (!slots[i].piece) { // nächste belegte Ablage in Reichweite nehmen
        const alt = [0, 1, 2].filter(k => slots[k].piece && Math.abs(slots[k].home.x - q.x) < SLOT_W * 0.9).sort((a, b) => Math.abs(slots[a].home.x - q.x) - Math.abs(slots[b].home.x - q.x));
        if (!alt.length) return; i = alt[0];
      }
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      pointerId = e.pointerId; kb.on = false;
      lift = e.pointerType === 'mouse' ? 44 : 60;
      held = { i }; dragTo(e);
      ctx.audio.sfx('click');
    });
    ctx.on(canvas, 'pointermove', e => { if (held && !held.kb && e.pointerId === pointerId) dragTo(e); });
    const release = e => {
      if (!held || held.kb || e.pointerId !== pointerId) return;
      pointerId = null;
      const h = held; held = null;
      if (e.type === 'pointerup' && h.valid) place(h.i, h.col, h.row);
      else if (e.type === 'pointerup' && h.py > TRAY_Y - 20) ctx.audio.sfx('swoosh'); // zurückgelegt
      else { ctx.audio.sfx('bad'); }
    };
    ctx.on(canvas, 'pointerup', release);
    ctx.on(canvas, 'pointercancel', release);

    // ---------- Legen ----------
    function place(i, col, row) {
      const p = slots[i].piece;
      const res = L.applyMove(board, p, col, row);
      slots[i].piece = null;
      const empty = L.isEmpty(board);
      const sc = L.scoreMove(st, res, p.cells.length, empty);
      score += sc.points;
      p.cells.forEach(([x, y]) => { pops[row + y][col + x] = 0.0001; });
      const cx = GX + (col + p.w / 2) * C, cy = GY + (row + p.h / 2) * C;
      ctx.audio.tone(330 + p.cells.length * 25, 0.09, 'triangle', 0.2, 200);
      p.cells.forEach(([x, y]) => burst(GX + (col + x + 0.5) * C, GY + (row + y + 0.5) * C, shade(COLORS[p.color], 0.4), 2, 60, 0.35));

      if (sc.lines > 0) {
        // Linien zerplatzen nacheinander (Reihenfolge: Position entlang der Linie)
        const order = res.cleared.map(c => ({ ...c, d: Math.hypot(c.x - (col + p.w / 2 - 0.5), c.y - (row + p.h / 2 - 0.5)) })).sort((a, b) => a.d - b.d);
        order.forEach((c, k) => ghosts.push({ x: c.x, y: c.y, cell: c.cell, delay: k * 0.035, t: 0, popped: false }));
        const base = 60 + Math.min(sc.mult, 8) * 2;
        const nTones = Math.min(5, sc.lines + (sc.mult > 1 ? 2 : 1));
        for (let k = 0; k < nTones; k++) ctx.audio.tone(ctx.audio.midi(base + k * 3) , 0.16, 'triangle', 0.22, null, k * 0.07);
        ctx.audio.sfx('pop');
        ctx.fx.shake(sc.mult >= 3 || sc.lines >= 3 ? 320 : 180);
        const mx = GX + N * C / 2, my = GY + N * C / 2 - 20;
        if (sc.mult >= 2) {
          setBanner(`COMBO x${sc.mult}!`, `+${sc.points}`, sc.mult);
          for (let k = 0; k < 20 + sc.mult * 8; k++) burst(mx, my, [GOLD, '#ef476f', '#8ecae6', '#06d6a0', '#c77dff'][k % 5], 1, 260, 1.0);
          ctx.audio.tone(ctx.audio.midi(72 + Math.min(sc.mult, 8) * 2), 0.35, 'square', 0.14, ctx.audio.midi(84 + Math.min(sc.mult, 8) * 2), 0.18);
        } else floatText(`+${sc.points}`, cx, cy - 10, GOLD, 24);
        if (sc.lines >= 2) floatText(sc.lines === 2 ? 'Doppelt!' : sc.lines === 3 ? 'Dreifach!' : 'Mega!', cx, cy - 40, '#8ecae6', 20);
        if (sc.starBonus) { floatText(`Stern +${sc.starBonus}`, GX + N * C / 2, GY + 30, '#fff3b0', 20, 1.4); ctx.audio.sfx('coin'); ctx.fx.emojiBurst?.('⭐'); }
        if (sc.emptyBonus) {
          ctx.timeout(() => { setBanner('BRETT LEER!', `+${sc.emptyBonus}`, 5); ctx.audio.sfx('level'); ctx.fx.confetti(); for (let k = 0; k < 60; k++) burst(mx, my, [GOLD, '#fff', '#8ecae6'][k % 3], 1, 300, 1.2); }, 350);
        }
      } else floatText(`+${sc.points}`, cx, cy - 6, 'rgba(255,255,255,.8)', 16, 0.7);

      if (st.streak > 0 && sc.lines === 0 && st.miss === 0 && st.streak === 0) { /* Serie zerbrochen */ }
      shown = Math.max(shown, score - sc.points);
      if (slots.every(s => !s.piece)) refill(); else refits();
      kb.sel = nextSel(i, 1);
      // Spielende?
      if (slots.every(s => !s.piece || !s.fits)) endGame();
    }
    function nextSel(from, dir) {
      for (let k = 1; k <= 3; k++) { const j = ((from + dir * k) % 3 + 3) % 3; if (slots[j].piece) return j; }
      return from;
    }

    function endGame() {
      over = true; held = null;
      ctx.timeout(() => { ctx.toast('Kein Platz mehr!', 1600); ctx.audio.sfx('bad'); }, 700);
      ctx.timeout(() => {
        const stars = L.starsFor(score);
        const nxt = L.STAR_POINTS[stars];
        ctx.finish({
          won: stars >= 1, stars, score,
          text: stars >= 3 ? 'Meisterhaft! Du bist ein echter Klötzchen-Profi!'
            : `Es gibt keinen Platz mehr. Noch ${nxt - score} Punkte bis zum ${stars + 1}. Stern. Tipp: Sammle Combos mit Serien!`,
        });
      }, 1900);
    }

    // ---------- Tastatur ----------
    function kbSelect(dir) {
      if (over) return;
      if (!kb.on) { kb.on = true; held = null; if (!slots[kb.sel].piece || !slots[kb.sel].fits) kb.sel = [0, 1, 2].find(i => slots[i].piece && slots[i].fits) ?? [0, 1, 2].find(i => slots[i].piece) ?? 0; kbCenter(); return; }
      kb.sel = nextSel(kb.sel, dir); kbCenter(); ctx.audio.sfx('click');
    }
    function kbCenter() { const p = pieceOf(kb.sel); if (p) { kb.x = Math.max(0, Math.min(N - p.w, kb.x)); kb.y = Math.max(0, Math.min(N - p.h, kb.y)); } }
    function kbMove(name) {
      if (over || ctx.paused) return;
      if (!kb.on) { kbSelect(1); return; }
      const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[name]; if (!d) return;
      kb.x += d[0]; kb.y += d[1]; kbCenter(); ctx.audio.sfx('tick');
    }
    function kbPlace() {
      if (over || ctx.paused) return;
      if (!kb.on) { kbSelect(1); return; }
      const h = kbHeld(); if (!h) return;
      if (h.valid) { place(h.i, h.col, h.row); } else { ctx.audio.sfx('bad'); ctx.fx.shake(120); }
    }
    ctx.input.onPress(n => { if (n === 'a') kbPlace(); else if (n === 'b') kbSelect(1); else kbMove(n); });
    ctx.on(window, 'keydown', e => { if (e.key === 'Tab') { e.preventDefault(); if (!e.repeat) kbSelect(e.shiftKey ? -1 : 1); } });
    let rep = { name: null, t: 0 };

    // ---------- Zeichnen ----------
    function draw(dt) {
      const t = time;
      g.fillStyle = '#0b1437'; g.fillRect(0, 0, W, H);
      const bg = g.createRadialGradient(W / 2, 200, 20, W / 2, 260, 420); bg.addColorStop(0, 'rgba(60,80,170,.35)'); bg.addColorStop(1, 'rgba(11,20,55,0)');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      for (const s of snow) { g.globalAlpha = 0.35 + 0.3 * Math.sin(t * 2 + s.ph); g.fillStyle = '#e8f4ff'; g.beginPath(); g.arc(s.x + Math.sin(t + s.ph) * 6, s.y, s.r, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;

      // Kopf: Punkte und Serie
      g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '600 12px system-ui, sans-serif'; g.fillText('PUNKTE', 22, 30);
      g.fillStyle = '#fff'; g.font = '800 34px system-ui, sans-serif'; g.fillText(String(Math.round(shown)), 22, 62);
      g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '600 12px system-ui, sans-serif';
      g.fillText('SERIE', W - 22, 30);
      const sx = W - 22;
      if (st.streak > 0) {
        g.fillStyle = GOLD; g.font = '800 26px system-ui, sans-serif'; g.fillText(`x${st.streak}`, sx, 58);
        for (let k = 0; k < 3; k++) { g.fillStyle = k < 3 - st.miss ? GOLD : 'rgba(255,255,255,.2)'; g.beginPath(); g.arc(sx - 52 - k * 12, 50, 4, 0, 6.3); g.fill(); }
      } else { g.fillStyle = 'rgba(255,255,255,.3)'; g.font = '700 22px system-ui, sans-serif'; g.fillText('–', sx, 56); }

      // Brett
      g.fillStyle = '#121f52'; rr(g, GX - 6, GY - 6, N * C + 12, N * C + 12, 14); g.fill();
      g.strokeStyle = 'rgba(142,202,230,.35)'; g.lineWidth = 2; g.stroke();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        g.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.09)';
        rr(g, GX + x * C + 1.5, GY + y * C + 1.5, C - 3, C - 3, 7); g.fill();
      }
      // fast volle Linien als Hinweis (7 von 8): sachte Markierung
      // Vorschau-Linien
      const hl = held && held.valid ? held.lines : null;
      if (hl) {
        const pulse = 0.28 + Math.sin(t * 9) * 0.1;
        g.fillStyle = `rgba(255,209,102,${pulse})`; g.strokeStyle = 'rgba(255,230,160,.9)'; g.lineWidth = 2;
        hl.rows.forEach(y => { rr(g, GX - 2, GY + y * C + 1, N * C + 4, C - 2, 9); g.fill(); g.stroke(); });
        hl.cols.forEach(x => { rr(g, GX + x * C + 1, GY - 2, C - 2, N * C + 4, 9); g.fill(); g.stroke(); });
      }
      // Steine
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const c = board[y][x]; if (!c) continue;
        let s = C;
        if (pops[y][x] > 0) { pops[y][x] += dt; const k = pops[y][x] / 0.22; if (k >= 1) pops[y][x] = 0; else s = C * (1 + Math.sin(k * Math.PI) * 0.18); }
        const inHl = hl && (hl.rows.includes(y) || hl.cols.includes(x));
        if (inHl) s = C * (1 + Math.sin(t * 12) * 0.04);
        block(g, GX + x * C + (C - s) / 2, GY + y * C + (C - s) / 2, s, c.c, c.star, t);
      }
      // Schatten-Vorschau
      if (held) {
        const p = pieceOf(held.i);
        if (p && held.valid) {
          g.globalAlpha = 0.5;
          p.cells.forEach(([x, y], k) => block(g, GX + (held.col + x) * C, GY + (held.row + y) * C, C, p.color, k === p.star, t));
          g.globalAlpha = 0.35; g.strokeStyle = '#fff'; g.lineWidth = 2;
          p.cells.forEach(([x, y]) => { rr(g, GX + (held.col + x) * C + 2, GY + (held.row + y) * C + 2, C - 4, C - 4, 8); g.stroke(); });
          g.globalAlpha = 1;
        } else if (p && held.kb) {
          g.globalAlpha = 0.45; g.fillStyle = '#ef476f';
          p.cells.forEach(([x, y]) => { rr(g, GX + (held.col + x) * C + 3, GY + (held.row + y) * C + 3, C - 6, C - 6, 8); g.fill(); });
          g.globalAlpha = 1;
        }
      }
      // verschwindende Steine
      ghosts = ghosts.filter(gh => gh.t < 0.4);
      for (const gh of ghosts) {
        gh.t += dt; const lt = gh.t - gh.delay;
        const cx = GX + (gh.x + 0.5) * C, cy = GY + (gh.y + 0.5) * C;
        if (lt < 0) { block(g, cx - C / 2, cy - C / 2, C, gh.cell.c, gh.cell.star, t); continue; }
        if (!gh.popped) { gh.popped = true; burst(cx, cy, COLORS[gh.cell.c], 6, 170, 0.6); if (gh.cell.star) burst(cx, cy, '#fff3b0', 10, 220, 0.9); }
        const k = lt / 0.26; if (k >= 1) continue;
        const s = C * (k < 0.3 ? 1 + k * 0.9 : 1.27 * (1 - (k - 0.3) / 0.7));
        g.globalAlpha = 1 - k * k; block(g, cx - s / 2, cy - s / 2, Math.max(1, s), gh.cell.c, gh.cell.star, t); g.globalAlpha = 1;
      }

      // Ablage
      g.fillStyle = 'rgba(255,255,255,.05)'; rr(g, 8, TRAY_Y, W - 16, 172, 18); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1.5; g.stroke();
      slots.forEach((s, i) => {
        if (kb.on && !over && kb.sel === i && s.piece) { g.strokeStyle = GOLD; g.lineWidth = 2.5; g.setLineDash([6, 5]); rr(g, s.home.x - 54, TRAY_Y + 12, 108, 148, 14); g.stroke(); g.setLineDash([]); }
      });
      // Formen (gehaltene zuletzt)
      const order = [0, 1, 2].filter(i => !(held && held.i === i)); if (held) order.push(held.i);
      for (const i of order) {
        const s = slots[i], p = s.piece; if (!p) continue;
        const isHeld = held && held.i === i;
        const tx = isHeld ? held.cx : s.home.x, ty = isHeld ? held.cy : s.home.y, tcs = isHeld ? C : HOME_CS;
        const k = 1 - Math.exp(-dt * (isHeld ? 40 : 14));
        s.x += (tx - s.x) * k; s.y += (ty - s.y) * k; s.cs += (tcs - s.cs) * k;
        const cs = s.cs, x0 = s.x - p.w * cs / 2, y0 = s.y - p.h * cs / 2;
        if (isHeld) { // Schatten unter der schwebenden Form
          g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(s.x, y0 + p.h * cs + 14, p.w * cs * 0.4, 7, 0, 0, 6.3); g.fill();
        }
        const bob = isHeld ? Math.sin(t * 5) * 1.5 : 0;
        g.globalAlpha = s.fits || isHeld ? 1 : 0.35;
        p.cells.forEach(([x, y], kk) => block(g, x0 + x * cs, y0 + y * cs + bob, cs, p.color, kk === p.star, t));
        g.globalAlpha = 1;
      }
      if (!held && !over && !ctx.input.isTouch && setNo === 1 && score === 0) {
        g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '600 13px system-ui, sans-serif'; g.fillText('Zieh ein Klötzchen ins Gitter', W / 2, TRAY_Y - 4);
      }

      // Partikel
      parts = parts.filter(p => p.life > 0);
      for (const p of parts) {
        p.life -= dt; p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.color;
        if (p.star) { starPath(g, p.x, p.y, p.size * 1.6); g.fill(); } else g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      g.globalAlpha = 1;
      // Schwebende Texte
      floaters = floaters.filter(f => f.t < f.dur);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const f of floaters) {
        f.t += dt; const k = f.t / f.dur;
        g.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
        g.font = `800 ${f.size}px system-ui, sans-serif`; g.lineWidth = 4; g.strokeStyle = 'rgba(11,20,55,.85)';
        const y = f.y - k * 40; g.strokeText(f.text, f.x, y); g.fillStyle = f.color; g.fillText(f.text, f.x, y);
      }
      g.globalAlpha = 1;
      // COMBO-Banner
      if (banner) {
        banner.t += dt; const k = banner.t / banner.dur;
        if (k >= 1) banner = null; else {
          const pop = k < 0.18 ? (k / 0.18) * 1.25 : k < 0.3 ? 1.25 - (k - 0.18) / 0.12 * 0.25 : 1;
          const sz = 40 + Math.min(banner.mult, 6) * 4;
          g.save(); g.translate(W / 2, GY + N * C / 2 - 20); g.rotate(-0.06 + Math.sin(t * 8) * 0.02); g.scale(pop, pop);
          g.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
          g.font = `900 ${sz}px system-ui, sans-serif`; g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = '#0b1437';
          g.strokeText(banner.text, 0, 0);
          const gr = g.createLinearGradient(0, -sz / 2, 0, sz / 2); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(1, banner.mult >= 4 ? '#ef476f' : '#ffb703');
          g.fillStyle = gr; g.fillText(banner.text, 0, 0);
          g.font = '800 24px system-ui, sans-serif'; g.lineWidth = 6; g.strokeText(banner.sub, 0, sz * 0.8); g.fillStyle = '#fff'; g.fillText(banner.sub, 0, sz * 0.8);
          g.restore();
        }
      }
      if (over) { g.fillStyle = 'rgba(11,20,55,.45)'; g.fillRect(0, 0, W, H); }
    }

    refill();
    ctx.loop(dt => {
      time += dt;
      for (const s of snow) { s.y += s.v * dt; if (s.y > H + 4) { s.y = -4; s.x = rng() * W; } }
      if (shown < score) shown = Math.min(score, shown + Math.max(dt * 260, (score - shown) * dt * 6));
      // Tasten-Wiederholung (Pfeile gedrückt halten)
      if (kb.on && !over && !ctx.paused) {
        const n = ['left', 'right', 'up', 'down'].find(k => ctx.input.down(k));
        if (n) { if (rep.name !== n) { rep = { name: n, t: -0.28 }; } rep.t += dt; if (rep.t >= 0.09) { rep.t -= 0.09; kbMove(n); } } else rep.name = null;
        held = kbHeld();
      }
      hud();
      draw(dt);
    });
    hud();
    return { destroy() { held = null; } };
  },
};
