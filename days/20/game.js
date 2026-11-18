// Türchen 20: Kugel-Fusion (Physik-Verschmelz-Spiel mit Weihnachtsdeko im Glas)
import { createWorld, RADII, MAXLV, JAR, DANGER_SECONDS } from './physik.js';
import { drawBall, NAMES, TINT } from './balls.js';

export const howto = 'Lass die Deko ins Glas fallen: zwei gleiche Kugeln verschmelzen zur nächsten Stufe! Mit Maus oder Finger zielen und loslassen (Tastatur: ◀ ▶ und Leertaste). Liegt etwas zu lange über der roten Linie, ist Schluss. Einmal pro Spiel hilft „Schütteln“ (Taste B).';

const W = 360, H = 560, HAND_Y = 130;
const DROP_W = [20, 24, 24, 20, 12];           // Gewichte für die Stufen 1 bis 5, die als neue Kugel kommen
const PTS = [0, 2, 4, 8, 14, 22, 34, 50, 70, 100];
const SEMI = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];   // Pentatonik: Ton steigt mit der Stufe
const STAR_AT = [6, 7, 8];                          // erreichte Stufe (0-basiert) für 1, 2, 3 Sterne  (= Stufe 7, 8, 9)
const BTN = { x: 262, y: 4, w: 92, h: 40 };         // "Schütteln" auf der Leinwand
const TAU = Math.PI * 2;

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    canvas.style.touchAction = 'none';
    const world = createWorld();
    let time = 0, score = 0, hi = 0, drops = 0, over = false, endT = 0;
    let combo = 0, comboT = 0, comboShow = 0, comboVal = 0;
    let hand = null, next = pick(), cool = 0.2, shakeUsed = false, shakeVis = 0, hitCool = 0, warnT = 0;
    let parts = [], rings = [], floats = [];
    const bestLv = ctx.load('hi', -1);
    const hoverStars = Array.from({ length: 36 }, () => ({ x: Math.random() * W, y: Math.random() * 330, p: Math.random() * 6, s: 0.6 + Math.random() * 1.2 }));
    const snow = Array.from({ length: 34 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 12 + Math.random() * 22, r: 0.8 + Math.random() * 1.6, p: Math.random() * 6 }));
    let ptr = { down: false, id: null, consumed: false };

    function pick() {
      if (drops < 3) return Math.floor(Math.random() * 2);
      let q = Math.random() * DROP_W.reduce((a, b) => a + b, 0);
      for (let i = 0; i < DROP_W.length; i++) { if ((q -= DROP_W[i]) < 0) return i; }
      return 0;
    }
    const clampX = (x, lv) => Math.min(JAR.r - RADII[lv], Math.max(JAR.l + RADII[lv], x));
    const freq = (lv, bonus = 0) => 261.63 * Math.pow(2, (SEMI[lv] + bonus) / 12);
    const hud = () => ctx.hud.set({ Punkte: score, Stufe: `${hi + 1}/10`, Rekord: Math.max(ctx.best(), score) });
    hud();
    ctx.input.pad({ dpad: 'lr', a: 'Fallen', b: 'Schütteln' });
    ctx.toast('Gleiche Kugeln verschmelzen!', 2200);

    // ---------- Aktionen ----------
    function spawnHand() { hand = { level: next, x: hand ? hand.x : W / 2, t: 0 }; next = pick(); hand.x = clampX(hand.x, hand.level); }
    spawnHand(); hand.t = 1;

    function drop() {
      if (over || ctx.paused || !hand || hand.t < 0.5) return;
      const b = world.add(hand.level, hand.x, HAND_Y, 0, 80);
      b.age = 0; drops++;
      ctx.audio.tone(520, 0.07, 'sine', 0.16, 300);
      hand = null; cool = 0.38;
    }
    function shake() {
      if (over || ctx.paused || shakeUsed) return;
      shakeUsed = true; world.shake(); shakeVis = 0.8;
      ctx.audio.sfx('boom'); ctx.fx.shake(); ctx.toast('Schüüütteln!', 1000);
    }

    function burst(x, y, lv, n) {
      const c = TINT[lv];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = 60 + Math.random() * (140 + lv * 14);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50, life: 0.55 + Math.random() * 0.45, max: 1, c: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? c : '#ffd166', s: 1.5 + Math.random() * 2.5, star: i % 4 === 0 });
      }
      rings.push({ x, y, r: RADII[lv] * 0.6, to: RADII[lv] * 1.9, life: 0.4, c: c });
    }

    function onMerge(e) {
      combo = comboT > 0 ? combo + 1 : 1; comboT = 0.9;
      const pts = PTS[e.level] * combo; score += pts;
      burst(e.x, e.y, e.level, 12 + e.level * 3);
      floats.push({ x: e.x, y: e.y - e.r * 0.4, text: '+' + pts, life: 1, c: combo > 1 ? '#ffd166' : '#ffffff', size: 14 + Math.min(10, e.level * 1.5) });
      const bonus = Math.min(combo - 1, 6) * 2;
      ctx.audio.tone(freq(e.level, bonus), 0.28, 'sine', 0.3, null, 0);
      ctx.audio.tone(freq(e.level, bonus) * 2, 0.2, 'triangle', 0.1, null, 0.04);
      if (combo >= 2) { comboShow = 1.1; comboVal = combo; ctx.audio.tone(freq(e.level, bonus + 7), 0.18, 'triangle', 0.14, null, 0.09); }
      if (e.level >= 5) ctx.fx.shake(e.level >= 7 ? 400 : 220);
      if (e.level > hi) {
        hi = e.level; ctx.save('hi', Math.max(hi, ctx.load('hi', -1)));
        const star = STAR_AT.indexOf(hi) + 1;
        if (star > 0) { ctx.toast(`Stufe ${hi + 1}: ${NAMES[hi]}! Stern ${star} sicher`, 2000); ctx.audio.sfx('level'); ctx.fx.confetti(30 + star * 20); }
        else if (hi >= 2) ctx.toast(`Neu: ${NAMES[hi]}!`, 1300);
      }
      hud();
    }

    // ---------- Eingabe ----------
    ctx.input.onPress(n => { if (n === 'a') drop(); else if (n === 'b') shake(); });
    const inBtn = p => p.x >= BTN.x && p.x <= BTN.x + BTN.w && p.y >= BTN.y && p.y <= BTN.y + BTN.h;
    const aim = p => { if (hand && !over) hand.x = clampX(p.x, hand.level); };
    ctx.on(canvas, 'pointermove', e => { aim(pos(e)); });
    ctx.on(canvas, 'pointerdown', e => {
      const p = pos(e);
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      ptr = { down: true, id: e.pointerId, consumed: false };
      if (inBtn(p)) { ptr.consumed = true; shake(); return; }
      aim(p);
    });
    ctx.on(canvas, 'pointerup', e => {
      if (!ptr.down || e.pointerId !== ptr.id) return;
      const was = ptr; ptr = { down: false, id: null, consumed: false };
      if (was.consumed) return;
      aim(pos(e)); drop();
    });
    ctx.on(canvas, 'pointercancel', () => { ptr = { down: false, id: null, consumed: false }; });

    // ---------- Update ----------
    function update(dt) {
      time += dt;
      if (comboT > 0) comboT -= dt;
      if (comboShow > 0) comboShow -= dt;
      if (shakeVis > 0) shakeVis -= dt;
      if (hitCool > 0) hitCool -= dt;
      if (!over) {
        const ax = ctx.input.axis().x;
        if (hand && ax) hand.x = clampX(hand.x + ax * 300 * dt, hand.level);
        if (hand && hand.t < 1) hand.t = Math.min(1, hand.t + dt * 4);
        if (!hand && (cool -= dt) <= 0) spawnHand();
        world.step(dt);
        for (const e of world.events) {
          if (e.type === 'merge') onMerge(e);
          else if (e.type === 'vanish') {
            score += 400; burst(e.x, e.y, MAXLV, 50); ctx.audio.sfx('win'); ctx.fx.confetti(80);
            floats.push({ x: e.x, y: e.y, text: '+400 Supernova!', life: 1.6, c: '#ffe27a', size: 20 }); hud();
          } else if (e.type === 'hit' && hitCool <= 0) {
            hitCool = 0.05; ctx.audio.tone(150 + Math.min(e.v, 700) * 0.15, 0.05, 'sine', Math.min(0.14, e.v / 5000));
          }
        }
        world.events.length = 0;
        // Warn-Ticken
        if (world.danger > 0.5 && (warnT -= dt) <= 0) { warnT = 0.28; ctx.audio.sfx('tick'); }
        if (world.over) {
          over = true; endT = 1.5; ctx.audio.sfx('boom'); ctx.fx.shake(); ctx.toast('Das Glas ist voll!', 1400);
          for (const b of world.balls) burst(b.x, b.y, b.level, 3);
        }
      } else {
        endT -= dt;
        if (endT <= 0) { endT = 99; end(); }
      }
      for (const p of parts) { p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      parts = parts.filter(p => p.life > 0);
      for (const r of rings) r.life -= dt; rings = rings.filter(r => r.life > 0);
      for (const f of floats) { f.life -= dt; f.y -= 26 * dt; } floats = floats.filter(f => f.life > 0);
      for (const s of snow) { s.y += s.v * dt; s.x += Math.sin(time + s.p) * 8 * dt; if (s.y > H + 4) { s.y = -4; s.x = Math.random() * W; } }
    }

    function end() {
      const stars = STAR_AT.filter(l => hi >= l).length;
      const name = `${NAMES[hi]} (Stufe ${hi + 1})`;
      const need = stars >= 3 ? '' : ` Für ${stars + 1} Stern${stars ? 'e' : ''} musst du Stufe ${STAR_AT[stars] + 1} (${NAMES[STAR_AT[stars]]}) schaffen.`;
      ctx.finish({
        won: stars >= 1, stars, score,
        text: stars >= 3 ? `Wahnsinn, du hast ${name} gebaut! Das Glas ist ein Meisterwerk.` : `Höchste Stufe: ${name}.${need}`,
      });
    }

    // ---------- Zeichnen ----------
    function roundRect(x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }

    function drawBackground() {
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0b1437'); bg.addColorStop(0.7, '#13215a'); bg.addColorStop(1, '#1a2a6b');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      for (const s of hoverStars) { g.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(time * 1.3 + s.p)); g.fillStyle = '#fff'; g.fillRect(s.x, s.y, s.s, s.s); }
      g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,.55)';
      for (const s of snow) { g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); }
    }

    function drawJarBack(ox) {
      g.save(); g.translate(ox, 0);
      const L = JAR.l, R = JAR.r, F = JAR.floor, T = JAR.top;
      g.fillStyle = 'rgba(170,215,255,.07)'; g.fillRect(L, T, R - L, F - T);
      // Gefahrenzone leicht rötlich, wenn es brenzlig wird
      if (world.danger > 0.15) { g.fillStyle = `rgba(239,71,111,${0.1 + 0.1 * Math.sin(time * 14)})`; g.fillRect(L, T, R - L, JAR.danger - T); }
      g.restore();
    }
    function drawJarFront(ox) {
      g.save(); g.translate(ox, 0);
      const L = JAR.l, R = JAR.r, F = JAR.floor, T = JAR.top;
      // Glanzstreifen
      const gl = g.createLinearGradient(L, 0, R, 0);
      gl.addColorStop(0, 'rgba(255,255,255,.12)'); gl.addColorStop(0.2, 'rgba(255,255,255,.02)'); gl.addColorStop(0.85, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,.08)');
      g.fillStyle = gl; g.fillRect(L, T, R - L, F - T);
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(L + 9, T + 36); g.lineTo(L + 9, T + 170); g.stroke();
      // Glas
      g.strokeStyle = 'rgba(205,232,255,.75)'; g.lineWidth = 4; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(L - 9, T); g.lineTo(L, T); g.lineTo(L, F - 10); g.quadraticCurveTo(L, F + 2, L + 12, F + 2); g.lineTo(R - 12, F + 2); g.quadraticCurveTo(R, F + 2, R, F - 10); g.lineTo(R, T); g.lineTo(R + 9, T); g.stroke();
      g.restore();
    }
    function drawDanger(ox) {
      const y = JAR.danger, d = world.danger;
      const blink = d > 0.3 ? 0.5 + 0.5 * Math.sin(time * (10 + d * 8)) : 0;
      g.save(); g.translate(ox, 0);
      g.strokeStyle = d > 0.3 ? `rgba(239,71,111,${0.5 + 0.5 * blink})` : 'rgba(239,71,111,.4)';
      g.lineWidth = d > 0.3 ? 3 : 2; g.setLineDash([10, 8]); g.lineDashOffset = -time * 14;
      g.beginPath(); g.moveTo(JAR.l, y); g.lineTo(JAR.r, y); g.stroke(); g.setLineDash([]);
      if (d > 0.3) {
        const k = Math.min(1, d / DANGER_SECONDS);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(JAR.l + 60, y - 18, JAR.r - JAR.l - 120, 8);
        g.fillStyle = '#ef476f'; g.fillRect(JAR.l + 60, y - 18, (JAR.r - JAR.l - 120) * k, 8);
        g.fillStyle = '#fff'; g.font = 'bold 12px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom';
        g.fillText('Achtung!', W / 2, y - 22);
      }
      g.restore();
    }
    function drawShelf() {
      g.fillStyle = '#6b3f1f'; roundRect(JAR.l - 14, JAR.floor + 4, JAR.r - JAR.l + 28, 14, 5); g.fill();
      g.fillStyle = '#8a5428'; g.fillRect(JAR.l - 12, JAR.floor + 5, JAR.r - JAR.l + 24, 3);
      g.fillStyle = 'rgba(255,255,255,.9)'; roundRect(JAR.l - 8, JAR.floor + 1, JAR.r - JAR.l + 16, 5, 3); g.fill();
    }
    function drawBalls(ox) {
      g.save(); g.translate(ox, 0);
      for (const b of world.balls) {
        const ma = b.ma;
        const sq = ma < 0.7 ? 1 - 0.3 * Math.exp(-ma * 9) * Math.cos(ma * 24) : 1;
        const mood = b.above > 0.35 || (over && world.danger > 0 && b.above > 0) ? 'scared' : ma < 0.7 ? 'happy' : '';
        drawBall(g, b.level, b.x, b.y, b.r, b.rot, { t: time, id: b.id, sq, mood, glow: ma < 0.25 ? 14 : 0 });
        if (b.above > 0.35 && !over) { g.strokeStyle = `rgba(239,71,111,${0.4 + 0.4 * Math.sin(time * 16)})`; g.lineWidth = 2.5; g.beginPath(); g.arc(b.x, b.y, b.r + 2, 0, TAU); g.stroke(); }
      }
      g.restore();
    }
    function drawHand() {
      if (!hand || over) return;
      const r = RADII[hand.level], s = hand.t;
      const sc = s < 1 ? 0.3 + 0.7 * (1 - Math.pow(1 - s, 3)) : 1;
      // Hilfslinie
      let land = JAR.floor - r;
      for (const b of world.balls) { const dx = Math.abs(b.x - hand.x), rr = r + b.r; if (dx < rr) land = Math.min(land, b.y - Math.sqrt(rr * rr - dx * dx)); }
      if (land > HAND_Y + r) {
        g.strokeStyle = 'rgba(255,209,102,.45)'; g.lineWidth = 2; g.setLineDash([3, 7]); g.lineCap = 'round';
        g.beginPath(); g.moveTo(hand.x, HAND_Y + r + 2); g.lineTo(hand.x, land); g.stroke(); g.setLineDash([]);
        g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1.5; g.beginPath(); g.arc(hand.x, land, r, 0, TAU); g.stroke();
      }
      g.strokeStyle = 'rgba(255,209,102,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hand.x, 46); g.lineTo(hand.x, HAND_Y - r * sc + 2); g.stroke();
      drawBall(g, hand.level, hand.x, HAND_Y, r, Math.sin(time * 2) * 0.12, { t: time, id: 99, sq: sc });
    }
    function drawParticles() {
      for (const p of parts) {
        g.globalAlpha = Math.max(0, Math.min(1, p.life * 2.2)); g.fillStyle = p.c;
        if (p.star) { g.save(); g.translate(p.x, p.y); g.rotate(p.life * 6); g.fillRect(-p.s, -p.s * 0.3, p.s * 2, p.s * 0.6); g.fillRect(-p.s * 0.3, -p.s, p.s * 0.6, p.s * 2); g.restore(); }
        else { g.beginPath(); g.arc(p.x, p.y, p.s, 0, TAU); g.fill(); }
      }
      g.globalAlpha = 1;
      for (const r of rings) { const k = 1 - r.life / 0.4; g.globalAlpha = 1 - k; g.strokeStyle = r.c; g.lineWidth = 3 * (1 - k) + 1; g.beginPath(); g.arc(r.x, r.y, r.r + (r.to - r.r) * k, 0, TAU); g.stroke(); }
      g.globalAlpha = 1;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const f of floats) { g.globalAlpha = Math.min(1, f.life * 2); g.font = `bold ${f.size}px system-ui, sans-serif`; g.lineWidth = 3; g.strokeStyle = 'rgba(20,10,50,.8)'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.c; g.fillText(f.text, f.x, f.y); }
      g.globalAlpha = 1;
      if (comboShow > 0 && comboVal >= 2) {
        const k = Math.min(1, (1.1 - comboShow) * 6), sc = 0.6 + 0.4 * Math.min(1, k) + Math.sin(k * Math.PI) * 0.25;
        g.save(); g.translate(W / 2, 285); g.scale(sc, sc); g.globalAlpha = Math.min(1, comboShow * 3);
        g.font = '900 40px system-ui, sans-serif'; g.lineWidth = 6; g.strokeStyle = '#6a1b9a'; g.strokeText(`Kombo x${comboVal}!`, 0, 0);
        g.fillStyle = '#ffd166'; g.fillText(`Kombo x${comboVal}!`, 0, 0); g.restore();
      }
    }
    function drawUI() {
      // Vorschau "Danach"
      g.fillStyle = 'rgba(255,255,255,.08)'; roundRect(8, 4, 120, 40, 12); g.fill();
      g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '600 12px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('Danach', 18, 24);
      drawBall(g, next, 96, 24, RADII[next] * 0.46, 0, { t: time, id: 5 });
      // Schütteln
      const on = !shakeUsed && !over;
      g.fillStyle = on ? 'rgba(199,125,255,.35)' : 'rgba(255,255,255,.06)'; roundRect(BTN.x, BTN.y, BTN.w, BTN.h, 12); g.fill();
      g.strokeStyle = on ? '#c77dff' : 'rgba(255,255,255,.15)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = on ? '#fff' : 'rgba(255,255,255,.35)'; g.textAlign = 'center'; g.font = '700 13px system-ui, sans-serif';
      g.fillText(on ? 'Schütteln' : 'benutzt', BTN.x + BTN.w / 2, BTN.y + (on ? 14 : 20));
      if (on) { g.font = '600 10px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.65)'; g.fillText('einmal · Taste B', BTN.x + BTN.w / 2, BTN.y + 29); }
      // Evolution-Leiste
      const y = 541, pitch = 32, x0 = 38;
      g.strokeStyle = 'rgba(255,209,102,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + pitch * 9, y); g.stroke();
      for (let i = 0; i <= MAXLV; i++) {
        const x = x0 + i * pitch, r = 6 + i * 0.95, got = i <= hi;
        drawBall(g, i, x, y, r, 0, { t: time, id: i, alpha: got ? 1 : 0.3 });
        if (i === hi) { g.strokeStyle = '#ffd166'; g.lineWidth = 2.2; g.shadowColor = '#ffd166'; g.shadowBlur = 8 + 4 * Math.sin(time * 5); g.beginPath(); g.arc(x, y, r + 3.5, 0, TAU); g.stroke(); g.shadowBlur = 0; }
        if (i === bestLv && bestLv > hi) { g.fillStyle = '#8ecae6'; g.beginPath(); g.arc(x, y - r - 5, 2.2, 0, TAU); g.fill(); }
      }
      // Sterne-Markierungen unter 7/8/9
      g.fillStyle = 'rgba(255,209,102,.85)'; g.font = '10px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      STAR_AT.forEach((l, k) => g.fillText('★'.repeat(k + 1), x0 + l * pitch, 558));
    }

    function draw() {
      const ox = shakeVis > 0 ? Math.sin(time * 75) * 5 * (shakeVis / 0.8) : 0;
      drawBackground();
      drawJarBack(ox);
      drawBalls(ox);
      drawDanger(ox);
      drawJarFront(ox);
      drawShelf();
      drawHand();
      drawParticles();
      drawUI();
      if (over) { g.fillStyle = `rgba(239,71,111,${Math.max(0, 0.25 - (1.5 - endT) * 0.1)})`; g.fillRect(0, 0, W, H); }
    }

    ctx.loop(dt => { update(dt); draw(); });
    return { destroy() {} };
  },
};
