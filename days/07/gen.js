// Sudoku-Generator und -Löser (rein logisch, ohne DOM; auch in Node testbar).
// Zellen liegen als flaches Array (Länge n*n, Index = zeile*n + spalte), 0 = leer.

export const BOX = { 4: [2, 2], 6: [2, 3], 9: [3, 3] }; // [Zeilen, Spalten] je Kiste
// Ziel-Anzahl vorgegebener Zahlen (min, max) je Größe
export const GIVENS = { 4: [7, 9], 6: [16, 19], 9: [38, 42] };

const popcount = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

function layout(n) {
  const [br, bc] = BOX[n];
  const nn = n * n, perRow = n / bc;
  const box = new Array(nn), peers = [];
  for (let i = 0; i < nn; i++) { const r = (i / n) | 0, c = i % n; box[i] = ((r / br) | 0) * perRow + ((c / bc) | 0); }
  for (let i = 0; i < nn; i++) {
    const r = (i / n) | 0, c = i % n, set = new Set();
    for (let j = 0; j < nn; j++) if (j !== i && ((j / n | 0) === r || j % n === c || box[j] === box[i])) set.add(j);
    peers.push([...set]);
  }
  // alle 3n Einheiten (Zeilen, Spalten, Kisten) als Indexlisten
  const units = [];
  for (let k = 0; k < n; k++) {
    units.push(Array.from({ length: n }, (_, c) => k * n + c));
    units.push(Array.from({ length: n }, (_, r) => r * n + k));
    units.push(Array.from({ length: nn }, (_, i) => i).filter(i => box[i] === k));
  }
  return { n, nn, box, peers, units, full: (1 << n) - 1 };
}
const cache = {};
export const getLayout = n => cache[n] || (cache[n] = layout(n));

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Backtracking mit "kleinste Kandidatenzahl zuerst". Zählt Lösungen bis `limit`.
// Mit rng werden die Ziffern zufällig probiert (für zufällige Gitter).
export function solve(n, cells, limit = 2, rng = null) {
  const L = getLayout(n), { nn, box, full } = L;
  const g = cells.slice(), used = new Array(3 * n).fill(0); // Zeilen 0..n-1, Spalten n..2n-1, Kisten 2n..3n-1
  const bit = v => 1 << (v - 1);
  for (let i = 0; i < nn; i++) {
    if (!g[i]) continue;
    const b = bit(g[i]), r = (i / n) | 0, c = i % n;
    if ((used[r] | used[n + c] | used[2 * n + box[i]]) & b) return { count: 0, solution: null };
    used[r] |= b; used[n + c] |= b; used[2 * n + box[i]] |= b;
  }
  let count = 0, solution = null;
  const rec = () => {
    let best = -1, bestMask = 0, bestN = 99;
    for (let i = 0; i < nn; i++) {
      if (g[i]) continue;
      const m = full & ~(used[(i / n) | 0] | used[n + (i % n)] | used[2 * n + box[i]]);
      const k = popcount(m);
      if (k < bestN) { best = i; bestMask = m; bestN = k; if (k <= 1) break; }
    }
    if (best < 0) { count++; if (!solution) solution = g.slice(); return count >= limit; }
    if (bestN === 0) return false;
    const digits = [];
    for (let v = 1; v <= n; v++) if (bestMask & bit(v)) digits.push(v);
    if (rng) shuffle(digits, rng);
    const r = (best / n) | 0, c = best % n, b = box[best];
    for (const v of digits) {
      const m = bit(v);
      g[best] = v; used[r] |= m; used[n + c] |= m; used[2 * n + b] |= m;
      const stop = rec();
      used[r] &= ~m; used[n + c] &= ~m; used[2 * n + b] &= ~m; g[best] = 0;
      if (stop) return true;
    }
    return false;
  };
  rec();
  return { count, solution };
}
export const countSolutions = (n, cells, limit = 2) => solve(n, cells, limit).count;

// Lösbar nur mit "einziger Kandidat" und "einziger Platz in Einheit"? (kindgerecht, ohne Raten)
export function solvableBySingles(n, cells) {
  const { nn, box, full, units } = getLayout(n);
  const g = cells.slice();
  const cand = i => {
    let m = full;
    for (const j of getLayout(n).peers[i]) if (g[j]) m &= ~(1 << (g[j] - 1));
    return m;
  };
  let left = g.filter(v => !v).length, progress = true;
  while (left && progress) {
    progress = false;
    for (let i = 0; i < nn; i++) {
      if (g[i]) continue;
      const m = cand(i);
      if (m && !(m & (m - 1))) { g[i] = Math.log2(m) + 1; left--; progress = true; }
    }
    for (const u of units) {
      for (let v = 1; v <= n; v++) {
        const b = 1 << (v - 1);
        if (u.some(i => g[i] === v)) continue;
        const spots = u.filter(i => !g[i] && (cand(i) & b));
        if (spots.length === 1) { g[spots[0]] = v; left--; progress = true; }
      }
    }
  }
  return left === 0;
}

// Erzeugt { puzzle, solution, givens }: zufälliges gültiges Gitter, dann Zahlen entfernen,
// solange die Lösung eindeutig bleibt. Bei 6x6 und 9x9 muss das Rätsel zusätzlich ohne Raten lösbar bleiben.
export function generate(n, rng = Math.random) {
  const L = getLayout(n), { nn } = L;
  const [lo, hi] = GIVENS[n];
  for (let attempt = 0; attempt < 20; attempt++) {
    const solution = solve(n, new Array(nn).fill(0), 1, rng).solution;
    const puzzle = solution.slice();
    const target = lo + Math.floor(rng() * (hi - lo + 1));
    let givens = nn;
    for (const i of shuffle(Array.from({ length: nn }, (_, k) => k), rng)) {
      if (givens <= target) break;
      const v = puzzle[i]; puzzle[i] = 0;
      const ok = n === 4 ? countSolutions(n, puzzle, 2) === 1
        : solvableBySingles(n, puzzle) && countSolutions(n, puzzle, 2) === 1;
      if (ok) givens--; else puzzle[i] = v;
    }
    if (givens <= hi) return { puzzle, solution, givens };
  }
  // Notfall (praktisch nie): nur Eindeutigkeit verlangen, das ist immer lösbar
  const solution = solve(n, new Array(nn).fill(0), 1, rng).solution;
  const puzzle = solution.slice();
  let givens = nn;
  for (const i of shuffle(Array.from({ length: nn }, (_, k) => k), rng)) {
    if (givens <= lo) break;
    const v = puzzle[i]; puzzle[i] = 0;
    if (countSolutions(n, puzzle, 2) === 1) givens--; else puzzle[i] = v;
  }
  return { puzzle, solution, givens };
}
