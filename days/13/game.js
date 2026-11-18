// Türchen 13: Schneeball-Arena – Arena-Kampf von oben, letzter Wichtel steht.
import { T, N, WORLD, CX, CY, EMPTY, ICE, CRATE, idx, makeMap, hitsWall, move, rayHit, inBush } from './world.js';
import { HEROES } from './heroes.js';
import { botUpdate, newBrain } from './ai.js';
import { drawGame, drawSelect, VW, VH, SUPER_BTN, cardRect } from './draw.js';

export const howto = 'Sei der letzte Wichtel in der Arena! Laufen mit Pfeiltasten/WASD oder Stick, werfen mit Leertaste, Klick oder Tippen auf die Arena (zielt automatisch), Super mit X oder dem Super-Knopf. Tannen verstecken dich, der Schneesturm kostet Ausdauer.';
// Nur für automatische Tests: Zugriff auf die laufende Welt.
export const debug = {};

const LEVELS = [
  { err: 0.24, lead: 0.2, react: 0.45, dodge: 0.12, dmg: 0.72, hp: 0.9, fire: [0.55, 1.1], sight: 360, playerBias: 1.4, flee: 0.3, useBush: false, superUse: 0.35 },
  { err: 0.14, lead: 0.6, react: 0.32, dodge: 0.38, dmg: 0.92, hp: 1.0, fire: [0.4, 0.8], sight: 410, playerBias: 1.15, flee: 0.33, useBush: true, superUse: 0.6 },
  { err: 0.07, lead: 0.9, react: 0.22, dodge: 0.6, dmg: 1.05, hp: 1.1, fire: [0.25, 0.5], sight: 460, playerBias: 1.0, flee: 0.36, useBush: true, superUse: 0.9 },
];
const BOT_NAMES = ['Frosti', 'Pieks', 'Mütze', 'Kufe', 'Flöckchen', 'Bommel', 'Zipfel', 'Glitzer'];
const BOT_COLORS = ['#ef476f', '#06d6a0', '#c77dff', '#f78c6b', '#4cc9f0'];
const TROPHIES = [12, 8, 6, 3, 1, 0];
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(VW, VH);
    const A = ctx.audio;
    let stufe = clamp(Number(ctx.load('stufe', 1)) || 1, 1, 3);
    let pokale = Number(ctx.load('pokale', 0)) || 0;
    const S = { phase: 'select', t: 0, sel: clamp(Number(ctx.load('held', 0)) || 0, 0, 2), flakes: [] };
    for (let i = 0; i < 50; i++) S.flakes.push({ x: Math.random() * VW, y: Math.random() * VH, s: rand(1, 2.6), v: rand(15, 45) });
    let W = null, P = null;
    ctx.input.pad({ stick: true, a: 'Wurf', b: 'Super' });

    const hud = () => ctx.hud.set({ 'Übrig': W ? W.ents.filter(e => e.alive).length : 6, 'Stufe': `${stufe}/3`, '🏆': pokale });
    hud();

    // ---------- Welt ----------
    function makeEnt(hero, x, y, o) {
      const hpMul = o.isPlayer ? 1 : W.L.hp;
      return {
        hero, x, y, r: hero.r, hp: hero.hp * hpMul, maxHp: hero.hp * hpMul, ghost: hero.hp * hpMul, ammo: 3, sup: 0,
        dmgMul: o.isPlayer ? 1 : W.L.dmg, crystals: 0, fx: (CX - x), fy: (CY - y), vx: 0, vy: 0, kx: 0, ky: 0,
        lastHitT: -9, lastAtkT: -9, alive: true, shieldT: 0, stunT: 0, dashT: 0, dashA: 0, dashHit: new Set(), stompT: 0,
        revealT: 0, throwT: 0, walkT: Math.random() * 5, cool: 0, inBush: false, flash: 0, supReadyShown: false,
        name: o.name, color: o.color, isPlayer: !!o.isPlayer, bot: o.isPlayer ? null : newBrain(), place: 0,
      };
    }
    function newWorld() {
      const map = makeMap();
      W = {
        ...map, t: 0, L: LEVELS[stufe - 1], ents: [], shots: [], parts: [], nums: [], fx: [], tumbles: [], crystals: [], prints: [],
        feed: [], msgs: [], cam: { x: 0, y: 0 }, shake: 0, hurt: 0, ringR: 1040, ringPhase: 0, stormTick: 0, kos: 0, over: false,
        tileHit: new Map(), count: 1.6, noAmmoT: 0, stufe,
      };
      debug.world = W; debug.ctx = ctx;
      const sp = map.spawns.slice().sort(() => Math.random() - 0.5);
      P = makeEnt(HEROES[S.sel], sp[0].x, sp[0].y, { isPlayer: true, name: 'Du', color: '#ffd166' });
      W.ents.push(P); W.player = P;
      W.canSeeP = o => canSee(P, o);
      const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
      for (let i = 1; i < 6; i++) {
        const h = HEROES[Math.floor(Math.random() * 3)];
        W.ents.push(makeEnt(h, sp[i].x, sp[i].y, { name: names[i], color: BOT_COLORS[i - 1] }));
      }
      for (const e of W.ents) { const d = Math.hypot(e.fx, e.fy) || 1; e.fx /= d; e.fy /= d; }
      W.cam.x = clamp(P.x - VW / 2, 0, WORLD - VW); W.cam.y = clamp(P.y - VH / 2, 0, WORLD - VH);
      hud();
    }

    const near = (x, y, m = 80) => x > W.cam.x - m && x < W.cam.x + VW + m && y > W.cam.y - m && y < W.cam.y + VH + m;
    function puff(x, y, n, color = '#ffffff', sp = 120, size = 3, life = 0.5) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = rand(sp * 0.3, sp);
        W.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(life * 0.6, life), max: life, size: rand(size * 0.6, size * 1.3), color });
      }
    }
    function num(x, y, text, color, big) { W.nums.push({ x: x + rand(-6, 6), y: y - 18, text, color, life: 0.85, big }); }
    function msg(text, color = '#ffd166', size = 34, dur = 1.1) {
      if (size >= 40) W.msgs.length = 0;
      W.msgs = W.msgs.filter(m => m.text !== text).slice(-1);
      W.msgs.push({ text, color, size, t: 0, dur });
    }
    function feed(text, color = '#e8f1ff') { W.feed.unshift({ text, color, t: 0 }); if (W.feed.length > 3) W.feed.pop(); }

    function canSee(viewer, tg) {
      if (!tg.alive) return false;
      if (!tg.inBush || tg.revealT > 0) return true;
      return Math.hypot(tg.x - viewer.x, tg.y - viewer.y) < 90;
    }

    // ---------- Schaden ----------
    function damage(tg, amount, src, kx = 0, ky = 0, color) {
      if (!tg.alive || tg.shieldT > 0 || tg.dashT > 0) return;
      if (W.over && tg.isPlayer) return;
      if (src && !src.isPlayer && !tg.isPlayer) amount *= 0.6; // Bots untereinander etwas sanfter: Runde dauert länger
      amount = Math.round(amount);
      tg.hp -= amount; tg.lastHitT = W.t; tg.flash = 0.12; tg.revealT = Math.max(tg.revealT, 0.8);
      tg.kx += kx; tg.ky += ky;
      if (src && src !== tg) {
        const before = src.sup;
        src.sup = Math.min(1, src.sup + amount / src.hero.superCost);
        if (src.isPlayer && before < 1 && src.sup >= 1) { msg('Super bereit!', '#c77dff', 24, 1.2); A.melody([[76, 0.5], [79, 0.5], [84, 1]], { bpm: 420, type: 'triangle', vol: 0.12 }); }
        tg.lastBy = src;
      }
      const vis = near(tg.x, tg.y);
      if (vis) {
        puff(tg.x, tg.y, 8, '#ffffff', 140, 3, 0.45);
        num(tg.x, tg.y - tg.r, String(amount), color || (src && src.isPlayer ? '#ffd166' : tg.isPlayer ? '#ff8fa3' : '#ffffff'), src && src.isPlayer);
      }
      if (tg.isPlayer) { W.hurt = Math.min(0.6, W.hurt + 0.35); W.shake = Math.max(W.shake, 5); A.sfx('hit'); }
      else if (src && src.isPlayer) { A.tone(880, 0.06, 'square', 0.1, 1500); A.tone(220, 0.08, 'triangle', 0.18, 110); W.shake = Math.max(W.shake, 2); }
      else if (vis) A.tone(330, 0.05, 'triangle', 0.05, 160);
      if (tg.hp <= 0) knockOut(tg, src);
    }
    function knockOut(e, by) {
      e.alive = false; e.hp = 0;
      const d = by ? Math.hypot(e.x - by.x, e.y - by.y) || 1 : 1;
      const dx = by ? (e.x - by.x) / d : rand(-1, 1), dy = by ? (e.y - by.y) / d : rand(-1, 1);
      W.tumbles.push({ e, x: e.x, y: e.y, vx: dx * 170, vy: dy * 170, rot: 0, t: 0 });
      puff(e.x, e.y, 26, '#ffffff', 220, 4, 0.8);
      const n = Math.max(1, e.crystals);
      for (let i = 0; i < n; i++) dropCrystal(e.x, e.y);
      if (near(e.x, e.y)) { A.tone(700, 0.35, 'triangle', 0.16, 180); A.sfx('pop'); }
      if (by && by.isPlayer && !e.isPlayer) {
        W.kos++; feed(`Du hast ${e.name} umgepurzelt!`, '#ffd166'); msg('Purzel!', '#ffd166', 30, 0.9);
        ctx.fx.shake(); A.sfx('boom');
      } else if (!e.isPlayer) feed(`${e.name} purzelt raus!`);
      const others = W.ents.filter(o => o.alive && !o.isPlayer).length;
      if (e.isPlayer) {
        feed('Du purzelst als Schneekugel raus!', '#ff8fa3');
        ctx.fx.shake(500); A.sfx('bad');
        endRound(others + 1);
      } else if (others === 0 && P.alive) endRound(1);
      else if (!W.over && P.alive && others <= 2) msg(others === 1 ? 'Nur noch einer!' : `Noch ${others + 1} Wichtel!`, '#8ecae6', 24, 1.2);
      hud();
    }
    function dropCrystal(x, y) {
      for (let k = 0; k < 8; k++) {
        const a = Math.random() * TAU, r = rand(10, 46), tx = x + Math.cos(a) * r, ty = y + Math.sin(a) * r;
        if (!hitsWall(W, tx, ty, 10)) { W.crystals.push({ x: tx, y: ty, sx: x, sy: y, t: 0 }); return; }
      }
      W.crystals.push({ x, y, sx: x, sy: y, t: 0 });
    }
    function hitTile(i, dmg, owner) {
      const t = W.tiles[i];
      if (t !== ICE && t !== CRATE) return;
      W.hp[i] -= dmg; W.tileHit.set(i, W.t);
      const x = (i % N) * T + T / 2, y = ((i / N) | 0) * T + T / 2;
      if (near(x, y)) puff(x, y, 5, t === ICE ? '#bfe6f7' : '#c77dff', 90, 3, 0.4);
      if (W.hp[i] <= 0) {
        W.tiles[i] = EMPTY;
        if (t === CRATE) {
          dropCrystal(x, y);
          puff(x, y, 18, '#c77dff', 200, 4, 0.7); puff(x, y, 10, '#ffd166', 160, 3, 0.6);
          if (owner && owner.isPlayer) A.sfx('coin'); else if (near(x, y)) A.sfx('pop');
        } else {
          puff(x, y, 20, '#bfe6f7', 200, 4, 0.7);
          if (near(x, y)) A.tone(1400, 0.2, 'sine', 0.08, 500);
        }
      }
    }

    // ---------- Angriffe ----------
    function ball(e, ang, o) {
      W.shots.push({
        owner: e, x: e.x + Math.cos(ang) * (e.r + 4), y: e.y + Math.sin(ang) * (e.r + 4), vx: Math.cos(ang) * o.speed, vy: Math.sin(ang) * o.speed,
        r: o.r || 5, dmg: o.dmg, range: o.range, dist: 0, kind: o.kind || 'ball', delay: o.delay || 0, ang, hit: new Set(), spin: 0,
      });
    }
    function attack(e, ang) {
      const h = e.hero, m = e.dmgMul;
      if (h.key === 'flocke') {
        ball(e, ang - 0.03, { dmg: 340 * m, speed: h.ballSpeed, range: h.range, r: 5 });
        ball(e, ang + 0.03, { dmg: 340 * m, speed: h.ballSpeed, range: h.range, r: 5, delay: 0.1 });
      } else if (h.key === 'brummer') {
        for (let i = -2; i <= 2; i++) ball(e, ang + i * 0.18, { dmg: 250 * m, speed: h.ballSpeed, range: h.range * rand(0.9, 1), r: 6 });
      } else ball(e, ang, { dmg: 1050 * m, speed: h.ballSpeed, range: h.range, r: 5, kind: 'icicle' });
    }
    function tryThrow(e, ang) {
      if (!e.alive || e.ammo < 1 || e.cool > 0 || e.dashT > 0 || e.stunT > 0 || e.stompT > 0) {
        if (e.isPlayer && e.ammo < 1 && e.cool <= 0) { W.noAmmoT = 0.4; A.sfx('tick'); }
        return false;
      }
      e.ammo -= 1; e.cool = 0.26; e.lastAtkT = W.t; e.revealT = 1.1; e.throwT = 0.2;
      e.fx = Math.cos(ang); e.fy = Math.sin(ang);
      attack(e, ang);
      if (e.isPlayer || near(e.x, e.y)) {
        const v = e.isPlayer ? 0.13 : 0.05, k = e.hero.key;
        if (k === 'zapfen') A.tone(1300, 0.11, 'sine', v, 500);
        else if (k === 'brummer') A.tone(380, 0.1, 'triangle', v * 1.4, 160);
        else A.tone(700, 0.06, 'triangle', v, 350);
      }
      return true;
    }
    function trySuper(e, ang) {
      if (!e.alive || e.sup < 1 || e.stunT > 0 || e.dashT > 0 || e.stompT > 0) return false;
      e.sup = 0; e.lastAtkT = W.t; e.revealT = 1.5; e.fx = Math.cos(ang); e.fy = Math.sin(ang);
      const k = e.hero.key, vis = e.isPlayer || near(e.x, e.y);
      if (k === 'flocke') {
        e.dashT = 0.34; e.dashA = ang; e.dashHit.clear();
        if (vis) { A.sfx('swoosh'); A.tone(500, 0.3, 'sawtooth', 0.08, 1400); }
      } else if (k === 'brummer') {
        e.stompT = 0.32;
        if (vis) A.tone(200, 0.3, 'square', 0.1, 500);
      } else {
        ball(e, ang, { dmg: 1500 * e.dmgMul, speed: 380, range: 640, r: 20, kind: 'roll' });
        if (vis) A.tone(160, 0.5, 'triangle', 0.18, 90);
      }
      if (e.isPlayer) msg(e.hero.superName + '!', '#c77dff', 26, 0.9);
      return true;
    }
    function stomp(e) {
      const R = 160;
      W.fx.push({ kind: 'wave', x: e.x, y: e.y, t: 0, dur: 0.45, R });
      puff(e.x, e.y, 34, '#ffffff', 260, 4, 0.7);
      if (e.isPlayer || near(e.x, e.y)) { A.sfx('boom'); W.shake = Math.max(W.shake, e.isPlayer ? 9 : 5); }
      for (const o of W.ents) {
        if (o === e || !o.alive) continue;
        const d = Math.hypot(o.x - e.x, o.y - e.y);
        if (d > R + o.r) continue;
        const ux = (o.x - e.x) / (d || 1), uy = (o.y - e.y) / (d || 1);
        damage(o, 1500 * e.dmgMul * (1 - 0.4 * Math.min(1, d / R)), e, ux * 380, uy * 380);
        if (o.alive && o.shieldT <= 0) o.stunT = 0.6;
      }
      const tx0 = Math.floor(e.x / T), ty0 = Math.floor(e.y / T);
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = tx0 + dx, y = ty0 + dy;
        if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1) continue;
        if (Math.hypot(x * T + 20 - e.x, y * T + 20 - e.y) < R) hitTile(idx(x, y), 1500, e);
      }
    }
    function autoAim(e, range) {
      let best = null, bd = 1e9;
      for (const o of W.ents) {
        if (o === e || !o.alive || !canSee(e, o)) continue;
        const d = Math.hypot(o.x - e.x, o.y - e.y);
        if (d > range) continue;
        const sc = d + (rayHit(W, e.x, e.y, o.x, o.y) >= 0 ? 500 : 0);
        if (sc < bd) { bd = sc; best = o; }
      }
      return best;
    }
    function aimAngle(e, o) {
      const d = Math.hypot(o.x - e.x, o.y - e.y), tt = d / e.hero.ballSpeed * 0.5;
      return Math.atan2(o.y + o.vy * tt - e.y, o.x + o.vx * tt - e.x);
    }
    function playerThrow(ang) {
      if (S.phase !== 'play' || !P.alive) return;
      if (ang === undefined) {
        const tg = autoAim(P, P.hero.range * 1.15);
        ang = tg ? aimAngle(P, tg) : Math.atan2(P.fy, P.fx);
      }
      tryThrow(P, ang);
    }
    function playerSuper() {
      if (S.phase !== 'play' || !P.alive) return;
      if (P.sup < 1) { A.sfx('tick'); return; }
      const tg = autoAim(P, P.hero.superRange * 1.1);
      trySuper(P, tg ? aimAngle(P, tg) : Math.atan2(P.fy, P.fx));
    }
    const api = { canSee, tryThrow, trySuper };

    // ---------- Rundenende ----------
    function endRound(place) {
      if (W.over) return;
      W.over = true; W.place = place;
      const gained = TROPHIES[place - 1] + W.kos * 2;
      pokale += gained; ctx.save('pokale', pokale);
      const stars = place === 1 ? 3 : place === 2 ? 2 : place === 3 ? 1 : 0;
      const plus = `+${gained} Pokale${W.kos ? ` (davon ${W.kos * 2} fürs Umpurzeln)` : ''}.`;
      let text;
      if (place === 1) {
        if (stufe < 3) { text = `Sieg in Stufe ${stufe}! ${plus} Jetzt warten in Stufe ${stufe + 1} stärkere Wichtel.`; stufe++; ctx.save('stufe', stufe); }
        else text = `Du bist Arena-Champion der Stufe 3! ${plus}`;
        msg('Sieg!', '#ffd166', 54, 2.2);
      } else {
        msg(`Platz ${place}`, place <= 3 ? '#ffd166' : '#8ecae6', 46, 2.2);
        if (place === 2) text = `Platz 2! ${plus} Nur ein Wichtel fehlte noch zum Sieg und zu 3 Sternen.`;
        else if (place === 3) text = `Platz 3! ${plus} Platz 2 bringt 2 Sterne, ein Sieg 3 Sterne.`;
        else text = `Platz ${place}. ${plus} Schaffst du es unter die letzten 3, gibt es den ersten Stern. Tipp: In Tannen verstecken und Kristalle sammeln!`;
      }
      hud();
      ctx.timeout(() => ctx.finish({ won: place === 1, stars, score: pokale, text }), 2300);
    }

    // ---------- Eingabe ----------
    function choose(i) {
      if (S.phase !== 'select') return;
      S.sel = i; ctx.save('held', i);
      A.sfx('power');
      newWorld();
      S.phase = 'count';
    }
    ctx.input.onPress(n => {
      if (S.phase === 'select') {
        if (n === 'up' || n === 'left') { S.sel = (S.sel + 2) % 3; A.sfx('click'); }
        if (n === 'down' || n === 'right') { S.sel = (S.sel + 1) % 3; A.sfx('click'); }
        if (n === 'a' || n === 'b') choose(S.sel);
        return;
      }
      if (n === 'a') { playerThrow(); P.holdT = 0; }
      if (n === 'b') playerSuper();
    });
    ctx.on(canvas, 'pointerdown', e => {
      const p = pos(e);
      if (S.phase === 'select') {
        for (let i = 0; i < 3; i++) { const r = cardRect(i); if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) { choose(i); return; } }
        return;
      }
      if (S.phase !== 'play' || !P.alive) return;
      if (Math.hypot(p.x - SUPER_BTN.x, p.y - SUPER_BTN.y) < SUPER_BTN.r + 8) { playerSuper(); return; }
      playerThrow(Math.atan2(p.y + W.cam.y - P.y, p.x + W.cam.x - P.x));
    });

    // ---------- Simulation ----------
    function ringAt(t) {
      // Ruhephase, dann in zwei Wellen zuziehen, am Ende ganz zu
      if (t < 18) return 1040;
      if (t < 75) return 1040 - (t - 18) / 57 * 620;      // -> 420
      if (t < 92) return 420;
      if (t < 140) return 420 - (t - 92) / 48 * 270;      // -> 150
      if (t < 150) return 150;
      return Math.max(0, 150 - (t - 150) / 35 * 150);
    }
    function updateEnt(e, mx, my, dt) {
      e.shieldT -= dt; e.revealT -= dt; e.throwT -= dt; e.cool -= dt; e.flash -= dt;
      if (e.stunT > 0) { e.stunT -= dt; mx = my = 0; }
      e.ammo = Math.min(3, e.ammo + dt / e.hero.reload);
      if (W.t - Math.max(e.lastHitT, e.lastAtkT) > 2.6 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.16 * dt);
      e.ghost = e.ghost > e.hp ? Math.max(e.hp, e.ghost - e.maxHp * 0.6 * dt) : e.hp;
      const ox = e.x, oy = e.y;
      if (e.dashT > 0) {
        e.dashT -= dt;
        const sp = 650 * dt;
        move(W, e, Math.cos(e.dashA) * sp, Math.sin(e.dashA) * sp);
        if (Math.random() < 0.9) puff(e.x, e.y, 2, '#e3f6ff', 60, 3, 0.5);
        for (const o of W.ents) {
          if (o === e || !o.alive || e.dashHit.has(o)) continue;
          if (Math.hypot(o.x - e.x, o.y - e.y) < e.r + o.r + 18) {
            e.dashHit.add(o);
            damage(o, 760 * e.dmgMul, e, Math.cos(e.dashA) * 260, Math.sin(e.dashA) * 260);
          }
        }
        if (e.dashT <= 0) {
          for (let i = 0; i < 8; i++) ball(e, i * TAU / 8 + e.dashA, { dmg: 220 * e.dmgMul, speed: 420, range: 140, r: 4 });
          puff(e.x, e.y, 16, '#ffffff', 160, 3, 0.5);
        }
      } else if (e.stompT > 0) {
        e.stompT -= dt;
        if (e.stompT <= 0) stomp(e);
      } else {
        const m = Math.hypot(mx, my);
        if (m > 0.15) {
          const k = Math.min(1, m);
          e.fx = mx / m; e.fy = my / m;
          move(W, e, mx / m * k * e.hero.speed * dt, my / m * k * e.hero.speed * dt);
          e.walkT += dt * k;
        }
      }
      if (Math.abs(e.kx) + Math.abs(e.ky) > 1) {
        move(W, e, e.kx * dt, e.ky * dt);
        const f = Math.exp(-9 * dt); e.kx *= f; e.ky *= f;
      } else e.kx = e.ky = 0;
      e.vx = (e.x - ox) / Math.max(dt, 0.001); e.vy = (e.y - oy) / Math.max(dt, 0.001);
      const wasIn = e.inBush;
      e.inBush = inBush(W, e.x, e.y);
      if (e.inBush !== wasIn && near(e.x, e.y)) puff(e.x, e.y, 6, '#2a8a5a', 70, 3, 0.4);
      if ((e.x !== ox || e.y !== oy) && Math.random() < dt * 7 && !e.inBush) W.prints.push({ x: e.x + rand(-4, 4), y: e.y + e.r * 0.4, life: 2 });
    }
    function updateShots(dt) {
      W.shots = W.shots.filter(s => {
        if (s.delay > 0) {
          s.delay -= dt;
          if (s.delay > 0) return true;
          if (!s.owner.alive) return false;
          s.x = s.owner.x + Math.cos(s.ang) * (s.owner.r + 4); s.y = s.owner.y + Math.sin(s.ang) * (s.owner.r + 4);
        }
        const sp = Math.hypot(s.vx, s.vy), steps = Math.max(1, Math.ceil(sp * dt / 10));
        s.spin += dt * sp / 20;
        for (let k = 0; k < steps; k++) {
          s.x += s.vx * dt / steps; s.y += s.vy * dt / steps; s.dist += sp * dt / steps;
          const tx = Math.floor(s.x / T), ty = Math.floor(s.y / T);
          const i = idx(clamp(tx, 0, N - 1), clamp(ty, 0, N - 1)), t = W.tiles[i];
          if (s.kind === 'roll') {
            if (W.bush[i]) { W.bush[i] = 0; puff(tx * T + 20, ty * T + 20, 14, '#2a8a5a', 150, 4, 0.6); puff(tx * T + 20, ty * T + 20, 6, '#ffffff', 100, 3, 0.5); }
            if (t === ICE || t === CRATE) hitTile(i, 99999, s.owner);
            else if (t !== EMPTY) { puff(s.x, s.y, 26, '#ffffff', 220, 5, 0.7); if (near(s.x, s.y)) A.sfx('hit'); return false; }
            if (Math.random() < 0.5) puff(s.x - s.vx * 0.04, s.y - s.vy * 0.04, 1, '#e3f6ff', 40, 3, 0.4);
          } else if (t !== EMPTY) {
            hitTile(i, s.dmg, s.owner);
            puff(s.x - s.vx * 0.01, s.y - s.vy * 0.01, 6, '#ffffff', 90, 3, 0.35);
            return false;
          }
          for (const o of W.ents) {
            if (o === s.owner || !o.alive || s.hit.has(o)) continue;
            if (Math.hypot(o.x - s.x, o.y - s.y) < o.r + s.r) {
              const kb = s.kind === 'roll' ? 420 : s.kind === 'icicle' ? 140 : 60;
              damage(o, s.dmg, s.owner, s.vx / sp * kb, s.vy / sp * kb);
              if (s.kind !== 'roll') return false;
              s.hit.add(o);
            }
          }
          if (s.dist >= s.range) { puff(s.x, s.y, s.kind === 'roll' ? 24 : 5, '#ffffff', s.kind === 'roll' ? 200 : 60, 3, 0.4); return false; }
        }
        return true;
      });
    }
    function separate() {
      const L = W.ents;
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
        const a = L[i], b = L[j];
        if (!a.alive || !b.alive) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
        if (d >= m || d < 0.01) continue;
        const p = (m - d) / 2;
        move(W, a, -dx / d * p, -dy / d * p); move(W, b, dx / d * p, dy / d * p);
      }
    }
    function simulate(dt) {
      W.t += dt;
      // Sturm
      const nr = ringAt(W.t);
      if (nr < W.ringR - 0.01 && W.ringPhase % 2 === 0) {
        W.ringPhase++;
        if (P.alive && !W.over) { msg('Der Schneesturm zieht zu!', '#8ecae6', 22, 1.6); A.tone(180, 0.7, 'sawtooth', 0.06, 110); }
      } else if (nr === W.ringR && W.ringPhase % 2 === 1) W.ringPhase++;
      W.ringR = nr;
      W.stormTick -= dt;
      if (W.stormTick <= 0) {
        W.stormTick = 0.5;
        const dps = 260 + W.t * 2.2;
        for (const e of W.ents) if (e.alive && Math.hypot(e.x - CX, e.y - CY) > W.ringR) damage(e, dps * 0.5, null, 0, 0, '#8ecae6');
      }
      // Spieler
      W.aimTarget = P.alive ? autoAim(P, P.hero.range * 1.15) : null;
      if (P.alive) {
        const ax = ctx.input.axis();
        if (ctx.input.down('a')) { P.holdT = (P.holdT || 0) + dt; if (P.holdT > 0.42) { P.holdT = 0; playerThrow(); } }
        updateEnt(P, ax.x, ax.y, dt);
        if (P.sup >= 1 && !P.supReadyShown) P.supReadyShown = true;
        if (P.sup < 1) P.supReadyShown = false;
      }
      for (const e of W.ents) {
        if (e.isPlayer || !e.alive) continue;
        const m = botUpdate(W, e, dt, api);
        updateEnt(e, m.mx, m.my, dt);
      }
      separate();
      updateShots(dt);
      // Kristalle
      W.crystals = W.crystals.filter(c => {
        c.t += dt;
        if (c.t < 0.45) return true;
        for (const e of W.ents) {
          if (!e.alive || Math.hypot(e.x - c.x, e.y - c.y) > e.r + 14) continue;
          e.crystals++; e.maxHp += 400; e.hp += 400; e.dmgMul += 0.1;
          puff(c.x, c.y, 14, '#c77dff', 140, 3, 0.6);
          if (e.isPlayer) { A.sfx('power'); msg('Kraft-Kristall!', '#c77dff', 24, 1); num(e.x, e.y - 12, '+Kraft', '#c77dff', true); }
          return false;
        }
        return true;
      });
    }
    function updateFx(dt) {
      for (const p of W.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
      W.parts = W.parts.filter(p => p.life > 0);
      if (W.parts.length > 600) W.parts.splice(0, W.parts.length - 600);
      for (const n of W.nums) { n.y -= 34 * dt; n.life -= dt; }
      W.nums = W.nums.filter(n => n.life > 0);
      for (const f of W.fx) f.t += dt;
      W.fx = W.fx.filter(f => f.t < f.dur);
      for (const p of W.prints) p.life -= dt;
      W.prints = W.prints.filter(p => p.life > 0);
      if (W.prints.length > 250) W.prints.splice(0, W.prints.length - 250);
      for (const tb of W.tumbles) {
        tb.t += dt; tb.rot += dt * 12;
        const ox = tb.x, oy = tb.y;
        const fake = { x: tb.x, y: tb.y, r: 8 };
        move(W, fake, tb.vx * dt, tb.vy * dt);
        tb.x = fake.x; tb.y = fake.y;
        if (tb.x === ox) tb.vx *= -0.6; if (tb.y === oy) tb.vy *= -0.6;
        tb.vx *= 0.985; tb.vy *= 0.985;
        if (Math.random() < 0.4) W.prints.push({ x: tb.x, y: tb.y + 6, life: 1.5 });
      }
      W.tumbles = W.tumbles.filter(tb => tb.t < 1.8);
      for (const f of W.feed) f.t += dt;
      W.feed = W.feed.filter(f => f.t < 4);
      for (const m of W.msgs) m.t += dt;
      W.msgs = W.msgs.filter(m => m.t < m.dur);
      W.shake = Math.max(0, W.shake - dt * 20);
      W.hurt = Math.max(0, W.hurt - dt * 1.4);
      W.noAmmoT -= dt;
      // Kamera
      let fx = P.x + P.fx * 30, fy = P.y + P.fy * 40;
      if (!P.alive) { const tb = W.tumbles.find(t => t.e === P); if (tb) { fx = tb.x; fy = tb.y; } else { fx = W.camHold?.x ?? P.x; fy = W.camHold?.y ?? P.y; } }
      W.camHold = { x: fx, y: fy };
      const k = 1 - Math.exp(-6 * dt);
      W.cam.x += (clamp(fx - VW / 2, 0, WORLD - VW) - W.cam.x) * k;
      W.cam.y += (clamp(fy - VH / 2 + 20, 0, WORLD - VH) - W.cam.y) * k;
    }

    ctx.loop(dt => {
      S.t += dt;
      for (const f of S.flakes) { f.y += f.v * dt; f.x += Math.sin(S.t + f.v) * 8 * dt; if (f.y > VH) { f.y = -4; f.x = Math.random() * VW; } }
      if (S.phase === 'select') { drawSelect(g, S, stufe, pokale); return; }
      if (S.phase === 'count') {
        const before = Math.ceil(W.count / 0.5);
        W.count -= dt;
        const after = Math.ceil(W.count / 0.5);
        if (after !== before && after > 0 && after <= 3) { msg(String(after), '#ffffff', 56, 0.5); A.sfx('tick'); }
        if (W.count <= 0) {
          S.phase = 'play'; msg('Los!', '#06d6a0', 56, 0.8); A.sfx('jump');
          for (const e of W.ents) e.shieldT = 2.4;
        }
        updateFx(dt);
      } else {
        simulate(dt);
        updateFx(dt);
      }
      drawGame(g, W, S);
    });

    return { destroy() { if (debug.world === W) debug.world = null; } };
  },
};
