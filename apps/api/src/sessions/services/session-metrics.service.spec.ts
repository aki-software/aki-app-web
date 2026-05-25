import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionMetricsService } from './session-metrics.service.js';
import { SessionMetrics } from '../entities/session-metrics.entity.js';
import { Session } from '../entities/session.entity.js';

describe('SessionMetricsService', () => {
  let service: SessionMetricsService;

  const metricsRepository = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve(data)),
    findOne: jest.fn(),
  };

  const sessionsRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionMetricsService,
        {
          provide: getRepositoryToken(SessionMetrics),
          useValue: metricsRepository,
        },
        {
          provide: getRepositoryToken(Session),
          useValue: sessionsRepository,
        },
      ],
    }).compile();

    service = module.get(SessionMetricsService);
    jest.clearAllMocks();
  });

  // ─── calculateSpeedScore (via calculateAndSaveMetrics) ───────────────────────

  describe('calculateSpeedScore behavior', () => {
    /**
     * Utility: builds a minimal session with N swipes separated by `gapMs`.
     * All swipes have distinct cardIds to produce 0 reverted matches.
     */
    const buildSessionWithGap = (gapMs: number, count = 5) => {
      const base = new Date('2024-01-01T10:00:00.000Z').getTime();
      const swipes = Array.from({ length: count }, (_, i) => ({
        cardId: `card-${i}`,
        categoryId: 'R',
        isLiked: true,
        timestamp: new Date(base + i * gapMs),
      }));
      return {
        id: 'session-1',
        totalTimeMs: count * gapMs,
        swipes,
      } as unknown as Session;
    };

    it('gives speedScore=100 when avgTime is exactly 1000ms (optimal lower bound)', async () => {
      sessionsRepository.findOne.mockResolvedValue(buildSessionWithGap(1000));
      await service.calculateAndSaveMetrics('session-1');
      const saved = metricsRepository.save.mock.calls[0][0];
      // reliabilityScore = (100 - 0%) * 0.7 + 100 * 0.3 = 70 + 30 = 100
      expect(saved.reliabilityScore).toBeCloseTo(100, 1);
      expect(saved.reliabilityLevel).toBe('Muy Alta');
    });

    it('gives speedScore=100 when avgTime is 3000ms (reflexivo, zona óptima vieja)', async () => {
      sessionsRepository.findOne.mockResolvedValue(buildSessionWithGap(3000));
      await service.calculateAndSaveMetrics('session-1');
      const saved = metricsRepository.save.mock.calls[0][0];
      expect(saved.reliabilityScore).toBeCloseTo(100, 1);
      expect(saved.reliabilityLevel).toBe('Muy Alta');
    });

    it('gives speedScore=100 when avgTime is 15000ms (muy reflexivo) — NO debe penalizar', async () => {
      // Este es el bug corregido: antes daba speedScore=0 con avgTime=15000ms
      sessionsRepository.findOne.mockResolvedValue(buildSessionWithGap(15000));
      await service.calculateAndSaveMetrics('session-1');
      const saved = metricsRepository.save.mock.calls[0][0];
      // Con el algoritmo viejo esto daba reliabilityScore ~= 70 (Variable)
      // Con el algoritmo corregido debe ser 100 (Muy Alta)
      expect(saved.reliabilityScore).toBeCloseTo(100, 1);
      expect(saved.reliabilityLevel).toBe('Muy Alta');
    });

    it('penalizes speedScore when avgTime is 200ms (muy impulsivo — muy bajo 1 segundo)', async () => {
      sessionsRepository.findOne.mockResolvedValue(buildSessionWithGap(200));
      await service.calculateAndSaveMetrics('session-1');
      const saved = metricsRepository.save.mock.calls[0][0];
      // speedScore = 100 - (1000 - 200) / 10 = 100 - 80 = 20
      // reliabilityScore = (100 - 0%) * 0.7 + 20 * 0.3 = 70 + 6 = 76 (Alta)
      expect(saved.reliabilityScore).toBeCloseTo(76, 0);
      expect(saved.reliabilityLevel).toBe('Alta');
    });

    it('gives speedScore=0 when avgTime is 0ms (completamente impulsivo)', async () => {
      sessionsRepository.findOne.mockResolvedValue(buildSessionWithGap(1));
      await service.calculateAndSaveMetrics('session-1');
      const saved = metricsRepository.save.mock.calls[0][0];
      // speedScore = 100 - (1000 - 1) / 10 ≈ 0.1
      expect(saved.reliabilityScore).toBeLessThan(75);
    });
  });

  // ─── reliabilityLevel thresholds ─────────────────────────────────────────────

  describe('reliabilityLevel assignment', () => {
    it('returns "Muy Alta" when score >= 85', async () => {
      // gap=2000ms → speedScore=100, 0 undos → reliabilityScore = 70 + 30 = 100
      sessionsRepository.findOne.mockResolvedValue(buildSessionWith(2000, 0));
      await service.calculateAndSaveMetrics('session-1');
      expect(metricsRepository.save.mock.calls[0][0].reliabilityLevel).toBe('Muy Alta');
    });

    it('returns "Baja" when undo percentage is very high', async () => {
      // 8 undos en 10 swipes = 80% undo percentage
      const base = new Date('2024-01-01T10:00:00.000Z').getTime();
      const swipes = [
        // card-0 swipeado 5 veces → 4 undos
        ...Array.from({ length: 5 }, (_, i) => ({
          cardId: 'card-0',
          categoryId: 'R',
          isLiked: i % 2 === 0,
          timestamp: new Date(base + i * 2000),
        })),
        // card-1 swipeado 5 veces → 4 undos
        ...Array.from({ length: 5 }, (_, i) => ({
          cardId: 'card-1',
          categoryId: 'I',
          isLiked: i % 2 === 0,
          timestamp: new Date(base + (5 + i) * 2000),
        })),
      ];
      sessionsRepository.findOne.mockResolvedValue({
        id: 'session-1',
        totalTimeMs: 20000,
        swipes,
      } as unknown as Session);

      await service.calculateAndSaveMetrics('session-1');
      const saved = metricsRepository.save.mock.calls[0][0];
      expect(saved.reliabilityLevel).toBe('Baja');
    });
  });

  // ─── helper usada en tests de nivel ─────────────────────────────────────────

  function buildSessionWith(gapMs: number, _undos: number): Session {
    const base = new Date('2024-01-01T10:00:00.000Z').getTime();
    const swipes = Array.from({ length: 5 }, (_, i) => ({
      cardId: `card-${i}`,
      categoryId: 'R',
      isLiked: true,
      timestamp: new Date(base + i * gapMs),
    }));
    return { id: 'session-1', totalTimeMs: 5 * gapMs, swipes } as unknown as Session;
  }
});
