# Spec: Kalender

### Anforderung: Türchen-Sperre
- Türchen N ist ab dem N. Dezember 2026, 00:00 Uhr deutscher Zeit, spielbar. Danach bleibt es dauerhaft offen.
- Zukünftige Türchen sind gesperrt, auch per Direktlink. Ein Tipp auf ein gesperrtes Türchen zeigt, wie oft noch geschlafen werden muss.
- Die Zeit kommt vom Server (HTTP-Date-Header), damit das Verstellen der Geräte-Uhr nichts bringt.
- Vor dem 1. Dezember läuft ein Countdown. Ab dem 25. Dezember sind alle Türchen offen.

### Anforderung: Vorfreude
- Das heutige Türchen leuchtet, ungeöffnete freie Türchen wackeln und tragen ein "NEU!"-Band.
- Countdown bis zum nächsten Türchen auf der Startseite.
- Nach jedem Spiel erscheint ein geheimnisvoller Hinweis auf das nächste Türchen.
- Pro Türchen gibt es bis zu 3 Sterne, insgesamt 72. Geöffnete Türchen zeigen Emoji und Sterne.

### Anforderung: Spiel-Rahmen
- Jedes Türchen startet mit einer Karte: Titel, kurze Anleitung, "Los geht's!".
- Einheitliche Leiste: zurück, Anzeige (Punkte, Level ...), Pause, Ton an/aus.
- Ergebnis-Karte mit Sternen, Punkten, Rekord, "Nochmal" und "Zum Kalender".
- Pause automatisch, wenn der Tab in den Hintergrund geht.
