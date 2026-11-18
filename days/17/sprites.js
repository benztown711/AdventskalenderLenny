// Türchen 17 · Pixel-Hüpfer: selbst gezeichnete Pixel-Sprites (Zeichen-Arrays) und Pixel-Schrift.
export const PAL = {
  R: '#ef476f', r: '#b02e55', W: '#ffffff', w: '#cfe3f5', S: '#ffd2ad', s: '#e9a27e', P: '#ff8fab',
  G: '#06d6a0', g: '#03926c', B: '#8a5530', b: '#4b2c19', Y: '#ffd166', y: '#c7902a', Z: '#fff4c9',
  I: '#8ecae6', i: '#4a92ba', J: '#e2f6ff', V: '#c77dff', v: '#8a4fc0', N: '#141020', D: '#2a2f4a',
  E: '#5b6280', L: '#a7b0cf', O: '#ff9f43', K: '#1a1030',
};

// Wichtel (schaut nach rechts) mit Zipfelmütze. Umriss wird automatisch ergänzt.
const FACE = [
  '....WWWWWWWWW...',
  '....SSSSSSNSS...',
  '....SPSSSSSSSS..',
  '.....SSSSSSS....',
];
const HAT_A = [
  '.WW.............',
  'WZWR............',
  '.WWRRR..........',
  '....RRRRR.......',
  '.....RRRRRR.....',
  '....RRRRRRRR....',
];
const HAT_B = [
  '................',
  '.WW.............',
  'WZWRR...........',
  '.WW.RRRRR.......',
  '.....RRRRRR.....',
  '....RRRRRRRR....',
];
export const HERO = {
  idle: [...HAT_A, ...FACE,
    '....GGGGGGGG....',
    '...SGGGGGGGGS...',
    '....BBBBYBBB....',
    '....GGGGGGGG....',
    '.....GG..GG.....',
    '.....bb..bbb....'],
  runA: [...HAT_B, ...FACE,
    '....GGGGGGGGS...',
    '...SGGGGGGGG....',
    '....BBBBYBBB....',
    '....GGGGGGGG....',
    '...GG.....GG....',
    '..bb.......bbb..'],
  runB: [...HAT_A, ...FACE,
    '....GGGGGGGG....',
    '....SGGGGGGGS...',
    '....BBBBYBBB....',
    '....GGGGGGGG....',
    '......GGGG......',
    '......bbbbb.....'],
  runC: [...HAT_B, ...FACE,
    '...SGGGGGGGG....',
    '....GGGGGGGGS...',
    '....BBBBYBBB....',
    '....GGGGGGGG....',
    '....GG...GG.....',
    '...bbb....bb....'],
  jump: [...HAT_B, ...FACE.slice(0, 3),
    '...S.SSSSSS.S...',
    '...SGGGGGGGGS...',
    '....GGGGGGGG....',
    '....BBBBYBBB....',
    '....GGGGGGGG....',
    '...bb.....bb....',
    '................'],
};

export const HOG = [ // schaut nach links
  [
    '......w.w.w.....',
    '....w.wWwWw.w...',
    '...wWWWWWWWWw...',
    '..wWWWWWWWWWWw..',
    '.SSNSWWWWWWWWWw.',
    'SSSSSWWWWWWWWWW.',
    'NSSSSSWWWWWWWWw.',
    '.SSSSSWWWWWWWW..',
    '..sssWWWWWWWWw..',
    '...bb......bb...',
  ],
  [
    '.....w.w.w......',
    '...w.wWwWw.w....',
    '...wWWWWWWWWw...',
    '..wWWWWWWWWWWw..',
    '.SSNSWWWWWWWWWw.',
    'SSSSSWWWWWWWWWW.',
    'NSSSSSWWWWWWWWw.',
    '.SSSSSWWWWWWWW..',
    '..sssWWWWWWWWw..',
    '....bb....bb....',
  ],
];

export const COIN = [
  '...YYYY...',
  '.YYYYYYYY.',
  '.YYYYZYYY.',
  'YYYYZZYYYy',
  'YZZZZZZZYy',
  'YYZZZZZYYy',
  'YYZZYZZYYy',
  '.YZYYYZYy.',
  '.YyyyyyyY.',
  '...yyyy...',
];
export const NUT = [
  '......bb......',
  '.....bBb......',
  '....YYYYYY....',
  '...YYZYYYYY...',
  '..YZZYYYyYYY..',
  '..YZYYYYyYYYy.',
  '.YYYYYYyYYYYy.',
  '.YYYyyyYYYYYy.',
  '.YYYYYYYYyYYy.',
  '..YYYYYYyYYy..',
  '..yYYYyYYYyy..',
  '...yyYYYYyy...',
  '.....yyyy.....',
];
export const HEART = [
  '.RR...RR.',
  'RZRR.RRRR',
  'RZRRRRRRR',
  'RRRRRRRRR',
  '.RRRRRRr.',
  '..RRRRr..',
  '...RRr...',
  '....r....',
];
export const MUSH = [
  '................',
  '................',
  '.....RRRRRR.....',
  '...RRWWRRRRRR...',
  '..RRWWWRRRWWRR..',
  '.RRRRWRRRRWWWRR.',
  '.RRRRRRRRRRWRRR.',
  'RRWWRRRRRRRRRRRR',
  'RWWWWRRRRRRWWRRR',
  '.rrrrrrrrrrrrrr.',
  '.....WWWWWW.....',
  '.....WNWWNW.....',
  '.....WWPPWW.....',
  '.....wWWWWw.....',
  '.....wwwwww.....',
  '.....wwwwww.....',
];
export const CROWN = [
  'Y...Y...Y',
  'YY.YYY.YY',
  'YYYYRYYYY',
  'YYYYYYYYY',
  'yyyyyyyyy',
];

// Sprite aus Zeichen-Array bauen (mit dunklem Umriss, 1px Rand rundum)
export function makeSprite(rows, pal = PAL, outline = '#1a1030', flip = false) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas'); c.width = w + 2; c.height = h + 2;
  const g = c.getContext('2d');
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && rows[y][flip ? w - 1 - x : x] && rows[y][flip ? w - 1 - x : x] !== '.';
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    if (on(x, y)) { g.fillStyle = pal[rows[y][flip ? w - 1 - x : x]] || '#f0f'; g.fillRect(x + 1, y + 1, 1, 1); }
    else if (outline && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) { g.fillStyle = outline; g.fillRect(x + 1, y + 1, 1, 1); }
  }
  return c;
}

// ---------- Pixel-Schrift 5x7 ----------
const GLYPHS = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  'Ä': '01010 00000 01110 10001 11111 10001 10001', 'Ö': '01010 00000 01110 10001 10001 10001 01110',
  'Ü': '01010 00000 10001 10001 10001 10001 01110',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111', 3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100',
  '.': '00000 00000 00000 00000 00000 01100 01100', ',': '00000 00000 00000 00000 01100 00100 01000',
  '!': '00100 00100 00100 00100 00100 00000 00100', '?': '01110 10001 00001 00010 00100 00000 00100',
  ':': '00000 01100 01100 00000 01100 01100 00000', '-': '00000 00000 00000 11111 00000 00000 00000',
  '+': '00000 00100 00100 11111 00100 00100 00000', '/': '00001 00010 00010 00100 01000 01000 10000',
  '×': '00000 10001 01010 00100 01010 10001 00000', "'": '00100 00100 01000 00000 00000 00000 00000',
  '(': '00010 00100 01000 01000 01000 00100 00010', ')': '01000 00100 00010 00010 00010 00100 01000',
  '*': '00100 00100 11111 01110 01010 10001 00000', '♥': '00000 01010 11111 11111 01110 00100 00000',
  '>': '01000 01100 01110 01111 01110 01100 01000', '<': '00010 00110 01110 11110 01110 00110 00010',
  '·': '00000 00000 00000 00100 00000 00000 00000', '=': '00000 00000 11111 00000 11111 00000 00000',
};
const GL = {};
for (const k in GLYPHS) GL[k] = GLYPHS[k].split(' ');

export function textWidth(str, s = 1) { return [...String(str).toUpperCase()].length * 6 * s - s; }
// Pixel-Text zeichnen. opts: {s: Skalierung, c: Farbe, al: 'left'|'center'|'right', sh: Schattenfarbe}
export function drawText(g, str, x, y, { s = 1, c = '#fff', al = 'left', sh = 'rgba(10,8,30,.85)' } = {}) {
  const chars = [...String(str).toUpperCase().replace(/ß/g, 'SS')];
  const wd = chars.length * 6 * s - s;
  let x0 = Math.round(al === 'center' ? x - wd / 2 : al === 'right' ? x - wd : x);
  y = Math.round(y);
  const pass = (col, ox, oy) => {
    g.fillStyle = col;
    chars.forEach((ch, i) => {
      const gl = GL[ch]; if (!gl) return;
      for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) if (gl[r][q] === '1') g.fillRect(x0 + i * 6 * s + q * s + ox, y + r * s + oy, s, s);
    });
  };
  if (sh) pass(sh, Math.max(1, s / 2 | 0), Math.max(1, s / 2 | 0));
  pass(c, 0, 0);
  return wd;
}
