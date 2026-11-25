import type { Project } from "@/content/types";
import { statusLabel } from "@/content/projects";

export function StatusDot({ status }: { status: Project["status"] }) {
  const color = status === "done" ? "bg-fg" : status === "in-progress" ? "bg-accent" : "bg-muted";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${color} ${status === "in-progress" ? "animate-pulse motion-reduce:animate-none" : ""}`} />
      {statusLabel[status]}
    </span>
  );
}

export function TechList({ tech, max }: { tech: string[]; max?: number }) {
  const shown = max ? tech.slice(0, max) : tech;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tehnologii">
      {shown.map((t) => (
        <li key={t} className="chip">
          {t}
        </li>
      ))}
      {max && tech.length > max && <li className="chip">+{tech.length - max}</li>}
    </ul>
  );
}

export function ExampleBadge() {
  return (
    <span className="rounded-full border border-dashed border-line-strong px-2 py-0.5 font-mono text-[11px] text-muted" title="Proiect locțiitor, de înlocuit în src/content/projects.ts">
      Exemplu
    </span>
  );
}
