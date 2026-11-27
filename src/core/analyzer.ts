import type {
  ArgNode,
  ConditionExpr,
  OperandNode,
  ProgramNode,
  StatementNode,
  SyntaxErrorNode,
} from './ast.ts';
import { computeMetrics, type ScriptMetrics } from './metrics.ts';
import { parse } from './parser.ts';
import {
  COMMAND_MAP,
  ENUM_VALUES,
  findClosestMatch,
  VARIABLE_MAP,
  type CommandSpec,
  type Locale,
  type ParamSpec,
} from './spec.ts';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type DiagnosticCode =
  | SyntaxErrorNode['code']
  | 'UNKNOWN_COMMAND'
  | 'WRONG_ARITY'
  | 'INVALID_ARG_TYPE'
  | 'ARG_OUT_OF_RANGE'
  | 'ORPHAN_ELSE'
  | 'UNKNOWN_VARIABLE'
  | 'MIXED_LOGIC_OPS'
  | 'SPACE_INDENT'
  | 'EMPTY_BLOCK'
  | 'UNREACHABLE_CODE'
  | 'ZERO_WAIT'
  | 'REPEAT_UNTIL_PRECHECK'
  | 'INFINITE_REPEAT_COUNT';

export interface QuickFix {
  readonly label: string;
  readonly from: number;
  readonly to: number;
  readonly insert: string;
}

export interface Diagnostic {
  readonly id: string;
  readonly code: DiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly from: number;
  readonly to: number;
  readonly line: number;
  readonly col: number;
  readonly message: string;
  readonly quickFix?: QuickFix;
}

export interface AnalysisResult {
  readonly ast: ProgramNode;
  readonly diagnostics: readonly Diagnostic[];
  readonly metrics: ScriptMetrics;
}

function formatSyntaxError(err: SyntaxErrorNode, locale: Locale): string {
  const ja = locale === 'ja';
  switch (err.code) {
    case 'UNBALANCED_PARENS':
      return ja ? '括弧の対応が取れていません。' : 'Unbalanced parentheses.';
    case 'MISSING_PARENS':
      return ja
        ? `「${err.detail ?? ''}」の後に括弧 () が必要です。`
        : `Expected parentheses () after "${err.detail ?? ''}".`;
    case 'UNEXPECTED_TOKEN':
      return ja
        ? `予期しないトークンです: ${err.detail ?? ''}`
        : `Unexpected token: ${err.detail ?? ''}`;
    case 'UNEXPECTED_INDENT':
      return ja
        ? 'インデントの階層が不正です。ブロック命令の直下のみ1段階下げてください。'
        : 'Unexpected indentation level. Only indent one level inside block statements.';
    case 'INVALID_CONDITION':
      return ja
        ? '条件式の構文が正しくありません（例: IP >= 1000）。'
        : 'Invalid condition syntax (e.g. IP >= 1000).';
    case 'INVALID_ARGUMENT':
      return ja
        ? '引数の構文が正しくありません。カンマ区切りの値を確認してください。'
        : 'Invalid argument syntax. Check comma-separated values.';
  }
}

function collectUnparenthesizedOps(expr: ConditionExpr, ops: Set<string>): void {
  if (expr.kind === 'LogicalExpr') {
    ops.add(expr.operator);
    collectUnparenthesizedOps(expr.left, ops);
    collectUnparenthesizedOps(expr.right, ops);
  }
}

function findMixedLogicGroup(expr: ConditionExpr): ConditionExpr | null {
  if (expr.kind === 'LogicalExpr') {
    const ops = new Set<string>();
    collectUnparenthesizedOps(expr, ops);
    if (ops.size > 1) {
      return expr;
    }
    return findMixedLogicGroup(expr.left) ?? findMixedLogicGroup(expr.right);
  }
  if (expr.kind === 'GroupExpr') {
    return findMixedLogicGroup(expr.inner);
  }
  return null;
}

function checkOperand(
  operand: OperandNode,
  locale: Locale,
  add: (diag: Omit<Diagnostic, 'id'>) => void,
): void {
  if (operand.kind !== 'VariableRef') {
    return;
  }
  if (VARIABLE_MAP.has(operand.name)) {
    return;
  }
  const suggestion = findClosestMatch(operand.name, VARIABLE_MAP.keys(), 4);
  const ja = locale === 'ja';
  const message = suggestion
    ? ja
      ? `不明な変数「${operand.name}」です。もしかして「${suggestion}」ですか？`
      : `Unknown variable "${operand.name}". Did you mean "${suggestion}"?`
    : ja
      ? `不明な変数「${operand.name}」です。`
      : `Unknown variable "${operand.name}".`;

  add({
    code: 'UNKNOWN_VARIABLE',
    severity: 'error',
    from: operand.span.from,
    to: operand.span.to,
    line: operand.span.line,
    col: operand.span.col,
    message,
    quickFix: suggestion
      ? {
          label: ja ? `「${suggestion}」に置換` : `Replace with "${suggestion}"`,
          from: operand.span.from,
          to: operand.span.to,
          insert: suggestion,
        }
      : undefined,
  });
}

function checkConditionTree(
  expr: ConditionExpr,
  locale: Locale,
  add: (diag: Omit<Diagnostic, 'id'>) => void,
): void {
  switch (expr.kind) {
    case 'ComparisonExpr':
      checkOperand(expr.left, locale, add);
      checkOperand(expr.right, locale, add);
      break;
    case 'LogicalExpr':
      checkConditionTree(expr.left, locale, add);
      checkConditionTree(expr.right, locale, add);
      break;
    case 'GroupExpr':
      checkConditionTree(expr.inner, locale, add);
      break;
    case 'InvalidExpr':
      break;
  }
}

function validateArgument(
  arg: ArgNode,
  param: ParamSpec,
  locale: Locale,
  add: (diag: Omit<Diagnostic, 'id'>) => void,
): void {
  if (arg.kind === 'InvalidExpr') {
    return;
  }

  const ja = locale === 'ja';

  switch (param.type) {
    case 'boolean': {
      if (arg.kind !== 'BooleanLiteral') {
        add({
          code: 'INVALID_ARG_TYPE',
          severity: 'error',
          from: arg.span.from,
          to: arg.span.to,
          line: arg.span.line,
          col: arg.span.col,
          message: ja
            ? `引数 ${param.name} には true または false を指定してください。`
            : `Parameter "${param.name}" expects true or false.`,
        });
      }
      break;
    }
    case 'integer': {
      if (arg.kind !== 'NumberLiteral' || !Number.isInteger(arg.value)) {
        add({
          code: 'INVALID_ARG_TYPE',
          severity: 'error',
          from: arg.span.from,
          to: arg.span.to,
          line: arg.span.line,
          col: arg.span.col,
          message: ja
            ? `引数 ${param.name} には整数を指定してください。`
            : `Parameter "${param.name}" expects an integer.`,
        });
        return;
      }
      checkNumericRange(arg.value, arg.span, param, locale, add);
      break;
    }
    case 'number': {
      if (arg.kind !== 'NumberLiteral' || !Number.isFinite(arg.value)) {
        add({
          code: 'INVALID_ARG_TYPE',
          severity: 'error',
          from: arg.span.from,
          to: arg.span.to,
          line: arg.span.line,
          col: arg.span.col,
          message: ja
            ? `引数 ${param.name} には数値を指定してください。`
            : `Parameter "${param.name}" expects a number.`,
        });
        return;
      }
      checkNumericRange(arg.value, arg.span, param, locale, add);
      break;
    }
    case 'dtBranch': {
      const allowed = ENUM_VALUES.dtBranch;
      if (arg.kind !== 'IdentifierLiteral' || !(allowed as readonly string[]).includes(arg.name)) {
        const rawName = arg.kind === 'IdentifierLiteral' ? arg.name : arg.raw;
        const suggestion = findClosestMatch(rawName, allowed, 4);
        add({
          code: 'INVALID_ARG_TYPE',
          severity: 'error',
          from: arg.span.from,
          to: arg.span.to,
          line: arg.span.line,
          col: arg.span.col,
          message: suggestion
            ? ja
              ? `ブランチ「${rawName}」は無効です。${allowed.join(' / ')} のいずれかを指定してください（もしかして ${suggestion}？）。`
              : `Invalid branch "${rawName}". Expected ${allowed.join(', ')} (did you mean ${suggestion}?).`
            : ja
              ? `引数 ${param.name} には ${allowed.join(' / ')} を指定してください。`
              : `Parameter "${param.name}" expects one of ${allowed.join(', ')}.`,
          quickFix: suggestion
            ? {
                label: ja ? `${suggestion} に修正` : `Change to ${suggestion}`,
                from: arg.span.from,
                to: arg.span.to,
                insert: suggestion,
              }
            : undefined,
        });
      }
      break;
    }
    case 'element': {
      const allowed = ENUM_VALUES.element;
      if (arg.kind !== 'IdentifierLiteral' || !(allowed as readonly string[]).includes(arg.name)) {
        const rawName = arg.kind === 'IdentifierLiteral' ? arg.name : arg.raw;
        const suggestion = findClosestMatch(rawName, allowed, 3);
        add({
          code: 'INVALID_ARG_TYPE',
          severity: 'error',
          from: arg.span.from,
          to: arg.span.to,
          line: arg.span.line,
          col: arg.span.col,
          message: suggestion
            ? ja
              ? `元素「${rawName}」は無効です。${allowed.join(' / ')} を指定してください（もしかして ${suggestion}？）。`
              : `Invalid element "${rawName}". Expected ${allowed.join(', ')} (did you mean ${suggestion}?).`
            : ja
              ? `引数 ${param.name} には ${allowed.join(' / ')} を指定してください。`
              : `Parameter "${param.name}" expects one of ${allowed.join(', ')}.`,
          quickFix: suggestion
            ? {
                label: ja ? `${suggestion} に修正` : `Change to ${suggestion}`,
                from: arg.span.from,
                to: arg.span.to,
                insert: suggestion,
              }
            : undefined,
        });
      }
      break;
    }
    case 'tcType': {
      if (arg.kind !== 'NumberLiteral' && arg.kind !== 'IdentifierLiteral') {
        add({
          code: 'INVALID_ARG_TYPE',
          severity: 'error',
          from: arg.span.from,
          to: arg.span.to,
          line: arg.span.line,
          col: arg.span.col,
          message: ja
            ? `引数 ${param.name} には数値または識別子を指定してください。`
            : `Parameter "${param.name}" expects a number or identifier.`,
        });
      }
      break;
    }
    case 'condition':
      break;
  }
}

function checkNumericRange(
  value: number,
  span: ArgNode['span'],
  param: ParamSpec,
  locale: Locale,
  add: (diag: Omit<Diagnostic, 'id'>) => void,
): void {
  const ja = locale === 'ja';
  if (param.min !== undefined && value < param.min) {
    add({
      code: 'ARG_OUT_OF_RANGE',
      severity: 'warning',
      from: span.from,
      to: span.to,
      line: span.line,
      col: span.col,
      message: ja
        ? `引数 ${param.name} の値 ${value} が最小値 ${param.min} を下回っています。`
        : `Argument "${param.name}" (${value}) is below the expected minimum (${param.min}).`,
    });
  } else if (param.max !== undefined && value > param.max) {
    add({
      code: 'ARG_OUT_OF_RANGE',
      severity: 'warning',
      from: span.from,
      to: span.to,
      line: span.line,
      col: span.col,
      message: ja
        ? `引数 ${param.name} の値 ${value} が推奨範囲の上限 ${param.max} を超えています。`
        : `Argument "${param.name}" (${value}) exceeds the expected maximum (${param.max}).`,
    });
  }
}

function checkCommandSemantics(
  stmt: StatementNode,
  spec: CommandSpec,
  locale: Locale,
  add: (diag: Omit<Diagnostic, 'id'>) => void,
): void {
  const ja = locale === 'ja';

  if (spec.params[0]?.type === 'condition') {
    if (stmt.condition) {
      checkConditionTree(stmt.condition, locale, add);
      const mixedExpr = findMixedLogicGroup(stmt.condition);
      if (mixedExpr) {
        add({
          code: 'MIXED_LOGIC_OPS',
          severity: 'warning',
          from: mixedExpr.span.from,
          to: mixedExpr.span.to,
          line: mixedExpr.span.line,
          col: mixedExpr.span.col,
          message: ja
            ? '複数の論理演算子が混在しています。Revolution Idle の条件は左から順に評価されるため、括弧で明示することを推奨します。'
            : 'Multiple logical operators mixed. Revolution Idle evaluates conditions left-to-right; consider adding parentheses.',
        });
      }
    }
  } else if (stmt.hasValidSyntax) {
    if (stmt.args.length !== spec.params.length) {
      add({
        code: 'WRONG_ARITY',
        severity: 'error',
        from: stmt.nameSpan.from,
        to: stmt.kind === 'BlockStatement' ? stmt.headerSpan.to : stmt.span.to,
        line: stmt.nameSpan.line,
        col: stmt.nameSpan.col,
        message: ja
          ? `${spec.name} は引数が ${spec.params.length} 個必要ですが、${stmt.args.length} 個指定されています。`
          : `${spec.name} expects ${spec.params.length} argument(s), got ${stmt.args.length}.`,
      });
    } else {
      for (let i = 0; i < spec.params.length; i++) {
        const arg = stmt.args[i];
        const param = spec.params[i];
        if (arg && param) {
          validateArgument(arg, param, locale, add);
        }
      }
    }
  }

  if (stmt.name === 'WaitForSeconds' && stmt.args[0]?.kind === 'NumberLiteral' && stmt.args[0].value === 0) {
    add({
      code: 'ZERO_WAIT',
      severity: 'info',
      from: stmt.span.from,
      to: stmt.span.to,
      line: stmt.span.line,
      col: stmt.span.col,
      message: ja
        ? '待機時間が 0 秒です。フレームレート依存の挙動になるためゲーム内での動作を確認してください。'
        : 'Wait duration is 0 seconds. Verify timing behavior in game.',
    });
  }

  if (stmt.name === 'RepeatUntil') {
    add({
      code: 'REPEAT_UNTIL_PRECHECK',
      severity: 'info',
      from: stmt.nameSpan.from,
      to: stmt.nameSpan.to,
      line: stmt.nameSpan.line,
      col: stmt.nameSpan.col,
      message: ja
        ? 'RepeatUntil は開始時に条件がすでに真の場合、子ブロックを1回も実行しません。'
        : 'RepeatUntil skips its child block completely if the condition is already true on entry.',
    });
  }

  if (
    stmt.name === 'Repeat' &&
    stmt.args[0]?.kind === 'NumberLiteral' &&
    stmt.args[0].value > 0 &&
    stmt.args[1]?.kind === 'BooleanLiteral' &&
    stmt.args[1].value === true
  ) {
    add({
      code: 'INFINITE_REPEAT_COUNT',
      severity: 'info',
      from: stmt.args[0].span.from,
      to: stmt.args[1].span.to,
      line: stmt.args[0].span.line,
      col: stmt.args[0].span.col,
      message: ja
        ? '第2引数が true（無限ループ）のため、繰り返し回数（第1引数）は無視されます。'
        : 'Infinite mode is true, so the repeat count (first argument) is ignored.',
    });
  }
}

function analyzeStatementList(
  statements: readonly StatementNode[],
  locale: Locale,
  add: (diag: Omit<Diagnostic, 'id'>) => void,
): void {
  const ja = locale === 'ja';
  let terminated = false;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]!;
    const prev = i > 0 ? statements[i - 1] : undefined;

    if (stmt.indentStyle === 'space' || stmt.indentStyle === 'mixed') {
      add({
        code: 'SPACE_INDENT',
        severity: 'warning',
        from: stmt.indentSpan.from,
        to: stmt.indentSpan.to,
        line: stmt.nameSpan.line,
        col: 1,
        message: ja
          ? 'スペースによるインデントが使用されています。RevoScript 標準のタブ文字 (\\t) の使用を推奨します。'
          : 'Space indentation detected. RevoScript standard uses tab characters (\\t).',
        quickFix: {
          label: ja ? 'タブ文字に置換' : 'Convert to tabs',
          from: stmt.indentSpan.from,
          to: stmt.indentSpan.to,
          insert: '\t'.repeat(stmt.indentLevel),
        },
      });
    }

    if (terminated) {
      add({
        code: 'UNREACHABLE_CODE',
        severity: 'warning',
        from: stmt.nameSpan.from,
        to: stmt.kind === 'BlockStatement' ? stmt.headerSpan.to : stmt.span.to,
        line: stmt.nameSpan.line,
        col: stmt.nameSpan.col,
        message: ja
          ? '直前の制御命令（Restart / Stop / GoToMacro）により、この行は到達不能です。'
          : 'Unreachable statement after preceding Restart / Stop / GoToMacro.',
      });
    }

    const spec = COMMAND_MAP.get(stmt.name);
    if (!spec) {
      const suggestion = findClosestMatch(stmt.name, COMMAND_MAP.keys(), 3);
      add({
        code: 'UNKNOWN_COMMAND',
        severity: 'error',
        from: stmt.nameSpan.from,
        to: stmt.nameSpan.to,
        line: stmt.nameSpan.line,
        col: stmt.nameSpan.col,
        message: suggestion
          ? ja
            ? `未登録の命令「${stmt.name}」です。もしかして「${suggestion}」ですか？`
            : `Unknown command "${stmt.name}". Did you mean "${suggestion}"?`
          : ja
            ? `未登録の命令「${stmt.name}」です。`
            : `Unknown command "${stmt.name}".`,
        quickFix: suggestion
          ? {
              label: ja ? `「${suggestion}」に置換` : `Replace with "${suggestion}"`,
              from: stmt.nameSpan.from,
              to: stmt.nameSpan.to,
              insert: suggestion,
            }
          : undefined,
      });
    } else {
      if (spec.requiresPrecedingIf) {
        const validPrev = prev && (prev.name === 'if' || prev.name === 'else if');
        if (!validPrev) {
          add({
            code: 'ORPHAN_ELSE',
            severity: 'error',
            from: stmt.nameSpan.from,
            to: stmt.nameSpan.to,
            line: stmt.nameSpan.line,
            col: stmt.nameSpan.col,
            message: ja
              ? `${stmt.name} は直前の if または else if と同じインデント階層に続けて記述してください。`
              : `"${stmt.name}" must immediately follow an "if" or "else if" block at the same level.`,
          });
        }
      }

      checkCommandSemantics(stmt, spec, locale, add);
    }

    if (stmt.kind === 'BlockStatement') {
      if (stmt.body.length === 0) {
        add({
          code: 'EMPTY_BLOCK',
          severity: 'warning',
          from: stmt.headerSpan.from,
          to: stmt.headerSpan.to,
          line: stmt.nameSpan.line,
          col: stmt.nameSpan.col,
          message: ja
            ? `${stmt.name} ブロック内に子命令がありません。次の行をタブでインデントしてください。`
            : `${stmt.name} block has an empty body. Indent child commands with a tab.`,
        });
      } else {
        analyzeStatementList(stmt.body, locale, add);
      }
    }

    if (
      stmt.kind === 'CommandStatement' &&
      (stmt.name === 'Stop' || stmt.name === 'Restart' || stmt.name === 'GoToMacro')
    ) {
      terminated = true;
    }
  }
}

export function analyze(source: string, locale: Locale = 'ja'): AnalysisResult {
  const { ast, lines } = parse(source);
  const metrics = computeMetrics(ast, lines);
  const diagnostics: Diagnostic[] = [];

  const add = (diag: Omit<Diagnostic, 'id'>): void => {
    diagnostics.push({
      id: `${diag.code}:${diag.line}:${diag.col}:${diagnostics.length}`,
      ...diag,
    });
  };

  for (const err of ast.syntaxErrors) {
    add({
      code: err.code,
      severity: 'error',
      from: err.span.from,
      to: Math.max(err.span.from + 1, err.span.to),
      line: err.span.line,
      col: err.span.col,
      message: formatSyntaxError(err, locale),
    });
  }

  analyzeStatementList(ast.body, locale, add);

  diagnostics.sort((a, b) => a.from - b.from || a.to - b.to);

  return { ast, diagnostics, metrics };
}
