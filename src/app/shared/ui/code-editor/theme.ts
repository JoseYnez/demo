import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--bg-surface)",
    color: "var(--code-variable)",
    fontSize: "var(--font-size-base)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "var(--line-height-normal)",
  },
  ".cm-content": { caretColor: "var(--code-cursor)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--code-cursor)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    { backgroundColor: "var(--code-selection)" },
  ".cm-activeLine": { backgroundColor: "var(--code-active-line)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--code-active-line)" },
  ".cm-gutters": {
    backgroundColor: "var(--bg-surface)",
    color: "var(--code-gutter-fg)",
    borderRight: "1px solid var(--border-default)",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--bg-surface-alt)",
    border: "1px solid var(--border-default)",
    color: "var(--text-muted)",
  },
  ".cm-selectionMatch": { backgroundColor: "var(--overlay-hover)" },
  ".cm-searchMatch": { outline: "1px solid var(--accent-border)" },
  ".cm-searchMatch-selected": { backgroundColor: "var(--accent-subtle)" },
  ".cm-panels": {
    backgroundColor: "var(--bg-surface-alt)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-sans)",
  },
  ".cm-panels-bottom": { borderTop: "1px solid var(--border-default)" },
  ".cm-panels-top": { borderBottom: "1px solid var(--border-default)" },
  ".cm-textfield": {
    backgroundColor: "transparent",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
  },
  ".cm-button": {
    backgroundImage: "none",
    backgroundColor: "transparent",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
  },
  ".cm-button:active": { backgroundColor: "var(--bg-surface-active)" },
  ".cm-panel.cm-search [name=close]": { color: "var(--text-muted)" },
  ".cm-tooltip": {
    backgroundColor: "var(--bg-surface-raised)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-md), var(--edge-raised)",
    color: "var(--text-primary)",
  },
  ".cm-tooltip-autocomplete > ul > li": { fontFamily: "var(--font-mono)" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "var(--accent-subtle)",
    color: "var(--text-primary)",
  },
});

export const editorHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: "var(--code-keyword)", fontWeight: "var(--font-weight-medium)" },
    { tag: [tags.string, tags.special(tags.string)], color: "var(--code-string)" },
    { tag: [tags.number, tags.bool, tags.null], color: "var(--code-number)" },
    { tag: tags.comment, color: "var(--code-comment)", fontStyle: "italic" },
    { tag: [tags.operator, tags.compareOperator, tags.logicOperator], color: "var(--code-operator)" },
    { tag: tags.typeName, color: "var(--code-type)" },
    { tag: [tags.variableName, tags.name], color: "var(--code-variable)" },
    { tag: [tags.punctuation, tags.paren, tags.bracket], color: "var(--text-muted)" },
  ]),
);
