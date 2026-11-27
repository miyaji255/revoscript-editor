import type { StatementNode } from './ast.ts';
import { parse } from './parser.ts';

function getLastLine(stmt: StatementNode): number {
  if (stmt.kind === 'BlockStatement' && stmt.body.length > 0) {
    return getLastLine(stmt.body[stmt.body.length - 1]!);
  }
  return stmt.nameSpan.line;
}

interface FoundStatement {
  readonly stmt: StatementNode;
  readonly siblings: readonly StatementNode[];
  readonly index: number;
}

function findStatementWithSiblings(
  statements: readonly StatementNode[],
  lineNumber: number,
): FoundStatement | null {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]!;
    if (stmt.nameSpan.line === lineNumber) {
      return { stmt, siblings: statements, index: i };
    }
    if (stmt.kind === 'BlockStatement') {
      const nested = findStatementWithSiblings(stmt.body, lineNumber);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

function splitLinesPreservingEol(source: string): { lines: string[]; eol: string; hadTrailingEol: boolean } {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const hadTrailingEol = source.endsWith('\n');
  const lines = source.split(/\r?\n/);
  if (hadTrailingEol && lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return { lines, eol, hadTrailingEol };
}

function joinLines(lines: string[], eol: string, hadTrailingEol: boolean): string {
  if (lines.length === 0) {
    return '';
  }
  return lines.join(eol) + (hadTrailingEol ? eol : '');
}

export function deleteBlockAtLine(source: string, lineNumber: number): string {
  const { ast } = parse(source);
  const found = findStatementWithSiblings(ast.body, lineNumber);
  if (!found) {
    return source;
  }

  const startIdx = found.stmt.nameSpan.line - 1;
  const endIdx = getLastLine(found.stmt) - 1;
  const { lines, eol, hadTrailingEol } = splitLinesPreservingEol(source);

  lines.splice(startIdx, endIdx - startIdx + 1);
  return joinLines(lines, eol, hadTrailingEol);
}

export function duplicateBlockAtLine(source: string, lineNumber: number): string {
  const { ast } = parse(source);
  const found = findStatementWithSiblings(ast.body, lineNumber);
  if (!found) {
    return source;
  }

  const startIdx = found.stmt.nameSpan.line - 1;
  const endIdx = getLastLine(found.stmt) - 1;
  const { lines, eol, hadTrailingEol } = splitLinesPreservingEol(source);
  const slice = lines.slice(startIdx, endIdx + 1);

  lines.splice(endIdx + 1, 0, ...slice);
  return joinLines(lines, eol, hadTrailingEol);
}

export function moveBlockAtLine(
  source: string,
  lineNumber: number,
  direction: 'up' | 'down',
): string {
  const { ast } = parse(source);
  const found = findStatementWithSiblings(ast.body, lineNumber);
  if (!found) {
    return source;
  }

  const targetIndex = direction === 'up' ? found.index - 1 : found.index + 1;
  const sibling = found.siblings[targetIndex];
  if (!sibling) {
    return source;
  }

  const firstStmt = direction === 'up' ? sibling : found.stmt;
  const secondStmt = direction === 'up' ? found.stmt : sibling;

  const firstStart = firstStmt.nameSpan.line - 1;
  const firstEnd = getLastLine(firstStmt) - 1;
  const secondStart = secondStmt.nameSpan.line - 1;
  const secondEnd = getLastLine(secondStmt) - 1;

  const { lines, eol, hadTrailingEol } = splitLinesPreservingEol(source);
  const firstSlice = lines.slice(firstStart, firstEnd + 1);
  const gapSlice = lines.slice(firstEnd + 1, secondStart);
  const secondSlice = lines.slice(secondStart, secondEnd + 1);

  const replacement = [...secondSlice, ...gapSlice, ...firstSlice];
  lines.splice(firstStart, secondEnd - firstStart + 1, ...replacement);

  return joinLines(lines, eol, hadTrailingEol);
}
