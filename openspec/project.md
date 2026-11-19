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
| `js/core/raetsel.js`, `js/core/schloss.js` | Knobel-Rätsel (Rechnen, Deutsch, Wissen) und Zahlenschloss vor neuen Türchen |
| `js/days.js` | Liste der 24 Türchen (Titel, Emoji, Teaser) |
| `days/NN/game.js` | Je ein Spiel pro Türchen, siehe `specs/spiel-vertrag.md` |
| `tools/smoke.mjs` | Automatischer Rauchtest aller Türchen (Desktop und Handy) |
| `tools/raetsel-test.mjs` | Prüft tausende erzeugte Rätsel auf gültige Lösungen und Texte |

## Eltern-Vorschau
`?vorschau=rentier` öffnet alle Türchen, `?vorschau=rentier&heute=5` simuliert den 5. Dezember.
