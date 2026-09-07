import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PurchaseSummaryQuery, UserRole } from '@akit/contracts';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { PurchaseSummaryService } from './services/purchase-summary.service.js';

@Controller('payments/purchase-summary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.INSTITUTION_ADMIN)
export class PurchaseSummaryController {
  constructor(private readonly summary: PurchaseSummaryService) {}

  @Get()
  async get(
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = PurchaseSummaryQuery.safeParse(query);
    if (!parsed.success)
      throw new BadRequestException('Invalid purchase summary query');
    const user = request.user;
    const scope =
      user?.role === UserRole.ADMIN
        ? { scope: 'PLATFORM' as const }
        : user?.role === UserRole.INSTITUTION_ADMIN && user.institutionId
          ? { scope: 'INSTITUTION' as const, institutionId: user.institutionId }
          : null;
    if (!scope)
      throw new ForbiddenException(
        'Institution administrator requires an institution',
      );
    response.setHeader('Cache-Control', 'private, no-store');
    return this.summary.get(parsed.data, scope);
  }
}
