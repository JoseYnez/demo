import { Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "styleguide" },
  {
    path: "styleguide",
    title: "Styleguide",
    loadComponent: () =>
      import("./features/styleguide/styleguide").then((m) => m.Styleguide),
  },
  {
    path: "tauri-demo",
    title: "Tauri IPC",
    loadComponent: () =>
      import("./features/tauri-demo/tauri-demo").then((m) => m.TauriDemo),
  },
];
