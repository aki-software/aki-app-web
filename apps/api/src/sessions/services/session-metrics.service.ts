import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionMetrics } from '../entities/session-metrics.entity.js';
import { Session } from '../entities/session.entity.js';

const MAX_IDLE_TIME_MS = 300000; // 5 minutos maximo entre acciones
const RELIABILITY_WEIGHT_UNDO = 0.7;
const RELIABILITY_WEIGHT_SPEED = 0.3;
const SPEED_MAX_AVG_TIME_MS = 1000;
const SPEED_PENALTY_DIVISOR = 10;

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

    const swipesWithTime = session.swipes
      .map((s) => ({
        cardId: s.cardId,
        timeMs: new Date(s.timestamp).getTime(),
      }))
      .sort((a, b) => a.timeMs - b.timeMs);

    const totalSwipes = swipesWithTime.length;
    const uniqueCards = new Set(swipesWithTime.map((s) => s.cardId)).size;
    const revertedMatches = totalSwipes - uniqueCards;

    const durations: number[] = [];
    for (let i = 1; i < swipesWithTime.length; i++) {
      const diff = swipesWithTime[i].timeMs - swipesWithTime[i - 1].timeMs;
      if (diff > 0 && diff < MAX_IDLE_TIME_MS) {
        durations.push(diff);
      }
    }

    const avgTime =
      durations.length > 0
        ? durations.reduce((a, b) => a + b) / durations.length
        : null;
    const minTime = durations.length > 0 ? Math.min(...durations) : 0;
    const maxTime = durations.length > 0 ? Math.max(...durations) : 0;

    const undoPercentage =
      totalSwipes > 0 ? (revertedMatches / totalSwipes) * 100 : 0;
    const speedScore =
      avgTime !== null ? this.calculateSpeedScore(avgTime) : 100;

    const reliabilityScore =
      (100 - undoPercentage) * RELIABILITY_WEIGHT_UNDO +
      speedScore * RELIABILITY_WEIGHT_SPEED;

    const reliabilityLevel = this.getReliabilityLevel(reliabilityScore);

    const metrics = this.metricsRepository.create({
      session,
      totalDurationMs: session.totalTimeMs,
      totalSwipes,
      uniqueCards,
      revertedMatches,
      avgTimeBetweenSwipesMs: Math.round(avgTime || 0),
      minTimeBetweenSwipesMs: Math.round(minTime),
      maxTimeBetweenSwipesMs: Math.round(maxTime),
      reliabilityScore: parseFloat(reliabilityScore.toFixed(2)),
      reliabilityLevel,
    });

    return this.metricsRepository.save(metrics);
  }

  private calculateSpeedScore(avgTimeMs: number): number {
    if (avgTimeMs >= SPEED_MAX_AVG_TIME_MS) return 100;
    return Math.max(
      0,
      100 - (SPEED_MAX_AVG_TIME_MS - avgTimeMs) / SPEED_PENALTY_DIVISOR,
    );
  }

  private getReliabilityLevel(score: number): string {
    if (score >= 85) return 'Muy Alta';
    if (score >= 70) return 'Alta';
    if (score >= 50) return 'Variable';
    return 'Baja';
  }

  async getMetricsBySessionId(sessionId: string): Promise<SessionMetrics> {
    const metrics = await this.metricsRepository.findOne({
      where: { session: { id: sessionId } },
    });
    if (!metrics) throw new NotFoundException('Metrics not found');
    return metrics;
  }
}
