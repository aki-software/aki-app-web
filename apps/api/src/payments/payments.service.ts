import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoucherPlan } from './entities/voucher-plan.entity.js';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto';
import { SessionsService } from '../sessions/sessions.service';
import { SessionPaymentStatus } from '@akit/contracts';
import type { androidpublisher_v3 } from 'googleapis';
import { PaymentLockService } from './payment-lock.service';
import { GooglePlayAdapter } from './adapters/google-play.adapter.js';

import { ConfigService } from '@nestjs/config';
import { JobNames } from '../common/jobs/job-names.js';
import type { QueueAdapter } from '../common/adapters/queue.adapter.js';
import { QUEUE_ADAPTER } from '../common/constants/adapters.constants.js';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto.js';
import { PaymentGatewayRegistry } from './services/payment-gateway.registry.js';
import type {
  GatewayName,
  PaymentVerificationResult,
} from './interfaces/payment-gateway.interface.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly paymentLockService: PaymentLockService,
    private readonly googlePlayAdapter: GooglePlayAdapter,
    private readonly configService: ConfigService,
    @Inject(QUEUE_ADAPTER) private readonly queueAdapter: QueueAdapter,
    @InjectRepository(VoucherPlan)
    private readonly voucherPlanRepo: Repository<VoucherPlan>,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
  ) {}

  async verifyGooglePlayPurchase(dto: VerifyPlayPurchaseDto) {
    this.logger.log(`Verifying purchase for session ${dto.sessionId}`);

    await this.paymentLockService.acquireLock(dto.purchaseToken);
    try {
      const session = await this.sessionsService.findOne(dto.sessionId);
      if (!session) {
        throw new BadRequestException('Sesión no encontrada');
      }

      if (this.isAlreadyProcessed(session, dto.purchaseToken)) {
        this.logger.log(
          `Session ${session.id} is already PAID with this token`,
        );
        return { success: true, valid: true };
      }

      const existingSession = await this.sessionsService.findByPaymentToken(
        dto.purchaseToken,
      );
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

  private isAlreadyProcessed(
    session: {
      paymentReference?: string | null;
      paymentStatus?: SessionPaymentStatus;
    },
    token: string,
  ): boolean {
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
  ) {
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
      await this.sessionsService.updatePaymentStatus(
        session.id,
        SessionPaymentStatus.PAID,
        dto.purchaseToken,
      );

      // Assign STAFF_THERAPIST and enqueue PDF generation for B2C
      const staffTherapistId =
        this.configService.get<string>('STAFF_THERAPIST_ID');
      if (staffTherapistId) {
        await this.sessionsService.update(session.id, {
          therapistUserId: staffTherapistId,
        });
      } else {
        this.logger.warn(
          'STAFF_THERAPIST_ID not set, unable to assign therapist to B2C session',
        );
      }

      await this.queueAdapter
        .enqueue(
          JobNames.GeneratePdf,
          {
            sessionId: session.id,
            isB2C: true,
          },
          { delayMs: 1000 },
        )
        .catch((err) => {
          this.logger.warn(
            `Failed to enqueue PDF job for B2C session ${session.id}: ${(err as Error).message}`,
          );
        });
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

  async getPricingPlans(): Promise<VoucherPlan[]> {
    return this.voucherPlanRepo.find({
      where: { isActive: true },
      order: { priceArs: 'ASC' },
    });
  }

  async createCheckoutSession(
    dto: CreateCheckoutSessionDto,
    userId: string,
    institutionId: string,
  ): Promise<{ checkoutUrl: string }> {
    const plan = await this.voucherPlanRepo.findOne({
      where: { id: dto.voucherPlanId, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException('Voucher plan not found or inactive');
    }

    const adapter = this.gatewayRegistry.get(dto.gateway);
    const result = await adapter.createCheckoutSession({
      plan,
      userId,
      institutionId,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });
    return { checkoutUrl: result.checkoutUrl };
  }

  async verifyPayment(
    gatewayPaymentId: string,
    gateway: GatewayName,
  ): Promise<PaymentVerificationResult> {
    const adapter = this.gatewayRegistry.get(gateway);
    return adapter.verifyPayment(gatewayPaymentId);
  }
}
