import { IMAGES } from './images.js';

// Gemeinsame Spielinhalte für Server und Browser.
// Grundlage: „Microtargeting – Wie entsteht personalisierte Werbung?“
// (Unterrichtsbeispiel von Anna Rebmann, WBM Informatik Kohorte III),
// erweitert um Tracking, Algorithmus, Profil, Filterblase und Wahlwerbung.

// Reihenfolge = feste Farbreihenfolge (Kategorie-Farben werden nie neu verteilt).
export const CATEGORIES = [
  { id: 'technik', name: 'Technik', icon: '🎮', color: '#3987e5', light: '#2a78d6' },
  { id: 'sport', name: 'Sport', icon: '⚽', color: '#d95926', light: '#eb6834' },
  { id: 'umwelt', name: 'Umweltschutz', icon: '🌍', color: '#199e70', light: '#1baf7a' },
  { id: 'naschen', name: 'Naschen', icon: '🍫', color: '#c98500', light: '#b07600' },
  { id: 'mode', name: 'Mode', icon: '👗', color: '#d55181', light: '#d5508a' },
  { id: 'natur', name: 'Natur', icon: '🌲', color: '#0ca30c', light: '#008300' },
  { id: 'ernaehrung', name: 'Ernährung', icon: '🥗', color: '#9085e9', light: '#6250d6' },
];
const dict = (entries) => Object.assign(Object.create(null), Object.fromEntries(entries));
export const CAT = dict(CATEGORIES.map((c) => [c.id, c]));

// Konten im bubbl-Netzwerk (alle fiktiv). kind: news | creator | brand | local | community
export const PAGES = {
  styleup: { name: 'STYLEUP', handle: 'styleup.de', avatar: '💄', cat: 'mode', kind: 'news', color: '#d6336c', domain: 'styleup.de', verified: true },
  lenalooks: { name: 'Lena | Style & Beauty', handle: 'lena.looks', avatar: '💫', cat: 'mode', kind: 'creator', color: '#e64980', followers: '412 Tsd.', verified: true },
  naturblick: { name: 'Naturblick', handle: 'naturblick', avatar: '🦉', cat: 'natur', kind: 'news', color: '#2b8a3e', domain: 'naturblick-magazin.de', verified: true },
  klima: { name: 'Klima Kompakt', handle: 'klimakompakt', avatar: '🌍', cat: 'umwelt', kind: 'news', color: '#0b7285', domain: 'klimakompakt.de', verified: true },
  norden: { name: 'Ostfriesland Aktuell', handle: 'ostfriesland.aktuell', avatar: '📰', cat: null, kind: 'local', color: '#1864ab', domain: 'ostfriesland-aktuell.de', verified: true },
  tagesblick: { name: 'Tagesblick', handle: 'tagesblick', avatar: '🗞️', cat: null, kind: 'news', color: '#212529', domain: 'tagesblick.de', verified: true },
  sportnow: { name: 'SportNow', handle: 'sportnow', avatar: '🏆', cat: 'sport', kind: 'news', color: '#e8590c', domain: 'sportnow.de', verified: true },
  pixel: { name: 'PixelPlay', handle: 'pixelplay', avatar: '🕹️', cat: 'technik', kind: 'news', color: '#5f3dc4', domain: 'pixelplay.gg', verified: true },
  digital: { name: 'Digital Heute', handle: 'digitalheute', avatar: '📱', cat: 'technik', kind: 'news', color: '#1971c2', domain: 'digital-heute.de', verified: true },
  techtom: { name: 'TechTom', handle: 'techtom', avatar: '🎧', cat: 'technik', kind: 'creator', color: '#364fc7', followers: '1,2 Mio.', verified: true },
  naschwerk: { name: 'Naschwerk', handle: 'naschwerk', avatar: '🍬', cat: 'naschen', kind: 'creator', color: '#c2255c', followers: '238 Tsd.', verified: false },
  fitfood: { name: 'FitFood', handle: 'fitfood', avatar: '🥑', cat: 'ernaehrung', kind: 'news', color: '#5c940d', domain: 'fitfood-magazin.de', verified: true },
  paulfit: { name: 'Paul | Fitness & Food', handle: 'paul.fitlife', avatar: '💪', cat: 'ernaehrung', kind: 'creator', color: '#2f9e44', followers: '687 Tsd.', verified: true },
};

// Beiträge – Stand: 18. November 2026.
// format: link (Artikel mit Vorschaukarte) | photo | video (mit Dauer); sponsored = bezahlte Partnerschaft
// stats: Reichweite zum Zeitpunkt des Spiels; comment: meistgelikter Kommentar
// round 1 = Feed in Schritt 1, round 2 = zusätzliche Beiträge für die Filterblase
const DEFAULT_POSTS = [
  // ---------- Mode
  { id: 'm1', cat: 'mode', page: 'styleup', round: 1, time: '2 Std.', format: 'link', art: ['🛍️', '💳', '✨'], bg: ['#ff9a9e', '#fecfef'],
    headline: 'Black-Friday-Gewinnspiel: Wir verlosen 500 € Shopping-Guthaben',
    teaser: 'Nächsten Freitag ist Black Friday – und wir legen noch einen drauf: Unter allen Teilnehmenden verlosen wir einen Gutschein über 500 €. Teilnehmen dauert nur 30 Sekunden! 🛍️',
    body: 'So geht’s: Formular ausfüllen mit Name, Geburtsdatum, Wohnort, Handynummer und deinen drei Lieblingsmarken. Mit der Teilnahme willigst du ein, dass wir und unsere Partner dir passende Angebote schicken dürfen. Teilnahmeschluss ist der 27. November um 23:59 Uhr. Die Gewinnerin oder der Gewinner wird per SMS benachrichtigt.',
    tags: ['blackfriday', 'gewinnspiel', 'shopping'], stats: { likes: 18342, comments: 4210, shares: 2903 },
    comment: { user: 'mia.08', text: 'Hab mitgemacht 🙏 drückt mir die Daumen!!', likes: 312 } },
  { id: 'm2', cat: 'mode', page: 'lenalooks', round: 1, time: '5 Std.', format: 'photo', sponsored: 'GlowUp Cosmetics', art: ['💃', '📸', '💋'], bg: ['#f6d365', '#fda085'],
    headline: 'Mein Winter-Glow in 5 Minuten ✨',
    teaser: 'Ihr habt so oft gefragt – hier ist meine komplette Morgenroutine für kalte Tage! Mein Holy Grail ist das neue Glow-Serum, mit meinem Code LENA20 bekommt ihr 20 % 🤍',
    body: 'Lena (19) aus Jever hat inzwischen über 400.000 Follower. Für diesen Beitrag wurde sie von einer Kosmetikmarke bezahlt – das steht klein über dem Bild („Bezahlte Partnerschaft“). Über den Rabattcode verdient sie zusätzlich an jedem Verkauf mit. Viele Follower bemerken die Kennzeichnung nicht.',
    tags: ['grwm', 'winterglow', 'skincare', 'anzeige'], stats: { likes: 52710, comments: 1388, shares: 640 },
    comment: { user: 'jule_xo', text: 'Deine Haut 😍 welche Foundation ist das?', likes: 205 } },
  { id: 'm3', cat: 'mode', page: 'tagesblick', round: 1, time: '7 Std.', format: 'video', duration: '0:58', art: ['📦', '💶', '🛃'], bg: ['#fbc2eb', '#a6c1ee'],
    headline: 'Temu & Shein werden teurer: Was die EU-Paketgebühr für dich bedeutet',
    teaser: 'Seit Juli fällt auf Billig-Pakete aus Drittstaaten Zoll an – pro Warenart drei Euro. Jetzt kommt noch eine Bearbeitungsgebühr dazu. Wir rechnen vor, was dein 9-€-Hoodie wirklich kostet. 📦',
    body: 'Bisher waren Sendungen unter 150 € zollfrei. Die EU will damit die Flut von Kleinstpaketen eindämmen – allein 2024 kamen Milliarden davon in die EU, die meisten aus China. Bei Bestellungen mit vielen verschiedenen Artikeln kann sich der Aufschlag schnell summieren. Verbraucherzentralen raten: Endpreis inklusive aller Gebühren vor dem Kauf prüfen.',
    tags: ['temu', 'shein', 'zoll', 'onlineshopping'], stats: { likes: 9876, comments: 2134, shares: 3410 },
    comment: { user: 'ben.k', text: 'Na toll, und ich hab gestern noch 12 Sachen bestellt 💀', likes: 1203 } },
  { id: 'm4', cat: 'mode', page: 'styleup', round: 2, time: '3 Std.', format: 'photo', art: ['👟', '🔥', '🏷️'], bg: ['#ffecd2', '#fcb69f'],
    headline: 'Diese Sneaker trägt gerade gefühlt jede:r',
    teaser: 'Der Retro-Runner ist DER Schuh des Winters – und fast überall ausverkauft. Wir wissen, wo es noch Größen gibt 👀', body: 'Insider berichten: Nachschub kommt nur online und nur in kleinen Mengen. Wer zuschlagen will, sollte die Benachrichtigungen aktivieren.',
    tags: ['sneaker', 'outfit'], stats: { likes: 7340, comments: 412, shares: 233 }, comment: { user: 'leon_r', text: 'Größe 43 überall weg 😭', likes: 88 } },
  { id: 'm5', cat: 'mode', page: 'styleup', round: 2, time: '6 Std.', format: 'link', art: ['🧥', '❄️', '🧣'], bg: ['#e0c3fc', '#8ec5fc'],
    headline: 'Winterjacken-Check: 8 warme Jacken unter 80 €',
    teaser: 'Warm, wasserdicht und trotzdem schick? Unsere Redaktion hat acht Jacken im Ostfriesen-Wetter getestet …', body: 'Testsieger ist eine Steppjacke aus recyceltem Material. Alle Modelle lassen sich direkt über unsere Partner-Links bestellen – dabei verdienen wir eine kleine Provision.',
    tags: ['winter', 'jacke', 'test'], stats: { likes: 3120, comments: 145, shares: 402 }, comment: { user: 'hanna.m', text: 'Die zweite hab ich, kann ich empfehlen!', likes: 21 } },
  { id: 'm6', cat: 'mode', page: 'norden', round: 2, time: '1 Tag', format: 'photo', art: ['♻️', '👚', '🪡'], bg: ['#d4fc79', '#96e6a1'],
    headline: 'Kleidertausch an der KGS: 400 Teile in zwei Stunden getauscht',
    teaser: 'Statt Black Friday: Die Schülervertretung hat einen Tauschmarkt organisiert – mit Rekordandrang ♻️', body: 'Jede:r konnte bis zu fünf Kleidungsstücke abgeben und dafür andere mitnehmen. Was übrig blieb, geht an die Kleiderkammer.',
    tags: ['secondhand', 'nachhaltigkeit', 'schule'], stats: { likes: 1450, comments: 96, shares: 120 }, comment: { user: 'sv.kgs', text: 'Danke an alle! Nächster Termin im März 💚', likes: 64 } },
  { id: 'm7', cat: 'mode', page: 'lenalooks', round: 2, time: '2 Tage', format: 'video', duration: '0:34', art: ['💇', '✂️', '🌈'], bg: ['#a1c4fd', '#c2e9fb'],
    headline: 'Ich hab mir einen Mullet schneiden lassen 😳',
    teaser: 'Ehrliche Meinung bitte!! Bereut oder genial? 👇', body: 'Der Clip wurde in zwei Tagen über eine Million Mal angesehen.',
    tags: ['mullet', 'haircut', 'transformation'], stats: { likes: 98200, comments: 6420, shares: 2100 }, comment: { user: 'lea.sophie', text: 'Steht dir mega!!', likes: 1830 } },

  // ---------- Natur
  { id: 'n1', cat: 'natur', page: 'naturblick', round: 1, time: '3 Std.', format: 'link', art: ['🌳', '🧠', '☀️'], bg: ['#d4fc79', '#96e6a1'],
    headline: 'Studie: Pausen im Grünen machen konzentrierter',
    teaser: 'Wer seine Pause draußen verbringt, kann sich danach besser konzentrieren – das zeigen mehrere Studien. Schon 20 Minuten zwischen Bäumen senken das Stresslevel messbar. 🌳',
    body: 'Forschende vergleichen dabei Gruppen, die ihre Pause drinnen am Handy verbringen, mit Gruppen, die draußen spazieren gehen. Die Draußen-Gruppe schneidet bei Gedächtnis- und Konzentrationstests besser ab. Die Empfehlung: Pausen draußen – am besten ohne Bildschirm.',
    tags: ['wissenschaft', 'natur', 'gesundheit'], stats: { likes: 4210, comments: 188, shares: 920 }, comment: { user: 'frau.janssen', text: 'Das hänge ich im Lehrerzimmer auf 😄', likes: 77 } },
  { id: 'n2', cat: 'natur', page: 'norden', round: 1, time: '8 Std.', format: 'photo', art: ['🕊️', '🌾', '🌅'], bg: ['#43e97b', '#38f9d7'],
    headline: 'Kraniche über Ostfriesland: Zehntausende rasten auf dem Weg nach Süden',
    teaser: 'Habt ihr sie auch trompeten gehört? Gerade ziehen riesige Kranich-Schwärme über uns hinweg. Unser Leser Hauke hat dieses Foto bei Sonnenaufgang gemacht 📸',
    body: 'Kraniche rasten im Herbst auf Feldern und in Mooren, bevor sie nach Frankreich und Spanien weiterziehen. Beobachten ist erlaubt – aber bitte mit Abstand: Werden die Vögel aufgescheucht, verlieren sie wertvolle Energie für den langen Flug.',
    tags: ['kraniche', 'vogelzug', 'ostfriesland'], stats: { likes: 6890, comments: 340, shares: 1210 }, comment: { user: 'opa_gerd', text: 'Heute Morgen über Aurich, gewaltig!', likes: 143 } },
  { id: 'n3', cat: 'natur', page: 'naturblick', round: 1, time: '1 Tag', format: 'video', duration: '0:42', art: ['🐿️', '🌰', '🍁'], bg: ['#f6d365', '#fda085'],
    headline: 'Erwischt! Wer klaut eigentlich die Haselnüsse aus dem Garten? 🌰',
    teaser: 'Unsere Wildkamera hat den Täter überführt – und er hat einen ziemlich buschigen Schwanz. Wer wissen will, wer im Winter schläft und wer nur ruht, sollte dranbleiben …',
    body: 'Eichhörnchen legen im Herbst Hunderte Vorratsverstecke an – und finden längst nicht alle wieder. So pflanzen sie ganz nebenbei neue Bäume. Übrigens: Eichhörnchen halten keinen Winterschlaf, sondern nur Winterruhe.',
    tags: ['eichhörnchen', 'wildkamera', 'herbst'], stats: { likes: 23400, comments: 610, shares: 2750 }, comment: { user: 'tierlieb_42', text: 'Der kleine Dieb 😂❤️', likes: 498 } },
  { id: 'n4', cat: 'natur', page: 'naturblick', round: 2, time: '4 Std.', format: 'link', art: ['🦔', '🍂', '❄️'], bg: ['#a8edea', '#fed6e3'],
    headline: 'Erster Frost: So hilfst du Igeln durch den Winter',
    teaser: 'Ein Laubhaufen in der Gartenecke kann Leben retten. Was du tun solltest – und was lieber nicht …', body: 'Bitte keine Milch geben! Wer einen sehr kleinen oder geschwächten Igel findet, wendet sich an eine Igelstation.',
    tags: ['igel', 'garten'], stats: { likes: 8120, comments: 260, shares: 3100 }, comment: { user: 'kati.b', text: 'Bei uns wohnt einer unterm Holzstapel 🦔', likes: 90 } },
  { id: 'n5', cat: 'natur', page: 'naturblick', round: 2, time: '9 Std.', format: 'link', art: ['🍄', '🌧️', '🧺'], bg: ['#fddb92', '#d1fdff'],
    headline: 'Pilz-Apps sind keine Garantie: Giftnotrufe warnen',
    teaser: 'Foto machen, App fragt, fertig? Leider liegen die Apps oft daneben – mit gefährlichen Folgen …', body: 'Faustregel: Nur sammeln, was du sicher kennst. Im Zweifel zur Pilzberatung.',
    tags: ['pilze', 'sicherheit'], stats: { likes: 2980, comments: 177, shares: 1440 }, comment: { user: 'pilz.paule', text: 'Endlich sagt es mal jemand!', likes: 55 } },
  { id: 'n6', cat: 'natur', page: 'naturblick', round: 2, time: '1 Tag', format: 'photo', art: ['🌌', '✨', '🔭'], bg: ['#30cfd0', '#330867'],
    headline: 'Polarlichter auch bei uns möglich: Heute Nacht nach Norden schauen!',
    teaser: 'Die Sonne ist gerade besonders aktiv. Mit etwas Glück leuchtet der Himmel auch über der Nordsee 🌌', body: 'Tipp: Handykamera auf Nachtmodus stellen – die Kamera sieht die Farben oft besser als das Auge.',
    tags: ['polarlicht', 'nachthimmel'], stats: { likes: 15600, comments: 890, shares: 4300 }, comment: { user: 'nordlicht.nele', text: 'Letztes Mal hab ich’s verschlafen 😭', likes: 230 } },
  { id: 'n7', cat: 'natur', page: 'norden', round: 2, time: '2 Tage', format: 'photo', art: ['🦭', '🌊', '🏝️'], bg: ['#c1dfc4', '#deecdd'],
    headline: 'Robbenbabys am Strand: Bitte nicht anfassen!',
    teaser: 'Die Geburtszeit der Kegelrobben hat begonnen. Was du tun solltest, wenn du ein Jungtier allein findest …', body: 'Abstand halten (mindestens 30 Meter), Hunde anleinen und die Seehundstation informieren. Die Mutter ist meist in der Nähe.',
    tags: ['kegelrobbe', 'nordsee'], stats: { likes: 11200, comments: 420, shares: 2600 }, comment: { user: 'insel.kind', text: 'So süß 🥹 aber Abstand!!', likes: 140 } },

  // ---------- Umweltschutz
  { id: 'u1', cat: 'umwelt', page: 'klima', round: 1, time: '1 Std.', format: 'link', art: ['🌍', '🏛️', '🔥'], bg: ['#f093fb', '#f5576c'],
    headline: 'Weltklimakonferenz in Antalya: Endspurt ohne die USA',
    teaser: 'Seit dem 9. November verhandeln fast 200 Staaten in der Türkei über den Klimaschutz – die USA boykottieren den Gipfel. Laut UN steuert die Welt selbst mit allen Zusagen auf rund 2,6 Grad Erwärmung zu. Was jetzt auf dem Spiel steht 🧵',
    body: 'Die COP31 endet am Freitag. Gastgeber ist die Türkei, die Verhandlungen leitet Australien. Umstritten sind vor allem Geld für ärmere Länder und der Ausstieg aus Kohle, Öl und Gas. Vor dem Konferenzgelände demonstrieren junge Menschen aus aller Welt.',
    tags: ['cop31', 'klimakonferenz', 'klimaschutz'], stats: { likes: 12800, comments: 3900, shares: 5200 }, comment: { user: 'fridays.leer', text: 'Wir sind am Freitag auch auf der Straße! 📢', likes: 410 } },
  { id: 'u2', cat: 'umwelt', page: 'klima', round: 1, time: '6 Std.', format: 'photo', art: ['🐬', '🌊', '📉'], bg: ['#4facfe', '#00f2fe'],
    headline: 'Schweinswale in der Nordsee: Warum sie immer seltener werden',
    teaser: 'Der Schweinswal ist der einzige Wal, der dauerhaft vor unserer Küste lebt. Doch in der südlichen Nordsee zählen Forschende immer weniger Tiere. Die Gründe: Lärm, Stellnetze und Schadstoffe …',
    body: 'Rammarbeiten für Windparks, Schiffslärm und Fischernetze setzen den Tieren zu. Schutzgebiete gibt es – aber dort wird weiter gefischt. Wer einen toten Schweinswal am Strand findet, sollte das der Nationalparkverwaltung melden.',
    tags: ['schweinswal', 'nordsee', 'meeresschutz'], stats: { likes: 5320, comments: 260, shares: 1340 }, comment: { user: 'meeresliebe', text: 'Hab letzten Sommer einen vor Norderney gesehen!', likes: 66 } },
  { id: 'u3', cat: 'umwelt', page: 'norden', round: 1, time: '1 Tag', format: 'photo', art: ['🌱', '🌳', '🧤'], bg: ['#a8e063', '#56ab2f'],
    headline: '2.000 neue Bäume: Schülerinnen und Schüler pflanzen am Ewigen Meer',
    teaser: 'Matsch, Regen, gute Laune: Über 300 Jugendliche aus der Region haben am Samstag einen neuen Mischwald gepflanzt. Wir waren dabei 🌱',
    body: 'Die Bäume ersetzen Fichten, die nach Trockenheit und Borkenkäfer abgestorben waren. Gepflanzt wurden Eichen, Buchen und Ebereschen – sie kommen besser mit dem Klimawandel zurecht. Die Pflanzaktion wird im Frühjahr fortgesetzt.',
    tags: ['bäumepflanzen', 'ostfriesland', 'klima'], stats: { likes: 3870, comments: 154, shares: 410 }, comment: { user: 'jonte_07', text: 'Meine Eiche heißt Gerold 🌳😂', likes: 312 } },
  { id: 'u4', cat: 'umwelt', page: 'klima', round: 2, time: '5 Std.', format: 'link', art: ['☀️', '🔌', '🏠'], bg: ['#f6d365', '#fda085'],
    headline: 'Balkonkraftwerk: Lohnt sich das noch?',
    teaser: 'Steckersolar boomt. Wir rechnen vor, wann sich die Anlage bezahlt macht …', body: 'Je nach Ausrichtung nach vier bis sieben Jahren.',
    tags: ['solar', 'energie'], stats: { likes: 2410, comments: 380, shares: 650 }, comment: { user: 'papa.solar', text: 'Unsere läuft seit 2 Jahren 👍', likes: 34 } },
  { id: 'u5', cat: 'umwelt', page: 'norden', round: 2, time: '1 Tag', format: 'photo', art: ['🧴', '🏖️', '🧹'], bg: ['#e0eafc', '#cfdef3'],
    headline: 'Nach dem Herbststurm: 3 Tonnen Müll am Strand gesammelt',
    teaser: 'Netzreste, Flaschen, Feuerzeuge – Freiwillige haben am Wochenende den Strand gereinigt …', body: 'Besonders gefährlich für Seevögel sind Netzreste.',
    tags: ['beachcleanup', 'plastik'], stats: { likes: 4100, comments: 120, shares: 700 }, comment: { user: 'clean.coast', text: 'Danke an alle Helfer:innen 💙', likes: 48 } },
  { id: 'u6', cat: 'umwelt', page: 'tagesblick', round: 2, time: '1 Tag', format: 'video', duration: '1:12', art: ['📢', '🌍', '✊'], bg: ['#ff9966', '#ff5e62'],
    headline: 'Jugendliche weltweit protestieren für mehr Klimaschutz',
    teaser: 'Zum Ende der Klimakonferenz gehen in über 100 Ländern junge Menschen auf die Straße …', body: 'Ihre Forderung: Zusagen endlich umsetzen.',
    tags: ['klimastreik', 'cop31'], stats: { likes: 8700, comments: 2400, shares: 1900 }, comment: { user: 'tim.h', text: 'Bringt doch eh nix 🙄', likes: 150 } },
  { id: 'u7', cat: 'umwelt', page: 'norden', round: 2, time: '2 Tage', format: 'link', art: ['🚲', '🛣️', '🏫'], bg: ['#c2e59c', '#64b3f4'],
    headline: 'Neue Fahrradstraße: Schulweg soll sicherer werden',
    teaser: 'Ab Dezember haben Radfahrende auf der Zufahrt zum Schulzentrum Vorrang …', body: 'Autos dürfen nur noch 30 fahren.',
    tags: ['fahrrad', 'schulweg'], stats: { likes: 1320, comments: 410, shares: 130 }, comment: { user: 'radlerin.r', text: 'Endlich!!', likes: 40 } },

  // ---------- Sport
  { id: 's1', cat: 'sport', page: 'sportnow', round: 1, time: '2 Std.', format: 'video', duration: '1:24', art: ['🤾', '🏟️', '🇩🇪'], bg: ['#f6d365', '#fda085'],
    headline: 'Noch 8 Wochen bis zur Heim-WM: So tickt das Handball-Team',
    teaser: 'Am 13. Januar beginnt die Handball-WM in Deutschland – in München, Kiel, Stuttgart, Magdeburg, Hannover und Köln. Die Gruppenspiele mit deutscher Beteiligung sind längst ausverkauft. Wir waren beim Training 🎥',
    body: 'Anfang November hat die Mannschaft mit Länderspielen gegen Belgien und die Slowakei die WM-Vorbereitung gestartet. Bis Dezember muss der Bundestrainer seinen Kader festlegen. Das Turnier endet am 31. Januar.',
    tags: ['handball', 'heimwm', 'dhb'], stats: { likes: 21300, comments: 980, shares: 1700 }, comment: { user: 'handball.hanna', text: 'Hab Karten für Hannover!!! 🔥', likes: 520 } },
  { id: 's2', cat: 'sport', page: 'sportnow', round: 1, time: '5 Std.', format: 'link', art: ['🏀', '👟', '📈'], bg: ['#ff9a9e', '#fad0c4'],
    headline: 'Nach dem EM-Titel: Basketball-Vereine erleben einen Ansturm',
    teaser: 'Seit dem Europameistertitel der deutschen Basketballer wollen so viele Kinder und Jugendliche Basketball spielen wie nie. Viele Vereine führen Wartelisten – vor allem für Mädchenteams fehlen Hallenzeiten. 🏀',
    body: 'Vereine suchen dringend Trainerinnen und Trainer. Wer mindestens 16 ist, kann beim Landesverband einen Trainerschein machen – oft übernimmt der Verein die Kosten.',
    tags: ['basketball', 'verein', 'jugend'], stats: { likes: 6450, comments: 310, shares: 520 }, comment: { user: 'coach.jana', text: 'Wir suchen noch Trainer:innen in Emden! DM me', likes: 72 } },
  { id: 's3', cat: 'sport', page: 'norden', round: 1, time: '1 Tag', format: 'photo', art: ['⚽', '💡', '🏆'], bg: ['#a1c4fd', '#c2e9fb'],
    headline: 'Flutlicht-Krimi im Kreispokal: B-Jugend zieht ins Halbfinale ein',
    teaser: 'Elfmeterschießen, 400 Zuschauer und ein Torwart, der zum Helden wurde: Was für ein Abend auf dem Sportplatz! ⚽',
    body: 'Nach 80 Minuten stand es 2:2. Im Elfmeterschießen hielt Torwart Ole zwei Schüsse. Das Halbfinale findet im März statt – wenn der Platz bis dahin bespielbar ist.',
    tags: ['kreispokal', 'jugendfußball', 'ostfriesland'], stats: { likes: 2380, comments: 188, shares: 140 }, comment: { user: 'ole.tw1', text: 'Danke Jungs, was für ein Abend 🧤', likes: 302 } },
  { id: 's4', cat: 'sport', page: 'norden', round: 2, time: '4 Std.', format: 'link', art: ['🏃', '🎆', '🏅'], bg: ['#fbc2eb', '#a6c1ee'],
    headline: 'Silvesterlauf: Anmeldung gestartet – 5 km für alle',
    teaser: 'Mit Kostüm, ohne Zeitdruck: Der beliebte Lauf am 31. Dezember sucht noch Teilnehmende …', body: 'Startgeld geht an die Tafel.',
    tags: ['silvesterlauf', 'laufen'], stats: { likes: 980, comments: 44, shares: 210 }, comment: { user: 'run.ricarda', text: 'Bin dabei 🏃‍♀️', likes: 12 } },
  { id: 's5', cat: 'sport', page: 'sportnow', round: 2, time: '9 Std.', format: 'video', duration: '0:27', art: ['🛹', '🔥', '🧱'], bg: ['#ffecd2', '#fcb69f'],
    headline: 'Dieser 14-Jährige landet einen Trick, den kaum ein Profi schafft',
    teaser: 'Das Video geht gerade um die Welt – 20 Versuche, dann sitzt er 🤯', body: 'Skateboarden ist seit 2021 olympisch.',
    tags: ['skateboard', 'viral'], stats: { likes: 154000, comments: 3200, shares: 12000 }, comment: { user: 'sk8.mats', text: 'Unreal 🔥', likes: 900 } },
  { id: 's6', cat: 'sport', page: 'sportnow', round: 2, time: '1 Tag', format: 'link', art: ['🎿', '🎯', '❄️'], bg: ['#e0eafc', '#cfdef3'],
    headline: 'Biathlon: Ende November startet der Weltcup',
    teaser: 'Wer sind die Favoritinnen und Favoriten? Unser Saison-Check …', body: 'Alle Rennen live im Free-TV.',
    tags: ['biathlon', 'wintersport'], stats: { likes: 4300, comments: 210, shares: 260 }, comment: { user: 'schnee.fan', text: 'Endlich wieder Biathlon-Wochenenden 😍', likes: 31 } },
  { id: 's7', cat: 'sport', page: 'norden', round: 2, time: '2 Tage', format: 'photo', art: ['🥋', '🥇', '💪'], bg: ['#c471f5', '#fa71cd'],
    headline: 'Judoka aus Aurich holt Landesmeistertitel',
    teaser: 'Mit 15 Jahren ganz oben: Emma trainiert fünfmal pro Woche …', body: 'Nächstes Ziel: Deutsche Meisterschaft.',
    tags: ['judo', 'landesmeisterin'], stats: { likes: 1890, comments: 140, shares: 80 }, comment: { user: 'judo.aurich', text: 'Wir sind so stolz! 🥇', likes: 60 } },

  // ---------- Technik
  { id: 't1', cat: 'technik', page: 'pixel', round: 1, time: '1 Std.', format: 'link', art: ['🎮', '🌴', '🚗'], bg: ['#667eea', '#764ba2'],
    headline: 'GTA VI erscheint morgen: Alles, was du wissen musst',
    teaser: 'Nach mehreren Verschiebungen ist es so weit: Am 19. November erscheint Grand Theft Auto VI für PS5 und Xbox Series. Wann die PC-Version kommt, ist noch offen. Preload läuft – aber Achtung: Die Reihe ist erst ab 18! 🎮',
    body: 'Wie seine Vorgänger ist das Spiel nicht für Jugendliche gedacht – Spiele ab 18 dürfen nicht an Jüngere verkauft werden. Viele Jugendliche spielen es trotzdem, oft über Konten der Eltern. Fachleute raten Eltern, sich das Spiel vorher selbst anzusehen und Regeln zu vereinbaren. Gaming-Seiten rechnen mit einem der größten Verkaufsstarts der Geschichte.',
    tags: ['gta6', 'gaming', 'release'], stats: { likes: 88400, comments: 15200, shares: 9800 }, comment: { user: 'finn.zockt', text: 'Mama sagt Nein 💀', likes: 4410 } },
  { id: 't2', cat: 'technik', page: 'pixel', round: 1, time: '4 Std.', format: 'video', duration: '2:05', art: ['🏆', '🖥️', '🎧'], bg: ['#43cea2', '#185a9d'],
    headline: 'Esports im Klassenzimmer: Die Schulliga startet in die neue Saison',
    teaser: 'Über 600 Schulteams aus ganz Deutschland treten an – auch aus Ostfriesland. Gespielt wird nach dem Unterricht, gecoacht von Lehrkräften. Wir haben ein Team beim Training begleitet 🎧',
    body: 'In der Liga gibt es feste Spielzeiten, Regeln zu Fairplay und Pausen. Die Schulen wollen damit zeigen, dass Gaming auch Teamarbeit, Strategie und Kommunikation trainiert – und mit Jugendlichen über gesunde Bildschirmzeit sprechen.',
    tags: ['esports', 'schule', 'gaming'], stats: { likes: 5400, comments: 420, shares: 380 }, comment: { user: 'kgs.esports', text: 'Wir sind dabei! 🔥', likes: 120 } },
  { id: 't3', cat: 'technik', page: 'techtom', round: 1, time: '1 Tag', format: 'video', duration: '12:48', sponsored: 'NexGear', art: ['🖥️', '⚡', '🛠️'], bg: ['#ff6a00', '#ee0979'],
    headline: 'Gaming-PC für 800 € – trotz Speicherkrise? Ich hab’s versucht',
    teaser: 'Arbeitsspeicher ist dieses Jahr so teuer wie lange nicht. Reicht ein Budget von 800 € trotzdem für flüssiges Zocken? Alle Teile und Links in der Beschreibung 👇',
    body: 'Das Video wird von einem Hardware-Händler gesponsert – alle Links führen in dessen Shop. TechTom verdient an jedem Kauf über seine Links mit. Ein Hinweis darauf steht in der Videobeschreibung ganz unten.',
    tags: ['gamingpc', 'pcbuild', 'werbung'], stats: { likes: 41200, comments: 2900, shares: 1300 }, comment: { user: 'pcnoob', text: 'Bau ich nach!!', likes: 310 } },
  { id: 't4', cat: 'technik', page: 'digital', round: 1, time: '6 Std.', format: 'link', art: ['📱', '🔞', '⚖️'], bg: ['#4facfe', '#00f2fe'],
    headline: 'Social Media erst ab 14? Was Fachleute jetzt empfehlen',
    teaser: 'Australien hat es vorgemacht: Dort dürfen Unter-16-Jährige seit knapp einem Jahr keine eigenen Social-Media-Konten mehr haben. Auch in Deutschland wird über eine Altersgrenze gestritten. Was würde das für dich bedeuten? 📱',
    body: 'Eine Expertenkommission der Bundesregierung hat vorgeschlagen: kein Social Media unter 14, eine verpflichtende Altersprüfung und eine „Jugendversion“ der Apps bis 16. Kritiker:innen bezweifeln, dass sich das kontrollieren lässt, und fordern mehr Medienbildung. In Großbritannien soll ein ähnliches Verbot 2027 kommen.',
    tags: ['socialmedia', 'jugendschutz', 'altersgrenze'], stats: { likes: 14200, comments: 8300, shares: 4400 }, comment: { user: 'emil.2011', text: 'Und wie wollen die das kontrollieren? 😂', likes: 2120 } },
  { id: 't5', cat: 'technik', page: 'digital', round: 2, time: '3 Std.', format: 'link', art: ['🤖', '📚', '✍️'], bg: ['#a18cd1', '#fbc2eb'],
    headline: 'KI bei den Hausaufgaben: Was Schulen jetzt erlauben',
    teaser: 'Verbieten oder nutzen? Immer mehr Schulen schreiben eigene KI-Regeln …', body: 'Häufig gilt: KI als Hilfe ja, Ergebnisse kennzeichnen.',
    tags: ['ki', 'schule'], stats: { likes: 6700, comments: 1900, shares: 1500 }, comment: { user: 'lehrer.lars', text: 'Kennzeichnen ist der Schlüssel.', likes: 88 } },
  { id: 't6', cat: 'technik', page: 'techtom', round: 2, time: '8 Std.', format: 'video', duration: '9:31', art: ['🥽', '🌐', '🕹️'], bg: ['#30cfd0', '#330867'],
    headline: 'VR-Brillen im Vergleich: Welche lohnt sich wirklich?',
    teaser: 'Drei Brillen, eine Woche Test – mein ehrliches Fazit …', body: 'Für Einsteiger reicht das günstigste Modell.',
    tags: ['vr', 'test'], stats: { likes: 18300, comments: 900, shares: 400 }, comment: { user: 'vr.vicky', text: 'Mir wird da immer schlecht 🤢', likes: 140 } },
  { id: 't7', cat: 'technik', page: 'digital', round: 2, time: '1 Tag', format: 'link', art: ['📸', '📱', '✨'], bg: ['#fddb92', '#d1fdff'],
    headline: 'Neues Handy zu Weihnachten? So viel Geld sparst du mit dem Vorjahresmodell',
    teaser: 'Die Kamera ist kaum schlechter, der Preis deutlich niedriger …', body: 'Auch generalüberholte Geräte sind eine Option.',
    tags: ['smartphone', 'sparen'], stats: { likes: 3900, comments: 260, shares: 800 }, comment: { user: 'sparfuchs', text: 'Refurbished ftw!', likes: 25 } },
  { id: 't8', cat: 'technik', page: 'pixel', round: 2, time: '2 Tage', format: 'link', art: ['🎙️', '📡', '💜'], bg: ['#c471f5', '#fa71cd'],
    headline: 'Streamen lernen: So startest du deinen ersten Stream',
    teaser: 'Mikro, Kamera, Software – was du wirklich brauchst …', body: 'Und: Was du nie zeigen solltest (Adresse, Schule, echtes Zimmer).',
    tags: ['streaming', 'tutorial'], stats: { likes: 5600, comments: 300, shares: 700 }, comment: { user: 'stream.sam', text: 'Danke, genau das hab ich gesucht!', likes: 30 } },

  // ---------- Naschen
  { id: 'c1', cat: 'naschen', page: 'naschwerk', round: 1, time: '3 Std.', format: 'video', duration: '0:46', art: ['🎄', '🍫', '🍓'], bg: ['#f857a6', '#ff5858'],
    headline: 'Nächste Woche öffnen die Weihnachtsmärkte – DAS sind die Trend-Snacks 2026 🎄',
    teaser: 'Schoko-Erdbeeren am Spieß, Crêpes mit Pistaziencreme und heiße Schokolade mit Marshmallow-Haube: Wir haben die Stände schon beim Aufbau besucht und verraten, was ihr probieren müsst! 🍓',
    body: 'Die meisten Weihnachtsmärkte in der Region öffnen in der letzten Novemberwoche. Die Preise sind gestiegen: Ein Crêpe mit Pistaziencreme kostet vielerorts schon 7 €. Unser Tipp: Vorher Taschengeld einteilen!',
    tags: ['weihnachtsmarkt', 'foodtrend', 'naschen'], stats: { likes: 31200, comments: 1840, shares: 3900 }, comment: { user: 'nele.nascht', text: 'Pistazie ist sooo 2025 😂 aber ich ess es trotzdem', likes: 640 } },
  { id: 'c2', cat: 'naschen', page: 'naschwerk', round: 1, time: '7 Std.', format: 'video', duration: '0:59', art: ['🍫', '🟢', '🔪'], bg: ['#e96443', '#904e95'],
    headline: 'Dubai-Schokolade selbst gemacht – für ein Drittel des Preises',
    teaser: 'Der Hype ist immer noch nicht vorbei: Im Laden kostet die Tafel oft 10 € und mehr. Ich zeig euch, wie ihr sie mit Pistaziencreme und Engelshaar-Teig selbst macht 🍫',
    body: 'Zutaten: Vollmilchschokolade, Pistaziencreme, Kadayif (Engelshaar-Teig) und etwas Butter. Teig anrösten, mit der Creme mischen, in Schokolade einschließen, kühlen – fertig! Übrigens: Viele „Dubai“-Tafeln im Supermarkt kommen gar nicht aus Dubai.',
    tags: ['dubaischokolade', 'rezept', 'diy'], stats: { likes: 67800, comments: 2400, shares: 8800 }, comment: { user: 'baking.bea', text: 'Gemacht – Familie ist begeistert 🤤', likes: 950 } },
  { id: 'c3', cat: 'naschen', page: 'norden', round: 1, time: '1 Tag', format: 'photo', art: ['🍬', '👩‍🍳', '📦'], bg: ['#ffecd2', '#fcb69f'],
    headline: 'Pralinen aus Leer erobern das Internet',
    teaser: 'Ein kleiner Familienbetrieb aus Leer verschickt seine handgemachten Pralinen inzwischen bis nach Japan – dank eines viralen Videos. Ein Besuch in der Backstube 🍬',
    body: 'Seit das Video einer Kundin millionenfach geklickt wurde, kommt die Chocolatière kaum hinterher. In der Adventszeit arbeitet das Team in drei Schichten. Ihr Geheimnis: Sanddorn aus Ostfriesland und Tee-Ganache.',
    tags: ['pralinen', 'leer', 'handgemacht'], stats: { likes: 9200, comments: 510, shares: 1300 }, comment: { user: 'oma.tilly', text: 'Die Sanddorn-Praline ist die beste!', likes: 130 } },
  { id: 'c4', cat: 'naschen', page: 'naschwerk', round: 2, time: '2 Std.', format: 'photo', art: ['🍩', '⏳', '🎉'], bg: ['#fbc2eb', '#a6c1ee'],
    headline: '2 Stunden anstehen für einen Donut? Wir haben’s getestet',
    teaser: 'Der neue Laden in der Innenstadt ist der Hit auf bubbl – lohnt sich das? 🍩', body: 'Fazit: lecker, aber nicht zwei Stunden lecker.',
    tags: ['donut', 'foodtest'], stats: { likes: 12100, comments: 900, shares: 700 }, comment: { user: 'donut.dani', text: 'Der mit Lotus 🤌', likes: 120 } },
  { id: 'c5', cat: 'naschen', page: 'naschwerk', round: 2, time: '6 Std.', format: 'video', duration: '0:38', art: ['☕', '🍫', '❄️'], bg: ['#d299c2', '#fef9d7'],
    headline: 'Der große Heiße-Schokolade-Test: 6 Sorten, 1 Sieger',
    teaser: 'Pulver, Stück, Barista-Version – welche schmeckt am besten? ☕', body: 'Sieger: echte Schokolade in warmer Milch.',
    tags: ['heißeschokolade', 'test'], stats: { likes: 8800, comments: 420, shares: 500 }, comment: { user: 'kakao.kai', text: 'Mit Sahne natürlich', likes: 60 } },
  { id: 'c6', cat: 'naschen', page: 'tagesblick', round: 2, time: '1 Tag', format: 'link', art: ['📅', '🍫', '🔍'], bg: ['#f6d365', '#fda085'],
    headline: 'Adventskalender-Check: Wie viel Schokolade steckt wirklich drin?',
    teaser: 'Große Packung, wenig Inhalt? Verbraucherschützer haben nachgewogen …', body: 'Bei manchen Kalendern wiegt die Verpackung mehr als die Schokolade.',
    tags: ['adventskalender', 'mogelpackung'], stats: { likes: 7300, comments: 640, shares: 2100 }, comment: { user: 'lisa.k', text: 'Wusste ich’s doch 😤', likes: 90 } },
  { id: 'c7', cat: 'naschen', page: 'naschwerk', round: 2, time: '2 Tage', format: 'video', duration: '0:51', art: ['🍪', '⭐', '🎄'], bg: ['#ffecd2', '#fcb69f'],
    headline: 'Die einfachsten Weihnachtsplätzchen der Welt (3 Zutaten!)',
    teaser: 'Butter, Zucker, Mehl – und 15 Minuten. Mehr braucht ihr nicht 🍪', body: 'Ausstechen, backen, verzieren – fertig.',
    tags: ['plätzchen', 'backen'], stats: { likes: 25400, comments: 700, shares: 6100 }, comment: { user: 'backfee', text: 'Mach ich am Wochenende mit meiner Schwester!', likes: 70 } },

  // ---------- Ernährung
  { id: 'e1', cat: 'ernaehrung', page: 'fitfood', round: 1, time: '2 Std.', format: 'link', art: ['🫘', '🥦', '💪'], bg: ['#96fbc4', '#f9f586'],
    headline: 'Linsen, Bohnen, Kichererbsen: Das unterschätzte Superfood',
    teaser: 'Sie sind billig, machen lange satt und stecken voller Eiweiß und Ballaststoffe. Trotzdem landen Hülsenfrüchte bei Jugendlichen nur selten auf dem Teller. Fünf Rezepte, die das ändern 🫘',
    body: 'Die Deutsche Gesellschaft für Ernährung empfiehlt, mindestens einmal pro Woche Hülsenfrüchte zu essen. Ein schnelles Rezept: Kichererbsen mit Paprikapulver im Ofen rösten – knusprig wie Chips. Wer keine Zeit hat, greift zu Konserven: genauso gesund.',
    tags: ['hülsenfrüchte', 'gesundessen', 'rezept'], stats: { likes: 5100, comments: 230, shares: 1500 }, comment: { user: 'veggie.vic', text: 'Ofen-Kichererbsen sind der beste Snack!!', likes: 66 } },
  { id: 'e2', cat: 'ernaehrung', page: 'paulfit', round: 1, time: '6 Std.', format: 'photo', sponsored: 'ProFuel', art: ['🥑', '🍳', '🥤'], bg: ['#d4fc79', '#96e6a1'],
    headline: 'Mein Protein-Frühstück für Schultage 💪',
    teaser: 'Avocado, Eier, Vollkornbrot – und mein Protein-Shake mit Schoko-Geschmack. Damit komme ich locker bis zur Mittagspause. Mit dem Code PAUL15 spart ihr 15 % 🤝',
    body: 'Paul ist 21 und Fitness-Influencer. Den Protein-Shake bezahlt eine Supplement-Marke, das ist als „Bezahlte Partnerschaft“ gekennzeichnet. Ernährungsfachleute sagen: Wer normal isst, braucht als Jugendliche:r keine Proteinpulver – Eier, Milchprodukte und Hülsenfrüchte reichen völlig.',
    tags: ['proteinfrühstück', 'fitness', 'anzeige'], stats: { likes: 74300, comments: 2100, shares: 1900 }, comment: { user: 'gym.jonas', text: 'Welcher Shake schmeckt am besten?', likes: 240 } },
  { id: 'e3', cat: 'ernaehrung', page: 'norden', round: 1, time: '1 Tag', format: 'link', art: ['🥗', '🏫', '🍽️'], bg: ['#a8edea', '#fed6e3'],
    headline: 'Schulmensa wird umgekrempelt: Mehr Gemüse, weniger Fleisch',
    teaser: 'Ab Januar gibt es in den Mensen des Landkreises jeden Tag ein vegetarisches Hauptgericht und eine Salatbar. Die Schülervertretung hat mitentschieden – nicht alle sind begeistert 🥗',
    body: 'Grundlage sind die neuen Qualitätsstandards für Schulessen. Die Preise sollen gleich bleiben. In einer Umfrage wünschten sich die meisten Schülerinnen und Schüler vor allem eins: mehr Auswahl – und Pommes am Freitag.',
    tags: ['schulessen', 'mensa', 'ostfriesland'], stats: { likes: 2300, comments: 740, shares: 160 }, comment: { user: 'max.12b', text: 'Hauptsache die Pommes bleiben 🍟', likes: 410 } },
  { id: 'e4', cat: 'ernaehrung', page: 'fitfood', round: 2, time: '4 Std.', format: 'link', art: ['🥤', '💪', '❓'], bg: ['#c2e9fb', '#a1c4fd'],
    headline: 'Protein-Hype: Brauchen Jugendliche wirklich Shakes und Riegel?',
    teaser: 'Protein-Pudding, Protein-Chips, Protein-Eis – was steckt dahinter? …', body: 'Kurz: meist teures Marketing.',
    tags: ['protein', 'faktencheck'], stats: { likes: 6200, comments: 900, shares: 1700 }, comment: { user: 'lina.l', text: 'Der Pudding ist trotzdem lecker 😅', likes: 77 } },
  { id: 'e5', cat: 'ernaehrung', page: 'paulfit', round: 2, time: '9 Std.', format: 'video', duration: '0:55', art: ['🍱', '⏱️', '💰'], bg: ['#fdfbfb', '#ebedee'],
    headline: 'Meal Prep für die ganze Schulwoche – unter 15 €',
    teaser: 'Sonntag eine Stunde kochen, fünf Tage gut essen 🍱', body: 'Reis, Gemüse, Hähnchen oder Tofu – einfach kombinieren.',
    tags: ['mealprep', 'günstig'], stats: { likes: 33000, comments: 800, shares: 4300 }, comment: { user: 'studi.sara', text: 'Rettet mein Budget 🙌', likes: 120 } },
  { id: 'e6', cat: 'ernaehrung', page: 'tagesblick', round: 2, time: '1 Tag', format: 'link', art: ['🥤', '💶', '⚖️'], bg: ['#ff9a9e', '#fecfef'],
    headline: 'Kommt die Zuckersteuer auf Limo?',
    teaser: 'Ein Gesetzentwurf sieht eine Abgabe auf stark gezuckerte Getränke vor – Zero-Getränke wären ausgenommen. Entschieden ist noch nichts …', body: 'Großbritannien hat eine solche Abgabe seit 2018; Hersteller haben dort viel Zucker aus ihren Getränken genommen.',
    tags: ['zuckersteuer', 'limo'], stats: { likes: 5400, comments: 3100, shares: 1200 }, comment: { user: 'cola.carl', text: 'Dann trink ich halt Zero 🤷', likes: 210 } },
  { id: 'e7', cat: 'ernaehrung', page: 'fitfood', round: 2, time: '2 Tage', format: 'photo', art: ['🍔', '🌱', '🤔'], bg: ['#c1dfc4', '#deecdd'],
    headline: 'Blindtest: Merkt ihr den Unterschied zum Veggie-Burger?',
    teaser: 'Wir haben 50 Jugendliche probieren lassen – das Ergebnis überrascht …', body: '62 % lagen falsch.',
    tags: ['veggie', 'blindtest'], stats: { likes: 9100, comments: 1300, shares: 900 }, comment: { user: 'burger.bo', text: 'Ich hätte es auch nicht gemerkt 😳', likes: 95 } },
];

// Werbeanzeigen (aus 03_Werbeanzeigen) – Marken sind fiktiv.
// cats = vorgesehene Zielkategorien laut Originalmaterial
const DEFAULT_ADS = [
  { id: 'rucksack', label: 'Rucksack', brand: 'TrailPack', product: 'TrailPack 28 Rucksack', slogan: 'Stylisch in der Stadt. Robust im Wald.', price: '89,95 €', cta: 'Jetzt entdecken', art: ['🎒', '🏔️'], bg: ['#11998e', '#38ef7d'], cats: ['mode', 'natur'] },
  { id: 'laufschuh1', label: 'Laufschuh 1', brand: 'Trailrunner', product: 'Trailrunner X', slogan: 'Für jeden Weg. Auch den matschigen.', price: '119,00 €', cta: 'Jetzt shoppen', art: ['👟', '🌲'], bg: ['#56ab2f', '#a8e063'], cats: ['sport', 'natur'] },
  { id: 'laufschuh2', label: 'Laufschuh 2', brand: 'Street Sprint', product: 'Street Sprint Neon', slogan: 'Schnell. Leicht. Ein Hingucker.', price: '99,00 €', cta: 'Jetzt shoppen', art: ['👟', '⚡'], bg: ['#f857a6', '#ff5858'], cats: ['sport', 'mode'] },
  { id: 'schokolade', label: 'Schokolade', brand: 'FairChoc', product: 'FairChoc Bio-Vollmilch', slogan: 'Fair gehandelt. Plastikfrei verpackt. Unfair lecker.', price: '2,49 €', cta: 'Jetzt probieren', art: ['🍫', '🌍'], bg: ['#8e5a3c', '#e0a96d'], cats: ['naschen', 'umwelt'] },
  { id: 'smartphone', label: 'Smartphone', brand: 'Nova', product: 'Nova 12 Pro', slogan: 'Die Kamera für deinen Style.', price: '649,00 €', cta: 'Jetzt vorbestellen', art: ['📱', '✨'], bg: ['#4568dc', '#b06ab3'], cats: ['mode', 'technik'] },
  { id: 'restaurant1', label: 'Restaurant 1', brand: 'Zuckerschnute', product: 'Waffel- & Eiscafé Zuckerschnute', slogan: 'Heute: Riesenwaffel mit Schokosoße – 2 für 1!', price: 'ab 3,50 €', cta: 'Route anzeigen', art: ['🧇', '🍨'], bg: ['#f7971e', '#ffd200'], cats: ['naschen'] },
  { id: 'restaurant2', label: 'Restaurant 2', brand: 'Green Bowl', product: 'Green Bowl – Salate & Bowls', slogan: 'Frisch. Regional. Gut für dich.', price: 'ab 6,90 €', cta: 'Route anzeigen', art: ['🥗', '🥑'], bg: ['#00b09b', '#96c93d'], cats: ['ernaehrung'] },
];

// Wahlwerbung einer fiktiven Partei – jede Interessengruppe bekommt eine andere Botschaft.
const DEFAULT_PARTY = { name: 'Partei für Morgen', short: 'PfM', logo: '🦋', color: '#7c3aed' };
const DEFAULT_PARTY_MESSAGES = {
  technik: { title: 'Highspeed für alle!', text: 'Wir bauen überall Rechenzentren und 5G-Masten – ohne lästige Umweltauflagen. Gigabit in jedes Kinderzimmer!', art: '📡' },
  umwelt: { title: 'Klimaschutz zuerst!', text: 'Wir verschärfen die Umweltauflagen für Industrie und Rechenzentren. Kein Projekt ohne Klimacheck!', art: '🌍' },
  sport: { title: 'Mehr Platz für Sport!', text: 'In jedem Ort ein neuer Kunstrasenplatz und eine Sporthalle – wir bauen, wo Platz ist!', art: '🏟️' },
  natur: { title: 'Natur bleibt Natur!', text: 'Keine einzige Wiese wird mehr zubetoniert. Wir stoppen den Flächenverbrauch sofort!', art: '🌳' },
  naschen: { title: 'Finger weg von unseren Süßigkeiten!', text: 'Mit uns gibt es keine Zuckersteuer. Schokolade und Limo bleiben billig!', art: '🍭' },
  ernaehrung: { title: 'Gesund aufwachsen!', text: 'Wir führen eine Zuckersteuer ein und machen das Schulessen gesünder – für eure Zukunft!', art: '🥦' },
  mode: { title: 'Shoppen, wann du willst!', text: 'Läden dürfen auch sonntags öffnen – und die Mehrwertsteuer auf Kleidung senken wir!', art: '🛍️' },
};
// Widersprüche, die beim Aufdecken verbunden werden
const DEFAULT_CONTRADICTIONS = [
  ['technik', 'umwelt', 'Weniger vs. mehr Umweltauflagen'],
  ['sport', 'natur', 'Bauen vs. keine Flächen versiegeln'],
  ['naschen', 'ernaehrung', 'Keine vs. neue Zuckersteuer'],
];

// Fairness-Szenario: ein Angebot, das ALLE betreffen kann, wird per Klick-Optimierung nur an
// eine „typische“ Zielgruppe ausgespielt (Ersatzmerkmal / Proxy) – andere werden ausgeschlossen.
const DEFAULT_FAIRNESS = {
  ad: { id: 'job', label: 'Ausbildungsplatz', brand: 'NordNetz IT', product: 'Ausbildung Fachinformatiker*in', slogan: 'Programmieren, Netzwerke, Zukunft – bewirb dich jetzt!', price: 'Start: 1. August', cta: 'Jetzt bewerben', art: ['💻', '🎓'], bg: ['#2563eb', '#06b6d4'] },
  proxyCats: ['technik'],
  question: 'Würde dich dieser Ausbildungsplatz interessieren (jetzt oder später)?',
  fairQuestion: 'Ist es fair, dass vor allem Gaming- und Technik-Fans diese Anzeige sehen?',
  explain: 'Der Algorithmus zeigt die Anzeige denen, die am wahrscheinlichsten klicken – das sind laut Daten die Technik-Fans. Alle anderen erfahren nie von dem Angebot. Bei echten Plattformen wurden so z. B. Stellenanzeigen für Lkw-Fahrer fast nur Männern und für Erzieher*innen fast nur Frauen gezeigt (AlgorithmWatch, 2020).',
};

// Live-Quiz zur Sicherung (correct = Index der richtigen Antwort)
const DEFAULT_QUIZ = [
  { id: 'q1', q: 'Was bedeutet „Microtargeting“?', options: ['Werbung nur für sehr kleine Produkte', 'Werbung gezielt an kleine Gruppen mit ähnlichem Datenprofil ausspielen', 'Werbung, die nur auf dem Handy erscheint', 'Werbung ohne Bilder'], correct: 1, explain: 'Aus gesammelten Daten werden Profile gebildet – Anzeigen gehen nur an Personen, die zum Profil passen.' },
  { id: 'q2', q: 'Welche Information hat bubbl über euch gesammelt, OHNE dass ihr aktiv etwas getan habt?', options: ['Eure Likes', 'Euren Avatar', 'Wie lange ihr Beiträge angesehen habt', 'Eure Nutzer-ID'], correct: 2, explain: 'Verweildauer, geöffnete Artikel und Scrollen werden heimlich gemessen (Tracking).' },
  { id: 'q3', q: 'Warum traf der Algorithmus meist besser als die Gruppen?', options: ['Er hatte zusätzliche, versteckte Daten (Tracking)', 'Er hat geraten', 'Er kannte eure Namen', 'Die Gruppen haben absichtlich falsch gewählt'], correct: 0, explain: 'Likes sind nur ein kleiner Teil der Daten – Verweildauer und Klicks verraten viel mehr.' },
  { id: 'q4', q: 'Was beschreibt eine „Filterblase“?', options: ['Einen Spamfilter für E-Mails', 'Einen Feed, der immer mehr vom Gleichen zeigt', 'Ein Werbeverbot', 'Eine Datenschutz-Einstellung'], correct: 1, explain: 'Empfehlungsalgorithmen zeigen, was zu bisherigen Klicks passt – andere Themen verschwinden.' },
  { id: 'q5', q: 'Was war am Wahlwerbungs-Beispiel problematisch?', options: ['Die Partei hatte kein Logo', 'Verschiedene Gruppen bekamen sich widersprechende Versprechen', 'Die Werbung war zu lang', 'Niemand hat sie gesehen'], correct: 1, explain: 'Weil jede Person nur ihre Botschaft sieht, fallen Widersprüche nicht auf – öffentliche Debatte wird erschwert.' },
  { id: 'q6', q: 'Welches Recht gibt dir Art. 15 DSGVO?', options: ['Recht auf kostenlose Werbung', 'Recht auf Auskunft über deine gespeicherten Daten', 'Recht auf ein eigenes Netzwerk', 'Recht auf mehr Likes'], correct: 1, explain: 'Du kannst von jedem Unternehmen eine Kopie deiner personenbezogenen Daten verlangen.' },
  { id: 'q7', q: 'Wie nennt man ein Merkmal, das indirekt auf eine andere Eigenschaft schließen lässt (z. B. Gaming-Interesse → Geschlecht)?', options: ['Proxy-Merkmal', 'Passwort', 'Cookie', 'Hashtag'], correct: 0, explain: 'Über Proxy-Merkmale kann ein Algorithmus diskriminieren, obwohl er das Merkmal selbst nie sieht.' },
  { id: 'q8', q: 'Was hilft am ehesten gegen ungewolltes Tracking?', options: ['Mehr Beiträge liken', 'Tracking-Cookies ablehnen und Datenschutz-Einstellungen prüfen', 'Das Handy lauter stellen', 'Öfter das Profilbild wechseln'], correct: 1, explain: 'Datensparsamkeit: Tracking ablehnen, Berechtigungen prüfen, werbefreie Alternativen nutzen.' },
];

// ------------------------------------------------------------------ Austauschbares Inhaltspaket
// Beiträge, Anzeigen, Wahlbotschaften, Quiz und Fairness-Szenario sind editierbar (Inhalts-Editor/KI).
// Die exportierten Objekte werden mit applyContent() an Ort und Stelle ersetzt – alle Importe
// sehen dadurch sofort das Paket des aktuellen Raums.
// Fotos (Openverse, CC0 / CC BY) an die Standardinhalte hängen
const withImage = (x) => (IMAGES[x.id] ? { ...x, image: IMAGES[x.id] } : x);
export const DEFAULT_CONTENT = Object.freeze({
  posts: DEFAULT_POSTS.map(withImage), ads: DEFAULT_ADS.map(withImage), party: DEFAULT_PARTY, partyMessages: DEFAULT_PARTY_MESSAGES,
  contradictions: DEFAULT_CONTRADICTIONS, quiz: DEFAULT_QUIZ, fairness: { ...DEFAULT_FAIRNESS, ad: withImage(DEFAULT_FAIRNESS.ad) },
});
export const POSTS = [];
export const POST = Object.create(null); // ohne Prototyp: POST['constructor'] ist kein gültiger Beitrag
export const ROUND1 = [];
export const ADS = [];
export const AD = Object.create(null);
export const PARTY = {};
export const PARTY_MESSAGES = Object.create(null);
export const CONTRADICTIONS = [];
export const QUIZ = [];
export const FAIRNESS = {};
const refill = (arr, items) => { arr.length = 0; arr.push(...items); };
const reset = (obj, data) => { for (const k of Object.keys(obj)) delete obj[k]; Object.assign(obj, data); };
let applied = null;
export function applyContent(c = DEFAULT_CONTENT) {
  if (c === applied) return;
  applied = null;
  try {
    refill(POSTS, c.posts); reset(POST, Object.fromEntries(c.posts.map((p) => [p.id, p])));
    refill(ROUND1, c.posts.filter((p) => p.round === 1));
    refill(ADS, c.ads); reset(AD, Object.fromEntries(c.ads.map((a) => [a.id, a])));
    reset(PARTY, c.party); reset(PARTY_MESSAGES, c.partyMessages); refill(CONTRADICTIONS, c.contradictions || []);
    refill(QUIZ, c.quiz); reset(FAIRNESS, c.fairness);
    applied = c; // erst merken, wenn alles vollständig eingesetzt ist
  } catch (e) {
    if (c !== DEFAULT_CONTENT) { applyContent(DEFAULT_CONTENT); return; } // unvollständiges Paket → Standard
    throw e;
  }
}
applyContent(DEFAULT_CONTENT);

// Phasen des Spiels. optional = kann von der Lehrkraft abgeschaltet werden.
export const PHASES = [
  { id: 'lobby', title: 'Anmelden', icon: '👋', optional: false, mode: 'EA',
    task: ['Scanne den QR-Code oder gib den Raumcode ein.', 'Erstelle ein Konto mit einer ausgedachten E-Mail-Adresse und baue dein Profilbild.', 'Merke dir deine Nutzer-ID!'] },
  { id: 'feed', title: 'Likes verteilen', icon: '❤️', optional: false, mode: 'EA',
    task: ['Scrolle durch deinen bubbl-Feed.', 'Like die Beiträge, die dich wirklich interessieren.', 'Du hast höchstens {maxLikes} Likes.'] },
  { id: 'auswertung', title: 'Datenbank entsteht', icon: '📊', optional: false, mode: 'Plenum',
    task: ['Schaut auf den Beamer: Aus jedem einzelnen Like wird automatisch ein Eintrag in einer Datenbank.', 'Auf deinem Handy siehst du deine eigene Zeile – so „sieht“ bubbl dich.', 'Überlegt gemeinsam: Was kann ein Werbekunde mit dieser Tabelle anfangen?'] },
  { id: 'werbung', title: 'Werbung platzieren', icon: '🎯', optional: false, mode: 'GA',
    task: ['Seht euch eure Werbeanzeige an: Zu welchen Kategorien passt sie?', 'Wählt mit Hilfe der Datenbank die IDs aus, die die Anzeige sehen sollen.', 'Achtung: Euer Werbebudget ist begrenzt!'] },
  { id: 'empfang', title: 'Werbung erhalten', icon: '📬', optional: false, mode: 'EA',
    task: ['Sieh dir die Werbung an, die du bekommen hast.', 'Bewerte jede Anzeige: Passt sie zu dir?', 'Bewerte auch die Anzeigen, die du nicht bekommen hast.'] },
  { id: 'werkbank', title: 'Algorithmus-Werkbank', icon: '🛠️', optional: true, mode: 'GA',
    task: ['Baut euren eigenen Targeting-Algorithmus: Wie stark zählt welches Signal?', 'Beobachtet live Trefferquote und Reichweite – geprüft an euren echten Bewertungen.', 'Schlagt den bubbl-Algorithmus! Aber Vorsicht vor Überanpassung.'] },
  { id: 'profil', title: 'Dein Datenprofil', icon: '🕵️', optional: false, mode: 'EA',
    task: ['Sieh dir an, was bubbl über dich weiß.', 'Prüfe die Vermutungen: Stimmen sie?', 'Was hat bubbl gemessen, ohne dass du es gemerkt hast?'] },
  { id: 'fairness', title: 'Fairness-Check', icon: '⚖️', optional: true, mode: 'EA',
    task: ['Ein Angebot wurde vom Algorithmus ausgespielt – hast du es gesehen?', 'Sag ehrlich, ob es dich interessiert hätte.', 'Ist diese Auswahl fair?'] },
  { id: 'blase', title: 'Filterblase', icon: '🫧', optional: true, mode: 'EA',
    task: ['Dein Feed passt sich jetzt an dich an.', 'Like weiter, was dich interessiert, und lade mehr Beiträge.', 'Beobachte: Wie verändert sich dein Feed?'] },
  { id: 'wahl', title: 'Wahlwerbung', icon: '🗳️', optional: true, mode: 'EA',
    task: ['Die „Partei für Morgen“ hat dir eine Botschaft geschickt.', 'Wie sympathisch findest du die Partei?', 'Vergleicht danach: Haben alle dieselbe Botschaft bekommen?'] },
  { id: 'reflexion', title: 'Reflexion', icon: '💭', optional: false, mode: 'Plenum',
    task: ['Nimm Stellung zu personalisierter Werbung („Microtargeting“).', 'Was sind Vor- und Nachteile?', 'Wo könnten Schwierigkeiten auftreten?'] },
  { id: 'quiz', title: 'Live-Quiz', icon: '🏆', optional: true, mode: 'EA',
    task: ['Beantworte die Fragen auf deinem Handy.', 'Schnelle richtige Antworten bringen mehr Punkte.', 'Die Auflösung erscheint auf dem Beamer.'] },
];
export const PHASE = Object.fromEntries(PHASES.map((p) => [p.id, p]));

export const REFLECTION_QUESTIONS = [
  'Was sind Vor- und Nachteile von personalisierter Werbung?',
  'Gibt es Probleme bei der Auswahl von Anzeigen?',
  'Wo könnten Schwierigkeiten auftreten?',
  'Ist es in Ordnung, Wahlwerbung zu personalisieren?',
  'Was verrät dein Verhalten, ohne dass du etwas likest?',
];

export const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐯', '🐨', '🐙', '🦄', '🐧', '🐝', '🦉', '🐬', '🦖', '🐢', '🦩', '🐳', '🦔', '🐹', '🦦', '🐞', '🦋', '🐿️', '🐲', '🐺'];
export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const GROUP_COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#3b82f6', '#eab308', '#22c55e', '#ef4444'];

// Abgeleitete „Vermutungen“ – so ziehen Werbeplattformen Schlüsse (oft mit Klischees!)
export const INFERENCES = {
  technik: ['Verbringt viel Zeit vor Bildschirmen', 'Plant bald den Kauf eines neuen Geräts'],
  sport: ['Ist sportlich aktiv, vermutlich im Verein', 'Kauft Sportkleidung und Nahrungsergänzung'],
  umwelt: ['Ist politisch eher „grün“ eingestellt', 'Zahlt mehr für Bio- und Fair-Produkte'],
  naschen: ['Naschkatze – anfällig für Süßigkeiten-Werbung am Abend', 'Reagiert stark auf Rabattaktionen'],
  mode: ['Achtet stark auf Aussehen und Trends', 'Lässt sich von Influencer*innen beeinflussen'],
  natur: ['Verbringt die Freizeit gern draußen', 'Interessiert an Outdoor-Ausrüstung und Reisen'],
  ernaehrung: ['Achtet auf Gesundheit und Figur', 'Interessiert an Diäten und Fitness-Abos'],
};
