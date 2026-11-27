import { describe, expect, it } from 'vitest';
import { lex } from '../lexer.ts';

describe('lex', () => {
  it('tokenizes commands, parentheses, numbers, booleans, and scientific notation', () => {
    const lines = lex('WaitUntil (Score >= 1.00e80 && IP < 1.e50)\n\tEnterIC(1, true)');
    expect(lines).toHaveLength(2);

    const line1 = lines[0]!;
    expect(line1.indentStyle).toBe('none');
    expect(line1.indentLevel).toBe(0);
    expect(line1.tokens.map((t) => [t.kind, t.value])).toEqual([
      ['ident', 'WaitUntil'],
      ['lparen', '('],
      ['ident', 'Score'],
      ['cmpOp', '>='],
      ['number', '1.00e80'],
      ['logicOp', '&&'],
      ['ident', 'IP'],
      ['cmpOp', '<'],
      ['number', '1.e50'],
      ['rparen', ')'],
    ]);

    const line2 = lines[1]!;
    expect(line2.indentStyle).toBe('tab');
    expect(line2.indentLevel).toBe(1);
    expect(line2.tokens.map((t) => [t.kind, t.value])).toEqual([
      ['ident', 'EnterIC'],
      ['lparen', '('],
      ['number', '1'],
      ['comma', ','],
      ['boolean', 'true'],
      ['rparen', ')'],
    ]);
  });

  it('supports unary negative numbers and leading-dot decimals', () => {
    const lines = lex('if (Score > -1.5e3 && IP > .5)\n\tPromote(-1)');
    const numbers = lines[0]!.tokens.filter((t) => t.kind === 'number').map((t) => t.value);
    expect(numbers).toEqual(['-1.5e3', '.5']);
    expect(lines[1]!.tokens.find((t) => t.kind === 'number')?.value).toBe('-1');
  });

  it('detects 2-space indentation nesting levels without flattening', () => {
    const lines = lex('if (IP > 0)\n  Repeat (2, false)\n    Prestige()\n      Promote(0)');
    expect(lines.map((l) => l.indentLevel)).toEqual([0, 1, 2, 3]);
    expect(lines.slice(1).every((l) => l.indentStyle === 'space')).toBe(true);
  });

  it('classifies space and mixed indentation and handles CRLF line endings', () => {
    const lines = lex('if (IP > 0)\r\n    Prestige()\r\n\t  Stop()');
    expect(lines[0]!.indentStyle).toBe('none');
    expect(lines[1]!.indentStyle).toBe('space');
    expect(lines[1]!.indentLevel).toBe(1);
    expect(lines[2]!.indentStyle).toBe('mixed');
    expect(lines[2]!.indentLevel).toBe(2);
    expect(lines.every((l) => !l.tokens.some((t) => t.kind === 'unknown'))).toBe(true);
  });

  it('records accurate 1-based line/col and 0-based absolute offsets', () => {
    const source = 'Prestige()\n\tWaitForSeconds(2.5)';
    const lines = lex(source);
    const waitTok = lines[1]!.tokens[0]!;
    expect(waitTok.line).toBe(2);
    expect(waitTok.col).toBe(2);
    expect(source.slice(waitTok.from, waitTok.to)).toBe('WaitForSeconds');
  });
});
