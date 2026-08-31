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

/** Movimiento que se tolera sin dar el gesto por cancelado. Por debajo es
    temblor de pulso; por encima el usuario está arrastrando o haciendo scroll
    y ya no quiere pulsar. */
const SLOP_PX = 10;

/**
 * Botón con toque, doble toque y pulsado largo.
 *
 * `gestures` declara cuáles implementa, y de ahí sale la apariencia: la barra
 * de progreso sólo existe si se declaró `longPress`. Hace falta declararlos
 * porque Angular no expone los suscriptores de un `output()` — `listeners` es
 * privado y leerlo ataría el componente a una interna del framework.
 *
 * Los tres gestos son lecturas EXCLUYENTES de la misma secuencia, así que el
 * orden importa: un pulsado largo que ya cumplió no emite toque al soltar, y
 * un toque no se puede emitir hasta descartar que sea el primero de dos. Por
 * eso declarar `doubleTap` retrasa `tap` en `doubleTapDelay`; sin declararlo,
 * `tap` sale al instante.
 */
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
  /** Margen antes de enseñar la barra, para que un toque normal no deje un
      destello. Sólo aplica si el botón también implementa un gesto corto: sin
      él no hay nada que distinguir y el aviso conviene inmediato. */
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

  /** 0 cuando no hay gesto corto del que distinguir el largo. Se acota al
      propio umbral: por encima, la barra no llegaría a verse nunca. */
  private readonly graceMs = computed(() => {
    if (!this.hasTap() && !this.hasDoubleTap()) return 0;
    return Math.min(Math.max(this.longPressGrace(), 0), this.longPressDelay());
  });

  /** La barra arranca tarde pero tiene que llegar llena justo al cumplirse el
      umbral, así que se reparte el tiempo que queda, no el total. */
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
    // Un pulsado vivo al llegar otro pointerdown deja su temporizador
    // huérfano: `begin()` lo sobrescribiría y el viejo acabaría emitiendo un
    // longPress fantasma. Cerrar el anterior también saca al botón de
    // cualquier estado atascado.
    if (this.pressed) this.cancel();

    // La captura va en el <button>, no en `event.target`: el objetivo real
    // puede ser el <span> de la etiqueta, y capturar en un hijo deja el
    // :hover del botón clavado cuando el puntero se va.
    const host = event.currentTarget as Element;
    this.pointerId = event.pointerId;
    this.capturedOn = host;
    try {
      host.setPointerCapture?.(event.pointerId);
    } catch {
      // Con el hilo ocupado, un toque muy rápido puede llegar aquí con el
      // puntero ya levantado y la captura lanza NotFoundError. La captura es
      // una mejora (hover, seguimiento fuera del botón), no un requisito:
      // perderla no debe perder el gesto.
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

  /** Un segundo dedo no debe poder terminar el gesto que inició el primero. */
  private otherPointer(event: PointerEvent): boolean {
    return this.pointerId !== null && event.pointerId !== this.pointerId;
  }

  private releaseCapture(): void {
    const host = this.capturedOn;
    const id = this.pointerId;
    this.capturedOn = null;
    this.pointerId = null;
    if (host === null || id === null) return;
    // releasePointerCapture lanza si el id ya no está capturado.
    if (host.hasPointerCapture?.(id)) host.releasePointerCapture(id);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    // Siempre, incluso en los keydown que se ignoran: sin prevenirlos, la
    // activación nativa del botón despacharía un click sintético al soltar y
    // `onClick` lo leería como una activación de asistencia.
    event.preventDefault();
    // Sin esto el autorrepetir del teclado reiniciaría el pulsado cada pocos ms
    // y el largo no llegaría a cumplirse nunca.
    if (event.repeat) return;
    // Una segunda tecla —o una tecla durante un pulsado de puntero— no puede
    // reiniciar el gesto: `begin()` sobrescribiría el temporizador vivo y el
    // huérfano acabaría emitiendo un longPress duplicado.
    if (this.pressed) return;
    this.origin = null;
    this.begin();
  }

  protected onKeyUp(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    // Un pulsado de puntero sólo lo termina el puntero: si no, soltar una
    // tecla emitiría el toque con el botón todavía apretado.
    if (this.pointerId !== null) return;
    this.end();
  }

  /** En Windows y Android el long-press táctil dispara `contextmenu` con el
      dedo aún abajo; sin suprimirlo, el menú del webview parte el gesto. En
      reposo (click derecho de ratón) el menú nativo se respeta. */
  protected onContextMenu(event: Event): void {
    if (this.pressed) event.preventDefault();
  }

  /** Las tecnologías de asistencia (dictado, lectores de pantalla) activan con
      un click sintético, sin eventos de puntero ni de teclado. `detail` 0 lo
      distingue de un click real, que ya pasó por pointerdown/up. Se recorre
      begin/end para que el arbitraje tap/doubleTap sea el mismo. */
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

    // El umbral se cuenta desde el pointerdown, no desde el fin del margen:
    // `longPressDelay` sigue siendo el tiempo total que hay que mantener.
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      // Deshabilitarse a mitad de un gesto lo aborta: emitir desde un botón
      // ya deshabilitado dispararía una acción que la UI dice no permitir.
      if (this.disabled()) {
        this.cancel();
        return;
      }
      this.longPressFired = true;
      this.clear("graceTimer");
      this.holding.set(false);
      this.completed.set(true);
      // Un largo que ya cumplió invalida el toque en espera: si no, soltar
      // emitiría además un doble toque emparejado con el toque anterior.
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
