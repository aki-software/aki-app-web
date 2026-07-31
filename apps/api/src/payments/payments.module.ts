import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller.js';
import { PublicPaymentsController } from './public-payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { VouchersModule } from '../vouchers/vouchers.module.js';
import { PaymentLockService } from './payment-lock.service.js';
import { PaymentEvent } from './entities/payment-event.entity.js';
import { VoucherPlan } from './entities/voucher-plan.entity.js';
import { StripeWebhookProcessor } from './services/stripe-webhook.processor.js';
import { JobDispatcherService } from '../common/services/job-dispatcher.service.js';
import { CommonModule } from '../common/common.module.js';
import { PaymentGatewayRegistry } from './services/payment-gateway.registry.js';
import { MercadoPagoAdapter } from './adapters/mercadopago.adapter.js';
import { StripeAdapter } from './adapters/stripe.adapter.js';
import { GooglePlayAdapter } from './adapters/google-play.adapter.js';

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
    PaymentGatewayRegistry,
    MercadoPagoAdapter,
    StripeAdapter,
    GooglePlayAdapter,
    StripeWebhookProcessor,
  ],
  exports: [PaymentGatewayRegistry, PaymentsService],
})
export class PaymentsModule implements OnModuleInit {
  constructor(
    private readonly jobDispatcher: JobDispatcherService,
    private readonly stripeWebhookProcessor: StripeWebhookProcessor,
    private readonly registry: PaymentGatewayRegistry,
    private readonly mpAdapter: MercadoPagoAdapter,
    private readonly stripeAdapter: StripeAdapter,
    private readonly googlePlayAdapter: GooglePlayAdapter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.mpAdapter);
    this.registry.register(this.stripeAdapter);
    this.registry.register(this.googlePlayAdapter);
    this.jobDispatcher.registerHandler(this.stripeWebhookProcessor);
  }
}
