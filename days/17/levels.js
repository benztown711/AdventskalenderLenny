// Türchen 17 · Pixel-Hüpfer: Level als Text-Karten (Kachel = 16 Logik-Pixel, 20 Zeilen hoch).
// Legende:  #  Block      -  Wolke/Brett (von unten durchspringbar)   I  Eis (rutschig)
//           <  >  Förderband   C  Bröselkeks   m  Trampolin-Pilz   G  Tor (öffnet nach dem Endgegner)
//           X  Geheimwand (sieht fest aus, ist es aber nicht)   q/n  Münze/Nuss in einer Geheimwand
//           P  Start   o  Sterne-Münze   N  goldene Nuss   F  Fahne   T  Tannenbaum (Ziel)
//           h  Schnee-Igel   j  Hüpf-Eiswürfel   v  Eiszapfen   H/V  bewegte Plattform   K  Schneeball-König
const H = 20;
const R = n => '#'.repeat(n);
const G = R(16), G20 = R(20);

// Abschnitt: Zeilen von unten ausgerichtet (fehlende Zeilen oben bleiben leer)
function chunk(rows) {
  const w = Math.max(...rows.map(r => r.length));
  rows.forEach((r, i) => { if (r.length && r.length !== w) throw new Error(`Abschnitt-Zeile ${i}: ${r.length} statt ${w} Zeichen: "${r}"`); });
  if (rows.length > H) throw new Error('Abschnitt zu hoch');
  return [...Array(H - rows.length).fill(''), ...rows].map(r => r || ' '.repeat(w));
}
const build = (...chunks) => { const cs = chunks.map(chunk); return Array.from({ length: H }, (_, y) => cs.map(c => c[y]).join('')); };
const roof = (n, w = 16) => Array(n).fill(R(w));

// ---------- Level 1: Schneewald ----------
const L1 = build(
  ['     o  o  o    ', '', '', '  P o           ', G, G, G],
  ['         o      ', '        o o     ', '', '       ###      ', '       ###      ', G, G, G],
  ['     o  o       ', '', '', '            h   ', '####   #########', '####   #########', '####   #########'],
  ['          N     ', '', '        -----   ', '', '', '  -----         ', '', '             o  ', G, G, G],
  ['     o   o   o      ', '', '', '                F   ', '#####   ###   ######', '#####   ###   ######', '#####   ###   ######'],
  ['      o  o  o   ', '', '             h  ', '    ############', '    XXXXXq######', '    XXXXqqn#####', G, G, G],
  ['  o o o         ', '', '', '      h     h   ', G, G, G],
  ['          N         ', '', '', '   o           o    ', '     ---   ---      ', '', ' F                  ', '###              ###', '###              ###', '###              ###'],
  ['   o o o            ', '', '', '              T     ', G20, G20, G20],
);

// ---------- Level 2: Eishöhle ----------
const L2 = build(
  [...roof(4), '', '', '', '', '', '', '', '', '', '      o o o     ', '', '', '  P             ', G, G, G],
  [...roof(4), '', '', '', '', '', '', '', '', '', '        o o o   ', '', '', '             j  ', 'IIIIIIIIIIIIIIII', G, G],
  [...roof(9), '   v    v    v  ', '', '', '', '  o   o   o   o ', '', '', '', G, G, G],
  [...roof(5), '', '', '', '', '', '', '', '', '         o      ', '        IIII    ', '', '', 'III   IIIIIIIIII', '###   ##########', '###   ##########'],
  [...roof(4), '', '', '', '', '', '', '', '', '', '  o    o    o   ', '', '', ' F     j     j  ', 'IIIIIIIIIIIIIIII', G, G],
  [...roof(2), '', '', '', '', '', '       N        ', '      IIII      ', '', '', '   III    III   ', '', '', 'III          III', '', '', G, G, G],
  [...roof(8), '#########qnq####', '', '', '          o     ', '          o     ', '', '        IIIII   ', '', ' F              ', G, G, G],
  [...roof(9, 20), '  v   v   v   v     ', '', '', '          N         ', '   o           o    ', '', '', '', 'IIIIIIII   IIIIIIIII', '########   #########', '########   #########'],
  [...roof(4), '', '', '', '', '', '', '', '', '', '   o o o        ', '', '', '         T      ', G, G, G],
);

// ---------- Level 3: Wolken und Sprungfedern ----------
const L3 = build(
  ['      o o o     ', '', '', '  P             ', G, ' ############## ', '   ##########   '],
  ['   N            ', '         oooo   ', '', '      -------   ', '', '', '', '', '', '', '', '   m            ', '##########      ', ' ########       ', ''],
  ['  o o           ', '-----           ', '', '       H        ', '', '', '', '', '', '', '', '', ''],
  ['      o o o     ', '', '  F     j       ', '##############  ', ' ############   ', '', '', '', '', '', ''],
  [' N              ', '', '      o o       ', '     -----      ', '', '            o o ', '           -----', '', '', 'V               ', '', '', '', '', '', ''],
  ['        o o o   ', '', '', '', '            ----', '###             ', ' #              ', '', '', '       m        ', '      ###       ', '       #        ', '', '', ''],
  ['    XXXX        ', '    XnXX        ', '', '', ' F      o       ', '########   #####', ' ######     ### ', '', '', '', '', '', '', '', '', ''],
  ['      o o o     ', '', '', '          T     ', G, ' ############## ', '   ##########   '],
);

// ---------- Level 4: Lebkuchen-Fabrik ----------
const L4 = build(
  ['     o o o      ', '', '', '  P             ', G, G, G],
  ['   o  o  o  o   ', '', '', '', '##>>>>>>>>>>>>##', G, G],
  ['       o        ', '', '       ##       ', '       ##     h ', '<<<<<<<<<<<<<<<<', G, G],
  ['        N       ', '     o    o     ', '', '     CC  CC     ', '', '###          ###', '###          ###', '###          ###'],
  ['          ooo   ', '', '', '        >>>>>>  ', '', '  F         j   ', G, G, G],
  ['           o o  ', '', '          ######', '          ######', '      --- ######', '          XXn###', '          XXq###', G, G, G],
  ['           N    ', '', '        CCC     ', '', '', '    CCC         ', '              h ', '###       ######', '###       ######', '###       ######'],
  ['    o      o    ', '', '', '   <<<<   >>>>  ', '', '##            ##', '##            ##', '##            ##'],
  ['   o o o        ', '', '', '          T     ', G, G, G],
);

// ---------- Level 5: Burg des Schneeball-Königs ----------
const wall = '##            ##';
const L5 = build(
  ['     o o o      ', '', '', '  P             ', G, G, G],
  ['           oo   ', '             h  ', '          ######', '       #########', '    ############', '    ############', G, G, G],
  ['        N       ', '     o  o  o    ', '', '', '## H          ##', wall, wall, wall, wall, wall, wall],
  ['  F             ', '#####CCCCCC#####', '#####      #####', '#####      #####', '#####      #####', '#####      #####', '#####      #####', '#####      #####'],
  [...roof(8), ' v    v    v    ', '', '', '', '', '      N         ', '   o       o    ', '', '', G, G, G],
  [...roof(8), '    v           ', '', '', '', '', '          o     ', '      #####     ', '      ##nXX     ', '      ##qXX     ', G, G, G],
  ['    o o o       ', '', '', '  F       j     ', G, G, G],
  [...Array(12).fill('                   #'), '                   G', '                   G', '##                 G', '##                 G', '##          K      G', G20, G20, G20],
  ['   o o o        ', '', '', '      T         ', G, G, G],
);

export const LEVELS = [
  { name: 'Schneewald', map: L1, theme: 'wald', hint: 'Spring auf die Igel!' },
  { name: 'Eishöhle', map: L2, theme: 'eis', hint: 'Achtung, glatt! Eiszapfen fallen.' },
  { name: 'Wolkenland', map: L3, theme: 'wolken', hint: 'Pilze sind Trampoline!' },
  { name: 'Lebkuchen-Fabrik', map: L4, theme: 'fabrik', hint: 'Kekse bröseln weg!' },
  { name: 'Königsburg', map: L5, theme: 'burg', hint: '3x auf die Krone hüpfen!' },
];
