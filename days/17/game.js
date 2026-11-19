// Türchen 17: Pixel-Hüpfer – Jump-and-Run mit Wichtel, 5 Level, Endgegner.
import { createWorld, stepWorld, STEP, T } from './engine.js';
import { LEVELS } from './levels.js';
import { createRenderer } from './render.js';
import { createMusic } from './music.js';
import { HERO, NUT, COIN } from './sprites.js';

export const howto = {
  touch: 'Lauf mit den Pfeilen und spring mit „Sprung“ (lange drücken = höher). Hüpf Gegnern auf den Kopf und bring den Wichtel zum Tannenbaum.',
  keys: 'Lauf mit den Pfeiltasten (oder A/D) und spring mit der Leertaste (lange drücken = höher). Hüpf Gegnern auf den Kopf und bring den Wichtel zum Tannenbaum.',
};
export const starsInfo = '★ Level 2 geschafft · ★★ Level 4 · ★★★ alle 5 Level';

const VW = 320, VH = 400;          // Canvas (Logik-Pixel)
const Z = 2, WV = VW / Z, WH = VH / Z; // sichtbarer Welt-Ausschnitt (160 x 200), 2-fach vergrößert
const THEME_COL = { wald: ['#1f7a4d', '#eef5ff'], eis: ['#1b3263', '#8ecae6'], wolken: ['#3a2a7c', '#ffffff'], fabrik: ['#a85a33', '#fff3ee'], burg: ['#4b5274', '#ffd166'] };
const starsFor = d => (d >= 5 ? 3 : d >= 4 ? 2 : d >= 2 ? 1 : 0);

export default {
  create(ctx) {
    const { canvas, g, pos } = ctx.makeCanvas(VW, VH);
    const R = createRenderer(g, WV, WH);
    const music = createMusic(ctx.audio);
    const sfx = n => ctx.audio.sfx(n);
    const tone = (...a) => ctx.audio.tone(...a);
    ctx.input.pad({ dpad: 'lr', a: 'Sprung' });

    let done = Math.max(0, Math.min(5, Number(ctx.load('done', 0)) || 0));
    let nutsBest = ctx.load('nuts', [0, 0, 0, 0, 0]);
    if (!Array.isArray(nutsBest) || nutsBest.length !== 5) nutsBest = [0, 0, 0, 0, 0];

    let mode = 'menu', sel = Math.min(done, 4), lockMsg = 0, lockTxt = '', world = null, acc = 0, t = 0;
    const cam = { x: 0, y: 0 };
    let total = 0, runNuts = 0, latchJ = false, look = 40, shake = 0;
    let banner = 0, phaseT = 0, cardSel = 0, card = null, endT = 0, menuShake = 0, flash = 0;
    let finished = false;

    const hud = () => ctx.hud.set(world && mode === 'play'
      ? { Level: `${world.idx + 1}/5`, Punkte: total + world.score }
      : { Level: `${Math.min(done + 1, 5)}/5`, Punkte: total });
    hud();

    // ---------- Ablauf ----------
    const camTargetY = () => {
      const p = world.player, lo = 0, hi = world.lv.H * T - WH;
      // Figur im unteren Drittel: bei Fall etwas weiter nach unten schauen
      const down = world.phase === 'play' && !p.ground && p.vy > 160 ? 28 : 0;
      return Math.max(lo, Math.min(hi, p.y + 7 + down - WH * 0.66));
    };
    function startLevel(i) {
      world = createWorld(i); world.theme = LEVELS[i].theme;
      R.setLevel(world);
      look = 36;
      cam.x = Math.max(0, world.player.x + 5 + look - WV / 2);
      cam.y = camTargetY();
      mode = 'play'; acc = 0; latchJ = false; banner = 2.8; phaseT = 0; shake = 0; flash = 0;
      music.play(LEVELS[i].theme);
      sfx('swoosh'); hud();
    }
    function levelWon() {
      const i = world.idx, nuts = world.nuts.reduce((a, b) => a + b, 0);
      total += world.score; runNuts += nuts;
      done = Math.max(done, i + 1); ctx.save('done', done);
      nutsBest[i] = Math.max(nutsBest[i] || 0, nuts); ctx.save('nuts', nutsBest);
      if (i === 4) { mode = 'ende'; endT = 0; music.play('ende'); R.setTheme('wald'); R.clearParts(); }
      else { mode = 'card'; cardSel = 0; phaseT = 0; card = { i, coins: world.coinsGot, coinsMax: world.lv.coins.length, nuts, score: world.score, stars: starsFor(done) }; music.play('menu'); sfx('power'); }
      ctx.progress({ stars: starsFor(done), score: total, text: `Level ${done} von 5 geschafft.` });
      hud();
    }
    function finishGame() {
      if (finished) return; finished = true;
      music.stop();
      const st = starsFor(done), nb = nutsBest.reduce((a, b) => a + b, 0);
      const nutTxt = ` Goldene Nüsse gefunden: ${nb} von 15.`;
      const text = st >= 3 ? `Alle 5 Level geschafft – der Schneeball-König ist besiegt!${nutTxt}`
        : st === 2 ? `Super! Besiege den Schneeball-König in Level 5 für den dritten Stern.${nutTxt}`
        : st === 1 ? `Toll! Level 4 bringt den zweiten Stern, alle 5 Level den dritten.${nutTxt}`
        : `Schaffe Level 2 für den ersten Stern – du kannst später dort weitermachen.${nutTxt}`;
      ctx.finish({ won: st >= 3, stars: st, score: total, text });
    }
    function chooseCard(k) {
      sfx('click');
      if (k === 0) startLevel(card.i + 1); else finishGame();
    }

    // ---------- Eingabe ----------
    ctx.input.onPress(n => {
      if (mode === 'menu') {
        if (n === 'left' || n === 'up') { sel = (sel + 4) % 5; sfx('tick'); }
        else if (n === 'right' || n === 'down') { sel = (sel + 1) % 5; sfx('tick'); }
        else if (n === 'a' || n === 'b') pickLevel(sel);
      } else if (mode === 'play') {
        if (n === 'a' || n === 'up') latchJ = true;
      } else if (mode === 'card') {
        if (n === 'left' || n === 'right' || n === 'up' || n === 'down') { cardSel = 1 - cardSel; sfx('tick'); }
        else if ((n === 'a' || n === 'b') && phaseT > 0.4) chooseCard(cardSel);
      } else if (mode === 'ende') {
        if ((n === 'a' || n === 'b') && endT > 2.5) finishGame();
      }
    });
    function pickLevel(i) {
      if (i > done) { menuShake = 0.3; sfx('bad'); lockMsg = 2; lockTxt = i === done + 1 ? `ERST LEVEL ${done + 1} SCHAFFEN` : 'ERST DIE LEVEL DAVOR'; return; }
      sfx('click'); startLevel(i);
    }
    const LIST_Y = 148, LIST_H = 40, LIST_GAP = 46;
    const CARD_BTN = [{ x: 30, y: 258, w: 260, h: 44 }, { x: 30, y: 310, w: 260, h: 38 }];
    const inside = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    ctx.on(canvas, 'pointerdown', e => {
      const p = pos(e);
      if (mode === 'menu') {
        for (let i = 0; i < 5; i++) if (inside(p, { x: 20, y: LIST_Y + i * LIST_GAP, w: 280, h: LIST_H })) { sel = i; pickLevel(i); }
      } else if (mode === 'card' && phaseT > 0.4) {
        CARD_BTN.forEach((b, k) => { if (inside(p, b)) chooseCard(k); });
      } else if (mode === 'ende' && endT > 2.5) finishGame();
    });

    // ---------- Ereignisse aus der Spiel-Logik ----------
    function onEvents() {
      for (const e of world.ev) {
        switch (e.t) {
          case 'jump': R.dust(e.x, e.y, 4); tone(330, 0.11, 'square', 0.07, 620); break;
          case 'land': if (e.v > 260) { R.dust(e.x, e.y, Math.min(9, 3 + Math.floor(e.v / 80))); tone(110, 0.06, 'triangle', 0.12, 70); } break;
          case 'skid': if (Math.random() < 0.3) R.dust(e.x, e.y, 1); break;
          case 'coin': sfx('coin'); R.burst('spark', e.x, e.y, 6, { c: '#ffd166', v: 50, life: 0.35 }); R.text('+10', e.x, e.y - 6); break;
          case 'nut':
            sfx('power'); R.ring(e.x, e.y); R.burst('spark', e.x, e.y, 18, { c: '#ffd166', v: 90, life: 0.7, s: 2 });
            R.text('NUSS +100', e.x, e.y - 10, '#fff3c4'); flash = 0.15; break;
          case 'stomp':
            sfx('pop'); shake = Math.max(shake, 2);
            R.burst('flake', e.x, e.y, 12, { c: e.kind === 'cube' ? '#8ecae6' : '#ffffff', v: 70, life: 0.7, g: 60, s: 2 });
            R.text('+20', e.x, e.y - 8, '#8ecae6'); break;
          case 'hurt': sfx('hit'); shake = 5; R.burst('spark', e.x, e.y, 10, { c: '#ef476f', v: 80, life: 0.5, s: 2 }); break;
          case 'fall': sfx('bad'); break;
          case 'respawn': R.burst('spark', e.x + 5, e.y + 7, 12, { c: '#8ecae6', v: 50, life: 0.6 }); tone(660, 0.15, 'triangle', 0.1, 990); break;
          case 'flag': [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'square', 0.08, null, i * 0.07)); R.burst('spark', e.x, e.y, 14, { c: '#06d6a0', v: 70, life: 0.6, s: 2 }); if (banner <= 0) ctx.toast('Fahne erreicht!', 1000); break;
          case 'boing': tone(180, 0.28, 'sine', 0.2, 720); R.burst('dust', e.x, e.y, 6, { c: '#ffffff', v: 40, life: 0.4, s: 2 }); break;
          case 'crack': tone(300, 0.05, 'square', 0.05, 200); break;
          case 'crumble': tone(160, 0.12, 'triangle', 0.1, 60); R.burst('crumb', e.x, e.y, 10, { c: '#a8713a', v: 50, life: 0.8, g: 400, s: 2 }); break;
          case 'shiver': tone(1500, 0.12, 'triangle', 0.04, 1300); break;
          case 'shatter': tone(1800, 0.08, 'square', 0.05, 900); R.burst('shard', e.x, e.y, 9, { c: '#d9f3ff', v: 70, life: 0.6, g: 380, s: 2, up: true }); break;
          case 'secret': [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'triangle', 0.08, null, i * 0.06)); R.text('GEHEIMGANG!', e.x, e.y - 8, '#c77dff'); break;
          case 'bonk': tone(140, 0.05, 'square', 0.06); break;
          case 'hop': if (!e.quiet) tone(420, 0.08, 'sine', 0.04, 600); break;
          case 'puff': R.burst('flake', e.x, e.y, 6, { c: '#fff', v: 40, life: 0.5 }); break;
          case 'roar': tone(90, 0.5, 'sawtooth', 0.13, 55); shake = 4; R.text('GRRR!', e.x, e.y - 18, '#8ecae6'); music.play('boss'); break;
          case 'bossland': tone(70, 0.15, 'triangle', 0.2, 40); shake = Math.max(shake, 3); R.dust(e.x, e.y, 8); break;
          case 'bosshit': sfx('boom'); ctx.fx.shake(250); shake = 6; R.burst('flake', e.x, e.y, 20, { c: '#ffffff', v: 110, life: 0.8, g: 80, s: 2 }); R.text('AUTSCH!', e.x, e.y - 14, '#ffd166'); break;
          case 'bossdead':
            sfx('level'); ctx.fx.shake(400); shake = 8; flash = 0.3;
            R.burst('flake', e.x, e.y, 50, { c: '#ffffff', v: 160, life: 1.3, g: 60, s: 2 });
            R.burst('spark', e.x, e.y - 10, 20, { c: '#ffd166', v: 120, life: 1, s: 2 });
            ctx.toast('Der König purzelt! Das Tor ist offen!', 1800); music.play('burg'); break;
          case 'goal':
            sfx('level'); flash = 0.25;
            R.burst('spark', e.x, e.y, 30, { c: '#ffd166', v: 130, life: 1.1, s: 2 });
            R.burst('flake', e.x, e.y + 10, 20, { c: '#06d6a0', v: 90, life: 1, s: 2 }); break;
        }
      }
      world.ev.length = 0;
    }

    function updatePlay(dt) {
      acc += dt;
      while (acc >= STEP - 1e-7 && mode === 'play') {
        acc -= STEP;
        const inp = { l: ctx.input.down('left'), r: ctx.input.down('right'), j: ctx.input.down('a') || ctx.input.down('up') || latchJ };
        latchJ = false;
        stepWorld(world, inp);
        onEvents();
        if (world.phase === 'won' || world.phase === 'lost') phaseT += STEP; else phaseT = 0;
        if (world.phase === 'won' && phaseT > 2.6) levelWon();
        else if (world.phase === 'lost' && phaseT > 2.0) startLevel(world.idx);
      }
      if (mode !== 'play') return;
      if (world.gateOpen && world.boss) world.gateT = (world.gateT || 0) + dt * 0.7;
      const p = world.player;
      if (world.phase === 'play') {
        look += (p.face * 36 - look) * Math.min(1, dt * 2);
        const tx = p.x + 5 + look - WV / 2;
        cam.x += (tx - cam.x) * Math.min(1, dt * 6);
        cam.y += (camTargetY() - cam.y) * Math.min(1, dt * 5);
      } else if (world.phase === 'won') {
        cam.x += (world.lv.tree.x + 16 - WV / 2 - cam.x) * Math.min(1, dt * 2);
      }
      cam.x = Math.max(0, Math.min(world.lv.W * T - WV, cam.x));
      cam.y = Math.max(0, Math.min(world.lv.H * T - WH, cam.y));
      if (banner > 0) banner -= dt;
      hud();
    }

    // ---------- Zeichnen ----------
    const txt = (s, x, y, o) => R.drawText(s, x, y, o);
    // Text (Schrift 2 = 12 Logik-Pixel je Zeichen) in Zeilen von höchstens n Zeichen umbrechen
    const wrap = (str, n) => { const out = []; let cur = ''; for (const w of String(str).split(' ')) { if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); return out; };
    function panel(x, y, w, h, border = '#ffd166') {
      g.fillStyle = 'rgba(8,10,34,.88)'; g.fillRect(x, y, w, h);
      g.fillStyle = border; g.fillRect(x, y, w, 2); g.fillRect(x, y + h - 2, w, 2); g.fillRect(x, y, 2, h); g.fillRect(x + w - 2, y, 2, h);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 2, y + 2, w - 4, 3);
    }
    function button(b, label, on, s = 2) {
      const pulse = on ? Math.sin(t * 6) * 1 : 0;
      g.fillStyle = on ? '#ffd166' : 'rgba(255,255,255,.12)'; g.fillRect(b.x - pulse, b.y - pulse, b.w + pulse * 2, b.h + pulse * 2);
      g.fillStyle = on ? '#b9791b' : 'rgba(0,0,0,.3)'; g.fillRect(b.x - pulse, b.y + b.h - 3 + pulse, b.w + pulse * 2, 3);
      txt(label, b.x + b.w / 2, b.y + b.h / 2 - 3.5 * s, { s, c: on ? '#1a1030' : '#ffffff', al: 'center', sh: on ? null : undefined });
    }
    function drawHeroBig(x, y, s, fr, flip) { g.drawImage(R.sprite('hero_' + fr, HERO[fr], flip), Math.round(x), Math.round(y), 18 * s, 18 * s); }

    function drawMenu(dt) {
      g.save(); g.scale(Z, Z); R.drawBg(t * 18, t); g.restore();
      g.fillStyle = '#eef5ff'; g.fillRect(0, VH - 26, VW, 26); g.fillStyle = '#4a2c2a'; g.fillRect(0, VH - 18, VW, 18);
      g.save(); g.scale(Z, Z); R.drawWeather(dt, t); g.restore();
      // Titel mit hüpfenden Buchstaben
      const title = 'PIXEL-HÜPFER';
      const tw = title.length * 18 - 3; let x = VW / 2 - tw / 2;
      [...title].forEach((ch, i) => {
        const yy = 26 + Math.round(Math.max(0, Math.sin(t * 4 - i * 0.45)) * -5);
        txt(ch, x + i * 18, yy, { s: 3, c: i % 2 ? '#ffd166' : '#ef476f', sh: '#1a1030' });
      });
      txt('WICHTEL-ABENTEUER', VW / 2, 56, { s: 2, c: '#8ecae6', al: 'center' });
      // Wichtel hüpft
      const hop = Math.abs(Math.sin(t * 3.2));
      drawHeroBig(VW / 2 - 27, 112 - hop * 30, 3, hop > 0.15 ? 'jump' : 'idle', false);
      if (hop < 0.08 && Math.random() < 0.3) R.dust(VW / 2, 166, 1);
      // Level-Liste
      for (let i = 0; i < 5; i++) {
        const L = LEVELS[i], y = LIST_Y + i * LIST_GAP, on = i === sel, locked = i > done;
        const sx = on && menuShake > 0 ? Math.sin(t * 60) * 3 : 0;
        const bx = 20 + sx;
        g.fillStyle = on ? '#ffd166' : 'rgba(8,10,34,.78)'; g.fillRect(bx - 2, y - 2, 284, LIST_H + 4);
        g.fillStyle = 'rgba(8,10,34,.92)'; g.fillRect(bx, y, 280, LIST_H);
        const [c1, c2] = THEME_COL[L.theme];
        g.fillStyle = c1; g.fillRect(bx + 4, y + 4, 32, 32); g.fillStyle = c2; g.fillRect(bx + 4, y + 4, 32, 6);
        txt(String(i + 1), bx + 20, y + 13, { s: 2, c: '#ffffff', al: 'center' });
        txt(L.name, bx + 46, y + 4, { s: 2, c: locked ? '#5b6280' : '#ffffff' });
        if (locked) {
          g.fillStyle = '#5b6280'; g.fillRect(bx + 252, y + 18, 14, 11); g.fillStyle = '#0b1437'; g.fillRect(bx + 258, y + 21, 2, 5);
          g.strokeStyle = '#5b6280'; g.lineWidth = 2; g.beginPath(); g.arc(bx + 259, y + 17, 4, Math.PI, 0); g.stroke();
          txt('GESPERRT', bx + 46, y + 22, { s: 2, c: '#5b6280' });
        } else {
          for (let k = 0; k < 3; k++) { g.globalAlpha = k < (nutsBest[i] || 0) ? 1 : 0.25; g.drawImage(R.sprite('nut', NUT), bx + 46 + k * 15, y + 23, 12, 12); }
          g.globalAlpha = 1;
          if (i < done) txt('GESCHAFFT', bx + 274, y + 22, { s: 2, c: '#06d6a0', al: 'right' });
        }
      }
      R.drawParticlesScreen(dt);
      if (menuShake > 0) menuShake -= dt;
      if (lockMsg > 0) { lockMsg -= dt; txt(lockTxt, VW / 2, VH - 22, { s: 2, c: '#ef476f', al: 'center' }); }
      else txt(ctx.input.isTouch ? 'TIPPE AUF EIN LEVEL' : 'PFEILE + LEERTASTE', VW / 2, VH - 22, { s: 2, c: '#ffd166', al: 'center' });
    }

    function drawPlay(dt) {
      const extra = { shake, treeLit: world.phase === 'won', treeGlow: world.phase === 'won' ? Math.min(1, phaseT) : 0 };
      g.save(); g.scale(Z, Z); R.drawWorld(world, cam, t, dt, extra); g.restore();
      shake = Math.max(0, shake - dt * 18);
      R.hud(world, total, t);
      if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * 1.6})`; g.fillRect(0, 0, VW, VH); flash -= dt; }
      if (banner > 0 && world.phase === 'play') {
        const a = Math.min(1, banner * 2, (2.8 - banner) * 4);
        g.globalAlpha = a;
        const hl = wrap(LEVELS[world.idx].hint, 24);
        panel(16, 40, 288, 62 + hl.length * 18, '#8ecae6');
        txt(`LEVEL ${world.idx + 1}`, VW / 2, 50, { s: 2, c: '#ffd166', al: 'center' });
        txt(LEVELS[world.idx].name, VW / 2, 68, { s: 2, c: '#ffffff', al: 'center' });
        hl.forEach((l, k) => txt(l, VW / 2, 92 + k * 18, { s: 2, c: '#8ecae6', al: 'center' }));
        g.globalAlpha = 1;
      }
      if (world.phase === 'fall') {
        const a = Math.min(1, phaseT >= 0 ? world.phaseT / 0.8 : 0);
        g.fillStyle = `rgba(11,20,55,${a * 0.9})`; g.fillRect(0, 0, VW, VH);
        txt('PLUMPS!', VW / 2, 160, { s: 3, c: '#8ecae6', al: 'center' });
        txt('ZURÜCK ZUR FAHNE', VW / 2, 192, { s: 2, c: '#ffffff', al: 'center' });
      }
      if (world.phase === 'lost') {
        g.fillStyle = `rgba(11,20,55,${Math.min(0.85, phaseT)})`; g.fillRect(0, 0, VW, VH);
        panel(16, 130, 288, 130, '#ef476f');
        txt('HOPPLA!', VW / 2, 144, { s: 3, c: '#ef476f', al: 'center' });
        txt('ALLE HERZEN WEG.', VW / 2, 180, { s: 2, c: '#ffffff', al: 'center' });
        txt('NEUER VERSUCH -', VW / 2, 208, { s: 2, c: '#ffd166', al: 'center' });
        txt('DU SCHAFFST DAS!', VW / 2, 226, { s: 2, c: '#ffd166', al: 'center' });
      }
      if (world.phase === 'won') {
        const k = Math.min(1, phaseT * 2);
        txt('GESCHAFFT!', VW / 2, 120 - (1 - k) * 30, { s: 3, c: '#ffd166', al: 'center' });
      }
    }

    function drawCard(dt) {
      g.save(); g.scale(Z, Z); R.drawWorld(world, cam, t, dt, { shake: 0, treeLit: true, treeGlow: 1 }); g.restore();
      g.fillStyle = 'rgba(8,10,34,.5)'; g.fillRect(0, 0, VW, VH);
      panel(20, 70, 280, 290);
      txt(`LEVEL ${card.i + 1} GESCHAFFT!`, VW / 2, 86, { s: 2, c: '#ffd166', al: 'center' });
      g.drawImage(R.sprite('coin', COIN), 64, 116, 14, 14);
      txt(`${card.coins} / ${card.coinsMax}`, 86, 118, { s: 2, c: '#ffffff' });
      for (let k = 0; k < 3; k++) { g.globalAlpha = k < card.nuts ? 1 : 0.25; g.drawImage(R.sprite('nut', NUT), 190 + k * 22, 113, 19, 18); }
      g.globalAlpha = 1;
      txt(`PUNKTE: ${total}`, VW / 2, 146, { s: 2, c: '#8ecae6', al: 'center' });
      // Sterne-Fortschritt
      for (let k = 0; k < 3; k++) {
        const on = k < card.stars, x = VW / 2 - 42 + k * 28;
        txt('*', x, 172, { s: 3, c: on ? '#ffd166' : '#3a4270', al: 'center', sh: '#1a1030' });
      }
      const nextStar = card.stars === 0 ? 'LEVEL 2 = 1. STERN' : card.stars === 1 ? 'LEVEL 4 = 2. STERN' : card.stars === 2 ? 'LEVEL 5 = 3. STERN' : '';
      txt(nextStar, VW / 2, 198, { s: 2, c: '#ffffff', al: 'center' });
      txt(`NÄCHSTES: LEVEL ${card.i + 2}`, VW / 2, 224, { s: 2, c: '#c77dff', al: 'center' });
      button(CARD_BTN[0], 'WEITER >', cardSel === 0, 3);
      button(CARD_BTN[1], 'FERTIG FÜR HEUTE', cardSel === 1, 2);
      phaseT += dt;
    }

    function drawEnde(dt) {
      endT += dt;
      g.save(); g.scale(Z, Z); R.drawBg(endT * 10, t); g.restore();
      g.fillStyle = '#eef5ff'; g.fillRect(0, VH - 60, VW, 60); g.fillStyle = '#d5e4f7'; g.fillRect(0, VH - 40, VW, 40);
      // großer leuchtender Baum
      g.save(); g.translate(VW / 2 - 48, VH - 60 - 144); g.scale(3, 3);
      R.drawTree(0, 0, true, t, 1);
      g.restore();
      const hop = Math.abs(Math.sin(t * 5));
      drawHeroBig(VW / 2 + 40, VH - 60 - 54 - hop * 14, 3, hop > 0.2 ? 'jump' : 'idle', true);
      drawHeroBig(VW / 2 - 94, VH - 60 - 54 - Math.abs(Math.sin(t * 5 + 1.5)) * 14, 3, 'jump', false);
      if (Math.random() < 0.3) R.burst('spark', Math.random() * VW, -4, 1, { c: ['#ffd166', '#ef476f', '#06d6a0', '#8ecae6', '#c77dff'][Math.floor(Math.random() * 5)], v: 10, life: 4, g: 30, s: 2 });
      g.save(); g.scale(Z, Z); R.drawWeather(dt, t); g.restore();
      R.drawParticlesScreen(dt);
      const lines = ['GESCHAFFT!', 'DER SCHNEEBALL-KÖNIG', 'IST GEPURZELT.', '', `PUNKTE: ${total}`, `NÜSSE: ${nutsBest.reduce((a, b) => a + b, 0)} / 15`, '', 'FROHE WEIHNACHTEN!'];
      lines.forEach((l, i) => {
        const a = Math.max(0, Math.min(1, endT * 1.5 - i * 0.35));
        if (!a) return;
        g.globalAlpha = a;
        txt(l, VW / 2, 22 + i * 18 + (1 - a) * 10, { s: 2, c: i === 0 ? '#ffd166' : i === 7 ? '#ef476f' : '#ffffff', al: 'center' });
      });
      g.globalAlpha = 1;
      if (endT > 2.5) txt(ctx.input.isTouch ? 'TIPPEN = ENDE' : 'LEERTASTE = ENDE', VW / 2, VH - 24, { s: 2, c: Math.sin(t * 5) > 0 ? '#1a1030' : '#5b6280', al: 'center', sh: null });
      if (endT > 12) finishGame();
    }

    // Erster Start: sofort Level 1, die Levelauswahl gibt es erst nach dem ersten geschafften Level
    if (done < 1) startLevel(0);
    else { R.setTheme('wald'); music.play('menu'); }

    ctx.loop(dt => {
      t += dt;
      music.pump();
      if (mode === 'play') updatePlay(dt);
      g.imageSmoothingEnabled = false;
      if (mode === 'menu') drawMenu(dt);
      else if (mode === 'play') drawPlay(dt);
      else if (mode === 'card') drawCard(dt);
      else if (mode === 'ende') drawEnde(dt);
    });
    return { destroy() { music.stop(); } };
  },
};
