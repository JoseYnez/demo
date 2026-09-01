# Plan — Editor de código, SQL primero

> Rama `feature/editor-sql`, abierta desde `feature/identidad-tipografica` (el tronco real:
> `master` está 34 commits por detrás y `origin/HEAD` apunta aquí).
> Planeado el 2026-09-01. Paquetes auditados y pesados con bundle real ese mismo día.
> Este documento es el contrato de la rama: lo que no está aquí, no entra.

---

## 1. Alcance y decisiones cerradas

| Decisión | Elección | Por qué |
|---|---|---|
| Motor | **CodeMirror 6** (paquetes sueltos, sin `basicSetup`) | 197 kB gz medidos contra ~1,5 MB de Monaco; se tematiza con `var()` así que el acento configurable (§11.5 de CLAUDE.md) lo retiñe solo; dialectos SQL y autocompletado de serie. |
| Manejo de archivos | **Pestañas sin árbol** | Abrir/guardar por diálogo nativo, varias pestañas, estado sucio por pestaña. El explorador lateral se puede añadir después sin rehacer nada. |
| Ejecución de SQL | **No** — sólo editar | Ejecutar exige motor de BD, driver, credenciales y panel de resultados: otra rama. §15 tiene la persistencia sin decidir. |
| Lenguajes | **SQL primero, registro abierto** | La resolución extensión↔lenguaje vive en un registro con una fila por lenguaje; añadir JSON o Markdown después es una fila y un import, no un refactor. |
| Dialecto por defecto | **T-SQL (SQL Server)** | Selector en la barra de estado con PostgreSQL, MySQL y SQLite; el dialecto es **por documento**. |
| Persistencia entre arranques | **Ninguna** | Cada arranque empieza limpio. Las pestañas sí sobreviven la navegación *dentro* de la sesión (ver §3.3). |
| Guardado | **Explícito con aviso** | Ctrl+S; punto de sucio en la pestaña; aviso nativo al cerrar la ventana con cambios pendientes. Nada escribe en disco a espaldas del usuario. |
| Funciones | Buscar/reemplazar · autocompletado con **Tab** · plegado · multicursor · **formatear** | Todo de CodeMirror salvo el formateo, que trae `sql-formatter` (ver §7). |
| I/O de disco | **Comandos Rust propios**, no `fs:allow-*` | El scope es el código, no un glob en `capabilities/`; permite validar en el límite (§9.4), imponer 8 MB de tope y manejar BOM/EOL. Del plugin `dialog` sí se depende: el `FilePicker` entrega `File` sin ruta, y sin ruta no hay «guardar encima». |

Ruta `/editor` con enlace en la barra junto a Styleguide y Tauri IPC. El `""` sigue
redirigiendo a `/styleguide`: esto es una base, no una app de SQL.

## 2. Qué se ve

```
┌ barra de la app (la de siempre) ───────────────────────────────────┐
├ consulta.sql ● │ vistas.sql │ + ──────────────────── Abrir Guardar ┤
│  1  SELECT c.nombre, SUM(p.total)                                  │
│  2    FROM dbo.Cliente AS c                                        │
│ ▸3    JOIN dbo.Pedido  AS p ON p.ClienteId = c.Id                  │
├ D:\sql\consulta.sql     Ln 3, Col 18    T-SQL ▾    CRLF    UTF-8   ┤
└────────────────────────────────────────────────────────────────────┘
```

- Pestañas con punto de «sin guardar» y botón de cierre; `+` crea `sin-titulo-N.sql`.
- Barra de estado: ruta (o «sin guardar»), Ln/Col, selector de dialecto, EOL, codificación.
- La ventana pasa de 800×600 a **1100×720**, mínimo 640×480. Ni el puerto ni el nombre
  del proyecto cambian: los acoplamientos de §3.3 de CLAUDE.md no se tocan.

## 3. Arquitectura

### 3.1 Tres capas — la de en medio es la que importa

| Capa | Dónde | Qué sabe |
|---|---|---|
| `CodeEditor` | `shared/ui/code-editor/` | CodeMirror y nada más. `FormValueControl<string>`, inputs `language` y `dialect`. **No sabe qué es un archivo.** Barrel + styleguide (§11.4). |
| Pantalla | `features/editor/` | Pestañas, documento sucio, barra de estado, formateo. **No importa nada de `@tauri-apps`.** |
| I/O | `tauri/file.api.ts` + Rust | Único sitio que toca disco y diálogos. |

Ese corte permite usar mañana el editor como control de formulario
(`<app-code-editor language="sql" [(value)]="consulta" />`) sin arrastrar el explorador.

### 3.2 Un solo `EditorView`, un `EditorState` por documento

- La pantalla monta **una** vista de CodeMirror. Cada documento guarda su `EditorState`
  en un `Map` normal — **no un signal**: la plantilla no lo renderiza (§3.4 de CLAUDE.md),
  y los `EditorState` son valores inmutables. Cambiar de pestaña es guardar el estado
  actual en el mapa y `view.setState(otro)`: cada archivo conserva undo, selección y
  plegados. Es lo que hace VS Code y evita montar/desmontar vistas.
- **El texto vivo vive en CodeMirror, no en un signal.** El store sólo guarda un booleano
  `sucio` que se levanta con el primer `docChanged` y se baja al guardar. Escribir cada
  pulsación en un signal marcaría medio árbol para revisión por tecla sin comprar nada.
- Ln/Col de la barra de estado sí son signals, escritos desde el `updateListener` —
  la escritura de signal dispara la detección de cambios también bajo zoneless.

### 3.3 El store es singleton de root

`EditorStore` con `@Service()`: los documentos y sus `EditorState` sobreviven navegar a
`/styleguide` y volver dentro de la misma sesión (eso no es la persistencia entre
arranques que se descartó; es UX básica). El `EditorView` pertenece al componente y se
recrea por montaje desde el estado guardado. El guard de cierre de ventana (§6.a) se
registra **una vez en el store**; al ser root nunca se destruye y no hay `unlisten`
colgante que gestionar.

## 4. Archivos nuevos

```
src/app/
├── models/documento.model.ts          Documento, FinDeLinea, Codificacion, DialectoSql
├── tauri/file.api.ts                  read · write · openDialog · saveDialog · confirmarDescarte
├── shared/ui/code-editor/             .ts .html .css .spec + languages.ts (registro perezoso)
└── features/editor/
    ├── editor.ts/.html/.css           layout de la pantalla
    ├── editor-store.ts + .spec        documentos, sucio, abrir, guardar, cerrar, guard de ventana
    ├── document-tabs/                 pestañas (rol tablist, punto de sucio, cierre)
    ├── status-bar/                    ruta · Ln/Col · dialecto · EOL · codificación
    └── sql/dialects.ts · format.ts

src-tauri/src/
├── error.rs                           AppError + AppResult  ← §8.1 lo prescribe y hoy no existe
├── models/text_file.rs                RutaArchivo (newtype TryFrom), TextFile
├── services/text_file.rs              lectura/escritura + BOM + EOL + límites  (con tests)
└── commands/text_file.rs              read_text_file · write_text_file
```

Modelo del documento (frontend):

```typescript
interface Documento {
  id: string;
  ruta: string | null;        // null = nunca guardado
  nombre: string;
  sucio: boolean;
  eol: FinDeLinea;            // "lf" | "crlf"
  codificacion: Codificacion; // "utf8" | "utf8bom" | "utf16le" | "utf16be"
  dialecto: DialectoSql;      // "tsql" | "postgresql" | "mysql" | "sqlite"
}
```

## 5. Backend Rust

- **`error.rs` primero** (commit 2): `AppError` con `thiserror`, `Serialize` a string
  plano, `AppResult<T>` — exactamente el §8.1 de CLAUDE.md, que estaba pendiente del
  primer comando con I/O. Éste es ese comando.
- `read_text_file(ruta) -> TextFile { contenido, eol, codificacion }`
  - Olfatea BOM: `EF BB BF` → UTF-8 BOM · `FF FE` → UTF-16 LE · `FE FF` → UTF-16 BE.
    Sin BOM: UTF-8 estricto, y si no decodifica → `AppError::Validation`. **SSMS guarda
    UTF-8 con BOM o UTF-16 LE**: leer como UTF-8 crudo rompería los `.sql` de SQL Server.
    `String::from_utf16` está en `std`; cero dependencias.
  - **Normaliza EOL a `\n` y devuelve el original como metadato.** Rust es el único
    dueño de esa transformación: el frontend nunca convierte (CM parte con `\r\n` pero
    reensambla con `\n`, y repartir la conversión entre dos lados es cómo se descasa).
  - Tope **8 MB** y rechazo de binarios (byte NUL fuera de UTF-16) → error, no basura.
- `write_text_file(ruta, contenido, eol, codificacion)` — restaura EOL y codificación
  (incluido el BOM) tal como llegaron. **Escritura atómica**: temp en el mismo
  directorio + rename; un fallo a mitad no deja el `.sql` truncado.
- Los comandos son sin estado: el documento lleva `eol`/`codificacion` y los devuelve
  al guardar. Ambos `async`, sólo orquestan; la lógica va en `services/` (§9).
- Tests de Rust en el mismo archivo: BOM×4, EOL×2, binario, tope, roundtrip.

## 6. Trampas conocidas y su resolución

**a) `onCloseRequested` exige `core:window:allow-destroy` — para *todo* cierre.**
Verificado en el código instalado (`window.js:1637`): si el handler no llama a
`preventDefault()`, la propia API llama a `destroy()` desde JS. Con el guard activo,
también el cierre limpio pasa por ahí; sin el permiso la app no cierra nunca. (Se
consideró la alternativa Rust — `on_window_event` + `prevent_close()` + roundtrip de
eventos — y pierde: más piezas para lo mismo.) El aviso usa `ask()` nativo de dos
botones (Descartar / Cancelar); tres botones exigirían un modal propio que `shared/ui/`
no tiene — pendiente anotado en §15.

**b) `KeyboardService` ignora lo nacido en `contenteditable` — y el área de CM lo es.**
Ctrl+S no llegaría nunca con el foco en el editor. Se añade la opción `allowInEditable`
al registro, con su test, y se documenta en §11.6. Frontera nítida: dentro de CM mandan
sus keymaps; `allowInEditable` es sólo para atajos **de la app** que deben funcionar con
el foco dentro (Ctrl+S, Ctrl+Shift+S). Ninguna tecla tiene dos dueños.

**c) El CSS del componente no alcanza el DOM de CodeMirror.** CM crea su DOM en runtime
y la encapsulación emulada sólo estampa `[_ngcontent-x]` en los elementos de la
plantilla: una regla `.cm-keyword` en el `.css` del componente **no casa jamás** — la
variante dinámica de la trampa de scoping que §11.2 ya documenta. El mecanismo correcto
es el propio de CM: `EditorView.theme()` y `HighlightStyle.define()` con
`color: "var(--code-keyword)"` como valor. Los tokens siguen mandando (retinte y cambio
de tema funcionan solos, porque son `var()`), pero viven en el theme de CM. El `.css`
del componente queda para el `:host`. Esto cubre también el panel de búsqueda
(`.cm-panel`), que trae su propio DOM.

**d) Plegado en T-SQL: honestidad.** El árbol de `lang-sql` pliega paréntesis
(subconsultas, listas de columnas) pero **no bloques `BEGIN…END`**. Entra el
`foldGutter` con lo que el lenguaje da; extenderlo sería un `foldService` propio que no
paga su coste en esta rama. Multicursor sí completo: `allowMultipleSelections`,
Alt+click, y Ctrl+D (`selectNextOccurrence`).

**e) El formateo puede fallar y no debe romper nada.** Un lote con `GO` o sintaxis a
medias puede lanzar excepción en `sql-formatter`. Try/catch: si falla, el documento no
se toca y el aviso sale en la línea de mensaje. Si formatea, un solo `dispatch` → un
solo paso de undo.

**f) Tab atrapa el foco.** Tab acepta el autocompletado y, sin popup, indenta: no hay
salida del editor con teclado. Válvula estándar de CM: **Escape y luego Tab** sale del
editor. Con test.

## 7. Dependencias — auditadas y pesadas

**Seguridad (verificado 2026-09-01):**

- `pnpm audit` sobre el árbol completo resuelto: **cero vulnerabilidades conocidas**.
- RUSTSEC: **sin avisos** para `tauri-plugin-dialog` ni `rfd` (patrón de URL verificado
  contra un crate que sí los tiene).
- **Ningún paquete pide scripts de instalación**: `allowBuilds` de
  `pnpm-workspace.yaml` no se toca (§3.1). El gate de antigüedad de pnpm les aplica;
  ninguno entra en `minimumReleaseAgeExclude`.
- Procedencia: todo `@codemirror/*`/`@lezer/*` y sus 4 micro-deps son de Marijn
  Haverbeke — concentración en un mantenedor, pero es la base de editor mejor auditada
  de npm (Chrome DevTools corre sobre ella). `plugin-dialog` es oficial de tauri-apps.
  **El eslabón débil es `sql-formatter`**: arrastra `nearley` (sin releases desde 2021)
  y micro-paquetes de la era 2016 (`moo`, `commander@2`, `randexp`, `ret`,
  `discontinuous-range`, `railroad-diagrams`). Audit-limpios y casi todos fuera del
  bundle por tree-shaking, pero viven en el lockfile como superficie. Se acepta porque
  es cómputo puro —ni red, ni disco, ni eval— sobre texto que el usuario ya ve; el peor
  caso realista es un cuelgue de regex, aislado por el try/catch de §6.e. Si un día se
  quiere podar: se quita la función de formatear y fuera — es un módulo de un archivo.
- Licencias: todo MIT (`plugin-dialog`: MIT o Apache-2.0).

**Peso (bundle real con esbuild — el mismo minificador de `@angular/build` —
importando exactamente lo que el plan usa):**

| Pieza | min | gz |
|---|---|---|
| CodeMirror completo (vista, historial, búsqueda, plegado, multicursor, autocompletado, 4 dialectos) | 607,4 kB | **197,0 kB** |
| `sql-formatter` vía `formatDialect()` + 4 dialectos sueltos | 97,7 kB | **27,3 kB** |
| `@tauri-apps/plugin-dialog` (JS) | 2,5 kB | **1,0 kB** |
| **Total del chunk perezoso de `/editor`** | ~707 kB | **~225 kB** |

- **`formatDialect()`, no `format()`**: la API global empaqueta los ~20 dialectos y
  costaba 74,2 kB gz; con dialectos importados por nombre el tree-shaking deja 27,3.
  La fila de `dialects.ts` lleva las tres columnas: etiqueta, dialecto de CM, dialecto
  de `sql-formatter`.
- Todo el peso viaja en el chunk perezoso: el `initial` no se mueve un byte y los
  budgets de `angular.json` (que sólo miden `initial`) no se enteran. Quien no entre a
  `/editor` no lo descarga.

**Paquetes a instalar** (npm): `@codemirror/state` · `view` · `commands` · `language` ·
`search` · `autocomplete` · `lang-sql`, `@lezer/highlight`, `sql-formatter`,
`@tauri-apps/plugin-dialog`. (crates): `tauri-plugin-dialog` + `.plugin(init())` en
`lib.rs`.

## 8. Permisos Tauri — filas nuevas para la tabla de §10

| Permiso | Para qué | Quién lo usa |
|---|---|---|
| `dialog:allow-open` | Diálogo nativo de abrir archivo | `fileApi.openDialog` |
| `dialog:allow-save` | Diálogo nativo de guardar como | `fileApi.saveDialog` |
| `dialog:allow-ask` | Aviso de cambios sin guardar al cerrar (dos botones con etiquetas propias; `confirm` no las admite) | `fileApi.confirmarDescarte` |
| `core:window:allow-destroy` | Requerido por `onCloseRequested`: con el guard activo, **todo** cierre —limpio incluido— termina en `destroy()` desde JS | guard del `EditorStore` |

Sin comodines; el I/O de disco no pide permisos porque son comandos propios.

## 9. Tokens nuevos — 7 de sintaxis + 4 de mobiliario

En los tres bloques de `tokens.css` (claro, oscuro por atributo, oscuro por media):

- Sintaxis: `--code-keyword`, `--code-string`, `--code-number`, `--code-comment`,
  `--code-operator`, `--code-type`, `--code-variable`. La puntuación mapea a
  `--text-muted` en el `HighlightStyle` — un token con un solo consumidor y cero
  decisión propia es inventario muerto.
- Mobiliario: `--code-selection` (translúcido), `--code-active-line`, `--code-cursor`,
  `--code-gutter-fg`.
- **No rotan con el acento** — quedan fuera del `@supports`, como los semánticos
  (§11.5 regla 1): azul=palabra clave es convención, igual que rojo=error.
- Contraste: el fondo del editor es `--bg-surface`. Los 7 de sintaxis cumplen 4.5:1
  contra ella **y compuestos sobre `--code-selection`** en los dos temas — la misma
  composición de translúcidos que ya resuelve el anillo de foco. Son ~12 pares nuevos
  en `tokens.spec.ts`, cuya maquinaria ya existe. `--code-gutter-fg` es texto de apoyo:
  listón de `--text-muted`.

## 10. Teclado

| Tecla | Acción | Dueño |
|---|---|---|
| Ctrl+S / Ctrl+Shift+S | Guardar / Guardar como | `KeyboardService` con `allowInEditable`, registrado por la feature (baja al salir) |
| Ctrl+F | Panel de búsqueda/reemplazo | keymap de CM (`searchKeymap`) |
| Ctrl+Espacio · **Tab** | Abrir autocompletado · aceptarlo (sin popup: indentar) | keymap de CM |
| Ctrl+D | Siguiente ocurrencia (multicursor) | keymap de CM |
| Shift+Alt+F | Formatear documento | keymap de CM (acción de la feature) |
| Escape | Cierra popup/panel; luego Tab sale del editor | keymap de CM |

Ctrl+W / Ctrl+Tab de pestañas: **fuera de la rama** — sumarían filas al panel de ayuda
sin ser el corazón; las pestañas se operan con ratón y foco.

El selector de dialecto de la barra de estado es un **`<select>` nativo estilado con
tokens** en la feature, no `<app-select>`: ése es un control de formulario con carcasa
de 34 px y la barra mide ~28 — como los enlaces de la barra superior son `<a>` planos.
El popup oscuro ya está resuelto globalmente (§11.2).

## 11. Orden de commits

1. `chore:` dependencias npm + crate `tauri-plugin-dialog` + registro del plugin
2. `feat:` `AppError` / `AppResult` en Rust (§8.1)
3. `feat:` comandos de lectura/escritura — BOM, EOL, atómica, límites — **con tests**
4. `feat:` tokens de sintaxis + ampliación de `tokens.spec.ts`
5. `feat:` componente `code-editor` (theme vía `EditorView.theme`) + barrel + styleguide
6. `feat:` `allowInEditable` en `KeyboardService` + test + §11.6
7. `feat:` pantalla `/editor`: store, pestañas, barra de estado, abrir/guardar
8. `feat:` formateo T-SQL (`formatDialect`) + selector de dialecto
9. `feat:` guard de cierre con `ask()` + permisos (`allow-ask`, `allow-destroy`)
10. `docs:` CLAUDE.md — ver §14

Cada commit deja `pnpm test` y `cargo clippy -- -D warnings` en verde.

## 12. Riesgos asumidos

- **CodeMirror en jsdom.** CM6 mide con `getClientRects`, que jsdom devuelve vacío.
  Monta, pero puede quejarse. Plan B: testear lo puro —registro de lenguajes, formateo,
  store completo, detección BOM/EOL en Rust— y dejar la vista cubierta por «monta y
  sincroniza el valor». Se sabrá en el commit 5 y se dirá.
- **Autocompletado sin esquema.** Sin conexión a BD no hay tablas ni columnas: sólo
  palabras clave, funciones y tipos del dialecto. Es el techo de esta rama, no un bug.

## 13. Fuera de esta rama

Ejecutar SQL · árbol de carpetas y watcher · restaurar sesión entre arranques ·
autocompletado de tablas/columnas (necesita esquema, y el esquema, conexión) · diálogo
modal propio de tres botones · minimapa · atajos de pestañas · `foldService` para
`BEGIN…END` · `cargo audit` en CI.

## 14. Actualizaciones a CLAUDE.md al cerrar (commit 10)

- §7: filas de `fileApi` en el inventario de wrappers.
- §10: las cuatro filas de permisos de §8 de este plan, con la nota de `allow-destroy`.
- §11.1: los 11 tokens `--code-*` y su regla de no-rotación.
- §11.3: fila de `CodeEditor` en el inventario, con la nota del theming (§6.c).
- §11.6: la opción `allowInEditable` y los atajos nuevos.
- §15: cerrar «primer comando con I/O» (nace `error.rs`); anotar pendientes: modal
  propio de tres botones, `cargo audit`, ejecución de SQL como decisión futura.
- Tamaño de ventana nuevo en la sección de la barra de título si aplica.
