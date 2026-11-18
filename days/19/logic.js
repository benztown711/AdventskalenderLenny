// Klötzchen-Puzzle: reine Spiel-Logik (ohne Zeichnen), auch in Node testbar.
export const N = 8;
export const COLORS = ['#ef476f', '#ffd166', '#06d6a0', '#8ecae6', '#c77dff'];

// Grundformen (Zeile für Zeile), tier 0 = leicht, 1 = mittel, 2 = knifflig
const BASES = [
  { n: 'dot', t: 0, w: 2.0, r: ['#'] },
  { n: 'I2', t: 0, w: 3.0, r: ['##'] },
  { n: 'I3', t: 0, w: 3.0, r: ['###'] },
  { n: 'L3', t: 0, w: 3.0, r: ['#.', '##'] },
  { n: 'O', t: 0, w: 3.0, r: ['##', '##'] },
  { n: 'I4', t: 1, w: 2.0, r: ['####'] },
  { n: 'L4', t: 1, w: 2.0, r: ['#.', '#.', '##'], mirror: true },
  { n: 'T4', t: 1, w: 2.0, r: ['###', '.#.'] },
  { n: 'S4', t: 1, w: 1.5, r: ['.##', '##.'], mirror: true },
  { n: 'I5', t: 2, w: 1.0, r: ['#####'] },
  { n: 'L5', t: 2, w: 1.2, r: ['#..', '#..', '###'] },
  { n: 'T5', t: 2, w: 1.0, r: ['###', '.#.', '.#.'] },
  { n: 'plus', t: 2, w: 0.9, r: ['.#.', '###', '.#.'] },
  { n: 'U5', t: 2, w: 1.0, r: ['#.#', '###'] },
  { n: 'P5', t: 2, w: 1.0, r: ['##', '##', '#.'], mirror: true },
];

const toCells = rows => { const c = []; rows.forEach((s, y) => [...s].forEach((ch, x) => { if (ch === '#') c.push([x, y]); })); return c; };
const norm = cells => {
  const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};
const rot = cells => norm(cells.map(([x, y]) => [-y, x]));
const mir = cells => norm(cells.map(([x, y]) => [-x, y]));
for (const b of BASES) {
  let c = norm(toCells(b.r)); const seen = new Set(), out = [];
  const all = [c]; if (b.mirror) all.push(mir(c));
  for (let v of all) for (let i = 0; i < 4; i++) {
    const k = JSON.stringify(v); if (!seen.has(k)) { seen.add(k); out.push(v); } v = rot(v);
  }
  b.orients = out;
}
export const SHAPES = BASES;

export const newBoard = () => Array.from({ length: N }, () => Array(N).fill(null));
export const isEmpty = b => b.every(r => r.every(c => !c));

export function makePiece(base, rng = Math.random, color) {
  const cells = base.orients[Math.floor(rng() * base.orients.length)];
  const w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
  // gelegentlich ein Stern-Klötzchen (nur bei Formen ab 2 Zellen)
  const star = cells.length >= 2 && rng() < 0.14 ? Math.floor(rng() * cells.length) : -1;
  return { name: base.n, cells, w, h, star, color: color ?? Math.floor(rng() * COLORS.length) };
}

export function canPlace(b, p, ox, oy) {
  if (ox < 0 || oy < 0 || ox + p.w > N || oy + p.h > N) return false;
  for (const [x, y] of p.cells) if (b[oy + y][ox + x]) return false;
  return true;
}
export function fitsAnywhere(b, p) {
  for (let y = 0; y <= N - p.h; y++) for (let x = 0; x <= N - p.w; x++) if (canPlace(b, p, x, y)) return true;
  return false;
}
// welche Reihen/Spalten wären nach dem Legen voll? (ohne das Brett zu verändern)
export function linesAfter(b, p, ox, oy) {
  const occ = (x, y) => b[y][x] || p.cells.some(c => c[0] + ox === x && c[1] + oy === y);
  const rows = [], cols = [];
  for (let y = 0; y < N; y++) { let f = true; for (let x = 0; x < N && f; x++) if (!occ(x, y)) f = false; if (f) rows.push(y); }
  for (let x = 0; x < N; x++) { let f = true; for (let y = 0; y < N && f; y++) if (!occ(x, y)) f = false; if (f) cols.push(x); }
  return { rows, cols };
}
// legt die Form wirklich und räumt volle Linien ab. Rückgabe: { rows, cols, cleared:[{x,y,cell}] }
export function applyMove(b, p, ox, oy) {
  p.cells.forEach(([x, y], i) => { b[oy + y][ox + x] = { c: p.color, star: i === p.star }; });
  const rows = [], cols = [];
  for (let y = 0; y < N; y++) if (b[y].every(Boolean)) rows.push(y);
  for (let x = 0; x < N; x++) if (b.every(r => r[x])) cols.push(x);
  const cleared = [], seen = new Set();
  const take = (x, y) => { const k = y * N + x; if (seen.has(k)) return; seen.add(k); cleared.push({ x, y, cell: b[y][x] }); };
  rows.forEach(y => { for (let x = 0; x < N; x++) take(x, y); });
  cols.forEach(x => { for (let y = 0; y < N; y++) take(x, y); });
  cleared.forEach(c => { b[c.y][c.x] = null; });
  return { rows, cols, cleared };
}

// Punkte: Zellen + Linien*10*Multiplikator (+ Stern-Bonus). Serie bleibt bis zu 3 Züge ohne Linie erhalten.
export function scoreMove(st, res, cellCount, boardEmpty) {
  const lines = res.rows.length + res.cols.length;
  let mult = 1, points = cellCount, starBonus = 0, emptyBonus = 0;
  if (lines > 0) {
    st.streak++; st.miss = 0;
    mult = st.streak + lines - 1;
    points += lines * 10 * mult;
    const stars = res.cleared.filter(c => c.cell && c.cell.star).length;
    starBonus = stars * 25 * mult; points += starBonus;
    if (boardEmpty) { emptyBonus = 150; points += emptyBonus; }
  } else if (++st.miss >= 3) { st.streak = 0; st.miss = 0; }
  return { points, mult, lines, starBonus, emptyBonus };
}

// Schwierigkeit 0..1 steigt mit der Punktzahl
export const difficulty = score => Math.min(1, score / 2500);

// Faire Formen-Auswahl: viele Kandidaten-Sets, mindestens eine Form muss passen.
// Anfangs passen möglichst alle drei, später zunehmend nur noch eine bis zwei.
export function genSet(b, score, rng = Math.random) {
  const d = difficulty(score);
  const wts = BASES.map(s => s.w * (s.t === 0 ? 1 - 0.65 * d : s.t === 2 ? 1 + 2.5 * d : 1 + 0.5 * d));
  const total = wts.reduce((a, c) => a + c, 0);
  const pick = () => { let r = rng() * total; for (let i = 0; i < BASES.length; i++) { r -= wts[i]; if (r <= 0) return BASES[i]; } return BASES[0]; };
  const target = 3 - 1.6 * d; // gewünschte Anzahl passender Formen
  let best = null, bestScore = Infinity;
  for (let k = 0; k < 28; k++) {
    const cols = [0, 1, 2, 3, 4].sort(() => rng() - 0.5);
    const set = [0, 1, 2].map(i => makePiece(pick(), rng, cols[i]));
    const fit = set.filter(p => fitsAnywhere(b, p)).length;
    if (fit < 1) continue;
    const dup = set[0].name === set[1].name || set[1].name === set[2].name || set[0].name === set[2].name ? 0.4 : 0;
    const sc = Math.abs(fit - target) + dup + rng() * 0.3;
    if (sc < bestScore) { bestScore = sc; best = set; }
  }
  if (!best) { // Notnagel: Einerklötzchen passt immer, solange ein Feld frei ist
    const dot = BASES[0];
    best = [0, 1, 2].map(i => makePiece(dot, rng, i));
  }
  return best;
}

export const STAR_POINTS = [300, 900, 2000]; // 1, 2, 3 Sterne
export const starsFor = s => (s >= STAR_POINTS[2] ? 3 : s >= STAR_POINTS[1] ? 2 : s >= STAR_POINTS[0] ? 1 : 0);
