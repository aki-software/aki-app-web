import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminPaymentLedgerQuery } from '@akit/contracts';
import type { Response } from 'express';
import { UserRole } from '@akit/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AdminPaymentLedgerService } from './services/admin-payment-ledger.service.js';

@Controller('admin/payment-ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPaymentLedgerController {
  constructor(private readonly ledger: AdminPaymentLedgerService) {}

  @Get()
  async list(
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = AdminPaymentLedgerQuery.safeParse(query);
    if (!parsed.success)
      throw new BadRequestException('Invalid payment ledger query');
    response.setHeader('Cache-Control', 'private, no-store');
    return this.ledger.list(parsed.data);
  }

  @Get(':voucherBatchId')
  async detail(
    @Param('voucherBatchId', ParseUUIDPipe) voucherBatchId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'private, no-store');
    return this.ledger.detail(voucherBatchId);
  }
}
