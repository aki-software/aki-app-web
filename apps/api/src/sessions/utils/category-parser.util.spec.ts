import {
  normalizeCategoryId,
  normalizePercentage,
  parseCategoryDescription,
} from './category-parser.util.js';

describe('category-parser.util', () => {
  it('normalizes category id', () => {
    expect(normalizeCategoryId('  mech  ')).toBe('MECH');
  });

  it('normalizes percentage', () => {
    expect(normalizePercentage(120)).toBe(100);
    expect(normalizePercentage(-10)).toBe(0);
    expect(normalizePercentage(50.5)).toBe(51);
  });

  it('parses description with labels', () => {
    const desc =
      'Descripcion breve: Hola mundo.\n\nCompetencias importantes: Saber mucho.';
    const parsed = parseCategoryDescription(desc);

    expect(parsed.length).toBe(2);
    expect(parsed[0].subtitle).toBe('Descripcion breve');
    expect(parsed[0].content).toBe('Hola mundo.');
    expect(parsed[1].subtitle).toBe('Competencias importantes');
    expect(parsed[1].content).toBe('Saber mucho.');
  });
});
