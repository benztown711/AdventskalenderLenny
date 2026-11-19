// Zahlenschloss vor jedem neuen Türchen und Knobel-Ecke zum freien Üben.
// Ein Rätsel lösen = Code eingeben = Türchen springt auf. Mit Tipps und Lösungsweg kommt jedes Kind weiter.
import { makeRiddle, LEVELS, CATS } from './raetsel.js';
import { store } from './store.js';
import { audio } from './audio.js';
import { fx } from './fx.js';
import { isTouch } from './input.js';

const WRONG = ['Das passt noch nicht. Rechne nochmal nach!', 'Leider falsch. Probier es nochmal!', 'Das Schloss bleibt zu. Noch ein Versuch!', 'Nicht ganz. Du schaffst das!'];
const RIGHT = ['Richtig!', 'Super gemacht!', 'Geknackt!', 'Stark!', 'Genau so!'];
const pick = a => a[Math.floor(Math.random() * a.length)];

let current = null;
export function closeLock() { current?.close(); }
export const needsLock = (n, isPlayed) => !store.lock(n) && !isPlayed;

export function openLock({ day = 0, practice = false, preview = false, onOpen = () => {}, onClose = () => {} } = {}) {
  closeLock();
  let lvl = store.pref('lvl', 1), cat = store.pref('cat', 'mix');
  let r, input = '', tips = 0, wrong = 0, solved = false, revealed = false, streak = 0, busy = false;
  const before = document.activeElement;
  const el = document.createElement('div');
  el.className = 'lock-ov';
  el.innerHTML = `
    <div class="lock" role="dialog" aria-modal="true" aria-labelledby="lk-title">
      <button class="lk-x" data-a="close" aria-label="Schließen">✕</button>
      <div class="lk-head">
        <div class="lk-icon" aria-hidden="true">${practice ? '🧩' : '🔒'}</div>
        <div>
          <h2 id="lk-title">${practice ? 'Knobel-Ecke' : `Türchen ${day} ist verschlossen`}</h2>
          <p class="lk-sub">${practice ? 'Rechnen, Deutsch und Wissen. Wie viele schaffst du am Stück?' : 'Löse das Rätsel. Die Lösung ist der Code fürs Schloss!'}</p>
        </div>
      </div>
      <div class="lk-opts">
        <div class="seg lvl" role="group" aria-label="Schwierigkeit">${LEVELS.map(l => `<button data-lvl="${l.id}"><span aria-hidden="true">${l.dot}</span> ${l.label}</button>`).join('')}</div>
        <div class="seg cat" role="group" aria-label="Fach">${CATS.map(c => `<button data-cat="${c.id}"><span aria-hidden="true">${c.icon}</span> ${c.label}</button>`).join('')}</div>
      </div>
      <div class="lk-main">
        <section class="lk-riddle" aria-live="polite">
          <div class="r-kind"></div>
          <div class="r-q"></div>
          <div class="r-vis"></div>
          <div class="r-tips"></div>
        </section>
        <section class="lk-side">
          <div class="lk-entry">
            <div class="lk-code" aria-label="Deine Eingabe"><span class="digits"></span></div>
            <div class="lk-msg" role="status"></div>
            <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-d="${d}">${d}</button>`).join('')}<button data-a="del" aria-label="Löschen">⌫</button><button data-d="0">0</button><button data-a="ok" class="ok" aria-label="Prüfen">✓</button></div>
            <div class="lk-acts"><button data-a="tip" class="tip">💡 Tipp</button><button data-a="new">🔄 Anderes Rätsel</button></div>
            ${preview && !practice ? '<button data-a="skip" class="lk-skip">Vorschau: Schloss überspringen</button>' : ''}
          </div>
          <div class="lk-done" hidden></div>
        </section>
      </div>
      ${practice ? '<div class="lk-streak"></div>' : ''}
    </div>`;
  document.body.appendChild(el);
  const $ = s => el.querySelector(s);
  const card = $('.lock'), codeEl = $('.lk-code'), msgEl = $('.lk-msg'), tipBtn = $('[data-a="tip"]');

  function setOpts() {
    el.querySelectorAll('[data-lvl]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lvl === lvl)));
    el.querySelectorAll('[data-cat]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
  }
  function showStreak() {
    if (!practice) return;
    $('.lk-streak').innerHTML = `Serie <b>${streak}</b> · Rekord <b>${store.pref('bestStreak', 0)}</b>`;
  }
  function newRiddle() {
    r = makeRiddle({ cat, lvl, day: practice ? 1 + Math.floor(Math.random() * 22) : day });
    input = ''; tips = 0; wrong = 0; solved = false; revealed = false; busy = false;
    const c = CATS.find(x => x.id === r.cat);
    $('.r-kind').innerHTML = `${c.icon} ${c.label} · ${r.kind} · ${LEVELS[lvl - 1].dot}`;
    $('.r-q').innerHTML = r.q;
    $('.r-vis').innerHTML = r.vis;
    $('.r-tips').innerHTML = '';
    $('.lk-entry').hidden = false; $('.lk-done').hidden = true;
    hint(); tipBtn.disabled = false; tipBtn.classList.remove('pulse');
    showTipLabel(); showCode(); showStreak();
    card.classList.remove('opened');
    $('.lk-riddle').classList.remove('swap'); void card.offsetWidth; $('.lk-riddle').classList.add('swap');
  }
  function hint() { msgEl.textContent = isTouch() ? '' : 'Zahlen tippen, Enter prüft.'; msgEl.classList.toggle('hint', !!msgEl.textContent); }
  function showTipLabel() { tipBtn.textContent = tips === 0 ? '💡 Tipp' : tips === 1 ? '💡 Noch ein Tipp' : revealed ? '📖 Lösung steht oben' : '📖 Lösungsweg'; tipBtn.disabled = revealed; }
  function showCode() {
    $('.digits').textContent = input || '?';
    codeEl.classList.toggle('empty', !input);
  }
  function type(d) {
    if (solved || busy) return;
    if (input.length >= 4) { fx.shake(codeEl); return; }
    input = input === '0' ? String(d) : input + d;
    audio.sfx('tick'); msgEl.textContent = ''; msgEl.classList.remove('hint'); showCode();
  }
  function del() { if (solved || busy || !input) return; input = input.slice(0, -1); audio.sfx('click'); showCode(); }
  function tip() {
    if (solved || revealed) return;
    audio.sfx('pop'); tipBtn.classList.remove('pulse');
    const box = $('.r-tips');
    if (tips < 2) { box.insertAdjacentHTML('beforeend', `<p class="r-tip"><b>Tipp ${tips + 1}:</b> ${r.tips[tips]}</p>`); tips++; }
    else { revealed = true; box.insertAdjacentHTML('beforeend', `<div class="r-tip sol"><b>Lösungsweg:</b> ${r.sol}<br><small>Tippe die Lösung ein, dann geht das Schloss auf.</small></div>`); }
    showTipLabel();
    box.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function check() {
    if (solved || busy) return;
    if (!input) { msgEl.classList.remove('hint'); msgEl.textContent = 'Tippe zuerst deine Lösung ein.'; fx.shake(codeEl); audio.sfx('bad'); return; }
    const v = +input;
    if (v === r.a) return win();
    wrong++; busy = true;
    audio.sfx('bad'); fx.shake(codeEl); codeEl.classList.add('wrong');
    msgEl.classList.remove('hint');
    const near = r.cat === 'mathe' && r.a >= 10 && Math.abs(v - r.a) <= 2;
    msgEl.textContent = near ? 'Ganz knapp daneben! Prüf nochmal genau.' : wrong >= 2 && tips < 2 && !revealed ? 'Hol dir ruhig einen Tipp! 💡' : pick(WRONG);
    if (wrong >= 2 && !revealed) tipBtn.classList.add('pulse');
    if (practice && wrong === 1) { streak = 0; showStreak(); }
    setTimeout(() => { codeEl.classList.remove('wrong'); input = ''; busy = false; showCode(); }, 650);
  }
  function win() {
    solved = true;
    const pts = revealed ? 0 : Math.max(1, lvl - tips);
    if (!practice) store.setLock(day, { lvl, pts });
    else if (wrong === 0 && !revealed) { streak++; if (streak > store.pref('bestStreak', 0)) store.setPref('bestStreak', streak); }
    else streak = 0;
    audio.sfx(practice ? 'coin' : 'level');
    codeEl.classList.add('right');
    card.classList.add('opened');
    if (!practice) $('.lk-icon').textContent = '🔓';
    fx.confetti(practice ? 30 : 70 + pts * 20);
    const done = $('.lk-done');
    const ptsLine = practice
      ? (streak ? `<p class="lk-pts">Serie: <b>${streak}</b> ${streak >= 5 ? '🔥' : ''}</p>` : '<p class="lk-pts">Ohne Fehler und Lösungsweg wächst deine Serie.</p>')
      : pts ? `<p class="lk-pts">+${pts} Knobel-${pts === 1 ? 'Punkt' : 'Punkte'} 🧠</p>` : '<p class="lk-pts small">Mit Lösungsweg gibt es keine Knobel-Punkte. Nächstes Mal schaffst du es allein!</p>';
    done.innerHTML = `<div class="lk-right">🔓 ${pick(RIGHT)}</div>${revealed ? '' : `<div class="lk-solution">${r.sol}</div>`}${ptsLine}<button class="btn primary" data-a="go">${practice ? '▶ Nächstes Rätsel' : '🎁 Türchen öffnen'}</button>`;
    setTimeout(() => {
      if (!current || current.el !== el) return;
      $('.lk-entry').hidden = true; done.hidden = false;
      done.querySelector('button').focus({ preventScroll: true });
      showStreak();
      if (window.innerWidth < 720) done.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 450);
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) { if (e.target === el) close(); return; }
    audio.unlock();
    if (b.dataset.d !== undefined) return type(b.dataset.d);
    if (b.dataset.lvl) { lvl = +b.dataset.lvl; store.setPref('lvl', lvl); audio.sfx('click'); setOpts(); return newRiddle(); }
    if (b.dataset.cat) { cat = b.dataset.cat; store.setPref('cat', cat); audio.sfx('click'); setOpts(); return newRiddle(); }
    const a = b.dataset.a;
    if (a === 'del') del();
    if (a === 'ok') check();
    if (a === 'tip') tip();
    if (a === 'new') { audio.sfx('swoosh'); if (practice && !solved) { streak = 0; } newRiddle(); }
    if (a === 'close') close();
    if (a === 'skip') { close(); onOpen(); }
    if (a === 'go') { if (practice) { audio.sfx('click'); newRiddle(); } else { close(); onOpen(); } }
  });
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); type(e.key); return; }
    if (e.key === 'Backspace') { e.preventDefault(); del(); return; }
    if (e.key === 'Enter' && !solved && (input || !e.target.closest?.('.lock button:not(.keypad button)'))) { e.preventDefault(); check(); }
    if (e.key === 'Tab') { // Fokus bleibt im Dialog
      const f = [...card.querySelectorAll('button:not([disabled])')].filter(x => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  function close() {
    if (!current || current.el !== el) return;
    current = null;
    document.removeEventListener('keydown', onKey);
    el.classList.add('closing');
    setTimeout(() => el.remove(), 180);
    try { before?.focus?.({ preventScroll: true }); } catch {}
    onClose(solved);
  }
  current = { el, close };
  setOpts(); newRiddle();
  requestAnimationFrame(() => el.classList.add('show'));
  $('[data-d="1"]').focus({ preventScroll: true });
  return current;
}
