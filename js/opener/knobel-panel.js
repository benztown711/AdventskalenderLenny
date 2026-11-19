// Knobel-Fläche: Rätsel, Zahlenfeld, Tipps. Wird vom Türöffner "Knobel-Schloss" und von der Knobel-Ecke benutzt.
// Keine Imports aus anderen Ordnern: Ton, Effekte und Listener kommen über opts.
import { makeRiddle, LEVELS, CATS } from './raetsel.js';

const WRONG = ['Das passt noch nicht. Rechne nochmal nach!', 'Leider falsch. Probier es nochmal!', 'Das Schloss bleibt zu. Noch ein Versuch!', 'Nicht ganz. Du schaffst das!'];
const RIGHT = ['Richtig!', 'Super gemacht!', 'Geknackt!', 'Stark!', 'Genau so!'];
const pick = a => a[Math.floor(Math.random() * a.length)];

// Einstellungen (Stufe, Fach, Rekord) nur lokal im Browser
const PKEY = 'advent2026-knobel';
export function prefs() { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch { return {}; } }
export function setPref(k, v) { const p = prefs(); p[k] = v; try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch {} }

const CSS = `
.kn { font-family: var(--font); color: var(--ink); }
.kn-task { margin: 0 0 10px; text-align: center; font-size: 17px; font-weight: 800; color: var(--gold); }
.kn-opts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.kn .seg { display: flex; flex: 1 1 280px; background: rgba(0,0,0,.25); border-radius: 14px; padding: 3px; gap: 3px; }
.kn .seg button { flex: 1; min-height: 40px; border-radius: 11px; font-size: 14px; font-weight: 800; color: var(--dim); white-space: nowrap; padding: 0 3px; }
.kn .seg button[aria-pressed="true"] { background: var(--ink); color: #18225c; box-shadow: 0 2px 0 rgba(0,0,0,.3); }
.kn-main { display: grid; gap: 12px; }
.kn.wide .kn-main { grid-template-columns: 1fr 270px; align-items: stretch; }
.kn-riddle { background: rgba(0,0,0,.22); border-radius: 18px; padding: 12px 14px; min-height: 110px; }
.kn-riddle.swap { animation: kn-in .3s ease-out; }
@keyframes kn-in { from { opacity: 0; transform: translateY(8px); } }
.kn .r-kind { font-size: 13px; font-weight: 800; color: var(--ice); text-transform: uppercase; letter-spacing: .04em; }
.kn .r-q { font-size: 18px; line-height: 1.4; margin: 6px 0 4px; }
.kn.wide .r-q { font-size: 21px; }
.kn .r-q b { color: var(--gold); }
.kn .r-vis:empty { display: none; }
.kn .r-vis { margin-top: 10px; }
.kn .r-term { font-size: 30px; font-weight: 800; text-align: center; color: #fff; padding: 4px 0; overflow-wrap: anywhere; }
.kn.wide .r-term { font-size: 40px; }
.kn .r-eqs { display: grid; gap: 6px; justify-items: center; font-size: 23px; font-weight: 800; text-align: center; }
.kn .r-eqs .ask, .kn .r-folge .ask { color: var(--gold); }
.kn .r-eqs .ask { margin-top: 4px; padding: 2px 16px; border-radius: 12px; background: rgba(255,209,102,.14); }
.kn .r-folge { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; }
.kn .r-folge span { min-width: 42px; padding: 6px 7px; border-radius: 12px; background: rgba(255,255,255,.1); text-align: center; font-size: 21px; font-weight: 800; }
.kn .r-folge span.ask { background: rgba(255,209,102,.2); outline: 2px dashed var(--gold); }
.kn .r-mauer { display: grid; gap: 4px; justify-items: center; }
.kn .r-mauer .row { display: flex; gap: 4px; }
.kn .r-mauer span { width: 54px; height: 40px; display: grid; place-items: center; border-radius: 6px; background: #b5523b; box-shadow: inset 0 -4px 0 rgba(0,0,0,.25); font-size: 19px; font-weight: 800; }
.kn .r-mauer span.empty { background: rgba(181,82,59,.4); }
.kn .r-mauer span.ask { background: var(--gold); color: #3b2500; }
.kn .r-satz { font-size: 19px; line-height: 1.5; text-align: center; padding: 6px 4px; background: rgba(255,255,255,.06); border-radius: 12px; }
.kn .r-satz.small { font-size: 16px; margin-bottom: 6px; background: none; }
.kn .r-schlange { font-size: 19px; font-weight: 700; text-align: center; word-break: break-all; padding: 8px; border-radius: 12px; background: rgba(6,214,160,.12); color: #c9fff0; letter-spacing: .03em; }
.kn .r-woerter { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.kn .r-woerter span { font-size: 21px; font-weight: 800; padding: 4px 12px; border-radius: 12px; background: rgba(255,255,255,.1); }
.kn .r-abc { font-size: 15px; letter-spacing: .1em; overflow-wrap: anywhere; }
.kn mark { color: inherit; border-radius: 5px; padding: 0 3px; }
.kn mark.n { background: rgba(239,71,111,.55); } .kn mark.v { background: rgba(6,214,160,.45); } .kn mark.a { background: rgba(142,202,230,.45); }
.kn mark.err { background: rgba(255,209,102,.5); }
.kn .r-tips:empty { display: none; }
.kn .r-tips { margin-top: 10px; display: grid; gap: 6px; }
.kn .r-tip { margin: 0; padding: 8px 10px; border-radius: 12px; background: rgba(255,209,102,.12); border-left: 4px solid var(--gold); font-size: 16px; line-height: 1.4; animation: kn-in .3s ease-out; }
.kn .r-tip.sol { background: rgba(199,125,255,.16); border-color: var(--violet); }
.kn .r-tip small { color: var(--dim); font-size: 14px; }
.kn-code { display: flex; align-items: center; justify-content: center; height: 56px; border-radius: 16px; background: #0b1437; border: 3px solid var(--line); font-size: 34px; font-weight: 800; letter-spacing: .12em; font-variant-numeric: tabular-nums; color: var(--gold); transition: border-color .15s; }
.kn-code.empty { color: rgba(255,255,255,.25); }
.kn-code.wrong { border-color: var(--red); color: var(--red); }
.kn-code.right { border-color: var(--green); color: var(--green); }
.kn-msg { min-height: 22px; margin: 5px 0; text-align: center; font-size: 15px; font-weight: 700; color: #ffd2dc; }
.kn-msg.hint { color: var(--dim); font-weight: 600; }
.kn-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.kn-pad button { height: 46px; border-radius: 14px; background: rgba(255,255,255,.13); border: 2px solid var(--line); font-size: 23px; font-weight: 800; }
.kn-pad button:active { transform: scale(.94); background: rgba(255,255,255,.25); }
.kn-pad .ok { background: var(--green); color: #053b2c; border-color: #9ff3dc; }
.kn-acts { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.kn-acts button { min-height: 42px; border-radius: 14px; background: var(--panel); border: 2px solid var(--line); font-size: 15px; font-weight: 800; padding: 4px 6px; }
.kn-acts .tip { background: rgba(255,209,102,.18); border-color: rgba(255,209,102,.5); }
.kn-acts button:disabled { opacity: .5; }
.kn-acts .tip.pulse { animation: kn-pulse 1s ease-in-out infinite; }
@keyframes kn-pulse { 50% { box-shadow: 0 0 0 4px rgba(255,209,102,.55); transform: scale(1.04); } }
.kn-done { text-align: center; padding: 4px 0; }
.kn-done[hidden], .kn-entry[hidden] { display: none; }
.kn-right { font-size: 30px; font-weight: 800; color: var(--green); }
.kn-sol { margin: 8px 0; padding: 8px 10px; border-radius: 12px; background: rgba(0,0,0,.25); font-size: 16px; line-height: 1.45; }
.kn-pts { margin: 8px 0 12px; font-size: 17px; font-weight: 800; color: var(--gold); }
.kn-pts.small { font-size: 15px; color: var(--dim); font-weight: 700; }
.kn-done .btn { width: 100%; }
@media (max-width: 400px) { .kn .seg.cat button span { display: none; } .kn .seg button { font-size: 13px; } }
@media (prefers-reduced-motion: reduce) { .kn-riddle.swap, .kn .r-tip, .kn-acts .tip.pulse { animation: none !important; } }
`;

// opts: { practice, day, week, audio, fx, on(target, type, fn), timeout(fn, ms), isTouch, onHint(), onSolved({ hinted, revealed, wrong }) }
export function createPanel(root, opts) {
  const { practice = false, day = 0, week = 1, audio, fx, on, timeout, isTouch = false, onHint = () => {}, onSolved = () => {} } = opts;
  if (!document.getElementById('op-style-knobel')) {
    const st = document.createElement('style'); st.id = 'op-style-knobel'; st.textContent = CSS; document.head.appendChild(st);
  }
  const p = prefs();
  let lvl = p.lvl || (week >= 4 ? 3 : week >= 2 ? 2 : 1), cat = p.cat || 'mix';
  let r, input = '', tips = 0, wrong = 0, solved = false, revealed = false, busy = false, gen = 0;
  root.classList.add('kn');
  root.innerHTML = `
    ${practice ? '' : `<p class="kn-task">🔒 Knack das Rätsel, dann geht Türchen ${day} auf!</p>`}
    <div class="kn-opts">
      <div class="seg lvl" role="group" aria-label="Schwierigkeit">${LEVELS.map(l => `<button type="button" data-lvl="${l.id}"><span aria-hidden="true">${l.dot}</span> ${l.label}</button>`).join('')}</div>
      <div class="seg cat" role="group" aria-label="Fach">${CATS.map(c => `<button type="button" data-cat="${c.id}"><span aria-hidden="true">${c.icon}</span> ${c.label}</button>`).join('')}</div>
    </div>
    <div class="kn-main">
      <section class="kn-riddle" aria-live="polite"><div class="r-kind"></div><div class="r-q"></div><div class="r-vis"></div><div class="r-tips"></div></section>
      <section class="kn-side">
        <div class="kn-entry">
          <div class="kn-code" aria-label="Deine Eingabe"><span class="digits"></span></div>
          <div class="kn-msg" role="status"></div>
          <div class="kn-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button type="button" data-d="${d}">${d}</button>`).join('')}<button type="button" data-a="del" aria-label="Löschen">⌫</button><button type="button" data-d="0">0</button><button type="button" data-a="ok" class="ok" aria-label="Prüfen">✓</button></div>
          <div class="kn-acts"><button type="button" data-a="tip" class="tip">💡 Tipp</button><button type="button" data-a="new">🔄 Anderes Rätsel</button></div>
        </div>
        <div class="kn-done" hidden></div>
      </section>
    </div>`;
  const $ = s => root.querySelector(s);
  const codeEl = $('.kn-code'), msgEl = $('.kn-msg'), tipBtn = $('[data-a="tip"]');

  function setOpts() {
    root.querySelectorAll('[data-lvl]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lvl === lvl)));
    root.querySelectorAll('[data-cat]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
  }
  function hint(t, isHint) { msgEl.textContent = t; msgEl.classList.toggle('hint', !!isHint); }
  function newRiddle() {
    gen++;
    r = makeRiddle({ cat, lvl, day: practice ? 1 + Math.floor(Math.random() * 22) : day });
    input = ''; tips = 0; wrong = 0; solved = false; revealed = false; busy = false;
    const c = CATS.find(x => x.id === r.cat);
    $('.r-kind').innerHTML = `${c.icon} ${c.label} · ${r.kind} · ${LEVELS[lvl - 1].dot}`;
    $('.r-q').innerHTML = r.q;
    $('.r-vis').innerHTML = r.vis;
    $('.r-tips').innerHTML = '';
    $('.kn-entry').hidden = false; $('.kn-done').hidden = true;
    hint(isTouch ? '' : 'Zahlen tippen, Enter prüft.', true);
    tipBtn.classList.remove('pulse'); codeEl.classList.remove('right', 'wrong');
    showTipLabel(); showCode();
    const box = $('.kn-riddle'); box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap');
  }
  function showTipLabel() { tipBtn.textContent = tips === 0 ? '💡 Tipp' : tips === 1 ? '💡 Noch ein Tipp' : revealed ? '📖 Lösung steht oben' : '📖 Lösungsweg'; tipBtn.disabled = revealed; }
  function showCode() { $('.digits').textContent = input || '?'; codeEl.classList.toggle('empty', !input); }
  function type(d) {
    if (solved || busy) return;
    if (input.length >= 4) { fx.shake?.(codeEl); return; }
    input = input === '0' ? String(d) : input + d;
    audio.sfx('tick'); hint(''); showCode();
  }
  function del() { if (solved || busy || !input) return; input = input.slice(0, -1); audio.sfx('click'); showCode(); }
  function tip() {
    if (solved || revealed) return;
    audio.sfx('pop'); tipBtn.classList.remove('pulse');
    const box = $('.r-tips');
    if (tips < 2) {
      box.insertAdjacentHTML('beforeend', `<p class="r-tip"><b>Tipp ${tips + 1}:</b> ${r.tips[tips]}</p>`); tips++;
      if (tips === 2) onHint(); // Tipp 2 grenzt die Lösung ein
    } else { revealed = true; onHint(); box.insertAdjacentHTML('beforeend', `<div class="r-tip sol"><b>Lösungsweg:</b> ${r.sol}<br><small>Tippe die Lösung ein, dann geht das Schloss auf.</small></div>`); }
    showTipLabel();
    box.lastElementChild?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }
  const wobble = () => fx.shake?.(codeEl);
  function check() {
    if (solved || busy) return;
    if (!input) { hint('Tippe zuerst deine Lösung ein.'); wobble(); audio.sfx('bad'); return; }
    const v = +input;
    if (v === r.a) return win();
    wrong++; busy = true;
    audio.sfx('bad'); wobble(); codeEl.classList.add('wrong');
    const near = r.cat === 'mathe' && r.a >= 10 && Math.abs(v - r.a) <= 2;
    hint(near ? 'Ganz knapp daneben! Prüf nochmal genau.' : wrong >= 2 && !revealed ? 'Hol dir ruhig einen Tipp! 💡' : pick(WRONG));
    if (wrong >= 2 && !revealed) tipBtn.classList.add('pulse');
    const g = gen;
    timeout(() => { if (g !== gen) return; codeEl.classList.remove('wrong'); input = ''; busy = false; showCode(); }, 650);
  }
  function win() {
    solved = true;
    codeEl.classList.add('right');
    const res = { hinted: tips >= 2 || revealed, revealed, wrong };
    const extra = onSolved(res) || {};
    const done = $('.kn-done');
    done.innerHTML = `<div class="kn-right">🔓 ${pick(RIGHT)}</div>${revealed ? '' : `<div class="kn-sol">${r.sol}</div>`}${extra.html || ''}${extra.button ? `<button type="button" class="btn primary" data-a="next">${extra.button}</button>` : ''}`;
    $('.kn-entry').hidden = true; done.hidden = false;
    done.querySelector('button')?.focus({ preventScroll: true });
    done.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }

  on(root, 'click', e => {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    if (b.dataset.d !== undefined) return type(b.dataset.d);
    if (b.dataset.lvl) { lvl = +b.dataset.lvl; setPref('lvl', lvl); audio.sfx('click'); setOpts(); return newRiddle(); }
    if (b.dataset.cat) { cat = b.dataset.cat; setPref('cat', cat); audio.sfx('click'); setOpts(); return newRiddle(); }
    const a = b.dataset.a;
    if (a === 'del') del();
    if (a === 'ok') check();
    if (a === 'tip') tip();
    if (a === 'new') { audio.sfx('swoosh'); newRiddle(); opts.onSkip?.(); }
    if (a === 'next') { audio.sfx('click'); newRiddle(); }
  });
  on(document, 'keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); type(e.key); return; }
    if (e.key === 'Backspace') { e.preventDefault(); del(); return; }
    // Enter prüft; nur ohne Eingabe darf ein fokussierter Knopf (außer Zahlenfeld) selbst reagieren
    if (e.key === 'Enter' && !solved && (input || !e.target.closest?.('button:not(.kn-pad button)'))) { e.preventDefault(); check(); }
  });
  setOpts(); newRiddle();
  return { root, newRiddle, get solved() { return solved; } };
}
