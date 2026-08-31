import { Service, signal } from "@angular/core";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

@Service()
export class ThemeService {
  readonly #theme = signal<Theme>(readInitialTheme());
  readonly theme = this.#theme.asReadonly();

  constructor() {
    this.apply(this.#theme());
  }

  setTheme(theme: Theme): void {
    this.#theme.set(theme);
    this.apply(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  toggle(): void {
    this.setTheme(this.#theme() === "dark" ? "light" : "dark");
  }

  private apply(theme: Theme): void {
    document.documentElement.dataset["theme"] = theme;
  }
}

function readInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return prefersDark() ? "dark" : "light";
}

function prefersDark(): boolean {
  return (
    typeof matchMedia === "function" &&
    matchMedia("(prefers-color-scheme: dark)").matches
  );
}
