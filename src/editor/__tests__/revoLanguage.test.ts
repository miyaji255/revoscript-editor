import {
  acceptCompletion,
  CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { EditorSelection, EditorState } from '@codemirror/state';
import { highlightTree } from '@lezer/highlight';
import { describe, expect, it, vi } from 'vitest';
import {
  revoCompletionKeyBindings,
  revoCompletionSource,
} from '../revoCompletion.ts';
import {
  localeFacet,
  revoLanguageSupport,
  revoStreamLanguage,
  smartTabCommand,
} from '../revoLanguage.ts';
import { darkHighlightStyle } from '../theme.ts';

describe('revoStreamLanguage & editor intelligence', () => {
  it('assigns highlight classes to commands, keywords, variables, numbers, booleans, atoms, operators, and parens without warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const sample = [
      'Prestige()',
      '\tPromote(-1)',
      '\tWaitForSeconds(.5)',
      'if (IP >= 1.00e80)',
      '\tDTU(CENTER, 0, 4)',
      '\tBreakInfinity(true)',
      'TypoCommand()',
      'Restart()',
    ].join('\n');

    const tree = revoStreamLanguage.parser.parse(sample);
    const highlighted: Array<{ text: string; classes: string }> = [];

    highlightTree(tree, darkHighlightStyle, (from, to, classes) => {
      highlighted.push({ text: sample.slice(from, to), classes });
    });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();

    const byText = new Map(highlighted.map((entry) => [entry.text, entry.classes]));
    expect(byText.get('Prestige')).toBeTruthy();
    expect(byText.get('Promote')).toBeTruthy();
    expect(byText.get('WaitForSeconds')).toBeTruthy();
    expect(byText.get('Restart')).toBeTruthy();
    expect(byText.get('DTU')).toBeTruthy();
    expect(byText.get('BreakInfinity')).toBeTruthy();
    expect(byText.get('if')).toBeTruthy();
    expect(byText.get('IP')).toBeTruthy();
    expect(byText.get('1.00e80')).toBeTruthy();
    expect(byText.get('.5')).toBeTruthy();
    expect(byText.get('-1')).toBeTruthy();
    expect(byText.get('CENTER')).toBeTruthy();
    expect(byText.get('true')).toBeTruthy();
    expect(byText.get('>=')).toBeTruthy();
    expect(byText.get('(')).toBeTruthy();

    // Unknown commands should not be highlighted as variables
    expect(byText.get('TypoCommand')).toBeUndefined();

    // Commands receive a distinct highlight class from variables and keywords
    expect(byText.get('Prestige')).not.toBe(byText.get('IP'));
    expect(byText.get('Prestige')).not.toBe(byText.get('if'));
  });

  it('completes variables inside nested parentheses and commands with snippets via LanguageSupport', () => {
    const doc1 = 'if ((IP >= 10 && ';
    const state1 = EditorState.create({
      doc: doc1,
      extensions: [revoLanguageSupport(), localeFacet.of('en')],
    });
    const res1 = revoCompletionSource(
      new CompletionContext(state1, doc1.length, true),
    ) as CompletionResult | null;
    expect(res1).not.toBeNull();
    expect(res1?.options.some((o) => o.label === 'Score')).toBe(true);

    const doc2 = 'if ((IP >= 10) && ';
    const state2 = EditorState.create({
      doc: doc2,
      extensions: [revoLanguageSupport(), localeFacet.of('en')],
    });
    const res2 = revoCompletionSource(
      new CompletionContext(state2, doc2.length, true),
    ) as CompletionResult | null;
    expect(res2).not.toBeNull();
    expect(res2?.options.some((o) => o.label === 'EP')).toBe(true);

    const doc3 = 'Ent';
    const state3 = EditorState.create({
      doc: doc3,
      extensions: [revoLanguageSupport(), localeFacet.of('ja')],
    });
    const res3 = revoCompletionSource(
      new CompletionContext(state3, doc3.length, false),
    ) as CompletionResult | null;
    const enterIc = res3?.options.find((o) => o.label === 'EnterIC');
    expect(enterIc).toBeDefined();
    expect(enterIc?.detail).toBe('(index, wait)');

    const doc4 = 'EnterIC(1, ';
    const state4 = EditorState.create({
      doc: doc4,
      extensions: [revoLanguageSupport(), localeFacet.of('ja')],
    });
    const res4 = revoCompletionSource(
      new CompletionContext(state4, doc4.length, true),
    ) as CompletionResult | null;
    const trueOpt = res4?.options.find((o) => o.label === 'true');
    expect(trueOpt?.detail).toBe('boolean');
    expect(typeof trueOpt?.info).toBe('string');
    expect((trueOpt?.info as string).length).toBeGreaterThan(0);
  });

  it('uses Tab instead of Enter for accepting completions', () => {
    expect(revoCompletionKeyBindings.some((b) => b.key === 'Enter')).toBe(false);
    const tabBinding = revoCompletionKeyBindings.find((b) => b.key === 'Tab');
    expect(tabBinding?.run).toBe(acceptCompletion);
    expect(revoCompletionKeyBindings.some((b) => b.key === 'Escape')).toBe(true);
    expect(revoCompletionKeyBindings.some((b) => b.key === 'ArrowDown')).toBe(true);
  });

  it('indents line start on Tab only at leading whitespace or non-empty selection, and inserts tab inline otherwise', () => {
    const runSmartTab = (doc: string, anchor: number, head = anchor): string => {
      let state = EditorState.create({
        doc,
        selection: EditorSelection.single(anchor, head),
        extensions: [revoLanguageSupport()],
      });
      smartTabCommand({
        state,
        dispatch(tr) {
          state = tr.state;
        },
      });
      return state.doc.toString();
    };

    // Leading whitespace -> indents line
    expect(runSmartTab('  Prestige()', 2)).toBe('\t  Prestige()');
    // Line start -> indents line
    expect(runSmartTab('Prestige()', 0)).toBe('\tPrestige()');
    // Non-empty selection in middle of line -> indents line
    expect(runSmartTab('Prestige()', 2, 5)).toBe('\tPrestige()');
    // Caret after code -> inserts tab at caret instead of indenting line start
    expect(runSmartTab('Prestige()', 'Prestige()'.length)).toBe('Prestige()\t');
  });
});
