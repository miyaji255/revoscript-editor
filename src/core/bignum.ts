export interface BigNum {
  readonly sign: -1 | 0 | 1;
  readonly mantissa: number;
  readonly exponent: number;
}

const BIG_NUM_RE = /^([+-])?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/;

export function parseBigNum(input: string): BigNum | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const match = BIG_NUM_RE.exec(trimmed);
  if (!match) {
    return null;
  }

  const sign: -1 | 1 = match[1] === '-' ? -1 : 1;
  const intPart = match[2] ?? '';
  const fracPart = match[3] ?? match[4] ?? '';
  const expPart = match[5] ? Number.parseInt(match[5], 10) : 0;

  if (!Number.isFinite(expPart)) {
    return null;
  }

  const combined = intPart + fracPart;
  let firstNonZero = -1;
  for (let i = 0; i < combined.length; i++) {
    if (combined[i] !== '0') {
      firstNonZero = i;
      break;
    }
  }

  if (firstNonZero === -1) {
    return { sign: 0, mantissa: 0, exponent: 0 };
  }

  const significant = combined.slice(firstNonZero, firstNonZero + 16);
  const mantissaStr =
    significant.length > 1
      ? `${significant[0]}.${significant.slice(1)}`
      : significant[0]!;
  let mantissa = Number(mantissaStr);
  let exponent = intPart.length - 1 - firstNonZero + expPart;

  if (mantissa >= 10) {
    mantissa /= 10;
    exponent += 1;
  }

  return { sign, mantissa, exponent };
}

export function formatBigNum(num: BigNum): string {
  if (num.sign === 0) {
    return '0';
  }
  const prefix = num.sign < 0 ? '-' : '';
  if (Math.abs(num.exponent) < 6) {
    const val = num.sign * num.mantissa * Math.pow(10, num.exponent);
    return Number.isInteger(val) ? String(val) : String(Number(val.toPrecision(6)));
  }
  return `${prefix}${Number(num.mantissa.toPrecision(4))}e${num.exponent}`;
}

export function compareBigNum(a: BigNum, b: BigNum): -1 | 0 | 1 {
  if (a.sign !== b.sign) {
    return a.sign < b.sign ? -1 : 1;
  }
  if (a.sign === 0) {
    return 0;
  }

  if (a.exponent !== b.exponent) {
    const cmp = a.exponent < b.exponent ? -1 : 1;
    return a.sign === 1 ? cmp : ((-cmp) as -1 | 1);
  }

  const diff = a.mantissa - b.mantissa;
  if (Math.abs(diff) <= 1e-12) {
    return 0;
  }
  const cmp = diff < 0 ? -1 : 1;
  return a.sign === 1 ? cmp : ((-cmp) as -1 | 1);
}

export function compareValues(left: BigNum, op: string, right: BigNum): boolean {
  const cmp = compareBigNum(left, right);
  switch (op) {
    case '==':
      return cmp === 0;
    case '!=':
      return cmp !== 0;
    case '>=':
      return cmp >= 0;
    case '<=':
      return cmp <= 0;
    case '>':
      return cmp > 0;
    case '<':
      return cmp < 0;
    default:
      return false;
  }
}
