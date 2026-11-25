/**
 * Datele tale personale. Tot ce e aici apare pe site: completează-le.
 */
export const profile = {
  /** Apare în bara de navigare și în titlul paginilor. */
  siteName: "numele-tau.dev",
  name: "Numele Tău",
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
    Limbaje: ["TypeScript", "Python", "C / C++"],
    Embedded: ["ESP32", "STM32", "FreeRTOS", "I²C / SPI / UART"],
    "Web & Cloud": ["React", "Next.js", "Node.js", "Docker"],
    "IoT & Date": ["MQTT", "Home Assistant", "PostgreSQL", "PyTorch"],
  } as Record<string, string[]>,
  email: "email@exemplu.ro",
  links: [
    { label: "GitHub", href: "https://github.com/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
  ],
};
