import { RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';

export const setActiveSimLine = StateEffect.define<number | null>();

const simLineDecoration = Decoration.line({
  attributes: { class: 'cm-sim-active-line' },
});

function buildLineDeco(docLines: number, lineNumber: number | null, getLineFrom: (ln: number) => number): DecorationSet {
  if (lineNumber === null || lineNumber < 1 || lineNumber > docLines) {
    return Decoration.none;
  }
  const builder = new RangeSetBuilder<Decoration>();
  builder.add(getLineFrom(lineNumber), getLineFrom(lineNumber), simLineDecoration);
  return builder.finish();
}

export const simHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setActiveSimLine)) {
        return buildLineDeco(
          tr.state.doc.lines,
          effect.value,
          (ln) => tr.state.doc.line(ln).from,
        );
      }
    }
    if (tr.docChanged) {
      return decorations.map(tr.changes);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});
