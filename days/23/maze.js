// Labyrinth-Erzeugung für Türchen 23 (reine Logik, ohne DOM, damit sie in Node testbar ist).
// Zellen-Labyrinth (cw x ch) wird in ein Kachel-Raster (2cw+1 x 2ch+1) übersetzt: 1 = Wand, 0 = Boden, 2 = Tür zum Geschenk.

export const LEVELS = [
  { name: 'Vorratskeller', cw: 9, ch: 11, ghosts: 0, doors: 0, chim: false, candles: 4, worms: 2, mice: 3 },
  { name: 'Spielzeug-Werkstatt', cw: 11, ch: 14, ghosts: 1, doors: 0, chim: false, candles: 5, worms: 2, mice: 4 },
  { name: 'Rentierstall', cw: 13, ch: 16, ghosts: 2, doors: 3, chim: false, candles: 6, worms: 3, mice: 4 },
  { name: 'Geschenke-Lager', cw: 15, ch: 19, ghosts: 3, doors: 4, chim: true, candles: 7, worms: 3, mice: 5 },
];

export const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // Richtung 0=hoch 1=rechts 2=runter 3=links

const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];

export function generateLevel(levelIdx, rnd = Math.random) {
  const cfg = LEVELS[levelIdx];
  const { cw, ch } = cfg, n = cw * ch;
  const id = (x, y) => y * cw + x;
  const open = new Uint8Array(n); // Bitmaske offener Richtungen
  const link = (a, d) => {
    const x = a % cw, y = (a / cw) | 0, b = id(x + DX[d], y + DY[d]);
    open[a] |= 1 << d; open[b] |= 1 << ((d + 2) % 4);
  };
  const inside = (x, y) => x >= 0 && y >= 0 && x < cw && y < ch;

  // Tiefensuche
  const vis = new Uint8Array(n); const stack = [id((rnd() * cw) | 0, (rnd() * ch) | 0)]; vis[stack[0]] = 1;
  while (stack.length) {
    const c = stack[stack.length - 1], x = c % cw, y = (c / cw) | 0;
    const ds = shuffle([0, 1, 2, 3], rnd).filter(d => inside(x + DX[d], y + DY[d]) && !vis[id(x + DX[d], y + DY[d])]);
    if (!ds.length) { stack.pop(); continue; }
    const d = ds[0]; link(c, d); const nb = id(x + DX[d], y + DY[d]); vis[nb] = 1; stack.push(nb);
  }
  const bits = v => (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1) + ((v >> 3) & 1);
  // Durchbrüche: einige Sackgassen öffnen, dazu ein paar zufällige Wände (-> Schleifen)
  const closedWalls = (c) => [0, 1, 2, 3].filter(d => { const x = c % cw, y = (c / cw) | 0; return !(open[c] & (1 << d)) && inside(x + DX[d], y + DY[d]); });
  for (let c = 0; c < n; c++) if (bits(open[c]) === 1 && rnd() < 0.22) { const ds = closedWalls(c); if (ds.length) link(c, pick(ds, rnd)); }
  const extra = Math.round(n * 0.05);
  for (let k = 0; k < extra; k++) { const c = (rnd() * n) | 0, ds = closedWalls(c); if (ds.length) link(c, pick(ds, rnd)); }

  const adj = Array.from({ length: n }, (_, c) => {
    const x = c % cw, y = (c / cw) | 0, out = [];
    for (let d = 0; d < 4; d++) if (open[c] & (1 << d)) out.push({ to: id(x + DX[d], y + DY[d]), dir: d });
    return out;
  });
  // Distanzen (ungerichtet)
  const dist = new Int16Array(n * n).fill(-1);
  for (let s = 0; s < n; s++) {
    const q = [s]; dist[s * n + s] = 0;
    for (let i = 0; i < q.length; i++) for (const { to } of adj[q[i]]) if (dist[s * n + to] < 0) { dist[s * n + to] = dist[s * n + q[i]] + 1; q.push(to); }
  }
  const D = (a, b) => dist[a * n + b];

  // Start in einer Ecke, Ausgang = weit entfernte Sackgasse
  const corners = [id(0, 0), id(cw - 1, 0), id(0, ch - 1), id(cw - 1, ch - 1)];
  const start = pick(corners, rnd);
  const dead = [];
  for (let c = 0; c < n; c++) if (c !== start && bits(open[c]) === 1) dead.push(c);
  dead.sort((a, b) => D(start, b) - D(start, a));
  const exit = dead[Math.min(dead.length - 1, (rnd() * 3) | 0)];
  const used = new Set([start, exit]);
  const isDead = c => bits(open[c]) === 1;

  // Schlüssel: weit auseinander
  const keys = [];
  for (let k = 0; k < 3; k++) {
    const sc = [];
    for (let c = 0; c < n; c++) {
      if (used.has(c) || D(start, c) < 5 || D(exit, c) < 3) continue;
      let m = 1e9; for (const u of [start, exit, ...keys]) m = Math.min(m, D(u, c));
      sc.push([m + (isDead(c) ? 2 : 0) + rnd() * 2, c]);
    }
    sc.sort((a, b) => b[0] - a[0]);
    const c = sc.length ? pick(sc.slice(0, 5), rnd)[1] : (() => { for (let q = 0; q < n; q++) if (!used.has(q)) return q; })();
    keys.push(c); used.add(c);
  }
  const pool = () => shuffle([...Array(n).keys()].filter(c => !used.has(c)), rnd);
  const take = (list, count) => { const out = list.slice(0, count); out.forEach(c => used.add(c)); return out; };
  const candles = take(pool().filter(c => D(start, c) >= 2), cfg.candles);
  const worms = take(pool().filter(c => D(start, c) >= 2), cfg.worms);
  const mp = pool().filter(c => D(start, c) >= 3); mp.sort((a, b) => (isDead(b) ? 1 : 0) - (isDead(a) ? 1 : 0) + (rnd() - 0.5) * 0.5);
  const mice = take(mp, cfg.mice);

  // Kamine
  let chimneys = null;
  if (cfg.chim) {
    const p = pool(); let best = null;
    for (let t = 0; t < 300; t++) { const a = pick(p, rnd), b = pick(p, rnd); if (a !== b && D(a, b) >= 9 && D(start, a) >= 3 && D(start, b) >= 3) { best = [a, b]; break; } }
    if (!best) { let bd = -1; for (const a of p) for (const b of p) if (D(a, b) > bd) { bd = D(a, b); best = [a, b]; } }
    chimneys = best; best.forEach(c => used.add(c));
  }

  // Geister-Startzellen: weit weg vom Start
  const ghosts = [];
  const minG = levelIdx === 1 ? 8 : 10;
  const gp = shuffle([...Array(n).keys()].filter(c => c !== exit && c !== start), rnd).sort((a, b) => (D(start, b) >= minG ? 1 : 0) - (D(start, a) >= minG ? 1 : 0));
  for (const c of gp) { if (ghosts.length >= cfg.ghosts) break; if (ghosts.every(g => D(g, c) >= 5)) ghosts.push(c); }
  for (const c of gp) { if (ghosts.length >= cfg.ghosts) break; if (!ghosts.includes(c)) ghosts.push(c); }

  // Einbahn-Türen: nur auf Kanten, die keine Brücke sind (alles bleibt erreichbar)
  const edges = [];
  for (let c = 0; c < n; c++) for (const { to, dir } of adj[c]) if (dir === 1 || dir === 2) edges.push([c, to, dir]);
  // gerichtete Kante c->to erlaubt? (Einbahn-Türen als Map Kachelindex -> {dx,dy})
  const allowed = (c, dir, omap) => {
    const x = c % cw, y = (c / cw) | 0, o = omap.get((2 * y + 1 + DY[dir]) * (2 * cw + 1) + 2 * x + 1 + DX[dir]);
    return !o || (o.dx === DX[dir] && o.dy === DY[dir]);
  };
  // stark zusammenhängend: von Zelle 0 hin und zurück erreichbar (man kann sich nie einsperren)
  const strong = omap => {
    for (const rev of [false, true]) {
      const seen = new Uint8Array(n), q = [0]; seen[0] = 1; let cnt = 1;
      for (let i = 0; i < q.length; i++) for (const { to, dir } of adj[q[i]]) {
        const ok = rev ? allowed(to, (dir + 2) % 4, omap) : allowed(q[i], dir, omap);
        if (ok && !seen[to]) { seen[to] = 1; cnt++; q.push(to); }
      }
      if (cnt !== n) return false;
    }
    return true;
  };
  const doorCells = new Set(); const oneways = [];
  for (const [a, b, dir] of shuffle(edges, rnd)) {
    if (oneways.length >= cfg.doors) break;
    if (a === start || b === start || a === exit || b === exit || doorCells.has(a) || doorCells.has(b)) continue;
    const fwd = rnd() < 0.5, d = fwd ? dir : (dir + 2) % 4;
    const from = fwd ? a : b;
    const tx = 2 * (from % cw) + 1 + DX[d], ty = 2 * ((from / cw) | 0) + 1 + DY[d];
    const cand = { tx, ty, dx: DX[d], dy: DY[d], a, b };
    if (!strong(new Map([...oneways, cand].map(o => [o.ty * (2 * cw + 1) + o.tx, o])))) continue;
    oneways.push(cand); doorCells.add(a); doorCells.add(b);
  }

  // Kachel-Raster
  const tw = 2 * cw + 1, th = 2 * ch + 1, grid = new Uint8Array(tw * th).fill(1);
  for (let c = 0; c < n; c++) {
    const tx = 2 * (c % cw) + 1, ty = 2 * ((c / cw) | 0) + 1; grid[ty * tw + tx] = 0;
    for (let d = 0; d < 4; d++) if (open[c] & (1 << d)) grid[(ty + DY[d]) * tw + tx + DX[d]] = 0;
  }
  const ex = exit % cw, ey = (exit / cw) | 0;
  const exd = [0, 1, 2, 3].find(d => open[exit] & (1 << d));
  const doorTile = { tx: 2 * ex + 1 + DX[exd], ty: 2 * ey + 1 + DY[exd] };
  grid[doorTile.ty * tw + doorTile.tx] = 2;

  const cellXY = c => ({ cx: c % cw, cy: (c / cw) | 0 });
  const M = {
    cfg, cw, ch, tw, th, grid, adj, dist, n, doorTile, oneways,
    oneMap: new Map(oneways.map(o => [o.ty * tw + o.tx, o])),
    start, exit, keys, candles, worms, mice, ghosts, chimneys,
    cellXY, D,
  };
  return M;
}

// Gerichtete Erreichbarkeit ab Zelle `from` (beachtet Einbahn-Türen und Kamine)
export function reach(M, from) {
  const dist = new Int16Array(M.n).fill(-1), parent = new Int16Array(M.n).fill(-1);
  const q = [from]; dist[from] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], nexts = [];
    for (const { to, dir } of M.adj[c]) {
      const x = c % M.cw, y = (c / M.cw) | 0;
      const ow = M.oneMap.get((2 * y + 1 + DY[dir]) * M.tw + 2 * x + 1 + DX[dir]);
      if (ow && (ow.dx !== DX[dir] || ow.dy !== DY[dir])) continue;
      nexts.push(to);
    }
    if (M.chimneys) { if (c === M.chimneys[0]) nexts.push(M.chimneys[1]); else if (c === M.chimneys[1]) nexts.push(M.chimneys[0]); }
    for (const t of nexts) if (dist[t] < 0) { dist[t] = dist[c] + 1; parent[t] = c; q.push(t); }
  }
  return { dist, parent };
}
