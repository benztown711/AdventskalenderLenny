// Türchen 8: Seekarte erzeugen und Geometrie-Helfer.
export const WW = 900, WH = 1350, LAND_Y = WH - 64, TAU = Math.PI * 2;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function blob(r, n = 22) {
  const p1 = rnd(0, TAU), p2 = rnd(0, TAU), k1 = rnd(0.06, 0.13), k2 = rnd(0.03, 0.08), rs = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    rs.push(r * (1 + k1 * Math.sin(2 * a + p1) + k2 * Math.sin(3 * a + p2) + rnd(-0.025, 0.025)));
  }
  return rs;
}
export function radiusAt(isl, ang) {
  const n = isl.rs.length, f = (((ang / TAU) % 1) + 1) % 1 * n, i = Math.floor(f) % n, t = f - Math.floor(f);
  return isl.rs[i] * (1 - t) + isl.rs[(i + 1) % n] * t;
}
// Liegt (x,y) mit Abstand pad im Inselrand? -> Normale und Eindringtiefe
export function islandPush(isl, x, y, pad) {
  const dx = x - isl.x, dy = y - isl.y, d = Math.hypot(dx, dy) || 0.001;
  if (d > isl.r * 1.25 + pad) return null;
  const R = radiusAt(isl, Math.atan2(dy, dx)) + pad;
  return d < R ? { nx: dx / d, ny: dy / d, depth: R - d } : null;
}

function makeIsland(x, y, r, treasure) {
  const isl = { x, y, r, rs: blob(r), treasure, dug: false, trees: [], seed: Math.random() * 100 };
  const n = treasure >= 0 ? 3 : Math.max(2, Math.round(r / 13));
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), d = treasure >= 0 ? r * rnd(0.5, 0.66) : r * rnd(0.05, 0.55);
    isl.trees.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, kind: treasure >= 0 || Math.random() < 0.3 ? 'palm' : 'pine', s: rnd(0.85, 1.2), rot: rnd(0, TAU), lights: Math.random() < 0.45 });
  }
  return isl;
}

export function generate() {
  const harbor = { x: WW / 2, y: WH - 128, r: 44 };
  const pier = { x: WW / 2 - 70, y: WH - 178, w: 16, h: 178 - 64 };
  const islands = [], rocks = [], banks = [];
  const side = Math.random() < 0.5 ? -1 : 1;
  const T = [
    { x: WW / 2 + side * rnd(170, 270), y: rnd(830, 920) },
    { x: WW / 2 - side * rnd(170, 270), y: rnd(470, 590) },
    { x: WW / 2 + rnd(-200, 200), y: rnd(190, 240) },
  ].map((p, i) => makeIsland(p.x, p.y, rnd(52, 60), i));
  islands.push(...T);
  const arena = { x: T[2].x, y: T[2].y, R: 250 };

  for (let tries = 0, made = 0; tries < 600 && made < 8; tries++) {
    const r = rnd(32, 76), x = rnd(r + 40, WW - r - 40), y = rnd(r + 40, LAND_Y - 250);
    if (islands.some(o => Math.hypot(o.x - x, o.y - y) < r + o.r + 100)) continue;
    if (Math.hypot(arena.x - x, arena.y - y) < r + 60 + 190) continue;
    if (Math.hypot(harbor.x - x, harbor.y - y) < 320) continue;
    islands.push(makeIsland(x, y, r, -1)); made++;
  }
  for (let tries = 0; tries < 800 && rocks.length < 17; tries++) {
    const r = rnd(9, 15), x = rnd(40, WW - 40), y = rnd(40, LAND_Y - 200);
    if (islands.some(o => Math.hypot(o.x - x, o.y - y) < r + o.r * 1.15 + (o.treasure >= 0 ? 85 : 45))) continue;
    if (rocks.some(o => Math.hypot(o.x - x, o.y - y) < 70)) continue;
    if (Math.hypot(arena.x - x, arena.y - y) < 235 || Math.hypot(harbor.x - x, harbor.y - y) < 260) continue;
    const bits = [];
    for (let i = 0; i < 3; i++) bits.push({ x: rnd(-r, r) * 0.6, y: rnd(-r, r) * 0.6, r: r * rnd(0.45, 0.8) });
    rocks.push({ x, y, r, bits, ph: rnd(0, TAU) });
  }
  for (let tries = 0; tries < 400 && banks.length < 6; tries++) {
    const rx = rnd(50, 85), ry = rnd(22, 36), x = rnd(rx, WW - rx), y = rnd(80, LAND_Y - 220);
    if (islands.some(o => Math.hypot(o.x - x, o.y - y) < rx + o.r * 1.2 + 25)) continue;
    if (banks.some(o => Math.hypot(o.x - x, o.y - y) < 190)) continue;
    if (Math.hypot(harbor.x - x, harbor.y - y) < 260 || Math.hypot(arena.x - x, arena.y - y) < 120) continue;
    banks.push({ x, y, rx, ry, rot: rnd(0, Math.PI) });
  }
  const houses = [];
  for (let x = 30; x < WW - 20; x += rnd(55, 85)) {
    if (Math.abs(x - pier.x) < 40 || Math.abs(x - (WW / 2 + 60)) < 34) continue;
    houses.push({ x, w: rnd(26, 36), h: rnd(16, 22), c: ['#ef476f', '#8ecae6', '#ffd166', '#06d6a0', '#c77dff'][Math.floor(rnd(0, 5))] });
  }
  return { islands, T, rocks, banks, harbor, pier, arena, houses };
}

export function inBank(banks, x, y) {
  for (const b of banks) {
    const c = Math.cos(-b.rot), s = Math.sin(-b.rot), dx = x - b.x, dy = y - b.y;
    const u = dx * c - dy * s, v = dx * s + dy * c;
    if ((u / b.rx) ** 2 + (v / b.ry) ** 2 < 1) return true;
  }
  return false;
}

// Zufälliger freier Wasserpunkt
export function waterPoint(map, { awayFrom = null, minDist = 0, pad = 28, maxY = LAND_Y - 120 } = {}) {
  for (let i = 0; i < 300; i++) {
    const p = { x: rnd(40, WW - 40), y: rnd(40, maxY) };
    if (awayFrom && dist(p, awayFrom) < minDist) continue;
    if (map.islands.some(o => islandPush(o, p.x, p.y, pad))) continue;
    if (map.rocks.some(o => dist(o, p) < o.r + pad)) continue;
    return p;
  }
  return { x: WW / 2, y: LAND_Y - 200 };
}
