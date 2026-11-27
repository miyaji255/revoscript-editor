import type { ProgramNode, StatementNode } from './ast.ts';
import type { LexedLine } from './lexer.ts';
import { COMMAND_MAP } from './spec.ts';

export interface ScriptMetrics {
  readonly lineCount: number;
  readonly nonEmptyLineCount: number;
  readonly statementCount: number;
  readonly blockSlotCount: number;
  readonly maxNestingDepth: number;
}

function walkStatements(
  statements: readonly StatementNode[],
  depth: number,
  acc: { statements: number; slots: number; maxDepth: number },
): void {
  for (const stmt of statements) {
    acc.statements++;
    if (depth > acc.maxDepth) {
      acc.maxDepth = depth;
    }

    const spec = COMMAND_MAP.get(stmt.name);
    if (!spec || spec.consumesBlockSlot) {
      acc.slots++;
    }

    if (stmt.kind === 'BlockStatement') {
      walkStatements(stmt.body, depth + 1, acc);
    }
  }
}

export function computeMetrics(
  ast: ProgramNode,
  lines: readonly LexedLine[],
): ScriptMetrics {
  const acc = { statements: 0, slots: 0, maxDepth: 0 };
  walkStatements(ast.body, 0, acc);

  let nonEmptyLineCount = 0;
  for (const line of lines) {
    if (line.tokens.length > 0) {
      nonEmptyLineCount++;
    }
  }

  return {
    lineCount: lines.length,
    nonEmptyLineCount,
    statementCount: acc.statements,
    blockSlotCount: acc.slots,
    maxNestingDepth: acc.maxDepth,
  };
}
