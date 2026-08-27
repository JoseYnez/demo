import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonType = "button" | "submit" | "reset";

@Component({
  selector: "app-button",
  templateUrl: "./button.html",
  styleUrl: "./button.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class.is-full-width]": "fullWidth()" },
})
export class Button {
  readonly variant = input<ButtonVariant>("primary");
  readonly size = input<ButtonSize>("md");
  readonly type = input<ButtonType>("button");
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly fullWidth = input(false);

  protected readonly classes = computed(
    () => `btn btn--${this.variant()} btn--${this.size()}`,
  );
}
