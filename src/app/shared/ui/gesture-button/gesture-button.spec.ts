import { ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Gesture, GestureButton } from "./gesture-button";

describe("GestureButton", () => {
  let fixture: ComponentFixture<GestureButton>;
  let emitidos: string[];

  async function montar(gestures: readonly Gesture[]): Promise<void> {
    fixture = TestBed.createComponent(GestureButton);
    fixture.componentRef.setInput("gestures", gestures);
    emitidos = [];
    fixture.componentInstance.tap.subscribe(() => emitidos.push("tap"));
    fixture.componentInstance.doubleTap.subscribe(() => emitidos.push("doubleTap"));
    fixture.componentInstance.longPress.subscribe(() => emitidos.push("longPress"));
    await fixture.whenStable();
  }

  /* Los temporizadores se congelan DESPUÉS de montar: `whenStable()` se apoya
     en el planificador de Angular, que también usa setTimeout, y con el tiempo
     detenido de antemano no resuelve nunca. */
  function congelarTiempo(): void {
    vi.useFakeTimers();
  }

  const boton = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector("button")!;

  function pointer(tipo: string, x = 0, y = 0): void {
    boton().dispatchEvent(
      new PointerEvent(tipo, {
        button: 0,
        pointerId: 1,
        clientX: x,
        clientY: y,
        bubbles: true,
      }),
    );
  }

  const pulsar = (x = 0, y = 0) => pointer("pointerdown", x, y);
  const soltar = () => pointer("pointerup");

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emite tap al instante cuando no se declaró doubleTap", async () => {
    await montar(["tap"]);
    congelarTiempo();
    pulsar();
    soltar();
    expect(emitidos).toEqual(["tap"]);
  });

  it("retrasa el tap para poder descartar que sea el primero de dos", async () => {
    await montar(["tap", "doubleTap"]);
    congelarTiempo();
    pulsar();
    soltar();
    expect(emitidos).toEqual([]);

    vi.advanceTimersByTime(280);
    expect(emitidos).toEqual(["tap"]);
  });

  it("emite doubleTap y ningún tap cuando el segundo toque llega a tiempo", async () => {
    await montar(["tap", "doubleTap"]);
    congelarTiempo();
    pulsar();
    soltar();
    vi.advanceTimersByTime(100);
    pulsar();
    soltar();

    expect(emitidos).toEqual(["doubleTap"]);
    vi.advanceTimersByTime(1000);
    expect(emitidos).toEqual(["doubleTap"]);
  });

  it("emite longPress al cumplirse el umbral, sin esperar a que se suelte", async () => {
    await montar(["tap", "longPress"]);
    congelarTiempo();
    pulsar();
    vi.advanceTimersByTime(500);

    expect(emitidos).toEqual(["longPress"]);
  });

  it("no emite tap al soltar después de un longPress", async () => {
    await montar(["tap", "longPress"]);
    congelarTiempo();
    pulsar();
    vi.advanceTimersByTime(500);
    soltar();
    vi.advanceTimersByTime(1000);

    expect(emitidos).toEqual(["longPress"]);
  });

  it("cancela el gesto si el puntero se aleja más que la tolerancia", async () => {
    await montar(["tap", "longPress"]);
    congelarTiempo();
    pulsar(0, 0);
    pointer("pointermove", 40, 0);
    vi.advanceTimersByTime(500);
    soltar();
    vi.advanceTimersByTime(1000);

    expect(emitidos).toEqual([]);
  });

  it("ignora el gesto cuando está deshabilitado", async () => {
    await montar(["tap", "longPress"]);
    fixture.componentRef.setInput("disabled", true);
    await fixture.whenStable();
    congelarTiempo();

    pulsar();
    vi.advanceTimersByTime(500);
    soltar();
    vi.advanceTimersByTime(1000);

    expect(emitidos).toEqual([]);
  });

  it("no dibuja la barra de progreso si no se declaró longPress", async () => {
    await montar(["tap"]);
    expect(boton().querySelector(".gbtn__progress")).toBeNull();
  });

  it("dibuja la barra de progreso en cuanto se declara longPress", async () => {
    await montar(["tap", "longPress"]);
    expect(boton().querySelector(".gbtn__progress")).not.toBeNull();
  });

  /* Con tiempo real y un umbral corto: este test necesita `whenStable()` para
     leer las clases del DOM, y con los temporizadores congelados no resuelve. */
  it("deja la barra en reposo tras cumplirse, para que el siguiente largo anime", async () => {
    await montar(["longPress"]);
    fixture.componentRef.setInput("longPressDelay", 20);
    await fixture.whenStable();

    pulsar();
    await new Promise((r) => setTimeout(r, 50));
    soltar();
    await fixture.whenStable();

    // `is-holding` es lo único que llena la barra: si sobreviviera al gesto, el
    // siguiente pulsado iría de lleno a lleno y no se vería animar.
    expect(emitidos).toEqual(["longPress"]);
    expect(boton().classList.contains("is-holding")).toBe(false);
    expect(boton().classList.contains("is-completed")).toBe(true);

    pulsar();
    await fixture.whenStable();
    expect(boton().classList.contains("is-completed")).toBe(false);
    expect(boton().classList.contains("is-holding")).toBe(true);
  });

  it("no deja temporizadores huérfanos si llega un segundo pointerdown", async () => {
    await montar(["tap", "longPress"]);
    congelarTiempo();
    pulsar();
    vi.advanceTimersByTime(200);
    pulsar();
    vi.advanceTimersByTime(3000);

    // Sin cerrar el pulsado anterior, su temporizador sobrevivía a `begin()` y
    // acababa emitiendo un longPress fantasma.
    expect(emitidos).toEqual(["longPress"]);
  });

  it("no deja que un segundo dedo termine el gesto del primero", async () => {
    await montar(["tap", "longPress"]);
    congelarTiempo();
    pointer("pointerdown", 0, 0);
    boton().dispatchEvent(
      new PointerEvent("pointerup", { button: 0, pointerId: 7, bubbles: true }),
    );
    vi.advanceTimersByTime(3000);

    expect(emitidos).toEqual(["longPress"]);
  });

  it("libera la captura del puntero al soltar", async () => {
    await montar(["tap"]);
    const b = boton();
    const capturados: number[] = [];
    const liberados: number[] = [];
    b.setPointerCapture = (id: number) => {
      capturados.push(id);
    };
    b.hasPointerCapture = (id: number) => capturados.includes(id);
    b.releasePointerCapture = (id: number) => {
      liberados.push(id);
    };

    pulsar();
    soltar();

    // Sin liberarla, el navegador deja el :hover clavado en el elemento que
    // capturó y el botón se queda como si siguieras pulsándolo.
    expect({ capturados, liberados }).toEqual({ capturados: [1], liberados: [1] });
  });

  it("no pierde el gesto si la captura del puntero falla", async () => {
    await montar(["tap"]);
    congelarTiempo();
    // Con el hilo ocupado, el pointerdown puede procesarse con el puntero ya
    // levantado y `setPointerCapture` lanza NotFoundError.
    boton().setPointerCapture = () => {
      throw new DOMException("No active pointer", "NotFoundError");
    };

    pulsar();
    soltar();

    expect(emitidos).toEqual(["tap"]);
  });

  it("captura en el <button>, no en el hijo que recibió el evento", async () => {
    await montar(["tap"]);
    const b = boton();
    const etiqueta = b.querySelector(".gbtn__label")!;
    const capturadoEn: string[] = [];
    b.setPointerCapture = () => void capturadoEn.push("button");
    (etiqueta as HTMLElement & { setPointerCapture: (id: number) => void })
      .setPointerCapture = () => void capturadoEn.push("label");

    etiqueta.dispatchEvent(
      new PointerEvent("pointerdown", { button: 0, pointerId: 1, bubbles: true }),
    );

    expect(capturadoEn).toEqual(["button"]);
  });

  it("no enseña la barra de inmediato cuando también implementa un gesto corto", async () => {
    await montar(["tap", "longPress"]);
    fixture.componentRef.setInput("longPressGrace", 40);
    fixture.componentRef.setInput("longPressDelay", 200);
    await fixture.whenStable();

    pulsar();
    await fixture.whenStable();
    // Un toque normal dura menos que el margen, así que no llega a ver barra.
    expect(boton().classList.contains("is-holding")).toBe(false);

    await new Promise((r) => setTimeout(r, 90));
    await fixture.whenStable();
    expect(boton().classList.contains("is-holding")).toBe(true);

    // La animación se reparte lo que queda (200 − 40), no el umbral entero:
    // así llega llena justo cuando se emite el gesto, no antes.
    const barra = boton().querySelector<HTMLElement>(".gbtn__progress")!;
    expect(barra.style.transitionDuration).toBe("160ms");
  });

  it("enseña la barra de inmediato si el largo es el único gesto", async () => {
    await montar(["longPress"]);
    pulsar();
    await fixture.whenStable();

    // Sin gesto corto no hay nada que distinguir: el aviso conviene ya.
    expect(boton().classList.contains("is-holding")).toBe(true);
  });

  it("un toque más corto que el margen emite tap sin llegar a enseñar barra", async () => {
    await montar(["tap", "longPress"]);
    fixture.componentRef.setInput("longPressGrace", 150);
    await fixture.whenStable();

    pulsar();
    await fixture.whenStable();
    expect(boton().classList.contains("is-holding")).toBe(false);

    soltar();
    await fixture.whenStable();
    expect(boton().classList.contains("is-holding")).toBe(false);
    expect(emitidos).toEqual(["tap"]);
  });

  it("cuenta el umbral desde el pointerdown, no desde el fin del margen", async () => {
    await montar(["tap", "longPress"]);
    congelarTiempo();

    pulsar();
    vi.advanceTimersByTime(499);
    expect(emitidos).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(emitidos).toEqual(["longPress"]);
  });

  it("responde al teclado y no reinicia el pulsado con el autorrepetir", async () => {
    await montar(["longPress"]);
    congelarTiempo();
    const b = boton();
    b.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    vi.advanceTimersByTime(400);
    b.dispatchEvent(new KeyboardEvent("keydown", { key: " ", repeat: true, bubbles: true }));
    vi.advanceTimersByTime(100);

    expect(emitidos).toEqual(["longPress"]);
  });

  it("una segunda tecla mientras se mantiene no duplica el longPress", async () => {
    await montar(["longPress"]);
    congelarTiempo();
    const b = boton();
    b.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    vi.advanceTimersByTime(300);
    b.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    vi.advanceTimersByTime(1200);

    // Sin la guarda, `begin()` sobrescribía el temporizador vivo y el huérfano
    // acababa emitiendo un segundo longPress.
    expect(emitidos).toEqual(["longPress"]);
  });

  it("soltar una tecla no termina un pulsado iniciado con el puntero", async () => {
    await montar(["tap"]);
    congelarTiempo();
    pulsar();
    boton().dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    boton().dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }));
    expect(emitidos).toEqual([]);

    soltar();
    expect(emitidos).toEqual(["tap"]);
  });

  it("aborta el gesto si el botón se deshabilita a mitad del pulsado", async () => {
    await montar(["longPress"]);
    congelarTiempo();
    pulsar();
    vi.advanceTimersByTime(200);
    fixture.componentRef.setInput("disabled", true);
    vi.advanceTimersByTime(1000);
    soltar();

    expect(emitidos).toEqual([]);
  });

  it("suprime el menú contextual sólo mientras hay un pulsado activo", async () => {
    await montar(["longPress"]);
    congelarTiempo();
    const contextmenu = () => {
      const evento = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
      boton().dispatchEvent(evento);
      return evento.defaultPrevented;
    };

    // En Windows y Android el long-press táctil dispara contextmenu con el
    // dedo aún abajo; el menú del webview partiría el gesto.
    expect(contextmenu()).toBe(false);
    pulsar();
    expect(contextmenu()).toBe(true);
    soltar();
    expect(contextmenu()).toBe(false);
  });

  it("una activación sintética (click sin puntero) emite tap", async () => {
    await montar(["tap"]);
    congelarTiempo();
    // Dictado y lectores de pantalla activan con un click de `detail` 0, sin
    // eventos de puntero ni de teclado.
    boton().dispatchEvent(new MouseEvent("click", { detail: 0, bubbles: true }));
    expect(emitidos).toEqual(["tap"]);
  });

  it("dos activaciones sintéticas rápidas forman doubleTap", async () => {
    await montar(["tap", "doubleTap"]);
    congelarTiempo();
    const click = () =>
      boton().dispatchEvent(new MouseEvent("click", { detail: 0, bubbles: true }));
    click();
    vi.advanceTimersByTime(100);
    click();

    expect(emitidos).toEqual(["doubleTap"]);
  });

  it("un click real no duplica el tap que ya emitió el puntero", async () => {
    await montar(["tap"]);
    congelarTiempo();
    pulsar();
    soltar();
    boton().dispatchEvent(new MouseEvent("click", { detail: 1, bubbles: true }));

    expect(emitidos).toEqual(["tap"]);
  });
});
