"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CategoryId, Project } from "@/content/types";
import { categories, categoryLabel } from "@/content/categories";
import { ExampleBadge, StatusDot, TechList } from "./ProjectMeta";

type Filter = CategoryId | "all";

/**
 * Lista tuturor proiectelor, cu filtru pe categorii.
 * Filtrul se poate seta si din link: /#cat-embedded
 */
export function ProjectExplorer({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const read = () => {
      const h = window.location.hash;
      if (h.startsWith("#cat-")) {
        const id = h.slice(5) as CategoryId;
        if (categories.some((c) => c.id === id)) {
          setFilter(id);
          document.getElementById("toate-proiectele")?.scrollIntoView({ block: "start" });
        }
      }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const options: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "Toate", count: projects.length },
    ...categories
      .map((c) => ({ id: c.id as Filter, label: c.label, count: projects.filter((p) => p.category === c.id).length }))
      .filter((o) => o.count > 0),
  ];
  const list = filter === "all" ? projects : projects.filter((p) => p.category === filter);

  return (
    <div id="toate-proiectele" className="flex scroll-mt-24 flex-col gap-6">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div role="tablist" aria-label="Filtreaza dupa categorie" className="inline-flex gap-1 rounded-full border border-line bg-surface p-1">
          {options.map((o) => (
            <button
              key={o.id}
              role="tab"
              type="button"
              aria-selected={filter === o.id}
              onClick={() => setFilter(o.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${
                filter === o.id ? "bg-fg text-bg" : "text-muted hover:text-fg"
              }`}
            >
              {o.label}
              <span className="ml-1.5 font-mono text-[11px] opacity-60 tabular-nums">{o.count}</span>
            </button>
          ))}
        </div>
      </div>

      <ul key={filter} className="flex flex-col">
        {list.map((p, i) => (
          <li key={p.slug} className="page-in border-t border-line last:border-b" style={{ animationDelay: `${i * 50}ms` }}>
            <Link
              href={`/projects/${p.slug}/`}
              className="group grid grid-cols-1 items-center gap-3 py-6 transition-colors sm:grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_380px] md:gap-8"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs text-muted">{categoryLabel(p.category)}</span>
                  {p.year && <span className="font-mono text-xs text-muted tabular-nums">{p.year}</span>}
                  {p.example && <ExampleBadge />}
                </div>
                <h3 className="text-xl font-medium tracking-[-0.02em] transition-colors group-hover:text-accent">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted md:hidden">{p.summary}</p>
              </div>
              <p className="hidden text-sm leading-relaxed text-muted md:block">{p.summary}</p>
              <div className="flex items-center gap-4 sm:justify-end">
                <StatusDot status={p.status} />
                <span className="hidden sm:block">
                  <TechList tech={p.tech} max={2} />
                </span>
                <span aria-hidden="true" className="text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent">
                  →
                </span>
              </div>
            </Link>
          </li>
        ))}
        {list.length === 0 && <li className="border-t border-line py-10 text-muted">Niciun proiect in aceasta categorie deocamdata.</li>}
      </ul>
    </div>
  );
}
