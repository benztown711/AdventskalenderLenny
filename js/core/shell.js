// Spiel-Rahmen: lädt ein Türchen, zeigt Intro, HUD, Pause, Ergebnis.
import { DAYS } from '../days.js';
import { store } from './store.js';
import { audio } from './audio.js';
import { fx } from './fx.js';
import { createInput } from './input.js';

let current = null; // { destroy() }

export function closeDay() { if (current) { current.destroy(); current = null; } }

export async function openDay(n, view, goHome) {
  closeDay();
  const meta = DAYS[n - 1];
  store.open(n);
  view.innerHTML = `
    <div class="shell">
      <header class="bar">
        <button class="icon-btn" data-act="home" aria-label="Zurück zum Kalender">←</button>
        <div class="bar-title"><span class="bar-num">${n}</span> ${meta.title}</div>
        <div class="hud"></div>
        <button class="icon-btn" data-act="pause" aria-label="Pause">⏸</button>
        <button class="icon-btn" data-act="mute" aria-label="Ton">${audio.muted ? '🔇' : '🔊'}</button>
      </header>
      <main class="stage"></main>
      <div class="pad"></div>
      <div class="overlay"></div>
    </div>`;
  const $ = s => view.querySelector(s);
  const stage = $('.stage'), padEl = $('.pad'), hudEl = $('.hud'), ov = $('.overlay');
  let session = null, mod = null, alive = true;

  function overlay({ emoji = '', title = '', html = '', buttons = [] }) {
    ov.innerHTML = `<div class="card"><div class="card-emoji">${emoji}</div><h2>${title}</h2><div class="card-body">${html}</div><div class="card-btns"></div></div>`;
    const box = ov.querySelector('.card-btns');
    buttons.forEach((b, i) => {
      const el = document.createElement('button');
      el.className = 'btn' + (i === 0 ? ' primary' : ''); el.textContent = b.label;
      el.onclick = () => { audio.unlock(); audio.sfx('click'); b.onClick(); };
      box.appendChild(el);
    });
    ov.classList.add('show');
    box.querySelector('button')?.focus();
  }
  const hideOverlay = () => { ov.classList.remove('show'); ov.innerHTML = ''; };

  function endSession() {
    if (!session) return;
    const s = session; session = null;
    s.dead = true;
    try { s.game?.destroy?.(); } catch (e) { console.error(e); }
    s.cleanups.forEach(f => { try { f(); } catch {} });
    stage.innerHTML = ''; padEl.innerHTML = ''; padEl.classList.remove('show'); hudEl.innerHTML = '';
  }

  function start() {
    endSession(); hideOverlay();
    const s = session = { cleanups: [], dead: false, paused: false, loops: [], pauseFns: [] };
    const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); s.cleanups.push(() => target.removeEventListener(type, fn, opts)); };
    const ctx = {
      day: n, root: stage,
      audio, fx: { ...fx, shake: (ms) => fx.shake(stage, ms) },
      on,
      input: createInput(stage, padEl, on),
      get paused() { return s.paused; },
      onPause(fn) { s.pauseFns.push(fn); },
      // Spiel-Schleife: fn(dt in Sekunden). Pausiert automatisch.
      loop(fn) {
        let last = performance.now(), id;
        const step = t => {
          if (s.dead) return;
          const dt = Math.min(0.05, (t - last) / 1000); last = t;
          if (!s.paused) { try { fn(dt, t / 1000); } catch (e) { console.error(e); } }
          id = requestAnimationFrame(step);
        };
        id = requestAnimationFrame(step);
        s.cleanups.push(() => cancelAnimationFrame(id));
      },
      timeout(fn, ms) { const id = setTimeout(() => { if (!s.dead) fn(); }, ms); s.cleanups.push(() => clearTimeout(id)); return id; },
      interval(fn, ms) { const id = setInterval(() => { if (!s.dead && !s.paused) fn(); }, ms); s.cleanups.push(() => clearInterval(id)); return id; },
      // Canvas mit fester Logik-Größe, wird automatisch eingepasst und skaliert.
      makeCanvas(w, h) {
        const canvas = document.createElement('canvas');
        const scale = 2; canvas.width = w * scale; canvas.height = h * scale;
        canvas.className = 'game-canvas'; canvas.style.aspectRatio = `${w} / ${h}`;
        const fit = () => {
          const r = stage.getBoundingClientRect();
          const k = Math.max(0.1, Math.min((r.width - 12) / w, (r.height - 12) / h));
          canvas.style.width = Math.floor(w * k) + 'px'; canvas.style.height = Math.floor(h * k) + 'px';
        };
        stage.appendChild(canvas); fit(); on(window, 'resize', fit);
        const ro = new ResizeObserver(fit); ro.observe(stage); s.cleanups.push(() => ro.disconnect());
        const g = canvas.getContext('2d'); g.setTransform(scale, 0, 0, scale, 0, 0);
        const pos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * w / r.width, y: (e.clientY - r.top) * h / r.height }; };
        return { canvas, g, w, h, pos };
      },
      hud: {
        set(obj) { hudEl.innerHTML = Object.entries(obj).map(([k, v]) => `<span class="chip">${k} <b>${v}</b></span>`).join(''); },
      },
      toast(text, ms = 1400) {
        const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
        stage.appendChild(t); setTimeout(() => t.remove(), ms);
      },
      load: (key, fallback) => store.load(n, key, fallback),
      save: (key, value) => store.save(n, key, value),
      best: () => store.day(n).best || 0,
      // Spielende melden: { won, stars 0..3, score, text }
      finish({ won = true, stars = 0, score = 0, text = '' } = {}) {
        if (s.dead || s.finished) return; s.finished = true; s.paused = true;
        stars = Math.max(0, Math.min(3, Math.round(stars)));
        const before = store.day(n).best || 0;
        store.result(n, stars, score);
        const record = score > before && before > 0;
        if (won || stars > 0) { audio.sfx('win'); fx.confetti(60 + stars * 50); } else audio.sfx('lose');
        const starHtml = `<div class="stars">${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${i * 0.18}s">★</span>`).join('')}</div>`;
        const next = DAYS[n];
        const teaser = next && next.n ? `<p class="teaser">🔮 Nächstes Türchen: <i>${meta.teaser}</i></p>` : '';
        overlay({
          emoji: won ? '🎉' : (stars > 0 ? '👏' : '💪'),
          title: won ? 'Geschafft!' : (stars > 0 ? 'Stark gespielt!' : 'Knapp daneben!'),
          html: `${starHtml}${text ? `<p>${text}</p>` : ''}${score ? `<p class="score">Punkte: <b>${score}</b>${record ? ' · Neuer Rekord! 🏆' : ''}</p>` : ''}${teaser}`,
          buttons: [{ label: '🔁 Nochmal', onClick: start }, { label: '📅 Zum Kalender', onClick: goHome }],
        });
      },
    };
    s.setPaused = p => { if (s.finished || s.paused === p) return; s.paused = p; s.pauseFns.forEach(f => f(p)); };
    try { s.game = (mod.default?.create || mod.create)(ctx) || {}; }
    catch (e) { console.error(e); overlay({ emoji: '🛠️', title: 'Ups!', html: '<p>Dieses Türchen klemmt gerade. Probier es später nochmal.</p>', buttons: [{ label: 'Zum Kalender', onClick: goHome }] }); }
  }

  function togglePause(force) {
    if (!session || session.finished) return;
    const p = force ?? !session.paused;
    session.setPaused(p);
    if (p) overlay({ emoji: '⏸', title: 'Pause', buttons: [{ label: '▶ Weiter', onClick: () => { hideOverlay(); session?.setPaused(false); } }, { label: '🔁 Neu starten', onClick: start }, { label: '📅 Zum Kalender', onClick: goHome }] });
    else hideOverlay();
  }
  const onVis = () => { if (document.hidden && session && !session.paused) togglePause(true); };
  document.addEventListener('visibilitychange', onVis);
  view.querySelector('.bar').addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'home') goHome();
    if (act === 'pause') togglePause();
    if (act === 'mute') { audio.setMuted(!audio.muted); e.target.closest('button').textContent = audio.muted ? '🔇' : '🔊'; }
  });

  current = { destroy() { alive = false; endSession(); document.removeEventListener('visibilitychange', onVis); } };

  try { mod = await import(`../../days/${String(n).padStart(2, '0')}/game.js`); }
  catch (e) {
    console.error(e);
    if (alive) overlay({ emoji: '🎁', title: 'Noch verpackt', html: '<p>Dieses Türchen wird gerade noch eingepackt.</p>', buttons: [{ label: 'Zum Kalender', onClick: goHome }] });
    return;
  }
  if (!alive) return;
  const d = store.day(n);
  overlay({
    emoji: meta.emoji, title: meta.title,
    html: `<p class="howto">${mod.howto || ''}</p>${d.stars ? `<p class="score">Deine Sterne: ${'★'.repeat(d.stars)}${'☆'.repeat(3 - d.stars)}${d.best ? ` · Rekord: <b>${d.best}</b>` : ''}</p>` : ''}`,
    buttons: [{ label: "▶ Los geht's!", onClick: start }],
  });
}
