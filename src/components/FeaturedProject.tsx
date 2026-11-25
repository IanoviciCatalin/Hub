import Link from "next/link";
import type { Project } from "@/content/types";
import { categoryLabel } from "@/content/categories";
import { ProjectVisual } from "./ProjectVisual";
import { ExampleBadge, StatusDot, TechList } from "./ProjectMeta";

/** Cardul mare pentru proiectele "featured": text in stanga, obiectul 3D interactiv in dreapta. */
export function FeaturedProject({ project, flip = false }: { project: Project; flip?: boolean }) {
  return (
    <article
      data-reveal
      className="group grid items-center gap-8 rounded-2xl border border-line bg-surface p-6 transition-colors duration-300 hover:border-accent-deep md:grid-cols-2 md:p-10"
      style={{ backgroundImage: "linear-gradient(180deg, rgba(44,74,115,.18), transparent 55%)" }}
    >
      <div className={`flex flex-col gap-5 ${flip ? "md:order-2" : ""}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="eyebrow">{categoryLabel(project.category)}</span>
          <StatusDot status={project.status} />
          {project.example && <ExampleBadge />}
        </div>
        <h3 className="text-3xl font-medium tracking-[-0.03em] md:text-4xl">{project.title}</h3>
        <p className="max-w-[46ch] leading-relaxed text-muted">{project.summary}</p>
        <TechList tech={project.tech} />
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href={`/projects/${project.slug}/`} className="btn btn-primary">
            Exploreaza proiectul <span className="arrow" aria-hidden="true">→</span>
          </Link>
          {project.links?.demo && (
            <a href={project.links.demo} target="_blank" rel="noreferrer" className="btn">
              Deschide aplicatia <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
      <div className={flip ? "md:order-1" : ""}>
        <ProjectVisual project={project} />
      </div>
    </article>
  );
}
