import type { Category } from "./types";

export const categories: Category[] = [
  { id: "software", label: "Software Development", blurb: "Aplicatii web, desktop si unelte." },
  { id: "automation-iot", label: "Automation & IoT", blurb: "Dispozitive conectate si automatizari." },
  { id: "embedded", label: "Embedded Systems", blurb: "Firmware, microcontrollere, hardware." },
  { id: "ai-data", label: "AI & Data", blurb: "Modele, analiza si pipeline-uri de date." },
];

export const categoryLabel = (id: string) =>
  categories.find((c) => c.id === id)?.label ?? id;
