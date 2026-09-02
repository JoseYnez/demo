import { TestBed } from "@angular/core/testing";

import { NotificationsService } from "./notifications";

describe("NotificationsService", () => {
  let notificaciones: NotificationsService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    notificaciones = TestBed.inject(NotificationsService);
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
  });
});
