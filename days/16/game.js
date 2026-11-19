// Türchen 16: Schatzinsel (Buddel-Logikspiel im Piraten-Look)
import { LEVELS, generate, buildNb, findSure } from './board.js';

export const howto = {
  touch: 'Tippe Sandfelder an und grabe alle ohne Krabbe aus: Die Zahl zeigt, wie viele Krabben direkt daneben lauern. Krabbe vermutet? Tippe unten auf "Flagge" oder drücke lange auf ein Feld.',
  keys: 'Klicke Sandfelder an (oder Pfeiltasten + Leertaste) und grabe alle ohne Krabbe aus: Die Zahl zeigt, wie viele Krabben direkt daneben lauern. Flagge setzen: Rechtsklick oder Taste X.',
};
export const starsInfo = '★ Insel 1 geschafft · ★★ Insel 2 · ★★★ Insel 3';

const W = 360, H = 600;
const GRID_TOP = 50, GRID_H = 392, GRID_W = 336;
const BTN = { x: 15, y: 540, w: 330, h: 52 };
const GOAL = 'Grabe alle Felder ohne Krabbe aus. Die Zahl sagt, wie viele Krabben direkt daneben lauern.';
const START_HEARTS = 5, maxHearts = idx => START_HEARTS + idx;
const NUMCOL = ['', '#8ecae6', '#06d6a0', '#ff6b8b', '#c77dff', '#ffd166', '#ff9e4a', '#ffffff', '#ffffff'];
const tips = (touch, hearts) => [
  touch ? 'Krabbe vermutet? Setz eine Flagge: unten "Flagge" tippen oder lange drücken.' : 'Krabbe vermutet? Flagge setzen: Rechtsklick oder Taste X.',
  'Zeigt eine 1 und daneben steht schon eine Flagge: Alle anderen Nachbarn sind sicher!',
  'Such die Truhen! Eine davon enthält ein Fernrohr, das eine Krabbe verrät.',
  'Tipp auf eine Zahl mit genug Flaggen drumherum: Der Rest wird aufgedeckt.',
  `Du hast noch ${hearts} Herzen. Krabben zwicken ganz schön!`,
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutBack = p => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.webkitTouchCallout = 'none';

    let T = 0;
    let L = 0, cfg, c, r, N, cs, gx, gy, gw, gh, nbr;
    let crab = null, nums = null, chest = null;           // Brett (erst nach dem ersten Graben)
    let rev, flag, spy, shownAt, hitC, danceAt, flagT, bumpAt;
    let revealedSafe = 0, safeTotal = 0, crabsHit = 0, chestsFound = 0;
    let hearts = START_HEARTS, score = 0, timer = 0, heartPop = new Array(8).fill(0);
    let firstHit = false, exampleDone = false, example = null, hitHL = null;
    let state = 'play';                                     // play | celebrate | trans | lost
    let mode = 'dig';
    let cur = 0, showCur = false, press = null, hold = {};
    let timers = [], fxs = [], parts = [], runners = [];
    let help = { text: '', until: 0 }, tipIdx = 0, nextTip = 9, firstDig = false;
    let shakeT = -9, flashT = -9, trans = null, rain = 0, palmSeed = [];
    const stars = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * 46, p: Math.random() * 6 }));

    const bestIsland = ctx.load('insel', 0);

    // ---------- Aufbau einer Insel ----------
    function setupIsland(idx) {
      L = idx; cfg = LEVELS[L]; c = cfg.c; r = cfg.r; N = c * r;
      cs = Math.min(Math.floor(GRID_W / c), Math.floor(GRID_H / r));
      gw = cs * c; gh = cs * r; gx = Math.round((W - gw) / 2); gy = Math.round(GRID_TOP + (GRID_H - gh) / 2);
      nbr = buildNb(c, r);
      crab = nums = chest = null;
      rev = new Uint8Array(N); flag = new Uint8Array(N); spy = new Uint8Array(N); hitC = new Uint8Array(N);
      shownAt = new Float32Array(N).fill(-99); danceAt = new Float32Array(N).fill(Infinity);
      flagT = new Float32Array(N).fill(-99); bumpAt = new Float32Array(N).fill(-99);
      revealedSafe = 0; safeTotal = N - cfg.crabs; crabsHit = 0; chestsFound = 0; timer = 0;
      timers = []; fxs = []; parts = []; runners = []; press = null; firstDig = false;
      cur = ((r / 2) | 0) * c + ((c / 2) | 0); showCur = false;
      palmSeed = [Math.random() * 6, Math.random() * 6, Math.random() * 6, Math.random() * 6];
      example = null; hitHL = null;
      help = { text: 'Tippe ein Sandfeld an. Der erste Spatenstich ist immer sicher!', until: T + 60 };
      if (idx > 0) exampleDone = true;
      state = 'play';
      hud();
    }
    function hud() { ctx.hud.set({ Insel: `${L + 1}/3`, Gold: score }); }

    const cellAt = (x, y) => {
      const col = Math.floor((x - gx) / cs), row = Math.floor((y - gy) / cs);
      return col < 0 || row < 0 || col >= c || row >= r ? -1 : row * c + col;
    };
    const cx = i => gx + (i % c + 0.5) * cs;
    const cy = i => gy + (((i / c) | 0) + 0.5) * cs;
    const later = (at, fn) => timers.push({ at, fn });
    function say(text, secs = 8) { help = { text, until: T + secs }; }

    // ---------- Partikel & Effekte ----------
    function burst(x, y, color, n = 10, spd = 90, grav = 260, size = 3) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * 6.283, v = spd * (0.3 + Math.random() * 0.9);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size, grav });
      }
    }
    function coinsBurst(x, y, n = 14) {
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 90 + Math.random() * 150;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.1, max: 1.1, color: '#ffd166', size: 4, grav: 420, coin: true, rot: Math.random() * 6 });
      }
    }
    function floatText(x, y, text, color = '#ffd166', size = 18) {
      fxs.push({ t0: T, dur: 1.1, draw(p) {
        g.save(); g.globalAlpha = 1 - p * p; g.font = `bold ${size}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const yy = y - 8 - p * 34, sc = 0.6 + 0.4 * easeOutBack(Math.min(1, p * 4));
        g.translate(x, yy); g.scale(sc, sc);
        g.lineWidth = 4; g.strokeStyle = '#0b1437'; g.strokeText(text, 0, 0); g.fillStyle = color; g.fillText(text, 0, 0); g.restore();
      } });
    }

    // ---------- Spielaktionen ----------
    function makeBoard(start) {
      const b = generate(c, r, cfg.crabs, cfg.chests, start);
      crab = b.crab; nums = b.n; chest = b.chest;
    }

    function dig(i) {
      if (state !== 'play' || i < 0) return;
      if (rev[i]) { chord(i); return; }
      if (flag[i] || spy[i]) { bumpAt[i] = T; ctx.audio.sfx('bad'); say(spy[i] ? 'Diese Krabbe hat dein Fernrohr entdeckt. Dort wird nicht gegraben!' : 'Dort steht eine Flagge. Tippe sie mit dem Flaggen-Knopf weg, um zu graben.', 5); return; }
      if (!crab) makeBoard(i);
      if (crab[i]) { hitCrab(i); checkWin(); return; }
      ctx.audio.sfx('click');
      revealFrom([i]);
      if (!firstDig) { firstDig = true; help = { text: '', until: 0 }; nextTip = T + 16; }
      if (example && example.cell === i) example = null;
      if (L === 0 && !exampleDone) later(maxShown() + 0.35, showExample);
      checkWin();
    }

    // Beispiel-Hinweis auf Insel 1: ein eindeutig sicheres oder gefährliches Feld (aus den offenen Zahlen gelöst)
    function showExample() {
      if (exampleDone || state !== 'play' || !crab) return;
      const known = new Uint8Array(N);
      for (let i = 0; i < N; i++) if (spy[i] || (rev[i] && crab[i])) known[i] = 1;
      const s = findSure(nbr, nums, crab, rev, known);
      if (!s) return;
      exampleDone = true;
      example = { cell: s.cell, kind: s.kind, clue: s.clue, t0: T, until: T + 12 };
      say(s.kind === 'safe' ? 'Hier ist es sicher: grabe dieses Feld aus!' : 'Hier lauert sicher eine Krabbe, setz eine Flagge.', 12);
      ctx.audio.sfx('power');
    }

    function revealFrom(starts) {
      const q = starts.map(i => [i, 0]);
      starts.forEach(i => { rev[i] = 1; });
      let head = 0, maxD = 0;
      while (head < q.length) {
        const [k, d] = q[head++];
        maxD = Math.max(maxD, d);
        shownAt[k] = T + d * 0.055;
        revealedSafe++; score++;
        const at = shownAt[k];
        later(at, () => { burst(cx(k), cy(k), '#e8c98a', 3, 40, 200, 2.5); });
        if (chest[k]) later(at + 0.2, () => openChest(k));
        if (nums[k] === 0) {
          for (const j of nbr[k]) if (!rev[j] && !crab[j]) {
            if (flag[j]) flag[j] = 0;
            rev[j] = 1; q.push([j, d + 1]);
          }
        }
      }
      for (let d = 0; d <= Math.min(maxD, 12); d++) ctx.audio.tone(420 + d * 34, 0.07, 'triangle', 0.05, undefined, d * 0.055);
      hud();
    }

    function hitCrab(i) {
      rev[i] = 1; hitC[i] = 1; shownAt[i] = T; crabsHit++;
      const x = cx(i), y = cy(i);
      hearts = Math.max(0, hearts - 1);
      heartPop[hearts] = T;
      hitHL = { i, until: T + (firstHit ? 2.2 : 6) };
      if (!firstHit) { firstHit = true; say('Autsch! Schau auf die Zahlen: Eine 1 heißt, genau eine Krabbe grenzt an dieses Feld.', 9); }
      flashT = T; shakeT = T;
      ctx.audio.sfx('hit'); ctx.fx.shake();
      burst(x, y, '#ef476f', 12, 110);
      burst(x, y, '#e8c98a', 8, 80, 300);
      floatText(x, y - 10, 'Autsch!', '#ff6b8b', 22);
      runners.push({ x, y, dir: x < W / 2 ? -1 : 1, t0: T, i, size: Math.min(1, cs / 40 + 0.3) });
      hud();
      if (hearts <= 0) lose();
    }

    function chord(i) {
      if (!nums || !nums[i]) { bumpAt[i] = T; return; }
      let f = 0; const targets = [];
      for (const j of nbr[i]) { if (flag[j] || spy[j]) f++; else if (!rev[j]) targets.push(j); }
      if (f !== nums[i] || !targets.length) { bumpAt[i] = T; ctx.audio.sfx('tick'); return; }
      ctx.audio.sfx('swoosh');
      const safeT = [];
      for (const j of targets) { if (crab[j]) hitCrab(j); else safeT.push(j); }
      if (state === 'play' || state === 'celebrate') {
        const fresh = safeT.filter(j => !rev[j]);
        if (fresh.length) {
          // erst alle markieren, dann Wellen ausbreiten
          revealFrom(fresh);
        }
      }
      checkWin();
    }

    function toggleFlag(i) {
      if (state !== 'play' || i < 0 || rev[i]) return;
      if (spy[i]) { bumpAt[i] = T; ctx.audio.sfx('bad'); return; }
      if (example && example.cell === i) example = null;
      flag[i] ^= 1; flagT[i] = T;
      ctx.audio.sfx(flag[i] ? 'pop' : 'tick');
      burst(cx(i), cy(i), '#f1d38b', 5, 50, 200, 2.5);
      if (flag[i] && !firstDig) say('Flagge gesetzt! Zum Graben schaltest du unten wieder auf "Graben".', 6);
    }

    function setMode(m) {
      if (mode === m) return;
      mode = m; ctx.audio.sfx('click');
      fxs.push({ t0: T, dur: 0.3, draw() {} });
    }

    // ---------- Truhen & Fernrohr ----------
    function openChest(k) {
      if (state === 'lost' || state === 'trans') return;
      const x = cx(k), y = cy(k), withSpy = chest[k] === 2, coins = 10 + L * 5;
      chestsFound++; score += coins; hud();
      ctx.audio.sfx('coin'); coinsBurst(x, y - 6, 16);
      floatText(x, y - 22, '+' + coins, '#ffd166', 20);
      fxs.push({ t0: T, dur: 1.4, draw(p) { drawChest(x, y - 4 - Math.min(1, p * 2.5) * 14, 0.5 + 0.5 * easeOutBack(Math.min(1, p * 3)), clamp(p * 4, 0, 1), 1 - clamp((p - 0.7) / 0.3, 0, 1)); } });
      if (withSpy) later(T + 0.9, () => useSpyglass(x, y));
    }
    function useSpyglass(x0, y0) {
      if (!crab || state === 'lost' || state === 'trans') return;
      const hidden = [], adj = [];
      for (let i = 0; i < N; i++) if (crab[i] && !rev[i] && !spy[i]) {
        hidden.push(i);
        if (nbr[i].some(j => rev[j])) adj.push(i);
      }
      const pool = adj.length ? adj : hidden;
      if (!pool.length) return;
      const i = pool[(Math.random() * pool.length) | 0];
      flag[i] = 0; spy[i] = 1; flagT[i] = T;
      ctx.audio.sfx('power');
      ctx.toast('Fernrohr: Krabbe markiert!', 3000);
      const x1 = cx(i), y1 = cy(i);
      fxs.push({ t0: T, dur: 1.2, draw(p) {
        const x = x0 + (x1 - x0) * easeOutBack(Math.min(1, p * 1.4)), y = y0 + (y1 - y0) * Math.min(1, p * 1.4) - Math.sin(Math.min(1, p * 1.4) * Math.PI) * 30;
        drawSpyglass(x, y, 1, p < 0.75 ? 1 : 1 - (p - 0.75) * 4);
        if (p > 0.55) { g.save(); g.globalAlpha = 1 - p; g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.beginPath(); g.arc(x1, y1, cs * (0.4 + (p - 0.55) * 1.6), 0, 6.3); g.stroke(); g.restore(); }
      } });
      burst(x1, y1, '#ffd166', 14, 100);
    }

    // ---------- Sieg & Niederlage ----------
    function checkWin() {
      if (state === 'play' && revealedSafe >= safeTotal && crab) winIsland();
    }
    function maxShown() { let m = T; for (let i = 0; i < N; i++) if (shownAt[i] > m) m = shownAt[i]; return m; }

    function winIsland() {
      state = 'celebrate';
      const waitAnim = Math.max(0, maxShown() - T) + 0.5;
      const bonus = Math.round(Math.max(0, 1 - timer / cfg.par) * 60);
      score += bonus; hud();
      ctx.save('insel', Math.max(bestIsland, ctx.load('insel', 0), L + 1));
      ctx.progress({ stars: L + 1, score, text: L >= LEVELS.length - 1 ? 'Alle drei Inseln gemeistert!' : `${L + 1} von 3 Inseln geschafft. Für den nächsten Stern schaffe Insel ${L + 2}.` });
      press = null;
      later(T + waitAnim, () => {
        ctx.audio.sfx('level'); ctx.fx.confetti(); rain = 3.2;
        ctx.toast(bonus ? `Insel ${L + 1} geschafft! Zeitbonus +${bonus}` : `Insel ${L + 1} geschafft!`, 3200);
        let k = 0;
        for (let i = 0; i < N; i++) if (crab[i] && !hitC[i]) {
          danceAt[i] = T + 0.1 * (k++ % 8) + Math.random() * 0.2; flag[i] = 0;
          const j = i; later(danceAt[i], () => { burst(cx(j), cy(j), '#ffd166', 8, 90); ctx.audio.tone(500 + (j % 5) * 90, 0.12, 'square', 0.04); });
        }
        coinsBurst(W / 2, 300, 30);
      });
      later(T + waitAnim + 3.4, () => {
        if (L >= LEVELS.length - 1) {
          state = 'lost'; // Eingabe sperren, Rahmen übernimmt
          ctx.finish({ won: true, stars: 3, score, text: 'Alle drei Inseln gemeistert, du bist ein echter Schatzsucher! Mehr geht nicht: 3 Sterne!' });
        } else {
          state = 'trans'; trans = { t0: T, swapped: false };
        }
      });
    }

    function lose() {
      state = 'lost'; press = null;
      let k = 0;
      for (let i = 0; i < N; i++) if (crab[i] && !rev[i]) {
        const j = i, d = (k++ % 10) * 0.07;
        later(T + d, () => { rev[j] = 1; hitC[j] = 1; shownAt[j] = T; burst(cx(j), cy(j), '#e8c98a', 5, 70); runners.push({ x: cx(j), y: cy(j), dir: Math.random() < 0.5 ? -1 : 1, t0: T - 0.45, i: j, size: Math.min(1, cs / 40 + 0.3) }); });
      }
      ctx.toast('Alle Herzen weg!', 2500);
      ctx.timeout(() => {
        const done = L;
        const more = done >= 2 ? 'Du hast zwei Inseln geschafft, nur noch die große fehlt!' : done === 1 ? 'Eine Insel geschafft. Für den 2. Stern musst du Insel 2 schaffen.' : 'Schaff Insel 1 für den ersten Stern: Zahlen lesen, Flaggen setzen!';
        ctx.finish({ won: false, stars: done, score, text: `${done} von 3 Inseln geschafft. ${more} Pro Insel gibt es einen Stern.` });
      }, 1900);
    }

    function nextIsland() {
      const gain = hearts < maxHearts(L + 1);
      hearts = Math.min(maxHearts(L + 1), hearts + 1);
      setupIsland(L + 1);
      const cr = cfg.crabs;
      ctx.toast(`Insel ${L + 1}: ${cr} Krabben!${gain ? ' +1 Herz' : ''}`, 3000);
      ctx.audio.sfx('swoosh');
    }

    // ---------- Eingaben ----------
    function act(i) { if (mode === 'dig') dig(i); else toggleFlag(i); }

    ctx.on(canvas, 'pointerdown', e => {
      e.preventDefault();
      const p = pos(e);
      if (e.button === 2) { if (state === 'play') { const i = cellAt(p.x, p.y); if (i >= 0) toggleFlag(i); } return; }
      if (e.button > 0) return;
      if (p.y >= BTN.y - 8 && p.x >= BTN.x - 4 && p.x <= BTN.x + BTN.w + 4) { setMode(p.x < W / 2 ? 'dig' : 'flag'); return; }
      if (state !== 'play') return;
      const i = cellAt(p.x, p.y); if (i < 0) return;
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      press = { i, t0: performance.now(), x: p.x, y: p.y, fired: false, id: e.pointerId };
      cur = i; showCur = e.pointerType === 'mouse';
    });
    ctx.on(canvas, 'pointermove', e => {
      const p = pos(e);
      if (press && e.pointerId === press.id && Math.hypot(p.x - press.x, p.y - press.y) > 14) press = null;
      if (e.pointerType === 'mouse' && !press) { const i = cellAt(p.x, p.y); if (i >= 0) { cur = i; showCur = true; } else showCur = false; }
    });
    const up = e => {
      if (!press || e.pointerId !== press.id) return;
      const pr = press; press = null;
      if (e.type === 'pointerup' && !pr.fired) act(pr.i);
    };
    ctx.on(canvas, 'pointerup', up);
    ctx.on(canvas, 'pointercancel', up);
    ctx.on(canvas, 'contextmenu', e => e.preventDefault());
    ctx.on(canvas, 'pointerleave', e => { if (e.pointerType === 'mouse') showCur = false; });

    const moveCur = name => {
      const dx = name === 'left' ? -1 : name === 'right' ? 1 : 0, dy = name === 'up' ? -1 : name === 'down' ? 1 : 0;
      let x = cur % c, y = (cur / c) | 0;
      if (!showCur) { showCur = true; return; }
      x = clamp(x + dx, 0, c - 1); y = clamp(y + dy, 0, r - 1); cur = y * c + x;
    };
    ctx.input.onPress(name => {
      if (state !== 'play') return;
      if (name === 'left' || name === 'right' || name === 'up' || name === 'down') { moveCur(name); hold[name] = 0; ctx.audio.sfx('tick'); }
      else if (name === 'a') { showCur = true; dig(cur); }
      else if (name === 'b') { showCur = true; toggleFlag(cur); }
    });

    // ---------- Zeichnen ----------
    function rr(x, y, w, h, rad) {
      g.beginPath();
      if (g.roundRect) g.roundRect(x, y, w, h, rad); else g.rect(x, y, w, h);
    }

    function drawWater() {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#0b1437'); gr.addColorStop(0.18, '#0d2354'); gr.addColorStop(1, '#0f4466');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (const s of stars) { g.globalAlpha = 0.35 + 0.35 * Math.sin(T * 2 + s.p); g.fillStyle = '#fff'; g.fillRect(s.x, s.y, 1.6, 1.6); }
      g.globalAlpha = 1;
      g.lineWidth = 2; g.lineCap = 'round';
      for (let y = 40, row = 0; y < H; y += 17, row++) {
        g.strokeStyle = `rgba(142,202,230,${0.09 + 0.05 * Math.sin(T + row)})`;
        g.beginPath();
        for (let x = -10; x <= W + 10; x += 8) {
          const yy = y + Math.sin(x * 0.045 + T * 1.6 + row * 1.7) * 3.2;
          x === -10 ? g.moveTo(x, yy) : g.lineTo(x, yy);
        }
        g.stroke();
      }
    }

    function drawIsland() {
      const ring = (pad, fill, stroke, lw) => { rr(gx - pad, gy - pad, gw + pad * 2, gh + pad * 2, 26 + pad * 0.4); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } };
      ring(17 + Math.sin(T * 1.3) * 1.5, 'rgba(60,170,185,.30)');
      const f = 0.5 + 0.5 * Math.sin(T * 1.8);
      ring(13 + f * 3, null, `rgba(255,255,255,${0.2 + 0.25 * (1 - f)})`, 2.5);
      ring(9, '#a9854b');
      ring(7, '#d8b36d');
    }

    function drawTile(i, hover) {
      const x = gx + (i % c) * cs, y = gy + ((i / c) | 0) * cs, odd = ((i % c) + ((i / c) | 0)) & 1;
      const ix = x + 1.5, iy = y + 1.5, s = cs - 3;
      const dt = T - shownAt[i];
            const lift = Math.max(0, 1 - (T - bumpAt[i]) * 5) * Math.sin((T - bumpAt[i]) * 60) * 2;
      // offenes Loch (wird auch während der Aufdeck-Animation darunter gezeichnet)
      if (rev[i] && dt >= -0.001) {
        const hole = crab && crab[i];
        g.fillStyle = hole ? '#4a3622' : '#80633f'; rr(ix, iy, s, s, 6); g.fill();
        g.fillStyle = hole ? '#35261a' : '#6a4f33'; rr(ix, iy, s, s * 0.45, 6); g.fill();
        g.fillStyle = hole ? '#4a3622' : '#80633f'; g.fillRect(ix + 1, iy + s * 0.25, s - 2, s * 0.25);
        if (hole) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + cs / 2, y + cs / 2 + 2, cs * 0.3, cs * 0.2, 0, 0, 6.3); g.fill(); }
      }
      if (!rev[i] || dt < 0.3) {
        // Sandhügel (Hügel zerfällt beim Aufdecken)
        const p = rev[i] && dt >= 0 ? clamp(dt / 0.3, 0, 1) : 0;
        g.save();
        g.translate(x + cs / 2, y + cs / 2 + lift - p * 6); g.scale(1 + 0.06 * hover - p * 0.5, 1 + 0.06 * hover - p * 0.5); g.rotate(p * 0.5 * (i % 2 ? 1 : -1));
        g.globalAlpha = 1 - p;
        g.fillStyle = '#c29a55'; rr(-s / 2, -s / 2 + 3, s, s, 7); g.fill();
        g.fillStyle = hover ? '#f8e0a6' : odd ? '#f0cf8a' : '#e9c67f'; rr(-s / 2, -s / 2, s, s - 3, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; rr(-s / 2 + 3, -s / 2 + 2, s - 6, 4, 2); g.fill();
        g.fillStyle = 'rgba(160,120,60,.35)';
        const h1 = (i * 7919) % 13, h2 = (i * 104729) % 11;
        g.beginPath(); g.arc(-s * 0.2 + h1 * 0.6, -s * 0.05 + h2 * 0.4, 1.4, 0, 6.3); g.arc(s * 0.15 + h2 * 0.5, s * 0.15 - h1 * 0.3, 1.2, 0, 6.3); g.fill();
        g.restore();
        if (rev[i] && dt >= 0 && dt < 0.4) {
          g.strokeStyle = `rgba(190,230,250,${0.6 * (1 - dt / 0.4)})`; g.lineWidth = 2; g.beginPath(); g.arc(x + cs / 2, y + cs / 2, cs * (0.25 + dt * 1.6), 0, 6.3); g.stroke();
        }
      }
      // Zahl
      if (rev[i] && dt >= 0.05 && crab && !crab[i] && nums[i] > 0) {
        const k = easeOutBack(clamp((dt - 0.05) / 0.3, 0, 1));
        g.save(); g.translate(x + cs / 2, y + cs / 2 + 1); g.scale(k, k);
        g.font = `bold ${Math.round(cs * 0.58)}px "Trebuchet MS", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 3.5; g.strokeStyle = '#2a1d10'; g.strokeText(nums[i], 0, 0);
        g.fillStyle = NUMCOL[nums[i]]; g.fillText(nums[i], 0, 0); g.restore();
      }
      // Flaggen
      if (!rev[i] && (flag[i] || spy[i])) drawFlag(x + cs / 2, y + cs / 2 + lift, spy[i] ? 2 : 1, T - flagT[i], i);
    }

    function drawFlag(x, y, kind, age, i) {
      const sc = cs / 40 * (0.75 + 0.25 * easeOutBack(clamp(age * 5, 0, 1)));
      g.save(); g.translate(x, y + 2); g.scale(sc * 1.15, sc * 1.15);
      g.fillStyle = 'rgba(120,80,30,.45)'; g.beginPath(); g.ellipse(0, 11, 9, 3, 0, 0, 6.3); g.fill();
      if (kind === 2) { g.shadowColor = '#ffd166'; g.shadowBlur = 8 + 4 * Math.sin(T * 4 + i); }
      g.strokeStyle = '#5a3a1c'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-3, 11); g.lineTo(-3, -13); g.stroke();
      const w1 = Math.sin(T * 6 + i) * 1.6;
      g.fillStyle = kind === 2 ? '#ffd166' : '#ef476f';
      g.beginPath(); g.moveTo(-3, -13); g.quadraticCurveTo(6, -14 + w1, 12, -9 + w1); g.quadraticCurveTo(5, -6 - w1, -3, -3); g.closePath(); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = kind === 2 ? '#7a4b00' : '#fff';
      if (kind === 2) { g.beginPath(); g.arc(3, -8.5, 2.2, 0, 6.3); g.fill(); g.fillStyle = '#ffd166'; g.fillRect(2.4, -6.5, 1.2, 1.5); }
      else { g.beginPath(); g.arc(3.5, -8.4, 2, 0, 6.3); g.fill(); }
      g.restore();
    }

    function drawCrab(x, y, s, t, pose) {
      g.save(); g.translate(x, y); g.scale(s, s);
      const raise = pose === 'pinch' ? 6 + Math.sin(t * 30) * 2 : pose === 'dance' ? 5 + Math.sin(t * 10) * 5 : 1 + Math.sin(t * 12);
      g.lineCap = 'round';
      g.strokeStyle = '#c1344f'; g.lineWidth = 2.4;
      for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) {
        const wig = Math.sin(t * (pose === 'run' ? 22 : 12) + k * 2 + sd) * 2.5;
        g.beginPath(); g.moveTo(sd * 8, 2 + k * 3); g.lineTo(sd * (14 + k), 5 + k * 3 + wig); g.stroke();
      }
      for (const sd of [-1, 1]) {
        g.strokeStyle = '#d93c5f'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(sd * 9, -1); g.lineTo(sd * 15, -7 - raise); g.stroke();
        g.fillStyle = '#ef476f'; g.beginPath(); g.moveTo(sd * 15, -10 - raise);
        g.arc(sd * 15, -10 - raise, 6, -0.4 - Math.PI / 2 + (sd < 0 ? 0 : 0.2), Math.PI * 1.5 - 0.4 + 0.2); g.closePath(); g.fill();
      }
      const bg = g.createLinearGradient(0, -8, 0, 9); bg.addColorStop(0, '#ff7a93'); bg.addColorStop(1, '#d93c5f');
      g.fillStyle = bg; g.beginPath(); g.ellipse(0, 1, 12, 9, 0, 0, 6.3); g.fill();
      g.strokeStyle = '#e9e2c8'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-4, -6); g.lineTo(-4, -11); g.moveTo(4, -6); g.lineTo(4, -11); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-4, -12, 3.2, 0, 6.3); g.arc(4, -12, 3.2, 0, 6.3); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(-4 + (pose === 'run' ? 1 : 0), -12, 1.5, 0, 6.3); g.arc(4 + (pose === 'run' ? 1 : 0), -12, 1.5, 0, 6.3); g.fill();
      g.strokeStyle = '#7a1b30'; g.lineWidth = 1.4; g.beginPath();
      if (pose === 'pinch') g.arc(0, 6, 3, Math.PI * 1.1, Math.PI * 1.9); else g.arc(0, 2, 3.5, 0.2, Math.PI - 0.2);
      g.stroke();
      g.restore();
    }

    function drawChest(x, y, s, open, alpha = 1) {
      g.save(); g.globalAlpha = alpha; g.translate(x, y); g.scale(s * cs / 36, s * cs / 36);
      if (open > 0.3) {
        g.save(); g.globalAlpha = alpha * 0.5; g.fillStyle = '#ffd166';
        for (let k = 0; k < 7; k++) { const a = -Math.PI + k * Math.PI / 6 + 0.15; g.beginPath(); g.moveTo(0, -4); g.lineTo(Math.cos(a - 0.07) * 30, -4 + Math.sin(a - 0.07) * 30); g.lineTo(Math.cos(a + 0.07) * 30, -4 + Math.sin(a + 0.07) * 30); g.fill(); }
        g.restore();
      }
      g.fillStyle = '#8d5a2b'; rr(-13, -3, 26, 15, 3); g.fill();
      g.fillStyle = '#6e4420'; g.fillRect(-13, 5, 26, 2);
      g.fillStyle = '#ffd166'; g.fillRect(-13, -3, 3.5, 15); g.fillRect(9.5, -3, 3.5, 15);
      if (open > 0.2) { g.fillStyle = '#ffd166'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-8 + k * 4, -4 - (k % 2) * 2, 3, 0, 6.3); g.fill(); } g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(-3, -6, 1.5, 0, 6.3); g.fill(); }
      g.save(); g.translate(-13, -3); g.rotate(-open * 1.3);
      g.fillStyle = '#a56b34'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -5); g.quadraticCurveTo(13, -16, 26, -5); g.lineTo(26, 0); g.closePath(); g.fill();
      g.fillStyle = '#ffd166'; g.fillRect(0, -5, 3.5, 5); g.fillRect(22.5, -5, 3.5, 5);
      g.restore();
      if (open < 0.5) { g.fillStyle = '#ffd166'; g.fillRect(-2.5, -4, 5, 6); }
      g.restore();
    }

    function drawSpyglass(x, y, s, alpha) {
      g.save(); g.globalAlpha = Math.max(0, alpha); g.translate(x, y); g.rotate(-0.6); g.scale(s, s);
      g.shadowColor = '#ffd166'; g.shadowBlur = 10;
      g.fillStyle = '#b5833a'; g.fillRect(-16, -4, 14, 8);
      g.fillStyle = '#d9a441'; g.fillRect(-4, -5.5, 12, 11);
      g.fillStyle = '#8a5a1c'; g.fillRect(8, -7, 9, 14);
      g.fillStyle = '#8ecae6'; g.beginPath(); g.ellipse(17, 0, 2.5, 6, 0, 0, 6.3); g.fill();
      g.restore();
    }

    function drawHeart(x, y, s, full, pop) {
      g.save(); g.translate(x, y); const k = pop > 0 ? 1 + Math.sin(pop * Math.PI) * 0.5 : 1; g.scale(s * k, s * k);
      g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-14, -3, -8, -13, 0, -6); g.bezierCurveTo(8, -13, 14, -3, 0, 6); g.closePath();
      if (full) { g.fillStyle = '#ef476f'; g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(-4.5, -6, 2.4, 1.5, -0.6, 0, 6.3); g.fill(); }
      else { g.fillStyle = 'rgba(255,255,255,.08)'; g.fill(); g.strokeStyle = 'rgba(239,71,111,.55)'; g.lineWidth = 1.6; g.stroke(); }
      g.restore();
    }

    function drawPalm(x, y, dir, seed, big) {
      const sway = Math.sin(T * 1.4 + seed) * 0.06, s = big ? 1.35 : 1.05;
      g.save(); g.translate(x, y); g.scale(dir * s, s);
      g.strokeStyle = '#7a5230'; g.lineCap = 'round'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-6, -16, -2 + sway * 30, -32); g.stroke();
      g.strokeStyle = '#9a6a3c'; g.lineWidth = 2; g.beginPath(); g.moveTo(1, -4); g.quadraticCurveTo(-4, -16, 0 + sway * 30, -30); g.stroke();
      g.translate(-2 + sway * 30, -32);
      const leaves = [-2.9, -2.35, -1.8, -1.2, -0.65, -0.1];
      leaves.forEach((a0, k) => {
        const a = a0 + sway * (k % 2 ? 1 : -1) * 2, len = 26 - Math.abs(k - 2.5) * 1.5;
        const ex = Math.cos(a) * len, ey = Math.sin(a) * len + 8;
        g.fillStyle = k % 2 ? '#0aa77a' : '#06d6a0';
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5 - 10, ex, ey);
        g.quadraticCurveTo(Math.cos(a) * len * 0.55, Math.sin(a) * len * 0.55 - 2, 0, 3); g.fill();
      });
      g.fillStyle = '#6b4423'; g.beginPath(); g.arc(-2, 3, 3, 0, 6.3); g.arc(3, 4, 3, 0, 6.3); g.fill();
      g.restore();
    }

    function pill(x, y, w, h) { g.fillStyle = 'rgba(8,16,48,.62)'; rr(x, y, w, h, h / 2); g.fill(); g.strokeStyle = 'rgba(142,202,230,.25)'; g.lineWidth = 1; g.stroke(); }

    function drawHeader() {
      const slots = maxHearts(L), sp = Math.min(22, 120 / slots);
      pill(8, 6, slots * sp + 14, 34);
      for (let k = 0; k < slots; k++) drawHeart(8 + 7 + sp * (k + 0.5), 23, sp / 21, k < hearts, T - heartPop[k] < 0.5 && k >= hearts ? (T - heartPop[k]) / 0.5 : 0);
      const mm = Math.floor(timer / 60), ss = Math.floor(timer % 60);
      pill(W / 2 - 34, 8, 68, 30);
      g.font = 'bold 15px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#cfe6f5';
      g.fillText(`${mm}:${String(ss).padStart(2, '0')}`, W / 2, 23.5);
      const flags = (() => { let f = 0; for (let i = 0; i < N; i++) if ((flag[i] || spy[i]) && !rev[i]) f++; return f; })();
      const left = Math.max(0, cfg.crabs - crabsHit - flags);
      pill(W - 98, 6, 90, 34);
      drawCrab(W - 76, 26, 0.55, T, 'idle');
      g.font = 'bold 18px system-ui, sans-serif'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('× ' + left, W - 56, 24);
    }

    function wrapText(text, maxW) {
      const words = text.split(' '), lines = []; let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
      lines.push(cur); return lines;
    }

    function drawFooter() {
      g.font = '600 14px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      // Dauerhafte Zielzeile (unten), darüber bei Bedarf der Hinweis des Augenblicks
      const goal = wrapText(GOAL, 318), gh2 = goal.length * 17 + 10, gTop = BTN.y - 6 - gh2;
      g.fillStyle = 'rgba(8,16,48,.78)'; rr(12, gTop, 336, gh2, 10); g.fill();
      g.strokeStyle = 'rgba(255,209,102,.45)'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#fff3b0';
      goal.forEach((ln, k) => g.fillText(ln, W / 2, gTop + 5 + 8.5 + k * 17));
      if (help.text && T < help.until) {
        const lines = wrapText(help.text, 318).slice(0, 2), h2 = lines.length * 17 + 10, top = gTop - 4 - h2;
        g.fillStyle = 'rgba(8,16,48,.85)'; rr(12, top, 336, h2, 10); g.fill();
        g.strokeStyle = 'rgba(142,202,230,.5)'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = '#e6f3fb';
        lines.forEach((ln, k) => g.fillText(ln, W / 2, top + 5 + 8.5 + k * 17));
      }
      // Modus-Knopf
      for (const [k, m] of [[0, 'dig'], [1, 'flag']]) {
        const x = BTN.x + k * BTN.w / 2, on = mode === m, w = BTN.w / 2 - 3;
        g.save();
        if (on) { g.shadowColor = '#ffd166'; g.shadowBlur = 14; }
        g.fillStyle = on ? '#ffd166' : '#16275c'; rr(x + (k ? 3 : 0), BTN.y, w, BTN.h, 16); g.fill();
        g.restore();
        g.lineWidth = 2; g.strokeStyle = on ? '#fff3b0' : 'rgba(142,202,230,.4)'; rr(x + (k ? 3 : 0), BTN.y, w, BTN.h, 16); g.stroke();
        const ix = x + (k ? 3 : 0) + 38, iy = BTN.y + BTN.h / 2;
        g.save(); g.translate(ix, iy);
        if (m === 'dig') {
          g.rotate(0.6); g.strokeStyle = on ? '#6b4423' : '#cfa56a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -14); g.lineTo(0, 8); g.stroke();
          g.fillStyle = on ? '#4b5d78' : '#8ecae6'; g.beginPath(); g.moveTo(-7, 6); g.lineTo(7, 6); g.lineTo(5, 18); g.quadraticCurveTo(0, 22, -5, 18); g.closePath(); g.fill();
          g.strokeStyle = on ? '#6b4423' : '#cfa56a'; g.beginPath(); g.moveTo(-4, -14); g.lineTo(4, -14); g.stroke();
        } else {
          g.strokeStyle = on ? '#6b4423' : '#cfa56a'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-6, 16); g.lineTo(-6, -16); g.stroke();
          g.fillStyle = on ? '#d62f58' : '#ef476f'; g.beginPath(); g.moveTo(-6, -16); g.quadraticCurveTo(7, -18, 15, -10); g.quadraticCurveTo(6, -6, -6, -3); g.closePath(); g.fill();
        }
        g.restore();
        g.font = 'bold 21px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillStyle = on ? '#2a1d10' : '#cfe6f5'; g.fillText(m === 'dig' ? 'Graben' : 'Flagge', ix + 26, iy + 1);
      }
    }

    function drawRunners() {
      for (const rn of runners) {
        const age = T - rn.t0;
        if (age < 0) continue;
        if (age < 0.45) { drawCrab(rn.x, rn.y - 2, rn.size, age, 'pinch'); continue; }
        const a = age - 0.45, x = rn.x + rn.dir * (a * 95), y = rn.y - Math.abs(Math.sin(a * 11)) * 7;
        g.save(); g.globalAlpha = clamp(1.4 - a * 0.7, 0, 1);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, rn.y + 8, 11 * rn.size, 3, 0, 0, 6.3); g.fill();
        drawCrab(x, y, rn.size, a, 'run');
        g.restore();
      }
    }

    function drawHighlights() {
      if (hitHL && T < hitHL.until) {
        const k = 0.5 + 0.5 * Math.sin(T * 9);
        for (const j of nbr[hitHL.i]) if (rev[j] && crab && !crab[j] && nums[j] > 0) {
          g.save(); g.strokeStyle = `rgba(255,107,139,${0.6 + 0.4 * k})`; g.lineWidth = 3.5; g.shadowColor = '#ff3355'; g.shadowBlur = 10;
          rr(gx + (j % c) * cs + 1, gy + ((j / c) | 0) * cs + 1, cs - 2, cs - 2, 7); g.stroke(); g.restore();
        }
      }
      if (example && T < example.until) {
        const col = example.kind === 'safe' ? '#06d6a0' : '#ff3355', k = 0.5 + 0.5 * Math.sin(T * 7), x = cx(example.cell), y = cy(example.cell);
        g.save(); g.shadowColor = col; g.shadowBlur = 12; g.strokeStyle = col; g.lineWidth = 4;
        const cl = example.clue;
        if (cl !== undefined && rev[cl]) { g.globalAlpha = 0.7; g.lineWidth = 2.5; rr(gx + (cl % c) * cs + 1, gy + ((cl / c) | 0) * cs + 1, cs - 2, cs - 2, 7); g.stroke(); g.lineWidth = 4; g.globalAlpha = 1; }
        g.beginPath(); g.arc(x, y, cs * (0.5 + 0.12 * k), 0, 6.3); g.stroke();
        g.fillStyle = col; g.font = 'bold 14px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 3; g.strokeStyle = '#0b1437'; const lab = example.kind === 'safe' ? 'sicher' : 'Krabbe!';
        g.strokeText(lab, x, y - cs * 0.78); g.fillText(lab, x, y - cs * 0.78);
        g.restore();
      }
    }

    function drawDancers() {
      for (let i = 0; i < N; i++) {
        const d = T - danceAt[i];
        if (d < 0 || !crab || !crab[i] || hitC[i]) continue;
        const x = cx(i), y = cy(i), tx = gx + (i % c) * cs, ty = gy + ((i / c) | 0) * cs;
        const k = clamp(d / 0.25, 0, 1);
        g.fillStyle = '#80633f'; rr(tx + 1.5, ty + 1.5, cs - 3, cs - 3, 6); g.fill();
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y + 8, 10, 3, 0, 0, 6.3); g.fill();
        drawCrab(x + Math.sin(T * 6 + i) * 2, y - 1 - Math.abs(Math.sin(T * 7 + i)) * 7 * k, Math.min(1, cs / 40 + 0.3) * easeOutBack(k), T * 1.3 + i, 'dance');
      }
    }

    function drawParticles(dt) {
      for (const p of parts) {
        p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.rot !== undefined) p.rot += dt * 12;
      }
      parts = parts.filter(p => p.life > 0 && p.y < H + 20);
      for (const p of parts) {
        g.globalAlpha = clamp(p.life / p.max * 1.6, 0, 1); g.fillStyle = p.color;
        if (p.coin) {
          g.save(); g.translate(p.x, p.y); g.scale(Math.max(0.15, Math.abs(Math.cos(p.rot))), 1);
          g.beginPath(); g.arc(0, 0, p.size, 0, 6.3); g.fill(); g.fillStyle = '#e8a800'; g.beginPath(); g.arc(0, 0, p.size * 0.55, 0, 6.3); g.fill(); g.restore();
        } else g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      g.globalAlpha = 1;
    }

    function draw(dt) {
      drawWater();
      drawIsland();
      for (let i = 0; i < N; i++) drawTile(i, showCur && cur === i && state === 'play' && !rev[i] ? 1 : 0);
      drawDancers();
      drawHighlights();
      // Palmen am Rand
      drawPalm(gx - 4, gy + 6, -1, palmSeed[0], true);
      drawPalm(gx + gw + 4, gy + 4, 1, palmSeed[1], true);
      drawPalm(gx + gw + 4, gy + gh - 2, 1, palmSeed[2], false);
      drawPalm(gx - 4, gy + gh - 4, -1, palmSeed[3], false);
      // Cursor
      if (showCur && state === 'play' && cur >= 0) {
        g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.shadowColor = '#ffd166'; g.shadowBlur = 8;
        const pu = 1 + Math.sin(T * 8) * 0.8;
        rr(gx + (cur % c) * cs + 1 - pu / 2, gy + ((cur / c) | 0) * cs + 1 - pu / 2, cs - 2 + pu, cs - 2 + pu, 7); g.stroke(); g.shadowBlur = 0;
      }
      // Lang-Druck-Ring
      if (press && !press.fired && performance.now() - press.t0 > 100) {
        const pr = clamp((performance.now() - press.t0) / 450, 0, 1), x = cx(press.i), y = cy(press.i);
        g.strokeStyle = '#ffd166'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, cs * 0.46, -Math.PI / 2, -Math.PI / 2 + pr * 6.283); g.stroke();
      }
      drawRunners();
      for (const f of fxs) f.draw(clamp((T - f.t0) / f.dur, 0, 1));
      drawParticles(dt);
      drawHeader();
      drawFooter();
      if (T - flashT < 0.35) { g.fillStyle = `rgba(239,71,111,${0.35 * (1 - (T - flashT) / 0.35)})`; g.fillRect(0, 0, W, H); }
      if (trans) {
        const a = clamp((T - trans.t0) / 0.5, 0, 1), b = clamp((T - trans.t0 - 0.5) / 0.5, 0, 1);
        const al = trans.swapped ? 1 - b : a;
        g.fillStyle = `rgba(11,20,55,${al})`; g.fillRect(0, 0, W, H);
        if (al > 0.5) { g.fillStyle = `rgba(255,209,102,${al})`; g.font = 'bold 30px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(`Insel ${(trans.swapped ? L : L + 1) + 1}`, W / 2, H / 2 - 20); }
      }
    }

    // ---------- Schleife ----------
    setupIsland(0);
    if (bestIsland > 0) ctx.toast(`Bisher: ${bestIsland} von 3 Inseln`, 2200);
    ctx.input.pad({});

    ctx.loop(dt => {
      T += dt;
      if (state === 'play' && crab) timer += dt;
      // Zeitgesteuerte Ereignisse
      if (timers.length) {
        const due = timers.filter(t => t.at <= T);
        if (due.length) { timers = timers.filter(t => t.at > T); due.forEach(t => t.fn()); }
      }
      // Übergang zur nächsten Insel
      if (trans) {
        if (!trans.swapped && T - trans.t0 >= 0.5) { trans.swapped = true; trans.t1 = T; nextIsland(); state = 'trans'; }
        if (trans.swapped && T - trans.t0 >= 1.1) { trans = null; state = 'play'; }
      }
      // Lang-Druck
      if (press && !press.fired && state === 'play' && performance.now() - press.t0 >= 450) {
        press.fired = true;
        try { navigator.vibrate?.(25); } catch {}
        if (mode === 'dig') toggleFlag(press.i); else dig(press.i);
      }
      // Tasten gedrückt halten
      if (state === 'play') {
        for (const d of ['left', 'right', 'up', 'down']) {
          if (ctx.input.down(d)) {
            hold[d] = (hold[d] || 0) + dt;
            if (hold[d] > 0.38) { hold[d] -= 0.09; moveCur(d); }
          } else hold[d] = 0;
        }
      }
      // Hilfe-Zeile
      if (T > help.until && T > nextTip && state === 'play' && firstDig) { const tl = tips(ctx.input.isTouch, hearts); help = { text: tl[tipIdx++ % tl.length], until: T + 7 }; nextTip = T + 12; }
      // Goldregen
      if (rain > 0) {
        rain -= dt;
        for (let k = 0; k < 3; k++) parts.push({ x: Math.random() * W, y: -8, vx: (Math.random() - 0.5) * 30, vy: 90 + Math.random() * 120, life: 3, max: 3, color: Math.random() < 0.3 ? '#fff3b0' : '#ffd166', size: 5 + Math.random() * 2, grav: 40, coin: true, rot: Math.random() * 6 });
      }
      fxs = fxs.filter(f => T - f.t0 <= f.dur);
      runners = runners.filter(rn => T - rn.t0 < 3.2);
      draw(dt);
    });

    return { destroy() {} };
  },
};
