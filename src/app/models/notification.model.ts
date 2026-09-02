export interface AppNotification {
  readonly id: string;
  readonly title: string;
  readonly detail?: string;
  readonly read: boolean;
}

export type NewNotification = Omit<AppNotification, "id" | "read">;
