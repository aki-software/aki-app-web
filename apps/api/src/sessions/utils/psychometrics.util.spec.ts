import { calculateHollandProfile } from './psychometrics.util.js';

// Helper para construir un swipe con timestamp en offset de ms desde un base
function makeSwipe(
  categoryId: string,
  liked: boolean,
  offsetMs: number,
  base = new Date('2024-01-01T10:00:00.000Z').getTime(),
): { categoryId: string; liked: boolean; timestamp: string } {
  return {
    categoryId,
    liked,
    timestamp: new Date(base + offsetMs).toISOString(),
  };
}

describe('calculateHollandProfile', () => {
  // ─── Casos base ────────────────────────────────────────────────────────────

  it('returns empty profile when swipes is empty', () => {
    const result = calculateHollandProfile([]);
    expect(result.hollandCode).toBe('');
    expect(result.top3).toHaveLength(0);
    expect(result.radar).toHaveLength(0);
  });

  it('normalizes categoryId to uppercase', () => {
    const swipes = [makeSwipe('art', true, 1000), makeSwipe('art', false, 2000)];
    const result = calculateHollandProfile(swipes);
    expect(result.radar[0].categoryId).toBe('ART');
  });

  // ─── Spec REQ-01: Weighted Category Scoring ────────────────────────────────

  describe('Spec: Weighted Category Scoring', () => {
    it('uses rawScore as the primary metric', () => {
      const swipes = [
        makeSwipe('ART', true, 1000),
        makeSwipe('ART', true, 2000),
        makeSwipe('SCI', true, 1000),
        makeSwipe('SCI', false, 2000),
      ];

      const result = calculateHollandProfile(swipes);
      // ART tiene 2 likes, SCI tiene 1
      expect(result.top3[0].categoryId).toBe('ART');
      expect(result.top3[1].categoryId).toBe('SCI');
    });

    it('breaks ties using weightedScore (faster average response wins)', () => {
      const swipes = [
        // ART: 2 likes, total time = 1000 + 500 = 1500 (avg 750ms) -> más rápido
        makeSwipe('ART', true, 1000), // First swipe gets default 1500ms
        makeSwipe('ART', true, 1500), // Diff: 500ms
        // SCI: 2 likes, total time = 3000 + 4000 = 7000 (avg 3500ms) -> más lento
        makeSwipe('SCI', true, 4500), // Diff: 3000ms
        makeSwipe('SCI', true, 8500), // Diff: 4000ms
      ];

      const result = calculateHollandProfile(swipes);

      // ART debe estar rankeado más alto que SCI
      expect(result.top3[0].categoryId).toBe('ART');
      expect(result.top3[1].categoryId).toBe('SCI');

      // Ambas tienen el mismo rawScore
      expect(result.top3[0].rawScore).toBe(result.top3[1].rawScore);
      // Pero ART tiene mayor weightedScore
      expect(result.top3[0].weightedScore).toBeGreaterThan(result.top3[1].weightedScore);
    });
  });

  // ─── Spec REQ-02: Deterministic Absolute Tie-Breaking ──────────────────────

  describe('Spec: Deterministic Absolute Tie-Breaking', () => {
    it('breaks identical raw and weighted scores alphabetically', () => {
      // Mismo timestamp (mismo tiempo de respuesta) → mismo weightedScore
      // Desempate debe ser alfabético: ALPHA < BETA
      const swipes = [
        makeSwipe('BETA', true, 1000),
        makeSwipe('ALPHA', true, 1000),
      ];

      const result = calculateHollandProfile(swipes);
      expect(result.radar[0].categoryId).toBe('ALPHA');
      expect(result.radar[1].categoryId).toBe('BETA');
    });

    it('is idempotent — same swipes always produce the same Holland code', () => {
      const swipes = [
        makeSwipe('SCI', true, 800),
        makeSwipe('ART', true, 1600),
        makeSwipe('TECH', true, 2400),
        makeSwipe('SCI', false, 3200),
        makeSwipe('ART', false, 4000),
      ];

      const result1 = calculateHollandProfile(swipes);
      const result2 = calculateHollandProfile(swipes);
      const result3 = calculateHollandProfile([...swipes].reverse()); // orden diferente

      expect(result1.hollandCode).toBe(result2.hollandCode);
      expect(result1.hollandCode).toBe(result3.hollandCode);
    });
  });

  // ─── Spec REQ-03: Server-Authoritative Profile Calculation ─────────────────

  describe('Spec: Server-Authoritative output shape', () => {
    it('returns top3, bottom3, radar and hollandCode', () => {
      const swipes = [
        makeSwipe('R', true, 1000),
        makeSwipe('I', true, 2000),
        makeSwipe('A', true, 3000),
        makeSwipe('S', false, 4000),
        makeSwipe('E', false, 5000),
        makeSwipe('C', false, 6000),
      ];

      const result = calculateHollandProfile(swipes);

      expect(result.hollandCode).toHaveLength(3); // ej. "RIA"
      expect(result.top3).toHaveLength(3);
      expect(result.bottom3).toHaveLength(3);
      expect(result.radar).toHaveLength(6); // todas las categorías
    });

    it('hollandCode matches the first letter of each top3 category', () => {
      const swipes = [
        makeSwipe('REAL', true, 800),
        makeSwipe('INV', true, 1600),
        makeSwipe('ART', true, 2400),
        makeSwipe('SOC', false, 3200),
        makeSwipe('ENT', false, 4000),
        makeSwipe('CON', false, 4800),
      ];

      const result = calculateHollandProfile(swipes);
      const expectedCode = result.top3
        .map((r) => r.categoryId.charAt(0))
        .join('');
      expect(result.hollandCode).toBe(expectedCode);
    });
  });

  // ─── Edge Cases ────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles a category with 0 likes (rawScore = 0)', () => {
      const swipes = [
        makeSwipe('ART', true, 1000),
        makeSwipe('SCI', false, 2000),
      ];

      const result = calculateHollandProfile(swipes);
      const sci = result.radar.find((r) => r.categoryId === 'SCI')!;

      expect(sci.rawScore).toBe(0);
      expect(sci.weightedScore).toBe(0);
      expect(sci.percentage).toBe(0);
    });

    it('assigns default time to first swipe (does not penalize it)', () => {
      const swipes = [makeSwipe('ART', true, 0)];
      const result = calculateHollandProfile(swipes);
      // Con 1 swipe, el avgResponseTimeMs debe ser el default de 1500ms
      expect(result.radar[0].avgResponseTimeMs).toBe(1500);
    });

    it('ignores pauses > 5 minutes as impossible response times', () => {
      const swipes = [
        makeSwipe('ART', true, 0),
        makeSwipe('ART', true, 10 * 60 * 1000), // pausa de 10 min
      ];
      // El diff de 10 min debe ser descartado y reemplazado por 1500ms
      const result = calculateHollandProfile(swipes);
      const art = result.radar[0];
      // avgResponseTimeMs no debe ser 10*60*1000 / 2
      expect(art.avgResponseTimeMs).toBeLessThan(60_000);
    });
  });
});
