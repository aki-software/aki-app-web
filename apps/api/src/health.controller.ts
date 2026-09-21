import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { getPaymentReadiness } from './payments/config/payment-configuration.js';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get(['health', 'api/v1/health'])
  @HttpCode(HttpStatus.OK)
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      payment: getPaymentReadiness(process.env),
    };
  }

  @Get(['health/ready', 'api/v1/health/ready'])
  @HttpCode(HttpStatus.OK)
  async checkReady() {
    try {
      // Execute a lightweight query to ensure the database connection pool is alive
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new ServiceUnavailableException('Database connection is not ready');
    }
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
