import { TestBed } from "@angular/core/testing";

import { Input } from "./input";

describe("Input", () => {
  it("no muestra el error mientras el campo no se haya tocado", async () => {
    const fixture = TestBed.createComponent(Input);
    fixture.componentRef.setInput("errors", [
      { kind: "required", message: "Obligatorio." },
    ]);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".ui-msg--error")).toBeNull();
  });

  it("muestra el primer error una vez tocado", async () => {
    const fixture = TestBed.createComponent(Input);
    fixture.componentRef.setInput("errors", [
      { kind: "required", message: "Obligatorio." },
      { kind: "minLength", message: "Muy corto." },
    ]);
    fixture.componentRef.setInput("touched", true);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".ui-msg--error")?.textContent?.trim()).toBe(
      "Obligatorio.",
    );
  });

  describe("labelMode float", () => {
    it("nace sin flotar y sin placeholder cuando está vacío", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Nombre");
      fixture.componentRef.setInput("placeholder", "Escribe algo");
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector(".is-floated")).toBeNull();
      expect(el.querySelector("input")?.getAttribute("placeholder")).toBe("");
    });

    it("flota al tener valor y recupera el placeholder", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Nombre");
      fixture.componentRef.setInput("placeholder", "Escribe algo");
      fixture.componentRef.setInput("value", "Ada");
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector(".is-floated")).not.toBeNull();
      expect(el.querySelector("input")?.getAttribute("placeholder")).toBe("Escribe algo");
    });

    it("flota al enfocar y vuelve a bajar al salir vacío", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Nombre");
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      const control = el.querySelector("input") as HTMLInputElement;

      control.dispatchEvent(new FocusEvent("focus"));
      await fixture.whenStable();
      expect(el.querySelector(".is-floated")).not.toBeNull();

      control.dispatchEvent(new FocusEvent("blur"));
      await fixture.whenStable();
      expect(el.querySelector(".is-floated")).toBeNull();
    });

    it("abre la muesca del borde con el texto de la etiqueta", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Nombre");
      fixture.componentRef.setInput("required", true);
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector(".fs__legend")?.textContent?.trim()).toBe("Nombre *");
      expect(el.querySelector(".fs__outline")?.getAttribute("aria-hidden")).toBe("true");
    });

    it("mantiene el label asociado al control", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("labelMode", "float");
      fixture.componentRef.setInput("label", "Nombre");
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      const id = el.querySelector("input")?.id;
      expect(id).toBeTruthy();
      expect(el.querySelector(".fs__label")?.getAttribute("for")).toBe(id);
    });
  });

  it("propaga lo escrito al signal value", async () => {
    const fixture = TestBed.createComponent(Input);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const control = el.querySelector("input") as HTMLInputElement;
    control.value = "hola";
    control.dispatchEvent(new Event("input"));

    expect(fixture.componentInstance.value()).toBe("hola");
  });

  it("declara el autocompletado sólo cuando se pide", async () => {
    const fixture = TestBed.createComponent(Input);
    await fixture.whenStable();
    const control = (fixture.nativeElement as HTMLElement).querySelector("input");
    expect(control?.hasAttribute("autocomplete")).toBe(false);

    fixture.componentRef.setInput("autocomplete", "username");
    await fixture.whenStable();
    expect(control?.getAttribute("autocomplete")).toBe("username");
  });

  it("enfoca el control nativo con focus()", async () => {
    const fixture = TestBed.createComponent(Input);
    await fixture.whenStable();

    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(
      (fixture.nativeElement as HTMLElement).querySelector("input"),
    );
  });

  describe("contraseña", () => {
    async function montar(revealable: boolean) {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("type", "password");
      fixture.componentRef.setInput("revealable", revealable);
      fixture.componentRef.setInput("hint", "Mínimo 8 caracteres.");
      await fixture.whenStable();
      return fixture;
    }

    it("no dibuja el ojo si no se declara revealable", async () => {
      const fixture = await montar(false);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector(".reveal")).toBeNull();
      expect(el.querySelector("input")?.type).toBe("password");
    });

    it("alterna entre ocultar y mostrar y lo anuncia", async () => {
      const fixture = await montar(true);
      const el = fixture.nativeElement as HTMLElement;
      const ojo = el.querySelector<HTMLButtonElement>(".reveal");
      const control = el.querySelector("input") as HTMLInputElement;

      expect(ojo?.getAttribute("aria-label")).toBe("Mostrar contraseña");
      expect(ojo?.getAttribute("aria-pressed")).toBe("false");

      ojo?.click();
      await fixture.whenStable();
      expect(control.type).toBe("text");
      expect(ojo?.getAttribute("aria-label")).toBe("Ocultar contraseña");
      expect(ojo?.getAttribute("aria-pressed")).toBe("true");

      ojo?.click();
      await fixture.whenStable();
      expect(control.type).toBe("password");
    });

    it("el ojo no es revealable en un campo de texto", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("revealable", true);
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector(".reveal")).toBeNull();
    });

    it("avisa de Bloq Mayús mientras se escribe y lo retira al salir", async () => {
      const fixture = await montar(true);
      const el = fixture.nativeElement as HTMLElement;
      const control = el.querySelector("input") as HTMLInputElement;

      control.dispatchEvent(new KeyboardEvent("keydown", { key: "A", modifierCapsLock: true }));
      await fixture.whenStable();
      expect(el.querySelector(".ui-msg")?.textContent?.trim()).toBe("Bloq Mayús está activado.");

      control.dispatchEvent(new KeyboardEvent("keyup", { key: "CapsLock", modifierCapsLock: false }));
      await fixture.whenStable();
      expect(el.querySelector(".ui-msg")?.textContent?.trim()).toBe("Mínimo 8 caracteres.");

      control.dispatchEvent(new KeyboardEvent("keydown", { key: "A", modifierCapsLock: true }));
      await fixture.whenStable();
      control.dispatchEvent(new FocusEvent("blur"));
      await fixture.whenStable();
      expect(el.querySelector(".ui-msg")?.textContent?.trim()).toBe("Mínimo 8 caracteres.");
    });

    it("el error del formulario gana al aviso de Bloq Mayús", async () => {
      const fixture = await montar(true);
      fixture.componentRef.setInput("errors", [{ kind: "required", message: "Obligatorio." }]);
      fixture.componentRef.setInput("touched", true);
      const el = fixture.nativeElement as HTMLElement;
      const control = el.querySelector("input") as HTMLInputElement;

      control.dispatchEvent(new KeyboardEvent("keydown", { key: "A", modifierCapsLock: true }));
      await fixture.whenStable();

      expect(el.querySelector(".ui-msg--error")?.textContent?.trim()).toBe("Obligatorio.");
      expect(el.querySelectorAll(".ui-msg")).toHaveLength(1);
    });

    it("un campo de texto ignora Bloq Mayús", async () => {
      const fixture = TestBed.createComponent(Input);
      fixture.componentRef.setInput("hint", "Ayuda.");
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;

      el.querySelector("input")?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "A", modifierCapsLock: true }),
      );
      await fixture.whenStable();

      expect(el.querySelector(".ui-msg")?.textContent?.trim()).toBe("Ayuda.");
    });
  });
});
