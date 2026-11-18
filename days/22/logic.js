// Türchen 22: Schneeball-Festung - reine Spiellogik (ohne DOM, auch per Node simulierbar)
export const W = 360, H = 600, MAP_H = 550, STEP = 1 / 60;
export const START_MONEY = 130, MAX_LIVES = 20, FIRST_WAIT = 35, BETWEEN = 20, CLEAR_WAIT = 7;

// ---------- Pfad ----------
export const WAYPOINTS = [[-30, 62], [300, 62], [300, 174], [66, 174], [66, 288], [300, 288], [300, 402], [180, 402], [180, 482]];
function buildPath(wps, r = 40, step = 2) {
  const raw = [wps[0]];
  for (let i = 1; i < wps.length - 1; i++) {
    const [px, py] = wps[i - 1], [cx, cy] = wps[i], [nx, ny] = wps[i + 1];
    const d1 = Math.hypot(cx - px, cy - py), d2 = Math.hypot(nx - cx, ny - cy);
    const a = [cx - (cx - px) / d1 * r, cy - (cy - py) / d1 * r], b = [cx + (nx - cx) / d2 * r, cy + (ny - cy) / d2 * r];
    raw.push(a);
    for (let k = 1; k < 14; k++) {
      const t = k / 14, u = 1 - t;
      raw.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]);
    }
    raw.push(b);
  }
  raw.push(wps[wps.length - 1]);
  const pts = [raw[0].slice()];
  let need = step;
  for (let i = 1; i < raw.length; i++) {
    let [ax, ay] = raw[i - 1]; const [bx, by] = raw[i];
    let seg = Math.hypot(bx - ax, by - ay);
    while (seg >= need) {
      const t = need / seg; ax += (bx - ax) * t; ay += (by - ay) * t; seg -= need;
      pts.push([ax, ay]); need = step;
    }
    need -= seg;
  }
  return { pts, step, len: (pts.length - 1) * step };
}
export const PATH = buildPath(WAYPOINTS);
export function posAt(d) {
  const { pts, step } = PATH;
  const f = Math.max(0, Math.min(pts.length - 1.001, d / step)), i = Math.floor(f), t = f - i;
  const a = pts[i], b = pts[i + 1];
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}
export function distToPath(x, y) {
  let m = 1e9;
  for (const p of PATH.pts) m = Math.min(m, Math.hypot(p[0] - x, p[1] - y));
  return m;
}

// ---------- Bauplätze ----------
export const SPOTS = [
  [96, 118], [176, 118], [252, 118],
  [24, 231], [122, 231], [204, 231], [282, 231],
  [96, 345], [176, 345], [250, 345], [340, 345],
  [104, 448], [252, 454],
].map(([x, y]) => ({ x, y }));
export const HINT_SPOT = 1;

// ---------- Türme ----------
export const TOWERS = {
  sling: {
    name: 'Schneeball-Schleuder', short: 'Schleuder', air: true, color: '#8ecae6',
    lv: [{ cost: 50, range: 86, cd: 0.5, dmg: 12 }, { cost: 55, range: 94, cd: 0.45, dmg: 17 }, { cost: 95, range: 102, cd: 0.4, dmg: 26 }],
  },
  cannon: {
    name: 'Zuckerstangen-Kanone', short: 'Kanone', air: false, color: '#ef476f',
    lv: [{ cost: 90, range: 92, cd: 1.5, dmg: 26, splash: 40 }, { cost: 80, range: 100, cd: 1.35, dmg: 46, splash: 46 }, { cost: 130, range: 110, cd: 1.2, dmg: 76, splash: 54 }],
  },
  frost: {
    name: 'Frost-Turm', short: 'Frost', air: false, color: '#bde0fe',
    lv: [{ cost: 70, range: 78, cd: 0.9, dmg: 4, slow: 0.4, slowT: 1.4 }, { cost: 60, range: 86, cd: 0.85, dmg: 8, slow: 0.5, slowT: 1.6 }, { cost: 100, range: 96, cd: 0.8, dmg: 14, slow: 0.6, slowT: 1.8 }],
  },
  zap: {
    name: 'Lichterketten-Blitz', short: 'Blitz', air: true, color: '#ffd166',
    lv: [{ cost: 110, range: 96, cd: 1.2, dmg: 18, chain: 3 }, { cost: 95, range: 104, cd: 1.05, dmg: 26, chain: 4 }, { cost: 140, range: 112, cd: 0.9, dmg: 38, chain: 5 }],
  },
};
export const TOWER_KEYS = ['sling', 'cannon', 'frost', 'zap'];
export const invested = t => TOWERS[t.type].lv.slice(0, t.lvl + 1).reduce((s, l) => s + l.cost, 0);
export const sellValue = t => Math.floor(invested(t) * 0.7);
export const upgradeCost = t => t.lvl < 2 ? TOWERS[t.type].lv[t.lvl + 1].cost : null;

// ---------- Gegner ----------
export const ENEMIES = {
  grummel: { name: 'Grummel', hp: 30, speed: 36, reward: 4, pts: 10, r: 11, steal: 1 },
  flitzer: { name: 'Eis-Flitzer', hp: 20, speed: 70, reward: 4, pts: 12, r: 9, steal: 1 },
  yeti: { name: 'Yeti', hp: 150, speed: 24, reward: 12, pts: 30, r: 15, steal: 1 },
  bat: { name: 'Frost-Fledermaus', hp: 34, speed: 46, reward: 6, pts: 20, r: 11, steal: 1, air: true },
  boss: { name: 'Riesen-Yeti', hp: 2200, speed: 14, reward: 0, pts: 500, r: 26, steal: 5, boss: true },
};

// ---------- Wellen ----------
// Gruppe: [Typ, Anzahl, Abstand in s, Startverzögerung in s]
export const WAVES = [
  { title: 'Die Grummel kommen!', g: [['grummel', 8, 1.7, 0]] },
  { title: 'Noch mehr Grummel!', g: [['grummel', 11, 1.4, 0]] },
  { title: 'Die Flitzer kommen!', g: [['grummel', 6, 1.4, 0], ['flitzer', 8, 0.9, 3]] },
  { title: 'Eine bunte Bande', g: [['flitzer', 6, 0.8, 0], ['grummel', 12, 0.9, 1]] },
  { title: 'Ein Yeti stapft heran!', g: [['grummel', 8, 1, 0], ['yeti', 2, 5, 3]] },
  { title: 'Frost-Fledermäuse!', sub: 'Nur Schleuder und Blitz treffen Flieger!', g: [['bat', 8, 1.4, 0], ['grummel', 8, 1, 4]] },
  { title: 'Flitzer-Sturm!', g: [['flitzer', 22, 0.5, 0]] },
  { title: 'Die Yeti-Familie', g: [['yeti', 5, 3, 0], ['grummel', 10, 0.8, 2]] },
  { title: 'Fledermaus-Schwarm!', sub: 'Blitz und Schleuder bereit?', g: [['bat', 14, 0.8, 0], ['flitzer', 10, 0.6, 4]] },
  { title: 'Alle auf einmal!', g: [['grummel', 14, 0.6, 0], ['flitzer', 12, 0.5, 3], ['yeti', 4, 3, 5], ['bat', 8, 1, 8]] },
  { title: 'Die große Lawine', g: [['yeti', 7, 2.2, 0], ['grummel', 16, 0.5, 2], ['flitzer', 16, 0.45, 5], ['bat', 10, 0.8, 9]] },
  { title: 'Der Riesen-Yeti!', sub: 'Halte ihn auf, bevor er das Lager erreicht!', boss: true, g: [['grummel', 10, 0.8, 0], ['boss', 1, 1, 5], ['yeti', 4, 4, 9], ['bat', 8, 1, 13]] },
];
export const hpMul = w => 1 + 0.28 * (w - 1) + 0.045 * (w - 1) * (w - 1);
export const waveBonus = w => 15 + 3 * w;

// ---------- Welt ----------
export function createWorld(rng = Math.random) {
  return {
    rng, t: 0, money: START_MONEY, lives: MAX_LIVES, points: 0, kills: 0,
    wave: 0, waveT: 0, spawnQ: [], countdown: FIRST_WAIT, towers: SPOTS.map(() => null),
    enemies: [], shots: [], events: [], over: null, nextId: 1, pending: {},
  };
}
const ev = (w, type, data) => w.events.push({ type, ...data });

export function canCallWave(w) { return !w.over && w.wave < WAVES.length && w.spawnQ.length === 0; }
export function callWave(w) {
  if (!canCallWave(w)) return false;
  if (w.wave > 0 && w.countdown > 0) {
    const bonus = Math.floor(w.countdown);
    if (bonus > 0) { w.money += bonus; ev(w, 'early', { bonus }); }
  }
  startWave(w);
  return true;
}
function startWave(w) {
  const n = ++w.wave, def = WAVES[n - 1];
  const list = [];
  for (const [type, count, gap, delay] of def.g) for (let i = 0; i < count; i++) list.push({ t: delay + i * gap + (w.rng() - 0.5) * 0.2 * Math.min(gap, 1), type });
  list.sort((a, b) => a.t - b.t);
  if (n >= 2) { // ein Glitzer-Gegner pro Welle bringt Extra-Plätzchen
    const cands = list.filter(s => s.type === 'grummel' || s.type === 'flitzer');
    if (cands.length) cands[Math.floor(w.rng() * cands.length)].gold = true;
  }
  w.spawnQ = list; w.waveT = 0; w.countdown = null; w.pending[n] = list.length;
  ev(w, 'wave', { n, title: def.title, sub: def.sub || '', boss: !!def.boss });
}
function spawn(w, s) {
  const d = ENEMIES[s.type], m = d.boss ? 1 : hpMul(w.wave), hp = Math.round(d.hp * m);
  const e = {
    id: w.nextId++, type: s.type, wave: w.wave, hp, maxHp: hp, d: -10 - w.rng() * 6, speed: d.speed * (0.94 + w.rng() * 0.12),
    r: d.r, air: !!d.air, boss: !!d.boss, gold: !!s.gold, slow: 0, slowT: 0, hitT: 0, x: -30, y: 62, ang: 0,
    wob: w.rng() * 6.28, off: (w.rng() - 0.5) * (d.boss ? 0 : 10),
  };
  w.enemies.push(e);
  if (e.boss) ev(w, 'boss', {});
}

// ---------- Bauen ----------
export function build(w, spot, type) {
  if (w.over || w.towers[spot]) return false;
  const c = TOWERS[type].lv[0].cost;
  if (w.money < c) return false;
  w.money -= c;
  w.towers[spot] = { type, lvl: 0, cd: 0.2, ang: -Math.PI / 2, kick: 0, spot, x: SPOTS[spot].x, y: SPOTS[spot].y, shots: 0 };
  ev(w, 'build', { spot, type });
  return true;
}
export function upgrade(w, spot) {
  const t = w.towers[spot]; if (!t || w.over) return false;
  const c = upgradeCost(t); if (c == null || w.money < c) return false;
  w.money -= c; t.lvl++; ev(w, 'upgrade', { spot, lvl: t.lvl });
  return true;
}
export function sell(w, spot) {
  const t = w.towers[spot]; if (!t || w.over) return false;
  const v = sellValue(t); w.money += v; w.towers[spot] = null; ev(w, 'sell', { spot, value: v, x: t.x, y: t.y });
  return true;
}

// ---------- Kampf ----------
function hurt(w, e, dmg, src) {
  if (e.hp <= 0) return;
  e.hp -= dmg; e.hitT = 0.12;
  if (src !== 'frost' && (e.boss || e.type === 'yeti') && dmg >= 30) ev(w, 'dmg', { x: e.x, y: e.y - e.r - 4, v: Math.round(dmg) });
  if (e.hp <= 0) {
    const d = ENEMIES[e.type];
    const reward = d.reward + (e.gold ? 15 : 0);
    w.money += reward; w.points += d.pts; w.kills++;
    ev(w, 'pop', { x: e.x, y: e.y, type: e.type, reward, gold: e.gold, air: e.air, boss: e.boss });
  }
}
const inRange = (t, e, r) => (e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= r * r;
function pickTarget(w, t, def, lv) {
  let best = null;
  for (const e of w.enemies) {
    if (e.hp <= 0 || e.d < 0 || (e.air && !def.air)) continue;
    if (!inRange(t, e, lv.range)) continue;
    if (!best || e.d > best.d) best = e; // am weitesten vorne
  }
  return best;
}

export function step(w, dt = STEP) {
  if (w.over) return;
  w.t += dt;
  // Wellen-Ablauf
  if (w.countdown != null) {
    w.countdown -= dt;
    if (w.countdown <= 0 && w.wave < WAVES.length) startWave(w);
  }
  if (w.spawnQ.length) {
    w.waveT += dt;
    while (w.spawnQ.length && w.spawnQ[0].t <= w.waveT) spawn(w, w.spawnQ.shift());
    if (!w.spawnQ.length && w.wave < WAVES.length) w.countdown = BETWEEN;
  }
  // Gegner bewegen
  for (const e of w.enemies) {
    if (e.hp <= 0) continue;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    e.hitT = Math.max(0, e.hitT - dt);
    const slow = e.boss ? e.slow * 0.5 : e.slow;
    e.d += e.speed * (1 - slow) * dt;
    const p = posAt(e.d);
    const nx = -Math.sin(p.ang), ny = Math.cos(p.ang);
    e.x = p.x + nx * e.off; e.y = p.y + ny * e.off; e.ang = p.ang;
    if (e.d >= PATH.len) {
      e.hp = 0; e.leaked = true;
      const steal = ENEMIES[e.type].steal;
      w.lives = Math.max(0, w.lives - steal);
      ev(w, 'leak', { steal, boss: e.boss, x: e.x, y: e.y });
    }
  }
  // Türme
  for (const t of w.towers) {
    if (!t) continue;
    const def = TOWERS[t.type], lv = def.lv[t.lvl];
    t.cd -= dt; t.kick = Math.max(0, t.kick - dt * 4);
    if (t.type === 'frost') {
      if (t.cd > 0) continue;
      const hit = w.enemies.filter(e => e.hp > 0 && e.d >= 0 && !e.air && inRange(t, e, lv.range));
      if (!hit.length) continue;
      t.cd = lv.cd; t.kick = 1;
      for (const e of hit) { e.slow = Math.max(e.slow, lv.slow); e.slowT = Math.max(e.slowT, lv.slowT); hurt(w, e, lv.dmg, 'frost'); }
      ev(w, 'frost', { x: t.x, y: t.y, r: lv.range, lvl: t.lvl });
      continue;
    }
    const target = pickTarget(w, t, def, lv);
    if (target) t.ang = Math.atan2(target.y - t.y, target.x - t.x);
    if (t.cd > 0 || !target) continue;
    t.cd = lv.cd; t.kick = 1; t.shots++;
    if (t.type === 'zap') {
      const chain = [target], hitSet = new Set([target]);
      let cur = target;
      while (chain.length < lv.chain) {
        let nb = null, nd = 1e9;
        for (const e of w.enemies) {
          if (e.hp <= 0 || e.d < 0 || hitSet.has(e)) continue;
          const dd = Math.hypot(e.x - cur.x, e.y - cur.y);
          if (dd < 70 && dd < nd) { nd = dd; nb = e; }
        }
        if (!nb) break;
        chain.push(nb); hitSet.add(nb); cur = nb;
      }
      const pts = [[t.x, t.y - 22], ...chain.map(e => [e.x, e.y - (e.air ? 16 : 0)])];
      chain.forEach((e, i) => hurt(w, e, lv.dmg * Math.pow(0.75, i), 'zap'));
      ev(w, 'zap', { pts, lvl: t.lvl });
    } else {
      const cannon = t.type === 'cannon';
      w.shots.push({
        kind: t.type, x0: t.x + Math.cos(t.ang) * 10, y0: t.y - 12 + Math.sin(t.ang) * 10, tx: target.x, ty: target.y, tid: target.id, target,
        t: 0, dur: cannon ? 0.6 : 0.3, h: cannon ? 46 : 16, dmg: lv.dmg, splash: lv.splash || 0, air: target.air, lvl: t.lvl,
      });
      ev(w, 'fire', { kind: t.type });
    }
  }
  // Geschosse
  for (const s of w.shots) {
    s.t += dt;
    if (s.target && s.target.hp > 0) { s.tx = s.target.x; s.ty = s.target.y - (s.target.air ? 16 : 0); }
    if (s.t >= s.dur) {
      s.done = true;
      if (s.kind === 'cannon') {
        for (const e of w.enemies) {
          if (e.hp <= 0 || e.air || e.d < 0) continue;
          const dd = Math.hypot(e.x - s.tx, e.y - s.ty);
          if (dd <= s.splash + e.r * 0.5) hurt(w, e, s.dmg * (dd < s.splash * 0.4 ? 1 : 0.65), 'cannon');
        }
        ev(w, 'boom', { x: s.tx, y: s.ty, r: s.splash });
      } else {
        if (s.target && s.target.hp > 0) { hurt(w, s.target, s.dmg, 'sling'); ev(w, 'splat', { x: s.tx, y: s.ty }); }
        else ev(w, 'miss', { x: s.tx, y: s.ty });
      }
    }
  }
  w.shots = w.shots.filter(s => !s.done);
  // Aufräumen + Wellen-Bonus
  const before = w.enemies;
  w.enemies = before.filter(e => e.hp > 0);
  if (w.enemies.length !== before.length) {
    for (const e of before) if (e.hp <= 0) w.pending[e.wave]--;
  }
  for (const k in w.pending) {
    const n = +k;
    if (w.pending[k] === 0 && (n < w.wave || w.spawnQ.length === 0)) {
      delete w.pending[k];
      if (w.lives > 0) { const b = waveBonus(n); w.money += b; ev(w, 'clear', { n, bonus: b }); }
    }
  }
  if (w.countdown != null && w.countdown > CLEAR_WAIT && w.enemies.length === 0 && w.spawnQ.length === 0 && w.wave > 0) w.countdown = CLEAR_WAIT;
  // Ende
  if (w.lives <= 0) { w.over = 'lose'; ev(w, 'lose', {}); }
  else if (w.wave >= WAVES.length && !w.spawnQ.length && !w.enemies.length) { w.over = 'win'; ev(w, 'win', {}); }
}

export function stars(w) {
  if (w.over === 'win') return w.lives >= 15 ? 3 : 2;
  return w.wave >= 8 ? 1 : 0;
}
export const score = w => w.points + w.lives * 20;
