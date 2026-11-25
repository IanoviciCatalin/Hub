"use client";

import { useEffect, useRef } from "react";

/**
 * Poliedrul wireframe din hero. Desenat pe un canvas 2D (fara Three.js), ca primul
 * ecran sa se incarce instant: ~2 KB de cod in loc de ~150 KB.
 * - se inclina dupa cursor (sau dupa atingere pe mobil)
 * - la intrare, muchiile se deseneaza una cate una
 * - se opreste cand nu e pe ecran sau tab-ul e ascuns
 * - la prefers-reduced-motion e desenat o singura data, static
 */
const T = (1 + Math.sqrt(5)) / 2;
const V: [number, number, number][] = [
  [-1, T, 0], [1, T, 0], [-1, -T, 0], [1, -T, 0],
  [0, -1, T], [0, 1, T], [0, -1, -T], [0, 1, -T],
  [T, 0, -1], [T, 0, 1], [-T, 0, -1], [-T, 0, 1],
];
const E: [number, number][] = [];
for (let i = 0; i < V.length; i++)
  for (let j = i + 1; j < V.length; j++) {
    const d = Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]);
    if (Math.abs(d - 2) < 0.01) E.push([i, j]);
  }
// Noduri suplimentare pe mijlocul unor muchii: aluzie la o retea de dispozitive.
const SIGNALS = [3, 11, 19, 26];

export function HeroPolyhedron({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let visible = true;
    let start = performance.now();
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientY / window.innerHeight - 0.5;
      target.y = e.clientX / window.innerWidth - 0.5;
    };

    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      cur.x += (target.x * 0.9 - cur.x) * 0.06;
      cur.y += (target.y * 1.2 - cur.y) * 0.06;
      const t = reduce ? 0 : now - start;
      const a = cur.y + t * 0.00016 + 0.4;
      const b = cur.x + 0.35;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      const s = Math.min(w, h) * 0.24;

      const P = V.map(([x, y, z]) => {
        const X = x * ca + z * sa;
        let Z = -x * sa + z * ca;
        const Y = y * cb - Z * sb;
        Z = y * sb + Z * cb;
        const f = 4 / (4 + Z * 0.35);
        return [w / 2 + X * s * f, h / 2 + Y * s * f, Z] as const;
      });
      const depth = (z: number) => 1 - (z + T) / (2 * T); // 1 = aproape

      // desenare progresiva la intrare
      const intro = reduce ? 1 : Math.min(1, t / 1100);
      const shown = intro * E.length;

      E.forEach(([i, j], k) => {
        if (k > shown) return;
        const part = Math.min(1, shown - k);
        const d = depth((P[i][2] + P[j][2]) / 2);
        ctx.strokeStyle = `rgba(138,180,255,${0.18 + 0.6 * d})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(P[i][0], P[i][1]);
        ctx.lineTo(P[i][0] + (P[j][0] - P[i][0]) * part, P[i][1] + (P[j][1] - P[i][1]) * part);
        ctx.stroke();
      });

      P.forEach((p) => {
        const d = depth(p[2]);
        ctx.fillStyle = `rgba(230,232,236,${(0.35 + 0.65 * d) * intro})`;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 1.6 + d * 1.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // un „pachet de date” care circula pe cateva muchii
      if (!reduce && intro === 1) {
        SIGNALS.forEach((k, n) => {
          const [i, j] = E[k % E.length];
          const u = ((t * 0.00035 + n * 0.27) % 1 + 1) % 1;
          const x = P[i][0] + (P[j][0] - P[i][0]) * u;
          const y = P[i][1] + (P[j][1] - P[i][1]) * u;
          ctx.fillStyle = "rgba(138,180,255,0.95)";
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    };

    const loop = (now: number) => {
      draw(now);
      if (visible && !reduce) raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting && !document.hidden;
      if (visible && !was && !reduce) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const onVis = () => {
      const was = visible;
      visible = !document.hidden;
      if (visible && !was && !reduce) raf = requestAnimationFrame(loop);
    };
    const onResize = () => reduce && draw(0);

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onResize);
    start = performance.now();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
