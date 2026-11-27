import { indentLess, indentMore, insertTab } from '@codemirror/commands';
import {
  foldService,
  indentService,
  indentUnit,
  LanguageSupport,
  StreamLanguage,
} from '@codemirror/language';
import type { StateCommand, Text } from '@codemirror/state';
import type { KeyBinding } from '@codemirror/view';
import { parse, type ParseResult } from '../core/parser.ts';
import { COMMAND_MAP, ENUM_VALUES, VARIABLE_MAP } from '../core/spec.ts';
import { revoCompletionSource } from './revoCompletion.ts';
import { localeFacet } from './revoFacet.ts';

export { localeFacet };

const DT_BRANCHES = new Set<string>(ENUM_VALUES.dtBranch);
const ELEMENTS = new Set<string>(ENUM_VALUES.element);
const KEYWORDS = new Set<string>(['if', 'else', 'Repeat', 'RepeatUntil', 'WaitUntil']);

type PrevKind = 'lparen' | 'comma' | 'operator' | 'other' | null;

interface StreamState {
  prevKind: PrevKind;
}

const NUMBER_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const NEG_NUMBER_PATTERN = /^-(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;

export const revoStreamLanguage = StreamLanguage.define<StreamState>({
  startState: () => ({ prevKind: null }),
  token(stream, state) {
    if (stream.sol()) {
      state.prevKind = null;
    }

    if (stream.eatSpace()) {
      return null;
    }

    if (
      (state.prevKind === 'lparen' ||
        state.prevKind === 'comma' ||
        state.prevKind === 'operator') &&
      stream.match(NEG_NUMBER_PATTERN)
    ) {
      state.prevKind = 'other';
      return 'number';
    }

    if (stream.match(NUMBER_PATTERN)) {
      state.prevKind = 'other';
      return 'number';
    }

    if (stream.match(/^(?:>=|<=|==|!=|&&|\|\||\^|>|<)/)) {
      state.prevKind = 'operator';
      return 'operator';
    }

    if (stream.eat('(')) {
      state.prevKind = 'lparen';
      return 'paren';
    }

    if (stream.eat(')')) {
      state.prevKind = 'other';
      return 'paren';
    }

    if (stream.eat(',')) {
      state.prevKind = 'comma';
      return 'separator';
    }

    if (stream.match(/^[A-Za-z_][A-Za-z0-9_]*/)) {
      const word = stream.current();
      state.prevKind = 'other';
      if (KEYWORDS.has(word)) {
        return 'keyword';
      }
      if (word === 'true' || word === 'false') {
        return 'bool';
      }
      if (VARIABLE_MAP.has(word)) {
        return 'variableName';
      }
      if (DT_BRANCHES.has(word) || ELEMENTS.has(word)) {
        return 'atom';
      }
      if (COMMAND_MAP.has(word)) {
        return 'variableName.function';
      }
      return null;
    }

    state.prevKind = 'other';
    stream.next();
    return null;
  },
});

const parseCache = new WeakMap<Text, ParseResult>();

export function getCachedParse(doc: Text): ParseResult {
  let cached = parseCache.get(doc);
  if (!cached) {
    cached = parse(doc.toString());
    parseCache.set(doc, cached);
  }
  return cached;
}

export const revoFoldService = foldService.of((state, lineStart) => {
  const line = state.doc.lineAt(lineStart);
  const { ast } = getCachedParse(state.doc);

  const stack = [...ast.body];
  while (stack.length > 0) {
    const stmt = stack.shift()!;
    if (stmt.kind !== 'BlockStatement') {
      continue;
    }
    if (stmt.headerSpan.line === line.number && stmt.body.length > 0 && stmt.span.to > line.to) {
      return { from: line.to, to: stmt.span.to };
    }
    stack.push(...stmt.body);
  }

  return null;
});

const BLOCK_HEADER_RE = /^(?:if|else\s+if|Repeat|RepeatUntil)\s*\(.*\)\s*$|^else\s*$/;

export const revoIndentExtensions = [
  indentUnit.of('\t'),
  indentService.of((context, pos) => {
    const line = context.state.doc.lineAt(pos);
    let prevNum = line.number - 1;
    while (prevNum >= 1) {
      const prevLine = context.state.doc.line(prevNum);
      const trimmed = prevLine.text.trim();
      if (trimmed.length > 0) {
        let indent = context.lineIndent(prevLine.from);
        if (BLOCK_HEADER_RE.test(trimmed)) {
          indent += context.unit;
        }
        return indent;
      }
      prevNum--;
    }
    return 0;
  }),
];

export const smartTabCommand: StateCommand = (target) => {
  const { ranges } = target.state.selection;
  if (ranges.some((range) => !range.empty)) {
    return indentMore(target);
  }

  const allInLeadingIndent = ranges.every((range) => {
    const line = target.state.doc.lineAt(range.from);
    const beforeCaret = line.text.slice(0, range.from - line.from);
    return /^[\t ]*$/.test(beforeCaret);
  });

  return allInLeadingIndent ? indentMore(target) : insertTab(target);
};

export const revoTabKeyBinding: KeyBinding = {
  key: 'Tab',
  run: smartTabCommand,
  shift: indentLess,
};

export function revoLanguageSupport(): LanguageSupport {
  return new LanguageSupport(revoStreamLanguage, [
    revoStreamLanguage.data.of({ autocomplete: revoCompletionSource }),
    revoFoldService,
    ...revoIndentExtensions,
  ]);
}
