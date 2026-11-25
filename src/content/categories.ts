import type { Category } from "./types";

export const categories: Category[] = [
  { id: "software", label: "Software Development", blurb: "Aplicații web, desktop și unelte." },
  { id: "automation-iot", label: "Automation & IoT", blurb: "Dispozitive conectate și automatizări." },
  { id: "embedded", label: "Embedded Systems", blurb: "Firmware, microcontrollere, hardware." },
  { id: "ai-data", label: "AI & Data", blurb: "Modele, analiză și pipeline-uri de date." },
];

export const categoryLabel = (id: string) =>
  categories.find((c) => c.id === id)?.label ?? id;
