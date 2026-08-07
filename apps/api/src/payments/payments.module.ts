import { Module } from '@nestjs/common';
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
import { PaymentLockService } from './payment-lock.service.js';
import { GooglePlayAdapter } from './google-play.adapter.js';
import { MercadoPagoAdapter } from './adapters/mercadopago.adapter.js';
import { StripeAdapter } from './adapters/stripe.adapter.js';
import { PricingPlan } from './entities/pricing-plan.entity.js';
import { PaymentEvent } from './entities/payment-event.entity.js';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from './interfaces/payment-gateway.adapter.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PricingPlan, PaymentEvent]),
    SessionsModule,
    VouchersModule,
  ],
  controllers: [PaymentsController, WebhookController, AdminPricingController],
  providers: [
    PaymentsService,
    PaymentLockService,
    GooglePlayAdapter,
    CheckoutService,
    WebhookProcessorService,
    ExchangeRateService,
    MercadoPagoAdapter,
    StripeAdapter,
    {
      provide: PAYMENT_GATEWAY_MP,
      useClass: MercadoPagoAdapter,
    },
    {
      provide: PAYMENT_GATEWAY_STRIPE,
      useClass: StripeAdapter,
    },
  ],
})
export class PaymentsModule {}
