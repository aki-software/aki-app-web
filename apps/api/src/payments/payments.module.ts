import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SessionsModule } from '../sessions/sessions.module';

import { PaymentLockService } from './payment-lock.service';

@Module({
  imports: [SessionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentLockService],
})
export class PaymentsModule {}
