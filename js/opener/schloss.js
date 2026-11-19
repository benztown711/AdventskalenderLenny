// Türöffner "Code-Schloss": Rätsel lösen, zweistelligen Code am Schloss einstellen. Rätselart folgt aus der Woche.
export const meta = { id: 'schloss', title: 'Code-Schloss', emoji: '🔒' };

const pad2 = n => String(n).padStart(2, '0');
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const EMOJIS = ['🦌', '🎁', '⭐', '🍪', '🔔', '🎄', '⛄', '🧦', '🍬', '🍎'];
const WORDS = { 14: 'VIERZEHN', 15: 'FUENFZEHN', 16: 'SECHZEHN', 17: 'SIEBZEHN', 18: 'ACHTZEHN', 19: 'NEUNZEHN', 20: 'ZWANZIG' };
export const shiftWord = (w, k) => w.split('').map(c => String.fromCharCode((c.charCodeAt(0) - 65 + k + 26) % 26 + 65)).join('');

// Fast verraten: erste Ziffer und die Spanne der zweiten.
function nearly(code) {
  const t = +code[0], o = +code[1];
  return `Fast geschafft: Die erste Ziffer ist ${t}. Die zweite liegt zwischen ${Math.max(0, o - 1)} und ${Math.min(9, o + 1)}.`;
}

// Reine Funktion, ohne DOM. Liefert den Lösungscode (zweistellig) und alle Texte/Daten des Rätsels.
export function makeRiddle(day, week, secret) {
  const code = pad2(day);
  if (week === 4 && secret && secret.fromYesterday) {
    const c = String(secret.code).padStart(2, '0');
    return {
      kind: 'gestern', code: c,
      text: `Den Geheimcode hast du am Ende von Türchen ${day - 1} bekommen.`,
      hint1: `Er stand auf der Ergebnis-Karte ganz unten. Spiel Türchen ${day - 1} nochmal, dann siehst du ihn.`,
      hint2: `Der Geheimcode ist ${c}.`,
    };
  }
  if (week === 1 || week === 4) {
    const hard = week === 4;
    const em = shuffle(EMOJIS);
    let terms; // {e, v, op}, op = Rechenzeichen vor dem Term
    if (hard) {
      let a, b, c;
      do { a = 2 + rnd(8); b = 2 + rnd(8); c = day - a * b; } while (c < 1 || c > 9);
      terms = [{ e: em[0], v: a, op: '' }, { e: em[1], v: b, op: '×' }, { e: em[2], v: c, op: '+' }];
    } else if (day <= 3) {
      const a = day === 1 ? 1 : 1 + rnd(day - 1);
      terms = [{ e: em[0], v: a, op: '' }, { e: em[1], v: day - a, op: '+' }];
    } else {
      const c = 1 + rnd(5);
      let a; const sum = day + c;
      do { a = 1 + rnd(Math.min(12, sum - 1)); } while (sum - a < 1 || sum - a > 12);
      terms = [{ e: em[0], v: a, op: '' }, { e: em[1], v: sum - a, op: '+' }, { e: em[2], v: c, op: '-' }];
    }
    return {
      kind: 'bild', code, terms,
      hint1: hard ? 'Jedes Bild steht für eine Zahl. Punkt vor Strich: erst das Mal rechnen, dann das Plus.'
        : 'Jedes Bild steht für eine Zahl. Setze die Zahlen ein und rechne von links nach rechts.',
      hint2: nearly(code),
      text: hard ? 'Du hast Türchen ' + (day - 1) + ' noch nicht gespielt, darum gibt es ein Ersatzrätsel. Jedes Bild steht für eine Zahl.' : 'Jedes Bild steht für eine Zahl. Rechne aus!',
    };
  }
  if (week === 2) {
    const tens = Math.floor(day / 10), ones = day % 10;
    const idx = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    return {
      kind: 'lichter', code, tens, ones, red: idx[0], gold: idx[1],
      text: 'Die rote Birne blinkt die Zehner, die goldene die Einer. Erst rot, kurze Pause, dann gold. Bleibt eine Birne aus, ist die Zahl 0.',
      hint1: 'Drück auf Abspielen und zähle erst nur die rote Birne, dann nur die goldene. Du darfst so oft schauen, wie du willst.',
      hint2: nearly(code),
    };
  }
  const k = day <= 16 ? 1 : 2, word = WORDS[day];
  return {
    kind: 'geheim', code, k, word, cipher: shiftWord(word, k),
    text: `Jeder Buchstabe ist um ${k} verrutscht (${String.fromCharCode(65 + k)} wird zu A).`,
    hint1: `Geh bei jedem Buchstaben im Alphabet ${k === 1 ? 'einen Schritt' : k + ' Schritte'} zurück. Tipp auf einen Buchstaben, dann siehst du ihn im Streifen.` + (day === 15 ? ' Ü schreibt man hier UE.' : ''),
    hint2: `Fast geschafft: Das Wort beginnt mit ${word.slice(0, 3)}. Dahinter steht die Zahl als Ziffern.`,
  };
}

const CSS = `
.op-schloss{padding:10px 14px 14px;font-family:var(--font);color:var(--ink);box-sizing:border-box}
.op-schloss *{box-sizing:border-box}
.op-schloss button{font-family:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.op-schloss .task{margin:0 0 8px;font-size:15px;line-height:1.3;font-weight:600}
.op-schloss .task b{color:var(--gold)}
.op-schloss .card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:8px 12px;min-height:118px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.op-schloss .card .hint{margin:5px 0 0;font-size:12.5px;color:var(--dim);line-height:1.25}
.op-schloss .pics{display:flex;gap:8px;justify-content:center;margin-bottom:6px;flex-wrap:wrap}
.op-schloss .chip{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.12);border-radius:999px;padding:2px 11px;font-size:18px;font-weight:800}
.op-schloss .chip span{font-size:24px}
.op-schloss .sum{font-size:28px;font-weight:800;letter-spacing:1px;white-space:nowrap}
.op-schloss .sum i{font-style:normal;color:var(--gold)}
.op-schloss .big{font-size:40px;line-height:1.1}
.op-schloss .lights{width:100%;height:auto;display:block;overflow:visible;max-height:62px}
.op-schloss .play{min-height:40px;min-width:120px;border:0;border-radius:999px;padding:0 16px;background:var(--ice);color:#06223a;font-weight:800;font-size:15px;margin-top:4px}
.op-schloss .play[disabled]{opacity:.55;cursor:default}
.op-schloss .tiles{display:flex;gap:3px;justify-content:center;margin-bottom:4px;flex-wrap:wrap}
.op-schloss .tile{width:31px;height:40px;border:0;border-radius:9px;background:linear-gradient(160deg,hsl(280 70% 62%),hsl(250 70% 52%));font-size:19px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0}
.op-schloss .tile.on{outline:3px solid var(--gold)}
.op-schloss .abc{display:grid;grid-template-columns:repeat(13,1fr);gap:2px;width:100%;margin-top:6px}
.op-schloss .abc span{font-size:11.5px;font-weight:700;padding:2px 0;border-radius:6px;background:rgba(255,255,255,.1);color:var(--dim)}
.op-schloss .abc span.a{background:var(--gold);color:#2a1a00}
.op-schloss .abc span.b{background:var(--violet);color:#1d0636}
.op-schloss .scene{position:relative;width:300px;max-width:100%;height:236px;margin:6px auto 0}
.op-schloss .door{position:absolute;left:95px;top:0;width:110px;height:124px;perspective:600px}
.op-schloss .inner{position:absolute;inset:0;border-radius:14px 14px 6px 6px;background:radial-gradient(circle at 50% 45%,#fff6c8 0,var(--gold) 45%,hsl(30 90% 50%) 100%);display:flex;align-items:flex-start;justify-content:center;padding-top:2px;font-size:60px;line-height:1.1;font-weight:800;color:hsl(350 70% 45%);box-shadow:inset 0 0 0 4px hsl(30 70% 35%)}
.op-schloss .flap{position:absolute;inset:0;border-radius:14px 14px 6px 6px;transform-origin:0 50%;transition:transform .7s cubic-bezier(.5,0,.2,1) .1s;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:repeating-linear-gradient(115deg,rgba(255,255,255,.1) 0 10px,transparent 10px 20px),linear-gradient(160deg,hsl(335 85% 60%),hsl(8 90% 58%) 55%,hsl(32 95% 58%));box-shadow:inset 0 0 0 4px rgba(255,255,255,.35);display:flex;align-items:flex-start;justify-content:center;padding-top:8px;font-size:46px;font-weight:800;color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.25)}
.op-schloss.open .flap{transform:rotateY(-112deg)}
.op-schloss .chain{position:absolute;left:0;top:0;width:300px;height:236px;z-index:2;transition:transform .6s cubic-bezier(.6,0,1,.6),opacity .6s;pointer-events:none}
.op-schloss.open .chain{transform:translateY(200px) rotate(10deg);opacity:0}
.op-schloss .shackle{position:absolute;left:100px;top:62px;width:100px;height:52px;z-index:3;transform-origin:86px 52px;transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.op-schloss.open .shackle{transform:translateY(-14px) rotate(26deg)}
.op-schloss .lock{position:absolute;left:65px;top:106px;width:170px;height:128px;z-index:4;border-radius:26px;background:linear-gradient(160deg,hsl(48 100% 70%),hsl(38 95% 52%) 60%,hsl(30 85% 42%));box-shadow:0 8px 18px rgba(0,0,0,.45),inset 0 2px 0 rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;gap:10px;padding:0 10px;transform-origin:50% 0}
.op-schloss .lock.wig{animation:op-schloss-wig .5s}
@keyframes op-schloss-wig{0%,100%{transform:rotate(0)}15%{transform:rotate(-6deg)}35%{transform:rotate(5deg)}55%{transform:rotate(-4deg)}75%{transform:rotate(3deg)}}
.op-schloss .col{display:flex;flex-direction:column;align-items:center;background:rgba(40,20,0,.28);border-radius:16px;padding:0 4px;box-shadow:inset 0 2px 6px rgba(0,0,0,.35)}
.op-schloss .arrow{width:50px;height:40px;border:0;background:transparent;font-size:18px;color:#3a2300;padding:0;border-radius:12px}
.op-schloss .arrow:active{background:rgba(255,255,255,.35)}
.op-schloss .win{position:relative;width:50px;height:40px;border-radius:10px;overflow:hidden;background:#fffbe9;touch-action:none;cursor:ns-resize;outline-offset:2px;box-shadow:inset 0 0 8px rgba(0,0,0,.45)}
.op-schloss .win:focus-visible{outline:3px solid var(--night)}
.op-schloss .win::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(rgba(0,0,0,.28),transparent 30%,transparent 70%,rgba(0,0,0,.28))}
.op-schloss .dg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:#2a1a4a;will-change:transform}
.op-schloss .stars{position:absolute;left:0;top:0;width:300px;height:124px;pointer-events:none;z-index:1}
.op-schloss .stars span{position:absolute;font-size:18px;color:var(--gold);opacity:0;transform:scale(.2)}
.op-schloss.open .stars span{animation:op-schloss-pop .6s .2s both}
@keyframes op-schloss-pop{0%{opacity:0;transform:scale(.2)}40%{opacity:1;transform:scale(1.3)}100%{opacity:.9;transform:scale(1)}}
.op-schloss .btns{display:flex;gap:8px;margin-top:8px}
.op-schloss .btn{min-height:44px;border-radius:999px;border:1px solid var(--line);background:var(--panel);font-weight:800;padding:0 14px;white-space:nowrap;font-size:14px}
.op-schloss .btn.go{flex:1;min-width:0;border:0;background:linear-gradient(160deg,hsl(150 85% 50%),hsl(165 90% 40%));color:#032a1e;font-size:17px}
.op-schloss .btn.glow{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold),0 0 14px rgba(255,209,102,.7);animation:op-schloss-glow 1.2s ease-in-out infinite}
@keyframes op-schloss-glow{50%{box-shadow:0 0 0 2px var(--gold),0 0 4px rgba(255,209,102,.3)}}
.op-schloss .btn[disabled]{opacity:.5;cursor:default}
.op-schloss .status{margin:8px 0 0;min-height:46px;padding:7px 12px;border-radius:14px;background:rgba(0,0,0,.25);font-size:14px;line-height:1.3;display:flex;align-items:center}
.op-schloss .status.bad{background:rgba(239,71,111,.18);border:1px solid var(--red)}
.op-schloss button:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.op-schloss *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

export function mount(root, ctx) {
  if (!document.getElementById('op-style-schloss')) {
    const st = document.createElement('style'); st.id = 'op-style-schloss'; st.textContent = CSS; document.head.appendChild(st);
  }
  const { day, reduced } = ctx;
  const R = makeRiddle(day, ctx.week, ctx.secret);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const S = el('div', 'op-schloss'); root.appendChild(S);
  let vals = [0, 0], done = false, playing = false, fails = 0, tipLevel = 0;

  S.appendChild(el('p', 'task', `Türchen ${day} ist verschlossen! Löse das Rätsel und stelle ${R.kind === 'gestern' ? 'den <b>Geheimcode</b>' : 'den <b>Code mit zwei Stellen</b>'} am Schloss ein (z. B. 03).`));
  const card = el('div', 'card'); S.appendChild(card);

  // Szene
  const scene = el('div', 'scene'); S.appendChild(scene);
  const door = el('div', 'door');
  door.appendChild(el('div', 'inner', String(day)));
  door.appendChild(el('div', 'flap', '?'));
  scene.appendChild(door);
  const stars = el('div', 'stars');
  [[14, 14], [262, 24], [40, 72], [246, 80], [66, 2], [224, 4]].forEach(p => { const s = el('span', '', '✦'); s.style.left = p[0] + 'px'; s.style.top = p[1] + 'px'; stars.appendChild(s); });
  scene.appendChild(stars);

  const NS = 'http://www.w3.org/2000/svg';
  const cs = document.createElementNS(NS, 'svg'); cs.setAttribute('class', 'chain'); cs.setAttribute('viewBox', '0 0 300 236'); cs.setAttribute('aria-hidden', 'true');
  [[-6, 30, 306, 124], [306, 30, -6, 124]].forEach(l => {
    const dx = l[2] - l[0], dy = l[3] - l[1], len = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx) * 180 / Math.PI, n = Math.round(len / 15);
    for (let i = 0; i <= n; i++) {
      const x = l[0] + dx * i / n, y = l[1] + dy * i / n, e = document.createElementNS(NS, 'ellipse');
      e.setAttribute('cx', x); e.setAttribute('cy', y);
      e.setAttribute('rx', i % 2 ? 5 : 10); e.setAttribute('ry', i % 2 ? 3.5 : 6.5);
      e.setAttribute('transform', `rotate(${ang} ${x} ${y})`);
      e.setAttribute('fill', 'none'); e.setAttribute('stroke', i % 2 ? '#8d96b5' : '#cfd6ee'); e.setAttribute('stroke-width', i % 2 ? 3 : 4.5);
      cs.appendChild(e);
    }
  });
  scene.appendChild(cs);
  const sh = document.createElementNS(NS, 'svg'); sh.setAttribute('class', 'shackle'); sh.setAttribute('viewBox', '0 0 100 52'); sh.setAttribute('aria-hidden', 'true');
  sh.innerHTML = '<path d="M14 52V28A36 26 0 0 1 86 28V52" fill="none" stroke="#7d86a8" stroke-width="14"/><path d="M14 52V28A36 26 0 0 1 86 28V52" fill="none" stroke="#dfe5fa" stroke-width="8"/>';
  scene.appendChild(sh);

  const lock = el('div', 'lock'); scene.appendChild(lock);
  const wins = [];
  function setTo(i, v, dir) {
    if (done) return;
    vals[i] = v;
    const win = wins[i];
    win.setAttribute('aria-valuenow', v);
    const olds = win.querySelectorAll('.dg');
    for (let k = 0; k < olds.length - 1; k++) olds[k].remove();
    const old = olds[olds.length - 1], nw = el('div', 'dg', String(v)); win.appendChild(nw);
    if (reduced || !nw.animate) { old.remove(); return; }
    const o = { duration: 180, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'both' };
    old.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-dir * 100}%)` }], o).onfinish = () => old.remove();
    nw.animate([{ transform: `translateY(${dir * 100}%)` }, { transform: 'translateY(0)' }], o);
  }
  const step = (i, dir) => { setTo(i, (vals[i] + dir + 10) % 10, dir); ctx.audio.sfx('tick'); };
  [0, 1].forEach(i => {
    const col = el('div', 'col');
    const up = el('button', 'arrow', '▲'); up.type = 'button'; up.setAttribute('aria-label', `Rädchen ${i + 1} hoch`);
    const dn = el('button', 'arrow', '▼'); dn.type = 'button'; dn.setAttribute('aria-label', `Rädchen ${i + 1} runter`);
    const win = el('div', 'win'); win.tabIndex = 0; win.setAttribute('role', 'spinbutton');
    win.setAttribute('aria-label', `Rädchen ${i + 1}`); win.setAttribute('aria-valuemin', 0); win.setAttribute('aria-valuemax', 9); win.setAttribute('aria-valuenow', 0);
    win.appendChild(el('div', 'dg', '0'));
    col.append(up, win, dn); lock.appendChild(col); wins.push(win);
    ctx.on(up, 'click', () => step(i, 1));
    ctx.on(dn, 'click', () => step(i, -1));
    ctx.on(win, 'keydown', e => {
      if (e.key === 'ArrowUp') { e.preventDefault(); step(i, 1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); step(i, -1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); wins[0].focus(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); wins[1].focus(); }
      else if (e.key === 'Enter') { e.preventDefault(); tryOpen(); }
      else if (/^[0-9]$/.test(e.key)) { e.preventDefault(); setTo(i, +e.key, 1); if (i === 0) wins[1].focus(); }
    });
    let sy = null;
    ctx.on(win, 'pointerdown', e => { sy = e.clientY; try { win.setPointerCapture(e.pointerId); } catch (x) {} win.focus({ preventScroll: true }); });
    ctx.on(win, 'pointermove', e => { if (sy == null) return; const d = e.clientY - sy; if (Math.abs(d) >= 16) { step(i, d < 0 ? 1 : -1); sy = e.clientY; } });
    const end = () => { sy = null; };
    ctx.on(win, 'pointerup', end); ctx.on(win, 'pointercancel', end);
  });

  // Knöpfe und Status
  const btns = el('div', 'btns'); S.appendChild(btns);
  const go = el('button', 'btn go', '🔓 Öffnen'); go.type = 'button';
  const tip = el('button', 'btn', '💡 Tipp'); tip.type = 'button';
  btns.append(go, tip);
  const status = el('p', 'status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); S.appendChild(status);
  const say = (t, cls) => { status.className = 'status' + (cls ? ' ' + cls : ''); status.textContent = t; };
  const IDLE = 'Wische auf einem Rädchen hoch oder runter, tippe auf ▲ ▼ oder nimm die Pfeiltasten.';

  function tryOpen() {
    if (done) return;
    if (pad2(vals[0] * 10 + vals[1]) === R.code) {
      done = true; S.classList.add('open');
      go.disabled = true; tip.disabled = true; tip.classList.remove('glow');
      wins.forEach(w => { w.tabIndex = -1; });
      ctx.audio.sfx('jump');
      ctx.timeout(() => ctx.success(), reduced ? 30 : 800);
    } else {
      fails++;
      lock.classList.remove('wig'); void lock.offsetWidth; lock.classList.add('wig');
      ctx.audio.sfx('bad');
      say('Klick … klemmt noch. Rechne nochmal nach.', 'bad');
      if (fails >= 3 && tipLevel < 2) tip.classList.add('glow');
    }
  }
  ctx.on(go, 'click', tryOpen);
  ctx.on(lock, 'animationend', () => lock.classList.remove('wig'));
  ctx.on(tip, 'click', () => {
    if (done) return;
    tip.classList.remove('glow');
    if (tipLevel === 0) { tipLevel = 1; say('💡 Tipp 1 von 2: ' + R.hint1); tip.textContent = '💡 Noch ein Tipp'; }
    else { tipLevel = 2; ctx.hintUsed(); say('💡 Tipp 2 von 2: ' + R.hint2); tip.textContent = '💡 Tipp 2 zeigen'; }
  });

  // Rätsel
  if (R.kind === 'bild') {
    const seen = new Set(), chips = R.terms.filter(t => !seen.has(t.e) && seen.add(t.e)).map(t => `<div class="chip"><span>${t.e}</span>= ${t.v}</div>`).join('');
    const sum = R.terms.map(t => (t.op ? (t.op === '-' ? '−' : t.op) + ' ' : '') + t.e).join(' ');
    card.innerHTML = `<div class="pics">${chips}</div><div class="sum">${sum} = <i>?</i></div><p class="hint">${R.text}</p>`;
  } else if (R.kind === 'lichter') {
    const W = 320, H = 70, hues = [200, 140, 280, 180, 230, 160, 300, 100], wy = x => 14 + 12 * Math.sin(x / W * Math.PI * 4);
    let d = ''; for (let i = 0; i <= 64; i++) d += (i ? 'L' : 'M') + (i * W / 64).toFixed(1) + ' ' + wy(i * W / 64).toFixed(1);
    let svg = `<svg class="lights" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lichterkette mit 8 Birnen, eine rote und eine goldene"><path d="${d}" fill="none" stroke="#5b6aa8" stroke-width="3"/>`;
    for (let i = 0; i < 8; i++) {
      const bx = 20 + i * 40, by = wy(bx), isR = i === R.red, isG = i === R.gold;
      const fill = isG ? 'var(--gold)' : isR ? 'var(--red)' : `hsl(${hues[i]} 85% 60%)`, id = isG ? 'gold' : isR ? 'red' : '';
      svg += `<g><rect x="${bx - 4}" y="${by}" width="8" height="8" rx="2" fill="#39457d"/>`;
      if (id) svg += `<circle id="halo-${id}" cx="${bx}" cy="${by + 20}" r="20" fill="${fill}" opacity="0"/>`;
      svg += `<ellipse ${id ? `id="bulb-${id}" ` : ''}cx="${bx}" cy="${by + 20}" rx="9" ry="12" fill="${fill}" ${id ? 'stroke="#fff3c0" stroke-width="2"' : 'opacity=".6"'}/>`;
      svg += `<ellipse cx="${bx - 3}" cy="${by + 15}" rx="2.5" ry="4" fill="#fff" opacity=".45"/></g>`;
    }
    card.innerHTML = svg + '</svg>';
    const play = el('button', 'play', '▶ Abspielen'); play.type = 'button'; card.appendChild(play);
    card.appendChild(el('p', 'hint', R.text));
    const q = id => card.querySelector('#' + id);
    const light = (id, v) => { q('halo-' + id).setAttribute('opacity', v ? '.55' : '0'); q('bulb-' + id).setAttribute('opacity', v ? '1' : '.15'); };
    const UNIT = 450;
    ctx.on(play, 'click', () => {
      if (playing || done) return;
      playing = true; play.disabled = true; play.textContent = '… schau genau hin';
      say('Erst blinkt die rote Birne (Zehner), dann die goldene (Einer).');
      light('red', false); light('gold', false);
      let t = 500;
      const blink = (id, n) => { for (let k = 0; k < n; k++) { ctx.timeout(() => light(id, true), t); ctx.timeout(() => light(id, false), t + UNIT / 2); t += UNIT; } };
      blink('red', R.tens); t += 900; blink('gold', R.ones);
      ctx.timeout(() => {
        q('bulb-red').setAttribute('opacity', '1'); q('bulb-gold').setAttribute('opacity', '1');
        play.disabled = false; play.textContent = '▶ Nochmal abspielen'; playing = false;
        say('Fertig. Stelle die Zehner und Einer am Schloss ein. Du darfst nochmal abspielen.');
      }, t + 200);
    });
  } else if (R.kind === 'geheim') {
    const tiles = el('div', 'tiles'); tiles.setAttribute('aria-label', 'Geheimwort ' + R.cipher);
    const abc = el('div', 'abc');
    for (let c = 0; c < 26; c++) abc.appendChild(el('span', '', String.fromCharCode(65 + c)));
    R.cipher.split('').forEach(ch => {
      const t = el('button', 'tile', ch); t.type = 'button'; t.setAttribute('aria-label', 'Buchstabe ' + ch);
      ctx.on(t, 'click', () => {
        const idx = ch.charCodeAt(0) - 65, back = (idx - R.k + 26) % 26;
        Array.prototype.forEach.call(tiles.children, x => x.classList.toggle('on', x === t));
        Array.prototype.forEach.call(abc.children, (s, i) => { s.className = i === idx ? 'a' : i === back ? 'b' : ''; });
      });
      tiles.appendChild(t);
    });
    card.append(tiles, el('p', 'hint', R.text + ' Welche Zahl steckt im Wort?'), abc);
  } else {
    card.innerHTML = `<div class="big" aria-hidden="true">🔑 ❓❓</div><p class="hint">${R.text}</p>`;
  }
  say(IDLE);

  return { destroy() { root.innerHTML = ''; } };
}
