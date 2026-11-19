// Konfetti & Schnee auf einem Overlay-Canvas über der ganzen Seite.
let cv, g, parts = [], running = false;
function ensure() {
  if (cv) return;
  cv = document.createElement('canvas'); cv.className = 'fx-layer';
  document.body.appendChild(cv); g = cv.getContext('2d');
  const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
  fit(); addEventListener('resize', fit);
}
function run() {
  if (running) return; running = true;
  let last = performance.now();
  const step = t => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    g.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life > 0 && p.y < cv.height + 30);
    for (const p of parts) {
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt;
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, p.life);
      g.fillStyle = p.color;
      if (p.emoji) { g.font = p.size + 'px serif'; g.textAlign = 'center'; g.fillText(p.emoji, 0, 0); }
      else g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      g.restore();
    }
    if (parts.length) requestAnimationFrame(step); else { running = false; g.clearRect(0, 0, cv.width, cv.height); }
  };
  requestAnimationFrame(step);
}
const COLORS = ['#ffd166', '#ef476f', '#06d6a0', '#8ecae6', '#ffffff', '#f78c6b', '#c77dff'];
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fx = {
  confetti(n = 140) {
    if (calm()) n = Math.min(n, 20);
    ensure();
    for (let i = 0; i < n; i++) parts.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.5, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 700, vy: -Math.random() * 650 - 100, grav: 900,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, size: 7 + Math.random() * 8,
      color: COLORS[i % COLORS.length], life: 2.5 + Math.random() * 1.5,
    });
    run();
  },
  emojiBurst(emoji, n = 24) {
    ensure();
    for (let i = 0; i < n; i++) parts.push({
      x: innerWidth / 2, y: innerHeight / 2, vx: (Math.random() - 0.5) * 800, vy: -Math.random() * 700,
      grav: 900, rot: 0, vr: (Math.random() - 0.5) * 6, size: 22 + Math.random() * 18, emoji, color: '#fff',
      life: 2 + Math.random(),
    });
    run();
  },
  shake(el, ms = 300) {
    if (!el || calm()) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), ms);
  },
};
