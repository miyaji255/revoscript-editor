import { describe, expect, it } from 'vitest';
import { compareBigNum, compareValues, parseBigNum } from '../bignum.ts';

describe('bignum', () => {
  it('parses integers, decimals, scientific notation, and huge exponents without overflow', () => {
    expect(parseBigNum('0.00')).toEqual({ sign: 0, mantissa: 0, exponent: 0 });
    expect(parseBigNum('1.00e80')).toEqual({ sign: 1, mantissa: 1, exponent: 80 });
    expect(parseBigNum('1.e50')).toEqual({ sign: 1, mantissa: 1, exponent: 50 });
    expect(parseBigNum('100e9000')).toEqual({ sign: 1, mantissa: 1, exponent: 9002 });
    expect(parseBigNum('1e100000')).toEqual({ sign: 1, mantissa: 1, exponent: 100000 });
    expect(parseBigNum('-2.5e3')).toEqual({ sign: -1, mantissa: 2.5, exponent: 3 });
    expect(parseBigNum('0.005')).toEqual({ sign: 1, mantissa: 5, exponent: -3 });
    expect(parseBigNum('not-a-number')).toBeNull();
  });

  it('compares arbitrary-exponent values accurately', () => {
    const a = parseBigNum('99e9000')!;
    const b = parseBigNum('1.00e9002')!;
    const c = parseBigNum('100e9000')!;

    expect(compareBigNum(a, b)).toBe(-1);
    expect(compareBigNum(b, c)).toBe(0);
    expect(compareValues(b, '==', c)).toBe(true);
    expect(compareValues(a, '<', b)).toBe(true);
    expect(compareValues(parseBigNum('-10')!, '<', parseBigNum('-5')!)).toBe(true);
    expect(compareValues(parseBigNum('0')!, '==', parseBigNum('0.00')!)).toBe(true);
  });
});
