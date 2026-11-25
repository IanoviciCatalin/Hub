import type { Project } from "./types";

/**
 * TOATE proiectele site-ului.
 *
 * Ca sa adaugi un proiect nou: copiaza un obiect de mai jos, schimba `slug`-ul si
 * continutul, si gata. Pagina principala, filtrele pe categorii si pagina
 * /projects/<slug>/ se genereaza automat. Imaginile se pun in
 * public/projects/<slug>/.
 */
const gh = (repo: string) => `https://github.com/IanoviciCatalin/${repo}`;

export const projects: Project[] = [
  {
    slug: "home-automation",
    title: "Home Automation",
    category: "automation-iot",
    summary: "Sistem de automatizare a locuintei: lumini, climat si senzori, controlate local si din aplicatie.",
    description:
      "Proiect in pregatire. Un sistem modular de automatizare a casei, construit in jurul unor noduri ESP32 care comunica prin MQTT cu un server local. Scopul este control rapid, care functioneaza si fara internet, plus o aplicatie web clara pentru toata familia.",
    status: "planned",
    tech: ["ESP32", "MQTT", "Home Assistant", "React", "TypeScript"],
    featured: true,
    model: "house",
    links: {},
    sections: [
      {
        title: "Arhitectura planificata",
        body: "Fiecare camera va avea un nod ESP32 cu senzori de temperatura si prezenta si un releu pentru lumini. Nodurile publica date pe un broker MQTT local, iar serverul aplica regulile de automatizare si expune un API pentru aplicatie.",
      },
      {
        title: "Ce urmeaza",
        body: "Prototipul primei camere, apoi panoul de control web. Proiectul va avea un website dedicat, la care aceasta pagina va trimite direct.",
      },
    ],
  },
  {
    slug: "unipulse",
    title: "UniPulse",
    category: "software",
    summary: "Aplicatie web care aduna intr-un singur loc evenimentele pentru studenti, cu lista, filtre si harta 2D/3D a orasului.",
    description:
      "Aplicatie web construita intr-un weekend. Evenimentele pentru studenti (hackathoane, cariere, workshopuri, sport, cultura) sunt imprastiate pe zeci de site-uri. UniPulse le aduna intr-o lista cu filtre si le arata pe harta, pentru Timisoara, Cluj-Napoca, Bucuresti si Iasi.",
    status: "done",
    tech: ["JavaScript", "HTML", "CSS", "MapLibre GL", "PWA"],
    featured: true,
    links: { demo: "/unipulse/" },
    gallery: [
      { src: "/projects/unipulse/preview.webp", alt: "UniPulse pe mobil, tema dark: harta, lista de evenimente si detaliile unui eveniment" },
      { src: "/projects/unipulse/desktop.webp", alt: "UniPulse pe desktop, tema dark: lista de evenimente si harta Timisoarei" },
    ],
    sections: [
      {
        title: "Ce face",
        body: "Lista de evenimente apare prima, cu filtre pe oras si categorie, iar harta 2D/3D ruleaza in fundal. Fiecare eveniment are link spre sursa oficiala si traseu in Google Maps. Evenimentele expirate dispar automat.",
      },
      {
        title: "Validare",
        body: "Am testat aplicatia cu 20 de studenti: 17 au spus ca ar folosi-o sau ar recomanda-o.",
      },
      {
        title: "Tehnic",
        body: "HTML, CSS si JavaScript, fara framework si fara pas de build. Harta foloseste MapLibre GL si OpenFreeMap. Aplicatia se poate instala pe telefon (PWA), iar lista si salvarile functioneaza si fara internet dupa prima incarcare.",
      },
    ],
  },
  {
    slug: "import-rapoarte-productie",
    title: "Import automat de rapoarte de productie",
    category: "ai-data",
    summary:
      "Aplicatie C# care preia automat rapoartele Excel de productie si rebut din zeci de foldere si le incarca in PostgreSQL pentru analiza.",
    description:
      "Proiect realizat in internship. Rapoartele de productie si de rebut ale mai multor linii erau fisiere Excel imprastiate in foldere separate. Aplicatia le citeste automat, verifica datele si le incarca intr-o baza PostgreSQL, unde view-uri SQL le transforma in indicatori pentru raportare.",
    status: "done",
    tech: ["C#", ".NET 7", "PostgreSQL", "Npgsql", "ExcelDataReader", "SQL"],
    featured: true,
    model: "pipeline",
    links: { github: gh("Internship") },
    sections: [
      {
        title: "Cum functioneaza",
        body: "Fiecare folder sursa are configurata tabela tinta si coloanele obligatorii. Aplicatia parcurge folderele, citeste fiecare fisier Excel, valideaza coloanele si importa randurile intr-o tranzactie, astfel incat un fisier e importat complet sau deloc.",
      },
      {
        title: "Fara importuri duble",
        body: "Pentru fiecare fisier se calculeaza un hash MD5 si se pastreaza intr-o tabela de evidenta. Un fisier deja procesat si nemodificat este sarit, deci aplicatia poate rula zilnic fara sa dubleze date.",
      },
      {
        title: "Raportare",
        body: "View-uri SQL (productie, rebut industrial si domestic) agrega datele importate: cantitati comandate, rebut confirmat si procente, gata de folosit in rapoarte si dashboard-uri.",
      },
    ],
  },
  {
    slug: "sistem-rezervari",
    title: "Sistem de rezervari birouri si parcare",
    category: "software",
    summary: "Aplicatie C# pentru rezervarea birourilor si a locurilor de parcare, cu roluri de angajat, manager si administrator.",
    description:
      "Proiect de programare orientata pe obiecte. Utilizatorii isi aleg rolul, vad locurile libere si pot face, modifica sau anula rezervari pentru un birou si un loc de parcare.",
    status: "done",
    tech: ["C#", ".NET 8", "OOP"],
    links: { github: gh("Proiect-OOP") },
    sections: [
      {
        title: "Functionalitati",
        body: "Vizualizarea locurilor pe tip (birou sau parcare), crearea, modificarea si stergerea rezervarilor, cautarea utilizatorilor dupa ID si lista tuturor utilizatorilor.",
      },
      {
        title: "Design",
        body: "Clase separate pentru utilizatori, roluri, locuri (Birou, Parcare) si rezervari, coordonate de un ReservationSystem care aplica regulile in functie de rolul utilizatorului.",
      },
    ],
  },
  {
    slug: "gestiune-expozitii",
    title: "Gestiune expozitii",
    category: "software",
    summary: "Aplicatie web Spring Boot pentru administrarea expozitiilor: listare, adaugare, stergere si filtrare dupa galerie.",
    description:
      "Aplicatie web in Java construita pe Spring Boot, cu baza de date MySQL. Expozitiile (galerie, titlu, numar) se administreaza dintr-o pagina web generata pe server.",
    status: "done",
    tech: ["Java 17", "Spring Boot", "Spring Data JPA", "MySQL", "Thymeleaf"],
    links: { github: gh("Proiect_Expozitie") },
    sections: [
      {
        title: "Arhitectura",
        body: "Structura clasica pe straturi: entitate JPA, repository Spring Data cu interogari derivate (filtrare si stergere dupa galerie) si un controller MVC care serveste pagina Thymeleaf.",
      },
    ],
  },
  {
    slug: "biblioteca",
    title: "Biblioteca",
    category: "software",
    summary: "Aplicatie C# de consola pentru gestiunea unei biblioteci cu carti si reviste.",
    description:
      "Aplicatie de consola care modeleaza o biblioteca: adaugi carti si reviste si afisezi toate publicatiile. Exercitiu de programare orientata pe obiecte.",
    status: "done",
    tech: ["C#", ".NET 8", "OOP"],
    links: { github: gh("Biblioteca") },
  },
  {
    slug: "magazine-produse-jdbc",
    title: "Magazine si produse",
    category: "software",
    summary: "Program Java care citeste magazine si produse dintr-o baza MySQL prin JDBC si le proceseaza ca obiecte, cu suport JSON.",
    description:
      "Exercitiu Java despre lucrul cu baze de date: datele din tabelele de magazine si produse sunt citite prin JDBC, grupate pe magazin si transformate in obiecte, cu import si export JSON prin Jackson.",
    status: "done",
    tech: ["Java", "JDBC", "MySQL", "Jackson", "Maven"],
    links: { github: gh("expreg") },
  },
  {
    slug: "algoritmi-c",
    title: "Algoritmi in C",
    category: "software",
    summary: "Colectie de probleme rezolvate in C: forma poloneza, functia Manna-Pnueli, problema reginelor si altele.",
    description:
      "Exercitii de algoritmica in C: evaluarea expresiilor in forma poloneza, functia recursiva Manna-Pnueli, problema celor N regine prin backtracking, interclasare si alte probleme clasice.",
    status: "done",
    tech: ["C", "Recursivitate", "Backtracking"],
    links: { github: gh("FormaPoloneza-altele") },
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

export const statusLabel: Record<Project["status"], string> = {
  planned: "In pregatire",
  "in-progress": "In lucru",
  done: "Finalizat",
};
