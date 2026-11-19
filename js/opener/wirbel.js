// Wichtel-Wirbel: Hütchenspiel für ein Türchen-Raster (3x2). Vertrag: openspec/specs/tueroeffner.md
export const meta = { id: 'wirbel', title: 'Wichtel-Wirbel', emoji: '🧝' };

const CSS = `
.op-wirbel-box{box-sizing:border-box;width:100%;padding:14px 14px 16px;color:var(--ink);font-family:var(--font);text-align:center;display:flex;flex-direction:column;gap:12px}
.op-wirbel-box *{box-sizing:border-box}
.op-wirbel-task{margin:0;font-size:20px;font-weight:700;line-height:1.2;min-height:26px}
.op-wirbel-task b{color:var(--gold)}
.op-wirbel-board{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px;border-radius:20px;background:rgba(0,0,0,.2);border:1px dashed var(--line)}
.op-wirbel-door{position:relative;display:block;width:100%;height:112px;margin:0;padding:0;border:0;background:none;color:inherit;font:inherit;cursor:pointer;perspective:700px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.op-wirbel-door:focus-visible{outline:3px solid var(--gold);outline-offset:3px;border-radius:18px}
.op-wirbel-in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .45s ease}
.op-wirbel-in.back{transform:rotateY(180deg)}
.op-wirbel-face{position:absolute;inset:0;border-radius:18px;display:flex;align-items:center;justify-content:center;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.op-wirbel-front{background:linear-gradient(160deg,var(--c1,#ef476f),var(--c2,#8e24aa));color:#fff;font-size:38px;font-weight:800;text-shadow:0 2px 0 rgba(0,0,0,.25);box-shadow:0 6px 14px rgba(0,0,0,.35),inset 0 -5px 0 rgba(0,0,0,.18);transition:transform .3s ease,box-shadow .3s ease}
.op-wirbel-front::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:10px;margin-left:-5px;background:rgba(255,255,255,.28);border-radius:4px}
.op-wirbel-num{position:relative}
.op-wirbel-back{transform:rotateY(180deg);font-size:30px;background:linear-gradient(90deg,transparent 42%,rgba(255,209,102,.9) 42% 58%,transparent 58%),linear-gradient(transparent 42%,rgba(255,209,102,.9) 42% 58%,transparent 58%),repeating-linear-gradient(135deg,rgba(255,255,255,.14) 0 6px,transparent 6px 14px),linear-gradient(160deg,#ef476f,#9d174d);box-shadow:0 6px 14px rgba(0,0,0,.35),inset 0 -5px 0 rgba(0,0,0,.2)}
.op-wirbel-tag{position:absolute;left:50%;bottom:-12px;transform:translateX(-50%);padding:3px 9px;border-radius:99px;background:var(--gold);color:#2b2100;font-size:12px;font-weight:800;white-space:nowrap;opacity:0;transition:opacity .2s ease}
.op-wirbel-door.gesucht .op-wirbel-front{box-shadow:0 0 0 4px var(--gold),0 0 22px rgba(255,209,102,.9),0 6px 14px rgba(0,0,0,.35)}
.op-wirbel-door.gesucht .op-wirbel-tag{opacity:1}
.op-wirbel-door.hint .op-wirbel-front{box-shadow:0 0 0 3px rgba(255,209,102,.6),0 0 16px rgba(255,209,102,.55),0 6px 14px rgba(0,0,0,.35);animation:op-wirbel-glow 1.4s ease-in-out infinite}
.op-wirbel-door.open .op-wirbel-front{transform:scale(1.08);box-shadow:0 0 0 4px var(--gold),0 0 28px rgba(255,209,102,.95),0 6px 14px rgba(0,0,0,.35)}
@keyframes op-wirbel-glow{0%,100%{opacity:1}50%{opacity:.6}}
.op-wirbel-wichtel{position:absolute;left:0;top:0;width:40px;height:40px;margin:-20px 0 0 -20px;z-index:5;pointer-events:none;opacity:0;font-size:32px;line-height:40px;text-align:center;transition:left var(--dur,480ms) ease-in-out,top var(--dur,480ms) ease-in-out,opacity .2s ease}
.op-wirbel-wichtel.on{opacity:1}
.op-wirbel-wichtel.on span{display:inline-block;animation:op-wirbel-hop .3s ease-in-out infinite alternate}
@keyframes op-wirbel-hop{from{transform:translateY(0)}to{transform:translateY(-12px)}}
.op-wirbel-spark{position:absolute;z-index:6;pointer-events:none;font-size:20px;animation:op-wirbel-spark 1.2s ease-out both}
@keyframes op-wirbel-spark{0%{opacity:0;transform:translateY(10px) scale(.6)}30%{opacity:1}100%{opacity:0;transform:translateY(-26px) scale(1.1)}}
.op-wirbel-status{margin:0;min-height:50px;display:flex;align-items:center;justify-content:center;padding:8px 14px;border-radius:16px;background:rgba(0,0,0,.25);font-size:17px;font-weight:600;line-height:1.3}
.op-wirbel-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.op-wirbel-btn{min-height:46px;padding:10px 16px;border-radius:999px;border:2px solid var(--line);background:var(--panel);color:var(--ink);font:inherit;font-size:16px;font-weight:700;cursor:pointer}
.op-wirbel-go{background:linear-gradient(180deg,#ffe08a,#ffd166);color:#2b2100;border-color:#fff3c4;box-shadow:0 4px 0 #b88a1f}
.op-wirbel-btn:disabled{opacity:.45;cursor:default}
.op-wirbel-btn:focus-visible,.op-wirbel-door:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.op-wirbel-box.is-reduced *{transition:none!important;animation:none!important}
.op-wirbel-box.is-reduced .op-wirbel-wichtel{display:none}
`;

const rnd = n => Math.floor(Math.random() * n);
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Gesuchte Zahl plus fünf weitere zufällige Zahlen aus 1 bis 24.
function numbersFor(day) {
  const pool = [];
  for (let n = 1; n <= 24; n++) if (n !== day) pool.push(n);
  return shuffle([day].concat(shuffle(pool).slice(0, 5)));
}

export function mount(root, ctx) {
  if (!document.getElementById('op-style-wirbel')) {
    const st = document.createElement('style');
    st.id = 'op-style-wirbel';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  const DAY = ctx.day;
  const LEVEL = Math.min(1, Math.max(0, Number(ctx.level) || 0));
  const REDUCED = !!ctx.reduced;
  const MOVES0 = 4 + Math.round(LEVEL * 10);      // 4 bis 14 Tauschzüge
  const SPEED0 = Math.round(650 - 370 * LEVEL);    // 650 ms bis 280 ms pro Tausch

  let gone = false, busy = false, guessing = false, solved = false, hintCalled = false;
  let fails = 0, tipLevel = 0, moves = MOVES0, speed = SPEED0;
  let slots = [];

  const wait = ms => new Promise(r => ctx.timeout(r, ms));

  root.innerHTML =
    `<div class="op-wirbel-box${REDUCED ? ' is-reduced' : ''}">` +
      '<p class="op-wirbel-task"></p>' +
      '<div class="op-wirbel-board"><div class="op-wirbel-wichtel" aria-hidden="true"><span>🧝</span></div></div>' +
      '<p class="op-wirbel-status" role="status" aria-live="polite"></p>' +
      '<div class="op-wirbel-actions">' +
        '<button type="button" class="op-wirbel-btn op-wirbel-go">Los, Wichtel!</button>' +
        '<button type="button" class="op-wirbel-btn op-wirbel-tip" disabled>Tipp</button>' +
      '</div>' +
    '</div>';

  const task = root.querySelector('.op-wirbel-task');
  const board = root.querySelector('.op-wirbel-board');
  const wichtel = root.querySelector('.op-wirbel-wichtel');
  const statusEl = root.querySelector('.op-wirbel-status');
  const btnGo = root.querySelector('.op-wirbel-go');
  const btnTip = root.querySelector('.op-wirbel-tip');

  task.innerHTML = `Wo steckt <b>Türchen ${DAY}</b>? Merk dir gut, wo sie ist!`;

  const doors = [];
  for (let i = 0; i < 6; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'op-wirbel-door';
    b.innerHTML =
      '<div class="op-wirbel-in back">' +
        '<div class="op-wirbel-face op-wirbel-front"><span class="op-wirbel-num"></span><span class="op-wirbel-tag">Gesucht!</span></div>' +
        '<div class="op-wirbel-face op-wirbel-back"><span>🎁</span></div>' +
      '</div>';
    board.insertBefore(b, wichtel);
    doors.push(b);
  }

  const setStatus = t => { statusEl.textContent = t; };
  const allBack = on => doors.forEach(d => d.firstElementChild.classList.toggle('back', on));
  const doorOf = n => doors.find(d => +d.dataset.n === n);
  function applyOrder() {
    slots.forEach((d, pos) => {
      d.style.order = pos;
      d.setAttribute('aria-label', `Türchen auf Platz ${pos + 1}`);
    });
  }
  function layout() {
    const nums = numbersFor(DAY);
    doors.forEach((d, k) => {
      const n = nums[k];
      d.dataset.n = n;
      d.querySelector('.op-wirbel-num').textContent = n;
      const h = (n * 47) % 360;
      d.style.setProperty('--c1', `hsl(${h} 85% 60%)`);
      d.style.setProperty('--c2', `hsl(${(h + 30) % 360} 80% 42%)`);
      d.classList.remove('gesucht', 'hint', 'open');
      d.style.transform = '';
      d.style.transition = '';
      d.style.zIndex = '';
    });
    slots = shuffle(doors.slice());
    applyOrder();
    allBack(true);
  }
  function refresh() {
    const playing = busy || guessing || solved;
    btnGo.disabled = playing;
    btnTip.disabled = !guessing || tipLevel >= 2;
  }
  // Hilfe, die das Türchen eingrenzt: kostet den Schlüssel, nur einmal melden.
  function reachTip2() {
    tipLevel = 2;
    if (!hintCalled) { hintCalled = true; ctx.hintUsed(); }
  }

  // Ein Tausch: zwei Türchen wandern (FLIP-Technik), der Wichtel hüpft dazwischen.
  async function swapAt(pa, pb, dur) {
    const a = slots[pa], b = slots[pb];
    const bR = board.getBoundingClientRect();
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const mx = ((ra.left + ra.width / 2) + (rb.left + rb.width / 2)) / 2 - bR.left;
    const my = ((ra.top + ra.height / 2) + (rb.top + rb.height / 2)) / 2 - bR.top;
    if (!wichtel.classList.contains('on')) {
      wichtel.style.transition = 'none';
      wichtel.style.left = mx + 'px';
      wichtel.style.top = my + 'px';
      void wichtel.offsetWidth;
      wichtel.style.transition = '';
      wichtel.classList.add('on');
    }
    wichtel.style.setProperty('--dur', dur + 'ms');
    wichtel.style.left = mx + 'px';
    wichtel.style.top = my + 'px';

    const first = doors.map(d => d.getBoundingClientRect());
    slots[pa] = b;
    slots[pb] = a;
    applyOrder();
    if (!REDUCED) {
      doors.forEach((d, k) => {
        const f = first[k], l = d.getBoundingClientRect();
        const dx = f.left - l.left, dy = f.top - l.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          d.style.transition = 'none';
          d.style.transform = `translate(${dx}px,${dy}px)`;
          d.style.zIndex = (d === a || d === b) ? '4' : '';
        }
      });
      void board.offsetWidth;
      doors.forEach(d => {
        if (d.style.transform) {
          d.style.transition = `transform ${dur}ms ease-in-out`;
          d.style.transform = '';
        }
      });
    }
    await wait(REDUCED ? Math.max(dur, 1000) : dur + 60);
    doors.forEach(d => { d.style.transition = ''; d.style.zIndex = ''; });
  }

  async function shuffleRound() {
    for (let k = 0; k < moves; k++) {
      const pa = rnd(6);
      let pb = rnd(6);
      while (pb === pa) pb = rnd(6);
      if (REDUCED) setStatus(`Schritt ${k + 1} von ${moves}: Platz ${pa + 1} und Platz ${pb + 1} tauschen.`);
      await swapAt(pa, pb, speed);
    }
    enterGuess();
  }

  function enterGuess() {
    busy = false;
    guessing = true;
    wichtel.classList.remove('on');
    doors.forEach(d => d.classList.remove('hint'));
    if (tipLevel >= 2) doorOf(DAY).classList.add('hint');
    setStatus(tipLevel >= 2
      ? 'Das richtige Türchen leuchtet schwach. Welches ist es?'
      : `Welches Türchen ist die ${DAY}? Tipp drauf!`);
    refresh();
  }

  async function start() {
    if (busy || guessing || solved) return;
    busy = true;
    fails = 0;
    tipLevel = 0;
    moves = MOVES0;
    speed = SPEED0;
    refresh();
    const target = doorOf(DAY);
    allBack(false);
    target.classList.add('gesucht');
    setStatus(`Merk dir die ${DAY}! Sie ist golden markiert.`);
    await wait(1600);
    target.classList.remove('gesucht');
    allBack(true);
    setStatus('Der Wichtel mischt die Türchen …');
    await wait(500);
    await shuffleRound();
  }

  function confetti() {
    if (REDUCED) return;
    for (let k = 0; k < 8; k++) {
      const s = document.createElement('span');
      s.className = 'op-wirbel-spark';
      s.textContent = ['✨', '⭐', '🎉'][k % 3];
      s.style.left = (10 + rnd(80)) + '%';
      s.style.top = (20 + rnd(60)) + '%';
      s.style.animationDelay = (k * 70) + 'ms';
      board.appendChild(s);
      ctx.timeout(() => s.remove(), 1500);
    }
  }

  async function pick(d) {
    if (!guessing) return;
    guessing = false;
    busy = true;
    refresh();
    const n = +d.dataset.n;
    d.firstElementChild.classList.remove('back');
    if (n === DAY) {
      solved = true;
      busy = false;
      d.classList.add('open');
      doors.forEach(x => x.classList.remove('hint'));
      setStatus(`Türchen ${DAY} ist offen!`);
      confetti();
      refresh();
      // Öffnen dauert höchstens 0,9 s; mit reduzierter Bewegung sofort.
      if (REDUCED) ctx.success(); else ctx.timeout(() => ctx.success(), 800);
      return;
    }
    fails++;
    setStatus(`Oh, das war die ${n}!`);
    await wait(1300);
    d.firstElementChild.classList.add('back');
    if (fails >= 2) reachTip2();
    setStatus('Der Wichtel mischt nochmal, diesmal langsamer.');
    moves = Math.max(2, Math.ceil(moves / 2));
    speed = Math.min(950, Math.round(speed * 1.3));
    await wait(700);
    await shuffleRound();
  }

  layout();

  doors.forEach(d => {
    ctx.on(d, 'pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pick(d);
    });
    // Tastatur (Enter, Leertaste) löst nur ein click mit detail 0 aus; Zeigegeräte hat pointerdown schon behandelt.
    ctx.on(d, 'click', e => { if (e.detail === 0) pick(d); });
  });

  ctx.on(btnGo, 'click', () => { start(); });

  ctx.on(btnTip, 'click', () => {
    if (!guessing) return;
    if (tipLevel === 0) {
      tipLevel = 1;
      setStatus(`Tipp: Gesucht ist die ${DAY}. Denk an das goldene Türchen vom Anfang!`);
    } else if (tipLevel === 1) {
      reachTip2();
      doorOf(DAY).classList.add('hint');
      setStatus('Tipp: Das richtige Türchen leuchtet jetzt schwach.');
    }
    refresh();
  });

  setStatus('Drück auf „Los, Wichtel!“ und merk dir die Zahl.');
  refresh();

  return {
    destroy() { gone = true; },
  };
}
