import type { Project } from "@/content/types";
import { categoryLabel } from "@/content/categories";
import { HouseInteractive } from "./HouseInteractive";
import { BoardInteractive } from "./BoardInteractive";

/** Alege vizualul unui proiect: scena 3D, prima imagine din galerie sau un preview generat. */
export function ProjectVisual({ project, compact = false }: { project: Project; compact?: boolean }) {
  if (project.model === "house") return <HouseInteractive compact={compact} />;
  if (project.model === "board") return <BoardInteractive compact={compact} />;
  const cover = project.gallery?.find((g) => g.kind !== "video");
  if (cover)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cover.src} alt={cover.alt} className="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy" />;
  return <GeneratedPreview project={project} />;
}

export function GeneratedPreview({ project }: { project: Project }) {
  return (
    <div
      className="relative flex aspect-[4/3] w-full items-end overflow-hidden rounded-xl border border-line bg-surface p-4"
      style={{
        backgroundImage:
          "linear-gradient(rgba(138,180,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(138,180,255,.06) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
      aria-hidden="true"
    >
      <span className="font-mono text-xs text-muted">{categoryLabel(project.category)}</span>
      <span className="absolute top-4 right-4 font-mono text-[11px] text-accent/80">/{project.slug}</span>
    </div>
  );
}
