export type IndentStyle = 'none' | 'tab' | 'space' | 'mixed';

export type TokenKind =
  | 'ident'
  | 'number'
  | 'boolean'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'cmpOp'
  | 'logicOp'
  | 'unknown';

export interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  readonly from: number;
  readonly to: number;
  readonly line: number;
  readonly col: number;
}

export interface LexedLine {
  readonly lineNumber: number;
  readonly lineFrom: number;
  readonly lineTo: number;
  readonly rawText: string;
  readonly rawIndent: string;
  readonly indentStyle: IndentStyle;
  readonly indentLevel: number;
  readonly indentSpan: { readonly from: number; readonly to: number };
  readonly tokens: readonly Token[];
}

const NUMBER_RE = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*/;
const CMP_OP_RE = /^(?:>=|<=|==|!=|>|<)/;
const LOGIC_OP_RE = /^(?:&&|\|\||\^)/;

function detectSpaceIndentUnit(segments: readonly string[]): number {
  let minSpaces = Infinity;
  for (const seg of segments) {
    const line = seg.endsWith('\r') ? seg.slice(0, -1) : seg;
    if (!line.trim()) {
      continue;
    }
    const match = /^( +)(?=\S)/.exec(line);
    if (match) {
      minSpaces = Math.min(minSpaces, match[1]!.length);
    }
  }
  if (minSpaces === 2 || minSpaces === 3) {
    return minSpaces;
  }
  return 4;
}

function classifyIndent(
  rawIndent: string,
  spaceUnit: number,
): { indentStyle: IndentStyle; indentLevel: number } {
  if (rawIndent.length === 0) {
    return { indentStyle: 'none', indentLevel: 0 };
  }

  let tabs = 0;
  let spaces = 0;
  for (let i = 0; i < rawIndent.length; i++) {
    const ch = rawIndent[i];
    if (ch === '\t') {
      tabs++;
    } else if (ch === ' ') {
      spaces++;
    }
  }

  if (tabs > 0 && spaces > 0) {
    return { indentStyle: 'mixed', indentLevel: tabs + Math.ceil(spaces / spaceUnit) };
  }
  if (tabs > 0) {
    return { indentStyle: 'tab', indentLevel: tabs };
  }
  return { indentStyle: 'space', indentLevel: Math.ceil(spaces / spaceUnit) };
}

function canStartUnaryMinus(prev: Token | undefined): boolean {
  if (!prev) {
    return false;
  }
  return (
    prev.kind === 'lparen' ||
    prev.kind === 'comma' ||
    prev.kind === 'cmpOp' ||
    prev.kind === 'logicOp'
  );
}

export function lex(source: string): LexedLine[] {
  const segments = source.split('\n');
  const spaceUnit = detectSpaceIndentUnit(segments);
  const lines: LexedLine[] = [];
  let offset = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i] ?? '';
    const lineNumber = i + 1;
    const rawText = segment.endsWith('\r') ? segment.slice(0, -1) : segment;
    const lineFrom = offset;
    const lineTo = offset + rawText.length;

    let pos = 0;
    while (pos < rawText.length && (rawText[pos] === '\t' || rawText[pos] === ' ')) {
      pos++;
    }

    const rawIndent = rawText.slice(0, pos);
    const { indentStyle, indentLevel } = classifyIndent(rawIndent, spaceUnit);
    const indentSpan = { from: lineFrom, to: lineFrom + rawIndent.length };
    const tokens: Token[] = [];

    while (pos < rawText.length) {
      const ch = rawText[pos];
      if (ch === ' ' || ch === '\t') {
        pos++;
        continue;
      }

      const rest = rawText.slice(pos);
      const tokenFrom = lineFrom + pos;
      const col = pos + 1;

      if (ch === '(') {
        tokens.push({ kind: 'lparen', value: '(', from: tokenFrom, to: tokenFrom + 1, line: lineNumber, col });
        pos++;
        continue;
      }

      if (ch === ')') {
        tokens.push({ kind: 'rparen', value: ')', from: tokenFrom, to: tokenFrom + 1, line: lineNumber, col });
        pos++;
        continue;
      }

      if (ch === ',') {
        tokens.push({ kind: 'comma', value: ',', from: tokenFrom, to: tokenFrom + 1, line: lineNumber, col });
        pos++;
        continue;
      }

      const cmpMatch = CMP_OP_RE.exec(rest);
      if (cmpMatch) {
        const value = cmpMatch[0];
        tokens.push({ kind: 'cmpOp', value, from: tokenFrom, to: tokenFrom + value.length, line: lineNumber, col });
        pos += value.length;
        continue;
      }

      const logicMatch = LOGIC_OP_RE.exec(rest);
      if (logicMatch) {
        const value = logicMatch[0];
        tokens.push({ kind: 'logicOp', value, from: tokenFrom, to: tokenFrom + value.length, line: lineNumber, col });
        pos += value.length;
        continue;
      }

      if (ch === '-' && canStartUnaryMinus(tokens[tokens.length - 1])) {
        const negMatch = NUMBER_RE.exec(rest.slice(1));
        if (negMatch) {
          const value = '-' + negMatch[0];
          tokens.push({ kind: 'number', value, from: tokenFrom, to: tokenFrom + value.length, line: lineNumber, col });
          pos += value.length;
          continue;
        }
      }

      const numMatch = NUMBER_RE.exec(rest);
      if (numMatch) {
        const value = numMatch[0];
        tokens.push({ kind: 'number', value, from: tokenFrom, to: tokenFrom + value.length, line: lineNumber, col });
        pos += value.length;
        continue;
      }

      const identMatch = IDENT_RE.exec(rest);
      if (identMatch) {
        const value = identMatch[0];
        const kind: TokenKind = value === 'true' || value === 'false' ? 'boolean' : 'ident';
        tokens.push({ kind, value, from: tokenFrom, to: tokenFrom + value.length, line: lineNumber, col });
        pos += value.length;
        continue;
      }

      tokens.push({ kind: 'unknown', value: ch ?? '', from: tokenFrom, to: tokenFrom + 1, line: lineNumber, col });
      pos++;
    }

    lines.push({
      lineNumber,
      lineFrom,
      lineTo,
      rawText,
      rawIndent,
      indentStyle,
      indentLevel,
      indentSpan,
      tokens,
    });

    offset += segment.length + 1;
  }

  return lines;
}
