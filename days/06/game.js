// Türchen 6: Schlittenflug (Nikolaustag). Logik in sim.js, Zeichnen und Effekte hier.
import { W, H, SX, createWorld, step, throwGift } from './sim.js';

export const howto = 'Halte die Leertaste (oder die linke Bildschirmhälfte / Knopf „Hoch“), um zu steigen, loslassen = sinken. Taste X, ↓ oder rechte Bildschirmhälfte / Knopf „Geschenk“ wirft ein Geschenk: triff die leuchtenden Schornsteine! Weiche Wolken, Blitzen, Vögeln und Kirchtürmen aus.';

// Sterne-Grenzen (Punkte)
const GY = 534;
const STAR1 = 350, STAR2 = 1500, STAR3 = 4000;

const SCHEMES = [
  { top: '#0b1437', bot: '#243a7c', m1: '#2c3d82', m2: '#1d2b63', roof: '#c5d4f7', wall: '#5a4a8a', aur: 0 },
  { top: '#1a0b3f', bot: '#4b2a86', m1: '#5a3a9a', m2: '#37226e', roof: '#e0d0ff', wall: '#7a4a8a', aur: 0 },
  { top: '#03172b', bot: '#0d4a52', m1: '#1d5d6c', m2: '#103f55', roof: '#d6fff0', wall: '#3f6a8a', aur: 1 },
  { top: '#050719', bot: '#1c1450', m1: '#2a2a75', m2: '#16164a', roof: '#c8e4ff', wall: '#4a4a9a', aur: 0 },
  { top: '#2a1040', bot: '#a24a63', m1: '#7a3f7a', m2: '#4d2760', roof: '#ffe3d6', wall: '#8a4a6a', aur: 0 },
];
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const SCH = SCHEMES.map(s => ({ top: hex(s.top), bot: hex(s.bot), m1: hex(s.m1), m2: hex(s.m2), roof: hex(s.roof), wall: hex(s.wall), aur: s.aur }));
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const WALLS = ['#7a4a6a', '#4f6aa0', '#a0645a', '#4f8a7a'];

export default {
  create(ctx) {
    const { g, canvas, pos } = ctx.makeCanvas(W, H);
    const w = createWorld();
    const cur = { top: [...SCH[0].top], bot: [...SCH[0].bot], m1: [...SCH[0].m1], m2: [...SCH[0].m2], roof: [...SCH[0].roof], wall: [...SCH[0].wall], aur: 0 };
    let parts = [], floats = [], flash = 0, redFlash = 0, time = 0, scroll = 0, shake = 0;
    let starChain = 0, starChainT = 0, comboPop = 0, bellT = 0, finished = false, pointerHold = 0, lastHud = '', trailT = 0;
    const flakes = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 1.6, p: Math.random() * 6 }));
    const sky = Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * 330, s: 0.6 + Math.random() * 1.4, p: Math.random() * 6 }));
    let shoot = null;
    const A = ctx.audio;

    // ---------- Musik ----------
    const TUNE = [[76, .5], [79, .5], [84, 1], [83, 1], [0, 1], [81, .5], [79, .5], [76, 2], [0, 1], [74, .5], [77, .5], [81, 1], [79, 1], [0, 1], [76, .5], [74, .5], [72, 2], [0, 1],
      [79, 1], [79, .5], [81, .5], [79, 1], [76, 1], [77, 1], [77, .5], [79, .5], [77, 1], [74, 1], [76, .5], [79, .5], [84, 1], [83, .5], [81, .5], [79, 1], [84, 3], [0, 1]];
    let stopMusic = null;
    const music = () => { stopMusic?.(); stopMusic = A.melody(TUNE, { bpm: 112, type: 'triangle', vol: 0.06, loop: true }); };
    music();
    ctx.onPause(p => { if (p) { stopMusic?.(); stopMusic = null; } else if (!finished && !w.dead) music(); });

    // ---------- Steuerung ----------
    const ids = new Set();
    const gift = () => { if (!finished && !ctx.paused) throwGift(w); };
    ctx.input.onPress(n => { if (n === 'b' || n === 'down') gift(); });
    ctx.input.pad({ a: 'Hoch', b: 'Geschenk' });
    ctx.on(canvas, 'pointerdown', e => {
      const p = pos(e);
      if (p.x >= W / 2) gift(); else { ids.add(e.pointerId); pointerHold = ids.size; }
    });
    const rel = e => { ids.delete(e.pointerId); pointerHold = ids.size; };
    ctx.on(window, 'pointerup', rel); ctx.on(window, 'pointercancel', rel);
    ctx.on(canvas, 'contextmenu', e => e.preventDefault());

    // ---------- Partikel ----------
    const MAXP = 420;
    const spark = (x, y, color, n = 10, sp = 140, life = 0.6, size = 3, grav = 200) => {
      for (let i = 0; i < n && parts.length < MAXP; i++) {
        const a = Math.random() * 6.283, v = sp * (0.25 + Math.random() * 0.75);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, color, size: size * (0.6 + Math.random() * 0.8), grav, t: 's' });
      }
    };
    const hearts = (x, y, n) => { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 90, life: 1.1, max: 1.1, color: '#ef476f', size: 6 + Math.random() * 4, grav: 30, t: 'h' }); };
    const text = (x, y, s, color = '#ffd166', big = 1) => floats.push({ x, y, s, color, life: 1.1, big });
    const pent = [0, 2, 4, 7, 9];
    const note = (i, vol = 0.17, d = 0.14) => A.tone(A.midi(72 + pent[i % 5] + 12 * Math.floor(i / 5)), d, 'triangle', vol);

    function handle(ev) {
      switch (ev.type) {
        case 'star':
          starChain = starChainT > 0 ? Math.min(starChain + 1, 14) : 0; starChainT = 0.9;
          note(starChain); spark(ev.x, ev.y, '#ffd166', 7, 110, 0.5, 2.6, 0);
          break;
        case 'ginger':
          A.sfx('power'); hearts(ev.x, ev.y, 10); spark(ev.x, ev.y, '#f4a261', 14, 150, 0.7);
          ctx.toast('Lebkuchen! +1 Herz', 1200); text(ev.x, ev.y - 20, '+1 ♥', '#ef476f', 1.4);
          break;
        case 'throw': A.sfx('swoosh'); break;
        case 'chimney': {
          const cols = ['#ffd166', '#ef476f', '#06d6a0', '#8ecae6', '#ffffff', '#c77dff'];
          for (let i = 0; i < 4; i++) spark(ev.x, ev.y, cols[(i + ev.combo) % cols.length], ev.gold ? 14 : 10, 190, 0.8, 3.4, 260);
          for (let i = 0; i < 6; i++) parts.push({ x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 50, vy: -120 - Math.random() * 120, life: 0.9, max: 0.9, color: '#ffd166', size: 7, grav: 120, t: 'star' });
          text(ev.x, ev.y - 14, '+' + ev.pts, ev.gold ? '#fff3b0' : '#ffd166', 1 + Math.min(ev.combo, 8) * 0.07);
          const k = Math.min(ev.combo - 1, 7);
          [0, 2, 4].forEach((o, i) => A.tone(A.midi(67 + pent[(k + i) % 5] + 12 * Math.floor((k + i) / 5)), 0.2, 'triangle', 0.2, null, i * 0.06));
          A.tone(A.midi(91), 0.25, 'sine', 0.08, null, 0.2);
          comboPop = 1; if (ev.combo >= 2) ctx.fx.shake(120);
          if (ev.combo % 5 === 0) { ctx.fx.confetti(40); ctx.toast(`Combo x${ev.combo}!`, 1000); A.sfx('level'); }
          break;
        }
        case 'miss': spark(ev.x, ev.y, '#ffffff', 8, 80, 0.4, 3, 120); A.tone(150, 0.1, 'sine', 0.12, 80); break;
        case 'combobreak': text(ev.x, ev.y - 20, 'Combo weg', '#8ecae6', 0.9); break;
        case 'warn': A.tone(1500, 0.07, 'square', 0.05); A.tone(1500, 0.07, 'square', 0.05, null, 0.15); break;
        case 'bolt': flash = 0.45; A.noise(0.3, 0.2); A.tone(90, 0.3, 'sawtooth', 0.14, 40); break;
        case 'hit':
          A.sfx('hit'); ctx.fx.shake(350); redFlash = 0.5; shake = 0.3;
          spark(ev.x, ev.y, '#ef476f', 16, 200, 0.7, 3.5); spark(ev.x, ev.y, '#ffffff', 10, 140, 0.5, 2.6);
          text(ev.x + 30, ev.y - 22, ev.hearts > 0 ? 'Autsch!' : 'Oh nein!', '#ff8fa3', 1.2);
          break;
        case 'dead':
          stopMusic?.(); stopMusic = null; A.sfx('boom'); spark(SX, w.y, '#ffd166', 30, 260, 1, 4);
          ctx.timeout(end, 1500);
          break;
        case 'section':
          if (ev.i > 0) { ctx.toast(ev.name, 2200); A.sfx('level'); ctx.fx.confetti(25); }
          else ctx.toast(ev.name, 2000);
          break;
      }
    }

    function end() {
      if (finished) return; finished = true;
      const sc = Math.floor(w.score);
      const stars = sc >= STAR3 ? 3 : sc >= STAR2 ? 2 : sc >= STAR1 ? 1 : 0;
      const need = stars === 3 ? '' : stars === 2 ? ` Noch ${STAR3 - sc} Punkte bis zum dritten Stern: sammle mehr Sterne und triff Schornsteine hintereinander!`
        : stars === 1 ? ` Noch ${STAR2 - sc} Punkte bis zum zweiten Stern: Schornstein-Combos geben viele Punkte!`
          : ` Ab ${STAR1} Punkten gibt es den ersten Stern: sammle Sterne und wirf Geschenke in Schornsteine.`;
      ctx.finish({
        won: stars >= 1, stars, score: sc,
        text: `${Math.round(w.t)} Sekunden geflogen, ${w.starsGot} Sterne gesammelt, beste Combo x${w.bestCombo}.${stars === 3 ? ' Du bist der beste Schlittenpilot!' : need}`,
      });
    }

    // ---------- Zeichnen ----------
    const heart = (x, y, s) => { g.beginPath(); g.moveTo(x, y + s * 0.35); g.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.5, y - s, x, y - s * 0.35); g.bezierCurveTo(x + s * 0.5, y - s, x + s, y - s * 0.4, x, y + s * 0.35); g.closePath(); g.fill(); };
    const star = (x, y, r, rot = 0) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } g.closePath(); g.fill(); };

    function ridge(off, base, amp, f, color, capColor) {
      const pts = [];
      for (let x = -6; x <= W + 6; x += 6) pts.push([x, base - (Math.abs(Math.sin((x + off) * f)) * amp + Math.sin((x + off) * f * 2.7 + 1) * amp * 0.25)]);
      const path = () => { g.beginPath(); g.moveTo(-6, H); pts.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(W + 6, H); g.closePath(); };
      g.fillStyle = color; path(); g.fill();
      g.strokeStyle = capColor; g.lineWidth = 2; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    }

    function drawBackground() {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, css(cur.top)); gr.addColorStop(0.75, css(cur.bot)); gr.addColorStop(1, css(cur.bot));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (const s of sky) {
        const x = ((s.x - scroll * 0.02) % W + W) % W;
        g.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(time * 1.5 + s.p));
        g.fillStyle = '#fff'; g.fillRect(x, s.y, s.s, s.s);
      }
      g.globalAlpha = 1;
      if (w.section % 5 === 3) {
        if (!shoot && Math.random() < 0.01) shoot = { x: 60 + Math.random() * 280, y: 20 + Math.random() * 100, t: 0 };
        if (shoot) { shoot.t += 0.016; const k = shoot.t / 0.5; g.strokeStyle = `rgba(255,255,255,${1 - k})`; g.lineWidth = 2; g.beginPath(); g.moveTo(shoot.x - k * 90, shoot.y + k * 40); g.lineTo(shoot.x - k * 90 + 28, shoot.y + k * 40 - 12); g.stroke(); if (k >= 1) shoot = null; }
      }
      if (cur.aur > 0.02) {
        for (let b = 0; b < 3; b++) {
          const col = ['6,214,160', '142,202,230', '199,125,255'][b];
          const y0 = 70 + b * 26, grd = g.createLinearGradient(0, y0 - 30, 0, y0 + 70);
          grd.addColorStop(0, `rgba(${col},0)`); grd.addColorStop(0.35, `rgba(${col},${0.34 * cur.aur})`); grd.addColorStop(1, `rgba(${col},0)`);
          g.fillStyle = grd; g.beginPath(); g.moveTo(0, y0 + 80);
          for (let x = 0; x <= W; x += 12) g.lineTo(x, y0 + Math.sin(x * 0.022 + time * 0.7 + b * 1.7) * 20 + Math.sin(x * 0.07 + time * 1.3) * 5 - 30);
          g.lineTo(W, y0 + 80); g.closePath(); g.fill();
        }
      }
      // Mond
      const mx = 292 - scroll * 0.004 % 40, my = 78;
      g.fillStyle = 'rgba(255,244,200,.12)'; g.beginPath(); g.arc(mx, my, 44, 0, 6.3); g.fill();
      g.fillStyle = '#fff4c8'; g.beginPath(); g.arc(mx, my, 24, 0, 6.3); g.fill();
      g.fillStyle = css(cur.top); g.beginPath(); g.arc(mx + 10, my - 6, 21, 0, 6.3); g.fill();
      ridge(scroll * 0.08, 400, 120, 0.0075, css(cur.m2), 'rgba(255,255,255,.5)');
      ridge(scroll * 0.2 + 300, 450, 85, 0.011, css(cur.m1), 'rgba(255,255,255,.65)');
      // Tannen
      g.fillStyle = 'rgba(8,20,40,.55)';
      for (let i = 0; i < 12; i++) {
        const x = ((i * 47 - scroll * 0.4) % 560 + 560) % 560 - 40, hh = 26 + (i * 13) % 16;
        g.beginPath(); g.moveTo(x, 520); g.lineTo(x + 9, 520 - hh); g.lineTo(x + 18, 520); g.fill();
        g.beginPath(); g.moveTo(x + 2, 520 - hh * 0.4); g.lineTo(x + 9, 520 - hh * 1.2); g.lineTo(x + 16, 520 - hh * 0.4); g.fill();
      }
    }

    function drawGround() {
      const gr = g.createLinearGradient(0, GY - 6, 0, H); gr.addColorStop(0, '#f2f7ff'); gr.addColorStop(1, '#a9bde6');
      g.fillStyle = gr; g.fillRect(0, GY, W, H - GY);
      g.beginPath(); g.moveTo(0, GY + 4);
      for (let x = 0; x <= W; x += 10) g.lineTo(x, GY - 3 - Math.sin((x + scroll) * 0.05) * 3);
      g.lineTo(W, GY + 10); g.lineTo(0, GY + 10); g.fill();
    }

    function drawHouse(h) {
      if (h.x < -90 || h.x > W + 90) return;
      if (h.kind === 'church') {
        const x = h.x, top = h.top, nave = '#6a5a9a';
        g.fillStyle = nave; g.fillRect(x - 24, GY - 56, 48, 60);
        g.fillStyle = css(cur.roof); g.beginPath(); g.moveTo(x - 30, GY - 54); g.lineTo(x, GY - 82); g.lineTo(x + 30, GY - 54); g.fill();
        g.fillStyle = '#7d6bb0'; g.fillRect(x - 12, top + 34, 24, GY - top - 30);
        g.fillStyle = '#51407f'; g.fillRect(x + 6, top + 34, 6, GY - top - 30);
        g.fillStyle = css(cur.roof); g.beginPath(); g.moveTo(x - 16, top + 38); g.lineTo(x, top); g.lineTo(x + 16, top + 38); g.closePath(); g.fill();
        g.fillStyle = '#b8a7e6'; g.beginPath(); g.moveTo(x - 10, top + 38); g.lineTo(x, top + 8); g.lineTo(x + 10, top + 38); g.fill();
        g.strokeStyle = '#ffd166'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, top); g.lineTo(x, top - 12); g.moveTo(x - 5, top - 8); g.lineTo(x + 5, top - 8); g.stroke();
        g.fillStyle = '#ffd166'; g.beginPath(); g.arc(x, top + 54, 7, 0, 6.3); g.fill();
        g.strokeStyle = '#51407f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, top + 54); g.lineTo(x, top + 49); g.moveTo(x, top + 54); g.lineTo(x + 4, top + 56); g.stroke();
        g.fillStyle = '#2a1f4d'; g.beginPath(); g.arc(x, top + 80, 5, Math.PI, 0); g.fillRect(x - 5, top + 80, 10, 14); g.fill();
        g.fillStyle = '#ffd166'; g.globalAlpha = 0.9; g.fillRect(x - 15, GY - 38, 6, 12); g.fillRect(x + 9, GY - 38, 6, 12); g.globalAlpha = 1;
        return;
      }
      const x = h.x, hw = h.w / 2, peak = h.roofY - 6, eave = h.roofY + 24, c = h.ch, cx = x + c.dx;
      // Schornstein (hinter dem Dach)
      g.fillStyle = c.gold ? '#e0a526' : '#9a4a3a'; g.fillRect(cx - 8, c.top, 16, eave - c.top - 8);
      g.fillStyle = c.gold ? '#ffe28a' : '#c26a55'; g.fillRect(cx - 8, c.top, 16, 4);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(cx + 3, c.top + 4, 5, 20);
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, c.top - 1, 10, 4, 0, 0, 6.3); g.fill();
      // Wand + Dach
      g.fillStyle = WALLS[h.shade]; g.fillRect(x - hw + 4, eave - 6, h.w - 8, GY - eave + 8);
      const lit = 0.75 + 0.25 * Math.sin(time * 3 + h.id);
      g.fillStyle = `rgba(255,214,110,${lit})`; g.fillRect(x - hw + 12, eave + 2, 10, 9); if (h.w > 78) g.fillRect(x + hw - 22, eave + 2, 10, 9);
      g.fillStyle = css(cur.roof); g.beginPath(); g.moveTo(x - hw - 6, eave); g.lineTo(x, peak); g.lineTo(x + hw + 6, eave); g.closePath(); g.fill();
      g.fillStyle = 'rgba(70,60,120,.38)'; g.beginPath(); g.moveTo(x, peak); g.lineTo(x + hw + 6, eave); g.lineTo(x + 2, eave); g.closePath(); g.fill();
      // Zielhilfe
      if (c.ready && !c.used) {
        const p = 0.5 + 0.5 * Math.sin(time * 14);
        g.strokeStyle = `rgba(255,224,102,${0.6 + 0.4 * p})`; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, c.top - 1, 15 + p * 4, 7 + p * 2, 0, 0, 6.3); g.stroke();
        g.fillStyle = '#ffe066'; g.beginPath(); g.moveTo(cx - 8, c.top - 30 - p * 4); g.lineTo(cx + 8, c.top - 30 - p * 4); g.lineTo(cx, c.top - 16 - p * 4); g.closePath(); g.fill();
      }
      if (c.gold) { g.fillStyle = `rgba(255,240,170,${0.5 + 0.5 * Math.sin(time * 8 + h.id)})`; star(cx + 12, c.top - 6, 4, time); }
      // Rauch
      if (!c.used) for (let k = 0; k < 3; k++) {
        const age = (time * 0.5 + h.id * 0.37 + k / 3) % 1;
        g.fillStyle = `rgba(230,236,255,${(1 - age) * 0.32})`; g.beginPath(); g.arc(cx - age * 14 + Math.sin(age * 6 + h.id) * 3, c.top - 6 - age * 38, 3 + age * 7, 0, 6.3); g.fill();
      }
    }

    function drawCloud(o) {
      const warn = o.bolt && o.bolt.st === 'warn', strike = o.bolt && o.bolt.st === 'strike';
      const fl = warn ? (Math.sin(time * 30) > 0 ? 1 : 0) : 0;
      const base = strike ? '#5b5380' : fl ? '#6a5f8f' : '#2f2a52';
      const puffs = [[-0.55, 0.15, 0.55], [-0.2, -0.3, 0.62], [0.25, -0.2, 0.62], [0.6, 0.12, 0.5], [0, 0.25, 0.7]];
      g.save(); g.translate(o.x, o.y);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(2, 6, o.rx + 4, o.ry, 0, 0, 6.3); g.fill();
      g.fillStyle = base; g.strokeStyle = strike || warn ? '#ffe066' : '#6a60a0'; g.lineWidth = 2;
      for (const p of puffs) { g.beginPath(); g.arc(p[0] * o.rx, p[1] * o.ry, p[2] * o.ry * 1.2, 0, 6.3); g.fill(); }
      for (const p of puffs) { g.beginPath(); g.arc(p[0] * o.rx, p[1] * o.ry, p[2] * o.ry * 1.2, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      g.fillStyle = '#16122e'; g.beginPath(); g.arc(-8, 4, 2.4, 0, 6.3); g.arc(8, 4, 2.4, 0, 6.3); g.fill();
      g.strokeStyle = '#16122e'; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, -3); g.lineTo(-3, 0); g.moveTo(9, -3); g.lineTo(3, 0); g.stroke();
      if (o.bolt && o.bolt.st !== 'strike') {
        // Warnlinie
        const a = warn ? 0.5 + 0.5 * Math.sin(time * 30) : 0.16;
        g.strokeStyle = `rgba(255,224,102,${a})`; g.lineWidth = 2; g.setLineDash([5, 7]); g.beginPath(); g.moveTo(0, o.ry); g.lineTo(0, o.ry + 160); g.stroke(); g.setLineDash([]);
        if (warn) { g.fillStyle = '#ffe066'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.fillText('!', 0, o.ry + 20 + 150 * (1 - o.bolt.t / 0.85) * 0.0); }
      }
      if (strike) {
        g.shadowColor = '#ffe066'; g.shadowBlur = 18; g.strokeStyle = '#fffbe0'; g.lineWidth = 5; g.lineJoin = 'miter';
        g.beginPath(); g.moveTo(0, o.ry - 4);
        let y = o.ry - 4, k = 0; while (y < o.ry + 170) { y += 22; k++; g.lineTo((k % 2 ? 11 : -11) * (1 - y / 360), y); }
        g.stroke(); g.shadowBlur = 0;
      }
      g.restore();
    }

    function drawBird(o) {
      const flap = Math.sin(time * 16 + o.ph);
      g.save(); g.translate(o.x, o.y);
      g.fillStyle = '#e8eeff'; g.beginPath(); g.ellipse(0, 0, 14, 8, 0, 0, 6.3); g.fill();
      g.fillStyle = '#cdd8f5'; g.beginPath(); g.ellipse(2, 3, 9, 4, 0, 0, 6.3); g.fill();
      g.fillStyle = '#b8c6ee'; g.beginPath(); g.moveTo(-4, -2); g.lineTo(4, -2); g.lineTo(-2, -2 - flap * 18 - 4); g.closePath(); g.fill();
      g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(-13, -1); g.lineTo(-22, 2); g.lineTo(-13, 4); g.fill();
      g.fillStyle = '#ef476f'; g.beginPath(); g.arc(-8, -3, 4, 0, 6.3); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(-8, -3, 1.6, 0, 6.3); g.fill();
      g.fillStyle = '#e8eeff'; g.beginPath(); g.moveTo(13, 0); g.lineTo(22, -4); g.lineTo(21, 4); g.fill();
      g.restore();
    }

    function drawGust(o) {
      g.save(); g.globalAlpha = 0.14 + 0.06 * Math.sin(time * 4); g.fillStyle = '#d6ecff';
      g.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(235,245,255,.75)'; g.lineWidth = 2; g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const k = (time * 1.6 + i * 0.37) % 1, x = o.x - o.w / 2 + ((i * 53) % o.w), y = o.y - o.h / 2 + 8 + ((i * 29) % (o.h - 16)) + o.dir * k * 14;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - 26, y - o.dir * 6); g.stroke();
      }
      g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(o.dir > 0 ? '▼' : '▲', o.x, o.y + Math.sin(time * 5) * 4);
      g.restore();
    }

    function drawPickup(p) {
      if (p.kind === 'star') {
        const s = 1 + 0.15 * Math.sin(time * 6 + p.ph);
        g.fillStyle = 'rgba(255,209,102,.22)'; g.beginPath(); g.arc(p.x, p.y, 13 * s, 0, 6.3); g.fill();
        g.fillStyle = '#ffd166'; star(p.x, p.y, 9 * s, time * 1.5 + p.ph);
        g.fillStyle = '#fff3b0'; star(p.x, p.y, 4 * s, time * 1.5 + p.ph);
      } else {
        const bob = Math.sin(time * 5) * 3;
        g.save(); g.translate(p.x, p.y + bob);
        g.fillStyle = 'rgba(239,71,111,.25)'; g.beginPath(); g.arc(0, 0, 24 + Math.sin(time * 8) * 2, 0, 6.3); g.fill();
        g.fillStyle = '#b8683a';
        g.beginPath(); g.arc(0, -9, 7, 0, 6.3); g.fill();
        g.beginPath(); g.roundRect(-6, -3, 12, 13, 4); g.fill(); g.fillRect(-15, -2, 30, 6); g.fillRect(-10, 8, 7, 9); g.fillRect(3, 8, 7, 9);
        g.fillStyle = '#fff'; g.fillRect(-2, -2, 4, 2); g.beginPath(); g.arc(-3, -10, 1.3, 0, 6.3); g.arc(3, -10, 1.3, 0, 6.3); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, -8, 3, 0.2, Math.PI - 0.2); g.stroke();
        g.fillStyle = '#ef476f'; heart(0, -24, 7);
        g.restore();
      }
    }

    function drawGift(q) {
      g.save(); g.translate(q.x, q.y); g.rotate(q.rot);
      g.fillStyle = '#ef476f'; g.fillRect(-7, -7, 14, 14);
      g.fillStyle = '#ffd166'; g.fillRect(-2, -7, 4, 14); g.fillRect(-7, -2, 14, 4);
      g.beginPath(); g.arc(-3, -9, 3.2, 0, 6.3); g.arc(3, -9, 3.2, 0, 6.3); g.fill();
      g.restore();
    }

    function drawSleigh() {
      const dead = w.dead;
      if (!dead && w.inv > 0 && Math.floor(time * 16) % 2) return;
      g.save(); g.translate(SX, w.y);
      const tilt = dead ? w.deadT * 4 : Math.max(-0.4, Math.min(0.4, w.vy / 420));
      g.rotate(tilt);
      const bob = dead ? 0 : Math.sin(time * 8) * 1.2;
      // Rentier
      const gx = 44, run = Math.sin(time * 14);
      g.strokeStyle = '#8a5a3a'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(gx - 8, 4 + bob); g.lineTo(gx - 14 + run * 5, 14); g.moveTo(gx + 6, 4 + bob); g.lineTo(gx + 12 - run * 5, 14);
      g.moveTo(gx - 3, 4 + bob); g.lineTo(gx - 6 - run * 5, 14); g.moveTo(gx + 10, 3 + bob); g.lineTo(gx + 18 + run * 5, 13); g.stroke();
      g.fillStyle = '#a0683f'; g.beginPath(); g.ellipse(gx, -2 + bob, 14, 7, 0, 0, 6.3); g.fill();
      g.strokeStyle = '#a0683f'; g.lineWidth = 5; g.beginPath(); g.moveTo(gx + 10, -4 + bob); g.lineTo(gx + 17, -12 + bob); g.stroke();
      g.fillStyle = '#b87a4d'; g.beginPath(); g.ellipse(gx + 20, -13 + bob, 7, 5.5, 0.2, 0, 6.3); g.fill();
      g.strokeStyle = '#e8d3a8'; g.lineWidth = 2; g.beginPath(); g.moveTo(gx + 17, -17 + bob); g.lineTo(gx + 15, -26 + bob); g.lineTo(gx + 10, -28 + bob); g.moveTo(gx + 15, -23 + bob); g.lineTo(gx + 20, -27 + bob); g.stroke();
      g.fillStyle = 'rgba(239,71,111,.35)'; g.beginPath(); g.arc(gx + 26, -12 + bob, 7 + Math.sin(time * 9), 0, 6.3); g.fill();
      g.fillStyle = '#ef476f'; g.beginPath(); g.arc(gx + 26, -12 + bob, 3.6, 0, 6.3); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(gx + 21, -15 + bob, 1.3, 0, 6.3); g.fill();
      // Leine
      g.strokeStyle = '#ffd166'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(22, 4); g.lineTo(gx - 10, 0 + bob); g.stroke();
      // Kufe
      g.strokeStyle = '#ffd166'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(-24, 17); g.lineTo(18, 17); g.quadraticCurveTo(28, 17, 26, 8); g.stroke();
      g.lineWidth = 2.5; g.beginPath(); g.moveTo(-12, 17); g.lineTo(-12, 10); g.moveTo(10, 17); g.lineTo(10, 10); g.stroke();
      // Korb
      g.fillStyle = '#d62f4f'; g.beginPath(); g.moveTo(-22, -4); g.lineTo(22, -4); g.quadraticCurveTo(26, 8, 14, 11); g.lineTo(-17, 11); g.quadraticCurveTo(-27, 6, -22, -4); g.fill();
      g.strokeStyle = '#ffd166'; g.lineWidth = 2; g.beginPath(); g.moveTo(-22, -4); g.lineTo(22, -4); g.stroke();
      // Sack
      g.fillStyle = '#a07040'; g.beginPath(); g.arc(-15, -9, 9, 0, 6.3); g.fill(); g.fillStyle = '#ef476f'; g.fillRect(-18, -19, 6, 4); g.fillStyle = '#ffd166'; g.fillRect(-16, -19, 2, 4);
      // Nikolaus
      g.fillStyle = '#e63950'; g.beginPath(); g.arc(2, -9, 10, 0, 6.3); g.fill();
      g.fillStyle = '#2a1a1a'; g.fillRect(-7, -7, 18, 3);
      g.fillStyle = '#f9d5b6'; g.beginPath(); g.arc(3, -23, 6.5, 0, 6.3); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(5, -19, 6, 0.2, 3, false); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(6, -24, 1.2, 0, 6.3); g.fill();
      g.fillStyle = '#e63950'; g.beginPath(); g.moveTo(-3, -27); g.lineTo(9, -28); g.quadraticCurveTo(0, -42, -12, -34 + Math.sin(time * 9) * 2); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.fillRect(-3, -29, 13, 3); g.beginPath(); g.arc(-12, -34 + Math.sin(time * 9) * 2, 3.2, 0, 6.3); g.fill();
      g.restore();
    }

    function drawHud() {
      for (let i = 0; i < 5; i++) {
        if (i >= Math.max(3, w.hearts)) break;
        g.fillStyle = i < w.hearts ? '#ef476f' : 'rgba(255,255,255,.22)'; heart(20 + i * 22, 20, 9);
      }
      if (w.combo >= 2) {
        const s = 1 + comboPop * 0.35;
        g.save(); g.translate(W / 2, 54); g.scale(s, s); g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = 'bold 22px sans-serif'; g.lineWidth = 4; g.strokeStyle = 'rgba(11,20,55,.85)'; g.fillStyle = '#ffd166';
        g.strokeText(`Combo x${w.combo}`, 0, 0); g.fillText(`Combo x${w.combo}`, 0, 0); g.restore();
      }
      if (w.t < 6) {
        g.globalAlpha = Math.min(1, (6 - w.t)); g.fillStyle = 'rgba(11,20,55,.7)'; g.beginPath(); g.roundRect(24, 96, W - 48, 50, 12); g.fill();
        g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(ctx.input.isTouch ? 'Halten = steigen · „Geschenk“ = werfen' : 'Leertaste halten = steigen', W / 2, 112);
        g.fillText(ctx.input.isTouch ? 'Triff die leuchtenden Schornsteine!' : 'X oder ↓ = Geschenk werfen', W / 2, 132);
        g.globalAlpha = 1;
      }
    }

    function render() {
      drawBackground();
      const gusts = w.obs.filter(o => o.type === 'gust');
      gusts.forEach(drawGust);
      drawGround();
      w.houses.forEach(drawHouse);
      w.pickups.forEach(drawPickup);
      w.obs.forEach(o => { if (o.type === 'cloud') drawCloud(o); else if (o.type === 'bird') drawBird(o); });
      w.gifts.forEach(drawGift);
      // Wurf-Vorschau
      if (!w.dead && w.cool <= 0) {
        g.fillStyle = 'rgba(255,255,255,.35)';
        let x = SX + 8, y = w.y + 16, vy = 40;
        for (let i = 0; i < 14; i++) { vy += 560 * 0.06; x += 30 * 0.06; y += vy * 0.06; if (i % 2) { g.beginPath(); g.arc(x, y, 1.6, 0, 6.3); g.fill(); } if (y > 480) break; }
      }
      drawSleigh();
      for (const p of parts) {
        g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.4)); g.fillStyle = p.color;
        if (p.t === 'h') heart(p.x, p.y, p.size); else if (p.t === 'star') star(p.x, p.y, p.size * p.life / p.max + 2, p.life * 5); else g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      g.globalAlpha = 1;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const f of floats) { g.globalAlpha = Math.min(1, f.life * 1.5); g.font = `bold ${Math.round(18 * f.big)}px sans-serif`; g.lineWidth = 4; g.strokeStyle = 'rgba(11,20,55,.85)'; g.strokeText(f.s, f.x, f.y); g.fillStyle = f.color; g.fillText(f.s, f.x, f.y); }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.8)';
      for (const f of flakes) { g.beginPath(); g.arc(f.x, f.y, f.s, 0, 6.3); g.fill(); }
      if (flash > 0) { g.fillStyle = `rgba(255,250,210,${flash * 0.6})`; g.fillRect(0, 0, W, H); }
      if (redFlash > 0) { const v = g.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 380); v.addColorStop(0, 'rgba(239,71,111,0)'); v.addColorStop(1, `rgba(239,71,111,${redFlash})`); g.fillStyle = v; g.fillRect(0, 0, W, H); }
      drawHud();
    }

    // ---------- Schleife ----------
    ctx.loop(dt0 => {
      const dt = Math.max(0.0001, dt0);
      time += dt;
      const hold = !finished && (ctx.input.down('a') || ctx.input.down('up') || pointerHold > 0);
      if (!finished) step(w, dt, hold);
      scroll += w.speed * dt;
      for (const ev of w.events) handle(ev);
      w.events.length = 0;
      // Farbschema
      const s = SCH[w.section % SCH.length], k = Math.min(1, dt * 1.1);
      for (const key of ['top', 'bot', 'm1', 'm2', 'roof', 'wall']) for (let i = 0; i < 3; i++) cur[key][i] += (s[key][i] - cur[key][i]) * k;
      cur.aur += (s.aur - cur.aur) * k;
      // Effekte
      if (starChainT > 0) starChainT -= dt;
      comboPop = Math.max(0, comboPop - dt * 4); flash = Math.max(0, flash - dt * 2.2); redFlash = Math.max(0, redFlash - dt * 1.5);
      trailT -= dt;
      if (!w.dead && trailT <= 0) {
        trailT = hold ? 0.022 : 0.06;
        parts.push({ x: SX - 24 + Math.random() * 4, y: w.y + 16 + Math.random() * 4, vx: -w.speed * 0.5 - Math.random() * 30, vy: (Math.random() - 0.5) * 30 + (hold ? 40 : 0), life: 0.55, max: 0.55, color: Math.random() < 0.5 ? '#ffd166' : '#fff3b0', size: hold ? 3.4 : 2.2, grav: 0, t: 's' });
      }
      for (const p of parts) { p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.t === 's' && p.grav === 0 && p.vx < 0) p.x -= w.speed * dt * 0.5; }
      parts = parts.filter(p => p.life > 0);
      for (const f of floats) { f.y -= 40 * dt; f.life -= dt; f.x -= w.speed * dt * 0.4; }
      floats = floats.filter(f => f.life > 0);
      for (const f of flakes) { f.x -= (w.speed * 0.5 + f.s * 20) * dt; f.y += (30 + f.s * 24) * dt; f.x += Math.sin(time + f.p) * 0.3; if (f.y > H) { f.y = -4; f.x = Math.random() * W + 40; } if (f.x < -4) f.x = W + 4; }
      // Hud
      const sc = Math.floor(w.score), hs = `${sc}|${w.combo}`;
      if (hs !== lastHud) { lastHud = hs; ctx.hud.set({ Punkte: sc, Combo: w.combo >= 2 ? 'x' + w.combo : '-', Rekord: Math.max(ctx.best(), sc) }); }
      g.save();
      if (shake > 0) { shake -= dt; g.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7); }
      render();
      g.restore();
    });

    return { destroy() { stopMusic?.(); stopMusic = null; } };
  },
};
