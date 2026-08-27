# Tauri + Angular

This template should help get you started developing with Tauri and Angular.

## Stack

- Angular 22 (standalone, zoneless change detection) with the `@angular/build` esbuild builder
- TypeScript 6.0
- Tauri 2
- pnpm as the package manager

## Requirements

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`
- pnpm 11 (`corepack enable pnpm`, or install it globally)
- The [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform (Rust toolchain + system webview)

## Getting started

```sh
pnpm install
pnpm tauri dev      # desktop app (starts `ng serve` on port 1420 for you)
pnpm start          # browser only, http://localhost:1420
pnpm tauri build    # production bundle
```

## Notes

- Change detection is zoneless — `zone.js` is not installed. Component state that the
  template renders must live in a `signal()` (see `src/app/app.component.ts`).
- `pnpm-workspace.yaml` opts the Angular toolchain's native packages (esbuild, lmdb,
  `@parcel/watcher`, `msgpackr-extract`) into running their install scripts. Without
  that, pnpm blocks them and the build fails.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) + [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template).
