import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Session } from '../entities/session.entity.js';
import { SessionScope } from '../types/session-scope.type.js';
import { UserRole } from '@akit/contracts';
import { ReportsService } from '../../reports/reports.service.js';

const PATIENT_ROLE = 'PATIENT';

@Injectable()
export class ReportOrchestratorService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly reportsService: ReportsService,
  ) {}

  async sendReport(
    sessionId: string,
    targetEmail: string,
    voucherId?: string | null,
    scope?: SessionScope,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.findOne(sessionId, scope);
    void voucherId;
    await this.reportsService.requestGeneration(session.id, targetEmail);

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
      scope?.role === PATIENT_ROLE &&
      (!session.reportUnlockedAt || !session.results?.length)
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
    if (scope.role === PATIENT_ROLE && scope.patientId) {
      query.andWhere('session.patientId = :patientId', {
        patientId: scope.patientId,
      });
      query.andWhere('session.reportUnlockedAt IS NOT NULL');
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
