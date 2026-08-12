import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager, DataSource } from 'typeorm';
import { Voucher } from '../entities/voucher.entity.js';
import {
  Session,
  SessionPaymentStatus,
} from '../../sessions/entities/session.entity.js';
import { VoucherStatus } from '../entities/voucher.enums.js';

interface VerifiedAndroidIdentity {
  userId?: string;
  email?: string;
  isFirebaseEmailVerified?: boolean;
}

const voucherErrorResponse = (
  code:
    | 'INVALID_CODE'
    | 'ALREADY_USED'
    | 'SESSION_NOT_FOUND'
    | 'VOUCHER_EXPIRED'
    | 'ANDROID_EMAIL_REQUIRED'
    | 'VOUCHER_EMAIL_MISMATCH'
    | 'ANDROID_IDENTITY_UNVERIFIED'
    | 'SESSION_ACCESS_DENIED'
    | 'SERVICE_UNAVAILABLE',
  statusCode: number,
  message: string,
) => ({ code, statusCode, message });

@Injectable()
export class VoucherRedemptionService {
  constructor(private readonly dataSource: DataSource) {}

  async redeemVoucher(
    code: string,
    sessionId: string,
    identity?: VerifiedAndroidIdentity,
  ): Promise<{
    success: boolean;
    status: 'REDEEMED' | 'ALREADY_REDEEMED_BY_THIS_SESSION';
    voucherCode: string;
    sessionId: string;
  }> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const normalizedCode = code.trim().toUpperCase();
      const normalizedEmail = identity?.email?.trim().toLowerCase();

      if (!normalizedEmail || !identity?.isFirebaseEmailVerified) {
        throw new BadRequestException(
          voucherErrorResponse(
            'ANDROID_IDENTITY_UNVERIFIED',
            HttpStatus.BAD_REQUEST,
            'A verified Android email is required',
          ),
        );
      }

      const voucherRepo = manager.getRepository(Voucher);
      const sessionRepo = manager.getRepository(Session);

      const voucher = await voucherRepo.findOne({
        where: { code: normalizedCode },
        lock: { mode: 'pessimistic_write' },
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

      if (session.patientId !== identity.userId) {
        throw new ConflictException(
          voucherErrorResponse(
            'SESSION_ACCESS_DENIED',
            HttpStatus.CONFLICT,
            'Caller is not authorized for this patient session',
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
        try {
          voucher.bindToAuthenticatedEmail(normalizedEmail);
        } catch {
          throw new ConflictException(
            voucherErrorResponse(
              'VOUCHER_EMAIL_MISMATCH',
              HttpStatus.CONFLICT,
              'Voucher is bound to a different Android email',
            ),
          );
        }
        this.applyVoucherToSession(session, voucher);
        await voucherRepo.save(voucher);
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
        voucher.bindToAuthenticatedEmail(normalizedEmail);
      } catch {
        throw new ConflictException(
          voucherErrorResponse(
            'VOUCHER_EMAIL_MISMATCH',
            HttpStatus.CONFLICT,
            'Voucher is bound to a different Android email',
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
}
