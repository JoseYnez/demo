import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { App } from "./app";
import { routes } from "./app.routes";
import { APP_VERSION, GIT_COMMIT } from "./core/build-info";
import { FullscreenService } from "./core/services/fullscreen";
import { NotificationsService } from "./core/services/notifications";

describe("App", () => {
  beforeEach(async () => {
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

  it("apaga el contador al pulsar la campana", async () => {
    const notificaciones = TestBed.inject(NotificationsService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    notificaciones.push({ title: "Primera" });
    await fixture.whenStable();

    const raiz = fixture.nativeElement as HTMLElement;
    raiz.querySelector<HTMLButtonElement>(".shell__action--campana")?.click();
    await fixture.whenStable();

    expect(raiz.querySelector(".shell__badge")).toBeNull();
    expect(notificaciones.items()).toHaveLength(1);
  });

  it("registra F11 como atajo de pantalla completa", async () => {
    const pantalla = TestBed.inject(FullscreenService);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "F11" }));
    await fixture.whenStable();

    expect(pantalla.active()).toBe(true);
  });
});
