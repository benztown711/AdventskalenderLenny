// Türchen 2: Lichterketten-Schlange (Referenz-Spiel für den Spiel-Vertrag)
export const howto = {
  touch: 'Wische in die Richtung, in die die Lichterkette kriechen soll (oder nimm die Pfeil-Knöpfe). Sammle Glühbirnen, aber beiß dir nicht in den Schwanz und bleib weg vom Rand!',
  keys: 'Steuere die Lichterkette mit den Pfeiltasten. Sammle Glühbirnen, aber beiß dir nicht in den Schwanz und bleib weg vom Rand!',
};
export const starsInfo = '★ ab 8 Lichtern · ★★ ab 18 · ★★★ ab 30';

const COLS = 18, ROWS = 24, S = 20;
const COLORS = ['#ef476f', '#ffd166', '#06d6a0', '#8ecae6', '#c77dff'];

export default {
  create(ctx) {
    const { g, w, h } = ctx.makeCanvas(COLS * S, ROWS * S);
    let snake = [{ x: 9, y: 14 }, { x: 9, y: 15 }, { x: 9, y: 16 }];
    let dir = { x: 0, y: -1 }, queue = [], food = null, bonus = null;
    let score = 0, acc = 0, speed = 6.5, dead = false, sparks = [], time = 0;
    const DIRS = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };

    const free = () => {
      let p;
      do p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      while (snake.some(s => s.x === p.x && s.y === p.y));
      return p;
    };
    const turn = name => {
      const d = DIRS[name]; if (!d) return;
      const last = queue[queue.length - 1] || dir;
      if (d.x === -last.x && d.y === -last.y) return;
      if (d.x === last.x && d.y === last.y) return;
      if (queue.length < 2) queue.push(d);
    };
    ctx.input.onPress(turn);
    ctx.input.onSwipe(turn);
    ctx.input.pad({ dpad: true });
    food = free();
    const hud = () => ctx.hud.set({ '💡': score, 'Rekord': Math.max(ctx.best(), score) });
    hud();

    function burst(x, y, color, n = 12) {
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, v = 40 + Math.random() * 120; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, color }); }
    }
    function step() {
      if (queue.length) dir = queue.shift();
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || snake.slice(0, -1).some(s => s.x === head.x && s.y === head.y)) {
        dead = true; ctx.audio.sfx('boom'); ctx.fx.shake();
        snake.forEach((s, i) => burst(s.x * S + 10, s.y * S + 10, COLORS[i % 5], 5));
        ctx.timeout(() => ctx.finish({
          won: score >= 30, stars: score >= 30 ? 3 : score >= 18 ? 2 : score >= 8 ? 1 : 0, score,
          text: score >= 30 ? 'Was für eine Lichterkette!' : `Du hast ${score} Lichter gesammelt. Ab 8 gibt es den ersten Stern, ab 30 alle drei!`,
        }), 900);
        return;
      }
      snake.unshift(head);
      let grew = false;
      if (head.x === food.x && head.y === food.y) {
        score++; grew = true; ctx.audio.sfx('coin'); burst(head.x * S + 10, head.y * S + 10, '#ffd166');
        food = free(); speed = Math.min(14, 6.5 + score * 0.22);
        if (score % 6 === 0) { bonus = { ...free(), ttl: 6 }; ctx.toast('⭐ Bonus-Stern!'); }
        if (score % 10 === 0) { ctx.audio.sfx('level'); ctx.toast('Schneller! 🚀'); }
      }
      if (bonus && head.x === bonus.x && head.y === bonus.y) {
        score += 3; ctx.audio.sfx('power'); burst(head.x * S + 10, head.y * S + 10, '#fff', 24); bonus = null;
      }
      if (!grew) snake.pop();
      hud();
    }

    function draw() {
      g.fillStyle = '#0b1437'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.035)';
      for (let y = 0; y < ROWS; y++) for (let x = y % 2; x < COLS; x += 2) g.fillRect(x * S, y * S, S, S);
      // Glühbirne
      const pulse = 1 + Math.sin(time * 6) * 0.12;
      g.font = `${16 * pulse}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('💡', food.x * S + 10, food.y * S + 11);
      if (bonus) { g.globalAlpha = bonus.ttl < 2 ? 0.4 + Math.abs(Math.sin(time * 12)) * 0.6 : 1; g.fillText('⭐', bonus.x * S + 10, bonus.y * S + 11); g.globalAlpha = 1; }
      // Kabel
      g.strokeStyle = '#1f7a4d'; g.lineWidth = 5; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
      snake.forEach((s, i) => i ? g.lineTo(s.x * S + 10, s.y * S + 10) : g.moveTo(s.x * S + 10, s.y * S + 10));
      if (!dead) g.stroke();
      // Lichter
      if (!dead) snake.forEach((s, i) => {
        const c = COLORS[i % 5], on = Math.sin(time * 5 - i * 0.9) > -0.3;
        g.shadowColor = c; g.shadowBlur = on ? 12 : 0; g.fillStyle = on ? c : '#44507f';
        g.beginPath(); g.arc(s.x * S + 10, s.y * S + 10, i ? 6.5 : 8.5, 0, 6.3); g.fill();
      });
      g.shadowBlur = 0;
      if (!dead) { const hd = snake[0]; g.fillStyle = '#111'; g.beginPath(); g.arc(hd.x * S + 10 + dir.x * 3 - dir.y * 3, hd.y * S + 10 + dir.y * 3 - dir.x * 3, 1.8, 0, 6.3); g.arc(hd.x * S + 10 + dir.x * 3 + dir.y * 3, hd.y * S + 10 + dir.y * 3 + dir.x * 3, 1.8, 0, 6.3); g.fill(); }
      for (const p of sparks) { g.globalAlpha = Math.max(0, p.life * 2); g.fillStyle = p.color; g.fillRect(p.x - 2, p.y - 2, 4, 4); }
      g.globalAlpha = 1;
    }

    ctx.loop(dt => {
      time += dt;
      if (!dead) {
        acc += dt * speed;
        while (acc >= 1 && !dead) { acc -= 1; step(); }
        if (bonus && (bonus.ttl -= dt) <= 0) bonus = null;
      }
      sparks = sparks.filter(p => (p.life -= dt) > 0);
      for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; }
      draw();
    });
    return { destroy() {} };
  },
};
