// Türchen 9: Pfeil-Salat. Tippe Pfeile an, sie sausen raus, wenn die Bahn bis zum Rand frei ist.
import { makeLevel, rayCells, DIRS, LEVELS } from './gen.js';

export const howto = 'Tippe einen Pfeil an (oder Pfeiltasten + Leertaste): Er saust in Pfeilrichtung raus, wenn der Weg bis zum Rand frei ist. Sonst kostet es ein Herz. Schick alle Pfeile weg! Taste X oder Knopf "Tipp" zeigt einen freien Pfeil.';

const W = 372, H = 580, FIELD_Y = 62, FIELD_H = 426;
const COLORS = ['#ffd166', '#06d6a0', '#8ecae6', '#c77dff', '#ff9f6b'];
const MAX_LEVEL = LEVELS.length;
const MAX_HINTS = 3, STAR3_MAX_MISTAKES = 6;
const BTN_MENU = { x: 14, y: 522, w: 104, h: 46 }, BTN_HINT = { x: 132, y: 522, w: 226, h: 46 };
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function heart(g, cx, cy, s) {
  g.beginPath(); g.moveTo(cx, cy + s * 0.9);
  g.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
  g.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9); g.closePath();
}
const cumul = pts => { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)); return c; };
function pointAt(pts, cum, s) {
  s = Math.max(0, Math.min(cum[cum.length - 1], s));
  let i = 1; while (i < pts.length - 1 && cum[i] < s) i++;
  const seg = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / seg;
  return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
}
function subPath(pts, cum, a, b) {
  const out = [pointAt(pts, cum, a)];
  for (let i = 0; i < pts.length; i++) if (cum[i] > a + 0.01 && cum[i] < b - 0.01) out.push(pts[i]);
  out.push(pointAt(pts, cum, b)); return out;
}

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none';
    const reachedSaved = Math.max(1, Math.min(MAX_LEVEL, Math.round(Number(ctx.load('reached', 1))) || 1));
    let reached = reachedSaved;

    // Lauf-Zustand (für Sterne)
    let runBest = 0, mistakes = 0, score = 0, finished = false;
    // Level-Zustand
    let mode = 'select', level = 1, n = 5, cs = 60, gx = 0, gy = 0;
    let arrows = [], occ = [], flights = [], parts = [], floats = [];
    let hearts = 3, remaining = 0, combo = 0, hintLeft = MAX_HINTS, hint = null, hintT = 0;
    let cursor = { x: 0, y: 0 }, keyUsed = false, heartPop = [0, 0, 0], levelT = 0, sel = reached, time = 0, flashBtn = null, flashT = 0;
    const stars = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 1.4, p: Math.random() * 6.3 }));

    const hud = () => ctx.hud.set(mode === 'select' ? { 'Level': reached } : { 'Level': level, 'Noch': remaining });
    const cx = x => gx + (x + 0.5) * cs, cy = y => gy + (y + 0.5) * cs;

    // ---------- Level aufbauen ----------
    function startLevel(L) {
      level = L; const lv = makeLevel(L); n = lv.n;
      cs = Math.min(60, Math.floor(360 / n)); gx = Math.round((W - cs * n) / 2); gy = Math.round(FIELD_Y + (FIELD_H - cs * n) / 2);
      occ = Array.from({ length: n }, () => Array(n).fill(-1));
      arrows = lv.arrows.map((a, i) => {
        a.cells.forEach(c => { occ[c.y][c.x] = i; });
        return { cells: a.cells, dir: a.dir, alive: true, wiggle: 0, blocker: 0, color: '#fff', id: i };
      });
      // Farben so wählen, dass Nachbarn möglichst verschieden sind
      arrows.forEach(a => {
        const used = new Array(COLORS.length).fill(0);
        a.cells.forEach(c => DIRS.forEach(d => { const x = c.x + d.x, y = c.y + d.y; if (x >= 0 && y >= 0 && x < n && y < n && occ[y][x] >= 0 && arrows[occ[y][x]] !== a && arrows[occ[y][x]].ci !== undefined) used[arrows[occ[y][x]].ci]++; }));
        const m = Math.min(...used), opts = used.map((u, i) => u === m ? i : -1).filter(i => i >= 0);
        a.ci = opts[Math.floor(Math.random() * opts.length)]; a.color = COLORS[a.ci];
      });
      flights = []; floats = []; hearts = 3; remaining = arrows.length; combo = 0; hintLeft = MAX_HINTS; hint = null; hintT = 0; levelT = 0;
      heartPop = [0, 0, 0]; mode = 'play';
      const first = arrows.reduce((b, a) => { const c = a.cells[a.cells.length - 1], d = Math.hypot(c.x - (n - 1) / 2, c.y - (n - 1) / 2); return !b || d < b.d ? { a, d } : b; }, null).a;
      const hc = first.cells[first.cells.length - 1]; cursor = { x: hc.x, y: hc.y };
      if (reached < L) { reached = L; ctx.save('reached', L); }
      hud(); ctx.audio.sfx('pop'); ctx.toast(`Level ${L}  ·  ${n}×${n}`);
    }
    function openSelect() {
      mode = 'select'; flights = []; sel = Math.min(reached, Math.max(1, sel)); hud();
    }

    // ---------- Spielzüge ----------
    const blockerOf = a => {
      for (const c of rayCells(a, n)) if (occ[c.y][c.x] >= 0) return arrows[occ[c.y][c.x]];
      return null;
    };
    const isFree = a => a.alive && !blockerOf(a);

    function burst(x, y, color, k = 12, sp = 150) {
      for (let i = 0; i < k; i++) { const an = Math.random() * 6.3, v = 30 + Math.random() * sp; parts.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, life: 0.35 + Math.random() * 0.35, max: 0.7, color, size: 2 + Math.random() * 3 }); }
    }
    const float = (x, y, text, color, big) => floats.push({ x, y, text, color, life: 0.9, big });

    function comboTone() {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
      const f = 330 * Math.pow(2, scale[Math.min(combo - 1, scale.length - 1)] / 12);
      ctx.audio.tone(f, 0.16, 'triangle', 0.24, f * 1.18);
      if (combo >= 5) ctx.audio.tone(f * 2, 0.1, 'sine', 0.1, null, 0.05);
    }

    function launch(a) {
      const L = a.cells.length, d = DIRS[a.dir], r = rayCells(a, n).length, head = a.cells[L - 1];
      const pts = a.cells.map(c => ({ x: cx(c.x), y: cy(c.y) }));
      const far = (r + L + 2) * cs;
      pts.push({ x: cx(head.x) + d.x * far, y: cy(head.y) + d.y * far });
      const cum = cumul(pts);
      a.cells.forEach(c => { occ[c.y][c.x] = -1; });
      a.alive = false; remaining--; combo++;
      flights.push({ a, pts, cum, s: 0, t: 0, L, trail: 0 });
      const pts10 = 10 + Math.min(combo - 1, 9) * 2; score += pts10;
      float(cx(head.x), cy(head.y), combo >= 2 ? `+${pts10}  ×${combo}` : `+${pts10}`, '#ffd166', combo >= 3);
      comboTone(); ctx.audio.sfx('swoosh');
      if (hint && hint.a === a) hint = null;
      // Cursor auf nächsten Pfeil
      fixCursor(); hud();
    }

    function wrong(a, blk) {
      hearts--; mistakes++; combo = 0; a.wiggle = 0.5; blk.blocker = 0.7; heartPop[Math.max(0, hearts)] = 0.5;
      const h = a.cells[a.cells.length - 1];
      burst(cx(h.x), cy(h.y), '#ff3355', 8, 90);
      ctx.audio.sfx('bad'); ctx.fx.shake(220); hud();
      if (hearts <= 0) {
        mode = 'trans'; ctx.audio.sfx('hit');
        ctx.timeout(() => finishRun(false), 900);
      }
    }

    function fire(a) {
      if (mode !== 'play' || !a || !a.alive || a.wiggle > 0) return;
      const b = blockerOf(a);
      if (b) wrong(a, b); else launch(a);
    }

    function useHint() {
      if (mode !== 'play') return;
      if (hintLeft <= 0) { ctx.toast('Keine Tipps mehr in diesem Level'); ctx.audio.sfx('tick'); return; }
      const free = arrows.filter(a => isFree(a) && !(hint && hint.a === a));
      if (!free.length) return;
      hint = { a: free[Math.floor(Math.random() * free.length)] }; hintT = 3; hintLeft--;
      ctx.audio.sfx('power');
    }

    function levelDone() {
      mode = 'trans'; runBest = Math.max(runBest, level);
      score += 50 + hearts * 20;
      if (level < MAX_LEVEL && reached < level + 1) { reached = level + 1; ctx.save('reached', reached); }
      float(W / 2, H / 2 - 20, `Level ${level} geschafft!`, '#06d6a0', true); levelT = 1.2;
      for (let i = 0; i < 40; i++) burst(Math.random() * W, FIELD_Y + Math.random() * FIELD_H, COLORS[i % 5], 3, 200);
      if (level >= MAX_LEVEL) ctx.timeout(() => finishRun(true), 900);
      else { ctx.audio.sfx('level'); ctx.fx.confetti(40); ctx.timeout(() => startLevel(level + 1), 1300); }
    }

    function finishRun(allDone) {
      if (finished) return; finished = true;
      const st = runBest >= MAX_LEVEL ? (mistakes <= STAR3_MAX_MISTAKES ? 3 : 2) : runBest >= 6 ? 2 : runBest >= 3 ? 1 : 0;
      let more;
      if (st === 0) more = 'Schaffe Level 3 für den ersten Stern.';
      else if (st === 1) more = 'Schaffe Level 6 für den zweiten Stern.';
      else if (st === 2 && runBest >= MAX_LEVEL) more = `Für den dritten Stern darfst du insgesamt höchstens ${STAR3_MAX_MISTAKES} Fehler machen (du hattest ${mistakes}).`;
      else if (st === 2) more = `Schaffe alle ${MAX_LEVEL} Level mit höchstens ${STAR3_MAX_MISTAKES} Fehlern für den dritten Stern.`;
      else more = 'Das ist die Höchstwertung. Pfeil-Meister!';
      const text = allDone
        ? `Alle ${MAX_LEVEL} Level geschafft, mit ${mistakes} Fehler${mistakes === 1 ? '' : 'n'}. ${more}`
        : `Die Herzen sind leer. Höchstes geschafftes Level: ${runBest}. ${more} Mit "Nochmal" geht es bei Level ${reached} weiter.`;
      ctx.finish({ won: allDone, stars: st, score, text });
    }

    // ---------- Eingabe ----------
    const cellAt = p => { const x = Math.floor((p.x - gx) / cs), y = Math.floor((p.y - gy) / cs); return x >= 0 && y >= 0 && x < n && y < n ? { x, y } : null; };
    const selRect = i => ({ x: 24 + (i % 2) * 170, y: 150 + Math.floor(i / 2) * 84, w: 154, h: 68 });

    ctx.on(canvas, 'pointerdown', e => {
      if (finished) return; e.preventDefault();
      const p = pos(e); ctx.input.isTouch || (keyUsed = false);
      if (mode === 'select') {
        for (let i = 0; i < MAX_LEVEL; i++) if (inRect(p, selRect(i))) {
          if (i + 1 <= reached) { sel = i + 1; ctx.audio.sfx('click'); startLevel(i + 1); } else { ctx.audio.sfx('tick'); ctx.toast('Noch gesperrt: schaffe erst das Level davor'); }
          return;
        }
        return;
      }
      if (mode !== 'play') return;
      if (inRect(p, BTN_MENU)) { flashBtn = 'menu'; flashT = 0.15; ctx.audio.sfx('click'); openSelect(); return; }
      if (inRect(p, BTN_HINT)) { flashBtn = 'hint'; flashT = 0.15; useHint(); return; }
      const c = cellAt(p);
      if (c && occ[c.y][c.x] >= 0) { cursor = c; fire(arrows[occ[c.y][c.x]]); }
    });

    function fixCursor() {
      if (occ[cursor.y]?.[cursor.x] >= 0) return;
      let best = null;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (occ[y][x] >= 0) { const d = Math.hypot(x - cursor.x, y - cursor.y); if (!best || d < best.d) best = { x, y, d }; }
      if (best) cursor = { x: best.x, y: best.y };
    }
    function moveCursor(name) {
      const v = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[name]; let best = null;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        if (occ[y][x] < 0 || (x === cursor.x && y === cursor.y)) continue;
        const dx = x - cursor.x, dy = y - cursor.y, along = dx * v[0] + dy * v[1], perp = Math.abs(dx * v[1] - dy * v[0]);
        if (along <= 0) continue; const sc = along + perp * 2.5;
        if (!best || sc < best.sc) best = { x, y, sc };
      }
      if (best) { cursor = { x: best.x, y: best.y }; ctx.audio.sfx('tick'); }
    }
    ctx.input.onPress(name => {
      if (finished) return;
      if (mode === 'select') {
        const i = sel - 1;
        if (name === 'a') { if (sel <= reached) startLevel(sel); return; }
        let r = Math.floor(i / 2), c = i % 2;
        if (name === 'left') c = 0; if (name === 'right') c = 1; if (name === 'up') r = Math.max(0, r - 1); if (name === 'down') r = Math.min(3, r + 1);
        const ns = r * 2 + c + 1; if (ns <= reached && ns !== sel) { sel = ns; ctx.audio.sfx('tick'); }
        return;
      }
      if (mode !== 'play') return;
      keyUsed = true;
      if (name === 'b') useHint();
      else if (name === 'a') { const id = occ[cursor.y]?.[cursor.x]; if (id >= 0) fire(arrows[id]); }
      else moveCursor(name);
    });

    // ---------- Update ----------
    function update(dt) {
      time += dt; flashT = Math.max(0, flashT - dt); levelT = Math.max(0, levelT - dt);
      for (let i = 0; i < 3; i++) heartPop[i] = Math.max(0, heartPop[i] - dt);
      for (const a of arrows) { a.wiggle = Math.max(0, a.wiggle - dt); a.blocker = Math.max(0, a.blocker - dt); }
      if (hint && (hintT -= dt) <= 0) hint = null;
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i]; f.t += dt;
        const v = (5 + 40 * f.t) * cs; f.s += v * dt;
        const headS = f.s + (f.L - 1) * cs, hp = pointAt(f.pts, f.cum, headS), d = DIRS[f.a.dir];
        f.trail += dt;
        parts.push({ x: hp.x - d.x * cs * 0.2, y: hp.y - d.y * cs * 0.2, vx: -d.x * 30 + (Math.random() - 0.5) * 40, vy: -d.y * 30 + (Math.random() - 0.5) * 40, life: 0.45, max: 0.45, color: f.a.color, size: cs * 0.2 });
        parts.push({ x: hp.x, y: hp.y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.3, max: 0.3, color: '#fff', size: 2 });
        if (headS >= f.cum[f.cum.length - 1] - 1) { flights.splice(i, 1); }
        else if (!f.out && headS >= f.cum[f.L - 1] + (rayCells(f.a, n).length + 0.5) * cs) {
          f.out = true; // Kopf hat den Rand erreicht: Funkenregen
          burst(hp.x, hp.y, f.a.color, 12, 130); burst(hp.x, hp.y, '#fff', 5, 90);
        }
      }
      for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
      parts = parts.filter(p => p.life > 0);
      for (const f of floats) { f.life -= dt; f.y -= 34 * dt; }
      floats = floats.filter(f => f.life > 0);
      if (mode === 'play' && remaining === 0 && !flights.length) levelDone();
    }

    // ---------- Zeichnen ----------
    function drawArrow(pts, dir, color, o = {}) {
      const d = DIRS[dir], p = pts[pts.length - 1], lw = cs * 0.3, single = pts.length < 2 || (pts.length === 2 && pts[0].x === pts[1].x && pts[0].y === pts[1].y);
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      if (o.dx || o.dy) g.translate(o.dx, o.dy);
      const path = single ? [{ x: p.x - d.x * cs * 0.3, y: p.y - d.y * cs * 0.3 }, p] : pts;
      const stroke = (w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); path.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.stroke(); };
      if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = 18; stroke(lw + 8, o.glow); g.shadowBlur = 0; }
      stroke(lw + 5, '#060d26'); stroke(lw, color);
      stroke(lw * 0.28, 'rgba(255,255,255,.35)');
      const tip = { x: p.x + d.x * cs * 0.46, y: p.y + d.y * cs * 0.46 };
      const bx = p.x - d.x * cs * 0.06, by = p.y - d.y * cs * 0.06, px = -d.y * cs * 0.34, py = d.x * cs * 0.34;
      g.beginPath(); g.moveTo(tip.x, tip.y); g.lineTo(bx + px, by + py); g.lineTo(bx - px, by - py); g.closePath();
      g.strokeStyle = '#060d26'; g.lineWidth = 4; g.stroke(); g.fillStyle = color; g.fill();
      g.restore();
    }

    function drawSelect() {
      g.fillStyle = '#ffd166'; g.font = `800 34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Pfeil-Salat', W / 2, 62);
      g.fillStyle = '#8ecae6'; g.font = `600 17px ${FONT}`; g.fillText('Wähle dein Level', W / 2, 104);
      for (let i = 0; i < MAX_LEVEL; i++) {
        const r = selRect(i), open = i + 1 <= reached, on = sel === i + 1;
        const bob = on ? Math.sin(time * 6) * 2 : 0;
        rrect(g, r.x, r.y + bob, r.w, r.h, 16);
        g.fillStyle = open ? 'rgba(142,202,230,.16)' : 'rgba(255,255,255,.05)'; g.fill();
        g.lineWidth = on ? 3.5 : 2; g.strokeStyle = on ? '#ffd166' : open ? '#8ecae6' : 'rgba(255,255,255,.15)'; g.stroke();
        g.fillStyle = open ? '#fff' : 'rgba(255,255,255,.3)'; g.font = `800 30px ${FONT}`; g.textAlign = 'left';
        g.fillText(String(i + 1), r.x + 18, r.y + r.h / 2 + bob);
        g.font = `600 14px ${FONT}`; g.textAlign = 'right'; g.fillStyle = open ? '#8ecae6' : 'rgba(255,255,255,.3)';
        const gs = LEVELS[i].n; g.fillText(`${gs}×${gs}`, r.x + r.w - 16, r.y + r.h / 2 + bob + 12);
        if (open) { g.fillStyle = i + 1 === reached ? '#06d6a0' : '#ffd166'; g.font = `700 13px ${FONT}`; g.fillText(i + 1 === reached && reached > 1 ? 'weiter' : (i + 1 < reached ? 'geschafft' : 'los!'), r.x + r.w - 16, r.y + r.h / 2 + bob - 12); }
        else { // Schloss
          const lx = r.x + 62, ly = r.y + r.h / 2 + bob;
          g.fillStyle = 'rgba(255,255,255,.35)'; rrect(g, lx - 9, ly - 2, 18, 14, 3); g.fill();
          g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(lx, ly - 3, 6, Math.PI, 0); g.stroke();
        }
      }
      g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `500 14px ${FONT}`;
      g.fillText('Tippen oder Pfeiltasten + Leertaste', W / 2, 520);
    }

    function drawPlay() {
      // Header
      for (let i = 0; i < 3; i++) {
        const full = i < hearts, pop = heartPop[i] > 0 ? 1 + heartPop[i] * 1.6 : 1;
        heart(g, 26 + i * 32, 28, 11 * pop);
        if (full) { g.fillStyle = '#ef476f'; g.fill(); } else { g.strokeStyle = heartPop[i] > 0 ? '#ff3355' : 'rgba(255,255,255,.35)'; g.lineWidth = 2.5; g.stroke(); }
      }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = `800 20px ${FONT}`;
      g.fillText(`Level ${level}`, W / 2 + 6, 22);
      g.fillStyle = '#8ecae6'; g.font = `600 13px ${FONT}`; g.fillText(`${n}×${n}`, W / 2 + 6, 42);
      g.textAlign = 'right'; g.fillStyle = '#ffd166'; g.font = `800 28px ${FONT}`; g.fillText(String(remaining), W - 14, 24);
      g.fillStyle = '#8ecae6'; g.font = `600 12px ${FONT}`; g.fillText(remaining === 1 ? 'Pfeil übrig' : 'Pfeile übrig', W - 14, 46);
      if (combo >= 2) {
        const k = 1 + 0.08 * Math.sin(time * 10); g.textAlign = 'left'; g.fillStyle = '#ffd166'; g.font = `800 ${Math.round(15 * k)}px ${FONT}`;
        g.fillText(`Serie ×${combo}`, 14, 50);
      }
      // Feld
      rrect(g, 6, FIELD_Y, W - 12, FIELD_H, 18); g.fillStyle = 'rgba(18,28,77,.75)'; g.fill(); g.strokeStyle = 'rgba(142,202,230,.25)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(142,202,230,.16)';
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.beginPath(); g.arc(cx(x), cy(y), 2.2, 0, 6.3); g.fill(); }
      // Pfeile
      for (const a of arrows) {
        if (!a.alive) continue;
        const pts = a.cells.map(c => ({ x: cx(c.x), y: cy(c.y) })), d = DIRS[a.dir];
        let col = a.color, o = {};
        if (a.wiggle > 0) { const k = a.wiggle / 0.5, w = Math.sin(a.wiggle * 70) * 6 * k; o.dx = -d.y * w; o.dy = d.x * w; col = Math.floor(a.wiggle * 20) % 2 ? '#ff3355' : '#ff8a9c'; }
        else if (a.blocker > 0) { o.glow = '#ff3355'; }
        if (hint && hint.a === a) o.glow = `rgba(255,209,102,${0.55 + 0.45 * Math.sin(time * 9)})`;
        drawArrow(pts, a.dir, col, o);
      }
      // Cursor
      if (keyUsed && mode === 'play' && occ[cursor.y]?.[cursor.x] >= 0) {
        const pul = 2 + Math.sin(time * 8) * 1.5;
        rrect(g, gx + cursor.x * cs + 2 - pul / 2, gy + cursor.y * cs + 2 - pul / 2, cs - 4 + pul, cs - 4 + pul, 9);
        g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.stroke();
      }
      // Flüge (mit Beschnitt auf das Feld)
      g.save(); g.beginPath(); g.rect(0, FIELD_Y - 1, W, FIELD_H + 2); g.clip();
      for (const f of flights) {
        const hs = f.s + (f.L - 1) * cs, ghost = 3;
        for (let k = ghost; k >= 1; k--) { // Schweif aus Nachbildern
          const off = k * cs * 0.35; if (hs - off < 0) continue;
          g.globalAlpha = 0.14 * (ghost + 1 - k);
          const sp = subPath(f.pts, f.cum, Math.max(0, f.s - off), Math.max(0, hs - off));
          drawArrow(sp, f.a.dir, f.a.color);
        }
        g.globalAlpha = 1;
        drawArrow(subPath(f.pts, f.cum, f.s, hs), f.a.dir, f.a.color, { glow: f.a.color });
      }
      for (const p of parts) { g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max)); g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size * (0.4 + 0.6 * p.life / p.max), 0, 6.3); g.fill(); }
      g.globalAlpha = 1; g.restore();
      // Hinweis in den ersten Leveln
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (level <= 2) { g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `600 14px ${FONT}`; g.fillText('Freier Weg bis zum Rand? Dann tippen!', W / 2, 505); }
      // Knöpfe
      const btn = (r, label, sub, active, on) => {
        rrect(g, r.x, r.y, r.w, r.h, 14); g.fillStyle = on ? 'rgba(255,209,102,.4)' : active ? 'rgba(142,202,230,.18)' : 'rgba(255,255,255,.05)'; g.fill();
        g.strokeStyle = active ? '#8ecae6' : 'rgba(255,255,255,.2)'; g.lineWidth = 2; g.stroke();
        g.fillStyle = active ? '#fff' : 'rgba(255,255,255,.4)'; g.font = `700 17px ${FONT}`; g.textAlign = 'center'; g.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + (sub ? -7 : 0));
        if (sub) { g.font = `500 12px ${FONT}`; g.fillStyle = active ? '#ffd166' : 'rgba(255,255,255,.4)'; g.fillText(sub, r.x + r.w / 2, r.y + r.h / 2 + 11); }
      };
      btn(BTN_MENU, 'Menü', '', true, flashBtn === 'menu' && flashT > 0);
      btn(BTN_HINT, 'Tipp', `noch ${hintLeft}${ctx.input.isTouch ? '' : '  ·  Taste X'}`, hintLeft > 0 && mode === 'play', flashBtn === 'hint' && flashT > 0);
      // schwebende Texte
      for (const f of floats) {
        g.globalAlpha = Math.max(0, Math.min(1, f.life * 1.6)); g.fillStyle = f.color; g.font = `800 ${f.big ? 26 : 18}px ${FONT}`; g.textAlign = 'center';
        g.lineWidth = 4; g.strokeStyle = '#060d26'; g.strokeText(f.text, f.x, f.y); g.fillText(f.text, f.x, f.y);
      }
      g.globalAlpha = 1;
    }

    function draw() {
      g.fillStyle = '#0b1437'; g.fillRect(0, 0, W, H);
      for (const s of stars) { g.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(time * 1.2 + s.p)); g.fillStyle = '#cfe8ff'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;
      if (mode === 'select') drawSelect(); else drawPlay();
    }

    ctx.loop(dt => { update(dt); draw(); });
    // Start: bei gemerktem Level > 1 Auswahl anbieten, sonst sofort los (Anfang leicht, kein Text-Vorspann)
    if (reached > 1) openSelect(); else startLevel(1);
    return { destroy() {} };
  },
};
