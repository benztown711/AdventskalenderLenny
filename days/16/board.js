// Türchen 16: Brett-Logik (Krabben verteilen, Zahlen zählen, Lösbarkeit prüfen)
export const LEVELS = [
  { c: 7, r: 9, crabs: 8, chests: 3, par: 150 },
  { c: 8, r: 10, crabs: 13, chests: 4, par: 220 },
  { c: 9, r: 12, crabs: 20, chests: 5, par: 330 },
];

export function buildNb(c, r) {
  const nb = [];
  for (let i = 0; i < c * r; i++) {
    const x = i % c, y = (i / c) | 0, l = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < c && ny < r) l.push(ny * c + nx);
    }
    nb.push(l);
  }
  return nb;
}

// Löst das Brett nur mit Logik (ohne Raten). Gibt die Zahl der nicht lösbaren sicheren Felder zurück.
function solve(c, r, nb, crab, n, crabsN, start) {
  const N = c * r, st = new Uint8Array(N); // 0 verdeckt, 1 offen, 2 Krabbe erkannt
  let open = 0, mines = 0;
  const safeTotal = N - crabsN;
  const reveal = i0 => {
    const stack = [i0];
    while (stack.length) {
      const i = stack.pop();
      if (st[i] !== 0) continue;
      st[i] = 1; open++;
      if (n[i] === 0) for (const j of nb[i]) if (st[j] === 0) stack.push(j);
    }
  };
  const mark = i => { if (st[i] === 0) { st[i] = 2; mines++; } };
  reveal(start);
  let changed = true;
  while (changed && open < safeTotal) {
    changed = false;
    const cons = [];
    for (let i = 0; i < N; i++) {
      if (st[i] !== 1 || n[i] === 0) continue;
      const U = []; let m = 0;
      for (const j of nb[i]) { if (st[j] === 0) U.push(j); else if (st[j] === 2) m++; }
      if (!U.length) continue;
      const rem = n[i] - m;
      if (rem === 0) { U.forEach(reveal); changed = true; }
      else if (rem === U.length) { U.forEach(mark); changed = true; }
      else cons.push({ i, U, rem });
    }
    if (changed) continue;
    outer: for (const a of cons) for (const b of cons) {
      if (a === b || a.U.length >= b.U.length) continue;
      if (Math.abs((a.i % c) - (b.i % c)) > 2 || Math.abs(((a.i / c) | 0) - ((b.i / c) | 0)) > 2) continue;
      if (!a.U.every(x => b.U.includes(x))) continue;
      const diff = b.U.filter(x => !a.U.includes(x)), rd = b.rem - a.rem;
      if (rd === 0) { diff.forEach(reveal); changed = true; break outer; }
      if (rd === diff.length) { diff.forEach(mark); changed = true; break outer; }
    }
    if (changed) continue;
    // Endspiel: Restzählung
    const left = crabsN - mines;
    const hidden = [];
    for (let i = 0; i < N; i++) if (st[i] === 0) hidden.push(i);
    if (hidden.length && left === 0) { hidden.forEach(reveal); changed = true; }
    else if (hidden.length && hidden.length === left) { hidden.forEach(mark); changed = true; }
  }
  return safeTotal - open;
}

// Erzeugt ein Brett. start = erstes Grabfeld (samt Nachbarn garantiert krabbenfrei).
// Versucht, ein ohne Raten lösbares Brett zu finden (Zeitbudget), sonst das beste.
export function generate(c, r, crabsN, chestsN, start, budgetMs = 180) {
  const N = c * r, nb = buildNb(c, r);
  const safe = new Set([start, ...nb[start]]);
  const cand = [];
  for (let i = 0; i < N; i++) if (!safe.has(i)) cand.push(i);
  let best = null, bestStuck = Infinity, tries = 0;
  const t0 = performance.now();
  while (true) {
    tries++;
    const pool = cand.slice(), crab = new Uint8Array(N);
    for (let k = 0; k < crabsN; k++) {
      const j = k + ((Math.random() * (pool.length - k)) | 0);
      [pool[k], pool[j]] = [pool[j], pool[k]];
      crab[pool[k]] = 1;
    }
    const n = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (!crab[i]) { let s = 0; for (const j of nb[i]) s += crab[j]; n[i] = s; }
    const stuck = solve(c, r, nb, crab, n, crabsN, start);
    if (stuck < bestStuck) { bestStuck = stuck; best = { crab, n }; }
    if (stuck === 0) break;
    if (performance.now() - t0 > budgetMs) break;
  }
  // Truhen auf krabbenfreie Felder (nicht im Startbereich); eine enthält das Fernrohr
  const free = cand.filter(i => !best.crab[i]);
  for (let k = free.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; [free[k], free[j]] = [free[j], free[k]]; }
  const chest = new Uint8Array(N);
  free.slice(0, chestsN).forEach((i, k) => { chest[i] = k === 0 ? 2 : 1; }); // 2 = mit Fernrohr
  return { crab: best.crab, n: best.n, chest, nb, stuck: bestStuck, tries };
}
