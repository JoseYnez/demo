import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./app";
import { routes } from "./app.routes";
import { APP_VERSION, GIT_COMMIT } from "./core/build-info";
import { FullscreenService } from "./core/services/fullscreen";
import { KeyboardService } from "./core/services/keyboard";
import { NotificationsService } from "./core/services/notifications";
import { windowApi } from "./tauri";

describe("App", () => {
  const enLaVentana = () => {
    Object.defineProperty(windowApi, "enTauri", {
      value: true,
      configurable: true,
    });
    return TestBed.createComponent(App);
  };

  const campana = (fixture: ComponentFixture<App>): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      ".shell__action--campana",
    )!;

  const panel = (fixture: ComponentFixture<App>): Element | null =>
    (fixture.nativeElement as HTMLElement).querySelector(
      "app-notification-panel",
    );

  afterEach(() => {
    Object.defineProperty(windowApi, "enTauri", {
      value: false,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it("se crea", () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("guarda la versión y el commit en el tooltip del icono", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const logo = (fixture.nativeElement as HTMLElement).querySelector(
      ".shell__logo",
    );
    expect(logo?.getAttribute("title")).toBe(
      `demo v${APP_VERSION} · ${GIT_COMMIT}`,
    );
  });

  it("renderiza la navegación", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const links = (fixture.nativeElement as HTMLElement).querySelectorAll(
      ".shell__nav a",
    );
    expect(Array.from(links).map((a) => a.textContent?.trim())).toEqual([
      "Styleguide",
      "Tauri IPC",
      "Acceso",
    ]);
  });

  it("no dibuja el contador sin notificaciones pendientes", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector(".shell__badge")).toBeNull();
    expect(
      raiz.querySelector(".shell__action--campana")?.getAttribute("aria-label"),
    ).toBe("Notificaciones: ninguna sin leer");
  });

  it("muestra las pendientes y las anuncia en la etiqueta", async () => {
    const notificaciones = TestBed.inject(NotificationsService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    notificaciones.push({ title: "Primera" });
    notificaciones.push({ title: "Segunda" });
    await fixture.whenStable();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector(".shell__badge")?.textContent?.trim()).toBe("2");
    expect(
      raiz.querySelector(".shell__action--campana")?.getAttribute("aria-label"),
    ).toBe("Notificaciones: 2 sin leer");
  });

  it("recorta el contador en 9+", async () => {
    const notificaciones = TestBed.inject(NotificationsService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    for (let i = 0; i < 12; i++) {
      notificaciones.push({ title: `Aviso ${i}` });
    }
    await fixture.whenStable();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector(".shell__badge")?.textContent?.trim()).toBe("9+");
    expect(
      raiz.querySelector(".shell__action--campana")?.getAttribute("aria-label"),
    ).toBe("Notificaciones: 12 sin leer");
  });

  it("la campana abre el panel sin dar nada por leído", async () => {
    const notificaciones = TestBed.inject(NotificationsService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    notificaciones.push({ title: "Primera" });
    await fixture.whenStable();

    campana(fixture).click();
    await fixture.whenStable();

    expect(panel(fixture)).not.toBeNull();
    expect(campana(fixture).getAttribute("aria-expanded")).toBe("true");
    expect(notificaciones.unread()).toBe(1);
  });

  it("cerrar el panel marca todo como leído y devuelve el foco", async () => {
    const notificaciones = TestBed.inject(NotificationsService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    notificaciones.push({ title: "Primera" });
    await fixture.whenStable();

    campana(fixture).click();
    await fixture.whenStable();
    campana(fixture).click();
    await fixture.whenStable();

    expect(panel(fixture)).toBeNull();
    expect(notificaciones.unread()).toBe(0);
    expect(notificaciones.items()).toHaveLength(1);
    expect(document.activeElement).toBe(campana(fixture));
  });

  it("el panel se cierra al pulsar fuera", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    campana(fixture).click();
    await fixture.whenStable();
    expect(panel(fixture)).not.toBeNull();

    document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await fixture.whenStable();

    expect(panel(fixture)).toBeNull();
  });

  it("Esc cierra el panel antes que la pantalla completa", async () => {
    const pantalla = TestBed.inject(FullscreenService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    pantalla.set(true);
    await fixture.whenStable();
    campana(fixture).click();
    await fixture.whenStable();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await fixture.whenStable();

    expect(panel(fixture)).toBeNull();
    expect(pantalla.active()).toBe(true);
  });

  it("asoma el aviso como toast y lo retira al abrir el panel", async () => {
    const notificaciones = TestBed.inject(NotificationsService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    notificaciones.push({ title: "Guardado", variant: "success" });
    await fixture.whenStable();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll("app-toast")).toHaveLength(1);

    campana(fixture).click();
    await fixture.whenStable();

    expect(raiz.querySelectorAll("app-toast")).toHaveLength(0);
  });

  it("un aviso silencioso cuenta pero no asoma", async () => {
    const notificaciones = TestBed.inject(NotificationsService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    notificaciones.push({ title: "En segundo plano", silent: true });
    await fixture.whenStable();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll("app-toast")).toHaveLength(0);
    expect(raiz.querySelector(".shell__badge")?.textContent?.trim()).toBe("1");
  });

  it("registra F11 como atajo de pantalla completa", async () => {
    const pantalla = TestBed.inject(FullscreenService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "F11" }));
    await fixture.whenStable();

    expect(pantalla.active()).toBe(true);
  });

  it("sólo ofrece Esc mientras la pantalla completa está activa", async () => {
    const teclado = TestBed.inject(KeyboardService);
    const pantalla = TestBed.inject(FullscreenService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const ofreceEscape = () =>
      teclado.list().some((atajo) => atajo.key === "Escape");

    expect(ofreceEscape()).toBe(false);

    pantalla.set(true);
    await fixture.whenStable();
    expect(ofreceEscape()).toBe(true);

    pantalla.set(false);
    await fixture.whenStable();
    expect(ofreceEscape()).toBe(false);
  });

  it("Esc sale de pantalla completa", async () => {
    const pantalla = TestBed.inject(FullscreenService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    pantalla.set(true);
    await fixture.whenStable();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await fixture.whenStable();

    expect(pantalla.active()).toBe(false);
  });

  it("el botón de tamaño pasa a salir de pantalla completa", async () => {
    const pantalla = TestBed.inject(FullscreenService);
    const fixture = enLaVentana();
    await fixture.whenStable();

    const boton = () =>
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        ".shell__control",
      )[1];

    expect(boton().getAttribute("aria-label")).toBe("Maximizar");

    pantalla.set(true);
    await fixture.whenStable();
    expect(boton().getAttribute("aria-label")).toBe("Salir de pantalla completa");

    boton().click();
    await fixture.whenStable();
    expect(pantalla.active()).toBe(false);
  });
});
