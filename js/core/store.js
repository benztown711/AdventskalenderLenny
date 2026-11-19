// Speichert Fortschritt nur lokal im Browser (kein Login, keine Server-Daten).
const KEY = 'advent2026';
let state;
try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { state = {}; }
state.days = state.days || {};
function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
function day(n) { return (state.days[n] = state.days[n] || { opened: false, stars: 0, best: 0, data: {} }); }
export const store = {
  day,
  open(n) { day(n).opened = true; persist(); },
  played(n) { day(n).played = true; persist(); },
  isPlayed(n) { const d = day(n); return !!(d.played || d.stars || d.best); },
  result(n, stars, score) {
    const d = day(n);
    d.stars = Math.max(d.stars || 0, stars || 0);
    d.best = Math.max(d.best || 0, score || 0);
    if (stars > 0 || score > 0) d.played = true;
    persist();
  },
  load(n, key, fallback) { const v = day(n).data[key]; return v === undefined ? fallback : v; },
  save(n, key, value) { day(n).data[key] = value; persist(); },
  // Türöffner: Türchen gefunden (dann öffnet es künftig direkt), Schlüssel = ohne Hilfe gefunden
  found(n, key) { const d = day(n); d.found = true; if (key) d.key = true; persist(); },
  isFound(n) { return !!day(n).found; },
  totalKeys() { return Object.values(state.days).filter(d => d.key).length; },
  totalStars() { return Object.values(state.days).reduce((s, d) => s + (d.stars || 0), 0); },
  get muted() { return !!state.muted; },
  set muted(v) { state.muted = !!v; persist(); },
};
