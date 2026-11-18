# bubbl – das Microtargeting-Labor

Ein Live-Unterrichtsspiel zur Frage **„Wie entsteht personalisierte Werbung?“** – als Online-Plattform im Look eines sozialen Netzwerks, mit großer **Beamer-Ansicht**, auf der alle den Fortschritt der Phasen und die Ergebnisse live sehen.

Grundlage ist das analoge *Microtargeting-Spiel* (Unterrichtsbeispiel von Anna Rebmann, WBM Informatik Kohorte III): Likes mit ID verteilen → Gruppen werten aus → Gruppen „posten“ passende Werbung → Reflexion. Die digitale Fassung übernimmt alle Original-Inhalte (Headlines, Kategorien, sieben Werbeanzeigen, Auswertungstabelle, Reflexionsfragen) und erweitert sie.

## Ablauf (bis zu 13 Schritte)

| # | Schritt | Form | Beamer zeigt |
|---|---------|------|--------------|
| 1 | **Anmelden** – QR-Code scannen, Konto mit ausgedachter Adresse @bubbl.mail anlegen (AGB mit versteckten Klauseln, vorausgewähltes Newsletter-Häkchen), Profilbild im Avatar-Baukasten bauen | EA | QR-Code, Raumcode, Avatar-Wand |
| 2 | **Likes verteilen** – Feed mit den Original-Beiträgen, max. 10 Likes | EA | Like-Fortschritt je ID, Trending-Beiträge |
| 3 | **Daten auswerten** – jede Gruppe zählt die Likes ihrer Kategorie aus | GA | Live-Heatmap „Interessen-Datenbank“, Fehler markiert |
| 4 | **Werbung platzieren** – Kategorien zuordnen, Zielgruppe mit Budget wählen | GA | Graph: welche Anzeige erreicht wen |
| 5 | **Werbung erhalten** – Anzeigen bewerten (auch nicht erhaltene) | EA | Duell **Mensch vs. Algorithmus** |
| 6 | **Algorithmus-Werkbank** *(optional)* – Gruppen gewichten Likes und Tracking-Signale per Schieberegler, sehen Pseudocode, Trefferquote, Reichweite, F1 und Wahrheitsmatrix; danach „Testdaten aufdecken“ | GA | Bestenliste der Algorithmen, Training vs. Test (Overfitting), Fachbegriffe |
| 7 | **Dein Datenprofil** – Tracking-Enthüllung, Radar-Profil, Vermutungen, **Tracking-Inspektor** (echte JSON-Anfragen des eigenen Handys), **DSGVO-Auskunft nach Art. 15** (Download als JSON) | EA | Likes vs. Datenpunkte |
| 8 | **Fairness-Check** *(optional)* – ein Angebot für alle (Ausbildungsplatz) wird klick-optimiert nach einem Proxy-Merkmal ausgespielt; „Fairness-Regel“ zum Vergleich | EA | Matrix erreicht/ausgeschlossen/Streuverlust, Verteilung nach Interessengruppen, Abstimmung |
| 9 | **Filterblase** *(optional)* | EA | Blasen-Karte |
| 10 | **Shorts-Feed** *(optional)* – simulierter Kurzvideo-Feed mit Autoplay, Wischen und Werbung jeder 5. Clip; lernt nur aus der Wiedergabezeit; danach „Shorts stoppen & aufdecken“ mit persönlichem Protokoll | EA | Clips, gemeinsame Zeit, Werbeclips, Verengung des Feeds, „Die Tricks hinter Shorts“ |
| 11 | **Wahlwerbung** *(optional)* | EA | widersprüchliche Versprechen |
| 12 | **Reflexion** | Plenum | Histogramm + anonyme Notizen |
| 13 | **Live-Quiz** *(optional)* – 20 s je Frage, Punkte für Tempo | EA | Frage, Antwortverteilung, Erklärung, Bestenliste, Siegerpodest |

**Innehalten:** In fast jedem Schritt kann die Lehrkraft im Cockpit eine kurze Reflexionsfrage starten (z. B. „Hast du gemerkt, welche Beiträge bezahlte Werbung waren?“, „Schätze: Wie lange warst du im Shorts-Feed?“). Sie erscheint auf allen Handys und groß auf dem Beamer; die Antworten laufen live ein, „Auflösen“ zeigt Verteilung und eine Erkenntnis – beim Shorts-Feed zusätzlich Schätzung vs. tatsächlich gemessene Zeit.

Fachdidaktischer Fokus: Neben der gesellschaftlichen Perspektive (Manipulation, Filterblase, Fairness) wird die technische Seite sichtbar – Datenformate (JSON), Client-Server-Kommunikation, gewichtete Bewertungsfunktionen, Bewertung von Klassifikatoren (Präzision, Recall, F1, Wahrheitsmatrix), Trainings- und Testdaten, Overfitting, Proxy-Merkmale, Rechte nach DSGVO.

## Realistische Beiträge (Stand November 2026)
Der Feed sieht aus wie ein echtes Netzwerk: Nachrichtenkonten posten Artikel mit Vorschaukarte und Domain, Creator posten Fotos und Clips (mit Videolänge), teils als **„Bezahlte Partnerschaft“ mit Rabattcode** (Schleichwerbung erkennen!). Jeder Beitrag hat Reichweite (Likes, Kommentare, Shares), Hashtags und einen Top-Kommentar. Die Themen greifen das aktuelle Geschehen auf: Black Friday, EU-Gebühr auf Temu-/Shein-Pakete, Weltklimakonferenz COP31 in Antalya, Handball-Heim-WM 2027, Release von GTA VI (ab 18), Debatte um eine Social-Media-Altersgrenze, Zuckersteuer, Weihnachtsmärkte, Kraniche und Kegelrobben an der Küste u. v. m. Alle Konten, Personen und Marken sind fiktiv. Bereits gespeicherte Inhalte werden beim ersten Start einmalig aktualisiert (nur unveränderte alte Standardbeiträge, eigene bleiben erhalten).

## Inhalts-Editor mit KI-Assistent

Unter **/editor** (Lehrkraft-Anmeldung nötig) lassen sich alle Inhalte bearbeiten: Beiträge, Werbeanzeigen (inkl. Lösung und Trainings-/Test-Reihenfolge), Wahlbotschaften, Quizfragen und das Fairness-Szenario. Jede Speicherung wird geprüft und im Verlauf versioniert (Wiederherstellen jederzeit möglich). Neue Räume übernehmen den aktuellen Stand; ein bestehender Raum kann ihn in der Lobby über „Neueste Inhalte übernehmen“ laden.

**KI-Assistent** (Claude, Modell `claude-opus-5-5`, mit Websuche):
- **Aktualitäts-Check**: findet veraltete Inhalte und schlägt aktuelle Themen vor.
- **Thema vorgeben**: z. B. „Fußball-WM und Klimaschutz in Ostfriesland“ – erzeugt passende Beiträge, Anzeigen, Wahlbotschaften und Quizfragen.
- Vorschläge erscheinen als Liste (neu / ersetzt / entfernen, mit Begründung und Vorschau) und werden einzeln oder gesammelt **übernommen** – nichts geht ohne Zustimmung live. Jeder Vorschlag wird serverseitig geprüft; ungültige werden verworfen.
- **Automatisierung**: wöchentlicher oder monatlicher Aktualitäts-Check im Hintergrund, optional mit automatischer Übernahme (rückgängig machbar im Verlauf).
- Begrenzung: höchstens 40 KI-Anfragen pro Tag, immer nur eine gleichzeitig. Bei einer Ablehnung durch das Modell greift automatisch ein Ersatzmodell (`fallbacks: "default"`).

## Bedienung
1. Startseite → mit dem **Lehrkraft-Passwort anmelden** → **„Raum erstellen“**. Es öffnet sich das Lehrkraft-Cockpit (Link mit geheimem Schlüssel nach `#` – als Lesezeichen speichern).
2. **„Beamer öffnen“** → Fenster auf den Projektor ziehen, Doppelklick = Vollbild.
3. SuS scannen den QR-Code (oder öffnen die Startseite und geben den 4-stelligen Code ein).
4. Im Cockpit mit **„Weiter“** durch die Schritte führen. Pro Schritt gibt es **Hinweise zur Durchführung** (Ziel, Dauer, Sozialform, Ablauf mit den passenden Knöpfen, Impulsfragen, Tipps & Stolpersteine, Sicherung/Merksatz) und Werkzeuge (Gruppen neu bilden, Auswertung automatisch ausfüllen, Wahlbotschaften aufdecken, Notizen ausblenden …).
5. Am Ende **CSV-Export** (entspricht der erweiterten Auswertungstabelle).

**Zugriffsschutz:** Raum erstellen, Lehrkraft-Cockpit, Beamer-Ansicht und CSV-Export erfordern die Anmeldung mit dem Lehrkraft-Passwort (`TEACHER_PASSWORD`). Die Anmeldung gilt 30 Tage pro Browser (signiertes HttpOnly-Cookie) und wird bei einer Passwortänderung für alle ungültig. Zusätzlich braucht jeder Raum seinen geheimen Schlüssel aus dem Cockpit-Link. Fehlversuche werden gebremst. SchülerInnen treten weiterhin ohne Anmeldung nur mit dem Raumcode bei.

Datenschutz: keine echten Namen und keine echten E-Mail-Adressen. SuS melden sich mit einer ausgedachten Adresse `name@bubbl.mail` an (es werden keine Mails verschickt), bauen ein Profilbild im Avatar-Baukasten und sind sonst nur über ihre Nummer erkennbar. Räume werden 30 Tage nach der letzten Änderung gelöscht.

## Fotos
- Alle Beiträge und Anzeigen haben echte Fotos aus freien Quellen über **Openverse** (nur CC0, Public Domain oder CC BY), von Hand auf Schuleignung geprüft (keine Prominenten, Marken im Vordergrund oder freizügigen Motive).
- Die Fotos liegen auf dem eigenen Server (WebP 960×600, ohne Metadaten) – Schülergeräte laden nichts von Dritten.
- **Bildnachweise** unter `/bildnachweise` (verlinkt auf Startseite und im Profilmenü); im Artikel und unter Anzeigen steht die Quelle.
- **Editor:** pro Beitrag/Anzeige „Foto suchen“ (Openverse, Vorschaubilder über den eigenen Server), „Hochladen“ (Ziehen & Ablegen, automatisch zugeschnitten) oder „Entfernen“ (dann Ersatzgrafik). Eigene Uploads liegen in `DATA_DIR/media`.
- **KI-Assistent:** Vorschläge enthalten einen Bild-Suchbegriff; beim Übernehmen wird automatisch ein passendes Foto geholt.
- Startbilder neu laden/austauschen: `node scripts/fetch-images.mjs` (Suchbegriffe im Skript; `id=@<openverse-id>` übernimmt ein bestimmtes Foto).

## Technik
- Node.js 22, Express, Socket.IO (Echtzeit), Preact + htm ohne Build-Schritt
- Layout: **Bootstrap 5.3 + Bootstrap Icons** (lokal ausgeliefert, kein CDN), gestaltet nach der Design-Sprache von GrandNode (Petrol `#0C5D6A`, Türkis `#1FB0C7`) – es wird kein GrandNode-Code (GPL) verwendet
- Schutzmaßnahmen: ein Raum pro Verbindung, Bremsen für Login (pro IP und global), Beitritte, Raumcode-Suche und Auskunft; IDs und Schlüssel werden strikt geprüft (keine Prototyp-Schlüssel), fehlerhafte Inhaltspakete fallen auf den Standard zurück, Fehler in einzelnen Ansichten bringen den Server nicht zum Absturz
- Persistenz: ein JSON-Dokument pro Raum in `DATA_DIR/rooms` (atomar geschrieben), Mediathek in `DATA_DIR/media`
- Bildverarbeitung: `sharp` (WebP, Zuschnitt, Metadaten entfernen); der Server braucht ausgehenden Zugriff auf `api.openverse.org` für Fotosuche und KI-Fotos
- Lokal starten: `npm install && TEACHER_PASSWORD=test npm start` → http://localhost:3000
- Tests: `npm test`
- Demo/Lasttest mit Bots: `node scripts/simulate.js http://localhost:3000 CODE 20` (Bots spielen jede Phase automatisch mit)

## Deployment mit CapRover
Das Repo enthält `captain-definition` und `Dockerfile`.

1. In CapRover eine App anlegen (z. B. `bubbl`), **„Has Persistent Data“ aktivieren**.
2. Unter *App Configs → Persistent Directories*: Pfad in der App **`/data`** → Label z. B. `bubbl-data`.
3. *HTTP Settings*: Container-Port **3000**, HTTPS aktivieren, **WebSocket Support** einschalten.
4. *Deployment*: Methode 3 (GitHub/Webhook) mit diesem Repo und Branch – danach deployt jeder Push automatisch.

5. *App Configs → Environmental Variables*: **`TEACHER_PASSWORD`** = euer Lehrkraft-Passwort (**Pflicht** – ohne diese Variable ist der Lehrkraft-Bereich gesperrt) und **`ANTHROPIC_API_KEY`** = API-Schlüssel von console.anthropic.com (optional, nur für den KI-Assistenten). Danach „Save & Update“.

Weitere Umgebungsvariablen (optional): `SESSION_SECRET` (zusätzlicher Geheimwert für die Anmelde-Cookies), `TRUST_PROXY` (Anzahl vorgeschalteter Proxys, Standard 1 = CapRover/nginx; wichtig für korrekte Login-Bremsen), `PORT` (Standard 3000), `DATA_DIR` (Standard `/data` im Container).

Lokal: `TEACHER_PASSWORD=test npm start`.

Hinweis: Eine Instanz reicht für viele Klassen gleichzeitig. Nicht auf mehrere Instanzen skalieren (Spielstand liegt im Prozess).

## bubbl-Postfach
Jede Person hat ein simuliertes Postfach (Briefumschlag oben rechts). Je nach Spielphase kommen personalisierte Mails: Willkommen, „Das wird dir gefallen“ (aus den Likes), Rabatt-Mails zu den erhaltenen Anzeigen (nur mit Newsletter-Häkchen), Wochenrückblick aus den Tracking-Daten, Wahlwerbung und „Wir vermissen dich“. Jede Mail erklärt, *warum* sie ankommt; abbestellen ist möglich. Im Schritt „Dein Datenprofil“ wird aufgelöst, ob die AGB gelesen und das Häkchen bemerkt wurde (Beamer: Klassenstatistik, Stichwort Dark Pattern / EuGH Planet49).
