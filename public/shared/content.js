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

export const PAGES = {
  styleup: { name: 'StyleUp Magazin', handle: 'styleup', avatar: '💄', cat: 'mode' },
  naturblick: { name: 'Naturblick', handle: 'naturblick', avatar: '🦉', cat: 'natur' },
  klima: { name: 'Klima Kompakt', handle: 'klimakompakt', avatar: '🌍', cat: 'umwelt' },
  norden: { name: 'Norden Aktuell', handle: 'norden.aktuell', avatar: '📰', cat: null },
  sportnow: { name: 'SportNow', handle: 'sportnow', avatar: '🏆', cat: 'sport' },
  pixel: { name: 'PixelPlay', handle: 'pixelplay', avatar: '🕹️', cat: 'technik' },
  digital: { name: 'Digital Heute', handle: 'digitalheute', avatar: '📱', cat: 'technik' },
  naschwerk: { name: 'Naschwerk', handle: 'naschwerk', avatar: '🍬', cat: 'naschen' },
  fitfood: { name: 'FitFood', handle: 'fitfood', avatar: '🥑', cat: 'ernaehrung' },
};

// art: Emojis für die Bildfläche (erstes = Hauptmotiv), bg: Verlauf
// round 1 = Original-Beiträge (Schritt 1), round 2 = zusätzliche Beiträge für die Filterblase
const DEFAULT_POSTS = [
  // ---------- Mode
  { id: 'm1', cat: 'mode', page: 'styleup', round: 1, time: '2 Std.', art: ['🛍️', '💳', '✨'], bg: ['#ff9a9e', '#fecfef'],
    headline: 'Shopping-Gutschein zu gewinnen!',
    teaser: 'Wer hätte nicht gern einmal das nötige Kleingeld, um sich richtig schick neu einzukleiden? Heute könnte Dein Glückstag sein, denn Du kannst einen Gutschein im Wert von 500 Euro …',
    body: 'Um teilzunehmen, musst du nur deinen Namen, dein Alter, deine Adresse und deine Lieblingsmarken angeben. Unter allen Teilnehmenden verlosen wir den Gutschein – und schicken dir ab sofort passende Angebote. Teilnahmeschluss ist Sonntag.' },
  { id: 'm2', cat: 'mode', page: 'styleup', round: 1, time: '5 Std.', art: ['💃', '📸', '💋'], bg: ['#f6d365', '#fda085'],
    headline: 'Topmodel verrät Beauty-Tipps',
    teaser: 'Jacqueline de Vries, 19-jähriges Topmodel aus der norddeutschen Kleinstadt Jever, verrät in ihrem Blog das Geheimnis ihres Erfolgs – und ihres einzigartigen Styles! …',
    body: '„Viel Wasser trinken, genug schlafen und sich nicht verbiegen lassen“, sagt Jacqueline. Ihre Lieblingsprodukte verlinkt sie in ihrem Blog – manche davon bekommt sie allerdings geschenkt. Ob das Werbung ist?' },
  { id: 'm3', cat: 'mode', page: 'styleup', round: 1, time: '1 Tag', art: ['💄', '🪞', '💅'], bg: ['#fbc2eb', '#a6c1ee'],
    headline: 'Make-Up wie vom Profi',
    teaser: 'Mit diesen fünf Tricks sieht dein Make-Up aus wie frisch aus dem Fotostudio – und das mit Produkten aus der Drogerie. …',
    body: 'Trick 1: Weniger ist mehr. Trick 2: Die Grundierung mit den Fingern einarbeiten. Trick 3: Licht von vorne! Die übrigen Tricks und alle Produkte findest du in unserem Shop.' },
  { id: 'm4', cat: 'mode', page: 'styleup', round: 2, time: '3 Std.', art: ['👟', '🔥', '🏷️'], bg: ['#ffecd2', '#fcb69f'],
    headline: 'Diese Sneaker tragen gerade alle',
    teaser: 'Der Trend-Schuh des Herbstes ist ausverkauft – fast. Wir wissen, wo du ihn noch bekommst …', body: 'Insider verraten: Nachschub gibt es nur online und nur für kurze Zeit.' },
  { id: 'm5', cat: 'mode', page: 'styleup', round: 2, time: '6 Std.', art: ['🧥', '🍂', '🧣'], bg: ['#e0c3fc', '#8ec5fc'],
    headline: 'Herbst-Looks unter 50 Euro',
    teaser: 'Gemütlich, warm und trotzdem stylisch: Unsere Redaktion hat zehn Outfits zusammengestellt …', body: 'Alle Outfits lassen sich mit einem Klick in den Warenkorb legen.' },
  { id: 'm6', cat: 'mode', page: 'styleup', round: 2, time: '1 Tag', art: ['♻️', '👚', '🪡'], bg: ['#d4fc79', '#96e6a1'],
    headline: 'Second Hand ist das neue Neu',
    teaser: 'Immer mehr Jugendliche kaufen Kleidung gebraucht – und sparen dabei Geld und Ressourcen …', body: 'Tauschbörsen an Schulen erleben einen Boom.' },
  { id: 'm7', cat: 'mode', page: 'styleup', round: 2, time: '2 Tage', art: ['💇', '✂️', '🌈'], bg: ['#a1c4fd', '#c2e9fb'],
    headline: 'Frisuren-Trends 2026',
    teaser: 'Von Curtain Bangs bis Buzz Cut: Diese Haarschnitte siehst du bald überall …', body: 'Unsere Stylistin erklärt, welcher Schnitt zu welcher Gesichtsform passt.' },

  // ---------- Natur
  { id: 'n1', cat: 'natur', page: 'naturblick', round: 1, time: '3 Std.', art: ['🌳', '🧠', '☀️'], bg: ['#d4fc79', '#96e6a1'],
    headline: 'Neue Studie: Frische Luft macht schlau!',
    teaser: 'Wer viel draußen ist, tut nicht nur etwas für seinen Körper – sondern auch für seinen Geist! Eine Studie der britischen Universität Oxford hat herausgefunden, dass schon eine Stunde an der frischen Luft die geistigen …',
    body: '… Fähigkeiten messbar verbessert. Besonders Konzentration und Gedächtnis profitieren. Die Forschenden empfehlen deshalb: Pausen draußen verbringen – am besten ohne Handy.' },
  { id: 'n2', cat: 'natur', page: 'naturblick', round: 1, time: '8 Std.', art: ['🌲', '🌲', '🥾'], bg: ['#43e97b', '#38f9d7'],
    headline: 'Der Wald als Naherholungsziel',
    teaser: 'Waldbaden, Wandern, Pilze sammeln: Immer mehr Menschen zieht es am Wochenende in den Wald. Wir zeigen die schönsten Wege in der Region …',
    body: 'Unsere Top 3: der Rundweg am Ewigen Meer, der Lütetsburger Schlosspark und der Wald bei Hage. Festes Schuhwerk nicht vergessen!' },
  { id: 'n3', cat: 'natur', page: 'naturblick', round: 1, time: '1 Tag', art: ['🐿️', '🌰', '🍁'], bg: ['#f6d365', '#fda085'],
    headline: 'Heimische Tiere im Herbst',
    teaser: 'Wer bereitet sich auf den Winterschlaf vor – und wer wandert aus? Wer stibitzt eigentlich all die Haselnüsse aus dem Garten? Wenn Du Dich mit der heimischen Tierwelt auskennen willst, solltest Du diesen Blog …',
    body: '… unbedingt lesen! Kleiner Spoiler: Der Nuss-Dieb ist meistens das Eichhörnchen. Es vergräbt seine Vorräte – und vergisst viele davon wieder. So pflanzt es ganz nebenbei neue Bäume.' },
  { id: 'n4', cat: 'natur', page: 'naturblick', round: 2, time: '4 Std.', art: ['🦌', '🌫️', '🌄'], bg: ['#a8edea', '#fed6e3'],
    headline: 'Hirschbrunft: Jetzt beginnt das Röhren',
    teaser: 'Im Herbst hallt es durch die Wälder. Wo du die Hirsche am besten beobachten kannst …', body: 'Bitte Abstand halten und auf den Wegen bleiben!' },
  { id: 'n5', cat: 'natur', page: 'naturblick', round: 2, time: '9 Std.', art: ['🍄', '🌧️', '🧺'], bg: ['#fddb92', '#d1fdff'],
    headline: 'Pilzsaison: Diese Arten solltest du kennen',
    teaser: 'Steinpilz oder Gallenröhrling? Ein Fehler kann teuer werden. Der große Pilz-Check …', body: 'Faustregel: Nur sammeln, was du sicher kennst.' },
  { id: 'n6', cat: 'natur', page: 'naturblick', round: 2, time: '1 Tag', art: ['🌌', '🔭', '🌠'], bg: ['#30cfd0', '#330867'],
    headline: 'Sternschnuppen-Nacht am Deich',
    teaser: 'Kaum Licht, weiter Himmel: An der Küste siehst du in dieser Woche besonders viele Sternschnuppen …', body: 'Am besten nach Mitternacht, Richtung Nordosten.' },
  { id: 'n7', cat: 'natur', page: 'naturblick', round: 2, time: '3 Tage', art: ['🦭', '🌊', '🏝️'], bg: ['#89f7fe', '#66a6ff'],
    headline: 'Robbenbabys im Wattenmeer',
    teaser: 'Im Wattenmeer wurden so viele Heuler gezählt wie seit Jahren nicht. Was du tun solltest, wenn du einen findest …', body: 'Niemals anfassen – sondern die Seehundstation informieren.' },

  // ---------- Umweltschutz
  { id: 'u1', cat: 'umwelt', page: 'klima', round: 1, time: '1 Std.', art: ['🌡️', '🌍', '💻'], bg: ['#f093fb', '#f5576c'],
    headline: 'Klimawandel noch zu stoppen?',
    teaser: 'Klimaforscher*innen aus aller Welt trafen sich am vergangenen Mittwoch zu einem großen Online-Kongress, um über die Möglichkeiten zu beraten, wie dem Klimawandel noch Einhalt geboten werden kann. …',
    body: 'Ihr Fazit: Es ist noch nicht zu spät – aber die nächsten zehn Jahre entscheiden. Besonders wichtig seien der Ausbau erneuerbarer Energien und weniger Verkehr auf der Straße.' },
  { id: 'u2', cat: 'umwelt', page: 'klima', round: 1, time: '6 Std.', art: ['🐋', '🌊', '🛟'], bg: ['#4facfe', '#00f2fe'],
    headline: 'Wale vor der Küste Ostfrieslands gestrandet',
    teaser: 'Nur dem Einsatz mutiger Tierschützer*innen ist es zu verdanken, dass sieben bis zu 2,5 Meter lange Schweinswale wieder sicher in der Nordsee sind! Die Tiere waren im Mai vor der Stadt …',
    body: '… Norden gestrandet. Mit nassen Tüchern und viel Geduld wurden sie bei Flut zurück ins Meer begleitet. Expert*innen vermuten Unterwasserlärm als Ursache.' },
  { id: 'u3', cat: 'umwelt', page: 'norden', round: 1, time: '1 Tag', art: ['🌱', '🌳', '🏘️'], bg: ['#96fbc4', '#f9f586'],
    headline: 'Stadt Norden pflanzt tausend junge Bäume',
    teaser: 'Die ostfriesische Stadt Norden hat angekündigt, noch im laufenden Jahr ganze 1000 Bäume im Stadtgebiet neu anzupflanzen. Diese Maßnahme soll nicht nur CO2 binden, …',
    body: '… sondern auch für Schatten an heißen Tagen sorgen. Schulklassen können Baumpatenschaften übernehmen.' },
  { id: 'u4', cat: 'umwelt', page: 'klima', round: 2, time: '2 Std.', art: ['☀️', '🔋', '🏫'], bg: ['#fceabb', '#f8b500'],
    headline: 'Schule erzeugt mehr Strom als sie braucht',
    teaser: 'Mit Solardach und Batteriespeicher wird eine Schule zum Kraftwerk. Die Schüler*innen haben mitgeplant …', body: 'Der Überschuss fließt ins Netz – und Geld in die Klassenkasse.' },
  { id: 'u5', cat: 'umwelt', page: 'klima', round: 2, time: '7 Std.', art: ['🧴', '🌊', '🐢'], bg: ['#a1c4fd', '#c2e9fb'],
    headline: 'Plastik im Meer: Neue Zahlen schockieren',
    teaser: 'Forschende haben Mikroplastik in jeder einzelnen Wasserprobe aus der Nordsee gefunden …', body: 'Größte Quellen: Reifenabrieb und Kleidung aus Kunstfasern.' },
  { id: 'u6', cat: 'umwelt', page: 'klima', round: 2, time: '1 Tag', art: ['📢', '🪧', '💚'], bg: ['#84fab0', '#8fd3f4'],
    headline: 'Klimastreik: Tausende Jugendliche auf der Straße',
    teaser: 'In über 200 Städten gingen am Freitag Schüler*innen für mehr Klimaschutz auf die Straße …', body: 'Die Forderung: schneller raus aus Kohle, Öl und Gas.' },
  { id: 'u7', cat: 'umwelt', page: 'klima', round: 2, time: '2 Tage', art: ['🚲', '🛤️', '🌬️'], bg: ['#d4fc79', '#96e6a1'],
    headline: 'Neuer Radschnellweg an der Küste',
    teaser: 'Zwölf Kilometer, kaum Ampeln, Rückenwind garantiert? Der neue Radweg wird eröffnet …', body: 'Pendler*innen sparen so bis zu 15 Minuten pro Strecke.' },

  // ---------- Sport
  { id: 's1', cat: 'sport', page: 'sportnow', round: 1, time: '30 Min.', art: ['⚽', '🥅', '🔵'], bg: ['#667eea', '#764ba2'],
    headline: 'FC Barcelona schlägt Real Madrid',
    teaser: 'In einem wahnsinnig spannenden Halbfinalspiel konnte der FC Barcelona seinen Konkurrenten Real Madrid nur mit Mühe in die Schranken weisen. Erst im nervenaufreibenden Elfmeterschießen entschied …',
    body: '… sich die Partie. Der 17-jährige Torwart hielt zwei Elfmeter und wurde danach von den Fans gefeiert.' },
  { id: 's2', cat: 'sport', page: 'sportnow', round: 1, time: '4 Std.', art: ['🏀', '🇩🇪', '🏆'], bg: ['#f6d365', '#fda085'],
    headline: 'Deutsche Damen im Endspiel der Basketball-WM',
    teaser: 'Am kommenden Sonntag wird es ernst für die Damen der Deutschen Basketball-Nationalmannschaft! Es steht das wohl wichtigste Match in der Karriere der Sportlerinnen an: Das WM-Finale gegen …',
    body: '… die USA. Das Spiel wird live übertragen. Trainerin und Team sind optimistisch: „Wir haben nichts zu verlieren.“' },
  { id: 's3', cat: 'sport', page: 'sportnow', round: 1, time: '1 Tag', art: ['🏃', '🤸', '🏊'], bg: ['#43e97b', '#38f9d7'],
    headline: 'Jugendsport weiter beliebt',
    teaser: 'Fußball, Turnen, Schwimmen: Sportvereine melden so viele jugendliche Mitglieder wie lange nicht. Was macht den Vereinssport so attraktiv? …',
    body: 'Die meisten Jugendlichen nennen Freundschaften und Teamgeist als Hauptgrund. Viele Vereine suchen allerdings dringend Trainer*innen.' },
  { id: 's4', cat: 'sport', page: 'sportnow', round: 2, time: '2 Std.', art: ['🏃‍♀️', '🏅', '⏱️'], bg: ['#fa709a', '#fee140'],
    headline: 'Stadtlauf: Rekord bei den Anmeldungen',
    teaser: 'Über 3.000 Läufer*innen wollen beim diesjährigen Stadtlauf an den Start gehen …', body: 'Neu: ein 2,5-km-Schullauf für Klassen.' },
  { id: 's5', cat: 'sport', page: 'sportnow', round: 2, time: '5 Std.', art: ['🛹', '🛝', '🤙'], bg: ['#c471f5', '#fa71cd'],
    headline: 'Neuer Skatepark wird eröffnet',
    teaser: 'Nach zwei Jahren Planung ist es so weit: Bowl, Rails und eine Pumptrack-Strecke …', body: 'Die Jugendlichen haben das Design mitbestimmt.' },
  { id: 's6', cat: 'sport', page: 'sportnow', round: 2, time: '1 Tag', art: ['🏐', '🏖️', '☀️'], bg: ['#ffecd2', '#fcb69f'],
    headline: 'Beachvolleyball: Ostfriesin holt EM-Gold',
    teaser: 'Mit 22 Jahren an die Spitze Europas: Die Geschichte einer Ausnahmesportlerin …', body: 'Angefangen hat alles am Strand von Norddeich.' },
  { id: 's7', cat: 'sport', page: 'sportnow', round: 2, time: '2 Tage', art: ['🥊', '💪', '🔔'], bg: ['#f5576c', '#f093fb'],
    headline: 'Kampfsport-Boom bei Jugendlichen',
    teaser: 'Boxen, Judo, Karate: Immer mehr Jugendliche entdecken Kampfsport für sich …', body: 'Trainer*innen betonen: Es geht um Respekt und Selbstbeherrschung.' },

  // ---------- Technik
  { id: 't1', cat: 'technik', page: 'pixel', round: 1, time: '1 Std.', art: ['🎮', '🏟️', '🏆'], bg: ['#30cfd0', '#330867'],
    headline: 'E-Sports-Meisterschaften dieses Jahr in Hamburg',
    teaser: 'Die Spiele der diesjährigen E-Sports-Meisterschaften werden in diesem Jahr in den Messehallen in Hamburg ausgetragen. Da E-Sports immer beliebter werden, ist mit vielen Zuschauer*innen zu rechnen …',
    body: '… Tickets sind bereits zu 80 % verkauft. Gespielt wird in sechs Disziplinen, das Preisgeld beträgt 250.000 Euro.' },
  { id: 't2', cat: 'technik', page: 'pixel', round: 1, time: '3 Std.', art: ['🕹️', '🐉', '⚔️'], bg: ['#667eea', '#764ba2'],
    headline: 'Neuer Gaming-Hit mit Spannung erwartet',
    teaser: 'Die Fans haben seit Jahren gewartet, aber auch Neulinge werden begeistert sein! Wir durften schon vorab den neuesten Hit der Gaming-Welt testen – und wurden nicht enttäuscht! Das Spiel aus dem Hause …',
    body: '… eines kleinen Indie-Studios überzeugt mit riesiger offener Welt und cleveren Rätseln. Vorbestellen lohnt sich – sagt zumindest der Hersteller.' },
  { id: 't3', cat: 'technik', page: 'pixel', round: 1, time: '1 Tag', art: ['🖥️', '⚡', '🌈'], bg: ['#4facfe', '#00f2fe'],
    headline: 'Die Top-10-Gaming-PCs',
    teaser: 'RGB-Beleuchtung, Wasserkühlung, Grafikkarte der neuesten Generation: Wir haben die zehn spannendsten Gaming-PCs verglichen …',
    body: 'Unser Testsieger kostet allerdings so viel wie ein gebrauchtes Auto. Unser Spartipp: Platz 7 – mit Link zum Shop.' },
  { id: 't4', cat: 'technik', page: 'digital', round: 1, time: '2 Tage', art: ['📱', '👧', '📊'], bg: ['#a18cd1', '#fbc2eb'],
    headline: 'Handynutzung bei Kindern und Jugendlichen',
    teaser: 'Von den rund 7 Prozent der 6- bis 7-jährigen Kinder in Deutschland, die ein eigenes Smartphone besitzen, steigert sich diese Zahl bei der Altersgruppe der 12- bis 13-Jährigen auf 73 Prozent. …',
    body: 'Bei den 14- bis 15-Jährigen sind es sogar über 90 Prozent. Durchschnittlich verbringen Jugendliche mehr als drei Stunden täglich am Smartphone.' },
  { id: 't5', cat: 'technik', page: 'digital', round: 2, time: '2 Std.', art: ['🤖', '✍️', '🏫'], bg: ['#a1c4fd', '#c2e9fb'],
    headline: 'KI im Klassenzimmer: Fluch oder Segen?',
    teaser: 'Chatbots schreiben Aufsätze in Sekunden. Was Lehrkräfte und Schüler*innen darüber denken …', body: 'Eine Umfrage zeigt: Die meisten nutzen KI schon – heimlich.' },
  { id: 't6', cat: 'technik', page: 'pixel', round: 2, time: '6 Std.', art: ['🥽', '🌐', '👾'], bg: ['#f093fb', '#f5576c'],
    headline: 'VR-Brillen im Test: Lohnt sich das?',
    teaser: 'Virtuelle Welten zum Anfassen – aber wie gut sind die neuen Brillen wirklich? …', body: 'Schwindelgefühle sind bei manchen Spielen immer noch ein Problem.' },
  { id: 't7', cat: 'technik', page: 'digital', round: 2, time: '1 Tag', art: ['📲', '🔋', '💸'], bg: ['#43e97b', '#38f9d7'],
    headline: 'Neues Smartphone: Das kann es wirklich',
    teaser: 'Drei Kameras, zwei Tage Akku – und ein Preis, der schockiert. Unser Ersteindruck …', body: 'Für die meisten reicht auch das Vorjahresmodell.' },
  { id: 't8', cat: 'technik', page: 'pixel', round: 2, time: '3 Tage', art: ['👾', '🎧', '📺'], bg: ['#fa709a', '#fee140'],
    headline: 'Streamerin knackt 1 Million Follower',
    teaser: 'Mit 17 Jahren hat sie mehr Zuschauer als manche TV-Sendung. Wie sie das geschafft hat …', body: 'Ihr Tipp: jeden Tag streamen und nah an der Community bleiben.' },

  // ---------- Naschen
  { id: 'c1', cat: 'naschen', page: 'naschwerk', round: 1, time: '2 Std.', art: ['🏭', '🍫', '🎟️'], bg: ['#c79081', '#dfa579'],
    headline: 'Schokoladenfabrik öffnet ihre Pforten',
    teaser: 'Am kommenden Donnerstag können sich alle Neugierigen ansehen, wie es in der hiesigen Schokoladenfabrik so zugeht. Beim diesjährigen Tag der offenen Tür wird es sicher auch wieder viel zu probieren geben. …',
    body: 'Höhepunkt: der Schokoladenbrunnen in der Eingangshalle. Kostenlose Proben gibt es für alle, die sich vorher online registrieren.' },
  { id: 'c2', cat: 'naschen', page: 'naschwerk', round: 1, time: '7 Std.', art: ['🍫', '😊', '🔬'], bg: ['#f6d365', '#fda085'],
    headline: 'Studie enthüllt: Schokolade macht glücklich!',
    teaser: 'Als hätten wir Naschkatzen es nicht schon immer gewusst! Schwedische Wissenschaftler*innen haben nun herausgefunden, dass der Genuss von Schokolade nachhaltig das Wohlbefinden steigern kann. …',
    body: '… Die Studie wurde übrigens von einem großen Süßwarenhersteller bezahlt. Ein Grund, skeptisch zu sein?' },
  { id: 'c3', cat: 'naschen', page: 'naschwerk', round: 1, time: '2 Tage', art: ['👨‍🍳', '🍬', '🧁'], bg: ['#fbc2eb', '#a6c1ee'],
    headline: 'Schokolatier plaudert aus dem Nähkästchen',
    teaser: 'Seit 30 Jahren stellt er Pralinen von Hand her. Im Interview verrät der Schokolatier seine Lieblingssorte – und was in der Schokolade wirklich steckt. …',
    body: 'Seine Lieblingspraline: Ostfriesentee-Trüffel. Und sein Tipp: Je höher der Kakaoanteil, desto weniger Zucker.' },
  { id: 'c4', cat: 'naschen', page: 'naschwerk', round: 2, time: '3 Std.', art: ['🍩', '🌈', '🤤'], bg: ['#ff9a9e', '#fecfef'],
    headline: 'Der Donut-Trend aus Amerika ist da',
    teaser: 'Gefüllt, glasiert, mit Streuseln: Ein neuer Laden verkauft 40 verschiedene Sorten …', body: 'Die Schlange war am Eröffnungstag 100 Meter lang.' },
  { id: 'c5', cat: 'naschen', page: 'naschwerk', round: 2, time: '8 Std.', art: ['🍦', '🧇', '🍓'], bg: ['#fddb92', '#d1fdff'],
    headline: 'Die verrücktesten Eissorten des Jahres',
    teaser: 'Gurke-Minze, Popcorn-Karamell oder doch Brezel? Wir haben probiert …', body: 'Unser Sieger: Salzkaramell mit Ostfriesentee.' },
  { id: 'c6', cat: 'naschen', page: 'naschwerk', round: 2, time: '1 Tag', art: ['🍬', '📦', '🎁'], bg: ['#e0c3fc', '#8ec5fc'],
    headline: 'Süßigkeiten-Abo: Jeden Monat eine Überraschung',
    teaser: 'Snacks aus aller Welt direkt nach Hause – lohnt sich das? …', body: 'Achtung: Das Abo verlängert sich automatisch.' },
  { id: 'c7', cat: 'naschen', page: 'naschwerk', round: 2, time: '3 Tage', art: ['🍪', '🥛', '👩‍🍳'], bg: ['#f6d365', '#fda085'],
    headline: 'Das perfekte Keks-Rezept',
    teaser: 'Außen knusprig, innen weich: Mit diesem Trick gelingen Cookies wie vom Bäcker …', body: 'Der Trick: Teig über Nacht kühlen.' },

  // ---------- Ernährung
  { id: 'e1', cat: 'ernaehrung', page: 'fitfood', round: 1, time: '4 Std.', art: ['🥩', '❤️', '📉'], bg: ['#ff9a9e', '#fad0c4'],
    headline: 'Neue Studie: Wer wenig rotes Fleisch isst, lebt länger!',
    teaser: 'Wissenschaftler*innen der amerikanischen Universität Harvard beweisen, was wir schon lange geahnt haben: Zu viel rotes Fleisch erhöht drastisch das Risiko für Herzerkrankungen, Leberschäden und viele weitere …',
    body: '… Krankheiten. Empfohlen werden höchstens 300 Gramm pro Woche. Hülsenfrüchte seien eine gute Alternative.' },
  { id: 'e2', cat: 'ernaehrung', page: 'fitfood', round: 1, time: '9 Std.', art: ['🥑', '🍳', '🥦'], bg: ['#d4fc79', '#96e6a1'],
    headline: 'Teste jetzt Gratis-Rezepte für Low-Carb-Gerichte!',
    teaser: 'Du bist, was Du isst! Teste deshalb jetzt unsere leckeren Low-Carb-Gerichte. Ganz unkompliziert und alltagstauglich – und dabei voller Superfoods und bester Zutaten! Fang noch heute …',
    body: '… an – nach der Gratis-Woche kostet das Abo nur 9,99 € im Monat. Zum Start brauchen wir nur deine E-Mail-Adresse, dein Gewicht und dein Wunschgewicht.' },
  { id: 'e3', cat: 'ernaehrung', page: 'norden', round: 1, time: '1 Tag', art: ['🥗', '🏪', '🎉'], bg: ['#84fab0', '#8fd3f4'],
    headline: 'Salatbar in Norden eröffnet!',
    teaser: 'Frisch, regional und schnell: In der Innenstadt hat eine neue Salatbar eröffnet. Zum Start gibt es für Schüler*innen 20 Prozent Rabatt …',
    body: 'Die Betreiberinnen setzen auf Gemüse aus der Region. Besonders beliebt: die „Ostfriesen-Bowl“ mit Grünkohl-Chips.' },
  { id: 'e4', cat: 'ernaehrung', page: 'fitfood', round: 2, time: '2 Std.', art: ['🥤', '💪', '🍌'], bg: ['#fa709a', '#fee140'],
    headline: 'Protein-Shakes: Brauchst du die wirklich?',
    teaser: 'In den Regalen stapeln sich Eiweißprodukte. Eine Ernährungsberaterin macht den Faktencheck …', body: 'Ihr Urteil: Für die meisten Jugendlichen überflüssig.' },
  { id: 'e5', cat: 'ernaehrung', page: 'fitfood', round: 2, time: '5 Std.', art: ['🍱', '⏰', '🧊'], bg: ['#a8edea', '#fed6e3'],
    headline: 'Meal-Prep: Gesund essen trotz Stress',
    teaser: 'Sonntags vorkochen, die ganze Woche genießen. So klappt es …', body: 'Unser Starter-Plan passt in drei Dosen.' },
  { id: 'e6', cat: 'ernaehrung', page: 'fitfood', round: 2, time: '1 Tag', art: ['🍬', '🧃', '⚠️'], bg: ['#f5576c', '#f093fb'],
    headline: 'So viel Zucker steckt in Softdrinks',
    teaser: 'Eine Flasche Limo enthält bis zu 18 Stück Würfelzucker. Die große Übersicht …', body: 'Wasser mit Zitrone ist die günstigste Alternative.' },
  { id: 'e7', cat: 'ernaehrung', page: 'fitfood', round: 2, time: '3 Tage', art: ['🌱', '🍔', '🤔'], bg: ['#96fbc4', '#f9f586'],
    headline: 'Veggie-Burger im Geschmackstest',
    teaser: 'Merkt man den Unterschied? Wir haben eine Klasse blind testen lassen …', body: 'Das Ergebnis überraschte selbst die Fleischfans.' },
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
export const DEFAULT_CONTENT = Object.freeze({
  posts: DEFAULT_POSTS, ads: DEFAULT_ADS, party: DEFAULT_PARTY, partyMessages: DEFAULT_PARTY_MESSAGES,
  contradictions: DEFAULT_CONTRADICTIONS, quiz: DEFAULT_QUIZ, fairness: DEFAULT_FAIRNESS,
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
    task: ['Scanne den QR-Code oder gib den Raumcode ein.', 'Wähle einen Avatar – deinen echten Namen brauchst du nicht.', 'Merke dir deine Nutzer-ID!'] },
  { id: 'feed', title: 'Likes verteilen', icon: '❤️', optional: false, mode: 'EA',
    task: ['Scrolle durch deinen bubbl-Feed.', 'Like die Beiträge, die dich wirklich interessieren.', 'Du hast höchstens {maxLikes} Likes.'] },
  { id: 'auswertung', title: 'Daten auswerten', icon: '📊', optional: false, mode: 'GA',
    task: ['Findet euch in eurer Gruppe zusammen.', 'Seht euch die Beiträge eurer Kategorie und die Likes darauf an.', 'Tragt für jede ID ein, wie oft sie eure Kategorie geliked hat.'] },
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
