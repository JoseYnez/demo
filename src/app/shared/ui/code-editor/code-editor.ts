import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
} from "@angular/core";
import { FormValueControl } from "@angular/forms/signals";
import {
  acceptCompletion,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
} from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, Extension } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";

import { EditorLanguage, languageExtension, SqlDialect } from "./languages";
import { editorHighlight, editorTheme } from "./theme";

export interface CursorPosition {
  line: number;
  column: number;
}

@Component({
  selector: "app-code-editor",
  template: "",
  styleUrl: "./code-editor.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeEditor implements FormValueControl<string> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = model("");
  readonly language = input<EditorLanguage>("sql");
  readonly dialect = input<SqlDialect>("tsql");
  readonly disabled = input(false);
  readonly externalState = input(false);

  readonly touch = output<void>();
  readonly edited = output<void>();
  readonly cursor = output<CursorPosition>();
  readonly ready = output<void>();

  readonly #lenguaje = new Compartment();
  readonly #edicion = new Compartment();
  #view: EditorView | undefined;

  constructor() {
    afterNextRender(() => {
      this.#view = new EditorView({
        parent: this.host.nativeElement,
        state: this.createState(this.value()),
      });
      this.ready.emit();
    });
    this.destroyRef.onDestroy(() => this.#view?.destroy());

    effect(() => {
      const extension = languageExtension(this.language(), this.dialect());
      this.#view?.dispatch({ effects: this.#lenguaje.reconfigure(extension) });
    });

    effect(() => {
      const editable = !this.disabled();
      this.#view?.dispatch({
        effects: this.#edicion.reconfigure(CodeEditor.edicion(editable)),
      });
    });

    effect(() => {
      const texto = this.value();
      if (this.externalState() || !this.#view) {
        return;
      }
      if (texto !== this.#view.state.doc.toString()) {
        this.#view.dispatch({
          changes: { from: 0, to: this.#view.state.doc.length, insert: texto },
        });
      }
    });
  }

  createState(contenido: string, dialecto?: SqlDialect): EditorState {
    return EditorState.create({
      doc: contenido,
      extensions: this.extensiones(dialecto ?? this.dialect()),
    });
  }

  get mounted(): boolean {
    return this.#view !== undefined;
  }

  getState(): EditorState {
    return this.vista().state;
  }

  setState(state: EditorState): void {
    this.vista().setState(state);
  }

  getText(): string {
    return this.vista().state.doc.toString();
  }

  replaceAll(texto: string, cursorAtEnd = false): void {
    const vista = this.vista();
    const cursor = cursorAtEnd
      ? texto.length
      : Math.min(vista.state.selection.main.head, texto.length);
    vista.dispatch({
      changes: { from: 0, to: vista.state.doc.length, insert: texto },
      selection: { anchor: cursor },
    });
  }

  focusView(): void {
    this.vista().focus();
  }

  cursorPosition(): CursorPosition {
    return CodeEditor.posicion(this.vista().state);
  }

  private vista(): EditorView {
    if (!this.#view) {
      throw new Error("CodeEditor: la vista todavía no está montada");
    }
    return this.#view;
  }

  private static posicion(state: EditorState): CursorPosition {
    const head = state.selection.main.head;
    const linea = state.doc.lineAt(head);
    return { line: linea.number, column: head - linea.from + 1 };
  }

  private static edicion(editable: boolean): Extension {
    return [EditorView.editable.of(editable), EditorState.readOnly.of(!editable)];
  }

  private extensiones(dialecto: SqlDialect): Extension {
    return [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      rectangularSelection(),
      crosshairCursor(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      foldGutter(),
      autocompletion(),
      highlightSelectionMatches(),
      editorTheme,
      editorHighlight,
      this.#lenguaje.of(languageExtension(this.language(), dialecto)),
      this.#edicion.of(CodeEditor.edicion(!this.disabled())),
      keymap.of([{ key: "Tab", run: acceptCompletion }]),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        indentWithTab,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.edited.emit();
          if (!this.externalState()) {
            this.value.set(update.state.doc.toString());
          }
        }
        if (update.selectionSet || update.docChanged) {
          this.cursor.emit(CodeEditor.posicion(update.state));
        }
        if (update.focusChanged && !update.view.hasFocus) {
          this.touch.emit();
        }
      }),
    ];
  }
}
