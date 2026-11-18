// Türchen 24: Musik. Alle Melodien gemeinfrei, selbst notiert (MIDI-Nummern, Schläge).
// Jedes Stück hat mehrere Stimmen gleicher Länge, die gemeinsam in Schleife laufen.

// Bass aus Grundtönen pro Takt
const bass = (roots, pattern) => roots.flatMap(r => pattern.map(([iv, b]) => [r + iv, b]));
const rep = (arr, n) => Array.from({ length: n }, () => arr).flat();

// "Deck the Halls" (G-Dur) - fröhlicher Anflug
const deckA = [[74, 1.5], [72, .5], [71, 1], [69, 1], [67, 1], [69, 1], [71, 1], [67, 1], [69, .5], [71, .5], [72, .5], [69, .5], [71, 1.5], [69, .5], [67, 1], [66, 1], [67, 2]];
const deckB = [[69, 1.5], [71, .5], [72, 1], [69, 1], [71, 1.5], [72, .5], [74, 1], [69, 1], [71, .5], [73, .5], [74, 1], [76, .5], [78, .5], [79, 1], [78, 1], [76, 1], [74, 2]];
const deckC = [[74, 1.5], [72, .5], [71, 1], [69, 1], [67, 1], [69, 1], [71, 1], [67, 1], [76, .5], [76, .5], [76, .5], [76, .5], [74, 1.5], [72, .5], [71, 1], [69, 1], [67, 2]];
const DECK = {
  bpm: 172,
  voices: [
    { notes: [...deckA, ...deckA, ...deckB, ...deckC], type: 'square', vol: 0.045 },
    { notes: bass([43, 43, 50, 43, 43, 43, 50, 43, 50, 50, 45, 50, 43, 48, 48, 50], [[0, .5], [12, .5], [7, .5], [12, .5], [0, .5], [12, .5], [7, .5], [12, .5]]), type: 'triangle', vol: 0.09 },
  ],
};

// "Carol of the Bells" (g-Moll, 3/4) - Spannung vor der Eisfestung
const ost = (a, b, c) => [[a, 1], [b, .5], [a, .5], [c, 1]];
const CAROL = {
  bpm: 156,
  voices: [
    { notes: [...rep(ost(70, 69, 67), 4), ...rep(ost(75, 74, 72), 4), ...rep(ost(70, 69, 67), 4), [79, 1], [77, 1], [75, 1], [74, 1], [72, 1], [70, 1], [69, 1], [67, 1], [66, 1], [67, 3]], type: 'square', vol: 0.045 },
    { notes: [...rep(ost(82, 81, 79), 4).map(([n, b]) => [0, b]), ...rep(ost(87, 86, 84), 4), ...rep(ost(82, 81, 79), 4), ...rep([[0, 3]], 4)], type: 'sine', vol: 0.03 },
    { notes: bass([43, 43, 43, 43, 48, 48, 48, 48, 43, 41, 39, 38, 39, 38, 38, 43], [[0, 1], [7, 1], [12, 1]]), type: 'triangle', vol: 0.1 },
  ],
};

// "God Rest Ye Merry Gentlemen" (e-Moll) - Boss-Musik, treibend
const godA = [[64, 1], [64, 1], [71, 1], [71, 1], [69, 1], [67, 1], [66, 1], [64, 1], [62, 1], [64, 1], [66, 1], [67, 1], [69, 1], [71, 3]];
const godB = [[71, 1], [72, 1], [69, 1], [71, 1], [72, 1], [74, 1], [76, 1], [71, 1], [69, 1], [67, 1], [64, 1], [66, 1], [67, 1], [69, 1], [71, 2],
  [76, 1], [74, .5], [72, .5], [71, 1], [69, 1], [67, 1], [66, 1], [64, 2], [62, 1], [67, 1], [66, .5], [64, .5], [66, 1], [64, 4]];
const BOSS = {
  bpm: 176,
  voices: [
    { notes: [...godA, ...godA, ...godB], type: 'square', vol: 0.045 },
    { notes: bass([40, 36, 38, 35, 40, 36, 38, 35, 43, 36, 45, 43, 36, 40, 38, 40], [[0, .5], [0, .5], [12, .5], [0, .5], [0, .5], [0, .5], [12, .5], [7, .5]]), type: 'sawtooth', vol: 0.045 },
    { notes: rep([[96, .25], [0, .75], [100, .25], [0, .75], [96, .25], [0, .75], [100, .25], [0, .25], [100, .25], [0, .25]], 16), type: 'square', vol: 0.012 },
  ],
};

// "Jingle Bells" (G-Dur) - Feuerwerk-Finale
const jA = [[71, 1], [71, 1], [71, 2], [71, 1], [71, 1], [71, 2], [71, 1], [74, 1], [67, 1.5], [69, .5], [71, 4]];
const jB = [[72, 1], [72, 1], [72, 1.5], [72, .5], [72, 1], [71, 1], [71, 1], [71, .5], [71, .5]];
const jingleMel = [...jA, ...jB, [71, 1], [69, 1], [69, 1], [71, 1], [69, 2], [74, 2], ...jA, ...jB, [74, 1], [74, 1], [72, 1], [69, 1], [67, 4]];
const JINGLE = {
  bpm: 184,
  voices: [
    { notes: jingleMel, type: 'square', vol: 0.05 },
    { notes: jingleMel.map(([n, b]) => [n ? n + 12 : 0, b]), type: 'sine', vol: 0.035 },
    { notes: bass([43, 43, 43, 43, 48, 43, 45, 50, 43, 43, 43, 43, 48, 43, 50, 43], [[0, 1], [7, 1], [0, 1], [7, 1]]), type: 'triangle', vol: 0.1 },
  ],
};

// "We Wish You a Merry Christmas" - wenn der Yeti sein Geschenk auspackt (einmal)
const WISH = {
  bpm: 200, once: true,
  voices: [
    { notes: [[62, 1], [67, 1], [67, .5], [69, .5], [67, .5], [66, .5], [64, 1], [64, 1], [64, 1], [69, 1], [69, .5], [71, .5], [69, .5], [67, .5], [66, 1], [62, 1], [62, 1], [71, 1], [71, .5], [72, .5], [71, .5], [69, .5], [67, 1], [64, 1], [62, .5], [62, .5], [64, 1], [69, 1], [66, 1], [67, 3]], type: 'triangle', vol: 0.12 },
    { notes: [[0, 1], [43, 3], [48, 3], [45, 3], [50, 3], [47, 3], [48, 3], [50, 3], [43, 3]], type: 'triangle', vol: 0.09 },
  ],
};

const SONGS = { deck: DECK, carol: CAROL, boss: BOSS, jingle: JINGLE, wish: WISH };

export function createMusic(audio) {
  let stops = [], cur = null;
  const halt = () => { stops.forEach(s => { try { s(); } catch {} }); stops = []; };
  return {
    play(name) {
      halt(); cur = name; const s = SONGS[name]; if (!s) return;
      for (const v of s.voices) stops.push(audio.melody(v.notes, { bpm: s.bpm, type: v.type, vol: v.vol, loop: !s.once }));
      if (s.once) cur = null;
    },
    stop() { halt(); cur = null; },
    pause() { halt(); },
    resume() { if (cur) this.play(cur); },
  };
}
