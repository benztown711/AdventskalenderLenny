// Türchen 24: Das große Finale - Rettet Weihnachten!
import * as A from './art.js';
import { createMusic } from './music.js';
import { createFinale } from './finale.js';

export const howto = 'Zieh den Raketen-Schlitten mit dem Finger oder der Maus (oder Pfeiltasten). Schneebälle fliegen von selbst! Der Lawinen-Knopf (oder Leertaste) räumt den Himmel frei. Hol die Geschenke vom Grummel-Yeti zurück!';

const W = 360, H = 560;
const { C } = A;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const d2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
const GIFT_COLORS = [C.red, C.green, C.violet, C.ice, '#ff9f43'];
const PHASE_NAMES = ['Anflug', 'Die Eisfestung', 'Der Grummel-Yeti'];
const SONG = ['deck', 'carol', 'boss'];

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    const audio = ctx.audio, music = createMusic(audio);
    const T = (new URLSearchParams(location.search).get('t24') || '').split(',');
    const GOD = T.includes('gott'), SPEED = Number((T.find(s => /^x\d+$/.test(s)) || 'x1').slice(1)) || 1;
    const touch = ctx.input.isTouch;

    // ---------- Zustand ----------
    let mode = 'story', phase = 1, phaseT = 0, time = 0;
    let restarts = 0, score = 0, gifts = 0, ckScore = 0, ckGifts = 0, shortcut = false;
    const tries = [0, 1, 1, 1];
    let hearts = 5, inv = 0, lawinen = 3, power = null, powerT = 0, shield = 0;
    const P = { x: W / 2, y: H - 100, tx: null, ty: null, fire: 0, tilt: 0, n: 0, rot: 0 };
    let shots = [], ebul = [], enemies = [], items = [], parts = [], pops = [], warns = [];
    let shake = 0, flash = 0, flashC = '#fff', scroll = 0, scrollSpeed = 70, storm = 1;
    let story = null, card = null, caption = null, anim = null, finale = null, menu = null;
    let timeline = [], tl = 0, giftT = 3, pwT = 14, batT = 6;
    let fort = null, eye = null, boss = null, lawFx = 0, downT = 0, hitGate = 0, pingGate = 0, shotSnd = 0;
    let drag = null, dragOff = 60;
    const LB = { x: W - 40, y: H - 44, r: 27 };

    // Hintergrund-Deko (Wald von oben)
    const decor = Array.from({ length: 46 }, (_, i) => ({ x: rnd(0, W), y: rnd(0, H + 120), s: rnd(9, 18), k: i % 9 === 0 ? 'house' : i % 5 === 0 ? 'rock' : 'tree' }));
    const flakes = Array.from({ length: 60 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(0.7, 2.2), v: rnd(0.6, 1.4) }));
    const cracks = Array.from({ length: 14 }, () => ({ x: rnd(0, W), y: rnd(0, H + 120), a: rnd(0, 6), l: rnd(20, 50) }));

    const hud = () => ctx.hud.set({ Punkte: score, Geschenke: gifts, Neustarts: restarts });
    const sfx = n => audio.sfx(n);
    const blip = (f, d = 0.05, ty = 'square', v = 0.04, s = null) => audio.tone(f, d, ty, v, s);

    // ---------- Effekte ----------
    function snowBurst(x, y, n = 16, color = '#fff', spd = 150) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, v = rnd(0.3, 1) * spd;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.4, 0.9), max: 0.9, r: rnd(2, 5.5), c: Math.random() < 0.6 ? color : '#fff', rot: Math.random() * 6, vr: rnd(-6, 6), flake: Math.random() < 0.55 });
      }
      parts.push({ ring: true, x, y, life: 0.35, max: 0.35, r: n * 1.6, c: color });
    }
    function pop(x, y, str, color = C.gold, size = 13) { pops.push({ x, y, str, color, size, life: 0.9 }); }
    function say(text, t = 2.4) { caption = { text, t, max: t }; }
    function addScore(n) { score += n; hud(); }
    function bigShake(s = 12, ms = 350) { shake = Math.max(shake, s); ctx.fx.shake(ms); }

    // ---------- Story ----------
    const NAMES = { yeti: 'Grummel-Yeti', yetiFroh: 'Yeti (froh!)', wichtel: 'Wichtel-Funk', du: 'Du', erz: '' };
    function tell(lines, then) { story = { lines, i: 0, ch: 0, t: 0, then }; mode = 'story'; }
    function advance(all) {
      if (!story) return;
      const L = story.lines[story.i];
      if (!all && story.ch < L.text.length) { story.ch = L.text.length; return; }
      story.i = all ? story.lines.length : story.i + 1; story.ch = 0; story.t = 0; sfx('click');
      if (story.i >= story.lines.length) { const f = story.then; story = null; f(); }
    }
    const steer = touch ? 'Zieh mit dem Finger, der Schlitten fliegt mit.' : 'Maus ziehen oder Pfeiltasten zum Fliegen.';
    const lawTip = touch ? 'Der blaue Knopf unten rechts ist die LAWINE!' : 'Leertaste oder der blaue Knopf = LAWINE!';
    const INTRO = [
      { who: 'erz', text: 'Heiligabend. Alles ist bereit für die Bescherung …' },
      { who: 'erz', text: '… doch plötzlich sind ALLE Geschenke weg!' },
      { who: 'yeti', text: 'HÖHÖ! Die gehören jetzt mir! Weihnachten fällt aus. GRUMMEL!' },
      { who: 'wichtel', text: 'Funkspruch! Spring in den Raketen-Schlitten und hol sie zurück!' },
      { who: 'wichtel', text: `${steer} Schneebälle fliegen von allein. ${lawTip}` },
    ];
    const TO2 = [
      { who: 'wichtel', text: 'Super geflogen! Da vorne liegt die Eisfestung.' },
      { who: 'wichtel', text: 'Vier Kanonentürme bewachen das Tor. Erst die Türme, dann das Tor-Auge!' },
      { who: 'wichtel', text: 'Leuchtet ein Turm gelb auf, kommt gleich ein Schuss. Ausweichen!' },
    ];
    const TO3 = [
      { who: 'yeti', text: 'WAAAS?! Mein schönes Tor! Das war frisch geputzt!' },
      { who: 'yeti', text: 'Na wartet. Jetzt werde ich RICHTIG grummelig!' },
      { who: 'wichtel', text: 'Pass auf rote Kreise am Boden auf: Da krachen gleich Eiszapfen runter!' },
    ];
    const END1 = [
      { who: 'yeti', text: 'Uff … puh … ich kann nicht mehr …' },
      { who: 'yeti', text: 'Ich wollte doch nur … auch mal ein Geschenk bekommen. *schnief*' },
      { who: 'du', text: 'Ach Yeti! Warum sagst du das nicht gleich? Hier, das ist für dich!' },
    ];
    const END2 = [
      { who: 'yetiFroh', text: 'Ein Schal! Mit BOMMELN! Das schönste Geschenk der Welt!' },
      { who: 'yetiFroh', text: 'Hier, nehmt alle Geschenke zurück. Und … FROHE WEIHNACHTEN!' },
    ];

    // ---------- Phasen ----------
    function enterPhase(n) { ckScore = score; ckGifts = gifts; startPhase(n); }
    function startPhase(n) {
      phase = n; phaseT = 0; hearts = 5; inv = 0; lawinen = 3; power = null; powerT = 0; shield = 0;
      shots = []; ebul = []; enemies = []; items = []; warns = []; fort = null; eye = null; boss = null; tl = 0; timeline = [];
      score = ckScore; gifts = ckGifts; giftT = 3; pwT = 14; batT = 6; lawFx = 0;
      P.x = W / 2; P.y = H - 100; P.tx = null; P.rot = 0;
      if (n === 1) initP1(); else if (n === 2) initP2(); else initP3();
      music.play(SONG[n - 1]);
      if (!shortcut && !T.length) ctx.save('phase', Math.max(ctx.load('phase', 1), n));
      hud();
      card = { t: 0, title: `PHASE ${n}`, sub: PHASE_NAMES[n - 1], extra: tries[n] > 1 ? `Versuch ${tries[n]}` : '' };
      mode = 'card'; sfx('level');
    }
    function phaseClear() {
      const bonus = hearts * 200 + lawinen * 300;
      addScore(bonus); sfx('level'); ebulToSparkle();
      anim = { name: 'clear', t: 0, dur: 3, bonus }; mode = 'anim';
      for (const it of items) it.magnet = true;
    }
    function ebulToSparkle() {
      for (const b of ebul) { if (b.type !== 'ice' || b.t < b.fall) snowBurst(b.x, b.y, 4, C.ice, 60); }
      ebul = []; warns = [];
    }

    // ---- Phase 1: Anflug ----
    function bat(path, o = {}) { return addEnemy({ type: 'bat', hp: 2, r: 15, pts: 100, path, x: -99, y: -99, seed: Math.random() * 6, ...o }); }
    function addEnemy(o) { const e = { t: 0, hp: 2, r: 14, flash: 0, pts: 100, hittable: true, delay: 0, ...o }; e.maxHp = e.hp; enemies.push(e); return e; }
    const waveV = (xc, shoots, n = 5) => { for (let i = 0; i < n; i++) { const k = i - (n - 1) / 2; bat(t => ({ x: xc + k * 30 + Math.sin(t * 2.2) * 18, y: -30 - Math.abs(k) * 24 + t * 85 }), { shoots, shootAt: rnd(1.3, 2.6) }); } };
    const waveSnake = (left, y0, shoots, amp = 42) => { for (let i = 0; i < 6; i++) bat(t => ({ x: left ? -30 + t * 115 : W + 30 - t * 115, y: y0 + Math.sin(t * 2.6) * amp + t * (amp > 20 ? 10 : 0) }), { delay: i * 0.33, shoots, shootAt: rnd(1, 2.4) }); };
    const waveSwoop = (x0, dir, n = 5) => { for (let i = 0; i < n; i++) bat(t => ({ x: x0 + dir * t * 55, y: -25 + 230 * t - 70 * t * t }), { delay: i * 0.3 }); };
    const waveWall = gap => { for (let i = 0; i < 8; i++) { const x = 22 + i * 45; if (Math.abs(x - gap) < 50) continue; bat(t => ({ x: x + Math.sin(t * 2 + i) * 6, y: -25 + t * 52 }), { shoots: true, shootAt: rnd(1.6, 4.5), straight: true }); } };
    const drones = (xs, spread) => xs.forEach((x, i) => addEnemy({ type: 'drone', hp: 5, r: 16, pts: 200, x, y: -30, ty: rnd(95, 185), st: 'in', delay: i * 0.45, left: 3, cd: rnd(0.5, 1.2), charge: 0, spread }));
    const goldbat = (drop, left) => bat(t => ({ x: left ? -30 + t * 58 : W + 30 - t * 58, y: 120 + Math.sin(t * 1.8) * 40 }), { gold: true, hp: 7, r: 16, pts: 300, drop });

    function initP1() {
      scrollSpeed = 75; storm = 1;
      const at = (t, f) => timeline.push([t, f]);
      at(2.5, () => waveV(180, false));
      at(6, () => waveSnake(true, 90, false));
      at(9.5, () => waveV(100, false)); at(10.5, () => waveV(260, false));
      at(13.5, () => drones([90, 270], false));
      at(17, () => goldbat('double', true));
      at(19.5, () => waveSwoop(50, 1));
      at(22.5, () => waveSnake(false, 110, true));
      at(26.5, () => drones([70, 180, 290], false));
      at(30.5, () => { waveV(180, true); waveV(70, false, 3); });
      at(33.5, () => goldbat('shield', false));
      at(36, () => { waveSwoop(40, 1, 4); waveSwoop(320, -1, 4); });
      at(40, () => { waveSnake(true, 80, true); });
      at(42, () => { waveSnake(false, 150, true); });
      at(45.5, () => drones([60, 140, 220, 300], true));
      at(50, () => goldbat('spread', true));
      at(52.5, () => waveV(180, true, 7));
      at(56.5, () => { waveSwoop(60, 1); waveSwoop(300, -1); });
      at(60.5, () => { drones([110, 250], true); waveSnake(true, 200, false); });
      at(65, () => goldbat('heart', false));
      at(67.5, () => waveWall(rnd(90, 270)));
      at(73, () => { drones([80, 280], true); waveV(180, true); });
      at(78, () => { waveSnake(true, 90, true); waveSnake(false, 140, true); });
      at(80, () => goldbat('double', true));
      at(83, () => { waveV(110, true); waveV(250, true); });
      at(87, () => say('Gleich ist die Festung in Sicht!', 2.2));
    }
    function updateP1(dt) {
      while (tl < timeline.length && phaseT >= timeline[tl][0]) timeline[tl++][1]();
      if ((giftT -= dt) <= 0) { giftT = rnd(2.8, 4.2); spawnGift(rnd(30, W - 30), -15); }
      if (tl >= timeline.length && phaseT > 90 && !enemies.length) phaseClear();
    }

    // ---- Phase 2: Eisfestung ----
    function initP2() {
      scrollSpeed = 22; storm = 0.4;
      fort = { y: -280, eyeOpen: 0, open: false, opening: 0, broken: false, eyeGlow: false, eyeFlash: 0, lookX: 0, rubble: [], cracks: null };
      [[58, 148], [302, 148], [124, 192], [236, 192]].forEach(([x, y], i) => addEnemy({ type: 'turret', x, y: y - 280, oy: y, hp: 18, r: 21, pts: 1000, cd: 3.2 + i * 1.1, charge: 0, aim: Math.PI / 2, n: i, burst: 0, bt: 0, big: true }));
      eye = addEnemy({ type: 'eye', x: W / 2, y: -250, hp: 60, r: 25, pts: 3000, hittable: false, cd: 1.5, charge: 0, n: 0, act: null, big: true });
    }
    function updateP2(dt) {
      fort.eyeFlash = Math.max(0, fort.eyeFlash - dt);
      fort.lookX = clamp((P.x - W / 2) / 120, -1, 1);
      const turrets = enemies.filter(e => e.type === 'turret');
      if (!turrets.length && !fort.open && !fort.opening) {
        fort.opening = 1.4; say('Das Tor-Auge geht auf! Jetzt drauf!', 2.6); bigShake(8); sfx('bad');
        audio.tone(90, 1.2, 'sawtooth', 0.12, 50);
      }
      if (fort.opening > 0) { fort.opening -= dt; fort.eyeOpen = clamp(1 - fort.opening / 1.4, 0, 1); if (fort.opening <= 0) { fort.open = true; eye.hittable = true; fort.eyeOpen = 1; } }
      if ((batT -= dt) <= 0 && turrets.length && phaseT > 6) { batT = rnd(8, 11); waveSnake(Math.random() < 0.5, 226, false, 9); }
      if ((giftT -= dt) <= 0) { giftT = rnd(5, 7); spawnGift(rnd(40, W - 40), 240); }
      if ((pwT -= dt) <= 0) { pwT = rnd(16, 20); spawnPower(rnd(60, W - 60), 240, nextPower()); }
    }
    let pwCycle = 0;
    function nextPower() { const list = hearts < 4 ? ['heart', 'double', 'spread', 'shield'] : ['double', 'spread', 'shield', 'double']; return list[pwCycle++ % list.length]; }

    // ---- Phase 3: Der Grummel-Yeti ----
    function initP3() {
      scrollSpeed = 0; storm = 0.3;
      boss = addEnemy({ type: 'yeti', x: W / 2, y: -170, hp: 340, r: 62, pts: 10000, hittable: false, st: 'enter', arms: 0, mood: 'angry', atk: null, stage: 1, rest: 2.2, mouth: 0, stun: 0, squash: 0, ft: 0, order: 0, big: true });
      pwT = 12;
    }
    function updateP3(dt) {
      if ((pwT -= dt) <= 0 && boss.st === 'fight') { pwT = rnd(15, 19); spawnPower(rnd(60, W - 60), -15, nextPower()); }
      if ((giftT -= dt) <= 0) { giftT = rnd(6, 8); spawnGift(rnd(40, W - 40), -15); }
    }
    function yetiUpdate(e, dt) {
      e.flash = Math.max(0, e.flash - dt); e.squash = Math.max(0, e.squash - dt * 3);
      e.mouth = Math.max(0, e.mouth - dt);
      if (e.st === 'enter') {
        e.y += 300 * dt;
        if (e.y >= 118) {
          e.y = 118; e.st = 'fight'; e.hittable = true; e.squash = 1; bigShake(16, 500); sfx('boom');
          snowBurst(e.x - 40, e.y + 85, 18, '#fff', 180); snowBurst(e.x + 40, e.y + 85, 18, '#fff', 180);
          say('GRUMMEL! Ihr kommt hier nicht rein!', 2.4);
        }
        return;
      }
      if (e.st !== 'fight') return;
      e.ft += dt;
      e.x = W / 2 + Math.sin(e.ft * 0.55) * 62;
      const frac = e.hp / e.maxHp, stage = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
      if (stage !== e.stage) {
        e.stage = stage; e.atk = null; e.arms = 1; e.rest = 1.6; e.order = 0; bigShake(12, 450);
        audio.tone(120, 0.9, 'sawtooth', 0.14, 60); sfx('bad');
        say(stage === 2 ? 'Der Yeti wird wütend!' : 'Jetzt ist er RICHTIG grummelig!', 2.4);
        if (stage === 3) e.mood = 'rage';
      }
      if (e.stun > 0) { e.stun -= dt; e.arms = 0; return; }
      if (!e.atk) {
        e.arms = Math.max(0, e.arms - dt * 2);
        if ((e.rest -= dt) <= 0) startAttack(e);
        return;
      }
      const a = e.atk; a.t += dt;
      while (a.i < a.ev.length && a.t >= a.ev[a.i][0]) a.ev[a.i++][1]();
      if (a.t >= a.end) { e.atk = null; e.rest = [0, 1.5, 1.15, 0.95][e.stage]; e.arms = 0; }
    }
    function startAttack(e) {
      const plans = { 1: ['fan', 'roll', 'rain'], 2: ['fan', 'rain', 'roll', 'fan2'], 3: ['combo1', 'roll3', 'combo2', 'rain3'] }[e.stage];
      const name = plans[e.order++ % plans.length];
      let ev = [], end = 0;
      const merge = (o, off = 0) => { o.ev.forEach(([t, f]) => ev.push([t + off, f])); end = Math.max(end, o.end + off); };
      if (name === 'fan') merge(atkFan(e, 2, 7, 108));
      if (name === 'fan2') merge(atkFan(e, 3, 7, 122));
      if (name === 'roll') merge(atkRoll(e, 2, 122));
      if (name === 'roll3') { merge(atkRoll(e, 3, 96)); merge(atkAimed(e, 3, 1.2), 1.0); }
      if (name === 'rain') merge(atkRain(e, 3, 5));
      if (name === 'rain3') merge(atkRain(e, 3, 7));
      if (name === 'combo1') { merge(atkFan(e, 2, 6, 118)); merge(atkRain(e, 2, 4), 0.8); }
      if (name === 'combo2') { merge(atkRoll(e, 2, 104)); merge(atkFan(e, 1, 5, 110), 1.6); }
      if (e.stage === 2 && name === 'roll') merge(atkAimed(e, 2, 1.3), 1);
      ev.sort((a, b) => a[0] - b[0]);
      e.atk = { ev, end, t: 0, i: 0 };
    }
    function atkFan(e, waves, n, spd) {
      const ev = [[0, () => { e.arms = 1; e.mouth = 0.95; audio.tone(220, 0.8, 'triangle', 0.08, 440); }]];
      for (let w = 0; w < waves; w++) ev.push([0.95 + w * 0.6, () => {
        const sx = e.x, sy = e.y - 2, a0 = Math.atan2(P.y - sy, P.x - sx), step = 0.23, off = w % 2 ? step / 2 : 0;
        for (let k = 0; k < n; k++) orb(sx, sy, a0 + (k - (n - 1) / 2) * step + off, spd, 7);
        e.mouth = 0.25; sfx('shoot');
      }]);
      return { ev, end: 0.95 + waves * 0.6 };
    }
    function atkAimed(e, n, gap) {
      const ev = [];
      for (let i = 0; i < n; i++) ev.push([i * gap, () => { const hx = e.x + (i % 2 ? 80 : -80), hy = e.y - 20; orb(hx, hy, Math.atan2(P.y - hy, P.x - hx), 135, 7); blip(400, 0.08, 'triangle', 0.06, 200); }]);
      return { ev, end: n * gap };
    }
    function atkRoll(e, rows, gapW) {
      const ev = []; let gx = rnd(80, W - 80);
      for (let r = 0; r < rows; r++) {
        const x0 = gx;
        ev.push([r * 1.9, () => { warns.push({ type: 'gap', x: x0, w: gapW, t: 1.1, max: 1.1 }); e.arms = 1; audio.tone(70, 0.9, 'sawtooth', 0.07, 50); }]);
        ev.push([r * 1.9 + 1.0, () => {
          e.arms = 0; e.squash = 0.7; bigShake(6, 200); sfx('hit');
          for (let x = 22; x < W; x += 44) if (Math.abs(x - x0) > gapW / 2 + 18) ebul.push({ type: 'roll', x, y: -28, vy: 100, r: 22, rot: 0, t: 0 });
        }]);
        gx = clamp(gx + rnd(-120, 120), 80, W - 80);
      }
      return { ev, end: rows * 1.9 + 0.6 };
    }
    function atkRain(e, waves, count) {
      const ev = [[0, () => { e.arms = 1; e.squash = 0.4; audio.tone(900, 0.6, 'sine', 0.05, 300); }]];
      for (let w = 0; w < waves; w++) ev.push([0.3 + w * 0.95, () => {
        const pts = [{ x: clamp(P.x, 30, W - 30), y: clamp(P.y, 250, H - 30) }];
        let guard = 0;
        while (pts.length < count && guard++ < 200) {
          const p = { x: rnd(28, W - 28), y: rnd(250, H - 26) };
          if (pts.every(q => d2(p.x, p.y, q.x, q.y) > 62 * 62)) pts.push(p);
        }
        for (const p of pts) ebul.push({ type: 'ice', x: p.x, y: p.y, t: 0, fall: 1.25, r: 23 });
        e.squash = 0.5; blip(1200, 0.08, 'triangle', 0.05, 800);
      }]);
      return { ev, end: 0.3 + waves * 0.95 + 1.2 };
    }

    // ---------- Gegner ----------
    function orb(x, y, a, spd, r = 6, color = C.pink) { ebul.push({ type: 'orb', x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r, color, t: 0 }); }
    const aimAt = (x, y) => Math.atan2(P.y - y, P.x - x);
    function updateEnemy(e, dt) {
      e.flash = Math.max(0, e.flash - dt);
      if (e.type === 'bat') {
        const p = e.path(e.t); e.x = p.x; e.y = p.y;
        if (e.shoots && !e.fired && e.t > e.shootAt && e.y > 20 && e.y < H * 0.6) {
          e.glow = (e.glow || 0) + dt;
          if (e.glow > 0.45) { e.fired = true; e.glow = 0; orb(e.x, e.y + 8, e.straight ? Math.PI / 2 : aimAt(e.x, e.y), 118); blip(500, 0.08, 'triangle', 0.05, 280); }
        }
        if (e.t > 1.5 && (e.x < -70 || e.x > W + 70 || e.y > H + 50 || e.y < -70)) e.gone = true;
      } else if (e.type === 'drone') {
        if (e.st === 'in') { e.y += (e.ty - e.y) * Math.min(1, dt * 2.4); if (Math.abs(e.ty - e.y) < 3) e.st = 'hover'; }
        else if (e.st === 'hover') {
          e.y = e.ty + Math.sin(e.t * 3) * 4;
          if (e.charge > 0) {
            e.charge -= dt;
            if (e.charge <= 0) {
              e.charge = 0; e.left--; e.cd = 2.3; const a = aimAt(e.x, e.y);
              if (e.spread) for (const k of [-1, 0, 1]) orb(e.x, e.y + 10, a + k * 0.3, 112); else orb(e.x, e.y + 10, a, 120);
              blip(600, 0.1, 'triangle', 0.06, 250);
            }
          } else if ((e.cd -= dt) <= 0) { if (e.left > 0) { e.charge = 0.8; blip(1300, 0.04, 'sine', 0.04); } else e.st = 'out'; }
        } else { e.y -= 120 * dt; if (e.y < -50) e.gone = true; }
      } else if (e.type === 'turret') {
        let want = aimAt(e.x, e.y), diff = Math.atan2(Math.sin(want - e.aim), Math.cos(want - e.aim));
        e.aim += diff * Math.min(1, dt * 5);
        if (fort.y < -6 || phaseT < 3.2) return;
        if (e.burst > 0) { if ((e.bt -= dt) <= 0) { e.burst--; e.bt = 0.2; orb(e.x + Math.cos(e.aim) * 24, e.y + Math.sin(e.aim) * 24, e.aim, 138); blip(700, 0.06, 'triangle', 0.05, 300); } return; }
        if (e.charge > 0) { e.charge -= dt; if (e.charge <= 0) { e.charge = 0; fireTurret(e); } return; }
        const busy = enemies.filter(o => o.type === 'turret' && (o.charge > 0 || o.burst > 0)).length;
        if ((e.cd -= dt) <= 0 && busy < 2) { e.charge = 0.95; blip(1500, 0.05, 'sine', 0.05); }
      } else if (e.type === 'eye') {
        if (!fort.open) return;
        fort.eyeGlow = e.charge > 0;
        if (e.act) {
          const a = e.act; a.t += dt;
          if (a.kind === 'spiral') { a.acc += dt; while (a.acc > 0.15) { a.acc -= 0.15; a.ang += 0.36; for (const k of [0, Math.PI]) orb(e.x, e.y, a.ang + k, 82, 6, C.violet); } if (a.t > 3.4) e.act = null; }
          if (a.kind === 'wall' && a.t > a.next && a.rows > 0) {
            a.rows--; a.next += 1.45; const gx = a.gx; a.gx = clamp(a.gx + rnd(-110, 110), 70, W - 70);
            for (let x = 14; x < W; x += 26) if (Math.abs(x - gx) > 48) ebul.push({ type: 'orb', x, y: e.y + 30, vx: 0, vy: 78, r: 6, color: C.ice, t: 0 });
            blip(300, 0.12, 'triangle', 0.06, 150);
          }
          if (a.kind === 'wall' && a.rows <= 0 && a.t > a.next) e.act = null;
          if (a.kind === 'fan' && a.t > a.next && a.n > 0) { a.n--; a.next += 0.55; const b = aimAt(e.x, e.y); for (let k = -3; k <= 3; k++) orb(e.x, e.y, b + k * 0.21 + (a.n % 2 ? 0.1 : 0), 118); sfx('shoot'); }
          if (a.kind === 'fan' && a.n <= 0 && a.t > a.next) e.act = null;
          if (!e.act) e.cd = 1.4;
          return;
        }
        if (e.charge > 0) {
          e.charge -= dt;
          if (e.charge <= 0) {
            e.charge = 0; const kind = ['spiral', 'wall', 'fan'][e.n++ % 3];
            e.act = { kind, t: 0, acc: 0, ang: Math.random() * 6, rows: 3, gx: rnd(80, W - 80), next: 0, n: 3 };
          }
          return;
        }
        if ((e.cd -= dt) <= 0) { e.charge = 0.9; audio.tone(300, 0.8, 'sine', 0.06, 900); }
      } else if (e.type === 'yeti') yetiUpdate(e, dt);
    }
    function fireTurret(e) {
      const left = enemies.filter(o => o.type === 'turret').length, hard = left <= 2;
      const kind = e.n++ % 3, x = e.x + Math.cos(e.aim) * 24, y = e.y + Math.sin(e.aim) * 24;
      if (kind === 0) for (let k = hard ? -2 : -1; k <= (hard ? 2 : 1); k++) orb(x, y, e.aim + k * 0.26, 115);
      if (kind === 1) { const n = hard ? 14 : 11, off = Math.random(); for (let k = 0; k < n; k++) orb(e.x, e.y, off + k / n * 6.283, 82, 6, C.violet); }
      if (kind === 2) { e.burst = hard ? 5 : 4; e.bt = 0; }
      e.cd = rnd(2.6, 3.6) - (4 - left) * 0.25;
      blip(240, 0.12, 'square', 0.05, 120);
    }

    function damage(e, n) {
      if (!e.hittable || e.dead) return;
      e.hp -= n; e.flash = 0.07;
      if (e.type === 'eye') fort.eyeFlash = 0.07;
      if (e.hp <= 0) kill(e);
    }
    function kill(e) {
      e.dead = true; addScore(e.pts); pop(e.x, e.y - 10, '+' + e.pts, C.gold, e.big ? 18 : 13);
      if (e.type === 'bat' || e.type === 'drone') {
        snowBurst(e.x, e.y, e.gold ? 26 : 14, e.gold ? C.gold : C.ice);
        audio.tone(rnd(700, 900), 0.12, 'triangle', 0.09, 1600);
        if (e.drop) spawnPower(e.x, e.y, e.drop); else if (Math.random() < (e.type === 'drone' ? 0.45 : 0.14)) spawnGift(e.x, e.y);
      }
      if (e.type === 'turret') {
        snowBurst(e.x, e.y, 34, C.gold, 220); bigShake(10, 300); sfx('boom'); fort.rubble.push({ x: e.x, oy: e.oy });
        spawnGift(e.x, e.y + 10);
        const left = enemies.filter(o => o.type === 'turret' && !o.dead).length;
        if (left) say(`Turm geschafft! Noch ${left}.`, 1.6);
      }
      if (e.type === 'eye') {
        ebulToSparkle(); fort.broken = true; bigShake(20, 700); sfx('boom'); flash = 0.7; flashC = '#fff';
        for (let i = 0; i < 6; i++) ctx.timeout(() => { snowBurst(rnd(110, 250), fort.y + rnd(20, 110), 26, i % 2 ? C.ice : '#fff', 240); audio.noise(0.3, 0.15); }, i * 140);
        for (let i = 0; i < 5; i++) spawnGift(rnd(120, 240), fort.y + rnd(80, 120));
        e.gone = true; ctx.timeout(() => { if (mode === 'play' && phase === 2) phaseClear(); }, 1600);
        e.dead = false; e.gone = true;
      }
      if (e.type === 'yeti') { e.dead = false; yetiBeaten(e); }
    }
    function yetiBeaten(e) {
      e.st = 'beaten'; e.hittable = false; e.atk = null; e.mood = 'dizzy'; e.arms = 0;
      ebulToSparkle(); flash = 0.8; flashC = '#fff'; bigShake(22, 800); sfx('boom'); music.stop();
      for (let i = 0; i < 8; i++) ctx.timeout(() => { snowBurst(e.x + rnd(-70, 70), e.y + rnd(-60, 70), 22, [C.ice, C.gold, '#fff'][i % 3], 220); audio.noise(0.3, 0.12); }, i * 120);
      anim = { name: 'beaten', t: 0, dur: 2 }; mode = 'anim';
    }

    // ---------- Items ----------
    function spawnGift(x, y) { items.push({ kind: 'gift', x, y, vy: 55, c: GIFT_COLORS[Math.floor(Math.random() * 5)], rot: rnd(-0.3, 0.3), t: 0 }); }
    function spawnPower(x, y, p) { if (p === 'heart' && hearts >= 5) p = 'shield'; items.push({ kind: 'pw', p, x, y, x0: x, vy: 48, t: 0 }); }
    function collect(it) {
      if (it.kind === 'gift') { gifts++; addScore(50); pop(it.x, it.y, '+50'); audio.tone(1047, 0.06, 'square', 0.07); audio.tone(1568, 0.1, 'square', 0.06, null, 0.06); snowBurst(it.x, it.y, 6, it.c, 70); }
      else {
        sfx('power'); snowBurst(it.x, it.y, 14, A.POWER[it.p].color, 120);
        if (it.p === 'double' || it.p === 'spread') { power = it.p; powerT = 15; pop(P.x, P.y - 34, it.p === 'double' ? 'Doppelschuss!' : 'Fächerschuss!', A.POWER[it.p].color, 15); }
        if (it.p === 'shield') { shield = 14; pop(P.x, P.y - 34, 'Schutzschild!', C.green, 15); }
        if (it.p === 'heart') { if (hearts < 5) { hearts++; pop(P.x, P.y - 34, 'Herz +1', C.red, 15); } else { addScore(500); pop(P.x, P.y - 34, '+500', C.gold, 15); } }
      }
    }

    // ---------- Spieler ----------
    function fire() {
      const x = P.x, y = P.y - 20; P.n++;
      const add = (sx, a) => shots.push({ x: sx, y, vx: Math.sin(a) * 560, vy: -Math.cos(a) * 560 });
      if (power === 'double') { add(x - 7, 0); add(x + 7, 0); P.fire = 0.1; }
      else if (power === 'spread') { for (const a of [-0.3, -0.15, 0, 0.15, 0.3]) add(x, a); P.fire = 0.15; }
      else { add(x + (P.n % 2 ? 3 : -3), 0); P.fire = 0.11; }
      if ((shotSnd = (shotSnd + 1) % 3) === 0) audio.tone(900, 0.04, 'triangle', 0.025, 600);
    }
    function hurt() {
      if (GOD || inv > 0 || mode !== 'play') return;
      for (const b of ebul) if (b.type === 'orb' && d2(b.x, b.y, P.x, P.y) < 70 * 70) { b.dead = true; snowBurst(b.x, b.y, 3, C.ice, 50); }
      if (shield > 0) { shield = 0; inv = 1; sfx('pop'); snowBurst(P.x, P.y, 20, C.green, 160); pop(P.x, P.y - 30, 'Schild weg!', C.green); return; }
      hearts--; inv = 1.5; flash = 0.35; flashC = C.red; bigShake(10, 300); sfx('hit');
      snowBurst(P.x, P.y, 16, C.red, 140);
      if (hearts <= 0) { mode = 'down'; downT = 0; music.stop(); sfx('lose'); snowBurst(P.x, P.y, 30, '#fff', 200); }
    }
    function lawine() {
      if (mode !== 'play' || lawinen <= 0 || lawFx > 0) return;
      lawinen--; lawFx = 1.2; inv = Math.max(inv, 1.3); flash = 0.55; flashC = '#fff'; bigShake(14, 500);
      sfx('boom'); audio.noise(1.2, 0.2); audio.tone(200, 1, 'sawtooth', 0.08, 40);
      let n = 0;
      for (const b of ebul) { if (b.type === 'ice' && b.t > b.fall) continue; snowBurst(b.x, b.y, 3, C.ice, 80); n++; }
      ebul = []; warns = [];
      if (n) { addScore(n * 10); pop(W / 2, H / 2, `+${n * 10}`, '#fff', 18); }
      for (const e of [...enemies]) if (e.hittable && e.y > -20) {
        damage(e, e.type === 'yeti' ? 14 : e.type === 'turret' || e.type === 'eye' ? 7 : 10);
        if (e.type === 'yeti' && e.st === 'fight') { e.stun = 1.6; e.atk = null; e.rest = 0.6; e.prevMood = e.mood; }
      }
      say('LAWINE!', 1.2);
    }

    // ---------- Eingabe ----------
    function setTarget(p) { P.tx = p.x; P.ty = p.y - dragOff; }
    function btnHit(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
    const SKIP = { x: W - 112, y: 8, w: 104, h: 40 };
    const LOST_BTNS = [{ x: 60, y: 300, w: 240, h: 54, act: 'retry' }, { x: 100, y: 372, w: 160, h: 44, act: 'quit' }];
    function tap(x, y) {
      if (mode === 'menu') { for (const b of menu.btns) if (btnHit(b, x, y)) { sfx('click'); b.fn(); } return true; }
      if (mode === 'story') { if (btnHit(SKIP, x, y)) advance(true); else advance(false); return true; }
      if (mode === 'lost') { for (const b of LOST_BTNS) if (btnHit(b, x, y)) { sfx('click'); b.act === 'retry' ? retry() : quit(); } return true; }
      if (mode === 'finale') { finale.tap(x, y); return true; }
      if (mode === 'play' && d2(x, y, LB.x, LB.y) < (LB.r + 10) ** 2) { lawine(); return true; }
      return false;
    }
    ctx.on(canvas, 'pointerdown', e => {
      e.preventDefault();
      const p = pos(e);
      if (tap(p.x, p.y)) return;
      if (mode === 'play' || mode === 'card' || mode === 'anim') {
        drag = e.pointerId; dragOff = e.pointerType === 'mouse' ? 18 : 62;
        try { canvas.setPointerCapture(e.pointerId); } catch {}
        setTarget(p);
      }
    });
    ctx.on(canvas, 'pointermove', e => { if (e.pointerId === drag) setTarget(pos(e)); });
    const endDrag = e => { if (e.pointerId === drag) { drag = null; P.tx = null; } };
    ctx.on(canvas, 'pointerup', endDrag); ctx.on(canvas, 'pointercancel', endDrag);
    ctx.input.onPress(n => {
      if (mode === 'story' && (n === 'a' || n === 'b')) return advance(n === 'b');
      if (mode === 'play' && (n === 'a' || n === 'b')) return lawine();
      if (mode === 'lost') { if (n === 'a') retry(); if (n === 'b') quit(); return; }
      if (mode === 'finale') return finale.key(n);
      if (mode === 'menu' && n === 'a') menu.btns[0].fn();
    });
    ctx.onPause(p => { if (p) drag = null; });

    function retry() { restarts++; tries[phase]++; startPhase(phase); }
    function quit() {
      music.stop();
      ctx.finish({ won: false, stars: 0, score, text: `Du bist bis Phase ${phase} gekommen. Keine Angst: Wenn du abstürzt, startest du nur die Phase neu. Versuch es nochmal!` });
    }
    function win() {
      music.stop();
      const stars = shortcut ? 1 : restarts === 0 ? 3 : restarts <= 3 ? 2 : 1;
      ctx.save('gewonnen', true);
      const txt = shortcut
        ? `Weihnachten ist gerettet! ${gifts} Geschenke eingesammelt. Für mehr Sterne spiel einmal komplett von Phase 1 an.`
        : stars === 3 ? `Ohne einen einzigen Neustart! Du bist eine echte Weihnachts-Legende. ${gifts} Geschenke eingesammelt.`
          : stars === 2 ? `Weihnachten ist gerettet, mit ${restarts} Neustart${restarts > 1 ? 's' : ''}. Ganz ohne Neustart gibt es 3 Sterne!`
            : `Weihnachten ist gerettet! Du hattest ${restarts} Neustarts. Mit höchstens 3 Neustarts gibt es 2 Sterne, ohne Neustart 3.`;
      ctx.finish({ won: true, stars, score, text: txt });
    }

    // ---------- Start ----------
    function beginStory() { shortcut = false; music.play('deck'); tell(INTRO, () => enterPhase(1)); }
    function openMenu() {
      const reached = ctx.load('phase', 1), won = ctx.load('gewonnen', false);
      const btns = [{ x: 50, y: 300, w: 260, h: 54, label: 'Von vorn! (bis 3 Sterne)', main: true, fn: beginStory }];
      if (reached >= 2) btns.push({ x: 50, y: 368, w: 260, h: 46, label: `Weiter ab Phase ${reached} (1 Stern)`, fn: () => { shortcut = true; score = 0; gifts = 0; enterPhase(reached); } });
      if (won) btns.push({ x: 50, y: 426, w: 260, h: 46, label: 'Nur das Feuerwerk', fn: () => startFinale(true) });
      menu = { btns }; mode = 'menu';
    }
    function startFinale(only) {
      mode = 'finale'; music.play('jingle'); ebul = []; enemies = [];
      finale = createFinale({ g, W, H, audio, music, freeAfter: only ? 4 : 15, doneLabel: only ? 'Zurück' : 'Fertig!', onDone: () => { if (only) { music.stop(); finale = null; openMenu(); } else win(); } });
    }

    const jump = T.find(s => /^p[123]$|^fin$/.test(s));
    if (jump === 'fin') startFinale(false);
    else if (jump) enterPhase(Number(jump[1]));
    else if (ctx.load('phase', 1) >= 2 || ctx.load('gewonnen', false)) openMenu();
    else beginStory();
    hud();

    // ---------- Update ----------
    function update(dt) {
      time += dt; music.update(dt);
      shake = Math.max(0, shake - dt * 40); flash = Math.max(0, flash - dt * 1.6);
      if (caption && (caption.t -= dt) <= 0) caption = null;
      if (mode === 'finale') { finale.update(dt); return; }
      scroll += scrollSpeed * dt;
      for (const f of flakes) { f.y += (40 + storm * 160) * f.v * dt; f.x -= storm * 60 * f.v * dt; if (f.y > H) { f.y = -5; f.x = rnd(0, W + 80); } if (f.x < -10) f.x += W + 20; }

      if (mode === 'story') {
        story.t += dt; const L = story.lines[story.i];
        const before = Math.floor(story.ch); story.ch = Math.min(L.text.length, story.ch + dt * 42);
        if (Math.floor(story.ch) !== before && Math.floor(story.ch) % 3 === 0) blip(L.who === 'yeti' ? 160 : L.who === 'yetiFroh' ? 300 : 820, 0.03, 'square', 0.025);
        if (story.ch >= L.text.length && story.t > L.text.length / 42 + 5) advance(false);
      }
      const movable = mode === 'play' || mode === 'card' || (mode === 'anim' && anim.name === 'clear');
      if (movable) movePlayer(dt);
      if (mode === 'card') { card.t += dt; if (card.t > 2.3) { mode = 'play'; card = null; inv = 0; } }
      if (mode === 'down') { downT += dt; P.rot += dt * 9; P.y += 60 * dt; if (downT > 1.3) mode = 'lost'; }
      if (mode === 'anim') updateAnim(dt);

      if (mode === 'play') {
        phaseT += dt; inv = Math.max(0, inv - dt); lawFx = Math.max(0, lawFx - dt);
        if (shield > 0) shield -= dt;
        if (power && (powerT -= dt) <= 0) { power = null; pop(P.x, P.y - 30, 'Power-up vorbei', '#fff', 12); }
        if ((P.fire -= dt) <= 0) fire();
        if (phase === 1) updateP1(dt); else if (phase === 2) updateP2(dt); else updateP3(dt);
        if (lawFx > 0.4) { for (const b of ebul) if (b.type !== 'ice') b.dead = true; }
      }
      if (fort) {
        fort.y += (0 - fort.y) * Math.min(1, dt * 1.3);
        for (const e of enemies) if (e.type === 'turret') e.y = fort.y + e.oy;
        if (eye) eye.y = fort.y + 30;
      }
      // Gegner
      if (mode === 'play' || mode === 'anim') {
        for (const e of enemies) { if (e.delay > 0) { e.delay -= dt; continue; } e.t += dt; if (mode === 'play' || e.type === 'yeti') updateEnemy(e, dt); }
      }
      // Schüsse
      for (const s of shots) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.y < -12 || s.x < -12 || s.x > W + 12) { s.dead = true; continue; }
        for (const e of enemies) {
          if (!e.hittable || e.delay > 0 || e.dead || e.gone) continue;
          let hit;
          if (e.type === 'yeti') hit = ((s.x - e.x) / 70) ** 2 + ((s.y - e.y - 4) / 82) ** 2 < 1;
          else hit = d2(s.x, s.y, e.x, e.y) < (e.r + 4) ** 2;
          if (hit) {
            s.dead = true; damage(e, 1);
            if (Math.random() < 0.5) parts.push({ x: s.x, y: s.y, vx: rnd(-60, 60), vy: rnd(-30, 60), life: 0.25, max: 0.3, r: 2, c: '#fff' });
            if ((hitGate += 1) % 4 === 0) blip(e.type === 'yeti' ? 260 : 520, 0.03, 'square', 0.03);
            break;
          }
        }
        if (s.dead) continue;
        if (fort && !fort.broken && s.y < fort.y + 116) {
          s.dead = true; parts.push({ x: s.x, y: s.y, vx: rnd(-40, 40), vy: rnd(10, 60), life: 0.2, max: 0.2, r: 2, c: C.ice });
          if (mode === 'play' && phase === 2 && Math.abs(s.x - W / 2) < 40 && !fort.open && (pingGate -= 1) < 0) { pingGate = 60; say('Das Auge ist zu! Erst die Kanonentürme!', 1.8); }
        }
        for (const b of ebul) if (b.type === 'roll' && d2(s.x, s.y, b.x, b.y) < b.r * b.r) { s.dead = true; parts.push({ x: s.x, y: s.y, vx: rnd(-40, 40), vy: rnd(10, 60), life: 0.2, max: 0.2, r: 2, c: '#fff' }); break; }
      }
      shots = shots.filter(s => !s.dead);
      // Gegner-Geschosse
      for (const b of ebul) {
        b.t += dt;
        if (b.type === 'orb') { b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < -30 || b.x > W + 30 || b.y > H + 30 || b.y < -60) b.dead = true; if (mode === 'play' && d2(b.x, b.y, P.x, P.y) < (b.r * 0.75 + 4) ** 2) hurt(); }
        else if (b.type === 'roll') { b.y += b.vy * dt; b.rot += dt * 4; if (b.y > H + 40) b.dead = true; if (mode === 'play' && d2(b.x, b.y, P.x, P.y) < (b.r - 2) ** 2) hurt(); if (Math.random() < dt * 8) parts.push({ x: b.x + rnd(-14, 14), y: b.y - b.r, vx: 0, vy: -20, life: 0.4, max: 0.4, r: 2, c: '#fff' }); }
        else if (b.type === 'ice') {
          if (b.t >= b.fall && !b.hit) { b.hit = true; snowBurst(b.x, b.y, 12, C.ice, 140); audio.tone(rnd(1400, 1800), 0.12, 'triangle', 0.06, 500); shake = Math.max(shake, 3); }
          if (b.t >= b.fall && b.t < b.fall + 0.2 && mode === 'play' && d2(b.x, b.y, P.x, P.y) < (b.r - 2) ** 2) hurt();
          if (b.t > b.fall + 0.6) b.dead = true;
        }
      }
      ebul = ebul.filter(b => !b.dead);
      if (!(mode === 'play' || mode === 'anim')) { /* Gegner frieren in Story/Karte ein */ }
      // Körperkontakt
      if (mode === 'play') for (const e of enemies) {
        if (!e.hittable || e.delay > 0 || e.dead || e.gone || e.type === 'turret' || e.type === 'eye') continue;
        if (e.type === 'yeti') { if (((P.x - e.x) / 66) ** 2 + ((P.y - e.y) / 80) ** 2 < 1) hurt(); }
        else if (d2(e.x, e.y, P.x, P.y) < (e.r * 0.65 + 5) ** 2) { hurt(); damage(e, 3); }
      }
      enemies = enemies.filter(e => !e.dead && !e.gone);
      // Items
      for (const it of items) {
        it.t += dt;
        const dd = d2(it.x, it.y, P.x, P.y);
        if (it.magnet || (dd < 75 * 75 && (mode === 'play' || mode === 'anim'))) { const d = Math.sqrt(dd) || 1, sp = it.magnet ? 420 : 260; it.x += (P.x - it.x) / d * sp * dt; it.y += (P.y - it.y) / d * sp * dt; }
        else { it.y += it.vy * dt; if (it.kind === 'pw') it.x = it.x0 + Math.sin(it.t * 2) * 26; }
        if ((mode === 'play' || mode === 'anim') && dd < 26 * 26) { it.dead = true; collect(it); }
        if (it.y > H + 20) it.dead = true;
      }
      items = items.filter(it => !it.dead);
      for (const w of warns) w.t -= dt;
      warns = warns.filter(w => w.t > 0);
      for (const p of parts) { p.life -= dt; if (p.ring) continue; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 2.5; p.vy *= 1 - dt * 2.5; p.vy += 30 * dt; if (p.rot !== undefined) p.rot += p.vr * dt; }
      parts = parts.filter(p => p.life > 0);
      if (parts.length > 700) parts.splice(0, parts.length - 700);
      for (const p of pops) { p.life -= dt; p.y -= 30 * dt; }
      pops = pops.filter(p => p.life > 0);
    }
    function movePlayer(dt) {
      const ax = ctx.input.axis(), ox = P.x;
      if (ax.x || ax.y) { P.tx = null; P.x += ax.x * 250 * dt; P.y += ax.y * 250 * dt; }
      else if (P.tx != null) {
        const dx = P.tx - P.x, dy = P.ty - P.y, d = Math.hypot(dx, dy), m = Math.min(d, Math.max(d * dt * 16, 0), 900 * dt);
        if (d > 0.5) { P.x += dx / d * m; P.y += dy / d * m; }
      }
      const minY = phase === 2 && fort ? fort.y + 250 : phase === 3 ? 245 : 70;
      P.x = clamp(P.x, 16, W - 16); P.y = clamp(P.y, Math.max(70, minY), H - 26);
      if (dt > 0) P.tilt += (clamp((P.x - ox) / dt / 500, -0.35, 0.35) - P.tilt) * Math.min(1, dt * 10);
    }
    function updateAnim(dt) {
      const a = anim; a.t += dt;
      if (a.name === 'clear' && a.t >= a.dur) {
        anim = null;
        if (phase === 1) tell(TO2, () => enterPhase(2));
        else if (phase === 2) { music.play('boss'); tell(TO3, () => enterPhase(3)); }
      }
      if (a.name === 'beaten') {
        if (a.t >= a.dur) { anim = null; tell(END1, () => { anim = { name: 'gift', t: 0, dur: 3.4, sx: P.x, sy: P.y }; mode = 'anim'; }); }
      }
      if (a.name === 'gift') {
        if (a.t > 1.5 && !a.got) { a.got = true; boss.gift = true; boss.mood = 'dizzy'; sfx('pop'); }
        if (a.t > 2.3 && !a.opened) {
          a.opened = true; boss.gift = false; boss.scarf = true; boss.mood = 'happy'; boss.arms = 1; music.play('wish');
          snowBurst(boss.x, boss.y + 40, 40, C.gold, 260); snowBurst(boss.x, boss.y + 40, 30, C.red, 200); flash = 0.4; flashC = C.gold;
          for (let i = 0; i < 8; i++) ctx.timeout(() => pops.push({ x: boss.x + rnd(-60, 60), y: boss.y + rnd(-60, 20), str: '♥', color: C.pink, size: 22, life: 1.4 }), i * 120);
        }
        if (a.t >= a.dur) { anim = null; tell(END2, () => { anim = { name: 'giveback', t: 0, dur: 3.2, fly: [] }; mode = 'anim'; }); }
      }
      if (a.name === 'giveback') {
        boss.arms = 0.5 + Math.sin(a.t * 8) * 0.5;
        if (a.t < 2.2 && Math.random() < dt * 22) a.fly.push({ x: boss.x + rnd(-40, 40), y: boss.y + 20, vx: rnd(-160, 160), vy: rnd(-260, -120), c: GIFT_COLORS[Math.floor(Math.random() * 5)], r: rnd(-1, 1), done: false });
        for (const f of a.fly) { f.vy += 420 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += dt * 4; if (!f.done && f.y > H - 60) { f.done = true; gifts++; score += 50; hud(); if (Math.random() < 0.3) audio.tone(1300 + Math.random() * 600, 0.05, 'square', 0.04); } }
        if (a.t >= a.dur && !a.fade) { a.fade = true; addScore(hearts * 1000 + lawinen * 500); }
        if (a.t >= a.dur + 1.1) { anim = null; startFinale(false); }
      }
    }

    // ---------- Zeichnen ----------
    function drawBg() {
      if (phase === 3) return drawHall();
      g.fillStyle = phase === 1 ? '#122049' : '#16285a'; g.fillRect(0, 0, W, H);
      const span = H + 120;
      if (phase === 1) {
        g.fillStyle = 'rgba(160,190,240,.06)';
        for (let i = 0; i < 6; i++) { const y = ((i * 140 + scroll * 0.6) % (span + 100)) - 100; g.beginPath(); g.ellipse((i * 97) % W, y, 90, 40, 0.3, 0, 6.3); g.fill(); }
        for (const d of decor) {
          const y = ((d.y + scroll) % span) - 60;
          if (d.k === 'tree') { A.star(g, d.x, y + 3, d.s + 2, 'rgba(0,0,0,.25)'); A.star(g, d.x, y, d.s, '#14533f'); A.star(g, d.x, y, d.s * 0.5, '#cfe6f5', 0.6); }
          else if (d.k === 'rock') { A.circle(g, d.x, y, d.s * 0.7, '#22346a'); A.circle(g, d.x - 2, y - 2, d.s * 0.45, '#dbe9f7'); }
          else { g.fillStyle = '#efe7ff'; g.fillRect(d.x - 12, y - 9, 24, 18); g.fillStyle = '#6a2b48'; g.fillRect(d.x - 12, y - 1, 24, 2); g.fillStyle = C.gold; g.globalAlpha = 0.25; A.circle(g, d.x + 15, y + 2, 7, C.gold); g.globalAlpha = 1; g.fillRect(d.x + 12, y - 1, 4, 4); }
        }
      } else {
        g.strokeStyle = 'rgba(180,220,255,.18)'; g.lineWidth = 1.5;
        for (const c of cracks) { const y = ((c.y + scroll) % span) - 60; g.beginPath(); g.moveTo(c.x, y); g.lineTo(c.x + Math.cos(c.a) * c.l, y + Math.sin(c.a) * c.l); g.lineTo(c.x + Math.cos(c.a + 0.7) * c.l * 1.6, y + Math.sin(c.a + 0.7) * c.l * 1.6); g.stroke(); }
        for (const d of decor) { if (d.k !== 'rock') continue; const y = ((d.y * 1.3 + scroll) % span) - 60; A.circle(g, d.x, y, d.s * 0.8, '#c9e0f5'); A.circle(g, d.x - 3, y - 3, d.s * 0.5, '#fff'); }
      }
    }
    function drawHall() {
      g.fillStyle = '#17275a'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(160,200,255,.08)'; g.lineWidth = 1;
      for (let y = 30; y < H; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (let x = 0; x < W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      const gr = g.createLinearGradient(0, 0, 0, 230); gr.addColorStop(0, '#5f86b8'); gr.addColorStop(1, 'rgba(95,134,184,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, 230);
      for (const sx of [14, W - 14]) for (let y = 30; y < H; y += 130) { A.circle(g, sx, y, 18, '#7da6d3'); A.circle(g, sx, y, 12, '#bfe3f5'); }
      // Geschenke-Haufen hinter dem Yeti
      for (let i = 0; i < 9; i++) A.drawGift(g, 70 + i * 28, 30 + (i % 3) * 9, 20, GIFT_COLORS[i % 5], (i - 4) * 0.08);
    }
    function drawPlayer() {
      if (mode === 'finale' || mode === 'lost' || mode === 'menu') return;
      if (inv > 0 && mode === 'play' && Math.floor(time * 16) % 2) g.globalAlpha = 0.35;
      A.drawSleigh(g, P.x, P.y, time, { rot: P.tilt + P.rot });
      g.globalAlpha = 1;
      if (shield > 0) {
        const blink = shield < 3 && Math.floor(time * 8) % 2;
        if (!blink) { g.globalAlpha = 0.25; A.circle(g, P.x, P.y, 28, C.green); g.globalAlpha = 1; g.strokeStyle = C.green; g.lineWidth = 2; g.beginPath(); g.arc(P.x, P.y, 28, time * 3, time * 3 + 4.5); g.stroke(); }
      }
      if (mode === 'play') { A.circle(g, P.x, P.y + 1, 4.5, C.red); A.circle(g, P.x, P.y + 1, 2.4, '#fff'); }
    }
    function drawEnemies() {
      if (fort) {
        A.drawFortress(g, fort.y, time, W, fort);
        for (const r of fort.rubble) A.drawRubble(g, r.x, fort.y + r.oy, time);
      }
      for (const e of enemies) {
        if (e.delay > 0) continue;
        if (e.type === 'bat') A.drawBat(g, e.x, e.y, e.t, { gold: e.gold, flash: e.flash, glow: e.glow > 0, seed: e.seed });
        else if (e.type === 'drone') A.drawDrone(g, e.x, e.y, e.t, { charge: e.charge > 0 ? 1 - e.charge / 0.8 : 0, flash: e.flash });
        else if (e.type === 'turret') A.drawTurret(g, e.x, e.y, time, { aim: e.aim, charge: e.charge > 0 ? e.charge / 0.95 : 0, flash: e.flash, hp: e.hp, maxHp: e.maxHp });
        else if (e.type === 'yeti') A.drawYeti(g, e.x, e.y, time, { mood: e.stun > 0 ? 'dizzy' : e.mood, arms: e.arms, mouth: e.mouth, flash: e.flash, squash: e.squash, look: clamp((P.x - e.x) / 100, -1, 1), scarf: e.scarf, gift: e.gift });
      }
    }
    function drawEbul() {
      for (const w of warns) if (w.type === 'gap') {
        const k = Math.sin(time * 20) > 0 ? 1 : 0.5;
        g.globalAlpha = 0.18 * k; g.fillStyle = C.green; g.fillRect(w.x - w.w / 2, 0, w.w, H); g.globalAlpha = k;
        for (let y = 260; y < H; y += 90) { g.fillStyle = C.green; g.beginPath(); g.moveTo(w.x - 12, y); g.lineTo(w.x + 12, y); g.lineTo(w.x, y + 14); g.fill(); }
        A.text(g, 'LÜCKE!', w.x, 245, 14, C.green); g.globalAlpha = 1;
      }
      for (const b of ebul) {
        if (b.type === 'orb') A.drawOrb(g, b.x, b.y, b.r, b.color, b.t);
        else if (b.type === 'roll') A.drawBigBall(g, b.x, b.y, b.r, b.rot);
        else if (b.type === 'ice') {
          const k = Math.min(1, b.t / b.fall);
          if (b.t < b.fall) {
            g.fillStyle = `rgba(5,9,31,${0.25 + k * 0.35})`; g.beginPath(); g.ellipse(b.x, b.y, b.r * (0.4 + 0.6 * k), b.r * 0.55 * (0.4 + 0.6 * k), 0, 0, 6.3); g.fill();
            g.strokeStyle = C.red; g.globalAlpha = 0.5 + 0.5 * Math.sin(b.t * (10 + k * 20)); g.lineWidth = 2.5;
            g.beginPath(); g.ellipse(b.x, b.y, b.r, b.r * 0.55, 0, 0, 6.3); g.stroke(); g.globalAlpha = 1;
            const fallT = b.fall - b.t;
            if (fallT < 0.4) { const yy = b.y - fallT / 0.4 * 320; g.fillStyle = '#e6f6ff'; g.beginPath(); g.moveTo(b.x - 8, yy - 40); g.lineTo(b.x + 8, yy - 40); g.lineTo(b.x, yy); g.fill(); g.fillStyle = '#9fd5ee'; g.beginPath(); g.moveTo(b.x, yy - 40); g.lineTo(b.x + 8, yy - 40); g.lineTo(b.x, yy); g.fill(); }
          } else {
            const q = (b.t - b.fall) / 0.6; g.globalAlpha = 1 - q; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, b.r * (0.6 + q), 0, 6.3); g.stroke(); g.globalAlpha = 1;
          }
        }
      }
    }
    function drawParts() {
      for (const p of parts) {
        const a = Math.max(0, p.life / p.max);
        if (p.ring) { g.globalAlpha = a; g.strokeStyle = p.c; g.lineWidth = 3 * a; g.beginPath(); g.arc(p.x, p.y, p.r * (1.6 - a), 0, 6.3); g.stroke(); continue; }
        g.globalAlpha = Math.min(1, a * 1.5);
        if (p.flake) A.flake(g, p.x, p.y, p.r, p.c, p.rot, 1.4); else A.circle(g, p.x, p.y, p.r * 0.6, p.c);
      }
      g.globalAlpha = 1;
      for (const p of pops) { g.globalAlpha = Math.min(1, p.life * 2); A.text(g, p.str, p.x, p.y, p.size, p.color); }
      g.globalAlpha = 1;
    }
    function drawHud() {
      for (let i = 0; i < 5; i++) A.heart(g, 16 + i * 21, 18, 19, i < hearts ? C.red : 'rgba(255,255,255,.18)', i < hearts ? '#fff' : null);
      A.drawGift(g, 18, 42, 14, C.green); A.text(g, `${gifts}`, 31, 43, 13, '#fff', 'left');
      if (power) { const pc = A.POWER[power]; A.text(g, pc.label, 64, 43, 11, pc.color, 'left'); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(64, 51, 50, 3); g.fillStyle = pc.color; g.fillRect(64, 51, 50 * powerT / 15, 3); }
      if (phase === 1 && mode === 'play') {
        const k = clamp(phaseT / 90, 0, 1);
        g.fillStyle = 'rgba(255,255,255,.15)'; A.rr(g, 130, 12, 150, 8, 4); g.fill(); g.fillStyle = C.ice; A.rr(g, 130, 12, 150 * k, 8, 4); g.fill();
        A.drawSleigh(g, 130 + 150 * k, 16, time, { scale: 0.32, noFlame: true });
        A.text(g, 'Festung', 312, 16, 10, '#cfe0ff');
      }
      if (phase === 2 && mode === 'play' && fort) {
        const left = enemies.filter(e => e.type === 'turret').length;
        if (left) A.text(g, `Türme: ${left}`, W - 12, 18, 13, C.gold, 'right');
        else if (eye && fort.open) bossBar('TOR-AUGE', eye.hp / eye.maxHp, C.violet);
      }
      if (boss && boss.st === 'fight') bossBar('GRUMMEL-YETI', boss.hp / boss.maxHp, boss.stage === 3 ? C.red : boss.stage === 2 ? '#ff9f43' : C.gold);
      // Lawinen-Knopf
      if (mode === 'play' || mode === 'card') {
        const on = lawinen > 0;
        g.globalAlpha = on ? 1 : 0.35;
        A.circle(g, LB.x, LB.y, LB.r + 4, 'rgba(142,202,230,.25)');
        A.circle(g, LB.x, LB.y, LB.r, '#2b5c9e'); g.strokeStyle = C.ice; g.lineWidth = 2.5; g.beginPath(); g.arc(LB.x, LB.y, LB.r, 0, 6.3); g.stroke();
        A.flake(g, LB.x, LB.y - 4, 12, '#fff', time * 0.5, 2.2);
        A.text(g, 'LAWINE', LB.x, LB.y + 15, 8, '#fff');
        A.circle(g, LB.x + 20, LB.y - 20, 10, C.gold); A.text(g, `${lawinen}`, LB.x + 20, LB.y - 19.5, 12, '#3a2400', 'center', null);
        if (!touch) A.text(g, 'Leertaste', LB.x, LB.y - 38, 9, '#cfe0ff');
        g.globalAlpha = 1;
      }
    }
    function bossBar(name, k, color) {
      A.text(g, name, W - 12, 14, 11, '#fff', 'right');
      g.fillStyle = 'rgba(5,9,31,.7)'; A.rr(g, 122, 22, W - 134, 11, 5); g.fill();
      g.fillStyle = color; A.rr(g, 124, 24, Math.max(0, (W - 138) * k), 7, 3.5); g.fill();
    }
    function drawLawine() {
      if (lawFx <= 0) return;
      const k = 1 - lawFx / 1.2, y = H - k * (H + 160);
      g.fillStyle = 'rgba(240,248,255,.85)';
      g.beginPath(); g.moveTo(0, H); g.lineTo(0, y + 40);
      for (let x = 0; x <= W; x += 30) g.quadraticCurveTo(x + 15, y + Math.sin(x + time * 10) * 12, x + 30, y + 40);
      g.lineTo(W, H); g.fill();
      g.globalAlpha = 0.5; g.fillStyle = '#fff'; g.fillRect(0, y + 40, W, H); g.globalAlpha = 1;
      for (let i = 0; i < 10; i++) A.flake(g, (i * 43 + time * 60) % W, y + 20 + (i % 3) * 14, 7, C.ice, time * 2 + i);
    }
    function drawStory() {
      const L = story.lines[story.i], name = NAMES[L.who];
      const bx = 10, by = H - 150, bw = W - 20, bh = 138;
      g.fillStyle = 'rgba(5,9,31,.55)'; g.fillRect(0, 0, W, H);
      if (L.who === 'yeti' && !boss) { // der Yeti lugt herein
        g.save(); g.translate(W / 2, 170 + Math.sin(time * 2) * 6); g.scale(0.9, 0.9); A.drawYeti(g, 0, 0, time, { mood: 'angry', arms: 0.7 + Math.sin(time * 5) * 0.2 }); g.restore();
        for (let i = 0; i < 5; i++) A.drawGift(g, W / 2 - 80 + i * 40, 250 + Math.sin(time * 3 + i) * 4, 22, GIFT_COLORS[i], Math.sin(time * 2 + i) * 0.2);
      }
      g.fillStyle = 'rgba(11,20,55,.94)'; A.rr(g, bx, by, bw, bh, 16); g.fill();
      const nameC = L.who.startsWith('yeti') ? C.ice : L.who === 'wichtel' ? C.green : C.gold;
      g.strokeStyle = nameC; g.lineWidth = 2.5; g.stroke();
      let tx = bx + 16;
      if (L.who !== 'erz') { A.portrait(g, L.who, bx + 36, by + 36, time); tx = bx + 66; A.text(g, name, tx, by + 22, 14, nameC, 'left'); }
      // Text mit Umbruch
      g.font = `bold 15px ${A.FONT}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff';
      const shown = L.text.slice(0, Math.floor(story.ch)), words = L.text.split(' ');
      let line = '', y = by + (L.who === 'erz' ? 36 : 48), count = 0;
      const maxW = bx + bw - 14 - tx, lines = [];
      for (const wd of words) { const test = line ? line + ' ' + wd : wd; if (g.measureText(test).width > maxW && line) { lines.push(line); line = wd; } else line = test; }
      lines.push(line);
      for (const ln of lines) { const vis = shown.slice(count, count + ln.length); g.fillText(vis, tx, y); count += ln.length + 1; y += 21; }
      if (story.ch >= L.text.length) { g.globalAlpha = 0.5 + 0.5 * Math.sin(time * 6); A.text(g, touch ? 'Tippen ▸' : 'Klick / Leertaste ▸', bx + bw - 14, by + bh - 14, 11, C.gold, 'right'); g.globalAlpha = 1; }
      // Überspringen
      g.fillStyle = 'rgba(11,20,55,.85)'; A.rr(g, SKIP.x, SKIP.y + 6, SKIP.w, 28, 14); g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.stroke();
      A.text(g, 'Überspringen ▸▸', SKIP.x + SKIP.w / 2, SKIP.y + 20, 11, '#fff', 'center', null);
    }
    function drawCard() {
      const t = card.t, k = t < 0.35 ? t / 0.35 : t > 1.9 ? Math.max(0, 1 - (t - 1.9) / 0.4) : 1;
      g.save(); g.globalAlpha = k;
      g.fillStyle = 'rgba(5,9,31,.7)'; g.fillRect(0, 190, W, 140);
      g.fillStyle = C.gold; g.fillRect(0, 190, W, 3); g.fillRect(0, 327, W, 3);
      for (let i = 0; i < 12; i++) A.flake(g, ((i * 37 + t * 80) % (W + 40)) - 20, 205 + (i % 2) * 110, 5, C.ice, t + i);
      const slide = (1 - Math.min(1, t / 0.35)) * 120;
      A.text(g, card.title, W / 2 - slide, 240, 22, C.ice);
      A.text(g, card.sub, W / 2 + slide, 280, 36, '#fff');
      if (card.extra) A.text(g, card.extra, W / 2, 314, 13, C.gold);
      g.restore();
    }
    function drawLost() {
      g.fillStyle = 'rgba(5,9,31,.78)'; g.fillRect(0, 0, W, H);
      A.text(g, 'Bruchlandung!', W / 2, 170, 32, C.ice);
      A.drawSleigh(g, W / 2, 228, time, { rot: Math.PI * 0.9 + Math.sin(time * 3) * 0.2, noFlame: true });
      A.text(g, `Keine Sorge: Du startest wieder bei Phase ${phase}.`, W / 2, 266, 13, '#fff');
      for (const b of LOST_BTNS) {
        const main = b.act === 'retry';
        A.rr(g, b.x, b.y, b.w, b.h, b.h / 2); g.fillStyle = main ? C.gold : 'rgba(255,255,255,.12)'; g.fill();
        if (main) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
        A.text(g, main ? `Nochmal! (Phase ${phase})` : 'Aufhören', W / 2, b.y + b.h / 2 + 1, main ? 19 : 14, main ? '#3a2400' : '#fff', 'center', null);
      }
      A.text(g, `Neustarts bisher: ${restarts}`, W / 2, 450, 12, '#cfe0ff');
      A.text(g, restarts < 3 ? `Bis 3 Neustarts gibt es noch 2 Sterne.` : 'Weiter so, du schaffst das!', W / 2, 470, 12, '#cfe0ff');
    }
    function drawMenu() {
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#060c26'); sky.addColorStop(1, '#1d2b6b');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.save(); g.translate(W / 2, 175 + Math.sin(time * 2) * 5); g.scale(0.8, 0.8); A.drawYeti(g, 0, 0, time, { mood: 'angry', arms: 0.3 + 0.3 * Math.sin(time * 3) }); g.restore();
      A.drawSleigh(g, 70 + Math.sin(time) * 10, 250, time, { rot: 0.3 });
      A.text(g, 'Rettet Weihnachten!', W / 2, 48, 28, C.gold);
      A.text(g, 'Das große Finale', W / 2, 78, 15, C.ice);
      for (const b of menu.btns) {
        A.rr(g, b.x, b.y, b.w, b.h, b.h / 2); g.fillStyle = b.main ? C.gold : 'rgba(255,255,255,.12)'; g.fill();
        g.strokeStyle = b.main ? '#fff' : 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.stroke();
        A.text(g, b.label, W / 2, b.y + b.h / 2 + 1, b.main ? 17 : 14, b.main ? '#3a2400' : '#fff', 'center', null);
      }
      for (const f of flakes) A.circle(g, f.x, f.y, f.r, 'rgba(255,255,255,.7)');
    }
    function drawAnimOverlay() {
      if (!anim) return;
      if (anim.name === 'clear') {
        const k = Math.min(1, anim.t * 3);
        g.globalAlpha = k; A.text(g, 'PHASE GESCHAFFT!', W / 2, 220, 30, C.gold);
        A.text(g, `Bonus +${anim.bonus}`, W / 2, 258, 18, '#fff'); g.globalAlpha = 1;
      }
      if (anim.name === 'gift' && !anim.got) {
        const k = Math.min(1, anim.t / 1.5), x = anim.sx + (boss.x - anim.sx) * k, y = anim.sy + (boss.y + 42 - anim.sy) * k - Math.sin(k * Math.PI) * 140;
        A.drawGift(g, x, y, 22 + k * 14, C.red, anim.t * 6);
        if (Math.random() < 0.5) parts.push({ x, y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.5, max: 0.5, r: 3, c: C.gold, flake: true, rot: 0, vr: 3 });
      }
      if (anim.name === 'giveback') {
        for (const f of anim.fly) if (!f.done) A.drawGift(g, f.x, f.y, 16, f.c, f.r);
        A.text(g, `Geschenke gerettet: ${gifts}`, W / 2, H - 30, 18, C.gold);
        if (anim.t > anim.dur) { g.globalAlpha = Math.min(1, (anim.t - anim.dur) / 1.1); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      }
    }

    function draw() {
      if (mode === 'finale') { finale.draw(); return; }
      if (mode === 'menu') { drawMenu(); return; }
      g.save();
      if (shake > 0) g.translate(rnd(-shake, shake) * 0.5, rnd(-shake, shake) * 0.5);
      drawBg();
      for (const it of items) { if (it.kind === 'gift') A.drawGift(g, it.x, it.y, 16, it.c, it.rot + Math.sin(it.t * 3) * 0.2); else A.drawPower(g, it.x, it.y, it.t, it.p); }
      drawEnemies();
      g.fillStyle = '#fff';
      for (const s of shots) { A.circle(g, s.x, s.y + 6, 2.5, 'rgba(142,202,230,.5)'); A.circle(g, s.x, s.y, 4, '#fff'); }
      drawPlayer();
      drawEbul();
      drawParts();
      for (const f of flakes) { if (storm > 0.6) { g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = f.r * 0.8; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x + storm * 6 * f.v, f.y - (4 + storm * 10) * f.v); g.stroke(); } else A.circle(g, f.x, f.y, f.r, 'rgba(255,255,255,.65)'); }
      drawLawine();
      g.restore();
      if (mode !== 'story' && mode !== 'lost') drawHud();
      if (caption && mode === 'play') { g.globalAlpha = Math.min(1, caption.t * 3, (caption.max - caption.t) * 6); A.text(g, caption.text, W / 2, 84, 17, '#fff'); g.globalAlpha = 1; }
      drawAnimOverlay();
      if (mode === 'card') drawCard();
      if (mode === 'story') drawStory();
      if (mode === 'lost') drawLost();
      if (flash > 0) { g.globalAlpha = Math.min(0.8, flash); g.fillStyle = flashC; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      canvas.dataset.zustand = `${mode}:${phase}`;
    }

    ctx.loop(dt => {
      const steps = SPEED;
      for (let i = 0; i < steps; i++) update(dt);
      draw();
      canvas.dataset.zustand = `${mode}:${phase}`;
    });

    return { destroy() { music.stop(); } };
  },
};
