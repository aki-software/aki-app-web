import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { Voucher } from '../entities/voucher.entity.js';
import {
  Session,
  SessionPaymentStatus,
} from '../../sessions/entities/session.entity.js';
import { VoucherStatus } from '../entities/voucher.enums.js';

const voucherErrorResponse = (
  code:
    | 'INVALID_CODE'
    | 'ALREADY_USED'
    | 'SESSION_NOT_FOUND'
    | 'VOUCHER_EXPIRED'
    | 'SERVICE_UNAVAILABLE',
  statusCode: number,
  message: string,
) => ({ code, statusCode, message });

@Injectable()
export class VoucherRedemptionService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly dataSource: DataSource,
  ) {}

  async redeemVoucher(
    code: string,
    sessionId: string,
  ): Promise<{
    success: boolean;
    status: 'REDEEMED' | 'ALREADY_REDEEMED_BY_THIS_SESSION';
    voucherCode: string;
    sessionId: string;
  }> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const normalizedCode = code.trim().toUpperCase();
      const voucherRepo = manager.getRepository(Voucher);
      const sessionRepo = manager.getRepository(Session);

      const voucher = await voucherRepo.findOne({
        where: { code: normalizedCode },
      });

      if (!voucher) {
        throw new NotFoundException(
          voucherErrorResponse(
            'INVALID_CODE',
            HttpStatus.NOT_FOUND,
            'Voucher code not found',
          ),
        );
      }

      const session = await sessionRepo.findOne({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException(
          voucherErrorResponse(
            'SESSION_NOT_FOUND',
            HttpStatus.NOT_FOUND,
            'Session not found',
          ),
        );
      }

      if (voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()) {
        throw new HttpException(
          voucherErrorResponse(
            'VOUCHER_EXPIRED',
            HttpStatus.GONE,
            'Voucher expired',
          ),
          HttpStatus.GONE,
        );
      }

      if (voucher.redeemedSessionId === sessionId) {
        this.applyVoucherToSession(session, voucher);
        await sessionRepo.save(session);
        return {
          success: true,
          status: 'ALREADY_REDEEMED_BY_THIS_SESSION' as const,
          voucherCode: voucher.code,
          sessionId,
        };
      }

      if (voucher.status === VoucherStatus.USED) {
        throw new ConflictException(
          voucherErrorResponse(
            'ALREADY_USED',
            HttpStatus.CONFLICT,
            'Voucher already used',
          ),
        );
      }

      try {
        voucher.redeem(sessionId);
      } catch {
        throw new HttpException(
          voucherErrorResponse(
            'SERVICE_UNAVAILABLE',
            HttpStatus.SERVICE_UNAVAILABLE,
            'Servicio temporalmente no disponible',
          ),
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      await voucherRepo.save(voucher);
      this.applyVoucherToSession(session, voucher);
      await sessionRepo.save(session);

      return {
        success: true,
        status: 'REDEEMED' as const,
        voucherCode: voucher.code,
        sessionId,
      };
    });
  }

  private applyVoucherToSession(session: Session, voucher: Voucher) {
    session.voucherId = voucher.id;
    session.paymentStatus = SessionPaymentStatus.VOUCHER_REDEEMED;
    session.reportUnlockedAt =
      session.reportUnlockedAt ?? voucher.redeemedAt ?? new Date();

    if (voucher.ownerInstitutionId) {
      session.institutionId = voucher.ownerInstitutionId;
    }
    if (voucher.ownerUserId) {
      session.therapistUserId = voucher.ownerUserId;
    }
  }

  async attachVoucherToSession(
    code: string,
    sessionId: string,
    patientName?: string | null,
  ): Promise<Voucher> {
    const normalizedCode = code.trim().toUpperCase();
    const voucher = await this.voucherRepository.findOne({
      where: { code: normalizedCode },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher no encontrado');
    }

    if (voucher.status !== VoucherStatus.AVAILABLE) {
      throw new BadRequestException('Voucher no disponible');
    }
    if (voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Voucher expirado');
    }

    try {
      voucher.redeem(sessionId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al adjuntar el voucher';
      throw new BadRequestException(message);
    }

    if (patientName && !voucher.assignedPatientName) {
      voucher.assignedPatientName = patientName;
    }
    return await this.voucherRepository.save(voucher);
  }
}
