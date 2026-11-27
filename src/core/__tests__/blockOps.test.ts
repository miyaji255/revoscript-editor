import { describe, expect, it } from 'vitest';
import {
  deleteBlockAtLine,
  duplicateBlockAtLine,
  moveBlockAtLine,
} from '../blockOps.ts';

describe('blockOps', () => {
  const sample = [
    'if (IP >= 10)',
    '\tPrestige()',
    '\tPromote(0)',
    'Repeat (2, false)',
    '\tInfinite()',
    'Restart()',
    '',
  ].join('\n');

  it('moves nested blocks up and down cleanly', () => {
    const movedDown = moveBlockAtLine(sample, 1, 'down');
    expect(movedDown).toBe(
      [
        'Repeat (2, false)',
        '\tInfinite()',
        'if (IP >= 10)',
        '\tPrestige()',
        '\tPromote(0)',
        'Restart()',
        '',
      ].join('\n'),
    );

    const movedBack = moveBlockAtLine(movedDown, 3, 'up');
    expect(movedBack).toBe(sample);
  });

  it('duplicates and deletes nested blocks including their children', () => {
    const duplicated = duplicateBlockAtLine(sample, 4);
    expect(duplicated).toBe(
      [
        'if (IP >= 10)',
        '\tPrestige()',
        '\tPromote(0)',
        'Repeat (2, false)',
        '\tInfinite()',
        'Repeat (2, false)',
        '\tInfinite()',
        'Restart()',
        '',
      ].join('\n'),
    );

    const deleted = deleteBlockAtLine(sample, 1);
    expect(deleted).toBe(
      ['Repeat (2, false)', '\tInfinite()', 'Restart()', ''].join('\n'),
    );
  });
});
