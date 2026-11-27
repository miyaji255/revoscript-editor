import {
  acceptCompletion,
  completionKeymap,
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionSource,
} from '@codemirror/autocomplete';
import { Prec } from '@codemirror/state';
import { keymap, type KeyBinding } from '@codemirror/view';
import { COMMANDS, COMMAND_MAP, ENUM_VALUES, VARIABLES, type Locale } from '../core/spec.ts';
import { localeFacet } from './revoFacet.ts';

export const revoCompletionKeyBindings: readonly KeyBinding[] = [
  ...completionKeymap.filter((binding) => binding.key !== 'Enter'),
  { key: 'Tab', run: acceptCompletion },
];

export const revoCompletionKeymap = Prec.highest(keymap.of(revoCompletionKeyBindings));

function createCommandCompletion(cmdName: string, locale: Locale): Completion {
  const cmd = COMMAND_MAP.get(cmdName)!;
  const detailSuffix = cmd.signature.startsWith(cmd.name)
    ? cmd.signature.slice(cmd.name.length).trim()
    : cmd.signature;
  return snippetCompletion(cmd.cmSnippet ?? cmd.snippet, {
    label: cmd.name,
    type: cmd.isBlock ? 'keyword' : 'function',
    detail: detailSuffix || undefined,
    info: cmd.description[locale],
    boost: cmd.category === 'control' ? 2 : 1,
  });
}

export function getCallContext(
  beforeCursor: string,
): { cmdName: string; argIndex: number } | null {
  const firstOpenIdx = beforeCursor.indexOf('(');
  if (firstOpenIdx === -1) {
    return null;
  }

  const head = beforeCursor.slice(0, firstOpenIdx).trim();
  const cmdName = head.endsWith('else if')
    ? 'else if'
    : /([A-Za-z_][A-Za-z0-9_]*)$/.exec(head)?.[1];
  if (!cmdName) {
    return null;
  }

  let depth = 0;
  let argIndex = 0;
  for (let i = firstOpenIdx; i < beforeCursor.length; i++) {
    const ch = beforeCursor[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth <= 0) {
        return null;
      }
    } else if (ch === ',' && depth === 1) {
      argIndex++;
    }
  }

  return depth > 0 ? { cmdName, argIndex } : null;
}

export const revoCompletionSource: CompletionSource = (context: CompletionContext) => {
  const locale = context.state.facet(localeFacet);
  const line = context.state.doc.lineAt(context.pos);
  const beforeCursor = line.text.slice(0, context.pos - line.from);
  const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_]*/);

  if (
    !context.explicit &&
    !word &&
    !beforeCursor.endsWith('(') &&
    !beforeCursor.endsWith(', ')
  ) {
    return null;
  }

  const from = word ? word.from : context.pos;
  const callCtx = getCallContext(beforeCursor);

  if (callCtx) {
    const spec = COMMAND_MAP.get(callCtx.cmdName);
    const param = spec?.params[callCtx.argIndex];

    if (spec?.params[0]?.type === 'condition') {
      const options: Completion[] = [
        ...VARIABLES.map((v) => ({
          label: v.name,
          type: 'variable',
          detail: v.category,
          info: v.description[locale],
        })),
        { label: 'true', type: 'keyword', detail: 'boolean' },
        { label: 'false', type: 'keyword', detail: 'boolean' },
      ];
      return { from, options };
    }

    if (param?.type === 'dtBranch') {
      return {
        from,
        options: ENUM_VALUES.dtBranch.map((branch) => ({
          label: branch,
          type: 'enum',
          detail: 'DTU branch',
          info: param.description[locale],
        })),
      };
    }

    if (param?.type === 'element') {
      return {
        from,
        options: ENUM_VALUES.element.map((el) => ({
          label: el,
          type: 'enum',
          detail: 'Element',
          info: param.description[locale],
        })),
      };
    }

    if (param?.type === 'boolean') {
      return {
        from,
        options: [
          {
            label: 'true',
            type: 'keyword',
            detail: 'boolean',
            info: param.description[locale],
          },
          {
            label: 'false',
            type: 'keyword',
            detail: 'boolean',
            info: param.description[locale],
          },
        ],
      };
    }

    return null;
  }

  const trimmedBefore = beforeCursor.trimStart();
  const elseIfMatch = /^(else\s+[A-Za-z_]*)$/.exec(trimmedBefore);
  if (elseIfMatch) {
    const start = context.pos - elseIfMatch[1]!.length;
    return {
      from: start,
      options: [createCommandCompletion('else if', locale)],
    };
  }

  if (!trimmedBefore.includes('(') && !trimmedBefore.includes(' ')) {
    return {
      from,
      options: COMMANDS.map((cmd) => createCommandCompletion(cmd.name, locale)),
    };
  }

  if (trimmedBefore === 'else' || trimmedBefore.startsWith('else ')) {
    const elseIdx = line.text.lastIndexOf('else');
    return {
      from: line.from + elseIdx,
      options: [createCommandCompletion('else if', locale)],
    };
  }

  return null;
};
