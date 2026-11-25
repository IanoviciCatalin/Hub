"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Decide cand o scena 3D are voie sa se incarce si sa ruleze:
 * - `load`: devine true prima data cand containerul se apropie de ecran (lazy loading)
 * - `running`: true doar cat timp e vizibil (randarea se opreste in afara ecranului)
 * - `supported`: false daca browserul nu are WebGL; atunci ramane ilustratia statica
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
