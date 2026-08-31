import { Service, signal } from "@angular/core";

export const DEFAULT_ACCENT_HUE = 158;

export interface AccentPreset {
  readonly nombre: string;
  readonly hue: number;
}

export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { nombre: "Sage", hue: DEFAULT_ACCENT_HUE },
  { nombre: "Terracota", hue: 35 },
  { nombre: "Ámbar", hue: 75 },
  { nombre: "Oliva", hue: 120 },
  { nombre: "Teal", hue: 195 },
  { nombre: "Azul", hue: 245 },
  { nombre: "Índigo", hue: 280 },
  { nombre: "Ciruela", hue: 325 },
];

const STORAGE_KEY = "accent-hue";
const HUE_PROPERTY = "--accent-hue";
const HUE_ATTRIBUTE = "data-accent-hue";
const LOCK_ATTRIBUTE = "data-accent-locked";

@Service()
export class AccentService {
  readonly #envHue = readEnvHue();
  readonly #stored = readStoredHue();

  readonly locked = document.documentElement.hasAttribute(LOCK_ATTRIBUTE);
  readonly baseHue = this.#envHue ?? DEFAULT_ACCENT_HUE;

  readonly #inicial = this.locked ? this.#envHue : (this.#stored ?? this.#envHue);
  readonly #hue = signal(this.#inicial ?? DEFAULT_ACCENT_HUE);
  readonly hue = this.#hue.asReadonly();

  readonly supported =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("color", "oklch(0.5 0.1 180)");

  constructor() {
    if (this.#inicial !== null) {
      this.apply(this.#inicial);
    }
  }

  setHue(hue: number): void {
    if (this.locked) return;
    const normalized = normalizeHue(hue);
    this.#hue.set(normalized);
    this.apply(normalized);
    localStorage.setItem(STORAGE_KEY, String(normalized));
  }

  previewHue(hue: number): void {
    const normalized = normalizeHue(hue);
    this.#hue.set(normalized);
    this.apply(normalized);
  }

  reset(): void {
    this.#hue.set(this.baseHue);
    localStorage.removeItem(STORAGE_KEY);
    if (this.#envHue === null) {
      document.documentElement.style.removeProperty(HUE_PROPERTY);
    } else {
      this.apply(this.#envHue);
    }
  }

  private apply(hue: number): void {
    document.documentElement.style.setProperty(HUE_PROPERTY, String(hue));
  }
}

function normalizeHue(hue: number): number {
  return ((Math.round(hue) % 360) + 360) % 360;
}

function readEnvHue(): number | null {
  return parseHue(document.documentElement.getAttribute(HUE_ATTRIBUTE));
}

function readStoredHue(): number | null {
  return parseHue(localStorage.getItem(STORAGE_KEY));
}

function parseHue(raw: string | null): number | null {
  if (raw === null || raw.trim() === "" || !Number.isFinite(Number(raw))) {
    return null;
  }
  return normalizeHue(Number(raw));
}
