import Link from "next/link";
import { categories } from "@/content/categories";
import { projects } from "@/content/projects";

/** Banda de sub hero: proiectul principal + categoriile, fiecare cu numărul de proiecte. */
export function Categories() {
  const lead = projects.find((p) => p.featured);
  return (
    <section id="categorii" className="container-x scroll-mt-20 pb-16" aria-label="Categorii de proiecte">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {lead && (
          <li className="col-span-2 lg:col-span-1">
            <Link
              href={`/projects/${lead.slug}/`}
              className="flex h-full flex-col gap-1 rounded-xl border border-accent-deep bg-gradient-to-b from-accent-ink to-surface p-4 transition-colors hover:border-accent"
            >
              <span className="font-mono text-[11px] text-accent">PROIECT PRINCIPAL</span>
              <span className="font-medium">{lead.title}</span>
              <span className="font-mono text-xs text-muted">{lead.tech.slice(0, 3).join(" · ")}</span>
            </Link>
          </li>
        )}
        {categories.map((c) => {
          const n = projects.filter((p) => p.category === c.id).length;
          return (
            <li key={c.id}>
              <Link
                href={`/#cat-${c.id}`}
                className="flex h-full flex-col gap-1 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong"
              >
                <span className="font-medium">{c.label}</span>
                <span className="text-xs text-muted">{c.blurb}</span>
                <span className="mt-auto pt-2 font-mono text-xs text-muted tabular-nums">
                  {n} {n === 1 ? "proiect" : "proiecte"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
