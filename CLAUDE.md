# CLAUDE.md — Base Tauri 2 + Angular 22

> Plantilla base reutilizable. Define **infraestructura**, **sintaxis** y **componentes**.
> No hay dominio todavía: todo aquí es prescriptivo para lo que se construya encima.
> Al derivar un proyecto real, copiar este archivo y añadirle las secciones de dominio
> (entidades, casos de uso, esquema de BD, inventario de wrappers).

---

## 1. Stack

| Capa | Tecnología | Versión | Fijada en |
|---|---|---|---|
| Frontend | Angular (standalone, **zoneless**, signals) | 22.1.x | `package.json` |
| Builder | `@angular/build` (esbuild + Vite dev server) | 22.1.x | `angular.json` |
| Lenguaje frontend | TypeScript **strict** | `~6.0.2` | `package.json` |
| Backend | Rust + Tauri | 2.x | `src-tauri/Cargo.toml` |
| Gestor de paquetes | **pnpm** | 11.x | `packageManager` en `package.json` |
| Tests frontend | Vitest + jsdom vía `@angular/build:unit-test` | 4.x | `angular.json` → target `test` |
| Tests backend | `cargo test` | — | — |
| SO target | Windows (primario), Linux, macOS | — | — |

**Angular 22 exige TypeScript `>=6.0 <6.1`.** TypeScript 7.x ya existe pero **no** es compatible: no subirlo hasta que el peer range de `@angular/compiler-cli` lo admita.

---

## 2. Requisitos del entorno

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0` (declarado en `engines`).
- pnpm 11 — `corepack enable pnpm`.
- Toolchain de Rust estable + los [prerequisitos de Tauri](https://tauri.app/start/prerequisites/) del SO.

---

## 3. Infraestructura

### 3.1 Gestor de paquetes: pnpm (obligatorio)

- **Nunca** `npm install` ni `yarn` en este repo. El campo `packageManager` de `package.json` es la fuente de verdad y Corepack lo hace cumplir.
- `pnpm-lock.yaml` **se commitea**. `package-lock.json` y `yarn.lock` no deben existir.
- `angular.json` declara `cli.packageManager: "pnpm"` para que `ng add` / `ng update` no invoquen npm por detrás.

**`pnpm-workspace.yaml` no es opcional.** pnpm 11 bloquea los scripts de instalación por defecto. El toolchain de Angular necesita cuatro de ellos y, sin `allowBuilds`, el build **falla**:

```yaml
allowBuilds:
  '@parcel/watcher': true   # file watching de `ng serve`
  esbuild: true             # bundler de @angular/build
  lmdb: true                # caché persistente del CLI
  msgpackr-extract: true    # serialización de lmdb
```

El mismo archivo lleva `minimumReleaseAgeExclude` con los paquetes `@angular/*`: se publican en bloque y el gate de antigüedad de pnpm los retendría a medias, dejando versiones desalineadas entre sí.

**Regla**: al añadir una dependencia que pida ejecutar scripts, decidir explícitamente (`true`/`false`) en `allowBuilds` y justificarlo en el PR. Nunca `pnpm approve-builds` a ciegas.

### 3.2 Pipeline de build

```
ng build  →  dist/demo/browser/  →  frontendDist de Tauri  →  cargo build  →  bundle
```

- `pnpm start` / `pnpm build` son puramente frontend.
- `pnpm tauri dev` / `pnpm tauri build` los invocan por dentro (`beforeDevCommand` / `beforeBuildCommand` en `tauri.conf.json`).
- La caché del CLI vive en `.angular/` (ignorada por git).

### 3.3 Contrato Angular ↔ Tauri

Tres valores acoplados entre dos archivos. Si se toca uno, hay que tocar el otro:

| Valor | `angular.json` | `src-tauri/tauri.conf.json` |
|---|---|---|
| Puerto de dev | `serve.options.port: 1420` | `build.devUrl: "http://localhost:1420"` |
| Salida del build | derivada del nombre del proyecto → `dist/demo/browser` | `build.frontendDist: "../dist/demo/browser"` |
| Comandos | scripts `start` / `build` | `beforeDevCommand: "pnpm start"` / `beforeBuildCommand: "pnpm build"` |

**Al renombrar el proyecto Angular cambia `outputPath`, y hay que actualizar `frontendDist`.**

### 3.4 Zoneless — la regla crítica

**`zone.js` no está instalado.** No hay entrada `polyfills` en `angular.json` ni `provideZoneChangeDetection` en `app.config.ts`. En Angular 22 zoneless es el modo por defecto y no requiere provider.

Consecuencia: **Angular ya no parchea `setTimeout`, `Promise` ni los listeners del DOM.** La detección de cambios se dispara sólo con:

- escritura en un `signal` que la plantilla lee;
- bindings de evento de la plantilla (`(click)`, `(submit)`, …);
- `AsyncPipe`;
- `ChangeDetectorRef.markForCheck()`;
- cambios de estado de `resource()` / `rxResource()`.

**No dispara nada**: mutar un campo plano desde un `.then()`, un `setTimeout`, un callback de `invoke()`, un listener registrado a mano o un evento de Tauri.

> **Regla dura**: todo estado que la plantilla renderice vive en un `signal`. Sin excepciones.
> Un campo `string` actualizado desde una promesa es un bug silencioso: el valor cambia y la UI no.

```typescript
// MAL — bajo zoneless la vista nunca se entera
greetingMessage = "";
greet(name: string) {
  invoke<string>("greet", { name }).then((t) => (this.greetingMessage = t));
}

// BIEN
protected readonly greetingMessage = signal("");
greet(name: string) {
  invoke<string>("greet", { name }).then((t) => this.greetingMessage.set(t));
}
```

En tests esto se traduce en `await fixture.whenStable()` en vez de `fixture.detectChanges()` — ver §12.

---

## 4. Estructura de carpetas

```
demo/
├── src/                        # Frontend Angular
│   ├── app/
│   │   ├── core/               # Singletons: servicios app-wide, guards, error handler
│   │   │   ├── services/
│   │   │   └── guards/
│   │   ├── shared/             # Reutilizable entre features
│   │   │   ├── ui/             # Design system (§11)
│   │   │   ├── pipes/
│   │   │   └── directives/
│   │   ├── features/           # Una carpeta por feature, lazy-loaded
│   │   ├── models/             # Interfaces y types del dominio
│   │   ├── tauri/              # Wrappers tipados de invoke() y listeners (§7)
│   │   ├── app.ts              # Componente raíz
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── assets/
│   ├── styles/                 # tokens.css, reset.css, forms.css, buttons.css, testing/
│   ├── styles.css              # Entrada global (importa styles/)
│   ├── index.html
│   └── main.ts
├── src-tauri/                  # Backend Rust
│   ├── src/
│   │   ├── main.rs             # Entry point (delega en lib.rs)
│   │   ├── lib.rs              # Builder de Tauri, registro de comandos
│   │   ├── error.rs            # AppError + AppResult (§8.1)
│   │   ├── commands/           # Comandos invocables — sólo orquestan
│   │   ├── services/           # Lógica de negocio
│   │   └── models/             # Structs, newtypes validados
│   ├── capabilities/default.json
│   ├── tauri.conf.json
│   └── Cargo.toml
├── angular.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json               # Base + project references
├── tsconfig.app.json
├── tsconfig.spec.json
└── CLAUDE.md
```

**Regla de features**: una feature = una carpeta en `features/` + su `*.routes.ts` + componentes. **Nunca** importar un componente de una feature desde otra; si hace falta compartir, se mueve a `shared/`.

---

## 5. Convenciones de nombrado

### 5.1 Archivos y símbolos Angular (convención v20+)

Angular 20 eliminó los sufijos de tipo de los **nombres de archivo**. Esto es lo que genera `ng generate` en v22 — respetarlo, no pelearse con el CLI:

| Schematic | Archivo | Símbolo exportado |
|---|---|---|
| `component` | `ticket-list/ticket-list.ts` + `.html` + `.css` | `class TicketList` |
| `service` | `theme.ts` | `class Theme` |
| `directive` | `autofocus.ts` | `class Autofocus` |
| `pipe` | `duration-pipe.ts` | `class DurationPipe` |
| `guard` (funcional) | `auth-guard.ts` | `const authGuard: CanActivateFn` |
| rutas de feature | `tickets.routes.ts` | `const TICKETS_ROUTES: Routes` |
| modelo | `ticket.model.ts` | `interface Ticket` |
| wrapper Tauri | `ticket.api.ts` | `const ticketApi` |

**Excepción a la regla del CLI — colisión con modelos.** El CLI nombraría un servicio de tickets `class Ticket`, que choca con la `interface Ticket` del modelo. Cuando el sustantivo desnudo colisione, usar un **sufijo de rol** en la clase (el nombre de archivo sigue la convención del CLI):

- `TicketStore` — estado de la feature.
- `TicketApi` — wrapper de `invoke()`.
- `ThemeService`, `SettingsService` — servicios app-wide de `core/` donde el sustantivo solo es ambiguo.

Un `Theme` sin colisión se queda como `Theme`. No añadir sufijos por costumbre.

| Otros elementos | Convención | Ejemplo |
|---|---|---|
| Selector de componente | `app-kebab-case` | `app-ticket-list` |
| Selector de directiva | `[appCamelCase]` | `[appAutofocus]` |
| Carpetas | `kebab-case` | `features/ticket-list/` |

### 5.2 TypeScript

| Elemento | Convención | Ejemplo |
|---|---|---|
| Variables, funciones | `camelCase` | `getUserData()` |
| Clases, interfaces, types, enums | `PascalCase`, **sin prefijo `I`** | `Ticket`, `TicketStatus` |
| Constantes globales | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS` |
| Métodos privados | `private` de TS, sin guion bajo | `private validate()` |
| Campos privados runtime | `#field` sólo si la privacidad real importa | `#cache` |
| Observables | sufijo `$` | `users$` |
| `WritableSignal<T>` interno | privado, sin sufijo | `readonly #users = signal<User[]>([])` |
| `Signal<T>` expuesto | `readonly` + `.asReadonly()` | `readonly users = this.#users.asReadonly()` |
| `computed()` | `readonly`, sin sufijo | `readonly total = computed(...)` |
| Miembro sólo para la plantilla | `protected readonly` | `protected readonly title = signal("")` |

### 5.3 Rust

| Elemento | Convención | Ejemplo |
|---|---|---|
| Variables, funciones | `snake_case` | `get_user_data()` |
| Structs, enums, traits | `PascalCase` | `TicketStatus` |
| Constantes | `SCREAMING_SNAKE_CASE` | `MAX_CONNECTIONS` |
| Módulos y archivos | `snake_case` | `ticket_commands.rs` |

### 5.4 Comandos Tauri

Tauri convierte el nombre de los **parámetros** de `camelCase` (JS) a `snake_case` (Rust). El **nombre del comando** no se convierte: se invoca tal cual está declarado en Rust.

```rust
#[tauri::command]
async fn get_user_by_id(user_id: i32) -> AppResult<User> { ... }
```

```typescript
await invoke<User>("get_user_by_id", { userId: 1 });
//                  ^ snake_case      ^ camelCase
```

---

## 6. Sintaxis Angular

### 6.1 Componentes

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from "@angular/core";

@Component({
  selector: "app-ticket-list",
  imports: [TicketCard],
  templateUrl: "./ticket-list.html",
  styleUrl: "./ticket-list.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketList {
  private readonly store = inject(TicketStore);

  readonly filter = input<string>("");
  readonly onlyOpen = input.required<boolean>();
  readonly selected = output<Ticket>();

  protected readonly visible = computed(() =>
    this.store.tickets().filter((t) => t.title.includes(this.filter())),
  );
}
```

Reglas:

1. **Nunca escribir `standalone: true`** — es el default desde v19 y es ruido.
2. **`ChangeDetectionStrategy.OnPush` explícito** en todos los componentes. Bajo zoneless es la semántica que ya tienes; declararlo documenta la intención y evita sorpresas si algún día vuelve zone.js. El schematic no lo añade: hay que ponerlo a mano.
3. **`inject()`** en vez de parámetros de constructor.
4. **Signal inputs/outputs**: `input()`, `input.required()`, `output()`, `model()`. No usar los decoradores `@Input()` / `@Output()`.
5. **Signal queries**: `viewChild()`, `viewChildren()`, `contentChild()`. No `@ViewChild()`.
6. **Plantilla y estilos en archivos separados**, salvo componentes de menos de 15 líneas. `styleUrl` en singular.
7. **Prohibido `any`.** Si es inevitable, `unknown` + validación explícita.
8. Miembros que sólo consume la plantilla: `protected readonly`.

### 6.2 Servicios e inyección

Angular 22 introduce **`@Service()`** (de `@angular/core`), que es lo que genera el CLI. Equivale a `@Injectable({ providedIn: "root" })`: `autoProvided` es `true` por defecto.

```typescript
import { Service, signal } from "@angular/core";

@Service()
export class ThemeService {
  readonly #theme = signal<"light" | "dark">("light");
  readonly theme = this.#theme.asReadonly();

  setTheme(next: "light" | "dark"): void {
    this.#theme.set(next);
    document.documentElement.dataset["theme"] = next;
    localStorage.setItem("theme", next);
  }
}
```

- **`@Service()`** para singletons de aplicación → es el caso por defecto.
- **`@Service({ autoProvided: false })`** o **`@Injectable()`** cuando el servicio deba instanciarse por ruta o por componente y se provea a mano.
- El patrón de estado es siempre: signal privado + `readonly` público con `.asReadonly()`. **Nunca exponer un `WritableSignal`.**

### 6.3 Control flow en plantillas

Usar **sólo** el control flow integrado. `*ngIf`, `*ngFor` y `NgSwitch` están prohibidos en código nuevo, y con ellos deja de hacer falta importar `CommonModule`.

```html
@if (loading()) {
  <app-spinner />
} @else if (tickets().length === 0) {
  <p>Sin resultados.</p>
} @else {
  @for (ticket of tickets(); track ticket.id) {
    <app-ticket-card [ticket]="ticket" />
  } @empty {
    <p>Vacío.</p>
  }
}

@let total = tickets().length;
<p>{{ total }} tickets</p>

@defer (on viewport) {
  <app-chart [data]="data()" />
} @placeholder {
  <div class="skeleton"></div>
}
```

- **`track` es obligatorio** en `@for`. Usar el id estable de la entidad, nunca `$index` salvo en listas puramente posicionales.
- `@defer` para todo lo pesado que no se ve en el primer render.

### 6.4 Estado con signals

| API | Cuándo |
|---|---|
| `signal()` | estado propio mutable |
| `computed()` | derivado puro — **preferir siempre** sobre recalcular a mano |
| `linkedSignal()` | estado que deriva de otro pero admite override local (p. ej. una selección que se resetea al cambiar la lista) |
| `resource()` / `rxResource()` | carga asíncrona con `value` / `status` / `error` / `reload()` |
| `effect()` | **último recurso**: sólo sincronización con el mundo exterior (DOM, `localStorage`, logging) |

`effect()` no sirve para derivar estado. Si estás escribiendo un signal dentro de un `effect`, casi siempre querías `computed()` o `linkedSignal()`.

### 6.5 RxJS

Signals para estado; RxJS **sólo** para flujos asíncronos genuinos (eventos del DOM con debounce, websockets, streams de eventos de Tauri). Cruzar la frontera con `@angular/core/rxjs-interop`:

```typescript
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";

readonly query = toSignal(
  this.searchInput$.pipe(debounceTime(300), distinctUntilChanged()),
  { initialValue: "" },
);
```

Nunca exponer un `Observable` como API pública de un servicio si un `Signal` sirve.

### 6.6 Ciclo de vida y recursos

Usar `DestroyRef` en vez de `ngOnDestroy`:

```typescript
private readonly destroyRef = inject(DestroyRef);

constructor() {
  const un = listen("tauri://event", handler);          // listener de Tauri
  this.destroyRef.onDestroy(() => void un.then((f) => f()));
  this.destroyRef.onDestroy(() => URL.revokeObjectURL(this.url));
}
```

Todo `createObjectURL`, listener manual, timer o `unlisten` de Tauri debe registrarse en `destroyRef.onDestroy`.

### 6.7 Rutas

Una feature = un archivo de rutas, siempre lazy:

```typescript
// src/app/features/tickets/tickets.routes.ts
export const TICKETS_ROUTES: Routes = [
  { path: "", loadComponent: () => import("./ticket-list/ticket-list").then((m) => m.TicketList) },
  { path: ":id", loadComponent: () => import("./ticket-detail/ticket-detail").then((m) => m.TicketDetail) },
];
```

```typescript
// src/app/app.routes.ts
{ path: "tickets", loadChildren: () => import("./features/tickets/tickets.routes").then((m) => m.TICKETS_ROUTES) }
```

Una feature de **una sola ruta** no necesita su propio `*.routes.ts`: basta un `loadComponent` directo en `app.routes.ts` (así están hoy `styleguide` y `tauri-demo`). El archivo de rutas se crea en cuanto aparece la segunda ruta.

### 6.8 Formularios

Angular 22 trae **Signal Forms** (`@angular/forms/signals`) como API estable. Es lo que se usa aquí; `ControlValueAccessor` y `ReactiveFormsModule` quedan para interoperar con código antiguo, no para escribir nuevo.

```typescript
protected readonly modelo = signal({ nombre: "", correo: "" });

protected readonly alta = form(this.modelo, (path) => {
  required(path.nombre, { message: "El nombre es obligatorio." });
  minLength(path.nombre, 3, { message: "Mínimo 3 caracteres." });
  email(path.correo, { message: "Formato no válido." });
});
```

```html
<form [formRoot]="alta" (submit)="enviar()">
  <app-input label="Nombre" [formField]="alta.nombre" />
  <app-button type="submit" [disabled]="alta().invalid()">Enviar</app-button>
</form>
```

- El **modelo es la fuente de verdad**: `form()` no guarda una copia, escribe sobre el signal que le pasas.
- `[formRoot]` en el `<form>` intercepta el submit; `[formField]` liga cada control a su campo.
- Envío con `submit(alta, action)`.

**Controles propios**: implementar `FormValueControl<T>` (o `FormCheckboxControl` para booleanos). El único requisito es un `model()` llamado `value`; el resto son opcionales que Angular **sincroniza solo** si los declaras — `errors`, `touched`, `dirty`, `disabled`, `readonly`, `required`, `invalid`, `minLength`, `maxLength`, `pattern`, y el output `touch`.

```typescript
export class Input implements FormValueControl<string> {
  readonly value = model("");
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly touched = input(false);
  readonly required = input(false);
  readonly touch = output<void>();
}
```

**Nunca pasar errores a mano** desde el componente padre: si el control declara `errors` y está ligado con `[formField]`, ya los recibe. Emitir `touch` en el `blur` del elemento nativo — sin eso el campo nunca se marca como tocado y los errores no llegan a mostrarse.

### 6.9 Comentarios — al mínimo

Aplica igual a TypeScript y a Rust.

> **El código se explica solo. Un comentario es la admisión de que no lo logró.**
> Antes de escribir uno, intentar arreglarlo con un nombre mejor, una función extraída o un tipo más preciso. El comentario es el último recurso, no el primero.

**Sólo se comenta el _porqué_, nunca el _qué_.** El _qué_ ya está en la línea de abajo y se desincroniza en el primer refactor.

```typescript
// MAL — repite lo que dice el código
// Recorre los tickets y filtra los abiertos
const open = tickets.filter((t) => t.status === "open");

// MAL — comentario de sección
// ===== Getters =====

// BIEN — explica una decisión que el código no puede expresar
// El backend devuelve las fechas en UTC sin sufijo; sin la Z, Date las lee como locales.
const created = new Date(`${dto.createdAt}Z`);
```

**Se elimina siempre**:

- Comentarios de andamiaje que dejan las plantillas y los schematics (`// Learn more about Tauri commands at…`).
- Código comentado. Para eso está git.
- `TODO` / `FIXME` sin issue asociado. Con issue, el formato es `// TODO(#123): …`.
- JSDoc y `///` que sólo repiten la firma (`@param name El nombre`).

**Se justifica un comentario sólo si, sin él, un cambio futuro rompe algo en silencio** — y ni un nombre mejor, ni un tipo, ni un test, ni este archivo pueden decirlo en su lugar. Cuatro casos, y ninguno más:

- Advierte de algo destructivo: el `// Prevents additional console window on Windows in release, DO NOT REMOVE!!` de [main.rs](src-tauri/src/main.rs) es el ejemplo canónico — borrarlo rompe el release.
- Marca una trampa del motor o del lenguaje que el código no delata: usar `--transition-normal` en el shorthand `animation` invalida la declaración entera, y la regla se queda muerta sin avisar.
- Enuncia una invariante que el sistema de tipos no puede expresar y ningún test cubre.
- Marca un workaround, con enlace al issue upstream.

Tres reglas que lo acotan:

1. **Un comentario, una línea** (dos si no cabe). Un bloque de cinco líneas no es un comentario: es documentación fuera de sitio.
2. **El porqué de una decisión de diseño va en CLAUDE.md, no en el código, y nunca en los dos.** Duplicarlo garantiza que un día digan cosas distintas y no se sepa cuál manda. La paleta, el acento configurable, los modos de etiqueta o el arbitraje de gestos se explican en §11; los archivos que los implementan no repiten nada de eso.
3. **Si un test puede enunciarlo, se escribe el test.** Un `it("no deja temporizadores huérfanos si llega un segundo pointerdown")` documenta y además falla cuando alguien lo rompe; el comentario equivalente sólo envejece.

Estado actual del repo: **tres comentarios en todo `src/` y `src-tauri/`** — los dos primeros ejemplos de la lista de arriba y el orden de congelado de temporizadores en [gesture-button.spec.ts](src/app/shared/ui/gesture-button/gesture-button.spec.ts). Añadir un cuarto es la excepción y hay que justificarla en el PR.

En Rust, `///` se reserva para la API pública de un módulo compartido. Dentro de una función, mismo criterio que en TypeScript.

---

## 7. Comunicación Frontend ↔ Backend

**Ningún componente llama `invoke()` directamente.** Toda llamada pasa por un wrapper tipado en `src/app/tauri/`, exportado desde el barrel `src/app/tauri/index.ts`.

```typescript
// src/app/tauri/ticket.api.ts
import { invoke } from "@tauri-apps/api/core";
import { Ticket } from "../models/ticket.model";

export const ticketApi = {
  getAll: async (): Promise<Ticket[]> => {
    try {
      return await invoke<Ticket[]>("get_all_tickets");
    } catch (e) {
      throw new Error(`ticketApi.getAll: ${e}`);
    }
  },
  getById: async (id: string): Promise<Ticket> => {
    try {
      return await invoke<Ticket>("get_ticket_by_id", { id });
    } catch (e) {
      throw new Error(`ticketApi.getById: ${e}`);
    }
  },
};
```

Reglas:

1. El wrapper **nunca se traga un error**: re-lanza con el nombre del método como contexto. Tauri serializa los errores de Rust como string plano y, sin ese prefijo, no se sabe de dónde vino.
2. El wrapper es la única capa que conoce los nombres `snake_case` de los comandos.
3. Devuelve tipos del dominio (`src/app/models/`), nunca `any`.
4. Los servicios/stores consumen el wrapper; los componentes consumen el servicio.
5. Al añadir un wrapper nuevo → exportarlo en el barrel **y añadir su fila al inventario**.

**Inventario actual**:

| Wrapper | Comandos | Notas |
|---|---|---|
| `greetApi` | `greet` | Demo de IPC de la plantilla de Tauri. Lo consume `features/tauri-demo/`. |

Todavía **no hay listeners**: nada emite eventos desde Rust y nadie llama `listen()`. Los permisos ya están concedidos (`core:default` incluye `core:event:default` → `allow-listen`, `allow-unlisten`, `allow-emit`, `allow-emit-to`), así que añadirlos no requiere tocar `capabilities/`. Cuando se añada el primero, el `unlisten` va registrado en `destroyRef.onDestroy` — ver §6.6.

---

## 8. Manejo de errores

### 8.1 Backend (Rust)

En cuanto exista el primer comando con I/O, crear `src-tauri/src/error.rs`:

```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),

    #[error("validación: {0}")]
    Validation(String),

    #[error("no encontrado")]
    NotFound,
}

// El frontend recibe un string plano.
impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
```

- Todo comando Tauri devuelve `AppResult<T>`.
- Propagación con `?`; conversión automática con `#[from]`.
- `unwrap()` / `expect()` **sólo** bajo `#[cfg(test)]`. La única excepción tolerada es el `.expect()` del arranque en `lib.rs`.

### 8.2 Frontend (Angular)

Handler global en `src/app/core/error-handler.ts`, registrado en `app.config.ts`:

```typescript
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[GlobalError]", error);
    // notificar al usuario
  }
}
```

```typescript
providers: [
  provideBrowserGlobalErrorListeners(),
  { provide: ErrorHandler, useClass: GlobalErrorHandler },
  provideRouter(routes),
]
```

`provideBrowserGlobalErrorListeners()` ya viene en `app.config.ts` de la base: captura `unhandledrejection` y `error` de `window` y los enruta al `ErrorHandler`. **No quitarlo** — bajo zoneless es la red de seguridad para las promesas de `invoke()` que nadie esperó.

---

## 9. Reglas de Rust / Tauri

1. **Errores explícitos**: `AppResult<T>` en todo comando. Nunca `unwrap`/`expect` fuera de tests.
2. **`async` para I/O**: los comandos que tocan disco, red o BD son `async`.
3. **Los comandos sólo orquestan.** La lógica de negocio va en `services/`; el comando valida, delega y mapea el error.
4. **Validar en el límite.** Nunca confiar en datos del frontend: newtype con `TryFrom` para validaciones simples, crate `validator` para DTOs complejos.

   ```rust
   pub struct TicketTitle(String);

   impl TryFrom<String> for TicketTitle {
       type Error = AppError;
       fn try_from(s: String) -> AppResult<Self> {
           let t = s.trim();
           if t.len() < 3 || t.len() > 200 {
               return Err(AppError::Validation("el título debe tener 3-200 caracteres".into()));
           }
           Ok(Self(t.to_string()))
       }
   }
   ```

5. **Singletons con `tauri::State`** (pool de BD, config), nunca `static mut` ni `lazy_static` mutable.
6. **Permisos mínimos** en `capabilities/`: allowlist específica y con scope, jamás comodines abiertos.
7. `cargo clippy -- -D warnings` y `cargo fmt` deben pasar limpios antes de commitear.
8. **Comentarios al mínimo**, mismo criterio que en el frontend — ver §6.9.

---

## 10. Permisos Tauri

Inventario vivo de `src-tauri/capabilities/default.json`. Estado actual de la base:

| Permiso | Para qué | Quién lo usa |
|---|---|---|
| `core:default` | Set mínimo del core (eventos, webview, path) | runtime |
| `opener:default` | Abrir URLs externas con la app por defecto del SO | `tauri-plugin-opener` |

**Regla**: al añadir un permiso → fila nueva en esta tabla, scope lo más estrecho posible (`$DOWNLOAD/**` antes que `**`) y justificación en el PR. Un permiso sin fila aquí es un permiso que se elimina.

---

## 11. Design System

Sistema propio: **tokens CSS + componentes Angular standalone**. Sin Tailwind, sin librerías UI externas.

### 11.1 Tokens

La capa global son tres hojas, importadas por `src/styles.css` en este orden:

| Hoja | Qué contiene |
|---|---|
| `styles/tokens.css` | Las variables. Único sitio donde se escribe un color o una medida literal. |
| `styles/reset.css` | Normalización y estilos base de `body`, títulos, enlaces y foco. |
| `styles/buttons.css` | Base compartida de los botones: `.btn`, sus tamaños y sus variantes. Está en la capa global por la misma razón que `forms.css`: la comparten `Button` y `GestureButton`, y la encapsulación no deja compartirla desde un componente. Cada uno añade sólo lo suyo — el `:host` y, en el gestual, la capa de progreso. |
| `styles/forms.css` | Base compartida de los controles: `.ui-field`, `.ui-label`, `.ui-control`, `.ui-msg`. Vive en la capa global porque la encapsulación de Angular impide compartir estos estilos entre `input`, `textarea` y `select` sin duplicarlos tres veces. Los componentes consumen esas clases y añaden sólo lo suyo (alto, `resize`, la flecha del select). Todos los controles son **outlined**: fondo transparente, el borde los define. |

Roles que los tokens cubren:

- **Superficies**: `--bg-app`, `--bg-surface`, `--bg-surface-alt`, `--bg-surface-raised`, `--field-bg` (el color que hay *detrás* de un campo; lo redefine cada superficie).
- **Texto**: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-on-accent`.
- **Bordes y foco**: `--border-default`, `--border-strong`, `--border-focus`, `--ring-focus`.
- **Estados de interacción**: `--bg-surface-hover` / `--bg-surface-active` para un control con relleno propio; `--overlay-hover` / `--overlay-active` para uno transparente.
- **Acento**: `--accent`, `--accent-hover`, `--accent-active`, `--accent-subtle`, `--accent-border`.
- **Estados tenues**: `--color-{success,warning,danger,info}-{bg,fg,border}`.
- **Rellenos sólidos**: `--color-{neutral,success,warning,danger,info}-solid` + su `-on-solid`, más `--color-danger-solid-hover`. Son el *fondo* de un botón o un badge, con su propio color de texto encima.
- **Escalas**: espaciado `--space-0..16` (base 4px), tipografía `--font-size-xs..3xl`, radios `--radius-sm..full`, sombras `--shadow-sm..xl`, `--edge-raised`, transiciones `--transition-fast|normal|slow`.

> **Regla dura**: prohibido hardcodear colores, espaciados, radios o sombras en el CSS de un componente. Siempre variables. Es lo único que hace que el tema oscuro funcione solo.

Tres distinciones que hay que respetar, porque confundirlas ya causó un bug:

| No confundir | |
|---|---|
| `--border-default` vs `--border-strong` | `default` es **decorativo** (divisores de card): sin requisito de contraste. `strong` delimita **controles** y cumple el 3:1 de WCAG 1.4.11. El borde de un `input` usa `strong`. |
| `--color-*-fg` vs `--color-*-solid` | `fg` es texto **sobre** `--color-*-bg` (aviso tenue). `solid` es el **relleno**, y su texto es `--color-*-on-solid`. En claro los dos valen lo mismo, en oscuro no: usar `fg` como fondo daba 2.52:1. Que coincidan en un tema no los hace un alias. |
| `--bg-surface` vs `--bg-surface-raised` | `raised` es para superficies elevadas. En claro son el mismo blanco (eleva la sombra); en oscuro `raised` es **más clara**. |
| `--bg-surface-alt` vs `--bg-surface-hover` | `alt` es una **superficie**: se apilan cosas encima. `hover` es un **estado**, sólo lleva la etiqueta del propio control. Usar `alt` de hover dejaba el salto en 0.039 de L\*, y en el `ghost` sobre `--bg-app` en 0.016 — invisible. |

### 11.2 Tema claro/oscuro

- Atributo `data-theme="dark"` en `<html>`; los tokens se redefinen bajo `:root[data-theme="dark"]`.
- Arranque: leer `localStorage` → si no hay nada, `prefers-color-scheme`.
- Gestionado por un único `ThemeService` en `core/services/`, con el patrón signal privado + `readonly`.

**`color-scheme` no es opcional, y hay que cambiarlo junto con los tokens.** Es lo único que gobierna la UI nativa que el CSS no alcanza: la lista desplegable del `<select>`, las barras de scroll, los calendarios de `<input type="date">`. Sin declararlo, el navegador asume claro: el popup del select salía blanco mientras sus opciones heredaban `--text-primary` (casi blanco) y desaparecían. Está declarado en los tres bloques de [tokens.css](src/styles/tokens.css) — `light` en `:root`, `dark` en los dos de tema oscuro.

**La lista desplegable del `<select>` hay que pintarla entera a mano** — fondo y texto juntos en `option`. Dos intentos previos fallaron y conviene no repetirlos:

1. Confiar en `color-scheme: dark`. El motor toma de ahí el color de **texto** (claro) pero deja la **superficie** del popup en blanco: texto blanco sobre blanco.
2. `color: CanvasText`. Resuelve contra el esquema de la página, no contra lo que el popup pinta de verdad, así que reproduce el mismo desajuste.

La regla: **fondo y color de `option` se declaran siempre juntos**, para que no puedan descasarse. Depende de que el motor honre el fondo de `option` — lo hace Chromium/WebView2, que es el objetivo primario; WKWebView lo ignora. Si algún día hace falta un desplegable con garantías en todas las plataformas, la salida es un listbox propio, no seguir peleando con el nativo.

**El modo oscuro copia la rampa de ChatGPT.** Es una referencia deliberada: grises neutros y planos, sin bordes marcados, elevación por tono. Las anclas son las suyas (sidebar `#171717`, chat `#212121`, hover `#2f2f2f`, texto `#ececec`) y la rampa de aquí queda a menos de un punto de L\* de cada una. La diferencia es un croma de 0.005 en las superficies: se leen grises, pero no del todo neutras. **El verde vive en el acento, no en el mobiliario** — si se sube el croma de las superficies, se pierde el parecido.

**La paleta se calcula, no se elige a ojo.** Los dos temas se generaron igualando el contraste **perceptual (APCA)**, no la ratio de WCAG 2. Importa porque WCAG 2 subestima el contraste sobre fondos oscuros: la paleta anterior daba 7.88:1 para `--text-secondary` en oscuro contra 7.40:1 en claro — aparentemente mejor — mientras APCA medía Lc 58.8 contra Lc 85.7. El modo oscuro estaba muy por debajo y WCAG 2 lo ocultaba.

Criterios que cumple la paleta, y que verifica [tokens.spec.ts](src/styles/tokens.spec.ts) en cada `pnpm test`:

- WCAG 2.1 AA (4.5:1 texto, 3:1 componentes) — es el estándar legal, es el suelo.
- Umbrales APCA: Lc 90 primario, Lc 74 secundario, Lc 58 muted, contra **todas** las superficies.
- Los pares dependientes del acento, además, en 72 tonos: el acento es configurable (§11.5) y ningún tono elegible puede romper AA.

Al tocar un color hay que revalidar; el test falla si el contraste baja o si los dos bloques oscuros divergen.

**Los controles son outlined, no rellenos.** Sin fondo: el borde los define. Viene impuesto por la etiqueta flotante (§11.3) —cruza la línea del borde, y un relleno le partiría el fondo en dos colores a mitad del texto— y se extiende a todos los controles para no tener medio sistema relleno y medio no. Consecuencia: `--border-strong` es el único indicador del control, así que cumple **3:1 contra las cuatro superficies**, no sólo contra la principal. [tokens.spec.ts](src/styles/tokens.spec.ts) lo verifica par a par.

**Los estados de interacción se miden, no se ajustan a ojo.** La referencia es
la misma rampa de ChatGPT: su hover salta **0.057 de L\***, y todo hover del
sistema se calibra contra ese número. `--bg-surface-alt` hacía de hover y se
quedaba corto en las cuatro variantes de botón.

Hay dos mecanismos porque hay dos clases de control, y confundirlos es el bug
original:

- **Con relleno propio** (`secondary`): color opaco, `--bg-surface-hover` y
  `--bg-surface-active`. Su salto no depende de lo que haya detrás, porque el
  control tapa el fondo.
- **Sin relleno** (`ghost`, los enlaces de la barra): `--overlay-hover` y
  `--overlay-active`, **translúcidos**. Un color fijo no puede servir aquí: el
  control cae sobre superficies distintas y el mismo valor da 0.039 sobre una y
  0.016 sobre otra. Compuesto, el salto sale igual sobre las cuatro.

Como el overlay es translúcido, el texto no cae sobre la superficie sino sobre
la mezcla — la misma trampa del anillo de foco. [tokens.spec.ts](src/styles/tokens.spec.ts)
compone y verifica ese contraste en las cuatro superficies y los 72 tonos.

**Elevación en oscuro**: una sombra negra sobre un fondo casi negro no se ve. La elevación la lleva la **superficie**, que se aclara (`--bg-surface-raised`), más un filo superior (`--edge-raised`). En claro la sombra hace ese trabajo y ambos tokens son neutros. Un componente elevado usa los tres a la vez y funciona en los dos temas sin CSS condicional.

**Duplicación de los bloques oscuros**: `:root[data-theme="dark"]` y el `@media (prefers-color-scheme: dark)` son idénticos y no se pueden fundir, porque uno vive dentro de una media query. `light-dark()` lo resolvería en una línea por token, pero **no se usa**: WebKitGTK < 2.46 (Ubuntu 24.04 LTS) no lo soporta y la declaración inválida dejaría los tokens sin valor — la app entera sin colores, no sólo sin tema oscuro. El test garantiza que los dos bloques no se separen — y lo mismo con el par de bloques oscuros del `@supports` del acento (§11.5).

**Ojo con el scoping**: el CSS de un componente está encapsulado, así que un bloque `:root { … }` dentro de un `.css` de componente **no aplica nunca**. Los estilos globales van en `src/styles.css` o en `src/styles/`, no en el componente.

### 11.3 Componentes en `shared/ui/`

Cada uno en su carpeta, con `.ts` + `.html` + `.css`, exportado desde el barrel `src/app/shared/ui/index.ts`:

```typescript
import { Button, Card, Input } from "../../shared/ui";
```

Todos: `OnPush`, signal inputs, sin dependencias externas y sin lógica de dominio. Un componente de `shared/ui/` que sepa qué es un "ticket" está mal ubicado — va a `features/`.

**Inventario actual** — al añadir uno, fila nueva aquí:

| Componente | Selector | Inputs | Notas |
|---|---|---|---|
| `Button` | `<app-button>` | `variant` (primary/secondary/ghost/danger), `size` (sm/md/lg), `type`, `disabled`, `loading`, `fullWidth` | `loading` deshabilita y muestra spinner. |
| `Card` | `<app-card>` | `variant` (elevated/outlined/flat), `padding` (none/sm/md/lg) | Slots opcionales `[card-header]` y `[card-footer]`; la zona sin contenido no se dibuja. |
| `Badge` | `<app-badge>` | `variant` (neutral/primary/success/warning/danger/info), `appearance` (soft/outline/solid), `size` (sm/md/lg), `dot`, `label` | Sólo presentación. `variant` dice qué comunica; `appearance`, cuánto pesa. Recorta con elipsis en vez de desbordar; `label` da el texto entero al lector de pantalla. **Las tres apariencias conviven a la espera de que se elija una** — comparativa en `/styleguide`. |
| `Input` | `<app-input>` | `label`, `labelMode`, `placeholder`, `type`, `hint` + el contrato de §6.8 | `FormValueControl<string>`. |
| `Textarea` | `<app-textarea>` | `label`, `labelMode`, `placeholder`, `rows`, `hint` + contrato | `FormValueControl<string>`. |
| `Select` | `<app-select>` | `label`, `labelMode`, `options` (`SelectOption[]`, requerido), `placeholder`, `hint` + contrato | `FormValueControl<string>`. Separador + chevron propios: con los controles en outlined, un select y un input son la misma caja, y esa es la única pista de que abre una lista. No adelgazarla. |
| `GestureButton` | `<app-gesture-button>` | `variant`, `size`, `disabled`, `fullWidth`, `gestures`, `longPressDelay`, `doubleTapDelay`, `longPressGrace` | Toque, doble toque y pulsado largo, con barra de progreso. Ver abajo. |
| `FieldShell` | `<app-field-shell>` | `labelMode`, `label`, `controlId`, `floated`, `required`, `disabled`, `hint`, `error` | Carcasa que comparten los tres: etiqueta, muesca y línea de ayuda/error. Sólo se usa directamente al construir un control propio. |

**GestureButton — los gestos se declaran.** `gestures` dice cuáles implementa
el botón, y **la apariencia sale de ahí**: la barra de progreso sólo existe si
se declaró `longPress`. Hay que declararlos porque Angular no expone los
suscriptores de un `output()` — `listeners` es privado, y leerlo ataría el
componente a una interna del framework que se rompe en cualquier actualización.

Los tres gestos son **lecturas excluyentes de la misma secuencia**, y de ahí
salen las reglas que no se pueden negociar:

- Un `tap` no se puede emitir hasta descartar que sea el primero de dos. Por eso
  declarar `doubleTap` lo retrasa `doubleTapDelay`; sin declararlo, sale al
  instante. Es el precio del doble toque, no un defecto.
- El `longPress` se emite **al cumplirse el umbral**, no al soltar, y entonces
  soltar ya no emite `tap`.
- La barra no aparece hasta pasado `longPressGrace` (150 ms), y sólo cuando el
  botón implementa además un gesto corto: si no, un toque de 80 ms dejaría un
  destello de barra por algo que nunca iba a ser un pulsado largo. El umbral se
  sigue contando **desde el `pointerdown`**, así que `longPressDelay` es el
  tiempo total que hay que mantener; lo que se acorta es la animación, que se
  reparte el tiempo restante para llegar llena justo al cumplirse.
- Un movimiento de más de 10 px cancela el gesto: por debajo es pulso, por
  encima el usuario está haciendo scroll.

**La barra de progreso va al pie del botón, no de fondo, y no es una elección
estética.** Los rellenos de botón están calibrados para cumplir AA *justo* con
su texto, así que no queda margen para un tinte encima de la etiqueta: medido,
`danger` con la barra llena caía a 3.45:1, y ni al 10% de opacidad se salvaba
`primary` claro (4.22:1). Al pie no toca el texto y el contraste queda intacto.
Por lo mismo, el destello de "cumplido" es un **aro**, no un relleno.

La barra y el destello viven además en **capas separadas**. Compartirlas dejaba
`scaleX(1)` fijado al terminar el destello, así que la barra se quedaba llena en
reposo y el segundo pulsado largo no animaba —iba de 1 a 1—. La barra sólo mide
progreso y siempre descansa en 0.

**Accesibilidad**: el pulsado largo funciona con <kbd>Enter</kbd> o
<kbd>Espacio</kbd> mantenidos (con guarda de `event.repeat`, o el autorrepetir
reiniciaría el pulsado y no cumpliría nunca), y el doble toque con una doble
pulsación rápida. **Aun así el doble toque es poco descubrible**: nunca debería
ser la única forma de llegar a una acción. Un click sintético (dictado,
lectores de pantalla) llega sin eventos de puntero ni de teclado: se reconoce
por `detail` 0 y pasa por el mismo arbitraje que un toque. El `contextmenu` se
suprime sólo mientras hay un pulsado activo — en Windows y Android el
long-press táctil lo dispara con el dedo aún abajo y el menú del webview
partiría el gesto; el click derecho en reposo conserva su menú.

Los tres controles de formulario gatean el mensaje de error tras `touched`: enseñar "requerido" en un formulario recién abierto es hostil.

**`labelMode`** decide dónde vive la etiqueta. Hay tres modos conviviendo **a la espera de que se elija uno**; cuando se decida, el sistema se unifica a ése y los otros se retiran. Comparativa viva en `/styleguide`, sección "Comparativa: dónde va la etiqueta".

| Modo | Alto | Etiqueta | Relleno |
|---|---|---|---|
| `top` (por defecto) | 34 px | fuera, en su propia fila | no (outlined) |
| `float` | 40 px | montada en la línea del borde, con muesca | no — el patrón lo prohíbe |
| `inset` | 52 px | fija dentro, sin animación | **sí**, es el único que lo admite |

**Etiqueta flotante** (`labelMode="float"`): arranca dentro haciendo de placeholder y sube a la línea del borde al enfocar o al haber valor. La caja pasa de 34 a 40 px, pero la etiqueta deja de ocupar su propia fila.

- La muesca la abre un `<fieldset>` decorativo (`aria-hidden`) mediante su `<legend>`. **No se puede sustituir por un parche de fondo tras la etiqueta**: el parche asomaría como un rectángulo de color sobre la página. El `<label for>` real sigue existiendo aparte, para lectores de pantalla.
- La etiqueta flotada va centrada en la **línea del borde** (`top: 0` con `translateY(-50%)`), no dentro de la caja. Hundirla aunque sean 4 px la convierte en una etiqueta inline apretada y rompe el patrón.
- **Ni el fieldset ni el control llevan fondo.** La etiqueta cruza la línea del borde: con relleno, su mitad superior quedaría sobre el fondo de la página y la inferior sobre el relleno, con un escalón de color a mitad de la palabra. *Outlined* y *filled* son excluyentes — ésta es outlined, y por eso lo son también los controles normales (§11.2).
- El `left` de la etiqueta flotada tiene que coincidir con el del legend (`--space-2` + 1 px del borde del fieldset). Si no, asoma un pellizco de borde por un lado.
- **La etiqueta flotada lleva su propio parche de fondo (`--field-bg`)**, y no es decorativo: sin él, el anillo de foco —acento translúcido— la ilumina por detrás y el contraste se hundía de 11.6:1 a 3.84:1 justo al enfocar. El parche funciona porque los controles son transparentes: el color tras el campo es uniforme. `--field-bg` vale `--bg-app` por defecto y **cada superficie lo redefine** (ver `card.css`), así que cascadea solo; sólo hay que declararlo a mano en un contenedor con fondo propio que no sea una `Card`.
- Al enfocar, la etiqueta se ilumina a `--text-primary`; **nunca se pone de acento**. El borde ya comunica el foco, y teñirla del mismo color que el halo fue el error original.
- La tipografía del `<legend>` debe ser **idéntica** a la de la etiqueta flotada (tamaño y peso). Sólo sirve para medir el hueco: si divergen, la muesca se queda corta y la etiqueta se sale.
- En `float` el placeholder se suprime mientras la etiqueta está abajo: los dos a la vez se solapan.
- El `select` en `float` nace flotado y no baja nunca — siempre muestra algo, el placeholder o la opción elegida.
- Los dos modos conviven en el mismo formulario, pero mezclarlos descuadra las alturas (34 contra 40 px). Elegir uno por formulario.

### 11.4 Cómo agregar un componente

1. `pnpm ng generate component shared/ui/<nombre>`.
2. Añadir `changeDetection: ChangeDetectionStrategy.OnPush` (el schematic no lo pone).
3. Inputs con `input()` / `input.required()`; eventos con `output()`.
4. CSS: sólo variables de `tokens.css`.
5. Exportar en el barrel `shared/ui/index.ts`.
6. Añadir un ejemplo a la página `/styleguide`.

### 11.5 Acento configurable

El usuario elige **un tono** (0–359) y la app se retiñe entera: la familia del
acento y el tinte de superficies, texto y bordes. **Luminosidad y croma son
constantes del sistema y no son configurables**: es lo único que garantiza que
cualquier tono cumpla AA — [tokens.spec.ts](src/styles/tokens.spec.ts) barre 72
tonos contra todos los pares de contraste, hover, active y anillo incluidos.

Piezas:

- **`--accent-hue`** (defecto 158, sage) en `tokens.css`: la única variable que
  el runtime toca.
- **Bloque `@supports (color: oklch(…))`** al final de `tokens.css`: redefine
  los tokens dependientes como `oklch(L C var(--accent-hue))`. Los hex estáticos
  de arriba son el render exacto de esas expresiones a tono 158; un test los
  ancla canal a canal para que no deriven.
- **`AccentService`** (`core/services/accent.ts`): signal + persistencia
  (`localStorage`, clave `accent-hue`) + escritura de la propiedad inline en
  `<html>`. `reset()` sólo quita la propiedad — el defecto vuelve por CSS.
  Expone `supported` para ocultar la UI donde no haya `oklch()`, y los presets
  en `ACCENT_PRESETS`.
- **Script inline en `index.html`**: aplica tema y tono guardados antes del
  bootstrap (anti-destello). Si algún día se activa un CSP en
  `tauri.conf.json`, necesitará su hash.
- **Selector en `/styleguide`**: presets, tono libre y restaurar.

Reglas:

1. **No rotan** los semánticos (`success/warning/danger/info`), sus rellenos
   sólidos ni las sombras: rojo=error es convención, no estética. El neutro
   sólido sí rota: es mobiliario, no semántica.
2. **El `@supports` es obligatorio, no cosmético.** Una custom property acepta
   cualquier valor, así que declararla dos veces NO da fallback: la última gana
   siempre, y en un motor sin `oklch()` cada `var(--accent)` se volvería
   inválido a computed-value time — la app entera sin colores, el desastre de
   `light-dark()`. Con la guarda, un WebKit viejo se queda en el sage estático:
   pierde la personalización, no los colores. Por eso `oklch()` sí pasa el
   listón que `light-dark()` no pasa: está en los motores desde 2022 (Chromium
   111, Safari 15.4, WebKitGTK ~2.36), mientras que `light-dark()` exige
   WebKitGTK 2.46 y su fallo costaría el tema oscuro entero.
3. Al tocar una constante L/C: cambiarla en los **tres** contextos del
   `@supports`, regenerar su hex de fallback y dejar que el spec ancle y barra.
   El croma del `--accent-subtle` claro es .014 y no más porque a L .965 el
   azul (H≈258) se sale de sRGB.
4. Los chips y la pista del selector en la styleguide duplican la receta L/C a
   propósito (previsualizan "qué pasaría si", no pueden leer `var(--accent)`);
   si cambian las constantes, cambiarlas también allí.

### 11.6 Página styleguide

Demo viva de todos los componentes en `features/styleguide/`, ruta `/styleguide`. **Mantenerla al día es parte de agregar un componente**, no un extra.

---

## 12. Testing

**Runner frontend**: Vitest + jsdom vía `@angular/build:unit-test` (target `test` en `angular.json`). Specs colocados junto al código como `*.spec.ts`, incluidos por `tsconfig.spec.json`.

```bash
pnpm test              # una pasada
pnpm test --watch      # modo watch
cd src-tauri && cargo test
```

### Qué es obligatorio

| Capa | ¿Test obligatorio? | Ubicación |
|---|---|---|
| Servicios / stores con lógica | **Sí** | colocado `*.spec.ts` |
| Componentes con estado o lógica | **Sí** | colocado |
| Componentes presentacionales puros | No | — |
| Pipes y guards | **Sí** | colocado |
| Wrappers de `src/app/tauri/` | No (son I/O puro) | — |
| Servicios Rust con lógica | **Sí** | `#[cfg(test)] mod tests` en el mismo archivo |
| Comandos Tauri con I/O | **Sí** | mismo archivo |

Sin umbral de cobertura forzado. Un PR debe traer tests de la lógica que toca.

### Zoneless en tests

`fixture.detectChanges()` no basta: hay que esperar la estabilización.

```typescript
it("renderiza el título", async () => {
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();   // NO fixture.detectChanges()

  const compiled = fixture.nativeElement as HTMLElement;
  expect(compiled.querySelector("h1")?.textContent).toContain("Welcome");
});
```

Los tests que ejerciten un wrapper de `tauri/` deben mockear `@tauri-apps/api/core`: fuera de la ventana de Tauri, `invoke()` falla porque no existe `window.__TAURI_INTERNALS__`.

---

## 13. Git

### Branches

- `main` — producción; sólo recibe merges de `develop` o `fix/*` urgentes.
- `develop` — integración; base de las features.
- `feature/*`, `fix/*`, `refactor/*`, `chore/*`.

### Commits

Conventional Commits **en español**:

```
feat: agregar listado de tickets
fix: corregir cálculo de totales
refactor: extraer servicio de tema
chore: actualizar dependencias
docs: actualizar CLAUDE.md
test: agregar tests a ticket-store
```

### Pull Requests

- PR obligatorio para `develop` y `main`.
- **Squash and merge** — historia lineal, un commit por feature.
- Título en Conventional Commits. Descripción: qué cambia, por qué y cómo probarlo.

### Qué se commitea

- Sí: `pnpm-lock.yaml`, `pnpm-workspace.yaml`.
- No: `package-lock.json`, `yarn.lock`, `node_modules/`, `dist/`, `.angular/`, `src-tauri/target/`.

---

## 14. Comandos útiles

```bash
# Desarrollo
pnpm tauri dev              # app de escritorio (levanta ng serve por dentro)
pnpm start                  # sólo frontend → http://localhost:1420

# Build
pnpm build                  # sólo frontend → dist/demo/browser
pnpm tauri build            # ejecutable + instalador del SO actual
pnpm tauri build --debug    # con símbolos de debug

# Tests
pnpm test
cd src-tauri && cargo test

# Rust
cd src-tauri
cargo check
cargo clippy -- -D warnings
cargo fmt

# Angular
pnpm ng generate component features/tickets/ticket-list
pnpm ng version
```

---

## 15. Decisiones pendientes

Deliberadamente **fuera** de esta base. Cada proyecto derivado decide y lo documenta en su propio CLAUDE.md:

| Tema | Estado |
|---|---|
| Persistencia (SQLite / `tauri-plugin-store` / `localStorage`) | Sin decidir. No hay BD ni store en la base. |
| Logging (`tauri-plugin-log`) | Sin decidir. Hoy no hay plugin de log: `println!` sólo vale para depuración local, nunca en un commit. |
| Barra de título custom vs. nativa | Nativa (`decorations` por defecto). |
| Versionado sincronizado `package.json` ↔ `tauri.conf.json` | Manual. No hay script de sync. |
| Linter (ESLint / `angular-eslint`) | No instalado. |
| Pre-commit hooks (husky + lint-staged) | No instalados. |
| i18n | Sin decidir. |

Al activar cualquiera de estos: instalar, documentar su sección aquí y actualizar la tabla de permisos si aplica.

---

## 16. Reglas para Claude

Al trabajar en este proyecto:

1. **Español** en comentarios, commits y documentación.
2. **Comentarios al mínimo, salvo que sean necesarios (§6.9).** El defecto es no comentar. Un comentario nuevo sólo se escribe si, sin él, un cambio futuro rompe algo en silencio, y ninguna de las alternativas —renombrar, extraer, tipar, escribir el test, documentarlo en §11— sirve; entonces cabe en una línea. No narrar el código, no dejar el andamiaje de las plantillas ni de `ng generate`, no comentar "por si acaso". Al tocar un archivo, borrar los comentarios que se crucen y no pasen ese listón.
3. **Zoneless primero**: ante cualquier estado que se renderice, verificar que sea un `signal`. Es el error más fácil de introducir aquí y el más difícil de ver en review.
4. **pnpm siempre.** Nunca sugerir `npm install` ni `npx`; usar `pnpm` y `pnpm dlx`.
5. No introducir dependencias sin justificarlas. Preferir lo nativo de Angular/Tauri antes que una librería.
6. Respetar la convención de nombrado del CLI (§5.1). No renombrar a `*.component.ts`.
7. Al tocar `tauri.conf.json` o `capabilities/*.json`: explicar cada permiso **y actualizar la tabla de §10**.
8. Comandos Tauri nuevos: `AppResult<T>` siempre; nada de `unwrap`/`expect` fuera de tests.
9. Al agregar un componente a `shared/ui/`: barrel + styleguide, o no está terminado.
10. Si se cambia el puerto o el nombre del proyecto, revisar los tres acoplamientos de §3.3.
11. Sugerir refactor cuando se repita lógica en 2+ archivos.
12. **Mantener este archivo actualizado** al introducir una convención nueva o cerrar una decisión de §15.
