import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto';
import { SessionsQueryService } from '../sessions/services/sessions-query.service';
import { SessionsMutationService } from '../sessions/services/sessions-mutation.service';
import { SessionPaymentStatus } from '@akit/contracts';
import type { androidpublisher_v3 } from 'googleapis';
import { PaymentLockService } from './payment-lock.service';
import { GooglePlayAdapter } from './google-play.adapter.js';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import { Voucher } from '../vouchers/entities/voucher.entity.js';
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
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly sessionsQueryService: SessionsQueryService,
    private readonly sessionsMutationService: SessionsMutationService,
    private readonly paymentLockService: PaymentLockService,
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
      (acc, batch) => acc + Number(batch.totalPrice || 0),
      0,
    );

    const transactions = batches.map((batch) => ({
      id: batch.id,
      gateway: (batch.paymentProvider as PaymentGateway) || 'MERCADO_PAGO',
      externalReference: batch.paymentReference || '',
      status: 'APPROVED' as PaymentEventStatus,
      amount: Number(batch.totalPrice),
      currency: batch.currency,
      createdAt: batch.paidAt?.toISOString() || batch.createdAt.toISOString(),
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
  ): Promise<VerifyPurchaseResult> {
    this.logger.log(`Verifying purchase for session ${dto.sessionId}`);

    await this.paymentLockService.acquireLock(dto.purchaseToken);
    try {
      const session = await this.sessionsQueryService.findOne(dto.sessionId);
      if (!session) {
        throw new BadRequestException('Sesión no encontrada');
      }

      if (this.isAlreadyProcessed(session, dto.purchaseToken)) {
        this.logger.log(
          `Session ${session.id} is already PAID with this token`,
        );
        return { success: true, valid: true };
      }

      const existingSession =
        await this.sessionsQueryService.findByPaymentToken(dto.purchaseToken);
      if (existingSession && existingSession.id !== session.id) {
        this.logger.warn(
          `Purchase token ${dto.purchaseToken} is already used by session ${existingSession.id}. Rejecting for session ${session.id}.`,
        );
        return { success: false, valid: false, reason: 'ALREADY_CONSUMED' };
      }

      const packageName = this.googlePlayAdapter.getPackageName();
      const androidPublisher =
        await this.googlePlayAdapter.getAndroidPublisher();

      return await this.verifyAndProcessPurchase(
        androidPublisher,
        packageName,
        dto,
        session,
      );
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error verifying Google Play purchase: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error verificando la compra');
    } finally {
      this.paymentLockService.releaseLock(dto.purchaseToken);
    }
  }

  private isAlreadyProcessed(session: any, token: string): boolean {
    return (
      session.paymentReference === token &&
      session.paymentStatus === SessionPaymentStatus.PAID
    );
  }

  private async verifyAndProcessPurchase(
    publisher: androidpublisher_v3.Androidpublisher,
    packageName: string,
    dto: VerifyPlayPurchaseDto,
    session: {
      id: string;
      paymentReference?: string | null;
      paymentStatus?: SessionPaymentStatus;
    },
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

      // 400 Bad Request from Google Play might mean the token is no longer owned or valid
      if (
        status === 400 ||
        (error instanceof Error &&
          error.message.toLowerCase().includes('not owned by the user'))
      ) {
        if (
          session.paymentReference === dto.purchaseToken ||
          session.paymentStatus === SessionPaymentStatus.PAID
        ) {
          this.logger.warn(
            `Purchase token ${dto.purchaseToken} is no longer valid but session ${session.id} already references it. Treating as idempotent success.`,
          );
          return { success: true, valid: true };
        }
      }

      throw error;
    }

    if (purchase.purchaseState !== 0) {
      this.logger.warn(
        `Purchase state is not Purchased: ${purchase.purchaseState}`,
      );
      return { success: false, valid: false, reason: 'PURCHASE_NOT_VALID' };
    }

    try {
      await this.sessionsMutationService.updatePaymentStatus(
        session.id,
        SessionPaymentStatus.PAID,
        dto.purchaseToken,
      );
    } catch (error) {
      // Catch DB constraint error if another request managed to save it first despite the lock (e.g. cross-instance race condition)
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505'
      ) {
        this.logger.warn(
          `Unique constraint violation on payment_reference for token ${dto.purchaseToken}. Someone else consumed it.`,
        );
        return { success: false, valid: false, reason: 'ALREADY_CONSUMED' };
      }
      throw error;
    }

    return { success: true, valid: true };
  }
}
