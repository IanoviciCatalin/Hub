import type { Project } from "./types";

/**
 * TOATE proiectele site-ului.
 *
 * Ca să adaugi un proiect nou: copiază un obiect de mai jos, schimbă `slug`-ul și
 * conținutul, și gata. Pagina principală, filtrele pe categorii și pagina
 * /projects/<slug>/ se generează automat. Imaginile se pun în
 * public/projects/<slug>/.
 */
const gh = (repo: string) => `https://github.com/IanoviciCatalin/${repo}`;

export const projects: Project[] = [
  {
    slug: "home-automation",
    title: "Home Automation",
    category: "automation-iot",
    summary: "Sistem de automatizare a locuinței: lumini, climat și senzori, controlate local și din aplicație.",
    description:
      "Proiect în pregătire. Un sistem modular de automatizare a casei, construit în jurul unor noduri ESP32 care comunică prin MQTT cu un server local. Scopul este control rapid, care funcționează și fără internet, plus o aplicație web clară pentru toată familia.",
    status: "planned",
    tech: ["ESP32", "MQTT", "Home Assistant", "React", "TypeScript"],
    featured: true,
    model: "house",
    links: {},
    sections: [
      {
        title: "Arhitectura planificată",
        body: "Fiecare cameră va avea un nod ESP32 cu senzori de temperatură și prezență și un releu pentru lumini. Nodurile publică date pe un broker MQTT local, iar serverul aplică regulile de automatizare și expune un API pentru aplicație.",
      },
      {
        title: "Ce urmează",
        body: "Prototipul primei camere, apoi panoul de control web. Proiectul va avea un website dedicat, la care această pagină va trimite direct.",
      },
    ],
  },
  {
    slug: "import-rapoarte-productie",
    title: "Import automat de rapoarte de producție",
    category: "ai-data",
    summary:
      "Aplicație C# care preia automat rapoartele Excel de producție și rebut din zeci de foldere și le încarcă în PostgreSQL pentru analiză.",
    description:
      "Proiect realizat în internship. Rapoartele de producție și de rebut ale mai multor linii erau fișiere Excel împrăștiate în foldere separate. Aplicația le citește automat, verifică datele și le încarcă într-o bază PostgreSQL, unde view-uri SQL le transformă în indicatori pentru raportare.",
    status: "done",
    tech: ["C#", ".NET 7", "PostgreSQL", "Npgsql", "ExcelDataReader", "SQL"],
    featured: true,
    model: "pipeline",
    links: { github: gh("Internship") },
    sections: [
      {
        title: "Cum funcționează",
        body: "Fiecare folder sursă are configurată tabela țintă și coloanele obligatorii. Aplicația parcurge folderele, citește fiecare fișier Excel, validează coloanele și importă rândurile într-o tranzacție, astfel încât un fișier e importat complet sau deloc.",
      },
      {
        title: "Fără importuri duble",
        body: "Pentru fiecare fișier se calculează un hash MD5 și se păstrează într-o tabelă de evidență. Un fișier deja procesat și nemodificat este sărit, deci aplicația poate rula zilnic fără să dubleze date.",
      },
      {
        title: "Raportare",
        body: "View-uri SQL (producție, rebut industrial și domestic) agregă datele importate: cantități comandate, rebut confirmat și procente, gata de folosit în rapoarte și dashboard-uri.",
      },
    ],
  },
  {
    slug: "sistem-rezervari",
    title: "Sistem de rezervări birouri și parcare",
    category: "software",
    summary: "Aplicație C# pentru rezervarea birourilor și a locurilor de parcare, cu roluri de angajat, manager și administrator.",
    description:
      "Proiect de programare orientată pe obiecte. Utilizatorii își aleg rolul, văd locurile libere și pot face, modifica sau anula rezervări pentru un birou și un loc de parcare.",
    status: "done",
    tech: ["C#", ".NET 8", "OOP"],
    links: { github: gh("Proiect-OOP") },
    sections: [
      {
        title: "Funcționalități",
        body: "Vizualizarea locurilor pe tip (birou sau parcare), crearea, modificarea și ștergerea rezervărilor, căutarea utilizatorilor după ID și lista tuturor utilizatorilor.",
      },
      {
        title: "Design",
        body: "Clase separate pentru utilizatori, roluri, locuri (Birou, Parcare) și rezervări, coordonate de un ReservationSystem care aplică regulile în funcție de rolul utilizatorului.",
      },
    ],
  },
  {
    slug: "gestiune-expozitii",
    title: "Gestiune expoziții",
    category: "software",
    summary: "Aplicație web Spring Boot pentru administrarea expozițiilor: listare, adăugare, ștergere și filtrare după galerie.",
    description:
      "Aplicație web în Java construită pe Spring Boot, cu bază de date MySQL. Expozițiile (galerie, titlu, număr) se administrează dintr-o pagină web generată pe server.",
    status: "done",
    tech: ["Java 17", "Spring Boot", "Spring Data JPA", "MySQL", "Thymeleaf"],
    links: { github: gh("Proiect_Expozitie") },
    sections: [
      {
        title: "Arhitectură",
        body: "Structură clasică pe straturi: entitate JPA, repository Spring Data cu interogări derivate (filtrare și ștergere după galerie) și un controller MVC care servește pagina Thymeleaf.",
      },
    ],
  },
  {
    slug: "biblioteca",
    title: "Biblioteca",
    category: "software",
    summary: "Aplicație C# de consolă pentru gestiunea unei biblioteci cu cărți și reviste.",
    description:
      "Aplicație de consolă care modelează o bibliotecă: adaugi cărți și reviste și afișezi toate publicațiile. Exercițiu de programare orientată pe obiecte.",
    status: "done",
    tech: ["C#", ".NET 8", "OOP"],
    links: { github: gh("Biblioteca") },
  },
  {
    slug: "magazine-produse-jdbc",
    title: "Magazine și produse",
    category: "software",
    summary: "Program Java care citește magazine și produse dintr-o bază MySQL prin JDBC și le procesează ca obiecte, cu suport JSON.",
    description:
      "Exercițiu Java despre lucrul cu baze de date: datele din tabelele de magazine și produse sunt citite prin JDBC, grupate pe magazin și transformate în obiecte, cu import și export JSON prin Jackson.",
    status: "done",
    tech: ["Java", "JDBC", "MySQL", "Jackson", "Maven"],
    links: { github: gh("expreg") },
  },
  {
    slug: "algoritmi-c",
    title: "Algoritmi în C",
    category: "software",
    summary: "Colecție de probleme rezolvate în C: forma poloneză, funcția Manna-Pnueli, problema reginelor și altele.",
    description:
      "Exerciții de algoritmică în C: evaluarea expresiilor în forma poloneză, funcția recursivă Manna-Pnueli, problema celor N regine prin backtracking, interclasare și alte probleme clasice.",
    status: "done",
    tech: ["C", "Recursivitate", "Backtracking"],
    links: { github: gh("FormaPoloneza-altele") },
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

export const statusLabel: Record<Project["status"], string> = {
  planned: "În pregătire",
  "in-progress": "În lucru",
  done: "Finalizat",
};
