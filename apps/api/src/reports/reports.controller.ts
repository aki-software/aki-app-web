import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { ReportAccessService } from './report-access.service.js';

class GrantDto {
  @IsString() @IsNotEmpty() operationKey!: string;
}
class ConsumeDto {
  @IsString() @IsNotEmpty() token!: string;
  @IsString() @IsNotEmpty() operationKey!: string;
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly access: ReportAccessService) {}
  private scope(req: AuthenticatedRequest) {
    return {
      role: req.user?.role ?? '',
      userId: req.user?.userId,
      institutionId: req.user?.institutionId,
    };
  }
  @Get(':reportId') async status(
    @Param('reportId') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const report = await this.access.status(id, this.scope(req));
    return {
      id: report.id,
      status: report.status,
      version: report.version,
      generatedAt: report.generatedAt,
      availableUntil: report.availableUntil,
      deliveryReady: report.status === 'AVAILABLE',
    };
  }
  @Post(':reportId/grants') issue(
    @Param('reportId') id: string,
    @Body() dto: GrantDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.access.issue(id, this.scope(req), dto.operationKey);
  }
  @Post(':reportId/grants/renew') renew(
    @Param('reportId') id: string,
    @Body() dto: GrantDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.access.renew(id, this.scope(req), dto.operationKey);
  }
  @Post('grants/consume') async consume(
    @Body() dto: ConsumeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.access.consume(dto.token, this.scope(req), dto.operationKey);
    return { consumed: true };
  }
}
