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

// Behavioral metrics constants
const HISTOGRAM_BUCKET_COUNT = 10;
const HISTOGRAM_BUCKET_WIDTH_MS = 1000; // 1s per bucket
const FATIGUE_RT_RATIO_THRESHOLD = 1.5; // 2nd half > 1.5× 1st half
const RUSH_RT_RATIO_THRESHOLD = 0.5; // last 5 avg < 0.5× session avg
const RUSH_WINDOW_COUNT = 5;
const MIN_SWIPES_FOR_FATIGUE_RUSH = 10;
const MIN_SWIPES_FOR_HISTOGRAM = 5;
const SELECTIVITY_SELECTIVE_THRESHOLD = 0.25;
const SELECTIVITY_EXPLORATORY_THRESHOLD = 0.75;
const CONSISTENCY_VARIABLE_THRESHOLD = 0.1;
const CONSISTENCY_ERRATIC_THRESHOLD = 0.25;

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
        categoryId: s.categoryId,
        isLiked: s.isLiked,
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

    // Behavioral metrics computation
    const likeRatio = this.computeLikeRatio(swipesWithTime, totalSwipes);
    const selectivityLevel = this.computeSelectivityLevel(likeRatio);
    const firstHalfLikeRate = this.computeFirstHalfLikeRate(
      swipesWithTime,
      totalSwipes,
    );
    const lastHalfLikeRate = this.computeLastHalfLikeRate(
      swipesWithTime,
      totalSwipes,
    );
    const consistencyLevel = this.computeConsistencyLevel(
      firstHalfLikeRate,
      lastHalfLikeRate,
    );
    const fatigueDetected = this.computeFatigueDetected(durations, totalSwipes);
    const rushDetected = this.computeRushDetected(durations);
    const responseTimeHistogram = this.computeResponseTimeHistogram(durations);
    const revertedDirection = this.computeRevertedDirection(swipesWithTime);

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
      likeRatio,
      selectivityLevel,
      firstHalfLikeRate,
      lastHalfLikeRate,
      consistencyLevel,
      fatigueDetected,
      rushDetected,
      responseTimeHistogram,
      revertedDirection,
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

  // ── Behavioral metrics computation ──────────────────────────────────────

  private computeLikeRatio(
    swipes: Array<{ isLiked: boolean }>,
    totalSwipes: number,
  ): number | null {
    if (totalSwipes === 0) return null;
    const likes = swipes.filter((s) => s.isLiked).length;
    return parseFloat((likes / totalSwipes).toFixed(4));
  }

  private computeSelectivityLevel(likeRatio: number | null): string | null {
    if (likeRatio === null) return null;
    if (likeRatio < SELECTIVITY_SELECTIVE_THRESHOLD) return 'SELECTIVE';
    if (likeRatio > SELECTIVITY_EXPLORATORY_THRESHOLD) return 'EXPLORATORY';
    return 'BALANCED';
  }

  private computeFirstHalfLikeRate(
    swipes: Array<{ isLiked: boolean }>,
    totalSwipes: number,
  ): number | null {
    if (totalSwipes === 0) return null;
    const half = Math.ceil(totalSwipes / 2);
    const firstHalf = swipes.slice(0, half);
    const likes = firstHalf.filter((s) => s.isLiked).length;
    return parseFloat((likes / firstHalf.length).toFixed(4));
  }

  private computeLastHalfLikeRate(
    swipes: Array<{ isLiked: boolean }>,
    totalSwipes: number,
  ): number | null {
    if (totalSwipes <= 1) return null;
    const half = Math.ceil(totalSwipes / 2);
    const lastHalf = swipes.slice(half);
    const likes = lastHalf.filter((s) => s.isLiked).length;
    return parseFloat((likes / lastHalf.length).toFixed(4));
  }

  private computeConsistencyLevel(
    firstHalfRate: number | null,
    lastHalfRate: number | null,
  ): string | null {
    if (firstHalfRate === null || lastHalfRate === null) return null;
    const diff = Math.abs(firstHalfRate - lastHalfRate);
    if (diff < CONSISTENCY_VARIABLE_THRESHOLD) return 'CONSISTENT';
    if (diff < CONSISTENCY_ERRATIC_THRESHOLD) return 'VARIABLE';
    return 'ERRATIC';
  }

  private computeFatigueDetected(
    durations: number[],
    totalSwipes: number,
  ): boolean | null {
    if (totalSwipes < MIN_SWIPES_FOR_FATIGUE_RUSH) return null;
    if (durations.length < 2) return null;

    const half = Math.floor(durations.length / 2);
    const firstHalf = durations.slice(0, half);
    const secondHalf = durations.slice(half);

    if (firstHalf.length === 0 || secondHalf.length === 0) return null;

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (firstAvg === 0) return null;
    return secondAvg / firstAvg > FATIGUE_RT_RATIO_THRESHOLD;
  }

  private computeRushDetected(durations: number[]): boolean | null {
    if (durations.length < MIN_SWIPES_FOR_FATIGUE_RUSH) return null;

    const lastWindow = durations.slice(-RUSH_WINDOW_COUNT);
    const sessionAvg = durations.reduce((a, b) => a + b, 0) / durations.length;

    if (sessionAvg === 0) return null;
    const lastAvg = lastWindow.reduce((a, b) => a + b, 0) / lastWindow.length;

    return lastAvg / sessionAvg < RUSH_RT_RATIO_THRESHOLD;
  }

  private computeResponseTimeHistogram(
    durations: number[],
  ): Array<{ bucket: number; count: number }> | null {
    if (durations.length < MIN_SWIPES_FOR_HISTOGRAM) return null;

    const buckets = new Array(HISTOGRAM_BUCKET_COUNT).fill(0);

    for (const dur of durations) {
      const bucketIndex = Math.min(
        Math.floor(dur / HISTOGRAM_BUCKET_WIDTH_MS),
        HISTOGRAM_BUCKET_COUNT - 1,
      );
      buckets[bucketIndex]++;
    }

    return buckets.map((count, i) => ({
      bucket: i,
      count,
    }));
  }

  private computeRevertedDirection(
    swipes: Array<{ cardId: string; categoryId: string; isLiked: boolean }>,
  ): {
    likedToDisliked: number;
    dislikedToLiked: number;
    details: Array<{
      categoryId: string;
      type: 'likedToDisliked' | 'dislikedToLiked';
    }>;
  } {
    const grouped = new Map<
      string,
      Array<{ isLiked: boolean; categoryId: string }>
    >();

    for (const swipe of swipes) {
      const existing = grouped.get(swipe.cardId);
      if (existing) {
        existing.push({ isLiked: swipe.isLiked, categoryId: swipe.categoryId });
      } else {
        grouped.set(swipe.cardId, [
          { isLiked: swipe.isLiked, categoryId: swipe.categoryId },
        ]);
      }
    }

    let likedToDisliked = 0;
    let dislikedToLiked = 0;
    const details: Array<{
      categoryId: string;
      type: 'likedToDisliked' | 'dislikedToLiked';
    }> = [];

    for (const values of grouped.values()) {
      for (let i = 1; i < values.length; i++) {
        if (values[i - 1].isLiked === true && values[i].isLiked === false) {
          likedToDisliked++;
          details.push({
            categoryId: values[i].categoryId,
            type: 'likedToDisliked',
          });
        } else if (
          values[i - 1].isLiked === false &&
          values[i].isLiked === true
        ) {
          dislikedToLiked++;
          details.push({
            categoryId: values[i].categoryId,
            type: 'dislikedToLiked',
          });
        }
      }
    }

    return { likedToDisliked, dislikedToLiked, details };
  }

  async getMetricsBySessionId(sessionId: string): Promise<SessionMetrics> {
    const metrics = await this.metricsRepository.findOne({
      where: { session: { id: sessionId } },
    });
    if (!metrics) throw new NotFoundException('Metrics not found');
    return metrics;
  }
}
