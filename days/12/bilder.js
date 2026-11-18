// Pixel-Geheimnis: die Bilder. '.' = leer (Hintergrund), jeder andere Buchstabe = gefülltes Feld in dieser Farbe.
export const PAL = {
  R: '#ef476f', P: '#ffb3c6', Y: '#ffd166', G: '#1f9d55', L: '#4cc47a', B: '#8d5a3b',
  W: '#f4f8ff', K: '#222b4f', N: '#c98b5b', S: '#f2c39b', O: '#ff8c42', E: '#8ecae6', V: '#c77dff', D: '#b5173a',
};

export const PICS = [
  { name: 'Ein Herz!', art: [
    'PR.RR',
    'RRRRR',
    'RRRRR',
    '.RRR.',
    '..R..',
  ] },
  { name: 'Ein Stern!', art: [
    '..Y..',
    'YYYYY',
    '.YYY.',
    '.Y.Y.',
    'Y...Y',
  ] },
  { name: 'Ein Tannenbaum!', art: [
    '...YY...',
    '...GG...',
    '..GRGG..',
    '..GGGE..',
    '.GEGGRG.',
    'GGGYGGGG',
    '...BB...',
    '...BB...',
  ] },
  { name: 'Ein Schneemann!', art: [
    '...KK...',
    '..KKKK..',
    '.WWWWWW.',
    '..RRRR..',
    'BWWWWWWB',
    '.WWWWWW.',
    'WWWWWWWW',
    '.WWWWWW.',
  ] },
  { name: 'Ein Rentier!', art: [
    'B.B....B.B',
    'BBB....BBB',
    '.BBBBBBBB.',
    '..NNNNNN..',
    '.NNNNNNNN.',
    '.NN.NN.NN.',
    '.NNNNNNNN.',
    '..NNNNNN..',
    '...NNNN...',
    '....RR....',
  ] },
  { name: 'Ein Pirat!', art: [
    '..KKKKKK..',
    '.KKKWWKKK.',
    'KKKKKKKKKK',
    '.RRRRRRRR.',
    '.SKKSS.SS.',
    '.SSSSSSSS.',
    '.SSSSSSSS.',
    '..SSWWSS..',
    '..SSSSSS..',
    '...SSSS...',
  ] },
];

// Mini-Beispiel für die Anleitung (4x4)
export const TUT = { name: 'Mini-Bild', art: ['YYYY', '.YY.', '.YY.', 'Y..Y'] };

export const maskOf = art => art.map(r => [...r].map(c => c !== '.'));
const runs = line => { const out = []; let k = 0; for (const v of line) { if (v) k++; else if (k) { out.push(k); k = 0; } } if (k) out.push(k); return out.length ? out : [0]; };
export function cluesOf(art) {
  const m = maskOf(art), h = m.length, w = m[0].length;
  return {
    rows: m.map(r => runs(r)),
    cols: Array.from({ length: w }, (_, x) => runs(m.map(r => r[x]))),
  };
}

// Zeilen-Löser: löst nur mit Logik pro Zeile/Spalte. Gibt Raster mit 0 unbekannt, 1 gefüllt, 2 leer zurück.
export function solveLines(clues, w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill(0));
  const fit = (line, clue) => {
    const n = line.length; let any = null;
    const cur = Array(n).fill(2);
    const rec = (i, ci) => {
      if (ci === clue.length) {
        for (let j = i; j < n; j++) if (line[j] === 1) return;
        for (let j = i; j < n; j++) cur[j] = 2;
        if (!any) any = cur.slice(); else for (let j = 0; j < n; j++) if (any[j] !== cur[j]) any[j] = 0;
        return;
      }
      const len = clue[ci];
      for (let s = i; s + len <= n; s++) {
        let ok = true;
        for (let j = i; j < s; j++) if (line[j] === 1) { ok = false; break; }
        if (!ok) break; // eine Füllung läge vor dem Start: kein späterer Start möglich
        for (let j = s; j < s + len; j++) if (line[j] === 2) { ok = false; break; }
        if (!ok) continue;
        if (s + len < n && line[s + len] === 1) continue;
        for (let j = i; j < s; j++) cur[j] = 2;
        for (let j = s; j < s + len; j++) cur[j] = 1;
        if (s + len < n) cur[s + len] = 2;
        rec(Math.min(n, s + len + 1), ci + 1);
      }
    };
    const c = clue.length === 1 && clue[0] === 0 ? [] : clue;
    clue = c; rec(0, 0);
    return any;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < h; y++) {
      const res = fit(g[y], clues.rows[y]); if (!res) return null;
      res.forEach((v, x) => { if (v && g[y][x] !== v) { g[y][x] = v; changed = true; } });
    }
    for (let x = 0; x < w; x++) {
      const res = fit(g.map(r => r[x]), clues.cols[x]); if (!res) return null;
      res.forEach((v, y) => { if (v && g[y][x] !== v) { g[y][x] = v; changed = true; } });
    }
  }
  return g;
}
