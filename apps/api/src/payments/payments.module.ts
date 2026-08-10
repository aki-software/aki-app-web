import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller.js';
import { WebhookController } from './webhook.controller.js';
import { AdminPricingController } from './admin-pricing.controller.js';
import { PaymentsService } from './payments.service.js';
import { CheckoutService } from './services/checkout.service.js';
import { WebhookProcessorService } from './services/webhook-processor.service.js';
import { ExchangeRateService } from './services/exchange-rate.service.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { VouchersModule } from '../vouchers/vouchers.module.js';
import { GooglePlayAdapter } from './google-play.adapter.js';
import { PricingPlan } from './entities/pricing-plan.entity.js';
import { PaymentEvent } from './entities/payment-event.entity.js';
import { PaymentFulfillmentOutbox } from './entities/payment-fulfillment-outbox.entity.js';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import { PaymentGatewayModule } from './payment-gateway.module.js';
import { VoucherFulfillmentDispatcherService } from './services/voucher-fulfillment-dispatcher.service.js';
import { VoucherFulfillmentProcessor } from './services/voucher-fulfillment.processor.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingPlan,
      PaymentEvent,
      VoucherBatch,
      PaymentFulfillmentOutbox,
    ]),
    BullModule.registerQueue({ name: 'voucher-fulfillment' }),
    SessionsModule,
    VouchersModule,
    PaymentGatewayModule,
  ],
  controllers: [PaymentsController, WebhookController, AdminPricingController],
  providers: [
    PaymentsService,
    GooglePlayAdapter,
    CheckoutService,
    WebhookProcessorService,
    VoucherFulfillmentDispatcherService,
    VoucherFulfillmentProcessor,
    ExchangeRateService,
  ],
})
export class PaymentsModule {}
