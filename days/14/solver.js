// Türchen 14: Level-Parser und Breitensuche (Zug = ein Block beliebig weit schieben).
export const N = 6;
export const ROW = 2; // Zeile des Schlittens

export function parse(str) {
  return str.split(' ').map(s => {
    const [x, y, len, d] = s.split(',');
    const h = d === 'h';
    return { x: +x, y: +y, len: +len, h, p: h ? +x : +y };
  });
}

// Belegung als flaches Feld (-1 = frei)
export function grid(vs, pos) {
  const g = new Int8Array(N * N).fill(-1);
  vs.forEach((v, i) => {
    for (let k = 0; k < v.len; k++) {
      const x = v.h ? pos[i] + k : v.x, y = v.h ? v.y : pos[i] + k;
      g[y * N + x] = i;
    }
  });
  return g;
}

// Ist die Bahn vom Schlitten nach rechts frei?
export function pathClear(vs, pos) {
  const g = grid(vs, pos);
  for (let x = pos[0] + vs[0].len; x < N; x++) if (g[ROW * N + x] !== -1) return false;
  return true;
}

// Wie weit darf Block i von seiner Position aus nach hinten (lo) und vorn (hi)?
export function range(vs, pos, i, g = grid(vs, pos)) {
  const v = vs[i];
  const at = q => (v.h ? g[v.y * N + q] : g[q * N + v.x]);
  let lo = pos[i], hi = pos[i];
  while (lo > 0 && at(lo - 1) === -1) lo--;
  while (hi + v.len < N && at(hi + v.len) === -1) hi++;
  return { lo, hi };
}

// Kürzeste Lösung ab Stellung pos. Gibt { n, first: {i, to} } zurück (n = Mindestzüge) oder null.
export function solve(vs, pos0, cap = 600000) {
  const n = vs.length;
  const pw = [1]; for (let i = 1; i < n; i++) pw.push(pw[i - 1] * 8);
  const enc = a => { let k = 0; for (let i = 0; i < n; i++) k += a[i] * pw[i]; return k; };
  const dec = k => { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = Math.floor(k / pw[i]) % 8; return a; };
  const k0 = enc(pos0);
  if (pathClear(vs, pos0)) return { n: 0, first: null };
  const parent = new Map([[k0, -1]]), how = new Map();
  let frontier = [k0], depth = 0;
  while (frontier.length && parent.size < cap) {
    depth++;
    const next = [];
    for (const k of frontier) {
      const a = dec(k), g = grid(vs, a);
      for (let i = 0; i < n; i++) {
        const { lo, hi } = range(vs, a, i, g);
        for (let p = lo; p <= hi; p++) {
          if (p === a[i]) continue;
          const nk = k + (p - a[i]) * pw[i];
          if (parent.has(nk)) continue;
          parent.set(nk, k); how.set(nk, i * 8 + p);
          const b = a.slice(); b[i] = p;
          if (pathClear(vs, b)) {
            // Weg zurück zum ersten Zug
            let cur = nk, mv = how.get(cur);
            while (parent.get(cur) !== k0) { cur = parent.get(cur); mv = how.get(cur); }
            return { n: depth, first: { i: Math.floor(mv / 8), to: mv % 8 } };
          }
          next.push(nk);
        }
      }
    }
    frontier = next;
  }
  return null;
}
