import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Inject,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../users/entities/user.entity.js';
import { SESSION_CONSTANTS } from './constants/sessions.constants.js';
import { CompleteSessionDto } from './dto/complete-session.dto.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { SendReportDto } from './dto/send-report.dto.js';
import { ReportService } from './services/report.service.js';
import { PDF_GENERATOR } from '../common/constants/adapters.constants.js';
import type { PdfGenerator } from '../common/adapters/pdf-generator.adapter.js';
import { SessionMetricsService } from './services/session-metrics.service.js';
import { AdminDashboardService } from './services/admin-dashboard.service.js';
import { SessionsService } from './sessions.service.js';
import { ReportPdfService } from './services/report-pdf.service.js';

@Controller('sessions')
export class SessionsController {
  private extractScope(req?: AuthenticatedRequest) {
    return {
      role: req?.user?.role,
      therapistUserId: req?.user?.userId,
      patientId: req?.user?.userId,
      institutionId: req?.user?.institutionId,
    };
  }

  private extractVoucherScope(req?: AuthenticatedRequest) {
    return {
      role: req?.user?.role,
      ownerUserId: req?.user?.userId,
      ownerInstitutionId: req?.user?.institutionId,
    };
  }
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionMetricsService: SessionMetricsService,
    private readonly reportService: ReportService,
    @Inject(PDF_GENERATOR) private readonly pdfGenerator: PdfGenerator,
    private readonly adminDashboardService: AdminDashboardService,
    private readonly reportPdfService: ReportPdfService,
  ) {}

  @Post()
  async create(@Body() createSessionDto: CreateSessionDto) {
    const { session } = await this.sessionsService.create(createSessionDto);
    return session;
  }

  @Post('complete')
  async complete(@Body() completeSessionDto: CompleteSessionDto) {
    return await this.sessionsService.completeSession(completeSessionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const parsedPage = page
      ? parseInt(page, 10)
      : SESSION_CONSTANTS.PAGINATION.DEFAULT_PAGE;
    const parsedLimit = limit
      ? parseInt(limit, 10)
      : SESSION_CONSTANTS.PAGINATION.DEFAULT_LIMIT;
    return this.sessionsService.findAll(
      parsedPage,
      parsedLimit,
      this.extractScope(req),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/overview')
  async getAdminOverview(@Query('days') days?: string) {
    const parsedDays = days
      ? parseInt(days, 10)
      : SESSION_CONSTANTS.ADMIN.DEFAULT_OVERVIEW_DAYS;
    return await this.adminDashboardService.getAdminOverview(parsedDays);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/activity')
  async getAdminActivity(@Query('limit') limit?: string) {
    const parsedLimit = limit
      ? parseInt(limit, 10)
      : SESSION_CONSTANTS.ADMIN.DEFAULT_ACTIVITY_LIMIT;
    return await this.adminDashboardService.getAdminActivity(parsedLimit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req?: AuthenticatedRequest) {
    try {
      return await this.sessionsService.findOne(id, this.extractScope(req));
    } catch (e: unknown) {
      throw new NotFoundException(
        e instanceof Error ? e.message : 'Session not found',
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/result')
  async findResult(@Param('id') id: string, @Req() req?: AuthenticatedRequest) {
    try {
      const session = await this.sessionsService.findOne(
        id,
        this.extractScope(req),
      );
      return {
        sessionId: session.id,
        results: session.results || [],
        hollandCode: session.hollandCode,
        totalTimeMs: session.totalTimeMs,
        startedAt: session.createdAt,
      };
    } catch (e: unknown) {
      throw new NotFoundException(
        e instanceof Error ? e.message : 'Session not found',
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/send-report')
  async sendReport(
    @Param('id') id: string,
    @Body() sendReportDto: SendReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.sessionsService.sendReport(
      id,
      sendReportDto.email,
      null,
      this.extractScope(req),
    );
  }

  @Get(':id/metrics')
  @UseGuards(JwtAuthGuard)
  async getSessionMetrics(
    @Param('id') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const scope = this.extractScope(req);
    const session = await this.sessionsService.findOne(sessionId, scope);
    return this.sessionMetricsService.getMetricsBySessionId(session.id);
  }

  @Get('voucher/:voucherId/sessions')
  @UseGuards(JwtAuthGuard)
  async getVoucherSessions(
    @Param('voucherId') voucherId: string,
    @Req() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minDuration') minDuration?: string,
    @Query('maxDuration') maxDuration?: string,
  ) {
    return this.sessionsService.findVoucherSessions(
      voucherId,
      this.extractVoucherScope(req),
      {
        startDate,
        endDate,
        minDuration,
        maxDuration,
      },
    );
  }

  @Get(':id/report/pdf')
  @UseGuards(JwtAuthGuard)
  async generateSessionPdf(
    @Param('id') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const session = await this.sessionsService.findOne(
      sessionId,
      this.extractScope(req),
    );

    const reportData = await this.reportService.buildReportData(session);
    const html = this.reportPdfService.renderHtml(reportData);
    const pdfBuffer = await this.pdfGenerator.generateFromHtml(html);

    const safeName = (
      session.patientName ?? SESSION_CONSTANTS.REPORTS.DEFAULT_PDF_PREFIX
    )
      .replace(/[^a-z0-9\s-]/gi, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${SESSION_CONSTANTS.REPORTS.DEFAULT_PDF_PREFIX}-${safeName}-${sessionId}.pdf"`,
    );
    res.send(pdfBuffer);
  }
}
