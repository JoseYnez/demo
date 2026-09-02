import { TestBed } from "@angular/core/testing";

import { windowApi } from "../../tauri";
import { FullscreenService } from "./fullscreen";

describe("FullscreenService", () => {
  let pantalla: FullscreenService;
  let orden: string[];

  const espiar = (maximizada: boolean) => {
    orden = [];
    vi.spyOn(windowApi, "isMaximized").mockResolvedValue(maximizada);
    vi.spyOn(windowApi, "maximize").mockImplementation(async () => {
      orden.push("maximize");
    });
    vi.spyOn(windowApi, "unmaximize").mockImplementation(async () => {
      orden.push("unmaximize");
    });
    vi.spyOn(windowApi, "setFullscreen").mockImplementation(async (v) => {
      orden.push(`setFullscreen:${v}`);
    });
  };

  const asentar = () => new Promise((r) => setTimeout(r, 0));

  beforeEach(() => {
    TestBed.resetTestingModule();
    pantalla = TestBed.inject(FullscreenService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("arranca en ventana", () => {
    expect(pantalla.active()).toBe(false);
  });

  it("marca el estado sin esperar a la ventana", () => {
    espiar(false);

    pantalla.toggle();

    expect(pantalla.active()).toBe(true);
  });

  it("deshace el maximizado antes de entrar y lo restaura al salir", async () => {
    espiar(true);

    pantalla.toggle();
    await asentar();
    expect(orden).toEqual(["unmaximize", "setFullscreen:true"]);

    pantalla.toggle();
    await asentar();
    expect(orden).toEqual([
      "unmaximize",
      "setFullscreen:true",
      "setFullscreen:false",
      "maximize",
    ]);
  });

  it("no toca el maximizado si la ventana no lo estaba", async () => {
    espiar(false);

    pantalla.toggle();
    await asentar();
    pantalla.toggle();
    await asentar();

    expect(orden).toEqual(["setFullscreen:true", "setFullscreen:false"]);
  });

  it("adopta el estado real de la ventana al sincronizar", async () => {
    vi.spyOn(windowApi, "isFullscreen").mockResolvedValue(true);

    await pantalla.sync();

    expect(pantalla.active()).toBe(true);
  });

  it("no deja que un sync a media transición deshaga el cambio", async () => {
    espiar(true);
    vi.spyOn(windowApi, "isFullscreen").mockResolvedValue(false);

    pantalla.toggle();
    await pantalla.sync();

    expect(pantalla.active()).toBe(true);
  });

  it("descarta un sync que ya estaba en vuelo cuando arranca la transición", async () => {
    espiar(false);
    let contestar!: (real: boolean) => void;
    vi.spyOn(windowApi, "isFullscreen").mockReturnValue(
      new Promise<boolean>((r) => {
        contestar = r;
      }),
    );

    const enVuelo = pantalla.sync();
    pantalla.toggle();
    contestar(false);
    await enVuelo;

    expect(pantalla.active()).toBe(true);
  });
});
