// Orașe și locații UniPulse. Evenimentele confirmate se editează în events.js.

/* Orașe disponibile. bounds = [[vest, sud], [est, nord]] – harta nu iese din această zonă. */
const CITIES = {
  timisoara: { name: 'Timișoara', emoji: '🏛️', center: [21.2272, 45.7537], zoom: 15.3, bounds: [[21.12, 45.69], [21.33, 45.82]] },
  cluj:      { name: 'Cluj-Napoca', emoji: '🏰', center: [23.5900, 46.7700], zoom: 15.2, bounds: [[23.48, 46.71], [23.70, 46.83]] },
  bucuresti: { name: 'București', emoji: '🏙️', center: [26.0800, 44.4380], zoom: 14.6, bounds: [[25.93, 44.33], [26.25, 44.54]] },
  iasi:      { name: 'Iași', emoji: '⛪', center: [27.5850, 47.1640], zoom: 15.0, bounds: [[27.48, 47.10], [27.69, 47.23]] },
};

const CATEGORIES = {
  hackathon:   { label: 'Hackathon',            icon: '💻' },
  workshop:    { label: 'Workshop',             icon: '🛠️' },
  conferinta:  { label: 'Conferință',           icon: '🎤' },
  cariera:     { label: 'Carieră & Internship', icon: '💼' },
  curs:        { label: 'Curs & Training',      icon: '📚' },
  concurs:     { label: 'Concurs',              icon: '🏆' },
  meetup:      { label: 'Meetup & Echipe',      icon: '🤝' },
  sport:       { label: 'Sport',                icon: '⚽' },
  cultura:     { label: 'Cultură',              icon: '🎭' },
  social:      { label: 'Distracție',           icon: '🎳' },
  voluntariat: { label: 'Voluntariat',          icon: '🌱' },
};

// Categoriile afișate. Tipul original rămâne util pentru căutare și pentru datele salvate.
const EVENT_GROUPS = {
  cultura:     { label: 'Film & cultură', icon: '🎬', color: '#62596F', types: ['cultura'] },
  social:      { label: 'Muzică & ieșiri', icon: '🎵', color: '#805C50', types: ['social', 'meetup'] },
  sport:       { label: 'Sport & jocuri', icon: '⚽', color: '#456558', types: ['sport', 'concurs'] },
  workshop:    { label: 'Învățare & carieră', icon: '📚', color: '#4C6377', types: ['workshop', 'hackathon', 'conferinta', 'cariera', 'curs'] },
  voluntariat: { label: 'Comunitate & voluntariat', icon: '🌱', color: '#746440', types: ['voluntariat'] },
};

const TYPE_GROUPS = Object.fromEntries(Object.entries(EVENT_GROUPS).flatMap(([group, { types }]) =>
  types.map(type => [type, group])
));

function eventGroup(event) {
  if (event.community || event.userCreated) return TYPE_GROUPS[event.category];
  const icon = eventIcon(event);
  if (event.category === 'cultura' && icon === '🎵') return 'social';
  if (event.category === 'social' && ['🎳', '🎲', '♟️', '🃏', '🧩', '🎮'].includes(icon)) return 'sport';
  if (event.category === 'concurs' && ['💻', '🤖', '🔬'].includes(icon)) return 'workshop';
  return TYPE_GROUPS[event.category];
}

/* Pictograma unui eveniment, după ce conține (titlu și etichete, apoi descriere).
   Regulile specifice sunt înaintea celor generale. Fiecare termen începe la margine de cuvânt
   (\b), ca „prototipare” să nu fie „tipar”, „cartier” să nu fie „carti”, iar „marketing” să nu fie „market”. */
const EVENT_ICON_RULES = [
  ['💻', /\bhackat?hon|\bhackaton/],
  ['🎳', /\bbowling|\bpopice/],
  ['⚽', /\bfotbal|\bfootball|\bsoccer|\bfutsal/],
  ['🏀', /\bbaschet|\bbasketball|\bstreetball/],
  ['🏐', /\bvolei|\bvolleyball/],
  ['🏓', /\btenis de masa|\bping.?pong/],
  ['🎾', /\btenis\b|\btennis|\bpadel/],
  ['🤾', /\bhandbal/],
  ['🏊', /\binot\b|\bnatatie|\bpiscin|\bswim/],
  ['🚴', /\bciclism|\bbicicl|\bbike|\bcycling/],
  ['🏃', /\balergare|\bmaraton|\bsemimaraton|\bcros\b|\brunning|\b5k\b|\b10k\b/],
  ['⛸️', /\bpatinaj|\bpatinoar|\bskating/],
  ['⛷️', /\bschi\b|\bski\b|\bsnowboard/],
  ['🧗', /\bescalad|\bcatarare|\bclimbing/],
  ['🧘', /\byoga|\bmeditati/],
  ['🏋️', /\bfitness|\bgym\b|\bsala de forta|\bcrossfit/],
  ['♟️', /\bsah\b|\bchess/],
  ['🎮', /\be-?sports?\b|\bgaming|\bjocuri video|\blan party/],
  ['🎲', /\bboard ?games?|\bjocuri de societate/],
  ['🍽️', /\btasting|\bdegustar|\bfood tour|\bgastronom|\bculinar|\bmancare|\bstreet food|\bbucatar/],
  ['🍕', /\bpizza/],
  ['☕', /\bcafea|\bcoffee|\bcafenea/],
  ['🍷', /\bvinuri|\bwine|\bvin (rosu|alb|fiert)/],
  ['🍺', /\bbere\b|\bbeer|\bcraft beer/],
  ['🎄', /\bcraciun|\bchristmas|\bmos nicolae/],
  ['🎻', /\bopera\b|\bfilarmonic|\bsimfonic|\borchestr|\brecital/],
  ['🎸', /\bconcert|\bfestival de muzica|\brock\b|\blive music/],
  ['🎤', /\bkaraoke|\bstand.?up\b|\bopen mic/],
  ['🎬', /\bfilm|\bcinema|\bproiecti(e|i)/],
  ['🎭', /\bteatru|\bspectacol|\bpiesa\b|\bimprov/],
  ['💃', /\bdans|\bdance|\bsalsa|\bbachata/],
  ['📷', /\bfotograf|\bphoto/],
  ['💎', /\bmineral|\bgeolog|\bfosil|\bcristal/],
  ['📖', /\btipar|\bcarte\b|\bcarti\b|\blectur|\bbibliotec|\bliteratur|\bpoezi/],
  ['🖼️', /\bexpozit|\bgaleri|\barta\b|\bart\b|\bvernisaj|\bmuzeu/],
  ['🔬', /\bstiint|\blaborator|\bcercetare|\bscience/],
  ['🤖', /\brobot/],
  ['🔐', /\bsecuritate|\bcyber|\bctf\b/],
  ['📊', /\bdata\b|\banalytics|\bstatistic/],
  ['🔌', /\belectronic|\barduino|\bhardware|\biot\b/],
  ['💻', /\bprogramare|\bcoding|\bcod\b|\bsoftware|\btech|\btehnolog|\bai\b|\binteligenta artificiala|\bmachine learning|\bdeveloper|\bweb\b|\baplicati|\bprototip/],
  ['🚀', /\bstartup|\bantreprenor|\bpitch|\bincubator|\baccelerator/],
  ['🎨', /\bdesign|\bgrafic|\bilustrati|\bpictur/],
  ['🩺', /\bmedicin|\bsanatate|\bprim ajutor|\bdonare de sange/],
  ['🌳', /\becolog|\bplantare|\bnatura\b|\bmediu\b|\breciclare/],
  ['🌱', /\bvoluntar|\bcaritate|\bong\b/],
  ['💼', /\bcariera|\bjob|\binternship|\bangajar|\brecrutare|\bstagiu/],
  ['🏆', /\bgala\b|\bpremii|\bconcurs|\bcompetiti|\bolimpiad/],
  ['🎓', /\beducati|\buniversitat|\babsolvent|\bstudentesc/],
  ['🎤', /\bconferint|\bforum|\bsummit|\btalk|\bspeaker|\bpanel/],
  ['🛠️', /\bworkshop|\batelier/],
  ['📚', /\bcurs\b|\bcursuri|\btraining|\bbootcamp|\bseminar/],
  ['🛍️', /\btarg|\bbazar|\bmarket\b/],
  ['🎉', /\bpetrecere|\bparty|\bchef\b|\bdistracti/],
  ['🤝', /\bnetworking|\bmeetup|\bsocializ|\bcunoaste/],
];
function eventIcon(e) {
  if (e.catalogIcon) return e.catalogIcon;
  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const head = norm([e.title, ...(e.tags || [])].join(' · '));
  const body = norm(e.description);
  for (const text of [head, body]) {
    const rule = EVENT_ICON_RULES.find(([, pattern]) => pattern.test(text));
    if (rule) return rule[0];
  }
  return CATEGORIES[e.category]?.icon || '📍';
}

const VENUES = {
  upt:     { name: 'Universitatea Politehnica – Rectorat', address: 'Piața Victoriei 2', lat: 45.75370, lng: 21.22520 },
  ac:      { name: 'Facultatea de Automatică și Calculatoare (UPT)', address: 'Bd. Vasile Pârvan 2', lat: 45.74720, lng: 21.22640 },
  uvt:     { name: 'Universitatea de Vest – clădirea centrală', address: 'Bd. Vasile Pârvan 4', lat: 45.74700, lng: 21.23110 },
  bcu:     { name: 'Biblioteca Centrală Universitară „Eugen Todoran”', address: 'Bd. Vasile Pârvan 4A', lat: 45.74640, lng: 21.22950 },
  umft:    { name: 'UMF „Victor Babeș”', address: 'Piața Eftimie Murgu 2', lat: 45.75770, lng: 21.22640 },
  usv:     { name: 'USV „Regele Mihai I” (Agronomie)', address: 'Calea Aradului 119', lat: 45.78380, lng: 21.21760 },
  complex: { name: 'Complexul Studențesc', address: 'Aleea Studenților', lat: 45.74760, lng: 21.23900 },
  sala:    { name: 'Baza sportivă din Complexul Studențesc', address: 'Aleea Studenților', lat: 45.74590, lng: 21.23720 },
  opera:   { name: 'Opera Națională Română Timișoara', address: 'Str. Mărășești 2', lat: 45.75480, lng: 21.22590 },
  capitol: { name: 'Sala Capitol – Filarmonica Banatul', address: 'Bd. C.D. Loga 2', lat: 45.75280, lng: 21.22370 },
  unirii:  { name: 'Piața Unirii', address: 'Piața Unirii', lat: 45.75780, lng: 21.22900 },
  muzeu:   { name: 'Muzeul Național de Artă – Palatul Baroc', address: 'Piața Unirii 1', lat: 45.75740, lng: 21.22950 },
  bastion: { name: 'Bastionul Theresia', address: 'Str. Hector 2', lat: 45.75690, lng: 21.23420 },
  iulius:  { name: 'Iulius Town', address: 'Piața Consiliul Europei 2', lat: 45.76620, lng: 21.22780 },
  rozelor: { name: 'Parcul Rozelor', address: 'Bd. Tinereții', lat: 45.75020, lng: 21.22900 },
  central: { name: 'Parcul Central', address: 'Bd. C.D. Loga', lat: 45.75250, lng: 21.22050 },
  uptBiblioteca: { name: 'Biblioteca UPT', address: 'Bd. Vasile Pârvan 2B', lat: 45.74713, lng: 21.22767 },
  uptArcha: { name: 'ARChA by UPT', address: 'Bd. Mihai Viteazu 1B', lat: 45.74489, lng: 21.22656 },
  uvtPlatani: { name: 'Galeria cu Platani – Art Center UVT', address: 'Campusul UVT', lat: 45.74720, lng: 21.23097 },
};

const LEARNING_TYPES = ['hackathon', 'workshop', 'conferinta', 'cariera', 'curs', 'concurs'];
const TOPIC_TYPES = {
  AI: LEARNING_TYPES, Programare: LEARNING_TYPES, Data: LEARNING_TYPES, Securitate: LEARNING_TYPES,
  Design: [...LEARNING_TYPES, 'cultura'], Startup: [...LEARNING_TYPES, 'meetup'],
  Business: [...LEARNING_TYPES, 'meetup'], Inginerie: LEARNING_TYPES, Robotică: LEARNING_TYPES,
  Medicină: ['workshop', 'conferinta', 'cariera', 'curs', 'concurs', 'voluntariat'],
  'Soft skills': ['workshop', 'conferinta', 'cariera', 'curs', 'meetup', 'voluntariat'],
  Muzică: ['cultura', 'social'], Artă: ['cultura', 'workshop'], Fotbal: ['sport'],
  Socializare: ['meetup', 'social', 'sport', 'voluntariat'], Ecologie: ['voluntariat', 'workshop', 'conferinta'],
};

const FACULTIES = {
  timisoara: ['UPT – Automatică și Calculatoare', 'UPT – Electronică și Telecomunicații', 'UPT – Mecanică',
    'UPT – Construcții / Arhitectură', 'UVT – Matematică și Informatică', 'UVT – Economie', 'UVT – Litere / Drept / Psihologie',
    'UMF „Victor Babeș”', 'USV (Agronomie / Veterinară)'],
  cluj: ['UBB – Matematică și Informatică', 'UBB – Economie (FSEGA)', 'UBB – alte facultăți', 'UTCN – Automatică și Calculatoare',
    'UTCN – alte facultăți', 'UMF „Iuliu Hațieganu”', 'USAMV Cluj'],
  bucuresti: ['UPB – Automatică și Calculatoare', 'UPB – alte facultăți', 'Universitatea din București', 'ASE', 'UMF „Carol Davila”', 'SNSPA'],
  iasi: ['UAIC – Informatică', 'UAIC – alte facultăți', 'TUIASI – Automatică și Calculatoare', 'TUIASI – alte facultăți', 'UMF „Grigore T. Popa”'],
};

/* ---------- Alte orașe ---------- */
Object.assign(VENUES, {
  ubb:      { city: 'cluj', name: 'Universitatea Babeș-Bolyai – clădirea centrală', address: 'Str. Mihail Kogălniceanu 1', lat: 46.76760, lng: 23.59130 },
  utcn:     { city: 'cluj', name: 'Universitatea Tehnică din Cluj-Napoca', address: 'Str. Memorandumului 28', lat: 46.76950, lng: 23.58530 },
  clujarena:{ city: 'cluj', name: 'Cluj Arena', address: 'Aleea Stadionului 2', lat: 46.76860, lng: 23.57220 },
  operacj:  { city: 'cluj', name: 'Opera Națională Română Cluj-Napoca', address: 'Piața Ștefan cel Mare 24', lat: 46.77000, lng: 23.59750 },
  cj_centru: { city: 'cluj', name: 'Piața Unirii', address: 'Piața Unirii', lat: 46.76980, lng: 23.58996 },
  cjKogalniceanu: { city: 'cluj', name: 'Strada Mihail Kogălniceanu', address: 'Str. Mihail Kogălniceanu', lat: 46.76751, lng: 23.59294 },
  cjSalaSporturilor: { city: 'cluj', name: 'Platoul Sălii Sporturilor', address: 'Splaiul Independenței', lat: 46.76395, lng: 23.56687 },
  upb:      { city: 'bucuresti', name: 'Universitatea Politehnica București – Rectorat', address: 'Splaiul Independenței 313', lat: 44.43870, lng: 26.04900 },
  unibuc:   { city: 'bucuresti', name: 'Universitatea din București', address: 'Bd. Regina Elisabeta 4-12', lat: 44.43530, lng: 26.10170 },
  ase:      { city: 'bucuresti', name: 'ASE – Clădirea Ion N. Angelescu', address: 'Piața Romană 6', lat: 44.44660, lng: 26.09750 },
  ateneu:   { city: 'bucuresti', name: 'Ateneul Român', address: 'Str. Benjamin Franklin 1-3', lat: 44.44130, lng: 26.09730 },
  bucMuzeulCopiilor: { city: 'bucuresti', name: 'Muzeul Copiilor', address: 'Bd. Decebal 11, bloc S14', lat: 44.42860, lng: 26.13650 },
  bucConstitutiei: { city: 'bucuresti', name: 'Piața Constituției', address: 'Piața Constituției', lat: 44.42726, lng: 26.09091 },
  bucCampus: { city: 'bucuresti', name: 'Institutul de Cercetare CAMPUS', address: 'Splaiul Independenței 313', lat: 44.43890, lng: 26.05045 },
  uaic:     { city: 'iasi', name: 'Universitatea „Alexandru Ioan Cuza”', address: 'Bd. Carol I 11', lat: 47.17390, lng: 27.57290 },
  tuiasi:   { city: 'iasi', name: 'Universitatea Tehnică „Gheorghe Asachi”', address: 'Bd. Prof. Dimitrie Mangeron 67', lat: 47.15430, lng: 27.59450 },
  palas:    { city: 'iasi', name: 'Palas Iași', address: 'Str. Palas 7A', lat: 47.15630, lng: 27.58680 },
  iasiBcu: { city: 'iasi', name: 'Biblioteca Centrală Universitară', address: 'Str. Păcurari 4', lat: 47.16877, lng: 27.57905 },
  is_opera: { city: 'iasi', name: 'Opera Națională Română Iași', address: 'Str. Agatha Bârsescu 18', lat: 47.16254, lng: 27.58520 },
  iasiUaicR: { city: 'iasi', name: 'UAIC – Corpul R', address: 'Str. Alexandru Lăpușneanu', lat: 47.16670, lng: 27.58092 },
});
