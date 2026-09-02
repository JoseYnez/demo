import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from "@angular/core";
import {
  form,
  FormField,
  FormRoot,
  minLength,
  required,
  submit,
} from "@angular/forms/signals";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

import { APP_VERSION } from "../../core/build-info";
import { AuthService } from "../../core/services/auth";
import type { Credentials } from "../../models/session.model";
import { Button, Input } from "../../shared/ui";

const DESTINO_POR_DEFECTO = "/";

@Component({
  selector: "app-login",
  imports: [Button, Input, FormField, FormRoot, RouterLink],
  templateUrl: "./login.html",
  styleUrl: "./login.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly usuario = viewChild.required<Input>("usuario");

  protected readonly sesion = this.auth.session;
  protected readonly version = APP_VERSION;

  protected readonly modelo = signal<Credentials>({ username: "", password: "" });

  protected readonly acceso = form(this.modelo, (path) => {
    required(path.username, { message: "Escribe tu usuario." });
    minLength(path.username, 3, { message: "Mínimo 3 caracteres." });
    required(path.password, { message: "Escribe tu contraseña." });
  });

  protected readonly fallo = linkedSignal<Credentials, string>({
    source: this.modelo,
    computation: () => "",
  });

  constructor() {
    afterNextRender(() => {
      if (!this.sesion()) {
        this.usuario().focus();
      }
    });
  }

  protected async entrar(): Promise<void> {
    await submit(this.acceso, async () => {
      try {
        await this.auth.login(this.modelo());
        await this.router.navigateByUrl(this.destino());
      } catch (e) {
        this.fallo.set(e instanceof Error ? e.message : String(e));
      }
      return undefined;
    });
  }

  protected salir(): void {
    this.auth.logout();
    this.modelo.set({ username: "", password: "" });
  }

  private destino(): string {
    const volver = this.route.snapshot.queryParamMap.get("volver");
    return esRutaInterna(volver) ? volver : DESTINO_POR_DEFECTO;
  }
}

function esRutaInterna(url: string | null): url is string {
  return url !== null && url.startsWith("/") && !url.startsWith("//");
}
