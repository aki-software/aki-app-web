import { Injectable } from '@nestjs/common';

/**
 * Mapeo de categorías vocacionales a las dimensiones de Holland.
 * R = Realista, I = Investigador, A = Artístico, S = Social, E = Emprendedor, C = Convencional
 */
const CATEGORY_TO_HOLLAND: Record<string, string> = {
  MECH: 'R',
  PHYS: 'R',
  IND: 'R',
  NAT: 'R',
  SCI: 'I',
  ART: 'A',
  HUM: 'A',
  SERV: 'S',
  PROT: 'S',
  LEAD: 'E',
  SAL: 'E',
  BUS: 'C',
};

@Injectable()
export class HollandCalculatorService {
  /**
   * Calcula los porcentajes por dimensión de Holland a partir de los resultados de categorías.
   * Cada dimensión Holland puede agrupar múltiples categorías; el valor final es el promedio.
   */
  calculatePercentages(
    results: Array<{ categoryId: string; percentage: number }>,
  ): Record<string, number> {
    const scores: Record<string, number[]> = {
      R: [],
      I: [],
      A: [],
      S: [],
      E: [],
      C: [],
    };

    for (const res of results) {
      const hollandType = CATEGORY_TO_HOLLAND[res.categoryId.toUpperCase()];
      if (hollandType) {
        scores[hollandType].push(res.percentage);
      }
    }

    const finalPercentages: Record<string, number> = {};
    for (const [type, typeScores] of Object.entries(scores)) {
      if (typeScores.length > 0) {
        const avg = typeScores.reduce((a, b) => a + b, 0) / typeScores.length;
        finalPercentages[type] = Math.round(avg);
      } else {
        finalPercentages[type] = 0;
      }
    }

    return finalPercentages;
  }
}
