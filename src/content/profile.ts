/**
 * Datele tale personale. Tot ce e aici apare pe site: completează-le.
 */
export const profile = {
  /** Apare în bara de navigare și în titlul paginilor. */
  siteName: "ianovici.catalin",
  name: "Ianovici Catalin-Valentin",
  role: "Inginer și dezvoltator",
  domains: ["Software", "Embedded", "IoT", "AI"],
  headline: ["Construiesc sisteme", "care simt, decid", "și automatizează."],
  /** Partea din titlu afișată mai estompat (al doilea rând). */
  headlineMutedLine: 1,
  intro: "Inginer și dezvoltator. Aici sunt proiectele mele, de la firmware până la aplicații.",
  about: [
    "Scrie aici două-trei fraze despre tine: ce studiezi sau unde lucrezi, ce tip de probleme îți place să rezolvi și ce construiești acum.",
    "Al doilea paragraf poate spune cum lucrezi: de la prototip pe breadboard până la produs care rulează zilnic.",
  ],
  skills: {
    Limbaje: ["C#", "Java", "C", "SQL", "TypeScript"],
    "Backend & date": [".NET", "Spring Boot", "JPA / JDBC", "PostgreSQL", "MySQL"],
    "Automatizare": ["Import și procesare Excel", "ETL", "View-uri SQL pentru raportare"],
    "Interese": ["Embedded", "IoT", "Home Automation", "AI"],
  } as Record<string, string[]>,
  email: "cata45513@gmail.com",
  links: [
    { label: "GitHub", href: "https://github.com/IanoviciCatalin" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/ianovici-catalin-valentin-189459282/" },
  ],
};
