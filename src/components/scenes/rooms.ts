export interface Room {
  id: string;
  label: string;
  /** centrul camerei in coordonatele casei */
  position: [number, number, number];
  size: [number, number, number];
  /** fereastra: [x, z, rotatie Y] relativ la centrul camerei */
  window: [number, number, number];
}

// Casa cu doua etaje, cate doua camere pe etaj. Ferestrele sunt pe fata din fata,
// singura vazuta mereu de camera.
export const ROOMS: Room[] = [
  { id: "living", label: "Living", position: [-1.01, 0.55, 0], size: [2, 1.1, 3], window: [0, 1.51, 0] },
  { id: "bucatarie", label: "Bucatarie", position: [1.01, 0.55, 0], size: [2, 1.1, 3], window: [0, 1.51, 0] },
  { id: "dormitor", label: "Dormitor", position: [-1.01, 1.67, 0], size: [2, 1.1, 3], window: [0, 1.51, 0] },
  { id: "birou", label: "Birou", position: [1.01, 1.67, 0], size: [2, 1.1, 3], window: [0, 1.51, 0] },
];
