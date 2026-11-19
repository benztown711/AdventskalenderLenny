// Platzhalter zum Testen des Rahmens, wird ersetzt.
export const meta = { id: 'frost', title: 'Test', emoji: '❄️' };
export function mount(root, ctx) {
  root.innerHTML = `<p>Finde Türchen ${ctx.day}</p><button class="btn">Öffnen</button>`;
  ctx.on(root.querySelector('button'), 'click', () => ctx.success());
  return {};
}
