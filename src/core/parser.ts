import type {
  ArgNode,
  BlockStatement,
  CommandStatement,
  ConditionExpr,
  OperandNode,
  ProgramNode,
  Span,
  StatementNode,
  SyntaxErrorNode,
} from './ast.ts';
import { lex, type LexedLine, type Token } from './lexer.ts';
import { COMMAND_MAP } from './spec.ts';

export interface ParseResult {
  readonly ast: ProgramNode;
  readonly lines: readonly LexedLine[];
}

function tokenToSpan(token: Token): Span {
  return {
    from: token.from,
    to: token.to,
    line: token.line,
    col: token.col,
  };
}

function mergeSpan(start: Span, end: Span): Span {
  return {
    from: start.from,
    to: end.to,
    line: start.line,
    col: start.col,
  };
}

class TokenCursor {
  private index = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  peek(offset = 0): Token | undefined {
    return this.tokens[this.index + offset];
  }

  next(): Token | undefined {
    const tok = this.tokens[this.index];
    if (tok) {
      this.index++;
    }
    return tok;
  }

  isAtEnd(): boolean {
    return this.index >= this.tokens.length;
  }
}

function parseOperand(
  cursor: TokenCursor,
  fallbackSpan: Span,
  errors: SyntaxErrorNode[],
): OperandNode {
  const tok = cursor.peek();
  if (!tok) {
    errors.push({ code: 'INVALID_CONDITION', span: fallbackSpan });
    return { kind: 'InvalidExpr', raw: '', span: fallbackSpan };
  }

  if (tok.kind === 'number') {
    cursor.next();
    return {
      kind: 'NumberLiteral',
      value: Number(tok.value),
      raw: tok.value,
      span: tokenToSpan(tok),
    };
  }

  if (tok.kind === 'boolean') {
    cursor.next();
    return {
      kind: 'BooleanLiteral',
      value: tok.value === 'true',
      raw: tok.value,
      span: tokenToSpan(tok),
    };
  }

  if (tok.kind === 'ident') {
    cursor.next();
    return {
      kind: 'VariableRef',
      name: tok.value,
      span: tokenToSpan(tok),
    };
  }

  cursor.next();
  const span = tokenToSpan(tok);
  errors.push({ code: 'INVALID_CONDITION', span, detail: tok.value });
  return { kind: 'InvalidExpr', raw: tok.value, span };
}

function parsePrimaryCondition(
  cursor: TokenCursor,
  containerSpan: Span,
  errors: SyntaxErrorNode[],
): ConditionExpr {
  const tok = cursor.peek();
  if (!tok) {
    errors.push({ code: 'INVALID_CONDITION', span: containerSpan });
    return { kind: 'InvalidExpr', raw: '', span: containerSpan };
  }

  if (tok.kind === 'lparen') {
    const open = cursor.next()!;
    const inner = parseConditionTokens(cursor, containerSpan, errors);
    const close = cursor.peek();
    if (close && close.kind === 'rparen') {
      cursor.next();
      return {
        kind: 'GroupExpr',
        inner,
        span: mergeSpan(tokenToSpan(open), tokenToSpan(close)),
      };
    }
    errors.push({ code: 'UNBALANCED_PARENS', span: tokenToSpan(open) });
    return { kind: 'GroupExpr', inner, span: tokenToSpan(open) };
  }

  const left = parseOperand(cursor, containerSpan, errors);
  const opTok = cursor.peek();
  if (!opTok || opTok.kind !== 'cmpOp') {
    errors.push({
      code: 'INVALID_CONDITION',
      span: opTok ? tokenToSpan(opTok) : left.span,
    });
    return {
      kind: 'InvalidExpr',
      raw: opTok ? opTok.value : '',
      span: left.span,
    };
  }

  cursor.next();
  const opSpan = tokenToSpan(opTok);
  const right = parseOperand(cursor, opSpan, errors);

  return {
    kind: 'ComparisonExpr',
    left,
    operator: opTok.value,
    operatorSpan: opSpan,
    right,
    span: mergeSpan(left.span, right.span),
  };
}

function parseConditionTokens(
  cursor: TokenCursor,
  containerSpan: Span,
  errors: SyntaxErrorNode[],
): ConditionExpr {
  let expr = parsePrimaryCondition(cursor, containerSpan, errors);

  while (!cursor.isAtEnd()) {
    const nextTok = cursor.peek();
    if (!nextTok || nextTok.kind === 'rparen') {
      break;
    }
    if (nextTok.kind === 'logicOp') {
      cursor.next();
      const opSpan = tokenToSpan(nextTok);
      const right = parsePrimaryCondition(cursor, opSpan, errors);
      expr = {
        kind: 'LogicalExpr',
        left: expr,
        operator: nextTok.value as '&&' | '||' | '^',
        operatorSpan: opSpan,
        right,
        span: mergeSpan(expr.span, right.span),
      };
      continue;
    }

    const unexpected = cursor.next()!;
    errors.push({
      code: 'UNEXPECTED_TOKEN',
      span: tokenToSpan(unexpected),
      detail: unexpected.value,
    });
    break;
  }

  return expr;
}

function parseConditionSlice(
  tokens: readonly Token[],
  containerSpan: Span,
  errors: SyntaxErrorNode[],
): ConditionExpr {
  if (tokens.length === 0) {
    errors.push({ code: 'INVALID_CONDITION', span: containerSpan });
    return { kind: 'InvalidExpr', raw: '', span: containerSpan };
  }
  const cursor = new TokenCursor(tokens);
  const expr = parseConditionTokens(cursor, containerSpan, errors);
  if (!cursor.isAtEnd()) {
    const leftover = cursor.peek()!;
    errors.push({
      code: 'UNEXPECTED_TOKEN',
      span: tokenToSpan(leftover),
      detail: leftover.value,
    });
  }
  return expr;
}

function parseArgList(
  tokens: readonly Token[],
  containerSpan: Span,
  errors: SyntaxErrorNode[],
): ArgNode[] {
  if (tokens.length === 0) {
    return [];
  }

  const args: ArgNode[] = [];
  let start = 0;

  for (let i = 0; i <= tokens.length; i++) {
    const tok = tokens[i];
    if (i < tokens.length && tok?.kind !== 'comma') {
      continue;
    }

    const slice = tokens.slice(start, i);
    if (slice.length === 0) {
      const refSpan = tok ? tokenToSpan(tok) : containerSpan;
      errors.push({ code: 'INVALID_ARGUMENT', span: refSpan });
      args.push({ kind: 'InvalidExpr', raw: '', span: refSpan });
    } else if (slice.length === 1) {
      const single = slice[0]!;
      const span = tokenToSpan(single);
      if (single.kind === 'number') {
        args.push({
          kind: 'NumberLiteral',
          value: Number(single.value),
          raw: single.value,
          span,
        });
      } else if (single.kind === 'boolean') {
        args.push({
          kind: 'BooleanLiteral',
          value: single.value === 'true',
          raw: single.value,
          span,
        });
      } else if (single.kind === 'ident') {
        args.push({
          kind: 'IdentifierLiteral',
          name: single.value,
          span,
        });
      } else {
        errors.push({ code: 'INVALID_ARGUMENT', span, detail: single.value });
        args.push({ kind: 'InvalidExpr', raw: single.value, span });
      }
    } else {
      const first = slice[0]!;
      const last = slice[slice.length - 1]!;
      const span = mergeSpan(tokenToSpan(first), tokenToSpan(last));
      const raw = slice.map((t) => t.value).join(' ');
      errors.push({ code: 'INVALID_ARGUMENT', span, detail: raw });
      args.push({ kind: 'InvalidExpr', raw, span });
    }

    start = i + 1;
  }

  return args;
}

function findMatchingRParen(tokens: readonly Token[], openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok?.kind === 'lparen') {
      depth++;
    } else if (tok?.kind === 'rparen') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

interface BlockStackEntry {
  readonly indentLevel: number;
  readonly node: BlockStatement | null;
}

export function parse(source: string): ParseResult {
  const lines = lex(source);
  const syntaxErrors: SyntaxErrorNode[] = [];
  const rootBody: StatementNode[] = [];
  const stack: BlockStackEntry[] = [{ indentLevel: -1, node: null }];

  for (const line of lines) {
    if (line.tokens.length === 0) {
      continue;
    }

    const errorCountBefore = syntaxErrors.length;
    const first = line.tokens[0]!;
    const second = line.tokens[1];

    let name = '';
    let nameSpan: Span;
    let bodyStartIdx = 1;

    if (first.kind === 'ident' && first.value === 'else' && second?.kind === 'ident' && second.value === 'if') {
      name = 'else if';
      nameSpan = mergeSpan(tokenToSpan(first), tokenToSpan(second));
      bodyStartIdx = 2;
    } else if (first.kind === 'ident') {
      name = first.value;
      nameSpan = tokenToSpan(first);
      bodyStartIdx = 1;
    } else {
      name = first.value;
      nameSpan = tokenToSpan(first);
      syntaxErrors.push({
        code: 'UNEXPECTED_TOKEN',
        span: nameSpan,
        detail: first.value,
      });
      bodyStartIdx = line.tokens.length;
    }

    const spec = COMMAND_MAP.get(name);
    const isBlock = spec?.isBlock ?? false;
    const takesParens = spec?.takesParens ?? true;
    const isConditionCmd = spec?.params[0]?.type === 'condition';

    let condition: ConditionExpr | undefined;
    let args: ArgNode[] = [];

    if (!takesParens) {
      const extra = line.tokens[bodyStartIdx];
      if (extra) {
        syntaxErrors.push({
          code: 'UNEXPECTED_TOKEN',
          span: tokenToSpan(extra),
          detail: extra.value,
        });
      }
    } else if (first.kind === 'ident') {
      const openTok = line.tokens[bodyStartIdx];
      if (!openTok || openTok.kind !== 'lparen') {
        syntaxErrors.push({
          code: 'MISSING_PARENS',
          span: openTok ? tokenToSpan(openTok) : nameSpan,
          detail: name,
        });
      } else {
        const closeIdx = findMatchingRParen(line.tokens, bodyStartIdx);
        if (closeIdx === -1) {
          syntaxErrors.push({
            code: 'UNBALANCED_PARENS',
            span: {
              from: openTok.from,
              to: line.lineTo,
              line: line.lineNumber,
              col: openTok.col,
            },
          });
        } else {
          const closeTok = line.tokens[closeIdx]!;
          const innerTokens = line.tokens.slice(bodyStartIdx + 1, closeIdx);
          const containerSpan = mergeSpan(tokenToSpan(openTok), tokenToSpan(closeTok));

          if (isConditionCmd) {
            condition = parseConditionSlice(innerTokens, containerSpan, syntaxErrors);
          } else {
            args = parseArgList(innerTokens, containerSpan, syntaxErrors);
          }

          const trailing = line.tokens[closeIdx + 1];
          if (trailing) {
            syntaxErrors.push({
              code: 'UNEXPECTED_TOKEN',
              span: tokenToSpan(trailing),
              detail: trailing.value,
            });
          }
        }
      }
    }

    const lastTok = line.tokens[line.tokens.length - 1]!;
    const headerSpan = mergeSpan(nameSpan, tokenToSpan(lastTok));
    const hasValidSyntax = syntaxErrors.length === errorCountBefore;

    while (stack.length > 1) {
      const top = stack[stack.length - 1]!;
      if (top.indentLevel >= line.indentLevel) {
        stack.pop();
      } else {
        break;
      }
    }

    const parent = stack[stack.length - 1]!;
    const expectedChildLevel = parent.node ? parent.indentLevel + 1 : 0;
    if (line.indentLevel > expectedChildLevel) {
      syntaxErrors.push({
        code: 'UNEXPECTED_INDENT',
        span: {
          from: line.indentSpan.from,
          to: Math.max(line.indentSpan.to, nameSpan.to),
          line: line.lineNumber,
          col: 1,
        },
      });
    }

    const targetList = parent.node ? parent.node.body : rootBody;

    if (isBlock) {
      const blockNode: BlockStatement = {
        kind: 'BlockStatement',
        name,
        nameSpan,
        span: headerSpan,
        headerSpan,
        indentLevel: line.indentLevel,
        indentStyle: line.indentStyle,
        indentSpan: line.indentSpan,
        condition,
        args,
        body: [],
        hasValidSyntax,
      };
      targetList.push(blockNode);
      stack.push({ indentLevel: line.indentLevel, node: blockNode });
    } else {
      const cmdNode: CommandStatement = {
        kind: 'CommandStatement',
        name,
        nameSpan,
        span: headerSpan,
        indentLevel: line.indentLevel,
        indentStyle: line.indentStyle,
        indentSpan: line.indentSpan,
        condition,
        args,
        hasValidSyntax,
      };
      targetList.push(cmdNode);
    }
  }

  updateBlockSpans(rootBody);

  return {
    ast: {
      kind: 'Program',
      body: rootBody,
      syntaxErrors,
    },
    lines,
  };
}

function updateBlockSpans(statements: readonly StatementNode[]): void {
  for (const stmt of statements) {
    if (stmt.kind !== 'BlockStatement') {
      continue;
    }
    updateBlockSpans(stmt.body);
    const lastChild = stmt.body[stmt.body.length - 1];
    if (lastChild) {
      stmt.span = mergeSpan(stmt.headerSpan, lastChild.span);
    }
  }
}
