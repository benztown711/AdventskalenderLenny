// Türchen 7: Sudoku-Werkstatt (Wichtel-Werkbank, goldene Linien)
import { generate, BOX, getLayout } from './gen.js';

export const howto = 'Jede Zahl muss in jeder Zeile, Spalte und Kiste genau einmal vorkommen. Wähle eine Größe, tippe ein Feld an und dann unten eine Zahl. Mit der Tastatur: Pfeiltasten und Ziffern, Entf löscht, N = Notizen, H = Tipp.';

const W = 372, H = 540;
const SIZES = [
  { n: 4, label: 'Mini 4x4', max: 1, cell: 80, level: 'Zahlen von 1 bis 4' },
  { n: 6, label: 'Mittel 6x6', max: 2, cell: 58, level: 'Zahlen von 1 bis 6' },
  { n: 9, label: 'Profi 9x9 leicht', max: 3, cell: 41, level: 'Zahlen von 1 bis 9' },
];
const GOLD = '#ffd166', RED = '#ef476f', GREEN = '#06d6a0', ICE = '#8ecae6', VIOLET = '#c77dff';
const LIGHTS = [RED, GOLD, GREEN, ICE, VIOLET];
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const GRID_TOP = 18, GRID_AREA = 369;
const BAR_Y = GRID_TOP + GRID_AREA + 14, BAR_H = 58, TOOL_Y = BAR_Y + BAR_H + 13, TOOL_H = 52;

const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    canvas.style.cursor = 'pointer';
    canvas.style.touchAction = 'none';

    let mode = 'menu', menuSel = 0, time = 0;
    // Spielzustand (wird bei startGame gesetzt)
    let size = SIZES[0], N = 4, BR = 2, BC = 2, L = null, cell = 80, gx = 0, gy = 0;
    let puzzle = [], sol = [], cells = [], locked = [], hinted = [], notes = [], wig = [];
    let sel = 0, noteMode = false, errors = 0, tips = 0, secs = 0, shownSecs = -1, done = false, warned = false;
    let flashes = [], sparks = [], press = {}, confirmMenu = 0;
    const flakes = Array.from({ length: 30 }, (_, i) => ({ x: (i * 97) % W, y: (i * 53) % H, v: 8 + (i % 5) * 4, r: 1 + (i % 3) * 0.6 }));

    ctx.input.pad({}); // keine Touch-Buttons nötig: alles per Tippen

    // ---------- Hilfsfunktionen ----------
    const best = n => ctx.load('s' + n, 0);
    const rowOf = i => (i / N) | 0, colOf = i => i % N;
    const cx = i => gx + colOf(i) * cell, cy = i => gy + rowOf(i) * cell;
    const wrong = i => cells[i] && cells[i] !== sol[i];
    const correctCount = d => { let k = 0; for (let i = 0; i < cells.length; i++) if (cells[i] === d && sol[i] === d) k++; return k; };
    const unitCells = i => [L.units[rowOf(i) * 3], L.units[colOf(i) * 3 + 1], L.units[L.box[i] * 3 + 2]];
    const unitDone = u => u.every(i => cells[i] === sol[i]);
    const hit = (p, x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    const popBtn = key => { press[key] = 0.18; };

    function burst(x, y, color, n = 10, speed = 120) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.3, v = 30 + Math.random() * speed;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + Math.random() * 0.3, color });
      }
    }
    const flash = (idxs, delay = 0) => flashes.push({ cells: idxs, t: -delay });
    const hud = () => ctx.hud.set(mode === 'play' ? { Zeit: fmt(secs), Fehler: errors } : {});

    // ---------- Menü -> Spiel ----------
    const CARD = { x: 16, w: 340, h: 112, y0: 128, gap: 14 };
    const cardY = i => CARD.y0 + i * (CARD.h + CARD.gap);

    function startGame(k) {
      size = SIZES[k]; N = size.n; [BR, BC] = BOX[N]; L = getLayout(N); cell = size.cell;
      const gs = N * cell; gx = (W - gs) / 2; gy = GRID_TOP + (GRID_AREA - gs) / 2;
      const r = generate(N);
      puzzle = r.puzzle; sol = r.solution; cells = puzzle.slice();
      locked = puzzle.map(v => v > 0); hinted = puzzle.map(() => false);
      notes = puzzle.map(() => 0); wig = puzzle.map(() => 0);
      errors = 0; tips = 0; secs = 0; time = 0; shownSecs = -1; done = false; warned = false; noteMode = false;
      flashes = []; sparks = []; confirmMenu = 0;
      sel = cells.findIndex((v, i) => !v && !locked[i]); if (sel < 0) sel = 0;
      mode = 'play'; hud();
      ctx.audio.sfx('swoosh');
    }

    // ---------- Aktionen ----------
    function placeEffects(i) {
      const v = cells[i];
      burst(cx(i) + cell / 2, cy(i) + cell / 2, GOLD, 8, 90);
      // Notizen dieser Zahl bei Nachbarn aufräumen
      for (const j of L.peers[i]) notes[j] &= ~(1 << (v - 1));
      // Fertige Zeile, Spalte, Kiste?
      let n = 0;
      for (const u of unitCells(i)) {
        if (!unitDone(u)) continue;
        flash(u, n * 0.12); n++;
        for (let k = 0; k < 4; k++) { const j = u[Math.floor(Math.random() * u.length)]; burst(cx(j) + cell / 2, cy(j) + cell / 2, LIGHTS[k % 5], 5, 140); }
      }
      if (n) {
        [659, 880, 1175].forEach((f, k) => ctx.audio.tone(f, 0.16, 'triangle', 0.16, null, k * 0.08));
        ctx.audio.sfx('coin');
      }
      if (v && correctCount(v) === N) { ctx.audio.tone(988, 0.12, 'sine', 0.12, 1319); ctx.toast(`Alle ${v} gesetzt!`, 900); }
      if (cells.every((x, k) => x === sol[k])) win();
    }

    function setNumber(d) {
      if (mode !== 'play' || done || ctx.paused || d < 1 || d > N) return;
      popBtn('n' + d);
      const i = sel;
      if (locked[i]) { ctx.audio.sfx('tick'); wig[i] = 0.3; return; }
      if (noteMode) {
        if (cells[i]) { ctx.toast('Erst Zahl löschen', 900); return; }
        notes[i] ^= 1 << (d - 1); ctx.audio.sfx('click'); return;
      }
      if (cells[i] === d) return;
      if (correctCount(d) === N) { ctx.audio.sfx('tick'); return; }
      cells[i] = d; notes[i] = 0;
      if (d === sol[i]) { ctx.audio.sfx('pop'); placeEffects(i); }
      else {
        errors++; wig[i] = 0.55; hud();
        ctx.audio.sfx('bad'); burst(cx(i) + cell / 2, cy(i) + cell / 2, RED, 8, 80);
        if (errors === 6 && size.max > 1 && !warned) { warned = true; ctx.toast('Ab jetzt 1 Stern weniger', 1800); }
      }
    }

    function clearCell() {
      if (mode !== 'play' || done || ctx.paused) return;
      popBtn('clear');
      const i = sel;
      if (locked[i]) { ctx.audio.sfx('tick'); wig[i] = 0.3; return; }
      if (cells[i]) { cells[i] = 0; ctx.audio.sfx('swoosh'); }
      else if (notes[i]) { notes[i] = 0; ctx.audio.sfx('swoosh'); }
    }

    function hint() {
      if (mode !== 'play' || done || ctx.paused) return;
      popBtn('hint');
      if (tips >= 3) { ctx.toast('Keine Tipps mehr übrig', 1000); ctx.audio.sfx('tick'); return; }
      const open = [];
      cells.forEach((v, i) => { if (!locked[i] && v !== sol[i]) open.push(i); });
      if (!open.length) return;
      const i = open.includes(sel) ? sel : open[Math.floor(Math.random() * open.length)];
      cells[i] = sol[i]; locked[i] = true; hinted[i] = true; notes[i] = 0; sel = i; tips++; hud();
      ctx.audio.sfx('power'); burst(cx(i) + cell / 2, cy(i) + cell / 2, VIOLET, 16, 150);
      if (tips === 2 && size.max > 1) ctx.toast('Ab dem 2. Tipp: 1 Stern weniger', 1800);
      placeEffects(i);
    }

    function toggleNotes() {
      if (mode !== 'play' || done || ctx.paused) return;
      noteMode = !noteMode; popBtn('note'); ctx.audio.sfx('click');
    }

    function backToMenu() {
      if (mode !== 'play' || done) return;
      popBtn('menu');
      if (confirmMenu <= 0) { confirmMenu = 2.2; ctx.audio.sfx('tick'); return; }
      mode = 'menu'; confirmMenu = 0; hud(); ctx.audio.sfx('swoosh');
    }

    function move(dr, dc) {
      const r = Math.max(0, Math.min(N - 1, rowOf(sel) + dr)), c = Math.max(0, Math.min(N - 1, colOf(sel) + dc));
      const i = r * N + c;
      if (i !== sel) { sel = i; ctx.audio.sfx('tick'); }
    }

    function win() {
      done = true;
      const all = Array.from({ length: N }, (_, r) => L.units[r * 3]);
      all.forEach((u, r) => flash(u, 0.2 + r * 0.07));
      for (let k = 0; k < 6; k++) ctx.timeout(() => burst(40 + Math.random() * (W - 80), 60 + Math.random() * 280, LIGHTS[k % 5], 16, 200), 150 + k * 120);
      ctx.audio.sfx('level');
      const calm = errors <= 5 && tips <= 1;
      const stars = calm ? size.max : Math.max(1, size.max - 1);
      const score = Math.max(100, Math.round({ 4: 300, 6: 600, 9: 1000 }[N] - secs * 2 - errors * 20 - tips * 50));
      let text;
      if (stars === size.max) {
        text = size.max === 1
          ? `${size.label} in ${fmt(secs)} gelöst! Mehr Sterne gibt es bei Mittel (2) und Profi (3).`
          : `${size.label} in ${fmt(secs)} gelöst! Mehr geht nicht: volle Sterne.`;
      } else {
        text = `${size.label} in ${fmt(secs)} gelöst. Für alle ${size.max} Sterne: höchstens 5 Fehler (du: ${errors}) und höchstens 1 Tipp (du: ${tips}).`;
      }
      if (stars > best(N)) ctx.save('s' + N, stars);
      ctx.timeout(() => ctx.finish({ won: true, stars, score, text }), 1300);
    }

    // ---------- Eingabe ----------
    function toolLayout() {
      const m = 8, gap = 8, bw = (W - 2 * m - 3 * gap) / 4;
      return ['note', 'hint', 'clear', 'menu'].map((key, i) => ({ key, x: m + i * (bw + gap), y: TOOL_Y, w: bw, h: TOOL_H }));
    }
    function barLayout() {
      const m = N === 9 ? 4 : 8, gap = N === 9 ? 2 : 6, bw = (W - 2 * m - (N - 1) * gap) / N;
      return Array.from({ length: N }, (_, i) => ({ d: i + 1, x: m + i * (bw + gap), y: BAR_Y, w: bw, h: BAR_H }));
    }

    ctx.on(canvas, 'pointerdown', e => {
      e.preventDefault();
      const p = pos(e);
      if (ctx.paused || done) return;
      if (mode === 'menu') {
        SIZES.forEach((s, i) => { if (hit(p, CARD.x, cardY(i), CARD.w, CARD.h)) { menuSel = i; press['c' + i] = 0.2; startGame(i); } });
        return;
      }
      if (hit(p, gx, gy, N * cell, N * cell)) {
        const i = Math.floor((p.y - gy) / cell) * N + Math.floor((p.x - gx) / cell);
        if (i !== sel) ctx.audio.sfx('tick');
        sel = i; return;
      }
      for (const b of barLayout()) if (hit(p, b.x, b.y, b.w, b.h)) return setNumber(b.d);
      for (const b of toolLayout()) if (hit(p, b.x, b.y, b.w, b.h)) {
        if (b.key === 'note') toggleNotes(); else if (b.key === 'hint') hint(); else if (b.key === 'clear') clearCell(); else backToMenu();
        return;
      }
    });

    ctx.on(window, 'keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey || ctx.paused || done) return;
      const k = e.key;
      if (mode === 'menu') {
        if (k === 'ArrowUp') menuSel = (menuSel + 2) % 3;
        else if (k === 'ArrowDown') menuSel = (menuSel + 1) % 3;
        else if (k === 'Enter' || k === ' ') startGame(menuSel);
        else if (k >= '1' && k <= '3') { menuSel = +k - 1; startGame(menuSel); }
        else return;
        e.preventDefault(); return;
      }
      if (k === 'ArrowLeft') move(0, -1);
      else if (k === 'ArrowRight') move(0, 1);
      else if (k === 'ArrowUp') move(-1, 0);
      else if (k === 'ArrowDown') move(1, 0);
      else if (k >= '1' && k <= '9') setNumber(+k);
      else if (k === '0' || k === 'Delete' || k === 'Backspace') clearCell();
      else if (k === 'n' || k === 'N') toggleNotes();
      else if (k === 'h' || k === 'H') hint();
      else return;
      e.preventDefault();
    });

    // ---------- Zeichnen ----------
    function rr(x, y, w, h, r) {
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    function txt(s, x, y, size, color, weight = 700, align = 'center') {
      g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(s, x, y);
    }
    function star(x, y, r, on) {
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
      g.closePath();
      if (on) { g.fillStyle = GOLD; g.shadowColor = GOLD; g.shadowBlur = 8; g.fill(); g.shadowBlur = 0; }
      else { g.strokeStyle = 'rgba(255,209,102,.55)'; g.lineWidth = 1.6; g.stroke(); }
    }
    function garland() {
      g.strokeStyle = '#1f7a4d'; g.lineWidth = 2; g.beginPath();
      for (let x = 0; x <= W; x += 6) { const y = 6 + Math.sin(x / W * Math.PI * 6) * 3; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      for (let k = 0; k < 14; k++) {
        const x = 14 + k * 26.5, y = 8 + Math.sin(x / W * Math.PI * 6) * 3, on = Math.sin(time * 4 - k * 0.8) > -0.4, c = LIGHTS[k % 5];
        g.fillStyle = on ? c : '#44507f'; g.shadowColor = c; g.shadowBlur = on ? 8 : 0;
        g.beginPath(); g.arc(x, y + 2, 2.8, 0, 6.3); g.fill();
      }
      g.shadowBlur = 0;
    }
    function gridIcon(x, y, s, n) {
      const [br, bc] = BOX[n], c = s / n;
      g.fillStyle = '#121c4a'; g.fillRect(x, y, s, s);
      g.strokeStyle = 'rgba(255,209,102,.35)'; g.lineWidth = 1;
      for (let k = 1; k < n; k++) { g.beginPath(); g.moveTo(x + k * c, y); g.lineTo(x + k * c, y + s); g.moveTo(x, y + k * c); g.lineTo(x + s, y + k * c); g.stroke(); }
      g.strokeStyle = GOLD; g.lineWidth = 2;
      for (let k = 0; k <= n; k++) {
        if (k % bc === 0) { g.beginPath(); g.moveTo(x + k * c, y); g.lineTo(x + k * c, y + s); g.stroke(); }
        if (k % br === 0) { g.beginPath(); g.moveTo(x, y + k * c); g.lineTo(x + s, y + k * c); g.stroke(); }
      }
    }

    function drawMenu() {
      txt('Sudoku-Werkstatt', W / 2, 42, 30, GOLD, 800);
      txt('Jede Zahl genau einmal pro Zeile,', W / 2, 78, 14, '#c9d3f5', 500);
      txt('Spalte und Kiste. Welche Größe baust du?', W / 2, 97, 14, '#c9d3f5', 500);
      SIZES.forEach((s, i) => {
        const x = CARD.x, y = cardY(i), p = press['c' + i] > 0 ? 0.96 : 1, sl = menuSel === i;
        g.save(); g.translate(x + CARD.w / 2, y + CARD.h / 2); g.scale(p, p); g.translate(-(x + CARD.w / 2), -(y + CARD.h / 2));
        const gr = g.createLinearGradient(0, y, 0, y + CARD.h); gr.addColorStop(0, '#5a3a22'); gr.addColorStop(1, '#3a2416');
        rr(x, y, CARD.w, CARD.h, 16); g.fillStyle = gr; g.fill();
        g.lineWidth = sl ? 3 : 2; g.strokeStyle = sl ? '#fff3c4' : GOLD; g.shadowColor = GOLD; g.shadowBlur = sl ? 14 : 0; g.stroke(); g.shadowBlur = 0;
        gridIcon(x + 16, y + 16, 80, s.n);
        txt(s.label, x + 114, y + 32, s.n === 9 ? 20 : 24, '#fff3c4', 800, 'left');
        for (let k = 0; k < s.max; k++) star(x + 128 + k * 30, y + 62, 12, best(s.n) > k);
        txt(s.max === 1 ? '1 Stern möglich' : `bis zu ${s.max} Sterne möglich`, x + 114, y + 92, 14, GOLD, 600, 'left');
        g.restore();
      });
      txt('Tippen oder Taste 1, 2, 3', W / 2, 516, 13, '#8f9bc9', 500);
    }

    function drawPlay() {
      const gs = N * cell, selV = cells[sel], sr = rowOf(sel), sc = colOf(sel), sb = L.box[sel];
      // Werkbank-Brett
      const gr = g.createLinearGradient(0, gy, 0, gy + gs);
      gr.addColorStop(0, '#5f3d24'); gr.addColorStop(1, '#3b2415');
      rr(gx - 8, gy - 8, gs + 16, gs + 16, 12); g.fillStyle = gr; g.fill();
      g.strokeStyle = 'rgba(255,209,102,.55)'; g.lineWidth = 2; g.stroke();
      for (let i = 0; i < N * N; i++) {
        const x = cx(i), y = cy(i), r = rowOf(i), c = colOf(i);
        const wg = wig[i] > 0 ? Math.sin(wig[i] * 60) * 4 * Math.min(1, wig[i] / 0.3) : 0;
        g.fillStyle = locked[i] ? '#1d2c6b' : '#121c4a'; g.fillRect(x, y, cell, cell);
        if (r === sr || c === sc || L.box[i] === sb) { g.fillStyle = 'rgba(255,209,102,.11)'; g.fillRect(x, y, cell, cell); }
        const same = selV && cells[i] === selV && !wrong(i);
        if (same) { g.fillStyle = 'rgba(142,202,230,.26)'; g.fillRect(x, y, cell, cell); }
        if (wrong(i)) { g.fillStyle = 'rgba(239,71,111,.38)'; g.fillRect(x + wg, y, cell, cell); }
        if (i === sel) { g.fillStyle = 'rgba(255,209,102,.30)'; g.fillRect(x, y, cell, cell); }
        const v = cells[i];
        if (v) {
          const col = wrong(i) ? '#ff7d9a' : hinted[i] ? VIOLET : locked[i] ? '#ffe9a8' : ICE;
          if (same || i === sel) { g.shadowColor = same ? '#fff' : GOLD; g.shadowBlur = 10; }
          txt(String(v), x + cell / 2 + wg, y + cell / 2 + 1, cell * 0.6, col, locked[i] ? 800 : 700);
          g.shadowBlur = 0;
        } else if (notes[i]) {
          const fs = Math.min(cell / BC, cell / BR) * 0.62;
          for (let d = 1; d <= N; d++) if (notes[i] & (1 << (d - 1))) {
            const k = d - 1, nx = x + ((k % BC) + 0.5) * cell / BC, ny = y + ((Math.floor(k / BC)) + 0.5) * cell / BR;
            txt(String(d), nx, ny + 1, fs, selV === d ? '#fff' : '#9fb4e8', selV === d ? 800 : 600);
          }
        }
      }
      // Linien: dünn für Felder, goldig dick für Kisten
      g.strokeStyle = 'rgba(255,209,102,.28)'; g.lineWidth = 1;
      g.beginPath();
      for (let k = 1; k < N; k++) { g.moveTo(gx + k * cell, gy); g.lineTo(gx + k * cell, gy + gs); g.moveTo(gx, gy + k * cell); g.lineTo(gx + gs, gy + k * cell); }
      g.stroke();
      g.strokeStyle = GOLD; g.lineWidth = 2.5; g.beginPath();
      for (let k = 0; k <= N; k++) {
        if (k % BC === 0) { g.moveTo(gx + k * cell, gy); g.lineTo(gx + k * cell, gy + gs); }
        if (k % BR === 0) { g.moveTo(gx, gy + k * cell); g.lineTo(gx + gs, gy + k * cell); }
      }
      g.stroke();
      // Auswahl-Rahmen
      g.strokeStyle = '#fff3c4'; g.lineWidth = 2.5; g.shadowColor = GOLD; g.shadowBlur = 8;
      g.strokeRect(cx(sel) + 1.5, cy(sel) + 1.5, cell - 3, cell - 3); g.shadowBlur = 0;
      // Gold-Blitze fertiger Einheiten
      for (const f of flashes) f.cells.forEach((i, k) => {
        const u = (f.t - k * 0.045) / 0.5;
        if (u > 0 && u < 1) {
          const a = Math.sin(Math.PI * u);
          g.fillStyle = `rgba(255,214,102,${a * 0.8})`; g.fillRect(cx(i), cy(i), cell, cell);
          g.strokeStyle = `rgba(255,255,255,${a * 0.9})`; g.lineWidth = 2; g.strokeRect(cx(i) + 1, cy(i) + 1, cell - 2, cell - 2);
        }
      });

      // Zahlenleiste
      for (const b of barLayout()) {
        const d = b.d, full = correctCount(d) === N, left = N - correctCount(d);
        const pp = press['n' + d] > 0 ? 0.92 : 1, active = selV === d && !wrong(sel);
        g.save(); g.translate(b.x + b.w / 2, b.y + b.h / 2); g.scale(pp, pp); g.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
        rr(b.x, b.y, b.w, b.h, 9);
        const gg = g.createLinearGradient(0, b.y, 0, b.y + b.h);
        if (full) { gg.addColorStop(0, '#1a2a50'); gg.addColorStop(1, '#141f40'); } else { gg.addColorStop(0, active ? '#7a5a2c' : '#5a3a22'); gg.addColorStop(1, active ? '#523a1c' : '#3a2416'); }
        g.fillStyle = gg; g.fill(); g.lineWidth = 2; g.strokeStyle = full ? 'rgba(6,214,160,.7)' : active ? '#fff3c4' : 'rgba(255,209,102,.7)'; g.stroke();
        if (full) {
          g.strokeStyle = GREEN; g.lineWidth = 3.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
          const mx = b.x + b.w / 2, my = b.y + b.h / 2 - 2; g.moveTo(mx - 9, my); g.lineTo(mx - 2, my + 8); g.lineTo(mx + 11, my - 9); g.stroke();
        } else {
          txt(String(d), b.x + b.w / 2, b.y + b.h / 2 - 5, b.w > 46 ? 30 : 26, noteMode ? '#d6e2ff' : '#fff3c4', 800);
          txt(`noch ${left}`, b.x + b.w / 2, b.y + b.h - 10, b.w > 46 ? 11 : 9, '#c9a96c', 600);
        }
        g.restore();
      }
      // Werkzeuge
      for (const b of toolLayout()) {
        const pp = press[b.key] > 0 ? 0.92 : 1, on = b.key === 'note' && noteMode;
        let l1 = '', l2 = '', dim = false;
        if (b.key === 'note') { l1 = 'Notiz'; l2 = noteMode ? 'AN' : 'aus'; }
        else if (b.key === 'hint') { l1 = 'Tipp'; l2 = tips >= 3 ? 'leer' : `noch ${3 - tips}`; dim = tips >= 3; }
        else if (b.key === 'clear') { l1 = 'Löschen'; l2 = 'Feld leeren'; }
        else { l1 = 'Größe'; l2 = confirmMenu > 0 ? 'wirklich?' : 'wechseln'; }
        g.save(); g.translate(b.x + b.w / 2, b.y + b.h / 2); g.scale(pp, pp); g.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
        rr(b.x, b.y, b.w, b.h, 12);
        g.fillStyle = on ? '#2a6b52' : '#16225a'; g.fill(); g.lineWidth = 2;
        g.strokeStyle = on ? GREEN : b.key === 'menu' && confirmMenu > 0 ? RED : 'rgba(255,209,102,.7)'; g.stroke();
        g.globalAlpha = dim ? 0.45 : 1;
        txt(l1, b.x + b.w / 2, b.y + 19, 15, '#fff3c4', 800);
        txt(l2, b.x + b.w / 2, b.y + 38, 12, on ? '#b9ffe6' : '#9fb4e8', 600);
        g.globalAlpha = 1; g.restore();
      }
    }

    function draw() {
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1437'); bg.addColorStop(1, '#101c4c');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.5)';
      for (const f of flakes) { g.beginPath(); g.arc(f.x + Math.sin(time + f.y) * 4, f.y, f.r, 0, 6.3); g.fill(); }
      garland();
      if (mode === 'menu') drawMenu(); else drawPlay();
      for (const p of sparks) { g.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); g.fillStyle = p.color; g.fillRect(p.x - 2, p.y - 2, 4, 4); }
      g.globalAlpha = 1;
    }

    // ---------- Schleife ----------
    hud();
    ctx.loop(dt => {
      time += dt;
      if (mode === 'play' && !done) {
        const s = Math.floor(time);
        if (s !== shownSecs) { secs = s; shownSecs = s; hud(); }
      }
      if (confirmMenu > 0) confirmMenu -= dt;
      for (const k in press) if (press[k] > 0) press[k] -= dt;
      for (let i = 0; i < wig.length; i++) if (wig[i] > 0) wig[i] -= dt;
      for (const f of flashes) f.t += dt;
      flashes = flashes.filter(f => f.t < f.cells.length * 0.045 + 0.6);
      for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt; }
      sparks = sparks.filter(p => p.life > 0);
      for (const f of flakes) { f.y += f.v * dt; if (f.y > H) { f.y = -4; } }
      draw();
    });

    return { destroy() {} };
  },
};
