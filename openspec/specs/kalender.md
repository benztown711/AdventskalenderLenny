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

### Anforderung: Nachbesserungen aus dem Nutzertest
- Das heutige Türchen trägt ein goldenes "HEUTE"-Band, verpasste Türchen "NEU!". Ein Türchen gilt erst als gespielt, wenn ein Ergebnis oder Zwischenstand vorliegt.
- Die Meldung zu einem gesperrten Türchen bleibt rund 3 Sekunden sichtbar und ist vom Countdown getrennt.
- Verdiente Sterne gehen nie verloren: Spiele melden Zwischenstände, der Zurück-Pfeil zeigt dann die Ergebnis-Karte.
- Alle Karten-Knöpfe sind mit Enter und Leertaste bedienbar, Esc pausiert. Sichtbarer Fokusring.
- Die Start-Karte zeigt die Anleitung passend zum Gerät (Touch oder Tastatur) und eine Zeile "So gibt es Sterne".
- Ab dem 24. zeigt der Kalender eine Abschluss-Zeile mit dem Sternestand. Hinweis, dass Sterne nur auf diesem Gerät gespeichert sind.
- Bei "Bewegung reduzieren" entfallen Schnee, Wackeln und der größte Teil des Konfettis.

### Anforderung: Türöffner (siehe `specs/tueroeffner.md`)
- Neue Türchen müssen erst gefunden werden. Bei jedem Aufruf wird zufällig einer von fünf Türöffnern gewählt
  (Zugefrorene Türchen, Wichtel-Wirbel, Code-Schloss, Wimmel-Winterdorf, Nebel-Schatzkarte). Der Anspruch steigt im Dezember.
- Gefundene oder gespielte Türchen öffnen direkt. Wer ohne Tipp findet, bekommt einen Schlüssel 🗝️ (Zähler oben).
- Die Ergebnis-Karten von Tag 20 bis 23 zeigen den Geheimcode für das Schloss des nächsten Türchens.

### Anforderung: Knobel-Ecke
- Knopf "Knobel-Ecke" im Kalender-Kopf: freies Üben mit den Rätseln des Türöffners "Knobel-Schloss" (siehe `tueroeffner.md`).
- Stufe (Leicht, Mittel, Knifflig) und Fach (Mix, Rechnen, Deutsch, Wissen) frei wählbar, die Wahl bleibt gespeichert.
- Serie (richtig ohne Fehler und ohne Tipp 2) und Rekord. Kein Einfluss auf Türchen, Sterne oder Schlüssel.
