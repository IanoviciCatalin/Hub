export interface Pin {
  id: string;
  label: string;
  fn: string;
}

// Pinii din header-ul plăcii și funcția lor în proiect.
export const PINS: Pin[] = [
  { id: "3v3", label: "3V3", fn: "Alimentare senzori" },
  { id: "gnd", label: "GND", fn: "Masă comună" },
  { id: "sda", label: "SDA", fn: "I²C date: senzor temperatură/umiditate" },
  { id: "scl", label: "SCL", fn: "I²C ceas" },
  { id: "gpio4", label: "GPIO 4", fn: "Intrare: senzor de prezență" },
  { id: "gpio12", label: "GPIO 12", fn: "Ieșire: releu lumină" },
];
