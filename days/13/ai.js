// Bot-Gehirn: Ziel suchen, Abstand halten, ausweichen, fliehen, Kisten knacken, Sturm meiden.
import { T, N, CX, CY, CRATE, idx, rayHit, wideClear, findPath, hitsWall } from './world.js';

const rand = (a, b) => a + Math.random() * (b - a);

export function aimAt(W, b, tg, lead, err) {
  const d = Math.hypot(tg.x - b.x, tg.y - b.y), tt = d / b.hero.ballSpeed;
  const px = tg.x + tg.vx * tt * lead, py = tg.y + tg.vy * tt * lead;
  return Math.atan2(py - b.y, px - b.x) + (Math.random() - 0.5) * 2 * err;
}

function setGoal(W, b, x, y) {
  const B = b.bot;
  x = Math.max(T * 1.5, Math.min(N * T - T * 1.5, x)); y = Math.max(T * 1.5, Math.min(N * T - T * 1.5, y));
  B.goal = { x, y };
  if (wideClear(W, b.x, b.y, x, y, b.r - 2) && !hitsWall(W, x, y, b.r)) B.path = null;
  else B.path = findPath(W, b.x, b.y, x, y);
}

function decide(W, b, api) {
  const B = b.bot, L = W.L, h = b.hero, ring = W.ringR;
  const dc = Math.hypot(b.x - CX, b.y - CY);
  let tg = null, best = 1e9;
  for (const o of W.ents) {
    if (o === b || !o.alive || !api.canSee(b, o)) continue;
    const d = Math.hypot(o.x - b.x, o.y - b.y);
    if (d > L.sight) continue;
    let sc = d * (o.isPlayer ? L.playerBias : 1);
    if (o.hp < o.maxHp * 0.4) sc *= 0.8;
    if (o === B.target) sc *= 0.85; // beim Ziel bleiben
    if (sc < best) { best = sc; tg = o; }
  }
  B.target = tg;
  // In den ersten Sekunden lieber Kisten knacken als quer über die Karte jagen
  const early = W.t < 14 && tg && Math.hypot(tg.x - b.x, tg.y - b.y) > 220;
  if (early) tg = null;
  if (Math.random() < 0.12) B.strafe *= -1;
  // 1. Sturm meiden
  if (dc > ring - 60) {
    B.mode = 'ring';
    const k = Math.max(0, ring * 0.45) / (dc || 1);
    setGoal(W, b, CX + (b.x - CX) * k + rand(-40, 40), CY + (b.y - CY) * k + rand(-40, 40));
    return;
  }
  const keepIn = (x, y) => {
    const d = Math.hypot(x - CX, y - CY), lim = Math.max(30, ring - 90);
    if (d > lim) { x = CX + (x - CX) * lim / d; y = CY + (y - CY) * lim / d; }
    return [x, y];
  };
  // 2. Fliehen bei wenig Ausdauer
  if (tg && b.hp < b.maxHp * L.flee && tg.hp > b.hp * 0.8) {
    B.mode = 'flee';
    const d = Math.hypot(tg.x - b.x, tg.y - b.y) || 1;
    let ax = (b.x - tg.x) / d, ay = (b.y - tg.y) / d;
    // nächstgelegener Busch in Fluchtrichtung
    let bx = null, by = null, bd = 1e9;
    const tx0 = Math.floor(b.x / T), ty0 = Math.floor(b.y / T);
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
      const x = tx0 + dx, y = ty0 + dy;
      if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1 || !W.bush[idx(x, y)]) continue;
      const wx = x * T + T / 2, wy = y * T + T / 2;
      if ((wx - b.x) * ax + (wy - b.y) * ay < -10) continue;
      const dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; bx = wx; by = wy; }
    }
    let gx, gy;
    if (bx !== null && L.useBush) { gx = bx; gy = by; } else { gx = b.x + ax * 220 + -ay * B.strafe * 60; gy = b.y + ay * 220 + ax * B.strafe * 60; }
    [gx, gy] = keepIn(gx, gy);
    setGoal(W, b, gx, gy);
    return;
  }
  // 3. Kämpfen
  if (tg) {
    const d = Math.hypot(tg.x - b.x, tg.y - b.y) || 1, ux = (tg.x - b.x) / d, uy = (tg.y - b.y) / d;
    if (rayHit(W, b.x, b.y, tg.x, tg.y) >= 0) { B.mode = 'chase'; setGoal(W, b, tg.x, tg.y); return; }
    B.mode = 'fight';
    const want = h.range * h.want;
    const k = d > want + 30 ? 1 : d < want - 40 ? -0.8 : 0;
    let [gx, gy] = keepIn(b.x + ux * k * 90 - uy * B.strafe * 70, b.y + uy * k * 90 + ux * B.strafe * 70);
    setGoal(W, b, gx, gy);
    return;
  }
  // 4. Kristalle aufsammeln
  let cr = null, cd = 520;
  for (const c of W.crystals) { const d = Math.hypot(c.x - b.x, c.y - b.y); if (d < cd && Math.hypot(c.x - CX, c.y - CY) < ring - 40) { cd = d; cr = c; } }
  if (cr) { B.mode = 'loot'; setGoal(W, b, cr.x, cr.y); return; }
  // 5. Kisten knacken
  let ci = -1; cd = 1e9;
  const tx0 = Math.floor(b.x / T), ty0 = Math.floor(b.y / T);
  for (let dy = -11; dy <= 11; dy++) for (let dx = -11; dx <= 11; dx++) {
    const x = tx0 + dx, y = ty0 + dy;
    if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1 || W.tiles[idx(x, y)] !== CRATE) continue;
    const dd = dx * dx + dy * dy;
    if (dd < cd && Math.hypot(x * T + 20 - CX, y * T + 20 - CY) < ring - 40) { cd = dd; ci = idx(x, y); }
  }
  if (ci >= 0) {
    B.mode = 'crate'; B.crate = ci;
    const cx = (ci % N) * T + T / 2, cy = ((ci / N) | 0) * T + T / 2;
    const d = Math.hypot(cx - b.x, cy - b.y) || 1, stand = Math.min(h.range * 0.55, 150);
    if (d > stand + 20 || rayHit(W, b.x, b.y, cx, cy) !== ci) setGoal(W, b, cx + (b.x - cx) / d * stand, cy + (b.y - cy) / d * stand);
    else B.goal = null;
    return;
  }
  // 6. Umherstreifen Richtung Mitte
  B.mode = 'wander';
  if (!B.goal || Math.hypot(B.goal.x - b.x, B.goal.y - b.y) < 30 || Math.hypot(B.goal.x - CX, B.goal.y - CY) > ring - 60 || Math.random() < 0.05) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * Math.min(ring * 0.6, 520);
      const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r;
      if (!hitsWall(W, x, y, b.r)) { setGoal(W, b, x, y); break; }
    }
  } else setGoal(W, b, B.goal.x, B.goal.y);
}

export function botUpdate(W, b, dt, api) {
  const B = b.bot, L = W.L;
  B.think -= dt; B.fireCd -= dt; B.dodgeT -= dt;
  // feststecken? neu planen
  if (B.lastX !== undefined && B.wantMove) {
    if (Math.hypot(b.x - B.lastX, b.y - B.lastY) < 0.3) B.stuck += dt; else B.stuck = 0;
    if (B.stuck > 0.4) { B.stuck = 0; B.think = 0; B.strafe *= -1; if (B.goal) B.path = findPath(W, b.x, b.y, B.goal.x, B.goal.y); }
  }
  B.lastX = b.x; B.lastY = b.y;
  if (B.think <= 0) { B.think = L.react * rand(0.7, 1.3); decide(W, b, api); }
  // Ausweichen
  if (B.dodgeT <= 0) {
    for (const s of W.shots) {
      if (s.owner === b || s.delay > 0) continue;
      const rx = b.x - s.x, ry = b.y - s.y, v2 = s.vx * s.vx + s.vy * s.vy;
      const t = (rx * s.vx + ry * s.vy) / v2;
      if (t < 0 || t > 0.45) continue;
      const cx = rx - s.vx * t, cy = ry - s.vy * t;
      if (Math.hypot(cx, cy) > b.r + s.r + 8) continue;
      s.rolled = s.rolled || new Set();
      if (s.rolled.has(b)) continue;
      s.rolled.add(b);
      if (Math.random() < L.dodge) {
        const v = Math.sqrt(v2), sign = (s.vx * ry - s.vy * rx) >= 0 ? 1 : -1;
        B.dodgeT = 0.3; B.dx = -s.vy / v * sign; B.dy = s.vx / v * sign;
      }
      break;
    }
  }
  let mx = 0, my = 0;
  if (B.dodgeT > 0) { mx = B.dx; my = B.dy; }
  else if (B.goal) {
    let wx = B.goal.x, wy = B.goal.y;
    if (B.path && B.path.length) {
      while (B.path.length > 1 && Math.hypot(B.path[0].x - b.x, B.path[0].y - b.y) < 14) B.path.shift();
      // Abkürzung, wenn freie Sicht auf übernächsten Punkt
      if (B.path.length > 1 && wideClear(W, b.x, b.y, B.path[1].x, B.path[1].y, b.r - 2)) B.path.shift();
      wx = B.path[0].x; wy = B.path[0].y;
      if (B.path.length === 1 && Math.hypot(wx - b.x, wy - b.y) < 14) B.path = null;
    }
    const d = Math.hypot(wx - b.x, wy - b.y);
    if (d > 8) { mx = (wx - b.x) / d; my = (wy - b.y) / d; }
  }
  B.wantMove = !!(mx || my);
  // Werfen
  if (W.t > 2.3 && B.fireCd <= 0 && b.stunT <= 0) {
    const tg = B.target;
    if (tg && tg.alive && api.canSee(b, tg)) {
      const d = Math.hypot(tg.x - b.x, tg.y - b.y), los = rayHit(W, b.x, b.y, tg.x, tg.y) < 0;
      if (b.sup >= 1 && d < b.hero.superRange && (los || b.hero.key === 'brummer') && Math.random() < L.superUse) {
        api.trySuper(b, aimAt(W, b, tg, L.lead, L.err * 0.5));
        B.fireCd = 0.5;
      } else if (los && b.ammo >= 1 && d < b.hero.range * 0.95) {
        api.tryThrow(b, aimAt(W, b, tg, L.lead, L.err));
        B.fireCd = rand(L.fire[0], L.fire[1]);
      }
    } else if (B.mode === 'crate' && W.tiles[B.crate] === CRATE && b.ammo >= 2) {
      const cx = (B.crate % N) * T + T / 2, cy = ((B.crate / N) | 0) * T + T / 2;
      if (Math.hypot(cx - b.x, cy - b.y) < b.hero.range * 0.9 && rayHit(W, b.x, b.y, cx, cy) === B.crate) {
        api.tryThrow(b, Math.atan2(cy - b.y, cx - b.x));
        B.fireCd = rand(L.fire[0], L.fire[1]) + 0.2;
      }
    } else if (B.mode === 'crate' && W.tiles[B.crate] !== CRATE) B.think = 0;
  }
  return { mx, my };
}

export function newBrain() {
  return { think: Math.random() * 0.3, fireCd: 0, dodgeT: 0, strafe: Math.random() < 0.5 ? 1 : -1, goal: null, path: null, target: null, mode: 'wander', stuck: 0 };
}
