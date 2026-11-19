// Türchen 22: Schneeball-Festung - Turm-Verteidigung gegen freche Schneemonster
import * as L from './logic.js';
import { C, FONT, circle, ring, ell, rrect, text, star, cookie, snowflake, makeBackground, drawTree, drawSpot, drawTower, drawEnemy, gift, TREE } from './draw.js';

export const howto = {
  touch: 'Tippe auf einen runden Bauplatz, wähle einen Turm und tippe nochmal, um ihn zu bauen. Halte 12 Wellen Schneemonster vom Geschenke-Lager fern!',
  keys: 'Pfeiltasten wählen einen Bauplatz, Leertaste baut, X bricht ab (oder klicke mit der Maus). Halte 12 Wellen Schneemonster vom Geschenke-Lager fern!',
};
export const starsInfo = '★ Welle 8 erreichen · ★★ alle 12 Wellen überstehen · ★★★ dabei 15 Geschenke retten';

const { W, H, MAP_H, SPOTS, TOWERS, TOWER_KEYS, WAVES, STEP } = L;
const TAU = Math.PI * 2;
const DESC = {
  sling: 'Schnell und günstig. Trifft auch Flieger.',
  cannon: 'Bombe trifft ganze Gruppen. Nicht in die Luft.',
  frost: 'Bremst Monster in der Nähe. Nicht in die Luft.',
  zap: 'Blitz springt weiter. Trifft auch Flieger.',
};
const BTN_WAVE = { x: 92, y: 555, w: 172, h: 42 }, BTN_SPEED = { x: 272, y: 555, w: 80, h: 42 };
const TIPS = [
  'Frost-Türme bremsen die Monster, dann treffen die anderen Türme öfter.',
  'Gegen Fledermäuse helfen nur Schleuder und Lichterketten-Blitz.',
  'Ausbauen lohnt sich: ein Turm auf Stufe 3 ist viel stärker.',
  'Die Bauplätze in der Mitte erreichen gleich zwei Wege.',
  'Zuckerstangen-Kanonen sind super gegen dicke Gruppen.',
];
const MUSIC = [[72, 1], [76, 1], [79, 1], [76, 1], [74, 1], [77, 1], [81, 2], [79, 1], [76, 1], [72, 1], [74, 1], [76, 2], [0, 2],
  [67, 1], [72, 1], [76, 1], [74, 1], [71, 1], [74, 1], [79, 2], [77, 1], [76, 1], [74, 1], [71, 1], [72, 2], [0, 2]];
const BOSS_MUSIC = [[57, 0.5], [57, 0.5], [60, 0.5], [57, 0.5], [64, 0.5], [57, 0.5], [63, 0.5], [62, 0.5],
  [57, 0.5], [57, 0.5], [60, 0.5], [57, 0.5], [65, 0.5], [64, 0.5], [62, 0.5], [60, 0.5],
  [53, 0.5], [53, 0.5], [57, 0.5], [53, 0.5], [60, 0.5], [53, 0.5], [59, 0.5], [57, 0.5],
  [52, 0.5], [52, 0.5], [56, 0.5], [52, 0.5], [59, 0.5], [62, 0.5], [64, 1]];

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(W, H);
    canvas.style.cursor = 'pointer';
    const world = L.createWorld();
    const bg = makeBackground();
    let progressed = false, speed = 1, acc = 0, T = 0, menu = null, navSel = L.HINT_SPOT, kb = false, mouse = null;
    let parts = [], bolts = [], rings = [], floats = [], banner = null, treeFlash = 0, hint = true;
    let musicStop = null, musicKind = null, ended = false, endT = 0, lastHud = '', denyT = 0, denyMsg = '';
    const gate = {};
    const flakes = Array.from({ length: 36 }, () => ({ x: Math.random() * W, y: Math.random() * MAP_H, s: 0.6 + Math.random() * 1.4, v: 8 + Math.random() * 16, p: Math.random() * 6 }));

    // ---------- Ton ----------
    const once = (key, ms, fn) => { const now = performance.now(); if ((gate[key] || 0) > now) return; gate[key] = now + ms; fn(); };
    const tone = (...a) => ctx.audio.tone(...a);
    function music(kind) {
      if (musicStop) { musicStop(); musicStop = null; }
      musicKind = kind;
      if (!kind || ctx.paused || ended) return;
      musicStop = kind === 'boss'
        ? ctx.audio.melody(BOSS_MUSIC, { bpm: 150, type: 'square', vol: 0.035, loop: true })
        : ctx.audio.melody(MUSIC, { bpm: 132, type: 'triangle', vol: 0.05, loop: true });
    }
    ctx.onPause(p => { if (p) { if (musicStop) { musicStop(); musicStop = null; } } else if (musicKind) music(musicKind); });

    // ---------- Effekte ----------
    function burst(x, y, n, colors, { v = 90, life = 0.6, grav = 120, size = 2.5, flake = true } = {}) {
      for (let i = 0; i < n && parts.length < 450; i++) {
        const a = Math.random() * TAU, sp = v * (0.3 + Math.random() * 0.8);
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - v * 0.3, life: life * (0.6 + Math.random() * 0.6), max: life, c: colors[i % colors.length], s: size * (0.6 + Math.random() * 0.8), grav, flake: flake && Math.random() < 0.5, rot: Math.random() * 6 });
      }
    }
    const float = (x, y, s, c = C.gold, size = 13, life = 1, rise = 22) => floats.push({ x, y, s, c, size, life, max: life, rise });
    function deny(msg) { denyT = 1.2; denyMsg = msg; ctx.audio.sfx('bad'); }

    // ---------- Menü ----------
    function openMenu(spot, preselect = -1) {
      const s = SPOTS[spot], t = world.towers[spot];
      menu = { spot, kind: t ? 'tower' : 'build', sel: preselect, cx: Math.max(60, Math.min(W - 60, s.x)), cy: Math.max(64, Math.min(MAP_H - 76, s.y)), t: 0 };
      ctx.audio.sfx('click');
    }
    function menuItems() {
      if (!menu) return [];
      const { cx, cy } = menu;
      if (menu.kind === 'build') return TOWER_KEYS.map((k, i) => ({ key: k, x: cx + (i % 2 ? 37 : -37), y: cy + (i < 2 ? -34 : 34), cost: TOWERS[k].lv[0].cost }));
      const t = world.towers[menu.spot];
      return [{ key: 'up', x: cx, y: cy - 48, cost: L.upgradeCost(t) }, { key: 'sell', x: cx, y: cy + 48, cost: L.sellValue(t) }];
    }
    function confirm(i) {
      const it = menuItems()[i]; if (!it) return;
      const spot = menu.spot, s = SPOTS[spot];
      if (menu.kind === 'build') {
        if (!L.build(world, spot, it.key)) return deny('Zu wenig Plätzchen!');
        hint = false; menu = null; ctx.audio.sfx('power'); ctx.fx.shake(120);
        burst(s.x, s.y, 16, ['#fff', C.ice, C.gold], { v: 80, grav: 60 });
        rings.push({ x: s.x, y: s.y, r: 6, to: 30, life: 0.35, max: 0.35, c: C.gold });
      } else if (it.key === 'up') {
        const t = world.towers[spot];
        if (it.cost == null) return deny('Schon voll ausgebaut!');
        if (!L.upgrade(world, spot)) return deny('Zu wenig Plätzchen!');
        ctx.audio.sfx('level'); burst(s.x, s.y - 8, 22, [C.gold, '#fff'], { v: 100, grav: 40 });
        float(s.x, s.y - 30, `Stufe ${t.lvl + 1}!`, C.gold, 14);
        menu = null;
      } else {
        const v = it.cost; L.sell(world, spot);
        ctx.audio.sfx('coin'); burst(s.x, s.y, 14, ['#d99a4e', '#f2c27b', '#fff'], { v: 70 });
        float(s.x, s.y - 20, `+${v}`, C.gold); menu = null;
      }
    }
    const inBtn = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    function pressWave() {
      if (L.canCallWave(world)) { L.callWave(world); hint = false; }
      else { ctx.audio.sfx('tick'); }
    }
    function toggleSpeed() { speed = speed === 1 ? 2 : 1; ctx.audio.sfx(speed === 2 ? 'jump' : 'click'); }
    function spotAt(x, y) { let best = -1, bd = 26; SPOTS.forEach((s, i) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = i; } }); return best; }
    function itemAt(x, y) { return menuItems().findIndex(it => Math.hypot(it.x - x, it.y - y) < 25); }

    function tap(x, y) {
      if (ended || world.over) return;
      if (y >= MAP_H) {
        menu = null;
        if (inBtn(BTN_WAVE, x, y)) pressWave(); else if (inBtn(BTN_SPEED, x, y)) toggleSpeed();
        return;
      }
      if (menu) {
        const i = itemAt(x, y);
        if (i >= 0) { if (menu.sel === i) confirm(i); else { menu.sel = i; ctx.audio.sfx('tick'); } return; }
        const sp = spotAt(x, y), prev = menu.spot;
        menu = null;
        if (sp < 0 || sp === prev) return;
        openMenu(sp); navSel = sp; return;
      }
      const sp = spotAt(x, y);
      if (sp >= 0) { openMenu(sp); navSel = sp; }
    }
    ctx.on(canvas, 'pointerdown', e => {
      e.preventDefault(); kb = false; ctx.audio.unlock?.();
      const p = pos(e);
      if (e.pointerType === 'mouse' && menu) { const i = itemAt(p.x, p.y); if (i >= 0) menu.sel = i; }
      tap(p.x, p.y);
    });
    ctx.on(canvas, 'pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      mouse = pos(e);
      if (menu) { const i = itemAt(mouse.x, mouse.y); if (i >= 0 && menu.sel !== i) menu.sel = i; }
    });
    ctx.on(canvas, 'pointerleave', () => { mouse = null; });

    // ---------- Tastatur ----------
    const nodes = () => [...SPOTS.map((s, i) => ({ id: i, x: s.x, y: s.y })), { id: 'wave', x: BTN_WAVE.x + BTN_WAVE.w / 2, y: 576 }, { id: 'speed', x: BTN_SPEED.x + BTN_SPEED.w / 2, y: 576 }];
    function nav(dir) {
      const ns = nodes(), cur = ns.find(n => n.id === navSel) || ns[0];
      const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
      let best = null, bs = 1e9;
      for (const n of ns) {
        if (n.id === cur.id) continue;
        const dx = n.x - cur.x, dy = n.y - cur.y, along = dx * d[0] + dy * d[1];
        if (along <= 4) continue;
        const sc = along + Math.abs(dx * d[1] - dy * d[0]) * 2.2;
        if (sc < bs) { bs = sc; best = n; }
      }
      if (best) { navSel = best.id; ctx.audio.sfx('tick'); }
    }
    ctx.input.onPress(name => {
      kb = true;
      if (ended || world.over) return;
      if (menu) {
        if (name === 'b') { menu = null; ctx.audio.sfx('click'); return; }
        if (name === 'a') { if (menu.sel >= 0) confirm(menu.sel); else menu.sel = 0; return; }
        let s = menu.sel < 0 ? 0 : menu.sel;
        if (menu.kind === 'build') {
          if (menu.sel >= 0) {
            if (name === 'left') s &= 2; if (name === 'right') s |= 1;
            if (name === 'up') s &= 1; if (name === 'down') s |= 2;
          }
        } else if (menu.sel >= 0) s = name === 'up' ? 0 : name === 'down' ? 1 : 1 - s;
        if (s !== menu.sel) { menu.sel = s; ctx.audio.sfx('tick'); }
        return;
      }
      if (name === 'a') {
        if (navSel === 'wave') pressWave();
        else if (navSel === 'speed') toggleSpeed();
        else openMenu(navSel, 0);
        return;
      }
      if (name !== 'b') nav(name);
    });

    // ---------- Ereignisse aus der Logik ----------
    function handleEvents() {
      for (const e of world.events) {
        switch (e.type) {
          case 'wave':
            banner = { n: e.n, title: e.title, sub: e.sub, t: 0, boss: e.boss };
            ctx.audio.sfx('level');
            if (e.boss) music('boss'); else if (e.n === 1 || !musicKind) music('normal');
            break;
          case 'early': float(BTN_WAVE.x + BTN_WAVE.w / 2, 540, `Früh-Bonus +${e.bonus}`, C.gold, 13, 1.3); ctx.audio.sfx('coin'); break;
          case 'clear': float(W / 2, 58, `Welle ${e.n} geschafft! +${e.bonus}`, C.green, 15, 1.8, 6); ctx.audio.sfx('coin'); break;
          case 'pop': {
            const y = e.y - (e.air ? 16 : 0);
            const cols = e.gold ? [C.gold, '#fff', '#ffe9a8'] : e.air ? [C.violet, '#fff', '#e8d0ff'] : ['#fff', C.ice, '#dbe8ff'];
            burst(e.x, y, e.boss ? 80 : e.kind === 'yeti' ? 26 : 14, cols, { v: e.boss ? 180 : 90, life: e.boss ? 1.2 : 0.6 });
            rings.push({ x: e.x, y, r: 4, to: e.boss ? 90 : 22, life: 0.3, max: 0.3, c: 'rgba(255,255,255,.8)' });
            once('pop', 45, () => tone(500 + Math.random() * 300, 0.08, 'sine', 0.16, 1100));
            if (e.gold || e.kind === 'yeti' || e.boss) float(e.x, y - 14, `+${e.reward}`, C.gold, e.boss ? 20 : 13);
            if (e.gold) ctx.audio.sfx('coin');
            if (e.boss) { ctx.fx.shake(500); ctx.audio.sfx('boom'); float(W / 2, 200, 'Der Riesen-Yeti zerplatzt!', '#fff', 20, 2.2); music(null); }
            break;
          }
          case 'leak':
            treeFlash = 1; ctx.fx.shake(e.boss ? 600 : 220); ctx.audio.sfx('bad');
            for (let i = 0; i < e.steal; i++) parts.push({ gift: true, x: TREE.x + (Math.random() - 0.5) * 50, y: 525, vx: (Math.random() - 0.5) * 120, vy: -160 - Math.random() * 80, life: 1.1, max: 1.1, c: ['#ef476f', '#06d6a0', '#c77dff'][i % 3], s: 10, grav: 260, rot: 0 });
            float(TREE.x, 440, e.steal > 1 ? `-${e.steal} Geschenke!` : '-1 Geschenk', C.red, 14);
            if (world.lives > 0 && world.lives <= 5) once('warn', 4000, () => float(W / 2, 250, 'Achtung! Nur noch wenige Geschenke!', C.red, 15, 2));
            break;
          case 'fire':
            if (e.kind === 'sling') once('sling', 70, () => tone(760, 0.05, 'triangle', 0.06, 420));
            else once('cannon', 120, () => tone(180, 0.14, 'square', 0.1, 70));
            break;
          case 'zap':
            bolts.push({ pts: e.pts, life: 0.2, max: 0.2, lvl: e.lvl });
            once('zap', 90, () => { tone(1400, 0.08, 'sawtooth', 0.05, 2200); tone(900, 0.1, 'square', 0.04, 300, 0.03); });
            break;
          case 'boom':
            rings.push({ x: e.x, y: e.y, r: 4, to: e.r, life: 0.32, max: 0.32, c: C.red, fill: true });
            burst(e.x, e.y, 12, [C.red, '#fff', '#ffb3c6'], { v: 110, life: 0.5, flake: false });
            once('boom', 110, () => ctx.audio.sfx('hit'));
            break;
          case 'splat': burst(e.x, e.y, 5, ['#fff', '#dbe8ff'], { v: 50, life: 0.3, size: 2, flake: false }); break;
          case 'frost':
            rings.push({ x: e.x, y: e.y, r: 10, to: e.r, life: 0.5, max: 0.5, c: C.ice, frost: true });
            once('frost', 200, () => tone(1800, 0.12, 'sine', 0.04, 2600));
            break;
          case 'dmg': once('dmg', 140, () => float(e.x, e.y, String(e.v), '#fff', 12, 0.6)); break;
          case 'boss': ctx.fx.shake(400); tone(90, 0.7, 'sawtooth', 0.22, 45); float(W / 2, 220, 'Der Riesen-Yeti kommt!', C.red, 20, 2); break;
          case 'win': case 'lose': endGame(); break;
        }
      }
      world.events.length = 0;
    }

    function endGame() {
      if (ended) return;
      ended = true; menu = null; endT = 0; music(null);
      const won = world.over === 'win', st = L.stars(world), sc = L.score(world), lv = world.lives;
      ctx.save('besteWelle', Math.max(ctx.load('besteWelle', 0), world.wave));
      const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
      let txt;
      if (won && st === 3) txt = `Festung gehalten! ${lv} von 20 Geschenken gerettet. Meisterhaft verteidigt!`;
      else if (won) txt = `Gewonnen mit ${lv} Geschenken! Für 3 Sterne müssen am Ende noch mindestens 15 Geschenke unter dem Baum liegen.`;
      else if (st === 1) txt = `Bis Welle ${world.wave} gekommen! Für 2 Sterne musst du alle 12 Wellen überstehen. Tipp: ${tip}`;
      else txt = `Bis Welle ${world.wave} gekommen. Ab Welle 8 gibt es den ersten Stern. Tipp: ${tip}`;
      if (won) { ctx.fx.confetti?.(40); for (let i = 0; i < 5; i++) ctx.timeout(() => burst(60 + Math.random() * 240, 80 + Math.random() * 200, 40, [C.gold, C.red, C.green, C.ice, C.violet], { v: 160, life: 1.2, grav: 60, flake: false }), i * 250); }
      else ctx.audio.sfx('lose');
      ctx.timeout(() => ctx.finish({ won, stars: st, score: sc, text: txt }), won ? 2000 : 1800);
    }

    // ---------- Update ----------
    function update(dt) {
      T += dt;
      if (!world.over) {
        acc += dt * speed;
        let n = 0;
        while (acc >= STEP && n < 8) { L.step(world, STEP); acc -= STEP; n++; handleEvents(); }
      } else endT += dt;
      handleEvents();
      if (!progressed && world.wave >= 8 && !world.over) {
        progressed = true;
        ctx.progress({ stars: 1, score: L.score(world), text: 'Welle 8 erreicht: 1 Stern! Für den 2. Stern alle 12 Wellen überstehen.' });
      }
      const k = Math.min(dt * speed, 0.1);
      for (const p of parts) { p.life -= k; p.vy += p.grav * k; p.x += p.vx * k; p.y += p.vy * k; p.rot += k * 4; }
      parts = parts.filter(p => p.life > 0);
      for (const r of rings) r.life -= k; rings = rings.filter(r => r.life > 0);
      for (const b of bolts) b.life -= k; bolts = bolts.filter(b => b.life > 0);
      for (const f of floats) { f.life -= dt; f.y -= dt * f.rise; } floats = floats.filter(f => f.life > 0);
      for (const f of flakes) { f.y += f.v * dt; f.x += Math.sin(T + f.p) * 6 * dt; if (f.y > MAP_H) { f.y = -4; f.x = Math.random() * W; } }
      if (banner && (banner.t += dt) > 3) banner = null;
      treeFlash = Math.max(0, treeFlash - dt * 2.5); denyT = Math.max(0, denyT - dt);
      if (menu) menu.t += dt;
      if (menu && menu.kind === 'tower' && !world.towers[menu.spot]) menu = null;
      const hudStr = `${world.lives}|${world.money}|${world.wave}`;
      if (hudStr !== lastHud) { lastHud = hudStr; ctx.hud.set({ '🎁': world.lives, '🍪': world.money, 'Welle': `${Math.max(1, world.wave)}/12` }); }
    }

    // ---------- Zeichnen ----------
    function drawRange(x, y, r, col = 'rgba(255,209,102,', dashed = false) {
      g.fillStyle = col + '0.10)'; circle(g, x, y, r);
      g.strokeStyle = col + '0.7)'; g.lineWidth = 2; if (dashed) g.setLineDash([6, 5]); ring(g, x, y, r); g.setLineDash([]);
    }
    function drawShot(s) {
      const p = Math.min(1, s.t / s.dur), x = s.x0 + (s.tx - s.x0) * p, gy = s.y0 + (s.ty - s.y0) * p, arc = Math.sin(p * Math.PI) * s.h, y = gy - arc;
      g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, x, gy + 4, s.kind === 'cannon' ? 5 : 3, 1.6);
      if (s.kind === 'cannon') {
        g.fillStyle = '#fff'; circle(g, x, y, 5.5);
        g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 3.5, T * 10, T * 10 + 3); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.35)'; circle(g, x - (s.tx - s.x0) * 0.04, y + arc * 0.08, 3);
      } else {
        g.fillStyle = '#fff'; circle(g, x, y, 3.4 + s.lvl * 0.5);
        g.fillStyle = '#c9d6f2'; circle(g, x + 1, y + 1, 1.6);
      }
    }
    function drawBolt(b) {
      const a = b.life / b.max;
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const [w, col] of [[6, `rgba(255,209,102,${a * 0.35})`], [2.4, `rgba(255,255,255,${a})`]]) {
        g.strokeStyle = col; g.lineWidth = w; g.beginPath();
        for (let i = 0; i < b.pts.length - 1; i++) {
          const [x0, y0] = b.pts[i], [x1, y1] = b.pts[i + 1];
          if (i === 0) g.moveTo(x0, y0);
          const segs = 5;
          for (let k = 1; k <= segs; k++) {
            const t = k / segs, jit = k === segs ? 0 : (Math.random() - 0.5) * 12;
            g.lineTo(x0 + (x1 - x0) * t - (y1 - y0) / (Math.hypot(x1 - x0, y1 - y0) || 1) * jit, y0 + (y1 - y0) * t + (x1 - x0) / (Math.hypot(x1 - x0, y1 - y0) || 1) * jit);
          }
        }
        g.stroke();
      }
      const cols = [C.red, C.green, C.gold, C.ice, C.violet];
      b.pts.slice(1).forEach((p, i) => { g.fillStyle = cols[i % 5]; g.globalAlpha = a; circle(g, p[0], p[1], 3); g.globalAlpha = 1; });
    }
    function drawMenu() {
      const items = menuItems(), { cx, cy } = menu, s = SPOTS[menu.spot], t = world.towers[menu.spot];
      const pop = Math.min(1, menu.t * 7), ease = 1 - Math.pow(1 - pop, 3);
      // Reichweite
      if (menu.kind === 'tower') {
        const lv = TOWERS[t.type].lv;
        drawRange(s.x, s.y, lv[t.lvl].range);
        if (menu.sel === 0 && t.lvl < 2) drawRange(s.x, s.y, lv[t.lvl + 1].range, 'rgba(6,214,160,', true);
      } else if (menu.sel >= 0) drawRange(s.x, s.y, TOWERS[TOWER_KEYS[menu.sel]].lv[0].range, 'rgba(142,202,230,');
      g.fillStyle = `rgba(5,10,35,${0.55 * ease})`; circle(g, cx, cy, menu.kind === 'build' ? 78 * ease : 74 * ease);
      g.strokeStyle = `rgba(255,209,102,${0.5 * ease})`; g.lineWidth = 2; ring(g, s.x, s.y, 20);
      items.forEach((it, i) => {
        const x = cx + (it.x - cx) * ease, y = cy + (it.y - cy) * ease;
        const sel = menu.sel === i;
        const afford = it.key === 'sell' || (it.cost != null && world.money >= it.cost);
        g.fillStyle = sel ? '#2c3d86' : '#1b2660'; circle(g, x, y, 23);
        g.strokeStyle = sel ? C.gold : 'rgba(255,255,255,.35)'; g.lineWidth = sel ? 3 : 2; ring(g, x, y, 23);
        if (menu.kind === 'build') {
          g.save(); g.beginPath(); g.arc(x, y, 21, 0, TAU); g.clip();
          drawTower(g, { type: it.key, x, y: y + 9, lvl: 0, kick: 0, ang: -Math.PI / 2 }, T, true);
          g.restore();
        } else if (it.key === 'up') {
          if (it.cost == null) text(g, 'MAX', x, y, 13, C.gold);
          else { g.fillStyle = afford ? C.green : '#6b7299'; g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + 10, y); g.lineTo(x + 4, y); g.lineTo(x + 4, y + 10); g.lineTo(x - 4, y + 10); g.lineTo(x - 4, y); g.lineTo(x - 10, y); g.fill(); }
        } else { cookie(g, x - 4, y + 2, 8); cookie(g, x + 5, y - 4, 7); }
        if (!afford && it.cost != null) { g.fillStyle = 'rgba(30,34,60,.62)'; circle(g, x, y, 23); }
        if (it.cost != null) {
          const label = (it.key === 'sell' ? '+' : '') + it.cost, pw = 14 + label.length * 7.5, py = y + 26;
          const bad = !afford && denyT > 0 && sel;
          g.fillStyle = bad ? C.red : afford ? '#0b1437' : '#2a2f4d'; rrect(g, x - pw / 2, py - 8, pw, 16, 8); g.fill();
          g.strokeStyle = afford ? C.gold : '#6b7299'; g.lineWidth = 1.2; rrect(g, x - pw / 2, py - 8, pw, 16, 8); g.stroke();
          cookie(g, x - pw / 2 + 8, py, 4.5);
          text(g, label, x + 5, py + 0.5, 12, afford ? C.gold : '#9aa3c7');
        }
        if (sel && menu.t > 0.1) { g.strokeStyle = `rgba(255,209,102,${0.5 + Math.sin(T * 8) * 0.3})`; g.lineWidth = 2; ring(g, x, y, 27); }
      });
      // Infozeile
      let title = 'Turm wählen', sub = kb ? 'Pfeile wählen, Leertaste baut, X schließt' : 'Tippe einen Turm an, nochmal tippen baut';
      if (menu.kind === 'build' && menu.sel >= 0) { const k = TOWER_KEYS[menu.sel]; title = TOWERS[k].name; sub = DESC[k]; }
      if (menu.kind === 'tower') {
        const def = TOWERS[t.type];
        title = `${def.name} · Stufe ${t.lvl + 1}`;
        sub = menu.sel === 1 ? `Verkaufen für ${L.sellValue(t)} Plätzchen` : t.lvl < 2 ? `Ausbauen auf Stufe ${t.lvl + 2}: stärker und weiter` : 'Voll ausgebaut! Verkaufen bringt Plätzchen zurück.';
      }
      if (denyT > 0) { title = denyMsg; sub = 'Besiege Monster, dann gibt es neue Plätzchen.'; }
      // Info-Feld oben; nur bei den obersten Bauplätzen weicht es in die Lücke zwischen den Wegen aus (nie über den Baum)
      const by = cy >= 200 ? 6 : 208;
      g.fillStyle = 'rgba(5,10,35,.88)'; rrect(g, 8, by, W - 16, 48, 12); g.fill();
      g.strokeStyle = denyT > 0 ? C.red : 'rgba(255,209,102,.6)'; g.lineWidth = 1.5; rrect(g, 8, by, W - 16, 48, 12); g.stroke();
      text(g, title, W / 2, by + 16, 15, denyT > 0 ? C.red : C.gold);
      text(g, sub, W / 2, by + 34, 13, '#dbe4ff', { weight: 600 });
    }
    function drawMilestone() {
      const w = world.wave;
      const s = w < 8 ? 'Stern 1: Welle 8 erreichen' : w < 12 || world.lives < 15 ? 'Stern 2: alle 12 Wellen überstehen' : 'Stern 3: mit 15+ Geschenken gewinnen';
      g.font = `700 12px ${FONT}`; const pw = g.measureText(s).width + 22;
      g.fillStyle = 'rgba(5,10,35,.7)'; rrect(g, W / 2 - pw / 2, 6, pw, 22, 11); g.fill();
      text(g, s, W / 2, 17.5, 12, C.gold, { weight: 700 });
    }
    function drawBar() {
      g.fillStyle = '#081030'; g.fillRect(0, MAP_H, W, H - MAP_H);
      g.fillStyle = 'rgba(255,209,102,.35)'; g.fillRect(0, MAP_H, W, 1.5);
      text(g, 'WELLE', 46, 566, 12, '#a9b6e8', { weight: 700 });
      text(g, `${Math.max(1, world.wave)}/12`, 46, 584, 19, '#fff');
      // Welle-Knopf
      const b = BTN_WAVE, can = L.canCallWave(world), first = world.wave === 0;
      const pulse = can ? 1 + Math.sin(T * 5) * (first ? 0.04 : 0.02) : 1;
      g.save(); g.translate(b.x + b.w / 2, b.y + b.h / 2); g.scale(pulse, pulse);
      g.fillStyle = can ? (first ? '#06a37b' : '#1f8a5b') : '#262d55';
      rrect(g, -b.w / 2, -b.h / 2 + 3, b.w, b.h, 12); g.fillStyle = can ? '#0d5a40' : '#151a38'; g.fill();
      rrect(g, -b.w / 2, -b.h / 2, b.w, b.h, 12); g.fillStyle = can ? (first ? '#06c08f' : '#1f9a63') : '#262d55'; g.fill();
      let l1, l2;
      if (world.over) { l1 = world.over === 'win' ? 'Geschafft!' : 'Oh nein!'; l2 = ''; }
      else if (first) { l1 = "Los geht's! ▶"; l2 = `startet sonst in ${Math.ceil(world.countdown)} s`; }
      else if (can) { l1 = 'Nächste Welle ▶'; l2 = `in ${Math.ceil(world.countdown)} s · jetzt +${Math.floor(world.countdown)}`; }
      else if (world.wave >= WAVES.length) { l1 = 'Letzte Welle!'; l2 = 'Halte durch!'; }
      else { l1 = 'Welle läuft …'; l2 = ''; }
      text(g, l1, 0, l2 ? -6 : 0, 16, can ? '#fff' : '#9aa3c7');
      if (l2) {
        text(g, l2, 0, 11, 12, can ? '#e5fff6' : '#9aa3c7', { weight: 700 });
        if (can && !first) cookie(g, b.w / 2 - 12, 11, 4.5);
      }
      if (!can && !world.over && world.spawnQ.length) {
        const tot = WAVES[world.wave - 1].g.reduce((s, q) => s + q[1], 0), f = 1 - world.spawnQ.length / tot;
        g.fillStyle = 'rgba(255,255,255,.1)'; rrect(g, -b.w / 2 + 14, 10, b.w - 28, 5, 2.5); g.fill();
        g.fillStyle = C.ice; rrect(g, -b.w / 2 + 14, 10, (b.w - 28) * f, 5, 2.5); g.fill();
      }
      g.restore();
      // Tempo-Knopf
      const s = BTN_SPEED;
      rrect(g, s.x, s.y + 3, s.w, s.h, 12); g.fillStyle = '#151a38'; g.fill();
      rrect(g, s.x, s.y, s.w, s.h, 12); g.fillStyle = speed === 2 ? '#b9791b' : '#2c3d86'; g.fill();
      g.fillStyle = '#fff';
      const tri = (x) => { g.beginPath(); g.moveTo(x, s.y + 13); g.lineTo(x + 10, s.y + 21); g.lineTo(x, s.y + 29); g.fill(); };
      tri(s.x + 14); if (speed === 2) tri(s.x + 24);
      text(g, `x${speed}`, s.x + s.w - 22, s.y + s.h / 2 + 1, 17, '#fff');
      // Tastatur-Auswahl
      if (kb && !menu && (navSel === 'wave' || navSel === 'speed')) {
        const r = navSel === 'wave' ? b : s;
        g.strokeStyle = C.gold; g.lineWidth = 3; rrect(g, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 14); g.stroke();
      }
    }
    function drawBanner() {
      const t = banner.t, inn = Math.min(1, t * 4), out = t > 2.5 ? (t - 2.5) * 2 : 0;
      const a = Math.max(0, 1 - out), sc = 0.6 + 0.4 * (1 - Math.pow(1 - inn, 3)) + (t < 0.25 ? Math.sin(t * 12) * 0.05 : 0);
      g.save(); g.globalAlpha = a; g.translate(W / 2, 250); g.scale(sc, sc);
      const bw = 300, bh = banner.sub ? 92 : 74;
      g.fillStyle = banner.boss ? 'rgba(80,10,30,.92)' : 'rgba(5,10,35,.9)'; rrect(g, -bw / 2, -bh / 2, bw, bh, 18); g.fill();
      g.strokeStyle = banner.boss ? C.red : C.gold; g.lineWidth = 3; rrect(g, -bw / 2, -bh / 2, bw, bh, 18); g.stroke();
      g.fillStyle = banner.boss ? C.red : C.gold;
      star(g, -bw / 2 + 22, -bh / 2 + 22, 8, T); star(g, bw / 2 - 22, -bh / 2 + 22, 8, -T);
      text(g, `Welle ${banner.n}`, 0, -bh / 2 + 24, 26, banner.boss ? '#ffb3c6' : C.gold, { stroke: '#000', sw: 3 });
      text(g, banner.title, 0, -bh / 2 + 52, 17, '#fff');
      if (banner.sub) text(g, banner.sub, 0, -bh / 2 + 74, 12, '#cfe3ff', { weight: 700 });
      g.restore();
    }
    function drawBossBar() {
      const b = world.enemies.find(e => e.boss); if (!b) return;
      const f = Math.max(0, b.hp / b.maxHp), x = 50, wdt = W - 100;
      g.fillStyle = 'rgba(5,10,35,.85)'; rrect(g, x - 6, 4, wdt + 12, 26, 9); g.fill();
      text(g, 'Riesen-Yeti', W / 2, 12, 12, '#ffb3c6', { weight: 800 });
      g.fillStyle = '#3a1020'; rrect(g, x, 19, wdt, 7, 3.5); g.fill();
      g.fillStyle = C.red; rrect(g, x, 19, Math.max(4, wdt * f), 7, 3.5); g.fill();
    }
    function drawHint() {
      const s = SPOTS[L.HINT_SPOT], b = Math.abs(Math.sin(T * 4)) * 8;
      g.fillStyle = C.gold; g.shadowColor = C.gold; g.shadowBlur = 10;
      g.beginPath(); g.moveTo(s.x, s.y - 24 - b); g.lineTo(s.x - 11, s.y - 38 - b); g.lineTo(s.x - 4, s.y - 38 - b); g.lineTo(s.x - 4, s.y - 52 - b);
      g.lineTo(s.x + 4, s.y - 52 - b); g.lineTo(s.x + 4, s.y - 38 - b); g.lineTo(s.x + 11, s.y - 38 - b); g.closePath(); g.fill();
      g.shadowBlur = 0;
      const tx = s.x + 70, ty = s.y - 42;
      g.fillStyle = 'rgba(5,10,35,.85)'; rrect(g, tx - 50, ty - 12, 100, 24, 12); g.fill();
      g.strokeStyle = C.gold; g.lineWidth = 1.5; rrect(g, tx - 50, ty - 12, 100, 24, 12); g.stroke();
      text(g, 'Hier bauen!', tx, ty + 1, 13, C.gold);
    }
    function draw() {
      g.drawImage(bg, 0, 0, W, MAP_H);
      // Bauplätze
      const hiSpot = menu ? menu.spot : kb && typeof navSel === 'number' ? navSel : mouse ? spotAt(mouse.x, mouse.y) : -1;
      SPOTS.forEach((s, i) => { if (!world.towers[i]) drawSpot(g, s, T, i === hiSpot || (hint && i === L.HINT_SPOT)); });
      // Türme + Boden-Gegner nach Tiefe sortiert
      const list = [];
      world.towers.forEach(t => t && list.push({ y: t.y, f: () => drawTower(g, t, T) }));
      world.enemies.forEach(e => !e.air && e.d > -8 && list.push({ y: e.y, f: () => drawEnemy(g, e, T) }));
      list.sort((a, b) => a.y - b.y).forEach(o => o.f());
      if (kb && !menu && typeof navSel === 'number' && world.towers[navSel]) { const s = SPOTS[navSel]; g.strokeStyle = C.gold; g.lineWidth = 2.5; ring(g, s.x, s.y, 22); }
      drawTree(g, world.lives, T, treeFlash);
      for (const s of world.shots) drawShot(s);
      world.enemies.forEach(e => e.air && e.d > -8 && drawEnemy(g, e, T));
      // Ringe, Blitze, Partikel
      for (const r of rings) {
        const p = 1 - r.life / r.max, rr = r.r + (r.to - r.r) * (1 - Math.pow(1 - p, 2));
        g.globalAlpha = 1 - p;
        if (r.frost) {
          g.fillStyle = 'rgba(142,202,230,.12)'; circle(g, r.x, r.y, rr);
          g.strokeStyle = C.ice; g.lineWidth = 2; ring(g, r.x, r.y, rr);
          g.strokeStyle = '#fff'; g.lineWidth = 1;
          for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + p; snowflake(g, r.x + Math.cos(a) * rr, r.y + Math.sin(a) * rr, 3, p * 3); }
        } else if (r.fill) { g.fillStyle = 'rgba(239,71,111,.25)'; circle(g, r.x, r.y, rr); g.strokeStyle = '#fff'; g.lineWidth = 2.5; ring(g, r.x, r.y, rr); }
        else { g.strokeStyle = r.c; g.lineWidth = 2.5; ring(g, r.x, r.y, rr); }
        g.globalAlpha = 1;
      }
      bolts.forEach(drawBolt);
      for (const p of parts) {
        g.globalAlpha = Math.min(1, p.life / p.max * 1.6);
        if (p.gift) { gift(g, p.x, p.y, p.s, p.c); }
        else if (p.flake) { g.strokeStyle = p.c; g.lineWidth = 1.2; snowflake(g, p.x, p.y, p.s + 1, p.rot); }
        else { g.fillStyle = p.c; circle(g, p.x, p.y, p.s); }
      }
      g.globalAlpha = 1;
      // Schneefall
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (const f of flakes) circle(g, f.x, f.y, f.s);
      if (hint && !menu && !world.towers.some(Boolean)) drawHint();
      if (menu) drawMenu();
      else if (denyT > 0) { text(g, denyMsg, W / 2, MAP_H - 20, 14, C.red, { stroke: '#000', sw: 3 }); }
      drawBossBar();
      if (!menu && !banner && !world.over && !world.enemies.some(e => e.boss)) drawMilestone();
      for (const f of floats) { g.globalAlpha = Math.min(1, f.life / f.max * 2); text(g, f.s, f.x, f.y, f.size, f.c, { stroke: 'rgba(0,0,0,.7)', sw: 3 }); }
      g.globalAlpha = 1;
      if (banner) drawBanner();
      if (world.lives <= 5 && !world.over) { g.strokeStyle = `rgba(239,71,111,${0.25 + Math.sin(T * 5) * 0.15})`; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, MAP_H - 6); }
      if (world.over) {
        const a = Math.min(1, endT * 2);
        g.fillStyle = `rgba(5,10,35,${0.45 * a})`; g.fillRect(0, 0, W, MAP_H);
        g.save(); g.globalAlpha = a; g.translate(W / 2, 230); const sc = 0.8 + 0.2 * a + Math.sin(T * 3) * 0.02; g.scale(sc, sc);
        if (world.over === 'win') { text(g, 'Festung gehalten!', 0, 0, 30, C.gold, { stroke: '#000', sw: 5 }); text(g, `${world.lives} Geschenke gerettet`, 0, 34, 16, '#fff', { stroke: '#000', sw: 3 }); }
        else { text(g, 'Die Geschenke sind weg!', 0, 0, 25, C.red, { stroke: '#000', sw: 5 }); text(g, `Du hast bis Welle ${world.wave} durchgehalten`, 0, 32, 15, '#fff', { stroke: '#000', sw: 3 }); }
        g.restore();
      }
      drawBar();
    }

    ctx.timeout(() => { if (!world.wave && !world.towers.some(Boolean)) float(W / 2, 300, 'Baue zuerst einen Turm!', '#fff', 16, 2.4); }, 600);
    ctx.loop(dt => { update(dt); draw(); });
    // Für eigene Tests im Browser erreichbar (nicht global): Canvas-Eigenschaft
    canvas._td = { world, L, setSpeed: v => { speed = v; } };
    return { destroy() { if (musicStop) musicStop(); musicStop = null; musicKind = null; } };
  },
};
