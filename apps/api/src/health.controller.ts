import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  @HttpCode(HttpStatus.OK)
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
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
