export type CategoryId = "software" | "automation-iot" | "embedded" | "ai-data";

export type ProjectStatus = "planned" | "in-progress" | "done";

/** Obiectul 3D afișat pentru proiect. "none" = doar imaginea de preview. */
export type ProjectModel = "house" | "board" | "pipeline" | "none";

export interface ProjectSection {
  title: string;
  body: string;
}

export interface GalleryItem {
  /** Cale din /public, de ex. "/projects/home-automation/panou.jpg", sau URL video .mp4 */
  src: string;
  alt: string;
  caption?: string;
  kind?: "image" | "video";
}

export interface Project {
  /** Apare în URL: /projects/<slug>/ */
  slug: string;
  title: string;
  category: CategoryId;
  /** O frază, afișată pe card. */
  summary: string;
  /** Paragraful de deschidere al paginii de detaliu. */
  description: string;
  /** Anul proiectului. Opțional: dacă lipsește, nu se afișează. */
  year?: number;
  status: ProjectStatus;
  tech: string[];
  /** Proiectele "featured" primesc cardul mare cu obiect 3D pe pagina principală. */
  featured?: boolean;
  model?: ProjectModel;
  links?: { github?: string; demo?: string; site?: string };
  sections?: ProjectSection[];
  gallery?: GalleryItem[];
  /** true = proiect exemplu, de înlocuit cu unul real. Afișează eticheta „Exemplu”. */
  example?: boolean;
}

export interface Category {
  id: CategoryId;
  label: string;
  blurb: string;
}
