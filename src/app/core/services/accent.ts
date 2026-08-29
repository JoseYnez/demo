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

@Service()
export class AccentService {
  readonly #stored = readStoredHue();
  readonly #hue = signal(this.#stored ?? DEFAULT_ACCENT_HUE);
  readonly hue = this.#hue.asReadonly();

  /* Sin oklch() el bloque @supports de tokens.css no aplica y elegir tono no
     tendría ningún efecto; la UI de selección se oculta con esto. */
  readonly supported =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("color", "oklch(0.5 0.1 180)");

  constructor() {
    if (this.#stored !== null) {
      this.apply(this.#stored);
    }
  }

  setHue(hue: number): void {
    const normalized = normalizeHue(hue);
    this.#hue.set(normalized);
    this.apply(normalized);
    localStorage.setItem(STORAGE_KEY, String(normalized));
  }

  /* Quitar la propiedad inline basta: el defecto lo recupera el CSS. */
  reset(): void {
    this.#hue.set(DEFAULT_ACCENT_HUE);
    document.documentElement.style.removeProperty(HUE_PROPERTY);
    localStorage.removeItem(STORAGE_KEY);
  }

  private apply(hue: number): void {
    document.documentElement.style.setProperty(HUE_PROPERTY, String(hue));
  }
}

function normalizeHue(hue: number): number {
  return ((Math.round(hue) % 360) + 360) % 360;
}

function readStoredHue(): number | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null || stored.trim() === "" || !Number.isFinite(Number(stored))) {
    return null;
  }
  return normalizeHue(Number(stored));
}
