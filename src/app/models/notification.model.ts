export type NotificationVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface AppNotification {
  readonly id: string;
  readonly variant: NotificationVariant;
  readonly title: string;
  readonly detail?: string;
  readonly createdAt: number;
  readonly duration: number;
  readonly read: boolean;
}

export interface NewNotification {
  readonly title: string;
  readonly detail?: string;
  readonly variant?: NotificationVariant;
  readonly duration?: number;
  readonly silent?: boolean;
}

export const ETIQUETA_DE_VARIANTE: Record<NotificationVariant, string> = {
  neutral: "Aviso",
  success: "Correcto",
  warning: "Atención",
  danger: "Error",
  info: "Información",
};
