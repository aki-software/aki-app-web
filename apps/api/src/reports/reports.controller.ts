import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { ReportAccessService } from './report-access.service.js';
import { PrivateReportStorageService } from './private-report-storage.service.js';
import { RequestReportDeliveryDto } from './dto/request-report-delivery.dto.js';
import { ReportsService } from './reports.service.js';

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
  constructor(
    private readonly access: ReportAccessService,
    private readonly storage: PrivateReportStorageService,
    private readonly reports: ReportsService,
  ) {}
  private scope(req: AuthenticatedRequest) {
    return {
      role: req.user?.role ?? '',
      userId: req.user?.userId,
      email: req.user?.email,
      institutionId: req.user?.institutionId,
    };
  }

  private sendPdf(response: Response, filename: string, pdf: Buffer): void {
    response.set({
      'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      'Content-Type': 'application/pdf',
    });
    response.removeHeader('ETag');
    response.attachment(filename);
    response.status(200).end(pdf);
  }

  @Get('sessions/:sessionId/download')
  async downloadForSession(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const scope = this.scope(req);
    const report = await this.access.downloadForSession(sessionId, scope);
    if (!report.objectKey) {
      throw new NotFoundException('Report file not found.');
    }
    const pdf = await this.storage.get(report.objectKey);
    if (!pdf) throw new NotFoundException('Report file not found.');
    await this.access.recordDownload(report, scope);
    this.sendPdf(response, `report-${sessionId}.pdf`, pdf);
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
  @Get(':reportId/download')
  async download(
    @Param('reportId') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const scope = this.scope(req);
    const report = await this.access.download(id, scope);
    if (!report.objectKey) {
      throw new NotFoundException('Report file not found.');
    }
    const pdf = await this.storage.get(report.objectKey);
    if (!pdf) throw new NotFoundException('Report file not found.');
    await this.access.recordDownload(report, scope);
    this.sendPdf(response, `report-${report.id}.pdf`, pdf);
  }
  @Post(':reportId/deliveries')
  async requestDelivery(
    @Param('reportId') id: string,
    @Body() dto: RequestReportDeliveryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.access.authorizeDelivery(
      id,
      this.scope(req),
      dto.recipientEmail,
      dto.operationKey,
    );
    return this.reports.enqueueDelivery(id, dto.recipientEmail);
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
