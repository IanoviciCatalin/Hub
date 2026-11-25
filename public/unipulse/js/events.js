// Selecție editorială. Fiecare poziție are o dată fixă, o sursă și un oraș.
// Pentru perioadele fără program continuu, dateOnly ascunde orele tehnice.
const EVENT_CALENDAR_CHECKED = '2026-11-20';
const ORGANIZER_CALENDARS = {
  timisoara: ['Agenda UPT', 'https://www.upt.ro/evenimente'],
  cluj: ['Agenda VisitCluj', 'https://visitcluj.ro/'],
  bucuresti: ['Agenda ARCUB', 'https://arcub.ro/'],
  iasi: ['Calendarul UAIC', 'https://www.uaic.ro/events/lista/'],
};

const EVENTS = [
  {
    id: 'upt-ai-prototyping-2026', title: 'AI Prototyping Bootcamp', category: 'workshop',
    venue: 'uptBiblioteca', organizer: 'AntreprenoriatUPT',
    startISO: '2026-11-20T00:00:00+02:00', endISO: '2026-11-22T23:59:59+02:00', dateOnly: true,
    description: 'Studenții lucrează în echipe la un prototip cu AI, îl testează și îl prezintă la final. Consultă programul anunțat de organizator.',
    tags: ['AI', 'Startup', 'Prototipare'],
    url: 'https://avizier.upt.ro/?p=10423'
  },
  {
    id: 'upt-forumul-educatiei-2026', title: 'Forumul Educației 2026', category: 'conferinta',
    venue: 'uptBiblioteca', organizer: 'Universitatea Politehnica Timișoara',
    startISO: '2026-11-21T09:30:00+02:00', endISO: '2026-11-21T18:00:00+02:00',
    description: 'O zi dedicată dialogului dintre școală și universitate, găzduită de Biblioteca UPT.',
    tags: ['Educație', 'Universitate'],
    url: 'https://www.upt.ro/evenimente/forumul-educatiei-2026-la-universitatea-politehnica-timisoara-'
  },
  {
    id: 'uvt-andreea-medar-2026', title: 'Since the Wood of Your Window Has Been Blooming II', category: 'cultura',
    venue: 'uvtPlatani', organizer: 'Art Center UVT',
    startISO: '2026-11-03T00:00:00+02:00', endISO: '2026-11-27T23:59:59+02:00', dateOnly: true,
    description: 'Expoziție a artistei Andreea Medar la Galeria cu Platani. Verifică orarul galeriei înainte de vizită.',
    tags: ['Artă', 'Expoziție'],
    url: 'https://uvt.ro/comunicate-presa/artista-andreea-medar-absolventa-a-facultatii-de-arte-si-design-a-uvt-revine-la-timisoara-cu-expozitia-since-the-wood-of-your-window-has-been-blooming-ii-la-galeria-cu-platani/'
  },
  {
    id: 'upt-eudres-hackathon-2026', title: 'Hackathon E³UDRES² – From Idea to Impact', category: 'hackathon',
    venue: 'upt', organizer: 'Universitatea Politehnica Timișoara și E³UDRES²',
    startISO: '2026-12-10T00:00:00+02:00', endISO: '2026-12-11T23:59:59+02:00', dateOnly: true,
    description: 'Echipele de studenți dezvoltă soluții și prezintă prototipuri mentorilor și juriului. Verifică în anunț termenul de înscriere și locul întâlnirii în campus.',
    tags: ['Inginerie', 'Programare', 'Echipe'],
    url: 'https://www.upt.ro/evenimente/hackathon-eudres-2026--from-idea-to-impact'
  },
  {
    id: 'upt-gala-excelentei-2026', title: 'Gala Premiilor de Excelență UPT', category: 'cultura',
    venue: 'uptArcha', organizer: 'Universitatea Politehnica Timișoara',
    startISO: '2026-12-10T17:00:00+02:00', endISO: '2026-12-10T23:59:59+02:00', startOnly: true,
    description: 'Gala comunității UPT la ARChA. Consultă agenda universității pentru condițiile de acces.',
    tags: ['Comunitate', 'Universitate'],
    url: 'https://www.upt.ro/evenimente/gala-premiilor-de-excelenta-upt-2026'
  },
  {
    id: 'cj-planeta-craciun-2026', title: 'Târgul de Crăciun – Planeta Crăciun', category: 'social',
    venue: 'cj_centru', organizer: 'Târgul de Crăciun Cluj-Napoca',
    startISO: '2026-11-20T00:00:00+02:00', endISO: '2027-01-01T23:59:59+02:00', dateOnly: true,
    description: 'Târg de iarnă în Piața Unirii, cu scenă pentru concerte și program de sezon.',
    tags: ['Muzică', 'Târg', 'Crăciun'],
    url: 'https://visitcluj.ro/craciun-magic-in-cluj-napoca/'
  },
  {
    id: 'cj-lights-on-2026', title: 'Lights On și Celălalt Târg de Crăciun', category: 'cultura',
    venue: 'cjKogalniceanu', organizer: 'Lights On Romania',
    startISO: '2026-11-27T00:00:00+02:00', endISO: '2026-12-13T23:59:59+02:00', dateOnly: true,
    description: 'Instalații de artă și lumină în centrul Clujului, cu târg de sezon în zona Mihail Kogălniceanu.',
    tags: ['Artă', 'Design', 'Târg'],
    url: 'https://visitcluj.ro/craciun-magic-in-cluj-napoca/'
  },
  {
    id: 'cj-targ-iarna-2026', title: 'Târgul de Iarnă Cluj-Napoca', category: 'social',
    venue: 'cjSalaSporturilor', organizer: 'Târgul de Iarnă Cluj-Napoca',
    startISO: '2026-11-27T00:00:00+02:00', endISO: '2027-02-15T23:59:59+02:00', dateOnly: true,
    description: 'Târg de sezon cu patinoar pe platoul Sălii Sporturilor. Verifică programul și tarifele înainte de vizită.',
    tags: ['Sport', 'Patinaj', 'Târg'],
    url: 'https://visitcluj.ro/craciun-magic-in-cluj-napoca/'
  },
  {
    id: 'buc-magia-craciunului-2026', title: 'Magia Crăciunului la Muzeul Copiilor', category: 'cultura',
    venue: 'bucMuzeulCopiilor', organizer: 'ARCUB',
    startISO: '2026-11-14T00:00:00+02:00', endISO: '2026-12-23T23:59:59+02:00', dateOnly: true,
    description: 'Patru expoziții și experiențe interactive de iarnă. Programul și biletele sunt pe pagina ARCUB.',
    tags: ['Expoziție', 'Atelier', 'Crăciun'],
    url: 'https://arcub.ro/proiect/magia-craciunului-patru-experiente-interactive-pentru-intreaga-familie'
  },
  {
    id: 'buc-targ-craciun-2026', title: 'Târgul de Crăciun București', category: 'social',
    venue: 'bucConstitutiei', organizer: 'Primăria Municipiului București și AEUB',
    startISO: '2026-11-27T00:00:00+02:00', endISO: '2026-12-27T23:59:59+02:00', dateOnly: true, price: 0,
    description: 'Concerte, produse ale meșterilor locali și gastronomie de sezon în Piața Constituției. Intrarea la târg este liberă.',
    tags: ['Muzică', 'Târg', 'Crăciun'],
    url: 'https://arcub.ro/festival/targul-de-craciun-bucuresti'
  },
  {
    id: 'buc-code-quest-2026', title: 'Hackathon Code Quest 2026', category: 'hackathon',
    venue: 'bucCampus', organizer: 'POLITEHNICA București – Institutul CAMPUS, în parteneriat cu SIE',
    startISO: '2026-12-04T12:00:00+02:00', endISO: '2026-12-05T00:00:00+02:00', price: 0,
    description: 'Competiție de 12 ore pentru proiecte de programare, AI și electronică aplicată. Înscrieri până pe 22 noiembrie, individual sau în echipe de maximum trei.',
    tags: ['Programare', 'AI', 'Electronică'],
    url: 'https://ac.upt.ro/anunturi/hackathon-code-quest-2026-accepta-provocarea-si-transforma-ti-ideile-in-solutii-inovatoare/'
  },
  {
    id: 'iasi-inceputurile-tiparului-2026', title: 'Începuturile tiparului la Iași', category: 'cultura',
    venue: 'iasiBcu', organizer: 'Biblioteca Centrală Universitară „Mihai Eminescu” Iași',
    startISO: '2026-11-02T00:00:00+02:00', endISO: '2026-11-30T23:59:59+02:00', dateOnly: true, price: 0,
    description: 'Expoziție despre cartea românească veche și istoria tiparului din Moldova, cu acces liber.',
    tags: ['Expoziție', 'Istorie', 'Carte'],
    url: 'https://www-new.uaic.ro/vernisajul-expozi%C8%9Biei-%E2%80%9E%C3%AEnceputurile-tiparului-la-ia%C8%99i.-cartea-rom%C3%A2neasc%C4%83-veche-'
  },
  {
    id: 'iasi-la-cenerentola-2026-11-21', title: 'La Cenerentola (Cenușăreasa) – premieră', category: 'cultura',
    venue: 'is_opera', organizer: 'Opera Națională Română Iași',
    startISO: '2026-11-21T18:30:00+02:00', endISO: '2026-11-21T21:30:00+02:00',
    description: 'Opera bufă a lui Rossini, în luna aniversară a Operei din Iași. Disponibilitatea biletelor se verifică la organizator.',
    tags: ['Operă', 'Muzică'],
    url: 'https://www.operaiasi.ro/ticketsys-event/la-cenerentola-3/'
  },
  {
    id: 'iasi-mineralia-2026', title: 'Expoziția Mineralia – Pirita', category: 'cultura',
    venue: 'iasiUaicR', organizer: 'Departamentul de Geologie, UAIC',
    startISO: '2026-11-27T00:00:00+02:00', endISO: '2026-12-01T23:59:59+02:00', dateOnly: true,
    description: 'Expoziție de minerale și fosile cu un stand interactiv de geologie, la parterul Corpului R al UAIC.',
    tags: ['Expoziție', 'Știință', 'Geologie'],
    url: 'https://geology.uaic.ro/2026/expozitia-mineralia-iasi-pirita/'
  },
];
