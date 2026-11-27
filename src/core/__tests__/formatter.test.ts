import { describe, expect, it } from 'vitest';
import { formatRevoScript } from '../formatter.ts';

describe('formatRevoScript', () => {
  it('normalizes indentation to tabs and formats spacing around parens, commas, and operators', () => {
    const input = [
      'if(IP>=1000&&Score<1.00e80)',
      '    BreakInfinity( false )',
      '    Repeat(9,false)',
      '        EnterIC(1,true)',
      'else   if(EP==0)',
      '    Eternate( )',
      'else',
      '    Restart()',
    ].join('\n');

    const expected = [
      'if (IP >= 1000 && Score < 1.00e80)',
      '\tBreakInfinity(false)',
      '\tRepeat (9, false)',
      '\t\tEnterIC(1, true)',
      'else if (EP == 0)',
      '\tEternate()',
      'else',
      '\tRestart()',
      '',
    ].join('\n');

    const formatted = formatRevoScript(input);
    expect(formatted).toBe(expected);
    expect(formatRevoScript(formatted)).toBe(formatted);
  });

  it('preserves malformed lines without discarding user text', () => {
    const input = 'WaitForSeconds(1.0\nPrestige( )';
    const formatted = formatRevoScript(input);
    expect(formatted).toBe('WaitForSeconds(1.0\nPrestige()\n');
  });

  it('collapses multiple blank lines to a single blank line', () => {
    const input = 'Prestige()\n\n\n\nRestart()\n';
    expect(formatRevoScript(input)).toBe('Prestige()\n\nRestart()\n');
  });

  it('preserves nested hierarchy when formatting 2-space indented scripts', () => {
    const input = ['if (IP > 0)', '  Repeat (2, false)', '    Prestige()'].join('\n');
    expect(formatRevoScript(input)).toBe('if (IP > 0)\n\tRepeat (2, false)\n\t\tPrestige()\n');
  });
});
