// Türchen 8: Kurs auf den Schatz – Piraten-Segelabenteuer von oben.
import { WW, WH, LAND_Y, TAU, rnd, dist, generate, islandPush, inBank, waterPoint } from './world.js';
import {
  C, drawShallows, drawIsland, drawRock, drawBank, drawHarbor, drawShip, drawPlankHeart, drawChest,
  drawDigger, drawTentacle, drawKrakenHead, drawCoin, drawPickup, drawIceBorder,
} from './art.js';

export const howto = {
  touch: 'Zieh den Stick oder tippe und ziehe direkt ins Wasser, dann segelt das Schiff dorthin. Der Feuer-Knopf schießt Schneebälle.',
  keys: 'Segle mit den Pfeiltasten, hoch = schneller. Die Leertaste schießt Schneebälle.',
};
export const starsInfo = '★ 1 Schatz gehoben · ★★ 2 Schätze · ★★★ alle 3 Truhen';

const VW = 360, VH = 560;
const MAXSPD = 128, CRUISE = 52, HP = 5;
const BOTTLES = [
  'Flaschenpost: „Der Krake hasst Schneebälle!“',
  'Flaschenpost: „Papageien sagen immer Arrr!“',
  'Flaschenpost: „Kapitän sucht seine linke Socke.“',
  'Flaschenpost: „Frohe Weihnachten auf allen Meeren!“',
  'Flaschenpost: „Geisterschiffe sind nur kitzlig.“',
  'Flaschenpost: „Wer das liest, ist ein echter Pirat!“',
];
const SINK_TOASTS = ['Arrr! Blubb blubb!', 'Volltreffer!', 'Ab ins Wellenbad!', 'Plumps! Arrr!'];
const SHANTY = [[62, 1], [57, .5], [62, .5], [65, 1], [64, .5], [62, .5], [60, 1], [57, 1],
  [62, 1], [65, .5], [69, .5], [67, 1], [65, .5], [64, .5], [62, 2],
  [69, 1], [69, .5], [67, .5], [65, 1], [67, .5], [69, .5], [70, 1], [69, 1],
  [67, .5], [65, .5], [64, .5], [62, .5], [64, 1], [61, 1], [62, 2]];
const BASS = [50, 50, 45, 50, 48, 50, 53, 53, 46, 43, 45, 50].flatMap(n => [[n - 12, 0.75], [0, 0.25], [n - 5, 0.75], [0, 0.25]]);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(VW, VH);
    const touch = ctx.input.isTouch;
    const map = generate();
    const { harbor, T, arena } = map;
    const ship = { x: harbor.x, y: harbor.y - 6, ang: -Math.PI / 2, spd: 0, turn: 0, kx: 0, ky: 0, hp: HP, inv: 0, sink: 0, cool: 0, bump: 0 };
    const cam = { x: ship.x - VW / 2, y: WH - VH };
    let time = 0, coins = 0, raised = 0, delivered = 0, leg = 0, over = false, grace = 3;
    let dig = null, heartPulse = 0, banner = null, deliverFx = 0;
    let ptr = null, course = null, moved = false, startHint = { t: 0 };
    let rivals = [], balls = [], pickups = [], parts = [], wake = [], winds = [], floats = [];
    let windAng = rnd(0, TAU), wakeT = 0, spawnT = 0, windT = 0, flashT = 0;
    const kraken = { hp: 7, max: 7, active: false, met: false, beaten: false, tents: [], spawnT: 1.2, head: null, shadowA: 0 };

    // ---------- Musik ----------
    let stopMusic = [];
    const startMusic = () => {
      if (over) return;
      stopMusic.forEach(f => f());
      stopMusic = [
        ctx.audio.melody(SHANTY, { bpm: 138, type: 'triangle', vol: 0.06, loop: true }),
        ctx.audio.melody(BASS, { bpm: 138, type: 'sine', vol: 0.07, loop: true }),
      ];
    };
    const endMusic = () => { stopMusic.forEach(f => f()); stopMusic = []; };
    startMusic();
    ctx.onPause(p => (p ? endMusic() : startMusic()));

    // ---------- Hilfen ----------
    const hud = () => ctx.hud.set({ 'Münzen': coins, 'Schätze': `${raised}/3` });
    const say = (text, ms = 2600) => { banner = { text, t: 0, ms: ms / 1000 }; };
    const burst = (x, y, color, n = 12, sp = 110, size = 3, life = 0.6, grav = 0) => {
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (0.3 + Math.random() * 0.7); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, c: color, s: size, grav }); }
    };
    const ring = (x, y, r = 14, c = 'rgba(255,255,255,.8)') => parts.push({ x, y, ring: true, r0: 3, r1: r, life: 0.45, max: 0.45, c });
    const bubbles = (x, y, n = 6) => { for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-10, 10), y: y + rnd(-10, 10), vx: rnd(-8, 8), vy: rnd(-25, -8), life: rnd(0.6, 1.2), max: 1.2, c: 'rgba(200,235,255,.8)', s: rnd(2, 4.5), bubble: true }); };
    const floatText = (x, y, text, c = C.gold) => floats.push({ x, y, text, c, life: 1 });
    const addCoins = (n, x, y) => { coins += n; floatText(x, y - 14, `+${n}`); hud(); };
    const target = () => (leg % 2 === 0 ? T[leg / 2] : harbor);
    const objective = () => {
      if (leg >= 6) return 'Alle Schätze daheim! Arrr!';
      if (leg % 2) return leg === 5 ? 'Letzte Fahrt: ab in den Hafen!' : 'Bring die Truhe zum Hafen!';
      if (leg === 4) return kraken.active ? 'Triff die Tentakel mit Feuer!' : 'Schatzinsel 3 – Vorsicht, Krake!';
      return `Segle zur Schatzinsel ${leg / 2 + 1}`;
    };

    // ---------- Gegner & Gegenstände ----------
    const rivalWanted = () => [1, 2, 2, 3, 3, 4][Math.min(5, leg)];
    function spawnRival() {
      const p = waterPoint(map, { awayFrom: ship, minDist: 380, pad: 40 });
      if (dist(p, harbor) < 260) return;
      rivals.push({ x: p.x, y: p.y, ang: rnd(0, TAU), spd: 40, hp: 2, home: { ...p }, pa: rnd(0, TAU), dir: Math.random() < 0.5 ? -1 : 1, shootT: rnd(2, 3.5), flash: 0, sink: 0, bump: 0 });
    }
    function spawnPickup(type, far = true) {
      const p = waterPoint(map, { awayFrom: far ? ship : harbor, minDist: far ? 260 : 150, pad: 26 });
      if (map.rocks.some(r => dist(r, p) < r.r + 26)) return;
      pickups.push({ ...p, type, ph: rnd(0, TAU) });
    }
    for (let i = 0; i < 14; i++) spawnPickup('barrel', false);
    for (let i = 0; i < 4; i++) spawnPickup('bottle', false);
    for (let i = 0; i < 3; i++) spawnPickup('repair', false);
    // ein Fass direkt vor dem Hafen für sofortigen Spaß
    pickups.push({ x: harbor.x + 10, y: harbor.y - 110, type: 'barrel', ph: 0 }, { x: harbor.x - 30, y: harbor.y - 190, type: 'barrel', ph: 1 });
    const count = t => pickups.reduce((n, p) => n + (p.type === t), 0);

    // ---------- Kampf ----------
    function fire() {
      if (over || ship.sink || dig || ship.cool > 0) return;
      ship.cool = 0.6;
      const targets = [
        ...rivals.filter(r => !r.sink).map(r => ({ x: r.x, y: r.y, vx: Math.cos(r.ang) * r.spd, vy: Math.sin(r.ang) * r.spd })),
        ...kraken.tents.filter(t => t.ph === 'up' || (t.ph === 'warn' && t.t > 0.6)).map(t => ({ x: t.x, y: t.y, vx: 0, vy: 0 })),
      ];
      const fx = Math.cos(ship.ang), fy = Math.sin(ship.ang);
      for (const side of [-1, 1]) {
        const na = ship.ang + side * Math.PI / 2, nx = Math.cos(na), ny = Math.sin(na);
        let best = null, bd = 270;
        for (const t of targets) {
          const dx = t.x - ship.x, dy = t.y - ship.y, d = Math.hypot(dx, dy);
          if (d < bd && (dx * nx + dy * ny) / d > -0.3) { best = t; bd = d; }
        }
        let aim = na;
        if (best) { const tt = bd / 290; aim = Math.atan2(best.y + best.vy * tt - ship.y, best.x + best.vx * tt - ship.x); }
        for (const sp of [-0.07, 0.07]) {
          const a = aim + sp, sx = ship.x + nx * 10 + fx * sp * 60, sy = ship.y + ny * 10 + fy * sp * 60;
          balls.push({ x: sx, y: sy, vx: Math.cos(a) * 290 + fx * ship.spd * 0.5, vy: Math.sin(a) * 290 + fy * ship.spd * 0.5, life: 0.95, own: 'p' });
          for (let i = 0; i < 4; i++) parts.push({ x: sx, y: sy, vx: nx * rnd(20, 60) + rnd(-15, 15), vy: ny * rnd(20, 60) + rnd(-15, 15), life: 0.5, max: 0.5, c: 'rgba(230,236,255,.7)', s: rnd(3, 6), smoke: true });
        }
      }
      ctx.audio.sfx('shoot'); ctx.audio.tone(120, 0.15, 'sawtooth', 0.12, 50);
    }
    ctx.input.onPress(n => { if (n === 'a') fire(); });
    ctx.input.pad({ stick: true, a: 'Feuer' });
    // Touch: Finger im Spielfeld steuert. Gedrückt halten = Schiff folgt dem Finger, kurzer Tipp = Kurs setzen.
    ctx.on(canvas, 'pointerdown', e => {
      if (!touch) return fire();
      const p = pos(e);
      ptr = { id: e.pointerId, sx: p.x, sy: p.y, x0: p.x, y0: p.y, t: 0 };
      try { canvas.setPointerCapture(e.pointerId); } catch {}
    });
    ctx.on(canvas, 'pointermove', e => { if (ptr && e.pointerId === ptr.id) { const p = pos(e); ptr.sx = p.x; ptr.sy = p.y; } });
    const endPtr = e => {
      if (!ptr || e.pointerId !== ptr.id) return;
      if (e.type === 'pointerup' && ptr.t < 0.3 && Math.hypot(ptr.sx - ptr.x0, ptr.sy - ptr.y0) < 14 && !over) {
        course = { x: cam.x + ptr.sx, y: cam.y + ptr.sy, t: 1.8 };
        ring(course.x, course.y, 16, 'rgba(255,209,102,.9)');
      }
      ptr = null;
    };
    ctx.on(canvas, 'pointerup', endPtr); ctx.on(canvas, 'pointercancel', endPtr);

    function hurt(srcX, srcY) {
      if (ship.inv > 0 || ship.sink || over) return;
      ship.hp--; ship.inv = 1.3; heartPulse = 1; flashT = 0.25;
      const dx = ship.x - srcX, dy = ship.y - srcY, d = Math.hypot(dx, dy) || 1;
      ship.kx += dx / d * 110; ship.ky += dy / d * 110; ship.spd *= 0.4;
      ctx.audio.sfx('hit'); ctx.fx.shake(200);
      burst(ship.x, ship.y, '#a06b2a', 10, 120, 3, 0.7);
      if (ship.hp <= 0) sinkShip();
      else if (ship.hp === 1) say('Nur noch 1 Planke! Such ein grünes Reparatur-Fass!');
      else if (ship.hp === 2) ctx.toast('Autsch! Arrr!');
    }
    function sinkShip() {
      ship.sink = 0.001; ptr = null; course = null; ctx.audio.sfx('boom'); endMusic();
      ctx.timeout(() => {
        over = true;
        const msg = raised === 0
          ? 'Dein Schiff ist auf Tauchstation gegangen. Für den ersten Stern: Schatzinsel 1 finden und die Truhe ausbuddeln!'
          : raised === 3
            ? 'Alle drei Truhen gehoben – 3 Sterne! Nächstes Mal bringst du sie auch noch heim, Kapitän!'
            : `${raised} ${raised === 1 ? 'Schatz' : 'Schätze'} gehoben! Für den nächsten Stern: ${raised === 2 ? 'Besiege den Kraken und hebe die dritte Truhe.' : 'Finde die nächste Schatzinsel.'} Reparatur-Fässer (grün) flicken dein Schiff.`;
        ctx.finish({ won: false, stars: raised, score: coins, text: msg });
      }, 1800);
    }

    // ---------- Update ----------
    function updateShip(dt) {
      if (ship.sink) { ship.sink += dt; ship.spd *= 0.95; if (Math.random() < 0.4) bubbles(ship.x, ship.y, 1); return; }
      const keys = ['left', 'right', 'up', 'down'].some(k => ctx.input.down(k));
      const ax = ctx.input.axis();
      let steer = 0, want = CRUISE, brake = false;
      if (dig) { want = 0; brake = true; }
      else if (keys || !touch) {
        if (keys) moved = true;
        steer = (ctx.input.down('right') ? 1 : 0) - (ctx.input.down('left') ? 1 : 0);
        if (ctx.input.down('up')) want = MAXSPD;
        if (ctx.input.down('down')) { want = 0; brake = true; }
      } else {
        const m = Math.hypot(ax.x, ax.y);
        let dirA = null, mag = 0;
        if (m > 0.2) { dirA = Math.atan2(ax.y, ax.x); mag = Math.min(1, m * 1.15); }
        else if (ptr) {
          const dx = cam.x + ptr.sx - ship.x, dy = cam.y + ptr.sy - ship.y, d = Math.hypot(dx, dy);
          if (d > 14) { dirA = Math.atan2(dy, dx); mag = Math.max(0.55, Math.min(1, d / 80)); }
        } else if (course) {
          const dx = course.x - ship.x, dy = course.y - ship.y, d = Math.hypot(dx, dy);
          course.t -= dt;
          if (d < 18 || course.t <= 0) course = null; else { dirA = Math.atan2(dy, dx); mag = 1; }
        }
        if (dirA != null) {
          moved = true;
          const diff = wrap(dirA - ship.ang);
          steer = Math.max(-1, Math.min(1, diff * 2.4));
          want = MAXSPD * mag * (Math.abs(diff) > 2 ? 0.45 : 1);
        } else { want = 0; }
      }
      const slow = inBank(map.banks, ship.x, ship.y);
      if (slow) want = Math.min(want, 40);
      const rate = want > ship.spd ? 0.9 : brake ? 2.4 : 1.2;
      ship.spd += (want - ship.spd) * Math.min(1, dt * rate);
      const turnWant = steer * 2.3 * (0.55 + 0.45 * Math.min(1, ship.spd / 80));
      ship.turn += (turnWant - ship.turn) * Math.min(1, dt * 5);
      ship.ang = wrap(ship.ang + ship.turn * dt);
      const windBoost = 1 + 0.12 * Math.cos(ship.ang - windAng);
      ship.x += (Math.cos(ship.ang) * ship.spd * windBoost + ship.kx) * dt;
      ship.y += (Math.sin(ship.ang) * ship.spd * windBoost + ship.ky) * dt;
      const kd = Math.exp(-3.5 * dt); ship.kx *= kd; ship.ky *= kd;
      if (slow && ship.spd > 20 && Math.random() < 0.3) parts.push({ x: ship.x + rnd(-8, 8), y: ship.y + rnd(-8, 8), vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.5, max: 0.5, c: 'rgba(233,207,143,.8)', s: 2 });
      // Kollisionen
      ship.bump -= dt;
      for (const isl of map.islands) {
        const h = islandPush(isl, ship.x, ship.y, 13);
        if (h) {
          ship.x += h.nx * h.depth; ship.y += h.ny * h.depth;
          const into = -(Math.cos(ship.ang) * h.nx + Math.sin(ship.ang) * h.ny);
          if (into > 0.3) ship.spd *= 1 - into * 0.15;
          if (ship.bump <= 0 && ship.spd > 30) { ship.bump = 0.6; ctx.audio.tone(140, 0.08, 'triangle', 0.15); burst(ship.x - h.nx * 10, ship.y - h.ny * 10, '#ecd497', 6, 60, 2); }
        }
      }
      for (const r of map.rocks) {
        const dx = ship.x - r.x, dy = ship.y - r.y, d = Math.hypot(dx, dy) || 1, R = r.r + 10;
        if (d < R) { ship.x = r.x + dx / d * R; ship.y = r.y + dy / d * R; burst(r.x + dx / d * r.r, r.y + dy / d * r.r, '#cfd8e6', 8, 90); hurt(r.x, r.y); if (ship.inv < 1.2) { ship.kx += dx / d * 40; ship.ky += dy / d * 40; } }
      }
      const p = map.pier;
      if (ship.y > p.y - 9 && ship.x > p.x - 9 && ship.x < p.x + p.w + 9) {
        const l = ship.x - (p.x - 9), rr = p.x + p.w + 9 - ship.x, top = ship.y - (p.y - 9);
        if (top < Math.min(l, rr)) ship.y = p.y - 9; else if (l < rr) ship.x = p.x - 9; else ship.x = p.x + p.w + 9;
        ship.spd *= 0.9;
      }
      if (ship.y > LAND_Y - 14) { ship.y = LAND_Y - 14; ship.spd *= 0.92; }
      if (ship.x < 24) ship.x = 24; if (ship.x > WW - 24) ship.x = WW - 24; if (ship.y < 24) ship.y = 24;
      // Kielwasser
      wakeT -= dt;
      if (ship.spd > 14 && wakeT <= 0) {
        wakeT = 0.035;
        const bx = ship.x - Math.cos(ship.ang) * 13, by = ship.y - Math.sin(ship.ang) * 13, px = -Math.sin(ship.ang), py = Math.cos(ship.ang);
        const sv = 10 + ship.spd * 0.18;
        for (const s of [-1, 1]) wake.push({ x: bx + px * s * 5, y: by + py * s * 5, vx: px * s * sv, vy: py * s * sv, life: 1.3, max: 1.3, s: 2, side: s });
        wake.push({ x: bx, y: by, vx: 0, vy: 0, life: 0.9, max: 0.9, s: 3, mid: true });
        if (ship.spd > 90) wake.push({ x: ship.x + Math.cos(ship.ang) * 16, y: ship.y + Math.sin(ship.ang) * 16, vx: px * 25 * (Math.random() < 0.5 ? -1 : 1), vy: py * 25, life: 0.4, max: 0.4, s: 1.5, bow: true });
      }
    }

    function updateRivals(dt) {
      for (const r of rivals) {
        r.flash -= dt;
        if (r.sink) { r.sink += dt; if (Math.random() < 0.5) bubbles(r.x, r.y, 1); continue; }
        const d = dist(r, ship);
        const engage = d < 280 && grace <= 0 && !ship.sink && !dig;
        let tx, ty;
        if (engage) {
          const a = Math.atan2(r.y - ship.y, r.x - ship.x) + 0.55 * r.dir;
          tx = ship.x + Math.cos(a) * 150; ty = ship.y + Math.sin(a) * 150;
        } else {
          r.pa += dt * 0.35 * r.dir;
          tx = r.home.x + Math.cos(r.pa) * 95; ty = r.home.y + Math.sin(r.pa) * 95;
        }
        const diff = wrap(Math.atan2(ty - r.y, tx - r.x) - r.ang);
        r.ang = wrap(r.ang + Math.max(-1.5, Math.min(1.5, diff * 2)) * dt);
        const want = engage ? 70 + leg * 4 : 38;
        r.spd += (want - r.spd) * Math.min(1, dt);
        r.x += Math.cos(r.ang) * r.spd * dt; r.y += Math.sin(r.ang) * r.spd * dt;
        for (const isl of map.islands) { const h = islandPush(isl, r.x, r.y, 14); if (h) { r.x += h.nx * h.depth; r.y += h.ny * h.depth; r.ang = wrap(r.ang + 0.08 * r.dir); } }
        for (const k of map.rocks) { const dd = dist(k, r); if (dd < k.r + 12) { r.x = k.x + (r.x - k.x) / dd * (k.r + 12); r.y = k.y + (r.y - k.y) / dd * (k.r + 12); } }
        r.x = Math.max(30, Math.min(WW - 30, r.x)); r.y = Math.max(30, Math.min(LAND_Y - 120, r.y));
        if (Math.random() < dt * 14 && r.spd > 20) wake.push({ x: r.x - Math.cos(r.ang) * 13, y: r.y - Math.sin(r.ang) * 13, vx: 0, vy: 0, life: 0.8, max: 0.8, s: 2.5, mid: true, ghost: true });
        if (engage && d < 250) {
          r.shootT -= dt;
          if (r.shootT <= 0) {
            r.shootT = rnd(2.3, 3.3) - leg * 0.12;
            const tt = d / 135 * 0.8;
            const a = Math.atan2(ship.y + Math.sin(ship.ang) * ship.spd * tt - r.y, ship.x + Math.cos(ship.ang) * ship.spd * tt - r.x);
            balls.push({ x: r.x, y: r.y, vx: Math.cos(a) * 135, vy: Math.sin(a) * 135, life: 2.6, own: 'e' });
            ctx.audio.tone(500, 0.12, 'triangle', 0.1, 260); ring(r.x, r.y, 12, 'rgba(199,125,255,.8)');
          }
        }
        // Rammen
        r.bump -= dt;
        if (d < 26 && !ship.sink) {
          const dx = (ship.x - r.x) / (d || 1), dy = (ship.y - r.y) / (d || 1);
          r.x -= dx * 6; r.y -= dy * 6;
          if (r.bump <= 0) { r.bump = 1; hurt(r.x, r.y); }
        }
      }
      rivals = rivals.filter(r => !r.sink || r.sink < 1.8);
    }

    function sinkRival(r) {
      r.sink = 0.001; ctx.audio.sfx('pop'); ctx.audio.sfx('swoosh');
      ring(r.x, r.y, 30); bubbles(r.x, r.y, 12); burst(r.x, r.y, C.violet, 14, 100, 3);
      for (let i = 0; i < 4; i++) pickups.push({ x: r.x + rnd(-22, 22), y: r.y + rnd(-22, 22), type: 'coin', ph: rnd(0, TAU), drop: true });
      ctx.toast(SINK_TOASTS[Math.floor(Math.random() * SINK_TOASTS.length)]);
    }

    function updateBalls(dt) {
      for (const b of balls) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.own === 'p' && Math.random() < 0.6) parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.25, max: 0.25, c: 'rgba(255,209,102,.7)', s: 2.2 });
        let hit = false;
        if (map.islands.some(i => islandPush(i, b.x, b.y, 0)) || map.rocks.some(r => dist(r, b) < r.r) || b.y > LAND_Y) hit = true;
        if (b.own === 'p' && !hit) {
          for (const r of rivals) if (!r.sink && dist(r, b) < 19) {
            hit = true; r.hp--; r.flash = 0.15; ctx.audio.sfx('hit'); burst(b.x, b.y, '#fff', 10, 90);
            if (r.hp <= 0) { sinkRival(r); }
            break;
          }
          if (!hit) for (const te of kraken.tents) if ((te.ph === 'up' || (te.ph === 'warn' && te.t > 0.6)) && dist(te, b) < 20) {
            hit = true; te.ph = 'down'; te.t = 0; te.flash = 0.2; kraken.hp--; ctx.audio.sfx('hit'); burst(b.x, b.y, '#f5c6ff', 14, 120);
            ring(te.x, te.y, 26); floatText(te.x, te.y - 20, 'Blubb!', C.violet);
            if (kraken.hp <= 0) beatKraken(te); else if (kraken.hp === 3) ctx.toast('Der Krake wackelt!');
            break;
          }
        }
        if (b.own === 'e' && !hit && !ship.sink && dist(ship, b) < 13) { hit = true; hurt(b.x - b.vx * 0.05, b.y - b.vy * 0.05); burst(b.x, b.y, '#e6f2ff', 12, 100); }
        if (hit) { b.life = 0; ring(b.x, b.y, 10); }
        else if (b.life <= 0) { ring(b.x, b.y, 12, 'rgba(200,230,255,.7)'); burst(b.x, b.y, 'rgba(200,230,255,.9)', 5, 50, 2, 0.4); }
      }
      balls = balls.filter(b => b.life > 0);
    }

    function beatKraken(te) {
      kraken.beaten = true; kraken.active = false;
      kraken.tents.forEach(t => { if (t.ph !== 'down') { t.ph = 'down'; t.t = 0; } });
      kraken.head = { x: te.x, y: te.y, t: 0 };
      ctx.audio.sfx('level'); ctx.fx.shake(300);
      for (let i = 0; i < 10; i++) pickups.push({ x: te.x + rnd(-40, 40), y: te.y + rnd(-40, 40), type: 'coin', ph: rnd(0, TAU), drop: true });
      ctx.toast('Krake besiegt! Arrr!');
      say('Der Krake taucht beleidigt ab. Jetzt schnell zur Insel und buddeln!');
    }

    function updateKraken(dt) {
      const inArena = dist(ship, arena) < arena.R + 20;
      if (leg === 4 && !kraken.beaten && inArena && !ship.sink) {
        if (!kraken.met) { kraken.met = true; kraken.spawnT = 1.6; ctx.toast('Ein KRAKE! Arrr!'); ctx.audio.sfx('bad'); ctx.fx.shake(300); say('Tentakel tauchen bei den roten Kreisen auf. Weich aus und feuere!'); }
        kraken.active = true;
      } else kraken.active = false;
      if (kraken.active) {
        kraken.spawnT -= dt;
        if (kraken.spawnT <= 0 && kraken.tents.length < 3) {
          kraken.spawnT = rnd(1.0, 1.6);
          for (let i = 0; i < 20; i++) {
            const lead = Math.random() < 0.5 ? 1.1 : 0.6, a = rnd(0, TAU), r = i < 10 ? rnd(0, 55) : rnd(30, 90);
            const x = ship.x + Math.cos(ship.ang) * ship.spd * lead + Math.cos(a) * r, y = ship.y + Math.sin(ship.ang) * ship.spd * lead + Math.sin(a) * r;
            if (map.islands.some(o => islandPush(o, x, y, 16)) || y < 20 || x < 20 || x > WW - 20) continue;
            if (kraken.tents.some(t => Math.hypot(t.x - x, t.y - y) < 40)) continue;
            kraken.tents.push({ x, y, ph: 'warn', t: 0, sway: rnd(0, TAU), dir: Math.random() < 0.5 ? -1 : 1, flash: 0, hit: false });
            ctx.audio.tone(90, 0.3, 'sine', 0.15, 60);
            break;
          }
        }
      }
      for (const te of kraken.tents) {
        te.t += dt; te.flash -= dt;
        if (te.ph === 'warn' && te.t > 1.1) {
          te.ph = 'up'; te.t = 0; ctx.audio.sfx('swoosh'); ring(te.x, te.y, 30); burst(te.x, te.y, 'rgba(220,240,255,.9)', 12, 110, 2.5);
        } else if (te.ph === 'up') {
          if (!te.hit && dist(te, ship) < 25) { te.hit = true; hurt(te.x, te.y); }
          if (te.t > 2.0) { te.ph = 'down'; te.t = 0; }
        }
      }
      kraken.tents = kraken.tents.filter(te => !(te.ph === 'down' && te.t > 0.4));
      if (kraken.head) { kraken.head.t += dt; if (kraken.head.t > 3) kraken.head = null; }
      kraken.shadowA += dt * 0.5;
    }

    function updatePickups(dt) {
      for (const p of pickups) {
        p.x += Math.cos(windAng) * 3 * dt; p.y += Math.sin(windAng) * 3 * dt;
        const d = dist(p, ship);
        if (p.type === 'coin' && d < 90 && !ship.sink) { const k = Math.min(1, dt * 6); p.x += (ship.x - p.x) * k; p.y += (ship.y - p.y) * k; }
        if (d < 21 && !ship.sink) {
          p.got = true;
          if (p.type === 'coin') { addCoins(1, p.x, p.y); ctx.audio.tone(1300, 0.06, 'square', 0.08); burst(p.x, p.y, C.gold, 5, 60, 2); }
          if (p.type === 'barrel') { addCoins(2, p.x, p.y); ctx.audio.sfx('coin'); burst(p.x, p.y, C.gold, 10, 90); burst(p.x, p.y, '#8a5a2b', 6, 70); }
          if (p.type === 'bottle') { addCoins(5, p.x, p.y); ctx.audio.sfx('power'); burst(p.x, p.y, C.green, 12, 100); say(BOTTLES[Math.floor(Math.random() * BOTTLES.length)]); }
          if (p.type === 'repair') {
            if (ship.hp < HP) { ship.hp++; heartPulse = 1; floatText(p.x, p.y - 14, '+1 Planke', C.green); ctx.toast('Repariert! Arrr!'); }
            else addCoins(3, p.x, p.y);
            ctx.audio.sfx('power'); burst(p.x, p.y, C.green, 14, 100);
          }
        }
        if (p.x < 15 || p.x > WW - 15 || p.y < 15 || p.y > LAND_Y - 20 || map.islands.some(o => islandPush(o, p.x, p.y, 4))) p.got = true;
      }
      pickups = pickups.filter(p => !p.got);
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = 2.5;
        if (count('barrel') < 12) spawnPickup('barrel');
        if (count('bottle') < 3) spawnPickup('bottle');
        if (count('repair') < (ship.hp <= 2 ? 4 : 2)) spawnPickup('repair');
        if (rivals.filter(r => !r.sink).length < rivalWanted()) spawnRival();
      }
    }

    function updateGoals(dt) {
      if (ship.sink || over) return;
      if (dig) {
        dig.t += dt;
        if (dig.t < 1.4 && Math.floor(dig.t * 6) !== Math.floor((dig.t - dt) * 6)) { ctx.audio.sfx('tick'); for (let i = 0; i < 4; i++) parts.push({ x: dig.isl.x + 4, y: dig.isl.y, vx: rnd(-60, 60), vy: rnd(-90, -20), life: 0.6, max: 0.6, c: '#c9a560', s: 2.5, grav: 220 }); }
        if (dig.t >= 1.7 && !dig.opened) {
          dig.opened = true; ctx.audio.sfx('power'); ctx.fx.shake(150);
          for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + rnd(-0.9, 0.9), v = rnd(80, 180); parts.push({ x: dig.isl.x, y: dig.isl.y - 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.1, max: 1.1, c: C.gold, s: 3, grav: 260, coin: true }); }
        }
        if (dig.t >= 2.6) {
          dig.isl.dug = true; raised++; addCoins(25, dig.isl.x, dig.isl.y);
          ctx.audio.sfx('coin'); ctx.toast(`Arrr! Schatz Nr. ${raised}!`);
          say(raised === 3 ? 'Der letzte Schatz! Jetzt heim in den Hafen!' : 'Ab nach Hause damit! Folge dem Pfeil zum Hafen.');
          ctx.progress({ stars: raised, score: coins, text: raised === 3 ? 'Alle drei Truhen gehoben!' : `${raised} ${raised === 1 ? 'Schatz' : 'Schätze'} gehoben. Für den nächsten Stern: die nächste Schatzinsel finden.` });
          leg++; dig = null; hud();
        }
        return;
      }
      if (leg % 2 === 0 && leg < 6) {
        const isl = T[leg / 2];
        if (leg === 4 && !kraken.beaten) { if (!kraken.warned && islandPush(isl, ship.x, ship.y, 34)) { kraken.warned = true; say('Erst den Kraken verjagen! Triff 7 Tentakel.'); } return; }
        if (islandPush(isl, ship.x, ship.y, 34)) { dig = { isl, t: 0 }; ship.turn = 0; ctx.audio.sfx('jump'); ctx.toast('Anker werfen!'); }
      } else if (leg % 2 === 1 && dist(ship, harbor) < harbor.r + 6) {
        delivered++; leg++; deliverFx = 1.4;
        addCoins(15, harbor.x, harbor.y); ship.hp = HP; heartPulse = 1;
        ctx.audio.sfx('level'); ctx.fx.emojiBurst('⭐');
        for (let i = 0; i < 30; i++) parts.push({ x: harbor.x, y: harbor.y, vx: rnd(-120, 120), vy: rnd(-200, -60), life: 1.2, max: 1.2, c: [C.gold, C.red, C.green, C.ice][i % 4], s: 3, grav: 200 });
        if (delivered === 3) {
          over = true; endMusic(); ctx.toast('Alle Schätze daheim!');
          ctx.timeout(() => ctx.finish({ won: true, stars: 3, score: coins, text: `Alle drei Truhen sicher im Hafen! ${coins} Münzen – Arrr, Kapitän!` }), 1500);
        } else {
          ctx.toast(`Schatz ${delivered} im Hafen!`);
          say(delivered === 1 ? 'Schiff repariert! Neue Schatzkarte: Insel 2 wartet.' : 'Schiff repariert! Die letzte Insel bewacht ein Krake …');
          grace = 2;
        }
      }
    }

    function updateFx(dt) {
      for (const p of parts) { p.life -= dt; if (!p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.grav) p.vy += p.grav * dt; if (p.smoke) { p.vx *= 0.94; p.vy *= 0.94; } } }
      parts = parts.filter(p => p.life > 0);
      if (parts.length > 500) parts.splice(0, parts.length - 500);
      for (const w of wake) { w.life -= dt; w.x += w.vx * dt; w.y += w.vy * dt; w.vx *= 0.97; w.vy *= 0.97; }
      wake = wake.filter(w => w.life > 0);
      for (const f of floats) { f.life -= dt; f.y -= 22 * dt; }
      floats = floats.filter(f => f.life > 0);
      windT -= dt;
      if (windT <= 0) { windT = 0.25; if (winds.length < 10) winds.push({ x: cam.x + rnd(-40, VW + 40), y: cam.y + rnd(-40, VH + 40), life: rnd(1.4, 2.4), max: 2.4 }); }
      for (const wl of winds) { wl.life -= dt; wl.x += Math.cos(windAng) * 70 * dt; wl.y += Math.sin(windAng) * 70 * dt; }
      winds = winds.filter(wl => wl.life > 0);
      windAng += Math.sin(time * 0.1) * 0.05 * dt;
    }

    // ---------- Zeichnen ----------
    function drawWater() {
      const grd = g.createLinearGradient(0, 0, 0, VH);
      grd.addColorStop(0, '#0f2a5c'); grd.addColorStop(1, '#0c2350');
      g.fillStyle = grd; g.fillRect(0, 0, VW, VH);
      g.save(); g.translate(-cam.x, -cam.y);
      const S = 46, x0 = Math.floor(cam.x / S) - 1, y0 = Math.floor(cam.y / S) - 1;
      g.lineCap = 'round';
      for (let j = y0; j < y0 + VH / S + 3; j++) for (let i = x0; i < x0 + VW / S + 3; i++) {
        const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453, r = h - Math.floor(h);
        const x = i * S + r * 30 + Math.sin(time * 0.9 + r * 6) * 4, y = j * S + ((r * 7) % 1) * 30;
        const a = 0.1 + 0.12 * Math.sin(time * 1.6 + r * 12);
        if (a <= 0.02) continue;
        g.strokeStyle = `rgba(142,202,230,${a})`; g.lineWidth = 1.6;
        g.beginPath(); g.arc(x, y, 5, Math.PI * 1.15, Math.PI * 1.85); g.arc(x + 9, y, 5, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
        if (r > 0.85) { g.fillStyle = `rgba(255,255,255,${0.25 + 0.25 * Math.sin(time * 3 + r * 40)})`; g.fillRect(x + 14, y + 8, 2, 2); }
      }
      g.restore();
    }

    function onScreen(x, y, m) { return x > cam.x - m && x < cam.x + VW + m && y > cam.y - m && y < cam.y + VH + m; }

    function draw() {
      drawWater();
      g.save(); g.translate(-cam.x, -cam.y);
      const tgt = leg < 6 ? target() : null;
      // Krakenschatten
      if (leg === 4 && !kraken.beaten && onScreen(arena.x, arena.y, arena.R)) {
        const sx = arena.x + Math.cos(kraken.shadowA) * 120, sy = arena.y + Math.sin(kraken.shadowA * 1.3) * 110;
        g.fillStyle = 'rgba(20,5,40,.35)'; g.beginPath(); g.ellipse(sx, sy, 46, 34, kraken.shadowA, 0, TAU); g.fill();
        g.fillStyle = 'rgba(239,71,111,.55)'; g.beginPath(); g.arc(sx - 10, sy, 3, 0, TAU); g.arc(sx + 10, sy, 3, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(199,125,255,.18)'; g.lineWidth = 3; g.setLineDash([14, 12]); g.lineDashOffset = time * 10;
        g.beginPath(); g.arc(arena.x, arena.y, arena.R, 0, TAU); g.stroke(); g.setLineDash([]);
      }
      for (const b of map.banks) if (onScreen(b.x, b.y, 90)) drawBank(g, b, time);
      for (const isl of map.islands) if (onScreen(isl.x, isl.y, isl.r * 1.5)) drawShallows(g, isl, time);
      for (const w of wake) if (w.mid || w.bow) {
        const k = w.life / w.max;
        g.fillStyle = w.ghost ? `rgba(199,125,255,${k * 0.25})` : `rgba(255,255,255,${k * 0.22})`;
        g.beginPath(); g.arc(w.x, w.y, w.s + (1 - k) * 6, 0, TAU); g.fill();
      }
      g.lineCap = 'round';
      for (const side of [-1, 1]) {
        let prev = null;
        for (const w of wake) {
          if (w.side !== side) continue;
          if (prev && Math.hypot(w.x - prev.x, w.y - prev.y) < 30) {
            const k = w.life / w.max;
            g.strokeStyle = `rgba(255,255,255,${k * 0.75})`; g.lineWidth = 1 + k * 2;
            g.beginPath(); g.moveTo(prev.x, prev.y); g.lineTo(w.x, w.y); g.stroke();
          }
          prev = w;
        }
      }
      for (const p of pickups) if (onScreen(p.x, p.y, 24)) { g.save(); g.translate(p.x, p.y); g.scale(1.35, 1.35); g.translate(-p.x, -p.y); drawPickup(g, p, time); g.restore(); }
      for (const isl of map.islands) if (onScreen(isl.x, isl.y, isl.r * 1.3)) drawIsland(g, isl, time, tgt === isl);
      for (const r of map.rocks) if (onScreen(r.x, r.y, 30)) drawRock(g, r, time);
      if (cam.y + VH > LAND_Y - 200) drawHarbor(g, map, time, leg % 2 === 1);
      // Buddeln
      if (dig) {
        const { isl, t } = dig;
        if (t < 1.9) drawDigger(g, isl.x - 14, isl.y + 4, t);
        g.fillStyle = '#5b3d1d'; g.beginPath(); g.ellipse(isl.x, isl.y, 4 + Math.min(1, t / 1.2) * 7, 3 + Math.min(1, t / 1.2) * 5, 0, 0, TAU); g.fill();
        if (t > 1.3) { const k = Math.min(1, (t - 1.3) / 0.3), jump = Math.sin(Math.min(1, (t - 1.3) / 0.4) * Math.PI) * 10; drawChest(g, isl.x, isl.y - jump, 0.6 + 0.5 * k, t > 1.7 ? Math.min(1, (t - 1.7) / 0.25) : 0); }
      }
      for (const te of kraken.tents) if (te.ph === 'warn') drawTentacle(g, te, time);
      for (const r of rivals) {
        const sk = r.sink ? Math.min(1, r.sink / 1.6) : 0;
        drawShip(g, r, time, { ghost: true, sail: Math.min(1, r.spd / 70), alpha: 1 - sk, scale: 1.2 - sk * 0.6, tilt: sk * 0.8, flash: r.flash > 0 });
      }
      if (!(ship.inv > 0 && !ship.sink && Math.floor(ship.inv * 12) % 2)) {
        const sk = ship.sink ? Math.min(1, ship.sink / 1.6) : 0;
        drawShip(g, ship, time, { sail: Math.min(1, ship.spd / MAXSPD), chest: leg % 2 === 1, alpha: 1 - sk * 0.9, scale: 1.22 - sk * 0.5, tilt: sk * 1.2 + Math.sin(time * 2) * 0.03 });
      }
      for (const te of kraken.tents) if (te.ph !== 'warn') drawTentacle(g, te, time);
      if (kraken.head) { const k = kraken.head.t, s = k < 0.4 ? k / 0.4 : k > 2.4 ? Math.max(0, (3 - k) / 0.6) : 1; drawKrakenHead(g, kraken.head.x, kraken.head.y, s, time, true); }
      for (const b of balls) {
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(b.x + 2, b.y + 3, 4, 0, TAU); g.fill();
        g.fillStyle = b.own === 'p' ? '#ffffff' : '#d8c4ff'; g.beginPath(); g.arc(b.x, b.y, b.own === 'p' ? 4 : 5.5, 0, TAU); g.fill();
        g.strokeStyle = b.own === 'p' ? C.gold : C.violet; g.lineWidth = 1.5; g.stroke();
      }
      for (const p of parts) {
        const k = Math.max(0, p.life / p.max);
        if (p.ring) { g.strokeStyle = p.c; g.globalAlpha = k; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * (1 - k), 0, TAU); g.stroke(); g.globalAlpha = 1; continue; }
        g.globalAlpha = p.smoke ? k * 0.7 : Math.min(1, k * 1.6);
        if (p.coin) drawCoin(g, p.x, p.y, time, 3.5);
        else if (p.bubble || p.smoke) { g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s * (p.smoke ? 2 - k : 1), 0, TAU); g.fill(); }
        else { g.fillStyle = p.c; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
      }
      g.globalAlpha = 1;
      g.lineCap = 'round';
      for (const wl of winds) {
        const k = Math.sin(Math.min(1, wl.life / wl.max) * Math.PI);
        g.strokeStyle = `rgba(255,255,255,${0.28 * k})`; g.lineWidth = 1.3;
        const dx = Math.cos(windAng) * 22, dy = Math.sin(windAng) * 22;
        g.beginPath(); g.moveTo(wl.x, wl.y); g.quadraticCurveTo(wl.x + dx * 0.5 - dy * 0.12, wl.y + dy * 0.5 + dx * 0.12, wl.x + dx, wl.y + dy); g.stroke();
      }
      for (const f of floats) {
        g.globalAlpha = Math.min(1, f.life * 2); g.font = 'bold 14px system-ui, sans-serif'; g.textAlign = 'center';
        g.lineWidth = 3; g.strokeStyle = '#0b1437'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.c; g.fillText(f.text, f.x, f.y);
      }
      g.globalAlpha = 1;
      drawIceBorder(g, cam, VW, VH, time);
      // Zielpfeil um das Schiff
      if (tgt && !ship.sink && !dig) {
        const d = dist(tgt, ship);
        if (d > 75) {
          const a = Math.atan2(tgt.y - ship.y, tgt.x - ship.x), R = 36 + Math.sin(time * 5) * 3;
          g.save(); g.translate(ship.x + Math.cos(a) * R, ship.y + Math.sin(a) * R); g.rotate(a);
          g.fillStyle = leg % 2 ? C.gold : C.red; g.strokeStyle = '#0b1437'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(10, 0); g.lineTo(-6, -8); g.lineTo(-2, 0); g.lineTo(-6, 8); g.closePath(); g.stroke(); g.fill();
          g.restore();
        }
      }
      g.restore();
      drawUI();
    }

    function drawUI() {
      // Planken-Herzen
            for (let i = 0; i < HP; i++) drawPlankHeart(g, 18 + i * 22, 9, 18, i < ship.hp, 1 + (i === ship.hp - 1 ? heartPulse * 0.4 : 0) + (ship.hp === 1 && i === 0 ? Math.sin(time * 10) * 0.08 : 0));
      // Ziel
      g.font = 'bold 14px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const ob = objective(), tw = g.measureText(ob).width + 24;
      g.fillStyle = 'rgba(11,20,55,.78)'; roundRect(VW / 2 - tw / 2, 34, tw, 26, 13); g.fill();
      g.strokeStyle = 'rgba(255,209,102,.6)'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = C.gold; g.fillText(ob, VW / 2, 47.5);
      // Kraken-Leiste
      if (kraken.met && !kraken.beaten && leg === 4) {
        g.fillStyle = 'rgba(11,20,55,.8)'; roundRect(VW - 128, 8, 120, 18, 9); g.fill();
        g.fillStyle = C.violet; roundRect(VW - 125, 11, 114 * kraken.hp / kraken.max, 12, 6); g.fill();
        g.fillStyle = '#fff'; g.font = 'bold 12px system-ui, sans-serif'; g.fillText('KRAKE', VW - 68, 17.5);
      }
      // Banner
      const hintText = startHint ? (touch ? 'Stick ziehen oder ins Wasser tippen = segeln, Feuer = Kanonen' : 'Pfeiltasten = segeln (hoch = schneller), Leertaste = Kanonen') : null;
      if (banner && banner.t > banner.ms) banner = null;
      if (hintText) {
        g.font = 'bold 15px system-ui, sans-serif';
        const lines = wrapText(hintText, VW - 70), bh = lines.length * 20 + 16, by = 74;
        g.fillStyle = 'rgba(244,236,216,.96)'; roundRect(22, by, VW - 44, bh, 10); g.fill();
        g.strokeStyle = C.gold; g.lineWidth = 2.5; g.stroke();
        g.fillStyle = '#3a2410'; lines.forEach((l, i) => g.fillText(l, VW / 2, by + 18 + i * 20));
      } else if (banner) {
        {
          const k = Math.min(1, banner.t * 5, (banner.ms - banner.t) * 4);
          g.globalAlpha = k; g.font = 'bold 14px system-ui, sans-serif';
          const lines = wrapText(banner.text, VW - 60); const bh = lines.length * 18 + 14;
          const by = VH - 112 - bh; g.fillStyle = 'rgba(244,236,216,.95)'; roundRect(22, by, VW - 44, bh, 10); g.fill();
          g.strokeStyle = '#8a5a1e'; g.lineWidth = 2; g.stroke();
          g.fillStyle = '#3a2410'; lines.forEach((l, i) => g.fillText(l, VW / 2, by + 16 + i * 18));
          g.globalAlpha = 1;
        }
      }
      // Minikarte
      const mw = 62, mh = mw * WH / WW, mx = VW - mw - 8, my = VH - mh - 8, k = mw / WW;
      g.fillStyle = 'rgba(244,236,216,.88)'; roundRect(mx - 3, my - 3, mw + 6, mh + 6, 6); g.fill();
      g.strokeStyle = '#8a5a1e'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = 'rgba(70,120,170,.35)'; g.fillRect(mx, my, mw, LAND_Y * k);
      g.fillStyle = '#c8b27a'; for (const isl of map.islands) { g.beginPath(); g.arc(mx + isl.x * k, my + isl.y * k, Math.max(1.5, isl.r * k), 0, TAU); g.fill(); }
      g.fillStyle = '#e0e8f4'; g.fillRect(mx, my + LAND_Y * k, mw, mh - LAND_Y * k);
      g.fillStyle = '#5b3a1a'; g.fillRect(mx + harbor.x * k - 2, my + harbor.y * k - 1, 4, 4);
      if (leg === 4 && !kraken.beaten) { g.strokeStyle = 'rgba(160,60,200,.7)'; g.lineWidth = 1; g.beginPath(); g.arc(mx + arena.x * k, my + arena.y * k, arena.R * k, 0, TAU); g.stroke(); }
      for (const r of rivals) if (!r.sink) { g.fillStyle = C.violet; g.fillRect(mx + r.x * k - 1, my + r.y * k - 1, 2.5, 2.5); }
      const tg = leg < 6 ? target() : null;
      if (tg && Math.sin(time * 6) > -0.4) {
        g.strokeStyle = leg % 2 ? '#b9791b' : C.red; g.lineWidth = 2;
        const tx = mx + tg.x * k, ty = my + tg.y * k;
        if (leg % 2) { g.beginPath(); g.arc(tx, ty, 4.5, 0, TAU); g.stroke(); }
        else { g.beginPath(); g.moveTo(tx - 3.5, ty - 3.5); g.lineTo(tx + 3.5, ty + 3.5); g.moveTo(tx + 3.5, ty - 3.5); g.lineTo(tx - 3.5, ty + 3.5); g.stroke(); }
      }
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.strokeRect(mx + cam.x * k, my + cam.y * k, VW * k, VH * k);
      g.fillStyle = '#fff'; g.strokeStyle = '#0b1437'; g.beginPath(); g.arc(mx + ship.x * k, my + ship.y * k, 2.6, 0, TAU); g.fill(); g.stroke();
      // Treffer-Blitz und Hafen-Glanz
      if (flashT > 0) { g.fillStyle = `rgba(239,71,111,${flashT})`; g.fillRect(0, 0, VW, VH); }
      if (deliverFx > 0) { g.fillStyle = `rgba(255,209,102,${deliverFx * 0.15})`; g.fillRect(0, 0, VW, VH); }
      if (ship.hp === 1 && !ship.sink) { const v = g.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.7); v.addColorStop(0, 'rgba(239,71,111,0)'); v.addColorStop(1, `rgba(239,71,111,${0.18 + Math.sin(time * 6) * 0.08})`); g.fillStyle = v; g.fillRect(0, 0, VW, VH); }
    }
    function roundRect(x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
    function wrapText(text, maxW) {
      const words = text.split(' '), lines = []; let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
      if (cur) lines.push(cur); return lines;
    }

    // ---------- Schleife ----------
    hud();
        ctx.loop(dt => {
      if (startHint) { startHint.t += dt; if ((moved && startHint.t > 0.6) || startHint.t > 14) { startHint = null; say('Folge dem roten Pfeil zur markierten Insel!', 3000); } }
      time += dt; grace -= dt; heartPulse = Math.max(0, heartPulse - dt * 2); if (banner) banner.t += dt; flashT = Math.max(0, flashT - dt); deliverFx = Math.max(0, deliverFx - dt);
      if (!over) {
        ship.inv = Math.max(0, ship.inv - dt); ship.cool -= dt;
        if (ctx.input.down('a') && ship.cool <= 0) fire();
        updateShip(dt); updateRivals(dt); updateBalls(dt); updateKraken(dt); updatePickups(dt); updateGoals(dt);
      }
      updateFx(dt);
      const lx = ship.x + Math.cos(ship.ang) * ship.spd * 0.55 - VW / 2, ly = ship.y + Math.sin(ship.ang) * ship.spd * 0.55 - VH / 2;
      const ck = Math.min(1, dt * 3.5);
      cam.x += (lx - cam.x) * ck; cam.y += (ly - cam.y) * ck;
      cam.x = Math.max(0, Math.min(WW - VW, cam.x)); cam.y = Math.max(0, Math.min(WH - VH, cam.y));
      draw();
    });

    if (new URLSearchParams(location.search).has('debug8')) {
      canvas._dbg = {
        get s() { return { ship: { ...ship }, leg, raised, delivered, coins, over, dig: !!dig, target: leg < 6 ? { x: target().x, y: target().y } : null, rivals: rivals.filter(r => !r.sink).map(r => ({ x: r.x, y: r.y })), tents: kraken.tents.map(t => ({ x: t.x, y: t.y, ph: t.ph })), kraken: { hp: kraken.hp, active: kraken.active, beaten: kraken.beaten }, islands: map.islands.map(i => ({ x: i.x, y: i.y, r: i.r })), rocks: map.rocks.map(r => ({ x: r.x, y: r.y, r: r.r })) }; },
        tp(x, y) { ship.x = x; ship.y = y; },
        hurt() { ship.inv = 0; hurt(ship.x + 1, ship.y); },
        heal() { if (!ship.sink) ship.hp = HP; },
      };
    }
    return { destroy() { endMusic(); } };
  },
};
