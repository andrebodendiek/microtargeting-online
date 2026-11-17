# bubbl – das Microtargeting-Labor

Ein Live-Unterrichtsspiel zur Frage **„Wie entsteht personalisierte Werbung?“** – als Online-Plattform im Look eines sozialen Netzwerks, mit großer **Beamer-Ansicht**, auf der alle den Fortschritt der Phasen und die Ergebnisse live sehen.

Grundlage ist das analoge *Microtargeting-Spiel* (Unterrichtsbeispiel von Anna Rebmann, WBM Informatik Kohorte III): Likes mit ID verteilen → Gruppen werten aus → Gruppen „posten“ passende Werbung → Reflexion. Die digitale Fassung übernimmt alle Original-Inhalte (Headlines, Kategorien, sieben Werbeanzeigen, Auswertungstabelle, Reflexionsfragen) und erweitert sie.

## Ablauf (9 Schritte)

| # | Schritt | Form | Beamer zeigt |
|---|---------|------|--------------|
| 1 | **Anmelden** – QR-Code scannen, Avatar wählen, Nutzer-ID merken | EA | QR-Code, Raumcode, Avatar-Wand |
| 2 | **Likes verteilen** – Feed mit den 22 Original-Beiträgen, max. 10 Likes | EA | Like-Fortschritt je ID, Trending-Beiträge |
| 3 | **Daten auswerten** – jede Gruppe zählt die Likes ihrer Kategorie aus (wie die Office-Tabelle) | GA | Live-Heatmap „Interessen-Datenbank“, Fehler nach Abgabe markiert |
| 4 | **Werbung platzieren** – Kategorien zuordnen, Zielgruppe mit begrenztem Budget wählen | GA | Graph: welche Anzeige erreicht wen |
| 5 | **Werbung erhalten** – Anzeigen im eigenen Feed bewerten (auch nicht erhaltene) | EA | Duell **Mensch vs. Algorithmus** (Trefferquote, Reichweite) |
| 6 | **Dein Datenprofil** – Enthüllung des heimlichen Trackings, Radar-Profil, „Vermutungen“ | EA | Likes vs. Datenpunkte, Likes vs. Tracking je Kategorie |
| 7 | **Filterblase** *(optional)* – Feed empfiehlt nach Interessen und wird enger | EA | Blasen-Karte: Avatare wandern zu „ihrem“ Thema |
| 8 | **Wahlwerbung** *(optional)* – fiktive Partei schickt jeder Interessengruppe eine andere Botschaft | EA | Aufdecken: widersprüchliche Versprechen nebeneinander |
| 9 | **Reflexion** – Meinung (1–5), Vor-/Nachteile | Plenum | Histogramm + anonyme Notizen (moderierbar) |

### Erweiterungen gegenüber dem Original
- **Heimliches Tracking:** Während des Likens misst die App unbemerkt Verweildauer je Beitrag, geöffnete Artikel, Lesezeit und Scrollstrecke. Der Beamer zeigt das erst ab Schritt 6.
- **Mensch vs. Algorithmus:** Parallel zu den Gruppen targetet ein Algorithmus dieselben Anzeigen mit Likes *und* Tracking-Daten.
- **Profil-Enthüllung:** Radar „nur Likes“ vs. „Likes + Tracking“, heimlich Gelesenes, abgeleitete Vermutungen (Alter, Kaufkraft, politische Haltung …), die die SuS als richtig/falsch markieren.
- **Filterblase** und **politisches Microtargeting** als zuschaltbare Bonusphasen.

## Bedienung
1. Startseite → **„Raum erstellen“**. Es öffnet sich das Lehrkraft-Cockpit (Link mit geheimem Schlüssel nach `#` – als Lesezeichen speichern).
2. **„Beamer öffnen“** → Fenster auf den Projektor ziehen, Doppelklick = Vollbild.
3. SuS scannen den QR-Code (oder öffnen die Startseite und geben den 4-stelligen Code ein).
4. Im Cockpit mit **„Weiter ▶“** durch die Schritte führen. Pro Schritt gibt es didaktische Hinweise und Werkzeuge (Gruppen neu bilden, Auswertung automatisch ausfüllen, Wahlbotschaften aufdecken, Notizen ausblenden …).
5. Am Ende **CSV-Export** (entspricht der erweiterten Auswertungstabelle).

Datenschutz: keine Namen, keine Accounts. SuS sind nur über Nummer und Tier-Avatar erkennbar. Räume werden 30 Tage nach der letzten Änderung gelöscht.

## Technik
- Node.js 22, Express, Socket.IO (Echtzeit), Preact + htm ohne Build-Schritt
- Persistenz: ein JSON-Dokument pro Raum in `DATA_DIR/rooms` (atomar geschrieben)
- Lokal starten: `npm install && npm start` → http://localhost:3000
- Tests: `npm test`
- Demo/Lasttest mit Bots: `node scripts/simulate.js http://localhost:3000 CODE 20` (Bots spielen jede Phase automatisch mit)

## Deployment mit CapRover
Das Repo enthält `captain-definition` und `Dockerfile`.

1. In CapRover eine App anlegen (z. B. `bubbl`), **„Has Persistent Data“ aktivieren**.
2. Unter *App Configs → Persistent Directories*: Pfad in der App **`/data`** → Label z. B. `bubbl-data`.
3. *HTTP Settings*: Container-Port **3000**, HTTPS aktivieren, **WebSocket Support** einschalten.
4. *Deployment*: Methode 3 (GitHub/Webhook) mit diesem Repo und Branch – danach deployt jeder Push automatisch.

Umgebungsvariablen (optional): `PORT` (Standard 3000), `DATA_DIR` (Standard `/data` im Container).

Hinweis: Eine Instanz reicht für viele Klassen gleichzeitig. Nicht auf mehrere Instanzen skalieren (Spielstand liegt im Prozess).
