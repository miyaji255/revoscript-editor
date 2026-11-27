import type {
  ArgNode,
  BlockStatement,
  ConditionExpr,
  OperandNode,
  ProgramNode,
  StatementNode,
} from './ast.ts';
import { compareValues, formatBigNum, parseBigNum, type BigNum } from './bignum.ts';

export type SimEnv = Readonly<Record<string, string>>;

export type SimLogKind = 'action' | 'branch' | 'wait' | 'loop' | 'system';

export interface SimLogEntry {
  readonly id: number;
  readonly step: number;
  readonly line: number;
  readonly kind: SimLogKind;
  readonly text: string;
}

export type SimStatus = 'ready' | 'running' | 'waiting' | 'stopped' | 'completed';

export interface SimFrame {
  readonly statements: readonly StatementNode[];
  readonly index: number;
  readonly lastIfBranchTaken: boolean;
  readonly loopKind?: 'repeat' | 'repeatUntil';
  readonly loopStmt?: BlockStatement;
  readonly iterationsDone?: number;
  readonly repeatLimit?: number;
  readonly infinite?: boolean;
}

export interface SimulatorState {
  readonly ast: ProgramNode;
  readonly stack: readonly SimFrame[];
  readonly status: SimStatus;
  readonly activeLine: number | null;
  readonly waitingKind: 'until' | 'seconds' | null;
  readonly waitingReason: string | null;
  readonly stepCount: number;
  readonly simulatedSeconds: number;
  readonly logs: readonly SimLogEntry[];
}

const MAX_LOGS = 200;

function collectVarsFromCondition(expr: ConditionExpr, seen: Set<string>, out: string[]): void {
  switch (expr.kind) {
    case 'ComparisonExpr':
      if (expr.left.kind === 'VariableRef' && !seen.has(expr.left.name)) {
        seen.add(expr.left.name);
        out.push(expr.left.name);
      }
      if (expr.right.kind === 'VariableRef' && !seen.has(expr.right.name)) {
        seen.add(expr.right.name);
        out.push(expr.right.name);
      }
      break;
    case 'LogicalExpr':
      collectVarsFromCondition(expr.left, seen, out);
      collectVarsFromCondition(expr.right, seen, out);
      break;
    case 'GroupExpr':
      collectVarsFromCondition(expr.inner, seen, out);
      break;
    case 'InvalidExpr':
      break;
  }
}

function collectVarsFromStatements(
  statements: readonly StatementNode[],
  seen: Set<string>,
  out: string[],
): void {
  for (const stmt of statements) {
    if (stmt.condition) {
      collectVarsFromCondition(stmt.condition, seen, out);
    }
    if (stmt.kind === 'BlockStatement') {
      collectVarsFromStatements(stmt.body, seen, out);
    }
  }
}

export function extractUsedVariables(ast: ProgramNode): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  collectVarsFromStatements(ast.body, seen, out);
  return out;
}

function resolveOperand(operand: OperandNode, env: SimEnv): { value: BigNum; label: string } {
  switch (operand.kind) {
    case 'VariableRef': {
      const raw = env[operand.name] ?? '0';
      const parsed = parseBigNum(raw) ?? { sign: 0 as const, mantissa: 0, exponent: 0 };
      return { value: parsed, label: `${operand.name}(${formatBigNum(parsed)})` };
    }
    case 'NumberLiteral': {
      const parsed = parseBigNum(operand.raw) ?? { sign: 0 as const, mantissa: 0, exponent: 0 };
      return { value: parsed, label: operand.raw };
    }
    case 'BooleanLiteral': {
      const parsed: BigNum = operand.value
        ? { sign: 1, mantissa: 1, exponent: 0 }
        : { sign: 0, mantissa: 0, exponent: 0 };
      return { value: parsed, label: operand.raw };
    }
    case 'InvalidExpr':
      return { value: { sign: 0, mantissa: 0, exponent: 0 }, label: '?' };
  }
}

export function evaluateCondition(
  expr: ConditionExpr,
  env: SimEnv,
): { readonly value: boolean; readonly trace: string } {
  switch (expr.kind) {
    case 'ComparisonExpr': {
      const left = resolveOperand(expr.left, env);
      const right = resolveOperand(expr.right, env);
      const value = compareValues(left.value, expr.operator, right.value);
      return {
        value,
        trace: `${left.label} ${expr.operator} ${right.label} -> ${value}`,
      };
    }
    case 'LogicalExpr': {
      // Revolution Idle evaluates logical chains strictly left-to-right.
      const leftRes = evaluateCondition(expr.left, env);
      const rightRes = evaluateCondition(expr.right, env);
      let value: boolean;
      if (expr.operator === '&&') {
        value = leftRes.value && rightRes.value;
      } else if (expr.operator === '||') {
        value = leftRes.value || rightRes.value;
      } else {
        value = leftRes.value !== rightRes.value;
      }
      return {
        value,
        trace: `(${leftRes.trace}) ${expr.operator} (${rightRes.trace}) -> ${value}`,
      };
    }
    case 'GroupExpr': {
      const inner = evaluateCondition(expr.inner, env);
      return { value: inner.value, trace: `(${inner.trace})` };
    }
    case 'InvalidExpr':
      return { value: false, trace: 'invalid condition -> false' };
  }
}

function formatArgs(args: readonly ArgNode[]): string {
  return args
    .map((a) => {
      switch (a.kind) {
        case 'NumberLiteral':
        case 'BooleanLiteral':
          return a.raw;
        case 'IdentifierLiteral':
          return a.name;
        case 'InvalidExpr':
          return '?';
      }
    })
    .join(', ');
}

function appendLog(
  logs: readonly SimLogEntry[],
  step: number,
  line: number,
  kind: SimLogKind,
  text: string,
): readonly SimLogEntry[] {
  const nextId = (logs[logs.length - 1]?.id ?? 0) + 1;
  const entry: SimLogEntry = { id: nextId, step, line, kind, text };
  const next = [...logs, entry];
  return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
}

function getActiveLineFromStack(stack: readonly SimFrame[]): number | null {
  const top = stack[stack.length - 1];
  if (!top) {
    return null;
  }
  const stmt = top.statements[top.index];
  return stmt ? stmt.nameSpan.line : null;
}

function settleStack(
  initialStack: readonly SimFrame[],
  env: SimEnv,
  step: number,
  initialLogs: readonly SimLogEntry[],
): {
  stack: SimFrame[];
  status: SimStatus;
  logs: readonly SimLogEntry[];
} {
  const stack = [...initialStack];
  let logs = initialLogs;

  while (stack.length > 0) {
    const top = stack[stack.length - 1]!;
    if (top.index < top.statements.length) {
      return { stack, status: 'running', logs };
    }

    if (top.loopKind === 'repeat' && top.loopStmt && top.statements.length > 0) {
      const nextDone = (top.iterationsDone ?? 0) + 1;
      const limit = top.repeatLimit ?? 0;
      if (top.infinite || nextDone < limit) {
        stack[stack.length - 1] = {
          ...top,
          index: 0,
          iterationsDone: nextDone,
          lastIfBranchTaken: false,
        };
        const label = top.infinite ? `#${nextDone + 1}` : `${nextDone + 1}/${limit}`;
        logs = appendLog(logs, step, top.loopStmt.nameSpan.line, 'loop', `Repeat ${label}`);
        return { stack, status: 'running', logs };
      }
    }

    if (top.loopKind === 'repeatUntil' && top.loopStmt && top.statements.length > 0) {
      const cond = top.loopStmt.condition;
      const evalRes = cond ? evaluateCondition(cond, env) : { value: true, trace: 'true' };
      if (!evalRes.value) {
        stack[stack.length - 1] = {
          ...top,
          index: 0,
          lastIfBranchTaken: false,
        };
        logs = appendLog(
          logs,
          step,
          top.loopStmt.nameSpan.line,
          'loop',
          `RepeatUntil continue (${evalRes.trace})`,
        );
        return { stack, status: 'running', logs };
      }
      logs = appendLog(
        logs,
        step,
        top.loopStmt.nameSpan.line,
        'loop',
        `RepeatUntil done (${evalRes.trace})`,
      );
    }

    stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) {
      stack[stack.length - 1] = { ...parent, index: parent.index + 1 };
    }
  }

  return { stack: [], status: 'completed', logs };
}

export function createSimulator(ast: ProgramNode): SimulatorState {
  if (ast.body.length === 0) {
    return {
      ast,
      stack: [],
      status: 'completed',
      activeLine: null,
      waitingKind: null,
      waitingReason: null,
      stepCount: 0,
      simulatedSeconds: 0,
      logs: [],
    };
  }

  const rootFrame: SimFrame = {
    statements: ast.body,
    index: 0,
    lastIfBranchTaken: false,
  };

  return {
    ast,
    stack: [rootFrame],
    status: 'ready',
    activeLine: ast.body[0]!.nameSpan.line,
    waitingKind: null,
    waitingReason: null,
    stepCount: 0,
    simulatedSeconds: 0,
    logs: [],
  };
}

export function stepSimulator(
  state: SimulatorState,
  env: SimEnv,
  options: { readonly skipWait?: boolean } = {},
): SimulatorState {
  if (state.status === 'stopped' || state.status === 'completed' || state.stack.length === 0) {
    return state;
  }

  const nextStep = state.stepCount + 1;
  const stack = [...state.stack];
  const top = stack[stack.length - 1]!;
  const stmt = top.statements[top.index];

  if (!stmt) {
    const settled = settleStack(stack, env, nextStep, state.logs);
    return {
      ...state,
      stack: settled.stack,
      status: settled.status,
      activeLine: getActiveLineFromStack(settled.stack),
      stepCount: nextStep,
      logs: settled.logs,
    };
  }

  let logs = state.logs;
  let simulatedSeconds = state.simulatedSeconds;

  if (state.status === 'waiting') {
    if (state.waitingKind === 'until') {
      const condRes = stmt.condition
        ? evaluateCondition(stmt.condition, env)
        : { value: true, trace: 'true' };

      if (!condRes.value && !options.skipWait) {
        logs = appendLog(
          logs,
          nextStep,
          stmt.nameSpan.line,
          'wait',
          `Still waiting: ${condRes.trace}`,
        );
        return {
          ...state,
          stepCount: nextStep,
          waitingReason: condRes.trace,
          logs,
        };
      }

      logs = appendLog(
        logs,
        nextStep,
        stmt.nameSpan.line,
        'wait',
        options.skipWait ? 'WaitUntil skipped' : `WaitUntil satisfied (${condRes.trace})`,
      );
      stack[stack.length - 1] = { ...top, index: top.index + 1, lastIfBranchTaken: false };
      const settled = settleStack(stack, env, nextStep, logs);
      return {
        ...state,
        stack: settled.stack,
        status: settled.status,
        activeLine: getActiveLineFromStack(settled.stack),
        waitingKind: null,
        waitingReason: null,
        stepCount: nextStep,
        logs: settled.logs,
      };
    }

    if (state.waitingKind === 'seconds') {
      const secs =
        stmt.args[0]?.kind === 'NumberLiteral' ? Math.max(0, stmt.args[0].value) : 0;
      simulatedSeconds += secs;
      logs = appendLog(
        logs,
        nextStep,
        stmt.nameSpan.line,
        'wait',
        `Waited ${secs}s (total ${Number(simulatedSeconds.toFixed(3))}s)`,
      );
      stack[stack.length - 1] = { ...top, index: top.index + 1, lastIfBranchTaken: false };
      const settled = settleStack(stack, env, nextStep, logs);
      return {
        ...state,
        stack: settled.stack,
        status: settled.status,
        activeLine: getActiveLineFromStack(settled.stack),
        waitingKind: null,
        waitingReason: null,
        stepCount: nextStep,
        simulatedSeconds,
        logs: settled.logs,
      };
    }
  }

  // Normal execution of stmt
  if (stmt.name === 'if') {
    const condRes = stmt.condition
      ? evaluateCondition(stmt.condition, env)
      : { value: false, trace: 'false' };

    logs = appendLog(logs, nextStep, stmt.nameSpan.line, 'branch', `if (${condRes.trace})`);
    if (condRes.value && stmt.kind === 'BlockStatement' && stmt.body.length > 0) {
      stack[stack.length - 1] = { ...top, lastIfBranchTaken: true };
      stack.push({ statements: stmt.body, index: 0, lastIfBranchTaken: false });
      return {
        ...state,
        stack,
        status: 'running',
        activeLine: getActiveLineFromStack(stack),
        stepCount: nextStep,
        logs,
      };
    }

    stack[stack.length - 1] = {
      ...top,
      index: top.index + 1,
      lastIfBranchTaken: condRes.value,
    };
    const settled = settleStack(stack, env, nextStep, logs);
    return {
      ...state,
      stack: settled.stack,
      status: settled.status,
      activeLine: getActiveLineFromStack(settled.stack),
      stepCount: nextStep,
      logs: settled.logs,
    };
  }

  if (stmt.name === 'else if') {
    if (top.lastIfBranchTaken) {
      logs = appendLog(logs, nextStep, stmt.nameSpan.line, 'branch', 'else if skipped (branch taken)');
      stack[stack.length - 1] = { ...top, index: top.index + 1 };
      const settled = settleStack(stack, env, nextStep, logs);
      return {
        ...state,
        stack: settled.stack,
        status: settled.status,
        activeLine: getActiveLineFromStack(settled.stack),
        stepCount: nextStep,
        logs: settled.logs,
      };
    }

    const condRes = stmt.condition
      ? evaluateCondition(stmt.condition, env)
      : { value: false, trace: 'false' };

    logs = appendLog(logs, nextStep, stmt.nameSpan.line, 'branch', `else if (${condRes.trace})`);
    if (condRes.value && stmt.kind === 'BlockStatement' && stmt.body.length > 0) {
      stack[stack.length - 1] = { ...top, lastIfBranchTaken: true };
      stack.push({ statements: stmt.body, index: 0, lastIfBranchTaken: false });
      return {
        ...state,
        stack,
        status: 'running',
        activeLine: getActiveLineFromStack(stack),
        stepCount: nextStep,
        logs,
      };
    }

    stack[stack.length - 1] = {
      ...top,
      index: top.index + 1,
      lastIfBranchTaken: condRes.value,
    };
    const settled = settleStack(stack, env, nextStep, logs);
    return {
      ...state,
      stack: settled.stack,
      status: settled.status,
      activeLine: getActiveLineFromStack(settled.stack),
      stepCount: nextStep,
      logs: settled.logs,
    };
  }

  if (stmt.name === 'else') {
    if (top.lastIfBranchTaken) {
      logs = appendLog(logs, nextStep, stmt.nameSpan.line, 'branch', 'else skipped (branch taken)');
      stack[stack.length - 1] = { ...top, index: top.index + 1, lastIfBranchTaken: false };
      const settled = settleStack(stack, env, nextStep, logs);
      return {
        ...state,
        stack: settled.stack,
        status: settled.status,
        activeLine: getActiveLineFromStack(settled.stack),
        stepCount: nextStep,
        logs: settled.logs,
      };
    }

    logs = appendLog(logs, nextStep, stmt.nameSpan.line, 'branch', 'else entered');
    if (stmt.kind === 'BlockStatement' && stmt.body.length > 0) {
      stack[stack.length - 1] = { ...top, lastIfBranchTaken: false };
      stack.push({ statements: stmt.body, index: 0, lastIfBranchTaken: false });
      return {
        ...state,
        stack,
        status: 'running',
        activeLine: getActiveLineFromStack(stack),
        stepCount: nextStep,
        logs,
      };
    }

    stack[stack.length - 1] = { ...top, index: top.index + 1, lastIfBranchTaken: false };
    const settled = settleStack(stack, env, nextStep, logs);
    return {
      ...state,
      stack: settled.stack,
      status: settled.status,
      activeLine: getActiveLineFromStack(settled.stack),
      stepCount: nextStep,
      logs: settled.logs,
    };
  }

  if (stmt.name === 'Repeat' && stmt.kind === 'BlockStatement') {
    const count = stmt.args[0]?.kind === 'NumberLiteral' ? Math.max(0, Math.floor(stmt.args[0].value)) : 0;
    const infinite = stmt.args[1]?.kind === 'BooleanLiteral' ? stmt.args[1].value : false;

    if ((infinite || count > 0) && stmt.body.length > 0) {
      logs = appendLog(
        logs,
        nextStep,
        stmt.nameSpan.line,
        'loop',
        infinite ? 'Repeat (infinite) entered' : `Repeat (${count}) entered`,
      );
      stack[stack.length - 1] = { ...top, lastIfBranchTaken: false };
      stack.push({
        statements: stmt.body,
        index: 0,
        lastIfBranchTaken: false,
        loopKind: 'repeat',
        loopStmt: stmt,
        iterationsDone: 0,
        repeatLimit: count,
        infinite,
      });
      return {
        ...state,
        stack,
        status: 'running',
        activeLine: getActiveLineFromStack(stack),
        stepCount: nextStep,
        logs,
      };
    }

    logs = appendLog(logs, nextStep, stmt.nameSpan.line, 'loop', 'Repeat skipped (0 iterations or empty)');
    stack[stack.length - 1] = { ...top, index: top.index + 1, lastIfBranchTaken: false };
    const settled = settleStack(stack, env, nextStep, logs);
    return {
      ...state,
      stack: settled.stack,
      status: settled.status,
      activeLine: getActiveLineFromStack(settled.stack),
      stepCount: nextStep,
      logs: settled.logs,
    };
  }

  if (stmt.name === 'RepeatUntil' && stmt.kind === 'BlockStatement') {
    const condRes = stmt.condition
      ? evaluateCondition(stmt.condition, env)
      : { value: true, trace: 'true' };

    if (!condRes.value && stmt.body.length > 0) {
      logs = appendLog(
        logs,
        nextStep,
        stmt.nameSpan.line,
        'loop',
        `RepeatUntil entered (${condRes.trace})`,
      );
      stack[stack.length - 1] = { ...top, lastIfBranchTaken: false };
      stack.push({
        statements: stmt.body,
        index: 0,
        lastIfBranchTaken: false,
        loopKind: 'repeatUntil',
        loopStmt: stmt,
      });
      return {
        ...state,
        stack,
        status: 'running',
        activeLine: getActiveLineFromStack(stack),
        stepCount: nextStep,
        logs,
      };
    }

    logs = appendLog(
      logs,
      nextStep,
      stmt.nameSpan.line,
      'loop',
      `RepeatUntil skipped (${condRes.trace})`,
    );
    stack[stack.length - 1] = { ...top, index: top.index + 1, lastIfBranchTaken: false };
    const settled = settleStack(stack, env, nextStep, logs);
    return {
      ...state,
      stack: settled.stack,
      status: settled.status,
      activeLine: getActiveLineFromStack(settled.stack),
      stepCount: nextStep,
      logs: settled.logs,
    };
  }

  if (stmt.name === 'WaitUntil') {
    const condRes = stmt.condition
      ? evaluateCondition(stmt.condition, env)
      : { value: true, trace: 'true' };

    if (condRes.value || options.skipWait) {
      logs = appendLog(
        logs,
        nextStep,
        stmt.nameSpan.line,
        'wait',
        `WaitUntil passed (${condRes.trace})`,
      );
      stack[stack.length - 1] = { ...top, index: top.index + 1, lastIfBranchTaken: false };
      const settled = settleStack(stack, env, nextStep, logs);
      return {
        ...state,
        stack: settled.stack,
        status: settled.status,
        activeLine: getActiveLineFromStack(settled.stack),
        waitingKind: null,
        waitingReason: null,
        stepCount: nextStep,
        logs: settled.logs,
      };
    }

    logs = appendLog(
      logs,
      nextStep,
      stmt.nameSpan.line,
      'wait',
      `Waiting: ${condRes.trace}`,
    );
    return {
      ...state,
      status: 'waiting',
      activeLine: stmt.nameSpan.line,
      waitingKind: 'until',
      waitingReason: condRes.trace,
      stepCount: nextStep,
      logs,
    };
  }

  if (stmt.name === 'WaitForSeconds') {
    const secs = stmt.args[0]?.kind === 'NumberLiteral' ? Math.max(0, stmt.args[0].value) : 0;
    if (options.skipWait) {
      simulatedSeconds += secs;
      logs = appendLog(
        logs,
        nextStep,
        stmt.nameSpan.line,
        'wait',
        `WaitForSeconds(${secs}) -> total ${Number(simulatedSeconds.toFixed(3))}s`,
      );
      stack[stack.length - 1] = { ...top, index: top.index + 1, lastIfBranchTaken: false };
      const settled = settleStack(stack, env, nextStep, logs);
      return {
        ...state,
        stack: settled.stack,
        status: settled.status,
        activeLine: getActiveLineFromStack(settled.stack),
        waitingKind: null,
        waitingReason: null,
        stepCount: nextStep,
        simulatedSeconds,
        logs: settled.logs,
      };
    }

    logs = appendLog(
      logs,
      nextStep,
      stmt.nameSpan.line,
      'wait',
      `WaitForSeconds(${secs}) paused`,
    );
    return {
      ...state,
      status: 'waiting',
      activeLine: stmt.nameSpan.line,
      waitingKind: 'seconds',
      waitingReason: `${secs}s`,
      stepCount: nextStep,
      logs,
    };
  }

  if (stmt.name === 'Restart') {
    logs = appendLog(logs, nextStep, stmt.nameSpan.line, 'system', 'Restart() -> line 1');
    const resetRoot: SimFrame = {
      statements: state.ast.body,
      index: 0,
      lastIfBranchTaken: false,
    };
    return {
      ...state,
      stack: [resetRoot],
      status: 'running',
      activeLine: state.ast.body[0]?.nameSpan.line ?? null,
      waitingKind: null,
      waitingReason: null,
      stepCount: nextStep,
      logs,
    };
  }

  if (stmt.name === 'Stop') {
    logs = appendLog(logs, nextStep, stmt.nameSpan.line, 'system', 'Stop() -> macro halted');
    return {
      ...state,
      stack: [],
      status: 'stopped',
      activeLine: stmt.nameSpan.line,
      waitingKind: null,
      waitingReason: null,
      stepCount: nextStep,
      logs,
    };
  }

  if (stmt.name === 'GoToMacro') {
    const slotText = formatArgs(stmt.args);
    logs = appendLog(
      logs,
      nextStep,
      stmt.nameSpan.line,
      'system',
      `GoToMacro(${slotText}) -> transferred`,
    );
    return {
      ...state,
      stack: [],
      status: 'stopped',
      activeLine: stmt.nameSpan.line,
      waitingKind: null,
      waitingReason: null,
      stepCount: nextStep,
      logs,
    };
  }

  // Standard game action command
  const argText = formatArgs(stmt.args);
  logs = appendLog(logs, nextStep, stmt.nameSpan.line, 'action', `${stmt.name}(${argText})`);
  stack[stack.length - 1] = { ...top, index: top.index + 1, lastIfBranchTaken: false };
  const settled = settleStack(stack, env, nextStep, logs);
  return {
    ...state,
    stack: settled.stack,
    status: settled.status,
    activeLine: getActiveLineFromStack(settled.stack),
    waitingKind: null,
    waitingReason: null,
    stepCount: nextStep,
    logs: settled.logs,
  };
}

export function runSimulatorSteps(
  state: SimulatorState,
  env: SimEnv,
  maxSteps = 50,
): SimulatorState {
  let current = state;
  for (let i = 0; i < maxSteps; i++) {
    if (current.status === 'stopped' || current.status === 'completed') {
      break;
    }
    if (current.status === 'waiting' && current.waitingKind === 'until') {
      const next = stepSimulator(current, env, { skipWait: false });
      current = next;
      if (current.status === 'waiting') {
        break;
      }
      continue;
    }
    current = stepSimulator(current, env, { skipWait: true });
    if (current.status === 'waiting' && current.waitingKind === 'until') {
      break;
    }
  }
  return current;
}
