import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
} from '@codemirror/language';
import { lintGutter, setDiagnostics } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, Prec, type StateEffect } from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
} from '@codemirror/view';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Diagnostic } from '../core/analyzer.ts';
import type { Locale } from '../core/spec.ts';
import { revoCompletionKeymap } from './revoCompletion.ts';
import { revoHoverTooltip } from './revoHover.ts';
import { localeFacet, revoLanguageSupport, revoTabKeyBinding } from './revoLanguage.ts';
import { toCodeMirrorDiagnostics } from './revoLinter.ts';
import { setActiveSimLine, simHighlightField } from './simHighlight.ts';
import { createEditorTheme, type ThemeMode } from './theme.ts';

export interface CursorPosition {
  readonly line: number;
  readonly col: number;
}

export interface CodeEditorHandle {
  focus(): void;
  insertText(text: string): void;
  jumpTo(pos: number): void;
  jumpToLine(lineNumber: number): void;
  applyEdit(from: number, to: number, insert: string): void;
}

interface CodeEditorProps {
  readonly tabId: string;
  readonly openTabIds: readonly string[];
  readonly value: string;
  readonly locale: Locale;
  readonly theme: ThemeMode;
  readonly placeholderText: string;
  readonly diagnostics: readonly Diagnostic[];
  readonly activeSimLine?: number | null;
  readonly onChange: (nextValue: string) => void;
  readonly onCursorChange: (pos: CursorPosition) => void;
  readonly onFormatRequest: () => void;
  readonly onOpenPalette?: () => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  {
    tabId,
    openTabIds,
    value,
    locale,
    theme,
    placeholderText,
    diagnostics,
    activeSimLine = null,
    onChange,
    onCursorChange,
    onFormatRequest,
    onOpenPalette,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const tabStatesRef = useRef<Map<string, EditorState>>(new Map());
  const currentTabIdRef = useRef<string>(tabId);

  const localeCompartmentRef = useRef(new Compartment());
  const themeCompartmentRef = useRef(new Compartment());
  const placeholderCompartmentRef = useRef(new Compartment());

  const callbacksRef = useRef({
    onChange,
    onCursorChange,
    onFormatRequest,
    onOpenPalette,
  });
  callbacksRef.current = {
    onChange,
    onCursorChange,
    onFormatRequest,
    onOpenPalette,
  };

  const createTabState = (docText: string): EditorState => {
    const appKeymap = Prec.high(
      keymap.of([
        {
          key: 'Shift-Alt-f',
          run: () => {
            callbacksRef.current.onFormatRequest();
            return true;
          },
        },
        {
          key: 'Mod-Shift-f',
          run: () => {
            callbacksRef.current.onFormatRequest();
            return true;
          },
        },
        {
          key: 'Mod-k',
          run: () => {
            callbacksRef.current.onOpenPalette?.();
            return true;
          },
        },
      ]),
    );

    const standardKeymap = keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      revoTabKeyBinding,
    ]);

    return EditorState.create({
      doc: docText,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion({ defaultKeymap: false }),
        revoCompletionKeymap,
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        EditorState.tabSize.of(4),
        revoLanguageSupport(),
        revoHoverTooltip,
        simHighlightField,
        lintGutter(),
        appKeymap,
        standardKeymap,
        localeCompartmentRef.current.of(localeFacet.of(locale)),
        themeCompartmentRef.current.of(createEditorTheme(theme)),
        placeholderCompartmentRef.current.of(placeholder(placeholderText)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            callbacksRef.current.onChange(update.state.doc.toString());
          }
          if (update.docChanged || update.selectionSet) {
            const head = update.state.selection.main.head;
            const line = update.state.doc.lineAt(head);
            callbacksRef.current.onCursorChange({
              line: line.number,
              col: head - line.from + 1,
            });
          }
        }),
      ],
    });
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const initialState = createTabState(value);
    tabStatesRef.current.set(tabId, initialState);
    currentTabIdRef.current = tabId;

    const view = new EditorView({ state: initialState, parent: host });
    viewRef.current = view;

    const head = initialState.selection.main.head;
    const line = initialState.doc.lineAt(head);
    callbacksRef.current.onCursorChange({
      line: line.number,
      col: head - line.from + 1,
    });

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // EditorView is created once on mount and manages per-tab EditorStates via view.setState().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch EditorState cleanly per tab (preserving per-tab undo history, cursor, folds, scroll).
  useEffect(() => {
    const view = viewRef.current;
    if (!view || currentTabIdRef.current === tabId) {
      return;
    }

    tabStatesRef.current.set(currentTabIdRef.current, view.state);
    currentTabIdRef.current = tabId;

    const nextState = tabStatesRef.current.get(tabId) ?? createTabState(value);
    view.setState(nextState);

    view.dispatch({
      effects: [
        localeCompartmentRef.current.reconfigure(localeFacet.of(locale)),
        themeCompartmentRef.current.reconfigure(createEditorTheme(theme)),
        placeholderCompartmentRef.current.reconfigure(placeholder(placeholderText)),
      ],
    });

    const docText = view.state.doc.toString();
    if (docText !== value) {
      const anchor = Math.min(view.state.selection.main.anchor, value.length);
      view.dispatch({
        changes: { from: 0, to: docText.length, insert: value },
        selection: { anchor },
      });
    }

    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    callbacksRef.current.onCursorChange({
      line: line.number,
      col: head - line.from + 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  // Prune EditorStates of closed tabs.
  useEffect(() => {
    const openSet = new Set(openTabIds);
    for (const cachedId of tabStatesRef.current.keys()) {
      if (!openSet.has(cachedId)) {
        tabStatesRef.current.delete(cachedId);
      }
    }
  }, [openTabIds]);

  // Apply external document updates (Format, Block Ops, Template replace) on active tab.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || currentTabIdRef.current !== tabId) {
      return;
    }
    const current = view.state.doc.toString();
    if (current !== value) {
      const anchor = Math.min(view.state.selection.main.anchor, value.length);
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        selection: { anchor },
      });
    }
  }, [value, tabId]);

  // Push single-pass diagnostics into CodeMirror's lint state.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const cmDiags = toCodeMirrorDiagnostics(diagnostics, view.state.doc.length);
    view.dispatch(setDiagnostics(view.state, cmDiags));
  }, [diagnostics, tabId]);

  // Highlight active simulator line and scroll it into view in a single transaction.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const effects: StateEffect<unknown>[] = [setActiveSimLine.of(activeSimLine ?? null)];
    if (activeSimLine !== null && activeSimLine >= 1 && activeSimLine <= view.state.doc.lines) {
      const line = view.state.doc.line(activeSimLine);
      effects.push(EditorView.scrollIntoView(line.from, { y: 'nearest' }));
    }
    view.dispatch({ effects });
  }, [activeSimLine, tabId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    view.dispatch({
      effects: [
        localeCompartmentRef.current.reconfigure(localeFacet.of(locale)),
        placeholderCompartmentRef.current.reconfigure(placeholder(placeholderText)),
      ],
    });
  }, [locale, placeholderText]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(createEditorTheme(theme)),
    });
  }, [theme]);

  useImperativeHandle(ref, () => ({
    focus() {
      viewRef.current?.focus();
    },
    insertText(text: string) {
      const view = viewRef.current;
      if (!view) {
        return;
      }
      const sel = view.state.selection.main;
      const line = view.state.doc.lineAt(sel.from);
      const indentMatch = /^[\t ]*/.exec(line.text);
      const lineIndent = indentMatch ? indentMatch[0] : '';
      const insert = text.includes('\n') ? text.replace(/\n/g, `\n${lineIndent}`) : text;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert },
        selection: { anchor: sel.from + insert.length },
      });
      view.focus();
    },
    jumpTo(pos: number) {
      const view = viewRef.current;
      if (!view) {
        return;
      }
      const clamped = Math.max(0, Math.min(pos, view.state.doc.length));
      view.dispatch({
        selection: { anchor: clamped },
        scrollIntoView: true,
      });
      view.focus();
    },
    jumpToLine(lineNumber: number) {
      const view = viewRef.current;
      if (!view || view.state.doc.lines === 0) {
        return;
      }
      const clampedLine = Math.max(1, Math.min(lineNumber, view.state.doc.lines));
      const line = view.state.doc.line(clampedLine);
      view.dispatch({
        selection: { anchor: line.from },
        scrollIntoView: true,
      });
      view.focus();
    },
    applyEdit(from: number, to: number, insert: string) {
      const view = viewRef.current;
      if (!view) {
        return;
      }
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + insert.length },
      });
      view.focus();
    },
  }));

  return <div ref={hostRef} className="editor-host" />;
});
