// Türchen 11: reine Logik (Geometrie + Rätsel-Generator), ohne DOM, in Node testbar.

export const FIELD = { x0: 34, y0: 78, x1: 326, y1: 466 }; // Bereich für Birnen-Mittelpunkte

const EPS = 1e-7;
const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
const onSeg = (p, q, r) => Math.min(p.x, q.x) - 1e-9 <= r.x && r.x <= Math.max(p.x, q.x) + 1e-9
  && Math.min(p.y, q.y) - 1e-9 <= r.y && r.y <= Math.max(p.y, q.y) + 1e-9;

// Schneiden sich die Strecken ab und cd? (Berührung und Überlappung zählen mit.)
export function segCross(a, b, c, d) {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  const L = Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(d.x - c.x, d.y - c.y) || 1;
  const e = EPS * L;
  if (((o1 > e && o2 < -e) || (o1 < -e && o2 > e)) && ((o3 > e && o4 < -e) || (o3 < -e && o4 > e))) return true;
  if (Math.abs(o1) <= e && onSeg(a, b, c)) return true;
  if (Math.abs(o2) <= e && onSeg(a, b, d)) return true;
  if (Math.abs(o3) <= e && onSeg(c, d, a)) return true;
  if (Math.abs(o4) <= e && onSeg(c, d, b)) return true;
  return false;
}

// Kreuzen sich zwei Kanten (Index-Paare)? Gemeinsamer Endpunkt zählt nicht,
// außer die Kanten laufen von dort aus übereinander (kollinear, gleiche Richtung).
export function edgesCross(pts, e1, e2) {
  const [a, b] = e1, [c, d] = e2;
  let s = -1, u, v;
  if (a === c) { s = a; u = b; v = d; } else if (a === d) { s = a; u = b; v = c; }
  else if (b === c) { s = b; u = a; v = d; } else if (b === d) { s = b; u = a; v = c; }
  if (s >= 0) {
    if (u === v) return true; // doppelte Kante
    const P = pts[s], U = pts[u], V = pts[v];
    const l = Math.hypot(U.x - P.x, U.y - P.y) * Math.hypot(V.x - P.x, V.y - P.y) || 1;
    const cr = (U.x - P.x) * (V.y - P.y) - (U.y - P.y) * (V.x - P.x);
    const dot = (U.x - P.x) * (V.x - P.x) + (U.y - P.y) * (V.y - P.y);
    return Math.abs(cr) <= EPS * l && dot > 0;
  }
  return segCross(pts[a], pts[b], pts[c], pts[d]);
}

// Liefert { count, bad: Set der Kanten-Indizes, die an einer Kreuzung beteiligt sind }
export function findCrossings(pts, edges) {
  const bad = new Set(); let count = 0;
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    if (edgesCross(pts, edges[i], edges[j])) { count++; bad.add(i); bad.add(j); }
  }
  return { count, bad };
}

export const countCrossings = (pts, edges) => findCrossings(pts, edges).count;

// n: Birnen, f: Kabel pro Birne, minC/maxC: gewünschte Kreuzungen am Start (maxC begrenzt die ersten Level)
export const LEVELS = [
  { n: 4, f: 1.25, minC: 1, maxC: 2 }, { n: 5, f: 1.3, minC: 2, maxC: 4 }, { n: 6, f: 1.35 }, { n: 8, f: 1.45 },
  { n: 10, f: 1.5 }, { n: 12, f: 1.55 }, { n: 14, f: 1.65 }, { n: 16, f: 1.7 },
];

function distToSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

function connected(n, edges, skip = -1) {
  const adj = Array.from({ length: n }, () => []);
  edges.forEach((e, i) => { if (i !== skip) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); } });
  const seen = new Set([0]), st = [0];
  while (st.length) for (const w of adj[st.pop()]) if (!seen.has(w)) { seen.add(w); st.push(w); }
  return seen.size === n;
}

function planar(n, m, rng) {
  const { x0, y0, x1, y1 } = FIELD;
  for (let attempt = 0; attempt < 200; attempt++) {
    const minD = Math.max(40, 66 - attempt * 0.3 - n * 0.9);
    const pts = [];
    let tries = 0;
    while (pts.length < n && tries++ < 4000) {
      const p = { x: x0 + rng() * (x1 - x0), y: y0 + rng() * (y1 - y0) };
      if (pts.every(q => Math.hypot(p.x - q.x, p.y - q.y) >= minD)) pts.push(p);
    }
    if (pts.length < n) continue;
    // alle Paare nach Länge; Kante nur, wenn sie nichts kreuzt und an keiner fremden Birne vorbeischrammt
    const pairs = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)]);
    pairs.sort((p, q) => p[2] - q[2]);
    const edges = [];
    for (const [i, j] of pairs) {
      if (pts.some((p, k) => k !== i && k !== j && distToSeg(p, pts[i], pts[j]) < 17)) continue;
      if (edges.some(e => edgesCross(pts, e, [i, j]))) continue;
      edges.push([i, j]);
    }
    if (!connected(n, edges)) continue;
    // ausdünnen auf m Kanten (zusammenhängend halten, jede Birne bekommt mindestens 2 Kabel, wenn möglich)
    const deg = new Array(n).fill(0); edges.forEach(([a, b]) => { deg[a]++; deg[b]++; });
    const order = edges.map((_, i) => i).sort(() => rng() - 0.5);
    let cur = edges.slice();
    for (const idx of order) {
      if (cur.length <= m) break;
      const e = edges[idx], pos = cur.indexOf(e);
      if (pos < 0 || deg[e[0]] <= 2 || deg[e[1]] <= 2) continue;
      if (!connected(n, cur, pos)) continue;
      cur.splice(pos, 1); deg[e[0]]--; deg[e[1]]--;
    }
    if (cur.length > m + 2) continue;
    return { pts, edges: cur };
  }
  throw new Error('Generator: kein planarer Graph gefunden');
}

// level: 1..8. rng: Funktion 0..1 (Standard Math.random).
// Ergebnis: { n, edges, sol (lösbare Positionen, 0 Kreuzungen), start (verwürfelt, mind. einige Kreuzungen) }
export function generate(level, rng = Math.random) {
  const L = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, level - 1))];
  const n = L.n, m = Math.min(Math.round(n * L.f), 3 * n - 6);
  const { pts: sol, edges } = planar(n, m, rng);
  const want = L.minC ?? Math.max(3, Math.round(edges.length * 0.4));
  const cx = (FIELD.x0 + FIELD.x1) / 2, cy = (FIELD.y0 + FIELD.y1) / 2;
  const R = Math.min(cx - FIELD.x0, cy - FIELD.y0) - 4 + 0;
  const rad = Math.min(R, 150);
  const target = L.maxC ? Math.round((want + L.maxC) / 2) : Math.max(want, Math.round(edges.length * 1.1));
  let best = null, bestC = -1;
  for (let t = 0; t < 120; t++) {
    const perm = Array.from({ length: n }, (_, i) => i).sort(() => rng() - 0.5);
    const off = rng() * 6.283;
    const start = new Array(n);
    perm.forEach((pi, k) => {
      const a = off + (k / n) * 6.283, r = rad - rng() * 14;
      start[pi] = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    });
    const c = countCrossings(start, edges);
    if (L.maxC && c > L.maxC) continue;
    if (c >= want && (bestC < want || Math.abs(c - target) < Math.abs(bestC - target))) { bestC = c; best = start; }
    else if (bestC < want && c > bestC) { bestC = c; best = start; }
  }
  return { n, edges, sol, start: best, crossings: bestC };
}
