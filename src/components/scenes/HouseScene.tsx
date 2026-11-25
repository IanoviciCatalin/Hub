"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Room } from "./rooms";
import { GroundShadow } from "./GroundShadow";

const WALL = "#2b323d";
const WALL_ON = "#343c49";
const ROOF = "#3a414c";
const EDGE = "#8ab4ff";
const WARM = "#ffd27a";

function Edges({ geometry, opacity = 0.35 }: { geometry: THREE.BufferGeometry; opacity?: number }) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 20), [geometry]);
  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color={EDGE} transparent opacity={opacity} />
    </lineSegments>
  );
}

function RoomMesh({
  room,
  on,
  hovered,
  onToggle,
  onHover,
}: {
  room: Room;
  on: boolean;
  hovered: boolean;
  onToggle: () => void;
  onHover: (h: boolean) => void;
}) {
  const [w, h, d] = room.size;
  const box = useMemo(() => new THREE.BoxGeometry(w, h, d), [w, h, d]);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);

  // tranziție lină a luminii, nu aprindere bruscă
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    if (glow.current) glow.current.emissiveIntensity += ((on ? 2.2 : 0) - glow.current.emissiveIntensity) * k;
    if (light.current) light.current.intensity += ((on ? 3.2 : 0) - light.current.intensity) * k;
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onToggle();
  };

  // fereastra stă pe fața exterioară a camerei (față sau lateral)
  const [wx, wz, ry] = room.window;

  return (
    <group position={room.position}>
      <mesh
        geometry={box}
        onClick={click}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
      >
        <meshStandardMaterial color={on ? WALL_ON : WALL} roughness={0.85} metalness={0.05} emissive={EDGE} emissiveIntensity={hovered ? 0.08 : 0} />
      </mesh>
      <Edges geometry={box} opacity={hovered ? 0.8 : 0.3} />
      <mesh position={[wx, 0.05, wz]} rotation={[0, ry, 0]}>
        <planeGeometry args={[0.62, 0.62]} />
        <meshStandardMaterial ref={glow} color="#0b0d10" emissive={WARM} emissiveIntensity={on ? 2.2 : 0} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[wx * 1.6, 0.2, wz * 1.6]} color={WARM} intensity={on ? 3.2 : 0} distance={3} decay={2} />
    </group>
  );
}

function Roof() {
  const geom = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.2, 0);
    s.lineTo(2.2, 0);
    s.lineTo(0, 1.15);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 3.3, bevelEnabled: false });
    g.translate(0, 0, -1.65);
    return g;
  }, []);
  return (
    <group position={[0, 2.24, 0]}>
      <mesh geometry={geom}>
        <meshStandardMaterial color={ROOF} roughness={0.7} metalness={0.15} />
      </mesh>
      <Edges geometry={geom} opacity={0.45} />
    </group>
  );
}

function House({ rooms, lit, onToggle }: { rooms: Room[]; lit: Record<string, boolean>; onToggle: (id: string) => void }) {
  const group = useRef<THREE.Group>(null);
  const [hover, setHover] = useState<string | null>(null);
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    document.body.style.cursor = hover ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const targetY = 0.35 + state.pointer.x * 0.45 + (reduce ? 0 : Math.sin(t * 0.25) * 0.08);
    const targetX = state.pointer.y * -0.12;
    const k = 1 - Math.exp(-dt * 3);
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.rotation.x += (targetX - g.rotation.x) * k;
  });

  return (
    <group ref={group} position={[0, -2.0, 0]}>
      <GroundShadow size={8} y={-0.01} />
      {rooms.map((r) => (
        <RoomMesh
          key={r.id}
          room={r}
          on={!!lit[r.id]}
          hovered={hover === r.id}
          onToggle={() => onToggle(r.id)}
          onHover={(h) => setHover((cur) => (h ? r.id : cur === r.id ? null : cur))}
        />
      ))}
      <Roof />
    </group>
  );
}

export default function HouseScene({
  rooms,
  lit,
  onToggle,
  active,
  onReady,
}: {
  rooms: Room[];
  lit: Record<string, boolean>;
  onToggle: (id: string) => void;
  active: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [7.6, 5.2, 9.6], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 0, 0);
        onReady?.();
      }}
    >
      <hemisphereLight args={["#c8d6ff", "#0b0d10", 1.1]} />
      <directionalLight position={[5, 8, 4]} intensity={1.8} color="#e6e8ec" />
      <directionalLight position={[-6, 3, -4]} intensity={0.35} color="#8ab4ff" />
      <House rooms={rooms} lit={lit} onToggle={onToggle} />
    </Canvas>
  );
}
