# Spec: Türöffner (Türchen erst finden, dann spielen)

## Anforderungen
- Ein neues Türchen (freigeschaltet, noch nicht gespielt, noch nicht gefunden) startet nicht sofort. Erst erscheint ein
  Türöffner: ein kurzes Such- oder Knobelspiel (Ziel 15 bis 90 Sekunden), an dessen Ende das Türchen aufgeht.
- Bei jedem Aufruf wird zufällig einer von sechs Türöffnern gewählt: `frost`, `wirbel`, `schloss`, `dorf`, `karte`, `knobel`.
  Neu laden lost neu aus.
- Gefundene oder gespielte Türchen öffnen danach immer direkt. Auch Direktlinks auf neue Türchen führen erst zum Türöffner.
- Niemand bleibt hängen: gestufte Hilfe, spätestens nach etwa 60 Sekunden führt die Hilfe sicher zum Ziel.
  Ein Türöffner, der nicht lädt oder abstürzt, öffnet das Türchen direkt.
- Wer ohne Hilfe findet, bekommt einen Schlüssel 🗝️ (Zähler auf der Startseite). Die 72 Sterne bleiben unberührt.
- Der Anspruch steigt im Dezember (`ctx.level` 0 bis 1, `ctx.week` 1 bis 4). Zielgruppe 10 bis 12 Jahre.
- Woche 4 (Tag 21 bis 24): Die Ergebnis-Karte von Tag 20 bis 23 zeigt einen Geheimcode für das nächste Türchen.
  Das Code-Schloss fragt ihn ab, wenn der Vortag gespielt wurde (`ctx.secret.fromYesterday`), sonst Ersatzrätsel.
- Eltern-Vorschau: Knopf "überspringen" im Türöffner; `&tueroeffner=<id>` erzwingt einen bestimmten Türöffner.
  Das Vorschau-Passwort steht nur als Prüfsumme im Code (lokal gilt für Tests weiterhin `rentier`).

## Knobel-Schloss (`knobel`)
- Ein Rätsel auf Niveau Klasse 4 lösen, die Lösung als Zahl eintippen (Zahlenfeld oder Tastatur). Stufe und Fach wählt das Kind,
  Standard ist die Stufe passend zur Woche (Woche 1 Leicht, 2 und 3 Mittel, 4 Knifflig), danach die zuletzt gewählte.
  - Rechnen: Kopfrechnen, Bilder-Rätsel, Zahlenfolgen, Rechenmauern, Sachaufgaben.
  - Deutsch: Wortarten zählen, Groß- und Kleinschreibfehler zählen, Wörterschlange, Silben, ABC, Buchstaben zählen.
  - Wissen: Allgemeinwissen mit Zahlen-Antwort, auch kombiniert mit Rechnen.
- Tipp 1 ist frei, Tipp 2 und der Lösungsweg kosten den Schlüssel. "Anderes Rätsel" tauscht jederzeit.
- Rätsel kommen aus `js/opener/raetsel.js` (Vorlagen, garantiert lösbar), Oberfläche aus `js/opener/knobel-panel.js`
  (auch für die Knobel-Ecke). Prüfung: `node tools/raetsel-test.mjs` (mit `--zeigen` für Beispiele).

## Vertrag für `js/opener/<id>.js`
ES-Modul ohne Imports aus anderen Ordnern, keine externen Dateien, keine Bibliotheken.
```js
export const meta = { id: 'frost', title: 'Zugefrorene Türchen', emoji: '❄️' };
export function mount(root, ctx) {   // root: leeres div.op-root (100 % breit, max. 440px, zentriert, scrollt senkrecht)
  // ... aufbauen ...
  return { destroy() {} };          // eigene Extras aufräumen (ctx.on/timeout/interval/loop räumt der Rahmen ab)
}
```
| ctx | Bedeutung |
|---|---|
| `day` | gesuchtes Türchen 1 bis 24 |
| `week` | 1 (Tag 1-6), 2 (7-13), 3 (14-20), 4 (21-24) |
| `level` | 0 (1. Dez) bis 1 (24. Dez), für Schwierigkeit |
| `played` | Liste schon gespielter Türchen (ohne `day`) |
| `reduced` | Bewegung reduzieren aktiv |
| `isTouch` | Touch-Gerät |
| `secret` | `{ code: '47', fromYesterday: bool }` für das Code-Schloss |
| `audio.sfx(name)` | `click coin pop jump hit power bad tick swoosh level win` |
| `fx.confetti(n)` | Konfetti über der ganzen Seite |
| `on(target, type, fn)`, `timeout(fn, ms)`, `interval(fn, ms)`, `loop(fn(dt, t))` | werden automatisch aufgeräumt |
| `hintUsed()` | aufrufen, sobald eine Hilfe die Lösung eingrenzt (Tipp-Knopf, automatische Ortshilfe). Kostet den Schlüssel. |
| `success()` | genau einmal aufrufen, nachdem die eigene Öffnungs-Animation (max. 0,9 s) gelaufen ist. Der Rahmen zeigt dann "Türchen N ist offen!" und startet das Spiel. |

## Gestaltung
- Kopfleiste (Zurück, "Finde Türchen N", Ton) baut der Rahmen. Der Türöffner liefert: kurze Aufgabenzeile mit der
  Zielzahl, Spielfläche, Statuszeile für Rückmeldungen, Tipp-Knopf mit Stufen.
- Styles einmal als `<style id="op-style-<id>">` anhängen, alle Selektoren mit `.op-<id>` präfixen. Farben und Schrift
  über die Variablen aus `css/style.css` (`--night --night2 --ink --dim --gold --red --green --ice --violet --panel --line --font`).
- Touch und Maus (Pointer-Events), Tipp-Ziele mind. 40px, mit Tastatur bedienbar, `ctx.reduced` respektieren.
  Kein horizontales Überlaufen bei 340px Breite; auf Handy quer (ca. 390px hoch) darf senkrecht gescrollt werden.
- Deutsch, du-Form, kurz, ohne lange Gedankenstriche, keine Strafe und keinen Zeitdruck mit Verlust.

## Prüfen
`node tools/opener-check.mjs <id> [tage ...]` startet den Kalender in der Vorschau, öffnet den Türöffner für die
Tage (Standard 1 7 14 21 24, Desktop und Handy), prüft Fehler, leere Fläche, Überlaufen und den Erfolgsweg.
Screenshots: `tools/shots/op-<id>-NN.png` und `-m.png`.
