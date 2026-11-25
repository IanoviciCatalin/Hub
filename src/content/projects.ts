import type { Project } from "./types";

/**
 * TOATE proiectele site-ului.
 *
 * Ca să adaugi un proiect nou: copiază un obiect de mai jos, schimbă `slug`-ul și
 * conținutul, și gata. Pagina principală, filtrele pe categorii și pagina
 * /projects/<slug>/ se generează automat. Imaginile se pun în
 * public/projects/<slug>/.
 *
 * Proiectele marcate `example: true` sunt locțiitoare: înlocuiește-le cu proiectele tale.
 */
export const projects: Project[] = [
  {
    slug: "home-automation",
    title: "Home Automation",
    category: "automation-iot",
    summary: "Sistem de automatizare a locuinței: lumini, climat și senzori, controlate local și din aplicație.",
    description:
      "Un sistem modular de automatizare a casei, construit în jurul unor noduri ESP32 care comunică prin MQTT cu un server local. Scopul este control rapid, care funcționează și fără internet, plus o aplicație web clară pentru toată familia.",
    year: 2026,
    status: "in-progress",
    tech: ["ESP32", "MQTT", "Home Assistant", "React", "TypeScript"],
    featured: true,
    model: "house",
    links: {},
    sections: [
      {
        title: "Arhitectură",
        body: "Fiecare cameră are un nod ESP32 cu senzori de temperatură și prezență și un releu pentru lumini. Nodurile publică date pe un broker MQTT local, iar serverul aplică regulile de automatizare și expune un API pentru aplicație.",
      },
      {
        title: "Ce urmează",
        body: "Prototipul primei camere, apoi panoul de control web. Proiectul va avea un website dedicat, la care această pagină va trimite direct.",
      },
    ],
  },
  {
    slug: "statie-senzori",
    title: "Stație de senzori",
    category: "embedded",
    summary: "Placă de achiziție pentru temperatură, umiditate și calitatea aerului, cu firmware pe FreeRTOS.",
    description:
      "Proiect exemplu. Înlocuiește-l cu un proiect embedded real: descrie problema, hardware-ul ales și ce ai învățat.",
    year: 2025,
    status: "done",
    tech: ["STM32", "C", "FreeRTOS", "I²C"],
    featured: true,
    model: "board",
    example: true,
    sections: [
      { title: "Hardware", body: "Descrie microcontrollerul, senzorii și alimentarea." },
      { title: "Firmware", body: "Descrie task-urile, comunicarea și consumul de energie." },
    ],
  },
  {
    slug: "aplicatie-web",
    title: "Aplicație web",
    category: "software",
    summary: "Aplicație full-stack, de la API până la interfață. Locțiitor pentru un proiect software.",
    description: "Proiect exemplu. Înlocuiește-l cu o aplicație reală.",
    year: 2025,
    status: "done",
    tech: ["Next.js", "PostgreSQL", "Docker"],
    example: true,
  },
  {
    slug: "clasificare-imagini",
    title: "Clasificare imagini",
    category: "ai-data",
    summary: "Model de viziune antrenat pe date proprii. Locțiitor pentru un proiect AI.",
    description: "Proiect exemplu. Înlocuiește-l cu un proiect AI sau de date real.",
    year: 2024,
    status: "done",
    tech: ["Python", "PyTorch", "OpenCV"],
    example: true,
  },
  {
    slug: "automatizare-irigatii",
    title: "Automatizare irigații",
    category: "automation-iot",
    summary: "Udare automată după umiditatea solului și prognoză. Locțiitor pentru un proiect IoT.",
    description: "Proiect exemplu. Înlocuiește-l cu un proiect IoT real.",
    year: 2024,
    status: "planned",
    tech: ["ESP8266", "Node-RED"],
    example: true,
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

export const statusLabel: Record<Project["status"], string> = {
  planned: "Planificat",
  "in-progress": "În lucru",
  done: "Finalizat",
};
