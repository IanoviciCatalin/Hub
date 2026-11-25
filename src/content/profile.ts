/**
 * Datele tale personale. Tot ce e aici apare pe site: completeaza-le.
 */
export const profile = {
  /** Apare in bara de navigare si in titlul paginilor. */
  siteName: "ianovici.catalin",
  name: "Ianovici Catalin-Valentin",
  role: "Inginer si dezvoltator",
  domains: ["Software", "Embedded", "IoT", "AI"],
  headline: ["Construiesc sisteme", "care simt, decid", "si automatizeaza."],
  /** Partea din titlu afisata mai estompat (al doilea rand). */
  headlineMutedLine: 1,
  intro: "Inginer si dezvoltator. Aici sunt proiectele mele, de la firmware pana la aplicatii.",
  about: [
    "Sunt in anul 4 la Automatica si Calculatoare, la UPT, si studiez Ingineria Sistemelor. Imi place sa fac aplicatii care rezolva probleme reale. De obicei, ideile imi vin cand vad cat timp pierde cineva facand aceiasi pasi de fiecare data.",
    "Atunci ma intreb \u201eoare pot sa automatizez asta?\u201d si incep sa incerc. Asta imi place cel mai mult la programare: sa vad ca ceva facut de mine chiar ii usureaza cuiva munca.",
  ],
  skills: {
    Limbaje: ["C#", "Java", "C", "SQL", "TypeScript"],
    "Backend & date": [".NET", "Spring Boot", "JPA / JDBC", "PostgreSQL", "MySQL"],
    "Automatizare": ["Import si procesare Excel", "ETL", "View-uri SQL pentru raportare"],
    "Interese": ["Embedded", "IoT", "Home Automation", "AI"],
  } as Record<string, string[]>,
  email: "cata45513@gmail.com",
  links: [
    { label: "GitHub", href: "https://github.com/IanoviciCatalin" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/ianovici-catalin-valentin-189459282/" },
  ],
};
