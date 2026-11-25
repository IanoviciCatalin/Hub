// Agenda Timișoara, agregată din anunțurile indicate în câmpul source.
// Linkurile din url trimit la o pagină dedicată evenimentului sau la programul lui.

Object.assign(VENUES, {
  tmAnimus: { name: "ANIMUS Arena", address: "Calea Torontalului 69, Vox Technology Park, clădirea B", lat: 45.7743, lng: 21.21205 },
  tmElectrica: { name: "Stadionul Electrica", address: "Str. Renașterii 41", lat: 45.76889, lng: 21.25365 },
  tmSalaJude: { name: "Sala Sporturilor „Constantin Jude”", address: "Aleea F. C. Ripensia 7", lat: 45.74619, lng: 21.24119 },
  tmCasaTineretului: { name: "Casa Tineretului (FITT)", address: "Str. Arieș 19", lat: 45.74106, lng: 21.23969 },
  tmMeta: { name: "META Spațiu", address: "Bd. Mihai Viteazu 1, căminul 1MV", lat: 45.74516, lng: 21.22642 },
  tmCasaCulturii: { name: "Casa de Cultură a Municipiului", address: "Str. Miron Costin", lat: 45.7487, lng: 21.21796 },
  tmNemesis: { name: "Nemesis Art Club", address: "Str. Hector (Bastionul Theresia)", lat: 45.75729, lng: 21.23352 },
  tmDom: { name: "Domul Romano-Catolic „Sf. Gheorghe”", address: "Piața Unirii 12", lat: 45.75817, lng: 21.23026 },
  tmVictoriei: { name: "Piața Victoriei", address: "Piața Victoriei", lat: 45.75367, lng: 21.22572 },
  tmCinemaTimis: { name: "Cinema Timiș", address: "Piața Victoriei 7", lat: 45.75141, lng: 21.22515 },
  tmFaber: { name: "FABER", address: "Splaiul Peneș Curcanul 4-5", lat: 45.7614, lng: 21.25152 },
  tmDanceStage: { name: "Dance Stage", address: "Str. Johann Heinrich Pestalozzi 20", lat: 45.75383, lng: 21.24652 },
  tmJosefin: { name: "Josefin Pub", address: "Str. Iancu Văcărescu 31", lat: 45.74464, lng: 21.20836 },
  tmEscape: { name: "Escape Underground Hub", address: "Str. Pictor Ion Zaicu 26", lat: 45.76088, lng: 21.22115 },
  tmExitReality: { name: "Exit Reality (Escape Junior)", address: "Bd. Iuliu Maniu 23A", lat: 45.7414, lng: 21.20789 },
  tmBis: { name: "British International School of Timișoara", address: "Str. Aurora 8", lat: 45.78589, lng: 21.22697 },
  tmIbis: { name: "ibis Timișoara City Center", address: "Str. Coriolan Brediceanu 18", lat: 45.75727, lng: 21.21994 },
  tmDaHub: { name: "DăHUB", address: "Str. Socrate 12A", lat: 45.75098, lng: 21.24121 },
  tmBasca: { name: "Teatrul Basca", address: "Str. Ion Mihalache 2", lat: 45.75728, lng: 21.25057 },
  tmReciproc: { name: "Reciproc Café", address: "Piața Ionel I. C. Brătianu", lat: 45.75744, lng: 21.23338 },
  tmHeaven: { name: "Heaven", address: "Str. Ripensia 40", lat: 45.74059, lng: 21.24851 },
  tmFainRoom: { name: "Fain Room", address: "Splaiul Tudor Vladimirescu 9", lat: 45.7485, lng: 21.22221 },
  tmDarc: { name: "D'arc", address: "Piața Unirii 5", lat: 45.75834, lng: 21.22804 },
  tmMerlin: { name: "Teatrul Merlin", address: "Bd. Regele Carol I 3", lat: 45.74578, lng: 21.21437 },
  tmCharlies: { name: "Charlie's Pub", address: "Bd. Sudului 5", lat: 45.73703, lng: 21.24966 },
  tmFlora: { name: "Restaurant Flora", address: "Str. George Protopop", lat: 45.7426, lng: 21.22808 },
  tmMina: { name: "MINA Timișoara", address: "Iulius Town", lat: 45.76512, lng: 21.23132 },
  tmBrooklyn: { name: "Brooklyn Food, Drinks & More", address: "Bd. Take Ionescu 51", lat: 45.76132, lng: 21.24069 },
});

EVENTS.push(
  {
    id: "tm-workshop-germana-20261203", title: "Workshop: „Wie sicher bist du in der deutschen Rechtschreibung?”", category: "workshop", catalogIcon: "🛠️",
    venue: "uvt", venueName: "UVT, Sala 248", address: "Bd. Vasile Pârvan 4", organizer: "Facultatea de Litere, Istorie, Filosofie și Teologie (UVT)",
    startISO: "2026-12-03T08:00:00+02:00", endISO: "2026-12-03T09:30:00+02:00",
    description: "Workshop extracurricular de germană despre ortografie.",
    tags: ["Soft skills"], source: "lift.uvt.ro"
  },
  {
    id: "tm-prim-ajutor-mensave-20261128", title: "Curs de prim ajutor cu MENSAVE", category: "workshop", catalogIcon: "🩺",
    venue: "tmIbis", organizer: "MENSAVE",
    startISO: "2026-11-28T09:00:00+02:00", endISO: "2026-11-28T18:00:00+02:00",
    price: 253.46, priceFrom: true, priceInfo: "253,46 lei (bază sau pediatric), 401,93 lei (avansat)",
    description: "Trei sesiuni în aceeași zi: pediatric 09:00–13:00, bază 14:00–17:00, avansat 14:00–18:00.",
    tags: ["Medicină"], source: "iabilet.ro"
  },
  {
    id: "tm-prim-ajutor-mensave-20261212", title: "Curs de prim ajutor cu MENSAVE", category: "workshop", catalogIcon: "🩺",
    venue: "tmIbis", organizer: "MENSAVE",
    startISO: "2026-12-12T09:00:00+02:00", endISO: "2026-12-12T18:00:00+02:00",
    price: 253.46, priceFrom: true, priceInfo: "253,46 lei (bază sau pediatric), 401,93 lei (avansat)",
    description: "Trei sesiuni în aceeași zi: pediatric 09:00–13:00, bază 14:00–17:00, avansat 14:00–18:00.",
    tags: ["Medicină"], source: "iabilet.ro"
  },
  {
    id: "tm-timun-2026", title: "Timișoara International Model United Nations 2026", category: "conferinta", catalogIcon: "🎙️",
    venue: "tmBis", organizer: "Timișoara International Model United Nations",
    startISO: "2026-11-27T00:00:00+02:00", endISO: "2026-11-29T23:59:59+02:00", dateOnly: true,
    description: "Conferință de diplomație și dezbateri în engleză, pentru elevi și studenți, cu aproximativ 130 de delegați. Înscrierea ca delegat se face pe mymun.com.",
    tags: ["Soft skills"], source: "forbes.ro"
  },
  {
    id: "tm-fun-vol16-20261126", title: "FuN Timișoara #Vol16", category: "conferinta", catalogIcon: "🎙️",
    venue: "tmFaber", organizer: "FuN Timișoara",
    startISO: "2026-11-26T18:00:00+02:00", startOnly: true,
    price: 59, priceInfo: "59 lei; Community Sponsor: 500 lei pentru 3 persoane; early bird epuizat",
    description: "Seară în care oamenii își povestesc eșecurile, cu umor.",
    tags: ["Startup","Soft skills"], source: "iabilet.ro"
  },
  {
    id: "tm-fain-simplu-20261206", title: "Fain & Simplu x Timișoara", category: "conferinta", catalogIcon: "🎙️",
    venue: "capitol", organizer: "Fain & Simplu",
    startISO: "2026-12-06T16:00:00+02:00", startOnly: true,
    soldOut: true,
    description: "Detalii și bilete la organizator.",
    tags: ["Soft skills"], source: "iabilet.ro"
  },
  {
    id: "tm-animus-championship-2026", title: "ANIMUS Championship 2026", category: "concurs", catalogIcon: "🏆",
    venue: "tmAnimus", organizer: "ANIMUS Arena",
    startISO: "2026-11-01T00:00:00+02:00", endISO: "2026-12-12T23:59:59+02:00", dateOnly: true,
    priceInfo: "Taxă per jucător, afișată pe animusarena.ro",
    description: "Calificări între 1 noiembrie și 12 decembrie, pentru echipe de 2–4 jucători, pe o podea LED. Premiile totale sunt de 2.800 lei. Înscrierea se face pe site-ul ANIMUS Arena.",
    tags: ["Socializare"], source: "animusarena.ro"
  },
  {
    id: "tm-seara-de-sah-20261203", title: "Turneu „Seara de Șah”", category: "concurs", catalogIcon: "♟️",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-12-03T18:30:00+02:00", startOnly: true,
    price: 26.51, priceInfo: "26,51 lei; în grup de 3: 24,39 lei/pers.; în grup de 5: 22,27 lei/pers.; +5 lei în ziua evenimentului",
    description: "Turneu de șah.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-seara-de-sah-20261217", title: "Turneu „Seara de Șah”", category: "concurs", catalogIcon: "♟️",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-12-17T18:30:00+02:00", startOnly: true,
    price: 26.51, priceInfo: "26,51 lei; în grup de 3: 24,39 lei/pers.; în grup de 5: 22,27 lei/pers.; +5 lei în ziua evenimentului",
    description: "Turneu de șah.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-seara-de-cruce-20261124", title: "Seară de Cruce – competiție de cărți", category: "concurs", catalogIcon: "🃏",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-11-24T18:30:00+02:00", startOnly: true,
    price: 26.51, priceInfo: "26,51 lei; în grup de 3: 24,39 lei/pers.; în grup de 5: 22,27 lei/pers.; +5 lei în ziua evenimentului",
    description: "Competiție de cruce, joc de cărți cu tradiție.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-seara-de-cruce-20261208", title: "Seară de Cruce – competiție de cărți", category: "concurs", catalogIcon: "🃏",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-12-08T18:30:00+02:00", startOnly: true,
    price: 26.51, priceInfo: "26,51 lei; în grup de 3: 24,39 lei/pers.; în grup de 5: 22,27 lei/pers.; +5 lei în ziua evenimentului",
    description: "Competiție de cruce, joc de cărți cu tradiție.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-seara-de-cruce-20261215", title: "Seară de Cruce – competiție de cărți", category: "concurs", catalogIcon: "🃏",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-12-15T18:30:00+02:00", startOnly: true,
    price: 26.51, priceInfo: "26,51 lei; în grup de 3: 24,39 lei/pers.; în grup de 5: 22,27 lei/pers.; +5 lei în ziua evenimentului",
    description: "Competiție de cruce, joc de cărți cu tradiție.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-catan-5-20261126", title: "Competiție Catan 5", category: "concurs", catalogIcon: "🎲",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-11-26T18:30:00+02:00", startOnly: true,
    price: 26.51, priceInfo: "26,51 lei; în grup: 22,27–24,39 lei/pers.",
    description: "Competiție de Catan.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-catan-6-20261210", title: "Competiție Catan 6", category: "concurs", catalogIcon: "🎲",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-12-10T18:30:00+02:00", startOnly: true,
    price: 26.51, priceInfo: "26,51 lei; în grup: 22,27–24,39 lei/pers.",
    description: "Competiție de Catan.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-seara-de-table-20261127", title: "Seara de Table – competiție de table", category: "concurs", catalogIcon: "🎲",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-11-27T18:30:00+02:00", startOnly: true,
    price: 20, priceFrom: true,
    description: "Competiție de table.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-seara-de-table-20261211", title: "Seara de Table – competiție de table", category: "concurs", catalogIcon: "🎲",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-12-11T18:30:00+02:00", startOnly: true,
    price: 20, priceFrom: true,
    description: "Competiție de table.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-seara-de-remi-20261202", title: "Seară de Remi – competiție de remi", category: "concurs", catalogIcon: "🎲",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-12-02T18:30:00+02:00", startOnly: true,
    price: 26.51, priceInfo: "26,51 lei; în grup: 22,27–24,39 lei/pers.",
    description: "Competiție de remi.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-seara-de-remi-20261216", title: "Seară de Remi – competiție de remi", category: "concurs", catalogIcon: "🎲",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-12-16T18:30:00+02:00", startOnly: true,
    price: 26.51, priceInfo: "26,51 lei; în grup: 22,27–24,39 lei/pers.",
    description: "Competiție de remi.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-speed-puzzle-3-20261121", title: "Speed Puzzle: Campionat de Puzzle 3", category: "concurs", catalogIcon: "🧩",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-11-21T17:00:00+02:00", startOnly: true,
    price: 21.21, priceFrom: true, priceInfo: "37,12 lei/pers. în echipă de 2, 26,51 lei de 3, 21,21 lei de 4",
    description: "Campionat de puzzle pe echipe.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-speed-puzzle-4-20261212", title: "Speed Puzzle: Campionat de Puzzle 4", category: "concurs", catalogIcon: "🧩",
    venue: "tmExitReality", approximateVenue: true, organizer: "Exit Reality",
    startISO: "2026-12-12T17:00:00+02:00", startOnly: true,
    price: 21.21, priceFrom: true, priceInfo: "37,12 lei/pers. în echipă de 2, 26,51 lei de 3, 21,21 lei de 4",
    description: "Campionat de puzzle pe echipe.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-poli-bihor-20261128", title: "Poli Timișoara – FC Bihor Oradea (Liga 2, etapa 15)", category: "sport", catalogIcon: "⚽",
    venue: "tmElectrica", organizer: "Poli Timișoara",
    startISO: "2026-11-28T11:00:00+02:00", startOnly: true,
    price: 35, priceFrom: true, priceInfo: "35 lei (Tribuna 2), 45 lei (Tribuna 1, sector B); copiii sub 12 ani intră gratuit la Tribuna 2",
    description: "Meci de fotbal din Liga 2.",
    tags: ["Fotbal"], source: "politehnicatimisoara.com",
    url: "https://lpf2.ro/liga2/html/programul_meciurilor/Program_yPolitehnica_Timisoara-552.html"
  },
  {
    id: "tm-fiba-romania-danemarca-20261129", title: "România – Danemarca, pre-calificări FIBA EuroBasket 2029", category: "sport", catalogIcon: "🏀",
    venue: "tmSalaJude", organizer: "Federația Română de Baschet",
    startISO: "2026-11-29T18:00:00+02:00", startOnly: true,
    description: "Meci de baschet al echipei naționale. Detalii și bilete la organizator.",
    tags: ["Baschet"], source: "zilesinopti.ro",
    url: "https://frbaschet.ro/public/stiri/stiri/romania-revine-la-timisoara-tricolorii-intalnesc-danemarca-pe-29-noiembrie-in-precalificarile-fiba-eurobasket-2029"
  },
  {
    id: "tm-poli-corvinul-20261202", title: "Poli Timișoara – Corvinul Hunedoara (Cupa României)", category: "sport", catalogIcon: "⚽",
    venue: "tmElectrica", organizer: "Poli Timișoara",
    startISO: "2026-12-02T00:00:00+02:00", endISO: "2026-12-02T23:59:59+02:00", dateOnly: true,
    priceInfo: "Probabil 35–45 lei, ca la celelalte meciuri de pe Electrica (neconfirmat)",
    description: "Faza grupelor din Cupa României. Ora estimată este 14:00 și nu a fost confirmată încă.",
    tags: ["Fotbal"], source: "politehnicatimisoara.com"
  },
  {
    id: "tm-poli-slatina-20261212", title: "Poli Timișoara – CSM Slatina (Liga 2, etapa 17)", category: "sport", catalogIcon: "⚽",
    venue: "tmElectrica", organizer: "Poli Timișoara",
    startISO: "2026-12-12T11:00:00+02:00", startOnly: true,
    priceInfo: "Probabil 35–45 lei, ca la celelalte meciuri de pe Electrica (neconfirmat)",
    description: "Ultimul meci acasă al anului.",
    tags: ["Fotbal"], source: "goool.ro"
  },
  {
    id: "tm-patinoar-parcul-central-2026", title: "Patinoar-circuit în Parcul Central", category: "sport", catalogIcon: "⛸️",
    venue: "central", organizer: "Târgul de Crăciun Timișoara",
    startISO: "2026-11-28T00:00:00+02:00", endISO: "2027-01-07T23:59:59+02:00", dateOnly: true,
    price: 40, priceInfo: "Tarif afișat în programul târgului. Verifică orarul din zilele de sărbătoare.",
    description: "Circuit de 80 m pe Aleea Personalităților, în Parcul Central.",
    tags: ["Socializare"], source: "targuldecraciun.ro",
    url: "https://visit-timisoara.com/ro/campaigns/targul-de-craciun-2026/"
  },
  {
    id: "tm-la-bayadere-20261121", title: "La Bayadère (balet)", category: "cultura", catalogIcon: "🩰",
    venue: "opera", organizer: "Opera Națională Română Timișoara",
    startISO: "2026-11-21T19:00:00+02:00", startOnly: true,
    priceInfo: "Bilete pe ort.ro; prețul nu apare în surse",
    description: "Spectacol de balet. Detalii și bilete la organizator.",
    tags: ["Muzică","Artă"], source: "zilesinopti.ro"
  },
  {
    id: "tm-barbierul-din-sevilla-20261121", title: "Bărbierul din Sevilla – Muzică la Palat by COOLTURAL", category: "cultura", catalogIcon: "🎻",
    venue: "upt", venueName: "Sala Senatului UPT, Palatul Lloyd", address: "Piața Victoriei 2", organizer: "COOLTURAL",
    startISO: "2026-11-21T18:00:00+02:00", startOnly: true,
    priceInfo: "Bilete indisponibile online",
    description: "Concert din seria Muzică la Palat. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-girls-hood-20261121", title: "Girls Hood – On Tour", category: "cultura", catalogIcon: "🎵",
    venue: "tmDaHub", organizer: "DăHUB",
    startISO: "2026-11-21T21:00:00+02:00", startOnly: true,
    price: 40, priceFrom: true, priceInfo: "40 lei (presale), 50 lei (la intrare)",
    description: "Concert hip hop.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-robin-backstabbers-20261122", title: "Robin and The Backstabbers", category: "cultura", catalogIcon: "🎵",
    venue: "tmCasaTineretului", organizer: "Casa Tineretului (FITT)",
    startISO: "2026-11-22T20:00:00+02:00", startOnly: true,
    price: 104.24, priceInfo: "104,24 lei (presale)",
    description: "Concert. Accesul începe la 19:00.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-temporary-communities-20261122", title: "Temporary Communities – expoziție, conferință, discuții", category: "cultura", catalogIcon: "🖼️",
    venue: "tmMeta", organizer: "META Spațiu",
    startISO: "2026-11-22T17:00:00+02:00", startOnly: true,
    description: "Expoziție, conferință și discuții. Detalii și bilete la organizator.",
    tags: ["Artă"], source: "zilesinopti.ro"
  },
  {
    id: "tm-femeile-nu-sunt-ingeri-20261122", title: "Femeile nu sunt îngeri (teatru)", category: "cultura", catalogIcon: "🎭",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-11-22T19:00:00+02:00", startOnly: true,
    price: 99, priceFrom: true, priceInfo: "99–139 lei; persoanele cu dizabilități intră gratuit",
    description: "Spectacol de teatru. Locurile se termină.",
    tags: ["Artă"], source: "iabilet.ro"
  },
  {
    id: "tm-miniaturi-20261123", title: "Miniaturi. Arta în formate mici, cu povești mari (expoziție)", category: "cultura", catalogIcon: "🖼️",
    venue: "tmCasaCulturii", organizer: "Casa de Cultură a Municipiului",
    startISO: "2026-11-23T09:00:00+02:00", startOnly: true,
    description: "Expoziție. Detalii și bilete la organizator.",
    tags: ["Artă"], source: "zilesinopti.ro"
  },
  {
    id: "tm-tudor-gheorghe-20261123", title: "Tudor Gheorghe: Iarna 2026", category: "cultura", catalogIcon: "🎵",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-11-23T19:00:00+02:00", startOnly: true,
    price: 190, priceFrom: true, priceInfo: "190–200 lei (aproape epuizat)",
    description: "Concert. Mai este o reprezentație pe 30 noiembrie.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-dauer-dorobantu-20261125", title: "Mirabela Dauer & Gabriel Dorobanțu", category: "cultura", catalogIcon: "🎵",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-11-25T19:00:00+02:00", startOnly: true,
    priceInfo: "Bilete pe ticketstore.ro; preț neafișat",
    description: "Concert. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-arhiva-lucas-neagu-20261125", title: "„Arhivă”, spectacol de Lucas Neagu", category: "cultura", catalogIcon: "🎭",
    venue: "tmFaber", organizer: "FABER",
    startISO: "2026-11-25T19:00:00+02:00", startOnly: true,
    price: 26.51, priceFrom: true, priceInfo: "53,03 lei; studenți 26,51 lei",
    description: "Spectacol de teatru.",
    tags: ["Artă"], source: "iabilet.ro",
    url: "https://www.iabilet.ro/bilete-timisoara-arhiva-un-spectacol-de-lucas-neagu-133228/"
  },
  {
    id: "tm-balul-vienez-20261126", title: "Balul Vienez", category: "cultura", catalogIcon: "🩰",
    venue: "opera", venueName: "Teatrul Național „Mihai Eminescu”", address: "Str. Mărășești 2", organizer: "Teatrul Național „Mihai Eminescu”",
    startISO: "2026-11-26T19:00:00+02:00", startOnly: true,
    price: 512.1, priceFrom: true, priceInfo: "512,10 lei (în picioare), 665,73 lei (balcon), 921,78 lei (lojă)",
    description: "Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-paula-hriscu-20261126", title: "Concert de colinde Paula Hriscu: Domnu' Pământului", category: "cultura", catalogIcon: "🎵",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-11-26T00:00:00+02:00", endISO: "2026-11-26T23:59:59+02:00", dateOnly: true,
    soldOut: true,
    description: "Concert de colinde, cu invitatul Alexandru Zărăndean.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-alternosfera-20261127", title: "Alternosfera – Drumuri cu Cruci", category: "cultura", catalogIcon: "🎵",
    venue: "tmCasaTineretului", organizer: "Casa Tineretului (FITT)",
    startISO: "2026-11-27T20:00:00+02:00", startOnly: true,
    price: 115.32, priceFrom: true, priceInfo: "115,32 lei (balcon), 146,78 lei (lateral), 167,74 lei (central)",
    description: "Concert. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-am-fost-la-munte-20261127", title: "Am Fost La Munte – 10 ani", category: "cultura", catalogIcon: "🎵",
    venue: "tmNemesis", organizer: "Nemesis Art Club",
    startISO: "2026-11-27T19:00:00+02:00", startOnly: true,
    price: 58.99, priceFrom: true, priceInfo: "58,99–69,72 lei (preț întreg 80,45 lei)",
    description: "Concert aniversar. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-seasons-of-passion-20261127", title: "Seasons of Passion – Vivaldi & Beethoven", category: "cultura", catalogIcon: "🎻",
    venue: "tmDom", organizer: "Domul Romano-Catolic „Sf. Gheorghe”",
    startISO: "2026-11-27T19:30:00+02:00", startOnly: true,
    description: "Concert de muzică clasică. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-orkid-ep-20261128", title: "Orkid – lansare EP", category: "cultura", catalogIcon: "🎵",
    venue: "tmCasaTineretului", organizer: "Casa Tineretului (FITT)",
    startISO: "2026-11-28T20:00:00+02:00", startOnly: true,
    description: "Concert de lansare. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-celelalte-cuvinte-20261129", title: "Celelalte Cuvinte – 45 de ani", category: "cultura", catalogIcon: "🎵",
    venue: "tmCasaTineretului", organizer: "Casa Tineretului (FITT)",
    startISO: "2026-11-29T20:00:00+02:00", startOnly: true,
    priceInfo: "Prețul pentru Timișoara nu e publicat; în alte orașe din turneu: 79 lei presale, 100 lei la intrare",
    description: "Concert aniversar. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-foamea-20261129", title: "Foamea (teatru)", category: "cultura", catalogIcon: "🎭",
    venue: "tmBasca", approximateVenue: true, organizer: "Teatrul Basca",
    startISO: "2026-11-29T19:00:00+02:00", startOnly: true,
    price: 63.63,
    description: "Spectacol de teatru.",
    tags: ["Artă"], source: "iabilet.ro"
  },
  {
    id: "tm-rapido-presto-20261130", title: "Rápido Presto – teatru fizic", category: "cultura", catalogIcon: "🎭",
    venue: "opera", venueName: "Teatrul Național – studio „Uțu Strugari”", address: "Str. Mărășești 2", approximateVenue: true, organizer: "Teatrul Național „Mihai Eminescu”",
    startISO: "2026-11-30T19:00:00+02:00", startOnly: true,
    price: 22.42, priceFrom: true, priceInfo: "32,42 lei; elevi, studenți și pensionari 22,42 lei",
    description: "Spectacol de teatru fizic.",
    tags: ["Artă"], source: "iabilet.ro",
    url: "https://www.tixhit.com/eveniment/timisoara-r-pido-presto-spectacol-de-teatru-fizic-timisoara-3fb9"
  },
  {
    id: "tm-tudor-gheorghe-20261130", title: "Tudor Gheorghe: Iarna 2026", category: "cultura", catalogIcon: "🎵",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-11-30T19:00:00+02:00", startOnly: true,
    price: 190, priceFrom: true, priceInfo: "190–200 lei",
    description: "Concert. A doua reprezentație.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-ziua-nationala-20261201", title: "Ziua Națională a României", category: "cultura", catalogIcon: "🇷🇴",
    venue: "tmVictoriei", organizer: "Primăria Municipiului Timișoara",
    startISO: "2026-12-01T18:00:00+02:00", startOnly: true,
    price: 0,
    description: "Program artistic și retragere cu torțe a Garnizoanei Timișoara.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-morosenii-va-colinda-20261201", title: "Moroșenii vă colindă", category: "cultura", catalogIcon: "🎵",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-12-01T18:00:00+02:00", startOnly: true,
    price: 130,
    description: "Concert de colinde.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-don-pasquale-20261203", title: "Don Pasquale (premieră)", category: "cultura", catalogIcon: "🎻",
    venue: "opera", organizer: "Opera Națională Română Timișoara",
    startISO: "2026-12-03T19:00:00+02:00", startOnly: true,
    priceInfo: "Bilete pe ort.ro; preț neafișat",
    description: "Premieră de operă. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-maria-coman-20261203", title: "Maria Coman – Acasă de Sărbători", category: "cultura", catalogIcon: "🎵",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-12-03T19:00:00+02:00", startOnly: true,
    price: 189.57, priceFrom: true, priceInfo: "Aproximativ 263–295 lei; ofertă la 2 bilete: de la 189,57 lei/bilet",
    description: "Concert de colinde.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-byron-20-ani-20261204", title: "byron – concert aniversar 20 de ani", category: "cultura", catalogIcon: "🎵",
    venue: "tmCasaTineretului", organizer: "Casa Tineretului (FITT)",
    startISO: "2026-12-04T19:00:00+02:00", startOnly: true,
    price: 95.23, priceInfo: "95,23 lei (presale); biletele early bird și pentru studenți s-au epuizat",
    description: "Concert aniversar. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-structuri-de-rezistenta-20261204", title: "Structuri de rezistență", category: "cultura", catalogIcon: "🎭",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-12-04T19:00:00+02:00", startOnly: true,
    priceInfo: "Bilete pe filarmonicabanatul.ro și myticket.ro; preț neafișat",
    description: "Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-alone-at-parties-20261204", title: "Concert acustic Alone at Parties", category: "cultura", catalogIcon: "🎵",
    venue: "tmReciproc", organizer: "Reciproc Café",
    startISO: "2026-12-04T20:00:00+02:00", startOnly: true,
    price: 40,
    description: "Concert acustic.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-oscar-20261204", title: "Oscar (concert trap)", category: "cultura", catalogIcon: "🎵",
    venue: "tmHeaven", approximateVenue: true, organizer: "Heaven",
    startISO: "2026-12-04T18:00:00+02:00", startOnly: true,
    price: 74.24, priceFrom: true, priceInfo: "74,24 lei (presale); VIP 106,05 lei",
    description: "Concert trap.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-under-the-sign-of-the-goat-2026", title: "Under The Sign Of The Goat", category: "cultura", catalogIcon: "🎵",
    venue: "tmEscape", approximateVenue: true, organizer: "Escape Underground Hub",
    startISO: "2026-12-04T00:00:00+02:00", endISO: "2026-12-05T23:59:59+02:00", dateOnly: true,
    price: 100,
    description: "Festival rock și metal pe două seri, de la 19:00.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-luna-amara-20261205", title: "Luna Amara – lansare single „Ceva de-mpărțit”", category: "cultura", catalogIcon: "🎵",
    venue: "tmCasaTineretului", organizer: "Casa Tineretului (FITT)",
    startISO: "2026-12-05T20:00:00+02:00", startOnly: true,
    price: 75, priceFrom: true, priceInfo: "75 lei (presale), 90 lei (sale)",
    description: "Concert de lansare. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "iabilet.ro",
    url: "https://www.iabilet.ro/bilete-timisoara-luna-amara-lansare-single-ceva-de-mpartit-130026/"
  },
  {
    id: "tm-unexpected-concert-20261205", title: "Unexpected Concert – Electric: Beyond Sound", category: "cultura", catalogIcon: "🎵",
    venue: "iulius", venueName: "Iulius Congress Hall", address: "Str. Aristide Demetriade 1, etajul 1", organizer: "Unexpected Concert",
    startISO: "2026-12-05T19:00:00+02:00", startOnly: true,
    price: 119, priceFrom: true, priceInfo: "119–150 lei",
    description: "Concert de muzică electronică.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-donizetti-da-camera-20261206", title: "Donizetti da Camera – prelegere despre cântecele lui Donizetti", category: "cultura", catalogIcon: "🎻",
    venue: "upt", venueName: "Palatul Lloyd", address: "Piața Victoriei 2", organizer: "Palatul Lloyd",
    startISO: "2026-12-06T18:30:00+02:00", startOnly: true,
    description: "Prelegere despre cântecele lui Donizetti. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-fuego-colinda-20261207", title: "FUEGO – Glas de colindă", category: "cultura", catalogIcon: "🎵",
    venue: "opera", organizer: "Opera Națională Română Timișoara",
    startISO: "2026-12-07T19:00:00+02:00", startOnly: true,
    price: 190.89, priceFrom: true, priceInfo: "190,89 lei (categoria II), 233,31 lei (categoria I)",
    description: "Concert de colinde. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-spargatorul-de-nuci-20261210", title: "Spărgătorul de nuci – Teatrul de Balet Sibiu", category: "cultura", catalogIcon: "🩰",
    venue: "opera", venueName: "Teatrul Național „Mihai Eminescu”", address: "Str. Mărășești 2", organizer: "Teatrul de Balet Sibiu",
    startISO: "2026-12-10T19:00:00+02:00", startOnly: true,
    priceInfo: "Tarifele afișate au fost 80, 130 și 180 lei.", soldOut: true,
    description: "Spectacol de balet în clădirea Operei și a Teatrului Național. Verifică sala și ora în anunțul reprezentației.",
    tags: ["Muzică","Artă"], source: "zilesinopti.ro",
    url: "https://ticketstore.ro/ro/bilete/12085/spargatorul-de-nuci-timisoara"
  },
  {
    id: "tm-gospel-lakin-20261211", title: "Concert de Crăciun Gospel – John Lakin & friends", category: "cultura", catalogIcon: "🎵",
    venue: "tmCinemaTimis", organizer: "Cinema Timiș",
    startISO: "2026-12-11T19:00:00+02:00", startOnly: true,
    description: "Concert de Crăciun. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-e-an-na-20261211", title: "E-an-na – Fără Hotare", category: "cultura", catalogIcon: "🎵",
    venue: "tmCasaTineretului", organizer: "Casa Tineretului (FITT)",
    startISO: "2026-12-11T20:30:00+02:00", startOnly: true,
    priceInfo: "84,84 lei la presale, care s-a epuizat",
    description: "Concert. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-sister-act-20261211", title: "Sister Act (musical)", category: "cultura", catalogIcon: "🎭",
    venue: "opera", venueName: "Teatrul German de Stat", address: "Str. Alba Iulia 2", organizer: "Teatrul German de Stat",
    startISO: "2026-12-11T19:30:00+02:00", startOnly: true,
    description: "Musical. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-simona-delegeanu-20261211", title: "Simona Delegeanu – lansare „Primul album”", category: "cultura", catalogIcon: "🎵",
    venue: "tmReciproc", organizer: "Reciproc Café",
    startISO: "2026-12-11T19:00:00+02:00", startOnly: true,
    price: 68.93,
    description: "Concert de lansare de album.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-corala-contrast-20261211", title: "Seara de Crăciun – Corala Contrast", category: "cultura", catalogIcon: "🎻",
    venue: "opera", organizer: "Opera Națională Română Timișoara",
    startISO: "2026-12-11T19:00:00+02:00", startOnly: true,
    price: 50, priceFrom: true, priceInfo: "50 / 80 / 150 lei; VIP 200 lei",
    description: "Concert coral de Crăciun. Locurile se termină.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-ana-coman-20261212", title: "Ana Coman – Hidden Gems", category: "cultura", catalogIcon: "🎵",
    venue: "tmCasaTineretului", organizer: "Casa Tineretului (FITT)",
    startISO: "2026-12-12T21:00:00+02:00", startOnly: true,
    price: 84, priceInfo: "84 lei; biletele early bird și pentru studenți s-au epuizat",
    description: "Concert. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-craciunul-de-odinioara-20261213", title: "Crăciunul de Odinioară", category: "cultura", catalogIcon: "🎵",
    venue: "tmSalaJude", organizer: "Sala Sporturilor „Constantin Jude”",
    startISO: "2026-12-13T18:00:00+02:00", startOnly: true,
    price: 130, priceFrom: true, priceInfo: "130 / 160 / 250 lei",
    description: "Concert de colinde. Locurile se termină.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-regal-vienez-20261214", title: "Regal Vienez – concert extraordinar de Crăciun", category: "cultura", catalogIcon: "🎻",
    venue: "opera", organizer: "Opera Națională Română Timișoara",
    startISO: "2026-12-14T17:00:00+02:00", startOnly: true,
    price: 265.13, priceFrom: true, priceInfo: "265,13 lei (categoria II), 318,15 lei (categoria I)",
    description: "Două reprezentații, la 17:00 și la 20:00. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-acorduri-de-craciun-20261214", title: "Acorduri de Crăciun #3 – colinde la chitară", category: "cultura", catalogIcon: "🎵",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-12-14T18:30:00+02:00", startOnly: true,
    price: 22.42, priceFrom: true, priceInfo: "32,42 lei adult, 22,42 lei copil",
    description: "Concert de colinde la chitară.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-blessed-voices-20261215", title: "The Blessed Voices", category: "cultura", catalogIcon: "🎵",
    venue: "opera", organizer: "Opera Națională Română Timișoara",
    startISO: "2026-12-15T19:00:00+02:00", startOnly: true,
    description: "Concert. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-fiecare-sot-20261216", title: "Fiecare soț distruge puțin viața soției sale (teatru)", category: "cultura", catalogIcon: "🎭",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-12-16T19:00:00+02:00", startOnly: true,
    price: 99, priceFrom: true, priceInfo: "99–149 lei; persoanele cu dizabilități intră gratuit",
    description: "Spectacol de teatru. Locurile se termină.",
    tags: ["Artă"], source: "iabilet.ro"
  },
  {
    id: "tm-cargo-20261217", title: "Concert Cargo", category: "cultura", catalogIcon: "🎵",
    venue: "tmCasaTineretului", organizer: "Casa Tineretului (FITT)",
    startISO: "2026-12-17T20:00:00+02:00", startOnly: true,
    price: 121.96, priceFrom: true, priceInfo: "121,96 lei (presale), 137,87 lei; copii 7–14 ani 63,63 lei",
    description: "Concert rock.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-raoul-20261218", title: "Raoul – „De dragul tău”", category: "cultura", catalogIcon: "🎵",
    venue: "opera", organizer: "Opera Națională Română Timișoara",
    startISO: "2026-12-18T19:00:00+02:00", startOnly: true,
    description: "Concert. Detalii și bilete la organizator.",
    tags: ["Muzică"], source: "zilesinopti.ro"
  },
  {
    id: "tm-nidal-20261218", title: "NIDAL – „Colinde de Cristal”", category: "cultura", catalogIcon: "🎵",
    venue: "tmFainRoom", organizer: "Fain Room",
    startISO: "2026-12-18T20:00:00+02:00", startOnly: true,
    price: 42.42, priceFrom: true, priceInfo: "42,42 lei (presale), 63,63 lei",
    description: "Concert de colinde.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-vlad-dobrescu-20261219", title: "Concert Vlad Dobrescu", category: "cultura", catalogIcon: "🎵",
    venue: "tmFaber", organizer: "FABER",
    startISO: "2026-12-19T22:00:00+02:00", startOnly: true,
    price: 70, priceFrom: true, priceInfo: "70 lei (early bird), 80 lei (presale)",
    description: "Concert hip hop.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-paula-seling-20261220", title: "Paula Seling – „Magia Crăciunului”", category: "cultura", catalogIcon: "🎵",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-12-20T18:00:00+02:00", startOnly: true,
    price: 120.68, priceFrom: true, priceInfo: "120,68 / 160,68 lei; VIP 200,68 lei",
    description: "Concert de Crăciun, cu două reprezentații, la 18:00 și la 20:00.",
    tags: ["Muzică"], source: "iabilet.ro"
  },
  {
    id: "tm-fetita-cu-chibrituri-20261220", title: "Fetița cu chibrituri – dans contemporan", category: "cultura", catalogIcon: "🩰",
    venue: "tmCasaTineretului", organizer: "Casa Tineretului (FITT)",
    startISO: "2026-12-20T18:00:00+02:00", startOnly: true,
    price: 63.63,
    description: "Spectacol de dans contemporan pentru copii.",
    tags: ["Artă"], source: "iabilet.ro"
  },
  {
    id: "tm-grinch-20261220", title: "Grinch în Țara Crăciunului", category: "cultura", catalogIcon: "🎭",
    venue: "tmCinemaTimis", organizer: "Cinema Timiș",
    startISO: "2026-12-20T11:00:00+02:00", startOnly: true,
    price: 47.72, priceFrom: true, priceInfo: "47,72–106,05 lei",
    description: "Spectacol pentru copii.",
    tags: ["Artă"], source: "iabilet.ro"
  },
  {
    id: "tm-youth-awards-20261121", title: "Youth Awards 2026", category: "social", catalogIcon: "🏆",
    venue: "tmCasaTineretului", organizer: "Casa Tineretului (FITT)",
    startISO: "2026-11-21T19:00:00+02:00", startOnly: true,
    price: 0,
    description: "Gală deschisă publicului.",
    tags: ["Socializare"], source: "zilesinopti.ro"
  },
  {
    id: "tm-standup-mirica-20261121", title: "Stand-up: Mirică, Ioana Luiza, Virgil Ciulin și Mitran", category: "social", catalogIcon: "🎤",
    venue: "tmDaHub", organizer: "DăHUB",
    startISO: "2026-11-21T19:00:00+02:00", startOnly: true,
    priceInfo: "Bilete indisponibile online",
    description: "Două show-uri de stand-up.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-herodot-20261121", title: "441 presents Herodot", category: "social", catalogIcon: "🎉",
    venue: "tmDarc", organizer: "D'arc",
    startISO: "2026-11-21T22:00:00+02:00", startOnly: true,
    price: 50,
    description: "Petrecere.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-retro-party-padre-20261121", title: "Retro Party by Padre", category: "social", catalogIcon: "🎉",
    venue: "tmNemesis", organizer: "Nemesis Art Club",
    startISO: "2026-11-21T23:30:00+02:00", startOnly: true,
    description: "Petrecere retro.",
    tags: ["Socializare"], source: "zilesinopti.ro"
  },
  {
    id: "tm-standup-serghei-20261122", title: "Stand-up: Serghei – „Make Olympic Great Again”", category: "social", catalogIcon: "🎤",
    venue: "tmMerlin", organizer: "Teatrul Merlin",
    startISO: "2026-11-22T18:00:00+02:00", startOnly: true,
    price: 84.36, priceFrom: true, priceInfo: "84,36–116 lei",
    description: "Două show-uri, la 18:00 și la 20:30. Locurile se termină.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-impro-cele-mai-proaste-20261125", title: "Show de improvizație – Cele mai proaste", category: "social", catalogIcon: "🎤",
    venue: "tmDaHub", organizer: "DăHUB",
    startISO: "2026-11-25T20:00:00+02:00", startOnly: true,
    price: 32.42,
    description: "Spectacol de improvizație.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-kizomba-night-20261125", title: "Kizomba Night", category: "social", catalogIcon: "💃",
    venue: "tmDanceStage", organizer: "Dance Stage",
    startISO: "2026-11-25T22:00:00+02:00", startOnly: true,
    description: "Seară de dans kizomba.",
    tags: ["Socializare"], source: "zilesinopti.ro"
  },
  {
    id: "tm-radu-guran-20261126", title: "Radu Guran: Comedie și Lăutărie", category: "social", catalogIcon: "🎤",
    venue: "tmCharlies", organizer: "Charlie's Pub",
    startISO: "2026-11-26T19:00:00+02:00", startOnly: true,
    price: 53.03, priceFrom: true, priceInfo: "53,03 lei; ultimele bilete 74,24 lei",
    description: "Spectacol de stand-up.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-reggae-friday-20261127", title: "Reggae Friday", category: "social", catalogIcon: "🎉",
    venue: "tmDaHub", organizer: "DăHUB",
    startISO: "2026-11-27T20:00:00+02:00", startOnly: true,
    price: 31.82,
    description: "Petrecere reggae.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-seara-sarbeasca-20261127", title: "Seara Sârbească", category: "social", catalogIcon: "🍽️",
    venue: "tmFlora", organizer: "Restaurant Flora",
    startISO: "2026-11-27T20:00:00+02:00", startOnly: true,
    price: 40,
    description: "Petrecere cu muzică sârbească.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-wine-dine-20261127", title: "Wine & Dine – degustare de vinuri Crama Chateau Cristi", category: "social", catalogIcon: "🍷",
    venue: "tmFlora", organizer: "Restaurant Flora",
    startISO: "2026-11-27T19:00:00+02:00", startOnly: true,
    price: 190, priceInfo: "190 lei/pers.",
    description: "Degustare de vinuri.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-board-game-con-2026", title: "Timișoara Board Game CON 2026", category: "social", catalogIcon: "🎲",
    venue: "tmFaber", organizer: "Jocosfera",
    startISO: "2026-11-27T00:00:00+02:00", endISO: "2026-11-29T23:59:59+02:00", dateOnly: true,
    description: "Convenție de jocuri de societate cu un campionat, joc liber, quiz și târg. Consultă programul pentru orele fiecărei activități.",
    tags: ["Socializare"], source: "zilesinopti.ro",
    url: "https://www.onevent.ro/evenimente/timisoara-board-game-con-2026/"
  },
  {
    id: "tm-targ-craciun-2026", title: "Târgul de Crăciun Timișoara, ediția XIX", category: "social", catalogIcon: "🎄",
    venue: "tmVictoriei", organizer: "Târgul de Crăciun Timișoara",
    startISO: "2026-11-28T00:00:00+02:00", endISO: "2027-01-07T23:59:59+02:00", dateOnly: true,
    price: 0,
    description: "Târg de iarnă în Piața Victoriei, Piața Libertății, Piața Sf. Gheorghe, Piața Unirii și Parcul Central. Deschiderea festivă are loc pe 28 noiembrie. Activitățile din târg pot avea tarife separate.",
    tags: ["Muzică","Socializare"], source: "infomusic.ro",
    url: "https://visit-timisoara.com/ro/campaigns/targul-de-craciun-2026/"
  },
  {
    id: "tm-balul-bobocilor-basarabeni-20261128", title: "Balul Bobocilor Basarabeni 2026", category: "social", catalogIcon: "🎉",
    venue: "tmDaHub", organizer: "DăHUB",
    startISO: "2026-11-28T20:00:00+02:00", startOnly: true,
    price: 25,
    description: "Petrecere.",
    tags: ["Socializare"], source: "iabilet.ro",
    url: "https://www.iabilet.ro/bilete-timisoara-balul-bobocilor-basarabeni-2026-134869/"
  },
  {
    id: "tm-amnesia-pyramid-20261128", title: "Amnesia pres. Pyramid Ibiza World Tour", category: "social", catalogIcon: "🎉",
    venue: "tmMina", organizer: "MINA Timișoara",
    startISO: "2026-11-28T21:00:00+02:00", startOnly: true,
    price: 106.05, priceFrom: true, priceInfo: "106,05–127,26 lei; backstage 190,89–212,10 lei",
    description: "Petrecere cu muzică electronică.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-retro-ballroom-20261128", title: "Retro & Ballroom Party", category: "social", catalogIcon: "💃",
    venue: "tmDanceStage", organizer: "Dance Stage",
    startISO: "2026-11-28T22:00:00+02:00", startOnly: true,
    description: "Petrecere retro și de dans de societate.",
    tags: ["Socializare"], source: "zilesinopti.ro"
  },
  {
    id: "tm-natanticu-radoiu-20261130", title: "Stand-up: Natanticu și Edi Rădoiu – Two Men Show", category: "social", catalogIcon: "🎤",
    venue: "tmDaHub", organizer: "DăHUB",
    startISO: "2026-11-30T20:00:00+02:00", startOnly: true,
    price: 63.63,
    description: "Spectacol de stand-up.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-karaoke-josefin-20261130", title: "Karaoke Românesc", category: "social", catalogIcon: "🎤",
    venue: "tmJosefin", organizer: "Josefin Pub",
    startISO: "2026-11-30T20:00:00+02:00", startOnly: true,
    description: "Seară de karaoke cu muzică românească.",
    tags: ["Socializare"], source: "zilesinopti.ro"
  },
  {
    id: "tm-vimana-xclusive-20261204", title: "VimanaXclusive Vol. 3: STILLSCREAMLOUD!", category: "social", catalogIcon: "🎉",
    venue: "tmDaHub", organizer: "DăHUB",
    startISO: "2026-12-04T20:00:00+02:00", startOnly: true,
    price: 42.42, priceInfo: "42,42 lei; early bird epuizat",
    description: "Petrecere.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-faberland-2026", title: "FABERLAND – târg de cadouri de Crăciun", category: "social", catalogIcon: "🎄",
    venue: "tmFaber", organizer: "FABER",
    startISO: "2026-12-05T00:00:00+02:00", endISO: "2026-12-06T23:59:59+02:00", dateOnly: true,
    price: 0,
    description: "Târg cu artizani și designeri locali, cadouri, produse de sezon și muzică.",
    tags: ["Socializare"], source: "zilesinopti.ro",
    url: "https://faber.ro/ro/apeluri-de-proiecte/faberland-26/"
  },
  {
    id: "tm-nicolae-party-20261205", title: "Nicolae Party", category: "social", catalogIcon: "🎉",
    venue: "tmDanceStage", organizer: "Dance Stage",
    startISO: "2026-12-05T22:00:00+02:00", startOnly: true,
    description: "Petrecere de Sfântul Nicolae.",
    tags: ["Socializare"], source: "zilesinopti.ro"
  },
  {
    id: "tm-takover-40-20261205", title: "TM TÆkoVeR 40", category: "social", catalogIcon: "🎉",
    venue: "tmEscape", approximateVenue: true, organizer: "Escape Underground Hub",
    startISO: "2026-12-05T23:45:00+02:00", startOnly: true,
    description: "Petrecere.",
    tags: ["Socializare"], source: "zilesinopti.ro"
  },
  {
    id: "tm-sorin-parcalab-2026", title: "Stand-up: Sorin Pârcălab – „Nu-i normal”", category: "social", catalogIcon: "🎤",
    venue: "tmCinemaTimis", organizer: "Cinema Timiș",
    startISO: "2026-12-08T00:00:00+02:00", endISO: "2026-12-09T23:59:59+02:00", dateOnly: true,
    price: 115.59, priceFrom: true, priceInfo: "115,59–158,01 lei; primul show e sold out",
    description: "Patru show-uri de stand-up în două seri, primul de la 18:00. Primul show e sold out.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-radu-isac-20261211", title: "Stand-up: Radu Isac – „Se întorc valorile”", category: "social", catalogIcon: "🎤",
    venue: "tmBrooklyn", organizer: "Brooklyn Food, Drinks & More",
    startISO: "2026-12-11T20:30:00+02:00", startOnly: true,
    price: 73.82, priceFrom: true, priceInfo: "73,82 lei early bird (preț întreg 94,91 lei)",
    description: "Show de stand-up, în varianta late show.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-mos-craciun-sania-20261216", title: "Moș Crăciun vine cu sania în orașul tău!", category: "social", catalogIcon: "🎄",
    venue: "tmVictoriei", organizer: "Moș Crăciun vine cu sania",
    startISO: "2026-12-16T17:00:00+02:00", startOnly: true,
    price: 149, priceFrom: true, priceInfo: "149–374 lei, pachet de familie",
    description: "Spectacol pentru copii.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-standup-intre-doi-20261218", title: "Stand-up: Adelina, Mădălina, Florentin și Gabi – „Între doi fie vorba”", category: "social", catalogIcon: "🎤",
    venue: "tmDaHub", organizer: "DăHUB",
    startISO: "2026-12-18T20:00:00+02:00", startOnly: true,
    price: 50.9, priceInfo: "50,90 lei la flash sale (preț întreg 63,63 lei)",
    description: "Spectacol de stand-up.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-la-dolce-vita-20261218", title: "La Dolce Vita – Christmas Special", category: "social", catalogIcon: "🎉",
    venue: "tmCinemaTimis", organizer: "Cinema Timiș",
    startISO: "2026-12-18T19:00:00+02:00", startOnly: true,
    price: 74.24, priceFrom: true, priceInfo: "74,24 / 95,45 / 111,35 lei",
    description: "Petrecere latino.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-orizont-electric-20261219", title: "Teo, Vio și Costel – „Orizont Electric”", category: "social", catalogIcon: "🎤",
    venue: "capitol", organizer: "Filarmonica Banatul",
    startISO: "2026-12-19T18:30:00+02:00", startOnly: true,
    price: 111.39, priceFrom: true, priceInfo: "111,39–142,58 lei (early bird)",
    description: "Spectacol de stand-up, cu două show-uri, primul la 18:30.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-gherghe-crowd-work-20261220", title: "Gherghe + Publicul = Crowd Work", category: "social", catalogIcon: "🎤",
    venue: "tmDaHub", organizer: "DăHUB",
    startISO: "2026-12-20T19:00:00+02:00", startOnly: true,
    price: 53.63, priceFrom: true, priceInfo: "53,63–75,08 lei",
    description: "Spectacol de stand-up, filmat.",
    tags: ["Socializare"], source: "iabilet.ro"
  },
  {
    id: "tm-mos-craciun-victoriei-20261222", title: "Moș Crăciun în Piața Victoriei și „Spărgătorul de nuci”", category: "social", catalogIcon: "🎄",
    venue: "tmVictoriei", organizer: "Târgul de Crăciun Timișoara",
    startISO: "2026-12-22T00:00:00+02:00", endISO: "2026-12-22T23:59:59+02:00", dateOnly: true,
    priceInfo: "Probabil gratuit, fiind un eveniment public în piață (neconfirmat)",
    description: "Parte din programul Târgului de Crăciun. Verifică ora la organizator.",
    tags: ["Socializare"], source: "goldring.ro"
  },
  {
    id: "tm-revelion-2027", title: "Revelion 2027 în Piața Victoriei", category: "social", catalogIcon: "🎆",
    venue: "tmVictoriei", organizer: "Primăria Municipiului Timișoara",
    startISO: "2026-12-31T00:00:00+02:00", endISO: "2026-12-31T23:59:59+02:00", dateOnly: true,
    price: 0,
    description: "Concert public gratuit. Artiștii nu au fost anunțați încă.",
    tags: ["Muzică","Socializare"], source: "travelreview.ro"
  },
  {
    id: "tm-socio-claus-2026", title: "Socio Claus, ediția IX – târg caritabil și conferințele „Dialoguri despre (diz)abilitate”", category: "voluntariat", catalogIcon: "🤝",
    venue: "uvt", venueName: "UVT, holul de la parter", address: "Bd. Vasile Pârvan 4", organizer: "Universitatea de Vest din Timișoara",
    startISO: "2026-12-07T00:00:00+02:00", endISO: "2026-12-11T23:59:59+02:00", dateOnly: true,
    price: 0,
    description: "Campanie făcută cu studenți voluntari, deschisă între 09:00 și 16:00. Banii strânși merg la terapii pentru persoane cu dizabilități.",
    tags: ["Socializare"], source: "uvt.ro"
  },
  {
    id: "tm-scena-targ-artisti-2026", title: "Scena Târgului de Crăciun – apel pentru artiști voluntari", category: "voluntariat", catalogIcon: "🤝",
    venue: "tmVictoriei", organizer: "Târgul de Crăciun Timișoara",
    startISO: "2026-11-28T00:00:00+02:00", endISO: "2027-01-07T23:59:59+02:00", dateOnly: true,
    description: "Soliști, trupe sau ansambluri se pot înscrie ca să urce pe scena târgului.",
    tags: ["Muzică"], source: "goldring.ro"
  },
  {
    id: "tm-cinema-poti-vedea-totul-20261125", title: "Poți vedea totul", category: "cultura", catalogIcon: "🎬",
    venue: "tmCinemaTimis", organizer: "Cinema Timiș",
    startISO: "2026-11-25T19:00:00+02:00", startOnly: true,
    description: "Documentar despre imagine, manipulare și cât de mult putem cunoaște pe cineva prin film. Subtitrat în română.",
    tags: ["Film", "Documentar"], source: "cinema-timisoara.ro",
    url: "https://cinema-timisoara.ro/filme/poti-vedea-totul/2026-11-25-19-00/"
  },
  {
    id: "tm-cinema-faust-20261126", title: "Cine-Concert Faust", category: "cultura", catalogIcon: "🎬",
    venue: "tmCinemaTimis", organizer: "Centrul Cultural German Timișoara",
    startISO: "2026-11-26T18:30:00+02:00", startOnly: true,
    price: 20, priceFrom: true, priceInfo: "20 lei elevi și studenți · 30 lei tarif întreg",
    description: "Proiecția filmului mut din 1926, acompaniată live de un sextet cu muzică originală.",
    tags: ["Film", "Muzică"], source: "cinema-timisoara.ro",
    url: "https://cinema-timisoara.ro/evenimente/cine-concert-faust/2026-11-26-18-30/"
  },
  {
    id: "tm-cinema-el-ser-querido-20261127", title: "El ser querido (Persoana iubită)", category: "cultura", catalogIcon: "🎬",
    venue: "tmCinemaTimis", organizer: "Cinema Timiș",
    startISO: "2026-11-27T18:30:00+02:00", endISO: "2026-11-27T20:45:00+02:00",
    price: 20, priceFrom: true, priceInfo: "20 lei elevi și studenți · 30 lei tarif întreg",
    description: "O dramă despre un regizor și fiica lui, care se reapropie pe platoul de filmare. În spaniolă, cu subtitrare în română.",
    tags: ["Film"], source: "cinema-timisoara.ro",
    url: "https://cinema-timisoara.ro/filme/el-ser-querido/2026-11-27-18-30/"
  },
  {
    id: "tm-poftim-opera-tur-ghidat-20261217", title: "Tur ghidat la Operă cu Cristian Rudic", category: "cultura", catalogIcon: "🎭",
    venue: "opera", organizer: "Opera Națională Română Timișoara",
    startISO: "2026-12-17T15:00:00+02:00", endISO: "2026-12-17T16:00:00+02:00",
    price: 20,
    description: "O vizită de aproximativ o oră în culisele Operei, cu decoruri și povești despre spectacole. Turul se ține în limba română.",
    tags: ["Artă", "Tur ghidat"], source: "poftimcultura.ro",
    url: "https://www.poftimcultura.ro/seats/1207"
  },
  {
    id: "tm-iabilet-trooper-20270605", title: "Concert Trooper", category: "social", catalogIcon: "🎸",
    venue: "tmCasaTineretului", venueName: "În Spatele Casei", organizer: "În Spatele Casei",
    startISO: "2027-06-05T19:00:00+03:00", startOnly: true,
    price: 50, priceFrom: true, priceInfo: "50 lei în presale · 70 lei tarif întreg",
    description: "Concert heavy metal în spațiul din spatele Casei Tineretului, pe Strada Arieș 19.",
    tags: ["Muzică", "Rock"], source: "iabilet.ro",
    url: "https://www.iabilet.ro/bilete-timisoara-concert-trooper-130534/"
  }
);
