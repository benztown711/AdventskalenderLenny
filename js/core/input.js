// Einheitliche Steuerung: Tastatur + Touch-Buttons + Stick + Wischen.
// Namen: 'left','right','up','down','a','b'
const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down',
  ' ': 'a', Enter: 'a', x: 'b', X: 'b', Shift: 'b', b: 'b',
};
export const isTouch = () => matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('pad');

export function createInput(stage, padEl, on) {
  const held = new Set(), pressFns = [], releaseFns = [], swipeFns = [];
  let stick = { x: 0, y: 0, active: false };
  const press = n => { if (held.has(n)) return; held.add(n); pressFns.forEach(f => f(n)); };
  const release = n => { if (!held.delete(n)) return; releaseFns.forEach(f => f(n)); };

  on(window, 'keydown', e => {
    const n = KEYMAP[e.key]; if (!n) return;
    e.preventDefault(); if (!e.repeat) press(n);
  });
  on(window, 'keyup', e => { const n = KEYMAP[e.key]; if (n) release(n); });
  on(window, 'blur', () => [...held].forEach(release));

  // Wischen auf der Spielfläche
  let sx = 0, sy = 0, sid = null;
  on(stage, 'pointerdown', e => { sx = e.clientX; sy = e.clientY; sid = e.pointerId; });
  on(stage, 'pointerup', e => {
    if (e.pointerId !== sid) return; sid = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.hypot(dx, dy) < 24) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    swipeFns.forEach(f => f(dir));
  });

  function btn(name, label, cls) {
    const b = document.createElement('button');
    b.className = 'pad-btn ' + cls; b.textContent = label; b.setAttribute('aria-label', name);
    const dn = e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on'); press(name); };
    const up = e => { e.preventDefault(); b.classList.remove('on'); release(name); };
    b.addEventListener('pointerdown', dn); b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up); b.addEventListener('contextmenu', e => e.preventDefault());
    return b;
  }
  function makeStick() {
    const base = document.createElement('div'); base.className = 'pad-stick';
    const knob = document.createElement('div'); knob.className = 'pad-knob'; base.appendChild(knob);
    const move = e => {
      const r = base.getBoundingClientRect(), R = r.width / 2;
      let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R;
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      stick = { x, y, active: true };
      knob.style.transform = `translate(${x * R * 0.55}px, ${y * R * 0.55}px)`;
    };
    const end = () => { stick = { x: 0, y: 0, active: false }; knob.style.transform = ''; };
    base.addEventListener('pointerdown', e => { e.preventDefault(); base.setPointerCapture(e.pointerId); move(e); });
    base.addEventListener('pointermove', e => { if (stick.active) move(e); });
    base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
    return base;
  }

  return {
    isTouch: isTouch(),
    down: n => held.has(n),
    onPress: f => pressFns.push(f),
    onRelease: f => releaseFns.push(f),
    onSwipe: f => swipeFns.push(f),
    // Richtung als Vektor (-1..1): Stick, sonst Tasten
    axis() {
      if (stick.active) return { x: stick.x, y: stick.y };
      let x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      let y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      if (x && y) { x *= 0.7071; y *= 0.7071; }
      return { x, y };
    },
    // Touch-Buttons einblenden (nur auf Touch-Geräten sichtbar).
    // opts: { dpad: true | 'lr' | false, stick: bool, a: 'Text', b: 'Text' }
    pad(opts = {}) {
      padEl.innerHTML = '';
      if (!isTouch()) return;
      const left = document.createElement('div'); left.className = 'pad-left';
      const right = document.createElement('div'); right.className = 'pad-right';
      if (opts.stick) left.appendChild(makeStick());
      else if (opts.dpad) {
        const d = document.createElement('div'); d.className = 'pad-dpad' + (opts.dpad === 'lr' ? ' lr' : '');
        if (opts.dpad !== 'lr') d.appendChild(btn('up', '▲', 'up'));
        d.appendChild(btn('left', '◀', 'left')); d.appendChild(btn('right', '▶', 'right'));
        if (opts.dpad !== 'lr') d.appendChild(btn('down', '▼', 'down'));
        left.appendChild(d);
      }
      if (opts.b) right.appendChild(btn('b', opts.b, 'action b'));
      if (opts.a) right.appendChild(btn('a', opts.a, 'action a'));
      padEl.append(left, right);
      padEl.classList.add('show');
    },
  };
}
