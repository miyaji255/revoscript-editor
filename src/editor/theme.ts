import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

export type ThemeMode = 'dark' | 'light';

export const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#4cc9e0', fontWeight: '600' },
  { tag: tags.function(tags.variableName), color: '#7ab2ff' },
  { tag: tags.variableName, color: '#b993e6' },
  { tag: tags.atom, color: '#5de2c8', fontWeight: '600' },
  { tag: tags.number, color: '#8fd4ff' },
  { tag: tags.bool, color: '#6ce098', fontWeight: '600' },
  { tag: tags.operator, color: '#8c9bb3' },
  { tag: [tags.paren, tags.separator], color: '#8c9bb3' },
]);

export const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#0b7b94', fontWeight: '600' },
  { tag: tags.function(tags.variableName), color: '#255390' },
  { tag: tags.variableName, color: '#613889' },
  { tag: tags.atom, color: '#0f766e', fontWeight: '600' },
  { tag: tags.number, color: '#1d4ed8' },
  { tag: tags.bool, color: '#15803d', fontWeight: '600' },
  { tag: tags.operator, color: '#526078' },
  { tag: [tags.paren, tags.separator], color: '#6e7f99' },
]);

const darkHighlight = syntaxHighlighting(darkHighlightStyle);
const lightHighlight = syntaxHighlighting(lightHighlightStyle);

export function createEditorTheme(mode: ThemeMode): Extension {
  const baseTheme = EditorView.theme(
    {
      '&': {
        height: '100%',
        backgroundColor: 'var(--bg-editor)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: '13.5px',
      },
      '&.cm-focused': {
        outline: 'none',
      },
      '.cm-scroller': {
        overflow: 'auto',
        lineHeight: '1.7',
        fontFamily: 'var(--font-mono)',
      },
      '.cm-content': {
        padding: '12px 0',
        caretColor: 'var(--accent)',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--bg-editor)',
        color: 'var(--text-muted)',
        borderRight: '1px solid var(--border-subtle)',
        paddingLeft: '4px',
        paddingRight: '4px',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        minWidth: '3.5ch',
        padding: '0 8px 0 6px',
        fontVariantNumeric: 'tabular-nums',
      },
      '.cm-foldGutter .cm-gutterElement': {
        minWidth: '14px',
        textAlign: 'center',
      },
      '.cm-activeLine': {
        backgroundColor: 'var(--bg-active-line)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--bg-active-line)',
        color: 'var(--text-primary)',
      },
      '.cm-sim-active-line': {
        backgroundColor:
          mode === 'dark' ? 'rgba(29, 48, 103, 0.45) !important' : 'var(--accent-soft) !important',
        boxShadow: 'inset 3px 0 0 var(--accent)',
      },
      '.cm-selectionBackground, ::selection': {
        backgroundColor: 'var(--bg-selection) !important',
      },
      '.cm-cursor': {
        borderLeftColor: 'var(--accent)',
        borderLeftWidth: '2px',
      },
      '.cm-tooltip': {
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-md)',
      },
      '.cm-tooltip-autocomplete ul li[aria-selected]': {
        backgroundColor: 'var(--accent-soft)',
        color: 'var(--text-primary)',
      },
      '.cm-completionDetail': {
        fontStyle: 'normal',
        color: 'var(--text-muted)',
        marginLeft: '4px',
      },
      '.cm-completionMatchedText': {
        color: 'var(--accent)',
        textDecoration: 'none',
        fontWeight: '600',
      },
      '.cm-panels': {
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        borderColor: 'var(--border-subtle)',
      },
      '.cm-searchMatch': {
        backgroundColor: 'var(--accent-soft)',
        outline: '1px solid var(--accent)',
      },
    },
    { dark: mode === 'dark' },
  );

  return [baseTheme, mode === 'dark' ? darkHighlight : lightHighlight];
}
