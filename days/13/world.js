// Schneeball-Arena: Karte, Kollision, Sichtlinien, Wegsuche.
export const T = 40, N = 36, WORLD = T * N, CX = WORLD / 2, CY = WORLD / 2;
export const EMPTY = 0, WALL = 1, ICE = 2, CRATE = 3;
export const ICE_HP = 1800, CRATE_HP = 2200;
export const idx = (x, y) => y * N + x;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

const SHAPES = [
  [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [1, 1], [0, 1]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0]], [[0, 0], [1, 0]],
];

function tryMap(plain) {
  const tiles = new Uint8Array(N * N), hp = new Float32Array(N * N), bush = new Uint8Array(N * N);
  const H = N / 2;
  // Viertel erzeugen und spiegeln (faire, symmetrische Arena)
  const set4 = (x, y, arr, v) => { for (const [a, b] of [[x, y], [N - 1 - x, y], [x, N - 1 - y], [N - 1 - x, N - 1 - y]]) arr[idx(a, b)] = v; };
  if (!plain) {
    const nW = rnd(5, 7);
    for (let k = 0; k < nW; k++) {
      const sh = SHAPES[rnd(0, SHAPES.length - 1)], ox = rnd(2, H - 3), oy = rnd(2, H - 3);
      const type = Math.random() < 0.45 ? ICE : WALL;
      for (const [dx, dy] of sh) { const x = ox + dx, y = oy + dy; if (x >= 1 && y >= 1 && x < H && y < H) set4(x, y, tiles, type); }
    }
    const nB = rnd(4, 6);
    for (let k = 0; k < nB; k++) {
      let x = rnd(2, H - 2), y = rnd(2, H - 2);
      const len = rnd(4, 8);
      for (let i = 0; i < len; i++) {
        if (tiles[idx(x, y)] === EMPTY) set4(x, y, bush, 1);
        if (Math.random() < 0.5) x += Math.random() < 0.5 ? -1 : 1; else y += Math.random() < 0.5 ? -1 : 1;
        x = Math.max(1, Math.min(H - 1, x)); y = Math.max(1, Math.min(H - 1, y));
      }
    }
    let c = 0, guard = 0;
    while (c < 2 && guard++ < 200) {
      const x = rnd(3, H - 2), y = rnd(3, H - 2);
      if (tiles[idx(x, y)] === EMPTY && !bush[idx(x, y)]) { set4(x, y, tiles, CRATE); c++; }
    }
  }
  // Schatz in der Mitte: 4 Geschenk-Kisten
  set4(H - 1, H - 1, tiles, CRATE); set4(H - 1, H - 1, bush, 0);
  for (let i = 0; i < N; i++) { tiles[idx(i, 0)] = tiles[idx(i, N - 1)] = tiles[idx(0, i)] = tiles[idx(N - 1, i)] = WALL; }
  // Startpunkte im Kreis
  const spawns = [], rot = Math.random() * Math.PI * 2;
  for (let k = 0; k < 6; k++) {
    const a = rot + k * Math.PI / 3;
    const tx = Math.floor((CX + Math.cos(a) * 500) / T), ty = Math.floor((CY + Math.sin(a) * 500) / T);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x > 0 && y > 0 && x < N - 1 && y < N - 1) tiles[idx(x, y)] = EMPTY;
    }
    bush[idx(tx, ty)] = 0;
    spawns.push({ x: tx * T + T / 2, y: ty * T + T / 2, tx, ty });
  }
  // Erreichbarkeit prüfen (Eis und Kisten gelten als durchbrechbar)
  const seen = new Uint8Array(N * N), q = [idx(spawns[0].tx, spawns[0].ty)];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop(), x = i % N, y = (i / N) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = idx(x + dx, y + dy);
      if (!seen[j] && tiles[j] !== WALL) { seen[j] = 1; q.push(j); }
    }
  }
  if (spawns.some(s => !seen[idx(s.tx, s.ty)])) return null;
  for (let i = 0; i < N * N; i++) {
    if (!seen[i] && tiles[i] !== WALL) { tiles[i] = WALL; bush[i] = 0; }
    if (tiles[i] === ICE) hp[i] = ICE_HP;
    if (tiles[i] === CRATE) hp[i] = CRATE_HP;
    if (tiles[i] !== EMPTY) bush[i] = 0;
  }
  return { tiles, hp, bush, spawns };
}

export function makeMap() {
  for (let t = 0; t < 60; t++) { const m = tryMap(false); if (m) return m; }
  return tryMap(true);
}

export function solid(W, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= N || ty >= N) return true;
  return W.tiles[idx(tx, ty)] !== EMPTY;
}
export function hitsWall(W, x, y, r) {
  const x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r) / T), y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solid(W, tx, ty)) continue;
    const cx = Math.max(tx * T, Math.min(x, tx * T + T)), cy = Math.max(ty * T, Math.min(y, ty * T + T));
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
  }
  return false;
}
// Bewegt einen Kreis mit Gleiten an Wänden, kleine Ecken werden umrundet.
export function move(W, e, dx, dy) {
  let blocked = false;
  if (dx) {
    if (!hitsWall(W, e.x + dx, e.y, e.r)) e.x += dx;
    else {
      blocked = true;
      if (!dy) for (const n of [6, -6]) if (!hitsWall(W, e.x + dx, e.y + n, e.r)) { if (!hitsWall(W, e.x, e.y + Math.sign(n) * Math.abs(dx), e.r)) e.y += Math.sign(n) * Math.abs(dx); break; }
    }
  }
  if (dy) {
    if (!hitsWall(W, e.x, e.y + dy, e.r)) e.y += dy;
    else {
      blocked = true;
      if (!dx) for (const n of [6, -6]) if (!hitsWall(W, e.x + n, e.y + dy, e.r)) { if (!hitsWall(W, e.x + Math.sign(n) * Math.abs(dy), e.y, e.r)) e.x += Math.sign(n) * Math.abs(dy); break; }
    }
  }
  return blocked;
}
// Erstes festes Feld auf der Strecke (Index) oder -1
export function rayHit(W, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (solid(W, tx, ty)) return idx(Math.max(0, Math.min(N - 1, tx)), Math.max(0, Math.min(N - 1, ty)));
  }
  return -1;
}
export function wideClear(W, x0, y0, x1, y1, r) {
  const d = Math.hypot(x1 - x0, y1 - y0) || 1, px = -(y1 - y0) / d * r, py = (x1 - x0) / d * r;
  return rayHit(W, x0, y0, x1, y1) < 0 && rayHit(W, x0 + px, y0 + py, x1 + px, y1 + py) < 0 && rayHit(W, x0 - px, y0 - py, x1 - px, y1 - py) < 0;
}
export function inBush(W, x, y) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  return tx >= 0 && ty >= 0 && tx < N && ty < N && W.bush[idx(tx, ty)] === 1;
}
// Breitensuche auf dem Raster, liefert Wegpunkte (Feldmitten)
export function findPath(W, sx, sy, gx, gy) {
  const s = idx(Math.floor(sx / T), Math.floor(sy / T));
  let gtx = Math.max(1, Math.min(N - 2, Math.floor(gx / T))), gty = Math.max(1, Math.min(N - 2, Math.floor(gy / T)));
  if (solid(W, gtx, gty)) {
    let best = null, bd = 1e9;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (!solid(W, gtx + dx, gty + dy) && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = [gtx + dx, gty + dy]; }
    }
    if (!best) return null;
    [gtx, gty] = best;
  }
  const g = idx(gtx, gty);
  if (s === g) return [];
  const prev = new Int16Array(N * N).fill(-1);
  prev[s] = s;
  const q = [s];
  let head = 0, found = false;
  while (head < q.length) {
    const i = q[head++];
    if (i === g) { found = true; break; }
    const x = i % N, y = (i / N) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (solid(W, nx, ny)) continue;
      const j = idx(nx, ny);
      if (prev[j] !== -1) continue;
      prev[j] = i; q.push(j);
    }
  }
  if (!found) return null;
  const path = [];
  for (let i = g; i !== s; i = prev[i]) path.push({ x: (i % N) * T + T / 2, y: ((i / N) | 0) * T + T / 2 });
  return path.reverse();
}
