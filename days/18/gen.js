// Level-Generator für "Farb-Leitungen": füllt das Gitter vollständig mit Pfaden (jede Länge >= 3).
// Zellen sind Indizes y * n + x. Endpunkte der Pfade sind die Kugeln, daher ist jedes Level lösbar.

const nbrs = (c, n) => {
  const x = c % n, y = (c / n) | 0, r = [];
  if (x > 0) r.push(c - 1);
  if (x < n - 1) r.push(c + 1);
  if (y > 0) r.push(c - n);
  if (y < n - 1) r.push(c + n);
  return r;
};

// Zufälliger Hamiltonpfad: Schlangenlinie, dann viele "Backbite"-Umformungen (Ende an Nachbarn klappen).
export function hamiltonPath(n, rnd = Math.random) {
  let p = [];
  for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) p.push(y * n + (y % 2 ? n - 1 - i : i));
  const m = n * n, pos = new Int32Array(m);
  const reindex = () => p.forEach((c, i) => { pos[c] = i; });
  reindex();
  const iters = m * 40;
  for (let it = 0; it < iters; it++) {
    const head = rnd() < 0.5;
    const end = head ? p[m - 1] : p[0];
    const opts = nbrs(end, n).filter(q => Math.abs(pos[q] - pos[end]) > 1);
    if (!opts.length) continue;
    const q = opts[(rnd() * opts.length) | 0], k = pos[q];
    if (head) p = p.slice(0, k + 1).concat(p.slice(k + 1).reverse());
    else p = p.slice(0, k).reverse().concat(p.slice(k));
    reindex();
  }
  return p;
}

const bends = path => {
  let b = 0;
  for (let i = 1; i < path.length - 1; i++) if (path[i + 1] - path[i] !== path[i] - path[i - 1]) b++;
  return b;
};
const adjacent = (a, b, n) => nbrs(a, n).includes(b);

// Schlechte Pfade: 2x2-Schleife (4 Felder in einem Quadrat) oder gerade Linie über ein ganzes Gitter.
function badPath(path, n) {
  if (path.length === 4) {
    const xs = path.map(c => c % n), ys = path.map(c => (c / n) | 0);
    if (Math.max(...xs) - Math.min(...xs) === 1 && Math.max(...ys) - Math.min(...ys) === 1) return true;
  }
  return false;
}

function cut(ham, k, rnd) {
  const T = ham.length;
  const lens = new Array(k).fill(3), w = Array.from({ length: k }, () => 0.35 + rnd());
  const wsum = w.reduce((a, b) => a + b, 0);
  for (let r = T - 3 * k; r > 0; r--) {
    let x = rnd() * wsum, i = 0;
    while (i < k - 1 && (x -= w[i]) > 0) i++;
    lens[i]++;
  }
  const paths = []; let at = 0;
  for (const L of lens) { paths.push(ham.slice(at, at + L)); at += L; }
  return paths;
}

// Liefert { n, k, paths: [[Zellen]...] } - paths ist zugleich die Musterlösung.
export function generate(n, k, rnd = Math.random) {
  let best = null, bestScore = -Infinity;
  for (let h = 0; h < 4; h++) {
    const ham = hamiltonPath(n, rnd);
    for (let a = 0; a < 14; a++) {
      const paths = cut(ham, k, rnd);
      let score = 0, bad = false;
      for (const p of paths) {
        if (badPath(p, n)) { bad = true; break; }
        score += bends(p) * 2;
        if (p.length > 3 && adjacent(p[0], p[p.length - 1], n)) score -= 6; // Endpunkte direkt nebeneinander = zu leicht
      }
      if (bad) continue;
      if (score > bestScore) { bestScore = score; best = paths; }
    }
    if (best && h >= 1) break;
  }
  if (!best) best = cut(hamiltonPath(n, rnd), k, rnd);
  // Reihenfolge der Paare mischen
  for (let i = best.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [best[i], best[j]] = [best[j], best[i]]; }
  return { n, k, paths: best };
}

// Prüft die Musterlösung: deckt jedes Feld genau einmal ab, Nachbarschritte, Länge >= 3.
export function validate(level) {
  const { n, paths } = level, seen = new Set();
  for (const p of paths) {
    if (p.length < 3) return false;
    for (let i = 0; i < p.length; i++) {
      if (seen.has(p[i])) return false;
      seen.add(p[i]);
      if (i && !adjacent(p[i - 1], p[i], n)) return false;
    }
  }
  return seen.size === n * n;
}

export const LEVELS = [
  { n: 5, k: 4 }, { n: 5, k: 4 }, { n: 5, k: 5 },
  { n: 6, k: 5 }, { n: 6, k: 6 }, { n: 6, k: 6 },
  { n: 7, k: 6 }, { n: 7, k: 7 },
  { n: 8, k: 7 }, { n: 8, k: 8 },
];
