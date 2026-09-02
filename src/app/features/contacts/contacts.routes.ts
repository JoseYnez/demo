import { Routes } from "@angular/router";

import { unsavedChangesGuard } from "../../core/guards/unsaved-changes-guard";
import { ContactStore } from "./contact-store";

const abrirFormulario = () =>
  import("./contact-form/contact-form").then((m) => m.ContactForm);

export const CONTACTS_ROUTES: Routes = [
  {
    path: "",
    providers: [ContactStore],
    children: [
      {
        path: "",
        title: "Contactos",
        loadComponent: () =>
          import("./contact-list/contact-list").then((m) => m.ContactList),
      },
      {
        path: "nuevo",
        title: "Nuevo contacto",
        canDeactivate: [unsavedChangesGuard],
        loadComponent: abrirFormulario,
      },
      {
        path: ":id",
        title: "Editar contacto",
        canDeactivate: [unsavedChangesGuard],
        loadComponent: abrirFormulario,
      },
    ],
  },
];
