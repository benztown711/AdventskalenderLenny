// Türchen 18: Farb-Leitungen (Verbinde-Rätsel mit Christbaumkugeln)
import { generate, LEVELS } from './gen.js';

export const howto = 'Zieh mit Finger oder Maus eine Leitung von einer Kugel zur gleichfarbigen und fülle dabei alle Felder. Tastatur: Pfeile bewegen, Leertaste nimmt eine Leitung auf und legt sie ab.';

const W = 360, H = 560;
const COLORS = ['#ef476f', '#ff8a3d', '#ffe066', '#06d6a0', '#4cc9f0', '#5b8cff', '#c77dff', '#f2f4ff'];
const NOTES = [60, 64, 67, 72, 62, 69, 76, 74]; // jede Farbe ein Ton, zusammen klingt es harmonisch
const NAMES = ['Rot', 'Orange', 'Gelb', 'Grün', 'Türkis', 'Blau', 'Violett', 'Weiß'];
const GOLD = '#ffd166';
const freq = m => 440 * Math.pow(2, (m - 69) / 12);
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const starsFor = n => (n >= 10 ? 3 : n >= 6 ? 2 : n >= 3 ? 1 : 0);

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'pointer';

    // ---------- Fortschritt ----------
    let solved = ctx.load('solved', []);
    if (!Array.isArray(solved)) solved = [];
    solved = LEVELS.map((_, i) => !!solved[i]);
    let reached = Math.max(1, Math.min(LEVELS.length, Number(ctx.load('reached', 1)) || 1));
    const solvedCount = () => solved.filter(Boolean).length;

    // ---------- Zustand ----------
    let mode = 'menu';            // menu | play | won | panel
    let time = 0, winT = 0;
    let idx = 0, n = 5, cs = 60, bx = 0, by = 0, T = 25;
    let lv = null, pairs = [], paths = [], sol = [], owner = new Int8Array(0);
    let active = -1, tipsLeft = 2, carrying = false, kb = false;
    let cur = 0, lastCell = -1, lastPos = null;
    let btns = [], focus = 0, pressed = -1;
    let sparks = [], popT = [], bump = null, lastTick = 0, lastBad = 0;
    let flakes = Array.from({ length: 34 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 1.6, v: 6 + Math.random() * 14 }));

    // ---------- Hilfen ----------
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const cx = c => bx + ((c % n) + 0.5) * cs;
    const cy = c => by + (((c / n) | 0) + 0.5) * cs;
    const isEnd = (p, c) => pairs[p].a === c || pairs[p].b === c;
    const partner = (p, c) => (pairs[p].a === c ? pairs[p].b : pairs[p].a);
    const connected = p => { const q = paths[p]; return q.length > 1 && isEnd(p, q[0]) && q[q.length - 1] === partner(p, q[0]); };
    const nb = (a, b) => (Math.abs(a - b) === n) || (Math.abs(a - b) === 1 && ((a / n) | 0) === ((b / n) | 0));
    const filled = () => { let f = 0; for (let i = 0; i < T; i++) if (owner[i] >= 0) f++; return f; };
    const pct = () => Math.floor(filled() * 100 / T);
    const allConnected = () => pairs.every((_, p) => connected(p));
    const tone = (m, d, type, vol, delay = 0) => ctx.audio.tone(freq(m), d, type, vol, null, delay);

    function rebuild() {
      owner.fill(-1);
      pairs.forEach((pr, p) => { owner[pr.a] = p; owner[pr.b] = p; });
      paths.forEach((q, p) => q.forEach(c => { owner[c] = p; }));
    }
    function hud() {
      if (mode === 'menu') ctx.hud.set({ 'Gelöst': solvedCount() + '/' + LEVELS.length, 'Sterne': '★'.repeat(starsFor(solvedCount())) || '–' });
      else ctx.hud.set({ 'Level': idx + 1, 'Felder': pct() + ' %', 'Tipps': tipsLeft });
    }
    const boom = (x, y, color, k = 14, sp = 110) => {
      for (let i = 0; i < k; i++) { const a = Math.random() * 6.283, v = 30 + Math.random() * sp; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.4, color }); }
    };

    // ---------- Level ----------
    function startLevel(i) {
      idx = i; const L = LEVELS[i]; n = L.n; T = n * n;
      lv = generate(L.n, L.k);
      const order = shuffle(COLORS.map((_, k) => k)).slice(0, L.k);
      sol = lv.paths;
      pairs = sol.map((s, p) => ({ a: s[0], b: s[s.length - 1], col: order[p] }));
      paths = pairs.map(() => []);
      popT = pairs.map(() => 9);
      owner = new Int8Array(T);
      cs = Math.min(64, Math.floor(336 / n));
      bx = Math.round((W - cs * n) / 2); by = Math.round(62 + (340 - cs * n) / 2);
      tipsLeft = 2; active = -1; carrying = false; cur = pairs[0].a; lastCell = -1; sparks = []; bump = null;
      mode = 'play'; winT = 0; pressed = -1;
      rebuild(); layoutPlay(); hud();
    }
    function clearBoard() {
      paths = pairs.map(() => []); active = -1; carrying = false; rebuild(); hud(); ctx.audio.sfx('swoosh');
    }
    function showMenu() {
      mode = 'menu'; active = -1; carrying = false;
      let f = solved.findIndex((s, i) => !s && i < reached);
      focus = f < 0 ? 0 : f;
      layoutMenu(); hud();
    }

    // ---------- Buttons ----------
    function layoutMenu() {
      btns = LEVELS.map((L, i) => ({
        x: 18 + (i % 2) * 168, y: 66 + ((i / 2) | 0) * 72, w: 156, h: 62, kind: 'tile', i, disabled: i >= reached,
        fn: () => { ctx.audio.sfx('pop'); startLevel(i); },
      }));
      btns.push({ x: 18, y: 440, w: 324, h: 48, kind: 'big', label: 'Fertig für heute', fn: () => finishGame() });
    }
    function layoutPlay() {
      const y = 440, h = 46, w = 80;
      btns = [
        { x: 5, y, w, h, label: 'Menü', fn: () => { ctx.audio.sfx('click'); showMenu(); } },
        { x: 95, y, w, h, label: 'Leeren', fn: clearBoard },
        { x: 185, y, w, h, label: 'Neu', fn: () => { ctx.audio.sfx('swoosh'); startLevel(idx); } },
        { x: 275, y, w, h, label: 'Tipp', sub: () => String(tipsLeft), fn: tip, off: () => tipsLeft <= 0 },
      ];
      focus = 0;
    }
    function layoutPanel() {
      const last = idx === LEVELS.length - 1;
      btns = [
        { x: 60, y: 300, w: 240, h: 50, kind: 'big', label: last ? 'Zum Ergebnis' : 'Nächstes Level', fn: () => { if (last) finishGame(); else { ctx.audio.sfx('pop'); startLevel(idx + 1); } } },
        { x: 60, y: 362, w: 240, h: 44, label: 'Zur Auswahl', fn: showMenu },
      ];
      focus = 0;
    }
    const hitBtn = pt => btns.findIndex(b => !(b.disabled) && !(b.off && b.off()) && pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h);

    // ---------- Leitungen ----------
    function grab(c) {
      const o = owner[c]; if (o < 0) return false;
      if (isEnd(o, c)) paths[o] = [c];
      else { const q = paths[o]; q.length = q.indexOf(c) + 1; }
      active = o; carrying = true;
      rebuild(); hud(); ctx.audio.tone(freq(NOTES[pairs[o].col] + 12), 0.07, 'sine', 0.1);
      return true;
    }
    function drop() { active = -1; carrying = false; lastCell = -1; }
    function connectFx(p) {
      const col = COLORS[pairs[p].col], nt = NOTES[pairs[p].col];
      popT[p] = 0;
      tone(nt, 0.55, 'sine', 0.22); tone(nt + 12, 0.35, 'triangle', 0.06);
      for (const c of [pairs[p].a, pairs[p].b]) boom(cx(c), cy(c), col, 14);
    }
    function bumpAt(c) {
      bump = { c, t: 0 };
      const now = performance.now(); if (now - lastBad > 180) { lastBad = now; ctx.audio.tone(170, 0.09, 'triangle', 0.12, 110); }
    }
    // Ein Schritt der aktiven Leitung auf das Nachbarfeld c. true = Kopf ist jetzt auf c.
    function stepTo(c) {
      if (active < 0) return false;
      const p = paths[active], head = p[p.length - 1];
      if (c === head) return true;
      if (!nb(head, c)) return false;
      if (p.length >= 2 && c === p[p.length - 2]) { p.pop(); rebuild(); hud(); tick(p.length); return true; }
      const o = owner[c];
      const wasConn = new Set();
      pairs.forEach((_, q) => { if (connected(q)) wasConn.add(q); });
      if (c === partner(active, p[0])) {
        p.push(c);
      } else if (o === active) {
        p.length = p.indexOf(c) + 1;           // eigene Leitung gekreuzt: bis dahin zurückschneiden
      } else if (o >= 0) {
        if (isEnd(o, c)) { bumpAt(c); return false; }
        const q = paths[o]; q.length = q.indexOf(c); // fremde Leitung abschneiden
        p.push(c); ctx.audio.sfx('swoosh');
      } else p.push(c);
      rebuild(); hud();
      if (p.length > 1 && c === p[p.length - 1] && connected(active)) {
        const a = active; drop(); connectFx(a);
      } else tick(p.length);
      pairs.forEach((_, q) => { if (wasConn.has(q) && !connected(q)) ctx.audio.tone(260, 0.12, 'triangle', 0.08, 140); });
      checkWin();
      return true;
    }
    function tick(len) {
      const now = performance.now(); if (now - lastTick < 40) return; lastTick = now;
      ctx.audio.tone(330 + Math.min(len, 14) * 26, 0.05, 'sine', 0.07);
    }
    function moveHead(pt) {
      // Zeigerweg in kleinen Schritten abtasten, damit schnelle Züge keine Felder überspringen
      const from = lastPos || pt, dx = pt.x - from.x, dy = pt.y - from.y;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (cs / 4)));
      for (let s = 1; s <= steps && active >= 0; s++) {
        const c = cellAt({ x: from.x + dx * s / steps, y: from.y + dy * s / steps });
        if (c < 0 || c === lastCell) continue;
        lastCell = c; if (stepTo(c)) cur = c;
      }
      lastPos = pt;
    }
    function cellAt(pt) {
      const x = Math.floor((pt.x - bx) / cs), y = Math.floor((pt.y - by) / cs);
      return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x;
    }

    // ---------- Tipp ----------
    const same = (a, b) => a.length === b.length && (a.every((v, i) => v === b[i]) || a.every((v, i) => v === b[b.length - 1 - i]));
    function tip() {
      if (mode !== 'play' || tipsLeft <= 0) return;
      const cand = pairs.map((_, p) => p).filter(p => !same(paths[p], sol[p]));
      if (!cand.length) { ctx.toast('Alle Leitungen sind schon richtig!'); return; }
      const score = p => {
        const set = new Set(sol[p]); let bad = 0;
        paths.forEach((q, o) => { if (o !== p) q.forEach(c => { if (set.has(c)) bad++; }); });
        return (connected(p) ? 100 : 0) + bad;
      };
      cand.sort((x, y) => score(x) - score(y));
      const p = cand[0], set = new Set(sol[p]);
      paths.forEach((q, o) => {
        if (o === p) return;
        const k = q.findIndex(c => set.has(c)); if (k >= 0) q.length = k;
      });
      paths[p] = sol[p].slice();
      tipsLeft--; drop(); rebuild(); hud();
      ctx.audio.sfx('power'); connectFx(p);
      ctx.toast('Tipp: ' + NAMES[pairs[p].col] + ' ist verbunden!', 1500);
      checkWin();
    }

    // ---------- Sieg ----------
    function checkWin() {
      if (mode !== 'play' || !allConnected() || filled() < T) return;
      mode = 'won'; winT = 0; drop();
      solved[idx] = true; reached = Math.max(reached, Math.min(LEVELS.length, idx + 2));
      ctx.save('solved', solved); ctx.save('reached', reached);
      pairs.forEach((pr, p) => tone(NOTES[pr.col], 1.5, 'sine', Math.min(0.16, 0.5 / pairs.length)));
      pairs.forEach((pr, p) => tone(NOTES[pr.col] + 12, 1.0, 'triangle', 0.03, 0.05));
      ctx.audio.sfx('level');
      ctx.fx.shake(250);
    }
    function finishGame() {
      const s = solvedCount(), st = starsFor(s);
      const need = s >= 10 ? '' : s >= 6 ? ' Für den dritten Stern fehlen noch ' + (10 - s) + ' Level.' : s >= 3 ? ' Für den zweiten Stern fehlen noch ' + (6 - s) + ' Level.' : ' Für den ersten Stern fehlen noch ' + (3 - s) + ' Level.';
      ctx.finish({
        won: st > 0, stars: st, score: s,
        text: s >= 10 ? 'Alle 10 Level gelöst - du bist ein Leitungs-Meister!' : 'Du hast ' + s + ' von 10 Leveln gelöst.' + need,
      });
    }

    // ---------- Zeiger ----------
    ctx.on(canvas, 'pointerdown', e => {
      e.preventDefault(); kb = false;
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      const pt = pos(e);
      if (mode === 'won' || mode === 'done') return;
      const b = hitBtn(pt);
      if (b >= 0) { pressed = b; focus = b; return; }
      if (mode === 'play') {
        const c = cellAt(pt);
        if (c >= 0 && grab(c)) { lastCell = c; lastPos = pt; cur = c; }
      }
    });
    ctx.on(canvas, 'pointermove', e => {
      const pt = pos(e);
      if (mode === 'play' && active >= 0 && !(pressed >= 0)) { moveHead(pt); return; }
      if (mode === 'menu' || mode === 'panel') { const b = hitBtn(pt); if (b >= 0 && e.pointerType === 'mouse') focus = b; canvas.style.cursor = b >= 0 ? 'pointer' : 'default'; }
    });
    const up = e => {
      const pt = pos(e);
      if (pressed >= 0) { const b = hitBtn(pt); const pb = pressed; pressed = -1; if (b === pb && btns[pb]) btns[pb].fn(); }
      if (active >= 0) drop();
      lastPos = null;
    };
    ctx.on(canvas, 'pointerup', up);
    ctx.on(canvas, 'pointercancel', () => { pressed = -1; if (active >= 0) drop(); lastPos = null; });

    // ---------- Tastatur ----------
    const DIRV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    ctx.input.onPress(name => {
      kb = true;
      if (mode === 'won' || mode === 'done') return;
      if (mode === 'menu' || mode === 'panel') {
        const d = DIRV[name];
        if (d) {
          const m = btns.length;
          if (mode === 'panel') focus = (focus + (d[1] || d[0]) + m) % m;
          else if (focus === m - 1) { if (d[1] < 0) focus = m - 2; }
          else if (d[0]) focus = (focus ^ 1);
          else { const f = focus + d[1] * 2; focus = f < 0 ? focus : f >= m - 1 ? m - 1 : f; }
          ctx.audio.sfx('tick');
        } else if (name === 'a') { const b = btns[focus]; if (b && !b.disabled) b.fn(); else if (b) ctx.audio.tone(200, 0.08, 'triangle', 0.1, 120); }
        return;
      }
      if (name === 'a') {
        if (carrying) { drop(); ctx.audio.sfx('tick'); } else if (!grab(cur)) ctx.audio.tone(200, 0.06, 'triangle', 0.08);
        return;
      }
      if (name === 'b') {
        const o = owner[cur];
        if (o >= 0) { paths[o] = []; drop(); rebuild(); hud(); ctx.audio.sfx('swoosh'); }
        return;
      }
      const d = DIRV[name]; if (!d) return;
      const x = (cur % n) + d[0], y = ((cur / n) | 0) + d[1];
      if (x < 0 || y < 0 || x >= n || y >= n) return;
      const t = y * n + x;
      if (carrying) { if (stepTo(t)) cur = t; }
      else { cur = t; ctx.audio.tone(500, 0.025, 'sine', 0.04); }
    });
    ctx.on(window, 'keydown', e => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (mode === 'play') {
        if (k === 't') tip(); else if (k === 'r') clearBoard(); else if (k === 'n') { startLevel(idx); } else if (k === 'escape' || k === 'm') showMenu();
      } else if (mode === 'panel' && k === 'escape') showMenu();
    });

    // ---------- Zeichnen ----------
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const text = (s, x, y, size, color, align = 'center', weight = 'bold') => { g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(s, x, y); };

    function symbol(k, x, y, r) {
      g.save(); g.translate(x, y); g.beginPath();
      const poly = pts => pts.forEach((q, i) => i ? g.lineTo(q[0] * r, q[1] * r) : g.moveTo(q[0] * r, q[1] * r));
      switch (k) {
        case 0: g.arc(0, 0, r * 0.8, 0, 6.283); break;
        case 1: poly([[0, -1], [0.95, 0.75], [-0.95, 0.75]]); g.closePath(); break;
        case 2: poly([[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]); g.closePath(); break;
        case 3: { const pts = []; for (let i = 0; i < 10; i++) { const a = -1.5708 + i * 0.6283, q = i % 2 ? 0.45 : 1.05; pts.push([Math.cos(a) * q, Math.sin(a) * q]); } poly(pts); g.closePath(); break; }
        case 4: poly([[0, -1.1], [0.9, 0], [0, 1.1], [-0.9, 0]]); g.closePath(); break;
        case 5: poly([[-0.3, -1], [0.3, -1], [0.3, -0.3], [1, -0.3], [1, 0.3], [0.3, 0.3], [0.3, 1], [-0.3, 1], [-0.3, 0.3], [-1, 0.3], [-1, -0.3], [-0.3, -0.3]]); g.closePath(); break;
        case 6: g.rotate(0.7854); poly([[-0.3, -1], [0.3, -1], [0.3, -0.3], [1, -0.3], [1, 0.3], [0.3, 0.3], [0.3, 1], [-0.3, 1], [-0.3, 0.3], [-1, 0.3], [-1, -0.3], [-0.3, -0.3]]); g.closePath(); break;
        default: { const pts = []; for (let i = 0; i < 6; i++) pts.push([Math.cos(i * 1.0472) * 1, Math.sin(i * 1.0472) * 1]); poly(pts); g.closePath(); }
      }
      g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = 'rgba(11,20,55,.85)'; g.stroke();
      g.fillStyle = '#fff'; g.fill(); g.restore();
    }
    function ornament(c, p, scale, glow) {
      const x = cx(c), y = cy(c), col = COLORS[pairs[p].col], r = cs * 0.37 * scale;
      g.save();
      g.shadowColor = col; g.shadowBlur = glow;
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
      gr.addColorStop(0, '#ffffffcc'); gr.addColorStop(0.28, col); gr.addColorStop(1, col);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y + 1, r, 0, 6.283); g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.stroke();
      // Kappe und Öse
      g.fillStyle = '#d9a441'; rr(x - r * 0.28, y - r - r * 0.34, r * 0.56, r * 0.34, 2); g.fill();
      g.strokeStyle = '#d9a441'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y - r - r * 0.5, r * 0.2, 0, 6.283); g.stroke();
      g.restore();
      symbol(pairs[p].col, x, y + 1, r * 0.5);
    }
    function pointAt(path, u) {
      const i = Math.max(0, Math.min(path.length - 2, Math.floor(u))), f = Math.max(0, Math.min(1, u - i));
      return [cx(path[i]) + (cx(path[i + 1]) - cx(path[i])) * f, cy(path[i]) + (cy(path[i + 1]) - cy(path[i])) * f];
    }

    function drawBackground(dt) {
      g.fillStyle = '#0b1437'; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (const f of flakes) {
        f.y += f.v * dt; f.x += Math.sin(time + f.y * 0.03) * 0.15; if (f.y > H) { f.y = -4; f.x = Math.random() * W; }
        g.globalAlpha = 0.25 + f.r * 0.2; g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.283); g.fill();
      }
      g.globalAlpha = 1;
    }

    function drawButton(b, i) {
      const off = b.disabled || (b.off && b.off()), isF = focus === i && (mode === 'menu' || mode === 'panel') && !off;
      const press = pressed === i ? 2 : 0;
      g.save(); g.translate(0, press);
      rr(b.x, b.y, b.w, b.h, 12);
      g.fillStyle = off ? 'rgba(255,255,255,.05)' : b.kind === 'big' ? 'rgba(255,209,102,.95)' : 'rgba(142,202,230,.16)'; g.fill();
      g.lineWidth = isF ? 3 : 1.5; g.strokeStyle = isF ? GOLD : off ? 'rgba(255,255,255,.1)' : b.kind === 'big' ? '#ffe9ad' : 'rgba(142,202,230,.5)'; g.stroke();
      if (b.kind === 'tile') {
        const done = solved[b.i], L = LEVELS[b.i];
        text('Level ' + (b.i + 1), b.x + 14, b.y + 24, 18, off ? '#6f7aa6' : '#fff', 'left');
        text(L.n + '×' + L.n + ' · ' + L.k + ' Farben', b.x + 14, b.y + 46, 12.5, off ? '#55608c' : '#a9c6e6', 'left', 'normal');
        if (done) { g.fillStyle = '#06d6a0'; g.beginPath(); g.arc(b.x + b.w - 24, b.y + b.h / 2, 13, 0, 6.283); g.fill(); g.strokeStyle = '#0b1437'; g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(b.x + b.w - 30, b.y + b.h / 2); g.lineTo(b.x + b.w - 25, b.y + b.h / 2 + 5); g.lineTo(b.x + b.w - 17, b.y + b.h / 2 - 5); g.stroke(); }
        else if (off) { const lx = b.x + b.w - 24, ly = b.y + b.h / 2; g.fillStyle = '#55608c'; rr(lx - 8, ly - 3, 16, 12, 3); g.fill(); g.strokeStyle = '#55608c'; g.lineWidth = 2.5; g.beginPath(); g.arc(lx, ly - 3, 5, 3.14, 0); g.stroke(); }
      } else {
        const lbl = b.label + (b.sub ? ' (' + b.sub() + ')' : '');
        text(lbl, b.x + b.w / 2, b.y + b.h / 2 + 1, b.kind === 'big' ? 18 : 15, off ? '#55608c' : b.kind === 'big' ? '#0b1437' : '#e6f1ff');
      }
      g.restore();
    }

    function drawBoard() {
      const bw = cs * n;
      // Platte
      rr(bx - 6, by - 6, bw + 12, bw + 12, 14); g.fillStyle = '#121f52'; g.fill();
      g.strokeStyle = 'rgba(142,202,230,.35)'; g.lineWidth = 2; g.stroke();
      // Felder
      for (let c = 0; c < T; c++) {
        const x = bx + (c % n) * cs, y = by + ((c / n) | 0) * cs, o = owner[c];
        g.fillStyle = (c + ((c / n) | 0)) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.0)'; g.fillRect(x, y, cs, cs);
        if (o >= 0) { g.globalAlpha = 0.17; g.fillStyle = COLORS[pairs[o].col]; g.fillRect(x + 1, y + 1, cs - 2, cs - 2); g.globalAlpha = 1; }
      }
      g.strokeStyle = 'rgba(142,202,230,.16)'; g.lineWidth = 1; g.beginPath();
      for (let i = 1; i < n; i++) { g.moveTo(bx + i * cs, by); g.lineTo(bx + i * cs, by + bw); g.moveTo(bx, by + i * cs); g.lineTo(bx + bw, by + i * cs); }
      g.stroke();
      // Leitungen
      g.lineCap = 'round'; g.lineJoin = 'round';
      const flash = mode === 'won' ? Math.max(0, 1 - Math.abs(winT - 0.9) * 1.2) : 0;
      pairs.forEach((pr, p) => {
        const q = paths[p]; if (q.length < 2) return;
        const col = COLORS[pr.col], isA = p === active;
        g.save(); g.shadowColor = col; g.shadowBlur = isA ? 20 : 7 + flash * 14;
        g.strokeStyle = col; g.lineWidth = cs * 0.36; g.beginPath();
        q.forEach((c, i) => i ? g.lineTo(cx(c), cy(c)) : g.moveTo(cx(c), cy(c))); g.stroke();
        g.shadowBlur = 0; g.strokeStyle = isA || flash ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.28)'; g.lineWidth = cs * 0.12; g.stroke();
        g.restore();
        if (isA) { const h = q[q.length - 1]; g.fillStyle = '#fff'; g.shadowColor = col; g.shadowBlur = 18; g.beginPath(); g.arc(cx(h), cy(h), cs * (0.17 + 0.03 * Math.sin(time * 12)), 0, 6.283); g.fill(); g.shadowBlur = 0; }
      });
      // Kugeln
      pairs.forEach((pr, p) => {
        const con = connected(p);
        for (const c of [pr.a, pr.b]) {
          let sc = 1, gl = 8;
          if (con) { sc = 1 + 0.05 * Math.sin(time * 4 + p); gl = 16 + 6 * Math.sin(time * 4 + p); }
          if (popT[p] < 0.5) sc += Math.sin(popT[p] / 0.5 * 3.14) * 0.35;
          if (active === p) { sc += 0.08; gl = 22; }
          ornament(c, p, sc, gl);
          if (popT[p] < 0.7) {
            const k = popT[p] / 0.7; g.strokeStyle = COLORS[pr.col]; g.globalAlpha = 1 - k; g.lineWidth = 3; g.beginPath(); g.arc(cx(c), cy(c), cs * (0.4 + k * 0.6), 0, 6.283); g.stroke(); g.globalAlpha = 1;
          }
        }
      });
      // Lichtimpuls bei Lösung
      if (mode === 'won') {
        pairs.forEach((pr, p) => {
          const q = paths[p]; if (q.length < 2) return;
          const L = q.length - 1, u = (winT - p * 0.07) / 0.95; if (u < 0 || u > 1.25) return;
          for (let s = 0; s < 7; s++) {
            const uu = Math.max(0, Math.min(1, u)) * L - s * 0.35; if (uu < 0) continue;
            const [x, y] = pointAt(q, uu);
            g.globalAlpha = (1 - s / 7) * Math.max(0, Math.min(1, 1.25 - u) * 1.2);
            g.fillStyle = '#fff'; g.shadowColor = COLORS[pr.col]; g.shadowBlur = 20;
            g.beginPath(); g.arc(x, y, cs * 0.2 * (1 - s / 9), 0, 6.283); g.fill();
          }
          g.globalAlpha = 1; g.shadowBlur = 0;
        });
      }
      // Tastatur-Cursor
      if (kb && (mode === 'play') ) {
        const x = bx + (cur % n) * cs, y = by + ((cur / n) | 0) * cs, k = carrying ? 4 : 2.5;
        g.strokeStyle = GOLD; g.lineWidth = k; g.globalAlpha = 0.65 + 0.35 * Math.sin(time * 8); rr(x + 2, y + 2, cs - 4, cs - 4, 8); g.stroke(); g.globalAlpha = 1;
      }
      if (bump) { const x = bx + (bump.c % n) * cs, y = by + ((bump.c / n) | 0) * cs; g.strokeStyle = '#ef476f'; g.globalAlpha = 1 - bump.t / 0.35; g.lineWidth = 3; rr(x + 2, y + 2, cs - 4, cs - 4, 8); g.stroke(); g.globalAlpha = 1; }
    }

    function drawPlay() {
      const p = pct();
      text('Level ' + (idx + 1), 20, 22, 18, '#fff', 'left');
      text(n + '×' + n, 98, 23, 13, '#a9c6e6', 'left', 'normal');
      text('Felder: ' + p + ' %', W - 20, 22, 18, p === 100 ? '#06d6a0' : GOLD, 'right');
      rr(20, 40, W - 40, 9, 4.5); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill();
      if (p > 0) { rr(20, 40, Math.max(9, (W - 40) * p / 100), 9, 4.5); g.fillStyle = p === 100 ? '#06d6a0' : GOLD; g.fill(); }
      drawBoard();
      const conn = pairs.filter((_, q) => connected(q)).length;
      let msg;
      if (mode === 'won' || mode === 'panel' || mode === 'done') msg = 'Geschafft!';
      else if (allConnected()) msg = 'Alle verbunden - fülle noch die leeren Felder!';
      else msg = conn + ' von ' + pairs.length + ' Paaren verbunden';
      text(msg, W / 2, 420, 15, msg === 'Geschafft!' ? '#06d6a0' : '#cfe3ff');
      btns.forEach(drawButton);
      if (!ctx.input.isTouch) text('Pfeile: Cursor · Leertaste: Leitung aufnehmen/ablegen · T: Tipp', W / 2, 520, 11.5, '#7f8fc4', 'center', 'normal');
      else text('Zieh von Kugel zu Kugel. Alle Felder füllen!', W / 2, 520, 12.5, '#7f8fc4', 'center', 'normal');
    }

    function drawMenu() {
      text('Farb-Leitungen', W / 2, 28, 24, GOLD);
      text('Verbinde gleiche Kugeln und fülle alle Felder', W / 2, 49, 12.5, '#a9c6e6', 'center', 'normal');
      btns.forEach(drawButton);
      const s = solvedCount();
      const nxt = s >= 10 ? 'Alle drei Sterne geschafft!' : 'Sterne: 3 Level = ★, 6 = ★★, alle 10 = ★★★';
      text(nxt, W / 2, 508 + 0, 12.5, '#a9c6e6', 'center', 'normal');
      if (!ctx.input.isTouch) text('Pfeile wählen, Leertaste öffnet', W / 2, 534, 11.5, '#7f8fc4', 'center', 'normal');
    }

    function drawPanel() {
      g.fillStyle = 'rgba(5,10,30,.72)'; g.fillRect(0, 0, W, H);
      rr(34, 190, W - 68, 240, 18); g.fillStyle = '#16225a'; g.fill(); g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
      text('Level ' + (idx + 1) + ' geschafft!', W / 2, 232, 24, GOLD);
      const s = solvedCount();
      text(s + ' von ' + LEVELS.length + ' Leveln gelöst', W / 2, 266, 15, '#e6f1ff', 'center', 'normal');
      btns.forEach(drawButton);
    }

    ctx.loop(dt => {
      time += dt;
      popT = popT.map(v => v + dt);
      if (bump) { bump.t += dt; if (bump.t > 0.35) bump = null; }
      if (mode === 'won') {
        winT += dt;
        if (winT > 2.1) { if (idx === LEVELS.length - 1) { mode = 'done'; finishGame(); } else { mode = 'panel'; layoutPanel(); } }
      }
      sparks = sparks.filter(s => (s.life -= dt) > 0);
      for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 80 * dt; }
      drawBackground(dt);
      if (mode === 'menu') drawMenu(); else { drawPlay(); if (mode === 'panel') drawPanel(); }
      for (const s of sparks) { g.globalAlpha = Math.max(0, s.life * 2); g.fillStyle = s.color; g.fillRect(s.x - 2, s.y - 2, 4, 4); }
      g.globalAlpha = 1;
    });

    showMenu();
    return { destroy() {} };
  },
};
