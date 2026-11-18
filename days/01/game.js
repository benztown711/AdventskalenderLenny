// Türchen 1: Elfmeter-König
// Ziehen/Wischen vom Ball Richtung Tor (Länge = Höhe, Kurve = Effet) oder Tastatur-Zielkreuz mit Leertaste.
export const howto = 'Zieh vom Ball Richtung Tor: Richtung = Ecke, Länge = Höhe. Zieh in einer Kurve für Effet! Mit Tastatur stoppst du das Zielkreuz mit der Leertaste: erst Richtung, dann Höhe. Triff Ecken, Zielscheiben und Eisblöcke meiden!';

const W = 360, H = 560;
const PL = 56, PR = 304, BAR = 150, GY = 250;          // Torpfosten links/rechts, Latte, Torlinie
const CX = 180, BX = 180, BY = 478, R0 = 22, RG = 8, ZE = 2.75;
const SHOTS = 5;
const STARS = [1000, 1800, 2600];
const COL = { gold: '#ffd166', red: '#ef476f', green: '#06d6a0', ice: '#8ecae6', violet: '#c77dff' };

const LEVELS = [
  { name: 'Anstoß', note: 'Der Torwart wärmt sich noch auf.',
    k: { delay: 0.5, rate: 3.0, reach: 70, smart: 0.15, err: 60, amp: 30, spd: 1.3, hr: 24 }, targets: [], obs: [] },
  { name: 'Aufwärmen', note: 'Der Torwart wird flinker!',
    k: { delay: 0.44, rate: 3.6, reach: 84, smart: 0.25, err: 52, amp: 38, spd: 1.8, hr: 25 }, targets: [], obs: [] },
  { name: 'Zielscheiben', note: 'Triff die goldenen Zielscheiben für Extra-Punkte!',
    k: { delay: 0.38, rate: 4.4, reach: 96, smart: 0.35, err: 44, amp: 44, spd: 2.2, hr: 26 },
    targets: [{ x: 86, y: 174, r: 15, pts: 200 }, { x: 274, y: 174, r: 15, pts: 200 }], obs: [] },
  { name: 'Eisblöcke', note: 'Ein Eisblock schwebt vor dem Tor. Nicht treffen!',
    k: { delay: 0.32, rate: 5.2, reach: 108, smart: 0.45, err: 36, amp: 48, spd: 2.6, hr: 27 },
    targets: [{ x: 86, y: 174, r: 15, pts: 200 }, { x: 274, y: 174, r: 15, pts: 200 }],
    obs: [{ x: 130, y: 204, w: 46, h: 22, vx: 42, min: 90, max: 270 }] },
  { name: 'Das Finale', note: 'Zwei Eisblöcke, bewegliche Zielscheiben, ein Top-Torwart!',
    k: { delay: 0.26, rate: 6.2, reach: 118, smart: 0.55, err: 30, amp: 52, spd: 3.0, hr: 28 },
    targets: [{ x: 86, y: 174, r: 15, pts: 200, wob: 0 }, { x: 274, y: 174, r: 15, pts: 200, wob: 2 }, { x: 180, y: 166, r: 12, pts: 300, wob: 4 }],
    obs: [{ x: 120, y: 190, w: 44, h: 20, vx: 50, min: 90, max: 270 }, { x: 240, y: 228, w: 44, h: 20, vx: -64, min: 90, max: 270 }] },
];

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    const au = ctx.audio;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const touch = ctx.input.isTouch;

    // ---------- Zustand ----------
    let time = 0, state = 'intro', stateT = 0, resultWait = 1.4;
    let lvl = 0, shotNo = 0, score = 0, streak = 0, goals = 0, levelGoals = 0, maxLevelShown = 0;
    let results = [[], [], [], [], []];
    let shot = null, ball = null, trail = [], parts = [], pops = [], banner = null;
    let netAge = 99, netX = CX, netY = 200, cheer = 0, shakeAmp = 0, flash = 0;
    let targets = [], obs = [];
    let drag = null, pend = { phase: 0, t: 0, t2: 0, x: CX, y: 200 };
    let K = { x: CX, mode: 'patrol', delayT: 0, x0: CX, h: null, des: null, cheerT: 0, caught: false, ph: 0 };
    let KP = LEVELS[0].k;
    let finished = false;

    const flakes = Array.from({ length: 46 }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(0.8, 2.2), v: rnd(14, 40), ph: rnd(0, 6) }));
    const SKIN = ['#f2c9a5', '#e0a97c', '#c68b5e', '#f7d9bd', '#9a6a45'];
    const SHIRT = [COL.red, COL.gold, COL.ice, COL.violet, '#ffffff', COL.green, '#f78c6b'];
    const crowd = [];
    for (let r = 0; r < 7; r++) for (let i = -1; i < 20; i++) crowd.push({ x: i * 19 + (r % 2) * 9 + rnd(-2, 2), y: 44 + r * 21 + rnd(-1, 1), sk: SKIN[(Math.random() * 5) | 0], sh: SHIRT[(Math.random() * 7) | 0], ph: rnd(0, 6), hat: Math.random() < 0.22 });
    const snowSpots = Array.from({ length: 16 }, () => ({ x: Math.random() < 0.5 ? rnd(-10, 40) : rnd(320, 370), y: rnd(230, 560), rx: rnd(14, 34), ry: rnd(3, 8) }));

    const hud = () => ctx.hud.set({ Punkte: score, Level: `${lvl + 1}/5`, Serie: streak });

    // ---------- Töne ----------
    const whistle = () => { au.tone(2500, 0.13, 'sine', 0.12); au.tone(2500, 0.2, 'sine', 0.12, 2300, 0.17); };
    const crowdCheer = (big = 1) => {
      au.noise(0.9, 0.22 * big); au.noise(0.8, 0.18 * big, 0.28); au.noise(1.1, 0.16 * big, 0.55);
      au.tone(300, 0.7, 'sawtooth', 0.04, 520, 0.05);
    };
    const crowdGroan = () => { au.noise(0.7, 0.1); au.tone(340, 0.7, 'sawtooth', 0.06, 130); };
    const klonk = () => { au.tone(520, 0.3, 'triangle', 0.32, 410); au.tone(1560, 0.18, 'sine', 0.16); au.tone(190, 0.2, 'square', 0.2, 90); au.noise(0.06, 0.25); };
    ctx.interval(() => { if (state !== 'end') au.noise(0.7, 0.02 + cheer * 0.07); }, 480);

    // ---------- Hilfen ----------
    function spawn(n, x, y, o = {}) {
      const cols = o.colors || ['#ffffff'];
      for (let i = 0; i < n; i++) {
        const a = o.up ? -Math.PI / 2 + rnd(-1, 1) : rnd(0, 6.283), v = rnd(o.v0 ?? 30, o.v1 ?? 160);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.4, 1) * (o.life ?? 1), g: o.g ?? 260, c: cols[i % cols.length], s: rnd(2, o.size ?? 4.5) });
      }
    }
    const pop = (text, x, y, color = COL.gold, size = 20, life = 1.2) => pops.push({ text, x, y, color, size, life, max: life });
    function setBanner(text, sub, color) { banner = { text, sub, color, t: 0 }; }

    // ---------- Level & Schüsse ----------
    function startLevel(i) {
      lvl = i; shotNo = 0; levelGoals = 0; results[i] = [];
      KP = LEVELS[i].k;
      targets = LEVELS[i].targets.map(t => ({ ...t, alive: true, bx: t.x, by: t.y }));
      obs = LEVELS[i].obs.map(o => ({ ...o }));
      state = 'intro'; stateT = 0; K.mode = 'patrol'; K.cheerT = 0; ball = null; shot = null;
      if (i + 1 > maxLevelShown) { maxLevelShown = i + 1; try { ctx.save('level', Math.max(ctx.load('level', 1), i + 1)); } catch { /* egal */ } }
      if (i > 0) { au.sfx('level'); }
      setBanner(`LEVEL ${i + 1}`, `${LEVELS[i].name}: ${LEVELS[i].note}`, COL.gold);
      hud();
    }
    function newShot() {
      state = 'aim'; stateT = 0; shot = null; ball = null; trail = []; drag = null;
      K.mode = 'patrol'; K.h = null; K.caught = false; K.cheerT = 0;
      targets.forEach(t => { t.alive = true; });
      pend = { phase: 0, t: rnd(0, 6), t2: 0, x: CX, y: 200 };
      if (shotNo === 0) whistle();
      hud();
    }
    function kick(tx, ty, curve, len) {
      if (state !== 'aim') return;
      tx = clamp(tx, 6, W - 6); ty = clamp(ty, 108, 246);
      const pw = clamp((len - 30) / 170, 0, 1);
      shot = { tx, ty, curve, len, pw, T: 0.95 - 0.33 * pw, t: 0, arc: 16 + (258 - ty) * 0.16, rot: 0 };
      state = 'flight'; stateT = 0; drag = null;
      au.tone(130, 0.12, 'sine', 0.4, 45); au.noise(0.1, 0.18); au.sfx('swoosh');
      if (pw > 0.75) au.tone(700, 0.25, 'sawtooth', 0.05, 200);
      // Torwart entscheidet sich
      let dx, dy;
      if (Math.random() < KP.smart) {
        const e = KP.err + Math.abs(curve) * 24;
        dx = tx + rnd(-e, e); dy = ty + rnd(-e, e) * 0.8;
      } else {
        const side = Math.random() < 0.5 ? -1 : 1;
        dx = CX + side * rnd(35, 110); dy = GY - rnd(14, 74);
      }
      K.des = { x: dx, y: dy }; K.mode = 'wait'; K.delayT = KP.delay;
    }
    function aimFromDrag() {
      const p = drag.pts, a = p[0], b = p[p.length - 1];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const tx = CX + dx * 1.15, ty = clamp(258 - (len - 30) * 0.78, 108, 246);
      // Kurve = größte seitliche Abweichung des Fingers von der Geraden
      let dev = 0;
      if (len > 20) for (const q of p) { const cr = (dx * (q.y - a.y) - dy * (q.x - a.x)) / len; if (Math.abs(cr) > Math.abs(dev)) dev = cr; }
      const curve = Math.abs(dev) < 9 ? 0 : clamp(dev / 38, -1, 1);
      return { tx, ty, len, curve, ok: dy < -10 && len >= 34 };
    }

    // ---------- Eingabe ----------
    ctx.on(canvas, 'pointerdown', e => {
      au.unlock();
      if (state === 'intro' && stateT > 0.5) { stateT = 99; return; }
      if (state === 'result' && stateT > 0.7) { stateT = 99; return; }
      if (state !== 'aim') return;
      const p = pos(e); drag = { id: e.pointerId, pts: [p], start: p };
      try { canvas.setPointerCapture(e.pointerId); } catch { /* egal */ }
    });
    ctx.on(canvas, 'pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const p = pos(e), last = drag.pts[drag.pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) > 2) drag.pts.push(p);
    });
    const release = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const p = pos(e); drag.pts.push(p);
      const a = aimFromDrag(); drag = null;
      if (state !== 'aim') return;
      if (a.ok) kick(a.tx, a.ty, a.curve, a.len);
      else { au.sfx('tick'); ctx.toast('Zieh länger vom Ball nach oben!', 1000); }
    };
    ctx.on(canvas, 'pointerup', release);
    ctx.on(canvas, 'pointercancel', () => { drag = null; });
    ctx.input.onPress(n => {
      if (n !== 'a' && n !== 'b') return;
      au.unlock();
      if (state === 'intro' && stateT > 0.5) { stateT = 99; return; }
      if (state === 'result' && stateT > 0.7) { stateT = 99; return; }
      if (state !== 'aim' || drag || touch) return;
      if (pend.phase === 0) { pend.phase = 1; pend.t2 = 0; pend.lx = pend.x; au.sfx('tick'); }
      else if (pend.phase === 1) {
        const ty = pend.y, len = 30 + (258 - ty) / 0.78;
        kick(pend.lx, ty, ctx.input.axis().x * 0.8, len);
      }
    });

    // ---------- Ergebnis eines Schusses ----------
    function keeperPose() {
      if (K.mode === 'cheer' || K.mode === 'dive' || K.mode === 'lie') {
        const d = K.h.x - K.x0;
        const kx = K.x0 + d - clamp(d, -42, 42);
        const lift = K.mode === 'cheer' ? Math.abs(Math.sin(time * 9)) * 9 : Math.max(0, (GY - 72 - K.h.y)) * 0.55;
        return { kx, lift, th: clamp(d / 120, -0.9, 0.9) };
      }
      return { kx: K.x, lift: 0, th: Math.sin(time * 3) * 0.04 };
    }

    function resolve() {
      const bx = shot.tx, by = shot.ty;
      const pose = keeperPose();
      let out = 'miss', saved = false, caught = false, pts = 0, ob = null, wood = null, hitT = null;
      ob = obs.find(o => Math.abs(bx - o.x) < o.w / 2 + RG * 0.8 && Math.abs(by - o.y) < o.h / 2 + RG * 0.8);
      if (!ob) {
        if (K.mode === 'dive' && K.h) {
          const d = Math.hypot(Math.max(0, Math.abs(bx - K.h.x) - 9), by - K.h.y);
          if (d < KP.hr) { saved = true; caught = d < KP.hr * 0.55; }
        }
        if (!saved) {
          const cy = GY - pose.lift - 34;
          if (Math.abs(bx - pose.kx) < 19 && Math.abs(by - cy) < 34) saved = true;
        }
      }
      if (!ob && !saved) {
        const nearL = Math.abs(bx - PL) < RG + 1 && by > BAR - RG && by < GY + 4;
        const nearR = Math.abs(bx - PR) < RG + 1 && by > BAR - RG && by < GY + 4;
        const nearB = Math.abs(by - BAR) < RG + 1 && bx > PL - RG && bx < PR + RG;
        if (nearL || nearR || nearB) {
          const inside = (!nearL || bx > PL) && (!nearR || bx < PR) && (!nearB || by > BAR);
          wood = { inside, bar: nearB && !nearL && !nearR };
        }
      }
      const inGoal = bx > PL && bx < PR && by > BAR && by <= GY;
      if (ob) out = 'block';
      else if (saved) out = caught ? 'caught' : 'parry';
      else if (wood) out = wood.inside ? 'postin' : 'postout';
      else if (inGoal) out = 'goal';
      else out = 'miss';

      const scored = out === 'goal' || out === 'postin';
      const labelY = 300;
      let big = '', bigColor = COL.gold;
      if (scored) {
        streak++; goals++; levelGoals++;
        pts = 100 + Math.min(30, (streak - 1) * 10);
        const extras = [];
        if (out === 'postin') { pts += 50; extras.push('Pfosten-Glück +50'); }
        if ((Math.abs(bx - PL) < 42 || Math.abs(bx - PR) < 42) && by < BAR + 42) { pts += 50; extras.push('Winkel! +50'); }
        if (Math.abs(shot.curve) > 0.35) { pts += 30; extras.push('Effet! +30'); }
        for (const t of targets) if (t.alive && Math.hypot(bx - t.x, by - t.y) < t.r + 4) { t.alive = false; hitT = t; pts += t.pts; extras.push(`Zielscheibe +${t.pts}`); spawn(26, t.x, t.y, { colors: [COL.gold, '#fff', COL.red], v1: 220 }); }
        score += pts;
        big = out === 'postin' ? 'KLONK! DRIN!' : (hitT ? 'ZIELSCHEIBE!' : 'TOOOR!');
        pop(`+${pts}`, bx, by - 14, COL.gold, 26, 1.4);
        extras.forEach((s, i) => pop(s, CX, 352 + i * 22, COL.green, 17, 1.5));
        netAge = 0; netX = bx; netY = by; cheer = 1; shakeAmp = 6; flash = 0.35;
        ctx.fx.shake(260); ctx.fx.confetti(hitT || streak >= 3 ? 70 : 36);
        spawn(34, bx, by, { colors: ['#fff', COL.gold, COL.ice], v1: 200 });
        au.noise(0.25, 0.2); au.tone(300, 0.15, 'sine', 0.3, 700);
        crowdCheer(streak >= 3 ? 1.4 : 1);
        au.melody([[72, 0.5], [76, 0.5], [79, 0.5], [84, 1.5]], { bpm: 230, type: 'square', vol: 0.09 });
        if (hitT) au.sfx('power');
        if (out === 'postin') klonk();
        ball = { x: bx, y: by, vx: (bx - CX) * 0.08 + rnd(-15, 15), vy: -12, r: RG, vr: -0.9, g: 280, floor: GY - 10, bounce: 0.35, rot: 0, a: 1 };
        K.mode = K.mode === 'dive' ? 'lie' : 'patrol';
        resultWait = streak >= 3 ? 1.9 : 1.6;
      } else {
        streak = 0;
        if (out === 'block') {
          big = 'EISBLOCK!'; bigColor = COL.ice;
          au.sfx('hit'); au.tone(2200, 0.15, 'triangle', 0.1); au.tone(1700, 0.2, 'triangle', 0.1, null, 0.06); crowdGroan();
          spawn(22, bx, by, { colors: [COL.ice, '#fff'], v1: 180 }); shakeAmp = 4;
          ball = { x: bx, y: by, vx: rnd(-90, 90), vy: -90, r: RG, vr: 8, g: 500, floor: GY + 40, bounce: 0.4, rot: 0, a: 1 };
        } else if (out === 'caught' || out === 'parry') {
          big = out === 'caught' ? 'GEHALTEN!' : 'GEPARRT!'; bigColor = COL.red;
          au.sfx('hit'); crowdGroan(); au.tone(200, 0.2, 'square', 0.15, 120);
          spawn(16, bx, by, { colors: ['#fff', COL.ice], v1: 150 }); shakeAmp = 3; ctx.fx.shake(160);
          if (out === 'caught') ball = { x: bx, y: by, vx: 0, vy: 0, r: RG, vr: 0, g: 0, floor: 999, bounce: 0, rot: 0, a: 1, stuck: true };
          else ball = { x: bx, y: by, vx: (bx > pose.kx ? 1 : -1) * rnd(110, 190), vy: -rnd(60, 130), r: RG, vr: 3, g: 520, floor: GY + 14, bounce: 0.45, rot: 0, a: 1 };
          const wasDive = K.mode === 'dive' && K.h;
          K.mode = 'cheer'; K.cheerT = 0; K.caught = out === 'caught';
          if (!wasDive) { K.x0 = K.x; K.h = { x: K.x, y: GY - 38 }; }
        } else if (out === 'postout') {
          big = 'KLONK!'; bigColor = COL.violet; klonk(); crowdGroan(); shakeAmp = 7; ctx.fx.shake(300); flash = 0.2;
          spawn(18, bx, by, { colors: ['#fff', COL.gold], v1: 200 });
          ball = wood.bar ? { x: bx, y: by, vx: rnd(-40, 40), vy: -140, r: RG, vr: 5, g: 420, floor: GY + 30, bounce: 0.4, rot: 0, a: 1 }
            : { x: bx, y: by, vx: (bx < CX ? -1 : 1) * 130, vy: -40, r: RG, vr: 5, g: 420, floor: GY + 30, bounce: 0.4, rot: 0, a: 1 };
        } else {
          big = by < BAR ? 'DRÜBER!' : 'DANEBEN!'; bigColor = COL.ice;
          au.sfx('bad'); crowdGroan(); au.sfx('swoosh');
          ball = { x: bx, y: by, vx: (bx - CX) * 0.5, vy: -70, r: RG, vr: -2.2, g: 0, floor: 9999, bounce: 0, rot: 0, a: 1 };
        }
        K.mode = K.mode === 'wait' ? 'patrol' : K.mode;
        resultWait = 1.4;
      }
      results[lvl].push(scored ? 'g' : 'm');
      state = 'result'; stateT = 0; shot.done = true;
      setBanner(big, '', bigColor);
      if (shotNo === SHOTS - 1 && levelGoals === SHOTS) {
        score += 100; resultWait += 1.0;
        ctx.timeout(() => { pop('PERFEKTES LEVEL! +100', CX, 400, COL.gold, 20, 1.6); au.sfx('level'); ctx.fx.confetti(50); hud(); }, 650);
      }
      hud();
    }

    function advance() {
      shotNo++;
      if (shotNo >= SHOTS) {
        if (lvl >= LEVELS.length - 1) return endGame();
        startLevel(lvl + 1);
      } else newShot();
    }
    function endGame() {
      if (finished) return; finished = true; state = 'end';
      const stars = score >= STARS[2] ? 3 : score >= STARS[1] ? 2 : score >= STARS[0] ? 1 : 0;
      const next = STARS[stars];
      const text = stars === 3
        ? `Du bist der Elfmeter-König! ${goals} Tore aus ${SHOTS * 5} Schüssen.`
        : `${goals} Tore aus ${SHOTS * 5} Schüssen. Noch ${next - score} Punkte bis zum ${stars + 1}. Stern. Ecken, Zielscheiben, Effet und Torserien bringen extra Punkte!`;
      ctx.finish({ won: stars >= 1, stars, score, text });
    }

    // ---------- Update ----------
    function update(dt) {
      time += dt; stateT += dt;
      cheer = Math.max(0, cheer - dt * 0.45); shakeAmp = Math.max(0, shakeAmp - dt * 14); flash = Math.max(0, flash - dt);
      netAge += dt;
      for (const f of flakes) { f.y += f.v * dt; f.x += Math.sin(time + f.ph) * 10 * dt; if (f.y > H + 4) { f.y = -4; f.x = rnd(0, W); } }
      for (const o of obs) { o.x += o.vx * dt; if (o.x < o.min) { o.x = o.min; o.vx = Math.abs(o.vx); } if (o.x > o.max) { o.x = o.max; o.vx = -Math.abs(o.vx); } }
      for (const t of targets) if (t.wob !== undefined) { t.x = t.bx + Math.sin(time * 1.6 + t.wob) * 16; t.y = t.by + Math.cos(time * 1.3 + t.wob) * 6; }

      // Torwart
      K.ph = K.ph || 0;
      if (K.mode === 'patrol' || K.mode === 'wait') K.x = CX + Math.sin(time * KP.spd) * KP.amp;
      if (K.mode === 'wait') {
        K.delayT -= dt;
        if (K.delayT <= 0) { K.mode = 'dive'; K.x0 = K.x; K.h = { x: K.x, y: GY - 38 }; au.sfx('swoosh'); spawn(6, K.x, GY, { colors: ['#fff'], v1: 80, up: true }); }
      }
      if (K.mode === 'dive' && K.des) {
        const dx = clamp(K.des.x, K.x0 - KP.reach, K.x0 + KP.reach), dy = clamp(K.des.y, BAR + 6, GY - 4);
        const f = 1 - Math.exp(-KP.rate * dt);
        K.h.x += (dx - K.h.x) * f; K.h.y += (dy - K.h.y) * f;
      }
      if (K.mode === 'cheer') K.cheerT += dt;

      // Spielphasen
      if (state === 'intro' && stateT > 1.9) newShot();
      if (state === 'aim' && !touch && !drag) {
        if (pend.phase === 0) { pend.t += dt * (2.2 + 0.25 * lvl); pend.x = CX + Math.sin(pend.t) * 140; }
        else { pend.t2 += dt * (3.2 + 0.3 * lvl); pend.y = 198 + Math.sin(pend.t2) * 52; }
      }
      if (state === 'flight') {
        shot.t += dt / shot.T; shot.rot += dt * (8 + shot.pw * 10);
        const b = ballAt(Math.min(1, shot.t));
        trail.push({ x: b.x, y: b.y, r: b.r }); if (trail.length > 9) trail.shift();
        if (shot.t >= 1) resolve();
      }
      if (state === 'result') {
        if (stateT > resultWait) advance();
      }
      // freier Ball nach dem Torabschluss
      if (ball) {
        if (ball.stuck && K.h) { ball.x = K.h.x; ball.y = K.h.y + 2; }
        else {
          ball.vy += ball.g * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.r = clamp(ball.r + ball.vr * dt, 3, 26); ball.rot += ball.vx * dt * 0.1;
          if (ball.y > ball.floor && ball.vy > 0) { ball.y = ball.floor; ball.vy *= -ball.bounce; ball.vx *= 0.7; if (Math.abs(ball.vy) < 25) ball.vy = 0; else au.tone(160, 0.05, 'sine', 0.1, 90); }
          if (ball.g === 0 && (ball.y < -30 || ball.y > H + 30 || ball.x < -30 || ball.x > W + 30)) ball.a = 0;
          if (ball.g === 0) ball.a = Math.max(0, ball.a - dt * 0.7);
        }
      }
      parts = parts.filter(p => (p.life -= dt) > 0);
      for (const p of parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      pops = pops.filter(p => (p.life -= dt) > 0);
      for (const p of pops) p.y -= 18 * dt;
      if (banner) banner.t += dt;
    }

    function ballAt(t) {
      const z = 1 + (ZE - 1) * t, u = (1 - 1 / z) / (1 - 1 / ZE);
      return {
        x: BX + (shot.tx - BX) * u + shot.curve * 58 * Math.sin(Math.PI * u),
        y: BY + (shot.ty - BY) * u - shot.arc * Math.sin(Math.PI * u), r: R0 / z, u,
      };
    }

    // ---------- Zeichnen ----------
    function drawBall(x, y, r, rot = 0, a = 1) {
      if (a <= 0) return;
      g.save(); g.translate(x, y); g.globalAlpha = a;
      g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fillStyle = '#fff'; g.fill();
      g.save(); g.clip(); g.rotate(rot); g.fillStyle = '#1a2040';
      g.beginPath(); for (let k = 0; k < 5; k++) { const an = k * 1.2566 - 1.5708; g.lineTo(Math.cos(an) * r * 0.38, Math.sin(an) * r * 0.38); } g.fill();
      for (let k = 0; k < 5; k++) { const an = k * 1.2566 - 0.9425; g.beginPath(); g.arc(Math.cos(an) * r * 0.95, Math.sin(an) * r * 0.95, r * 0.3, 0, 6.283); g.fill(); }
      g.restore();
      g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.strokeStyle = 'rgba(40,60,110,.6)'; g.lineWidth = Math.max(1, r * 0.07); g.stroke();
      g.beginPath(); g.arc(-r * 0.3, -r * 0.35, r * 0.28, 3.4, 4.9); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(1, r * 0.1); g.stroke();
      g.restore();
    }
    const shadow = (x, y, r, a = 0.3) => { g.fillStyle = `rgba(0,0,0,${a})`; g.beginPath(); g.ellipse(x, y, r * 1.1, r * 0.35, 0, 0, 6.283); g.fill(); };

    function drawBackground() {
      // Himmel + Tribüne
      const sky = g.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, '#070d28'); sky.addColorStop(1, '#1a2563');
      g.fillStyle = sky; g.fillRect(0, 0, W, 200);
      for (const c of crowd) {
        const bounce = cheer > 0.05 ? -Math.abs(Math.sin(time * 8 + c.ph)) * cheer * 6 : Math.sin(time * 2 + c.ph) * 0.6;
        const x = c.x, y = c.y + bounce;
        g.fillStyle = c.sh; g.beginPath(); g.ellipse(x, y + 11, 8, 7, 0, 0, 6.283); g.fill();
        g.fillStyle = c.sk; g.beginPath(); g.arc(x, y, 5.5, 0, 6.283); g.fill();
        if (c.hat) { g.fillStyle = COL.red; g.fillRect(x - 5.5, y - 7, 11, 4); g.fillStyle = '#fff'; g.fillRect(x - 5.5, y - 4, 11, 1.5); }
        if (cheer > 0.25) { g.strokeStyle = c.sk; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 7, y + 8); g.lineTo(x - 9, y - 6 - Math.sin(time * 12 + c.ph) * 2); g.moveTo(x + 7, y + 8); g.lineTo(x + 9, y - 6 + Math.sin(time * 12 + c.ph) * 2); g.stroke(); }
      }
      g.fillStyle = 'rgba(6,10,40,.38)'; g.fillRect(0, 0, W, 190);
      // Flutlicht
      for (const fx of [24, W - 24]) {
        const gr = g.createRadialGradient(fx, 6, 2, fx, 6, 120); gr.addColorStop(0, 'rgba(255,248,210,.55)'); gr.addColorStop(1, 'rgba(255,248,210,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, 190);
      }
      // Bande
      for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? COL.red : '#f3f6ff'; g.fillRect(i * 44 - 4, 190, 44, 24); }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 210, W, 4);
      g.fillStyle = '#0b1437'; g.font = 'bold 11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < 9; i += 2) g.fillText('ELFMETER-KÖNIG', i * 44 + 18, 203);
      // Rasen mit Streifen in Perspektive
      const N = 9;
      for (let i = 0; i < N; i++) {
        const y0 = 214 + (H - 214) * Math.pow(i / N, 1.6), y1 = 214 + (H - 214) * Math.pow((i + 1) / N, 1.6);
        g.fillStyle = i % 2 ? '#0f6b43' : '#0c5c3a'; g.fillRect(0, y0, W, y1 - y0 + 1);
      }
      const vig = g.createLinearGradient(0, 214, 0, H); vig.addColorStop(0, 'rgba(0,0,0,.3)'); vig.addColorStop(0.5, 'rgba(0,0,0,0)'); g.fillStyle = vig; g.fillRect(0, 214, W, H - 214);
      g.fillStyle = 'rgba(235,245,255,.55)';
      for (const s of snowSpots) { g.beginPath(); g.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, 6.283); g.fill(); }
      // Linien
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(0, GY); g.lineTo(W, GY); g.stroke();
      g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(96, GY); g.lineTo(80, 298); g.lineTo(280, 298); g.lineTo(264, GY); g.stroke();
      g.beginPath(); g.moveTo(30, GY); g.lineTo(-10, 420); g.lineTo(370, 420); g.lineTo(330, GY); g.stroke();
      g.beginPath(); g.ellipse(CX, 420, 66, 20, 0, 0, Math.PI); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(CX, BY + 16, 5, 2, 0, 0, 6.283); g.fill();
    }

    function disp(x, y) {
      if (netAge > 1.8) return [0, 0];
      const d = Math.hypot(x - netX, y - netY), amp = 10 * Math.exp(-netAge * 2.4) * Math.exp(-d / 150), ph = Math.sin(netAge * 26 - d / 9);
      return [amp * ph * 0.6 * (x - netX) / (d + 25), amp * ph * 0.9];
    }
    function drawNet() {
      const bx0 = PL + 16, bx1 = PR - 16, by0 = BAR + 10, by1 = GY - 14;
      g.fillStyle = 'rgba(4,8,30,.55)'; g.fillRect(PL, BAR, PR - PL, GY - BAR);
      g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.3)';
      const C = 14, R = 6, S = 5;
      g.beginPath();
      for (let i = 0; i <= C; i++) {
        for (let j = 0; j <= S; j++) { const x = bx0 + (bx1 - bx0) * i / C, y = by0 + (by1 - by0) * j / S, [dx, dy] = disp(x, y); j ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy); }
      }
      for (let j = 0; j <= R; j++) {
        for (let i = 0; i <= C * 2; i++) { const x = bx0 + (bx1 - bx0) * i / (C * 2), y = by0 + (by1 - by0) * j / R, [dx, dy] = disp(x, y); i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy); }
      }
      g.stroke();
      // Seiten- und Dachnetz
      g.strokeStyle = 'rgba(255,255,255,.2)'; g.beginPath();
      for (let k = 0; k <= 6; k++) {
        const f = k / 6;
        g.moveTo(PL + (PR - PL) * f, BAR); g.lineTo(bx0 + (bx1 - bx0) * f, by0);
        const yy = BAR + (GY - BAR) * f, yb = by0 + (by1 - by0) * f;
        g.moveTo(PL, yy); g.lineTo(bx0, yb); g.moveTo(PR, yy); g.lineTo(bx1, yb);
      }
      g.stroke();
    }
    function drawFrame() {
      g.strokeStyle = '#f5f8ff'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(PL, GY); g.lineTo(PL, BAR); g.lineTo(PR, BAR); g.lineTo(PR, GY); g.stroke();
      g.strokeStyle = 'rgba(120,150,210,.6)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(PL + 2, GY); g.lineTo(PL + 2, BAR + 2); g.lineTo(PR - 2, BAR + 2); g.lineTo(PR - 2, GY); g.stroke();
      g.lineCap = 'butt';
    }
    function drawTargets() {
      for (const t of targets) {
        if (!t.alive) continue;
        const p = 1 + Math.sin(time * 5 + t.x) * 0.06;
        g.save(); g.translate(t.x, t.y); g.scale(p, p);
        g.shadowColor = COL.gold; g.shadowBlur = 10;
        [[t.r, COL.red], [t.r * 0.72, '#fff'], [t.r * 0.46, COL.red], [t.r * 0.22, COL.gold]].forEach(([r, c]) => { g.fillStyle = c; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill(); });
        g.shadowBlur = 0; g.restore();
      }
    }
    function drawObs() {
      for (const o of obs) {
        g.save(); g.translate(o.x, o.y + Math.sin(time * 3 + o.x * 0.05) * 2);
        const gr = g.createLinearGradient(0, -o.h / 2, 0, o.h / 2); gr.addColorStop(0, '#d9f3ff'); gr.addColorStop(1, '#7cc4e8');
        g.fillStyle = gr; g.strokeStyle = '#fff'; g.lineWidth = 2; g.shadowColor = COL.ice; g.shadowBlur = 10;
        g.beginPath(); g.roundRect(-o.w / 2, -o.h / 2, o.w, o.h, 6); g.fill(); g.stroke(); g.shadowBlur = 0;
        g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-o.w / 2 + 8, -o.h / 2 + 5); g.lineTo(-o.w / 2 + 18, -o.h / 2 + 5); g.moveTo(-o.w / 2 + 8, -o.h / 2 + 5); g.lineTo(-o.w / 2 + 8, o.h / 2 - 6); g.stroke();
        g.restore();
      }
    }
    function drawKeeper() {
      const pose = keeperPose();
      shadow(pose.kx, GY + 2, 24, 0.3);
      g.save(); g.translate(pose.kx, GY - pose.lift); g.rotate(pose.th);
      // Hände (lokal)
      let hands;
      if (K.mode === 'cheer') hands = K.caught && K.h ? [[-9, 0], [9, 0]].map(([ox]) => rotInv(K.h.x + ox, K.h.y, pose)) : [[-18, -70], [18, -70]];
      else if (K.mode === 'dive' || K.mode === 'lie') hands = [-10, 10].map(ox => rotInv(K.h.x + ox, K.h.y, pose));
      else hands = [[-26, -34 + Math.sin(time * 4) * 3], [26, -34 + Math.sin(time * 4 + 1) * 3]];
      // Körper
      const body = (cx, cy, r) => { const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#bcd3ea'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fill(); };
      // Arme hinter dem Körper
      g.strokeStyle = '#6b4a2b'; g.lineWidth = 3; g.lineCap = 'round';
      hands.forEach((hd, i) => {
        const sx = i ? 11 : -11, sy = -46; let hx = hd[0], hy = hd[1];
        const dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy); if (L > 58) { hx = sx + dx / L * 58; hy = sy + dy / L * 58; hd = [hx, hy]; hands[i] = hd; }
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(hx, hy); g.stroke();
      });
      body(0, -17, 17); body(0, -42, 13); body(0, -60, 10);
      // Schal
      g.fillStyle = COL.red; g.fillRect(-10, -53, 20, 5); g.fillRect(4, -50, 5, 12);
      // Hut
      g.fillStyle = '#1b1b2b'; g.fillRect(-11, -69, 22, 3); g.fillRect(-7, -80, 14, 12); g.fillStyle = COL.red; g.fillRect(-7, -72, 14, 3);
      // Gesicht
      const sad = K.mode === 'lie' || (K.mode === 'patrol' && !K.caught && results[lvl].length && results[lvl][results[lvl].length - 1] === 'g' && state === 'result');
      g.fillStyle = '#111'; g.beginPath(); g.arc(-3.6, -62, 1.7, 0, 6.283); g.arc(3.6, -62, 1.7, 0, 6.283); g.fill();
      g.fillStyle = '#ff8a3d'; g.beginPath(); g.moveTo(-1.8, -59); g.lineTo(1.8, -59); g.lineTo(0, -53.5); g.fill();
      g.strokeStyle = '#111'; g.lineWidth = 1.2; g.beginPath(); if (sad) g.arc(0, -52.6, 3, 3.6, 5.8); else g.arc(0, -56.6, 3.2, 0.3, 2.85); g.stroke();
      g.fillStyle = '#222'; for (const y of [-46, -39]) { g.beginPath(); g.arc(0, y, 1.5, 0, 6.283); g.fill(); }
      // Handschuhe
      hands.forEach(([hx, hy]) => {
        g.fillStyle = COL.red; g.strokeStyle = '#fff'; g.lineWidth = 2;
        g.beginPath(); g.arc(hx, hy, 6.5, 0, 6.283); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(hx, hy - 1, 2, 0, 6.283); g.fill();
      });
      g.restore();
      g.lineCap = 'butt';
    }
    function rotInv(wx, wy, pose) {
      const dx = wx - pose.kx, dy = wy - (GY - pose.lift), c = Math.cos(pose.th), s = Math.sin(pose.th);
      return [dx * c + dy * s, -dx * s + dy * c];
    }

    function drawAimUI() {
      if (state !== 'aim') return;
      let ax = null, ay = null, curve = 0, ok = true;
      if (drag) {
        const a = aimFromDrag();
        if (a.len > 12) { ax = clamp(a.tx, 6, W - 6); ay = a.ty; curve = a.curve; ok = a.ok; }
        // Finger-Spur
        g.strokeStyle = 'rgba(255,209,102,.5)'; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
        drag.pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke(); g.lineCap = 'butt';
      } else if (!touch) {
        ax = pend.phase === 0 ? pend.x : pend.lx; ay = pend.phase === 0 ? 200 : pend.y;
        // Führungslinie
        g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2; g.setLineDash([5, 6]); g.beginPath();
        if (pend.phase === 0) { g.moveTo(ax, BAR - 10); g.lineTo(ax, GY); } else { g.moveTo(PL - 10, ay); g.lineTo(PR + 10, ay); g.moveTo(ax, BAR - 10); g.lineTo(ax, GY); }
        g.stroke(); g.setLineDash([]);
        curve = ctx.input.axis().x * 0.8;
      }
      if (ax !== null) {
        const inside = ax > PL && ax < PR && ay > BAR && ay < GY;
        const c = !ok ? COL.red : inside ? COL.green : COL.gold, pu = 1 + Math.sin(time * 9) * 0.08;
        // gestrichelte Flugbahn
        if (ok) for (let k = 1; k < 14; k++) {
          const u = k / 14, x = BX + (ax - BX) * u + curve * 58 * Math.sin(Math.PI * u), y = BY + (ay - BY) * u - (16 + (258 - ay) * 0.16) * Math.sin(Math.PI * u);
          g.fillStyle = `rgba(255,255,255,${0.15 + 0.5 * u})`; g.beginPath(); g.arc(x, y, 3 - u * 1.6, 0, 6.283); g.fill();
        }
        g.save(); g.translate(ax, ay); g.scale(pu, pu); g.strokeStyle = c; g.lineWidth = 3; g.shadowColor = c; g.shadowBlur = 10;
        g.beginPath(); g.arc(0, 0, 13, 0, 6.283); g.moveTo(-20, 0); g.lineTo(-7, 0); g.moveTo(20, 0); g.lineTo(7, 0); g.moveTo(0, -20); g.lineTo(0, -7); g.moveTo(0, 20); g.lineTo(0, 7); g.stroke();
        g.restore();
        if (Math.abs(curve) > 0.35 && ok) { g.fillStyle = COL.violet; g.font = 'bold 14px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('Effet!', ax, ay - 26); }
      }
      // Hinweis
      const early = lvl === 0 && shotNo < 2 && !drag;
      if (early || (!drag && !touch && shotNo < 1)) {
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 15px system-ui, sans-serif';
        const txt = touch ? 'Zieh vom Ball nach oben zum Tor!' : (pend.phase === 0 ? 'Leertaste stoppt die Richtung' : 'Leertaste: Höhe stoppen = Schuss!');
        g.fillStyle = 'rgba(0,0,0,.55)'; const tw = g.measureText(txt).width + 24; g.beginPath(); g.roundRect(CX - tw / 2, 360, tw, 28, 14); g.fill();
        g.fillStyle = COL.gold; g.fillText(txt, CX, 374);
        if (touch || early) { // wandernder Finger-Punkt
          const f = (time * 0.9) % 1;
          g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(BX + Math.sin(f * 3) * 6 + f * 40, BY - 20 - f * 120, 10 - f * 3, 0, 6.283); g.fill();
        }
      }
    }

    function drawBanner() {
      if (!banner) return;
      const b = banner;
      if (state === 'intro') {
        if (b.t > 1.6) return;
        const sc = 1 + Math.max(0, 0.6 - b.t * 3), a = b.t > 1.4 ? (1.6 - b.t) / 0.2 : 1;
        g.save(); g.globalAlpha = clamp(a, 0, 1); g.fillStyle = 'rgba(5,10,40,.78)'; g.fillRect(0, 230, W, 140);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.translate(CX, 275); g.scale(sc, sc);
        g.font = '900 42px system-ui, sans-serif'; g.fillStyle = b.color; g.fillText(b.text, 0, 0); g.restore();
        g.save(); g.globalAlpha = clamp(a, 0, 1); g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = 'bold 18px system-ui, sans-serif'; g.fillText(b.sub.split(':')[0], CX, 316);
        g.font = '14px system-ui, sans-serif'; g.fillStyle = COL.ice; wrap(b.sub.split(': ')[1] || '', CX, 340, 300, 18); g.restore();
        return;
      }
      if (state === 'result' && b.t < resultWait - 0.2) {
        const sc = 1 + Math.max(0, 0.7 - b.t * 3.5), wob = b.t < 0.4 ? Math.sin(b.t * 40) * 0.04 : 0;
        g.save(); g.translate(CX, 318); g.scale(sc, sc); g.rotate(wob - 0.04);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 44px system-ui, sans-serif'; g.lineJoin = 'round';
        g.strokeStyle = '#0b1437'; g.lineWidth = 9; g.strokeText(b.text, 0, 0); g.fillStyle = b.color; g.fillText(b.text, 0, 0); g.restore();
      }
    }
    function wrap(text, x, y, maxW, lh) {
      const words = text.split(' '); let line = '';
      for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t; }
      g.fillText(line, x, y);
    }

    function drawShotDots() {
      for (let i = 0; i < SHOTS; i++) {
        const x = CX + (i - 2) * 28, y = 538, r = results[lvl][i];
        g.beginPath(); g.arc(x, y, 9, 0, 6.283);
        if (r === 'g') { g.fillStyle = COL.green; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x - 1, y + 3.5); g.lineTo(x + 5, y - 4); g.stroke(); }
        else if (r === 'm') { g.fillStyle = COL.red; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y + 4); g.moveTo(x + 4, y - 4); g.lineTo(x - 4, y + 4); g.stroke(); }
        else { g.fillStyle = 'rgba(255,255,255,.12)'; g.fill(); g.strokeStyle = i === shotNo && state !== 'intro' ? COL.gold : 'rgba(255,255,255,.4)'; g.lineWidth = i === shotNo ? 2.5 : 1.5; g.stroke(); }
      }
    }

    function draw() {
      g.save();
      if (shakeAmp > 0.1) g.translate(rnd(-shakeAmp, shakeAmp), rnd(-shakeAmp, shakeAmp));
      drawBackground(); drawNet(); drawTargets(); drawKeeper(); drawObs(); drawFrame();

      // Ball
      if (state === 'aim' || state === 'intro') {
        const sq = 1 + Math.sin(time * 3) * 0.015; shadow(BX, BY + 17, R0, 0.35);
        drawBall(BX, BY, R0 * sq, drag ? time * 6 : 0.3);
      } else if (state === 'flight' && shot) {
        const b = ballAt(Math.min(1, shot.t));
        const gy = BY + 17 + (GY - (BY + 17)) * b.u, gx = BX + (shot.tx - BX) * b.u + shot.curve * 58 * Math.sin(Math.PI * b.u);
        shadow(gx, gy, b.r, 0.3);
        trail.forEach((p, i) => { g.globalAlpha = (i / trail.length) * (shot.pw > 0.75 ? 0.4 : 0.22); g.fillStyle = shot.pw > 0.75 ? COL.gold : COL.ice; g.beginPath(); g.arc(p.x, p.y, p.r * (0.5 + 0.5 * i / trail.length), 0, 6.283); g.fill(); });
        g.globalAlpha = 1; drawBall(b.x, b.y, b.r, shot.rot);
      } else if (ball) {
        if (ball.floor < 900 && ball.g > 0) shadow(ball.x, Math.min(ball.floor + 4, ball.y + 10), ball.r, 0.25);
        drawBall(ball.x, ball.y, ball.r, ball.rot, ball.a);
      }
      // Teilchen
      for (const p of parts) { g.globalAlpha = clamp(p.life * 2, 0, 1); g.fillStyle = p.c; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
      g.globalAlpha = 1;
      drawAimUI();
      // Schnee
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (const f of flakes) { g.beginPath(); g.arc(f.x, f.y, f.s, 0, 6.283); g.fill(); }
      for (const p of pops) {
        g.globalAlpha = clamp(p.life / (p.max * 0.4), 0, 1); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${p.size}px system-ui, sans-serif`;
        g.lineWidth = 4; g.strokeStyle = '#0b1437'; g.lineJoin = 'round'; g.strokeText(p.text, p.x, p.y); g.fillStyle = p.color; g.fillText(p.text, p.x, p.y);
      }
      g.globalAlpha = 1;
      drawBanner(); drawShotDots();
      if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * 0.6})`; g.fillRect(0, 0, W, H); }
      g.restore();
    }

    startLevel(0);
    ctx.loop(dt => { update(dt); draw(); });
    return { destroy() { } };
  },
};
