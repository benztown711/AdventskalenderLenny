// Türchen 15: Kopfball-Duell (1-gegen-1-Fußball von der Seite, Turnier mit 3 Spielen)
export const howto = 'Pfeile (oder A/D) laufen, Pfeil hoch oder Leertaste springen, X schießt. Am Handy: die Knöpfe unter dem Feld. Schlage Schneemann, Pinguin und Yeti, dann gehört der Pokal dir!';

const W = 560, H = 340, GY = 292, GW = 42, SH = 10, GB = 820, GP = 1750;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const toward = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const PL = { speed: 228, acc: 3200, jump: 565, power: 1 };
const OPPS = [
  { name: 'Schneemann', kind: 'snow', speed: 118, acc: 1000, react: 0.36, jump: 0.35, power: 0.74, err: 46, stumble: 5, defend: 0.82, jumpV: 540 },
  { name: 'Pinguin', kind: 'peng', speed: 165, acc: 1900, react: 0.2, jump: 0.75, power: 0.92, err: 22, stumble: 0, defend: 0.77, jumpV: 555 },
  { name: 'Yeti', kind: 'yeti', speed: 210, acc: 2700, react: 0.09, jump: 0.95, power: 1, err: 8, stumble: 0, defend: 0.72, jumpV: 565 },
];
const ROUNDS = ['Viertelfinale', 'Halbfinale', 'Finale'];
const ROUND_SHORT = ['VF', 'HF', 'F'];

export default {
  create(ctx) {
    const { g } = ctx.makeCanvas(W, H);
    const au = ctx.audio;
    const R = Math.random;

    // ---------- Zustand ----------
    let time = 0, round = 0, totalGoals = 0, wins = 0, shake = 0, excite = 0, zoomT = 0, ts = 1, spawnT = 9, item = null;
    let opp = OPPS[0], lastHit = 0;
    const mk = isP => ({
      isP, x: 0, y: GY, vx: 0, vy: 0, f: isP ? 1 : -1, ground: true, kickT: -1, kickCd: 0, kickDone: false,
      jumpBuf: 0, kickBuf: 0, frozen: 0, sq: 1, walk: 0, cel: 0, ph: R() * 6,
    });
    const P = mk(true), A = mk(false);
    const ball = { x: 280, y: 110, vx: 0, vy: 0, r: 15, tr: 15, rot: 0, hold: true, chk: 0.9, px: 280, py: 110, trail: [] };
    const eff = { big: 0, ice: 0 };
    const gs = [{ h: 100, target: 100, t: 0 }, { h: 100, target: 100, t: 0 }];
    const m = { phase: 'intro', t: 3, cd: true, sp: 0, sa: 0, clock: 60, golden: false, banner: null, lastTick: 4, showMe: 6 };
    const ai = { t: 0, per: { x: 280, y: 100, vx: 0, vy: 0 }, err: 0, jumpWill: true, kickWill: true, stumbleIn: 4, stumbleLeft: 0 };
    const parts = [];
    const barY = i => GY - gs[i].h - SH;

    // Hintergrund-Daten
    const flakes = Array.from({ length: 46 }, () => ({ x: R() * W, y: R() * H, s: 0.8 + R() * 1.6, v: 18 + R() * 30, ph: R() * 6 }));
    const crowdCols = ['#ef476f', '#ffd166', '#06d6a0', '#8ecae6', '#c77dff', '#ffffff', '#f78c6b'];
    const crowd = [];
    for (let row = 0; row < 6; row++) for (let i = 0; i < 56; i++) crowd.push({ x: row % 2 * 5 + i * 10 + R() * 3, y: 128 + row * 17, c: crowdCols[(R() * 7) | 0], ph: R() * 6, hat: R() < 0.25 });
    const bg = document.createElement('canvas'); bg.width = W * 2; bg.height = H * 2;
    drawBackground(bg.getContext('2d'));

    // ---------- Töne ----------
    const whistle = (n = 1) => { for (let i = 0; i < n; i++) { au.tone(2500, 0.16, 'sine', 0.16, 2750, i * 0.26); au.tone(2650, 0.12, 'triangle', 0.09, 2450, i * 0.26 + 0.07); } };
    const thud = (v, head) => {
      if (time - lastHit < 0.07) return; lastHit = time;
      au.tone(head ? 280 : 160, 0.08, 'sine', Math.min(0.3, 0.04 + v / 2200), head ? 150 : 70);
    };
    ctx.interval(() => au.noise(0.9, 0.016 + excite * 0.05), 650);

    // ---------- Partikel ----------
    const add = o => { if (parts.length < 420) parts.push(o); };
    const puff = (x, y, n, c = '#fff', sp = 70) => { for (let i = 0; i < n; i++) add({ x, y, vx: (R() - 0.5) * sp * 2, vy: -R() * sp, g: 220, life: 0.4 + R() * 0.3, max: 0.7, c, s: 2 + R() * 3, t: 'd' }); };
    const conf = (x, y, n) => { for (let i = 0; i < n; i++) add({ x, y, vx: (R() - 0.5) * 440, vy: -R() * 430 - 80, g: 520, life: 1.8 + R(), max: 2.8, c: crowdCols[(R() * 7) | 0], s: 5 + R() * 4, t: 'r', rot: R() * 6, vr: (R() - 0.5) * 14 }); };
    const ring = (x, y, c) => add({ x, y, vx: 0, vy: 0, g: 0, life: 0.3, max: 0.3, c, s: 8, t: 'o' });
    const banner = (text, secs = 1.4, color = '#ffd166') => { m.banner = { text, t: secs, max: secs, color }; };

    // ---------- Aufbau ----------
    function kickoffReset(dur, countdown) {
      P.x = 150; A.x = 410;
      for (const p of [P, A]) { p.y = GY; p.vx = p.vy = 0; p.ground = true; p.kickT = -1; p.kickCd = 0; p.jumpBuf = p.kickBuf = 0; p.frozen = 0; p.cel = 0; p.sq = 1; }
      Object.assign(ball, { x: 280, y: 100, vx: 0, vy: 0, hold: true, chk: 1, px: 280, py: 100, trail: [] });
      ball.r = ball.tr = 15;
      eff.big = eff.ice = 0; item = null;
      for (const q of gs) { q.t = 0; q.target = 100; }
      m.phase = 'intro'; m.t = dur; m.cd = countdown; m.lastTick = 4;
    }
    function startMatch() {
      opp = OPPS[round];
      m.sp = m.sa = 0; m.clock = 60; m.golden = false; m.showMe = 6; spawnT = 8 + R() * 3;
      ai.stumbleIn = 3 + R() * 3; ai.stumbleLeft = 0;
      kickoffReset(3, true);
      banner(`${ROUNDS[round]} gegen ${opp.name}`, 2.2);
      hudSet();
    }
    function hudSet() { ctx.hud.set({ Tore: totalGoals, Runde: ROUND_SHORT[round], Sterne: wins }); }

    // ---------- Eingaben ----------
    ctx.input.pad({ dpad: 'lr', a: 'Sprung', b: 'Schuss' });
    ctx.input.onPress(n => {
      if (m.phase === 'goal' || m.phase === 'end') return;
      if (n === 'up' || n === 'a') P.jumpBuf = 0.13;
      if (n === 'b') P.kickBuf = 0.15;
    });

    // ---------- Physik: Figuren ----------
    function footPos(p) {
      const a = kickAngle(p);
      return { x: p.x + p.f * (Math.sin(a) * 20 + 4), y: p.y - 18 + Math.cos(a) * 10 };
    }
    function kickAngle(p) {
      const t = p.kickT;
      if (t < 0) return 0.25;
      if (t < 0.07) return lerp(0.25, -0.6, t / 0.07);
      if (t < 0.2) return lerp(-0.6, 1.5, (t - 0.07) / 0.13);
      return lerp(1.5, 0.25, clamp((t - 0.2) / 0.12, 0, 1));
    }
    function stepPlayer(p, inp, h) {
      const o = p.isP ? PL : opp;
      let dir = inp.dir;
      if (p.frozen > 0) { p.frozen -= h; dir = 0; p.jumpBuf = 0; p.kickBuf = 0; }
      const ice = eff.ice > 0;
      const ac = (ice ? o.acc * 0.16 : o.acc) * (p.ground ? 1 : 0.55);
      if (dir !== 0) p.vx = toward(p.vx, dir * o.speed, ac * h);
      else p.vx = toward(p.vx, 0, (ice ? 200 : p.ground ? 2800 : 300) * h);
      if (p.jumpBuf > 0) {
        p.jumpBuf -= h;
        if (p.ground) {
          p.vy = -(o.jumpV || PL.jump); p.ground = false; p.jumpBuf = 0; p.sq = 1.28;
          puff(p.x, GY, 4, '#fff', 40); if (p.isP) au.sfx('jump');
        }
      }
      if (p.cel > 0) { p.cel -= h; if (p.ground && p.cel > 0.2) { p.vy = -430; p.ground = false; p.sq = 1.2; } }
      p.vy += GP * h; p.y += p.vy * h;
      if (p.y >= GY) {
        if (!p.ground && p.vy > 260) { puff(p.x, GY, 6, '#fff', 60); p.sq = 0.78; }
        p.y = GY; p.vy = 0; p.ground = true;
      } else p.ground = false;
      p.x += p.vx * h;
      if (p.x < 26) { p.x = 26; p.vx = 0; } else if (p.x > W - 26) { p.x = W - 26; p.vx = 0; }
      if (ice && p.ground && Math.abs(p.vx) > 90 && R() < h * 14) add({ x: p.x, y: GY, vx: 0, vy: -10, g: 0, life: 0.35, max: 0.35, c: '#cdeeff', s: 2, t: 'd' });
      // Schuss
      if (p.kickT >= 0) {
        p.kickT += h;
        if (!p.kickDone && p.kickT > 0.04 && p.kickT < 0.24) tryKick(p);
        if (p.kickT > 0.34) { p.kickT = -1; p.kickCd = 0.16; }
      } else {
        p.kickCd -= h;
        if (p.kickBuf > 0) {
          p.kickBuf -= h;
          if (p.kickCd <= 0) { p.kickT = 0; p.kickDone = false; p.kickBuf = 0; }
        }
      }
      p.sq += (1 - p.sq) * Math.min(1, h * 12);
      p.walk += Math.abs(p.vx) * h * 0.06;
    }
    function tryKick(p) {
      if (ball.hold || m.phase !== 'play') return;
      const cx = p.x, cy = p.y - 26, dx = ball.x - cx, dy = ball.y - cy;
      if (Math.hypot(dx, dy) > 66 + (ball.r - 15)) return;
      let vx, vy;
      if (dx * p.f < -14) { vx = p.f * 0.35; vy = -0.94; }
      else { vx = p.f; vy = -(0.3 + 0.35 * clamp(dy / 30, -1, 1)); }
      let len = Math.hypot(vx, vy); vx /= len; vy /= len;
      if (!p.isP) { const a = (R() - 0.5) * 2 * (opp.err / 46) * 0.45, c = Math.cos(a), s = Math.sin(a); [vx, vy] = [vx * c - vy * s, vx * s + vy * c]; }
      const pw = 650 * (p.isP ? PL.power : opp.power);
      ball.vx = vx * pw + p.vx * 0.35; ball.vy = vy * pw; ball.hold = false; p.kickDone = true;
      const sp = Math.hypot(ball.vx, ball.vy); if (sp > 700) { ball.vx *= 700 / sp; ball.vy *= 700 / sp; }
      ring(ball.x, ball.y, '#ffd166'); puff(ball.x, ball.y, 7, '#fff', 90);
      au.tone(210, 0.1, 'square', 0.17, 90); au.noise(0.08, 0.14);
      if (p.isP) shake = Math.max(shake, 2);
    }
    function pushApart() {
      const dx = A.x - P.x;
      if (Math.abs(dx) < 36 && Math.abs(A.y - P.y) < 55) {
        const o = (36 - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1 || 1);
        P.x -= o; A.x += o;
        const t = (P.vx + A.vx) / 2; P.vx = lerp(P.vx, t, 0.5); A.vx = lerp(A.vx, t, 0.5);
        P.x = clamp(P.x, 26, W - 26); A.x = clamp(A.x, 26, W - 26);
      }
    }

    // ---------- Physik: Ball ----------
    function hitCircle(c, vx, vy, e, head, p) {
      const dx = ball.x - c.x, dy = ball.y - c.y, min = c.r + ball.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) return;
      let d = Math.sqrt(d2), nx, ny;
      if (d < 0.001) { nx = 0; ny = -1; d = 0; } else { nx = dx / d; ny = dy / d; }
      ball.x += nx * (min - d); ball.y += ny * (min - d);
      let rel = (ball.vx - vx) * nx + (ball.vy - vy) * ny;
      if (rel < 0) {
        ball.vx -= (1 + e) * rel * nx; ball.vy -= (1 + e) * rel * ny;
        if (-rel > 40) { thud(-rel, head); if (head && -rel > 120) { ball.vx += p.f * 80; puff(ball.x, ball.y, 3, '#fff', 40); } }
      }
      rel = (ball.vx - vx) * nx + (ball.vy - vy) * ny;
      if (rel < 110) { ball.vx += (110 - rel) * nx; ball.vy += (110 - rel) * ny; }
    }
    function hitRect(x0, y0, x1, y1, e) {
      const cx = clamp(ball.x, x0, x1), cy = clamp(ball.y, y0, y1);
      let dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy);
      if (d >= ball.r) return;
      let nx, ny;
      if (d < 0.001) { nx = 0; ny = -1; d = 0; } else { nx = dx / d; ny = dy / d; }
      ball.x += nx * (ball.r - d); ball.y += ny * (ball.r - d);
      const rel = ball.vx * nx + ball.vy * ny;
      if (rel < 0) { ball.vx -= (1 + e) * rel * nx; ball.vy -= (1 + e) * rel * ny; if (-rel > 60) thud(-rel, false); }
    }
    function stepBall(h) {
      ball.r += (ball.tr - ball.r) * Math.min(1, h * 6);
      if (ball.hold) { ball.y = 100 + Math.sin(time * 3) * 3; ball.x = 280; return; }
      ball.vy += GB * h; ball.x += ball.vx * h; ball.y += ball.vy * h;
      for (const p of [P, A]) {
        hitCircle({ x: p.x + p.f * 2, y: p.y - 56, r: 22 }, p.vx, p.vy, 0.9, true, p);
        hitCircle({ x: p.x, y: p.y - 24, r: 17 }, p.vx, p.vy, 0.8, false, p);
        const f = footPos(p); hitCircle({ x: f.x, y: f.y, r: 10 }, p.vx, p.vy, 0.8, false, p);
      }
      hitRect(0, barY(0), GW, barY(0) + SH, 0.7);
      hitRect(W - GW, barY(1), W, barY(1) + SH, 0.7);
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.8; }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.8; }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy) * 0.6; }
      if (ball.y > GY - ball.r) {
        ball.y = GY - ball.r;
        if (ball.vy > 0) { if (ball.vy > 120) { puff(ball.x, GY, 3, '#fff', 40); thud(ball.vy * 0.6, false); } ball.vy = ball.vy < 90 ? 0 : -ball.vy * 0.66; }
        ball.vx = toward(ball.vx, 0, (eff.ice > 0 ? 25 : 110) * h);
      }
      const sp = Math.hypot(ball.vx, ball.vy);
      if (sp > 700) { ball.vx *= 700 / sp; ball.vy *= 700 / sp; }
      ball.rot += ball.vx * h / ball.r;
    }
    function nudge() {
      ball.vy = -480; ball.vx = (280 - ball.x) * 0.7 + (R() - 0.5) * 140; ball.y = Math.min(ball.y, GY - ball.r - 4);
      puff(ball.x, ball.y + 8, 8, '#fff', 90); au.sfx('pop');
    }

    // ---------- Tore ----------
    function checkGoal() {
      if (m.phase !== 'play') return;
      if (ball.x < GW * 0.68 && ball.y > barY(0) + SH + 2) goal(false);
      else if (ball.x > W - GW * 0.68 && ball.y > barY(1) + SH + 2) goal(true);
    }
    function goal(byPlayer) {
      m.phase = 'goal'; m.t = 2.3;
      if (byPlayer) { m.sp++; totalGoals++; P.cel = 2; } else { m.sa++; A.cel = 2; }
      hudSet(); excite = 1; shake = 7; zoomT = 2.3;
      const gx = byPlayer ? W - 30 : 30;
      conf(gx, GY - 60, 60); ring(gx, GY - 40, '#ffd166');
      whistle(1); au.noise(2.4, 0.15); au.sfx(byPlayer ? 'level' : 'bad');
      ctx.fx.shake(); if (byPlayer) ctx.fx.confetti(40);
      banner(byPlayer ? 'TOOOR!' : 'Gegentor!', 2.0, byPlayer ? '#ffd166' : '#8ecae6');
      m.golden && (m.goldenWin = true);
    }
    function afterGoal() {
      if (m.golden) return endMatch();
      kickoffReset(1.3, false); banner('Anstoß!', 1.0);
    }
    function endMatch() {
      m.phase = 'end'; m.t = 2.6; P.kickBuf = P.jumpBuf = 0;
      const won = m.sp > m.sa;
      whistle(3);
      if (won) { P.cel = 2.4; conf(W / 2, 120, 80); au.sfx('level'); } else A.cel = 2.4;
      banner(`Abpfiff ${m.sp} : ${m.sa}`, 2.4, won ? '#06d6a0' : '#ef476f');
    }
    function advance() {
      if (m.sp > m.sa) {
        wins++; hudSet();
        if (round === 2) return finishAll(true);
        round++; startMatch();
      } else finishAll(false);
    }
    function finishAll(won) {
      const next = wins === 0 ? 'Gewinne das Viertelfinale für den ersten Stern.' : wins === 1 ? 'Für den zweiten Stern gewinne auch das Halbfinale, für den dritten das Finale.' : 'Gewinne auch das Finale gegen den Yeti für den dritten Stern.';
      ctx.finish({
        won, stars: wins, score: totalGoals,
        text: won ? `Turniersieger! Alle drei Spiele gewonnen, ${totalGoals} Tore geschossen.` : `Ausgeschieden im ${ROUNDS[round]} gegen ${opp.name} (${m.sp}:${m.sa}). ${next}`,
      });
    }

    // ---------- Items ----------
    const ITEM_TYPES = ['big', 'ice', 'freeze', 'mini', 'maxi'];
    function collect(p, type) {
      const o = p.isP ? A : P, mine = p.isP ? 0 : 1, theirs = p.isP ? 1 : 0;
      let text;
      if (type === 'big') { eff.big = 9; text = 'Riesenball!'; }
      else if (type === 'ice') { eff.ice = 8; text = 'Eis-Boden!'; }
      else if (type === 'freeze') { o.frozen = 2.2; text = p.isP ? 'Gegner eingefroren!' : 'Du bist eingefroren!'; ctx.fx.shake(); }
      else if (type === 'mini') { gs[mine].t = 10; gs[mine].target = 66; text = p.isP ? 'Dein Tor wird kleiner!' : 'Gegner-Tor wird kleiner!'; }
      else { gs[theirs].t = 10; gs[theirs].target = 138; text = p.isP ? 'Gegner-Tor wird größer!' : 'Dein Tor wird größer!'; }
      banner(text, 1.5, '#06d6a0'); au.sfx('power');
      for (let i = 0; i < 14; i++) add({ x: item.x, y: item.y, vx: (R() - 0.5) * 220, vy: (R() - 0.7) * 220, g: 200, life: 0.6, max: 0.6, c: '#ffd166', s: 3, t: 'd' });
      ring(item.x, item.y, '#fff'); item = null;
    }
    function updateItems(dt) {
      if (m.phase === 'play') {
        spawnT -= dt;
        if (spawnT <= 0 && !item) { item = { x: 120 + R() * 320, y: -20, vy: 40, type: ITEM_TYPES[(R() * 5) | 0], ttl: 8, landed: false }; spawnT = 9 + R() * 6; }
      }
      if (!item) return;
      if (!item.landed) { item.vy = Math.min(240, item.vy + 420 * dt); item.y += item.vy * dt; if (item.y >= GY - 20) { item.y = GY - 20; item.landed = true; puff(item.x, GY, 6, '#fff', 40); } }
      else if ((item.ttl -= dt) <= 0) { item = null; return; }
      for (const p of [P, A]) if (Math.hypot(p.x - item.x, p.y - 34 - item.y) < 44) { collect(p, item.type); return; }
    }

    // ---------- KI ----------
    function predictX(b) {
      let x = b.x, y = b.y, vx = b.vx, vy = b.vy;
      for (let i = 0; i < 40; i++) {
        vy += GB * 0.04; x += vx * 0.04; y += vy * 0.04;
        if (y > GY - 15) { y = GY - 15; vy = -vy * 0.66; }
        if (x < 15) { x = 15; vx = -vx * 0.8; } else if (x > W - 15) { x = W - 15; vx = -vx * 0.8; }
        if (i >= 3 && vy > 0 && y > GY - 80) return x;
      }
      return x;
    }
    function aiInput(dt) {
      const inp = { dir: 0 }, a = A, o = opp;
      ai.t -= dt;
      if (ai.t <= 0) {
        ai.t = o.react * (0.8 + R() * 0.4);
        ai.per = { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy };
        ai.err = (R() * 2 - 1) * o.err; ai.jumpWill = R() < o.jump; ai.kickWill = R() < 0.55 + 0.45 * o.jump;
      }
      if (m.phase === 'goal' || m.phase === 'end') return inp;
      if (o.stumble && m.phase === 'play') {
        ai.stumbleIn -= dt;
        if (ai.stumbleIn <= 0) { ai.stumbleLeft = 0.6; ai.stumbleIn = o.stumble + R() * 3; }
      }
      if (ai.stumbleLeft > 0) { ai.stumbleLeft -= dt; return inp; }
      if (ball.hold) { inp.dir = clamp((410 - a.x) / 30, -1, 1); return inp; }
      const per = ai.per, tx = predictX(per) + ai.err;
      const mySide = per.x > W * 0.46 || (per.vx > 80 && per.x > W * 0.3);
      let target;
      if (mySide) target = Math.min(W - 40, tx + 30);
      else {
        target = W * o.defend + (per.x - W * 0.5) * 0.15;
        if (item && item.landed && item.x > W * 0.4) target = item.x;
      }
      const dx = target - a.x;
      inp.dir = Math.abs(dx) < 8 ? 0 : clamp(dx / 40, -1, 1);
      const bdx = ball.x - a.x;
      if (a.ground && ai.jumpWill && Math.abs(bdx) < 70 && ball.y < GY - 90 && ball.y > a.y - 190 && ball.vy > -60) { a.jumpBuf = 0.1; ai.jumpWill = false; }
      if (ai.kickWill && a.kickT < 0 && a.kickCd <= 0 && bdx * a.f > -14 && Math.hypot(bdx, ball.y - (a.y - 26)) < 56 + (ball.r - 15)) { a.kickBuf = 0.1; }
      return inp;
    }

    // ---------- Update ----------
    function update(dt) {
      time += dt;
      shake = Math.max(0, shake - dt * 16); excite = Math.max(0, excite - dt * 0.3); m.showMe -= dt;
      if (m.banner && (m.banner.t -= dt) <= 0) m.banner = null;
      for (const f of flakes) { f.y += f.v * dt; f.x += Math.sin(time + f.ph) * 10 * dt; if (f.y > H) { f.y = -4; f.x = R() * W; } }
      m.t -= dt;
      ts = m.phase === 'goal' ? (m.t > 1.4 ? 0.28 : 0.28 + (1.4 - m.t) / 1.4 * 0.72) : 1;
      const sdt = dt * ts;

      // Phasen
      if (m.phase === 'intro') {
        if (m.cd) { const c = Math.ceil(m.t); if (c < m.lastTick && c >= 1 && c <= 3) { m.lastTick = c; au.sfx('tick'); } }
        if (m.t <= 0) { m.phase = 'play'; ball.hold = false; ball.vy = 30; whistle(1); banner('Los!', 0.8); }
      } else if (m.phase === 'play') {
        if (!m.golden) {
          m.clock -= sdt;
          if (m.clock <= 0) {
            m.clock = 0;
            if (m.sp !== m.sa) endMatch();
            else { m.golden = true; whistle(2); banner('Verlängerung: Golden Goal!', 2.2); }
          }
        }
        ball.chk -= sdt;
        if (ball.chk <= 0 && !ball.hold) {
          if (Math.hypot(ball.x - ball.px, ball.y - ball.py) < 16) nudge();
          ball.px = ball.x; ball.py = ball.y; ball.chk = 0.9;
        }
      } else if (m.phase === 'goal') { if (m.t <= 0) afterGoal(); }
      else if (m.phase === 'end') { if (m.t <= 0) { m.t = 99; advance(); return; } }

      // Effekte-Timer
      eff.big = Math.max(0, eff.big - sdt); eff.ice = Math.max(0, eff.ice - sdt);
      ball.tr = eff.big > 0 ? 24 : 15;
      for (const q of gs) { if (q.t > 0 && (q.t -= sdt) <= 0) q.target = 100; q.h += (q.target - q.h) * Math.min(1, dt * 4); }
      updateItems(sdt);

      // Eingaben
      const live = m.phase === 'play' || m.phase === 'intro';
      const inpP = { dir: live ? clamp(ctx.input.axis().x, -1, 1) : 0 };
      if (!live) { P.jumpBuf = P.kickBuf = 0; }
      const inpA = aiInput(sdt);
      const steps = Math.max(1, Math.ceil(sdt / 0.011)), h = sdt / steps;
      for (let i = 0; i < steps; i++) {
        stepPlayer(P, inpP, h); stepPlayer(A, inpA, h); pushApart(); stepBall(h);
        if (m.phase === 'play') { checkGoal(); if (m.phase !== 'play') break; }
      }
      // Ballspur
      if (Math.hypot(ball.vx, ball.vy) > 380) { ball.trail.push({ x: ball.x, y: ball.y, l: 0.25 }); }
      for (const t of ball.trail) t.l -= dt; while (ball.trail.length && ball.trail[0].l <= 0) ball.trail.shift();
      // Partikel
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= sdt; if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += p.g * sdt; p.x += p.vx * sdt; p.y += p.vy * sdt; if (p.rot !== undefined) p.rot += p.vr * sdt;
      }
      if (zoomT > 0) zoomT -= dt;
    }

    // ---------- Zeichnen ----------
    const circ = (x, y, r, f, s, lw = 2) => { g.beginPath(); g.arc(x, y, r, 0, TAU); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.lineWidth = lw; g.stroke(); } };
    const ell = (x, y, rx, ry, f, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fillStyle = f; g.fill(); };
    const text = (s, x, y, size, color, align = 'center', weight = 'bold') => {
      g.font = `${weight} ${size}px system-ui, "Segoe UI", sans-serif`; g.textAlign = align; g.textBaseline = 'middle';
      g.lineWidth = Math.max(3, size / 6); g.strokeStyle = 'rgba(5,10,35,.85)'; g.lineJoin = 'round'; g.strokeText(s, x, y);
      g.fillStyle = color; g.fillText(s, x, y);
    };

    function drawGoal(i, front) {
      const q = gs[i], top = barY(i);
      g.save();
      if (i === 1) { g.translate(W, 0); g.scale(-1, 1); }
      if (!front) {
        g.fillStyle = 'rgba(8,16,50,.45)'; g.fillRect(0, top + SH, GW, GY - top - SH);
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath();
        for (let x = 6; x < GW; x += 8) { g.moveTo(x, top + SH); g.lineTo(x, GY); }
        for (let y = top + SH + 8; y < GY; y += 9) { g.moveTo(0, y); g.lineTo(GW, y); }
        g.stroke();
      } else {
        const flash = m.phase === 'goal' && ((i === 1) === !!(m.sp > 0 && P.cel > 0)) ? 0.5 + 0.5 * Math.sin(time * 20) : 0;
        g.fillStyle = '#f4f9ff'; g.fillRect(0, top, GW + 2, SH);
        g.fillStyle = '#c7d7ea'; g.fillRect(0, top + SH - 3, GW + 2, 3);
        g.fillStyle = '#f4f9ff'; g.fillRect(GW - 3, top, 6, GY - top);
        g.fillStyle = '#c7d7ea'; g.fillRect(GW + 1, top, 2, GY - top);
        if (flash > 0) { g.fillStyle = `rgba(255,209,102,${flash * 0.35})`; g.fillRect(0, top + SH, GW, GY - top - SH); }
        if (q.t > 0 && q.target !== 100) { g.fillStyle = q.target < 100 ? '#ef476f' : '#06d6a0'; g.fillRect(2, top - 3, GW - 4, 3); }
      }
      g.restore();
    }

    function lookOff(p) {
      const bx = (ball.x - p.x) * p.f, by = ball.y - (p.y - 58), d = Math.hypot(bx, by) || 1;
      return [bx / d * 2.6, by / d * 2.6];
    }
    function eyes(p, sclera = '#fff') {
      const [ox, oy] = lookOff(p);
      if ((time * 0.8 + p.ph) % 3.4 < 0.1) { g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.moveTo(2, -60); g.lineTo(11, -60); g.moveTo(13, -60); g.lineTo(22, -60); g.stroke(); return; }
      circ(7, -60, 5.6, sclera); circ(17, -60, 5.6, sclera);
      circ(7 + ox, -60 + oy, 2.9, '#16213e'); circ(17 + ox, -60 + oy, 2.9, '#16213e');
    }
    function fur(cx, cy, r, col, edge, n = 14) {
      g.beginPath();
      for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * TAU, rr = i % 2 ? r : r + 4; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = edge; g.lineWidth = 1.5; g.stroke();
    }

    function drawChar(p) {
      const kind = p.isP ? 'wich' : opp.kind;
      const hgt = GY - p.y;
      ell(p.x, GY + 2, Math.max(8, 22 - hgt / 10), 6, `rgba(10,20,50,${Math.max(0.08, 0.3 - hgt / 500)})`);
      const a = kickAngle(p);
      const fl = { x: Math.sin(a) * 20 + 4, y: -18 + Math.cos(a) * 10 };
      const bf = { x: -9 + Math.sin(p.walk) * 7 * (p.ground ? 1 : 0.3), y: -8 - (p.ground ? Math.max(0, Math.cos(p.walk)) * 3 : 4) };
      const boot = { wich: '#6b3f1d', snow: '#262626', peng: '#ff9f1c', yeti: '#8aa2d6' }[kind];
      g.save(); g.translate(p.x, p.y); const sy = p.sq; g.scale(p.f / sy, sy);
      const bob = p.ground ? Math.sin(p.walk * 2) * 1.2 * Math.min(1, Math.abs(p.vx) / 100) : 0;
      // hinterer Fuß
      ell(bf.x, bf.y, 9, 6, boot);
      // Körper
      if (kind === 'wich') {
        circ(0, -24, 17, '#0aa37a', '#066d52'); g.fillStyle = '#ffd166'; g.fillRect(-17, -22, 34, 5);
        circ(3, -22, 4, '#ffd166');
      } else if (kind === 'snow') {
        circ(0, -24, 17, '#f4fbff', '#b9d3e6'); circ(4, -28, 2.5, '#222'); circ(4, -20, 2.5, '#222');
        g.strokeStyle = '#7a4b22'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-14, -28); g.lineTo(-30, -38 + Math.sin(p.walk) * 5); g.moveTo(-26, -34); g.lineTo(-32, -28); g.stroke();
      } else if (kind === 'peng') {
        ell(0, -24, 17, 19, '#1d2b53'); ell(5, -22, 11, 14, '#f4f9ff');
        ell(-12, -26 + Math.sin(p.walk) * 2, 5, 13, '#15204a', 0.3);
      } else {
        fur(0, -24, 16, '#e3eeff', '#9db6e0'); ell(4, -22, 9, 10, '#c4d6f5');
        circ(14, -30, 7, '#e3eeff', '#9db6e0', 1.5);
      }
      // vorderes Bein + Schuh
      g.strokeStyle = kind === 'peng' ? '#ff9f1c' : kind === 'wich' ? '#066d52' : '#9db6e0'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, -14); g.lineTo(fl.x, fl.y); g.stroke();
      g.save(); g.translate(fl.x, fl.y); g.rotate(a - 0.25 + 0.2); ell(3, 1, 10, 6.5, boot); g.restore();
      // Kopf
      g.translate(0, bob);
      if (kind === 'wich') {
        circ(2, -56, 22, '#ffd9b8', '#c99572');
        g.save(); g.beginPath(); g.arc(2, -56, 22, 0, TAU); g.clip(); ell(8, -41, 21, 12, '#fff'); ell(-6, -38, 10, 7, '#fff'); g.restore();
        eyes(p); circ(25, -53, 5.5, '#ff8fa3', '#d8607a', 1.5);
        const lag = clamp(-p.vx * p.f * 0.06, -18, 10), lagy = clamp(p.vy * 0.012, -6, 8) + Math.sin(time * 3 + p.ph) * 2;
        g.beginPath(); g.moveTo(-20, -70); g.quadraticCurveTo(-6 + lag * 0.4, -92, -8 + lag, -112 - lagy); g.quadraticCurveTo(14 + lag * 0.5, -92, 24, -70); g.closePath();
        g.fillStyle = '#ef476f'; g.fill(); g.strokeStyle = '#a8294a'; g.lineWidth = 1.5; g.stroke();
        ell(2, -70, 24, 6, '#fff'); circ(-8 + lag, -112 - lagy, 6, '#fff', '#cfd8e6', 1.5);
      } else if (kind === 'snow') {
        circ(2, -56, 22, '#f4fbff', '#b9d3e6'); eyes(p, '#fff');
        g.beginPath(); g.moveTo(20, -57); g.lineTo(38, -52); g.lineTo(20, -50); g.closePath(); g.fillStyle = '#ff8c1a'; g.fill();
        g.fillStyle = '#222'; for (let i = 0; i < 5; i++) { const aa = 0.5 + i * 0.35; circ(4 + Math.cos(aa) * 12, -56 + Math.sin(aa) * 12 + 2, 1.5, '#222'); }
        g.fillStyle = '#ef476f'; g.fillRect(-14, -37, 34, 7); g.fillRect(-14 - 3, -37, 6, 16 + Math.sin(p.walk) * 2);
        g.fillStyle = '#1b1b1b'; g.fillRect(-14, -77, 34, 5); g.fillRect(-8, -97, 22, 21); g.fillStyle = '#ef476f'; g.fillRect(-8, -82, 22, 5);
      } else if (kind === 'peng') {
        circ(2, -56, 22, '#1d2b53', '#111a38'); ell(9, -53, 15, 14, '#f4f9ff');
        eyes(p, '#f4f9ff');
        g.beginPath(); g.moveTo(20, -55); g.lineTo(37, -50); g.lineTo(20, -46); g.closePath(); g.fillStyle = '#ff9f1c'; g.fill();
        g.beginPath(); g.arc(2, -58, 23, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(26, -66); g.closePath(); g.fillStyle = '#c77dff'; g.fill();
        g.fillStyle = '#8ecae6'; g.fillRect(-18, -72, 40, 5); circ(2, -82, 6, '#fff');
      } else {
        fur(2, -56, 20, '#e3eeff', '#9db6e0', 16);
        ell(9, -53, 14, 13, '#bcd7f7');
        g.strokeStyle = '#2a1f5c'; g.lineWidth = 3; g.beginPath(); g.moveTo(1, -68); g.lineTo(11, -63); g.moveTo(24, -68); g.lineTo(15, -63); g.stroke();
        eyes(p, '#fff');
        g.beginPath(); g.moveTo(8, -45); g.quadraticCurveTo(15, -36, 22, -45); g.closePath(); g.fillStyle = '#3a1c5e'; g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(10, -45); g.lineTo(12, -40); g.lineTo(14, -45); g.moveTo(16, -45); g.lineTo(18, -40); g.lineTo(20, -45); g.fill();
        circ(23, -55, 3.2, '#5a8bd6'); circ(-9, -72, 5, '#c77dff'); circ(13, -75, 5, '#c77dff');
      }
      g.restore();
      if (p.frozen > 0) {
        g.save(); g.translate(p.x, p.y);
        g.fillStyle = `rgba(150,215,255,${0.5 + Math.sin(time * 8) * 0.06})`; g.strokeStyle = '#e8f8ff'; g.lineWidth = 2;
        g.beginPath(); g.roundRect(-30, -86, 60, 90, 10); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.moveTo(-20, -70); g.lineTo(-8, -40); g.moveTo(10, -80); g.lineTo(20, -50); g.stroke();
        g.fillStyle = '#d8f3ff'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 12 - 4, 4); g.lineTo(i * 12 + 4, 4); g.lineTo(i * 12, 14 + (i & 1) * 5); g.fill(); }
        g.restore();
      }
    }

    function drawBall() {
      const r = ball.r;
      const hgt = Math.max(0, GY - ball.y - r);
      ell(ball.x, GY + 2, r * 0.9 * Math.max(0.4, 1 - hgt / 280), 4.5, `rgba(10,20,50,${Math.max(0.1, 0.32 - hgt / 600)})`);
      for (const t of ball.trail) { g.globalAlpha = t.l * 1.2; circ(t.x, t.y, r * 0.8 * (t.l / 0.25 + 0.3) * 0.7, '#ffffff'); }
      g.globalAlpha = 1;
      if (eff.big > 0) { g.globalAlpha = 0.5 + Math.sin(time * 10) * 0.2; circ(ball.x, ball.y, r + 5, null, '#ffd166', 3); g.globalAlpha = 1; }
      g.save(); g.translate(ball.x, ball.y); g.rotate(ball.rot);
      circ(0, 0, r, '#ffffff', '#222a44', 2);
      g.save(); g.beginPath(); g.arc(0, 0, r - 1, 0, TAU); g.clip();
      g.fillStyle = '#222a44';
      const pent = (x, y, rr, rot) => { g.beginPath(); for (let i = 0; i < 5; i++) { const aa = rot + i * TAU / 5; g.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); } g.closePath(); g.fill(); };
      pent(0, 0, r * 0.38, -Math.PI / 2);
      for (let i = 0; i < 5; i++) { const aa = -Math.PI / 2 + i * TAU / 5 + TAU / 10; pent(Math.cos(aa) * r * 1.02, Math.sin(aa) * r * 1.02, r * 0.32, aa); }
      g.strokeStyle = '#222a44'; g.lineWidth = 1.2; g.beginPath();
      for (let i = 0; i < 5; i++) { const aa = -Math.PI / 2 + i * TAU / 5; g.moveTo(Math.cos(aa) * r * 0.38, Math.sin(aa) * r * 0.38); g.lineTo(Math.cos(aa) * r * 0.7, Math.sin(aa) * r * 0.7); }
      g.stroke(); g.restore();
      g.restore();
      circ(ball.x - r * 0.35, ball.y - r * 0.4, r * 0.18, 'rgba(255,255,255,.7)');
    }

    function drawItem() {
      if (!item) return;
      const bob = item.landed ? Math.sin(time * 5) * 3 : 0;
      if (item.landed && item.ttl < 2.5 && Math.sin(time * 18) < 0) return;
      const x = item.x, y = item.y + bob;
      ell(x, GY + 2, 14, 4, 'rgba(10,20,50,.3)');
      const glow = g.createRadialGradient(x, y, 4, x, y, 30); glow.addColorStop(0, 'rgba(255,209,102,.6)'); glow.addColorStop(1, 'rgba(255,209,102,0)');
      g.fillStyle = glow; g.fillRect(x - 30, y - 30, 60, 60);
      const col = { big: '#ffd166', ice: '#8ecae6', freeze: '#c77dff', mini: '#ef476f', maxi: '#06d6a0' }[item.type];
      circ(x, y, 17, '#0b1437', col, 3);
      g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.5; g.lineCap = 'round';
      if (item.type === 'big') { circ(0, 0, 9, null, col, 2.5); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-11, -3); g.moveTo(14, 0); g.lineTo(11, -3); g.stroke(); }
      else if (item.type === 'ice' || item.type === 'freeze') {
        g.beginPath(); for (let i = 0; i < 3; i++) { const aa = i * TAU / 6; g.moveTo(Math.cos(aa) * 10, Math.sin(aa) * 10); g.lineTo(-Math.cos(aa) * 10, -Math.sin(aa) * 10); } g.stroke();
        if (item.type === 'freeze') circ(0, 0, 12, null, col, 1.5);
      } else {
        g.strokeRect(-9, -7, 12, 14); g.beginPath();
        const s = item.type === 'mini' ? -1 : 1;
        g.moveTo(5, 0); g.lineTo(13, 0); if (s > 0) { g.moveTo(9, -4); g.lineTo(9, 4); } g.stroke();
      }
      g.restore();
    }

    function drawScene() {
      g.drawImage(bg, 0, 0, W, H);
      // Publikum
      const ex = excite;
      g.globalAlpha = 0.72;
      for (const c of crowd) {
        const bob = Math.max(0, Math.sin(time * (3 + ex * 6) + c.ph)) * (1 + ex * 8);
        g.fillStyle = c.c; g.fillRect(c.x - 3.5, c.y + 2 - bob, 7, 8);
        circ(c.x, c.y - 2 - bob, 3.6, '#ffd9b8');
        if (c.hat) { g.beginPath(); g.moveTo(c.x - 3.5, c.y - 4 - bob); g.lineTo(c.x, c.y - 11 - bob); g.lineTo(c.x + 3.5, c.y - 4 - bob); g.fillStyle = '#ef476f'; g.fill(); }
        if (ex > 0.3) { g.fillStyle = c.c; g.fillRect(c.x - 6, c.y - 6 - bob - ex * 4, 2, 7); g.fillRect(c.x + 4, c.y - 6 - bob - ex * 4, 2, 7); }
      }
      g.globalAlpha = 1;
      // Eis
      if (eff.ice > 0) {
        const a = Math.min(1, eff.ice / 1) * 0.35;
        const gr = g.createLinearGradient(0, 262, 0, H); gr.addColorStop(0, `rgba(120,200,255,${a})`); gr.addColorStop(1, `rgba(190,235,255,${a + 0.2})`);
        g.fillStyle = gr; g.fillRect(0, 262, W, H - 262);
        g.strokeStyle = `rgba(255,255,255,${a + 0.2})`; g.lineWidth = 2; g.beginPath();
        for (let i = 0; i < 6; i++) { const x = ((i * 97 + time * 20) % (W + 60)) - 30; g.moveTo(x, 300 + (i % 3) * 14); g.lineTo(x + 30, 296 + (i % 3) * 14); }
        g.stroke();
      }
      drawGoal(0, false); drawGoal(1, false);
      drawItem();
      drawChar(P); drawChar(A);
      drawBall();
      drawGoal(0, true); drawGoal(1, true);
      // Partikel
      for (const p of parts) {
        g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
        if (p.t === 'r') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
        else if (p.t === 'o') { const k = 1 - p.life / p.max; g.strokeStyle = p.c; g.lineWidth = 3 * (1 - k); g.beginPath(); g.arc(p.x, p.y, p.s + k * 34, 0, TAU); g.stroke(); }
        else { g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s * 0.6, 0, TAU); g.fill(); }
      }
      g.globalAlpha = 1;
      // Marker über dem Spieler
      if (m.showMe > 0) {
        g.globalAlpha = Math.min(1, m.showMe);
        const y = P.y - 128 + Math.sin(time * 6) * 3;
        g.beginPath(); g.moveTo(P.x - 8, y - 8); g.lineTo(P.x + 8, y - 8); g.lineTo(P.x, y + 2); g.closePath(); g.fillStyle = '#ffd166'; g.fill();
        text('DU', P.x, y - 18, 14, '#ffd166'); g.globalAlpha = 1;
      }
    }

    function drawHud() {
      // Schnee im Vordergrund
      g.fillStyle = 'rgba(255,255,255,.8)';
      for (const f of flakes) { g.beginPath(); g.arc(f.x, f.y, f.s, 0, TAU); g.fill(); }
      // Anzeigetafel
      g.fillStyle = 'rgba(8,14,45,.85)'; g.strokeStyle = '#ffd166'; g.lineWidth = 2;
      g.beginPath(); g.roundRect(130, 6, 300, 38, 12); g.fill(); g.stroke();
      text('DU', 160, 25, 16, '#ef476f');
      text(`${m.sp} : ${m.sa}`, 280, 25, 28, '#fff');
      text(opp.name.toUpperCase(), 372, 25, opp.name.length > 7 ? 12 : 14, '#8ecae6');
      const secs = Math.ceil(m.clock), clockTxt = m.golden ? 'GOLDEN GOAL' : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
      const low = !m.golden && secs <= 10, pulse = m.golden ? 1 + Math.sin(time * 8) * 0.06 : 1;
      text(clockTxt, 280, 58, (m.golden ? 15 : 18) * pulse, m.golden ? '#ffd166' : low && Math.sin(time * 10) > 0 ? '#ef476f' : '#fff');
      // aktive Extras
      let y = 78;
      const chip = (label, v, c) => { text(`${label} ${Math.ceil(v)}`, 280, y, 12, c); y += 15; };
      if (eff.big > 0) chip('Riesenball', eff.big, '#ffd166');
      if (eff.ice > 0) chip('Eis-Boden', eff.ice, '#8ecae6');
      if (gs[0].t > 0) chip(gs[0].target < 100 ? 'Dein Tor klein' : 'Dein Tor groß', gs[0].t, gs[0].target < 100 ? '#06d6a0' : '#ef476f');
      if (gs[1].t > 0) chip(gs[1].target < 100 ? 'Gegner-Tor klein' : 'Gegner-Tor groß', gs[1].t, gs[1].target < 100 ? '#ef476f' : '#06d6a0');
      // Zentrale Texte
      if (m.phase === 'intro' && m.cd) {
        text(ROUNDS[round].toUpperCase(), 280, 118, 26, '#ffd166'); text(`gegen ${opp.name}`, 280, 144, 18, '#fff');
        const c = Math.ceil(m.t), k = 1 - (m.t - Math.floor(m.t));
        if (c >= 1 && c <= 3) text(String(c), 280, 200, 64 + (1 - k) * 22, '#fff');
      } else if (m.banner) {
        const b = m.banner, k = clamp((b.max - b.t) / 0.18, 0, 1), s = 0.6 + 0.4 * (1 - Math.pow(1 - k, 3));
        g.globalAlpha = Math.min(1, b.t / 0.3);
        const big = b.text === 'TOOOR!';
        text(b.text, 280, big ? 140 : 130, (big ? 54 : 24) * s * (big ? 1 + Math.sin(time * 14) * 0.05 : 1), b.color);
        g.globalAlpha = 1;
      }
    }

    function draw() {
      g.save();
      let z = 1, fx = W / 2, fy = H / 2;
      if (zoomT > 0 && m.phase === 'goal') {
        const e = Math.min(1, (2.3 - zoomT) / 0.5, zoomT / 0.5); z = 1 + 0.15 * clamp(e, 0, 1);
        fx = clamp(ball.x, W / (2 * z), W - W / (2 * z)); fy = clamp(ball.y, H / (2 * z), H - H / (2 * z));
        fx = lerp(W / 2, fx, 0.7); fy = lerp(H / 2, fy, 0.7);
      }
      g.translate(W / 2 + (shake ? (R() - 0.5) * shake : 0), H / 2 + (shake ? (R() - 0.5) * shake : 0)); g.scale(z, z); g.translate(-fx, -fy);
      drawScene();
      g.restore();
      drawHud();
    }

    // Testhilfe: Zustand an der Bühne ablegen (kein globaler Zugriff)
    ctx.root.__kd = { m, ball, P, A, eff, gs, get item() { return item; }, get opp() { return opp; }, get round() { return round; }, get wins() { return wins; }, get goals() { return totalGoals; } };

    startMatch();
    ctx.loop(dt => { update(dt); draw(); });
    return { destroy() { delete ctx.root.__kd; } };
  },
};

function drawBackground(g) {
  g.scale(2, 2);
  const R = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const sky = g.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, '#070e2b'); sky.addColorStop(1, '#1a2a66');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  for (let i = 0; i < 45; i++) { g.globalAlpha = 0.3 + R() * 0.6; g.fillRect(R() * W, R() * 90, 1.5, 1.5); }
  g.globalAlpha = 1;
  const mg = g.createRadialGradient(480, 44, 4, 480, 44, 50); mg.addColorStop(0, 'rgba(255,240,200,.5)'); mg.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = mg; g.fillRect(430, 0, 100, 100);
  g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(480, 44, 14, 0, TAU); g.fill();
  // Tannen
  for (let i = 0; i < 14; i++) {
    const x = 20 + i * 42 + R() * 10, h = 24 + R() * 16;
    g.fillStyle = '#0a2a3a'; g.beginPath(); g.moveTo(x - 12, 104); g.lineTo(x, 104 - h); g.lineTo(x + 12, 104); g.fill();
    g.fillStyle = '#d8ecff'; g.beginPath(); g.moveTo(x - 5, 104 - h * 0.6); g.lineTo(x, 104 - h); g.lineTo(x + 5, 104 - h * 0.6); g.fill();
  }
  // Tribüne
  const st = g.createLinearGradient(0, 100, 0, 232); st.addColorStop(0, '#0f1a4a'); st.addColorStop(1, '#1b2a6a');
  g.fillStyle = st; g.fillRect(0, 104, W, 128);
  g.strokeStyle = 'rgba(142,202,230,.12)'; g.lineWidth = 1;
  for (let y = 118; y < 232; y += 17) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // Flutlicht
  for (const x of [34, 526]) {
    g.fillStyle = '#2a3566'; g.fillRect(x - 2, 40, 4, 70);
    const lg = g.createRadialGradient(x, 38, 2, x, 38, 70); lg.addColorStop(0, 'rgba(255,250,220,.85)'); lg.addColorStop(1, 'rgba(255,250,220,0)');
    g.fillStyle = lg; g.fillRect(x - 70, 0, 140, 110);
    g.fillStyle = '#fffbe8'; g.fillRect(x - 12, 34, 24, 8);
  }
  // Bande
  const cols = ['#ef476f', '#118ab2', '#ffd166', '#06d6a0'];
  for (let i = 0; i < 8; i++) {
    g.fillStyle = cols[i % 4]; g.fillRect(i * 70, 232, 70, 30);
    g.fillStyle = i % 4 === 2 ? '#0b1437' : '#fff'; g.font = 'bold 13px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ADVENT-CUP', i * 70 + 35, 247);
  }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 258, W, 4);
  // Spielfeld mit Schnee
  const gr = g.createLinearGradient(0, 262, 0, H); gr.addColorStop(0, '#e9f5ff'); gr.addColorStop(1, '#b3d3ea');
  g.fillStyle = gr; g.fillRect(0, 262, W, H - 262);
  g.fillStyle = 'rgba(255,255,255,.28)'; for (let i = 0; i < 8; i += 2) g.fillRect(i * 70, 262, 70, H - 262);
  g.strokeStyle = 'rgba(70,110,160,.55)'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(0, 268); g.lineTo(W, 268); g.moveTo(280, 268); g.lineTo(280, H);
  g.rect(0, 276, 92, 58); g.rect(W - 92, 276, 92, 58); g.stroke();
  g.beginPath(); g.ellipse(280, 304, 58, 22, 0, 0, TAU); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(R() * W, 272 + R() * 66, 6 + R() * 10, 1.5 + R() * 2, 0, 0, TAU); g.fill(); }
}
