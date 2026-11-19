# Spec: Spiel-Vertrag (für jedes Türchen)

Jedes Türchen liegt in `days/NN/` und darf NUR Dateien in diesem Ordner anlegen. Einstieg ist `days/NN/game.js`
(ES-Modul, kein Build, keine externen Dateien, keine Netzwerk-Zugriffe, keine Bibliotheken).
Referenz-Umsetzung: `days/02/game.js`. Rahmen-Code: `js/core/shell.js`, `js/core/input.js`, `js/core/audio.js`.

```js
// Anleitung je Gerät: höchstens zwei kurze Sätze, nur die Bedienung, die es auf dem Gerät gibt.
export const howto = { touch: 'Wische ... / Tippe ...', keys: 'Pfeiltasten ... Leertaste ...' };
// Eine Zeile, wofür es Sterne gibt. Steht auf der Start-Karte.
export const starsInfo = '★ ab Level 3 · ★★ ab Level 6 · ★★★ alle 8 Level';
export default {
  create(ctx) {            // wird bei jedem Start und bei "Nochmal" neu aufgerufen
    // ... Spiel aufbauen ...
    return { destroy() {} }; // eigene Extras aufräumen (Listener über ctx.on räumt der Rahmen selbst ab)
  },
};
```

## ctx
| API | Zweck |
|---|---|
| `ctx.makeCanvas(w, h)` → `{canvas, g, w, h, pos(evt)}` | Canvas mit fester Logik-Größe, wird automatisch eingepasst. In Logik-Koordinaten zeichnen. `pos(evt)` rechnet Zeiger-Events um. |
| `ctx.root` | Bühne (HTMLElement), falls DOM statt Canvas gewünscht |
| `ctx.loop(fn(dt, t))` | Spiel-Schleife, dt in Sekunden (max 0,05), pausiert automatisch |
| `ctx.on(target, type, fn, opts)` | Event-Listener, wird automatisch entfernt |
| `ctx.timeout(fn, ms)`, `ctx.interval(fn, ms)` | Timer, werden automatisch gelöscht |
| `ctx.input.down(name)` | Taste gehalten? Namen: `left right up down a b` (Pfeile/WASD, Leertaste/Enter = a, X/Shift = b) |
| `ctx.input.onPress(fn(name))`, `onRelease(fn(name))` | Tastendruck (auch Touch-Buttons) |
| `ctx.input.onSwipe(fn(dir))` | Wischen auf der Bühne: `left right up down` |
| `ctx.input.axis()` → `{x, y}` | Richtung -1..1 aus Stick oder Tasten |
| `ctx.input.pad({dpad: true/'lr'/false, stick: bool, a: 'Text', b: 'Text'})` | Touch-Buttons unter der Bühne (nur auf Touch-Geräten sichtbar) |
| `ctx.input.isTouch` | true auf Touch-Geräten |
| `ctx.hud.set({Punkte: 5, Level: 2})` | Anzeige oben (max 3 kurze Einträge) |
| `ctx.toast('Text')` | Kurze Einblendung, z. B. "Level 2!" |
| `ctx.audio.sfx(name)` | `click coin pop jump hit shoot boom power bad tick swoosh level win lose` |
| `ctx.audio.tone(freq, dauer, typ, lautstärke, slideTo, delay)`, `ctx.audio.melody([[midi, schläge], ...], {bpm, type, vol, loop})` → `stop()` | Eigene Töne und Musik |
| `ctx.fx.confetti()`, `ctx.fx.emojiBurst('⭐')`, `ctx.fx.shake()` | Effekte |
| `ctx.save(key, wert)`, `ctx.load(key, fallback)`, `ctx.best()` | Speicher pro Türchen (z. B. erreichtes Level), bisheriger Rekord |
| `ctx.paused`, `ctx.onPause(fn(paused))` | Pause-Status |
| `ctx.progress({stars, score, text})` | Zwischenstand melden, sobald Sterne verdient sind (z. B. nach jedem gelösten Level). Sterne werden sofort gesichert; der Zurück-Pfeil zeigt damit die Ergebnis-Karte statt den Fortschritt zu verwerfen. |
| `ctx.finish({won, stars, score, text})` | Spielende melden. Zeigt Ergebnis-Karte, speichert Sterne (0 bis 3) und Rekord. Sieg-Ton und Konfetti kommen vom Rahmen. |

## Pflichten
1. **Beide Steuerungen:** komplett spielbar mit Touch (Tippen, Ziehen, Wischen oder `pad`) und mit Tastatur/Maus. Zeiger immer über `pointer`-Events.
2. **Hochformat zuerst:** Logik-Größe so wählen, dass es auf einem Handy (ca. 390x600 Bühne) groß und gut bedienbar ist, z. B. 360x560. Tippflächen mindestens 40 Logik-Pixel.
3. **Sterne fair vergeben:** 1 Stern schafft ein 10-jähriges Kind beim zweiten oder dritten Versuch, 3 Sterne sind eine echte Herausforderung. Im `text` von `finish` sagen, was für mehr Sterne fehlt.
4. **Wiederspielwert:** mehrere Level oder steigende Schwierigkeit, zufällige Elemente. Bei Level-Spielen erreichtes Level mit `ctx.save` merken. Erzeugte Rätsel müssen garantiert lösbar sein.
5. **Saft:** Partikel, Wackeln, Töne, kleine Animationen bei jeder Aktion. Es soll sich knackig anfühlen. Erste Sekunden müssen sofort Spaß machen, keine langen Texte.
6. **Fair starten:** die ersten 2 Sekunden darf nichts Tödliches passieren, Anfang leicht.
7. **Stil:** dunkler Nachthimmel-Hintergrund (#0b1437), Akzente Gold #ffd166, Rot #ef476f, Grün #06d6a0, Eisblau #8ecae6, Violett #c77dff. Winter- und Weihnachts-Anstrich, wo es passt. Grafik per Canvas-Formen (Emoji nur sparsam, sie sehen je Gerät anders aus).
8. **Eigenständig:** keine Namen, Figuren, Level oder Optik bekannter Marken-Spiele. Kindgerecht: Schneebälle statt Waffen, niemand stirbt, Gegner "purzeln" oder "schmelzen".
9. **Sauber:** keine globalen Variablen, keine Listener an window ohne `ctx.on`, kein `requestAnimationFrame` außerhalb `ctx.loop`, kein `alert`. Texte auf Deutsch.
10. **Lesbar:** Text im Canvas auf dem Handy nie kleiner als 12 CSS-Pixel (bei 360 Logik-Pixeln Breite also mindestens 12 Logik-Pixel, bei breiterer Logik-Größe entsprechend mehr), wichtige Hinweise ab 14. Nie zwei Hinweistexte übereinander.
11. **Erste Minute:** Nach "Los geht's!" beginnt sofort das Spiel (keine zweite Hürde beim allerersten Start). Fehler in den ersten Zügen werfen niemanden raus. Jeder Fehlversuch sagt kurz, warum ("Da ist kein Platz").
12. **Test:** `node tools/smoke.mjs NN` muss für Desktop und Handy "ok" melden. Screenshots unter `tools/shots/` ansehen.
