import { describe, expect, it } from 'vitest';
import { parse } from '../parser.ts';

describe('parse', () => {
  it('builds nested AST for if / else if / else and RepeatUntil blocks', () => {
    const source = [
      'if (EP == 0.00)',
      '\tEternate()',
      '\tRestart()',
      'else if (Supernova < 37.00)',
      '\tRepeatUntil (Supernova == 41.00)',
      '\t\tEnterEC(4, 0, true)',
      'else',
      '\tWaitForSeconds(1.0)',
    ].join('\n');

    const { ast } = parse(source);
    expect(ast.syntaxErrors).toHaveLength(0);
    expect(ast.body).toHaveLength(3);

    const ifBlock = ast.body[0]!;
    expect(ifBlock.kind).toBe('BlockStatement');
    expect(ifBlock.name).toBe('if');
    if (ifBlock.kind === 'BlockStatement') {
      expect(ifBlock.body).toHaveLength(2);
    }

    const elseIfBlock = ast.body[1]!;
    expect(elseIfBlock.kind).toBe('BlockStatement');
    expect(elseIfBlock.name).toBe('else if');
    if (elseIfBlock.kind === 'BlockStatement') {
      expect(elseIfBlock.body).toHaveLength(1);
      const innerLoop = elseIfBlock.body[0]!;
      expect(innerLoop.kind).toBe('BlockStatement');
      if (innerLoop.kind === 'BlockStatement') {
        expect(innerLoop.body).toHaveLength(1);
        expect(innerLoop.body[0]?.name).toBe('EnterEC');
      }
    }

    const elseBlock = ast.body[2]!;
    expect(elseBlock.kind).toBe('BlockStatement');
    expect(elseBlock.name).toBe('else');
  });

  it('parses compound logical and parenthesized condition expressions', () => {
    const { ast } = parse('WaitUntil ((IP >= 1000 && Score >= 1.00e80) || EP > 5)');
    expect(ast.syntaxErrors).toHaveLength(0);
    const stmt = ast.body[0]!;
    expect(stmt.condition?.kind).toBe('LogicalExpr');
    if (stmt.condition?.kind === 'LogicalExpr') {
      expect(stmt.condition.operator).toBe('||');
      expect(stmt.condition.left.kind).toBe('GroupExpr');
    }
  });

  it('reports syntax errors without aborting parsing of subsequent lines', () => {
    const source = [
      'WaitForSeconds(1.0',
      'Prestige()',
      '\tPromote(0)',
    ].join('\n');

    const { ast } = parse(source);
    expect(ast.syntaxErrors.some((e) => e.code === 'UNBALANCED_PARENS')).toBe(true);
    expect(ast.syntaxErrors.some((e) => e.code === 'UNEXPECTED_INDENT')).toBe(true);
    expect(ast.body.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects unexpected tokens after else', () => {
    const { ast } = parse('else (IP > 1)\n\tPrestige()');
    expect(ast.syntaxErrors.some((e) => e.code === 'UNEXPECTED_TOKEN')).toBe(true);
  });
});
