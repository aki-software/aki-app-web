import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity.js';
import { RawRecentSessionRow } from '@akit/contracts';

@Injectable()
export class AdminDashboardQueriesService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async getRecentSessionRows(
    limit: number = 50,
  ): Promise<RawRecentSessionRow[]> {
    return await this.sessionRepository
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
}
