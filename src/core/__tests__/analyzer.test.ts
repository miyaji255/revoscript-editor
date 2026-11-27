import { describe, expect, it } from 'vitest';
import { analyze } from '../analyzer.ts';
import { MACRO_TEMPLATES } from '../templates.ts';

describe('analyze', () => {
  it('validates all built-in templates with zero errors', () => {
    for (const tpl of MACRO_TEMPLATES) {
      const result = analyze(tpl.code, 'en');
      const errors = result.diagnostics.filter((d) => d.severity === 'error');
      expect(errors, `Template ${tpl.id} produced errors`).toEqual([]);
    }
  });

  it('detects unknown commands and provides closest typo quickFix', () => {
    const result = analyze('WaittForSeconds(1.0)', 'en');
    const err = result.diagnostics.find((d) => d.code === 'UNKNOWN_COMMAND');
    expect(err).toBeDefined();
    expect(err?.severity).toBe('error');
    expect(err?.quickFix?.insert).toBe('WaitForSeconds');
  });

  it('checks argument arity and types including DTU branches and elements', () => {
    const arityErr = analyze('EnterIC(1)', 'en');
    expect(arityErr.diagnostics.some((d) => d.code === 'WRONG_ARITY')).toBe(true);

    const boolErr = analyze('BreakInfinity(1)', 'en');
    expect(boolErr.diagnostics.some((d) => d.code === 'INVALID_ARG_TYPE')).toBe(true);

    const intErr = analyze('EnterIC(1.5, true)', 'en');
    expect(intErr.diagnostics.some((d) => d.code === 'INVALID_ARG_TYPE')).toBe(true);

    const branchErr = analyze('DTU(center, 0, 4)', 'en');
    const branchDiag = branchErr.diagnostics.find((d) => d.code === 'INVALID_ARG_TYPE');
    expect(branchDiag).toBeDefined();
    expect(branchDiag?.quickFix?.insert).toBe('CENTER');

    const elemErr = analyze('GenerateElement(fire)', 'en');
    const elemDiag = elemErr.diagnostics.find((d) => d.code === 'INVALID_ARG_TYPE');
    expect(elemDiag).toBeDefined();
    expect(elemDiag?.quickFix?.insert).toBe('Fire');
  });

  it('flags out-of-range numeric arguments as warnings', () => {
    const result = analyze('Promote(9)', 'en');
    expect(result.diagnostics.some((d) => d.code === 'ARG_OUT_OF_RANGE' && d.severity === 'warning')).toBe(true);
  });

  it('detects orphan else / else if and unknown variables with suggestions', () => {
    const orphan = analyze('else if (Ipp >= 10)\n\tPrestige()', 'en');
    expect(orphan.diagnostics.some((d) => d.code === 'ORPHAN_ELSE')).toBe(true);
    expect(orphan.diagnostics.some((d) => d.code === 'UNKNOWN_VARIABLE')).toBe(true);
  });

  it('warns on mixed logical operators, space indent, empty blocks, and unreachable code', () => {
    const source = [
      'if (EP > 1 && IP > 2 || AP > 3)',
      '    Restart()',
      '    Prestige()',
      'if (Score > 10)',
    ].join('\n');

    const result = analyze(source, 'ja');
    const codes = new Set(result.diagnostics.map((d) => d.code));
    expect(codes.has('MIXED_LOGIC_OPS')).toBe(true);
    expect(codes.has('SPACE_INDENT')).toBe(true);
    expect(codes.has('UNREACHABLE_CODE')).toBe(true);
    expect(codes.has('EMPTY_BLOCK')).toBe(true);

    const spaceDiag = result.diagnostics.find((d) => d.code === 'SPACE_INDENT');
    expect(spaceDiag?.quickFix?.insert).toBe('\t');
  });

  it('does not warn on MIXED_LOGIC_OPS when parentheses disambiguate groups, and flags Infinity numbers', () => {
    const parenthesized = analyze('if ((EP > 1 && IP > 2) || AP > 3)\n\tPrestige()', 'en');
    expect(parenthesized.diagnostics.some((d) => d.code === 'MIXED_LOGIC_OPS')).toBe(false);

    const innerMixed = analyze('if ((EP > 1 && IP > 2 || AP > 3) && Score > 0)\n\tPrestige()', 'en');
    expect(innerMixed.diagnostics.some((d) => d.code === 'MIXED_LOGIC_OPS')).toBe(true);

    const overflow = analyze('WaitForSeconds(1e500)', 'en');
    expect(overflow.diagnostics.some((d) => d.code === 'INVALID_ARG_TYPE')).toBe(true);
  });

  it('emits informational hints for WaitForSeconds(0), RepeatUntil, and Repeat(N, true)', () => {
    const source = [
      'WaitForSeconds(0)',
      'RepeatUntil (IP >= 10)',
      '\tPrestige()',
      'Repeat (5, true)',
      '\tInfinite()',
    ].join('\n');

    const result = analyze(source, 'en');
    const codes = new Set(result.diagnostics.map((d) => d.code));
    expect(codes.has('ZERO_WAIT')).toBe(true);
    expect(codes.has('REPEAT_UNTIL_PRECHECK')).toBe(true);
    expect(codes.has('INFINITE_REPEAT_COUNT')).toBe(true);
  });

  it('computes block slot metrics excluding else and else if', () => {
    const source = [
      'if (EP == 0)',
      '\tEternate()',
      'else if (EP < 10)',
      '\tEternate()',
      'else',
      '\tRestart()',
    ].join('\n');

    const result = analyze(source, 'en');
    expect(result.metrics.statementCount).toBe(6);
    expect(result.metrics.blockSlotCount).toBe(4);
    expect(result.metrics.maxNestingDepth).toBe(1);
  });
});
