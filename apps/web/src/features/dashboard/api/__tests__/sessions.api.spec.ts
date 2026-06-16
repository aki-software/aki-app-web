import { describe, it, expect, beforeEach } from 'vitest';
import { fetchSessionsList } from '../sessions.api';
import { mockEndpoint, resetMockApi } from '../../../../test/mock-api-client';

describe('C5 — web dashboard sort (normalizeSession)', () => {
  beforeEach(() => {
    resetMockApi();
  });

  it('sorts by percentage descending — hollandCode reflects top 3', async () => {
    // SCI(90%) > ART(80%) > BUS(70%) → hollandCode = SAB
    mockEndpoint('get', '/sessions?limit=1000', {
      data: [
        {
          id: 's1',
          patientName: 'Alice',
          results: [
            { categoryId: 'ART', percentage: 80, rawScore: 5, weightedScore: 4.0 },
            { categoryId: 'SCI', percentage: 90, rawScore: 4, weightedScore: 3.0 },
            { categoryId: 'BUS', percentage: 70, rawScore: 6, weightedScore: 5.0 },
          ],
        },
      ],
    });

    const sessions = await fetchSessionsList();
    expect(sessions[0].hollandCode).toBe('SAB');
  });

  it('sorts by rawScore descending when percentages are tied', async () => {
    // 80%: SCI(raw=8) > ART(raw=5) > BUS(raw=3) → hollandCode = SAB
    mockEndpoint('get', '/sessions?limit=1000', {
      data: [
        {
          id: 's1',
          patientName: 'Alice',
          results: [
            { categoryId: 'ART', percentage: 80, rawScore: 5, weightedScore: 4.0 },
            { categoryId: 'SCI', percentage: 80, rawScore: 8, weightedScore: 3.0 },
            { categoryId: 'BUS', percentage: 80, rawScore: 3, weightedScore: 5.0 },
          ],
        },
      ],
    });

    const sessions = await fetchSessionsList();
    expect(sessions[0].hollandCode).toBe('SAB');
  });

  it('sorts by weightedScore descending when percentage+rawScore are tied', async () => {
    // 80%/raw5: ART(w=4.5) > SCI(w=3.2) > BUS(w=2.0) → hollandCode = ASB
    mockEndpoint('get', '/sessions?limit=1000', {
      data: [
        {
          id: 's1',
          patientName: 'Alice',
          results: [
            { categoryId: 'ART', percentage: 80, rawScore: 5, weightedScore: 4.5 },
            { categoryId: 'SCI', percentage: 80, rawScore: 5, weightedScore: 3.2 },
            { categoryId: 'BUS', percentage: 80, rawScore: 5, weightedScore: 2.0 },
          ],
        },
      ],
    });

    const sessions = await fetchSessionsList();
    expect(sessions[0].hollandCode).toBe('ASB');
  });

  it('sorts by categoryId ascending when all tiebreakers are equal', async () => {
    // Everything tied → alphabetical: ART, BUS, MECH, SCI → top 3 = ABM
    mockEndpoint('get', '/sessions?limit=1000', {
      data: [
        {
          id: 's1',
          patientName: 'Alice',
          results: [
            { categoryId: 'SCI', percentage: 80, rawScore: 5, weightedScore: 4.0 },
            { categoryId: 'ART', percentage: 80, rawScore: 5, weightedScore: 4.0 },
            { categoryId: 'BUS', percentage: 80, rawScore: 5, weightedScore: 4.0 },
            { categoryId: 'MECH', percentage: 80, rawScore: 5, weightedScore: 4.0 },
          ],
        },
      ],
    });

    const sessions = await fetchSessionsList();
    expect(sessions[0].hollandCode).toBe('ABM');
  });

  it('gracefully handles null/undefined rawScore — ranks below valid scores', async () => {
    // 80%: ART(raw=5) > BUS(raw=3) > SCI(raw=undefined→-1) → hollandCode = ABS
    mockEndpoint('get', '/sessions?limit=1000', {
      data: [
        {
          id: 's1',
          patientName: 'Alice',
          results: [
            { categoryId: 'ART', percentage: 80, rawScore: 5, weightedScore: 4.0 },
            { categoryId: 'SCI', percentage: 80, rawScore: undefined as number | undefined, weightedScore: 4.0 },
            { categoryId: 'BUS', percentage: 80, rawScore: 3, weightedScore: 4.0 },
          ],
        },
      ],
    });

    const sessions = await fetchSessionsList();
    expect(sessions[0].hollandCode).toBe('ABS');
  });

  it('gracefully handles all rawScores missing — falls back to weightedScore', async () => {
    // 80%: ART(w=4.5) > BUS(w=3.2) → hollandCode = AB
    mockEndpoint('get', '/sessions?limit=1000', {
      data: [
        {
          id: 's1',
          patientName: 'Alice',
          results: [
            { categoryId: 'ART', percentage: 80, rawScore: undefined as number | undefined, weightedScore: 4.5 },
            { categoryId: 'BUS', percentage: 80, rawScore: undefined as number | undefined, weightedScore: 3.2 },
          ],
        },
      ],
    });

    const sessions = await fetchSessionsList();
    expect(sessions[0].hollandCode).toBe('AB');
  });

  it('4-way tie produces deterministic top-3 hollandCode', async () => {
    // All tied → alphabetical: ART, BUS, MECH, SCI → top 3 = ABM
    mockEndpoint('get', '/sessions?limit=1000', {
      data: [
        {
          id: 's1',
          patientName: 'Alice',
          results: [
            { categoryId: 'ART', percentage: 80, rawScore: 5, weightedScore: 4.0 },
            { categoryId: 'SCI', percentage: 80, rawScore: 5, weightedScore: 4.0 },
            { categoryId: 'BUS', percentage: 80, rawScore: 5, weightedScore: 4.0 },
            { categoryId: 'MECH', percentage: 80, rawScore: 5, weightedScore: 4.0 },
          ],
        },
      ],
    });

    const sessions = await fetchSessionsList();
    expect(sessions[0].hollandCode).toBe('ABM');
  });
});
