import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionMetrics } from '../entities/session-metrics.entity';
import { Session } from '../entities/session.entity';

@Injectable()
export class SessionMetricsService {
  constructor(
    @InjectRepository(SessionMetrics)
    private metricsRepository: Repository<SessionMetrics>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
  ) {}

  async calculateAndSaveMetrics(sessionId: string): Promise<SessionMetrics> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['swipes'],
    });

    if (!session) throw new NotFoundException('Session not found');

    const swipes = session.swipes.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    // 1. Conteos básicos
    const totalSwipes = swipes.length;
    const uniqueCards = new Set(swipes.map(s => s.cardId)).size;
    const revertedMatches = totalSwipes - uniqueCards;

    // 2. Tiempos entre swipes
    const durations: number[] = [];
    for (let i = 1; i < swipes.length; i++) {
      const diff =
        new Date(swipes[i].timestamp).getTime() -
        new Date(swipes[i - 1].timestamp).getTime();
      if (diff > 0 && diff < 300000) durations.push(diff); // Max 5 min
    }

    const avgTime =
      durations.length > 0
        ? durations.reduce((a, b) => a + b) / durations.length
        : 0;
    const minTime = durations.length > 0 ? Math.min(...durations) : 0;
    const maxTime = durations.length > 0 ? Math.max(...durations) : 0;

    // 3. Score de confiabilidad (0-100)
    const undoPercentage = totalSwipes > 0 ? (revertedMatches / totalSwipes) * 100 : 0;
    const speedScore = this.calculateSpeedScore(avgTime);
    const reliabilityScore = (100 - undoPercentage) * 0.7 + speedScore * 0.3;

    const reliabilityLevel =
      reliabilityScore >= 85
        ? 'Muy Alta'
        : reliabilityScore >= 70
          ? 'Alta'
          : reliabilityScore >= 50
            ? 'Variable'
            : 'Baja';

    // 4. Guardar métricas
    const metrics = this.metricsRepository.create({
      session,
      totalDurationMs: session.totalTimeMs,
      totalSwipes,
      uniqueCards,
      revertedMatches,
      avgTimeBetweenSwipesMs: Math.round(avgTime),
      minTimeBetweenSwipesMs: Math.round(minTime),
      maxTimeBetweenSwipesMs: Math.round(maxTime),
      reliabilityScore: parseFloat(reliabilityScore.toFixed(2)),
      reliabilityLevel,
    });

    return this.metricsRepository.save(metrics);
  }

  private calculateSpeedScore(avgTimeMs: number): number {
    // Velocidad óptima: 1-3 segundos
    if (avgTimeMs >= 1000 && avgTimeMs <= 3000) return 100;
    if (avgTimeMs < 1000) return Math.max(0, 100 - (1000 - avgTimeMs) / 10);
    return Math.max(0, 100 - (avgTimeMs - 3000) / 100);
  }

  async getMetricsBySessionId(sessionId: string): Promise<SessionMetrics> {
    const metrics = await this.metricsRepository.findOne({
      where: { session: { id: sessionId } },
    });
    if (!metrics) throw new NotFoundException('Metrics not found');
    return metrics;
  }
}
