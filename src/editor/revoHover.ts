import { hoverTooltip } from '@codemirror/view';
import { COMMAND_MAP, ENUM_VALUES, VARIABLE_MAP } from '../core/spec.ts';
import { localeFacet } from './revoFacet.ts';

const DT_BRANCH_SET = new Set<string>(ENUM_VALUES.dtBranch);
const ELEMENT_SET = new Set<string>(ENUM_VALUES.element);
const WORD_CHAR_RE = /[A-Za-z0-9_]/;

function buildHoverDom(
  badge: string,
  titleText: string,
  descriptionText: string,
  extraLines: string[] = [],
): HTMLElement {
  const dom = document.createElement('div');
  dom.className = 'revo-hover-card';

  const head = document.createElement('div');
  head.className = 'revo-hover-head';

  const title = document.createElement('strong');
  title.textContent = titleText;

  const pill = document.createElement('span');
  pill.className = 'revo-hover-badge';
  pill.textContent = badge;

  head.append(title, pill);

  const desc = document.createElement('p');
  desc.className = 'revo-hover-desc';
  desc.textContent = descriptionText;

  dom.append(head, desc);

  if (extraLines.length > 0) {
    const list = document.createElement('ul');
    list.className = 'revo-hover-params';
    for (const item of extraLines) {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    }
    dom.append(list);
  }

  return dom;
}

export const revoHoverTooltip = hoverTooltip((view, pos, side) => {
  const line = view.state.doc.lineAt(pos);
  const localPos = pos - line.from;
  const chAt = line.text[localPos] ?? '';
  const chBefore = localPos > 0 ? (line.text[localPos - 1] ?? '') : '';

  if (side > 0 && !WORD_CHAR_RE.test(chAt)) {
    return null;
  }
  if (side < 0 && !WORD_CHAR_RE.test(chBefore)) {
    return null;
  }

  let start = localPos;
  let end = localPos;
  while (start > 0 && WORD_CHAR_RE.test(line.text[start - 1] ?? '')) {
    start--;
  }
  while (end < line.text.length && WORD_CHAR_RE.test(line.text[end] ?? '')) {
    end++;
  }

  if (start === end) {
    return null;
  }

  let word = line.text.slice(start, end);
  let absStart = line.from + start;
  let absEnd = line.from + end;

  if (word === 'else' && /^\s*$/.test(line.text.slice(0, start))) {
    const after = line.text.slice(end);
    const ifMatch = /^(\s+if)\b/.exec(after);
    if (ifMatch) {
      word = 'else if';
      absEnd = line.from + end + ifMatch[1]!.length;
    }
  } else if (word === 'if') {
    const before = line.text.slice(0, start);
    const elseMatch = /^\s*(else\s+)$/.exec(before);
    if (elseMatch) {
      word = 'else if';
      absStart = line.from + start - elseMatch[1]!.length;
    }
  }

  const locale = view.state.facet(localeFacet);
  const cmd = COMMAND_MAP.get(word);
  if (cmd) {
    const params = cmd.params.map((p) => `${p.name} (${p.type}): ${p.description[locale]}`);
    if (cmd.notes) {
      params.push(cmd.notes[locale]);
    }
    return {
      pos: absStart,
      end: absEnd,
      above: true,
      create() {
        return {
          dom: buildHoverDom(cmd.category, cmd.signature, cmd.description[locale], params),
        };
      },
    };
  }

  const variable = VARIABLE_MAP.get(word);
  if (variable) {
    return {
      pos: absStart,
      end: absEnd,
      above: true,
      create() {
        return {
          dom: buildHoverDom(
            locale === 'ja' ? '変数' : 'variable',
            variable.name,
            variable.description[locale],
          ),
        };
      },
    };
  }

  if (DT_BRANCH_SET.has(word)) {
    return {
      pos: absStart,
      end: absEnd,
      above: true,
      create() {
        return {
          dom: buildHoverDom(
            'DTU',
            word,
            locale === 'ja'
              ? 'DTU(branch, row, level) で使用するダイレーションツリーブランチ定数。'
              : 'Dilation Tree branch constant used in DTU(branch, row, level).',
          ),
        };
      },
    };
  }

  if (ELEMENT_SET.has(word)) {
    return {
      pos: absStart,
      end: absEnd,
      above: true,
      create() {
        return {
          dom: buildHoverDom(
            'Element',
            word,
            locale === 'ja'
              ? 'GenerateElement(element) で使用する元素タイプ定数。'
              : 'Element constant used in GenerateElement(element).',
          ),
        };
      },
    };
  }

  return null;
});
