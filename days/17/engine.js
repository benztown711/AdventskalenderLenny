// Türchen 17 · Pixel-Hüpfer: Spiel-Logik ohne Zeichnen (deterministisch, fester Zeitschritt).
// Wird von game.js benutzt und kann für Tests auch ohne Browser laufen.
import { LEVELS } from './levels.js';

export const T = 16;
export const STEP = 1 / 60;
export const PHYS = {
  RUN: 105, ACC: 950, DEC: 1400, AIR_ACC: 760, AIR_DEC: 420, TURN: 1900,
  ICE_RUN: 128, ICE_ACC: 260, ICE_DEC: 70,
  JUMP_V: 410, G_HOLD: 1150, G_CUT: 2900, G_FALL: 1750, MAX_FALL: 430,
  COYOTE: 0.1, BUFFER: 0.13, BOUNCE_V: 640, STOMP_V: 270, STOMP_HOLD_V: 400,
  BELT: 46, PW: 10, PH: 14,
};
const P = PHYS;

// Kachel-Typen
export const EMPTY = 0, SOLID = 1, ONEWAY = 2, ICE = 3, BELT_L = 4, BELT_R = 5, CRUMBLE = 6, GATE = 7, MUSH = 8, FAKE = 9;
const TILE_OF = { '#': SOLID, '=': SOLID, '-': ONEWAY, I: ICE, '<': BELT_L, '>': BELT_R, C: CRUMBLE, G: GATE, m: MUSH, X: FAKE, q: FAKE, n: FAKE };

export function parseLevel(idx) {
  const L = LEVELS[idx];
  const rows = L.map, H = rows.length, W = rows[0].length;
  const tiles = new Uint8Array(W * H);
  const out = { idx, W, H, tiles, chars: rows, coins: [], nuts: [], flags: [], enemies: [], icicles: [], plats: [], crumbles: [], mush: [], tree: null, start: null, boss: null };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = rows[y][x];
    tiles[y * W + x] = TILE_OF[c] || EMPTY;
    const px = x * T, py = y * T;
    if (c === 'P') out.start = { x: px + 3, y: py + T - P.PH };
    else if (c === 'o' || c === 'q') out.coins.push({ x: px + 3, y: py + 3, w: 10, h: 10, hidden: c === 'q' });
    else if (c === 'N' || c === 'n') out.nuts.push({ x: px + 1, y: py + 1, w: 14, h: 14, hidden: c === 'n' });
    else if (c === 'F') out.flags.push({ x: px, y: py + T });
    else if (c === 'T') out.tree = { x: px, y: py + T - 48, w: 32, h: 48 };
    else if (c === 'h') out.enemies.push({ type: 'hog', x: px + 1, y: py + T - 10, w: 14, h: 10 });
    else if (c === 'j') out.enemies.push({ type: 'cube', x: px + 2, y: py + T - 12, w: 12, h: 12 });
    else if (c === 'v') out.icicles.push({ x: px + 4, y: py, w: 8, h: 15 });
    else if (c === 'H' || c === 'V') out.plats.push({ kind: c, x0: px, y0: py, w: 48, h: 8, dist: c === 'H' ? 80 : 88, speed: 34 });
    else if (c === 'C') out.crumbles.push({ tx: x, ty: y });
    else if (c === 'm') out.mush.push({ tx: x, ty: y });
    else if (c === 'K') out.boss = { x: px - 6, y: py + T - 28, w: 28, h: 28 };
  }
  if (!out.start) throw new Error('Level ohne Start');
  return out;
}

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function createWorld(idx) {
  const lv = parseLevel(idx);
  const w = {
    lv, idx, t: 0, phase: 'play', phaseT: 0, hearts: 3, score: 0, coinsGot: 0,
    coins: new Uint8Array(lv.coins.length), nuts: new Uint8Array(lv.nuts.length),
    flags: new Uint8Array(lv.flags.length),
    check: { x: lv.start.x, y: lv.start.y },
    player: null,
    enemies: lv.enemies.map(e => ({ ...e, vx: 0, vy: 0, dir: -1, alive: true, t: 0, ground: false, squash: 0 })),
    icicles: lv.icicles.map(i => ({ ...i, y0: i.y, state: 'hang', t: 0, vy: 0 })),
    plats: lv.plats.map(p => ({ ...p, x: p.x0, y: p.y0, dx: 0, dy: 0 })),
    crumble: {}, // "tx,ty" -> {state:'shake'|'gone', t}
    mushT: {},
    balls: [],
    boss: lv.boss ? { ...lv.boss, x0: lv.boss.x, y0: lv.boss.y, vx: 0, vy: 0, hp: 3, state: 'wait', t: 0, dir: -1, hopT: 1.6, ground: false, inv: 0, think: 0 } : null,
    gateOpen: !lv.boss,
    ev: [],
  };
  w.player = newPlayer(lv.start.x, lv.start.y);
  w.player.inv = 0;
  return w;
}

function newPlayer(x, y) {
  return { x, y, w: P.PW, h: P.PH, vx: 0, vy: 0, ground: true, gtype: SOLID, coyote: 0, buf: 0, prevJ: true, jumping: false, bounce: false, face: 1, inv: 1, hurtT: 0, runT: 0, land: 0, ride: -1, inFake: false, airT: 0 };
}

// Klon für Suche/Tests (statische Level-Daten werden geteilt)
export function cloneWorld(w) {
  return {
    ...w,
    coins: w.coins.slice(), nuts: w.nuts.slice(), flags: w.flags.slice(), check: { ...w.check },
    player: { ...w.player },
    enemies: w.enemies.map(e => ({ ...e })), icicles: w.icicles.map(i => ({ ...i })), plats: w.plats.map(p => ({ ...p })),
    crumble: Object.fromEntries(Object.entries(w.crumble).map(([k, v]) => [k, { ...v }])),
    mushT: { ...w.mushT }, balls: w.balls.map(b => ({ ...b })), boss: w.boss ? { ...w.boss } : null, ev: [],
  };
}

export function tileAt(w, tx, ty) {
  const lv = w.lv;
  if (tx < 0 || tx >= lv.W) return SOLID;
  if (ty < 0 || ty >= lv.H) return EMPTY;
  const t = lv.tiles[ty * lv.W + tx];
  if (t === CRUMBLE) { const c = w.crumble[tx + ',' + ty]; return c && c.state === 'gone' ? EMPTY : CRUMBLE; }
  if (t === GATE) return w.gateOpen ? EMPTY : SOLID;
  return t;
}
const blocks = t => t === SOLID || t === ICE || t === BELT_L || t === BELT_R || t === CRUMBLE || t === MUSH || t === GATE;

// Bewegt einen Körper mit Kachel-Kollision. Gibt {hitX, landed, bonk, under:[tiles]} zurück.
function moveX(w, b, dx) {
  if (!dx) return false;
  b.x += dx;
  const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.001) / T);
  if (dx > 0) {
    const tx = Math.floor((b.x + b.w - 0.001) / T);
    for (let ty = y0; ty <= y1; ty++) if (blocks(tileAt(w, tx, ty))) { b.x = tx * T - b.w; return true; }
  } else {
    const tx = Math.floor(b.x / T);
    for (let ty = y0; ty <= y1; ty++) if (blocks(tileAt(w, tx, ty))) { b.x = (tx + 1) * T; return true; }
  }
  return false;
}
function moveY(w, b, dy, usePlats) {
  const res = { landed: false, bonk: false, under: [], plat: -1 };
  if (!dy) return res;
  const prevB = b.y + b.h;
  b.y += dy;
  const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.001) / T);
  if (dy > 0) {
    const ty = Math.floor((b.y + b.h - 0.001) / T);
    const top = ty * T;
    for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(w, tx, ty);
      if (blocks(t) || (t === ONEWAY && prevB <= top + 0.01)) {
        res.landed = true; res.under.push({ t, tx, ty });
      }
    }
    if (res.landed) { b.y = top - b.h; return res; }
    if (usePlats) for (let i = 0; i < w.plats.length; i++) {
      const p = w.plats[i];
      if (prevB <= p.y + 0.6 && b.y + b.h >= p.y && b.x + b.w > p.x && b.x < p.x + p.w) {
        b.y = p.y - b.h; res.landed = true; res.plat = i; return res;
      }
    }
  } else {
    const ty = Math.floor(b.y / T);
    for (let tx = x0; tx <= x1; tx++) if (blocks(tileAt(w, tx, ty))) { b.y = (ty + 1) * T; res.bonk = true; break; }
  }
  return res;
}

function emit(w, t, x, y, extra) { w.ev.push({ t, x, y, ...extra }); }

function platPos(p, t) {
  let ph = (t * p.speed / p.dist) % 2; const s = ph < 1 ? ph : 2 - ph;
  const e = s * s * (3 - 2 * s);
  return p.kind === 'H' ? { x: p.x0 + e * p.dist, y: p.y0 } : { x: p.x0, y: p.y0 - e * p.dist };
}

function hurt(w, from) {
  const p = w.player;
  if (p.inv > 0 || w.phase !== 'play') return;
  w.hearts--;
  emit(w, 'hurt', p.x + p.w / 2, p.y + p.h / 2);
  if (w.hearts <= 0) { w.phase = 'lost'; w.phaseT = 0; return; }
  const d = Math.sign(p.x + p.w / 2 - from) || -p.face;
  p.vx = d * 150; p.vy = -230; p.inv = 1.5; p.hurtT = 0.25; p.jumping = false; p.bounce = false;
}

function respawn(w) {
  const p = w.player;
  const np = newPlayer(w.check.x, w.check.y);
  np.prevJ = p.prevJ;
  w.player = np;
  w.icicles.forEach(i => { i.state = 'hang'; i.y = i.y0; i.vy = 0; i.t = 0; });
  w.crumble = {};
  w.balls = [];
  if (w.boss && w.boss.hp > 0) Object.assign(w.boss, { x: w.boss.x0, y: w.boss.y0, vx: 0, vy: 0, state: 'wait', t: 0, inv: 0, hopT: 1.6 });
  w.enemies.forEach(e => { if (e.alive) { e.x = e.sx ?? e.x; } });
  emit(w, 'respawn', np.x, np.y);
}

// Ein fester Zeitschritt. inp = {l, r, j}
export function stepWorld(w, inp) {
  const dt = STEP;
  w.t += dt;
  w.phaseT += dt;
  const p = w.player;
  if (w.phase === 'won' || w.phase === 'lost') return;
  if (w.phase === 'fall') {
    if (w.phaseT > 0.8) { w.phase = 'play'; w.phaseT = 0; respawn(w); }
    return;
  }

  // Bewegte Plattformen (vorher: steht der Spieler drauf?)
  let ride = -1;
  for (let i = 0; i < w.plats.length; i++) {
    const pl = w.plats[i];
    if (p.vy >= 0 && Math.abs(p.y + p.h - pl.y) < 0.7 && p.x + p.w > pl.x && p.x < pl.x + pl.w) ride = i;
    const np = platPos(pl, w.t);
    pl.dx = np.x - pl.x; pl.dy = np.y - pl.y; pl.x = np.x; pl.y = np.y;
  }
  if (ride >= 0) { const pl = w.plats[ride]; moveX(w, p, pl.dx); p.y = pl.y - p.h; }

  // Eingabe
  const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
  const jPressed = inp.j && !p.prevJ;
  p.prevJ = inp.j;
  if (jPressed) p.buf = P.BUFFER; else p.buf = Math.max(0, p.buf - dt);
  if (p.hurtT > 0) p.hurtT -= dt;
  if (p.inv > 0) p.inv -= dt;

  // Waagerecht
  const ice = p.ground && p.gtype === ICE;
  const max = ice ? P.ICE_RUN : P.RUN;
  if (p.hurtT <= 0) {
    let acc;
    if (dir) {
      const turning = p.vx && Math.sign(p.vx) !== dir;
      acc = p.ground ? (ice ? P.ICE_ACC : (turning ? P.TURN : P.ACC)) : P.AIR_ACC;
      if (turning && p.ground && !ice && Math.abs(p.vx) > 60) emit(w, 'skid', p.x + p.w / 2, p.y + p.h);
      p.vx += dir * acc * dt;
      if (Math.abs(p.vx) > max) p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(p.vx) - P.DEC * dt);
      p.face = dir;
    } else {
      const dec = (p.ground ? (ice ? P.ICE_DEC : P.DEC) : P.AIR_DEC) * dt;
      p.vx = Math.abs(p.vx) <= dec ? 0 : p.vx - Math.sign(p.vx) * dec;
    }
  }

  // Springen (Puffer + Coyote-Zeit)
  if (p.buf > 0 && (p.ground || p.coyote > 0)) {
    p.vy = -P.JUMP_V; p.ground = false; p.coyote = 0; p.buf = 0; p.jumping = true; p.bounce = false;
    emit(w, 'jump', p.x + p.w / 2, p.y + p.h);
  }

  // Schwerkraft: lang drücken = höher
  let g;
  if (p.vy < 0) {
    if (p.bounce || (p.jumping && inp.j)) g = Math.abs(p.vy) < 60 ? P.G_HOLD * 0.55 : P.G_HOLD;
    else g = P.G_CUT;
  } else g = P.G_FALL;
  p.vy = Math.min(P.MAX_FALL, p.vy + g * dt);
  if (p.vy >= 0) { p.jumping = false; p.bounce = false; }

  // Förderband
  let belt = 0;
  if (p.ground && p.gtype === BELT_L) belt = -P.BELT; else if (p.ground && p.gtype === BELT_R) belt = P.BELT;

  const wasGround = p.ground;
  if (moveX(w, p, (p.vx + belt) * dt)) p.vx = 0;
  const r = moveY(w, p, p.vy * dt, true);
  p.ground = false;
  if (r.landed) {
    const impact = p.vy;
    const mush = r.under.find(u => u.t === MUSH);
    if (mush) {
      p.vy = -P.BOUNCE_V; p.bounce = true; p.jumping = false; p.coyote = 0;
      w.mushT[mush.tx + ',' + mush.ty] = 0.35;
      emit(w, 'boing', mush.tx * T + 8, mush.ty * T);
    } else {
      p.vy = 0; p.ground = true;
      // Untergrund: Kachel unter der Mitte bevorzugen
      const cx = Math.floor((p.x + p.w / 2) / T);
      const mid = r.under.find(u => u.tx === cx) || r.under[0];
      p.gtype = r.plat >= 0 ? SOLID : mid.t;
      for (const u of r.under) if (u.t === CRUMBLE) {
        const k = u.tx + ',' + u.ty;
        if (!w.crumble[k]) { w.crumble[k] = { state: 'shake', t: 0 }; emit(w, 'crack', u.tx * T + 8, u.ty * T); }
      }
      if (!wasGround) { p.land = 0.12; emit(w, 'land', p.x + p.w / 2, p.y + p.h, { v: impact }); }
    }
  } else if (r.bonk) { p.vy = Math.max(p.vy, 30); p.jumping = false; emit(w, 'bonk', p.x + p.w / 2, p.y); }
  if (wasGround && !p.ground && p.vy >= 0) p.coyote = P.COYOTE; else if (!p.ground) p.coyote = Math.max(0, p.coyote - dt);
  if (p.ground) p.coyote = 0;
  if (p.land > 0) p.land -= dt;
  p.airT = p.ground ? 0 : p.airT + dt;
  if (p.ground) p.runT += Math.abs(p.vx + belt) * dt;

  // Bröselkekse
  for (const k in w.crumble) {
    const c = w.crumble[k]; c.t += dt;
    if (c.state === 'shake' && c.t > 0.45) { c.state = 'gone'; c.t = 0; const [tx, ty] = k.split(',').map(Number); emit(w, 'crumble', tx * T + 8, ty * T + 8); }
    else if (c.state === 'gone' && c.t > 2.6) {
      const [tx, ty] = k.split(',').map(Number);
      if (!overlap(p, { x: tx * T, y: ty * T, w: T, h: T })) delete w.crumble[k];
    }
  }
  for (const k in w.mushT) { w.mushT[k] -= dt; if (w.mushT[k] <= 0) delete w.mushT[k]; }

  // Geheimwände
  const fx0 = Math.floor(p.x / T), fx1 = Math.floor((p.x + p.w - 0.001) / T), fy0 = Math.floor(p.y / T), fy1 = Math.floor((p.y + p.h - 0.001) / T);
  let inFake = false;
  for (let ty = fy0; ty <= fy1; ty++) for (let tx = fx0; tx <= fx1; tx++) if (tileAt(w, tx, ty) === FAKE) inFake = true;
  if (inFake && !p.inFake) emit(w, 'secret', p.x + p.w / 2, p.y);
  p.inFake = inFake;

  // Sammeln
  const lv = w.lv;
  for (let i = 0; i < lv.coins.length; i++) if (!w.coins[i] && overlap(p, lv.coins[i])) {
    w.coins[i] = 1; w.coinsGot++; w.score += 10; emit(w, 'coin', lv.coins[i].x + 5, lv.coins[i].y + 5);
  }
  for (let i = 0; i < lv.nuts.length; i++) if (!w.nuts[i] && overlap(p, lv.nuts[i])) {
    w.nuts[i] = 1; w.score += 100; emit(w, 'nut', lv.nuts[i].x + 7, lv.nuts[i].y + 7);
  }
  for (let i = 0; i < lv.flags.length; i++) if (!w.flags[i] && p.x + p.w / 2 >= lv.flags[i].x + 4 && Math.abs(p.y + p.h - lv.flags[i].y) < 64) {
    w.flags[i] = 1; w.check = { x: lv.flags[i].x + 3, y: lv.flags[i].y - P.PH };
    emit(w, 'flag', lv.flags[i].x + 4, lv.flags[i].y - 20);
  }

  // Gegner
  for (const e of w.enemies) {
    if (!e.alive) continue;
    if (e.sx === undefined) e.sx = e.x;
    e.t += dt;
    if (e.squash > 0) e.squash -= dt;
    if (Math.abs(e.x - p.x) > 360) continue; // weit weg: schläft
    if (e.type === 'hog') {
      e.vx = e.dir * 24;
      // Kante oder Wand voraus?
      const fx = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
      const ftx = Math.floor(fx / T), fty = Math.floor((e.y + e.h + 1) / T);
      const ground = blocks(tileAt(w, ftx, fty)) || tileAt(w, ftx, fty) === ONEWAY;
      if (e.ground && !ground) e.dir *= -1;
      if (moveX(w, e, e.dir * 24 * dt)) e.dir *= -1;
    } else if (e.type === 'cube') {
      if (e.ground) {
        e.vx = 0; e.hop = (e.hop || 0) + dt;
        if (e.hop > 1.25) {
          e.hop = 0;
          // landet die Hüpf-Strecke auf Boden? sonst umdrehen
          const tx = Math.floor((e.x + e.w / 2 + e.dir * 30) / T), ty = Math.floor((e.y + e.h + 2) / T);
          let okGround = false;
          for (let k = 0; k < 3; k++) { const t = tileAt(w, tx, ty + k); if (blocks(t) || t === ONEWAY) { okGround = true; break; } }
          if (!okGround || blocks(tileAt(w, Math.floor((e.x + e.w / 2 + e.dir * 18) / T), Math.floor((e.y + 4) / T)))) e.dir *= -1;
          e.vy = -290; e.vx = e.dir * 44; e.ground = false; e.squash = 0.15;
          emit(w, 'hop', e.x + e.w / 2, e.y + e.h, { quiet: Math.abs(e.x - p.x) > 200 });
        }
      }
      if (moveX(w, e, e.vx * dt)) { e.dir *= -1; e.vx = -e.vx; }
    }
    e.vy = Math.min(P.MAX_FALL, e.vy + 1500 * dt);
    const er = moveY(w, e, e.vy * dt, true);
    const wasG = e.ground;
    e.ground = er.landed;
    if (er.landed) { e.vy = 0; if (!wasG && e.type === 'cube') e.squash = 0.15; }
    if (e.y > lv.H * T + 40) { e.alive = false; continue; }
    interact(w, e, 6);
  }

  // Schneebälle des Königs
  for (const b of w.balls) {
    b.vy = Math.min(P.MAX_FALL, b.vy + 1500 * dt);
    if (moveX(w, b, b.vx * dt)) { b.dead = true; emit(w, 'puff', b.x + 5, b.y + 5); continue; }
    const br = moveY(w, b, b.vy * dt, false); if (br.landed) b.vy = 0;
    if (b.y > lv.H * T) b.dead = true;
    b.alive = true; b.type = 'ball';
    interact(w, b, 5);
    if (!b.alive) b.dead = true;
  }
  w.balls = w.balls.filter(b => !b.dead);

  // Eiszapfen
  for (const ic of w.icicles) {
    ic.t += dt;
    const pcx = p.x + p.w / 2;
    if (ic.state === 'hang') { if (Math.abs(pcx - (ic.x + 4)) < 38 && p.y > ic.y) { ic.state = 'shake'; ic.t = 0; emit(w, 'shiver', ic.x + 4, ic.y); } }
    else if (ic.state === 'shake') { if (ic.t > 0.35) { ic.state = 'fall'; ic.t = 0; ic.vy = 0; } }
    else if (ic.state === 'fall') {
      ic.vy = Math.min(520, ic.vy + 1300 * dt); ic.y += ic.vy * dt;
      const tx = Math.floor((ic.x + 4) / T), ty = Math.floor((ic.y + ic.h) / T);
      if (blocks(tileAt(w, tx, ty)) || ic.y > lv.H * T) { ic.state = 'gone'; ic.t = 0; emit(w, 'shatter', ic.x + 4, ty * T); }
    } else if (ic.state === 'gone') { if (ic.t > 3) { ic.state = 'grow'; ic.t = 0; ic.y = ic.y0; } }
    else if (ic.state === 'grow') { if (ic.t > 0.8) { ic.state = 'hang'; ic.t = 0; } }
    if ((ic.state === 'hang' || ic.state === 'shake' || ic.state === 'fall') && overlap(p, { x: ic.x + 1, y: ic.y + 2, w: 6, h: 12 })) hurt(w, ic.x + 4);
  }

  // Endgegner
  if (w.boss) bossStep(w, dt);

  // Absturz
  if (p.y > lv.H * T + 24 && w.phase === 'play') {
    w.hearts--;
    emit(w, 'fall', p.x, lv.H * T);
    if (w.hearts <= 0) { w.phase = 'lost'; w.phaseT = 0; } else { w.phase = 'fall'; w.phaseT = 0; }
    return;
  }

  // Ziel
  if (lv.tree && w.gateOpen && w.phase === 'play' && overlap(p, { x: lv.tree.x + 4, y: lv.tree.y, w: 24, h: 48 })) {
    w.phase = 'won'; w.phaseT = 0; w.score += 200 + w.hearts * 50;
    emit(w, 'goal', lv.tree.x + 16, lv.tree.y + 10);
  }
}

function interact(w, e, slack) {
  const p = w.player;
  if (!overlap(p, e)) return;
  const pb = p.y + p.h;
  if (p.vy > 0 && pb - e.y <= slack + p.vy * STEP + 2) {
    e.alive = false; w.score += 20;
    p.vy = -(p.prevJ ? P.STOMP_HOLD_V : P.STOMP_V); p.jumping = true; p.y = e.y - p.h;
    emit(w, 'stomp', e.x + e.w / 2, e.y + e.h / 2, { kind: e.type });
  } else hurt(w, e.x + e.w / 2);
}

function bossStep(w, dt) {
  const b = w.boss, p = w.player;
  if (b.hp <= 0) return;
  b.t += dt;
  if (b.inv > 0) b.inv -= dt;
  const pcx = p.x + p.w / 2, bcx = b.x + b.w / 2;
  if (b.state === 'wait') {
    if (Math.abs(pcx - bcx) < 140 && Math.abs(p.y - b.y) < 80) { b.state = 'walk'; b.t = 0; b.hopT = 1.2; emit(w, 'roar', bcx, b.y); }
  } else {
    if (b.state === 'hurt' && b.t > 1.0) { b.state = 'walk'; b.t = 0; }
    const speed = [0, 58, 44, 30][b.hp];
    b.think -= dt;
    if (b.think <= 0) { b.dir = Math.sign(pcx - bcx) || b.dir; b.think = 0.7; }
    if (b.state === 'walk') {
      b.vx = b.ground ? b.dir * speed : b.vx;
      if (b.ground) {
        b.hopT -= dt;
        if (b.hopT <= 0) { b.vy = -330; b.ground = false; b.hopT = 2.3 - (3 - b.hp) * 0.4; b.hopping = true; }
      }
    } else b.vx *= 0.9;
  }
  if (moveX(w, b, b.vx * dt)) { b.dir *= -1; b.vx = 0; }
  b.vy = Math.min(P.MAX_FALL, b.vy + 1500 * dt);
  const r = moveY(w, b, b.vy * dt, false);
  const was = b.ground; b.ground = r.landed;
  if (r.landed) {
    b.vy = 0;
    if (!was && b.hopping) {
      b.hopping = false; emit(w, 'bossland', b.x + b.w / 2, b.y + b.h);
      if (b.hp <= 2 && b.state === 'walk') {
        const d = Math.sign(pcx - (b.x + b.w / 2)) || -1;
        w.balls.push({ x: d > 0 ? b.x + b.w + 1 : b.x - 11, y: b.y + b.h - 10, w: 10, h: 10, vx: d * (b.hp === 1 ? 72 : 60), vy: 0 });
      }
    }
  }
  if (b.state === 'wait' || w.phase !== 'play') return;
  if (overlap(p, b)) {
    const pb = p.y + p.h;
    if (p.vy > 0 && pb - b.y <= 12 + p.vy * STEP && b.inv <= 0) {
      b.hp--; b.inv = 1.0; b.state = 'hurt'; b.t = 0; b.vx = 0;
      p.vy = -420; p.jumping = true; p.y = b.y - p.h;
      w.score += 100;
      if (b.hp <= 0) { w.gateOpen = true; w.score += 400; w.balls = []; emit(w, 'bossdead', b.x + b.w / 2, b.y + b.h / 2); }
      else emit(w, 'bosshit', b.x + b.w / 2, b.y);
    } else if (b.state !== 'hurt') hurt(w, b.x + b.w / 2);
  }
}
