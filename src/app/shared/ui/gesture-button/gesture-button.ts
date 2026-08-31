import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from "@angular/core";

import type { ButtonSize, ButtonVariant } from "../button/button";

export type Gesture = "tap" | "doubleTap" | "longPress";

const SLOP_PX = 10;

@Component({
  selector: "app-gesture-button",
  templateUrl: "./gesture-button.html",
  styleUrl: "./gesture-button.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class.is-full-width]": "fullWidth()" },
})
export class GestureButton {
  private readonly destroyRef = inject(DestroyRef);

  readonly variant = input<ButtonVariant>("primary");
  readonly size = input<ButtonSize>("md");
  readonly disabled = input(false);
  readonly fullWidth = input(false);
  readonly gestures = input<readonly Gesture[]>(["tap"]);
  readonly longPressDelay = input(500);
  readonly doubleTapDelay = input(280);
  readonly longPressGrace = input(150);

  readonly tap = output<void>();
  readonly doubleTap = output<void>();
  readonly longPress = output<void>();

  protected readonly holding = signal(false);
  protected readonly completed = signal(false);

  private readonly hasTap = computed(() => this.gestures().includes("tap"));
  private readonly hasDoubleTap = computed(() =>
    this.gestures().includes("doubleTap"),
  );
  protected readonly hasLongPress = computed(() =>
    this.gestures().includes("longPress"),
  );

  private readonly graceMs = computed(() => {
    if (!this.hasTap() && !this.hasDoubleTap()) return 0;
    return Math.min(Math.max(this.longPressGrace(), 0), this.longPressDelay());
  });

  protected readonly fillMs = computed(() => this.longPressDelay() - this.graceMs());

  protected readonly classes = computed(
    () => `btn gbtn btn--${this.variant()} btn--${this.size()}`,
  );

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingTapTimer: ReturnType<typeof setTimeout> | null = null;
  private origin: { x: number; y: number } | null = null;
  private pressed = false;
  private longPressFired = false;
  private pointerId: number | null = null;
  private capturedOn: Element | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clear("longPressTimer");
      this.clear("graceTimer");
      this.clear("pendingTapTimer");
    });
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    if (this.pressed) this.cancel();

    const host = event.currentTarget as Element;
    this.pointerId = event.pointerId;
    this.capturedOn = host;
    try {
      host.setPointerCapture?.(event.pointerId);
    } catch {
      this.capturedOn = null;
    }

    this.origin = { x: event.clientX, y: event.clientY };
    this.begin();
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.otherPointer(event) || !this.pressed || this.origin === null) return;
    const dx = event.clientX - this.origin.x;
    const dy = event.clientY - this.origin.y;
    if (Math.hypot(dx, dy) > SLOP_PX) this.cancel();
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.otherPointer(event)) return;
    this.releaseCapture();
    this.end();
  }

  protected onPointerCancel(event: PointerEvent): void {
    if (this.otherPointer(event)) return;
    this.cancel();
  }

  private otherPointer(event: PointerEvent): boolean {
    return this.pointerId !== null && event.pointerId !== this.pointerId;
  }

  private releaseCapture(): void {
    const host = this.capturedOn;
    const id = this.pointerId;
    this.capturedOn = null;
    this.pointerId = null;
    if (host === null || id === null) return;
    if (host.hasPointerCapture?.(id)) host.releasePointerCapture(id);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (event.repeat) return;
    if (this.pressed) return;
    this.origin = null;
    this.begin();
  }

  protected onKeyUp(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (this.pointerId !== null) return;
    this.end();
  }

  protected onContextMenu(event: Event): void {
    if (this.pressed) event.preventDefault();
  }

  protected onClick(event: MouseEvent): void {
    if (event.detail !== 0 || this.pressed) return;
    this.begin();
    this.end();
  }

  protected onBlur(): void {
    this.cancel();
  }

  private begin(): void {
    if (this.disabled()) return;
    this.pressed = true;
    this.longPressFired = false;
    this.completed.set(false);
    if (!this.hasLongPress()) return;

    const grace = this.graceMs();
    if (grace === 0) {
      this.holding.set(true);
    } else {
      this.graceTimer = setTimeout(() => {
        this.graceTimer = null;
        this.holding.set(true);
      }, grace);
    }

    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      if (this.disabled()) {
        this.cancel();
        return;
      }
      this.longPressFired = true;
      this.clear("graceTimer");
      this.holding.set(false);
      this.completed.set(true);
      this.clear("pendingTapTimer");
      this.longPress.emit();
    }, this.longPressDelay());
  }

  private end(): void {
    if (!this.pressed) return;
    if (this.disabled()) {
      this.cancel();
      return;
    }
    this.pressed = false;
    this.clear("longPressTimer");
    this.clear("graceTimer");
    this.holding.set(false);

    if (this.longPressFired) {
      this.longPressFired = false;
      return;
    }

    if (this.hasDoubleTap() && this.pendingTapTimer !== null) {
      this.clear("pendingTapTimer");
      this.doubleTap.emit();
      return;
    }

    if (!this.hasTap()) {
      if (this.hasDoubleTap()) this.armPendingTap();
      return;
    }

    if (!this.hasDoubleTap()) {
      this.tap.emit();
      return;
    }

    this.armPendingTap();
  }

  private armPendingTap(): void {
    this.pendingTapTimer = setTimeout(() => {
      this.pendingTapTimer = null;
      if (this.hasTap() && !this.disabled()) this.tap.emit();
    }, this.doubleTapDelay());
  }

  private cancel(): void {
    this.releaseCapture();
    this.pressed = false;
    this.longPressFired = false;
    this.origin = null;
    this.clear("longPressTimer");
    this.clear("graceTimer");
    this.holding.set(false);
    this.completed.set(false);
  }

  private clear(which: "longPressTimer" | "graceTimer" | "pendingTapTimer"): void {
    const timer = this[which];
    if (timer === null) return;
    clearTimeout(timer);
    this[which] = null;
  }
}
