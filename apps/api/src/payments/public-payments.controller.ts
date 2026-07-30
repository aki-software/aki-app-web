import { Controller, Get } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';

@Controller('public/payments')
export class PublicPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('stripe/pricing-plans')
  async getPricingPlans() {
    return this.paymentsService.getPricingPlans();
  }
}
