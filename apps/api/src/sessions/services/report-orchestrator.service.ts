import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Session } from '../entities/session.entity.js';
import { SessionScope } from '../types/session-scope.type.js';
import { SessionPaymentStatus } from '@akit/contracts';
import { UserRole } from '@akit/contracts';

@Injectable()
export class ReportOrchestratorService {
  private readonly logger = new Logger(ReportOrchestratorService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectQueue('reports')
    private readonly reportsQueue: Queue,
  ) {}

  async sendReport(
    sessionId: string,
    targetEmail: string,
    voucherId?: string | null,
    scope?: SessionScope,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.findOne(sessionId, scope);
    const voucherIdForLogging = voucherId ?? session.voucherId ?? undefined;

    this.logger.debug(`Queuing report request for session: ${sessionId}`);

    await this.reportsQueue.add('report.requested', {
      sessionId,
      requestedByEmail: targetEmail,
      voucherId: voucherIdForLogging,
    });

    return {
      success: true,
      message: `Report generation queued for ${targetEmail}`,
    };
  }

  private async findOne(id: string, scope?: SessionScope): Promise<Session> {
    const query = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.results', 'results')
      .leftJoinAndSelect('session.swipes', 'swipes')
      .leftJoinAndSelect('session.institution', 'institution')
      .leftJoinAndSelect('session.therapist', 'therapist')
      .leftJoinAndSelect('session.voucher', 'voucher')
      .where('session.id = :id', { id })
      // Garantizar el orden del motor psicométrico: los joins no garantizan orden en SQL.
      // percentage DESC → weighted_score DESC → category_id ASC
      .addOrderBy('results.percentage', 'DESC')
      .addOrderBy('results.weightedScore', 'DESC')
      .addOrderBy('results.categoryId', 'ASC');

    this.applySecurityBoundaries(query, scope);

    const session = await query.getOne();
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    if (
      scope?.role === ('PATIENT' as any) &&
      session.paymentStatus !== SessionPaymentStatus.PAID &&
      session.paymentStatus !== SessionPaymentStatus.VOUCHER_REDEEMED
    ) {
      throw new BadRequestException(
        'Cannot generate report for a pending payment session',
      );
    }

    return session;
  }

  private applySecurityBoundaries(
    query: SelectQueryBuilder<Session>,
    scope?: SessionScope,
  ): void {
    if (!scope?.role) {
      query.andWhere('1 = 0');
      return;
    }

    const role = scope.role as UserRole;

    if (role === UserRole.ADMIN) {
      return;
    }
    if (role === ('PATIENT' as any)) {
      return;
    }
    if (scope.institutionId) {
      query.andWhere('session.institutionId = :institutionId', {
        institutionId: scope.institutionId,
      });
      return;
    }
    if (scope.therapistUserId) {
      query.andWhere('session.therapistUserId = :therapistUserId', {
        therapistUserId: scope.therapistUserId,
      });
      return;
    }
    query.andWhere('1 = 0');
  }
}
