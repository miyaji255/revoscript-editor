import { describe, expect, it } from 'vitest';
import { parse } from '../parser.ts';
import {
  createSimulator,
  extractUsedVariables,
  runSimulatorSteps,
  stepSimulator,
} from '../simulator.ts';

describe('simulator', () => {
  it('extracts unique variables referenced in conditions in order', () => {
    const { ast } = parse(
      'WaitUntil (IP >= 1000)\nif (Score >= 100e9000 && IP > 0)\n\tEternate()\nelse if (Supernova < 37)\n\tPrestige()',
    );
    expect(extractUsedVariables(ast)).toEqual(['IP', 'Score', 'Supernova']);
  });

  it('evaluates if / else if / else branching and skips subsequent branches once matched', () => {
    const { ast } = parse(
      [
        'if (EP == 0.00)',
        '\tPrestige()',
        'else if (Supernova < 37)',
        '\tEternate()',
        'else',
        '\tInfinite()',
      ].join('\n'),
    );

    const end1 = runSimulatorSteps(createSimulator(ast), { EP: '0', Supernova: '10' }, 20);
    expect(end1.logs.filter((l) => l.kind === 'action').map((l) => l.text)).toEqual([
      'Prestige()',
    ]);

    const end2 = runSimulatorSteps(createSimulator(ast), { EP: '5', Supernova: '40' }, 20);
    expect(end2.logs.filter((l) => l.kind === 'action').map((l) => l.text)).toEqual([
      'Infinite()',
    ]);
  });

  it('evaluates logical operators strictly left-to-right', () => {
    // In Revolution Idle, (false && false) || true -> true,
    // whereas (true || false) && false -> (true) && false -> false!
    const { ast } = parse(
      [
        'if (IP > 10 || EP > 10 && Score > 10)',
        '\tPrestige()',
        'else',
        '\tInfinite()',
      ].join('\n'),
    );

    const state = runSimulatorSteps(
      createSimulator(ast),
      { IP: '100', EP: '0', Score: '0' },
      20,
    );
    expect(state.logs.filter((l) => l.kind === 'action').map((l) => l.text)).toEqual([
      'Infinite()',
    ]);
  });

  it('supports Repeat count, RepeatUntil pre-check, WaitUntil, WaitForSeconds, Restart, and Stop', () => {
    const repeatAst = parse('Repeat (3, false)\n\tPromote(0)\nStop()\nPrestige()').ast;
    const repeatEnd = runSimulatorSteps(createSimulator(repeatAst), {}, 30);
    expect(repeatEnd.status).toBe('stopped');
    expect(repeatEnd.logs.filter((l) => l.kind === 'action').map((l) => l.text)).toEqual([
      'Promote(0)',
      'Promote(0)',
      'Promote(0)',
    ]);

    const repeatUntilAst = parse('RepeatUntil (IP >= 100)\n\tInfinite()').ast;
    const skipped = runSimulatorSteps(createSimulator(repeatUntilAst), { IP: '100' }, 10);
    expect(skipped.logs.filter((l) => l.kind === 'action')).toHaveLength(0);

    const waitAst = parse('WaitUntil (Score >= 100e9000)\nWaitForSeconds(2.5)\nPrestige()').ast;
    let sim = stepSimulator(createSimulator(waitAst), { Score: '1e5000' });
    expect(sim.status).toBe('waiting');
    expect(sim.waitingKind).toBe('until');

    sim = stepSimulator(sim, { Score: '1.5e9002' });
    expect(sim.status).toBe('running');
    expect(sim.activeLine).toBe(2);

    sim = runSimulatorSteps(sim, { Score: '1.5e9002' }, 10);
    expect(sim.status).toBe('completed');
    expect(sim.simulatedSeconds).toBe(2.5);
    expect(sim.logs.some((l) => l.text === 'Prestige()')).toBe(true);
  });

  it('handles Restart() back to line 1', () => {
    const { ast } = parse('Prestige()\nRestart()');
    const sim = runSimulatorSteps(createSimulator(ast), {}, 5);
    expect(sim.logs.filter((l) => l.text === 'Prestige()').length).toBeGreaterThanOrEqual(2);
  });
});
