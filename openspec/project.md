# Adventskalender 2026 – Projekt

## Ziel
Ein öffentlicher Online-Adventskalender für Kinder von 10 bis 12 Jahren. Jeden Tag vom 1. bis 24. Dezember
öffnet sich ein neues Türchen mit einem eigenständigen Spiel oder Effekt. Jedes Türchen soll überraschen
und Vorfreude auf das nächste wecken.

## Leitplanken
- Kostenlos: reine statische Seite (HTML, CSS, JavaScript-Module), kein Build-Schritt, kein Server, kein Login.
- Keine personenbezogenen Daten, keine Namen, kein Tracking, keine externen Dateien oder Schriften.
- Fortschritt (Sterne, Rekorde) liegt nur im Browser des Kindes (localStorage).
- Jedes Spiel läuft mit Touch (Handy, Tablet) und mit Tastatur/Maus.
- Alle Spiele sind Eigenentwicklungen: keine Namen, Figuren, Grafiken oder Level bekannter Marken-Spiele.
- Sprache: Deutsch, freundlich, kindgerecht, keine Gewalt gegen Menschen (Schneebälle statt Waffen).
- Hosting: GitHub Pages über `.github/workflows/pages.yml`.

## Aufbau
| Pfad | Inhalt |
|---|---|
| `index.html`, `css/style.css`, `js/app.js` | Kalender-Ansicht mit 24 Türchen |
| `js/core/` | Zeitsperre, Speicher, Ton, Steuerung, Effekte, Spiel-Rahmen |
| `js/days.js` | Liste der 24 Türchen (Titel, Emoji, Teaser) |
| `js/opener/` | Türöffner: neue Türchen erst finden, siehe `specs/tueroeffner.md` |
| `days/NN/game.js` | Je ein Spiel pro Türchen, siehe `specs/spiel-vertrag.md` |
| `tools/smoke.mjs` | Automatischer Rauchtest aller Türchen (Desktop und Handy) |

## Eltern-Vorschau
`?vorschau=<Passwort>` öffnet alle Türchen, `&heute=5` simuliert den 5. Dezember, `&tueroeffner=karte` erzwingt einen Türöffner.
Das Passwort kennt nur der Kalender-Besitzer; im Code steht nur seine Prüfsumme. Lokal (localhost) gilt für Tests `rentier`.
