// Level-Generator für Pfeil-Salat (reine Logik, ohne Browser).
// Prinzip: rückwärts aufbauen. Ein neu gesetzter Pfeil braucht freie Bahn zum Rand
// gegenüber allen schon gesetzten Pfeilen. Rückwärts abgearbeitet (zuletzt gesetzt = zuerst raus)
// ergibt das immer eine gültige Abräum-Reihenfolge. Ausräumen kann nie etwas blockieren,
// also geht auch jede andere Reihenfolge freier Pfeile weiter.

export const DIRS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

// n: Gittergröße, fill: Ziel-Füllgrad, maxLen: längster Pfeil, bend: Chance auf Knick pro Schritt,
// depth: Mindest-Schichten (so viele Runden braucht man mindestens, wenn man alles Freie parallel räumt)
export const LEVELS = [
  { n: 5, fill: 0.46, maxLen: 2, bend: 0,    depth: 2 },
  { n: 5, fill: 0.58, maxLen: 3, bend: 0,    depth: 3 },
  { n: 6, fill: 0.58, maxLen: 3, bend: 0.4,  depth: 3 },
  { n: 6, fill: 0.68, maxLen: 4, bend: 0.5,  depth: 4 },
  { n: 7, fill: 0.68, maxLen: 4, bend: 0.5,  depth: 4 },
  { n: 8, fill: 0.7,  maxLen: 5, bend: 0.55, depth: 5 },
  { n: 8, fill: 0.76, maxLen: 5, bend: 0.55, depth: 5 },
  { n: 9, fill: 0.78, maxLen: 5, bend: 0.55, depth: 6 },
];

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Arrow: { cells:[{x,y}...] (Schwanz -> Kopf), dir: 0..3 (Index in DIRS) }
export function rayCells(a, n) {
  const d = DIRS[a.dir], h = a.cells[a.cells.length - 1], out = [];
  for (let x = h.x + d.x, y = h.y + d.y; x >= 0 && y >= 0 && x < n && y < n; x += d.x, y += d.y) out.push({ x, y });
  return out;
}

function tryArrow(occ, n, maxLen, bend) {
  const free = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (occ[y][x] < 0) free.push({ x, y });
  if (!free.length) return null;
  const start = free[rnd(0, free.length - 1)];
  // Längen eher > 1, damit es nicht nur Pünktchen gibt
  let len = maxLen > 1 && Math.random() < 0.8 ? rnd(2, maxLen) : 1;
  const cells = [start];
  let dir = rnd(0, 3);
  const seen = new Set([start.y * n + start.x]);
  while (cells.length < len) {
    const last = cells[cells.length - 1];
    // meist geradeaus weiter (dir), mit Chance auf Knick
    const order = Math.random() < bend ? shuffle([0, 1, 2, 3]) : [dir, ...shuffle([0, 1, 2, 3].filter(i => i !== dir))];
    let moved = false;
    for (const i of order) {
      const x = last.x + DIRS[i].x, y = last.y + DIRS[i].y;
      if (x < 0 || y < 0 || x >= n || y >= n || occ[y][x] >= 0 || seen.has(y * n + x)) continue;
      cells.push({ x, y }); seen.add(y * n + x); dir = i; moved = true; break;
    }
    if (!moved) break;
  }
  if (cells.length === 1) {
    const dirs = shuffle([0, 1, 2, 3]);
    for (const d of dirs) { const a = { cells, dir: d }; if (rayFree(a, occ, n, seen)) return a; }
    return null;
  }
  const a = { cells, dir };
  return rayFree(a, occ, n, seen) ? a : null;
}
function rayFree(a, occ, n, own) {
  for (const c of rayCells(a, n)) if (occ[c.y][c.x] >= 0 || own.has(c.y * n + c.x)) return false;
  return true;
}

// Schichten-Tiefe per Simulation. Gibt { depth, order, ok } zurück.
export function solve(arrows, n) {
  const occ = Array.from({ length: n }, () => Array(n).fill(-1));
  arrows.forEach((a, i) => a.cells.forEach(c => { occ[c.y][c.x] = i; }));
  const alive = new Set(arrows.keys()), order = [];
  let depth = 0;
  while (alive.size) {
    const free = [...alive].filter(i => rayCells(arrows[i], n).every(c => occ[c.y][c.x] < 0));
    if (!free.length) return { ok: false, depth, order };
    depth++;
    for (const i of free) { alive.delete(i); order.push(i); arrows[i].cells.forEach(c => { occ[c.y][c.x] = -1; }); }
  }
  return { ok: true, depth, order };
}

export function makeLevel(levelNo) {
  const P = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelNo - 1))];
  const n = P.n;
  let best = null;
  for (let attempt = 0; attempt < 80; attempt++) {
    const occ = Array.from({ length: n }, () => Array(n).fill(-1));
    const arrows = [];
    let filled = 0, fails = 0;
    while (filled < n * n * P.fill && fails < 120) {
      const a = tryArrow(occ, n, P.maxLen, P.bend);
      if (!a) { fails++; continue; }
      a.cells.forEach(c => { occ[c.y][c.x] = arrows.length; });
      arrows.push(a); filled += a.cells.length;
    }
    if (arrows.length < 4) continue;
    const s = solve(arrows, n);
    if (!s.ok) continue; // dürfte nie passieren, Sicherheitsnetz
    const lenSum = arrows.reduce((t, a) => t + a.cells.length, 0);
    const score = Math.min(s.depth, P.depth) * 100 + Math.min(arrows.length, 40) + (filled >= n * n * P.fill * 0.9 ? 30 : 0) + lenSum * 0.01;
    if (!best || score > best.score) best = { score, arrows, n, depth: s.depth, order: s.order };
    if (s.depth >= P.depth && filled >= n * n * P.fill * 0.9) break;
  }
  if (!best) { // allerletzte Rettung: ein paar Einzelpfeile am Rand
    const arrows = [{ cells: [{ x: 0, y: 0 }], dir: 0 }, { cells: [{ x: n - 1, y: n - 1 }], dir: 2 }, { cells: [{ x: 0, y: n - 1 }], dir: 3 }, { cells: [{ x: n - 1, y: 0 }], dir: 1 }];
    best = { arrows, n, depth: 1, order: [0, 1, 2, 3] };
  }
  return best;
}
