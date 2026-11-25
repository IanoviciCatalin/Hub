"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PINS } from "./pins";
import { GroundShadow } from "./GroundShadow";

const EDGE = "#8ab4ff";

function Edges({ geometry, opacity = 0.35 }: { geometry: THREE.BufferGeometry; opacity?: number }) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color={EDGE} transparent opacity={opacity} />
    </lineSegments>
  );
}

function PinMesh({ x, active, onHover }: { x: number; active: boolean; onHover: (on: boolean) => void }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 10);
    if (mat.current) mat.current.emissiveIntensity += ((active ? 2.4 : 0) - mat.current.emissiveIntensity) * k;
    if (mesh.current) mesh.current.position.y += ((active ? 0.42 : 0.32) - mesh.current.position.y) * k;
  });
  return (
    <group position={[x, 0, 1.05]}>
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[0.22, 0.16, 0.22]} />
        <meshStandardMaterial color="#0b0d10" roughness={0.9} />
      </mesh>
      <mesh
        ref={mesh}
        position={[0, 0.32, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
      >
        <boxGeometry args={[0.07, 0.42, 0.07]} />
        <meshStandardMaterial ref={mat} color="#8a919c" metalness={0.8} roughness={0.3} emissive={EDGE} emissiveIntensity={0} toneMapped={false} />
      </mesh>
      {/* zonă invizibilă mai mare, ca pinul să fie ușor de nimerit */}
      <mesh position={[0, 0.3, 0]} visible={false} onPointerOver={(e) => { e.stopPropagation(); onHover(true); }} onPointerOut={() => onHover(false)}>
        <boxGeometry args={[0.3, 0.6, 0.4]} />
      </mesh>
    </group>
  );
}

function Trace({ from, to, active }: { from: [number, number]; to: [number, number]; active: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const [x1, z1] = from;
  const [x2, z2] = to;
  const len = Math.hypot(x2 - x1, z2 - z1);
  const ang = Math.atan2(z2 - z1, x2 - x1);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 10);
    if (mat.current) mat.current.opacity += ((active ? 1 : 0.35) - mat.current.opacity) * k;
  });
  return (
    <mesh position={[(x1 + x2) / 2, 0.071, (z1 + z2) / 2]} rotation={[-Math.PI / 2, 0, -ang]}>
      <planeGeometry args={[len, 0.035]} />
      <meshBasicMaterial ref={mat} color={EDGE} transparent opacity={0.35} />
    </mesh>
  );
}

function Board({ active, onActive }: { active: string | null; onActive: (id: string | null) => void }) {
  const group = useRef<THREE.Group>(null);
  const pcb = useMemo(() => new THREE.BoxGeometry(4.2, 0.12, 2.6), []);
  const chip = useMemo(() => new THREE.BoxGeometry(1.1, 0.14, 1.1), []);
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const pinX = PINS.map((_, i) => -1.5 + i * 0.6);

  useEffect(() => {
    document.body.style.cursor = active ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [active]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 3);
    g.rotation.y += (-0.45 + state.pointer.x * 0.4 + (reduce ? 0 : Math.sin(t * 0.3) * 0.06) - g.rotation.y) * k;
    g.rotation.x += (state.pointer.y * -0.12 - g.rotation.x) * k;
  });

  return (
    <group ref={group} position={[0, -0.3, 0]}>
      <GroundShadow size={7} y={-0.12} opacity={0.6} />
      <mesh geometry={pcb}>
        <meshStandardMaterial color="#1f2630" roughness={0.6} metalness={0.2} />
      </mesh>
      <Edges geometry={pcb} opacity={0.4} />
      {/* microcontroller */}
      <group position={[0, 0.13, -0.25]}>
        <mesh geometry={chip}>
          <meshStandardMaterial color="#0b0d10" roughness={0.4} metalness={0.3} />
        </mesh>
        <Edges geometry={chip} opacity={0.55} />
        {Array.from({ length: 7 }).map((_, i) =>
          [-1, 1].map((side) => (
            <mesh key={`${i}${side}`} position={[-0.45 + i * 0.15, -0.05, side * 0.6]}>
              <boxGeometry args={[0.05, 0.03, 0.12]} />
              <meshStandardMaterial color="#8a919c" metalness={0.8} roughness={0.35} />
            </mesh>
          )),
        )}
      </group>
      {/* componente mici */}
      {[[-1.6, -0.8], [1.5, -0.7], [1.6, 0.2], [-1.65, 0.1]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.11, z]}>
          <boxGeometry args={[0.3, 0.1, 0.18]} />
          <meshStandardMaterial color="#1e232a" roughness={0.7} />
        </mesh>
      ))}
      {/* trasee de la cip la fiecare pin */}
      {pinX.map((x, i) => (
        <Trace key={i} from={[-0.45 + i * 0.15, 0.4]} to={[x, 1.0]} active={active === PINS[i].id} />
      ))}
      {PINS.map((p, i) => (
        <PinMesh key={p.id} x={pinX[i]} active={active === p.id} onHover={(on) => onActive(on ? p.id : null)} />
      ))}
    </group>
  );
}

export default function BoardScene({
  active,
  onActive,
  running,
  onReady,
}: {
  active: string | null;
  onActive: (id: string | null) => void;
  running: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [4.6, 5.6, 7.2], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      onCreated={({ camera }) => {
        camera.lookAt(0, -0.2, 0.2);
        onReady?.();
      }}
    >
      <hemisphereLight args={["#c8d6ff", "#0b0d10", 1.1]} />
      <directionalLight position={[4, 8, 5]} intensity={1.8} color="#e6e8ec" />
      <directionalLight position={[-5, 3, -4]} intensity={0.4} color="#8ab4ff" />
      <Board active={active} onActive={onActive} />
    </Canvas>
  );
}
