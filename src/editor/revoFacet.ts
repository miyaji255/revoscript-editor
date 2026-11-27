import { Facet } from '@codemirror/state';
import type { Locale } from '../core/spec.ts';

export const localeFacet = Facet.define<Locale, Locale>({
  combine: (values) => values[values.length - 1] ?? 'ja',
});
