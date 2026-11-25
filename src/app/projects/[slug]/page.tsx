import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, projects } from "@/content/projects";
import { categoryLabel } from "@/content/categories";
import { ProjectVisual } from "@/components/ProjectVisual";
import { ExampleBadge, StatusDot, TechList } from "@/components/ProjectMeta";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProject((await params).slug);
  return p ? { title: p.title, description: p.summary } : {};
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const idx = projects.indexOf(project);
  const next = projects[(idx + 1) % projects.length];
  const links = [
    project.links?.github && { label: "Cod pe GitHub", href: project.links.github },
    project.links?.demo && { label: "Demo live", href: project.links.demo },
    project.links?.site && { label: "Website-ul proiectului", href: project.links.site },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <article className="container-x flex flex-col gap-16 pt-10 pb-24 md:pt-14">
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-muted">
        <Link href="/#proiecte" className="hover:text-fg">
          ← Proiecte
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/#cat-${project.category}`} className="hover:text-fg">
          {categoryLabel(project.category)}
        </Link>
      </nav>

      <header className="grid items-center gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="line-in flex flex-wrap items-center gap-3" style={{ "--i": 0 } as React.CSSProperties}>
            <span className="eyebrow">{categoryLabel(project.category)}</span>
            <StatusDot status={project.status} />
            {project.year && <span className="font-mono text-xs text-muted tabular-nums">{project.year}</span>}
            {project.example && <ExampleBadge />}
          </div>
          <h1 className="line-in text-[clamp(2.4rem,6vw,4.2rem)] font-medium leading-[1.03] tracking-[-0.035em]" style={{ "--i": 1 } as React.CSSProperties}>
            {project.title}
          </h1>
          <p className="line-in max-w-[50ch] text-lg leading-relaxed text-muted" style={{ "--i": 2 } as React.CSSProperties}>
            {project.description}
          </p>
          <div className="line-in" style={{ "--i": 3 } as React.CSSProperties}>
            <TechList tech={project.tech} />
          </div>
          {links.length > 0 && (
            <div className="line-in flex flex-wrap gap-3" style={{ "--i": 4 } as React.CSSProperties}>
              {links.map((l, i) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className={`btn ${i === 0 ? "btn-primary" : ""}`}>
                  {l.label} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 md:p-6">
          <ProjectVisual project={project} />
        </div>
      </header>

      {project.sections && project.sections.length > 0 && (
        <section className="grid gap-x-16 gap-y-10 border-t border-line pt-12 md:grid-cols-2" aria-label="Detalii tehnice">
          {project.sections.map((s) => (
            <div key={s.title} data-reveal className="flex max-w-[60ch] flex-col gap-3">
              <h2 className="text-xl font-medium tracking-[-0.02em]">{s.title}</h2>
              <p className="leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </section>
      )}

      {project.gallery && project.gallery.length > 0 && (
        <section className="flex flex-col gap-6 border-t border-line pt-12" aria-label="Galerie">
          <h2 className="text-xl font-medium tracking-[-0.02em]">Galerie</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {project.gallery.map((g) => (
              <figure key={g.src} data-reveal className="flex flex-col gap-2">
                {g.kind === "video" ? (
                  <video src={g.src} controls preload="metadata" className="w-full rounded-xl border border-line" aria-label={g.alt} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.src} alt={g.alt} loading="lazy" className="w-full rounded-xl border border-line" />
                )}
                {g.caption && <figcaption className="text-sm text-muted">{g.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {next && next.slug !== project.slug && (
        <Link
          href={`/projects/${next.slug}/`}
          className="group flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-surface p-8 transition-colors hover:border-accent-deep"
        >
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Următorul proiect</span>
            <span className="text-2xl font-medium tracking-[-0.02em] md:text-3xl">{next.title}</span>
          </div>
          <span aria-hidden="true" className="text-2xl text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent">
            →
          </span>
        </Link>
      )}
    </article>
  );
}
