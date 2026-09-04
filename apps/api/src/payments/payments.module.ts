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
import { CheckoutAttempt } from './entities/checkout-attempt.entity.js';
import { PaymentNotificationDelivery } from './entities/payment-notification-delivery.entity.js';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import { PaymentGatewayModule } from './payment-gateway.module.js';
import { VoucherFulfillmentDispatcherService } from './services/voucher-fulfillment-dispatcher.service.js';
import { VoucherFulfillmentProcessor } from './services/voucher-fulfillment.processor.js';
import { PaymentReconciliationService } from './services/payment-reconciliation.service.js';
import { PaymentNotificationIntentService } from './services/payment-notification-intent.service.js';
import { PaymentNotificationDeliveryStateService } from './services/payment-notification-delivery-state.service.js';
import {
  PAYMENT_NOTIFICATION_DELIVERY_QUEUE,
  PAYMENT_NOTIFICATION_DISPATCHER,
  PaymentNotificationDispatcherService,
} from './services/payment-notification-dispatcher.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingPlan,
      PaymentEvent,
      VoucherBatch,
      PaymentFulfillmentOutbox,
      CheckoutAttempt,
      PaymentNotificationDelivery,
    ]),
    BullModule.registerQueue({ name: 'voucher-fulfillment' }),
    BullModule.registerQueue({ name: PAYMENT_NOTIFICATION_DELIVERY_QUEUE }),
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
    PaymentNotificationIntentService,
    PaymentNotificationDeliveryStateService,
    PaymentNotificationDispatcherService,
    {
      provide: PAYMENT_NOTIFICATION_DISPATCHER,
      useExisting: PaymentNotificationDispatcherService,
    },
    PaymentReconciliationService,
    ExchangeRateService,
  ],
  exports: [PAYMENT_NOTIFICATION_DISPATCHER],
})
export class PaymentsModule {}
