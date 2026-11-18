// Türchen-Logik: Tag N öffnet am N. Dezember 2026 (deutsche Zeit).
// Die Uhrzeit kommt vom Server (Date-Header), damit Uhr-Verstellen nicht hilft.
export const YEAR = 2026;
const PREVIEW_CODE = 'rentier'; // Eltern-Vorschau: ?vorschau=rentier (optional &heute=5)
let offset = 0;
let preview = null;

const params = new URLSearchParams(location.search);
if (params.get('vorschau') === PREVIEW_CODE) {
  preview = Math.min(24, Math.max(0, parseInt(params.get('heute') ?? '24', 10) || 0));
  try { sessionStorage.setItem('adv-preview', String(preview)); } catch {}
} else {
  try { const p = sessionStorage.getItem('adv-preview'); if (p !== null) preview = +p; } catch {}
}

export async function syncTime() {
  try {
    const r = await fetch(location.pathname + '?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
    const d = r.headers.get('date');
    if (d) offset = new Date(d).getTime() - Date.now();
  } catch {}
}
export function now() { return new Date(Date.now() + offset); }

function berlin(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(date).map(x => [x.type, parseInt(x.value, 10)]));
  return p;
}
export function isPreview() { return preview !== null; }
// Höchstes Türchen, das schon offen sein darf (0 = noch keins)
export function unlockedDay() {
  if (preview !== null) return preview;
  const b = berlin(now());
  if (b.year > YEAR) return 24;
  if (b.year < YEAR || b.month < 12) return 0;
  return Math.min(24, b.day);
}
// Sekunden bis zum nächsten Türchen (Mitternacht deutscher Zeit) oder bis zum 1.12.
export function secondsToNext() {
  const u = unlockedDay();
  if (u >= 24 || preview !== null) return null;
  const b = berlin(now());
  const toMidnight = 86400 - ((b.hour % 24) * 3600 + b.minute * 60 + b.second);
  if (u >= 1) return toMidnight;
  if (b.year < YEAR || b.month < 12) {
    const today = Date.UTC(b.year, b.month - 1, b.day);
    const days = Math.round((Date.UTC(YEAR, 11, 1) - today) / 86400000);
    return (days - 1) * 86400 + toMidnight;
  }
  return null;
}
