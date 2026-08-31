import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { App } from "./app";
import { routes } from "./app.routes";

describe("App", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it("se crea", () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
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
    ]);
  });
});
