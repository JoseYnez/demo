import { Routes } from "@angular/router";

import { authGuard } from "./core/guards/auth-guard";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "styleguide" },
  {
    path: "login",
    title: "Iniciar sesión",
    loadComponent: () => import("./features/login/login").then((m) => m.Login),
  },
  {
    path: "styleguide",
    title: "Styleguide",
    loadComponent: () =>
      import("./features/styleguide/styleguide").then((m) => m.Styleguide),
  },
  {
    path: "tauri-demo",
    title: "Tauri IPC",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/tauri-demo/tauri-demo").then((m) => m.TauriDemo),
  },
];
