import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller.js';
import { PublicPaymentsController } from './public-payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { VouchersModule } from '../vouchers/vouchers.module.js';
import { PaymentLockService } from './payment-lock.service.js';
import { GooglePlayAdapter } from './google-play.adapter.js';
import { PaymentEvent } from './entities/payment-event.entity.js';
import { VoucherPlan } from './entities/voucher-plan.entity.js';
import { StripeWebhookProcessor } from './services/stripe-webhook.processor.js';
import { JobDispatcherService } from '../common/services/job-dispatcher.service.js';
import { CommonModule } from '../common/common.module.js';

@Module({
  imports: [
    SessionsModule,
    VouchersModule,
    CommonModule,
    TypeOrmModule.forFeature([PaymentEvent, VoucherPlan]),
  ],
  controllers: [PaymentsController, PublicPaymentsController],
  providers: [
    PaymentsService,
    PaymentLockService,
    GooglePlayAdapter,
    StripeWebhookProcessor,
  ],
})
export class PaymentsModule implements OnModuleInit {
  constructor(
    private readonly jobDispatcher: JobDispatcherService,
    private readonly stripeWebhookProcessor: StripeWebhookProcessor,
  ) {}

  onModuleInit(): void {
    this.jobDispatcher.registerHandler(this.stripeWebhookProcessor);
  }
}
