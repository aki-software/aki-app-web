const DECIMAL = /^(0|[1-9]\d*)(?:\.(\d+))?$/;

function parts(value: string): [string, string] {
  const match = DECIMAL.exec(value);
  if (!match)
    throw new Error('Amount must be a canonical non-negative decimal');
  return [match[1], match[2] ?? ''];
}

export function decimalToMinorUnits(value: string, scale: number): bigint {
  const [whole, fraction] = parts(value);
  if (fraction.length > scale) throw new Error('Amount exceeds currency scale');
  return BigInt(`${whole}${fraction.padEnd(scale, '0')}`);
}

export function minorUnitsToDecimal(value: bigint, scale: number): string {
  if (value < 0n) throw new Error('Amount must be non-negative');
  const digits = value.toString().padStart(scale + 1, '0');
  return scale === 0
    ? digits
    : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

/** Multiplies positive decimal values and rounds the result to scale with ROUND_HALF_UP. */
export function multiplyAndRoundHalfUp(
  amount: string,
  rate: string,
  scale: number,
): string {
  const [amountWhole, amountFraction] = parts(amount);
  const [rateWhole, rateFraction] = parts(rate);
  const left = BigInt(`${amountWhole}${amountFraction}`);
  const right = BigInt(`${rateWhole}${rateFraction}`);
  if (left <= 0n || right <= 0n)
    throw new Error('Amount and rate must be positive');
  const inputScale = amountFraction.length + rateFraction.length;
  const product = left * right;
  if (inputScale <= scale)
    return minorUnitsToDecimal(
      product * 10n ** BigInt(scale - inputScale),
      scale,
    );
  const divisor = 10n ** BigInt(inputScale - scale);
  return minorUnitsToDecimal((product + divisor / 2n) / divisor, scale);
}
