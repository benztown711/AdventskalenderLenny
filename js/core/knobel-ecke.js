// Knobel-Ecke: freies Üben mit den Rätseln des Knobel-Schlosses. Serie und Rekord, ohne Einfluss auf die Türchen.
import { createPanel, prefs, setPref } from '../opener/knobel-panel.js';
import { audio } from './audio.js';
import { fx } from './fx.js';
import { isTouch } from './input.js';

let current = null;
export function closeKnobelEcke() { current?.(); }

export function openKnobelEcke() {
  closeKnobelEcke();
  const before = document.activeElement;
  const cleanups = [];
  const on = (t, type, fn, o) => { t.addEventListener(type, fn, o); cleanups.push(() => t.removeEventListener(type, fn, o)); };
  const timeout = (fn, ms) => { const id = setTimeout(fn, ms); cleanups.push(() => clearTimeout(id)); return id; };
  let streak = 0;

  const el = document.createElement('div');
  el.className = 'knobel-ov';
  el.innerHTML = `
    <div class="knobel-card" role="dialog" aria-modal="true" aria-labelledby="ke-title">
      <button class="knobel-x" type="button" data-x aria-label="Schließen">✕</button>
      <div class="knobel-head"><div class="knobel-icon" aria-hidden="true">🧩</div>
        <div><h2 id="ke-title">Knobel-Ecke</h2><p>Rechnen, Deutsch und Wissen. Wie viele schaffst du am Stück?</p></div></div>
      <div class="knobel-body"></div>
      <div class="knobel-streak"></div>
    </div>`;
  document.body.appendChild(el);
  const card = el.querySelector('.knobel-card'), body = el.querySelector('.knobel-body'), streakEl = el.querySelector('.knobel-streak');
  const showStreak = () => { streakEl.innerHTML = `Serie <b>${streak}</b> · Rekord <b>${prefs().best || 0}</b>`; };
  const fit = () => body.classList.toggle('wide', innerWidth >= 720);
  fit(); on(window, 'resize', fit);

  createPanel(body, {
    practice: true, audio, fx, on, timeout, isTouch: isTouch(),
    onSkip: () => { streak = 0; showStreak(); },
    onSolved: ({ hinted, revealed, wrong }) => {
      if (!hinted && !revealed && !wrong) { streak++; if (streak > (prefs().best || 0)) setPref('best', streak); } else streak = 0;
      audio.sfx('coin'); fx.confetti(25);
      showStreak();
      return {
        html: streak ? `<p class="kn-pts">Serie: <b>${streak}</b>${streak >= 5 ? ' 🔥' : ''}</p>` : '<p class="kn-pts small">Ohne Fehler und ohne Tipp 2 wächst deine Serie.</p>',
        button: '▶ Nächstes Rätsel',
      };
    },
  });
  showStreak();

  function close() {
    if (current !== close) return;
    current = null;
    cleanups.forEach(f => f());
    el.classList.add('closing');
    setTimeout(() => el.remove(), 180);
    try { before?.focus?.({ preventScroll: true }); } catch {}
  }
  on(el, 'click', e => { audio.unlock(); if (e.target === el || e.target.closest('[data-x]')) close(); });
  on(document, 'keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') { // Fokus bleibt im Dialog
      const f = [...card.querySelectorAll('button:not([disabled])')].filter(x => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  current = close;
  requestAnimationFrame(() => el.classList.add('show'));
  body.querySelector('[data-d="1"]')?.focus({ preventScroll: true });
}
