import {
  Injectable,
  BadRequestException,
  HttpException,
  Logger,
  ServiceUnavailableException,
  NotFoundException,
} from '@nestjs/common';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto';
import { SessionsQueryService } from '../sessions/services/sessions-query.service';
import { SessionsMutationService } from '../sessions/services/sessions-mutation.service';
import { SessionOwnerResolverService } from '../sessions/services/session-owner-resolver.service';
import { PaymentStatus, SessionPaymentStatus } from '@akit/contracts';
import type { androidpublisher_v3 } from 'googleapis';
import { GooglePlayAdapter } from './google-play.adapter.js';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import { PaymentEvent } from './entities/payment-event.entity.js';
import { CheckoutAttempt } from './entities/checkout-attempt.entity.js';
import { Voucher } from '../vouchers/entities/voucher.entity.js';
import type { Session } from '../sessions/entities/session.entity.js';
import {
  VoucherBatchStatus,
  VoucherStatus,
} from '../vouchers/entities/voucher.enums.js';
import type {
  BillingHistory,
  CommercialSnapshot,
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
    private readonly sessionOwnerResolverService: SessionOwnerResolverService,
    private readonly sessionsMutationService: SessionsMutationService,
    private readonly googlePlayAdapter: GooglePlayAdapter,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async getCheckoutAttemptStatus(
    checkoutAttemptId: string,
    principal: { userId: string; institutionId: string },
  ): Promise<PaymentStatus> {
    const attempt = await this.dataSource.manager.findOne(CheckoutAttempt, {
      where: {
        id: checkoutAttemptId,
        buyerUserId: principal.userId,
        ownerInstitutionId: principal.institutionId,
      },
      relations: { voucherBatch: true },
    });
    if (!attempt) throw new NotFoundException('Checkout attempt not found');

    const paymentEvent = await this.dataSource.manager.findOne(PaymentEvent, {
      where: attempt.voucherBatchId
        ? [
            { checkoutAttemptId: attempt.id },
            { voucherBatchId: attempt.voucherBatchId },
          ]
        : { checkoutAttemptId: attempt.id },
      order: { createdAt: 'DESC' },
    });
    const voucherBatch = attempt.voucherBatch;
    const commercialSnapshot: CommercialSnapshot = attempt.commercialSnapshot;
    const paymentState = this.paymentState(
      attempt.state,
      voucherBatch?.status,
      paymentEvent?.status,
    );
    const fulfillmentState = this.fulfillmentState(
      paymentState,
      voucherBatch?.status,
      voucherBatch?.fulfilledAt,
      voucherBatch,
    );
    const issuedVoucherCount = voucherBatch?.fulfilledAt
      ? voucherBatch.quantity
      : null;
    const expectedVoucherCount = commercialSnapshot.voucherQuantity;

    return PaymentStatus.parse({
      paymentState,
      fulfillmentState,
      provider: attempt.gateway,
      providerFreshness: 'NOT_OBSERVED',
      observedAt: null,
      staleAfter: null,
      checkoutAttemptId: attempt.id,
      paymentEventId: paymentEvent?.id ?? null,
      voucherBatchId: attempt.voucherBatchId,
      commercialSnapshot,
      chargedTotal: commercialSnapshot.charged,
      issuedVoucherCount,
      expectedVoucherCount,
      voucherDiscrepancy:
        issuedVoucherCount === null || expectedVoucherCount === null
          ? null
          : issuedVoucherCount - expectedVoucherCount,
    });
  }

  private paymentState(
    attemptState: CheckoutAttempt['state'],
    batchStatus: VoucherBatchStatus | undefined,
    eventStatus: PaymentEvent['status'] | undefined,
  ): PaymentStatus['paymentState'] {
    if (eventStatus === 'APPROVED') return 'PAID';
    if (eventStatus === 'REJECTED') return 'FAILED';
    if (eventStatus === 'EXPIRED') return 'EXPIRED';
    if (eventStatus === 'PENDING') return 'PENDING';
    if (batchStatus === VoucherBatchStatus.PAID) return 'PAID';
    if (batchStatus === VoucherBatchStatus.FAILED) return 'FAILED';
    if (batchStatus === VoucherBatchStatus.CANCELLED) return 'CANCELLED';
    if (batchStatus === VoucherBatchStatus.REFUNDED) return 'REFUNDED';
    if (attemptState === 'FAILED') return 'FAILED';
    if (attemptState === 'OUTCOME_UNKNOWN') return 'UNKNOWN';
    return 'PENDING';
  }

  private fulfillmentState(
    paymentState: PaymentStatus['paymentState'],
    batchStatus: VoucherBatchStatus | undefined,
    fulfilledAt: Date | null | undefined,
    voucherBatch: VoucherBatch | null,
  ): PaymentStatus['fulfillmentState'] {
    if (batchStatus === VoucherBatchStatus.REFUNDED) return 'REVOKED';
    if (paymentState !== 'PAID') return 'NOT_APPLICABLE';
    if (!voucherBatch) return 'BLOCKED';
    return fulfilledAt ? 'FULFILLED' : 'QUEUED';
  }

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
      if (error instanceof HttpException && error.getStatus() < 500) {
        throw error;
      }

      this.logger.error({
        event: 'google_play_purchase_verification_failed',
        action: 'verify_google_play_purchase',
        sessionId: dto.sessionId,
        productId: dto.productId,
        errorClass: this.getErrorClass(error),
        ...this.getSafeProviderFailure(error),
      });
      throw new ServiceUnavailableException({
        code: 'GOOGLE_PLAY_VERIFICATION_UNAVAILABLE',
        message: 'Google Play verification is temporarily unavailable',
      });
    }
  }

  private getErrorClass(error: unknown): string {
    return error instanceof Error ? error.constructor.name : typeof error;
  }

  private getSafeProviderFailure(error: unknown): {
    providerStatus?: number;
    providerReason?: string;
    providerCode?: number | string;
  } {
    if (!error || typeof error !== 'object' || !('response' in error)) {
      return {};
    }

    const response = (
      error as {
        response?: {
          status?: unknown;
          data?: { error?: Record<string, unknown> };
        };
      }
    ).response;
    const providerError = response?.data?.error;
    const providerStatus =
      typeof response?.status === 'number' ? response.status : undefined;
    const providerReason =
      typeof providerError?.status === 'string' &&
      /^[A-Z_]{1,64}$/.test(providerError.status)
        ? providerError.status
        : undefined;
    const providerCode =
      typeof providerError?.code === 'number' ||
      (typeof providerError?.code === 'string' &&
        /^[A-Z0-9_]{1,64}$/.test(providerError.code))
        ? providerError.code
        : undefined;

    return { providerStatus, providerReason, providerCode };
  }

  private async resolvePaymentPatientId(principal: {
    userId: string;
    email?: string;
  }): Promise<string> {
    if (this.isUuid(principal.userId)) return principal.userId;

    if (!principal.email) {
      throw new BadRequestException('Unable to resolve payment patient');
    }

    const owner = await this.sessionOwnerResolverService.resolveFirebasePatient(
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

    // purchaseState: 0 = purchased, 1 = cancelled, 2 = pending.
    // Note: purchase.productId can be null/undefined for test purchases (License Testers)
    // via the Google Play Developer API. The productId was already validated against
    // expectedSku at the controller level, so we only hard-block on purchaseState here.
    if (purchase.purchaseState !== 0) {
      return { success: false, valid: false, reason: 'PURCHASE_NOT_VALID' };
    }
    if (purchase.productId != null && purchase.productId !== expectedSku) {
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
