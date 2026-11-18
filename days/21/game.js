// Türchen 21: Glocken-Beat (Rhythmus-Spiel)
// Du spielst die Melodie selbst: jeder Treffer läutet den passenden Glockenton.
export const howto = 'Wähle ein Lied. Tippe im Takt die Spur (Touch: die vier Felder unten, Tastatur: D F J K oder Pfeiltasten), wenn ein Glöckchen die goldene Linie erreicht. So spielst du die Melodie selbst!';

const W = 360, H = 560, LW = 90, HIT_Y = 420, ZONE_Y = 462, ZONE_H = 90;
const COL = ['#ef476f', '#ffd166', '#06d6a0', '#8ecae6'];
const PERFECT = 0.07, GOOD = 0.15;       // Treffer-Fenster in Sekunden
const STRAY_COST = 0.5;                  // ein Fehltipper kostet eine halbe Note in der Quote
const KEYS = { d: 0, f: 1, j: 2, k: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
const KEYCAP = ['D', 'F', 'J', 'K'];
const ROOT = { C: 48, F: 41, G: 43, Bb: 46, D: 50 };

// ---------- Lieder (gemeinfrei, als Notenfolge "Ton/Schläge", r = Pause) ----------
const jbA = 'E5/1 E5/1 E5/2 E5/1 E5/1 E5/2 E5/1 G5/1 C5/1.5 D5/.5 E5/4';
const jbB = 'F5/1 F5/1 F5/1.5 F5/.5 F5/1 E5/1 E5/1 E5/.5 E5/.5';
const tA = 'G4/.75 G4/.25 G4/1.5 A4/.5 B4/.75 B4/.25 B4/1.5 B4/.5 A4/.5 B4/.5 C5/1 F#4/1 A4/1 G4/1.5';
const tEnd = 'G4/.75 G4/.25 G4/1.5 A4/.5 B4/.75 B4/.25 B4/1.5 B4/.5 A4/.5 B4/.5 C5/1 F#4/1 A4/1 G4/2';
const kA = 'C5/1 A4/.5 Bb4/.5 C5/.25 D5/.25 C5/.25 D5/.25 C5/1 Bb4/1 G4/.5 C5/.5 A4/2';
const kB = 'G4/.5 G4/.5 A4/.5 F4/.5 A4/1 G4/1 Bb4/.5 Bb4/.5 C5/.5 G4/.5 Bb4/1 A4/1';
const kC = 'G4/.5 G4/.5 A4/.5 B4/.5 C5/1 G4/1 A4/.5 D5/.5 C5/.5 B4/.5 D5/1 C5/1';
const kChords = ['F', 'F', 'C', 'F', 'C', 'F', 'Bb', 'F', 'C', 'C', 'G', 'C', 'F', 'F', 'C', 'F'];
const kLine = [kA, kB, kC, kA].join(' ');

export const _songs = [
  {
    id: 'jingle', name: 'Jingle Bells', level: 1, label: 'leicht', bpm: 116, meter: 4, pickup: 0, lead: 2.2,
    cut: [74, 76, 77],  // C | D | E | F und G
    stars: [0.60, 0.85, 0.97],
    seq: [jbA, jbB, 'E5/1 D5/1 D5/1 E5/1 D5/2 G5/2', jbA, jbB, 'G5/1 G5/1 F5/1 D5/1 C5/4'].join(' '),
    chords: ['C', 'C', 'C', 'C', 'F', 'C', 'C', 'G', 'C', 'C', 'C', 'C', 'F', 'C', 'G', 'C'],
  },
  {
    id: 'tanne', name: 'O Tannenbaum', level: 2, label: 'mittel', bpm: 80, meter: 3, pickup: 0.5, lead: 2.0,
    cut: [69, 71, 72],  // tief | A | H | C und höher
    stars: [0.60, 0.80, 0.92],
    seq: ['D4/.5', tA, 'D5/.5', 'D5/.5 B4/.5 E5/1.5 D5/.5 D5/.5 C5/.5 C5/1.5 C5/.5 C5/.5 A4/.5 D5/1.5 C5/.5 C5/.5 B4/.5 B4/1.5 D4/.5', tEnd].join(' '),
    chords: ['G', 'G', 'D', ['D', 'G', 'G'], 'G', 'C', 'D', 'G', 'G', 'G', 'D', ['D', 'G', 'G']],
  },
  {
    id: 'kling', name: 'Kling, Glöckchen', level: 3, label: 'schwer', bpm: 98, meter: 2, pickup: 0, lead: 1.7,
    cut: [69, 71, 74],  // F und G | A und B | H und C | D
    stars: [0.55, 0.75, 0.88],
    seq: kLine + ' ' + kLine,
    chords: [...kChords, ...kChords],
  },
];

const BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function parseSeq(s) {
  let t = 0; const notes = [];
  for (const tok of s.trim().split(/\s+/)) {
    const [nm, d] = tok.split('/'); const len = parseFloat(d);
    if (nm !== 'r') {
      const m = /^([A-G])(#|b)?(\d)$/.exec(nm);
      notes.push({ midi: 12 * (+m[3] + 1) + BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), beat: t, len });
    }
    t += len;
  }
  return { notes, total: t };
}
const laneOf = (song, midi) => song.cut.filter(c => midi >= c).length;
const multOf = c => (c >= 32 ? 4 : c >= 16 ? 3 : c >= 8 ? 2 : 1);

// ---------- Zeichenhilfen ----------
function bell(g, x, y, s, color, alpha = 1) {
  g.save(); g.translate(x, y); g.globalAlpha = alpha;
  g.fillStyle = color;
  g.beginPath(); g.arc(0, -0.58 * s, 0.14 * s, 0, 6.3); g.fill();
  g.beginPath();
  g.moveTo(-0.2 * s, -0.46 * s);
  g.bezierCurveTo(-0.22 * s, -0.05 * s, -0.6 * s, 0.05 * s, -0.64 * s, 0.4 * s);
  g.lineTo(0.64 * s, 0.4 * s);
  g.bezierCurveTo(0.6 * s, 0.05 * s, 0.22 * s, -0.05 * s, 0.2 * s, -0.46 * s);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-0.22 * s, -0.05 * s, 0.07 * s, 0.22 * s, 0.3, 0, 6.3); g.fill();
  g.fillStyle = color; g.beginPath(); g.arc(0, 0.58 * s, 0.15 * s, 0, 6.3); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-0.62 * s, 0.4 * s); g.lineTo(0.62 * s, 0.4 * s); g.stroke();
  g.restore();
}
function star(g, x, y, r, color, alpha = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = alpha; g.fillStyle = color; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(-r * 0.18, -r * 0.2, r * 0.18, 0, 6.3); g.fill();
  g.restore();
}
function note(g, lane, x, y, s, alpha = 1, color = COL[lane]) {
  if (lane === 3) star(g, x, y, s * 0.95, color, alpha); else bell(g, x, y, s, color, alpha);
}
function arrow(g, lane, x, y, r, color) {
  g.fillStyle = color; g.beginPath();
  if (lane === 0) { g.moveTo(x - r, y); g.lineTo(x + r * 0.7, y - r); g.lineTo(x + r * 0.7, y + r); }
  else if (lane === 1) { g.moveTo(x, y + r); g.lineTo(x - r, y - r * 0.7); g.lineTo(x + r, y - r * 0.7); }
  else if (lane === 2) { g.moveTo(x, y - r); g.lineTo(x - r, y + r * 0.7); g.lineTo(x + r, y + r * 0.7); }
  else { g.moveTo(x + r, y); g.lineTo(x - r * 0.7, y - r); g.lineTo(x - r * 0.7, y + r); }
  g.closePath(); g.fill();
}
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none';
    ctx.on(canvas, 'contextmenu', e => e.preventDefault());
    const A = ctx.audio;
    const mid = A.midi;
    const prepared = _songs.map(s => ({ ...s, ...parseSeq(s.seq) }));

    let phase = 'menu';
    let sel = Math.min(prepared.length - 1, Math.max(0, +ctx.load('last', 0) || 0));
    const bestStars = () => ctx.load('stars', {}) || {};
    let time = 0, S = null;
    const flakes = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.2, v: 14 + Math.random() * 26, ph: Math.random() * 6.3 }));
    const bgStars = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * 300, r: Math.random() * 1.2 + 0.3, ph: Math.random() * 6.3 }));
    let parts = [], floats = [];
    let glow = 0, glowTarget = 0, bPulse = 0;
    const pressed = [0, 0, 0, 0], flash = [0, 0, 0, 0];
    const pointers = new Map();
    let frameAt = performance.now();
    ctx.hud.set({});

    // ---------- Spielstart ----------
    function startSong(i) {
      A.unlock();
      sel = i; ctx.save('last', i);
      const song = prepared[i], b = 60 / song.bpm;
      const notes = song.notes.map(n => ({ t: n.beat * b, midi: n.midi, len: n.len * b, lane: laneOf(song, n.midi), st: 0, y: 0 }));
      const events = [];
      const clickT = k => (song.pickup - 4 + k) * b;
      for (let k = 0; k < 4; k++) events.push({ t: clickT(k), fn: d => A.tone(k === 0 ? 1500 : 1000, 0.06, 'square', 0.13, null, d) });
      // Begleitung: Bass + leises Schlagzeug auf einem Taktraster
      const endBeat = song.total;
      const m = song.meter;
      for (let k = 0; song.pickup + k < endBeat - 0.01; k++) {
        const x = song.pickup + k, t = x * b, bp = k % m, bar = Math.floor(k / m);
        let ch = song.chords[Math.min(bar, song.chords.length - 1)];
        if (Array.isArray(ch)) ch = ch[bp] || ch[ch.length - 1];
        const root = ROOT[ch];
        if (bp === 0) {
          events.push({ t, fn: d => { A.tone(mid(root), b * 0.95, 'triangle', 0.12, null, d); A.tone(115, 0.13, 'sine', 0.16, 45, d); } });
        } else if (m === 4 && bp === 2) {
          events.push({ t, fn: d => { A.tone(mid(root + 7), b * 0.8, 'triangle', 0.08, null, d); A.tone(115, 0.11, 'sine', 0.11, 45, d); } });
        } else if (m === 4 || m === 2) {
          events.push({ t, fn: d => A.noise(0.09, 0.07, d) });   // Schlag "Snare"
        } else {
          events.push({ t, fn: d => A.noise(0.05, 0.045, d) });  // Walzer: leises Ticken
        }
        events.push({ t: t + b / 2, fn: d => A.noise(0.03, 0.028, d) }); // Hi-Hat
      }
      events.sort((p, q) => p.t - q.t);
      const last = notes[notes.length - 1];
      S = {
        song, b, notes, events, ei: 0, clock: clickT(0) - 0.7, end: last.t + Math.max(last.len, 0.8) + 0.9,
        score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, stray: 0, lastHud: '', rating: null, done: false,
      };
      phase = 'play'; pressed.fill(0); flash.fill(0); pointers.clear(); parts = []; floats = [];
      glow = 0; glowTarget = 0; hud();
    }
    const hud = () => {
      const key = S.score + '|' + S.combo; if (key === S.lastHud) return; S.lastHud = key;
      ctx.hud.set({ Punkte: S.score, Combo: S.combo });
    };
    const now = () => S.clock + (ctx.paused ? 0 : Math.min(0.05, (performance.now() - frameAt) / 1000));

    // ---------- Eingabe ----------
    function bellSound(midiNote, len) {
      const f = mid(midiNote), d = Math.min(1.7, Math.max(0.55, len * 1.5));
      A.tone(f, d, 'sine', 0.3);
      A.tone(f * 2, d * 0.55, 'triangle', 0.09);
      A.tone(f * 3.01, Math.min(0.3, d * 0.3), 'sine', 0.05);
    }
    function burst(x, y, color, n, speed = 1) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.3, v = (50 + Math.random() * 130) * speed;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + Math.random() * 0.3, max: 0.8, color, size: 2 + Math.random() * 2.5, star: Math.random() < 0.35 });
      }
    }
    const say = (text, lane, color) => { floats.push({ x: lane * LW + LW / 2, y: HIT_Y - 50, text, color, life: 0.75 }); S.rating = { text, color, life: 0.7 }; };
    function breakCombo() { if (S.combo >= 8) ctx.fx.shake(120); S.combo = 0; }
    function tap(l) {
      if (phase !== 'play' || ctx.paused || S.done) return;
      pressed[l]++; flash[l] = 0.5;
      const T = now();
      let best = null, bd = 9;
      for (const n of S.notes) if (n.lane === l && n.st === 0) { const d = Math.abs(n.t - T); if (d < bd) { bd = d; best = n; } }
      if (best && bd <= GOOD) {
        const perfect = bd <= PERFECT;
        best.st = 1; best.hitAt = T;
        const mult = multOf(S.combo);
        S.score += (perfect ? 100 : 60) * mult;
        S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
        if (perfect) S.perfect++; else S.good++;
        bellSound(best.midi, best.len);
        say(perfect ? 'Perfekt!' : 'Gut', l, perfect ? '#ffd166' : '#8ecae6');
        burst(l * LW + LW / 2, HIT_Y, COL[l], perfect ? 14 : 8);
        flash[l] = 1;
        if (S.combo === 10 || S.combo === 25 || S.combo === 50) { ctx.toast(`Combo ${S.combo}!`); burst(W / 2, 90, '#ffd166', 30, 1.4); }
        hud();
      } else {
        S.stray++; breakCombo();
        A.tone(170, 0.14, 'sine', 0.12, 110);
        say('Daneben', l, '#ef476f'); hud();
      }
    }
    ctx.on(canvas, 'pointerdown', e => {
      e.preventDefault(); A.unlock();
      const p = pos(e);
      if (phase === 'menu') {
        const i = prepared.findIndex((_, k) => p.x > 28 && p.x < 332 && p.y > 128 + k * 125 && p.y < 128 + k * 125 + 112);
        if (i >= 0) { A.sfx('pop'); startSong(i); }
        return;
      }
      const l = Math.max(0, Math.min(3, Math.floor(p.x / LW)));
      pointers.set(e.pointerId, l); tap(l);
    });
    const up = e => { const l = pointers.get(e.pointerId); if (l !== undefined) { pointers.delete(e.pointerId); pressed[l] = Math.max(0, pressed[l] - 1); } };
    ctx.on(canvas, 'pointerup', up); ctx.on(canvas, 'pointercancel', up);
    const kdown = new Set();
    ctx.on(window, 'keydown', e => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (phase === 'menu') {
        if (k === 'ArrowUp') { sel = (sel + prepared.length - 1) % prepared.length; A.sfx('tick'); e.preventDefault(); }
        else if (k === 'ArrowDown') { sel = (sel + 1) % prepared.length; A.sfx('tick'); e.preventDefault(); }
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); A.sfx('pop'); startSong(sel); }
        else if (/^[1-9]$/.test(k) && prepared[+k - 1]) { A.sfx('pop'); startSong(+k - 1); }
        return;
      }
      if (!(k in KEYS) || e.repeat || kdown.has(k)) return;
      e.preventDefault(); kdown.add(k); tap(KEYS[k]);
    });
    ctx.on(window, 'keyup', e => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (kdown.delete(k) && k in KEYS) pressed[KEYS[k]] = Math.max(0, pressed[KEYS[k]] - 1);
    });

    // ---------- Ende ----------
    function finishSong() {
      S.done = true;
      const total = S.notes.length, hits = S.perfect + S.good;
      const q = Math.max(0, Math.min(1, (hits - STRAY_COST * S.stray) / total));
      const pct = Math.round(q * 100);
      const th = S.song.stars;
      const stars = q >= th[2] ? 3 : q >= th[1] ? 2 : q >= th[0] ? 1 : 0;
      const nextTh = stars < 3 ? Math.round(th[stars] * 100) : 0;
      const hint = stars === 3 ? 'Alle drei Sterne, du bist ein Glocken-Profi!'
        : `Für den ${stars + 1}. Stern brauchst du ${nextTh} % Trefferquote${stars === 0 ? '' : ' bei diesem Lied'}. Wildes Tippen kostet Punkte.`;
      const st = bestStars(); if ((st[S.song.id] || 0) < stars) { st[S.song.id] = stars; ctx.save('stars', st); }
      ctx.finish({
        won: stars >= 1, stars, score: S.score,
        text: `${S.song.name}: ${hits} von ${total} Noten getroffen, Trefferquote ${pct} %, höchste Combo ${S.maxCombo}. ${hint}`,
      });
    }

    // ---------- Zeichnen ----------
    function txt(s, x, y, size, color, align = 'center', weight = '700') {
      g.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`; g.textAlign = align; g.textBaseline = 'middle';
      g.fillStyle = color; g.fillText(s, x, y);
    }
    function background(dt) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b1437'); gr.addColorStop(1, '#16275c');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (const s of bgStars) { g.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.5 + s.ph); g.fillStyle = '#fff'; g.fillRect(s.x, s.y, s.r, s.r); }
      g.globalAlpha = 1;
      // Nordlicht
      if (glow > 0.02) {
        const cols = ['#06d6a0', '#c77dff', '#8ecae6'];
        for (let i = 0; i < 3; i++) {
          g.fillStyle = cols[i];
          for (let layer = 0; layer < 3; layer++) {
            g.globalAlpha = glow * (0.07 + 0.05 * bPulse) * (1 - layer * 0.25);
            g.beginPath(); g.moveTo(0, 0);
            const base = 60 + i * 70 + layer * 22;
            for (let x = 0; x <= W; x += 12) g.lineTo(x, base + Math.sin(time * 0.7 + i * 2 + x * 0.018) * 26 + Math.sin(time * 1.3 + x * 0.04 + i) * 8);
            for (let x = W; x >= 0; x -= 12) g.lineTo(x, base + 90 + layer * 18 + Math.sin(time * 0.9 + i * 3 + x * 0.015) * 22);
            g.closePath(); g.fill();
          }
        }
        g.globalAlpha = 1;
      }
      // Schnee, bei hoher Combo im Takt kräftiger
      g.fillStyle = '#fff';
      const boost = 1 + glow * 2.2 * bPulse;
      for (const f of flakes) {
        f.y += f.v * boost * dt; f.x += Math.sin(time + f.ph) * 8 * dt;
        if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
        g.globalAlpha = 0.45 + 0.4 * glow * bPulse; g.beginPath(); g.arc(f.x, f.y, f.r * (1 + 0.3 * glow * bPulse), 0, 6.3); g.fill();
      }
      g.globalAlpha = 1;
    }
    function drawMenu() {
      txt('Glocken-Beat', W / 2, 52, 32, '#ffd166');
      txt('Spiele die Melodie selbst. Wähle ein Lied!', W / 2, 90, 14, '#cfe3f5', 'center', '500');
      const bs = bestStars();
      prepared.forEach((s, i) => {
        const y = 128 + i * 125, on = i === sel;
        g.fillStyle = on ? 'rgba(255,209,102,.22)' : 'rgba(255,255,255,.08)'; rrect(g, 28, y, 304, 112, 16); g.fill();
        g.strokeStyle = on ? '#ffd166' : 'rgba(255,255,255,.2)'; g.lineWidth = on ? 3 : 1.5; rrect(g, 28, y, 304, 112, 16); g.stroke();
        bell(g, 66, y + 44, 17, COL[i]);
        txt(s.name, 96, y + 36, 21, '#fff', 'left');
        txt(`${s.label} · ${s.bpm} Schläge/min`, 96, y + 62, 13, '#cfe3f5', 'left', '500');
        for (let k = 0; k < 3; k++) star(g, 108 + k * 24, y + 90, 9, k < (bs[s.id] || 0) ? '#ffd166' : 'rgba(255,255,255,.2)');
        for (let k = 0; k < 3; k++) { g.fillStyle = k < s.level ? COL[i] : 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(270 + k * 18, y + 90, 5, 0, 6.3); g.fill(); }
        if (on) txt(ctx.input.isTouch ? 'Tippen!' : 'Enter', 296, y + 36, 13, '#ffd166', 'center');
      });
      txt(ctx.input.isTouch ? 'Tippe auf ein Lied' : 'Tippen/Klicken oder Pfeil hoch/runter + Enter', W / 2, 536, 12, '#8ecae6', 'center', '500');
    }
    function drawPlay(dt) {
      const T = S.clock, speed = (HIT_Y + 40) / S.song.lead;
      // Spuren
      for (let l = 0; l < 4; l++) {
        g.fillStyle = l % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.07)'; g.fillRect(l * LW, 0, LW, ZONE_Y);
        if (flash[l] > 0) { const gr = g.createLinearGradient(0, HIT_Y - 220, 0, HIT_Y + 40); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, COL[l]); g.globalAlpha = flash[l] * 0.35; g.fillStyle = gr; g.fillRect(l * LW, HIT_Y - 220, LW, 260); g.globalAlpha = 1; }
      }
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
      for (let l = 1; l < 4; l++) { g.beginPath(); g.moveTo(l * LW, 0); g.lineTo(l * LW, ZONE_Y); g.stroke(); }
      // Trefferlinie
      g.strokeStyle = 'rgba(255,209,102,.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, HIT_Y); g.lineTo(W, HIT_Y); g.stroke();
      for (let l = 0; l < 4; l++) {
        const cx = l * LW + LW / 2, pr = 1 + flash[l] * 0.25;
        g.strokeStyle = COL[l]; g.lineWidth = 3; g.globalAlpha = 0.85; g.beginPath(); g.arc(cx, HIT_Y, 30 * pr, 0, 6.3); g.stroke(); g.globalAlpha = 1;
      }
      // Noten
      for (const n of S.notes) {
        const y = HIT_Y - (n.t - T) * speed, cx = n.lane * LW + LW / 2;
        if (n.st === 1 || y < -40 || y > H + 40) continue;
        if (n.st === 2) { note(g, n.lane, cx, y, 20, 0.3, '#7b88a8'); continue; }
        g.shadowColor = COL[n.lane]; g.shadowBlur = 10; note(g, n.lane, cx, y, 21); g.shadowBlur = 0;
      }
      // Partikel
      for (const p of parts) {
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt;
        g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.color;
        if (p.star) star(g, p.x, p.y, p.size + 1, p.color, Math.max(0, p.life / p.max)); else g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      g.globalAlpha = 1; parts = parts.filter(p => p.life > 0);
      // Tippfelder
      for (let l = 0; l < 4; l++) {
        const x = l * LW + 4, w = LW - 8, on = pressed[l] > 0;
        g.fillStyle = COL[l]; g.globalAlpha = on ? 0.75 : 0.28 + flash[l] * 0.3; rrect(g, x, ZONE_Y, w, ZONE_H, 16); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = COL[l]; g.lineWidth = 2.5; rrect(g, x, ZONE_Y, w, ZONE_H, 16); g.stroke();
        if (ctx.input.isTouch) { bell(g, l * LW + LW / 2, ZONE_Y + 44, 17, '#fff', 0.9); }
        else { txt(KEYCAP[l], l * LW + LW / 2, ZONE_Y + 34, 26, '#fff'); arrow(g, l, l * LW + LW / 2, ZONE_Y + 66, 8, 'rgba(255,255,255,.8)'); }
      }
      // Kopfzeile
      const first = S.notes[0].t, lastT = S.notes[S.notes.length - 1].t;
      g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, 0, W, 5);
      g.fillStyle = '#ffd166'; g.fillRect(0, 0, W * Math.max(0, Math.min(1, (T - first) / (lastT - first))), 5);
      txt(S.song.name, 10, 20, 13, 'rgba(255,255,255,.7)', 'left', '600');
      if (S.combo >= 2) {
        const mu = multOf(S.combo), pop = 1 + Math.max(0, S.rating ? S.rating.life - 0.45 : 0) * 0.6;
        txt(`${S.combo}`, W / 2, 62, 40 * pop, mu > 1 ? '#ffd166' : '#fff');
        txt(mu > 1 ? `Combo  ×${mu}` : 'Combo', W / 2, 92, 15, mu > 1 ? '#ffd166' : '#cfe3f5');
      }
      // Bewertung
      for (const f of floats) {
        f.life -= dt; f.y -= 28 * dt; g.globalAlpha = Math.max(0, Math.min(1, f.life * 2.2));
        txt(f.text, f.x, f.y, 15, f.color); g.globalAlpha = 1;
      }
      floats = floats.filter(f => f.life > 0);
      if (S.rating) { S.rating.life -= dt; if (S.rating.life <= 0) S.rating = null; }
      // Einzähler
      if (T < 0) {
        const idx = Math.floor((T - (S.song.pickup - 4) * S.b) / S.b);
        const label = idx < 0 ? 'Bereit?' : String(idx + 1);
        const frac = idx < 0 ? 0.5 : ((T - (S.song.pickup - 4) * S.b) / S.b) % 1;
        g.globalAlpha = idx < 0 ? 0.9 : 1 - frac * 0.55;
        txt(label, W / 2, 230, idx < 0 ? 38 : 90 * (1.15 - frac * 0.25), '#ffd166'); g.globalAlpha = 1;
        txt('Tippe im Takt, wenn die Glöckchen die Linie erreichen', W / 2, 292, 12, '#cfe3f5', 'center', '500');
      }
    }

    ctx.loop(dt => {
      time += dt; frameAt = performance.now();
      if (phase === 'play' && !S.done) {
        S.clock += dt;
        while (S.ei < S.events.length && S.events[S.ei].t - S.clock <= 0.1) {
          const e = S.events[S.ei++]; if (e.t > S.clock - 0.3) e.fn(Math.max(0, e.t - S.clock));
        }
        for (const n of S.notes) if (n.st === 0 && S.clock - n.t > GOOD) {
          n.st = 2; S.miss++; breakCombo(); say('Daneben', n.lane, '#ef476f'); hud();
        }
        const beatPh = S.clock >= 0 ? ((S.clock / S.b) % 1) : 1;
        bPulse = Math.max(0, 1 - beatPh * 3);
        glowTarget = Math.max(0, Math.min(1, (S.combo - 6) / 22));
        if (S.clock > S.end) finishSong();
      } else bPulse = 0.3 + 0.2 * Math.sin(time * 2);
      if (phase === 'menu') glowTarget = 0.45;
      glow += (glowTarget - glow) * Math.min(1, dt * 2);
      for (let l = 0; l < 4; l++) flash[l] = Math.max(0, flash[l] - dt * 3);
      background(dt);
      if (phase === 'menu') drawMenu(); else drawPlay(dt);
    });

    return { destroy() {} };
  },
};
