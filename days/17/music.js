// Türchen 17 · Pixel-Hüpfer: kleine eigene Chiptune-Loops (Achtel-Raster) und ein Mini-Sequencer.
const SONGS = {
  menu: {
    bpm: 132, lead: 'square', bass: 'triangle',
    a: 'G5:1 A5:1 B5:2 D6:2 B5:2 | C6:2 A5:2 F#5:4 | G5:1 B5:1 D6:2 E6:2 D6:1 B5:1 | A5:6 -:2 | B5:1 C6:1 D6:2 B5:2 G5:2 | C6:2 E6:2 D6:4 | C6:1 B5:1 A5:2 D5:2 F#5:2 | G5:6 -:2',
    b: 'G2:4 D3:4 | C3:4 D3:4 | G2:4 C3:4 | D3:4 D2:4 | G2:4 B2:4 | C3:4 G2:4 | A2:4 D3:4 | G2:8',
  },
  wald: {
    bpm: 144, lead: 'square', bass: 'triangle',
    a: 'E5:2 G5:1 E5:1 C5:2 G4:2 | A4:1 C5:1 E5:1 A5:1 G5:4 | F5:2 E5:1 D5:1 C5:2 E5:2 | D5:2 B4:2 G4:4 | E5:2 G5:1 E5:1 C6:2 B5:1 A5:1 | G5:1 F5:1 E5:1 D5:1 E5:4 | F5:1 A5:1 G5:1 F5:1 E5:2 D5:2 | C5:6 -:2',
    b: 'C3:2 G3:2 C3:2 G3:2 | A2:2 E3:2 A2:2 E3:2 | F2:2 C3:2 F2:2 C3:2 | G2:2 D3:2 G2:2 B2:2 | C3:2 G3:2 C3:2 G3:2 | A2:2 E3:2 A2:2 C3:2 | F2:2 A2:2 G2:2 B2:2 | C3:2 G2:2 C3:4',
  },
  eis: {
    bpm: 116, lead: 'triangle', bass: 'square', bassVol: 0.035,
    a: 'A5:1 E5:1 C5:1 E5:1 A5:2 B5:2 | C6:2 B5:1 A5:1 E5:4 | F5:1 A5:1 C6:1 A5:1 G5:2 E5:2 | D5:2 E5:2 B4:4 | A5:1 E5:1 C5:1 E5:1 A5:2 C6:2 | D6:2 C6:1 B5:1 G5:4 | F5:2 E5:1 D5:1 E5:2 G#5:2 | A5:6 -:2',
    b: 'A2:4 E3:4 | A2:4 C3:4 | F2:4 C3:4 | E2:4 G#2:4 | A2:4 E3:4 | G2:4 D3:4 | F2:4 E2:4 | A2:8',
  },
  wolken: {
    bpm: 108, lead: 'triangle', bass: 'triangle',
    a: 'C5:2 F5:2 A5:3 G5:1 | F5:2 C6:2 A5:4 | A#5:2 A5:1 G5:1 F5:2 D5:2 | C5:2 E5:2 G5:4 | C5:2 F5:2 A5:3 C6:1 | D6:2 C6:1 A#5:1 A5:4 | G5:2 A#5:2 A5:2 E5:2 | F5:6 -:2',
    b: 'F2:2 C3:2 A2:2 C3:2 | F2:2 C3:2 A2:2 C3:2 | A#2:2 F3:2 D3:2 F3:2 | C3:2 G2:2 E2:2 G2:2 | F2:2 C3:2 A2:2 C3:2 | A#2:2 D3:2 F3:2 D3:2 | C3:2 E3:2 C3:2 A#2:2 | F2:4 C3:2 F2:2',
  },
  fabrik: {
    bpm: 152, lead: 'square', bass: 'triangle',
    a: 'D5:1 F#5:1 A5:1 F#5:1 D5:1 -:1 A4:2 | B4:1 D5:1 G5:1 D5:1 B4:1 -:1 G4:2 | A4:1 C#5:1 E5:1 A5:1 G5:1 E5:1 C#5:1 A4:1 | D5:2 F#5:2 D5:2 -:2 | F#5:1 A5:1 D6:1 A5:1 F#5:1 -:1 D5:2 | G5:1 B5:1 D6:1 B5:1 G5:2 E5:2 | E5:1 F#5:1 G5:1 E5:1 C#5:2 A4:2 | D5:4 -:4',
    b: 'D3:1 -:1 A2:1 -:1 D3:1 -:1 A2:1 -:1 | G2:1 -:1 D3:1 -:1 G2:1 -:1 D3:1 -:1 | A2:1 -:1 E3:1 -:1 A2:1 -:1 C#3:1 -:1 | D3:1 -:1 A2:1 -:1 D3:2 -:2 | D3:1 -:1 A2:1 -:1 D3:1 -:1 F#2:1 -:1 | G2:1 -:1 B2:1 -:1 G2:1 -:1 E2:1 -:1 | A2:1 -:1 E3:1 -:1 A2:1 -:1 C#3:1 -:1 | D3:2 A2:2 D2:4',
  },
  burg: {
    bpm: 126, lead: 'square', bass: 'triangle',
    a: 'D5:2 D5:1 E5:1 F5:2 A5:2 | G5:2 F5:1 E5:1 D5:4 | C5:2 E5:1 F5:1 G5:2 A#5:2 | A5:2 G5:2 A5:4 | D6:2 C6:1 A#5:1 A5:2 F5:2 | G5:2 E5:1 F5:1 D5:4 | A#4:2 C5:2 D5:2 E5:2 | D5:6 -:2',
    b: 'D3:2 A2:2 D3:2 A2:2 | A#2:2 F2:2 A#2:2 F2:2 | C3:2 G2:2 C3:2 G2:2 | A2:2 E2:2 A2:2 C#3:2 | D3:2 A2:2 D3:2 A2:2 | G2:2 D3:2 A#2:2 D3:2 | G2:2 A2:2 A#2:2 C#3:2 | D3:4 A2:4',
  },
  boss: {
    bpm: 168, lead: 'sawtooth', bass: 'square', leadVol: 0.035, bassVol: 0.04,
    a: 'D5:1 D5:1 F5:1 D5:1 G5:1 D5:1 A5:2 | D5:1 D5:1 F5:1 D5:1 A#5:1 A5:1 G5:2 | C5:1 C5:1 E5:1 C5:1 F5:1 C5:1 G5:2 | A5:1 G5:1 F5:1 E5:1 C#5:4',
    b: 'D2:1 D3:1 D2:1 D3:1 D2:1 D3:1 D2:1 D3:1 | A#1:1 A#2:1 A#1:1 A#2:1 A#1:1 A#2:1 A#1:1 A#2:1 | C2:1 C3:1 C2:1 C3:1 C2:1 C3:1 C2:1 C3:1 | A1:1 A2:1 A1:1 A2:1 A1:1 A2:1 C#3:1 E3:1',
  },
  ende: {
    bpm: 96, lead: 'triangle', bass: 'triangle',
    a: 'G5:2 B5:2 D6:3 B5:1 | C6:2 E6:2 D6:4 | B5:2 G5:2 A5:2 F#5:2 | G5:6 -:2',
    b: 'G2:4 D3:4 | C3:4 G2:4 | E2:4 D3:4 | G2:8',
  },
};

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function parse(str) {
  const ev = []; let t = 0;
  for (const tok of str.replace(/\|/g, ' ').trim().split(/\s+/)) {
    const [n, d] = tok.split(':'); const dur = Number(d);
    if (n !== '-') { const m = n.match(/^([A-G]#?)(\d)$/); ev.push({ t, midi: 12 * (Number(m[2]) + 1) + NOTE[m[1]], dur }); }
    t += dur;
  }
  return { ev, len: t };
}
const CACHE = {};
function song(name) {
  if (!CACHE[name]) {
    const s = SONGS[name], A = parse(s.a), B = parse(s.b);
    const len = Math.max(A.len, B.len);
    const slots = Array.from({ length: len }, () => []);
    A.ev.forEach(e => slots[e.t % len].push({ ...e, type: s.lead, vol: s.leadVol || 0.05 }));
    B.ev.forEach(e => slots[e.t % len].push({ ...e, type: s.bass, vol: s.bassVol || 0.07 }));
    CACHE[name] = { len, slots, eighth: 30 / s.bpm };
  }
  return CACHE[name];
}

// Sequencer: plant Töne ~0,25 s im Voraus über audio.tone(…, delay). pump() regelmäßig aufrufen.
export function createMusic(audio) {
  let cur = null, pos = 0, t0 = 0, last = 0;
  const now = () => performance.now() / 1000;
  return {
    play(name) {
      if (cur && cur.name === name) return;
      cur = { name, ...song(name) }; pos = 0; t0 = now() + 0.05; last = now();
    },
    stop() { cur = null; },
    get name() { return cur && cur.name; },
    pump() {
      if (!cur) return;
      const n = now();
      if (n - last > 0.4) t0 = n - pos * cur.eighth + 0.05; // nach Pause neu verankern
      last = n;
      while (t0 + pos * cur.eighth < n + 0.25) {
        const at = t0 + pos * cur.eighth;
        for (const e of cur.slots[pos % cur.len]) {
          audio.tone(440 * Math.pow(2, (e.midi - 69) / 12), e.dur * cur.eighth * 0.85, e.type, e.vol, null, Math.max(0, at - n));
        }
        pos++;
      }
    },
  };
}
