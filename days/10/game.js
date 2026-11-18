// Türchen 10: Mauerbrecher – Schneeball, Schlitten und Geschenke-Mauern
export const howto = 'Ziehe den Schlitten mit Finger, Maus oder den Pfeiltasten. Tippen oder Leertaste startet den Schneeball. Räume alle Geschenke, Lebkuchen und Eisblöcke ab und fang die Extras!';

const W = 360, H = 560, COLS = 9, BW = 36, BH = 18, TOP = 70, WALL_TOP = 6;
const PY = 512, PH = 14, R = 6.5, LOSS_Y = PY + PH + 16;
const MAX_LEVEL = 6;

// Legende: R Y G V B W O = Geschenke (1 Treffer), L Lebkuchen (1), K Kohle (1), I Eis (2 Treffer), S Stahl-Glocke (unzerstörbar)
const LEVELS = [
  { name: 'Tannenbaum', rows: [
    '....Y....', '...GGG...', '..GGRGG..', '...GGG...', '..GGGYG..', '.GGGGGGG.', 'GGRGGGGGG', '....L....', '....L....'] },
  { name: 'Stern', rows: [
    'S...Y...S', '....Y....', '...YIY...', 'BBYYIYYBB', '.BYYIYYB.', '..YYYYY..', '...YIY...', '..YY.YY..', '.YY...YY.'] },
  { name: 'Geschenk', rows: [
    '..VV.VV..', '...VYV...', 'RRRRYRRRR', 'RRRRYRRRR', 'IIIIYIIII', 'RRRRYRRRR', 'RRRRYRRRR', 'S.......S'] },
  { name: 'Schneemann', rows: [
    '...LLL...', '....L....', '..WWWWW..', '..WKWKW..', '..WWOWW..', '..RRRRR..', '.WWWKWWW.', '.WWWWWWW.', '.WWWKWWW.', '..WWWWW..', 'S.......S'] },
  { name: 'Herz', rows: [
    'SRR...RRS', 'RRRR.RRRR', 'RRRRRRRRR', 'RRYRRRRRR', 'IRRRRRRRI', '.IRRRRRI.', '..IRRRI..', '...IRI...', '....I....'] },
  { name: 'Burg', rows: [
    'L.L.L.L.L', 'LLLLLLLLL', 'LIIIIIIIL', 'LIBBBBBIL', 'LIBSSSBIL', 'LIBBBBBIL', 'LLLLLLLLL', 'LLLL.LLLL'] },
];

const GIFT = { R: '#ef476f', Y: '#ffd166', G: '#06d6a0', V: '#c77dff', B: '#4895ef', W: '#eef3ff', O: '#ff9e4a' };
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
const PU = {
  wide:   { c: '#4895ef', label: 'Breiter Schlitten!', t: 12 },
  multi:  { c: '#c77dff', label: 'Dreifach-Schneeball!' },
  fire:   { c: '#ff7b2e', label: 'Feuerball!', t: 8 },
  glue:   { c: '#06d6a0', label: 'Kleber-Schlitten!', t: 14 },
  slow:   { c: '#8ecae6', label: 'Langsamer Ball', t: 9 },
  life:   { c: '#ef476f', label: 'Extra-Leben!' },
  narrow: { c: '#3a2a4a', label: 'Uff! Schmaler Schlitten', t: 8, bad: true },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

export default {
  create(ctx) {
    const { canvas, g } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none';

    let mode = 'menu';            // menu | play | between | over
    let lvl = 1, lives = 3, score = 0, cleared = 0;
    let bricks = [], remain = 0, balls = [], drops = [], parts = [], texts = [];
    let px = W / 2, tx = W / 2, pw = 68, pwT = 68, padPulse = 0;
    let wideT = 0, narrowT = 0, fireT = 0, glueT = 0, slowT = 0;
    let combo = 0, hitCount = 0, shakeV = 0, time = 0, lvlTime = 0, bannerT = 0, bannerTxt = '', hudKey = '';
    let hover = -1, ptr = null, finished = false;
    const resume = clamp(ctx.load('level', 1) | 0, 1, MAX_LEVEL);

    const stars = Array.from({ length: 46 }, () => ({ x: rnd(0, W), y: rnd(0, 330), r: rnd(0.5, 1.4), p: rnd(0, 6.3) }));
    const flakes = Array.from({ length: 34 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(1, 2.6), v: rnd(14, 38), p: rnd(0, 6.3) }));
    const trees = Array.from({ length: 9 }, (_, i) => ({ x: 20 + i * 42 + rnd(-8, 8), s: rnd(0.8, 1.3) }));

    // ---------- Hilfen ----------
    const note = c => 392 * Math.pow(2, SCALE[Math.min(c, SCALE.length - 1)] / 12);
    const tone = (...a) => ctx.audio.tone(...a);
    const shake = v => { shakeV = Math.max(shakeV, v); };
    function rr(x, y, w, h, r) {
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    function setHud() {
      const key = `${lvl}|${lives}|${score}`;
      if (key === hudKey) return; hudKey = key;
      ctx.hud.set({ Level: lvl, '♥': lives, Punkte: score });
    }
    function burst(x, y, color, n = 8, sp = 150) {
      for (let i = 0; i < n && parts.length < 420; i++) {
        const a = rnd(0, 6.283), v = rnd(30, sp);
        parts.push({ k: 'sq', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 70, life: rnd(0.45, 0.9), max: 0.9, c: color, s: rnd(2, 4.5), gr: 520, rot: rnd(0, 6), vr: rnd(-9, 9) });
      }
    }
    const puff = (x, y, n = 3) => { for (let i = 0; i < n; i++) parts.push({ k: 'puff', x: x + rnd(-6, 6), y: y + rnd(-4, 4), vx: rnd(-25, 25), vy: rnd(-35, -5), life: 0.55, max: 0.55, c: '#fff', s: rnd(4, 8), gr: 0 }); };
    const popup = (x, y, txt, c = '#ffd166') => texts.push({ x, y, txt, c, life: 0.9 });

    // ---------- Level ----------
    function loadLevel(n) {
      lvl = n; mode = 'play'; lvlTime = 0; combo = 0; hitCount = Math.floor(hitCount * 0.4);
      const def = LEVELS[n - 1];
      bricks = []; drops = []; balls = []; texts = [];
      def.rows.forEach((row, r) => {
        for (let c = 0; c < COLS; c++) {
          const ch = row[c] || '.'; if (ch === '.') continue;
          bricks.push({ x: (W - COLS * BW) / 2 + c * BW, y: TOP + r * BH, w: BW, h: BH, k: ch, hp: ch === 'I' ? 2 : 1, flash: 0, wob: 0, dead: false, t0: r * 0.06 + c * 0.015, drop: null });
        }
      });
      const soft = bricks.filter(b => b.k !== 'S');
      remain = soft.length;
      const picks = soft.slice().sort(() => Math.random() - 0.5).slice(0, soft.length > 52 ? 3 : 2);
      picks.forEach((b, i) => { b.drop = (i === 0 && (n === 3 || n === 5)) ? 'life' : randomDrop(false); });
      wideT = narrowT = fireT = glueT = slowT = 0;
      newBall();
      bannerTxt = `Level ${n}: ${def.name}`; bannerT = 2.4;
      ctx.save('level', n);
      setHud();
    }
    function startRun(n) {
      lives = 3; score = 0; hitCount = 0; cleared = n - 1; finished = false;
      loadLevel(n); ctx.audio.sfx('swoosh');
    }
    function newBall() {
      balls = [{ x: px, y: PY - R - 1, vx: 0, vy: 0, stuck: true, off: 0, relT: 0, grace: 0.2, trail: [] }];
    }
    function randomDrop(allowBad = true) {
      const pool = [['wide', 22], ['multi', 20], ['fire', 12], ['glue', 14], ['slow', 14], ['life', 4]];
      if (allowBad) pool.push(['narrow', 13]);
      let s = pool.reduce((a, p) => a + p[1], 0) * Math.random();
      for (const [t, wgt] of pool) { if ((s -= wgt) <= 0) return t; }
      return 'wide';
    }
    const targetSpeed = () => (265 + (lvl - 1) * 13 + Math.min(85, hitCount * 0.9)) * (slowT > 0 ? 0.72 : 1);

    function fix(b, s) {
      const a = Math.hypot(b.vx, b.vy) || 1;
      let vx = b.vx / a, vy = b.vy / a;
      if (Math.abs(vy) < 0.34) { vy = (vy < 0 || vy === 0 ? -1 : 1) * 0.34; vx = (vx < 0 ? -1 : 1) * Math.sqrt(1 - vy * vy); }
      if (Math.abs(vx) < 0.1) { vx = (Math.random() < 0.5 ? -1 : 1) * 0.1; vy = (vy < 0 ? -1 : 1) * Math.sqrt(1 - 0.01); }
      b.vx = vx * s; b.vy = vy * s;
    }
    function release(b) {
      if (!b.stuck) return;
      const t = clamp(b.off / (pw / 2), -1, 1);
      const ang = clamp(t * 0.9 + rnd(-0.12, 0.12), -1, 1);
      const s = targetSpeed();
      b.vx = Math.sin(ang) * s; b.vy = -Math.cos(ang) * s; b.stuck = false;
      fix(b, s); ctx.audio.sfx('swoosh');
    }
    function launch() {
      if (mode !== 'play') return;
      let any = false;
      for (const b of balls) if (b.stuck && b.grace <= 0) { release(b); any = true; }
      if (any) bannerT = Math.min(bannerT, 0.6);
    }

    // ---------- Power-ups ----------
    function spawnDrop(type, x, y) { drops.push({ type, x, y, vy: 95, ph: rnd(0, 6) }); }
    function applyPower(type) {
      const p = PU[type];
      if (type === 'wide') { wideT = p.t; narrowT = 0; }
      else if (type === 'narrow') { narrowT = p.t; wideT = 0; }
      else if (type === 'fire') fireT = p.t;
      else if (type === 'glue') glueT = p.t;
      else if (type === 'slow') slowT = p.t;
      else if (type === 'life') { lives = Math.min(5, lives + 1); setHud(); }
      else if (type === 'multi') {
        const src = balls.slice();
        for (const b of src) {
          if (b.stuck) release(b);
          for (const da of [-0.5, 0.5]) {
            if (balls.length >= 6) break;
            const a = Math.atan2(b.vy, b.vx) + da, s = Math.hypot(b.vx, b.vy);
            const nb = { x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, stuck: false, off: 0, relT: 0, grace: 0, trail: [] };
            fix(nb, s); balls.push(nb);
          }
        }
      }
      ctx.audio.sfx(p.bad ? 'bad' : 'power');
      ctx.toast(p.label, 1100);
      burst(px, PY, p.bad ? '#ef476f' : p.c, 16, 190);
      popup(px, PY - 26, p.label, p.bad ? '#ff8fa8' : '#fff');
    }

    // ---------- Steine ----------
    function breakBrick(k, b) {
      k.dead = true; remain--; combo++; hitCount++;
      const base = k.k === 'I' ? 20 : k.k === 'L' || k.k === 'K' ? 12 : 10;
      const pts = base * (1 + Math.min(4, Math.floor(combo / 4)));
      score += pts; setHud();
      const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
      const col = k.k === 'I' ? '#bfe6f7' : k.k === 'L' ? '#b8692e' : k.k === 'K' ? '#5b6190' : GIFT[k.k];
      burst(cx, cy, col, 11); if (k.k !== 'K') burst(cx, cy, '#fff', 3, 110);
      puff(cx, cy, 3);
      if (combo >= 4) popup(cx, cy - 6, `+${pts}`);
      if (k.k === 'I') { tone(2100, 0.07, 'square', 0.07, 1400); }
      tone(note(combo), 0.13, 'triangle', 0.2);
      tone(note(combo) * 2, 0.07, 'sine', 0.06, null, 0.02);
      shake(1.1);
      if (k.drop) spawnDrop(k.drop, cx, cy);
      else if (Math.random() < 0.1) spawnDrop(randomDrop(true), cx, cy);
      if (remain <= 0) levelClear();
    }
    function hitBrick(k, b) {
      if (k.k === 'S') {
        k.wob = 0.5; k.flash = 0.2; shake(2);
        tone(1047, 0.6, 'sine', 0.17); tone(1568, 0.45, 'sine', 0.08, null, 0.01); tone(2093, 0.3, 'sine', 0.05, null, 0.02);
        burst(b.x, b.y, '#dfe6f7', 4, 90);
        return true;
      }
      if (k.k === 'I' && k.hp > 1 && fireT <= 0) {
        k.hp--; k.flash = 0.2; score += 5; setHud();
        tone(1500, 0.07, 'square', 0.09, 900); tone(700, 0.08, 'triangle', 0.1, 400, 0.02);
        burst(k.x + k.w / 2, k.y + k.h / 2, '#e8f7ff', 6, 110);
        shake(1.4);
        return true;
      }
      breakBrick(k, b);
      return fireT <= 0;
    }
    function levelClear() {
      mode = 'between';
      balls = []; drops = [];
      cleared = Math.max(cleared, lvl);
      const bonus = lives * 50; score += 100 + bonus; setHud();
      ctx.audio.sfx('level'); shake(3);
      ctx.fx.confetti(40);
      bannerTxt = lvl >= MAX_LEVEL ? 'Alles geschafft!' : 'Level geschafft!'; bannerT = 1.8;
      popup(W / 2, 300, `+${100 + bonus}`, '#ffd166');
      if (lvl >= MAX_LEVEL) { ctx.save('level', 1); ctx.timeout(() => end(true), 1700); }
      else ctx.timeout(() => loadLevel(lvl + 1), 1800);
    }
    function loseLife() {
      lives--; setHud(); combo = 0; hitCount = Math.floor(hitCount * 0.5);
      drops = []; wideT = narrowT = fireT = glueT = slowT = 0;
      shake(7); ctx.fx.shake();
      tone(330, 0.45, 'sawtooth', 0.16, 110);
      if (lives <= 0) { mode = 'over'; ctx.timeout(() => end(false), 900); }
      else { newBall(); bannerTxt = lives === 1 ? 'Letztes Leben!' : `Noch ${lives} Leben`; bannerT = 1.5; }
    }
    function end(won) {
      if (finished) return; finished = true;
      const st = cleared >= MAX_LEVEL ? 3 : cleared >= 4 ? 2 : cleared >= 2 ? 1 : 0;
      let text;
      if (won) text = 'Die ganze Mauer ist weg! Du bist ein echter Mauerbrecher-Meister.';
      else if (cleared < 2) text = `Du hast ${cleared} Level geschafft. Schaffe Level 2 für den ersten Stern!`;
      else if (cleared < 4) text = `${cleared} Level geschafft! Schaffe Level 4 für den zweiten Stern.`;
      else text = `${cleared} Level geschafft! Räume alle 6 Level ab für den dritten Stern.`;
      ctx.finish({ won, stars: st, score, text });
    }

    // ---------- Eingabe ----------
    ctx.input.pad({ dpad: 'lr', a: 'Start' });
    function startFromMenu(act) { if (mode !== 'menu') return; startRun(act === 'cont' ? resume : 1); }
    ctx.input.onPress(n => {
      if (mode === 'menu') { if (n === 'a') startFromMenu('cont'); else if (n === 'b') startFromMenu('new'); return; }
      if (n === 'a') launch();
    });
    const btns = () => [{ x: 60, y: 318, w: 240, h: 50, label: `Weiter bei Level ${resume}`, act: 'cont' }, { x: 60, y: 382, w: 240, h: 44, label: 'Von vorn', act: 'new' }];
    ctx.on(canvas, 'pointerdown', e => {
      const q = toLogic(e);
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      if (mode === 'menu') {
        const hit = btns().find(b => q.x >= b.x && q.x <= b.x + b.w && q.y >= b.y && q.y <= b.y + b.h);
        if (hit) { ctx.audio.sfx('click'); startFromMenu(hit.act); }
        return;
      }
      ptr = { id: e.pointerId, sx: q.x, sy: q.y, moved: 0 }; tx = q.x;
    });
    ctx.on(canvas, 'pointermove', e => {
      const q = toLogic(e);
      if (mode === 'menu') { hover = btns().findIndex(b => q.x >= b.x && q.x <= b.x + b.w && q.y >= b.y && q.y <= b.y + b.h); return; }
      if (ptr && ptr.id === e.pointerId) { ptr.moved = Math.max(ptr.moved, Math.hypot(q.x - ptr.sx, q.y - ptr.sy)); tx = q.x; }
      else if (e.pointerType === 'mouse') tx = q.x;
    });
    const up = e => {
      if (ptr && ptr.id === e.pointerId) { if (ptr.moved < 14 && e.type === 'pointerup') launch(); ptr = null; }
    };
    ctx.on(canvas, 'pointerup', up); ctx.on(canvas, 'pointercancel', up);
    function toLogic(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }

    // ---------- Physik ----------
    function stepBall(b, dt) {
      if (b.stuck) {
        b.grace = Math.max(0, b.grace - dt);
        b.x = px + b.off; b.y = PY - R - 1;
        if (b.relT > 0 && (b.relT -= dt) <= 0) release(b);
        return;
      }
      const sp0 = Math.hypot(b.vx, b.vy), sp = sp0 + (targetSpeed() - sp0) * Math.min(1, dt * 3);
      fix(b, sp);
      const n = Math.max(1, Math.ceil(sp * dt / 3)), sdt = dt / n;
      for (let i = 0; i < n; i++) {
        b.x += b.vx * sdt; b.y += b.vy * sdt;
        let bounced = false;
        if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); bounced = true; }
        else if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); bounced = true; }
        if (b.y < WALL_TOP + R) { b.y = WALL_TOP + R; b.vy = Math.abs(b.vy); bounced = true; }
        if (bounced) { tone(300, 0.035, 'sine', 0.06); puff(b.x, b.y, 1); fix(b, Math.hypot(b.vx, b.vy)); }
        // Schlitten
        if (b.vy > 0 && b.y + R >= PY && b.y <= PY + PH && Math.abs(b.x - px) <= pw / 2 + R * 0.7) {
          b.y = PY - R;
          const t = clamp((b.x - px) / (pw / 2), -1, 1), s = Math.hypot(b.vx, b.vy);
          const ang = clamp(t * 1.02 + rnd(-0.07, 0.07), -1.05, 1.05);
          b.vx = Math.sin(ang) * s; b.vy = -Math.cos(ang) * s;
          combo = 0; padPulse = 1; tone(190, 0.07, 'sine', 0.14, 120); puff(b.x, PY, 2);
          if (glueT > 0) { b.stuck = true; b.off = clamp(b.x - px, -pw / 2, pw / 2); b.relT = 2.6; b.grace = 0.25; b.vx = b.vy = 0; ctx.audio.sfx('pop'); return; }
          fix(b, s);
        }
        // Steine
        for (const k of bricks) {
          if (k.dead) continue;
          const cx = clamp(b.x, k.x, k.x + k.w), cy = clamp(b.y, k.y, k.y + k.h);
          const dx = b.x - cx, dy = b.y - cy;
          if (dx * dx + dy * dy >= R * R) continue;
          const bounce = hitBrick(k, b);
          if (bounce) {
            const kx = k.x + k.w / 2, ky = k.y + k.h / 2;
            const ox = (k.w / 2 + R) - Math.abs(b.x - kx), oy = (k.h / 2 + R) - Math.abs(b.y - ky);
            if (ox < oy) { b.vx = (b.x < kx ? -1 : 1) * Math.abs(b.vx); b.x += (b.x < kx ? -1 : 1) * Math.min(ox, 2); }
            else { b.vy = (b.y < ky ? -1 : 1) * Math.abs(b.vy); b.y += (b.y < ky ? -1 : 1) * Math.min(oy, 2); }
            fix(b, Math.hypot(b.vx, b.vy));
            if (fireT <= 0) break;
          }
          if (mode !== 'play') return;
        }
      }
      b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 13) b.trail.shift();
    }

    function update(dt) {
      time += dt; lvlTime += dt;
      for (const f of flakes) { f.y += f.v * dt; f.x += Math.sin(time + f.p) * 8 * dt; if (f.y > H + 4) { f.y = -4; f.x = rnd(0, W); } }
      shakeV *= Math.exp(-dt * 11);
      if (mode === 'menu') return;
      const ax = ctx.input.axis().x;
      if (ax) tx += ax * 470 * dt;
      pwT = narrowT > 0 ? 40 : wideT > 0 ? 108 : 68;
      pw += (pwT - pw) * Math.min(1, dt * 10);
      tx = clamp(tx, pw / 2, W - pw / 2);
      px += (tx - px) * Math.min(1, dt * 32); px = clamp(px, pw / 2, W - pw / 2);
      padPulse = Math.max(0, padPulse - dt * 6);
      wideT = Math.max(0, wideT - dt); narrowT = Math.max(0, narrowT - dt); fireT = Math.max(0, fireT - dt);
      glueT = Math.max(0, glueT - dt); slowT = Math.max(0, slowT - dt);
      bannerT = Math.max(0, bannerT - dt);
      if (mode === 'play') {
        for (const b of balls) stepBall(b, dt);
        if (mode === 'play') {
          for (const b of balls) if (!b.stuck && b.y > LOSS_Y) { puff(b.x, PY + 20, 6); burst(b.x, PY + 22, '#fff', 8, 90); }
          const alive = balls.filter(b => b.stuck || b.y <= LOSS_Y);
          if (alive.length !== balls.length) { balls = alive; if (!balls.length) loseLife(); }
        }
        for (const d of drops) {
          d.y += d.vy * dt; d.ph += dt * 6;
          if (d.y > PY - 6 && d.y < PY + PH + 8 && Math.abs(d.x - px) < pw / 2 + 14) { d.got = true; applyPower(d.type); }
        }
        drops = drops.filter(d => !d.got && d.y < H + 20);
      }
      for (const k of bricks) { if (k.flash > 0) k.flash -= dt; if (k.wob > 0) k.wob -= dt; }
      bricks = bricks.filter(k => !k.dead);
      for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gr * dt; p.rot += (p.vr || 0) * dt; }
      parts = parts.filter(p => p.life > 0);
      for (const t of texts) { t.life -= dt; t.y -= 26 * dt; }
      texts = texts.filter(t => t.life > 0);
    }

    // ---------- Zeichnen ----------
    function drawBg() {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#0b1437'); gr.addColorStop(0.7, '#12225a'); gr.addColorStop(1, '#1b3478');
      g.fillStyle = gr; g.fillRect(-10, -10, W + 20, H + 20);
      for (const s of stars) { g.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.6 + s.p); g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.3); g.fill(); }
      g.globalAlpha = 0.9; g.fillStyle = '#fff7d6'; g.beginPath(); g.arc(318, 36, 13, 0, 6.3); g.fill();
      g.fillStyle = '#0d1a4a'; g.beginPath(); g.arc(324, 32, 11, 0, 6.3); g.fill(); g.globalAlpha = 1;
      // Tannen und Schneehügel
      g.fillStyle = '#10265a';
      for (const t of trees) { const b = 536, h = 46 * t.s; g.beginPath(); g.moveTo(t.x, b - h); g.lineTo(t.x + 14 * t.s, b); g.lineTo(t.x - 14 * t.s, b); g.fill(); }
      g.fillStyle = '#dce9ff'; g.beginPath(); g.moveTo(0, 548); g.quadraticCurveTo(90, 526, 180, 542); g.quadraticCurveTo(270, 556, 360, 534); g.lineTo(360, 580); g.lineTo(0, 580); g.fill();
      g.fillStyle = '#b8cdf0'; g.beginPath(); g.moveTo(0, 556); g.quadraticCurveTo(120, 544, 230, 556); g.quadraticCurveTo(300, 562, 360, 552); g.lineTo(360, 580); g.lineTo(0, 580); g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (const f of flakes) { g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.3); g.fill(); }
    }
    function drawBrick(k) {
      const ap = clamp((lvlTime - k.t0) / 0.3, 0, 1); if (ap <= 0) return;
      const e = 1 - Math.pow(1 - ap, 3);
      const x = k.x + 1, y = k.y + 1 - (1 - e) * 36, w = k.w - 2, h = k.h - 2, cx = x + w / 2, cy = y + h / 2;
      g.save(); g.globalAlpha = e;
      if (k.wob > 0) { const s = 1 + Math.sin(time * 55) * k.wob * 0.18; g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy); }
      const ch = k.k;
      if (GIFT[ch]) {
        const c = GIFT[ch], rib = (ch === 'Y' || ch === 'W') ? '#ef476f' : '#fff3c4';
        rr(x, y, w, h, 3); g.fillStyle = c; g.fill();
        g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x + 1, y + h * 0.62, w - 2, h * 0.38 - 1);
        g.fillStyle = rib; g.fillRect(cx - 3, y, 6, h); g.globalAlpha = e * 0.55; g.fillRect(x, cy - 1.5, w, 3); g.globalAlpha = e;
        g.strokeStyle = rib; g.lineWidth = 1.4; g.beginPath(); g.arc(cx - 3.2, y + 1.5, 2.6, 0, 6.3); g.arc(cx + 3.2, y + 1.5, 2.6, 0, 6.3); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x + 2, y + 1, 8, 2);
      } else if (ch === 'L') {
        rr(x, y, w, h, 4); g.fillStyle = '#b8692e'; g.fill();
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 1, y + h * 0.7, w - 2, h * 0.3 - 1);
        g.strokeStyle = '#fff'; g.lineWidth = 1.8; g.lineJoin = 'round'; g.beginPath();
        for (let i = 0; i <= 8; i++) { const xx = x + 4 + i * (w - 8) / 8, yy = y + 5 + (i % 2 ? 3 : 0); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
        g.stroke();
        g.fillStyle = '#ef476f'; g.beginPath(); g.arc(x + 6, y + h - 4, 1.8, 0, 6.3); g.fill();
        g.fillStyle = '#06d6a0'; g.beginPath(); g.arc(x + w - 6, y + h - 4, 1.8, 0, 6.3); g.fill();
      } else if (ch === 'K') {
        rr(x, y, w, h, 7); g.fillStyle = '#2a2d44'; g.fill();
        g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(cx - 5, cy - 3, 6, 2.2, -0.2, 0, 6.3); g.fill();
      } else if (ch === 'I') {
        const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#d6f1ff'); gr.addColorStop(1, '#79b9dc');
        rr(x, y, w, h, 3); g.fillStyle = gr; g.fill();
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.2; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 6, y + h - 3); g.lineTo(x + 13, y + 3); g.moveTo(x + 14, y + h - 3); g.lineTo(x + 18, y + 6); g.stroke();
        if (k.hp < 2) {
          g.strokeStyle = '#35688a'; g.lineWidth = 1.3; g.beginPath();
          g.moveTo(x + w * 0.45, y); g.lineTo(x + w * 0.52, y + 5); g.lineTo(x + w * 0.4, y + 9); g.lineTo(x + w * 0.55, y + h);
          g.moveTo(x + w * 0.52, y + 5); g.lineTo(x + w * 0.72, y + 8); g.moveTo(x + w * 0.4, y + 9); g.lineTo(x + w * 0.2, y + 12); g.stroke();
        }
      } else if (ch === 'S') {
        const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#9aa6c6'); gr.addColorStop(1, '#4b5578');
        rr(x, y, w, h, 3); g.fillStyle = gr; g.fill(); g.strokeStyle = '#2f3858'; g.lineWidth = 1; g.stroke();
        g.fillStyle = '#dfe6f7';
        for (const [rx, ry] of [[x + 3, y + 3], [x + w - 3, y + 3], [x + 3, y + h - 3], [x + w - 3, y + h - 3]]) { g.beginPath(); g.arc(rx, ry, 1, 0, 6.3); g.fill(); }
        g.beginPath(); g.moveTo(cx - 6, cy + 4); g.quadraticCurveTo(cx - 6, cy - 6, cx, cy - 6); g.quadraticCurveTo(cx + 6, cy - 6, cx + 6, cy + 4); g.lineTo(cx + 8, cy + 5); g.lineTo(cx - 8, cy + 5); g.closePath();
        g.fillStyle = '#f2f5ff'; g.fill(); g.strokeStyle = '#2f3858'; g.stroke();
        g.fillStyle = '#2f3858'; g.beginPath(); g.arc(cx, cy + 6, 1.8, 0, 6.3); g.fill();
      }
      if (k.flash > 0) { rr(x, y, w, h, 3); g.fillStyle = `rgba(255,255,255,${Math.min(0.8, k.flash * 4)})`; g.fill(); }
      g.restore();
    }
    function drawIcon(type, cx, cy, s = 1) {
      g.save(); g.translate(cx, cy); g.scale(s, s); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.lineCap = 'round';
      const tri = (x0, x1) => { g.beginPath(); g.moveTo(x0, 0); g.lineTo(x1, -4); g.lineTo(x1, 4); g.closePath(); g.fill(); };
      if (type === 'wide') { tri(-10, -4); tri(10, 4); g.beginPath(); g.moveTo(-4, 0); g.lineTo(4, 0); g.stroke(); }
      else if (type === 'narrow') { tri(-2, -8); tri(2, 8); }
      else if (type === 'multi') { for (const [x, y] of [[-6, 2], [0, -2], [6, 2]]) { g.beginPath(); g.arc(x, y, 2.6, 0, 6.3); g.fill(); } }
      else if (type === 'fire') { g.fillStyle = '#ffd166'; g.beginPath(); g.moveTo(0, -8); g.quadraticCurveTo(8, 0, 4, 5); g.quadraticCurveTo(0, 9, -4, 5); g.quadraticCurveTo(-8, 0, 0, -8); g.fill(); g.fillStyle = '#ef476f'; g.beginPath(); g.arc(0, 3, 2.6, 0, 6.3); g.fill(); }
      else if (type === 'glue') { g.beginPath(); g.arc(0, -1, 4.5, 0, 6.3); g.fill(); g.beginPath(); g.moveTo(-2, 2); g.lineTo(2, 2); g.lineTo(0, 8); g.fill(); }
      else if (type === 'life') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-10, -1, -5, -8, 0, -3); g.bezierCurveTo(5, -8, 10, -1, 0, 6); g.fill(); }
      else if (type === 'slow') { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * -7, Math.sin(a) * -7); g.lineTo(Math.cos(a) * 7, Math.sin(a) * 7); g.stroke(); } }
      g.restore();
    }
    function drawDrop(d) {
      const p = PU[d.type], pul = 1 + Math.sin(d.ph) * 0.07;
      g.save(); g.translate(d.x, d.y); g.scale(pul, pul);
      g.shadowColor = p.bad ? '#ef476f' : p.c; g.shadowBlur = 12;
      rr(-17, -9, 34, 18, 9); g.fillStyle = p.c; g.fill(); g.shadowBlur = 0;
      g.lineWidth = 2; g.strokeStyle = p.bad ? (Math.sin(d.ph * 2) > 0 ? '#ef476f' : '#ffb3c3') : 'rgba(255,255,255,.85)'; g.stroke();
      drawIcon(d.type, 0, 0, 1); g.restore();
    }
    function drawPaddle() {
      const w = pw, x = px - w / 2, y = PY + padPulse * 2;
      const bad = narrowT > 0, fire = fireT > 0;
      g.save();
      if (fire) { g.shadowColor = '#ff7b2e'; g.shadowBlur = 14 + Math.sin(time * 20) * 4; }
      g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 7, y + 6); g.quadraticCurveTo(x - 6, y + 14, x + 2, y + 14); g.lineTo(x + w - 2, y + 14); g.quadraticCurveTo(x + w + 6, y + 14, x + w + 5, y + 10); g.stroke();
      g.lineWidth = 2.4; g.beginPath(); g.moveTo(x + w * 0.2, y + 8); g.lineTo(x + w * 0.2, y + 14); g.moveTo(x + w * 0.8, y + 8); g.lineTo(x + w * 0.8, y + 14); g.stroke();
      rr(x, y, w, 10, 5); g.fillStyle = bad ? '#7b3a52' : '#ef476f'; g.fill(); g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,.35)'; rr(x + 3, y + 1.5, w - 6, 2.5, 1.2); g.fill();
      g.strokeStyle = '#ffd166'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + 5, y + 7); g.lineTo(x + w - 5, y + 7); g.stroke();
      if (glueT > 0) { g.fillStyle = '#06d6a0'; g.beginPath(); g.moveTo(x, y + 1); for (let i = 0; i <= 8; i++) g.lineTo(x + w * i / 8, y - 2 - (i % 2) * 1.6); g.lineTo(x + w, y + 2); g.fill(); }
      g.restore();
    }
    function drawBall(b) {
      const fire = fireT > 0;
      for (let i = 0; i < b.trail.length; i++) {
        const t = b.trail[i], f = (i + 1) / b.trail.length;
        g.globalAlpha = f * 0.4; g.fillStyle = fire ? (i % 2 ? '#ffd166' : '#ff7b2e') : '#cfe8ff';
        g.beginPath(); g.arc(t.x, t.y, R * (0.35 + f * 0.6), 0, 6.3); g.fill();
      }
      g.globalAlpha = 1;
      if (fire) { g.shadowColor = '#ff7b2e'; g.shadowBlur = 16; }
      const gr = g.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, R + 1);
      if (fire) { gr.addColorStop(0, '#fff7c2'); gr.addColorStop(0.5, '#ffb347'); gr.addColorStop(1, '#ff5a1f'); }
      else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#e3efff'); gr.addColorStop(1, '#a9c8ee'); }
      g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, R, 0, 6.3); g.fill(); g.shadowBlur = 0;
      if (fire && Math.random() < 0.8 && parts.length < 420) parts.push({ k: 'sq', x: b.x + rnd(-3, 3), y: b.y + rnd(-3, 3), vx: rnd(-20, 20), vy: rnd(-10, 40), life: 0.35, max: 0.35, c: Math.random() < 0.5 ? '#ffd166' : '#ff7b2e', s: rnd(2, 4), gr: 0, rot: 0 });
    }
    function drawEffects() {
      const list = [['wide', wideT], ['narrow', narrowT], ['fire', fireT], ['glue', glueT], ['slow', slowT]].filter(e => e[1] > 0);
      list.forEach(([type, t], i) => {
        const x = 8 + i * 40, y = 14, p = PU[type];
        g.fillStyle = p.c; rr(x, y - 8, 34, 16, 8); g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2; g.stroke();
        drawIcon(type, x + 17, y, 0.7);
        g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, y + 11, 34, 3);
        g.fillStyle = '#fff'; g.fillRect(x, y + 11, 34 * Math.min(1, t / p.t), 3);
      });
    }
    function drawBanner() {
      if (bannerT <= 0) return;
      const a = Math.min(1, bannerT * 2, (2.4 - bannerT) * 4 + 0.2);
      g.save(); g.globalAlpha = Math.max(0, Math.min(1, a)); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '800 26px system-ui, sans-serif'; g.lineWidth = 5; g.strokeStyle = '#0b1437'; g.strokeText(bannerTxt, W / 2, 330);
      g.fillStyle = '#ffd166'; g.fillText(bannerTxt, W / 2, 330); g.restore();
    }
    function drawReadyHint() {
      const b = balls[0]; if (mode !== 'play' || !b || !b.stuck) return;
      const t = clamp(b.off / (pw / 2), -1, 1), a = t * 0.9;
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (let i = 1; i <= 5; i++) { const d = 14 + i * 15; g.beginPath(); g.arc(b.x + Math.sin(a) * d, b.y - Math.cos(a) * d, 2.2 - i * 0.2, 0, 6.3); g.fill(); }
      g.globalAlpha = 0.6 + 0.4 * Math.sin(time * 5); g.textAlign = 'center'; g.font = '700 15px system-ui, sans-serif'; g.fillStyle = '#fff';
      g.fillText(ctx.input.isTouch ? 'Antippen zum Start' : 'Klick oder Leertaste zum Start', W / 2, 462); g.globalAlpha = 1;
    }
    function drawMenu() {
      g.fillStyle = 'rgba(11,20,55,.72)'; g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 38px system-ui, sans-serif'; g.lineWidth = 6; g.strokeStyle = '#0b1437'; g.strokeText('Mauerbrecher', W / 2, 190);
      g.fillStyle = '#ffd166'; g.fillText('Mauerbrecher', W / 2, 190);
      g.font = '600 15px system-ui, sans-serif'; g.fillStyle = '#cfe8ff'; g.fillText('Schneeball, Schlitten und 6 Geschenke-Mauern', W / 2, 228);
      const bx = W / 2 + Math.sin(time * 2.2) * 70, by = 262 - Math.abs(Math.sin(time * 4.4)) * 22;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, 8, 0, 6.3); g.fill();
      btns().forEach((b, i) => {
        const on = hover === i;
        rr(b.x, b.y, b.w, b.h, 14); g.fillStyle = i === 0 ? (on ? '#ffe08a' : '#ffd166') : (on ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.14)'); g.fill();
        g.strokeStyle = i === 0 ? '#fff3c4' : 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.stroke();
        g.font = '800 19px system-ui, sans-serif'; g.fillStyle = i === 0 ? '#3a2a00' : '#fff'; g.fillText(b.label, W / 2, b.y + b.h / 2 + 1);
      });
      g.font = '500 12px system-ui, sans-serif'; g.fillStyle = '#9fb3e6'; g.fillText('Tastatur: Leertaste = Weiter, X = Von vorn', W / 2, 452);
    }
    function draw() {
      g.save();
      if (shakeV > 0.1) g.translate(rnd(-shakeV, shakeV), rnd(-shakeV, shakeV));
      drawBg();
      bricks.forEach(drawBrick);
      for (const d of drops) drawDrop(d);
      if (mode !== 'menu') drawPaddle();
      for (const b of balls) drawBall(b);
      for (const p of parts) {
        g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * (p.k === 'puff' ? 0.6 : 1.4))); g.fillStyle = p.c;
        if (p.k === 'puff') { g.beginPath(); g.arc(p.x, p.y, p.s * (1.6 - p.life / p.max * 0.8), 0, 6.3); g.fill(); }
        else { g.save(); g.translate(p.x, p.y); g.rotate(p.rot || 0); g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); g.restore(); }
      }
      g.globalAlpha = 1;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 14px system-ui, sans-serif';
      for (const t of texts) { g.globalAlpha = Math.min(1, t.life * 2); g.fillStyle = t.c; g.strokeStyle = '#0b1437'; g.lineWidth = 3; g.strokeText(t.txt, t.x, t.y); g.fillText(t.txt, t.x, t.y); }
      g.globalAlpha = 1;
      if (mode !== 'menu') { drawEffects(); drawReadyHint(); drawBanner(); }
      g.restore();
      if (mode === 'menu') drawMenu();
    }

    ctx.loop(dt => { update(dt); draw(); });

    // Start: bei gespeichertem Fortschritt Auswahl, sonst direkt los
    loadLevel(1); mode = 'menu'; bannerT = 0; lvlTime = 10;
    if (resume <= 1) startRun(1);
    // Hilfe für automatische Tests (nur mit ?test in der URL)
    if (new URLSearchParams(location.search).has('test')) {
      canvas.__mb = {
        state: () => ({ mode, lvl, lives, score, remain, px, pw, balls: balls.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, stuck: b.stuck })), drops: drops.map(d => ({ x: d.x, y: d.y, type: d.type })), fire: fireT, wide: wideT, glue: glueT }),
        clearLevel: () => { for (const k of bricks.slice()) if (k.k !== 'S' && !k.dead) { k.hp = 1; breakBrick(k, balls[0] || {}); } },
        drop: type => spawnDrop(type, px, PY - 120),
        kill: () => { balls.forEach(b => { b.stuck = false; b.y = LOSS_Y + 5; }); },
      };
    }
    return { destroy() {} };
  },
};
