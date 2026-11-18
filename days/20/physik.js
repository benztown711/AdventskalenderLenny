// Kugel-Fusion: eigene, kleine 2D-Kreis-Physik (ohne DOM, getrennt testbar).
// Positions-basiert (mehrere Korrektur-Durchläufe pro Teilschritt) + Restitution + Reibung/Rotation.

export const RADII = [15, 20, 27, 35, 44, 54, 65, 77, 90, 104];
export const MAXLV = RADII.length - 1;
export const JAR = { l: 40, r: 320, floor: 500, top: 226, danger: 250 };
export const DANGER_SECONDS = 2.0;

const G = 1500, SUB = 4, ITER = 8;
const MAXPUSH = 3.5, VMAX = 820;
const BOUNCE = 0.28, BOUNCE_MIN = 140, FRICTION = 0.22;

export function createWorld() {
  const w = {
    balls: [], events: [], time: 0, nextId: 1, shakeLeft: 0, shakeGrace: 0, danger: 0, over: false,
    add(level, x, y, vx = 0, vy = 0) {
      const r = RADII[level];
      const b = { id: w.nextId++, level, r, m: r * r, x, y, px: x, py: y, vx, vy, rot: Math.random() * 6.28, spin: 0, cn: 0, age: 0, ma: 9, above: 0 };
      w.balls.push(b); return b;
    },
    // Wirft einen Schüttel-Stoß ab (mehrere Stöße nacheinander über step)
    shake() { w.shakeLeft = 5; w._shakeT = 0; w.shakeGrace = 1.6; },
    step(dt) {
      const h = dt / SUB;
      for (let s = 0; s < SUB; s++) sub(w, h);
      w.time += dt;
      if (w.shakeLeft > 0) {
        w._shakeT -= dt;
        if (w._shakeT <= 0) {
          w._shakeT = 0.11; w.shakeLeft--;
          for (const b of w.balls) { b.vy -= 330 + Math.random() * 220; b.vx += (Math.random() < 0.5 ? -1 : 1) * (150 + Math.random() * 250); b.spin += (Math.random() - 0.5) * 8; }
        }
      }
      if (w.shakeGrace > 0) w.shakeGrace -= dt;
      // Gefahrenlinie: ruhende Kugel über der Linie
      let worst = 0;
      for (const b of w.balls) {
        b.age += dt; b.ma += dt;
        const sp = Math.hypot(b.vx, b.vy);
        if (b.y - b.r < JAR.danger && b.cn > 0 && sp < 45 && b.age > 0.5 && w.shakeGrace <= 0) b.above += dt;
        else b.above = 0;
        if (b.above > worst) worst = b.above;
      }
      w.danger = worst;
      if (worst >= DANGER_SECONDS) w.over = true;
    },
  };
  return w;
}

function sub(w, h) {
  const B = w.balls, L = JAR.l, R = JAR.r, F = JAR.floor;
  for (const b of B) {
    b.vy += G * h; b.px = b.x; b.py = b.y;
    b.x += b.vx * h; b.y += b.vy * h; b.cn = 0;
  }
  const hits = []; // Aufprall-Daten für Restitution
  const n = B.length;
  for (let it = 0; it < ITER; it++) {
    for (let i = 0; i < n; i++) {
      const b = B[i];
      if (b.x < L + b.r) { if (it === 0) hits.push({ a: b, b: null, nx: -1, ny: 0, v: -b.vx }); b.x = L + b.r; }
      else if (b.x > R - b.r) { if (it === 0) hits.push({ a: b, b: null, nx: 1, ny: 0, v: b.vx }); b.x = R - b.r; }
      if (b.y > F - b.r) { if (it === 0) hits.push({ a: b, b: null, nx: 0, ny: 1, v: b.vy }); b.y = F - b.r; }
    }
    for (let i = 0; i < n; i++) {
      const a = B[i];
      for (let j = i + 1; j < n; j++) {
        const c = B[j];
        const dx = c.x - a.x, dy = c.y - a.y, rr = a.r + c.r;
        if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 0.0001;
        let nx = dx / d, ny = dy / d;
        if (d2 < 1e-8) { nx = 0; ny = 1; }
        const pen = Math.min(rr - d, MAXPUSH), ia = 1 / a.m, ic = 1 / c.m, k = pen / (ia + ic);
        if (it === 0) hits.push({ a, b: c, nx, ny, v: (a.vx - c.vx) * nx + (a.vy - c.vy) * ny });
        a.x -= nx * k * ia; a.y -= ny * k * ia; c.x += nx * k * ic; c.y += ny * k * ic;
      }
    }
  }
  // Wände nochmals hart (nach den Paar-Korrekturen)
  for (const b of B) {
    if (b.x < L + b.r) b.x = L + b.r; else if (b.x > R - b.r) b.x = R - b.r;
    if (b.y > F - b.r) b.y = F - b.r;
  }
  // Geschwindigkeiten aus der Positionsänderung
  for (const b of B) {
    b.vx = (b.x - b.px) / h; b.vy = (b.y - b.py) / h;
    const sp = Math.hypot(b.vx, b.vy); if (sp > VMAX) { b.vx *= VMAX / sp; b.vy *= VMAX / sp; }
  }

  // Kontakte (nach Korrektur) für Reibung, Verschmelzen
  const merges = [], contacts = [];
  for (let i = 0; i < n; i++) {
    const a = B[i];
    if (a.x <= L + a.r + 0.6) contacts.push({ a, b: null, nx: -1, ny: 0 });
    else if (a.x >= R - a.r - 0.6) contacts.push({ a, b: null, nx: 1, ny: 0 });
    if (a.y >= F - a.r - 0.6) contacts.push({ a, b: null, nx: 0, ny: 1 });
    for (let j = i + 1; j < n; j++) {
      const c = B[j];
      const dx = c.x - a.x, dy = c.y - a.y, rr = a.r + c.r + 0.8;
      if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.0001;
      contacts.push({ a, b: c, nx: dx / d, ny: dy / d });
      if (a.level === c.level) merges.push([a, c]);
    }
  }
  // Restitution
  for (const e of hits) {
    if (e.v < BOUNCE_MIN) continue;
    const a = e.a, c = e.b;
    if (!c) {
      const cur = a.vx * e.nx + a.vy * e.ny; // > 0: noch Richtung Wand
      const want = -BOUNCE * e.v;
      if (cur > want) { a.vx -= (cur - want) * e.nx; a.vy -= (cur - want) * e.ny; }
    } else {
      const ia = 1 / a.m, ic = 1 / c.m;
      const cur = (a.vx - c.vx) * e.nx + (a.vy - c.vy) * e.ny;
      const want = -BOUNCE * e.v;
      if (cur > want) {
        const j = (cur - want) / (ia + ic);
        a.vx -= j * ia * e.nx; a.vy -= j * ia * e.ny; c.vx += j * ic * e.nx; c.vy += j * ic * e.ny;
      }
    }
    if (e.v > 220) w.events.push({ type: 'hit', v: e.v, x: a.x + e.nx * a.r, y: a.y + e.ny * a.r });
  }
  // Reibung + Rotation
  for (const e of contacts) {
    const a = e.a, c = e.b, tx = -e.ny, ty = e.nx;
    if (!c) {
      const slip = -(a.vx * tx + a.vy * ty) - a.spin * a.r;
      const q = (slip / (3 / a.m)) * FRICTION * 1.5;
      a.vx += (q * tx) / a.m; a.vy += (q * ty) / a.m; a.spin += (2 * q) / (a.m * a.r);
    } else {
      const ia = 1 / a.m, ic = 1 / c.m;
      const slip = (c.vx - a.vx) * tx + (c.vy - a.vy) * ty - c.spin * c.r - a.spin * a.r;
      const jt = -(slip / (3 * (ia + ic))) * FRICTION;
      a.vx -= jt * tx * ia; a.vy -= jt * ty * ia; c.vx += jt * tx * ic; c.vy += jt * ty * ic;
      a.spin -= (2 * jt * ia) / a.r; c.spin -= (2 * jt * ic) / c.r;
    }
    a.cn++; if (c) c.cn++;
  }
  // Dämpfung, Ruhe
  for (const b of B) {
    const damp = b.cn > 0 ? 0.9935 : 0.9992;
    b.vx *= damp; b.vy *= damp; b.spin *= b.cn > 0 ? 0.994 : 0.9995;
    if (b.spin > 14) b.spin = 14; else if (b.spin < -14) b.spin = -14;
    if (b.cn > 0 && b.vx * b.vx + b.vy * b.vy < 36) { b.vx = 0; b.vy = 0; }
    b.rot += b.spin * h;
  }
  // Verschmelzen
  if (merges.length) {
    const used = new Set();
    for (const [a, c] of merges) {
      if (used.has(a) || used.has(c)) continue;
      used.add(a); used.add(c);
      const ma = a.m, mc = c.m, mm = ma + mc;
      const x = (a.x + c.x) / 2, y = (a.y + c.y) / 2;
      const vx = (a.vx * ma + c.vx * mc) / mm * 0.5, vy = (a.vy * ma + c.vy * mc) / mm * 0.5;
      if (a.level >= MAXLV) { w.events.push({ type: 'vanish', x, y, level: a.level }); continue; }
      const nb = w.add(a.level + 1, x, y, vx, vy);
      nb.ma = 0; nb.age = 0.3; nb.spin = (a.spin + c.spin) * 0.5;
      nb.x = Math.min(JAR.r - nb.r, Math.max(JAR.l + nb.r, nb.x)); nb.y = Math.min(JAR.floor - nb.r, nb.y);
      nb.px = nb.x; nb.py = nb.y;
      w.events.push({ type: 'merge', x: nb.x, y: nb.y, level: nb.level, r: nb.r, ball: nb });
      // Impuls auf Nachbarn
      for (const o of B) {
        if (used.has(o) || o === nb) continue;
        const dx = o.x - nb.x, dy = o.y - nb.y, d = Math.hypot(dx, dy) || 1, range = nb.r + o.r + 26;
        if (d < range) { const s = 190 * (1 - d / range) * Math.min(1, 40 / o.r + 0.4); o.vx += (dx / d) * s; o.vy += (dy / d) * s; }
      }
    }
    w.balls = w.balls.filter(b => !used.has(b));
  }
}
