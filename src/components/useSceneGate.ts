"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Decide când o scenă 3D are voie să se încarce și să ruleze:
 * - `load`: devine true prima dată când containerul se apropie de ecran (lazy loading)
 * - `running`: true doar cât timp e vizibil (randarea se oprește în afara ecranului)
 * - `supported`: false dacă browserul nu are WebGL; atunci rămâne ilustrația statică
 */
export function useSceneGate<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [load, setLoad] = useState(false);
  const [running, setRunning] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (!(c.getContext("webgl2") || c.getContext("webgl"))) setSupported(false);
    } catch {
      setSupported(false);
    }
    const el = ref.current;
    if (!el) return;
    const near = new IntersectionObserver(([e]) => e.isIntersecting && setLoad(true), { rootMargin: "300px" });
    const vis = new IntersectionObserver(([e]) => setRunning(e.isIntersecting));
    near.observe(el);
    vis.observe(el);
    return () => {
      near.disconnect();
      vis.disconnect();
    };
  }, []);

  return { ref, load: load && supported, running, supported };
}
