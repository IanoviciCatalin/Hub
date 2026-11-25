"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { PINS } from "./scenes/pins";
import { useSceneGate } from "./useSceneGate";
import { BoardIllustration } from "./illustrations";

const BoardScene = dynamic(() => import("./scenes/BoardScene"), { ssr: false });

/** Placa 3D: la hover (sau focus pe lista) un pin se ridica si isi arata functia. */
export function BoardInteractive({ compact = false }: { compact?: boolean }) {
  const { ref, load, running } = useSceneGate<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const current = PINS.find((p) => p.id === active);

  return (
    <div className="flex flex-col gap-4">
      <div ref={ref} className={`relative w-full ${compact ? "aspect-[4/3]" : "aspect-[5/4]"}`}>
        <BoardIllustration className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${ready ? "opacity-0" : "opacity-100"}`} />
        {load && (
          <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
            <BoardScene active={active} onActive={setActive} running={running} onReady={() => setReady(true)} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="min-h-[1.5em] font-mono text-xs text-muted" aria-live="polite">
          {current ? (
            <>
              <span className="text-accent">{current.label}</span> · {current.fn}
            </>
          ) : (
            "Treci peste un pin ca sa vezi ce face."
          )}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pinii placii">
          {PINS.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseEnter={() => setActive(p.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(p.id)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(p.id)}
              className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                active === p.id ? "border-accent/60 bg-accent/10 text-accent" : "border-line-strong text-muted hover:text-fg"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
