import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { App } from "./app";
import { routes } from "./app.routes";
import { APP_VERSION, GIT_COMMIT, GIT_COMMIT_SHORT } from "./core/build-info";

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

  it("muestra la versión y el commit en la barra superior", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const build = (fixture.nativeElement as HTMLElement).querySelector(
      ".shell__build",
    );
    expect(build?.textContent?.trim()).toBe(
      `v${APP_VERSION} · ${GIT_COMMIT_SHORT}`,
    );
    expect(build?.getAttribute("title")).toBe(GIT_COMMIT);
  });

  it("renderiza la navegación", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const links = (fixture.nativeElement as HTMLElement).querySelectorAll(
      ".shell__nav a",
    );
    expect(Array.from(links).map((a) => a.textContent?.trim())).toEqual([
      "Styleguide",
      "Editor",
      "Tauri IPC",
    ]);
  });
});
