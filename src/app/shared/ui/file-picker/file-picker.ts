import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { FormValueControl, ValidationError } from "@angular/forms/signals";

import { FieldShell } from "../field-shell/field-shell";

export type FileSource = "drop" | "browse" | "paste";
export type RejectionReason = "type" | "size" | "count" | "duplicate" | "folder";

export interface RejectedFile {
  readonly file: File;
  readonly reason: RejectionReason;
}

let nextId = 0;

@Component({
  selector: "app-file-picker",
  imports: [FieldShell],
  templateUrl: "./file-picker.html",
  styleUrl: "./file-picker.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilePicker implements FormValueControl<readonly File[]> {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly value = model<readonly File[]>([]);

  readonly label = input("");
  readonly hint = input("");
  readonly sources = input<readonly FileSource[]>(["drop", "browse", "paste"]);
  readonly accept = input("");
  readonly maxFiles = input(0);
  readonly maxSize = input(0);
  readonly preview = input(true);

  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly touched = input(false);
  readonly name = input("");

  readonly touch = output<void>();
  readonly rejected = output<readonly RejectedFile[]>();

  protected readonly id = `app-file-picker-${nextId++}`;

  private readonly campo = viewChild.required<ElementRef<HTMLInputElement>>("campo");

  protected readonly admiteSoltar = computed(() => this.sources().includes("drop"));
  protected readonly admiteExplorar = computed(() => this.sources().includes("browse"));
  protected readonly admitePegar = computed(() => this.sources().includes("paste"));

  protected readonly multiple = computed(() => this.maxFiles() !== 1);

  private readonly reglas = computed(() => reglasDe(this.accept()));

  private readonly profundidad = signal(0);
  protected readonly encima = computed(() => this.profundidad() > 0);

  private readonly enfocado = signal(false);
  private readonly senalado = signal(false);
  protected readonly armado = computed(
    () => this.admitePegar() && !this.disabled() && (this.enfocado() || this.senalado()),
  );

  protected readonly aviso = signal("");
  private readonly urls = signal<ReadonlyMap<File, string>>(new Map());

  protected readonly error = computed(() => {
    const formulario = this.touched() ? this.errors()[0]?.message : undefined;
    return formulario ?? (this.aviso() || undefined);
  });

  protected readonly adjuntos = computed(() =>
    this.value().map((file) => ({
      file,
      tamano: formatearBytes(file.size),
      url: this.urls().get(file) ?? "",
      extension: extensionDe(file),
    })),
  );

  protected readonly texto = computed(() => {
    if (this.admiteSoltar() && this.admiteExplorar()) {
      return "Arrastra tus archivos o examina el equipo";
    }
    if (this.admiteSoltar()) return "Arrastra tus archivos aquí";
    if (this.admiteExplorar()) return "Examina el equipo";
    if (this.admitePegar()) return "Pega un archivo con Ctrl+V";
    return "Adjuntar archivos";
  });

  protected readonly textoPegar = computed(() => {
    if (!this.admitePegar() || (!this.admiteSoltar() && !this.admiteExplorar())) return "";
    return this.armado() ? "Pega aquí con Ctrl+V" : "o pega con Ctrl+V";
  });

  protected readonly limites = computed(() => {
    const partes: string[] = [];
    const tipos = describirReglas(this.reglas());
    if (tipos) partes.push(tipos);
    if (this.maxSize() > 0) partes.push(`hasta ${formatearBytes(this.maxSize())}`);
    if (this.maxFiles() > 0) {
      partes.push(this.maxFiles() === 1 ? "1 archivo" : `${this.maxFiles()} archivos`);
    }
    return partes.join(" · ");
  });

  protected readonly etiquetaAccesible = computed(() =>
    [this.label(), this.texto(), this.textoPegar(), this.limites()]
      .filter(Boolean)
      .join(". "),
  );

  constructor() {
    effect(() => {
      const archivos = this.value();
      const conMiniatura = this.preview();
      const previas = untracked(() => this.urls());

      const siguientes = new Map<File, string>();
      for (const file of archivos) {
        const previa = previas.get(file);
        if (previa !== undefined) {
          siguientes.set(file, previa);
          continue;
        }
        if (conMiniatura && esImagen(file)) {
          siguientes.set(file, URL.createObjectURL(file));
        }
      }
      for (const [file, url] of previas) {
        if (siguientes.get(file) !== url) URL.revokeObjectURL(url);
      }
      this.urls.set(siguientes);
    });

    this.destroyRef.onDestroy(() => {
      for (const url of untracked(() => this.urls()).values()) {
        URL.revokeObjectURL(url);
      }
    });

    const candidato: Candidato = {
      admite: () => this.admitePegar() && !this.disabled(),
      enfocado: () => this.enfocado(),
      senalado: () => this.senalado(),
      contiene: (nodo) => this.host.nativeElement.contains(nodo),
      recibir: (archivos) => this.agregar(archivos),
    };
    registrar(candidato);
    this.destroyRef.onDestroy(() => olvidar(candidato));
  }

  protected onDragEnter(event: DragEvent): void {
    if (this.disabled() || !this.admiteSoltar() || !llevaArchivos(event)) return;
    event.preventDefault();
    this.profundidad.update((n) => n + 1);
  }

  protected onDragOver(event: DragEvent): void {
    if (this.disabled() || !this.admiteSoltar() || !llevaArchivos(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }

  protected onDragLeave(): void {
    this.profundidad.update((n) => Math.max(0, n - 1));
  }

  protected onDrop(event: DragEvent): void {
    this.profundidad.set(0);
    if (this.disabled() || !this.admiteSoltar()) return;
    event.preventDefault();
    const { archivos, carpetas } = separarCarpetas(event.dataTransfer);
    this.agregar(archivos, carpetas);
  }

  protected onFocus(): void {
    this.enfocado.set(true);
  }

  protected onBlur(): void {
    this.enfocado.set(false);
    this.touch.emit();
  }

  protected onPointerEnter(): void {
    this.senalado.set(true);
  }

  protected onPointerLeave(): void {
    this.senalado.set(false);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    if (this.disabled() || !this.admiteExplorar()) return;
    event.preventDefault();
    this.abrir();
  }

  protected abrir(): void {
    if (this.disabled() || !this.admiteExplorar()) return;
    this.campo().nativeElement.click();
  }

  protected onSelect(event: Event): void {
    const campo = event.target as HTMLInputElement;
    this.agregar(Array.from(campo.files ?? []));
    campo.value = "";
  }

  protected quitar(file: File): void {
    this.aviso.set("");
    this.value.set(this.value().filter((actual) => actual !== file));
    this.touch.emit();
  }

  private agregar(
    entrantes: readonly File[],
    previos: readonly RejectedFile[] = [],
  ): void {
    if (entrantes.length === 0 && previos.length === 0) return;

    const limite = this.maxFiles();
    const maximo = this.maxSize();
    const reglas = this.reglas();
    const base = limite === 1 ? [] : [...this.value()];
    const vistos = new Set(base.map(claveDe));
    const aceptados: File[] = [];
    const rechazados: RejectedFile[] = [...previos];

    for (const file of entrantes) {
      if (!aceptaTipo(file, reglas)) {
        rechazados.push({ file, reason: "type" });
        continue;
      }
      if (maximo > 0 && file.size > maximo) {
        rechazados.push({ file, reason: "size" });
        continue;
      }
      const clave = claveDe(file);
      if (vistos.has(clave)) {
        rechazados.push({ file, reason: "duplicate" });
        continue;
      }
      if (limite > 0 && base.length + aceptados.length >= limite) {
        rechazados.push({ file, reason: "count" });
        continue;
      }
      vistos.add(clave);
      aceptados.push(file);
    }

    this.aviso.set(avisoDe(rechazados));
    if (aceptados.length > 0) this.value.set([...base, ...aceptados]);
    if (rechazados.length > 0) this.rejected.emit(rechazados);
  }
}

interface Candidato {
  readonly admite: () => boolean;
  readonly enfocado: () => boolean;
  readonly senalado: () => boolean;
  readonly contiene: (nodo: Node) => boolean;
  readonly recibir: (archivos: readonly File[]) => void;
}

const candidatos = new Set<Candidato>();

function registrar(candidato: Candidato): void {
  candidatos.add(candidato);
  if (candidatos.size === 1) document.addEventListener("paste", repartirPegado);
}

function olvidar(candidato: Candidato): void {
  candidatos.delete(candidato);
  if (candidatos.size === 0) document.removeEventListener("paste", repartirPegado);
}

function repartirPegado(event: ClipboardEvent): void {
  if (event.defaultPrevented) return;
  const archivos = Array.from(event.clipboardData?.files ?? []);
  if (archivos.length === 0) return;

  const activos = [...candidatos].filter((candidato) => candidato.admite());
  const origen = event.target instanceof Node ? event.target : null;
  const propio =
    origen === null ? undefined : activos.find((candidato) => candidato.contiene(origen));

  if (propio === undefined && escribeEn(origen)) return;

  const elegido =
    propio ??
    activos.find((candidato) => candidato.enfocado()) ??
    activos.find((candidato) => candidato.senalado()) ??
    (activos.length === 1 ? activos[0] : undefined);

  if (elegido === undefined) return;
  event.preventDefault();
  elegido.recibir(archivos);
}

const EDITABLES =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

function escribeEn(nodo: Node | null): boolean {
  const elemento = nodo instanceof Element ? nodo : (nodo?.parentElement ?? null);
  return elemento?.closest(EDITABLES) != null;
}

const MOTIVOS: Record<RejectionReason, string> = {
  type: "tipo no admitido",
  size: "supera el tamaño máximo",
  count: "no cabe, se alcanzó el máximo",
  duplicate: "ya estaba adjunto",
  folder: "las carpetas no se adjuntan",
};

function avisoDe(rechazados: readonly RejectedFile[]): string {
  if (rechazados.length === 0) return "";
  const motivos = [...new Set(rechazados.map((rechazado) => MOTIVOS[rechazado.reason]))];
  const cuantos = rechazados.length === 1 ? "1 archivo" : `${rechazados.length} archivos`;
  return `${cuantos} sin adjuntar: ${motivos.join(", ")}.`;
}

function llevaArchivos(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes("Files") ?? false;
}

function separarCarpetas(datos: DataTransfer | null): {
  archivos: readonly File[];
  carpetas: readonly RejectedFile[];
} {
  const archivos = Array.from(datos?.files ?? []);
  const entradas = Array.from(datos?.items ?? []).filter((item) => item.kind === "file");
  if (entradas.length !== archivos.length) return { archivos, carpetas: [] };

  const sueltos: File[] = [];
  const carpetas: RejectedFile[] = [];
  archivos.forEach((file, i) => {
    if (entradas[i].webkitGetAsEntry?.()?.isDirectory) {
      carpetas.push({ file, reason: "folder" });
    } else {
      sueltos.push(file);
    }
  });
  return { archivos: sueltos, carpetas };
}

function reglasDe(accept: string): readonly string[] {
  const reglas = accept
    .split(",")
    .map((regla) => regla.trim().toLowerCase())
    .filter(Boolean);
  return reglas.some(esUniversal) ? [] : reglas;
}

function esUniversal(regla: string): boolean {
  return regla === "*" || regla === "*/*";
}

const FAMILIAS: Record<string, string> = {
  image: "imágenes",
  video: "vídeos",
  audio: "audio",
  text: "texto",
};

function describirReglas(reglas: readonly string[]): string {
  const nombres = reglas.map((regla) => {
    if (regla.startsWith(".")) return regla.slice(1).toUpperCase();
    const [familia, subtipo] = regla.split("/");
    if (subtipo === "*") return FAMILIAS[familia] ?? familia;
    return (subtipo ?? regla).toUpperCase();
  });
  return [...new Set(nombres)].join(", ");
}

function aceptaTipo(file: File, reglas: readonly string[]): boolean {
  if (reglas.length === 0) return true;

  const tipo = file.type.toLowerCase();
  const nombre = file.name.toLowerCase();
  return reglas.some((regla) => {
    if (regla.startsWith(".")) return nombre.endsWith(regla);
    if (regla.endsWith("/*")) return tipo.startsWith(regla.slice(0, -1));
    return tipo === regla;
  });
}

function claveDe(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

function esImagen(file: File): boolean {
  return file.type.startsWith("image/");
}

function extensionDe(file: File): string {
  const extension = file.name.slice(file.name.lastIndexOf(".") + 1);
  if (extension === "" || extension === file.name) return "?";
  return extension.slice(0, 4).toUpperCase();
}

function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${redondear(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${redondear(mb)} MB`;
  return `${redondear(mb / 1024)} GB`;
}

function redondear(valor: number): string {
  return valor >= 10 ? String(Math.round(valor)) : valor.toFixed(1).replace(/\.0$/, "");
}
