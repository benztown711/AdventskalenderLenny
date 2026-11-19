// Türöffner "Nebel-Schatzkarte": Hinweis lesen, das Feld im Nebel finden, Türchen aufdecken.
// Vertrag: openspec/specs/tueroeffner.md
export const meta = { id: 'karte', title: 'Nebel-Schatzkarte', emoji: '🗺️' };

const COLS = 'ABCDEF', N = 6;
const S = 48, O = 24;           // Feldgröße und Rand im SVG (viewBox 360 x 360)
const OPEN_MS = 850;            // Öffnungs-Animation, max. 0,9 s

// ---------- Feste Tabellen ----------
// Wahrzeichen (immer sichtbar). t = Zeichen-Typ.
export const LANDMARKS = [
  { name: 'Leuchtturm', c: 2, r: 2, t: 'L' },   // C3
  { name: 'Iglu', c: 1, r: 0, t: 'i' },         // B1
  { name: 'Berg', c: 4, r: 0, t: 'm' },         // E1
  { name: 'See', c: 0, r: 4, t: 'l' },          // A5
  { name: 'Dorf', c: 4, r: 4, t: 'v' },         // E5
  { name: 'Wald', c: 5, r: 2, t: 'f' },         // F3
];
// Feld von Türchen 1 bis 24 (Index = Tag - 1): ein Weg durch den Dezember, kein Feld doppelt, kein Wahrzeichen.
const DOOR_TABLE = [
  [0, 0], [0, 1], [1, 1], [2, 1], [2, 0], [3, 0],       // 1-6
  [3, 1], [4, 1], [5, 0], [5, 1], [4, 2], [3, 2],       // 7-12
  [3, 3], [4, 3], [5, 3], [5, 4], [5, 5], [4, 5],       // 13-18
  [3, 5], [3, 4], [2, 4], [2, 3], [1, 3], [1, 4],       // 19-24
];
export const DOORS = DOOR_TABLE.map(([c, r]) => ({ c, r }));
export const doorField = d => DOORS[d - 1];
export const cellName = (c, r) => COLS[c] + (r + 1);

// ---------- Hinweis-Generator (reine Funktion) ----------
const DIRS = { Norden: [0, -1], Nordosten: [1, -1], Osten: [1, 0], Südosten: [1, 1], Süden: [0, 1], Südwesten: [-1, 1], Westen: [-1, 0], Nordwesten: [-1, -1] };
const ARROW = { Norden: '↑', Osten: '→', Süden: '↓', Westen: '←' };
const sign = Math.sign;
const dirOf = (dx, dy) => Object.keys(DIRS).find(k => DIRS[k][0] === sign(dx) && DIRS[k][1] === sign(dy));
const fields = n => n + (n === 1 ? ' Feld' : ' Felder');
const manhattan = (p, q) => Math.abs(p.c - q.c) + Math.abs(p.r - q.r);
const inMap = p => p.c >= 0 && p.c < N && p.r >= 0 && p.r < N;
const both = (p, t) => p.c !== t.c && p.r !== t.r;

function hash(a, b) {
  let x = Math.imul(a * 1000 + b + 12345, 2654435761);
  x ^= x >>> 15; x = Math.imul(x, 2246822519); x ^= x >>> 13;
  return x >>> 0;
}
const pick = (list, day, salt) => list[hash(day, salt) % list.length];
const preferBoth = (list, t) => { const b = list.filter(p => both(p, t)); return b.length ? b : list; };

function legsOrtho(from, to, vertFirst) {
  const dx = to.c - from.c, dy = to.r - from.r;
  const h = dx ? { dir: dx > 0 ? 'Osten' : 'Westen', n: Math.abs(dx) } : null;
  const v = dy ? { dir: dy > 0 ? 'Süden' : 'Norden', n: Math.abs(dy) } : null;
  return (vertFirst ? [v, h] : [h, v]).filter(Boolean);
}
function legsDiag(from, to) {
  const dx = to.c - from.c, dy = to.r - from.r, d = Math.min(Math.abs(dx), Math.abs(dy)), legs = [];
  if (d) legs.push({ dir: dirOf(dx, dy), n: d });
  const rx = dx - sign(dx) * d, ry = dy - sign(dy) * d;
  if (rx) legs.push({ dir: rx > 0 ? 'Osten' : 'Westen', n: Math.abs(rx) });
  if (ry) legs.push({ dir: ry > 0 ? 'Süden' : 'Norden', n: Math.abs(ry) });
  return legs;
}
function routeOf(from, legs) {
  const pts = [{ c: from.c, r: from.r }]; let p = from;
  for (const l of legs) { p = { c: p.c + DIRS[l.dir][0] * l.n, r: p.r + DIRS[l.dir][1] * l.n }; pts.push(p); }
  return pts;
}
const legsText = (legs, sep) => legs.map(l => `${fields(l.n)} nach ${l.dir}`).join(sep);

function colExpr(c, day, salt) {
  const L = COLS, opts = [
    () => c >= 1 && `der Buchstabe nach ${L[c - 1]}`,
    () => c <= 4 && `der Buchstabe vor ${L[c + 1]}`,
    () => `der ${c + 1}. Buchstabe im Alphabet`,
    () => c >= 1 && c <= 4 && `der Buchstabe zwischen ${L[c - 1]} und ${L[c + 1]}`,
  ];
  const s = hash(day, salt) % 4;
  for (let i = 0; i < 4; i++) { const t = opts[(s + i) % 4](); if (t) return t; }
}
function rowExpr(r, day, salt) {
  const n = r + 1, h = hash(day, salt + 50);
  const opts = [
    () => { if (n < 2) return false; const a = 1 + h % (n - 1); return `${a} + ${n - a}`; },
    () => { const b = 1 + h % 4; return `${n + b} − ${b}`; },
    () => { const f = []; for (let a = 1; a <= n; a++) if (n % a === 0) f.push(a); const a = f[h % f.length]; return `${a} × ${n / a}`; },
    () => `die Hälfte von ${2 * n}`,
  ];
  const s = h % 4;
  for (let i = 0; i < 4; i++) { const t = opts[(s + i) % 4](); if (t) return t; }
}

// makeClue(day, week, played) -> { text, target:{c,r}, start:{c,r}|null, route:[{c,r}...] }
// start: Startpunkt für den Ring auf der Karte (null bei Koordinaten-Rätseln), route: Pfeil-Pfad für den Tipp.
export function makeClue(day, week, played) {
  const target = DOORS[day - 1];
  const pl = [...new Set((played || []).filter(n => Number.isInteger(n) && n >= 1 && n <= 24 && n !== day))].sort((a, b) => a - b);
  const nearest = LANDMARKS.reduce((b, l) => (manhattan(l, target) < manhattan(b, target) ? l : b));
  const arrows = l => ARROW[l.dir].repeat(l.n);
  const done = (text, start, legs, from = start) => ({ text, target: { ...target }, start: start && { c: start.c, r: start.r }, route: routeOf(from, legs) });

  if (week <= 1) {
    const legs = legsOrtho(nearest, target, false);
    const parts = legs.map((l, i) => `${i ? l.n : fields(l.n)} nach ${l.dir} ${arrows(l)}`).join(' und ');
    return done(`Start: ${nearest.name} (${cellName(nearest.c, nearest.r)}). Geh ${parts}.`, nearest, legs);
  }
  if (week === 2) {
    const cand = LANDMARKS.filter(l => manhattan(l, target) <= 6);
    const lm = pick(preferBoth(cand, target), day, 2);
    const legs = legsOrtho(lm, target, hash(day, 3) % 2 === 1);
    return done(`Start: ${lm.name}. Geh ${legsText(legs, ', dann ')}.`, lm, legs);
  }
  if (week === 3) {
    if (pl.length) {
      const k = pick(preferBoth(pl.map(n => ({ n, ...DOORS[n - 1] })), target), day, 4);
      const legs = legsDiag(k, target);
      return done(`Von Türchen ${k.n} aus: ${legsText(legs, ', dann ')}.`, k, legs);
    }
    const lm = pick(preferBoth(LANDMARKS, target), day, 5);
    const legs = legsDiag(lm, target);
    return done(`Start: ${lm.name}. Geh ${legsText(legs, ', dann ')}.`, lm, legs);
  }
  // Woche 4: Koordinaten-Rätsel
  if (hash(day, 6) % 2 === 0) {
    return done(`Spalte: ${colExpr(target.c, day, 7)}. Zeile: ${rowExpr(target.r, day, 8)}.`, null, legsOrtho(nearest, target, false), nearest);
  }
  const cand = [];
  for (const dir of Object.keys(DIRS)) for (let k = 1; k <= 3; k++) {
    const w = { c: target.c - DIRS[dir][0] * k, r: target.r - DIRS[dir][1] * k };
    if (inMap(w)) cand.push({ dir, k, w });
  }
  const e = pick(cand, day, 9), legs = [{ dir: e.dir, n: e.k }];
  return done(`Etappe 1: Spalte: ${colExpr(e.w.c, day, 10)}. Zeile: ${rowExpr(e.w.r, day, 11)}. Etappe 2: Geh von dort ${legsText(legs, '')}.`, null, legs, e.w);
}

// ---------- Darstellung ----------
const CSS = [
  '.op-karte .kt{padding:12px 12px 14px;color:var(--ink);font-family:var(--font);box-sizing:border-box}',
  '.op-karte .kt *{box-sizing:border-box}',
  '.op-karte .task{margin:0 0 8px;font-size:18px;font-weight:800;line-height:1.25;text-align:center}',
  '.op-karte .task b{color:var(--gold)}',
  '.op-karte .clue{display:flex;gap:8px;align-items:center;background:hsl(42 70% 88%);color:hsl(25 55% 22%);border-radius:14px;padding:8px 12px;font-size:15px;font-weight:700;line-height:1.3;margin-bottom:8px;border:2px dashed hsl(30 50% 55%)}',
  '.op-karte .clue span+span{min-width:0;overflow-wrap:anywhere}',
  '.op-karte .map{display:block;width:100%;height:auto;border-radius:16px;touch-action:manipulation;user-select:none;-webkit-user-select:none}',
  '.op-karte .cell{cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent}',
  '.op-karte .cell:focus-visible{stroke:var(--gold);stroke-width:3.5}',
  '.op-karte .fog{transition:opacity .6s ease;pointer-events:none}',
  '.op-karte .fog.gone{opacity:0}',
  '.op-karte .fog g{animation:op-karte-drift 6s ease-in-out infinite alternate}',
  '.op-karte .fog:nth-child(2n) g{animation-duration:8s;animation-direction:alternate-reverse}',
  '@keyframes op-karte-drift{from{transform:translate(-3px,1px)}to{transform:translate(3px,-2px)}}',
  '.op-karte .tint{opacity:0;pointer-events:none}',
  '.op-karte .tint.flash{animation:op-karte-flash 1.3s ease-out forwards}',
  '.op-karte .tint.keep{opacity:.3}',
  '@keyframes op-karte-flash{0%{opacity:.85}100%{opacity:.3}}',
  '.op-karte .heat{opacity:0;pointer-events:none;transition:opacity .4s}',
  '.op-karte .heat.on{opacity:1}',
  '.op-karte .hint{opacity:0;pointer-events:none;transition:opacity .4s}',
  '.op-karte .hint.on{opacity:1}',
  '.op-karte .hint path.flow{animation:op-karte-flow 1s linear infinite}',
  '@keyframes op-karte-flow{to{stroke-dashoffset:-20}}',
  '.op-karte .pulse{opacity:0;pointer-events:none}',
  '.op-karte .pulse.on{opacity:1}',
  '.op-karte .pulse.on circle{transform-box:fill-box;transform-origin:center;animation:op-karte-pulse 1.1s ease-in-out infinite}',
  '@keyframes op-karte-pulse{0%,100%{transform:scale(.8);opacity:1}50%{transform:scale(1.25);opacity:.5}}',
  '.op-karte .ring{pointer-events:none;transform-box:fill-box;transform-origin:center;animation:op-karte-pulse 1.8s ease-in-out infinite}',
  '.op-karte .cl,.op-karte .op{transition:opacity .4s,transform .4s}',
  '.op-karte .door .op{opacity:0}',
  '.op-karte .door.open .op{opacity:1}',
  '.op-karte .door .cl{transform-box:fill-box;transform-origin:left center}',
  '.op-karte .door.open .cl{opacity:0;transform:scaleX(.1)}',
  '.op-karte .tdoor .d7in{opacity:0;transform-box:fill-box;transform-origin:center}',
  '.op-karte .tdoor.show .d7in{animation:op-karte-pop .45s ease-out forwards}',
  '@keyframes op-karte-pop{0%{opacity:0;transform:scale(.3)}70%{opacity:1;transform:scale(1.25)}100%{opacity:1;transform:scale(1.1)}}',
  '.op-karte .dot{opacity:0;transform-box:fill-box;transform-origin:center}',
  '.op-karte .dot.on{animation:op-karte-dot .25s ease-out forwards}',
  '@keyframes op-karte-dot{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}',
  '.op-karte .spark{opacity:0;transform-box:fill-box;transform-origin:center}',
  '.op-karte .spark.on{animation:op-karte-spark .6s ease-out 1}',
  '@keyframes op-karte-spark{0%{opacity:1;transform:scale(.3)}100%{opacity:0;transform:scale(2.2)}}',
  '.op-karte .bar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}',
  '.op-karte .balls{display:flex;align-items:center;gap:5px}',
  '.op-karte .ball{width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,hsl(205 60% 82%));box-shadow:0 1px 3px rgba(0,0,0,.4);transition:transform .3s,opacity .3s}',
  '.op-karte .ball.used{opacity:.18;transform:scale(.6)}',
  '.op-karte button{font:inherit;font-weight:800;font-size:15px;min-height:42px;min-width:42px;padding:0 16px;white-space:nowrap;border-radius:21px;border:0;cursor:pointer;color:var(--night);background:linear-gradient(180deg,hsl(45 100% 72%),hsl(38 95% 58%));box-shadow:0 2px 0 hsl(35 80% 38%)}',
  '.op-karte button:disabled{opacity:.45;cursor:default}',
  '.op-karte button:focus-visible{outline:3px solid var(--ice);outline-offset:2px}',
  '.op-karte .status{margin-top:8px;min-height:46px;padding:8px 12px;border-radius:14px;background:var(--panel);border:1px solid var(--line);font-size:15px;font-weight:700;line-height:1.3;display:flex;align-items:center}',
  '.op-karte .kt.red *{animation:none!important;transition:none!important}',
  '.op-karte .kt.red .tint.flash{opacity:.3}',
  '.op-karte .kt.red .tdoor.show .d7in,.op-karte .kt.red .dot.on{opacity:1}',
].join('\n');

const rnd = n => { const v = Math.sin(n * 91.7) * 10000; return v - Math.floor(v); };
const cx = c => O + S * c + S / 2, cy = r => O + S * r + S / 2;

function tree(x, y, k) {
  return `<g transform="translate(${x},${y}) scale(${k})"><rect x="-1.5" y="6" width="3" height="5" fill="hsl(25 45% 30%)"/>` +
    '<path d="M0 -12 L8 0 H-8Z" fill="hsl(150 45% 28%)"/><path d="M0 -6 L10 6 H-10Z" fill="hsl(150 50% 33%)"/>' +
    '<path d="M0 -12 L3 -8 H-3Z" fill="#fff"/><path d="M0 -6 L4 -1 H-4Z" fill="#fff" opacity=".9"/></g>';
}
function terrain(t, c, r) {
  const x = cx(c), y = cy(r); let g = '';
  let base = (c + r) % 2 ? 'hsl(205 45% 94%)' : 'hsl(205 50% 90%)';
  if (t === 'l') base = 'hsl(200 55% 78%)';
  if (t === 'f') base = 'hsl(205 40% 88%)';
  g += `<rect x="${O + S * c}" y="${O + S * r}" width="${S}" height="${S}" fill="${base}"/>`;
  if (t === 's') {
    g += `<circle cx="${x - 13}" cy="${y + 12}" r="1.6" fill="#fff"/><circle cx="${x + 14}" cy="${y - 11}" r="1.6" fill="#fff"/><circle cx="${x + 8}" cy="${y + 15}" r="1.2" fill="#fff"/>`;
    if ((c * 3 + r * 5) % 4 === 0) g += tree(x - 15, y - 13, .6);
  }
  if (t === 'f') g += tree(x - 11, y - 2, .85) + tree(x + 11, y + 1, .95) + tree(x, y + 12, .8);
  if (t === 'm') g += `<path d="M${x - 20} ${y + 16} L${x - 3} ${y - 16} L${x + 8} ${y + 2} L${x + 14} ${y - 6} L${x + 22} ${y + 16}Z" fill="hsl(225 20% 52%)"/><path d="M${x - 3} ${y - 16} L${x - 10} ${y - 4} L${x - 5} ${y - 6} L${x - 2} ${y - 2} L${x + 3} ${y - 7}Z" fill="#fff"/>`;
  if (t === 'l') g += `<ellipse cx="${x}" cy="${y + 1}" rx="21" ry="15" fill="hsl(195 70% 70%)" stroke="#fff" stroke-width="2"/><path d="M${x - 10} ${y - 3} l8 -4 M${x + 2} ${y + 6} l10 -4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
  if (t === 'v') g += `<g><path d="M${x - 19} ${y + 6} V${y - 4} L${x - 10} ${y - 13} L${x - 1} ${y - 4} V${y + 6}Z" fill="hsl(15 55% 50%)"/><path d="M${x - 21} ${y - 3} L${x - 10} ${y - 15} L${x + 1} ${y - 3}Z" fill="#fff"/><rect x="${x - 13}" y="${y}" width="6" height="6" fill="hsl(45 100% 70%)"/>` +
    `<path d="M${x + 3} ${y + 15} V${y + 6} L${x + 11} ${y - 2} L${x + 19} ${y + 6} V${y + 15}Z" fill="hsl(210 45% 48%)"/><path d="M${x + 1} ${y + 7} L${x + 11} ${y - 4} L${x + 21} ${y + 7}Z" fill="#fff"/><rect x="${x + 8}" y="${y + 8}" width="6" height="7" fill="hsl(45 100% 70%)"/></g>`;
  if (t === 'i') g += `<path d="M${x - 17} ${y + 14} A17 17 0 0 1 ${x + 17} ${y + 14}Z" fill="#fff" stroke="hsl(200 40% 70%)" stroke-width="1.5"/><path d="M${x - 5} ${y + 14} V${y + 8} A5 5 0 0 1 ${x + 5} ${y + 8} V${y + 14}Z" fill="hsl(225 35% 25%)"/><path d="M${x - 12} ${y + 4} H${x - 7} M${x + 7} ${y + 4} H${x + 12} M${x - 3} ${y - 2} H${x + 3}" stroke="hsl(200 40% 70%)" stroke-width="1.5"/>`;
  if (t === 'L') {
    g += `<rect x="${x - 7}" y="${y - 4}" width="14" height="22" rx="2" fill="#fff"/>` +
      `<rect x="${x - 6}" y="${y - 1}" width="12" height="5" fill="hsl(350 80% 55%)"/><rect x="${x - 7}" y="${y + 9}" width="14" height="5" fill="hsl(350 80% 55%)"/>` +
      `<rect x="${x - 6}" y="${y - 11}" width="12" height="7" rx="1.5" fill="hsl(45 100% 70%)"/><path d="M${x - 9} ${y - 11} L${x} ${y - 19} L${x + 9} ${y - 11}Z" fill="hsl(350 80% 55%)"/>` +
      `<path d="M${x + 7} ${y - 8} L${x + 21} ${y - 13} L${x + 21} ${y - 3}Z" fill="hsl(45 100% 75%)" opacity=".55"/>`;
  }
  return g;
}
function doorSvg(x, y, n, cls) {
  const hue = (n * 55 + 340) % 360, arch = 'M-11 15 V-3 a11 11 0 0 1 22 0 V15Z';
  return `<g class="door ${cls}" data-n="${n}" transform="translate(${x},${y})"><g class="d7in">` +
    `<path d="${arch}" fill="hsl(${hue} 40% 18%)"/>` +
    `<g class="op"><path d="${arch}" fill="hsl(45 100% 72%)"/><path d="M-11 15 L-21 12 V-5 L-11 -3Z" fill="hsl(${hue} 75% 50%)" stroke="hsl(${hue} 75% 30%)" stroke-width="1"/>` +
    `<text x="1" y="11" text-anchor="middle" font-size="15" font-weight="800" fill="hsl(${hue} 80% 28%)">${n}</text></g>` +
    `<g class="cl"><path d="${arch}" fill="hsl(${hue} 75% 52%)" stroke="hsl(${hue} 75% 30%)" stroke-width="1"/><text x="0" y="11" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">${n}</text></g>` +
    '<path d="M11 -12 l1.9 4.2 4.6 .5 -3.4 3.1 1 4.5 -4.1 -2.3 -4.1 2.3 1 -4.5 -3.4 -3.1 4.6 -.5Z" fill="hsl(48 100% 60%)" stroke="hsl(35 90% 40%)" stroke-width=".8" transform="translate(2,-4) scale(.9)"/>' +
    '</g></g>';
}
const heatOf = d => d <= 1 ? { w: 'Heiß!', col: 'var(--red)' } : d === 2 ? { w: 'Warm', col: 'var(--gold)' } : d === 3 ? { w: 'Kühl', col: 'hsl(215 85% 62%)' } : { w: 'Eiskalt', col: 'var(--ice)' };

export function mount(root, ctx) {
  if (!document.getElementById('op-style-karte')) {
    const st = document.createElement('style'); st.id = 'op-style-karte'; st.textContent = CSS; document.head.appendChild(st);
  }
  const day = ctx.day, week = ctx.week;
  const played = [...new Set(ctx.played || [])].filter(n => n >= 1 && n <= 24 && n !== day).sort((a, b) => a - b);
  const clue = makeClue(day, week, played), target = clue.target;
  const MAXB = day <= 13 ? 5 : 4;
  const key = (c, r) => c + '-' + r;
  const lmAt = {}; LANDMARKS.forEach(l => { lmAt[key(l.c, l.r)] = l; });
  const doorAt = {}; played.forEach(n => { doorAt[key(DOORS[n - 1].c, DOORS[n - 1].r)] = n; });

  // ----- SVG -----
  let svg = '<svg class="map" viewBox="0 0 360 360" role="group" aria-label="Schatzkarte der Winterinsel">' +
    '<defs><linearGradient id="opk-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(212 70% 38%)"/><stop offset="1" stop-color="hsl(220 65% 26%)"/></linearGradient>' +
    `<clipPath id="opk-land"><rect x="${O}" y="${O}" width="${S * N}" height="${S * N}" rx="20"/></clipPath>` +
    '<marker id="opk-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="hsl(48 100% 55%)"/></marker></defs>' +
    '<rect width="360" height="360" fill="url(#opk-sea)"/>' +
    '<g stroke="#fff" stroke-width="1.5" fill="none" opacity=".25" stroke-linecap="round"><path d="M318 80 q6 -4 12 0 t12 0"/><path d="M326 200 q6 -4 12 0 t12 0"/><path d="M322 280 q6 -4 12 0 t12 0"/><path d="M60 338 q6 -4 12 0 t12 0"/><path d="M200 342 q6 -4 12 0 t12 0"/></g>' +
    `<rect x="${O - 4}" y="${O - 4}" width="${S * N + 8}" height="${S * N + 8}" rx="24" fill="hsl(200 60% 80%)" opacity=".55"/>` +
    '<g clip-path="url(#opk-land)">';
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) svg += terrain(lmAt[key(c, r)]?.t || 's', c, r);
  svg += '<g stroke="hsl(215 40% 40%)" stroke-width="1" opacity=".35">';
  for (let i = 1; i < N; i++) svg += `<path d="M${O + S * i} ${O} V${O + S * N} M${O} ${O + S * i} H${O + S * N}"/>`;
  svg += '</g></g><g font-size="13" font-weight="800" fill="var(--ink)" text-anchor="middle">';
  for (let i = 0; i < N; i++) svg += `<text x="${cx(i)}" y="17">${COLS[i]}</text><text x="12" y="${cy(i) + 5}">${i + 1}</text>`;
  svg += '</g>';

  // Nebel
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const k = key(c, r), open = !!(lmAt[k] || doorAt[k]);
    svg += `<svg x="${O + S * c}" y="${O + S * r}" width="${S}" height="${S}" overflow="hidden" class="fog${open ? ' gone' : ''}" data-k="${k}"><g>`;
    [[24, 24, 20], [10, 12, 15], [38, 12, 15], [10, 38, 15], [38, 38, 15], [24, 5, 13], [24, 43, 13], [4, 24, 12], [44, 24, 12]].forEach((p, j) => {
      const dx = (rnd(c * 7 + r * 13 + j) - .5) * 6, dy = (rnd(c * 3 + r * 5 + j + 9) - .5) * 6;
      svg += `<circle cx="${p[0] + dx}" cy="${p[1] + dy}" r="${p[2]}" fill="hsl(210 40% ${92 + (j % 3) * 3}%)" opacity=".86"/>`;
    });
    svg += '</g></svg>';
  }

  // Fußspuren zwischen gespielten Türchen (Zahlenreihenfolge)
  if (played.length > 1) {
    svg += '<path d="' + played.map((n, i) => (i ? 'L' : 'M') + cx(DOORS[n - 1].c) + ' ' + cy(DOORS[n - 1].r)).join(' ') +
      '" fill="none" stroke="hsl(20 55% 32%)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0.1 9" stroke-linejoin="round"/>';
  }
  // Verlängerung zum neuen Türchen (erscheint bei Erfolg)
  const prev = [...played].reverse().find(n => n < day), next = played.find(n => n > day), nb = prev || next;
  if (nb) {
    const a = DOORS[nb - 1];
    for (let i = 1; i <= 4; i++) svg += `<circle class="dot" cx="${cx(a.c) + (cx(target.c) - cx(a.c)) * i / 5}" cy="${cy(a.r) + (cy(target.r) - cy(a.r)) * i / 5}" r="2.2" fill="hsl(20 55% 32%)"/>`;
  }
  played.forEach(n => { svg += doorSvg(cx(DOORS[n - 1].c), cy(DOORS[n - 1].r), n, 'open'); });
  svg += doorSvg(cx(target.c), cy(target.r), day, 'tdoor');
  svg += `<circle class="spark" cx="${cx(target.c)}" cy="${cy(target.r)}" r="22" fill="none" stroke="var(--gold)" stroke-width="4"/>`;

  // Farbtupfer und Heiß-Kalt-Wort je Feld
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const x0 = O + S * c, y0 = O + S * r, k = key(c, r);
    svg += `<rect class="tint" data-k="${k}" x="${x0 + 1}" y="${y0 + 1}" width="${S - 2}" height="${S - 2}" fill="#fff"/>` +
      `<g class="heat" data-k="${k}"><rect x="${x0 + 4}" y="${y0 + S - 17}" width="${S - 8}" height="14" rx="7" fill="hsl(225 50% 15%)" opacity=".85"/><text x="${x0 + S / 2}" y="${y0 + S - 6.5}" text-anchor="middle" font-size="10" font-weight="800" fill="#fff"></text></g>`;
  }
  // Wahrzeichen-Schilder und Start-Ring
  LANDMARKS.forEach(l => {
    const w = Math.round(l.name.length * 6.4 + 14), x = cx(l.c), y = cy(l.r);
    svg += `<rect x="${x - w / 2}" y="${y + 14}" width="${w}" height="15" rx="7.5" fill="hsl(350 80% 48%)" stroke="#fff" stroke-width="1.5"/><text x="${x}" y="${y + 25}" text-anchor="middle" font-size="10" font-weight="800" fill="#fff">${l.name}</text>`;
  });
  if (clue.start) svg += `<circle class="ring" cx="${cx(clue.start.c)}" cy="${cy(clue.start.r) + 2}" r="27" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-dasharray="5 4"/>`;

  // Tipp-Ebenen
  svg += '<g class="hint"><path class="shade" fill="none" stroke="hsl(225 60% 20%)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>' +
    '<path class="flow" fill="none" stroke="hsl(48 100% 60%)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 10" marker-end="url(#opk-arr)"/>' +
    '<circle class="hs" r="6" fill="hsl(48 100% 60%)" stroke="hsl(225 60% 20%)" stroke-width="2"/></g>' +
    `<g class="pulse"><circle cx="${cx(target.c)}" cy="${cy(target.r)}" r="20" fill="hsl(48 100% 60%)" opacity=".5" stroke="var(--gold)" stroke-width="3"/><text x="${cx(target.c)}" y="${cy(target.r) + 8}" text-anchor="middle" font-size="22" font-weight="800" fill="hsl(225 60% 20%)">?</text></g>`;
  // Tippflächen
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    svg += `<rect class="cell" tabindex="0" role="button" aria-label="Feld ${cellName(c, r)}" data-c="${c}" data-r="${r}" x="${O + S * c}" y="${O + S * r}" width="${S}" height="${S}" fill="transparent"/>`;
  }
  // Windrose
  svg += '<g transform="translate(331,330)" pointer-events="none"><circle r="17" fill="hsl(225 55% 18%)" opacity=".7" stroke="var(--gold)" stroke-width="1.5"/>' +
    '<path d="M0 -15 L4 0 L0 15 L-4 0Z" fill="hsl(40 30% 85%)"/><path d="M-15 0 L0 -4 L15 0 L0 4Z" fill="hsl(40 30% 70%)"/><path d="M0 -15 L4 0 L-4 0Z" fill="var(--red)"/><circle r="2" fill="var(--gold)"/>' +
    '<g font-size="9" font-weight="800" fill="var(--ink)" text-anchor="middle"><text y="-20.5">N</text><text y="27">S</text><text x="-23.5" y="3.5">W</text><text x="23.5" y="3.5">O</text></g></g></svg>';

  root.innerHTML = `<div class="kt${ctx.reduced ? ' red' : ''}">` +
    `<p class="task">Finde das Feld, wo Türchen <b>${day}</b> wartet!</p>` +
    '<div class="clue"><span aria-hidden="true">🗺️</span><span class="cluetext"></span></div>' + svg +
    '<div class="bar"><div class="balls" role="img"></div><button class="tip" type="button">Tipp</button></div>' +
    '<div class="status" role="status" aria-live="polite"></div></div>';

  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const mapEl = $('.map'), statusEl = $('.status'), tipBtn = $('.tip'), ballsEl = $('.balls');
  $('.cluetext').textContent = clue.text;
  const byK = cls => { const m = {}; $$(cls).forEach(e => { m[e.dataset.k] = e; }); return m; };
  const fogEl = byK('.fog'), tintEl = byK('.tint'), heatEl = byK('.heat'), cellEl = byK('.cell');
  $$('.cell').forEach(e => { cellEl[key(e.dataset.c, e.dataset.r)] = e; });

  // Hinweis-Pfad
  const pts = clue.route.map(p => [cx(p.c), cy(p.r)]);
  { // Pfeil kurz vor dem Ziel enden lassen
    const [ex, ey] = pts[pts.length - 1], [bx, by] = pts[pts.length - 2] || pts[0], len = Math.hypot(ex - bx, ey - by) || 1;
    pts[pts.length - 1] = [ex - (ex - bx) / len * 15, ey - (ey - by) / len * 15];
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    $('.hint .shade').setAttribute('d', d); $('.hint .flow').setAttribute('d', d);
    const hs = $('.hint .hs'); hs.setAttribute('cx', cx(clue.route[0].c)); hs.setAttribute('cy', cy(clue.route[0].r));
  }

  // ----- Zustand -----
  let balls = MAXB, tipLevel = 0, done = false, dead = false;
  const seen = {};   // Feld -> Meldung für schon freie Felder
  LANDMARKS.forEach(l => { seen[key(l.c, l.r)] = `${l.name} (${cellName(l.c, l.r)}) kennst du schon. Such im Nebel!`; });
  played.forEach(n => { seen[key(DOORS[n - 1].c, DOORS[n - 1].r)] = `Türchen ${n} hast du schon gefunden. Such im Nebel!`; });

  const setStatus = t => { statusEl.textContent = t; };
  function drawBalls() {
    let h = ''; for (let k = 0; k < MAXB; k++) h += `<span class="ball${k >= balls ? ' used' : ''}"></span>`;
    ballsEl.innerHTML = h; ballsEl.setAttribute('aria-label', `Schneebälle: ${balls} von ${MAXB}`);
  }
  function showHint(level) {
    if (level >= 1 && tipLevel < 1) ctx.hintUsed();
    if (level >= 2) ctx.hintUsed();
    tipLevel = Math.max(tipLevel, level);
    $('.hint').classList.toggle('on', tipLevel >= 1 && !done);
    $('.pulse').classList.toggle('on', tipLevel >= 2 && !done);
    tipBtn.disabled = done || tipLevel >= 2;
    tipBtn.textContent = tipLevel === 1 ? 'Tipp 2' : 'Tipp';
  }
  function tap(c, r) {
    if (done || dead) return;
    const k = key(c, r), name = cellName(c, r);
    if (seen[k]) { setStatus(seen[k]); return; }
    fogEl[k].classList.add('gone');
    if (c === target.c && r === target.r) { win(); return; }
    const h = heatOf(Math.max(Math.abs(c - target.c), Math.abs(r - target.r)));
    seen[k] = `${name} hast du schon gelüftet: ${h.w}`;
    cellEl[k].setAttribute('aria-label', `Feld ${name}, ${h.w}`);
    tintEl[k].style.fill = h.col; tintEl[k].classList.add('flash', 'keep');
    heatEl[k].querySelector('text').textContent = h.w.replace('!', ''); heatEl[k].classList.add('on');
    ctx.audio.sfx('pop');
    if (balls > 0) {
      balls--; drawBalls();
      if (balls === 0) {
        showHint(1);
        setStatus(`${name}: ${h.w} Keine Schneebälle mehr. Die Karte zeigt dir jetzt den Weg, Tipps sind frei!`);
      } else setStatus(`${name}: ${h.w} Noch ${balls} ${balls === 1 ? 'Schneeball' : 'Schneebälle'}.`);
    } else setStatus(`${name}: ${h.w} Tipps und Versuche sind jetzt frei.`);
  }
  function win() {
    done = true; setStatus('');
    $('.hint').classList.remove('on'); $('.pulse').classList.remove('on'); $('.ring')?.remove();
    tipBtn.disabled = true;
    const td = $('.tdoor'), dots = $$('.dot');
    td.classList.add('show');
    ctx.audio.sfx('coin');
    dots.forEach((el, i) => { el.style.animationDelay = (i * 0.08) + 's'; el.classList.add('on'); });
    $('.spark').classList.add('on');
    ctx.timeout(() => td.classList.add('open'), ctx.reduced ? 0 : 350);
    ctx.timeout(() => ctx.success(), ctx.reduced ? 200 : OPEN_MS);
  }

  // Maus, Touch und Tastatur (Tab, Pfeiltasten als Cursor, Enter/Leertaste)
  const cellOf = e => e.target.closest?.('.cell');
  ctx.on(mapEl, 'click', e => { const el = cellOf(e); if (el) tap(+el.dataset.c, +el.dataset.r); });
  ctx.on(mapEl, 'keydown', e => {
    const el = cellOf(e); if (!el) return;
    const c = +el.dataset.c, r = +el.dataset.r;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(c, r); return; }
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!mv) return;
    e.preventDefault();
    const n = cellEl[key(Math.min(N - 1, Math.max(0, c + mv[0])), Math.min(N - 1, Math.max(0, r + mv[1])))];
    n?.focus();
  });
  ctx.on(tipBtn, 'click', () => {
    if (done) return;
    if (tipLevel === 0) { showHint(1); setStatus('Tipp: Folge dem gelben Pfeil vom Startpunkt aus.'); }
    else if (tipLevel === 1) { showHint(2); setStatus('Noch ein Tipp: Das Feld mit dem Fragezeichen pulsiert. Tippe darauf!'); }
  });

  drawBalls(); showHint(0);
  setStatus('Tippe auf ein Nebelfeld. Jedes Lüften kostet einen Schneeball. Eiskalt, Kühl, Warm oder Heiß zeigt dir den Weg!');
  return { destroy() { dead = true; } };
}
