// Türchen 5: Rentier-Rüber (Überquer-Spiel mit Straße, Fluss und fünf Ställen)
export const howto = 'Hüpf mit den Pfeiltasten, durch Wischen oder mit den Pfeil-Buttons Feld für Feld nach oben. Tippen = nach vorne hüpfen. Weich den Fahrzeugen aus, spring auf Eisschollen und Baumstämme und bring das Rentier in alle 5 Ställe!';

const W = 360, H = 560, C = 40, START = 12, MEDIAN = 6;
const isRiver = r => r >= 1 && r <= 5;
const isRoad = r => r >= 7 && r <= 11;
const rowY = r => r * C + C / 2;
const colX = c => c * C + C / 2;
const snapX = x => colX(Math.max(0, Math.min(8, Math.round((x - C / 2) / C))));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const VEH = { plow: { w: 84, v: 30 }, van: { w: 72, v: 40 }, sleigh: { w: 64, v: 52 }, mobil: { w: 46, v: 66 } };
const CYCLE = 7; // Tauch-Zyklus der Schollen in Sekunden

export default {
  create(ctx) {
    const { g, canvas, pos } = ctx.makeCanvas(W, H);
    const A = ctx.audio;
    const testMode = /rrtest/.test(location.search);

    let level = 1, score = 0, lives = 3, levelsDone = 0;
    let lanes = [], stalls = [], parts = [], texts = [], prints = [], carrot = null;
    let time = 0, over = false, god = false;
    let state = 'play', stateT = 0, deathKind = '', after = null;
    let tMax = 30, tLeft = 30, running = false, lastTick = 99;
    let r = null, bestRow = START, queue = null, holdT = 0, holdCool = 0, shownHint = false, banner = null, shakeT = 0;
    const flakes = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: rnd(0.8, 2.2), v: rnd(14, 36), p: Math.random() * 6 }));

    // ---------- Aufbau ----------
    function genLane(lane, wFn, gapFn, extra) {
      let cur = -60; lane.items = [];
      while (cur < W + 150) {
        const it = wFn(); it.x = cur + it.w / 2; cur += it.w + gapFn();
        if (extra) extra(it); lane.items.push(it);
      }
      lane.loopLen = cur + 60;
    }
    function buildLanes() {
      lanes = [];
      const mv = Math.min(2.0, 1 + 0.11 * (level - 1)), mr = Math.min(1.8, 1 + 0.09 * (level - 1));
      const types = shuffle(['plow', 'van', 'sleigh', 'mobil']); types.push(pick(['plow', 'van', 'sleigh', 'mobil']));
      if (types[4] === 'sleigh' || types[4] === 'mobil') { const k = types.findIndex(t => t === 'plow' || t === 'van'); [types[4], types[k]] = [types[k], types[4]]; }
      const dir0 = Math.random() < 0.5 ? 1 : -1;
      const gMin = Math.max(66, 118 - 8 * (level - 1));
      for (let i = 0; i < 5; i++) { // Straße: Reihe 7..11
        const t = types[i], row = 7 + i, d = i % 2 ? -dir0 : dir0;
        const lane = { row, kind: 'road', type: t, dir: d, vx: d * VEH[t].v * rnd(0.92, 1.12) * mv };
        genLane(lane, () => ({ w: VEH[t].w, hue: Math.random() }), () => rnd(gMin, gMin + 85));
        lanes[row] = lane;
      }
      const rd0 = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < 5; i++) { // Fluss: Reihe 1..5
        const row = 1 + i, d = i % 2 ? -rd0 : rd0;
        const lane = { row, kind: 'river', dir: d, vx: d * rnd(20, 34) * mr };
        const gLo = Math.min(64, 44 + 4 * (level - 1)), gHi = Math.min(116, 80 + 6 * (level - 1));
        genLane(lane, () => Math.random() < 0.5
          ? { type: 'floe', w: pick([56, 72]), seed: Math.random() }
          : { type: 'log', w: pick([104, 136]), seed: Math.random() },
        () => rnd(gLo, gHi),
        it => { it.dive = level >= 2 && it.type === 'floe' && Math.random() < 0.5; it.ph = Math.random() * CYCLE; });
        lanes[row] = lane;
      }
    }
    const diveState = it => { // 0 oben, 1 Warnung, 2 unten, 3 taucht auf
      if (!it.dive) return 0;
      const p = (it.ph + time) % CYCLE;
      return p < 3.8 ? 0 : p < 4.9 ? 1 : p < 6.3 ? 2 : 3;
    };
    const walkable = it => diveState(it) !== 2;

    function newLevel() {
      buildLanes(); stalls = [false, false, false, false, false];
      tMax = Math.max(22, 30 - (level - 1)); respawn(true);
      hud();
    }
    function respawn(first) {
      r = { x: colX(4), row: START, y: rowY(START), py: START, hop: null, squash: 0, rot: 0, hidden: false, face: 0 };
      bestRow = START; queue = null; tLeft = tMax; running = false; lastTick = 99; state = 'play'; stateT = 0; carrot = null;
      if (level >= 3) { const row = pick([6, 7, 8, 9, 10, 11]); carrot = { x: colX(1 + Math.floor(Math.random() * 7)), row }; }
      if (first && level > 1) banner = { text: 'Level ' + level, sub: level === 2 ? 'Tauchende Schollen!' : level === 3 ? 'Karotten = Bonus!' : 'Schneller und dichter!', t: 1.8 };
    }
    const hud = () => ctx.hud.set({ Lv: level, Punkte: score, Stall: stalls.filter(Boolean).length + '/5' });

    // ---------- Effekte ----------
    function burst(x, y, color, n = 12, o = {}) {
      for (let i = 0; i < n; i++) {
        const a = o.up ? -Math.PI / 2 + rnd(-0.9, 0.9) : Math.random() * 6.3, v = rnd(o.v0 || 40, o.v1 || 150);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.4, 0.8), max: 0.8, color: Array.isArray(color) ? pick(color) : color, size: rnd(2, o.big || 4), grav: o.grav ?? 260 });
      }
    }
    const say = (txt, x, y, color = '#ffd166') => texts.push({ txt, x, y, life: 1.0, color });
    const tone = (...a) => A.tone(...a);

    // ---------- Hüpfen ----------
    function tryHop(dx, dy) {
      if (over || state !== 'play' || ctx.paused) return;
      if (r.hop) { queue = { dx, dy }; return; }
      const nr = r.row + dy; if (nr < 0 || nr > START) return;
      let nx = r.x + dx * C;
      if (nx < C / 2 - 1 || nx > W - C / 2 + 1) { bump(); return; }
      if (nr === 0) {
        const c = Math.max(0, Math.min(8, Math.round((r.x + dx * C - C / 2) / C)));
        if (c % 2 || stalls[c / 2]) { bump(); return; }
        nx = colX(c);
      } else if (!isRiver(nr)) nx = snapX(nx);
      if (dx) r.face = dx;
      r.hop = { t: 0, dur: 0.12, fx: r.x, tx: nx, from: r.row };
      r.py = r.row; r.row = nr;
      if (!running) { running = true; shownHint = true; }
      tone(300 + (START - nr) * 22, 0.1, 'square', 0.1, 520 + (START - nr) * 22);
    }
    function bump() { r.squash = 0.14; tone(150, 0.08, 'sawtooth', 0.12, 90); say('Hoppla!', r.x, r.y - 22, '#8ecae6'); }
    function land() {
      const h = r.hop; r.hop = null; r.x = h.tx; r.squash = 0.14;
      if (r.row < bestRow) { bestRow = r.row; score += 10; hud(); }
      if (!isRiver(r.row) && r.row !== 0 && !isRoad(r.row)) addPrints();
      if (isRoad(r.row)) burst(r.x, r.y + 8, '#dff3ff', 3, { v1: 40, grav: 0 });
      if (r.row === 0) return fillStall();
      if (isRiver(r.row)) {
        if (!god && !standing()) return die('splash');
        burst(r.x, r.y + 10, ['#ffffff', '#cdeeff'], 4, { v1: 50, grav: 80 });
      }
      if (carrot && carrot.row === r.row && Math.abs(carrot.x - r.x) < 8) {
        carrot = null; score += 50; tLeft = Math.min(tMax, tLeft + 4); hud(); A.sfx('power');
        burst(r.x, r.y, ['#ff9f1c', '#ffd166', '#06d6a0'], 22, { v1: 190 }); say('Karotte! +50', r.x, r.y - 24, '#ff9f1c');
      } else tone(170, 0.05, 'sine', 0.13, 110);
      if (queue) { const q = queue; queue = null; tryHop(q.dx, q.dy); }
    }
    function addPrints() { prints.push({ x: r.x - 5, y: r.y + 7, life: 3 }, { x: r.x + 5, y: r.y + 12, life: 3 }); }
    const standing = () => lanes[r.row].items.some(it => walkable(it) && Math.abs(r.x - it.x) <= it.w / 2 + 3);

    function fillStall() {
      const i = (r.x - C / 2) / C / 2; stalls[Math.round(i)] = true;
      const left = stalls.filter(x => !x).length, bonus = Math.round(tLeft) * 4;
      score += 100 + bonus; hud(); A.sfx('coin'); tone(1568, 0.25, 'triangle', 0.14, null, 0.15);
      burst(r.x, r.y, ['#ffd166', '#ffffff', '#ef476f'], 26, { v1: 200, big: 5 });
      say('+' + (100 + bonus), r.x, r.y + 30, '#ffd166');
      r.hidden = true;
      if (left === 0) {
        state = 'cleared'; stateT = 0; levelsDone = Math.max(levelsDone, level); score += 200; hud();
        A.sfx('level'); ctx.fx.confetti(90); if (levelsDone <= 3) ctx.fx.emojiBurst('⭐');
        banner = { text: 'Level ' + level + ' geschafft!', sub: levelsDone <= 3 ? levelsDone + (levelsDone === 1 ? ' Stern' : ' Sterne') + ' sicher! Weiter geht\'s!' : 'Es wird noch wilder!', t: 2.2 };
      } else { state = 'rest'; stateT = 0; after = () => respawn(false); }
    }

    function die(kind, veh) {
      if (state !== 'play') return;
      state = 'dead'; stateT = 0; deathKind = kind; running = false; queue = null; r.hop = null;
      lives--; hud();
      if (kind === 'splash') {
        A.sfx('pop'); tone(520, 0.3, 'sine', 0.2, 120); A.sfx('swoosh');
        burst(r.x, r.y, ['#8ecae6', '#ffffff', '#cdeeff'], 34, { up: true, v0: 80, v1: 260, grav: 520, big: 5 });
        parts.push({ x: r.x, y: r.y, vx: 0, vy: 0, life: 0.7, max: 0.7, ring: true, color: '#cdeeff', size: 4, grav: 0 });
        say('Platsch!', r.x, r.y - 20, '#8ecae6'); r.hidden = true; shakeT = 0.18;
      } else if (kind === 'hit') {
        A.sfx('hit'); ctx.fx.shake(300);
        r.vx = (veh ? veh.dir : 1) * 170; r.vy = -190; r.spin = 13;
        burst(r.x, r.y, ['#ffffff', '#ffd166', '#cdeeff'], 24, { v1: 200 }); say('Purzelbaum!', r.x, Math.max(30, r.y - 26), '#ffd166');
      } else { A.sfx('bad'); say('Zeit um! Zzz', r.x, r.y - 24, '#8ecae6'); }
      after = () => { if (lives <= 0) gameOver(); else respawn(false); };
    }
    function gameOver() {
      over = true; state = 'over';
      const s = Math.min(3, levelsDone);
      const text = s === 0 ? 'Füll alle 5 Ställe, dann ist Level 1 geschafft und du bekommst den ersten Stern!'
        : s === 1 ? 'Level 1 geschafft! Für den 2. Stern musst du auch Level 2 schaffen (da tauchen Schollen ab).'
        : s === 2 ? 'Zwei Sterne! Für den 3. Stern fehlt noch Level 3 mit Karotten-Bonus.'
        : 'Alle 3 Sterne! Du hast ' + levelsDone + ' Levels geschafft.';
      ctx.timeout(() => ctx.finish({ won: s > 0, stars: s, score, text }), 500);
    }

    // ---------- Eingabe ----------
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const act = name => { holdT = 0; if (D[name]) tryHop(...D[name]); else if (name === 'a') tryHop(0, -1); };
    ctx.input.onPress(act);
    ctx.input.onSwipe(act);
    ctx.input.pad({ dpad: true });
    let dn = null;
    ctx.on(canvas, 'pointerdown', e => { dn = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    ctx.on(canvas, 'pointerup', e => {
      if (!dn) return; const d = Math.hypot(e.clientX - dn.x, e.clientY - dn.y); dn = null;
      if (d < 18) tryHop(0, -1);
    });
    void pos;

    // ---------- Update ----------
    function update(dt) {
      time += dt; stateT += dt;
      for (const l of lanes) if (l) for (const it of l.items) {
        it.x += l.vx * dt;
        if (l.dir > 0 && it.x - it.w / 2 > W + 20) it.x -= l.loopLen;
        if (l.dir < 0 && it.x + it.w / 2 < -20) it.x += l.loopLen;
      }
      if (banner && (banner.t -= dt) <= 0) banner = null;
      if (shakeT > 0) shakeT -= dt;
      for (const f of flakes) { f.y += f.v * dt; f.x += Math.sin(time + f.p) * 8 * dt; if (f.y > H) { f.y = -4; f.x = Math.random() * W; } }
      parts = parts.filter(p => (p.life -= dt) > 0);
      for (const p of parts) { p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      texts = texts.filter(t => (t.life -= dt) > 0); for (const t of texts) t.y -= 22 * dt;
      prints = prints.filter(p => (p.life -= dt) > 0);
      if (!r) return;
      if (r.squash > 0) r.squash -= dt;
      if (state !== 'dead') r.y = r.hop ? rowY(r.py) + (rowY(r.row) - rowY(r.py)) * Math.min(1, r.hop.t / r.hop.dur) : rowY(r.row);

      if (state === 'play') {
        if (r.hop) {
          r.hop.t += dt; const p = Math.min(1, r.hop.t / r.hop.dur);
          r.x = r.hop.fx + (r.hop.tx - r.hop.fx) * p; r.y = rowY(r.py) + (rowY(r.row) - rowY(r.py)) * p;
          if (p >= 1) land();
        } else if (isRiver(r.row)) r.x += lanes[r.row].vx * dt;
        if (state !== 'play') return;
        // halten = wiederholt hüpfen
        const held = ['up', 'left', 'right', 'down'].find(n => ctx.input.down(n));
        if (held) { holdT += dt; holdCool -= dt; if (holdT > 0.32 && holdCool <= 0 && !r.hop) { holdCool = 0.14; tryHop(...D[held]); } } else { holdT = 0; holdCool = 0; }
        if (!god) {
          if (isRiver(r.row) && !r.hop) { if (!standing()) return die('splash'); if (r.x < 0 || r.x > W) return die('splash'); }
          for (const row of r.hop ? [r.row, r.py] : [r.row]) if (isRoad(row)) {
            for (const it of lanes[row].items) if (Math.abs(r.x - it.x) < 10 + it.w / 2 - 4 && Math.abs(r.y - rowY(row)) < 18) return die('hit', lanes[row]);
          }
        }
        if (running) {
          tLeft -= dt;
          if (tLeft < 5.2 && Math.ceil(tLeft) < lastTick && tLeft > 0) { lastTick = Math.ceil(tLeft); A.sfx('tick'); }
          if (tLeft <= 0) { tLeft = 0; return die('time'); }
        }
      } else if (state === 'dead') {
        if (deathKind === 'hit' && r.vx !== undefined) { r.vy += 620 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.spin * dt; }
        if (stateT > 1.0) { const f = after; after = null; if (f) f(); }
      } else if (state === 'rest') {
        if (stateT > 0.6) { const f = after; after = null; if (f) f(); }
      } else if (state === 'cleared') {
        if (stateT > 2.3) { level++; lives = Math.min(5, lives + 1); newLevel(); }
      }
    }

    // ---------- Zeichnen ----------
    function rr(x, y, w, h, rad) {
      rad = Math.min(rad, w / 2, h / 2);
      g.beginPath(); g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad);
      g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath();
    }
    function drawBackground() {
      g.fillStyle = '#0b1437'; g.fillRect(0, 0, W, H);
      // Ziel-Reihe
      g.fillStyle = '#1a2a5c'; g.fillRect(0, 0, W, C);
      g.fillStyle = '#c9dbef'; g.fillRect(0, C - 8, W, 8);
      // Fluss
      const wg = g.createLinearGradient(0, C, 0, 6 * C); wg.addColorStop(0, '#1b5a8f'); wg.addColorStop(1, '#0f3a6b');
      g.fillStyle = wg; g.fillRect(0, C, W, 5 * C);
      g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1.5;
      for (let i = 1; i <= 5; i++) { const l = lanes[i]; for (let k = 0; k < 7; k++) { const x = ((k * 61 + time * l.vx * 0.5 + i * 23) % (W + 40) + W + 40) % (W + 40) - 20, y = rowY(i) + Math.sin(k + i) * 9; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 7, y - 3, x + 14, y); g.stroke(); } }
      // Mittelstreifen und Start
      for (const row of [MEDIAN, START]) {
        g.fillStyle = '#b4c9e2'; g.fillRect(0, row * C, W, C);
        g.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 14; k++) { const x = (k * 53 + row * 17) % W; g.fillRect(x, row * C + ((k * 7) % 30) + 5, 3, 3); }
        g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, row * C + (row === MEDIAN ? 0 : 0), W, 3);
        for (let k = 0; k < 4; k++) { // kleine Schneehaufen
          const x = (k * 97 + row * 31) % W; g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(x, row * C + C - 4, 14, 5, 0, Math.PI, 0); g.fill();
        }
      }
      // Straße
      g.fillStyle = '#272d56'; g.fillRect(0, 7 * C, W, 5 * C);
      g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 20; i++) g.fillRect((i * 73) % W, 7 * C + ((i * 41) % 190) + 4, 18, 2);
      g.strokeStyle = 'rgba(255,230,160,.45)'; g.lineWidth = 2; g.setLineDash([14, 14]);
      for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, (7 + i) * C); g.lineTo(W, (7 + i) * C); g.stroke(); }
      g.setLineDash([]);
      // Fußspuren
      for (const p of prints) { g.globalAlpha = Math.min(0.5, p.life * 0.3); g.fillStyle = '#6f87a8'; g.beginPath(); g.ellipse(p.x, p.y, 2.6, 3.6, 0, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;
    }
    function drawTree(x, y, s = 1) {
      g.fillStyle = '#5b3a29'; g.fillRect(x - 2, y + 8 * s, 4, 6 * s);
      for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#0f8a5f' : '#16a06f'; g.beginPath(); g.moveTo(x, y - 14 * s + i * 6 * s); g.lineTo(x + (8 + i * 3) * s, y - 2 * s + i * 6 * s); g.lineTo(x - (8 + i * 3) * s, y - 2 * s + i * 6 * s); g.fill(); }
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - 14 * s); g.lineTo(x + 4 * s, y - 8 * s); g.lineTo(x - 4 * s, y - 8 * s); g.fill();
    }
    function drawGoal() {
      const target = state === 'play' && r && r.row === 1 ? Math.max(0, Math.min(8, Math.round((r.x - C / 2) / C))) : -1;
      for (let c = 0; c < 9; c++) {
        const x = colX(c), y = rowY(0) - 4;
        if (c % 2) { drawTree(x, y, 0.9); continue; }
        const full = stalls[c / 2];
        g.fillStyle = '#7a4a2e'; g.fillRect(x - 15, y - 6, 30, 22);
        g.fillStyle = full ? '#2a1a10' : '#ffd166'; g.shadowColor = '#ffd166'; g.shadowBlur = full ? 0 : 8 + 4 * Math.sin(time * 4 + c);
        g.fillRect(x - 9, y + 1, 18, 15); g.shadowBlur = 0;
        g.fillStyle = '#ef476f'; g.beginPath(); g.moveTo(x - 19, y - 5); g.lineTo(x, y - 20); g.lineTo(x + 19, y - 5); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 12, y - 8); g.lineTo(x, y - 18); g.lineTo(x + 12, y - 8); g.lineTo(x + 8, y - 8); g.lineTo(x, y - 13); g.lineTo(x - 8, y - 8); g.fill();
        if (full) { drawDeer(x, y + 9, 0.48, 1, 1, 0, Math.sin(time * 6 + c) * 1.5); }
        else if (target === c) { g.fillStyle = '#fff'; g.globalAlpha = 0.5 + 0.5 * Math.sin(time * 9); g.beginPath(); g.moveTo(x, y + 22); g.lineTo(x - 6, y + 31); g.lineTo(x + 6, y + 31); g.fill(); g.globalAlpha = 1; }
      }
    }
    function drawDeer(x, y, s, sx, sy, rot, dy = 0) {
      g.save(); g.translate(x, y + dy); g.rotate(rot); g.scale(s * sx, s * sy);
      g.fillStyle = '#7a4d2f'; // Beine
      for (const lx of [-9, -3, 3, 9]) { g.fillRect(lx - 1.8, 6, 3.6, 12); }
      g.fillStyle = '#a56a42'; g.beginPath(); g.ellipse(0, 4, 13, 12, 0, 0, 6.3); g.fill();
      g.fillStyle = '#f1dfc7'; g.beginPath(); g.ellipse(0, 9, 8, 6, 0, 0, 6.3); g.fill();
      g.fillStyle = '#06d6a0'; g.fillRect(-9, -4, 18, 5); g.fillStyle = '#ef476f'; g.fillRect(-4, -4, 3, 5); g.fillRect(3, -4, 3, 5); // Schal
      g.strokeStyle = '#e9c46a'; g.lineWidth = 2.6; g.lineCap = 'round'; // Geweih
      g.beginPath(); g.moveTo(-6, -15); g.lineTo(-12, -26); g.moveTo(-9, -21); g.lineTo(-15, -22); g.moveTo(-11, -24); g.lineTo(-10, -30);
      g.moveTo(6, -15); g.lineTo(12, -26); g.moveTo(9, -21); g.lineTo(15, -22); g.moveTo(11, -24); g.lineTo(10, -30); g.stroke();
      g.fillStyle = '#a56a42'; g.beginPath(); g.ellipse(-10, -13, 4.5, 3, -0.5, 0, 6.3); g.ellipse(10, -13, 4.5, 3, 0.5, 0, 6.3); g.fill();
      g.fillStyle = '#b97b50'; g.beginPath(); g.arc(0, -8, 11, 0, 6.3); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-4.5, -11, 3.2, 0, 6.3); g.arc(4.5, -11, 3.2, 0, 6.3); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(-4.2, -10.6, 1.6, 0, 6.3); g.arc(4.8, -10.6, 1.6, 0, 6.3); g.fill();
      g.shadowColor = '#ef476f'; g.shadowBlur = 10; g.fillStyle = '#ef476f'; g.beginPath(); g.arc(0, -4, 4.4, 0, 6.3); g.fill(); g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-1.3, -5.3, 1.3, 0, 6.3); g.fill();
      g.restore();
    }
    function drawVehicle(it, lane) {
      const t = lane.type, y = rowY(lane.row);
      g.save(); g.translate(it.x, y); g.scale(lane.dir, 1);
      const w = it.w, hw = w / 2;
      // Scheinwerferlicht
      const lg = g.createLinearGradient(hw, 0, hw + 36, 0); lg.addColorStop(0, 'rgba(255,240,170,.35)'); lg.addColorStop(1, 'rgba(255,240,170,0)');
      g.fillStyle = lg; g.beginPath(); g.moveTo(hw - 2, -3); g.lineTo(hw + 36, -11); g.lineTo(hw + 36, 11); g.lineTo(hw - 2, 3); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 13, hw, 4, 0, 0, 6.3); g.fill();
      const wheel = (x, rad = 5) => { g.fillStyle = '#10131f'; g.beginPath(); g.arc(x, 11, rad, 0, 6.3); g.fill(); g.fillStyle = '#9aa5c7'; g.beginPath(); g.arc(x, 11, rad * 0.4, 0, 6.3); g.fill(); };
      if (t === 'plow') {
        g.fillStyle = '#f4a261'; rr(-hw + 4, -9, w - 22, 20, 4); g.fill();
        g.fillStyle = '#e76f51'; rr(-hw + 4, 4, w - 22, 6, 2); g.fill();
        g.fillStyle = '#f4a261'; rr(4, -15, 22, 16, 4); g.fill();
        g.fillStyle = '#bfe9ff'; rr(9, -12, 13, 9, 2); g.fill();
        g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(hw - 12, 12); g.lineTo(hw - 10, -12); g.lineTo(hw + 3, -9); g.lineTo(hw + 1, 14); g.fill();
        g.fillStyle = '#222'; for (let i = 0; i < 3; i++) g.fillRect(hw - 9 + i * 0.6, -9 + i * 7, 4, 3);
        const on = Math.sin(time * 14 + it.hue * 6) > 0; g.fillStyle = on ? '#ffe066' : '#8d6b1f'; g.shadowColor = '#ffd23f'; g.shadowBlur = on ? 10 : 0;
        g.beginPath(); g.arc(14, -18, 3, 0, 6.3); g.fill(); g.shadowBlur = 0;
        wheel(-hw + 14); wheel(-hw + 32, 5); wheel(12);
      } else if (t === 'van') {
        const col = it.hue < 0.5 ? '#2a9d8f' : '#5b8def';
        g.fillStyle = col; rr(-hw + 2, -14, w - 14, 25, 5); g.fill();
        g.fillStyle = col; rr(hw - 24, -8, 22, 19, 5); g.fill();
        g.fillStyle = '#bfe9ff'; rr(hw - 18, -6, 12, 8, 2); g.fill();
        g.fillStyle = '#fff'; g.fillRect(-hw + 6, 3, w - 22, 3);
        g.fillStyle = '#ffd166'; g.beginPath(); // Stern
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? 3 : 7; g.lineTo(-hw + 20 + Math.cos(a) * rad, -4 + Math.sin(a) * rad); } g.fill();
        g.fillStyle = '#fff3a8'; g.fillRect(hw - 3, 0, 3, 5);
        wheel(-hw + 16); wheel(hw - 14);
      } else if (t === 'sleigh') {
        g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-hw + 2, 12); g.lineTo(hw - 8, 12); g.quadraticCurveTo(hw + 2, 12, hw, 3); g.stroke();
        g.fillStyle = '#ef476f'; g.beginPath(); g.moveTo(-hw + 4, -6); g.lineTo(hw - 4, -6); g.quadraticCurveTo(hw - 4, 9, hw - 14, 9); g.lineTo(-hw + 8, 9); g.closePath(); g.fill();
        g.fillStyle = '#b3243f'; g.fillRect(-hw + 6, 4, w - 16, 3);
        g.fillStyle = '#06d6a0'; g.fillRect(-18, -16, 14, 11); g.fillStyle = '#ffd166'; g.fillRect(-12, -16, 3, 11); g.fillRect(-18, -12, 14, 3);
        g.fillStyle = '#c77dff'; g.fillRect(2, -13, 11, 8); g.fillStyle = '#fff'; g.fillRect(6, -13, 3, 8);
        const on = Math.sin(time * 8 + it.hue * 9) > 0; g.fillStyle = on ? '#ffe066' : '#c9a227'; g.beginPath(); g.arc(hw - 8, -7, 2.5, 0, 6.3); g.fill();
      } else {
        g.strokeStyle = '#ddd'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-hw + 2, 13); g.lineTo(hw - 4, 13); g.quadraticCurveTo(hw + 2, 13, hw, 8); g.stroke();
        g.fillStyle = '#c77dff'; rr(-hw + 4, -4, w - 12, 15, 6); g.fill();
        g.fillStyle = '#7b3fc4'; rr(-hw + 4, 4, w - 12, 5, 2); g.fill();
        g.fillStyle = '#bfe9ff'; g.beginPath(); g.moveTo(4, -4); g.lineTo(12, -12); g.lineTo(15, -4); g.fill();
        g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(hw - 6, 1, 2.8, 0, 6.3); g.fill();
        g.fillStyle = '#ffd166'; g.fillRect(-hw + 8, -8, 10, 4);
      }
      g.restore();
      if (Math.random() < 0.25) parts.push({ x: it.x - lane.dir * (it.w / 2), y: y + 12, vx: -lane.dir * rnd(10, 40), vy: -rnd(5, 25), life: 0.4, max: 0.4, color: '#e6f3ff', size: rnd(1.5, 3), grav: 0 });
    }
    function drawRiverItem(it, lane) {
      const y = rowY(lane.row), ds = diveState(it);
      g.save(); g.translate(it.x, y);
      let a = 1, wob = 0, sink = 0;
      if (ds === 1) { wob = Math.sin(time * 38) * 1.6; sink = 2; a = 0.8 + 0.2 * Math.sin(time * 22); }
      if (ds === 2) { a = 0.28; sink = 7; }
      if (ds === 3) { a = 0.7; sink = 3; }
      g.translate(wob, sink); g.globalAlpha = a;
      const hw = it.w / 2;
      if (it.type === 'floe') {
        g.fillStyle = '#8ecae6'; rr(-hw, -9, it.w, 24, 10); g.fill();
        g.fillStyle = it.dive && ds !== 0 ? '#ffd9c2' : '#e8f7ff'; rr(-hw, -13, it.w, 23, 10); g.fill();
        g.fillStyle = 'rgba(142,202,230,.5)'; rr(-hw + 7, -7, it.w * 0.35, 5, 2); g.fill(); g.fillRect(hw - 22, 0, 12, 3);
        if (it.dive) { g.fillStyle = ds === 1 ? '#ef476f' : 'rgba(239,71,111,.35)'; g.beginPath(); g.arc(hw - 9, -5, 2.4, 0, 6.3); g.fill(); }
      } else {
        g.fillStyle = '#6b4226'; rr(-hw, -11, it.w, 24, 9); g.fill();
        g.fillStyle = '#8d5a35'; rr(-hw, -13, it.w, 22, 9); g.fill();
        g.strokeStyle = 'rgba(60,30,10,.45)'; g.lineWidth = 1.4;
        for (let k = 0; k < 4; k++) { const x = -hw + 16 + k * (it.w - 32) / 3; g.beginPath(); g.moveTo(x - 6, -6 + (k % 2) * 6); g.lineTo(x + 6, -6 + (k % 2) * 6); g.stroke(); }
        g.fillStyle = '#d9a066'; g.beginPath(); g.ellipse(hw - 5, -2, 5, 9, 0, 0, 6.3); g.fill(); g.strokeStyle = '#8d5a35'; g.beginPath(); g.ellipse(hw - 5, -2, 2.2, 4.5, 0, 0, 6.3); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-hw * 0.3, -12, it.w * 0.18, 4, 0, Math.PI, 0); g.ellipse(hw * 0.3, -11, it.w * 0.12, 3, 0, Math.PI, 0); g.fill();
      }
      g.restore(); g.globalAlpha = 1;
    }
    function drawUI() {
      g.fillStyle = '#080e28'; g.fillRect(0, 13 * C, W, C);
      for (let i = 0; i < Math.max(3, lives); i++) {
        const x = 18 + i * 24, y = 13 * C + 20, on = i < lives; g.fillStyle = on ? '#ef476f' : '#2a3358';
        g.beginPath(); g.moveTo(x, y + 7); g.bezierCurveTo(x - 12, y - 2, x - 6, y - 12, x, y - 5); g.bezierCurveTo(x + 6, y - 12, x + 12, y - 2, x, y + 7); g.fill();
      }
      const bx = 140, bw = W - bx - 16, p = running || state !== 'play' ? tLeft / tMax : 1;
      g.fillStyle = '#1b2650'; rr(bx, 13 * C + 13, bw, 14, 7); g.fill();
      const low = tLeft < 6 && running; g.fillStyle = low ? (Math.sin(time * 14) > 0 ? '#ef476f' : '#ff9aae') : p > 0.5 ? '#06d6a0' : '#ffd166';
      if (p > 0.01) { rr(bx, 13 * C + 13, Math.max(10, bw * p), 14, 7); g.fill(); }
      g.fillStyle = '#e6f3ff'; g.font = 'bold 11px sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('Zeit', bx - 8, 13 * C + 20);
    }
    function draw() {
      g.save();
      if (shakeT > 0) g.translate(rnd(-3, 3), rnd(-3, 3));
      drawBackground();
      for (let i = 1; i <= 5; i++) for (const it of lanes[i].items) drawRiverItem(it, lanes[i]);
      drawGoal();
      if (carrot) {
        const cx = carrot.x, cy = rowY(carrot.row) + Math.sin(time * 5) * 2; g.save(); g.translate(cx, cy);
        g.shadowColor = '#ff9f1c'; g.shadowBlur = 12; g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(-6, -6); g.lineTo(6, -6); g.lineTo(0, 13); g.fill(); g.shadowBlur = 0;
        g.fillStyle = '#06d6a0'; g.beginPath(); g.ellipse(-3, -10, 2.5, 5, -0.4, 0, 6.3); g.ellipse(3, -10, 2.5, 5, 0.4, 0, 6.3); g.ellipse(0, -11, 2.2, 5, 0, 0, 6.3); g.fill(); g.restore();
      }
      // Rentier
      if (r && !r.hidden) {
        let sx = 1, sy = 1, lift = 0;
        if (r.hop) { const p = Math.min(1, r.hop.t / r.hop.dur); lift = 13 * Math.sin(p * Math.PI); sx = 1 - 0.1 * Math.sin(p * Math.PI); sy = 1 + 0.16 * Math.sin(p * Math.PI); }
        else if (r.squash > 0) { const k = r.squash / 0.14; sx = 1 + 0.25 * k; sy = 1 - 0.25 * k; }
        else sy = 1 + 0.03 * Math.sin(time * 4);
        const dead = state === 'dead';
        if (!dead || deathKind !== 'hit') { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(r.x, r.y + 15, 11 - lift * 0.3, 4, 0, 0, 6.3); g.fill(); }
        if (dead && deathKind === 'time') { g.save(); g.globalAlpha = 0.95; drawDeer(r.x, r.y - 3, 0.9, 1.1, 0.8, Math.sin(time * 3) * 0.12); g.restore(); }
        else drawDeer(r.x, r.y - lift - 3, 0.9, sx, sy, dead ? r.rot : 0);
      }
      if (state === 'dead' && deathKind === 'splash') { // schwimmende Nase
        const t = stateT; g.globalAlpha = Math.max(0, 1 - t / 1.0); g.shadowColor = '#ef476f'; g.shadowBlur = 12; g.fillStyle = '#ef476f';
        g.beginPath(); g.arc(r.x, r.y + 6 + Math.sin(t * 9) * 2, 5, 0, 6.3); g.fill(); g.shadowBlur = 0; g.globalAlpha = 1;
      }
      for (let i = 7; i <= 11; i++) for (const it of lanes[i].items) drawVehicle(it, lanes[i]);
      for (const p of parts) {
        g.globalAlpha = Math.max(0, Math.min(1, p.life / (p.max * 0.8)));
        if (p.ring) { g.strokeStyle = p.color; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, (1 - p.life / p.max) * 30 + 4, 0, 6.3); g.stroke(); }
        else { g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size / 2, 0, 6.3); g.fill(); }
      }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.8)'; for (const f of flakes) { g.beginPath(); g.arc(f.x, f.y, f.s, 0, 6.3); g.fill(); }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 15px sans-serif'; g.lineJoin = 'round';
      for (const t of texts) { g.globalAlpha = Math.min(1, t.life * 2); g.lineWidth = 4; g.strokeStyle = '#0b1437'; g.strokeText(t.txt, Math.max(40, Math.min(W - 40, t.x)), t.y); g.fillStyle = t.color; g.fillText(t.txt, Math.max(40, Math.min(W - 40, t.x)), t.y); }
      g.globalAlpha = 1;
      if (!shownHint && state === 'play' && r && !r.hop && level === 1) {
        const b = Math.sin(time * 6) * 4; g.fillStyle = '#ffd166'; g.beginPath(); g.moveTo(r.x, r.y - 30 + b); g.lineTo(r.x - 9, r.y - 18 + b); g.lineTo(r.x + 9, r.y - 18 + b); g.fill();
        g.font = 'bold 15px sans-serif'; g.lineWidth = 4; g.strokeStyle = '#0b1437'; g.strokeText('Tippen oder Pfeiltaste: hüpf los!', W / 2, START * C - 44); g.fillStyle = '#fff'; g.fillText('Tippen oder Pfeiltaste: hüpf los!', W / 2, START * C - 44);
      }
      if (banner) {
        g.globalAlpha = Math.min(1, banner.t * 2); g.fillStyle = 'rgba(8,14,40,.78)'; rr(30, 200, W - 60, 82, 16); g.fill();
        g.textAlign = 'center'; g.font = 'bold 26px sans-serif'; g.fillStyle = '#ffd166'; g.fillText(banner.text, W / 2, 230);
        g.font = 'bold 14px sans-serif'; g.fillStyle = '#e6f3ff'; g.fillText(banner.sub, W / 2, 262); g.globalAlpha = 1;
      }
      g.restore();
      drawUI();
    }

    if (testMode) ctx.root.rrDebug = {
      get: () => ({ state, level, lives, score, levelsDone, stalls: stalls.slice(), row: r.row, x: r.x, over, tLeft, running }),
      god: v => { god = v; },
    };

    newLevel();
    const music = A.melody([[64, 1], [64, 1], [64, 2], [64, 1], [64, 1], [64, 2], [64, 1], [67, 1], [60, 1.5], [62, 0.5], [64, 4], [0, 2],
      [65, 1], [65, 1], [65, 1.5], [65, 0.5], [65, 1], [64, 1], [64, 1], [64, 0.5], [64, 0.5], [62, 1], [62, 1], [64, 1], [62, 2], [67, 2], [0, 4]],
    { bpm: 132, type: 'triangle', vol: 0.035, loop: true });
    ctx.loop(dt => { update(dt); draw(); });
    return { destroy() { try { music(); } catch {} } };
  },
};
