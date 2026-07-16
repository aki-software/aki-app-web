import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { SessionsModule } from '../sessions/sessions.module.js';

import { PaymentLockService } from './payment-lock.service.js';
import { GooglePlayAdapter } from './google-play.adapter.js';

@Module({
  imports: [SessionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentLockService, GooglePlayAdapter],
})
export class PaymentsModule {}
