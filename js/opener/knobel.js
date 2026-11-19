// Türöffner "Knobel-Schloss": ein Rätsel aus Rechnen, Deutsch oder Wissen (Klasse 4) lösen, Lösung = Code.
// Stufe und Fach wählt das Kind selbst. Tipp 2 oder der Lösungsweg kosten den Schlüssel.
import { createPanel } from './knobel-panel.js';
export const meta = { id: 'knobel', title: 'Knobel-Schloss', emoji: '🧩' };

export function mount(root, ctx) {
  let done = false;
  createPanel(root, {
    day: ctx.day, week: ctx.week, audio: ctx.audio, fx: ctx.fx, on: ctx.on, timeout: ctx.timeout, isTouch: ctx.isTouch,
    onHint: () => ctx.hintUsed(),
    onSolved: () => {
      if (done) return {};
      done = true;
      ctx.audio.sfx('level');
      ctx.timeout(() => ctx.success(), ctx.reduced ? 30 : 900);
      return {};
    },
  });
  root.querySelector('[data-d="1"]')?.focus({ preventScroll: true });
  return { destroy() { root.innerHTML = ''; } };
}
