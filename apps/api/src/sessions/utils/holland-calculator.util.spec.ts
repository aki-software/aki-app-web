import { calculateHollandPercentages } from './holland-calculator.util.js';

describe('calculateHollandPercentages', () => {
  it('groups categories correctly', () => {
    const results = [
      { categoryId: 'MECH', percentage: 80 },
      { categoryId: 'PHYS', percentage: 90 },
      { categoryId: 'SCI', percentage: 70 },
      { categoryId: 'LEAD', percentage: 50 },
    ];

    const holland = calculateHollandPercentages(results);

    expect(holland['R']).toBe(85); // (80 + 90) / 2
    expect(holland['I']).toBe(70); // 70 / 1
    expect(holland['E']).toBe(50); // 50 / 1
    expect(holland['A']).toBe(0);
    expect(holland['S']).toBe(0);
    expect(holland['C']).toBe(0);
  });
});
