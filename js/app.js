import { DAYS } from './days.js';
import { store } from './core/store.js';
import { audio } from './core/audio.js';
import { fx } from './core/fx.js';
import { syncTime, unlockedDay, secondsToNext, isPreview } from './core/time.js';
import { openDay, closeDay } from './core/shell.js';

const view = document.getElementById('view');
const ORDER = [7, 18, 3, 22, 11, 1, 15, 24, 9, 5, 20, 13, 2, 17, 8, 23, 12, 6, 19, 4, 21, 10, 16, 14];
let tickId = null;

const goHome = () => { location.hash = ''; };
const fmt = s => {
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  const p = v => String(v).padStart(2, '0');
  return (d ? `${d} ${d === 1 ? 'Tag' : 'Tage'} ` : '') + `${p(h)}:${p(m)}:${p(x)}`;
};

function renderCalendar() {
  closeDay();
  const u = unlockedDay();
  view.innerHTML = `
    <div class="cal">
      <header class="cal-head">
        <h1><span>Advents</span><span>kalender</span></h1>
        <p class="sub">24 Türchen · 24 Überraschungen</p>
        <div class="cal-stats">
          <span class="chip big">⭐ <b>${store.totalStars()}</b> / 72</span>
          <button class="chip big" id="mute">${audio.muted ? '🔇 Ton aus' : '🔊 Ton an'}</button>
        </div>
      </header>
      <div class="grid">${ORDER.map(n => {
        const m = DAYS[n - 1], d = store.day(n);
        const state = n > u ? 'locked' : (d.opened ? 'opened' : 'ready');
        return `<button class="door ${state}${n === u ? ' today' : ''}" data-n="${n}" style="--i:${n}" aria-label="Türchen ${n}">
          <span class="door-num">${n}</span>
          ${state === 'opened' ? `<span class="door-emoji">${m.emoji}</span><span class="door-stars">${'★'.repeat(d.stars || 0)}<i>${'★'.repeat(3 - (d.stars || 0))}</i></span>` : ''}
          ${state === 'locked' ? '<span class="door-lock">🔒</span>' : ''}
          ${state === 'ready' ? '<span class="door-new">NEU!</span>' : ''}
        </button>`;
      }).join('')}</div>
      <footer class="cal-foot"><div id="count"></div>${isPreview() ? '<div class="preview">Vorschau-Modus</div>' : ''}</footer>
    </div>`;
  const count = view.querySelector('#count');
  const tick = () => {
    const s = secondsToNext();
    if (s === null) { count.textContent = unlockedDay() >= 24 ? '🎄 Alle Türchen sind offen. Frohe Weihnachten!' : ''; return; }
    if (unlockedDay() !== u) { renderCalendar(); return; }
    count.innerHTML = (u === 0 ? 'Das erste Türchen öffnet in ' : 'Nächstes Türchen in ') + `<b>${fmt(s)}</b>`;
  };
  clearInterval(tickId); tickId = setInterval(tick, 1000); tick();
  view.querySelector('#mute').onclick = e => { audio.unlock(); audio.setMuted(!audio.muted); e.currentTarget.textContent = audio.muted ? '🔇 Ton aus' : '🔊 Ton an'; };
  view.querySelector('.grid').onclick = e => {
    const door = e.target.closest('.door'); if (!door) return;
    const n = +door.dataset.n; audio.unlock();
    if (n > unlockedDay()) {
      audio.sfx('bad'); fx.shake(door);
      const days = n - unlockedDay();
      count.innerHTML = unlockedDay() === 0 ? '🔒 Geduld! Los geht es am 1. Dezember.' : `🔒 Türchen ${n}: noch <b>${days}</b> mal schlafen!`;
      return;
    }
    audio.sfx(door.classList.contains('ready') ? 'power' : 'click');
    door.classList.add('opening');
    setTimeout(() => { location.hash = '#/' + n; }, door.classList.contains('ready') ? 650 : 250);
  };
}

function route() {
  clearInterval(tickId);
  const m = location.hash.match(/^#\/(\d{1,2})$/);
  const n = m ? +m[1] : 0;
  if (n >= 1 && n <= 24 && n <= unlockedDay()) { document.body.classList.add('in-game'); openDay(n, view, goHome); }
  else { document.body.classList.remove('in-game'); if (m) history.replaceState(null, '', location.pathname + location.search); renderCalendar(); }
}

// Schneefall im Hintergrund
(function snow() {
  const cv = document.getElementById('snow'), g = cv.getContext('2d');
  let flakes = [];
  const fit = () => { cv.width = innerWidth; cv.height = innerHeight; flakes = Array.from({ length: Math.min(110, innerWidth / 9) }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: 1 + Math.random() * 2.6, v: 14 + Math.random() * 34, p: Math.random() * 6 })); };
  fit(); addEventListener('resize', fit);
  let last = performance.now();
  (function step(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!document.body.classList.contains('in-game') && !document.hidden) {
      g.clearRect(0, 0, cv.width, cv.height); g.fillStyle = 'rgba(255,255,255,.85)';
      for (const f of flakes) {
        f.y += f.v * dt; f.x += Math.sin(t / 1300 + f.p) * 12 * dt;
        if (f.y > cv.height + 4) { f.y = -4; f.x = Math.random() * cv.width; }
        g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.3); g.fill();
      }
    }
    requestAnimationFrame(step);
  })(last);
})();

addEventListener('hashchange', route);
syncTime().finally(route);
