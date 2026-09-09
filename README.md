# demo — base Tauri 2 + Angular 22

Plantilla reutilizable para aplicaciones de escritorio. Angular 22 con detección de
cambios *zoneless* y signals, Tauri 2 para la ventana y el backend, pnpm como gestor.

**Las convenciones, las decisiones y el porqué de cada una viven en [CLAUDE.md](CLAUDE.md).**
Este archivo sólo explica cómo arrancar; aquel manda sobre todo lo demás.

## Requisitos

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`
- pnpm 11 (`corepack enable pnpm`)
- Toolchain de Rust estable y los [prerequisitos de Tauri](https://tauri.app/start/prerequisites/) del sistema

## Arranque

```sh
pnpm install
pnpm tauri dev      # la app de escritorio; levanta ng serve en el 1420 por dentro
pnpm start          # sólo el frontend, en http://localhost:1420
pnpm tauri build    # ejecutable e instalador del sistema actual
```

```sh
pnpm test                       # tests del frontend
cd src-tauri && cargo test      # tests del backend
```

## Lo que conviene saber antes de tocar nada

- **Zoneless**: `zone.js` no está instalado. Todo estado que la plantilla renderice
  tiene que vivir en un `signal()`, o el valor cambia y la vista no se entera. Es el
  error más fácil de introducir aquí (§3.4 de CLAUDE.md).
- **pnpm siempre**: `npm install` y `yarn` están prohibidos en este repo. El
  `pnpm-workspace.yaml` habilita los scripts de instalación que el toolchain de
  Angular necesita; sin él el build falla (§3.1).
- **La ventana no tiene decoraciones**: la barra superior de la app *es* la barra de
  la ventana, y el arrastre, los botones y la pantalla completa son código propio (§3.7).
- **El design system es propio**: sin Tailwind ni librerías de UI. Ningún componente
  escribe un color, un espaciado ni un radio literal; todo sale de
  `src/styles/tokens.css` y hay una demo viva en la ruta `/styleguide` (§11).

## IDE recomendado

[VS Code](https://code.visualstudio.com/) con
[Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode),
[rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) y
[Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template).
