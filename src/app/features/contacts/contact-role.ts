import type { ContactRole } from "../../models/contact.model";
import type { BadgeVariant, SelectOption } from "../../shared/ui";

export const ETIQUETA_DEL_ROL: Record<ContactRole, string> = {
  admin: "Administración",
  editor: "Edición",
  viewer: "Sólo lectura",
};

export const VARIANTE_DEL_ROL: Record<ContactRole, BadgeVariant> = {
  admin: "primary",
  editor: "info",
  viewer: "neutral",
};

export const ROLES: readonly SelectOption[] = (
  Object.keys(ETIQUETA_DEL_ROL) as ContactRole[]
).map((value) => ({ value, label: ETIQUETA_DEL_ROL[value] }));
