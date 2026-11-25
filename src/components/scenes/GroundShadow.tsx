"use client";

import { useMemo } from "react";
import * as THREE from "three";

/** Umbră moale sub obiect: un gradient radial pe un plan, fără calcul de umbre în timp real. */
export function GroundShadow({ size = 7, y = 0, opacity = 0.55 }: { size?: number; y?: number; opacity?: number }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(0.55, "rgba(0,0,0,.45)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}
