import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { getPaymentReadiness } from './payments/config/payment-configuration.js';

@Controller()
export class HealthController {
  @Get('health')
  @HttpCode(HttpStatus.OK)
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      payment: getPaymentReadiness(process.env),
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  checkRoot() {
    return {
      status: 'ok',
      message: 'A.kit API is running.',
    };
  }
}
