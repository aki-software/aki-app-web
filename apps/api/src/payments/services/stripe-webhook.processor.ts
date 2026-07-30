import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { StripeEvent } from '../entities/stripe-event.entity.js';
import { StripeProductMapping } from '../entities/stripe-product-mapping.entity.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { VoucherOwnerType } from '../../vouchers/entities/voucher.enums.js';
import { JobHandler } from '../../common/jobs/handlers/job-handler.interface.js';
import { JobNames } from '../../common/jobs/job-names.js';
import { JobDispatcherService } from '../../common/services/job-dispatcher.service.js';

export interface StripeWebhookPayload {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      metadata?: Record<string, string>;
      client_reference_id?: string;
      amount_total?: number;
      line_items?: {
        data: Array<{
          price?: { id: string };
        }>;
      };
    };
  };
}

@Injectable()
export class StripeWebhookProcessor implements JobHandler<StripeWebhookPayload> {
  readonly name = JobNames.ProcessStripeWebhook;
  private readonly logger = new Logger(StripeWebhookProcessor.name);

  constructor(
    @InjectRepository(StripeEvent)
    private readonly stripeEventRepo: Repository<StripeEvent>,
    @InjectRepository(StripeProductMapping)
    private readonly productMappingRepo: Repository<StripeProductMapping>,
    private readonly vouchersService: VouchersService,
    private readonly dataSource: DataSource,
    private readonly jobDispatcher: JobDispatcherService,
  ) {}

  async handle(payload: StripeWebhookPayload): Promise<void> {
    if (payload.type !== 'checkout.session.completed') {
      return;
    }

    const session = payload.data.object;

    // Idempotency check
    const existingEvent = await this.stripeEventRepo.findOne({
      where: { stripeEventId: payload.id },
    });

    if (existingEvent) {
      this.logger.warn(
        `Stripe event ${payload.id} already processed. Skipping.`,
      );
      return;
    }

    const institutionId =
      session.metadata?.institutionId ?? session.client_reference_id;

    if (!institutionId) {
      this.logger.error(
        `No institutionId or client_reference_id found for session ${session.id}`,
      );
      return;
    }

    const priceId =
      session.metadata?.priceId ?? session.line_items?.data?.[0]?.price?.id;

    let mapping: StripeProductMapping | null = null;

    if (priceId) {
      mapping = await this.productMappingRepo.findOne({
        where: { stripePriceId: priceId },
      });
    }

    if (!mapping) {
      this.logger.error(
        `No product mapping found for event ${payload.id}. Ensure priceId is provided in metadata.`,
      );
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.vouchersService.create({
        ownerType: VoucherOwnerType.INSTITUTION,
        ownerInstitutionId: institutionId,
        quantity: mapping.voucherQuantity,
        name: `Stripe Checkout ${session.id}`,
      });

      const processedEvent = this.stripeEventRepo.create({
        stripeEventId: payload.id,
        type: payload.type,
        payload: payload as unknown as Record<string, unknown>,
      });
      await queryRunner.manager.save(processedEvent);

      await queryRunner.commitTransaction();
      this.logger.log(
        `Successfully processed stripe event ${payload.id} and added ${mapping.voucherQuantity} vouchers to institution ${institutionId}`,
      );

      this.logger.log(`[TODO] Send purchase confirmation email to institution`);
      /*
      await this.jobDispatcher.dispatch(JobNames.SendEmail, {
        to: institutionEmail, // NOT AVAILABLE YET
        subject: 'Vouchers acreditados',
        template: 'voucher-purchase-confirmation',
        context: { quantity: mapping.voucherQuantity, institutionId },
      });
      */
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to process stripe event ${payload.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
