# Prompt für die Design-Exploration des Couple-Results

Diesen Text in eine **neue Claude-Unterhaltung** auf claude.ai einfügen (nicht in
Claude Code). Claude baut daraus fünf klickbare Artifacts.

Alles unterhalb der Linie ist der Prompt.

---

Ich baue RŌZU, einen bezahlten Skincare-Routine-Generator. Es gibt eine
Couple-Variante für $12: beide Partner machen einen Quiz mit 7 Fragen, danach
bekommt jeder eine eigene KI-generierte Routine, plus einen gemeinsamen
Bereich.

Dieser gemeinsame Bereich ist mein Problem. Er ist der Teil, der auf TikTok
geteilt werden soll, sieht aber aktuell aus wie eine Liste grauer Karten. Ich
möchte fünf verschiedene Gestaltungen sehen und mich dann für eine entscheiden.

**Deine Aufgabe:** Erstelle mir **fünf separate HTML-Artifacts**, eines pro
Option. Jedes soll klickbar und auf dem Handy anschaubar sein. Erkläre vor
jedem Artifact in zwei bis drei Sätzen die Idee dahinter und wofür sie gut ist.
Nummeriere sie klar als Option 1 bis 5, damit ich dir am Ende sagen kann
"Option 3, aber mit dem Header aus Option 1".

## Feste Vorgaben — die dürfen sich nicht ändern

- **Markenfarbe** `#7a1d4a` (Pflaume), **Tint** `#f7eef3`, **Hintergrund**
  `#f7f5f6`, **Karten** `#ffffff`, **Rahmen** `#eae5e8`, **gedämpfter Text**
  `#8b7f85`, **sehr gedämpft** `#a09298`, **Fließtext** `#111111`
- **Schrift:** ausschließlich Inter, Stärken 400 / 600 / 700 / 800
- **Keine Emoji. Nirgends, in keiner Sprache, unter keinen Umständen.** Alle
  Symbole müssen inline SVG sein, einfarbig, Strichstärke ca. 1.5–2, im Stil
  von Lucide oder Feather. Das ist eine harte Regel, keine Präferenz.
- Ansichtsbreite **390px** (iPhone). Alles muss auf dem Handy funktionieren.
- Ecken sind rund: Karten 14–18px, Buttons 12–14px
- Ton: ruhig, sachlich, nie marktschreierisch. Kein "Wow!", keine
  Ausrufezeichen.
- Sprache: **Englisch** (die App ist auf Englisch)

## Die Daten, die wirklich zur Verfügung stehen

Erfinde keine Felder dazu. Genau das ist vorhanden:

- Herkunft beider Partner, aus neun Optionen (z.B. `Southeast Asian`,
  `Black / African`, `Northern European`, `South Asian`, `Latin / Hispanic`,
  `Mixed heritage`)
- Hauttyp beider, aus fünf: `Dry`, `Oily`, `Combination`, `Normal`, `Sensitive`
- Ein **Kompatibilitätswert** zwischen 68 % und 97 %, plus ein Satz, der ihn
  erklärt (z.B. "You both deal with dark spots and dryness")
- **Gemeinsame Hautprobleme**, aus: Acne & breakouts, Dark spots, Redness &
  sensitivity, Dryness, Puffiness, Dullness / no glow, Fine lines, Body acne
- **Übereinstimmende Lifestyle-Antworten** — Schlaf (z.B. "After 1am or
  irregular"), Stress (Low / Moderate / High), Ernährung (z.B. "A lot of dairy
  or sugar")
- Pro Partner: ein **Schlüsselwirkstoff** (z.B. Niacinamide 5–10%, Vitamin C,
  Ceramides) und ein **SPF-Level** (SPF 30 oder SPF 50+)
- Pro Partner: eine Morgen- und eine Abendroutine mit je 3–4 Schritten
- Ein **Heritage-Insight**-Satz pro Partner

Wichtig: manche Paare haben **gar keine** Überschneidung. Jede Option muss auch
dann funktionieren und darf dann nicht leer wirken.

## Was jede Option leisten muss

1. Auf einen Blick zeigen, **was die beiden teilen** und **was nicht**
2. Den Kompatibilitätswert so zeigen, dass man ihn screenshotten will
3. Sich persönlich anfühlen — nicht wie ein Formular, das für jedes Paar gleich
   aussieht
4. Ehrlich bleiben: nichts behaupten, was die Daten nicht hergeben

## Die fünf Richtungen

Nimm diese als Ausgangspunkt, aber geh darüber hinaus, wenn du eine bessere
Idee hast — sag mir dann, was du geändert hast und warum:

1. **Karten, aber richtig.** Der jetzige Stil, nur mit echten Inhalten und einer
   klaren Trennung zwischen "das teilt ihr" und "das nicht".
2. **Teilbare Karte.** Oben eine hochformatige Karte im Markenton, gemacht zum
   Screenshotten für TikTok: beide Herkünfte, der Wert groß, ein
   personalisierter Satz, dezent RŌZU als Absender. Darunter die Details.
3. **Gemeinsames Abendritual.** Eine Zeitleiste des Abends — wo beide dasselbe
   tun, wo sich die Wege trennen, und was der eine Punkt ist, den sie zusammen
   ändern sollten.
4. **Gegenüberstellung.** Zwei Spalten, Seite an Seite, mit einer verbindenden
   Mittelachse für alles Gemeinsame. Zeigt Unterschiede und Gemeinsamkeiten
   gleichzeitig.
5. **Deine eigene Idee.** Was auch immer du für die stärkste Lösung hältst.
   Begründe sie.

## Für jedes Artifact

- Realistische Beispieldaten benutzen: **Southeast Asian × Black / African**,
  Combination vs Dry, beide mit Dark spots und Dryness, beide schlafen nach 1
  Uhr, 85 % Kompatibilität
- Alles selbstenthalten: CSS inline, SVGs inline, keine externen Dateien, keine
  CDN-Links
- Interaktive Teile (aufklappbare Karten, Tabs) sollen anklickbar sein
- **Zusätzlich** einen zweiten Zustand zeigen oder beschreiben: dasselbe Design
  mit einem Paar, das **nichts** gemeinsam hat

Zum Schluss: sag mir in wenigen Sätzen, welche der fünf du selbst wählen
würdest und warum.
