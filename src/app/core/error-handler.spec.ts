import { ErrorHandler } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GlobalErrorHandler } from "./error-handler";
import { NotificationsService } from "./services/notifications";

describe("GlobalErrorHandler", () => {
  let handler: ErrorHandler;
  let avisos: NotificationsService;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(document, "hasFocus").mockReturnValue(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }],
    });
    handler = TestBed.inject(ErrorHandler);
    avisos = TestBed.inject(NotificationsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enseña el fallo como aviso que no se va solo", () => {
    handler.handleError(new Error("contactApi.list: se rompió"));

    const [aviso] = avisos.items();
    expect(aviso.variant).toBe("danger");
    expect(aviso.duration).toBe(0);
    expect(aviso.detail).toBe("contactApi.list: se rompió");
  });

  it("registra en consola aunque el aviso salga", () => {
    const error = new Error("qué mal");

    handler.handleError(error);

    expect(console.error).toHaveBeenCalledWith("[GlobalError]", error);
  });

  it("acepta lo que no es un Error", () => {
    handler.handleError("cadena suelta");

    expect(avisos.items()[0].detail).toBe("cadena suelta");
  });

  it("no avisa de que falló el aviso del sistema", () => {
    handler.handleError(new Error("notificationApi.send: sin permiso"));

    expect(avisos.items()).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it("no se llama a sí mismo si el propio aviso revienta", () => {
    vi.spyOn(avisos, "push").mockImplementation(() => {
      handler.handleError(new Error("dentro del aviso"));
      return "n0";
    });

    handler.handleError(new Error("el primero"));

    expect(avisos.push).toHaveBeenCalledTimes(1);
  });
});
