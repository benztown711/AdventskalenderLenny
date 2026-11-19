// Türöffner "Zugefrorene Türchen": Frost wegwischen, bis das gesuchte Türchen frei ist.
// Vertrag: openspec/specs/tueroeffner.md
export const meta = { id: 'frost', title: 'Zugefrorene Türchen', emoji: '❄️' };

const TOTAL = 12;            // 3 x 4 Felder
const MIN_FREE = 0.4;        // ab diesem Anteil freier Fläche ist ein Feld antippbar
const BRUSH = 22;
const HEAT_WAIT = 15;        // Sekunden, bis der Handwärmer aktiv ist
const IDLE_TIP_MS = 30000;   // nach so viel Stille ein sanfter Tipp
const AUTO_HELP_MS = 50000;  // danach taut das Ziel-Türchen von selbst frei
const REGROW_MS = 120;
const OPEN_MS = 850;         // Öffnungs-Animation, max. 0,9 s

const CSS = [
  '.op-frost-wrap{box-sizing:border-box;width:100%;padding:12px 12px 4px;display:flex;flex-direction:column;gap:12px;color:var(--ink);font-family:var(--font)}',
  '.op-frost-wrap *{box-sizing:border-box}',
  '.op-frost-task{margin:0;font-size:20px;font-weight:800;line-height:1.2;text-align:center}',
  '.op-frost-task b{color:var(--gold)}',
  '.op-frost-status{min-height:46px;display:flex;align-items:center;justify-content:center;text-align:center;padding:8px 12px;border-radius:16px;background:var(--panel);border:1px solid var(--line);font-size:15px;font-weight:700;line-height:1.3;transition:color .3s,background .3s,border-color .3s}',
  '.op-frost-status.nope{color:var(--ice)}',
  '.op-frost-status.ok{color:var(--gold);background:rgba(255,209,102,.16);border-color:rgba(255,209,102,.6)}',
  '.op-frost-board{position:relative;padding:12px;border-radius:20px;background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px var(--line)}',
  '.op-frost-board.op-frost-wob{animation:op-frost-wob .42s ease-in-out}',
  '@keyframes op-frost-wob{0%,100%{transform:none}20%{transform:translateX(-6px) rotate(-1deg)}40%{transform:translateX(6px) rotate(1deg)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}',
  '.op-frost-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:76px;gap:8px}',
  '.op-frost-cell{position:relative;perspective:700px;min-width:0;margin:0;padding:0;border:0;border-radius:14px;background:none;font:inherit;color:#fff;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent}',
  '.op-frost-back{position:absolute;inset:0;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:#3b2a00;background:radial-gradient(circle at 50% 40%,#fff3b0,#ffd166 55%,#f59e0b);box-shadow:0 0 26px 6px rgba(255,209,102,.75);opacity:0;transition:opacity .45s .2s}',
  '.op-frost-cell.open .op-frost-back{opacity:1}',
  '.op-frost-door{position:absolute;inset:0;border-radius:14px;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:30px;font-weight:800;color:#fff;transform-origin:left center;transition:transform .7s cubic-bezier(.3,.7,.3,1);backface-visibility:hidden;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35),0 4px 0 rgba(0,0,0,.28)}',
  '.op-frost-door::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:8px;margin-left:-4px;background:rgba(255,255,255,.3)}',
  '.op-frost-num{position:relative;text-shadow:0 2px 0 rgba(0,0,0,.25)}',
  '.op-frost-cell.open .op-frost-door{transform:rotateY(-78deg)}',
  '.op-frost-canvas{position:absolute;left:0;top:0;width:100%;height:100%;border-radius:20px;touch-action:none;cursor:pointer;transition:opacity .5s ease}',
  '.op-frost-ring{position:absolute;display:none;pointer-events:none;border:3px solid var(--gold);border-radius:17px;z-index:3}',
  '.op-frost-heat{width:100%;min-height:46px;border:0;border-radius:999px;padding:8px 14px;font:inherit;font-size:16px;font-weight:800;line-height:1.15;color:#2a1d00;background:linear-gradient(180deg,#ffe38f,#ffbb3b);box-shadow:0 3px 0 #c98a12;cursor:pointer}',
  '.op-frost-heat:disabled{opacity:.55;cursor:default}',
  '.op-frost-heat:not(:disabled):active{transform:translateY(2px)}',
  '@media (prefers-reduced-motion:reduce){.op-frost-wrap *{transition:none!important;animation:none!important}}'
].join('\n');

function ensureStyle() {
  try {
    if (document.getElementById('op-style-frost')) return;
    const st = document.createElement('style');
    st.id = 'op-style-frost';
    st.textContent = CSS;
    document.head.appendChild(st);
  } catch (e) { console.error(e); }
}

function shuffle(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mount(root, ctx) {
  ensureStyle();
  const day = ctx.day;
  const reduced = !!ctx.reduced;
  const rnd = Math.random;

  // Zahlen: das gesuchte Türchen plus 11 andere aus 1..24, gemischt
  const others = [];
  for (let n = 1; n <= 24; n++) if (n !== day) others.push(n);
  const nums = shuffle([day, ...shuffle(others, rnd).slice(0, TOTAL - 1)], rnd);

  root.innerHTML =
    '<div class="op-frost-wrap">' +
      `<p class="op-frost-task">Wisch den Frost weg und finde <b>Türchen ${day}</b>!</p>` +
      '<div class="op-frost-status" role="status" aria-live="polite"></div>' +
      '<div class="op-frost-board">' +
        '<div class="op-frost-grid"></div>' +
        '<canvas class="op-frost-canvas" aria-hidden="true"></canvas>' +
        '<div class="op-frost-ring" aria-hidden="true"></div>' +
      '</div>' +
      '<button type="button" class="op-frost-heat" disabled></button>' +
    '</div>';

  const statusEl = root.querySelector('.op-frost-status');
  const grid = root.querySelector('.op-frost-grid');
  const board = root.querySelector('.op-frost-board');
  const canvas = root.querySelector('.op-frost-canvas');
  const ring = root.querySelector('.op-frost-ring');
  const heatBtn = root.querySelector('.op-frost-heat');
  const g = canvas.getContext('2d');
  const tex = document.createElement('canvas');
  const tg = tex.getContext('2d');

  const cells = nums.map((n, i) => {
    const h = (n * 30) % 360;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'op-frost-cell';
    b.setAttribute('aria-label', `Gefrorenes Feld ${i + 1} von ${TOTAL}`);
    b.innerHTML =
      `<span class="op-frost-back"><span class="op-frost-num">${n}</span></span>` +
      `<span class="op-frost-door" style="background:linear-gradient(160deg,hsl(${h},90%,64%),hsl(${(h + 40) % 360},85%,46%))"><span class="op-frost-num">${n}</span></span>`;
    grid.appendChild(b);
    return b;
  });

  const S = {
    target: nums.indexOf(day),
    won: false,
    successSent: false,
    heatLeft: HEAT_WAIT,
    heatUsed: false,
    autoDone: false,
    msgAt: Date.now(),
  };
  let W = 0, H = 0, dpr = 1;
  let drag = null;
  let rafId = 0;
  let alive = true;
  let ro = null;

  // ---------- Hilfsfunktionen ----------
  function say(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = 'op-frost-status' + (cls ? ' ' + cls : '');
    S.msgAt = Date.now();
  }

  function wobble(el) {
    el.classList.remove('op-frost-wob');
    void el.offsetWidth;
    el.classList.add('op-frost-wob');
  }

  function prep() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }

  // Rechteck eines Feldes relativ zum Board (position:relative), das Canvas deckt das Board ab
  function rectOf(c) {
    return { x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight };
  }

  // ---------- Frost-Textur ----------
  function line(x0, y0, x1, y1) {
    tg.beginPath();
    tg.moveTo(x0, y0);
    tg.lineTo(x1, y1);
    tg.stroke();
  }

  function drawCrystal(x, y, len) {
    tg.strokeStyle = 'rgba(255,255,255,0.85)';
    tg.lineWidth = 0.9;
    for (let a = 0; a < 6; a++) {
      const ang = a * Math.PI / 3 + (rnd() - 0.5) * 0.25;
      line(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      const bx = x + Math.cos(ang) * len * 0.55;
      const by = y + Math.sin(ang) * len * 0.55;
      line(bx, by, bx + Math.cos(ang + 0.6) * len * 0.35, by + Math.sin(ang + 0.6) * len * 0.35);
      line(bx, by, bx + Math.cos(ang - 0.6) * len * 0.35, by + Math.sin(ang - 0.6) * len * 0.35);
    }
  }

  function makeTexture() {
    tg.setTransform(dpr, 0, 0, dpr, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    tg.clearRect(0, 0, W, H);
    const grad = tg.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, 'rgba(236,248,255,0.94)');
    grad.addColorStop(1, 'rgba(206,232,250,0.96)');
    tg.fillStyle = grad;
    tg.fillRect(0, 0, W, H);
    const dots = Math.round(W * H / 30);
    for (let i = 0; i < dots; i++) {
      tg.fillStyle = rnd() < 0.55
        ? 'rgba(255,255,255,' + (0.5 + rnd() * 0.5).toFixed(2) + ')'
        : 'rgba(120,180,225,' + (0.18 + rnd() * 0.22).toFixed(2) + ')';
      tg.beginPath();
      tg.arc(rnd() * W, rnd() * H, 0.4 + rnd() * 1.4, 0, Math.PI * 2);
      tg.fill();
    }
    tg.lineCap = 'round';
    const crystals = Math.max(6, Math.round(W * H / 9000));
    for (let k = 0; k < crystals; k++) drawCrystal(rnd() * W, rnd() * H, 14 + rnd() * 16);
  }

  function coverAll() {
    prep();
    g.clearRect(0, 0, W, H);
    g.drawImage(tex, 0, 0, W, H);
  }

  // Canvas an die Layoutgröße anpassen, scharf per devicePixelRatio; bestehender Zustand bleibt erhalten
  function fit() {
    if (!alive) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (w === W && h === H)) return;
    const nd = Math.min(3, window.devicePixelRatio || 1);
    let old = null;
    if (W && H) {
      old = document.createElement('canvas');
      old.width = canvas.width;
      old.height = canvas.height;
      old.getContext('2d').drawImage(canvas, 0, 0);
    }
    dpr = nd; W = w; H = h;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    tex.width = canvas.width;
    tex.height = canvas.height;
    makeTexture();
    if (old) {
      prep();
      g.drawImage(old, 0, 0, W, H);
    } else {
      coverAll();
    }
    const act = document.activeElement;
    if (act && act.classList && act.classList.contains('op-frost-cell') && act.matches(':focus-visible')) showRing(act);
  }

  // ---------- Wischen ----------
  function dab(x, y, r) {
    g.globalCompositeOperation = 'destination-out';
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.92)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'source-over';
  }

  function stroke(x0, y0, x1, y1) {
    prep();
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
    for (let i = 1; i <= n; i++) dab(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, BRUSH);
  }

  // Anteil freier (nicht gefrorener) Fläche eines Feldes, 0 bis 1
  function freeShare(r) {
    const x0 = Math.max(0, Math.round((r.x + 4) * dpr));
    const y0 = Math.max(0, Math.round((r.y + 4) * dpr));
    const x1 = Math.min(canvas.width, Math.round((r.x + r.w - 4) * dpr));
    const y1 = Math.min(canvas.height, Math.round((r.y + r.h - 4) * dpr));
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return 0;
    const data = g.getImageData(x0, y0, w, h).data;
    let free = 0, total = 0;
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 3) {
        total++;
        if (data[(y * w + x) * 4 + 3] < 128) free++;
      }
    }
    return total ? free / total : 0;
  }

  // Ein Feld komplett freitauen (Tastatur, automatische Hilfe)
  function clearCell(i) {
    const r = rectOf(cells[i]);
    prep();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    g.beginPath();
    if (g.roundRect) g.roundRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 16);
    else g.rect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    g.fill();
    g.globalCompositeOperation = 'source-over';
  }

  // Nachfrieren: langsam am 1. Dezember, deutlich schneller am 24.
  const regrowAlpha = 0.004 + 0.016 * ctx.level;
  ctx.interval(() => {
    if (S.won || !W) return;
    prep();
    g.globalAlpha = regrowAlpha;
    g.drawImage(tex, 0, 0, W, H);
    g.globalAlpha = 1;
  }, REGROW_MS);

  // ---------- Antippen ----------
  function tapIndex(i) {
    if (S.won) return;
    const c = cells[i];
    const n = nums[i];
    if (freeShare(rectOf(c)) < MIN_FREE) {
      say('Erst freiwischen!', 'nope');
      wobble(board);
      return;
    }
    if (i === S.target) { win(); return; }
    const parts = [`Das ist Türchen ${n}.`];
    if (ctx.played.includes(n)) parts.push('Das hast du schon gespielt ⭐.');
    parts.push(n > day ? `Da musst du noch ${n - day} mal schlafen!` : 'Das war schon dran.');
    say(parts.join(' '), 'nope');
    wobble(board);
  }

  function tapAt(px, py) {
    const i = cells.findIndex(c => {
      const r = rectOf(c);
      return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    });
    if (i >= 0) tapIndex(i);
  }

  function win() {
    S.won = true;
    cells[S.target].classList.add('open');
    cells[S.target].setAttribute('aria-label', `Türchen ${day}`);
    canvas.style.opacity = '0';
    canvas.style.pointerEvents = 'none';
    ring.style.display = 'none';
    heatBtn.disabled = true;
    say(`Türchen ${day} ist offen!`, 'ok');
    ctx.timeout(sendSuccess, reduced ? 120 : OPEN_MS);
  }

  function sendSuccess() {
    if (S.successSent) return;
    S.successSent = true;
    ctx.success();
  }

  // ---------- Handwärmer: taut die Hälfte des Rasters, in der das Ziel liegt ----------
  let meltX = 0, meltY = 0;
  function meltAt(x, y, r) {
    prep();
    g.globalCompositeOperation = 'destination-out';
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.8, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'source-over';
  }

  function heat() {
    if (!alive || S.won || S.heatUsed || S.heatLeft > 0) return;
    S.heatUsed = true;
    heatBtn.disabled = true;
    heatBtn.textContent = '🔥 Schön warm!';
    ctx.hintUsed();

    const r = rectOf(cells[S.target]);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const vertical = rnd() < 0.5; // obere oder untere Hälfte
    const half = vertical
      ? { x: 0, y: cy < H / 2 ? 0 : H / 2, w: W, h: H / 2 }
      : { x: cx < W / 2 ? 0 : W / 2, y: 0, w: W / 2, h: H };
    // Mitte nahe der Hälfte-Mitte, leicht versetzt
    const mx = half.x + half.w / 2 + (rnd() - 0.5) * half.w * 0.3;
    const my = half.y + half.h / 2 + (rnd() - 0.5) * half.h * 0.3;
    const corners = [[half.x, half.y], [half.x + half.w, half.y], [half.x, half.y + half.h], [half.x + half.w, half.y + half.h]];
    let reach = 0;
    corners.forEach(p => { reach = Math.max(reach, Math.hypot(p[0] - mx, p[1] - my)); });
    const maxR = reach * 1.25 + 8;
    meltX = mx; meltY = my;

    say('Der Handwärmer taut! Schau genau in die warme Hälfte.');
    const t0 = performance.now();
    const dur = reduced ? 1 : 900;
    const step = now => {
      if (!alive || S.won) return;
      const p = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      meltAt(meltX, meltY, Math.max(1, maxR * ease));
      if (p < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
  }
  ctx.on(heatBtn, 'click', heat);

  // ---------- Tastatur: Fokusring und Enter/Leertaste ----------
  function showRing(c) {
    const r = rectOf(c);
    ring.style.display = 'block';
    ring.style.left = (r.x - 3) + 'px';
    ring.style.top = (r.y - 3) + 'px';
    ring.style.width = (r.w + 6) + 'px';
    ring.style.height = (r.h + 6) + 'px';
  }

  cells.forEach((c, i) => {
    ctx.on(c, 'click', () => {
      if (S.won) return;
      if (freeShare(rectOf(c)) < MIN_FREE) {
        // gefrorenes Feld: Enter/Leertaste taut es frei, danach ein zweiter Druck tippt an
        clearCell(i);
        c.setAttribute('aria-label', `Türchen ${nums[i]}`);
        say(`Das ist Türchen ${nums[i]}. Drück Enter, um es anzutippen.`);
      } else {
        tapIndex(i);
      }
    });
  });
  ctx.on(grid, 'focusin', e => {
    const c = e.target.closest && e.target.closest('.op-frost-cell');
    if (c && !S.won && e.target.matches(':focus-visible')) showRing(c);
    else ring.style.display = 'none';
  });
  ctx.on(grid, 'focusout', () => { ring.style.display = 'none'; });

  // ---------- Zeiten ----------
  ctx.interval(() => {
    if (S.won) return;
    if (S.heatLeft > 0) {
      S.heatLeft--;
      if (S.heatLeft === 0) {
        heatBtn.disabled = false;
        heatBtn.textContent = '🔥 Handwärmer';
      } else {
        heatBtn.textContent = `🔥 Handwärmer (${S.heatLeft} s)`;
      }
    } else if (!S.heatUsed && !S.autoDone && Date.now() - S.msgAt > IDLE_TIP_MS) {
      say('Tipp: Der Handwärmer taut eine ganze Hälfte. Probier ihn aus!');
    }
  }, 1000);

  ctx.timeout(() => {
    if (S.won || S.autoDone) return;
    S.autoDone = true;
    clearCell(S.target);
    ctx.hintUsed();
    say(`Der Frost ist bei Türchen ${day} von selbst weggetaut. Tipp es an!`, 'ok');
  }, AUTO_HELP_MS);

  // ---------- Wischen per Zeiger ----------
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  ctx.on(canvas, 'pointerdown', e => {
    if (S.won) return;
    const p = pos(e);
    if (!p) return;
    drag = { id: e.pointerId, sx: p.x, sy: p.y, lx: p.x, ly: p.y, moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ohne Capture weiter */ }
    e.preventDefault();
  });

  ctx.on(canvas, 'pointermove', e => {
    if (!drag || e.pointerId !== drag.id || S.won) return;
    const p = pos(e);
    if (!p) return;
    if (!drag.moved) {
      if (Math.hypot(p.x - drag.sx, p.y - drag.sy) < 8) return;
      drag.moved = true;
      stroke(drag.sx, drag.sy, p.x, p.y);
    } else {
      stroke(drag.lx, drag.ly, p.x, p.y);
    }
    drag.lx = p.x;
    drag.ly = p.y;
  });

  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (e.type === 'pointerup' && !d.moved) tapAt(d.sx, d.sy);
  };
  ctx.on(canvas, 'pointerup', endDrag);
  ctx.on(canvas, 'pointercancel', endDrag);

  // ---------- Start ----------
  if (window.ResizeObserver) {
    ro = new ResizeObserver(() => fit());
    ro.observe(canvas);
  } else {
    ctx.on(window, 'resize', fit);
  }
  fit();
  say(ctx.isTouch ? "Wisch mit dem Finger über das Eis. Tippe dann auf das Türchen." : "Wisch mit gedrückter Maus über das Eis. Klicke dann auf das Türchen.");
  heatBtn.textContent = `🔥 Handwärmer (${HEAT_WAIT} s)`;

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      drag = null;
    },
  };
}
