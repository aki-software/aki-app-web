import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  QueryFailedError,
} from 'typeorm';
import { PaymentEvent } from '../entities/payment-event.entity.js';
import { VoucherPlan } from '../entities/voucher-plan.entity.js';
import { PaymentEventStatus } from '../enums/payment-event-status.enum.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { VoucherOwnerType } from '../../vouchers/entities/voucher.enums.js';
import { JobHandler } from '../../common/jobs/handlers/job-handler.interface.js';
import { JobNames } from '../../common/jobs/job-names.js';
import type {
  GatewayName,
  WebhookEventResult,
  WebhookEventType,
} from '../interfaces/payment-gateway.interface.js';

export interface WebhookJobPayload {
  gatewayName: GatewayName;
  event: WebhookEventResult;
}

/** Signature for each event-type handler inside the processor. */
type EventHandler = (
  gatewayName: GatewayName,
  event: WebhookEventResult,
  manager: EntityManager,
) => Promise<void>;

@Injectable()
export class PaymentWebhookProcessor implements JobHandler<WebhookJobPayload> {
  readonly name = JobNames.ProcessPaymentWebhook;
  private readonly logger = new Logger(PaymentWebhookProcessor.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(PaymentEvent)
    private readonly paymentEventRepo: Repository<PaymentEvent>,
    @InjectRepository(VoucherPlan)
    private readonly voucherPlanRepo: Repository<VoucherPlan>,
    private readonly vouchersService: VouchersService,
  ) {}

  // ---------------------------------------------------------------------------
  // Event handlers — adding a new type = one new entry here
  // ---------------------------------------------------------------------------

  private readonly eventHandlers: Record<WebhookEventType, EventHandler> = {
    approved: (gatewayName, event, manager) =>
      this.handleApproved(gatewayName, event, manager),
    chargeback: (gatewayName, event, manager) =>
      this.handleChargeback(gatewayName, event, manager),
    pending: (gatewayName, event, manager) =>
      this.updateStatus(
        gatewayName,
        event,
        PaymentEventStatus.PENDING,
        manager,
      ),
    rejected: (gatewayName, event, manager) =>
      this.updateStatus(
        gatewayName,
        event,
        PaymentEventStatus.REJECTED,
        manager,
      ),
    refunded: (gatewayName, event, manager) =>
      this.updateStatus(
        gatewayName,
        event,
        PaymentEventStatus.REFUNDED,
        manager,
      ),
  };

  async handle(payload: WebhookJobPayload): Promise<void> {
    const { gatewayName, event } = payload;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.insertIdempotentEvent(gatewayName, event, queryRunner.manager);

      const handler = this.eventHandlers[event.type];
      if (handler) {
        await handler(gatewayName, event, queryRunner.manager);
      } else {
        this.logger.warn(`Unhandled webhook event type: ${event.type}`);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Failed to process webhook event',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async insertIdempotentEvent(
    gatewayName: GatewayName,
    event: WebhookEventResult,
    manager: EntityManager,
  ): Promise<void> {
    const newEvent = this.paymentEventRepo.create({
      gatewayName,
      gatewayPaymentId: event.gatewayPaymentId,
      gatewayEventType: event.type,
      status: PaymentEventStatus.PENDING,
      amountPaid: event.amountPaid,
      currency: event.currency,
      institutionId: event.institutionId ?? null,
      userId: event.userId ?? null,
      voucherPlanId: event.voucherPlanId ?? null,
      rawPayload: event.rawPayload,
    });

    try {
      await manager.insert(PaymentEvent, newEvent);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        this.logger.warn(
          `Duplicate event ${gatewayName}:${event.gatewayPaymentId}. Skipping.`,
        );
        // Throw a sentinel to abort the outer transaction cleanly
        throw new DuplicateEventError();
      }
      throw error;
    }
  }

  /** Updates a PaymentEvent to a terminal status. Shared by pending/rejected/refunded. */
  private async updateStatus(
    gatewayName: GatewayName,
    event: WebhookEventResult,
    status: PaymentEventStatus,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(
      PaymentEvent,
      { gatewayName, gatewayPaymentId: event.gatewayPaymentId },
      { status, processedAt: new Date() },
    );
    this.logger.log(`Payment ${event.gatewayPaymentId} updated to ${status}`);
  }

  /** Credits vouchers for an approved payment after exact price validation. */
  private async handleApproved(
    gatewayName: GatewayName,
    event: WebhookEventResult,
    manager: EntityManager,
  ): Promise<void> {
    if (!event.voucherPlanId) {
      throw new InternalServerErrorException(
        'Missing voucherPlanId for approved event',
      );
    }
    if (!event.institutionId) {
      throw new InternalServerErrorException(
        'Missing institutionId for approved event',
      );
    }

    const plan = await this.voucherPlanRepo.findOne({
      where: { id: event.voucherPlanId },
    });
    if (!plan) {
      throw new InternalServerErrorException(
        `Voucher plan ${event.voucherPlanId} not found`,
      );
    }

    if (Math.round(event.amountPaid) !== Math.round(plan.priceArs)) {
      this.logger.error(
        `Amount mismatch for ${event.gatewayPaymentId}. ` +
          `Expected: ${plan.priceArs}, Actual: ${event.amountPaid}`,
      );
      await this.updateStatus(
        gatewayName,
        event,
        PaymentEventStatus.REJECTED,
        manager,
      );
      return;
    }

    await this.vouchersService.create({
      ownerType: VoucherOwnerType.INSTITUTION,
      ownerInstitutionId: event.institutionId,
      quantity: plan.voucherQuantity,
      name: `${gatewayName} payment ${event.gatewayPaymentId}`,
    });

    await this.updateStatus(
      gatewayName,
      event,
      PaymentEventStatus.APPROVED,
      manager,
    );
    this.logger.log(
      `Approved ${event.gatewayPaymentId}: credited ${plan.voucherQuantity} vouchers to ${event.institutionId}`,
    );
  }

  /** Logs chargeback alert. Manual review required — vouchers are NOT reversed. */
  private async handleChargeback(
    gatewayName: GatewayName,
    event: WebhookEventResult,
    manager: EntityManager,
  ): Promise<void> {
    this.logger.error(
      `CHARGEBACK ALERT: manual review required for payment ${event.gatewayPaymentId} (gateway: ${gatewayName})`,
    );
    await this.updateStatus(
      gatewayName,
      event,
      PaymentEventStatus.CHARGEBACK,
      manager,
    );
  }
}

/** Sentinel error used to abort the outer transaction on duplicate events without logging an error. */
class DuplicateEventError extends Error {
  constructor() {
    super('duplicate_event');
  }
}
