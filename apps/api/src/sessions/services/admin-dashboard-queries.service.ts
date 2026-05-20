import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionPaymentStatus } from '../entities/session.entity.js';
import { AdminActivityItem, RawRecentSessionRow } from '@akit/contracts';

@Injectable()
export class AdminDashboardQueriesService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async getRecentActivity(limit: number = 50): Promise<AdminActivityItem[]> {
    const sessions = await this.sessionRepository
      .createQueryBuilder('session')
      .select('session.id', 'id')
      .addSelect('session.patientName', 'patientName')
      .addSelect('session.createdAt', 'createdAt')
      .addSelect('session.sessionDate', 'sessionDate')
      .addSelect('session.reportUnlockedAt', 'reportUnlockedAt')
      .addSelect('session.paidAt', 'paidAt')
      .addSelect('session.voucherId', 'voucherId')
      .addSelect('session.paymentStatus', 'paymentStatus')
      .addSelect('COUNT(result.id)', 'resultsCount')
      .leftJoin('session.results', 'result')
      .groupBy('session.id')
      .addGroupBy('session.patientName')
      .addGroupBy('session.createdAt')
      .addGroupBy('session.sessionDate')
      .addGroupBy('session.reportUnlockedAt')
      .addGroupBy('session.paidAt')
      .addGroupBy('session.voucherId')
      .addGroupBy('session.paymentStatus')
      .orderBy('session.createdAt', 'DESC')
      .limit(limit)
      .getRawMany<RawRecentSessionRow>();

    return sessions.map((session) => {
      const resultsCount = parseInt(session.resultsCount ?? '0', 10);
      const isCompleted = resultsCount > 0;
      const channelLabel =
        session.voucherId ||
        session.paymentStatus === SessionPaymentStatus.VOUCHER_REDEEMED
          ? 'con voucher'
          : 'sin voucher';
      const occurredAt = isCompleted
        ? this.toIso(
            session.reportUnlockedAt,
            session.paidAt,
            session.sessionDate,
            session.createdAt,
          )
        : this.toIso(session.sessionDate, session.createdAt);

      return {
        id: `session-${session.id}`,
        type: isCompleted ? 'SESSION_COMPLETED' : 'SESSION_STARTED',
        title: isCompleted ? 'Sesión completada' : 'Sesión iniciada',
        description: isCompleted
          ? `${session.patientName || 'Paciente sin nombre'} completó un test ${channelLabel}.`
          : `${session.patientName || 'Paciente sin nombre'} inició un test ${channelLabel}.`,
        occurredAt,
      };
    });
  }

  async getStalledSessionsCount(): Promise<number> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const countRow = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.createdAt < :dayAgo', { dayAgo })
      .andWhere((qb) => {
        const subquery = qb
          .subQuery()
          .select('1')
          .from('session_results', 'sr')
          .where('sr.session_id = session.id')
          .getQuery();
        return `NOT EXISTS (${subquery})`;
      })
      .select('COUNT(*)', 'count')
      .getRawOne<{ count: string }>();

    return parseInt(countRow?.count ?? '0', 10);
  }

  private toIso(...values: Array<Date | string | null | undefined>): string {
    for (const value of values) {
      if (!value) continue;
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    return new Date(0).toISOString();
  }
}
