// Türöffner "Wimmel-Winterdorf": Die gesuchte Zahl ist im Dorfbild getarnt versteckt. Vertrag: openspec/specs/tueroeffner.md
export const meta = { id: 'dorf', title: 'Wimmel-Winterdorf', emoji: '🏘️' };

const NS = 'http://www.w3.org/2000/svg';
const CSS = `
.op-dorf{padding:10px 12px 16px;box-sizing:border-box;color:var(--ink);font-family:var(--font)}
.op-dorf *{box-sizing:border-box}
.op-dorf .card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:10px 14px 11px;margin-bottom:10px}
.op-dorf .kicker{font-size:13px;font-weight:800;letter-spacing:.04em;color:var(--gold)}
.op-dorf .riddle{font-size:17px;line-height:1.25;font-weight:700;margin:3px 0 0}
.op-dorf .riddle2{font-size:15px;line-height:1.25;color:var(--ice);margin:6px 0 0;display:none}
.op-dorf .riddle2.on{display:block;animation:op-dorf-in .5s ease}
.op-dorf .scene{display:block;width:100%;height:auto;border-radius:16px;border:1px solid var(--line);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.op-dorf .nm{outline:none;cursor:pointer}
.op-dorf .nm .fr{fill:none;stroke:var(--gold);stroke-width:2.6;opacity:0}
.op-dorf .nm:focus-visible .fr{opacity:1}
.op-dorf .nm .hit{fill:transparent}
.op-dorf .t{font-family:var(--font);font-weight:800;text-anchor:middle;dominant-baseline:central;pointer-events:none;transform-box:fill-box;transform-origin:center}
.op-dorf .t.wob{animation:op-dorf-wob .5s ease}
.op-dorf .tw{animation:op-dorf-tw 3s ease-in-out infinite}
.op-dorf .smoke{animation:op-dorf-bob 5s ease-in-out infinite}
.op-dorf .ring{transform-box:fill-box;transform-origin:center;animation:op-dorf-ring .6s ease-out forwards;pointer-events:none}
.op-dorf .pulse{transform-box:fill-box;transform-origin:center;animation:op-dorf-pulse 1.3s ease-out infinite;pointer-events:none}
.op-dorf .hatch{transform-box:fill-box;transform-origin:left center;transition:transform .8s cubic-bezier(.5,0,.3,1)}
.op-dorf.open7 .hatch{transform:scaleX(.14)}
.op-dorf .inside{opacity:0;transition:opacity .5s .15s}
.op-dorf.open7 .inside{opacity:1}
.op-dorf .gs{transform-box:fill-box;transform-origin:center;animation:op-dorf-gl 1.8s ease-in-out infinite;pointer-events:none}
.op-dorf .glow{transform-box:fill-box;transform-origin:center;pointer-events:none}
.op-dorf .burst{animation:op-dorf-burst .8s ease-out forwards}
.op-dorf .litwin{opacity:0;animation:op-dorf-lit .45s ease-out forwards;pointer-events:none}
.op-dorf .spark{transform-box:fill-box;transform-origin:center;animation:op-dorf-sp .7s ease-out forwards;pointer-events:none}
.op-dorf .status{min-height:46px;margin:10px 0 0;padding:9px 13px;border-radius:14px;background:rgba(0,0,0,.22);border:1px solid var(--line);font-size:15px;line-height:1.3;font-weight:600}
.op-dorf .row{display:flex;gap:10px;margin-top:10px}
.op-dorf .btn{flex:1;min-height:44px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:700 15px var(--font);cursor:pointer}
.op-dorf .btn.tip{background:linear-gradient(180deg,hsl(42 95% 62%),hsl(32 90% 52%));color:#3a2200;border-color:transparent}
.op-dorf .btn:disabled{opacity:.55;cursor:default}
.op-dorf .btn:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
@keyframes op-dorf-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@keyframes op-dorf-wob{0%,100%{transform:rotate(0)}25%{transform:rotate(-14deg) scale(1.2)}75%{transform:rotate(14deg) scale(1.2)}}
@keyframes op-dorf-tw{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes op-dorf-bob{0%,100%{transform:translate(0,0)}50%{transform:translate(3px,-4px)}}
@keyframes op-dorf-ring{from{transform:scale(.4);opacity:.9}to{transform:scale(2.4);opacity:0}}
@keyframes op-dorf-pulse{from{transform:scale(.7);opacity:1}to{transform:scale(1.9);opacity:0}}
@keyframes op-dorf-gl{0%,100%{transform:scale(.3);opacity:.2}50%{transform:scale(1.2);opacity:1}}
@keyframes op-dorf-burst{from{transform:scale(.3);opacity:1}to{transform:scale(1.7);opacity:.85}}
@keyframes op-dorf-lit{to{opacity:1}}
@keyframes op-dorf-sp{from{transform:translate(0,0) scale(1);opacity:1}to{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}
.op-dorf.rd *{animation-duration:.01s!important;animation-iteration-count:1!important;transition:none!important}
.op-dorf.rd .tw,.op-dorf.rd .smoke,.op-dorf.rd .gs{animation:none!important;opacity:1}
@media (prefers-reduced-motion:reduce){.op-dorf .tw,.op-dorf .smoke,.op-dorf .gs,.op-dorf .pulse{animation:none!important}.op-dorf .gs{opacity:1}.op-dorf .hatch,.op-dorf .inside{transition:none}}
`;

// Versteckorte: Zahl, x, y, Drehung, Objektfarbe, Zahlenfarbe, Größenfaktor, Typ, Rätsel, deutlicheres Rätsel
const WD = ['#141c4a', '#7b88cf'];
const SPOTS = [
  [1, 24, 252, -4, ...WD, 1.0, 'win', 'Die 1 schaut ganz links am Bildrand aus einem Haus mit roten Wänden.', 'Such das Fenster am roten Haus ganz links am Bildrand.'],
  [2, 66, 252, 5, ...WD, 1.0, 'win', 'Die 2 guckt rechts neben der kleinen Tür im roten Haus hervor.', 'Rotes Haus, das Fenster rechts von der Tür.'],
  [3, 106, 266, 6, ...WD, 1.0, 'win', 'Die 3 wohnt im blaugrünen Haus neben der Kirche, im linken Fenster.', 'Das kleine Haus steht links neben der Kirche, schau ins linke Fenster.'],
  [4, 138, 266, -6, ...WD, 1.0, 'win', 'Die 4 guckt rechts aus dem blaugrünen Haus, ganz nah an der Kirche.', 'Gleiches Haus wie links neben der Kirche, aber das Fenster nah an der Kirche.'],
  [5, 352, 262, 4, ...WD, 1.0, 'win', 'Die 5 wohnt im lila Haus ganz rechts am Bildrand, im linken Fenster.', 'Das lila Haus steht ganz rechts am Rand, such das linke Fenster.'],
  [6, 383, 262, -5, ...WD, 1.0, 'win', 'Die 6 lugt aus dem lila Haus, im Fenster ganz außen am rechten Rand.', 'Lila Haus, das Fenster ganz außen.'],
  [7, 259, 270, -3, '#7a4a2a', '#c8925a', 1.1, '', 'Die 7 versteckt sich dort, wo es nach Plätzchen duftet.', 'Schau nach dem Schild mit der Brezel.'],
  [8, 45, 280, -8, '#2f9a55', '#8fe0a8', 0.9, '', 'Die 8 hängt als grüner Gruß an der Haustür vom Haus ganz links.', 'Ein grüner Kranz mit roter Beere schmückt die Tür vom roten Haus.'],
  [9, 80, 163, 8, '#aab8e6', '#6577bd', 1.2, '', 'Die 9 schwebt im Rauch aus dem Schornstein vom Haus ganz links.', 'Eine Rauchwolke steigt links über dem roten Haus auf.'],
  [10, 305, 166, -6, '#aab8e6', '#6577bd', 1.2, '', 'Die 10 tanzt im Rauch aus dem Schornstein vom Brezelhaus.', 'Der Rauch kommt aus dem Schornstein von dem Haus mit dem Brezelschild.'],
  [11, 50, 38, 12, '#1c2c74', '#ffe9a8', 1.0, '', 'Die 11 funkelt im linken von drei verbundenen Sternen am Himmel.', 'Oben am Himmel, der erste von drei Sternen mit der gestrichelten Linie.'],
  [12, 96, 66, -10, '#1c2c74', '#ffe9a8', 1.0, '', 'Die 12 glitzert im mittleren, tiefer hängenden von drei Sternen.', 'Von den drei verbundenen Sternen ist es der mittlere, der weiter unten hängt.'],
  [13, 138, 34, 6, '#1c2c74', '#ffe9a8', 1.0, '', 'Die 13 leuchtet im rechten von drei Sternen, hoch am Himmel.', 'Der dritte Stern, ganz rechts und hoch oben am Himmel.'],
  [14, 328, 58, -14, '#f4ebc5', '#a99a62', 1.1, '', 'Die 14 wohnt dort, wo nachts das große runde Licht am Himmel hängt.', 'Schau nach rechts oben, wo der Mond scheint.'],
  [15, 99, 360, 10, '#c2384f', '#f08a9a', 0.9, '', 'Die 15 hängt als dunkelrote Kugel am Baum links vom Schlitten.', 'Es ist der Baum links neben dem Schlitten.'],
  [16, 298, 350, -8, '#ffd166', '#a8721a', 1.0, '', 'Die 16 glänzt als goldene Kugel am größten Baum in der Dorfmitte.', 'Der große Baum steht in der Mitte, die goldene Kugel hängt weit rechts.'],
  [17, 338, 376, 12, '#3d6fd0', '#a5bff7', 0.9, '', 'Die 17 baumelt als blaue Kugel am Baum neben dem Geschenk.', 'Der Baum steht neben dem Geschenk am rechten Bildrand.'],
  [18, 36, 359, 5, '#262a3e', '#8c95bd', 0.9, '', 'Die 18 steckt als dunkler Knopf am Schneemann ganz links im Bild.', 'Schau auf den dunklen Bauch vom Schneemann ganz links.'],
  [19, 189, 163, -4, '#f3ecd2', '#5b4a2f', 0.9, '', 'Die 19 steht dort, wo man die Zeit abliest.', 'Schau auf die Uhr am Kirchturm.'],
  [20, 172, 394, -5, '#b5483a', '#eb9a8a', 1.0, '', 'Die 20 klebt auf dem roten Schlitten, der unten in der Mitte steht.', 'Der rote Schlitten mit dem grünen Päckchen steht unten in der Mitte.'],
  [21, 222, 345, 4, '#b8384f', '#f5919f', 1.0, '', 'Die 21 wartet auf Post im roten Kasten mit der Schneehaube.', 'Schau am roten Briefkasten mit der Schneehaube.'],
  [22, 365, 287, -5, '#f0d79a', '#9a7228', 0.8, '', 'Die 22 guckt durch das runde Fensterchen in der Tür vom lila Haus.', 'Es ist die Tür vom lila Haus.'],
  [23, 71, 331, 6, '#e0a64a', '#6e420e', 0.9, '', 'Die 23 brennt warm in einem Glaskasten neben dem Schneemann.', 'Die Laterne steht unten links am Laternenpfahl, neben dem Schneemann.'],
  [24, 385, 402, 8, '#ef476f', '#ffb3c3', 0.9, '', 'Die 24 steckt im roten Geschenk mit goldener Schleife unten rechts.', 'Das Geschenk mit der goldenen Schleife liegt ganz unten rechts.']
];

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const el = (name, attrs, parent) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

function star(cx, cy, R, r) {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; p.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1)); }
  return p.join(' ');
}
function spark4(cx, cy, s) {
  return `M${cx} ${cy - s}Q${cx} ${cy} ${cx + s} ${cy}Q${cx} ${cy} ${cx} ${cy + s}Q${cx} ${cy} ${cx - s} ${cy}Q${cx} ${cy} ${cx} ${cy - s}Z`;
}
function cloud(cx, cy, sc, fill, op) {
  return `<g fill="${fill}" opacity="${op}"><circle cx="${cx - 9 * sc}" cy="${cy + 3 * sc}" r="${8 * sc}"/><circle cx="${cx}" cy="${cy - 3 * sc}" r="${10 * sc}"/><circle cx="${cx + 10 * sc}" cy="${cy + 3 * sc}" r="${8 * sc}"/><rect x="${cx - 17 * sc}" y="${cy + 4 * sc}" width="${34 * sc}" height="${7 * sc}" rx="${3.5 * sc}"/></g>`;
}
function tree(cx, b, s, balls) {
  let o = `<rect x="${cx - 5 * s}" y="${b - 8 * s}" width="${10 * s}" height="${12 * s}" fill="#5a3b2a"/>`;
  [[85, 50, 22, '#1f6b53'], [65, 28, 29, '#25805f'], [45, 8, 36, '#2b9470']].forEach(t => {
    const ty = b - t[0] * s, by = b - t[1] * s, hw = t[2] * s;
    o += `<polygon points="${cx},${ty} ${cx - hw},${by} ${cx + hw},${by}" fill="${t[3]}"/>`;
    o += `<path d="M${cx - hw * .55} ${ty + (by - ty) * .55}Q${cx} ${ty + (by - ty) * .78} ${cx + hw * .55} ${ty + (by - ty) * .55}L${cx} ${ty}Z" fill="#e7efff" opacity=".85"/>`;
  });
  o += `<polygon points="${star(cx, b - 90 * s, 6 * s, 2.6 * s)}" fill="#ffd166"/>`;
  balls.forEach(q => { o += `<circle cx="${q[0]}" cy="${q[1]}" r="${q[2]}" fill="${q[3]}"/><circle cx="${q[0] - q[2] * .3}" cy="${q[1] - q[2] * .3}" r="${q[2] * .25}" fill="#fff" opacity=".6"/>`; });
  return o;
}
const winDark = (x, y) => `<rect x="${x - 9}" y="${y - 10}" width="18" height="20" rx="2" fill="#141c4a" stroke="#3a2630" stroke-width="1.6"/><path d="M${x} ${y - 10}V${y + 10}M${x - 9} ${y}H${x + 9}" stroke="#3a2630" stroke-width="1.2" opacity=".55"/>`;

function scene() {
  let o = '';
  o += '<defs>'
    + '<linearGradient id="dorf-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1235"/><stop offset=".55" stop-color="#1d2d78"/><stop offset="1" stop-color="#4a4596"/></linearGradient>'
    + '<radialGradient id="dorf-glow"><stop offset="0" stop-color="#ffd36a" stop-opacity=".6"/><stop offset="1" stop-color="#ffd36a" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="dorf-moon"><stop offset="0" stop-color="#fff6cc" stop-opacity=".5"/><stop offset="1" stop-color="#fff6cc" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="dorf-snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8e3fa"/><stop offset="1" stop-color="#aebfe6"/></linearGradient>'
    + '</defs>';
  o += '<rect width="400" height="420" fill="url(#dorf-sky)"/>';
  [[20, 20], [75, 22], [118, 58], [160, 24], [200, 40], [230, 18], [262, 52], [290, 28], [370, 22], [385, 90], [30, 95], [150, 80], [250, 90], [350, 120], [20, 150], [120, 130], [285, 130], [60, 120]].forEach((p, i) => {
    o += `<circle class="tw" style="animation-delay:${(i * .37).toFixed(2)}s" cx="${p[0]}" cy="${p[1]}" r="${i % 3 ? 1.1 : 1.7}" fill="#fff6d8"/>`;
  });
  o += '<path d="M50 38L96 66L138 34M96 66L112 98" stroke="#ffe9a8" stroke-width=".8" stroke-dasharray="2 3" opacity=".6" fill="none"/>';
  [[50, 38], [96, 66], [138, 34]].forEach(p => { o += `<circle cx="${p[0]}" cy="${p[1]}" r="11" fill="#ffe9a8" opacity=".14"/><path d="${spark4(p[0], p[1], 10)}" fill="#ffe9a8" opacity=".5"/>`; });
  o += '<circle cx="112" cy="98" r="2.2" fill="#ffe9a8"/>';
  o += '<circle cx="330" cy="52" r="40" fill="url(#dorf-moon)"/><circle cx="330" cy="52" r="22" fill="#f4ebc5"/>'
    + '<circle cx="340" cy="44" r="4" fill="#e3d6a2"/><circle cx="322" cy="66" r="3" fill="#e3d6a2"/><circle cx="342" cy="62" r="2.4" fill="#e3d6a2"/><circle cx="328" cy="58" r="6" fill="#ecdfae"/>';
  o += '<path d="M0 270Q60 238 130 262T250 255T400 258V330H0Z" fill="#6f80c4"/>';
  o += '<path d="M0 285Q80 258 170 278T400 268V340H0Z" fill="#8fa3d6"/>';
  // Kirche
  o += '<rect x="166" y="100" width="46" height="208" fill="#7d84ab"/>';
  for (let by = 118; by < 300; by += 14) o += `<path d="M166 ${by}H212" stroke="#6a719a" stroke-width=".8"/>`;
  o += '<polygon points="158,104 189,48 220,104" fill="#7c2d3c"/><path d="M168 88Q189 76 210 88L189 48Z" fill="#e7efff" opacity=".9"/>';
  o += '<path d="M189 48V32M183 39H195" stroke="#ffd166" stroke-width="2.4" stroke-linecap="round"/>';
  o += '<rect x="181" y="106" width="16" height="22" rx="8" fill="#161c46"/><circle cx="189" cy="119" r="4" fill="#ffd166"/>';
  o += '<circle cx="189" cy="153" r="17" fill="#f3ecd2" stroke="#5b4a2f" stroke-width="2.2"/>';
  for (let h = 0; h < 12; h++) { const ha = h * Math.PI / 6; o += `<circle cx="${(189 + 13.5 * Math.sin(ha)).toFixed(1)}" cy="${(153 - 13.5 * Math.cos(ha)).toFixed(1)}" r="${h % 3 ? .8 : 1.3}" fill="#5b4a2f"/>`; }
  o += '<path d="M189 153V143M189 153L197 157" stroke="#5b4a2f" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>';
  o += '<rect x="186" y="188" width="6" height="22" rx="3" fill="#161c46"/>';
  o += '<path d="M178 308V288a11 11 0 0 1 22 0V308Z" fill="#5a3b2a"/><circle cx="196" cy="298" r="1.4" fill="#ffd166"/>';
  // Haus A (rot)
  o += '<rect x="8" y="226" width="78" height="82" fill="#a8453f"/>';
  o += '<rect x="62" y="190" width="16" height="30" fill="#7a3a33"/><rect x="59" y="186" width="22" height="7" rx="3" fill="#e7efff"/>';
  o += '<polygon points="0,232 47,190 94,232" fill="#4b3a6e"/><path d="M8 224Q47 200 86 224L47 190Z" fill="#e7efff" opacity=".92"/>';
  o += '<path d="M36 308V286a9 9 0 0 1 18 0V308Z" fill="#4a2b2b"/><circle cx="50" cy="298" r="1.3" fill="#ffd166"/>';
  o += '<circle cx="45" cy="280" r="10" fill="#2f9a55"/><circle cx="38" cy="275" r="1.8" fill="#ef476f"/><circle cx="52" cy="285" r="1.8" fill="#ef476f"/><circle cx="53" cy="274" r="1.5" fill="#ffd166"/>';
  o += `<g class="smoke">${cloud(80, 163, 1.25, '#aab8e6', .9)}<circle cx="72" cy="181" r="5" fill="#aab8e6" opacity=".7"/><circle cx="68" cy="173" r="7" fill="#aab8e6" opacity=".75"/></g>`;
  // Haus B (blaugrün)
  o += '<rect x="94" y="250" width="56" height="58" fill="#3f7f8c"/>';
  o += '<rect x="132" y="224" width="11" height="22" fill="#2b5967"/><rect x="130" y="221" width="15" height="6" rx="3" fill="#e7efff"/>';
  o += '<polygon points="88,254 122,222 156,254" fill="#2d4a63"/><path d="M95 250Q122 232 149 250L122 222Z" fill="#e7efff" opacity=".92"/>';
  o += '<path d="M114 308V291a8 8 0 0 1 16 0V308Z" fill="#2a2147"/>';
  o += '<g class="smoke" style="animation-delay:-2s"><circle cx="138" cy="210" r="5" fill="#aab8e6" opacity=".75"/><circle cx="143" cy="199" r="4" fill="#aab8e6" opacity=".55"/></g>';
  // Bäckerei
  o += '<rect x="226" y="224" width="96" height="84" fill="#c98a45"/>';
  o += '<rect x="298" y="190" width="14" height="30" fill="#8a4a38"/><rect x="295" y="186" width="20" height="7" rx="3" fill="#e7efff"/>';
  o += '<polygon points="216,228 274,184 332,228" fill="#8c3f2f"/><path d="M227 224Q274 196 321 224L274 184Z" fill="#e7efff" opacity=".92"/>';
  o += '<rect x="234" y="229" width="52" height="16" rx="4" fill="#4a2519"/><text x="260" y="238" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="800" fill="#ffd166" style="font-family:var(--font)">Bäckerei</text>';
  o += '<path d="M302 246V250" stroke="#4a2519" stroke-width="2"/><circle cx="302" cy="259" r="10" fill="#4a2519" stroke="#ffd166" stroke-width="1"/>'
    + '<path d="M297 264C293 254 302 250 302 257C302 250 311 254 307 264M297 264Q302 255 307 264" stroke="#f0b24f" stroke-width="2.3" fill="none" stroke-linecap="round"/>';
  o += '<rect x="235" y="251" width="48" height="36" rx="3" fill="#4a2519"/><rect x="240" y="256" width="38" height="26" fill="#ffd36a"/>';
  o += '<g class="inside"><circle cx="259" cy="269" r="22" fill="url(#dorf-glow)"/><rect x="241" y="276" width="36" height="3" fill="#7a4a2a"/><circle cx="247" cy="273" r="3.4" fill="#d9944a"/><circle cx="259" cy="273" r="3.4" fill="#e0a05a"/><circle cx="271" cy="273" r="3.4" fill="#d9944a"/><path d="M248 262c-3-5 4-6 5-2M265 262c-3-5 4-6 5-2" stroke="#7a4a2a" stroke-width="1.4" fill="none"/></g>';
  o += '<g class="hatch"><rect x="240" y="256" width="38" height="26" fill="#7a4a2a"/><path d="M240 264H278M240 273H278" stroke="#5e3720" stroke-width="1"/><rect x="240" y="256" width="38" height="26" fill="none" stroke="#a46a3a" stroke-width="1.2"/><circle cx="274" cy="269" r="1.5" fill="#ffd166"/></g>';
  o += '<path d="M292 308V282a10 10 0 0 1 20 0V308Z" fill="#4a2519"/><circle cx="308" cy="294" r="1.4" fill="#ffd166"/>';
  o += `<g class="smoke" style="animation-delay:-1s">${cloud(306, 166, 1.2, '#aab8e6', .9)}<circle cx="303" cy="184" r="5" fill="#aab8e6" opacity=".7"/></g>`;
  // Haus D (lila)
  o += '<rect x="338" y="244" width="56" height="64" fill="#6b4fa0"/>';
  o += '<polygon points="330,248 366,214 402,248" fill="#3a2d63"/><path d="M338 244Q366 224 394 244L366 214Z" fill="#e7efff" opacity=".92"/>';
  o += '<path d="M356 308V292a9 9 0 0 1 18 0V308Z" fill="#3a2230"/><ellipse cx="365" cy="287" rx="8" ry="6.5" fill="#f0d79a"/>';
  // Dunkle Fenster (die 1 bis 6)
  SPOTS.filter(s => s[7] === 'win').forEach(s => { o += winDark(s[1], s[2]); });
  // Vordergrund
  o += '<path d="M0 310Q70 296 150 308T290 306T400 298V420H0Z" fill="url(#dorf-snow)"/>';
  o += '<path d="M0 330Q90 322 200 332T400 326" stroke="#fff" stroke-width="1.4" fill="none" opacity=".4"/><path d="M0 372Q100 360 220 374T400 366" stroke="#fff" stroke-width="1.4" fill="none" opacity=".35"/>';
  // Schneemann
  o += '<path d="M24 346L8 336M48 346L64 335" stroke="#5a3b2a" stroke-width="2.4" stroke-linecap="round"/>';
  o += '<circle cx="36" cy="380" r="18" fill="#f3f7ff"/><circle cx="36" cy="357" r="14" fill="#f8fbff"/><circle cx="36" cy="335" r="10.5" fill="#fff"/>';
  o += '<rect x="26" y="319" width="20" height="5" rx="2" fill="#262a3e"/><rect x="29" y="305" width="14" height="16" rx="2" fill="#262a3e"/><rect x="29" y="313" width="14" height="3" fill="#ef476f"/>';
  o += '<circle cx="32" cy="333" r="1.4" fill="#262a3e"/><circle cx="40" cy="333" r="1.4" fill="#262a3e"/><path d="M36 336L46 339L36 340Z" fill="#ff8a3d"/>';
  o += '<path d="M26 345Q36 351 46 345" stroke="#ef476f" stroke-width="4" fill="none" stroke-linecap="round"/>';
  o += '<circle cx="36" cy="359" r="9" fill="#262a3e"/><circle cx="36" cy="378" r="2.2" fill="#262a3e"/><circle cx="36" cy="386" r="2.2" fill="#262a3e"/>';
  // Laterne
  o += '<rect x="69" y="340" width="4" height="52" fill="#2a2a44"/><rect x="64" y="388" width="14" height="5" rx="2" fill="#2a2a44"/>';
  o += '<circle cx="71" cy="331" r="22" fill="url(#dorf-glow)" opacity=".7"/>';
  o += '<path d="M62 321H80L77 316H65Z" fill="#2a2a44"/><rect x="63" y="321" width="16" height="20" rx="3" fill="#e0a64a" stroke="#2a2a44" stroke-width="1.6"/>';
  // Bäume
  o += tree(345, 394, .85, [[352, 380, 3, '#ef476f'], [334, 386, 3, '#ffd166'], [345, 364, 3, '#8ecae6'], [338, 376, 7.5, '#3d6fd0']]);
  o += tree(112, 380, 1, [[120, 366, 3.5, '#ffd166'], [108, 349, 3.4, '#8ecae6'], [125, 352, 3.2, '#ef476f'], [99, 360, 7.5, '#c2384f']]);
  o += tree(280, 388, 1.2, [[262, 360, 4, '#ef476f'], [276, 345, 3.6, '#8ecae6'], [290, 372, 4, '#ffd166'], [270, 330, 3.4, '#c77dff'], [298, 350, 8.5, '#ffd166']]);
  // Schlitten
  o += '<path d="M143 402Q172 407 200 402M198 402Q208 402 205 391" stroke="#d6a95a" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M150 394V402M190 394V402" stroke="#d6a95a" stroke-width="2"/>';
  o += '<rect x="142" y="388" width="58" height="12" rx="5" fill="#b5483a"/><rect x="150" y="376" width="16" height="12" rx="2" fill="#06d6a0"/><path d="M158 376V388M150 382H166" stroke="#ffd166" stroke-width="1.6"/>';
  // Briefkasten
  o += '<rect x="219.5" y="354" width="5" height="40" fill="#5a3b2a"/><path d="M205 354V338a17 13 0 0 1 34 0V354Z" fill="#b8384f"/><path d="M206 332Q222 318 238 332Q222 324 206 332Z" fill="#e7efff"/>';
  o += '<rect x="239" y="334" width="3" height="14" fill="#ffd166"/><rect x="239" y="334" width="9" height="5" rx="1" fill="#ffd166"/><rect x="213" y="350" width="18" height="2.4" rx="1" fill="#6e1f30"/>';
  // Geschenk
  o += '<rect x="374" y="391" width="22" height="19" rx="2" fill="#ef476f"/><rect x="372" y="387" width="26" height="7" rx="2" fill="#c2384f"/><path d="M385 387V394" stroke="#ffd166" stroke-width="3"/><path d="M385 387Q379 379 382 383M385 387Q391 379 388 383" stroke="#ffd166" stroke-width="2" fill="none"/>';
  return o + '<g class="under"></g><g class="nums"></g><g class="fx"></g>';
}

export function mount(root, ctx) {
  if (!document.getElementById('op-style-dorf')) {
    const st = document.createElement('style'); st.id = 'op-style-dorf'; st.textContent = CSS; document.head.appendChild(st);
  }
  const day = ctx.day, level = ctx.level;
  const played = new Set(ctx.played);
  const target = SPOTS[day - 1];
  const vis = SPOTS.filter(s => s[0] <= day);
  const size = 15 - 5 * level;             // Zahlenhöhe in Bildeinheiten
  const contrast = 1 - 0.55 * level;       // 1 = deutlich, kleiner = gedämpft

  root.innerHTML = '';
  root.classList.add('op-dorf');
  if (ctx.reduced) root.classList.add('rd');
  const wrap = document.createElement('div');
  wrap.innerHTML =
    `<div class="card"><div class="kicker">Finde die ${day} im Dorf</div><p class="riddle">${target[8]}</p><p class="riddle2">${target[9]}</p></div>`
    + `<svg class="scene" viewBox="0 0 400 420" role="group" aria-label="Verschneites Dorf bei Nacht mit versteckten Zahlen">${scene()}</svg>`
    + '<div class="status" role="status" aria-live="polite"></div>'
    + '<div class="row"><button class="btn tip" type="button">Tipp</button></div>';
  root.appendChild(wrap);

  const svg = wrap.querySelector('svg'), status = wrap.querySelector('.status');
  const r2 = wrap.querySelector('.riddle2'), tip = wrap.querySelector('.tip');
  const under = svg.querySelector('.under'), nums = svg.querySelector('.nums'), fx = svg.querySelector('.fx');
  let stage = 0, done = false;
  const say = t => { status.textContent = t; };

  // Gespielte Orte leuchten, Zahlen werden gezeichnet
  vis.forEach(s => {
    const [n, x, y, rot, bg, fg, mul, type] = s;
    const pl = played.has(n);
    if (pl) {
      el('circle', { cx: x, cy: y, r: 24, fill: 'url(#dorf-glow)' }, under);
      if (type === 'win') el('rect', { x: x - 9, y: y - 10, width: 18, height: 20, rx: 2, fill: '#ffd36a', stroke: '#3a2630', 'stroke-width': 1.6 }, under);
    }
    const nb = pl && type === 'win' ? '#ffd36a' : bg, nf = pl && type === 'win' ? '#a8641c' : fg;
    const g = el('g', { class: 'nm', tabindex: 0, role: 'button', 'aria-label': 'Zahl ' + n, 'data-n': n, transform: `translate(${x} ${y})` }, nums);
    el('circle', { class: 'fr', r: 15 }, g);
    el('circle', { class: 'hit', r: 22 }, g);
    const rg = el('g', { transform: `rotate(${rot})` }, g);
    const t = el('text', { class: 't', 'font-size': (size * mul).toFixed(1), fill: mix(nb, nf, contrast) }, rg);
    t.textContent = n;
    if (pl) el('polygon', { points: star(10, -10, 5.5, 2.4), fill: '#ffd166', stroke: '#7a4a10', 'stroke-width': .6 }, g);
  });

  const spot = n => vis.find(s => s[0] === n);
  function ring(x, y, color) {
    const c = el('circle', { class: 'ring', cx: x, cy: y, r: 9, fill: 'none', stroke: color, 'stroke-width': 2 }, fx);
    ctx.timeout(() => c.remove(), 700);
  }
  function glitter() {
    const [, x, y] = target;
    el('circle', { cx: x, cy: y, r: 46, fill: 'url(#dorf-glow)', opacity: .55 }, fx).setAttribute('pointer-events', 'none');
    [[-30, -14, 7], [24, -26, 6], [34, 10, 8], [-12, 30, 6], [-34, 16, 5], [8, -36, 6], [30, 32, 5], [-24, -34, 5]].forEach((p, i) => {
      const e = el('path', { class: 'gs', d: spark4(x + p[0], y + p[1], p[2]), fill: '#fff1b0' }, fx);
      e.style.animationDelay = (i * .22).toFixed(2) + 's';
    });
  }
  function pulse() {
    const [, x, y] = target;
    el('circle', { cx: x, cy: y, r: 15, fill: 'none', stroke: '#ffd166', 'stroke-width': 2.4, class: 'pulse' }, fx);
    el('circle', { cx: x, cy: y, r: 15, fill: 'none', stroke: '#fff1b0', 'stroke-width': 1.6, class: 'pulse', style: 'animation-delay:.65s' }, fx);
  }
  function setStage(s) {
    if (done || s <= stage) return;
    stage = Math.min(s, 3);
    if (stage >= 1) r2.classList.add('on');
    if (stage === 1) { tip.textContent = 'Noch ein Tipp'; say('Neuer Hinweis: ' + target[9]); }
    if (stage === 2) { ctx.hintUsed(); glitter(); tip.textContent = 'Noch ein Tipp'; say('Hier glitzert es. Die ' + day + ' ist ganz in der Nähe.'); }
    if (stage === 3) { ctx.hintUsed(); if (stage > 2 && !fx.querySelector('.gs')) glitter(); pulse(); tip.disabled = true; tip.textContent = 'Der Ring zeigt es'; say('Der Ring zeigt dir die ' + day + '.'); }
  }
  ctx.timeout(() => setStage(1), 20000);
  ctx.timeout(() => setStage(2), 40000);
  ctx.timeout(() => setStage(3), 60000);
  ctx.on(tip, 'click', () => setStage(stage + 1));

  function win() {
    done = true;
    const [n, x, y, , , , , type] = target;
    tip.disabled = true;
    fx.innerHTML = '';
    fx.setAttribute('pointer-events', 'none');
    if (n === 7) root.classList.add('open7');
    else if (type === 'win') el('rect', { class: 'litwin', x: x - 9, y: y - 10, width: 18, height: 20, rx: 2, fill: '#ffd36a', stroke: '#3a2630', 'stroke-width': 1.6 }, under);
    el('circle', { class: 'glow burst', cx: x, cy: y, r: 30, fill: 'url(#dorf-glow)' }, under);
    ring(x, y, '#ffd166');
    if (!ctx.reduced) {
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 36;
        const p = el('path', { class: 'spark', d: spark4(x, y, 3 + Math.random() * 3), fill: i % 2 ? '#ffd166' : '#fff1b0' }, fx);
        p.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px');
        p.style.setProperty('--dy', (Math.sin(a) * d - 8).toFixed(0) + 'px');
        p.style.animationDelay = (Math.random() * .15).toFixed(2) + 's';
      }
    }
    ctx.audio.sfx('coin');
    ctx.timeout(() => ctx.success(), ctx.reduced ? 150 : 850);
  }

  function choose(n) {
    if (done) return;
    const s = spot(n); if (!s) return;
    if (n === day) { win(); return; }
    ring(s[1], s[2], '#ffffff');
    const t = svg.querySelector(`.nm[data-n="${n}"] .t`);
    if (t) { t.classList.remove('wob'); void t.getBoundingClientRect(); t.classList.add('wob'); }
    ctx.audio.sfx('pop');
    say(played.has(n) ? `Das ist die ${n}. Die hast du schon gespielt ⭐` : `Das ist die ${n}. Die war schon dran, gesucht ist die ${day}.`);
  }

  ctx.on(svg, 'click', e => {
    if (done) return;
    const m = svg.getScreenCTM(); if (!m) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(m.inverse());
    const reach = Math.max(22, 20 / (m.a || 1)); // mindestens ca. 40px breit
    let best = null, bd = 1e9;
    vis.forEach(s => { const d = Math.hypot(q.x - s[1], q.y - s[2]); if (d < bd) { bd = d; best = s; } });
    if (best && bd <= reach) choose(best[0]);
  });
  ctx.on(svg, 'keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const g = e.target.closest?.('.nm'); if (!g) return;
    e.preventDefault(); choose(+g.dataset.n);
  });

  say(`Tippe im Dorf auf die kleinen Zahlen. Gesucht ist die ${day}.`);
  return { destroy() { root.classList.remove('op-dorf', 'rd', 'open7'); } };
}
