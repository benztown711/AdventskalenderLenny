// Prüft die Knobel-Rätsel: node tools/raetsel-test.mjs [--zeigen]
// Erzeugt viele Rätsel je Fach und Stufe und prüft Lösung, Texte und Satz-Liste.
import { makeRiddle, SATZ_LISTE } from '../js/core/raetsel.js';

let fail = 0;
const bad = (msg, r) => { fail++; if (fail < 30) console.log('FEHLER:', msg, r ? JSON.stringify({ kind: r.kind, q: r.q, a: r.a }).slice(0, 300) : ''); };

// Satz-Liste: Großschreibung muss zu den Wortarten passen
SATZ_LISTE.forEach((toks, si) => {
  toks.forEach((t, i) => {
    const up = /^[A-ZÄÖÜ]/.test(t.w);
    if (i === 0 && !up) bad(`Satz ${si}: erstes Wort klein (${t.w})`);
    if (i > 0 && t.t === 'N' && !up) bad(`Satz ${si}: Nomen klein (${t.w})`);
    if (i > 0 && t.t !== 'N' && up) bad(`Satz ${si}: Nicht-Nomen groß (${t.w})`);
  });
  for (const ty of 'NVA') if (!toks.some(t => t.t === ty) && ty !== 'A') bad(`Satz ${si}: kein ${ty}`);
});

const counts = {};
for (const cat of ['mathe', 'deutsch', 'wissen', 'mix']) {
  for (const lvl of [1, 2, 3]) {
    const answers = [];
    for (let i = 0; i < 4000; i++) {
      const r = makeRiddle({ cat, lvl, day: 1 + (i % 24) });
      if (!Number.isInteger(r.a) || r.a < 1 || r.a > 9999) bad(`Lösung ungültig (${r.a})`, r);
      const txt = [r.q, r.vis, r.sol, ...r.tips].join(' ');
      if (/undefined|NaN|null|\[object/.test(txt)) bad('Text kaputt', r);
      if (r.tips.length < 2 || r.tips.some(t => !t)) bad('Tipps fehlen', r);
      if (!r.sol.includes(String(r.a))) bad('Lösungsweg nennt die Lösung nicht', r);
      if (r.tips.some(t => new RegExp(`(^|[^0-9])${r.a}([^0-9]|$)`).test(t.replace(/<[^>]+>/g, '')) && r.a > 12 && !/Kästchen|ABC|r-abc/.test(t))) counts.leak = (counts.leak || 0) + 1;
      answers.push(r.a);
      const k = `${cat}/${lvl}/${r.kind}`; counts[k] = (counts[k] || 0) + 1;
    }
    answers.sort((a, b) => a - b);
    console.log(`${cat.padEnd(8)} Stufe ${lvl}: Lösungen ${answers[0]} bis ${answers[answers.length - 1]}, Median ${answers[answers.length >> 1]}`);
  }
}
if (process.argv.includes('--zeigen')) {
  for (const cat of ['mathe', 'deutsch', 'wissen']) for (const lvl of [1, 2, 3]) for (let i = 0; i < 4; i++) {
    const r = makeRiddle({ cat, lvl, day: 7 });
    const strip = s => s.replace(/<br>/g, ' / ').replace(/<\/div><div>/g, ' | ').replace(/<[^>]+>/g, '');
    console.log(`\n[${cat} ${lvl} ${r.kind}] ${strip(r.q)}\n   ${strip(r.vis)}\n   → ${r.a}   Tipps: ${r.tips.map(strip).join(' || ')}\n   Lösung: ${strip(r.sol)}`);
  }
}
console.log('Tipps, die die Lösung schon nennen:', counts.leak || 0);
console.log(fail ? `${fail} Fehler` : 'Alle Rätsel ok');
process.exit(fail ? 1 : 0);
