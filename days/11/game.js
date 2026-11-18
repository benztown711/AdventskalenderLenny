// Türchen 11: Knoten-Chaos – entwirre die Lichterkette, bis sich kein Kabel mehr kreuzt.
import { FIELD, LEVELS, generate, findCrossings, countCrossings } from './logik.js';

export const howto = 'Zieh die Glühbirnen mit Finger oder Maus herum, bis sich keine Kabel mehr kreuzen. Tastatur: Tab oder A wählt eine Birne, Pfeiltasten schieben sie, H gibt einen Tipp.';

const W = 360, H = 560, R = 18, HIT = 32, MIN_D = 38, STEP = 10;
const COLORS = ['#ef476f', '#ffd166', '#06d6a0', '#8ecae6', '#c77dff', '#ff9f68'];
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96]; // Pentatonik
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const HINTS_PER_LEVEL = 2;
const BTN_HINT = { x: 16, y: 496, w: 160, h: 44 }, BTN_END = { x: 184, y: 496, w: 160, h: 44 };
const inBox = (b, p) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
const clampX = x => Math.max(FIELD.x0, Math.min(FIELD.x1, x));
const clampY = y => Math.max(FIELD.y0, Math.min(FIELD.y1, y));

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none';
    let level = 1, done = 0, moves = 0, time = 0, clock = 0;
    let pts = [], edges = [], sol = [], springs = [], lit = [], crossInfo = { count: 0, bad: new Set() };
    let state = 'play'; // play | win | end
    let drag = -1, grabDx = 0, grabDy = 0, dragMoved = false, sel = -1;
    let hintsLeft = HINTS_PER_LEVEL, endArmed = 0, pressedBtn = null, pendingCheck = false;
    let sparks = [], flakes = [], pulse = 0, shown = -1, levelTime = 0;
    const reached = ctx.load('level', 0) || 0;
    for (let i = 0; i < 40; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 1.6, v: 6 + Math.random() * 14, ph: Math.random() * 6 });

    const secs = () => Math.floor(time);
    const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    let hudKey = '';
    function hud() {
      const k = `${level}|${moves}|${secs()}`;
      if (k === hudKey) return; hudKey = k;
      ctx.hud.set({ Level: `${level}/${LEVELS.length}`, Züge: moves, Zeit: fmt(secs()) });
    }

    function burst(x, y, color, n = 12, speed = 150) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, v = 30 + Math.random() * speed;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.4, color });
      }
    }

    function startLevel(n) {
      level = n; state = 'play'; drag = -1; sel = -1; hintsLeft = HINTS_PER_LEVEL; levelTime = 0; endArmed = 0;
      const p = generate(n);
      edges = p.edges; sol = p.sol;
      pts = p.start.map(q => ({ x: q.x, y: q.y, tx: q.x, ty: q.y, size: 1 }));
      lit = pts.map(() => 0);
      springs = edges.map(() => ({ lx: 0, ly: 0, vx: 0, vy: 0 }));
      refreshSprings(true);
      crossInfo = findCrossings(pts, edges); shown = crossInfo.count;
      hudKey = ''; hud();
      ctx.audio.sfx('swoosh');
      ctx.toast(n === 1 ? 'Entwirre die Kabel! 💡' : `Level ${n}: ${pts.length} Birnen`, 1600);
    }

    // Feder-Punkt jedes Kabels (folgt der Kabelmitte mit Verzögerung -> leichtes Wackeln)
    function refreshSprings(snap) {
      edges.forEach(([a, b], i) => {
        const s = springs[i], mx = (pts[a].x + pts[b].x) / 2, my = (pts[a].y + pts[b].y) / 2;
        if (snap) { s.lx = mx; s.ly = my + 3; s.vx = s.vy = 0; }
      });
    }
    function stepSprings(dt) {
      const k = 190, c = 7.5;
      edges.forEach(([a, b], i) => {
        const s = springs[i], mx = (pts[a].x + pts[b].x) / 2, my = (pts[a].y + pts[b].y) / 2 + 3;
        const ax = k * (mx - s.lx) - c * s.vx, ay = k * (my - s.ly) - c * s.vy;
        s.vx += ax * dt; s.vy += ay * dt; s.lx += s.vx * dt; s.ly += s.vy * dt;
        const ox = s.lx - mx, oy = s.ly - my, d = Math.hypot(ox, oy);
        if (d > 28) { s.lx = mx + ox * 28 / d; s.ly = my + oy * 28 / d; }
      });
    }

    // Birne i aus anderen herausschieben (pushOthers: stattdessen die anderen wegschieben)
    function resolve(i, pushOthers = false) {
      for (let it = 0; it < 8; it++) {
        let moved = false;
        for (let j = 0; j < pts.length; j++) {
          if (j === i) continue;
          const A = pushOthers ? pts[j] : pts[i], B = pushOthers ? pts[i] : pts[j];
          let dx = A.tx - B.tx, dy = A.ty - B.ty, d = Math.hypot(dx, dy);
          if (d >= MIN_D) continue;
          if (d < 0.5) { const a = Math.random() * 6.283; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
          A.tx = clampX(B.tx + dx / d * (MIN_D + 1)); A.ty = clampY(B.ty + dy / d * (MIN_D + 1));
          moved = true;
        }
        if (!moved) break;
      }
    }

    function solved() {
      state = 'win'; drag = -1; sel = -1;
      done = level; ctx.save('level', Math.max(reached, done, ctx.load('level', 0) || 0));
      ctx.audio.sfx('level'); ctx.fx.shake(220);
      const n = pts.length, gap = 0.11;
      pts.forEach((p, i) => ctx.timeout(() => {
        lit[i] = 1; p.size = 1.5;
        ctx.audio.tone(midi(SCALE[i % SCALE.length]), 0.3, 'triangle', 0.2);
        burst(p.x, p.y, COLORS[i % COLORS.length], 14, 170);
      }, 350 + i * gap * 1000));
      const total = 350 + n * gap * 1000 + 700;
      if (level < LEVELS.length) {
        ctx.timeout(() => ctx.toast(`Level ${level} geschafft! ⭐`, 1100), 300);
        ctx.timeout(() => startLevel(level + 1), total);
      } else ctx.timeout(() => finish(true), total + 300);
    }

    function finish(allDone) {
      state = 'end';
      const stars = done >= 8 ? 3 : done >= 5 ? 2 : done >= 3 ? 1 : 0;
      const need = done >= 8 ? '' : done >= 5 ? ' Für den dritten Stern musst du alle 8 Level entwirren.' : done >= 3 ? ' Für den zweiten Stern brauchst du 5 entwirrte Level.' : ' Für den ersten Stern entwirre 3 Level.';
      ctx.finish({
        won: allDone, stars, score: done ? done * 100 + Math.max(0, 300 - secs()) : 0,
        text: (allDone ? `Alle 8 Lichterketten leuchten! Zeit ${fmt(secs())}, ${moves} Züge.` : `Du hast ${done} von 8 Lichterketten entwirrt.`) + need,
      });
    }

    function giveHint() {
      if (state !== 'play') return;
      if (hintsLeft <= 0) { ctx.audio.sfx('bad'); ctx.toast('Keine Tipps mehr in diesem Level', 1000); return; }
      let bi = -1, bc = Infinity, bd = 0;
      pts.forEach((p, i) => {
        const d = Math.hypot(p.tx - sol[i].x, p.ty - sol[i].y);
        if (d < 8) return;
        const test = pts.map((q, j) => j === i ? sol[i] : q);
        const c = countCrossings(test, edges);
        if (c < bc || (c === bc && d > bd)) { bc = c; bd = d; bi = i; }
      });
      if (bi < 0) return;
      hintsLeft--; moves++;
      pts[bi].tx = sol[bi].x; pts[bi].ty = sol[bi].y; pts[bi].size = 1.5; sel = bi;
      resolve(bi, true); pendingCheck = true;
      ctx.audio.sfx('power'); burst(sol[bi].x, sol[bi].y, '#ffd166', 16);
      hudKey = ''; hud();
    }

    function tryEnd() {
      if (state !== 'play') return;
      if (!endArmed) {
        endArmed = 2.6; ctx.audio.sfx('click');
        ctx.toast(done ? `Nochmal tippen zum Beenden (${done} Level geschafft)` : 'Nochmal tippen zum Beenden', 1800);
        return;
      }
      finish(false);
    }

    // ---- Zeiger ----
    ctx.on(canvas, 'pointerdown', e => {
      e.preventDefault(); ctx.audio.unlock?.();
      const p = pos(e);
      if (state !== 'play') return;
      if (inBox(BTN_HINT, p)) { pressedBtn = 'hint'; return; }
      if (inBox(BTN_END, p)) { pressedBtn = 'end'; return; }
      let best = -1, bd = HIT;
      pts.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = i; } });
      if (best < 0) return;
      drag = best; sel = -1; dragMoved = false;
      grabDx = pts[best].x - p.x; grabDy = pts[best].y - p.y;
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      ctx.audio.sfx('click');
    });
    ctx.on(canvas, 'pointermove', e => {
      if (drag < 0 || state !== 'play') return;
      const p = pos(e), q = pts[drag];
      const nx = clampX(p.x + grabDx), ny = clampY(p.y + grabDy);
      if (Math.hypot(nx - q.tx, ny - q.ty) > 0.1) dragMoved = true;
      q.tx = q.x = nx; q.ty = q.y = ny;
    });
    const release = e => {
      const p = pos(e);
      if (pressedBtn) {
        const b = pressedBtn; pressedBtn = null;
        if (b === 'hint' && inBox(BTN_HINT, p)) giveHint();
        if (b === 'end' && inBox(BTN_END, p)) tryEnd();
        return;
      }
      if (drag < 0) return;
      const i = drag; drag = -1;
      if (dragMoved) moves++;
      resolve(i);
      ctx.audio.sfx('pop');
      burst(pts[i].x, pts[i].y, COLORS[i % COLORS.length], 6, 90);
      hudKey = ''; hud();
      pendingCheck = true; // wird geprüft, sobald alle Birnen an ihrem Ziel angekommen sind
    };
    ctx.on(canvas, 'pointerup', release);
    ctx.on(canvas, 'pointercancel', e => { pressedBtn = null; if (drag >= 0) release(e); });

    // ---- Tastatur ----
    ctx.on(window, 'keydown', e => {
      if (state !== 'play' || ctx.paused) return;
      const k = e.key;
      if (k === 'Tab' || k === 'a' || k === 'A') {
        e.preventDefault();
        if (e.repeat) return;
        sel = ((sel < 0 ? (e.shiftKey ? 0 : -1) : sel) + (e.shiftKey ? -1 : 1) + pts.length) % pts.length;
        ctx.audio.sfx('click'); pts[sel].size = 1.4;
        return;
      }
      if (k === 'h' || k === 'H') { e.preventDefault(); if (!e.repeat) giveHint(); return; }
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
      if (!d) return;
      e.preventDefault();
      if (sel < 0) { sel = 0; pts[0].size = 1.4; return; }
      const q = pts[sel];
      const step = e.repeat ? STEP * 0.6 : STEP;
      if (!e.repeat) moves++;
      q.tx = clampX(q.tx + d[0] * step); q.ty = clampY(q.ty + d[1] * step);
      resolve(sel);
      q.x = q.tx; q.y = q.ty;
      pts.forEach(p => { p.x = p.tx; p.y = p.ty; });
      crossInfo = findCrossings(pts, edges); hudKey = ''; hud();
      if (crossInfo.count === 0) solved();
    });

    // ---- Zeichnen ----
    function roundRect(x, y, w, h, r) {
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    function button(b, label, sub, active) {
      g.fillStyle = active ? 'rgba(255,209,102,.22)' : 'rgba(255,255,255,.08)';
      roundRect(b.x, b.y, b.w, b.h, 14); g.fill();
      g.lineWidth = 2; g.strokeStyle = active ? '#ffd166' : 'rgba(255,255,255,.22)'; g.stroke();
      g.fillStyle = '#fff'; g.font = '700 16px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? 6 : 0));
      if (sub) { g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '12px system-ui, sans-serif'; g.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + 12); }
    }

    function draw(t) {
      const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#0b1437'); grad.addColorStop(1, '#13204f');
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.5)';
      for (const f of flakes) { g.globalAlpha = 0.25 + 0.2 * Math.sin(t * 1.5 + f.ph); g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
      // Spielfeld
      g.fillStyle = 'rgba(255,255,255,.04)'; roundRect(10, 56, W - 20, 432, 16); g.fill();
      g.strokeStyle = 'rgba(142,202,230,.25)'; g.lineWidth = 2; g.stroke();

      // Zähler
      const c = crossInfo.count, ok = c === 0;
      const pop = 1 + pulse * 0.25;
      g.save(); g.translate(W / 2, 30); g.scale(pop, pop);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 24px system-ui, sans-serif';
      g.fillStyle = ok ? '#ffd166' : '#ef476f';
      if (ok) { g.shadowColor = '#ffd166'; g.shadowBlur = 14; }
      g.fillText(`Kreuzungen: ${c}`, 0, 0); g.restore(); g.shadowBlur = 0;
      if (level === 1 && levelTime < 9 && state === 'play') {
        g.globalAlpha = Math.min(1, (9 - levelTime) / 2); g.fillStyle = '#8ecae6'; g.font = '14px system-ui, sans-serif'; g.textAlign = 'center';
        g.fillText('Rote Kabel kreuzen sich.', W / 2, 80); g.fillText('Zieh die Birnen, bis alles grün ist!', W / 2, 98); g.globalAlpha = 1;
      }

      // Kabel
      g.lineCap = 'round'; g.lineJoin = 'round';
      edges.forEach(([a, b], i) => {
        const A = pts[a], B = pts[b], s = springs[i];
        const cx = 2 * s.lx - (A.x + B.x) / 2, cy = 2 * s.ly - (A.y + B.y) / 2;
        const bad = crossInfo.bad.has(i);
        const col = state === 'win' || ok ? '#ffd166' : bad ? '#ef476f' : '#06d6a0';
        g.beginPath(); g.moveTo(A.x, A.y); g.quadraticCurveTo(cx, cy, B.x, B.y);
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 7; g.stroke();
        g.shadowColor = col; g.shadowBlur = bad ? 10 + Math.sin(t * 10) * 4 : 6;
        g.strokeStyle = col; g.lineWidth = 3.5; g.stroke(); g.shadowBlur = 0;
      });

      // Birnen
      pts.forEach((p, i) => {
        const col = COLORS[i % COLORS.length], isDrag = drag === i;
        const r = R * p.size, on = lit[i] > 0;
        g.shadowColor = col; g.shadowBlur = on ? 26 : isDrag ? 18 : 6;
        // Sockel
        g.fillStyle = '#8d93ad'; roundRect(p.x - 6, p.y - r - 5, 12, 8, 2); g.fill();
        g.fillStyle = on ? col : isDrag ? '#c9d2ff' : '#6f7bb0';
        g.beginPath(); g.arc(p.x, p.y, r, 0, 6.283); g.fill();
        g.shadowBlur = 0;
        g.strokeStyle = on ? '#fff' : col; g.lineWidth = 3; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(p.x - r * 0.3, p.y - r * 0.32, r * 0.22, 0, 6.283); g.fill();
        if (sel === i && state === 'play') {
          g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.setLineDash([5, 4]); g.lineDashOffset = -t * 20;
          g.beginPath(); g.arc(p.x, p.y, r + 7, 0, 6.283); g.stroke(); g.setLineDash([]);
        }
      });

      for (const s of sparks) { g.globalAlpha = Math.max(0, s.life * 2); g.fillStyle = s.color; g.fillRect(s.x - 2, s.y - 2, 4, 4); }
      g.globalAlpha = 1;

      // Knöpfe
      button(BTN_HINT, '💡 Tipp', `noch ${hintsLeft}`, pressedBtn === 'hint');
      button(BTN_END, endArmed ? 'Wirklich beenden?' : 'Beenden', done ? `${done} Level geschafft` : null, pressedBtn === 'end' || endArmed > 0);
      g.fillStyle = 'rgba(255,255,255,.45)'; g.font = '11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(reached ? `Bisher erreicht: Level ${reached} · Tab/A wählen, Pfeile schieben` : 'Tab/A wählen, Pfeiltasten schieben, H = Tipp', W / 2, 551);
    }

    startLevel(1);
    ctx.loop((dt, t) => {
      if (state === 'play') { time += dt; levelTime += dt; }
      if (endArmed > 0) endArmed = Math.max(0, endArmed - dt);
      pulse = Math.max(0, pulse - dt * 4);
      // Birnen gleiten zu ihrem Ziel (außer die gezogene)
      const k = 1 - Math.exp(-dt * 20);
      pts.forEach((p, i) => {
        if (i !== drag) { p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; }
        const want = drag === i ? 1.35 : lit[i] ? 1.15 + 0.1 * Math.sin(t * 6 + i) : (sel === i ? 1.15 : 1);
        p.size += (want - p.size) * (1 - Math.exp(-dt * 14));
      });
      if (state === 'play') {
        crossInfo = findCrossings(pts, edges);
        if (crossInfo.count < shown) { ctx.audio.tone(500 + Math.max(0, 8 - crossInfo.count) * 45, 0.12, 'triangle', 0.16); pulse = 1; }
        else if (crossInfo.count > shown) pulse = 0.5;
        shown = crossInfo.count;
        if (pendingCheck && drag < 0 && pts.every(p => Math.hypot(p.x - p.tx, p.y - p.ty) < 0.6)) {
          pendingCheck = false;
          if (crossInfo.count === 0) solved();
        }
      }
      stepSprings(dt);
      for (const f of flakes) { f.y += f.v * dt; if (f.y > H) { f.y = -4; f.x = Math.random() * W; } }
      sparks = sparks.filter(s => (s.life -= dt) > 0);
      for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 60 * dt; }
      hud();
      draw(t);
    });
    return { destroy() {} };
  },
};
