// Türöffner: Bevor ein neues Türchen startet, muss es erst gefunden werden.
// Bei jedem Aufruf wird einer der Türöffner zufällig ausgewählt. Vertrag: openspec/specs/tueroeffner.md
import { store } from '../core/store.js';
import { audio } from '../core/audio.js';
import { fx } from '../core/fx.js';
import { isPreview } from '../core/time.js';

export const OPENERS = ['frost', 'wirbel', 'schloss', 'dorf', 'karte', 'knobel'];
// Geheimcode für Türchen n (zweistellig). Steht auf der Ergebnis-Karte des Vortags (Tag 20 bis 23).
export const secretCode = n => String((n * 37 + 11) % 90 + 10);
export const weekOf = n => (n <= 6 ? 1 : n <= 13 ? 2 : n <= 20 ? 3 : 4);

let current = null;
export function closeOpener() { if (current) { const c = current; current = null; c.destroy(); } }
export const openerActive = () => !!current;

export async function runOpener(n, { onSuccess, onCancel }) {
  closeOpener();
  const params = new URLSearchParams(location.search);
  const forced = isPreview() && OPENERS.includes(params.get('tueroeffner')) ? params.get('tueroeffner') : null;
  const id = forced || OPENERS[Math.floor(Math.random() * OPENERS.length)];

  const el = document.createElement('div');
  el.className = 'opener'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `Finde Türchen ${n}`);
  el.innerHTML = `
    <header class="bar">
      <button class="icon-btn" data-act="back" aria-label="Zurück zum Kalender">←</button>
      <div class="bar-title op-title">🔍 Finde Türchen <span class="bar-num">${n}</span></div>
      <div class="hud">${isPreview() ? '<button class="chip" data-act="skip">⏭ überspringen</button>' : ''}</div>
      <button class="icon-btn" data-act="mute" aria-label="Ton">${audio.muted ? '🔇' : '🔊'}</button>
    </header>
    <main class="op-stage"><div class="op-root op-${id}"></div></main>
    <div class="op-done" hidden><div class="op-done-card"><div class="op-done-emoji">🚪✨</div><b>Türchen ${n} ist offen!</b></div></div>`;
  document.body.appendChild(el);
  document.body.classList.add('in-opener');
  const root = el.querySelector('.op-root');

  const cleanups = []; let dead = false, done = false, hinted = false, inst = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on = (t, type, fn, opts) => { t.addEventListener(type, fn, opts); cleanups.push(() => t.removeEventListener(type, fn, opts)); };
  const played = []; for (let i = 1; i <= 24; i++) if (i !== n && store.isPlayed(i)) played.push(i);

  const ctx = {
    day: n, week: weekOf(n), level: (n - 1) / 23, played, reduced,
    isTouch: matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window,
    secret: { code: secretCode(n), fromYesterday: n >= 21 && store.isPlayed(n - 1) },
    audio, fx,
    on,
    timeout(fn, ms) { const t = setTimeout(() => { if (!dead) fn(); }, ms); cleanups.push(() => clearTimeout(t)); return t; },
    interval(fn, ms) { const t = setInterval(() => { if (!dead) fn(); }, ms); cleanups.push(() => clearInterval(t)); return t; },
    loop(fn) {
      let last = performance.now(), rid;
      const step = t => { if (dead) return; const dt = Math.max(0, Math.min(0.05, (t - last) / 1000)); last = t; try { fn(dt, t / 1000); } catch (e) { console.error(e); } rid = requestAnimationFrame(step); };
      rid = requestAnimationFrame(step); cleanups.push(() => cancelAnimationFrame(rid));
    },
    hintUsed() { hinted = true; },
    success() {
      if (dead || done) return; done = true;
      store.found(n, !hinted);
      audio.sfx('power'); fx.confetti(reduced ? 20 : 90);
      const d = el.querySelector('.op-done');
      d.querySelector('b').insertAdjacentHTML('afterend', !hinted ? '<span>🗝️ Ohne Tipp gefunden: Schlüssel verdient!</span>' : '');
      d.hidden = false;
      setTimeout(() => { if (current === api) { closeOpener(); onSuccess(); } }, reduced ? 700 : 1300);
    },
  };

  const cancel = () => { if (current === api) { closeOpener(); onCancel?.(); } };
  on(el, 'click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'back') cancel();
    if (act === 'skip') ctx.success();
    if (act === 'mute') { audio.setMuted(!audio.muted); e.target.closest('button').textContent = audio.muted ? '🔇' : '🔊'; }
  });
  on(document, 'keydown', e => { if (e.key === 'Escape') { e.preventDefault(); cancel(); } });

  const api = {
    id,
    destroy() {
      dead = true;
      try { inst?.destroy?.(); } catch (e) { console.error(e); }
      cleanups.forEach(f => { try { f(); } catch {} });
      el.remove(); document.body.classList.remove('in-opener');
      if (window.__opener === hook) delete window.__opener;
    },
  };
  current = api;
  const hook = { id, day: n, solve: () => ctx.success() }; // für Tests
  window.__opener = hook;

  try {
    const mod = await import(`./${id}.js`);
    if (dead) return;
    inst = mod.mount(root, ctx) || {};
  } catch (e) {
    // Ein klemmender Türöffner darf nie ein Türchen blockieren: dann direkt öffnen.
    console.error(e);
    if (!dead) { done = true; closeOpener(); onSuccess(); }
  }
  el.querySelector('.op-root button, .op-root [tabindex]')?.focus({ preventScroll: true });
}
