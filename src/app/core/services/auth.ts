import { computed, Service, signal } from "@angular/core";

import type { Credentials, Session } from "../../models/session.model";
import { authApi } from "../../tauri";

@Service()
export class AuthService {
  readonly #session = signal<Session | null>(null);

  readonly session = this.#session.asReadonly();
  readonly authenticated = computed(() => this.#session() !== null);

  async login(credentials: Credentials): Promise<Session> {
    try {
      const session = await authApi.login(credentials);
      this.#session.set(session);
      return session;
    } catch (e) {
      this.#session.set(null);
      throw new Error(mensajeDelBackend(e));
    }
  }

  logout(): void {
    this.#session.set(null);
  }
}

function mensajeDelBackend(e: unknown): string {
  if (e instanceof Error && typeof e.cause === "string") {
    return e.cause;
  }
  return e instanceof Error ? e.message : String(e);
}
