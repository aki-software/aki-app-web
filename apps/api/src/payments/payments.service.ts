import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto';
import { SessionsQueryService } from '../sessions/services/sessions-query.service';
import { SessionsMutationService } from '../sessions/services/sessions-mutation.service';
import { SessionOwnerResolverService } from '../sessions/services/session-owner-resolver.service';
import { SessionPaymentStatus } from '@akit/contracts';
import type { androidpublisher_v3 } from 'googleapis';
import { GooglePlayAdapter } from './google-play.adapter.js';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import { Voucher } from '../vouchers/entities/voucher.entity.js';
import type { Session } from '../sessions/entities/session.entity.js';
import {
  VoucherBatchStatus,
  VoucherStatus,
} from '../vouchers/entities/voucher.enums.js';
import type {
  BillingHistory,
  PaymentGateway,
  PaymentEventStatus,
} from '@akit/contracts';

export interface VerifyPurchaseResult {
  success: boolean;
  valid: boolean;
  reason?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly sessionsQueryService: SessionsQueryService,
    private readonly sessionOwnerResolverService: SessionOwnerResolverService,
    private readonly sessionsMutationService: SessionsMutationService,
    private readonly googlePlayAdapter: GooglePlayAdapter,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async getBillingHistory(institutionId: string): Promise<BillingHistory> {
    const batches = await this.dataSource.manager.find(VoucherBatch, {
      where: {
        ownerInstitutionId: institutionId,
        status: VoucherBatchStatus.PAID,
      },
      order: { paidAt: 'DESC' },
    });

    const totalPaid = batches.reduce(
      (acc, batch) => acc + Number(batch.totalPrice),
      0,
    );

    const transactions = batches.map((batch) => ({
      id: batch.id,
      gateway: batch.paymentProvider as PaymentGateway,
      externalReference: batch.paymentReference as string,
      status: 'APPROVED' as PaymentEventStatus,
      amount: Number(batch.totalPrice),
      currency: batch.currency,
      createdAt: batch.paidAt?.toISOString() ?? batch.createdAt.toISOString(),
      plan: {
        id: batch.id, // Using batch ID as plan ID mock since we don't store planId in batch
        name: `Lote de ${batch.quantity} vouchers`,
        voucherQuantity: batch.quantity,
        priceUsd: Number(batch.totalPrice),
        isActive: true,
      },
    }));

    const currentBalance = await this.dataSource.manager.count(Voucher, {
      where: {
        ownerInstitutionId: institutionId,
        status: VoucherStatus.AVAILABLE,
      },
    });

    return {
      transactions,
      totalPaid,
      currentBalance,
    };
  }

  async verifyGooglePlayPurchase(
    dto: VerifyPlayPurchaseDto,
    principal: { userId: string; email?: string; institutionId: string },
  ): Promise<VerifyPurchaseResult> {
    try {
      const patientId = await this.resolvePaymentPatientId(principal);
      const session = await this.sessionsQueryService.findOneForPaymentUnlock(
        dto.sessionId,
        patientId,
        principal.institutionId,
      );

      if (!session.results?.length) {
        throw new BadRequestException(
          'Session report is not eligible for unlock',
        );
      }

      if (session.reportUnlockedAt) {
        if (session.reportUnlockPurchaseToken === dto.purchaseToken) {
          return { success: true, valid: true };
        }
        throw new BadRequestException('Report is already unlocked');
      }

      if (this.isAlreadyProcessed(session, dto.purchaseToken)) {
        return { success: true, valid: true };
      }

      if (session.paymentStatus === SessionPaymentStatus.PAID) {
        throw new BadRequestException(
          'Session already has a different payment token',
        );
      }

      const existingSession =
        await this.sessionsQueryService.findByPaymentToken(dto.purchaseToken);
      if (existingSession && existingSession.id !== session.id) {
        return { success: false, valid: false, reason: 'ALREADY_CONSUMED' };
      }

      const expectedSku = this.googlePlayAdapter.getReportUnlockSku();
      if (
        !session.expectedReportSku ||
        session.expectedReportSku !== expectedSku ||
        dto.productId !== session.expectedReportSku
      ) {
        throw new BadRequestException('Unexpected Google Play report SKU');
      }
      const packageName = this.googlePlayAdapter.getPackageName();
      const androidPublisher =
        await this.googlePlayAdapter.getAndroidPublisher();

      return await this.verifyAndProcessPurchase(
        androidPublisher,
        packageName,
        dto,
        session,
        expectedSku,
      );
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Error verificando la compra');
    }
  }

  private async resolvePaymentPatientId(principal: {
    userId: string;
    email?: string;
  }): Promise<string> {
    if (this.isUuid(principal.userId)) return principal.userId;

    if (!principal.email) {
      throw new BadRequestException('Unable to resolve payment patient');
    }

    const owner = await this.sessionOwnerResolverService.resolveFirebaseUser(
      { uid: principal.userId, email: principal.email },
      false,
    );
    if (!owner) {
      throw new BadRequestException('Unable to resolve payment patient');
    }

    return owner.id;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private isAlreadyProcessed(
    session: Pick<
      Session,
      | 'paymentReference'
      | 'paymentStatus'
      | 'reportUnlockPurchaseToken'
      | 'reportUnlockedAt'
      | 'expectedReportSku'
    >,
    token: string,
  ): boolean {
    return (
      (session.paymentReference === token &&
        session.paymentStatus === SessionPaymentStatus.PAID) ||
      session.reportUnlockPurchaseToken === token
    );
  }

  private async verifyAndProcessPurchase(
    publisher: androidpublisher_v3.Androidpublisher,
    packageName: string,
    dto: VerifyPlayPurchaseDto,
    session: Pick<
      Session,
      | 'id'
      | 'paymentReference'
      | 'paymentStatus'
      | 'reportUnlockPurchaseToken'
      | 'reportUnlockedAt'
      | 'expectedReportSku'
    >,
    expectedSku = dto.productId,
  ): Promise<VerifyPurchaseResult> {
    let purchase: androidpublisher_v3.Schema$ProductPurchase;

    try {
      const response = await publisher.purchases.products.get({
        packageName,
        productId: dto.productId,
        token: dto.purchaseToken,
      });
      purchase = response.data;
    } catch (error) {
      const status =
        error && typeof error === 'object' && 'response' in error
          ? ((error as { response?: { status?: number } }).response?.status ??
            null)
          : null;

      if (
        (status === 400 ||
          (error instanceof Error &&
            error.message.toLowerCase().includes('not owned by the user'))) &&
        this.isAlreadyProcessed(session, dto.purchaseToken)
      ) {
        return { success: true, valid: true };
      }
      throw error;
    }

    if (purchase.purchaseState !== 0 || purchase.productId !== expectedSku) {
      return { success: false, valid: false, reason: 'PURCHASE_NOT_VALID' };
    }

    try {
      await this.sessionsMutationService.unlockReportEntitlement(
        session.id,
        dto.purchaseToken,
        {
          providerProductId: purchase.productId ?? expectedSku,
          expectedSku,
        },
      );
    } catch (error) {
      // Catch DB constraint error if another request managed to save it first despite the lock (e.g. cross-instance race condition)
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505'
      ) {
        return { success: false, valid: false, reason: 'ALREADY_CONSUMED' };
      }
      throw error;
    }

    return { success: true, valid: true };
  }
}
