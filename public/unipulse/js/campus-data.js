// Ghid campus UPT: clădiri, intrări, reguli pentru codurile de sală și traseele din turul virtual.
// Surse:
//  - Contururi, corpuri și intrări: OpenStreetMap (© contribuitorii OSM, ODbL), verificate pe 20.11.2026.
//  - Prefixe M / N / SPM / LN / T: Facultatea de Mecanică, Anexa A3 „Spații de învățământ”, 2026.
//  - Clădirea Electro (corpurile A, B, C, D), Bd. V. Pârvan 2: admitere AC 2025 + OSM.
//  - Panorame: turul virtual UPT, https://visit360.upt.ro/ (numărul = poziția în tur, #media=N).
// Câmpul verify: true marchează date pe care trebuie să le confirmi pe teren.

const CAMPUS_TOUR_URL = 'https://visit360.upt.ro/';

const CAMPUS_BUILDINGS = {
  mecM: {
    faculty: 'mec', name: 'Facultatea de Mecanică – Corp M (aripa veche)', short: 'Corp M',
    address: 'Bd. Mihai Viteazu 1', levels: 4,
    center: [21.22592, 45.74595],
    entrance: [21.226077, 45.746345], entranceName: 'intrarea principală dinspre Bd. Mihai Viteazu',
    approach: 'Intră pe poarta de pe Bd. Mihai Viteazu, lângă bustul lui Ioan Anton, și mergi pe alee până la ușa clădirii.',
    wing: 'Corp M este aripa veche, partea de sud a clădirii (spre stația de autobuz „Facultatea de Mecanică”).',
    pano: 709, panoPath: [360, 709],
  },
  mecN: {
    faculty: 'mec', name: 'Facultatea de Mecanică – Corp N (aripa nouă)', short: 'Corp N',
    address: 'Bd. Mihai Viteazu 1', levels: 5,
    center: [21.22614, 45.74643],
    entrance: [21.226077, 45.746345], entranceName: 'intrarea principală dinspre Bd. Mihai Viteazu',
    approach: 'Intră pe poarta de pe Bd. Mihai Viteazu, lângă bustul lui Ioan Anton, și mergi pe alee până la ușa clădirii.',
    wing: 'Corp N este aripa nouă, partea de nord a clădirii (spre Bd. Vasile Pârvan și Parcul UPT).',
    pano: 709, panoPath: [360, 709],
  },
  spm: {
    faculty: 'mec', name: 'Clădirea SPM (Corp S) – Facultatea de Mecanică', short: 'SPM',
    address: 'Bd. Mihai Viteazu 1', levels: 3,
    center: [21.22700, 45.74551],
    entrance: [21.226452, 45.745222], entranceName: 'intrarea principală SPM (latura de sud)', verify: true,
    approach: 'Clădirea SPM este cea lungă, de trei niveluri, din spatele Facultății de Mecanică, lângă Căminul 1MV.',
    pano: 807, panoPath: [807],
  },
  orologerie: {
    faculty: 'mec', name: 'Clădirea Orologerie (Corp O) – Facultatea de Mecanică', short: 'Orologerie',
    address: 'Bd. Mihai Viteazu 1', levels: 5,
    center: [21.22712, 45.74643],
    entrance: [21.227137, 45.746262], entranceName: 'intrarea principală Orologerie (latura de sud, spre Parcul UPT)',
    approach: 'Orologerie este clădirea de cărămidă de pe latura de nord a Parcului UPT.',
    pano: 731, panoPath: [731],
  },
  barglazan: {
    faculty: 'mec', name: 'Corp M.H. · Laboratorul „Aurel Bărglăzan”', short: 'Corp M.H.',
    address: 'Bd. Mihai Viteazu 1', levels: 1,
    center: [21.226526, 45.746332],
    entrance: [21.226526, 45.746332], entranceName: 'clădirea laboratorului (intrarea nu e marcată pe hartă)', verify: true,
    approach: 'Pavilionul galben din curtea Mecanicii. Intrarea dinspre alee are uși albe duble sub o copertină brună.',
    pano: 772,
  },
  mecCurte: {
    faculty: 'mec', name: 'Laboratoarele din curtea Facultății de Mecanică', short: 'Curtea Mecanică',
    address: 'Bd. Mihai Viteazu 1', levels: 1,
    center: [21.2266, 45.7458],
    entrance: [21.226077, 45.746345], entranceName: 'intrarea principală a Facultății de Mecanică', verify: true,
    approach: 'Laboratoarele sunt în curtea din spatele clădirii principale. De la intrare, urmează turul 360° până la laborator.',
    pano: 709, panoPath: [360, 709],
  },
  aspc: {
    faculty: 'ac', name: 'Clădirea ASPC (Atelierul Școlar pentru Proiectare și Cercetare)', short: 'ASPC',
    address: 'Str. Traian Lalescu 2', levels: 4,
    center: [21.231588, 45.745884],
    entrance: [21.231588, 45.745884], entranceName: 'clădirea ASPC (intrarea nu e marcată pe hartă)', verify: true,
    approach: 'ASPC este lângă Facultatea de Construcții, pe Str. Traian Lalescu, în spatele stadionului Știința.',
    pano: 617, panoPath: [617],
  },
  electroA: {
    faculty: 'ac', name: 'Clădirea Electro – Corp A', short: 'Corp A',
    address: 'Bd. Vasile Pârvan 2', levels: 4,
    center: [21.226995, 45.747258],
    entrance: [21.226845, 45.747358], entranceName: 'intrarea principală Electro, dinspre Bd. Vasile Pârvan',
    approach: 'Clădirea Electro este pe Bd. Vasile Pârvan, la stația „Facultatea de Electrotehnică”. Intrarea principală e în Corpul A.',
    wing: 'Corp A este corpul din mijloc, cu 4 niveluri, cu fațada spre Bd. Vasile Pârvan.',
    pano: 408, panoPath: [355, 408],
  },
  electroB: {
    faculty: 'ac', name: 'Clădirea Electro – Corp B (Automatică și Calculatoare)', short: 'Corp B',
    address: 'Bd. Vasile Pârvan 2', levels: 9,
    center: [21.226178, 45.747308],
    entrance: [21.226845, 45.747358], entranceName: 'intrarea principală Electro, dinspre Bd. Vasile Pârvan',
    approach: 'Clădirea Electro este pe Bd. Vasile Pârvan, la stația „Facultatea de Electrotehnică”. Intră pe la Corpul A și treci în Corpul B.',
    wing: 'Corp B este turnul de 9 niveluri din capătul de vest (spre Bd. Mihai Viteazu). Aici e Facultatea de Automatică și Calculatoare.',
    pano: 408, panoPath: [355, 408],
  },
  electroC: {
    faculty: 'ac', name: 'Clădirea Electro – Corp C (Electronică)', short: 'Corp C',
    address: 'Bd. Vasile Pârvan 2', levels: 5,
    center: [21.22779, 45.747155],
    entrance: [21.226845, 45.747358], entranceName: 'intrarea principală Electro, dinspre Bd. Vasile Pârvan',
    approach: 'Clădirea Electro este pe Bd. Vasile Pârvan. Intră pe la Corpul A și mergi spre capătul de est, în Corpul C.',
    wing: 'Corp C este corpul de 5 niveluri din capătul de est (spre Biblioteca UPT).',
    pano: 408, panoPath: [355, 408],
  },
  electroD: {
    faculty: 'ac', name: 'Clădirea Electro – Corp D', short: 'Corp D',
    address: 'Bd. Vasile Pârvan 2', levels: 2,
    center: [21.22733, 45.746864],
    entrance: [21.227354, 45.746956], entranceName: 'intrarea Corpului D', verify: true,
    approach: 'Corpul D este clădirea joasă, de 2 niveluri, din spatele clădirii Electro, spre Parcul UPT.',
    wing: 'Corp D este corpul jos, de 2 niveluri, din spate (latura de sud).',
    pano: 408, panoPath: [355, 408],
  },
  chimie: {
    faculty: 'other', name: 'Facultatea de Chimie Industrială', short: 'Chimie',
    address: 'Bd. Vasile Pârvan 6', levels: 5,
    center: [21.2331387, 45.7477872],
    entrance: [21.2331387, 45.7477872], entranceName: 'Facultatea de Chimie (punct publicat de UPT)',
    approach: 'Chimie este pe Bd. Vasile Pârvan 6, mai departe pe bulevard, spre Complexul Studențesc.',
    pano: 473, panoPath: [473],
  },
};

const CAMPUS_FACULTIES = {
  mec: { name: 'Facultatea de Mecanică', orar: 'https://mec.upt.ro/orare-2/' },
  ac: { name: 'Facultatea de Automatică și Calculatoare', orar: 'https://ac.upt.ro/orare/' },
};

// Săli și locuri care au panoramă proprie în turul UPT. path = drumul în tur, de la intrare până acolo.
const CAMPUS_PLACES = [
  // Mecanică – clădirea principală
  { id: 'mec-hol', name: 'Holul principal – Mecanică', aliases: ['hol mecanica', 'mecanica'], building: 'mecN', media: 709, path: [360, 709] },
  { id: 'mec-secretariat', name: 'Secretariat – Mecanică', aliases: ['secretariat mecanica', 'secretariat mec'], building: 'mecN', media: 714, path: [360, 709, 711, 712, 713, 714] },
  { id: 'mec-decanat', name: 'Decanat – Mecanică', aliases: ['decanat mecanica', 'decanat mec'], building: 'mecN', media: 713, path: [360, 709, 711, 712, 713] },
  { id: 'amf-lalescu', name: 'Amfiteatrul „Traian Lalescu”', aliases: ['traian lalescu', 'lalescu', 'amf lalescu'], building: 'mecN', floor: 1, media: 730, path: [360, 135, 723, 724, 725, 728, 729, 730] },
  { id: 'amf-anton', name: 'Amfiteatrul „Ioan Anton”', aliases: ['ioan anton', 'anton', 'amf anton'], building: 'mecN', floor: 1, media: 717, path: [360, 709, 711, 715, 717] },
  { id: 'lab-cnc', name: 'Laboratorul CNC', aliases: ['cnc'], building: 'mecCurte', media: 768, path: [360, 135, 822, 821, 767, 768] },
  { id: 'lab-motoare', name: 'Laboratorul de Motoare', aliases: ['motoare', 'motoare cu ardere interna'], building: 'mecCurte', media: 756, path: [360, 135, 822, 821, 767, 152, 830, 755, 756] },
  { id: 'lab-sudura', name: 'Laboratorul de Sudură', aliases: ['sudura'], building: 'mecCurte', media: 796, path: [360, 135, 822, 821, 767, 152, 830, 755, 792, 824, 796] },
  { id: 'lab-3d', name: 'Laboratorul de Măsurări 3D', aliases: ['masurari 3d', 'masuratori 3d'], building: 'mecCurte', media: 800, path: [360, 135, 822, 821, 767, 152, 830, 755, 792, 824, 796, 800] },
  { id: 'lab-rezistenta', name: 'Laboratorul de Încercări de Rezistență', aliases: ['incercari de rezistenta', 'rezistenta materialelor'], building: 'mecCurte', media: 803, path: [360, 136, 140, 143, 149, 150, 104, 802, 803] },
  { id: 'lab-tm', name: 'Laboratorul de Tehnologia Materialelor', aliases: ['tehnologia materialelor'], building: 'mecCurte', media: 789, path: [360, 135, 822, 821, 767, 152, 787, 788, 789] },
  { id: 'lab-auto', name: 'Laboratorul de Autovehicule Rutiere', aliases: ['autovehicule', 'autovehicule rutiere'], building: 'mecCurte', media: 764, path: [360, 136, 140, 143, 149, 150, 104, 802, 827, 763, 764] },
  { id: 'lab-loco', name: 'Laboratorul de Transporturi (Locomotive)', aliases: ['locomotive', 'transporturi'], building: 'mecCurte', media: 793, path: [360, 135, 822, 821, 767, 152, 830, 755, 792, 793] },
  { id: 'lab-hidraulice', name: 'Laboratorul de Mașini Hidraulice „Aurel Bărglăzan”', aliases: ['masini hidraulice', 'barglazan', 'hidraulice', 'corp mh'], building: 'barglazan', floor: 0, media: 772, path: [360, 136, 140, 143, 144, 145, 772] },
  // SPM
  { id: 'spm-miscare', name: 'Laboratorul de Analiza Mișcării (SPM)', aliases: ['analiza miscarii'], building: 'spm', floor: 2, media: 820, path: [807, 808, 809, 815, 819, 818, 820] },
  { id: 'spm-medicale', name: 'Explorări Medicale și Sisteme Biologice (SPM)', aliases: ['explorari medicale', 'sisteme biologice'], building: 'spm', floorText: 'mezanin', media: 810, path: [807, 808, 809, 810] },
  { id: 'spm-micro', name: 'Centrul de Micro și Nanoingineria Materialelor (SPM)', aliases: ['micro si nano', 'nanoingineria'], building: 'spm', floor: 1, media: 816, path: [807, 808, 809, 815, 814, 816] },
  // Orologerie
  { id: 'or-kuka', name: 'Laboratorul de Robotică KUKA', aliases: ['kuka', 'robotica kuka'], building: 'orologerie', media: 733, path: [731, 732, 733] },
  { id: 'or-robotica', name: 'Laboratorul de Robotică', aliases: ['robotica'], building: 'orologerie', floor: 4, media: 742, path: [731, 732, 736, 737, 754, 753, 741, 742] },
  { id: 'or-fabricatie', name: 'Fabricație, Testare și Evaluare', aliases: ['fabricatie', 'testare si evaluare'], building: 'orologerie', floor: 2, media: 750, path: [731, 732, 736, 737, 754, 753, 752, 751, 750] },
  { id: 'or-actionare', name: 'Sisteme de Acționare și Automatizări', aliases: ['sisteme de actionare', 'actionari'], building: 'orologerie', floorText: 'mezanin', media: 738, path: [731, 732, 736, 737, 738] },
  { id: 'or-3d', name: 'Laboratorul de Proiectare 3D', aliases: ['proiectare 3d'], building: 'orologerie', floor: 4, media: 745, path: [731, 732, 736, 737, 754, 753, 741, 745] },
  // Automatică și Calculatoare (clădirea Electro)
  { id: 'ac-hol', name: 'Holul principal – Electro / AC', aliases: ['hol ac', 'hol electro', 'automatica', 'electro'], building: 'electroA', media: 408, path: [355, 408] },
  { id: 'ac-secretariat', name: 'Secretariat – Automatică și Calculatoare', aliases: ['secretariat ac', 'secretariat automatica'], building: 'electroA', media: 411, path: [355, 408, 411] },
  { id: 'ac-decanat', name: 'Decanat – Automatică și Calculatoare', aliases: ['decanat ac', 'decanat automatica'], building: 'electroA', media: 412, path: [355, 408, 618, 412] },
  { id: 'ac-b419', name: 'Laboratorul B419', aliases: ['b419', 'b 419'], room: 'B419', building: 'electroB', floor: 4, media: 392, path: [355, 408, 618, 412, 413, 414, 415, 387, 388, 389, 394, 392] },
  { id: 'ac-forvia', name: 'Laboratorul FORVIA', aliases: ['forvia'], building: 'electroB', floor: 3, media: 380, path: [355, 408, 618, 412, 413, 414, 415, 387, 386, 380] },
  { id: 'ac-nokia', name: 'Laboratorul NOKIA', aliases: ['nokia'], building: 'electroB', floor: 3, media: 382, path: [355, 408, 618, 412, 413, 414, 415, 387, 386, 385, 382] },
  { id: 'ac-aidb', name: 'Laboratorul AI & DB', aliases: ['ai db', 'ai & db', 'ai si db'], building: 'electroB', floor: 6, media: 397, path: [355, 408, 618, 412, 413, 414, 415, 387, 388, 395, 396, 400, 397] },
  { id: 'ac-curs6', name: 'Sala de curs, etajul 6 (AC)', aliases: ['sala de curs etaj 6', 'curs et 6'], building: 'electroB', floor: 6, media: 416, path: [355, 408, 618, 412, 413, 414, 415, 387, 388, 395, 396, 416] },
  { id: 'chimie-a3', name: 'Amfiteatrul A3 – Chimie', aliases: ['a3 chimie', 'amf a3', 'amfiteatrul a3', 'a3'], building: 'chimie' },
];

// Pilot · repere observate în turul UPT. Unghiurile privesc în direcția pasului.
// Corpus: Ghid către laboratoarele UPT, verificare documentară din 21.11.2026.
const CAMPUS_GUIDES = {
  'lab-hidraulice': {
    entry: { title: 'Găsește pavilionul galben', text: 'Pe latura spre aleea curții, caută ușile albe duble sub copertina brună.', media: 145, yaw: 83.83 },
    approaches: [
      { name: 'Bd. Mihai Viteazu', text: 'Intră pe poarta Mecanicii. Urmează aleea pe lângă corpurile principale până la pavilionul galben.', path: [360, 136, 140, 143, 144, 145] },
      { name: 'Orologerie', text: 'Treci pe lângă fântâna rotundă și continuă pe aleea curții până la pavilionul galben.', path: [731, 155, 832, 831, 145] },
      { name: 'Stadionul Știința', text: 'Din dreptul corpului IMF, mergi de-a lungul gardului până la fântână și urmează aleea către laborator.', path: [167, 159, 161, 155, 832, 831, 145] },
      { name: 'Curtea SPM · dinspre 1MV', text: 'După ce ai ajuns în curtea SPM, treci pe aleea dintre corpurile Mecanicii până la pavilion. Poarta dinspre 1MV se confirmă la fața locului.', path: [151, 144, 145] },
    ],
    steps: [
      { title: 'Intră pe ușa dublă', text: 'Treci pe sub copertina brună. Ușa dă direct în hală, la parter.', media: 145, yaw: 83.83 },
      { title: 'Recunoaște laboratorul', text: 'În hală se văd țevi albastre și verzi, pompe și motoare roșii, pe standuri.', media: 772 },
    ],
  },
  'ac-b419': {
    entry: { title: 'Intră în Electro pe Bd. Vasile Pârvan', text: 'Folosește intrarea principală de sub copertina rotunjită, în Corp A.', media: 355 },
    steps: [
      { title: 'Treci din Corp A în Corp B', text: 'Din holul vitrat, mergi către Corp B, turnul dinspre Bd. Mihai Viteazu.', media: 408 },
      { title: 'Urcă la etajul 4', text: 'Ieși în holul mai larg și continuă pe coridorul îngust către B419.', media: 389 },
      { title: 'Caută ușa dublă albă', text: 'Dinspre hol, pe coridor, ușa B419 este în dreapta. Plăcuța e lângă toc.', media: 394, yaw: -6.86 },
      { title: 'Recunoaște laboratorul', text: 'Înăuntru se văd calculatoare pe mese albe, scaune negre și grafică alb-galbenă pe perete.', media: 392 },
    ],
  },
  'spm-miscare': {
    entry: { title: 'Intră în Corp S · SPM', text: 'Din curtea Mecanicii, caută accesul de sub copertina curbată. Intrarea exactă pe hartă se confirmă pe teren.', media: 807 },
    steps: [
      { title: 'Ia scara din hol', text: 'Din holul de intrare, urcă la etajul 2. Urmărește coridorul cu rame roșii deasupra ușilor.', media: 808 },
      { title: 'Urmează holul cu rame roșii', text: 'Continuă pe culoarul de la etajul 2 până la zona cu uși albe.', media: 819 },
      { title: 'Caută plăcuța albastră', text: 'Dinspre palier, pe coridor, ușa albă cu plăcuța albastră este în stânga.', media: 818, yaw: 43.96 },
      { title: 'Recunoaște laboratorul', text: 'Podeaua e albastră, calculatoarele sunt la perete, iar în mijloc sunt aparate și spațiu liber pentru măsurători.', media: 820 },
    ],
  },
};

// Puncte de plecare când locația telefonului nu e disponibilă.
const CAMPUS_STARTS = [
  { id: 'stop-mec', name: 'Stația „Facultatea de Mecanică” (autobuz)', coord: [21.225765, 45.745007] },
  { id: 'stop-electro', name: 'Stația „Facultatea de Electrotehnică” (autobuz, troleibuz)', coord: [21.226356, 45.747679] },
  { id: 'complex', name: 'Complexul Studențesc (Aleea Studenților)', coord: [21.23900, 45.74760] },
  { id: 'camin-1mv', name: 'Căminul 1MV', coord: [21.226678, 45.745163] },
  { id: 'biblioteca', name: 'Biblioteca Centrală UPT', coord: [21.228849, 45.747042] },
  { id: 'rectorat', name: 'Rectoratul UPT (Piața Victoriei 2)', coord: [21.22520, 45.75370] },
];

// Zona campusului: în afara ei nu folosim GPS-ul ca punct de plecare.
const CAMPUS_AREA = [[21.205, 45.735], [21.250, 45.765]];
