// Türchen 23: Laternen-Labyrinth
import { generateLevel, reach, LEVELS, DX, DY } from './maze.js';

export const howto = 'Im Wichtel-Lager ist das Licht aus! Lauf mit Pfeiltasten/WASD (Touch: Stick) durch das Dunkel, finde 3 goldene Schlüssel und öffne die Tür zum Geschenk. Taste B oder der Karten-Knopf zeigt die Karte.';

const T = 26, VW = 360, VH = 560, PR = 8, SPEED = 108;
const NAMES = ['Vorratskeller', 'Spielzeug-Werkstatt', 'Rentierstall', 'Geschenke-Lager'];

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(VW, VH);
    const litC = document.createElement('canvas'); litC.width = VW * 2; litC.height = VH * 2;
    const lg = litC.getContext('2d'); lg.setTransform(2, 0, 0, 2, 0, 0);
    ctx.input.pad({ stick: true, b: 'Karte' });

    let li = 0, hearts = 3, score = 0, candlesTotal = 0, completed = 0, over = false;
    let phase = 'play', phaseT = 0, showMap = false, time = 0, stopMusic = null;
    let M, P, keysGot, keyObjs, candleObjs, wormObjs, mouseObjs, ghostObjs, chims, parts;
    let oil, boost, hintT, hintPath, hintCool, lt, grace, inv, seen, litSet, cam, stepT, humT, tpLock, doorOpen, bumpCool, mouseToast, levelCandles;
    const mapBtn = { x: VW - 50, y: 40, w: 42, h: 42 };

    const rnd = (a, b) => a + Math.random() * (b - a);
    const cx2x = c => (2 * (c % M.cw) + 1.5) * T, cy2y = c => (2 * ((c / M.cw) | 0) + 1.5) * T;
    const cellOf = (x, y) => {
      const cx = Math.max(0, Math.min(M.cw - 1, Math.round((x / T - 1.5) / 2)));
      const cy = Math.max(0, Math.min(M.ch - 1, Math.round((y / T - 1.5) / 2)));
      return cy * M.cw + cx;
    };
    const tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= M.tw || ty >= M.th) ? 1 : M.grid[ty * M.tw + tx];
    const solid = (tx, ty) => { const v = tileAt(tx, ty); return v === 1 || (v === 2 && !doorOpen); };

    // ---------- Level aufbauen ----------
    function build(i) {
      li = i; M = generateLevel(i);
      const s = M.start;
      P = { x: cx2x(s), y: cy2y(s), vx: 0, vy: 0, fx: 0, fy: 1, walk: 0 };
      keysGot = 0; doorOpen = false; levelCandles = 0;
      keyObjs = M.keys.map(c => ({ c, x: cx2x(c), y: cy2y(c), got: false, ph: rnd(0, 6) }));
      candleObjs = M.candles.map(c => ({ c, x: cx2x(c), y: cy2y(c), got: false, ph: rnd(0, 6) }));
      wormObjs = M.worms.map(c => ({ c, x: cx2x(c), y: cy2y(c), got: false, ph: rnd(0, 6) }));
      mouseObjs = M.mice.map(c => ({ c, x: cx2x(c), y: cy2y(c), st: 'eyes', ph: rnd(0, 6), steps: 0, to: -1, wait: 0, prev: -1, a: 1, ang: 0 }));
      ghostObjs = M.ghosts.map(c => ({ c, x: cx2x(c), y: cy2y(c), to: -1, prev: -1, wait: rnd(0.3, 1.2), ph: rnd(0, 6), speed: 30 + li * 4 }));
      chims = M.chimneys ? M.chimneys.map(c => ({ c, x: cx2x(c), y: cy2y(c) })) : [];
      parts = []; oil = 1; boost = 0; hintT = 0; hintPath = []; hintCool = 0; lt = 0; grace = 2.6; inv = 0;
      seen = new Uint8Array(M.tw * M.th); litSet = new Uint8Array(M.tw * M.th);
      stepT = 0; humT = 0; tpLock = false; bumpCool = 0; mouseToast = mouseToast || false;
      cam = { x: 0, y: 0 }; snapCam();
      hud();
      ctx.toast(`Raum ${i + 1}: ${NAMES[i]}`, 1800);
    }
    const hud = () => ctx.hud.set({ Raum: `${li + 1}/4`, Punkte: score });

    // ---------- Musik ----------
    function startMusic() {
      stopMusic?.();
      const A = 57, seq = [];
      for (const root of [A, A, A + 5, A + 7]) {
        for (const o of [0, 3, 7, 12, 7, 3]) seq.push([root + o, 1], [0, 1]);
        seq.push([0, 4]);
      }
      stopMusic = ctx.audio.melody(seq, { bpm: 84, type: 'sine', vol: 0.05, loop: true });
    }
    ctx.onPause(p => { if (p) { stopMusic?.(); stopMusic = null; } else if (!over) startMusic(); });

    // ---------- Bewegung ----------
    function resolve(x, y) {
      for (let it = 0; it < 3; it++) {
        const tx = Math.floor(x / T), ty = Math.floor(y / T);
        for (let j = ty - 1; j <= ty + 1; j++) for (let i = tx - 1; i <= tx + 1; i++) {
          if (!solid(i, j)) continue;
          const rx = i * T, ry = j * T, qx = Math.max(rx, Math.min(x, rx + T)), qy = Math.max(ry, Math.min(y, ry + T));
          let dx = x - qx, dy = y - qy, d = Math.hypot(dx, dy);
          if (d >= PR) continue;
          if (d < 1e-6) { dx = x - (rx + T / 2); dy = y - (ry + T / 2); d = Math.hypot(dx, dy) || 1; x += dx / d * PR; y += dy / d * PR; }
          else { x += dx / d * (PR - d); y += dy / d * (PR - d); }
        }
      }
      return [x, y];
    }
    function stepMove(dx, dy) {
      const ox = P.x, oy = P.y; let nx = ox + dx, ny = oy + dy;
      const ow = M.oneMap.get(Math.floor(oy / T) * M.tw + Math.floor(ox / T));
      if (ow) {
        const cx = (Math.floor(ox / T) + 0.5) * T, cy = (Math.floor(oy / T) + 0.5) * T;
        if (ow.dx && (ox - cx) * ow.dx >= 0 && (nx - cx) * ow.dx < 0) nx = ox;
        if (ow.dy && (oy - cy) * ow.dy >= 0 && (ny - cy) * ow.dy < 0) ny = oy;
      }
      [P.x, P.y] = resolve(nx, ny);
    }
    function movePlayer(dt) {
      let a = ctx.input.axis(); const m = Math.hypot(a.x, a.y);
      if (m < 0.15) a = { x: 0, y: 0 }; else if (m > 1) a = { x: a.x / m, y: a.y / m };
      const k = 1 - Math.exp(-16 * dt);
      P.vx += (a.x * SPEED - P.vx) * k; P.vy += (a.y * SPEED - P.vy) * k;
      const sp = Math.hypot(P.vx, P.vy);
      if (sp > 12) { P.fx += (P.vx / sp - P.fx) * 0.3; P.fy += (P.vy / sp - P.fy) * 0.3; }
      const ox = P.x, oy = P.y, dx = P.vx * dt, dy = P.vy * dt, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 3));
      for (let i = 0; i < n; i++) stepMove(dx / n, dy / n);
      const moved = Math.hypot(P.x - ox, P.y - oy) / dt;
      P.walk += moved * dt * 0.28;
      if (moved > 25) { stepT += dt; if (stepT > 0.28) { stepT = 0; ctx.audio.tone(rnd(150, 200), 0.035, 'triangle', 0.05); } }
    }

    // ---------- Licht ----------
    const radius = () => 100 + 70 * oil + (boost > 0 ? 50 * Math.min(1, boost / 1.5) : 0) + Math.sin(time * 9) * 1.6;
    function computeLit(R) {
      litSet.fill(0);
      const ptx = Math.floor(P.x / T), pty = Math.floor(P.y / T), lim = R + T * 0.6;
      const q = [[ptx, pty]]; litSet[pty * M.tw + ptx] = 1;
      const near = (tx, ty) => Math.hypot((tx + 0.5) * T - P.x, (ty + 0.5) * T - P.y) <= lim;
      for (let i = 0; i < q.length; i++) {
        const [x, y] = q[i];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= M.tw || ny >= M.th) continue;
          const id = ny * M.tw + nx; if (litSet[id] || !near(nx, ny)) continue;
          litSet[id] = 1;
          const v = M.grid[id];
          if ((v === 0 || (v === 2 && doorOpen)) && !(dx && dy)) q.push([nx, ny]);
        }
      }
      for (let i = 0; i < litSet.length; i++) if (litSet[i]) {
        const tx = i % M.tw, ty = (i / M.tw) | 0;
        if (Math.hypot((tx + 0.5) * T - P.x, (ty + 0.5) * T - P.y) <= R * 0.8) seen[i] = 1;
      }
    }
    const isLitXY = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return tx >= 0 && ty >= 0 && tx < M.tw && ty < M.th && litSet[ty * M.tw + tx] === 1; };

    // ---------- Gegner & Co ----------
    function stepEntity(e, dt, speed, choose) {
      if (e.to < 0) {
        if (e.wait > 0) { e.wait -= dt; return; }
        const opts = M.adj[e.c].filter(o => o.to !== e.prev);
        const list = opts.length ? opts : M.adj[e.c];
        const nxt = choose(list); e.to = nxt.to;
      }
      const tx = cx2x(e.to), ty = cy2y(e.to), d = Math.hypot(tx - e.x, ty - e.y), s = speed * dt;
      if (d <= s) { e.x = tx; e.y = ty; e.prev = e.c; e.c = e.to; e.to = -1; e.steps = (e.steps || 0) + 1; e.arrived = true; }
      else { e.x += (tx - e.x) / d * s; e.y += (ty - e.y) / d * s; e.ang = Math.atan2(ty - e.y, tx - e.x); }
    }
    function updateGhosts(dt) {
      const pc = cellOf(P.x, P.y);
      for (const gh of ghostObjs) {
        gh.ph += dt;
        if (grace > 0) continue;
        stepEntity(gh, dt, gh.speed, list => {
          const near = M.D(gh.c, pc) <= 6;
          if (near && Math.random() < 0.55) return list.reduce((b, o) => M.D(o.to, pc) < M.D(b.to, pc) ? o : b);
          return list[(Math.random() * list.length) | 0];
        });
        if (gh.arrived) { gh.arrived = false; if (Math.random() < 0.3) gh.wait = rnd(0.2, 0.7); }
        if (inv <= 0 && Math.hypot(gh.x - P.x, gh.y - P.y) < 16) return hit(gh);
      }
      // Annäherungs-Ton
      let dmin = 1e9; for (const gh of ghostObjs) dmin = Math.min(dmin, Math.hypot(gh.x - P.x, gh.y - P.y));
      if (dmin < 210 && grace <= 0) {
        humT -= dt;
        if (humT <= 0) {
          const k = 1 - dmin / 210; humT = 0.16 + (1 - k) * 0.5;
          ctx.audio.tone(70 + k * 110, 0.22, 'sine', 0.025 + 0.13 * k, 90 + k * 140);
        }
      }
    }
    function hit(gh) {
      hearts--; inv = 2.6; ctx.audio.sfx('hit'); ctx.fx.shake(); burst(P.x, P.y, '#bfe8ff', 22, 140);
      ctx.toast(hearts > 0 ? 'Brr! Zurück zum Start!' : 'Alle Herzen weg!');
      const ss = M.start; P.x = cx2x(ss); P.y = cy2y(ss); P.vx = P.vy = 0; snapCam();
      // Geist zieht sich in ein fernes Eck zurück
      const far = []; for (let c = 0; c < M.n; c++) if (M.D(M.start, c) >= 9 && c !== M.exit) far.push(c);
      const c = far.length ? far[(Math.random() * far.length) | 0] : M.exit;
      gh.c = c; gh.x = cx2x(c); gh.y = cy2y(c); gh.to = -1; gh.prev = -1; gh.wait = 1.5;
      if (hearts <= 0) endGame(false);
    }
    function updateMice(dt) {
      const pc = cellOf(P.x, P.y);
      for (const m of mouseObjs) {
        m.ph += dt;
        if (m.st === 'eyes') {
          if (Math.hypot(m.x - P.x, m.y - P.y) < 62) {
            m.st = 'run'; m.wait = 0; ctx.audio.tone(1500, 0.07, 'sine', 0.07, 2300); ctx.audio.tone(1900, 0.06, 'sine', 0.06, 2600, 0.09);
            if (!mouseToast) { mouseToast = true; ctx.toast('Huch, nur eine Maus!'); }
          }
        } else if (m.st === 'run') {
          stepEntity(m, dt, 90, list => list.reduce((b, o) => M.D(o.to, pc) > M.D(b.to, pc) ? o : b));
          if (m.steps >= 7) m.st = 'fade';
        } else if (m.st === 'fade') { m.a -= dt * 1.5; if (m.a <= 0) m.st = 'gone'; }
      }
    }

    // ---------- Einsammeln ----------
    function burst(x, y, color, n = 12, v = 90, life = 0.7) {
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = rnd(v * 0.3, v); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(life * 0.5, life), max: life, color, size: rnd(1.5, 3.2) }); }
    }
    function pickups() {
      for (const k of keyObjs) if (!k.got && Math.hypot(k.x - P.x, k.y - P.y) < 15) {
        k.got = true; keysGot++;
        [1319, 1568, 1976, 2637].forEach((f, i) => ctx.audio.tone(f, 0.13, 'triangle', 0.13, null, i * 0.06));
        burst(k.x, k.y, '#ffd166', 26, 150, 0.9); burst(k.x, k.y, '#fff', 12, 110, 0.7); ctx.fx.shake(120);
        if (keysGot === 3) { doorOpen = true; ctx.audio.sfx('level'); ctx.toast('Alle Schlüssel! Die Tür ist offen!', 2000); const d = M.doorTile; burst((d.tx + .5) * T, (d.ty + .5) * T, '#ffd166', 30, 120); }
        else ctx.toast(`Schlüssel ${keysGot} von 3`);
      }
      for (const c of candleObjs) if (!c.got && Math.hypot(c.x - P.x, c.y - P.y) < 15) {
        c.got = true; oil = Math.min(1, oil + 0.4); boost = 10; levelCandles++; candlesTotal++; score += 10; hud();
        ctx.audio.sfx('power'); burst(c.x, c.y, '#ffb347', 20, 110); ctx.toast('Kerze! Mehr Licht!', 1000);
      }
      for (const w of wormObjs) if (!w.got && Math.hypot(w.x - P.x, w.y - P.y) < 16) {
        w.got = true; hintT = 7; hintCool = 0; ctx.audio.sfx('pop'); burst(w.x, w.y, '#9dffb0', 18, 90);
        ctx.toast(keysGot < 3 ? 'Glühwürmchen zeigen den Weg!' : 'Glühwürmchen zeigen die Tür!', 1500);
      }
      // Kamine
      if (chims.length) {
        const near = chims.findIndex(c => Math.hypot(c.x - P.x, c.y - P.y) < 9);
        if (near >= 0 && !tpLock) {
          const o = chims[1 - near]; tpLock = true;
          burst(P.x, P.y, '#ffb347', 20, 120); ctx.audio.sfx('swoosh'); ctx.audio.tone(300, 0.25, 'sine', 0.15, 900);
          P.x = o.x; P.y = o.y; P.vx = P.vy = 0; burst(P.x, P.y, '#ffd166', 22, 120); ctx.toast('Wusch! Durch den Kamin!', 1000);
        } else if (tpLock && chims.every(c => Math.hypot(c.x - P.x, c.y - P.y) > 24)) tpLock = false;
      }
      // Tür
      const d = M.doorTile, dx = (d.tx + 0.5) * T, dy = (d.ty + 0.5) * T;
      if (!doorOpen && Math.hypot(dx - P.x, dy - P.y) < T * 1.05 && bumpCool <= 0) {
        bumpCool = 2.2; ctx.audio.sfx('bad'); ctx.toast(`Noch ${3 - keysGot} Schlüssel fehlen!`, 1400);
      }
      if (doorOpen && Math.hypot(cx2x(M.exit) - P.x, cy2y(M.exit) - P.y) < 14) levelDone();
    }

    function levelDone() {
      if (phase !== 'play') return;
      phase = 'trans'; phaseT = 0; completed = li + 1; ctx.save('maxLevel', Math.max(ctx.load('maxLevel', 0), completed));
      const par = 80 + li * 40, bonus = Math.max(0, Math.round(par - lt));
      score += 50 + bonus; hud();
      burst(P.x, P.y, '#ffd166', 40, 170, 1.1); ctx.audio.sfx('level');
      ctx.toast(li < 3 ? `Geschafft! +${50 + bonus} Punkte` : 'Alle Geschenke gefunden!', 1600);
      if (li >= 3) ctx.timeout(() => endGame(true), 1500);
    }
    function endGame(won) {
      if (over) return; over = true; stopMusic?.(); stopMusic = null;
      const stars = completed >= 4 ? 3 : completed >= 2 ? 2 : completed >= 1 ? 1 : 0;
      const more = completed < 1 ? 'Schaffe Raum 1 für den ersten Stern.' : completed < 2 ? 'Schaffe Raum 2 für den zweiten Stern.' : completed < 4 ? 'Schaffe alle 4 Räume für den dritten Stern.' : '';
      ctx.timeout(() => ctx.finish({
        won, stars, score,
        text: won ? 'Alle 4 Räume geschafft! Im Wichtel-Lager brennt wieder Licht.' : `Alle Herzen sind weg. Du hast ${completed} von 4 Räumen geschafft und ${candlesTotal} Kerzen gesammelt. ${more}`,
      }), won ? 100 : 900);
    }

    // ---------- Hinweis-Pfad ----------
    function updateHint() {
      const pc = cellOf(P.x, P.y), r = reach(M, pc);
      const targets = keysGot < 3 ? keyObjs.filter(k => !k.got).map(k => k.c) : [M.exit];
      let best = -1; for (const t of targets) if (r.dist[t] >= 0 && (best < 0 || r.dist[t] < r.dist[best])) best = t;
      hintPath = [];
      if (best < 0) return;
      for (let c = best; c >= 0 && c !== pc; c = r.parent[c]) hintPath.push(c);
      hintPath.reverse();
    }

    // ---------- Kamera ----------
    function camTarget() {
      const mw = M.tw * T, mh = M.th * T;
      const tx = mw <= VW ? (mw - VW) / 2 : Math.max(0, Math.min(mw - VW, P.x - VW / 2));
      const ty = mh <= VH ? (mh - VH) / 2 : Math.max(-36, Math.min(mh - VH + 4, P.y - VH * 0.48));
      return { x: tx, y: ty };
    }
    function snapCam() { cam = camTarget(); }

    // ---------- Zeichnen ----------
    function hash(a, b) { let h = (a * 374761393 + b * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
    function drawTile(c, tx, ty, lit) {
      const v = M.grid[ty * M.tw + tx], x = tx * T, y = ty * T;
      if (v === 1) {
        c.fillStyle = '#4c3d8a'; c.fillRect(x, y, T, T);
        c.fillStyle = '#5d4ea0'; c.fillRect(x, y, T, 3);
        if (tileAt(tx, ty + 1) !== 1) { c.fillStyle = '#2c2259'; c.fillRect(x, y + T - 8, T, 8); c.fillStyle = '#3a2e70'; c.fillRect(x, y + T - 8, T, 2); }
        if (lit) {
          const h = hash(tx, ty);
          if (h < 0.35) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(x + 4 + h * 50, y + 6 + hash(ty, tx) * 8, 2 + h * 2, 0, 6.3); c.fill(); }
          if (h > 0.9) { c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 4, y + 13); c.lineTo(x + T - 4, y + 13); c.stroke(); }
        }
      } else {
        c.fillStyle = (tx + ty) & 1 ? '#27366f' : '#243269'; c.fillRect(x, y, T, T);
        if (lit && hash(tx, ty) > 0.93) { c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x + 6, y + 8, 3, 3); }
      }
    }
    function drawKey(c, o, x, y) {
      const bob = Math.sin(time * 3 + o.ph) * 2;
      c.save(); c.translate(x, y + bob); c.rotate(Math.sin(time * 2 + o.ph) * 0.25);
      c.shadowColor = '#ffd166'; c.shadowBlur = 12; c.strokeStyle = '#ffd166'; c.fillStyle = '#ffd166'; c.lineWidth = 3;
      c.beginPath(); c.arc(0, -5, 4.2, 0, 6.3); c.stroke();
      c.fillRect(-1.5, -1, 3, 12); c.fillRect(1.5, 6, 4, 2.4); c.fillRect(1.5, 9.5, 3, 2.2);
      c.restore();
    }
    function drawCandle(c, o, x, y) {
      c.fillStyle = '#fff3d6'; c.fillRect(x - 3.5, y - 3, 7, 11); c.fillStyle = '#ef476f'; c.fillRect(x - 3.5, y + 2, 7, 2);
      c.fillStyle = '#c9b28a'; c.fillRect(x - 6, y + 8, 12, 2.5);
      const f = 1 + Math.sin(time * 14 + o.ph) * 0.15;
      c.shadowColor = '#ffa94d'; c.shadowBlur = 14; c.fillStyle = '#ffb347';
      c.beginPath(); c.ellipse(x, y - 8, 3 * f, 5.5 * f, 0, 0, 6.3); c.fill(); c.fillStyle = '#fff1a8'; c.beginPath(); c.ellipse(x, y - 7, 1.4, 3, 0, 0, 6.3); c.fill(); c.shadowBlur = 0;
    }
    function drawGift(c, x, y) {
      c.save(); c.translate(x, y); c.shadowColor = '#ffd166'; c.shadowBlur = doorOpen ? 18 : 6;
      c.fillStyle = '#ef476f'; c.fillRect(-9, -7, 18, 15); c.fillStyle = '#c93058'; c.fillRect(-9, -7, 18, 4); c.shadowBlur = 0;
      c.fillStyle = '#ffd166'; c.fillRect(-2, -7, 4, 15); c.fillRect(-9, -0.5, 18, 3.5);
      c.beginPath(); c.ellipse(-4, -9, 4.5, 3, -0.5, 0, 6.3); c.ellipse(4, -9, 4.5, 3, 0.5, 0, 6.3); c.fill();
      c.restore();
    }
    function drawDoorTile(c, tx, ty) {
      const x = tx * T, y = ty * T, horiz = (tx % 2 === 0); // Durchgang waagerecht -> Tür senkrecht
      c.fillStyle = '#243269'; c.fillRect(x, y, T, T);
      if (doorOpen) { c.fillStyle = '#7a4b2a'; if (horiz) c.fillRect(x + 1, y, 4, T); else c.fillRect(x, y + 1, T, 4); return; }
      c.fillStyle = '#8a5a32'; c.fillRect(x + 1, y + 1, T - 2, T - 2);
      c.strokeStyle = '#5e3a1d'; c.lineWidth = 1.5;
      for (let i = 1; i < 4; i++) { c.beginPath(); if (horiz) { c.moveTo(x + 1, y + i * T / 4); c.lineTo(x + T - 1, y + i * T / 4); } else { c.moveTo(x + i * T / 4, y + 1); c.lineTo(x + i * T / 4, y + T - 1); } c.stroke(); }
      c.fillStyle = '#ffd166'; c.beginPath(); c.arc(x + T / 2, y + T / 2, 5.5, 0, 6.3); c.fill();
      c.fillStyle = '#5e3a1d'; c.beginPath(); c.arc(x + T / 2, y + T / 2 - 1, 1.8, 0, 6.3); c.fill(); c.fillRect(x + T / 2 - 0.8, y + T / 2, 1.6, 3.5);
    }
    function drawOneway(c, o) {
      const x = o.tx * T, y = o.ty * T, cx = x + T / 2, cy = y + T / 2;
      c.save(); c.translate(cx, cy); c.rotate(Math.atan2(o.dy, o.dx));
      c.fillStyle = 'rgba(142,202,230,.2)'; c.fillRect(-T / 2, -T / 2, T, T);
      c.strokeStyle = '#8ecae6'; c.lineWidth = 3; c.lineJoin = 'round'; c.lineCap = 'round';
      for (const ox of [-6, 3]) { c.beginPath(); c.moveTo(ox, -6); c.lineTo(ox + 6, 0); c.lineTo(ox, 6); c.stroke(); }
      c.fillStyle = '#c77dff'; c.fillRect(-1.5, -T / 2, 3, T * 0.28); c.fillRect(-1.5, T / 2 - T * 0.28, 3, T * 0.28);
      c.restore();
    }
    function drawChimney(c, o, i) {
      c.save(); c.translate(o.x, o.y);
      c.fillStyle = '#7a3b2e'; c.fillRect(-11, -11, 22, 22); c.strokeStyle = '#4f2219'; c.lineWidth = 1.5; c.strokeRect(-11, -11, 22, 22);
      c.beginPath(); c.moveTo(-11, 0); c.lineTo(11, 0); c.moveTo(0, -11); c.lineTo(0, 0); c.moveTo(-5, 0); c.lineTo(-5, 11); c.moveTo(5, 0); c.lineTo(5, 11); c.stroke();
      const hue = i ? '#c77dff' : '#06d6a0'; c.fillStyle = '#10131f'; c.beginPath(); c.arc(0, 0, 7, 0, 6.3); c.fill();
      c.shadowColor = hue; c.shadowBlur = 12; c.strokeStyle = hue; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 7 + Math.sin(time * 4 + i) * 1, 0, 6.3); c.stroke();
      c.restore();
    }
    function drawMouse(c, m, x, y) {
      c.save(); c.translate(x, y); c.rotate(m.ang); c.globalAlpha = m.a;
      const wig = Math.sin(time * 30) * 1.2;
      c.strokeStyle = '#e4a8b8'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-11, wig * 2, -14, wig * 3); c.stroke();
      c.fillStyle = '#b9b9cc'; c.beginPath(); c.ellipse(0, 0, 7, 4.6, 0, 0, 6.3); c.fill();
      c.fillStyle = '#e4a8b8'; c.beginPath(); c.arc(2, -3.6, 2.4, 0, 6.3); c.arc(2, 3.6, 2.4, 0, 6.3); c.fill();
      c.fillStyle = '#e4a8b8'; c.beginPath(); c.arc(7, 0, 1.5, 0, 6.3); c.fill();
      c.fillStyle = '#222'; c.beginPath(); c.arc(4, -1.6, 0.9, 0, 6.3); c.arc(4, 1.6, 0.9, 0, 6.3); c.fill();
      c.restore();
    }
    function drawGhost(c, gh, x, y) {
      const wob = Math.sin(gh.ph * 4) * 1.5;
      c.save(); c.translate(x, y + wob);
      const gr = c.createRadialGradient(0, -2, 1, 0, 0, 12); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#bfe3f7');
      c.shadowColor = '#8ecae6'; c.shadowBlur = 14; c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 10.5, 0, 6.3); c.fill(); c.shadowBlur = 0;
      c.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 6; i++) { const a = gh.ph * 1.4 + i * 1.047; c.beginPath(); c.arc(Math.cos(a) * 12.5, Math.sin(a) * 12.5, 1.8, 0, 6.3); c.fill(); }
      c.fillStyle = '#2a3b6b'; c.beginPath(); c.arc(-3.6, -2, 1.7, 0, 6.3); c.arc(3.6, -2, 1.7, 0, 6.3); c.fill();
      c.beginPath(); c.ellipse(0, 3.2, 2.4, 1.8, 0, 0, 6.3); c.fill();
      c.restore();
    }
    function heart(c, x, y, s, fill) {
      c.beginPath(); c.moveTo(x, y + s * 0.9); c.bezierCurveTo(x - s * 1.3, y, x - s * 0.7, y - s * 0.9, x, y - s * 0.3);
      c.bezierCurveTo(x + s * 0.7, y - s * 0.9, x + s * 1.3, y, x, y + s * 0.9); c.closePath(); c.fillStyle = fill; c.fill();
    }

    function drawWorld(c, cx, cy, litMode) {
      // Kachelbereich
      const tx0 = Math.max(0, Math.floor(cx / T)), ty0 = Math.max(0, Math.floor(cy / T));
      const tx1 = Math.min(M.tw - 1, Math.floor((cx + VW) / T)), ty1 = Math.min(M.th - 1, Math.floor((cy + VH) / T));
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const id = ty * M.tw + tx, isLit = litSet[id] === 1;
        if (litMode ? !isLit : (isLit || !seen[id])) continue;
        if (!litMode) c.globalAlpha = 0.4;
        if (M.grid[id] === 2) drawDoorTile(c, tx, ty); else drawTile(c, tx, ty, litMode);
        if (litMode) { const ow = M.oneMap.get(id); if (ow) drawOneway(c, ow); }
        if (!litMode) c.globalAlpha = 1;
      }
    }

    function draw() {
      const R = radius(), cx = cam.x, cy = cam.y;
      g.fillStyle = '#04061a'; g.fillRect(0, 0, VW, VH);
      g.save(); g.translate(-cx, -cy); drawWorld(g, cx, cy, false); g.restore();
      // Hell beleuchtete Ebene
      lg.clearRect(0, 0, VW, VH);
      lg.save(); lg.translate(-cx, -cy);
      drawWorld(lg, cx, cy, true);
      const gift = { x: cx2x(M.exit), y: cy2y(M.exit) };
      if (isLitXY(gift.x, gift.y)) drawGift(lg, gift.x, gift.y);
      chims.forEach((o, i) => { if (isLitXY(o.x, o.y)) drawChimney(lg, o, i); });
      for (const k of keyObjs) if (!k.got && isLitXY(k.x, k.y)) drawKey(lg, k, k.x, k.y);
      for (const c of candleObjs) if (!c.got && isLitXY(c.x, c.y)) drawCandle(lg, c, c.x, c.y);
      for (const m of mouseObjs) if ((m.st === 'run' || m.st === 'fade') && isLitXY(m.x, m.y)) drawMouse(lg, m, m.x, m.y);
      for (const gh of ghostObjs) if (isLitXY(gh.x, gh.y)) drawGhost(lg, gh, gh.x, gh.y);
      lg.restore();
      const sx = P.x - cx, sy = P.y - cy;
      lg.globalCompositeOperation = 'destination-in';
      const gr = lg.createRadialGradient(sx, sy, R * 0.12, sx, sy, R);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gr; lg.fillRect(0, 0, VW, VH); lg.globalCompositeOperation = 'source-over';
      g.drawImage(litC, 0, 0, VW, VH);
      // Warmer Schein
      g.globalCompositeOperation = 'lighter';
      const wg = g.createRadialGradient(sx, sy, 0, sx, sy, R * 0.9);
      wg.addColorStop(0, 'rgba(255,190,90,.14)'); wg.addColorStop(1, 'rgba(255,190,90,0)');
      g.fillStyle = wg; g.fillRect(0, 0, VW, VH); g.globalCompositeOperation = 'source-over';

      g.save(); g.translate(-cx, -cy);
      // Fernes Leuchten außerhalb des Lichts
      for (const k of keyObjs) if (!k.got && !isLitXY(k.x, k.y)) { const d = Math.hypot(k.x - P.x, k.y - P.y); if (d < R * 1.7) glint(k.x, k.y, '#ffe9a0', 1 - d / (R * 1.7), k.ph); }
      for (const c of candleObjs) if (!c.got && !isLitXY(c.x, c.y)) { const d = Math.hypot(c.x - P.x, c.y - P.y); if (d < R * 1.5) glow(c.x, c.y - 8, '#ffb347', 5, 0.7 * (1 - d / (R * 1.5))); }
      for (const w of wormObjs) if (!w.got) {
        const d = Math.hypot(w.x - P.x, w.y - P.y); if (d > 170) continue;
        const wx = w.x + Math.cos(time * 1.7 + w.ph) * 6, wy = w.y + Math.sin(time * 2.3 + w.ph) * 5, a = 0.5 + 0.5 * Math.sin(time * 4 + w.ph);
        glow(wx, wy, '#9dff8a', 6, 0.35 + a * 0.55); g.fillStyle = '#eaffd0'; g.beginPath(); g.arc(wx, wy, 1.6, 0, 6.3); g.fill();
      }
      for (const gh of ghostObjs) if (!isLitXY(gh.x, gh.y)) { const d = Math.hypot(gh.x - P.x, gh.y - P.y); if (d < R * 1.6) glow(gh.x, gh.y, '#a9dcff', 13, 0.55 * (1 - d / (R * 1.6)) + 0.1); }
      for (const m of mouseObjs) if (m.st === 'eyes') {
        const d = Math.hypot(m.x - P.x, m.y - P.y); if (d > 150 || (isLitXY(m.x, m.y) && d < 62)) continue;
        const blink = Math.sin(m.ph * 1.3) > 0.93 ? 0.15 : 1;
        g.fillStyle = '#ffe14d'; g.shadowColor = '#ffe14d'; g.shadowBlur = 8;
        g.beginPath(); g.ellipse(m.x - 4, m.y, 2.4, 3 * blink, 0, 0, 6.3); g.ellipse(m.x + 4, m.y, 2.4, 3 * blink, 0, 0, 6.3); g.fill(); g.shadowBlur = 0;
      }
      // Glühwürmchen-Spur
      if (hintT > 0 && hintPath.length) {
        const pts = [{ x: P.x, y: P.y }, ...hintPath.slice(0, 9).map(c => ({ x: cx2x(c), y: cy2y(c) }))];
        let carry = (time * 34) % 16, acc = 0;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i], len = Math.hypot(b.x - a.x, b.y - a.y);
          for (let d = (i === 1 ? carry : 16 - ((acc - carry) % 16 + 16) % 16 || 16); d < len; d += 16) {
            const f = d / len, px = a.x + (b.x - a.x) * f, py = a.y + (b.y - a.y) * f, fade = Math.max(0, 1 - (acc + d) / 170);
            glow(px, py, '#9dff8a', 5, 0.8 * fade * Math.min(1, hintT)); g.fillStyle = `rgba(234,255,208,${fade})`; g.beginPath(); g.arc(px, py, 1.7, 0, 6.3); g.fill();
          }
          acc += len;
        }
      }
      // Partikel
      for (const p of parts) { g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.color; g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
      g.globalAlpha = 1;
      drawPlayer();
      g.restore();
      drawHud();
      if (showMap) drawMap();
      if (phase === 'trans') { g.fillStyle = `rgba(4,6,26,${Math.min(1, phaseT / 1.2)})`; g.fillRect(0, 0, VW, VH); }
    }
    function glow(x, y, color, r, a) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
      const rgb = color === '#9dff8a' ? '157,255,138' : color === '#ffb347' ? '255,179,71' : '169,220,255';
      gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    }
    function glint(x, y, color, a, ph) {
      const s = 3 + Math.abs(Math.sin(time * 4 + ph)) * 4, al = Math.max(0, a) * (0.4 + 0.6 * Math.abs(Math.sin(time * 4 + ph)));
      g.save(); g.translate(x, y); g.globalAlpha = al; g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 8;
      g.beginPath(); g.moveTo(0, -s * 1.8); g.lineTo(s * 0.35, -s * 0.35); g.lineTo(s * 1.8, 0); g.lineTo(s * 0.35, s * 0.35); g.lineTo(0, s * 1.8); g.lineTo(-s * 0.35, s * 0.35); g.lineTo(-s * 1.8, 0); g.lineTo(-s * 0.35, -s * 0.35); g.closePath(); g.fill();
      g.restore();
    }
    function drawPlayer() {
      if (inv > 0 && Math.floor(time * 12) % 2 === 0) g.globalAlpha = 0.4;
      const bob = Math.sin(P.walk) * 1, fx = P.fx, fy = P.fy;
      g.save(); g.translate(P.x, P.y + bob);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 6, 8, 4, 0, 0, 6.3); g.fill();
      g.fillStyle = '#06a37a'; g.beginPath(); g.arc(0, 1, 8, 0, 6.3); g.fill();
      // Gesicht in Laufrichtung
      g.fillStyle = '#ffd9b3'; g.beginPath(); g.arc(fx * 2.5, fy * 2.5 - 1, 5.4, 0, 6.3); g.fill();
      g.fillStyle = '#2a2a2a'; const ex = -fy * 2.2, ey = fx * 2.2;
      g.beginPath(); g.arc(fx * 4.6 + ex, fy * 4.6 - 1 + ey, 0.9, 0, 6.3); g.arc(fx * 4.6 - ex, fy * 4.6 - 1 - ey, 0.9, 0, 6.3); g.fill();
      // Mütze (hinten versetzt) mit Bommel
      g.fillStyle = '#ef476f'; g.beginPath(); g.arc(-fx * 2.2, -fy * 2.2 - 3, 6.4, 0, 6.3); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-fx * 8.5, -fy * 8.5 - 3, 2.3, 0, 6.3); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(-fx * 0.6, -fy * 0.6 - 3, 6.2, Math.atan2(fy, fx) - 1.1, Math.atan2(fy, fx) + 1.1); g.stroke();
      // Laterne
      const lx = -fy * 10 + fx * 3, ly = fx * 10 + fy * 3 - 1;
      g.shadowColor = '#ffd166'; g.shadowBlur = 16; g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(lx, ly, 3.6, 0, 6.3); g.fill(); g.shadowBlur = 0;
      g.strokeStyle = '#5a4630'; g.lineWidth = 1.2; g.strokeRect(lx - 3.4, ly - 3.4, 6.8, 6.8);
      g.restore(); g.globalAlpha = 1;
    }
    function drawHud() {
      g.fillStyle = 'rgba(4,6,26,.72)'; g.fillRect(0, 0, VW, 34);
      for (let i = 0; i < 3; i++) heart(g, 16 + i * 22, 17, 7, i < hearts ? '#ef476f' : '#3a3f66');
      for (let i = 0; i < 3; i++) {
        const x = 104 + i * 22, got = i < keysGot, col = got ? '#ffd166' : '#3a3f66';
        g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(x, 13, 3.6, 0, 6.3); g.stroke(); g.fillRect(x - 1, 16, 2, 10); g.fillRect(x, 22, 3.5, 2);
      }
      // Öl-Anzeige
      g.fillStyle = '#ffd166'; g.beginPath(); g.arc(190, 17, 4.5, 0, 6.3); g.fill(); g.fillStyle = '#5a4630'; g.fillRect(186, 11, 8, 2);
      g.fillStyle = '#2a3060'; g.fillRect(202, 12, 90, 10);
      g.fillStyle = boost > 0 ? '#fff1a8' : oil > 0.25 ? '#ffb347' : '#ef476f'; g.fillRect(202, 12, 90 * oil, 10);
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.strokeRect(202.5, 12.5, 89, 9);
      g.fillStyle = '#fff'; g.font = 'bold 11px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
      if (boost > 0) g.fillText('+', 297, 17);
      // Karten-Knopf
      g.fillStyle = showMap ? 'rgba(255,209,102,.9)' : 'rgba(20,28,70,.85)'; g.beginPath(); g.roundRect(mapBtn.x, mapBtn.y, mapBtn.w, mapBtn.h, 10); g.fill();
      g.strokeStyle = '#ffd166'; g.lineWidth = 1.5; g.stroke();
      const mx = mapBtn.x + 9, my = mapBtn.y + 10; g.strokeStyle = showMap ? '#0b1437' : '#ffd166'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(mx, my + 4); g.lineTo(mx + 8, my); g.lineTo(mx + 16, my + 4); g.lineTo(mx + 24, my); g.lineTo(mx + 24, my + 18); g.lineTo(mx + 16, my + 22); g.lineTo(mx + 8, my + 18); g.lineTo(mx, my + 22); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(mx + 8, my); g.lineTo(mx + 8, my + 18); g.moveTo(mx + 16, my + 4); g.lineTo(mx + 16, my + 22); g.stroke();
    }
    function drawMap() {
      g.fillStyle = 'rgba(4,6,26,.97)'; g.fillRect(0, 0, VW, VH);
      const s = Math.floor(Math.min(330 / M.tw, 440 / M.th)), ox = Math.floor((VW - s * M.tw) / 2), oy = 70 + Math.floor((440 - s * M.th) / 2);
      g.fillStyle = '#ffd166'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Karte – schon erkundet', VW / 2, 40);
      for (let ty = 0; ty < M.th; ty++) for (let tx = 0; tx < M.tw; tx++) {
        if (!seen[ty * M.tw + tx]) continue;
        g.fillStyle = M.grid[ty * M.tw + tx] === 1 ? '#4c3d8a' : M.grid[ty * M.tw + tx] === 2 ? '#8a5a32' : '#2b3a78';
        g.fillRect(ox + tx * s, oy + ty * s, s, s);
      }
      const dot = (x, y, col, r) => { g.fillStyle = col; g.beginPath(); g.arc(ox + x / T * s, oy + y / T * s, r, 0, 6.3); g.fill(); };
      const seenXY = (x, y) => seen[Math.floor(y / T) * M.tw + Math.floor(x / T)];
      for (const k of keyObjs) if (!k.got && seenXY(k.x, k.y)) dot(k.x, k.y, '#ffd166', s * 0.5);
      chims.forEach((c, i) => { if (seenXY(c.x, c.y)) dot(c.x, c.y, i ? '#c77dff' : '#06d6a0', s * 0.5); });
      if (seenXY(cx2x(M.exit), cy2y(M.exit))) dot(cx2x(M.exit), cy2y(M.exit), '#ef476f', s * 0.6);
      dot(P.x, P.y, Math.sin(time * 8) > 0 ? '#fff' : '#ffd166', s * 0.7);
      g.fillStyle = '#9fb0e6'; g.font = '12px sans-serif'; g.fillText('Gold = Schlüssel, Rot = Geschenk, Weiß = du', VW / 2, VH - 38);
      g.fillText('Tippen oder B zum Schließen', VW / 2, VH - 20);
    }

    // ---------- Eingabe ----------
    const toggleMap = () => { if (phase !== 'play' || over) return; showMap = !showMap; ctx.audio.sfx('click'); };
    ctx.input.onPress(n => { if (n === 'b') toggleMap(); });
    ctx.on(canvas, 'pointerdown', e => {
      const p = pos(e);
      if (showMap) { toggleMap(); return; }
      if (p.x >= mapBtn.x && p.x <= mapBtn.x + mapBtn.w && p.y >= mapBtn.y && p.y <= mapBtn.y + mapBtn.h) toggleMap();
    });

    // ---------- Schleife ----------
    build(0); startMusic();
    ctx.loop(dt => {
      time += dt;
      parts = parts.filter(p => (p.life -= dt) > 0);
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
      if (phase === 'trans') {
        phaseT += dt;
        if (phaseT > 1.5 && li < 3) { phase = 'play'; build(li + 1); }
      } else if (!over && !showMap) {
        lt += dt; if (grace > 0) grace -= dt; if (inv > 0) inv -= dt; if (bumpCool > 0) bumpCool -= dt;
        oil = Math.max(0, oil - dt / 100); if (boost > 0) boost -= dt;
        movePlayer(dt); pickups(); updateMice(dt); updateGhosts(dt);
        if (hintT > 0) { hintT -= dt; hintCool -= dt; if (hintCool <= 0) { hintCool = 0.25; updateHint(); } }
      }
      computeLit(radius());
      const t = camTarget(), k = 1 - Math.exp(-8 * dt); cam.x += (t.x - cam.x) * k; cam.y += (t.y - cam.y) * k;
      draw();
    });
    return { destroy() { stopMusic?.(); stopMusic = null; } };
  },
};
