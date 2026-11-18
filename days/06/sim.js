// Türchen 6: Schlittenflug - reine Spiel-Logik (ohne Zeichnen), damit sie auch ohne Browser simuliert werden kann.
export const W = 360, H = 560, GROUND = 520, SX = 90, Y_MIN = 48, Y_MAX = 415;
export const SECTION_LEN = 30;
export const SECTIONS = ["Auf geht's, Nikolaus!", 'Über den Bergen!', 'Nordlicht!', 'Sternenmeer!', 'Morgenrot naht!'];
export const GIFT_G = 560, GIFT_VY = 40, GIFT_VX = 30;

const rr = (w, a, b) => a + w.rnd() * (b - a);

export function createWorld(rnd = Math.random) {
  const w = {
    rnd, t: 0, speed: 125, y: 210, vy: 0, hold: false, hearts: 3, inv: 0, score: 0, combo: 0, bestCombo: 0,
    starsGot: 0, hits: 0, gifts: [], obs: [], pickups: [], houses: [], events: [], cool: 0,
    dead: false, deadT: 0, section: 0, houseEdge: -60, patGap: 0, gingerT: 24, lastY: 200, nextId: 1, lightning: false,
  };
  w.patGap = 125 * 2.6;
  while (w.houseEdge < W + 40) spawnHouse(w);
  w.events.push({ type: 'section', i: 0, name: SECTIONS[0] });
  return w;
}

function spawnHouse(w) {
  const gap = rr(w, 14, 60);
  const church = w.t > 9 && w.rnd() < Math.min(0.22, 0.08 + w.t / 600);
  if (church) {
    const x = w.houseEdge + gap + 24, top = GROUND - rr(w, 200, 235);
    w.houses.push({ id: w.nextId++, kind: 'church', x, w: 48, top, ch: null });
    w.houseEdge = x + 24;
    arc(w, 5, x + 4, top - 48, 28, 40);
    return;
  }
  const hw = rr(w, 66, 100), x = w.houseEdge + gap + hw / 2;
  const roofY = Math.round(rr(w, 455, 480));
  const ch = { dx: rr(w, -hw * 0.28, hw * 0.28), top: roofY - 18, w: 16, gold: w.rnd() < 0.15, used: false, ready: false };
  w.houses.push({ id: w.nextId++, kind: 'house', x, w: hw, roofY, ch, shade: Math.floor(w.rnd() * 4), lit: w.rnd() });
  w.houseEdge = x + hw / 2;
}

function arc(w, n, x0, baseY, step = 30, h = 55) {
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) : 0;
    w.pickups.push({ kind: 'star', x: x0 + i * step, y: baseY - Math.sin(k * Math.PI) * h, ph: w.rnd() * 6 });
  }
}

function pickY(w, lo, hi) {
  let y = w.lastY + rr(w, -150, 150);
  if (y < lo || y > hi) y = rr(w, lo, hi);
  return Math.max(lo, Math.min(hi, y));
}

function spawnPattern(w) {
  const t = w.t, s = w.section, X = W + 70;
  const list = [['arc', 3.2], ['row', 1.2]];
  if (t > 6) list.push(['cloud', 2.4], ['cloudStars', 1.8]);
  if (t > 13) list.push(['bird', 2]);
  if (s >= 1) list.push(['flock', 1.8], ['cloud', 1]);
  if (s >= 2) list.push(['gust', 2.2]);
  if (s >= 3) list.push(['flock', 1], ['gust', 1]);
  let tot = 0; list.forEach(l => tot += l[1]);
  let r = w.rnd() * tot, kind = list[0][0];
  for (const l of list) { if ((r -= l[1]) <= 0) { kind = l[0]; break; } }
  const dens = Math.max(0.78, 1 - w.t / 600);
  let width = 200, hazard = false;
  const lightning = s >= 1 && w.rnd() < 0.7;
  const addCloud = (y) => {
    w.obs.push({ type: 'cloud', x: X, y, rx: rr(w, 34, 46), ry: 20, bolt: lightning ? { st: 'idle', t: rr(w, 0.6, 1.6) } : null, id: w.nextId++ });
    w.lastY = y; hazard = true;
  };
  if (kind === 'arc') { const y = rr(w, 130, 380); arc(w, 7, X, y, 30, rr(w, 40, 80)); width = 210; }
  else if (kind === 'row') { const y = rr(w, 110, 390); arc(w, 5, X, y, 34, 0); width = 170; }
  else if (kind === 'cloud') { addCloud(pickY(w, 100, 330)); width = 90; }
  else if (kind === 'cloudStars') {
    const y = pickY(w, 170, 330); addCloud(y); arc(w, 5, X - 52, y - 56, 26, 22); width = 110;
  } else if (kind === 'bird' || kind === 'flock') {
    const n = kind === 'bird' ? 1 : 2 + (w.rnd() < 0.4 ? 1 : 0);
    const y = pickY(w, 90, 380);
    for (let i = 0; i < n; i++) w.obs.push({ type: 'bird', x: X + i * 52, y0: y + (i - 1) * 30, y, vx: -(55 + rr(w, 0, 35)), ph: w.rnd() * 6, id: w.nextId++ });
    w.lastY = y; hazard = true; width = 40 + n * 52;
  } else if (kind === 'gust') {
    const gy = rr(w, 160, 350);
    w.obs.push({ type: 'gust', x: X + 120, y: gy, w: 260, h: 150, dir: w.rnd() < 0.5 ? -1 : 1, id: w.nextId++ });
    arc(w, 6, X + 20, gy, 34, 0); width = 260;
  }
  const hz = hazard || kind === 'gust';
  w.patGap = width + (hz ? w.speed * (0.9 + w.rnd() * 0.55) : 30 + w.rnd() * 40) * dens;
}

// Wirft das Geschenk (falls Abklingzeit vorbei)
export function throwGift(w) {
  if (w.dead || w.cool > 0) return false;
  w.cool = 0.32;
  w.gifts.push({ x: SX + 8, y: w.y + 16, vx: GIFT_VX, vy: GIFT_VY, rot: 0, py: w.y + 16, id: w.nextId++ });
  w.events.push({ type: 'throw', x: SX + 8, y: w.y + 16 });
  return true;
}

// Prüft für jeden Schornstein, ob ein Wurf JETZT treffen würde (für die Zielhilfe)
function predict(w) {
  const gx0 = SX + 8, gy0 = w.y + 16;
  for (const h of w.houses) {
    const c = h.ch; if (!c) continue;
    c.ready = false;
    const cx = h.x + c.dx;
    if (c.used || cx < SX - 10 || cx > SX + 300 || c.top <= gy0 + 4) continue;
    const t = (-GIFT_VY + Math.sqrt(GIFT_VY * GIFT_VY + 2 * GIFT_G * (c.top - gy0))) / GIFT_G;
    const gx = gx0 + GIFT_VX * t, chx = cx - w.speed * t;
    if (Math.abs(gx - chx) <= c.w / 2 + 6) c.ready = true;
  }
}

function sleighHit(w) {
  const px = SX, py = w.y;
  const circ = (cx, cy, r, ox, oy) => (cx - ox) ** 2 + (cy - oy) ** 2 < r * r;
  const bodies = [[px, py, 12], [px + 30, py - 2, 9], [px - 14, py + 4, 8]];
  for (const o of w.obs) {
    if (o.type === 'cloud') {
      for (const [bx, by, br] of bodies) {
        const a = ((bx - o.x) / (o.rx * 0.82 + br * 0.8)) ** 2 + ((by - o.y) / (o.ry * 0.85 + br * 0.8)) ** 2;
        if (a < 1) return o;
      }
      if (o.bolt && o.bolt.st === 'strike' && Math.abs(px + 8 - o.x) < 11 + 18 && py > o.y && py < o.y + 175) return o;
    } else if (o.type === 'bird') {
      for (const [bx, by, br] of bodies) if (circ(bx, by, br + 9, o.x, o.y)) return o;
    }
  }
  for (const h of w.houses) {
    if (h.kind !== 'church') continue;
    for (const [bx, by, br] of bodies) {
      if (Math.abs(bx - h.x) < 14 + br * 0.6 && by + br * 0.6 > h.top + 30) return h;
      if (Math.abs(bx - h.x) < 5 + br * 0.6 && by + br * 0.6 > h.top) return h;
    }
  }
  return null;
}

function hurt(w, src) {
  w.hearts--; w.inv = 1.8; w.combo = 0; w.hits++;
  w.events.push({ type: 'hit', x: SX, y: w.y, hearts: w.hearts, src: src.type || src.kind });
  if (w.hearts <= 0) { w.dead = true; w.deadT = 0; w.events.push({ type: 'dead' }); }
  else w.vy = 70;
}

export function step(w, dt, hold) {
  w.t += dt; w.hold = hold;
  if (w.cool > 0) w.cool -= dt;
  const sec = Math.floor(w.t / SECTION_LEN);
  if (sec !== w.section) { w.section = sec; w.events.push({ type: 'section', i: sec, name: SECTIONS[sec % SECTIONS.length] }); }
  w.speed = w.dead ? Math.max(30, w.speed - 260 * dt) : 125 + Math.min(115, w.t * 1.0);
  const sp = w.speed;

  // Schlitten
  if (!w.dead) {
    const target = hold ? -178 : 150;
    w.vy += (target - w.vy) * Math.min(1, dt * 6);
    for (const o of w.obs) {
      if (o.type === 'gust' && Math.abs(SX - o.x) < o.w / 2 && Math.abs(w.y - o.y) < o.h / 2) w.vy += o.dir * 400 * dt;
    }
    w.y += w.vy * dt;
    if (w.y < Y_MIN) { w.y = Y_MIN; if (w.vy < 0) w.vy = 0; }
    if (w.y > Y_MAX) { w.y = Y_MAX; if (w.vy > 0) w.vy = 0; }
    if (w.inv > 0) w.inv -= dt;
    w.score += dt * 3;
  } else { w.deadT += dt; w.vy += 500 * dt; w.y += w.vy * dt; }

  // Welt scrollt
  const mv = sp * dt;
  w.houseEdge -= mv;
  for (const h of w.houses) h.x -= mv;
  w.houses = w.houses.filter(h => h.x + h.w > -40);
  while (w.houseEdge < W + 40) spawnHouse(w);
  for (const p of w.pickups) p.x -= mv;
  w.pickups = w.pickups.filter(p => p.x > -40 && !p.gone);
  for (const o of w.obs) {
    o.x -= mv;
    if (o.type === 'bird') { o.x += o.vx * dt; o.y = o.y0 + Math.sin(w.t * 3 + o.ph) * 26; }
    if (o.type === 'cloud' && o.bolt) {
      const b = o.bolt; b.t -= dt;
      if (b.t <= 0) {
        if (b.st === 'idle' && o.x < W - 30) { b.st = 'warn'; b.t = 0.85; w.events.push({ type: 'warn', x: o.x, y: o.y }); }
        else if (b.st === 'warn') { b.st = 'strike'; b.t = 0.26; w.events.push({ type: 'bolt', x: o.x, y: o.y }); }
        else if (b.st === 'strike') { b.st = 'idle'; b.t = rr(w, 1.4, 2.6); }
        else b.t = 0.2;
      }
    }
  }
  w.obs = w.obs.filter(o => o.x > -(o.w || 100) - 40);
  if (!w.dead) {
    w.patGap -= mv;
    if (w.patGap <= 0) spawnPattern(w);
    w.gingerT -= dt;
    if (w.gingerT <= 0 && w.hearts < 5) {
      w.gingerT = rr(w, 24, 34);
      const y = rr(w, 150, 340);
      w.pickups.push({ kind: 'ginger', x: W + 60, y, ph: 0 });
      arc(w, 3, W + 5, y, 18, 0);
    }
  }

  // Einsammeln
  if (!w.dead) {
    for (const p of w.pickups) {
      const r = p.kind === 'ginger' ? 30 : 24;
      if ((p.x - (SX + 8)) ** 2 + (p.y - w.y) ** 2 < r * r) {
        p.gone = true;
        if (p.kind === 'star') { w.score += 10; w.starsGot++; w.events.push({ type: 'star', x: p.x, y: p.y }); }
        else { w.score += 30; if (w.hearts < 5) w.hearts++; w.events.push({ type: 'ginger', x: p.x, y: p.y }); }
      }
    }
    if (w.inv <= 0 && w.t > 2) { const s = sleighHit(w); if (s) hurt(w, s); }
  }

  // Geschenke
  for (const gft of w.gifts) {
    gft.py = gft.y; gft.vy += GIFT_G * dt; gft.x += (gft.vx - 0) * dt; gft.y += gft.vy * dt; gft.rot += dt * 6;
    for (const h of w.houses) {
      const c = h.ch;
      if (c && !c.used && gft.py < c.top && gft.y >= c.top) {
        const cx = h.x + c.dx;
        if (Math.abs(gft.x - cx) <= c.w / 2 + 6) {
          c.used = true; gft.done = true; w.combo++; w.bestCombo = Math.max(w.bestCombo, w.combo);
          const pts = (40 + 10 * Math.min(w.combo - 1, 9)) * (c.gold ? 2 : 1);
          w.score += pts;
          w.events.push({ type: 'chimney', x: cx, y: c.top, pts, combo: w.combo, gold: c.gold });
        }
      }
      if (gft.done) break;
      if (h.kind === 'church' && Math.abs(gft.x - h.x) < 18 && gft.y > h.top + 30) { gft.done = true; gft.miss = true; }
    }
    if (!gft.done && gft.y >= 478) { gft.done = true; gft.miss = true; }
    if (gft.miss) { if (w.combo > 0) w.events.push({ type: 'combobreak', x: gft.x, y: gft.y }); w.combo = 0; w.events.push({ type: 'miss', x: gft.x, y: Math.min(gft.y, 478) }); }
  }
  w.gifts = w.gifts.filter(g => !g.done && g.x < W + 40);
  predict(w);
}
