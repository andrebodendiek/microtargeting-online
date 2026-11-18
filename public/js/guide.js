// Ausführungshinweise für die Lehrkraft – je Schritt: Ziel, Dauer, Ablauf, Impulse, Stolpersteine, Sicherung.
// Button-Namen in „…“ entsprechen den Knöpfen im Cockpit.
export const GUIDE = {
  lobby: {
    dauer: '5 Min.', sozial: 'Einzelarbeit',
    ziel: 'Alle sind mit einem ausgedachten Konto im Raum – ohne echte Namen oder echte E-Mail-Adressen.',
    ablauf: [
      '„Beamer öffnen“ klicken, Fenster auf den Projektor ziehen, Doppelklick für Vollbild.',
      'SuS scannen den QR-Code oder geben den Raumcode auf der Startseite ein.',
      'Anmeldung in 3 Schritten: Adresse ausdenken (z. B. luna.star), Profilbild bauen, Zustimmung geben.',
      'Warten, bis die Zahl der Angemeldeten stimmt (Kopfzeile „online“), dann „Weiter“.',
    ],
    impulse: [
      'Bewusst nichts zu den AGB oder zum Newsletter-Häkchen sagen – beides wird im Schritt „Dein Datenprofil“ aufgelöst.',
      'Hinweis an die Klasse: „Denkt euch eine Adresse aus, nicht euren echten Namen.“',
    ],
    tipps: [
      'Wer die Seite neu lädt oder das Handy sperrt, landet automatisch wieder im eigenen Profil (gleiches Gerät, gleicher Browser).',
      'Adresse „schon vergeben“? Einfach eine Ziffer anhängen lassen.',
      'Zu spät Kommende können jederzeit beitreten – sie steigen im aktuellen Schritt ein.',
      'Falsche Person im Raum: in der Teilnehmerliste über „⋮“ entfernen.',
    ],
    sicherung: 'Noch keine – die Anmeldung wird später selbst zum Lerngegenstand (Einwilligung, Dark Patterns).',
  },
  feed: {
    dauer: '5–7 Min.', sozial: 'Einzelarbeit',
    ziel: 'Alle verteilen ehrlich Likes – die Datengrundlage für alle weiteren Schritte entsteht.',
    ablauf: [
      'SuS scrollen durch den Feed und liken nur, was sie wirklich interessiert (höchstens so viele Likes wie eingestellt).',
      'Artikel dürfen geöffnet und gelesen werden – ausdrücklich erwünscht.',
      'Fortschrittsbalken beobachten; wenn die meisten fertig sind, „Weiter“.',
    ],
    impulse: [
      'Nicht verraten, dass bubbl ab jetzt heimlich Verweildauer, geöffnete Artikel und Scrollen misst.',
      'Ruhig sagen: „Verhaltet euch so, wie ihr es in einer echten App tun würdet.“',
    ],
    tipps: [
      'Like-Limit und weitere Optionen unter „Einstellungen“.',
      'Wer schnell fertig ist, darf weiterlesen – das erzeugt besonders viele Tracking-Daten (gut für die Aufdeckung).',
      'Beiträge mit „Bezahlte Partnerschaft“ sind Absicht: Merkt es jemand? (Später besprechen.)',
    ],
    sicherung: 'Keine – Ergebnisse werden im nächsten Schritt sichtbar.',
  },
  auswertung: {
    dauer: '5 Min.', sozial: 'Plenum',
    ziel: 'Verstehen, dass aus jedem Klick automatisch ein Datensatz wird: wer (ID) – was (Beitrag) – Kategorie.',
    ablauf: [
      'Blick auf den Beamer: links laufen die Rohdaten ein, rechts entsteht die Tabelle „Likes je Person und Kategorie“.',
      'Auf dem Handy sieht jede/r die eigene Zeile der Datenbank.',
      'Bei Bedarf „Entstehung erneut abspielen“.',
      'Impulsfragen (unten) im Plenum besprechen, dann „Weiter“ – die Gruppen werden automatisch gebildet.',
    ],
    impulse: [
      'Was weiß bubbl jetzt über jede/n von euch?',
      'Wer sollte Werbung für Laufschuhe bekommen – und wer nicht? Woran erkennt ihr das?',
      'Was fehlt in der Tabelle? (Alles, was ihr nicht geliked habt – Vorgriff auf Tracking.)',
      'Fachbegriffe: Datensatz, Attribut, Tabelle/Datenbank, Aggregation (Zählen je Kategorie).',
    ],
    tipps: [
      'Im Originalspiel füllten die Gruppen diese Tabelle von Hand – hier passiert es automatisch. Das kann man als Vergleich nennen: „So schnell rechnet eine Plattform.“',
      'Wenige Likes im Raum? Dann ist die Tabelle dünn – das ist selbst ein Gesprächsanlass (Datenmenge ↔ Aussagekraft).',
    ],
    sicherung: 'Merksatz: Jede Interaktion wird als Datensatz gespeichert und automatisch zu einem Interessenprofil zusammengefasst.',
  },
  werbung: {
    dauer: '8–10 Min.', sozial: 'Gruppenarbeit',
    ziel: 'Die Gruppen betreiben selbst Microtargeting: passende Zielgruppe für ihre Anzeige wählen – mit begrenztem Budget.',
    ablauf: [
      'Gruppen kurz zusammensetzen lassen (Gruppe steht oben auf dem Handy).',
      'Jede Gruppe ordnet ihrer Anzeige Kategorien zu und wählt mithilfe der Datenbank die IDs aus, die die Anzeige sehen sollen.',
      'Budget beachten: Nicht alle können erreicht werden – Auswahl begründen.',
      'Wenn alle Gruppen fertig sind (Fortschritt), „Weiter“.',
    ],
    impulse: [
      'Nach welchen Kriterien habt ihr ausgewählt? Wen habt ihr bewusst weggelassen?',
      'Was wäre, wenn das Budget doppelt so groß wäre?',
      'Hinweis: Parallel schaltet der bubbl-Algorithmus dieselben Anzeigen – mit Likes UND Tracking-Daten.',
    ],
    tipps: [
      'Gruppe hängt? „Restliche Anzeigen automatisch schalten“ füllt fehlende Anzeigen nach der Datenbank.',
      'Unpassende Gruppen (z. B. Fehlende)? „Gruppen neu bilden“ – bisherige Eingaben gehen dabei verloren.',
      'Einzelne Personen lassen sich in der Teilnehmerliste einer anderen Gruppe zuordnen.',
    ],
    sicherung: 'Begriff Microtargeting: Werbung gezielt an kleine, nach Daten ausgewählte Gruppen ausspielen.',
  },
  empfang: {
    dauer: '5 Min.', sozial: 'Einzelarbeit',
    ziel: 'Prüfen, ob das Targeting „getroffen“ hat – Mensch gegen Algorithmus.',
    ablauf: [
      'SuS sehen die Anzeigen, die sie bekommen haben, und bewerten jede: passt zu mir / passt nicht.',
      'Danach auch die Anzeigen bewerten, die sie NICHT bekommen haben (wichtig für die Reichweite).',
      'Gleichzeitig kommen personalisierte Werbe-Mails ins bubbl-Postfach (Briefumschlag oben rechts).',
      'Beamer zeigt das Duell: Trefferquote und Reichweite von Gruppen vs. Algorithmus. Dann „Weiter“.',
    ],
    impulse: [
      'Warum ist der Algorithmus (meist) besser? Welche Daten hatte er zusätzlich?',
      'Was ist wichtiger: Trefferquote (Präzision) oder Reichweite (Recall)? Für wen?',
      'Wer hat Werbe-Mails bekommen – und warum? (Antwort steht in jeder Mail.)',
    ],
    tipps: [
      'Präzision = Anteil der gezeigten Anzeigen, die gepasst haben. Reichweite = Anteil der Interessierten, die erreicht wurden.',
      'Gewinnt ausnahmsweise die Klasse? Super Diskussionsanlass: Wann versagen Algorithmen?',
    ],
    sicherung: 'Zielgerichtete Werbung lässt sich messen (Trefferquote, Reichweite) – mehr Daten bedeuten meist bessere Treffer.',
  },
  werkbank: {
    dauer: '10–15 Min.', sozial: 'Gruppenarbeit',
    ziel: 'Einen eigenen Targeting-Algorithmus bauen (gewichtete Bewertungsfunktion) und seine Güte mit Trainings- und Testdaten prüfen.',
    ablauf: [
      'Gruppen stellen per Schieberegler ein, wie stark Likes, Verweildauer, geöffnete Artikel usw. zählen, und legen eine Mindestpunktzahl fest.',
      'Live sehen sie Pseudocode, Trefferquote, Reichweite, F1-Wert und Wahrheitsmatrix – geprüft an den Trainingsdaten (erste 4 Anzeigen).',
      'Beamer zeigt die Bestenliste der Algorithmen im Vergleich zu Gruppen und bubbl.',
      'Zum Schluss „Testdaten aufdecken“: Jetzt wird an den übrigen Anzeigen geprüft.',
      'Ergebnis besprechen, dann „Weiter“.',
    ],
    impulse: [
      'Welches Signal hat bei euch am meisten gebracht – und warum?',
      'Nach dem Aufdecken: Wer ist abgestürzt? Warum funktionieren perfekt angepasste Einstellungen bei neuen Daten schlechter (Overfitting)?',
      'Was bedeutet ein F1-Wert von 100 %? Ist das realistisch?',
    ],
    tipps: [
      'Erst ausprobieren lassen, dann gezielt zum Optimieren auffordern („Schlagt den bubbl-Algorithmus!“).',
      'Nicht zu früh aufdecken – sonst optimieren die Gruppen direkt auf die Testdaten.',
      'Mit „Testdaten verbergen“ lässt sich zurückschalten.',
    ],
    sicherung: 'Algorithmus = gewichtete Bewertung von Merkmalen + Mindestpunktzahl (Schwellenwert). Güte nur an unbekannten Testdaten ehrlich messbar; Überanpassung = Overfitting.',
  },
  profil: {
    dauer: '8–10 Min.', sozial: 'Einzelarbeit',
    ziel: 'Aufdecken, was bubbl heimlich gemessen und gefolgert hat – und was man bei der Anmeldung zugestimmt hat.',
    ablauf: [
      'SuS sehen auf dem Handy: Datenpunkte, Verweildauer, gelesene Artikel, Radarprofil „nur Likes“ vs. „Likes + Tracking“.',
      'Die „Vermutungen über dich“ (Alter, Kaufkraft …) mit „stimmt / stimmt nicht“ bewerten lassen.',
      'Karte „Deine Anmeldung“: AGB geöffnet? Newsletter-Häkchen bemerkt?',
      'Tracking-Inspektor öffnen: echte Anfragen, die das eigene Handy an den Server geschickt hat (JSON).',
      'Optional: „Meine Daten herunterladen“ (Auskunft nach Art. 15 DSGVO).',
      'Beamer zeigt die Klassenwerte (Likes vs. Datenpunkte, AGB, Newsletter). Dann „Weiter“.',
    ],
    impulse: [
      'Was verrät Verweildauer, was ein Like nicht verrät?',
      'Wer hat die AGB gelesen? Was stand darin? (Klausel 4.2 und 7.3 vorlesen.)',
      'Ist ein vorausgewähltes Häkchen eine Einwilligung? (EuGH, Planet49, 2019: nein.)',
      'Sind die „Vermutungen“ fair? Woher kennen Plattformen Alter oder politische Haltung?',
    ],
    tipps: [
      'Im Tracking-Inspektor lohnt ein Blick auf ein einzelnes JSON-Objekt am Beamer: Schlüssel, Werte, Zeitstempel.',
      'Nicht bloßstellen: Einzelprofile gehören aufs eigene Handy, der Beamer zeigt nur Klassenwerte.',
    ],
    sicherung: 'Tracking = Erfassen von Verhalten ohne aktive Eingabe. Profiling = automatisches Ableiten von Merkmalen. DSGVO: Auskunftsrecht (Art. 15), Einwilligung muss aktiv erfolgen.',
  },
  fairness: {
    dauer: '8 Min.', sozial: 'Einzelarbeit + Plenum',
    ziel: 'Erkennen, dass klick-optimierte Ausspielung Menschen indirekt benachteiligen kann (Proxy-Merkmale).',
    ablauf: [
      'Ein Angebot für alle (z. B. Ausbildungsplatz) wird nur an die „typische“ Zielgruppe ausgespielt.',
      'SuS beantworten auf dem Handy, ob sie es bekommen haben und ob das fair ist.',
      'Beamer: Matrix erreicht / ausgeschlossen / Streuverlust und Verteilung nach Interessengruppen.',
      'Diskutieren, dann „Fairness-Regel einschalten“ und die neue Verteilung vergleichen.',
    ],
    impulse: [
      'Wer wurde ausgeschlossen – und hatte trotzdem Interesse?',
      'Das Merkmal „Technik-Likes“ hat nichts mit Eignung zu tun – warum benutzt der Algorithmus es trotzdem?',
      'Was kostet Fairness (mehr Streuverlust)? Wer sollte das entscheiden?',
    ],
    tipps: ['Zuerst antworten lassen, erst danach die Regel einschalten – sonst fehlt der Aha-Moment.'],
    sicherung: 'Proxy-Merkmal: scheinbar neutrales Merkmal, das mit einer Gruppenzugehörigkeit zusammenhängt → indirekte Diskriminierung möglich.',
  },
  blase: {
    dauer: '5 Min.', sozial: 'Einzelarbeit',
    ziel: 'Erleben, wie ein Empfehlungsfeed sich mit jedem Like verengt (Filterblase).',
    ablauf: [
      'SuS liken im neuen Feed; nach jedem Like empfiehlt bubbl mehr vom Gleichen.',
      'Beamer: Die Avatare wandern zu „ihrem“ Thema – Blasen werden sichtbar.',
      'Challenge: Wer schafft es mit „Etwas Neues entdecken“ wieder heraus? Dann „Weiter“.',
    ],
    impulse: [
      'Wie viele verschiedene Themen hast du am Ende noch gesehen?',
      'Ist eine Filterblase bei Hobbys harmlos – und bei Nachrichten oder Politik?',
      'Was könnt ihr selbst gegen eure Blase tun?',
    ],
    tipps: ['Kurz halten – die Wirkung ist nach 2–3 Minuten deutlich sichtbar.'],
    sicherung: 'Filterblase: Personalisierte Empfehlungen verstärken bestehende Interessen und blenden anderes aus.',
  },
  shorts: {
    dauer: '10–12 Min.', sozial: 'Einzelarbeit + Plenum',
    ziel: 'Am eigenen Handy erleben, wie ein Kurzvideo-Feed allein aus der Wiedergabezeit lernt, sich verengt, Werbung einstreut und Zeitgefühl kostet.',
    ablauf: [
      'SuS tippen auf „Shorts starten“: Clips laufen automatisch weiter, Wischen nach oben überspringt, jeder 5. Clip ist Werbung (erst nach 3 s überspringbar).',
      'Bewusst keine Zeitvorgabe nennen – „schaut einfach, so lange ihr wollt“. Nach ca. 4–6 Minuten beenden.',
      'Innehalten 1 starten („Wie lange warst du drin?“) und schätzen lassen – noch NICHT aufdecken.',
      '„Shorts stoppen & aufdecken“: Handys zeigen das persönliche Shorts-Protokoll, der Beamer die Tricks hinter Shorts.',
      'Jetzt Innehalten 1 auflösen: Schätzung (Petrol) und echte Zeit (Orange) im Vergleich. Danach Innehalten 2 und 3.',
    ],
    impulse: [
      'Wer hat länger geschaut als geschätzt? Woran liegt das?',
      'Ihr habt nichts geliked – woher „wusste“ der Feed, was euch gefällt?',
      'Habt ihr die Werbeclips als Werbung erkannt? Woran?',
      'Welche Themen könnten in einem echten Feed gefährlich werden, wenn er sich so verengt (z. B. Schönheitsideale, Diäten, Verschwörungsmythen)?',
      'Was hilft euch selbst: Zeitlimit, Autoplay aus, Feed bewusst „trainieren“ (Nicht interessiert), Handy weg beim Schlafen?',
    ],
    tipps: [
      'Die „Clips“ sind Fotos mit Laufbalken und leichter Bewegung – es werden keine echten Videos geladen.',
      'Der Feed lernt nur aus der Wiedergabezeit; etwa 15 % der Clips sind zufällige Themen (wie in echten Feeds zum „Ausprobieren“).',
      '„Shorts wieder freigeben“ erlaubt eine zweite Runde – spannend, um bewusst gegenzusteuern.',
      'Die Shorts-Anfragen erscheinen auch im Tracking-Inspektor (POST /shorts/watch).',
    ],
    sicherung: 'Kurzvideo-Plattformen optimieren auf Wiedergabezeit: Endlos-Feed, Autoplay und personalisierte Empfehlungen halten uns fest – Werbung wird nahtlos eingestreut. Gegenmittel: Zeitlimits, Autoplay aus, bewusstes Steuern des Feeds.',
  },
  wahl: {
    dauer: '8 Min.', sozial: 'Einzelarbeit + Plenum',
    ziel: 'Politisches Microtargeting durchschauen: Jede Gruppe bekommt andere, teils widersprüchliche Versprechen.',
    ablauf: [
      'Jede Person sieht die Wahlbotschaft der fiktiven Partei zu ihrem Hauptinteresse und stimmt ab.',
      'Abstimmung abwarten (Fortschritt), noch nichts verraten.',
      '„Botschaften aufdecken“: Alle Versprechen erscheinen nebeneinander, Widersprüche werden markiert.',
      'Diskutieren, dann „Weiter“.',
    ],
    impulse: [
      'Hättest du die Partei auch gewählt, wenn du alle Botschaften gekannt hättest?',
      'Warum ist das bei Politik problematischer als bei Schuhwerbung?',
      'Bezug: Cambridge Analytica, „Dark Ads“, EU-Regeln für politische Werbung (Transparenz, Kennzeichnung).',
    ],
    tipps: ['Die Partei ist fiktiv – reale Parteien bewusst heraushalten, um Diskussionen sachlich zu halten.'],
    sicherung: 'Politisches Microtargeting kann Widersprüche verbergen, weil niemand alle Botschaften sieht.',
  },
  reflexion: {
    dauer: '10 Min.', sozial: 'Plenum',
    ziel: 'Erfahrungen bündeln und eine eigene Haltung zu personalisierter Werbung entwickeln.',
    ablauf: [
      'SuS beantworten die Reflexionsfragen und schreiben anonyme Notizen (Pro / Contra).',
      'Notizen erscheinen auf dem Beamer – unpassende hier per Häkchen ausblenden.',
      'Histogramm und Notizen im Plenum besprechen.',
      'Zum Schluss „Ergebnisse als CSV“ herunterladen (für die Dokumentation).',
    ],
    impulse: [
      'Personalisierte Werbung: eher nützlich oder eher manipulativ?',
      'Was nehmt ihr euch für eure eigenen Apps vor (Einstellungen, Häkchen, AGB)?',
      'Welche Regeln sollte es für Plattformen geben?',
    ],
    tipps: ['Notizen vorab kurz überfliegen, bevor sie groß auf dem Beamer stehen.'],
    sicherung: 'Eigene Handlungsmöglichkeiten: Tracking einschränken, Einwilligungen prüfen, Auskunft verlangen, Feeds bewusst diversifizieren.',
  },
  quiz: {
    dauer: '8–10 Min.', sozial: 'Einzelarbeit',
    ziel: 'Fachbegriffe spielerisch sichern.',
    ablauf: [
      '„Quiz starten“ – die Frage erscheint auf Beamer und Handys, 20 Sekunden Antwortzeit.',
      '„Auflösen“ zeigt Lösung, Antwortverteilung, Erklärung und Bestenliste.',
      'Kurz die Erklärung vorlesen, dann „Nächste Frage“; am Ende „Siegerehrung“.',
    ],
    impulse: ['Bei vielen falschen Antworten: Begriff an einem Beispiel aus dem Spiel klären, bevor es weitergeht.'],
    tipps: [
      'Schnelle Antworten bringen mehr Punkte – ruhig darauf hinweisen.',
      '„Zurücksetzen“ startet das Quiz neu (alle Antworten gehen verloren).',
      'Fragen lassen sich im Inhalts-Editor anpassen, auch per KI-Assistent.',
    ],
    sicherung: 'Begriffe: Microtargeting, Tracking, Profiling, Filterblase, Proxy-Merkmal, DSGVO, Trainings-/Testdaten.',
  },
};
