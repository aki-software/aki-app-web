import {
  decimalToMinorUnits,
  multiplyAndRoundHalfUp,
  minorUnitsToDecimal,
} from './checkout-money';

describe('checkout money', () => {
  it('preserves canonical USD decimals without Number conversion', () => {
    expect(decimalToMinorUnits('10.00', 2)).toBe(1000n);
    expect(minorUnitsToDecimal(1000n, 2)).toBe('10.00');
  });

  it.each([
    ['1.005', '1', '1.01'],
    ['1.004', '1', '1.00'],
    ['10.00', '1500', '15000.00'],
  ])(
    'uses ROUND_HALF_UP for Mercado Pago amounts',
    (amount, rate, expected) => {
      expect(multiplyAndRoundHalfUp(amount, rate, 2)).toBe(expected);
    },
  );

  it('rejects non-canonical and over-scale values', () => {
    expect(() => decimalToMinorUnits('01.00', 2)).toThrow();
    expect(() => decimalToMinorUnits('1.001', 2)).toThrow();
    expect(() => multiplyAndRoundHalfUp('1', '0', 2)).toThrow();
  });
});
