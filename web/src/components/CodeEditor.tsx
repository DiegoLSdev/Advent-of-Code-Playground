import { syntaxTree } from '@codemirror/language';
import { Prec, type EditorState } from '@codemirror/state';
import { Decoration, hoverTooltip, keymap, MatchDecorator, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view';
import { createTheme } from '@uiw/codemirror-themes';
import CodeMirror from '@uiw/react-codemirror';
import { tags as t } from '@lezer/highlight';
import { useMemo, useRef } from 'react';
import type { DataSource } from '../../../shared/languages.ts';
import { editorLanguages } from '../editorLanguages.ts';

const aocTheme = createTheme({
  theme: 'dark',
  settings: {
    background: '#10101a',
    foreground: '#cccccc',
    caret: '#ffff66',
    // Selection must stay readable on top of everything, including the active
    // line, so the line highlight is translucent and the selection is strong.
    selection: '#264f9e',
    selectionMatch: 'rgba(38, 79, 158, 0.35)',
    lineHighlight: 'rgba(255, 255, 255, 0.035)',
    gutterBackground: '#10101a',
    gutterForeground: '#555570',
    gutterBorder: '#333340',
    fontFamily: "'Source Code Pro', monospace",
  },
  styles: [
    { tag: t.comment, color: '#666688', fontStyle: 'italic' },
    { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword, t.operatorKeyword], color: '#00cc00' },
    { tag: [t.string, t.special(t.string), t.regexp], color: '#ffff66' },
    { tag: [t.number, t.bool, t.null, t.atom], color: '#9999cc' },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#ffffff' },
    { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: '#99ff99' },
    { tag: [t.typeName, t.className], color: '#99ccff' },
    { tag: t.self, color: '#00cc00' },
  ],
});

/** True when `pos` is inside a string or a comment, where input/example are just text. */
function inText(state: EditorState, pos: number): boolean {
  for (let node: { name: string; parent: unknown } | null = syntaxTree(state).resolveInner(pos, 1); node; node = node.parent as typeof node) {
    if (/String|Comment/.test(node.name)) return true;
  }
  return false;
}

/** Subtly highlights every `input` / `example` variable so data usage is visible at a glance. */
const dataMatcher = new MatchDecorator({
  regexp: /\b(input|example)\b/g,
  decoration: (m, view, pos) => (inText(view.state, pos) ? null : Decoration.mark({ class: `cm-data cm-data-${m[1]}` })),
});
const dataHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = dataMatcher.createDeco(view);
    }
    update(update: ViewUpdate) {
      this.decorations = dataMatcher.updateDeco(update, this.decorations);
    }
  },
  { decorations: (v) => v.decorations },
);

interface Props {
  fontSize: number;
  language: string;
  value: string;
  onChange: (value: string) => void;
  /** Ctrl/Cmd + Enter */
  onRun: () => void;
  /** Tooltip text for each data source. */
  dataHints: Record<DataSource, string>;
  /** Called while the pointer is over `input` / `example` (null when it leaves). */
  onHoverData: (source: DataSource | null) => void;
}

export function CodeEditor({ fontSize, language, value, onChange, onRun, dataHints, onHoverData }: Props) {
  const callbacks = useRef({ onRun, dataHints, onHoverData });
  callbacks.current = { onRun, dataHints, onHoverData };

  const extensions = useMemo(
    () => [
      editorLanguages[language]?.() ?? [],
      Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => (callbacks.current.onRun(), true) }])),
      dataHighlight,
      hoverTooltip(
        (view, pos) => {
          const word = view.state.wordAt(pos);
          if (!word) return null;
          const text = view.state.sliceDoc(word.from, word.to);
          if ((text !== 'input' && text !== 'example') || inText(view.state, word.from)) return null;
          return {
            pos: word.from,
            end: word.to,
            above: true,
            create: () => {
              const dom = document.createElement('div');
              dom.className = `cm-data-tooltip cm-data-tooltip-${text}`;
              dom.textContent = callbacks.current.dataHints[text];
              callbacks.current.onHoverData(text);
              return { dom, destroy: () => callbacks.current.onHoverData(null) };
            },
          };
        },
        { hoverTime: 150 },
      ),
    ],
    [language],
  );

  return (
    <div className="editor" style={{ fontSize: `${fontSize}px` }}>
      <CodeMirror value={value} onChange={onChange} theme={aocTheme} extensions={extensions} height="100%" basicSetup={{ tabSize: 4 }} />
    </div>
  );
}
