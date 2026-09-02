import { TestBed } from "@angular/core/testing";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import { notificationApi } from "../../tauri";
import { NotificationsService } from "./notifications";

describe("NotificationsService", () => {
  let notificaciones: NotificationsService;
  let enfocada: boolean;
  let enviar: MockInstance<typeof notificationApi.send>;

  const irseAlFondo = () => {
    enfocada = false;
    window.dispatchEvent(new Event("blur"));
  };
  const volverAlFrente = () => {
    enfocada = true;
    window.dispatchEvent(new Event("focus"));
  };

  beforeEach(() => {
    enviar = vi.spyOn(notificationApi, "send").mockResolvedValue(undefined);

    enfocada = true;
    vi.spyOn(document, "hasFocus").mockImplementation(() => enfocada);

    TestBed.resetTestingModule();
    notificaciones = TestBed.inject(NotificationsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("arranca vacío y sin pendientes", () => {
    expect(notificaciones.items()).toEqual([]);
    expect(notificaciones.unread()).toBe(0);
  });

  it("apila las nuevas arriba y las cuenta como no leídas", () => {
    notificaciones.push({ title: "Primera" });
    notificaciones.push({ title: "Segunda" });

    expect(notificaciones.items().map((n) => n.title)).toEqual([
      "Segunda",
      "Primera",
    ]);
    expect(notificaciones.unread()).toBe(2);
  });

  it("devuelve identificadores distintos", () => {
    const primera = notificaciones.push({ title: "Primera" });
    const segunda = notificaciones.push({ title: "Segunda" });

    expect(primera).not.toBe(segunda);
  });

  it("descuenta la que se marca como leída y deja el resto", () => {
    const id = notificaciones.push({ title: "Primera" });
    notificaciones.push({ title: "Segunda" });

    notificaciones.markAsRead(id);

    expect(notificaciones.unread()).toBe(1);
    expect(notificaciones.items()).toHaveLength(2);
  });

  it("vacía el contador al marcarlas todas", () => {
    notificaciones.push({ title: "Primera" });
    notificaciones.push({ title: "Segunda" });

    notificaciones.markAllAsRead();

    expect(notificaciones.unread()).toBe(0);
    expect(notificaciones.items()).toHaveLength(2);
  });

  it("ignora un identificador desconocido", () => {
    notificaciones.push({ title: "Primera" });

    notificaciones.markAsRead("no-existe");
    notificaciones.dismiss("no-existe");

    expect(notificaciones.unread()).toBe(1);
    expect(notificaciones.items()).toHaveLength(1);
  });

  it("descarta una y vacía la lista entera", () => {
    const id = notificaciones.push({ title: "Primera" });
    notificaciones.push({ title: "Segunda" });

    notificaciones.dismiss(id);
    expect(notificaciones.items().map((n) => n.title)).toEqual(["Segunda"]);

    notificaciones.clear();
    expect(notificaciones.items()).toEqual([]);
    expect(notificaciones.unread()).toBe(0);
    expect(notificaciones.toasts()).toEqual([]);
  });

  it("nace neutral y con la duración por defecto", () => {
    notificaciones.push({ title: "Primera" });

    const [aviso] = notificaciones.items();
    expect(aviso.variant).toBe("neutral");
    expect(aviso.duration).toBe(6000);
  });

  it("un error nace persistente y no se va solo", () => {
    notificaciones.push({ title: "Falló", variant: "danger" });

    expect(notificaciones.items()[0].duration).toBe(0);
  });

  it("una duración explícita gana a la de la familia", () => {
    notificaciones.push({ title: "Falló", variant: "danger", duration: 4000 });

    expect(notificaciones.items()[0].duration).toBe(4000);
  });

  it("el aviso silencioso entra al historial pero no a la cola", () => {
    notificaciones.push({ title: "Callado", silent: true });

    expect(notificaciones.items()).toHaveLength(1);
    expect(notificaciones.toasts()).toEqual([]);
    expect(notificaciones.unread()).toBe(1);
  });

  it("la cola visible enseña tres como mucho, las más nuevas", () => {
    for (let i = 1; i <= 5; i++) {
      notificaciones.push({ title: `Aviso ${i}` });
    }

    expect(notificaciones.toasts().map((n) => n.title)).toEqual([
      "Aviso 5",
      "Aviso 4",
      "Aviso 3",
    ]);
    expect(notificaciones.items()).toHaveLength(5);
  });

  it("expirar retira el toast y lo deja sin leer", () => {
    const id = notificaciones.push({ title: "Primera" });

    notificaciones.expireToast(id);

    expect(notificaciones.toasts()).toEqual([]);
    expect(notificaciones.unread()).toBe(1);
  });

  it("cerrarlo a mano lo da por leído", () => {
    const id = notificaciones.push({ title: "Primera" });

    notificaciones.closeToast(id);

    expect(notificaciones.toasts()).toEqual([]);
    expect(notificaciones.unread()).toBe(0);
    expect(notificaciones.items()).toHaveLength(1);
  });

  it("descartar del historial también retira su toast", () => {
    const id = notificaciones.push({ title: "Primera" });

    notificaciones.dismiss(id);

    expect(notificaciones.toasts()).toEqual([]);
  });

  it("con la ventana al fondo el aviso sale por el sistema, no como toast", async () => {
    irseAlFondo();

    notificaciones.push({ title: "Copia terminada", detail: "42 archivos" });

    await vi.waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    expect(enviar).toHaveBeenCalledWith({
      title: "Copia terminada",
      body: "42 archivos",
    });
    expect(notificaciones.toasts()).toEqual([]);
    expect(notificaciones.unread()).toBe(1);
  });

  it("al volver el foco vuelve el toast y deja de molestar al sistema", async () => {
    irseAlFondo();
    volverAlFrente();

    notificaciones.push({ title: "Primera" });

    expect(notificaciones.toasts()).toHaveLength(1);
    await vi.waitFor(() => expect(enviar).not.toHaveBeenCalled());
  });

  it("un aviso silencioso no molesta ni al sistema", async () => {
    irseAlFondo();

    notificaciones.push({ title: "Callado", silent: true });

    await vi.waitFor(() => expect(enviar).not.toHaveBeenCalled());
    expect(notificaciones.items()).toHaveLength(1);
  });

  it("el historial no crece sin fin: se queda con las cincuenta últimas", () => {
    for (let i = 1; i <= 60; i++) {
      notificaciones.push({ title: `Aviso ${i}`, silent: true });
    }

    const items = notificaciones.items();
    expect(items).toHaveLength(50);
    expect(items[0].title).toBe("Aviso 60");
    expect(items[49].title).toBe("Aviso 11");
  });
});
