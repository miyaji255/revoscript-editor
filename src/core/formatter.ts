import type { ArgNode, ConditionExpr, OperandNode, StatementNode } from './ast.ts';
import { parse } from './parser.ts';
import { COMMAND_MAP } from './spec.ts';

function formatOperand(op: OperandNode): string {
  switch (op.kind) {
    case 'VariableRef':
      return op.name;
    case 'NumberLiteral':
    case 'BooleanLiteral':
    case 'InvalidExpr':
      return op.raw;
  }
}

function formatCondition(expr: ConditionExpr): string {
  switch (expr.kind) {
    case 'ComparisonExpr':
      return `${formatOperand(expr.left)} ${expr.operator} ${formatOperand(expr.right)}`;
    case 'LogicalExpr':
      return `${formatCondition(expr.left)} ${expr.operator} ${formatCondition(expr.right)}`;
    case 'GroupExpr':
      return `(${formatCondition(expr.inner)})`;
    case 'InvalidExpr':
      return expr.raw;
  }
}

function formatArg(arg: ArgNode): string {
  switch (arg.kind) {
    case 'NumberLiteral':
    case 'BooleanLiteral':
      return arg.raw;
    case 'IdentifierLiteral':
      return arg.name;
    case 'InvalidExpr':
      return arg.raw;
  }
}

function formatStatementHeader(stmt: StatementNode): string {
  const spec = COMMAND_MAP.get(stmt.name);
  if (spec && !spec.takesParens) {
    return stmt.name;
  }

  if (stmt.condition) {
    const spaceBeforeParen =
      stmt.name === 'if' ||
      stmt.name === 'else if' ||
      stmt.name === 'RepeatUntil' ||
      stmt.name === 'WaitUntil'
        ? ' '
        : '';
    return `${stmt.name}${spaceBeforeParen}(${formatCondition(stmt.condition)})`;
  }

  const spaceBeforeParen = stmt.name === 'Repeat' ? ' ' : '';
  const argsText = stmt.args.map(formatArg).join(', ');
  return `${stmt.name}${spaceBeforeParen}(${argsText})`;
}

function collectLineHeaders(
  statements: readonly StatementNode[],
  depth: number,
  out: Map<number, { depth: number; stmt: StatementNode }>,
): void {
  for (const stmt of statements) {
    out.set(stmt.nameSpan.line, { depth, stmt });
    if (stmt.kind === 'BlockStatement') {
      collectLineHeaders(stmt.body, depth + 1, out);
    }
  }
}

export function formatRevoScript(source: string): string {
  const { ast, lines } = parse(source);
  const lineMap = new Map<number, { depth: number; stmt: StatementNode }>();
  collectLineHeaders(ast.body, 0, lineMap);

  const output: string[] = [];
  let consecutiveBlank = 0;

  for (const line of lines) {
    if (line.tokens.length === 0) {
      if (output.length > 0 && consecutiveBlank === 0) {
        output.push('');
      }
      consecutiveBlank++;
      continue;
    }
    consecutiveBlank = 0;

    const entry = lineMap.get(line.lineNumber);
    if (!entry) {
      output.push(line.rawText.trim());
      continue;
    }

    const indent = '\t'.repeat(entry.depth);
    if (!entry.stmt.hasValidSyntax) {
      output.push(`${indent}${line.rawText.trim()}`);
      continue;
    }

    output.push(`${indent}${formatStatementHeader(entry.stmt)}`);
  }

  while (output.length > 0 && output[output.length - 1] === '') {
    output.pop();
  }

  return output.length > 0 ? output.join('\n') + '\n' : '';
}
