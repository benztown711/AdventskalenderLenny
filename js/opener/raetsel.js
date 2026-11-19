// Knobel-Rätsel für das Zahlenschloss: Rechnen, Deutsch und Wissen in drei Stufen (Niveau Klasse 4).
// Jedes Rätsel ist eine Zahl als Lösung. Alles wird aus Vorlagen erzeugt, damit es immer stimmt.
// Rätsel-Objekt: { cat, lvl, kind, q, vis, a, tips: [html, html], sol }

export const LEVELS = [
  { id: 1, label: 'Leicht', dot: '🟢' },
  { id: 2, label: 'Mittel', dot: '🟡' },
  { id: 3, label: 'Knifflig', dot: '🔴' },
];
export const CATS = [
  { id: 'mix', label: 'Mix', icon: '🎲' },
  { id: 'mathe', label: 'Rechnen', icon: '➗' },
  { id: 'deutsch', label: 'Deutsch', icon: '✏️' },
  { id: 'wissen', label: 'Wissen', icon: '🌍' },
];

// ---------- Hilfen ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function tools(rng) {
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return { ri, pick, shuffle };
}
const term = s => `<div class="r-term">${s}</div>`;

// =====================================================================
// RECHNEN
// =====================================================================
function kopf(lvl, T) {
  const { ri, pick } = T;
  const k = pick(lvl === 1 ? ['add', 'sub', 'mul', 'half'] : lvl === 2 ? ['add', 'sub', 'div', 'mul', 'gap'] : ['pvs', 'pvs2', 'klammer', 'zwei', 'div']);
  let show, a, tips, sol;
  if (lvl === 1) {
    if (k === 'add') { const x = ri(11, 79), y = ri(3, Math.min(20, 100 - x)); a = x + y; show = `${x} + ${y}`; tips = ['Rechne in zwei Schritten: erst bis zum nächsten Zehner, dann den Rest.', y >= 10 && y % 10 ? `Erst ${x} + ${y - y % 10} = ${x + y - y % 10}, dann noch + ${y % 10}.` : x % 10 ? `Bis zum nächsten Zehner fehlen ${10 - x % 10}.` : `Zähle von ${x} aus ${y} weiter.`]; }
    if (k === 'sub') { const x = ri(30, 99), y = ri(4, 19); a = x - y; show = `${x} − ${y}`; const e = x % 10; tips = ['Zerlege die zweite Zahl: erst die Zehner weg, dann die Einer.', y >= 10 ? `Erst ${x} − 10 = ${x - 10}, dann noch − ${y - 10}.` : e >= y ? `Schau nur auf die Einer: ${e} − ${y} = ${e - y}.` : e ? `Erst ${x} − ${e} = ${x - e}, dann noch − ${y - e}.` : `Geh von ${x} aus ${y} Schritte zurück.`]; }
    if (k === 'mul') { const x = ri(3, 10), y = ri(3, 9); a = x * y; show = `${x} · ${y}`; tips = ['Das ist eine Aufgabe aus dem Einmaleins.', `Tipp: ${x} · ${y - 1} = ${x * (y - 1)}. Jetzt noch einmal ${x} dazu.`]; }
    if (k === 'half') { let x; do x = 2 * ri(6, 49); while (x % 10 === 0); a = x / 2; show = `Die Hälfte von ${x}`; tips = ['Halbiere die Zehner und die Einer einzeln.', `Die Hälfte von ${x - x % 10} ist ${(x - x % 10) / 2}${x % 10 ? `, die Hälfte von ${x % 10} ist ${x % 10 / 2}` : ''}.`]; }
    sol = `${show} = <b>${a}</b>`;
  } else if (lvl === 2) {
    if (k === 'add') { const x = ri(25, 89), y = ri(25, 89); a = x + y; show = `${x} + ${y}`; tips = ['Rechne erst die Zehner zusammen, dann die Einer.', `Zehner: ${x - x % 10} + ${y - y % 10} = ${x - x % 10 + y - y % 10}. Einer: ${x % 10} + ${y % 10} = ${x % 10 + y % 10}.`]; }
    if (k === 'sub') { const x = ri(120, 240), y = ri(35, 98); a = x - y; show = `${x} − ${y}`; tips = ['Ziehe erst die Zehner ab, dann die Einer.', y % 10 ? `${x} − ${y - y % 10} = ${x - y + y % 10}. Jetzt noch − ${y % 10}.` : `${y} sind ${y / 10} Zehner. Zieh sie Schritt für Schritt von ${x} ab.`]; }
    if (k === 'div') { const y = ri(3, 9), q = ri(4, 10); const x = y * q; a = q; show = `${x} : ${y}`; tips = ['Geteilt ist die Umkehrung von mal. Frag dich: Wie oft passt die zweite Zahl hinein?', `Welche Zahl mal ${y} ergibt ${x}?`]; }
    if (k === 'mul') { let x; do x = ri(12, 25); while (x % 10 === 0); const y = ri(3, 6); a = x * y; show = `${x} · ${y}`; tips = ['Zerlege die große Zahl in Zehner und Einer.', `${x - x % 10} · ${y} = ${(x - x % 10) * y} und ${x % 10} · ${y} = ${(x % 10) * y}.`]; }
    if (k === 'gap') {
      if (T.ri(0, 1)) { const y = ri(3, 9), q = ri(4, 10); a = q; show = `${y} · ☐ = ${y * q}`; tips = ['Welche Zahl fehlt im Kästchen?', `Rechne umgekehrt: ${y * q} : ${y}.`]; }
      else { const x = ri(15, 60), y = ri(20, 39); a = x; show = `☐ + ${y} = ${x + y}`; tips = ['Welche Zahl fehlt im Kästchen?', `Rechne umgekehrt: ${x + y} − ${y}.`]; }
      return { kind: 'Kopfrechnen', q: 'Welche Zahl gehört ins Kästchen?', vis: term(show), a, tips, sol: `☐ = <b>${a}</b>, denn ${show.replace('☐', a)}.` };
    }
    sol = `${show} = <b>${a}</b>`;
  } else {
    if (k === 'pvs') { const x = ri(5, 40), y = ri(3, 9), z = ri(3, 9); a = x + y * z; show = `${x} + ${y} · ${z}`; tips = ['Achtung: Punkt vor Strich! Erst malnehmen, dann plus.', `${y} · ${z} = ${y * z}.`]; sol = `${y} · ${z} = ${y * z}, dann ${x} + ${y * z} = <b>${a}</b>`; }
    if (k === 'pvs2') { const y = ri(4, 9), z = ri(4, 9), x = ri(3, Math.min(30, y * z - 1)); a = y * z - x; show = `${y} · ${z} − ${x}`; tips = ['Punkt vor Strich: erst malnehmen, dann minus.', `${y} · ${z} = ${y * z}.`]; sol = `${y} · ${z} = ${y * z}, dann ${y * z} − ${x} = <b>${a}</b>`; }
    if (k === 'klammer') { const x = ri(3, 12), y = ri(2, 9), z = ri(3, 8); a = (x + y) * z; show = `(${x} + ${y}) · ${z}`; tips = ['Was in der Klammer steht, rechnest du zuerst.', `${x} + ${y} = ${x + y}.`]; sol = `${x} + ${y} = ${x + y}, dann ${x + y} · ${z} = <b>${a}</b>`; }
    if (k === 'zwei') { const w = ri(2, 9), x = ri(3, 9), y = ri(2, 9), z = ri(3, 9); a = w * x + y * z; show = `${w} · ${x} + ${y} · ${z}`; tips = ['Punkt vor Strich: Rechne beide Malaufgaben zuerst.', `${w} · ${x} = ${w * x} und ${y} · ${z} = ${y * z}.`]; sol = `${w * x} + ${y * z} = <b>${a}</b>`; }
    if (k === 'div') { const y = ri(3, 8); let q; do q = ri(12, 40); while (q % 10 === 0); const x = y * q; a = q; show = `${x} : ${y}`; tips = ['Zerlege die große Zahl in zwei Teile, die sich gut teilen lassen.', `Zum Beispiel: ${y * 10} : ${y} = 10. Wie viel bleibt dann noch übrig?`]; sol = `${x} : ${y} = <b>${a}</b>, denn ${a} · ${y} = ${x}.`; }
  }
  return { kind: 'Kopfrechnen', q: 'Rechne aus:', vis: term(`${show} = ?`), a, tips, sol };
}

const SYM = ['🍎', '🍌', '🍐', '⭐', '🎁', '🔔', '🍪', '⛄', '🧦', '🎄'];
function bilder(lvl, T) {
  const { ri, shuffle, pick } = T;
  const [A, B, C] = shuffle(SYM);
  const rep = (s, n) => Array(n).fill(s).join(' + ');
  const rows = [];
  let ask, a, tips, sol;
  if (lvl === 1) {
    const va = ri(2, 10), vb = ri(1, 10);
    if (ri(0, 1)) {
      rows.push(`${A} + ${A} = ${2 * va}`, `${A} + ${B} = ${va + vb}`); ask = `${B} = ?`; a = vb;
      tips = [`Fang oben an: Zwei gleiche Bilder ergeben ${2 * va}. Wie viel ist dann eines?`, `${A} = ${va}. Jetzt die zweite Zeile: ${va} + ${B} = ${va + vb}.`];
      sol = `${A} = ${va}, also ${B} = ${va + vb} − ${va} = <b>${vb}</b>`;
    } else {
      rows.push(`${A} + ${A} + ${A} = ${3 * va}`, `${B} + ${B} = ${2 * vb}`); ask = `${A} + ${B} = ?`; a = va + vb;
      tips = ['Finde zuerst heraus, wie viel ein einzelnes Bild wert ist.', `${A} = ${va} und ${B} = ${vb}.`];
      sol = `${A} = ${va}, ${B} = ${vb}, also ${va} + ${vb} = <b>${a}</b>`;
    }
  } else if (lvl === 2) {
    if (ri(0, 1)) {
      const va = ri(3, 12), n = ri(3, 5), vb = ri(2, 9);
      rows.push(`${A} + ${A} = ${2 * va}`, `${rep(B, n)} + ${A} = ${n * vb + va}`); ask = `${B} = ?`; a = vb;
      tips = [`Fang mit der ersten Zeile an. Dann weißt du, wie viel ${A} wert ist.`, `${A} = ${va}. Also sind ${n} · ${B} zusammen ${n * vb + va} − ${va} = ${n * vb}.`];
      sol = `${A} = ${va}. ${n} · ${B} = ${n * vb}, also ${B} = <b>${vb}</b>`;
    } else {
      const va = ri(2, 9), vb = ri(2, 9), vc = ri(2, 9);
      rows.push(`${A} + ${A} + ${A} = ${3 * va}`, `${A} + ${B} = ${va + vb}`, `${B} + ${C} = ${vb + vc}`); ask = `${C} = ?`; a = vc;
      tips = ['Arbeite dich von oben nach unten durch: Jede Zeile verrät ein neues Bild.', `${A} = ${va}, ${B} = ${vb}.`];
      sol = `${A} = ${va}, ${B} = ${vb}, ${C} = ${vb + vc} − ${vb} = <b>${vc}</b>`;
    }
  } else {
    const v = ri(0, 2);
    if (v === 0) {
      const va = ri(2, 6), vb = ri(2, 6), vc = ri(1, 12);
      rows.push(`${A} + ${A} + ${A} = ${3 * va}`, `${A} · ${B} = ${va * vb}`, `${C} + ${B} · ${B} = ${vc + vb * vb}`); ask = `${C} = ?`; a = vc;
      tips = ['Achtung in der letzten Zeile: Punkt vor Strich!', `${A} = ${va}, ${B} = ${vb}, also ${B} · ${B} = ${vb * vb}.`];
      sol = `${A} = ${va}, ${B} = ${vb}. ${C} + ${vb * vb} = ${vc + vb * vb}, also ${C} = <b>${vc}</b>`;
    } else if (v === 1) {
      const vb = ri(2, 15), va = vb + ri(2, 12);
      rows.push(`${A} + ${B} = ${va + vb}`, `${A} − ${B} = ${va - vb}`); ask = `${A} = ?`; a = va;
      tips = [`${A} ist um ${va - vb} größer als ${B}. Zusammen sind beide ${va + vb}.`, `Nimm ${va + vb}, ziehe ${va - vb} ab und teile den Rest durch 2. Das ist ${B}.`];
      sol = `${B} = (${va + vb} − ${va - vb}) : 2 = ${vb}, also ${A} = ${vb} + ${va - vb} = <b>${va}</b>`;
    } else {
      const va = ri(2, 9), vb = ri(2, 9);
      rows.push(`${A} + ${A} + ${B} = ${2 * va + vb}`, `${A} + ${B} = ${va + vb}`); ask = `${A} · ${B} = ?`; a = va * vb;
      tips = ['Vergleiche die beiden Zeilen. Was ist oben mehr als unten?', `Oben ist genau ein ${A} mehr. Also ${A} = ${2 * va + vb} − ${va + vb} = ${va}.`];
      sol = `${A} = ${va}, ${B} = ${vb}, also ${va} · ${vb} = <b>${a}</b>`;
    }
  }
  const vis = `<div class="r-eqs">${rows.map(r => `<div>${r}</div>`).join('')}<div class="ask">${ask}</div></div>`;
  return { kind: 'Bilder-Rätsel', q: pick(['Jedes Bild steht für eine Zahl. Gleiche Bilder, gleiche Zahl.', 'Gleiche Bilder haben den gleichen Wert. Knackst du den Code?']), vis, a, tips, sol };
}

function folge(lvl, T) {
  const { ri, pick } = T;
  let nums, a, tips, sol, gapAt = -1;
  const v = lvl === 1 ? pick(['up', 'down']) : lvl === 2 ? pick(['grow', 'alt', 'double', 'gap']) : pick(['zip', 'x2p1', 'square', 'fib', 'grow2']);
  if (v === 'up') { const s = ri(1, 20), k = ri(2, 10); nums = [0, 1, 2, 3, 4].map(i => s + i * k); a = s + 5 * k; tips = ['Wie groß ist der Abstand von einer Zahl zur nächsten?', `Es geht immer + ${k}.`]; sol = `Immer + ${k}: ${nums[4]} + ${k} = <b>${a}</b>`; }
  if (v === 'down') { const k = ri(2, 9), s = ri(6 * k + 1, 6 * k + 40); nums = [0, 1, 2, 3, 4].map(i => s - i * k); a = s - 5 * k; tips = ['Die Zahlen werden kleiner. Um wie viel?', `Es geht immer − ${k}.`]; sol = `Immer − ${k}: ${nums[4]} − ${k} = <b>${a}</b>`; }
  if (v === 'grow') { const s = ri(1, 15), k = ri(1, 3); nums = [s]; for (let i = 0; i < 4; i++) nums.push(nums[i] + k + i); a = nums[4] + k + 4; tips = ['Schreib dir die Abstände zwischen den Zahlen auf.', `Die Abstände sind ${[0, 1, 2, 3].map(i => '+' + (k + i)).join(', ')} … und dann?`]; sol = `Der Abstand wächst jedes Mal um 1. Als Nächstes + ${k + 4}: <b>${a}</b>`; }
  if (v === 'alt') { const p = ri(5, 12), m = ri(2, p - 2), s = ri(2, 20); nums = [s]; for (let i = 0; i < 5; i++) nums.push(nums[i] + (i % 2 ? -m : p)); a = nums[5] - m; tips = ['Es geht immer abwechselnd hoch und runter.', `Abwechselnd + ${p} und − ${m}.`]; sol = `Abwechselnd + ${p} und − ${m}: ${nums[5]} − ${m} = <b>${a}</b>`; }
  if (v === 'double') { const s = ri(1, 6); nums = [0, 1, 2, 3, 4].map(i => s * 2 ** i); a = s * 32; tips = ['Hier wird nicht plus gerechnet. Schau, wie schnell die Zahlen wachsen!', 'Jede Zahl ist das Doppelte der vorigen.']; sol = `Immer verdoppeln: ${nums[4]} · 2 = <b>${a}</b>`; }
  if (v === 'gap') { const s = ri(2, 30), k = ri(3, 12); nums = [0, 1, 2, 3, 4, 5].map(i => s + i * k); gapAt = ri(1, 4); a = nums[gapAt]; tips = ['Finde den Abstand zwischen zwei Nachbarn, die beide dastehen.', `Es geht immer + ${k}.`]; sol = `Immer + ${k}: ${nums[gapAt - 1]} + ${k} = <b>${a}</b>`; }
  if (v === 'zip') { const s1 = ri(1, 6), k1 = ri(2, 4), s2 = ri(30, 50), k2 = ri(2, 5); nums = []; for (let i = 0; i < 3; i++) nums.push(s1 + i * k1, s2 - i * k2); a = s1 + 3 * k1; tips = ['Hier sind zwei Zahlenfolgen ineinander versteckt. Schau auf jede zweite Zahl!', `Die 1., 3. und 5. Zahl: ${nums[0]}, ${nums[2]}, ${nums[4]} … immer + ${k1}.`]; sol = `Jede zweite Zahl wächst um ${k1}: ${nums[4]} + ${k1} = <b>${a}</b>`; }
  if (v === 'x2p1') { const s = ri(1, 4); nums = [s]; for (let i = 0; i < 4; i++) nums.push(nums[i] * 2 + 1); a = nums[4] * 2 + 1; tips = ['Die Zahlen wachsen immer schneller. Vergleiche jede Zahl mit dem Doppelten der vorigen.', `${nums[1]} = ${nums[0]} · 2 + 1.`]; sol = `Immer · 2 + 1: ${nums[4]} · 2 + 1 = <b>${a}</b>`; }
  if (v === 'square') { const s = ri(1, 5); nums = [0, 1, 2, 3, 4].map(i => (s + i) ** 2); a = (s + 5) ** 2; tips = ['Denk an das Einmaleins mit sich selbst: 3 · 3, 4 · 4 …', `${nums[0]} = ${s} · ${s}, ${nums[1]} = ${s + 1} · ${s + 1}.`]; sol = `Quadratzahlen: ${s + 5} · ${s + 5} = <b>${a}</b>`; }
  if (v === 'fib') { const x = ri(1, 4), y = ri(x, x + 4); nums = [x, y]; for (let i = 2; i < 6; i++) nums.push(nums[i - 1] + nums[i - 2]); a = nums[4] + nums[5]; tips = ['Jede Zahl hängt mit den zwei Zahlen davor zusammen.', `${nums[2]} = ${nums[0]} + ${nums[1]}.`]; sol = `Immer die zwei Zahlen davor zusammen: ${nums[4]} + ${nums[5]} = <b>${a}</b>`; }
  if (v === 'grow2') { const s = ri(1, 10); nums = [s]; for (let i = 0; i < 4; i++) nums.push(nums[i] + 2 * (i + 1)); a = nums[4] + 10; tips = ['Schreib dir die Abstände zwischen den Zahlen auf.', 'Die Abstände sind +2, +4, +6, +8 … und dann?']; sol = `Der Abstand wächst um 2. Als Nächstes + 10: <b>${a}</b>`; }
  const cells = nums.map((x, i) => i === gapAt ? '<span class="ask">?</span>' : `<span>${x}</span>`);
  if (gapAt < 0) cells.push('<span class="ask">?</span>');
  return { kind: 'Zahlenfolge', q: gapAt < 0 ? 'Welche Zahl kommt als Nächstes?' : 'Welche Zahl fehlt?', vis: `<div class="r-folge">${cells.join('')}</div>`, a, tips, sol };
}

function mauer(lvl, T) {
  const { ri } = T;
  // Zeilen von unten nach oben; jede Zelle {v, show: 'num'|'empty'|'ask'}
  let base, rows, a, tips, sol;
  const build = b => { const r = [b]; while (r[r.length - 1].length > 1) { const p = r[r.length - 1]; r.push(p.slice(1).map((x, i) => p[i] + x)); } return r; };
  if (lvl === 1) {
    base = [ri(2, 20), ri(2, 20), ri(2, 20)]; rows = build(base);
    const show = rows.map((r, y) => r.map(() => y === 0 ? 'num' : y === 2 ? 'ask' : 'empty'));
    a = rows[2][0];
    tips = ['Zwei Steine nebeneinander ergeben zusammen den Stein darüber.', `Die mittlere Reihe: ${rows[1][0]} und ${rows[1][1]}.`];
    sol = `${base[0]} + ${base[1]} = ${rows[1][0]}, ${base[1]} + ${base[2]} = ${rows[1][1]}, oben: <b>${a}</b>`;
    return mk(rows, show);
  }
  if (lvl === 2) {
    base = [ri(3, 20), ri(3, 20), ri(3, 20)]; rows = build(base);
    const show = [['num', 'empty', 'num'], ['num', 'empty'], ['ask']];
    a = rows[2][0];
    tips = ['Die fehlende Zahl unten bekommst du durch Minusrechnen.', `Unten in der Mitte: ${rows[1][0]} − ${base[0]} = ${base[1]}.`];
    sol = `Unten Mitte: ${base[1]}. Mittlere Reihe: ${rows[1][0]} und ${rows[1][1]}. Oben: <b>${a}</b>`;
    return mk(rows, show);
  }
  base = [ri(2, 12), ri(2, 12), ri(2, 12), ri(2, 12)]; rows = build(base);
  const show = [['num', 'num', 'empty', 'num'], ['empty', 'num', 'empty'], ['empty', 'empty'], ['ask']];
  a = rows[3][0];
  tips = ['Finde zuerst die fehlende Zahl in der untersten Reihe.', `Unten fehlt ${rows[1][1]} − ${base[1]} = ${base[2]}.`];
  sol = `Unten: ${base.join(', ')}. Dann ${rows[1].join(', ')}, dann ${rows[2].join(', ')}, oben: <b>${a}</b>`;
  return mk(rows, show);
  function mk(r, show) {
    const html = r.slice().reverse().map((row, yi) => {
      const y = r.length - 1 - yi;
      return `<div class="row">${row.map((v, x) => show[y][x] === 'num' ? `<span>${v}</span>` : show[y][x] === 'ask' ? '<span class="ask">?</span>' : '<span class="empty"></span>').join('')}</div>`;
    }).join('');
    return { kind: 'Rechenmauer', q: 'Zwei Steine nebeneinander ergeben zusammen den Stein darüber. Welche Zahl steht ganz oben?', vis: `<div class="r-mauer">${html}</div>`, a, tips, sol };
  }
}

function sach(lvl, T) {
  const { ri, pick } = T;
  const L1 = [
    () => { const k = ri(2, 9), d = ri(3, 10); return { q: `Ein Wichtel packt jeden Tag ${k} Geschenke ein. Wie viele Geschenke hat er nach ${d} Tagen eingepackt?`, a: k * d, tips: ['Jeden Tag gleich viele: Das ist eine Malaufgabe.', `Rechne ${d} · ${k}.`], sol: `${d} · ${k} = <b>${k * d}</b> Geschenke` }; },
    () => { const x = ri(24, 60), y = ri(6, x - 5); return { q: `In der Plätzchendose liegen ${x} Plätzchen. Die Familie nascht ${y} davon. Wie viele Plätzchen sind noch in der Dose?`, a: x - y, tips: ['Es werden weniger: Rechne minus.', `Rechne ${x} − ${y}.`], sol: `${x} − ${y} = <b>${x - y}</b> Plätzchen` }; },
    () => { const n = ri(2, 8), k = ri(2, 9); return { q: `${n} Kinder teilen ${n * k} Lebkuchen gerecht auf. Wie viele Lebkuchen bekommt jedes Kind?`, a: k, tips: ['Gerecht teilen heißt: geteilt rechnen.', `Rechne ${n * k} : ${n}.`], sol: `${n * k} : ${n} = <b>${k}</b> Lebkuchen` }; },
    () => { const x = ri(8, 40), y = ri(8, 40); return { q: `Am Weihnachtsbaum hängen ${x} rote und ${y} goldene Kugeln. Wie viele Kugeln sind es zusammen?`, a: x + y, tips: ['Zusammen heißt: plus.', `Rechne ${x} + ${y}.`], sol: `${x} + ${y} = <b>${x + y}</b> Kugeln` }; },
    () => { const k = ri(5, 25); return { q: `Die Pause dauert eine halbe Stunde und noch ${k} Minuten. Wie viele Minuten sind das?`, a: 30 + k, tips: ['Wie viele Minuten hat eine halbe Stunde?', 'Eine halbe Stunde hat 30 Minuten.'], sol: `30 + ${k} = <b>${30 + k}</b> Minuten` }; },
  ];
  const L2 = [
    () => { const p = ri(2, 6), k = ri(2, 4), s = pick([10, 20, 50].filter(s => s > p * k)); return { q: `Ein Lebkuchenherz kostet ${p} €. Du kaufst ${k} Stück und bezahlst mit einem ${s}-€-Schein. Wie viel Euro bekommst du zurück?`, a: s - p * k, tips: ['Rechne zuerst aus, wie viel alle Herzen zusammen kosten.', `${k} · ${p} € = ${k * p} €.`], sol: `${k} · ${p} € = ${k * p} €, ${s} € − ${k * p} € = <b>${s - p * k}</b> €` }; },
    () => { const h = ri(14, 18), m1 = pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]), d = ri(7, 22) * 5; const e = h * 60 + m1 + d; const end = `${Math.floor(e / 60)}:${String(e % 60).padStart(2, '0')}`; return { q: `Der Weihnachtsfilm beginnt um ${h}:${String(m1).padStart(2, '0')} Uhr und endet um ${end} Uhr. Wie viele Minuten dauert er?`, a: d, tips: ['Rechne erst bis zur nächsten vollen Stunde, dann weiter.', `Von ${h}:${String(m1).padStart(2, '0')} bis ${h + 1}:00 sind es ${60 - m1} Minuten.`], sol: `${60 - m1} Minuten bis ${h + 1}:00, dann noch ${d - (60 - m1)} Minuten: <b>${d}</b> Minuten` }; },
    () => { const x = ri(15, 40), y = ri(4, 12); let z; do z = ri(3, 15); while (z === y); return { q: `Im Bus sitzen ${x} Leute. An der Haltestelle steigen ${y} aus und ${z} ein. Wie viele Leute sind jetzt im Bus?`, a: x - y + z, tips: ['Aussteigen heißt minus, einsteigen heißt plus.', `${x} − ${y} = ${x - y}.`], sol: `${x} − ${y} + ${z} = <b>${x - y + z}</b> Leute` }; },
    () => { const m = ri(1, 3), c = ri(5, 95); return { q: `Wie viele Zentimeter sind ${m} m und ${c} cm?`, a: m * 100 + c, tips: ['Ein Meter hat 100 Zentimeter.', `${m} m = ${m * 100} cm.`], sol: `${m * 100} cm + ${c} cm = <b>${m * 100 + c}</b> cm` }; },
    () => { const h = ri(1, 3), m = ri(1, 11) * 5; return { q: `Wie viele Minuten sind ${h} ${h === 1 ? 'Stunde' : 'Stunden'} und ${m} Minuten?`, a: h * 60 + m, tips: ['Eine Stunde hat 60 Minuten.', `${h} · 60 = ${h * 60}.`], sol: `${h * 60} + ${m} = <b>${h * 60 + m}</b> Minuten` }; },
    () => { const n = ri(1, 8); return { q: `Ein Fußballspiel hat zwei Halbzeiten mit je 45 Minuten. Dazu kommen ${n} Minuten Nachspielzeit. Wie viele Minuten dauert das Spiel insgesamt?`, a: 90 + n, tips: ['Rechne erst beide Halbzeiten zusammen.', '45 + 45 = 90.'], sol: `90 + ${n} = <b>${90 + n}</b> Minuten` }; },
    () => { const x = ri(3, 15), y = ri(2, 10); return { q: `Ein Rechteck ist ${x} cm lang und ${y} cm breit. Wie viele Zentimeter ist sein Umfang?`, a: 2 * (x + y), tips: ['Der Umfang ist der Weg einmal ganz außen herum: alle vier Seiten zusammen.', `${x} + ${y} + ${x} + ${y}.`], sol: `${x} + ${y} + ${x} + ${y} = <b>${2 * (x + y)}</b> cm` }; },
    () => { const x = ri(3, 10), y = ri(2, 9); return { q: `Ein Beet ist ${x} m lang und ${y} m breit. Wie viele Quadratmeter ist es groß?`, a: x * y, tips: ['Stell dir Quadrate von 1 m mal 1 m vor. Wie viele passen hinein?', `${y} Reihen mit je ${x} Quadraten.`], sol: `${x} · ${y} = <b>${x * y}</b> m²` }; },
  ];
  const L3 = [
    () => { const k = pick([4, 5, 6, 8]), p = ri(2, 6), n = ri(2, 5); return { q: `Eine Packung mit ${k} Kerzen kostet ${p} €. Für den Adventsbasar brauchst du ${k * n} Kerzen. Wie viel Euro musst du bezahlen?`, a: n * p, tips: ['Wie viele Packungen brauchst du?', `${k * n} : ${k} = ${n} Packungen.`], sol: `${n} Packungen · ${p} € = <b>${n * p}</b> €` }; },
    () => { const s = ri(4, 9), d = ri(1, 5); return { q: `Ein Junge ist ${d} ${d === 1 ? 'Jahr' : 'Jahre'} älter als seine Schwester. Zusammen sind sie ${2 * s + d} Jahre alt. Wie alt ist der Junge?`, a: s + d, tips: [`Nimm die ${d} ${d === 1 ? 'Jahr' : 'Jahre'} Unterschied weg. Dann sind beide gleich alt.`, `${2 * s + d} − ${d} = ${2 * s}. Teile das durch 2: So alt ist die Schwester.`], sol: `Schwester: (${2 * s + d} − ${d}) : 2 = ${s}. Junge: ${s} + ${d} = <b>${s + d}</b>` }; },
    () => { const x = ri(3, 25), b = ri(2, 15); return { q: `Ich denke mir eine Zahl. Ich verdopple sie und zähle ${b} dazu. Dann erhalte ich ${2 * x + b}. Wie heißt meine Zahl?`, a: x, tips: ['Rechne rückwärts! Mach alles in umgekehrter Reihenfolge.', `Erst ${2 * x + b} − ${b} = ${2 * x}, dann halbieren.`], sol: `${2 * x + b} − ${b} = ${2 * x}, ${2 * x} : 2 = <b>${x}</b>` }; },
    () => { const x = ri(2, 12), m = ri(3, 5), b = ri(1, Math.min(9, m * x - 1)); return { q: `Ich denke mir eine Zahl. Ich nehme sie mal ${m} und ziehe ${b} ab. Dann erhalte ich ${m * x - b}. Wie heißt meine Zahl?`, a: x, tips: ['Rechne rückwärts: Aus minus wird plus, aus mal wird geteilt.', `Erst ${m * x - b} + ${b} = ${m * x}.`], sol: `${m * x - b} + ${b} = ${m * x}, ${m * x} : ${m} = <b>${x}</b>` }; },
    () => { const t = ri(4, 10), k = ri(1, t - 1); const l = 4 * k + 2 * (t - k); return { q: `Auf einem Bauernhof gibt es nur Hühner und Kühe. Zusammen sind es ${t} Tiere mit ${l} Beinen. Wie viele Kühe sind es?`, a: k, tips: [`Stell dir vor, alle ${t} Tiere wären Hühner. Wie viele Beine wären das?`, `${t} Hühner hätten ${2 * t} Beine. Es fehlen ${l - 2 * t} Beine. Jede Kuh hat 2 Beine mehr als ein Huhn.`], sol: `${l - 2 * t} : 2 = <b>${k}</b> ${k === 1 ? 'Kuh' : 'Kühe'} (und ${t - k} ${t - k === 1 ? 'Huhn' : 'Hühner'})` }; },
    () => { const x = ri(3, 12), d = ri(2, 9); const s = 5 * x + d; return { q: `Drei Kinder sammeln Tannenzapfen. Das zweite Kind hat doppelt so viele wie das erste. Das dritte hat ${d} mehr als das zweite. Zusammen sind es ${s}. Wie viele hat das erste Kind?`, a: x, tips: [`Das erste Kind hat einen Teil. Das zweite zwei Teile, das dritte zwei Teile und noch ${d}.`, `Das sind 5 Teile und ${d}. Also 5 Teile = ${s} − ${d} = ${5 * x}.`], sol: `5 Teile = ${5 * x}, ein Teil = <b>${x}</b> Zapfen` }; },
    () => { const p = ri(2, 4), k = ri(2, 5), f = ri(5, 12), s = pick([20, 30, 50].filter(s => s > p * k + f)); return { q: `Du hast ${s} €. Du kaufst ${k} Hefte für je ${p} € und einen Füller für ${f} €. Wie viel Euro bleiben dir übrig?`, a: s - p * k - f, tips: ['Rechne zuerst aus, wie viel du insgesamt ausgibst.', `Hefte: ${k} · ${p} € = ${k * p} €. Dazu der Füller.`], sol: `${k * p} € + ${f} € = ${k * p + f} €, ${s} € − ${k * p + f} € = <b>${s - p * k - f}</b> €` }; },
    () => { const b = ri(3, 8), n = ri(3, 9), x = ri(10, 40); return { q: `Ein Schal ist schon ${x} cm lang. Oma strickt jeden Tag ${b} cm weiter. Nach wie vielen Tagen ist der Schal ${x + b * n} cm lang?`, a: n, tips: ['Wie viele Zentimeter fehlen noch?', `Es fehlen ${x + b * n} − ${x} = ${b * n} cm.`], sol: `${b * n} cm : ${b} cm = <b>${n}</b> Tage` }; },
  ];
  const r = pick(lvl === 1 ? L1 : lvl === 2 ? L2 : L3)();
  return { kind: 'Sachaufgabe', q: r.q, vis: '', a: r.a, tips: r.tips, sol: r.sol };
}

function mathe(lvl, T) {
  return T.pick([kopf, kopf, bilder, bilder, folge, mauer, sach, sach])(lvl, T);
}

// =====================================================================
// DEUTSCH
// =====================================================================
// [Wort|N] = Nomen, [Wort|V] = Verb, [Wort|A] = Adjektiv. Ohne Klammer: andere Wortart.
const SAETZE = [
  'Der [kleine|A] [Schneemann|N] [trägt|V] einen [roten|A] [Schal|N].',
  'Im [Garten|N] [liegt|V] [weißer|A] [Schnee|N].',
  'Die [Kinder|N] [bauen|V] eine [große|A] [Schneeburg|N].',
  '[Oma|N] [backt|V] [leckere|A] [Plätzchen|N] mit [Zimt|N].',
  'Am [Abend|N] [leuchten|V] die [bunten|A] [Lichter|N] am [Tannenbaum|N].',
  'Der [Torwart|N] [hält|V] den [scharfen|A] [Schuss|N].',
  'Wir [singen|V] [fröhliche|A] [Lieder|N] und [trinken|V] [heißen|A] [Kakao|N].',
  'Das [Rentier|N] [zieht|V] den [schweren|A] [Schlitten|N] über das [Eis|N].',
  'Mein [Bruder|N] [findet|V] ein [kleines|A] [Geschenk|N] unter dem [Bett|N].',
  'Die [kalte|A] [Luft|N] [kribbelt|V] in der [Nase|N].',
  'Der [Weihnachtsmann|N] [bringt|V] den [braven|A] [Kindern|N] [schöne|A] [Geschenke|N].',
  'Im [Stadion|N] [jubeln|V] die [Fans|N], als der [Ball|N] ins [Tor|N] [fliegt|V].',
  '[Papa|N] [schmückt|V] den [hohen|A] [Baum|N] mit [goldenen|A] [Kugeln|N].',
  'Die [Katze|N] [schläft|V] auf dem [warmen|A] [Sofa|N].',
  'Der [Nikolaus|N] [füllt|V] die [Stiefel|N] mit [Nüssen|N] und [Mandarinen|N].',
  'Auf dem [Markt|N] [riecht|V] es nach [süßen|A] [Waffeln|N].',
  'Der [Wind|N] [pfeift|V] um das [alte|A] [Haus|N].',
  'Die [Lehrerin|N] [erzählt|V] eine [spannende|A] [Geschichte|N].',
  'Mein [Freund|N] [schießt|V] ein [tolles|A] [Tor|N] und [jubelt|V].',
  '[Kleine|A] [Sterne|N] [glitzern|V] am [dunklen|A] [Himmel|N].',
  'Der [freche|A] [Hund|N] [klaut|V] eine [Wurst|N] vom [Tisch|N].',
  'Im [Winter|N] [tragen|V] wir [dicke|A] [Mützen|N] und [warme|A] [Handschuhe|N].',
  'Die [kluge|A] [Eule|N] [sitzt|V] auf einem [Ast|N].',
  'Der [Bäcker|N] [verkauft|V] [frische|A] [Brötchen|N] und [süße|A] [Lebkuchen|N].',
  'Wir [schreiben|V] einen [langen|A] [Wunschzettel|N].',
  'Die [Kerzen|N] [brennen|V] und die [Glocken|N] [läuten|V].',
  'Der [Trainer|N] [lobt|V] die [mutige|A] [Mannschaft|N].',
  'Mein [Opa|N] [repariert|V] den [kaputten|A] [Schlitten|N] in der [Garage|N].',
  'Ein [roter|A] [Vogel|N] [pickt|V] [Körner|N] aus dem [Futterhaus|N].',
  'Die [Klasse|N] [übt|V] für den [wichtigen|A] [Test|N].',
  'Unsere [Familie|N] [spielt|V] am [Abend|N] ein [lustiges|A] [Spiel|N].',
  'Der [Pinguin|N] [rutscht|V] auf dem [glatten|A] [Eis|N] und [lacht|V].',
  'Auf dem [Dach|N] [liegt|V] [dicker|A] [Schnee|N] und [lange|A] [Eiszapfen|N] [hängen|V] an der [Regenrinne|N].',
  'Ich [öffne|V] das [große|A] [Paket|N] mit der [Schere|N].',
  'Der [Kakao|N] [ist|V] [heiß|A] und [süß|A].',
  'Die [Nacht|N] [ist|V] [kalt|A] und [klar|A].',
  'Der [Schneeball|N] [trifft|V] die [dicke|A] [Tanne|N].',
  'Die [Mannschaft|N] [gewinnt|V] das [spannende|A] [Spiel|N] und [feiert|V] im [Stadion|N].',
  'Meine [Schwester|N] [malt|V] ein [buntes|A] [Bild|N] für [Oma|N].',
  'Der [Igel|N] [schläft|V] unter einem [großen|A] [Laubhaufen|N].',
];
function parse(s) {
  const out = [];
  const re = /\[([^|\]]+)\|([NVA])\]|([^\s[\]]+)/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[1]) out.push({ w: m[1], t: m[2], p: '' });
    else {
      const mm = m[3].match(/^(.*?)([.,!?]*)$/);
      if (mm[1]) out.push({ w: mm[1], t: '', p: mm[2] });
      else if (out.length) out[out.length - 1].p += mm[2];
    }
  }
  return out;
}
export const SATZ_LISTE = SAETZE.map(parse);
const render = (toks, fn = t => esc(t.w)) => toks.map(t => fn(t) + esc(t.p)).join(' ');
const WA = {
  N: { name: 'Nomen', pl: 'Nomen', cls: 'n', rule: 'Nomen sind Namen für Menschen, Tiere, Dinge und Orte. Du kannst <i>der</i>, <i>die</i> oder <i>das</i> davorsetzen, und sie werden großgeschrieben.' },
  V: { name: 'Verb', pl: 'Verben', cls: 'v', rule: 'Verben sagen, was jemand tut oder was passiert. Du kannst sie verändern: <i>ich backe, du backst</i>.' },
  A: { name: 'Adjektiv', pl: 'Adjektive', cls: 'a', rule: 'Adjektive sagen, wie etwas ist. Frag zum Beispiel: <i>Wie ist der Schal?</i> Rot!' },
};
const marked = toks => render(toks, t => t.t ? `<mark class="${WA[t.t].cls}">${esc(t.w)}</mark>` : esc(t.w));

function wortart(lvl, T) {
  const { pick } = T;
  for (;;) {
    const pool = SATZ_LISTE.filter(s => lvl === 1 ? s.length <= 7 : lvl === 2 ? s.length >= 6 : s.length >= 7);
    const toks = pick(pool);
    const types = lvl === 1 ? ['N', 'N', 'V'] : lvl === 2 ? ['N', 'V', 'A'] : ['NA', 'NV', 'VA', 'A'];
    const ty = pick(types);
    const want = t => ty.includes(t.t) && t.t;
    const hits = toks.filter(want);
    if (!hits.length) continue;
    const names = [...ty].map(c => WA[c].pl);
    const label = names.join(' und ');
    return {
      kind: 'Wortarten', q: `Wie viele <b>${label}</b> stecken in diesem Satz?${ty.length > 1 ? ' Zähle beide zusammen.' : ''}`,
      vis: `<div class="r-satz">${render(toks)}</div>`, a: hits.length,
      tips: [[...ty].map(c => WA[c].rule).join('<br>'), `Ein Beispiel: <b>„${esc(hits[0].w)}“</b>. Such die anderen!`],
      sol: `<div class="r-satz small">${marked(toks)}</div>${hits.length === 1 && ty.length === 1 ? `Es ist <b>1</b> ${WA[ty].name}.` : `Es sind <b>${hits.length}</b> ${label}.`}`,
    };
  }
}

function grossklein(lvl, T) {
  const { ri, pick, shuffle } = T;
  const pool = SATZ_LISTE.filter(s => lvl === 1 ? s.length <= 7 : lvl === 2 ? s.length >= 6 : s.length >= 8);
  const toks = pick(pool).map(t => ({ ...t }));
  const k = lvl === 1 ? ri(1, 2) : lvl === 2 ? ri(2, 4) : ri(3, 6);
  const idx = shuffle(toks.map((_, i) => i)).slice(0, Math.min(k, toks.length));
  const flip = w => (w[0] === w[0].toUpperCase() ? w[0].toLowerCase() : w[0].toUpperCase()) + w.slice(1);
  idx.forEach(i => { toks[i].bad = flip(toks[i].w); });
  const first = toks.find(t => t.bad);
  return {
    kind: 'Groß und klein', q: `In diesem Satz sind Fehler bei der <b>Groß- und Kleinschreibung</b>. Wie viele Fehler findest du?`,
    vis: `<div class="r-satz">${render(toks, t => esc(t.bad || t.w))}</div>`, a: idx.length,
    tips: ['Groß schreibt man: das erste Wort im Satz und alle Nomen. Alles andere schreibt man klein.', `Ein Fehler ist <b>„${esc(first.bad)}“</b>. Richtig wäre „${esc(first.w)}“.`],
    sol: `<div class="r-satz small">${render(toks, t => t.bad ? `<mark class="err">${esc(t.w)}</mark>` : esc(t.w))}</div>${idx.length === 1 ? 'Es ist <b>1</b> Fehler.' : `Es sind <b>${idx.length}</b> Fehler.`}`,
  };
}

function schlange(lvl, T) {
  const { pick } = T;
  const pool = SATZ_LISTE.filter(s => lvl === 1 ? s.length <= 6 : lvl === 2 ? s.length >= 6 && s.length <= 10 : s.length >= 7);
  const toks = pick(pool);
  const snake = toks.map(t => t.w.toLowerCase()).join('');
  const split = toks.map(t => t.w.toLowerCase());
  const half = Math.max(2, Math.floor(split.length / 2));
  let q, a, sol;
  const caps = toks.filter((t, i) => i === 0 || t.t === 'N').length;
  if (lvl === 1) { q = 'Hier sind alle Wörter zusammengeklebt. <b>Wie viele Wörter</b> sind es?'; a = toks.length; sol = `${render(toks)}<br>Das sind <b>${a}</b> Wörter.`; }
  else if (lvl === 2) { q = 'Alle Wörter kleben zusammen. <b>Wie viele Leerzeichen</b> musst du einfügen, damit ein richtiger Satz entsteht?'; a = toks.length - 1; sol = `${render(toks)}<br>${toks.length} Wörter brauchen <b>${a}</b> Leerzeichen.`; }
  else { q = 'Alles ist klein und zusammengeschrieben. Trenne die Wörter: <b>Wie viele Wörter</b> musst du <b>großschreiben</b>?'; a = caps; sol = `${render(toks, t => /^[A-ZÄÖÜ]/.test(t.w) ? `<mark class="n">${esc(t.w)}</mark>` : esc(t.w))}<br>Groß: das erste Wort und alle Nomen, zusammen <b>${a}</b>.`; }
  return {
    kind: 'Wörterschlange', q, vis: `<div class="r-schlange">${esc(snake)}</div>`, a,
    tips: [lvl === 3 ? 'Trenne zuerst die Wörter. Groß schreibt man das erste Wort im Satz und alle Nomen.' : 'Lies ganz langsam und setz in Gedanken einen Strich, wo ein Wort aufhört.', `So fängt es an: <b>${esc(split.slice(0, half).join(' | '))} | …</b>`],
    sol,
  };
}

const SILBEN = ['Ad-vent', 'Ker-ze', 'Weih-nach-ten', 'Schnee-mann', 'Tan-nen-baum', 'Leb-ku-chen', 'Ge-schenk', 'Schlit-ten', 'Ni-ko-laus', 'Ren-tier',
  'Schnee-flo-cke', 'Weih-nachts-mann', 'Ad-vents-ka-len-der', 'Plätz-chen', 'Lich-ter-ket-te', 'Scho-ko-la-de', 'Glo-cke', 'En-gel', 'Stern', 'Baum',
  'Win-ter', 'Schnee-ball-schlacht', 'Fuß-ball', 'Tor-wart', 'Elf-me-ter', 'Mann-schaft', 'Schieds-rich-ter', 'Ge-schenk-pa-pier', 'Tan-nen-zap-fen', 'Weih-nachts-markt',
  'Eis-zap-fen', 'Ka-min', 'Pin-gu-in', 'Man-da-ri-ne', 'Zimt-stern', 'Ker-zen-licht', 'Christ-baum-ku-gel', 'Hand-schu-he', 'Mar-zi-pan', 'Wunsch-zet-tel',
  'Ro-del-bahn', 'Brat-ap-fel', 'Krip-pe', 'Schal', 'Müt-ze', 'Rut-sche', 'Eis-bär', 'Schnee-ha-se', 'Ta-schen-lam-pe'];
const syl = w => w.split('-').length;
const word = w => w.replace(/-/g, '');

function silben(lvl, T) {
  const { shuffle, pick } = T;
  const n = lvl === 1 ? 1 : lvl === 2 ? 2 : 3;
  let ws;
  for (;;) {
    ws = shuffle(SILBEN).slice(0, n);
    if (lvl === 1 && syl(ws[0]) < 2) continue;
    if (lvl === 3 && ws.reduce((s, w) => s + syl(w), 0) < 8) continue;
    break;
  }
  const a = ws.reduce((s, w) => s + syl(w), 0);
  return {
    kind: 'Silben', q: n === 1 ? 'Wie viele <b>Silben</b> hat dieses Wort?' : `Wie viele <b>Silben</b> haben diese ${n} Wörter <b>zusammen</b>?`,
    vis: `<div class="r-woerter">${ws.map(w => `<span>${esc(word(w))}</span>`).join('')}</div>`, a,
    tips: ['Sprich die Wörter langsam und klatsche bei jeder Silbe einmal.', `Zum Beispiel: <b>${esc(pick(ws).replace(/-/g, ' · '))}</b>`],
    sol: `${ws.map(w => esc(w.replace(/-/g, ' · '))).join(' &nbsp;+&nbsp; ')}<br>Zusammen <b>${a}</b> Silben.`,
  };
}

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function alphabet(lvl, T) {
  const { ri, pick } = T;
  const abcRow = `<div class="r-abc">${[...ABC].join(' ')}</div>`;
  if (lvl === 1) {
    const i = ri(5, 25), L = ABC[i];
    return { kind: 'ABC', q: `Der wievielte Buchstabe im Alphabet ist das <b>${L}</b>? (Das A ist der 1.)`, vis: `<div class="r-term">${L}</div>`, a: i + 1, tips: ['Sag das ABC auf und zähle mit den Fingern mit.', `Das ${ABC[i > 12 ? 12 : 4]} ist der ${i > 12 ? 13 : 5}. Buchstabe. Zähl von dort weiter.`], sol: `${ABC.slice(0, i + 1).split('').join(' ')}<br>Das ${L} ist der <b>${i + 1}.</b> Buchstabe.` };
  }
  if (lvl === 2) {
    let i, j; do { i = ri(0, 20); j = i + ri(4, 12); } while (j > 25);
    return { kind: 'ABC', q: `Wie viele Buchstaben stehen im Alphabet <b>zwischen</b> ${ABC[i]} und ${ABC[j]}?`, vis: `<div class="r-term">${ABC[i]} … ${ABC[j]}</div>`, a: j - i - 1, tips: [`Zähle nur die Buchstaben dazwischen. ${ABC[i]} und ${ABC[j]} selbst zählen nicht mit.`, abcRow], sol: `${ABC.slice(i + 1, j).split('').join(' ')}<br>Das sind <b>${j - i - 1}</b> Buchstaben.` };
  }
  const w = pick(['EIS', 'TOR', 'BALL', 'SCHAL', 'BAUM', 'STERN', 'ENGEL', 'KERZE', 'NUSS', 'GANS', 'ELF', 'HUT']);
  const vals = [...w].map(c => ABC.indexOf(c) + 1);
  const a = vals.reduce((s, v) => s + v, 0);
  return { kind: 'Geheimcode', q: `Geheimcode: A = 1, B = 2, C = 3 … Z = 26. Welche Zahl ergibt das Wort <b>${w}</b>, wenn du alle Buchstaben zusammenzählst?`, vis: `<div class="r-term">${[...w].join(' ')}</div>`, a, tips: ['Finde für jeden Buchstaben seinen Platz im Alphabet und zähle dann alles zusammen.', `${w[0]} = ${vals[0]}, ${w[1]} = ${vals[1]} …`], sol: `${[...w].map((c, i) => `${c} = ${vals[i]}`).join(', ')}<br>${vals.join(' + ')} = <b>${a}</b>` };
}

function buchstaben(lvl, T) {
  const { pick } = T;
  if (lvl === 3) {
    for (;;) {
      const toks = pick(SATZ_LISTE), txt = render(toks), low = txt.toLowerCase();
      const letters = [...'enrtsalich'].filter(c => { const n = [...low].filter(x => x === c).length; return n >= 4 && n <= 10; });
      if (!letters.length) continue;
      const L = pick(letters), a = [...low].filter(x => x === L).length;
      return { kind: 'Buchstaben zählen', q: `Wie oft kommt der Buchstabe <b>${L}</b> in diesem Satz vor? Groß und klein zählen beide.`, vis: `<div class="r-satz">${esc(txt)}</div>`, a, tips: ['Geh Wort für Wort durch und mach für jedes ' + L + ' einen Strich.', `Im ersten Wort „${esc(toks[0].w)}“: ${[...toks[0].w.toLowerCase()].filter(x => x === L).length}.`], sol: `<div class="r-satz small">${esc(txt).replace(new RegExp(L, 'gi'), m => `<mark class="err">${m}</mark>`)}</div><b>${a}</b> Mal.` };
    }
  }
  for (;;) {
    const w = word(pick(SILBEN));
    if (w.length < 6) continue;
    const low = w.toLowerCase();
    if (lvl === 1) {
      const letters = [...new Set(low)].filter(c => /[a-z]/.test(c) && [...low].filter(x => x === c).length >= 2);
      if (!letters.length) continue;
      const L = pick(letters), a = [...low].filter(x => x === L).length;
      return { kind: 'Buchstaben zählen', q: `Wie oft kommt der Buchstabe <b>${L}</b> in diesem Wort vor?`, vis: `<div class="r-term">${esc(w)}</div>`, a, tips: ['Zeig mit dem Finger auf jeden Buchstaben und zähle mit.', `Achtung, auch ein großes ${L.toUpperCase()} zählt!`], sol: `${esc(w).replace(new RegExp(L, 'gi'), m => `<mark class="err">${m}</mark>`)}<br><b>${a}</b> Mal.` };
    }
    if (/[äöü]/i.test(w)) continue;
    const a = [...low].filter(c => 'aeiou'.includes(c)).length;
    return { kind: 'Selbstlaute', q: 'Wie viele <b>Selbstlaute</b> (a, e, i, o, u) hat dieses Wort? Zähle jeden einzeln, auch wenn zwei nebeneinanderstehen.', vis: `<div class="r-term">${esc(w)}</div>`, a, tips: ['Selbstlaute sind a, e, i, o und u. Bei „ei“ oder „au“ zählst du beide Buchstaben.', `Der erste Selbstlaut ist das „${[...low].find(c => 'aeiou'.includes(c))}“.`], sol: `${esc(w).replace(/[aeiou]/gi, m => `<mark class="err">${m}</mark>`)}<br><b>${a}</b> Selbstlaute.` };
  }
}

function deutsch(lvl, T) {
  const gens = lvl === 1 ? [wortart, wortart, grossklein, schlange, silben, alphabet, buchstaben]
    : lvl === 2 ? [wortart, wortart, grossklein, grossklein, schlange, silben, alphabet, buchstaben]
    : [wortart, wortart, grossklein, grossklein, schlange, schlange, silben, alphabet, buchstaben];
  return T.pick(gens)(lvl, T);
}

// =====================================================================
// WISSEN
// =====================================================================
// Grundwissen: Frage, Zahl, Tipp 1, Tipp 2
const W1 = [
  ['Wie viele Beine hat eine Spinne?', 8, 'Spinnen sind keine Insekten. Sie haben mehr Beine als ein Käfer.', 'Ein Käfer hat 6 Beine. Die Spinne hat 2 mehr.'],
  ['Wie viele Beine hat ein Käfer?', 6, 'Alle Insekten haben gleich viele Beine, und zwar in 3 Paaren.', '3 Paare, also 3 · 2.'],
  ['Wie viele Beine hat eine Kuh?', 4, 'Denk an die Hufe vorne und hinten.', 'Zwei vorne, zwei hinten.'],
  ['Wie viele Tage hat eine Woche?', 7, 'Zähle von Montag bis Sonntag.', 'Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag, Sonntag.'],
  ['Wie viele Monate hat ein Jahr?', 12, 'Von Januar bis Dezember.', 'Es sind genauso viele wie Zahlen auf einer Uhr.'],
  ['Wie viele Stunden hat ein Tag?', 24, 'Der Uhrzeiger läuft zweimal am Tag ganz herum.', '2 · 12.'],
  ['Wie viele Minuten hat eine Stunde?', 60, 'Schau auf die Uhr: Der große Zeiger braucht eine Stunde für eine Runde.', 'Genauso viele wie Sekunden in einer Minute.'],
  ['Wie viele Tage hat der Dezember?', 31, 'Der Dezember ist einer der langen Monate.', 'Nach dem 30. Dezember kommt noch ein Tag, dann ist Silvester vorbei.'],
  ['Wie viele Kerzen hat ein Adventskranz?', 4, 'Für jeden Adventssonntag wird eine Kerze angezündet.', 'Es gibt so viele Adventssonntage wie Jahreszeiten.'],
  ['Wie viele Spieler einer Mannschaft stehen beim Fußball auf dem Feld (mit Torwart)?', 11, 'Denk an den Elfmeter. Die Zahl steckt im Wort.', 'Zehn Feldspieler und ein Torwart.'],
  ['Wie viele Jahreszeiten gibt es?', 4, 'Frühling, Sommer …', 'Frühling, Sommer, Herbst und Winter.'],
  ['Wie viele Ecken hat ein Dreieck?', 3, 'Die Antwort steckt schon im Namen.', 'Drei-eck.'],
  ['Wie viele Arme hat ein Krake?', 8, 'Krake heißt auch Oktopus. „Okto“ ist ein altes Wort für eine Zahl.', 'Genauso viele wie eine Spinne Beine hat.'],
  ['Wie viele Räder hat ein Dreirad?', 3, 'Die Antwort steckt schon im Namen.', 'Drei-rad.'],
  ['Wie viele Zahlen stehen auf einem normalen Ziffernblatt einer Uhr?', 12, 'Ganz oben steht die größte Zahl.', 'Von 1 bis 12.'],
  ['Wie viele Beine hat ein Huhn?', 2, 'Hühner sind Vögel.', 'Genauso viele wie du.'],
  ['Wie viele Farben hat eine Verkehrsampel für Autos?', 3, 'Rot, …', 'Rot, Gelb und Grün.'],
  ['Wie viele Seiten hat ein Quadrat?', 4, 'Ein Quadrat hat lauter gleich lange Seiten.', 'Genauso viele wie Ecken.'],
];
const W2 = [
  ['Wie viele Bundesländer hat Deutschland?', 16, 'Baden-Württemberg ist eines davon. Es sind mehr als 10.', 'Es sind 4 · 4.'],
  ['Wie viele Planeten kreisen um unsere Sonne?', 8, 'Merkur, Venus, Erde, Mars …', 'Merkur, Venus, Erde, Mars, Jupiter, Saturn, Uranus, Neptun.'],
  ['Wie viele Ecken hat ein Würfel?', 8, 'Zähle oben und unten getrennt.', 'Oben 4 und unten 4.'],
  ['Wie viele Kanten hat ein Würfel?', 12, 'Kanten sind die Linien, an denen zwei Flächen zusammenstoßen. Zähle oben, unten und die senkrechten.', 'Oben 4, unten 4 und dazwischen noch 4.'],
  ['Wie viele Felder hat ein Schachbrett?', 64, 'Das Brett hat 8 Reihen mit je 8 Feldern.', '8 · 8.'],
  ['Wie viele Ringe hat das Zeichen der Olympischen Spiele?', 5, 'Jeder Ring steht für einen Erdteil.', 'Oben 3 und unten 2.'],
  ['Wie viele Buchstaben hat das Alphabet (ohne Ä, Ö, Ü und ß)?', 26, 'Es sind mehr als 20 und weniger als 30.', 'Z ist der letzte Buchstabe, nach Y (25).'],
  ['Wie viele Saiten hat eine normale Gitarre?', 6, 'Es sind mehr als bei einer Geige (4).', 'So viele wie ein Würfel Flächen hat.'],
  ['Wie viele Zacken (Arme) hat eine Schneeflocke?', 6, 'Schau dir eine Schneeflocke genau an: Sie ist ganz regelmäßig.', 'So viele wie ein Käfer Beine hat.'],
  ['Wie viele Minuten dauert eine Halbzeit beim Profi-Fußball?', 45, 'Ein ganzes Spiel dauert 90 Minuten.', 'Die Hälfte von 90.'],
  ['Wie viele Höcker hat ein Trampeltier?', 2, 'Ein Dromedar hat einen. Das Trampeltier hat mehr.', 'Es ist einer mehr als beim Dromedar.'],
  ['Wie viele Punkte (Augen) hat ein Spielwürfel auf allen Seiten zusammen?', 21, 'Zähle 1 + 2 + 3 + 4 + 5 + 6.', '1 + 2 + 3 = 6 und 4 + 5 + 6 = 15.'],
  ['Wie viele Tage hat der Februar in einem Schaltjahr?', 29, 'Normalerweise hat er 28 Tage.', 'Im Schaltjahr gibt es einen Tag mehr.'],
  ['Wie oft ist die deutsche Fußball-Nationalmannschaft der Männer Weltmeister geworden?', 4, '1954 war der erste Titel, 2014 der letzte.', '1954, 1974, 1990 und …'],
  ['Wie viele Meter ist der Elfmeterpunkt vom Tor entfernt?', 11, 'Die Antwort steckt im Wort.', 'Elf-meter.'],
  ['Wie viele Milchzähne hat ein Kind?', 20, 'Es sind weniger als bei Erwachsenen (32).', 'Oben 10 und unten 10.'],
  ['Wie viele Wochen hat ein Jahr (ungefähr)?', 52, 'Ein Jahr hat 365 Tage, eine Woche 7.', 'Es sind ein bisschen mehr als 50.'],
  ['Wie viele Spieler einer Mannschaft stehen beim Volleyball auf dem Feld?', 6, 'Es sind weniger als beim Fußball und mehr als beim Basketball (5).', 'So viele wie ein Würfel Seiten hat.'],
];
const BEINE = [['Spinne', 'Spinnen', 8], ['Käfer', 'Käfer', 6], ['Kuh', 'Kühe', 4], ['Huhn', 'Hühner', 2], ['Pferd', 'Pferde', 4], ['Ameise', 'Ameisen', 6], ['Gans', 'Gänse', 2], ['Hund', 'Hunde', 4]];

function wissen(lvl, T, day) {
  const { ri, pick, shuffle } = T;
  if (lvl === 1) {
    if (day >= 1 && day <= 22 && ri(0, 5) === 0) {
      return { kind: 'Kalender', q: `Heute ist der ${day}. Dezember. Wie viele Tage sind es noch bis Heiligabend am 24. Dezember?`, vis: '', a: 24 - day, tips: [`Rechne 24 minus ${day}.`, `Zähle von ${day} aus weiter bis 24.`], sol: `24 − ${day} = <b>${24 - day}</b> Tage` };
    }
    const [q, a, t1, t2] = pick(W1);
    return { kind: 'Allgemeinwissen', q, vis: '', a, tips: [t1, t2], sol: `Die Antwort ist <b>${a}</b>.` };
  }
  if (lvl === 2) {
    if (ri(0, 2) > 0) { const [q, a, t1, t2] = pick(W2); return { kind: 'Allgemeinwissen', q, vis: '', a, tips: [t1, t2], sol: `Die Antwort ist <b>${a}</b>.` }; }
    const [x, y] = shuffle(BEINE).filter((b, i, arr) => i < 1 || b[2] !== arr[0][2]);
    return { kind: 'Wissen + Rechnen', q: `Wie viele Beine haben ${art(x[0])} und ${art(y[0])} zusammen?`, vis: '', a: x[2] + y[2], tips: [`Überlege einzeln: Wie viele Beine hat ${art(x[0])}? Und ${art(y[0])}?`, `${x[0]}: ${x[2]} Beine.`], sol: `${x[2]} + ${y[2]} = <b>${x[2] + y[2]}</b> Beine` };
  }
  const v = ri(0, 4);
  if (v <= 1) {
    const [x, y] = shuffle(BEINE).filter((b, i, arr) => i < 1 || b[2] !== arr[0][2]);
    const m = ri(2, 4), n = ri(2, 5);
    return { kind: 'Wissen + Rechnen', q: `Auf einer Wiese sind ${m} ${x[1]} und ${n} ${y[1]}. Wie viele Beine sind das zusammen?`, vis: '', a: m * x[2] + n * y[2], tips: [`Wie viele Beine hat ${art(x[0])}, wie viele ${art(y[0])}? Dann malnehmen.`, `${x[0]}: ${x[2]} Beine, ${y[0]}: ${y[2]} Beine.`], sol: `${m} · ${x[2]} + ${n} · ${y[2]} = ${m * x[2]} + ${n * y[2]} = <b>${m * x[2] + n * y[2]}</b> Beine` };
  }
  if (v === 2) { const w = ri(2, 5), d = ri(1, 6); return { kind: 'Wissen + Rechnen', q: `Wie viele Tage sind ${w} Wochen und ${d} ${d === 1 ? 'Tag' : 'Tage'}?`, vis: '', a: w * 7 + d, tips: ['Wie viele Tage hat eine Woche?', `${w} · 7 = ${w * 7}.`], sol: `${w * 7} + ${d} = <b>${w * 7 + d}</b> Tage` }; }
  if (v === 3) { const k = ri(2, 4); return pick([
    { kind: 'Wissen + Rechnen', q: `Wie viele Ecken haben ${k} Würfel zusammen?`, vis: '', a: 8 * k, tips: ['Wie viele Ecken hat ein Würfel? Zähle oben und unten.', 'Ein Würfel hat 8 Ecken.'], sol: `${k} · 8 = <b>${8 * k}</b> Ecken` },
    { kind: 'Wissen + Rechnen', q: `Wie viele Stunden haben ${k} Tage?`, vis: '', a: 24 * k, tips: ['Wie viele Stunden hat ein Tag?', 'Ein Tag hat 24 Stunden.'], sol: `${k} · 24 = <b>${24 * k}</b> Stunden` },
    { kind: 'Wissen + Rechnen', q: 'Wie viele Spieler stehen bei einem Fußballspiel insgesamt auf dem Platz, wenn beide Mannschaften vollständig sind?', vis: '', a: 22, tips: ['Wie viele Spieler hat eine Mannschaft auf dem Feld?', 'Eine Mannschaft hat 11 Spieler.'], sol: '11 + 11 = <b>22</b> Spieler' },
    { kind: 'Wissen + Rechnen', q: 'Wie viele Tage haben November und Dezember zusammen?', vis: '', a: 61, tips: ['Ein Monat hat 30 Tage, der andere 31.', 'November: 30 Tage, Dezember: 31 Tage.'], sol: '30 + 31 = <b>61</b> Tage' },
  ]); }
  const [q, a, t1, t2] = pick(W2.filter(w => w[1] >= 12));
  return { kind: 'Allgemeinwissen', q, vis: '', a, tips: [t1, t2], sol: `Die Antwort ist <b>${a}</b>.` };
}
const ARTIKEL = { Spinne: 'eine', Käfer: 'ein', Kuh: 'eine', Huhn: 'ein', Pferd: 'ein', Ameise: 'eine', Gans: 'eine', Hund: 'ein' };
function art(w) { return `${ARTIKEL[w]} ${w}`; }

// =====================================================================
export function makeRiddle({ cat = 'mix', lvl = 1, day = 0, rng = Math.random } = {}) {
  const T = tools(rng);
  const c = cat === 'mix' ? T.pick(['mathe', 'mathe', 'deutsch', 'wissen']) : cat;
  const r = c === 'mathe' ? mathe(lvl, T) : c === 'deutsch' ? deutsch(lvl, T) : wissen(lvl, T, day);
  return { cat: c, lvl, ...r };
}
export const POINTS_MAX = 3;
