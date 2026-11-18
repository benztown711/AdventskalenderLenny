// Alle Töne werden live erzeugt (WebAudio) - keine Sounddateien nötig.
import { store } from './store.js';
let ac = null, master = null;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

function tone(freq, dur = 0.15, type = 'square', vol = 0.2, slideTo = null, delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur = 0.2, vol = 0.2, delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ac.createBufferSource(), g = ac.createGain();
  s.buffer = buf; g.gain.value = vol; s.connect(g).connect(master); s.start(t);
}
const SFX = {
  click: () => tone(660, 0.05, 'square', 0.12),
  coin: () => { tone(988, 0.07, 'square', 0.15); tone(1319, 0.18, 'square', 0.15, null, 0.07); },
  pop: () => tone(520, 0.09, 'sine', 0.25, 900),
  jump: () => tone(300, 0.16, 'square', 0.14, 700),
  hit: () => { noise(0.12, 0.25); tone(160, 0.12, 'sawtooth', 0.2, 60); },
  shoot: () => tone(880, 0.12, 'sawtooth', 0.12, 180),
  boom: () => { noise(0.45, 0.35); tone(110, 0.4, 'sawtooth', 0.25, 30); },
  power: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.1, 'triangle', 0.2, null, i * 0.06)),
  bad: () => tone(220, 0.25, 'sawtooth', 0.18, 110),
  tick: () => tone(1200, 0.03, 'square', 0.08),
  swoosh: () => noise(0.18, 0.12),
  level: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, 'square', 0.16, null, i * 0.09)),
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.22, null, i * 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.2, null, i * 0.18)),
};
export const audio = {
  midi, tone, noise,
  unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC(); master = ac.createGain();
      master.gain.value = store.muted ? 0 : 0.6; master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
  },
  sfx(name) { (SFX[name] || SFX.click)(); },
  // notes: [[midiNote oder 0 für Pause, Schläge], ...] -> gibt stop() zurück
  melody(notes, { bpm = 140, type = 'square', vol = 0.1, loop = false } = {}) {
    let stopped = false, timer = null;
    const beat = 60 / bpm;
    const play = () => {
      if (stopped || !ac) return;
      let t = 0;
      for (const [n, b] of notes) { if (n) tone(midi(n), b * beat * 0.9, type, vol, null, t); t += b * beat; }
      if (loop) timer = setTimeout(play, t * 1000);
    };
    play();
    return () => { stopped = true; clearTimeout(timer); };
  },
  get muted() { return store.muted; },
  setMuted(m) { store.muted = m; if (master) master.gain.value = m ? 0 : 0.6; },
};
