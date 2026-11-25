"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ROOMS } from "./scenes/rooms";
import { useSceneGate } from "./useSceneGate";
import { HouseIllustration } from "./illustrations";

const HouseScene = dynamic(() => import("./scenes/HouseScene"), { ssr: false });

/**
 * Casa 3D a proiectului Home Automation. Camerele se aprind la click pe model
 * sau din butoanele de sub el (care funcționează și cu tastatura și fără WebGL).
 */
export function HouseInteractive({ compact = false }: { compact?: boolean }) {
  const { ref, load, running } = useSceneGate<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  const [lit, setLit] = useState<Record<string, boolean>>({ living: true });
  const toggle = (id: string) => setLit((s) => ({ ...s, [id]: !s[id] }));
  const count = Object.values(lit).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <div ref={ref} className={`relative w-full ${compact ? "aspect-[4/3]" : "aspect-[5/4]"}`}>
        <HouseIllustration lit={lit} className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${ready ? "opacity-0" : "opacity-100"}`} />
        {load && (
          <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
            <HouseScene rooms={ROOMS} lit={lit} onToggle={toggle} active={running} onReady={() => setReady(true)} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lumini pe camere">
        <span className="mr-1 font-mono text-xs text-muted tabular-nums">
          {count}/{ROOMS.length} lumini aprinse
        </span>
        {ROOMS.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={!!lit[r.id]}
            onClick={() => toggle(r.id)}
            className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
              lit[r.id] ? "border-warm/60 bg-warm/10 text-warm" : "border-line-strong text-muted hover:text-fg"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
