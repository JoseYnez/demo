import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

export type BadgeVariant =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";
export type BadgeSize = "sm" | "md";

@Component({
  selector: "app-badge",
  templateUrl: "./badge.html",
  styleUrl: "./badge.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  readonly variant = input<BadgeVariant>("neutral");
  readonly size = input<BadgeSize>("md");

  protected readonly classes = computed(
    () => `badge badge--${this.variant()} badge--${this.size()}`,
  );
}
