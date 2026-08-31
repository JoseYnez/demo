import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

export type BadgeVariant =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";
export type BadgeAppearance = "soft" | "outline" | "tonal" | "solid";
export type BadgeSize = "sm" | "md" | "lg";

@Component({
  selector: "app-badge",
  templateUrl: "./badge.html",
  styleUrl: "./badge.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  readonly variant = input<BadgeVariant>("neutral");
  readonly appearance = input<BadgeAppearance>("soft");
  readonly size = input<BadgeSize>("md");
  readonly dot = input(false);
  readonly label = input("");

  protected readonly classes = computed(
    () =>
      `badge badge--${this.variant()} badge--${this.appearance()} badge--${this.size()}`,
  );
}
