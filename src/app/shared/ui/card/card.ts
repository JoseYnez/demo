import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

export type CardVariant = "elevated" | "outlined" | "flat";
export type CardPadding = "none" | "sm" | "md" | "lg";

@Component({
  selector: "app-card",
  templateUrl: "./card.html",
  styleUrl: "./card.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  readonly variant = input<CardVariant>("outlined");
  readonly padding = input<CardPadding>("md");

  protected readonly classes = computed(
    () => `card card--${this.variant()} card--pad-${this.padding()}`,
  );
}
