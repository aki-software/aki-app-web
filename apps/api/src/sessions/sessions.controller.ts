import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Inject,
  InternalServerErrorException,
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
import { SessionDto, SessionDetailDto } from './dto/session.dto.js';
import { ReportService } from './services/report.service.js';
import { PDF_GENERATOR } from '../common/constants/adapters.constants.js';
import type { PdfGenerator } from '../common/adapters/pdf-generator.adapter.js';
import { SessionMetricsService } from './services/session-metrics.service.js';
import { AdminDashboardService } from './services/admin-dashboard.service.js';
import { SessionsQueryService } from './services/sessions-query.service.js';
import { SessionsMutationService } from './services/sessions-mutation.service.js';
import { SessionsOrchestratorService } from './services/sessions-orchestrator.service.js';
import { ReportPdfService } from './services/report-pdf.service.js';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Sessions')
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

  private parseIntOrDefault(
    value: string | undefined,
    fallback: number,
  ): number {
    if (!value) return fallback;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  constructor(
    private readonly sessionsQueryService: SessionsQueryService,
    private readonly sessionsMutationService: SessionsMutationService,
    private readonly sessionsOrchestratorService: SessionsOrchestratorService,
    private readonly sessionMetricsService: SessionMetricsService,
    private readonly reportService: ReportService,
    @Inject(PDF_GENERATOR) private readonly pdfGenerator: PdfGenerator,
    private readonly adminDashboardService: AdminDashboardService,
    private readonly reportPdfService: ReportPdfService,
  ) {}

  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({ status: 201, type: SessionDto })
  @Post()
  async create(
    @Body() createSessionDto: CreateSessionDto,
  ): Promise<SessionDto> {
    const { session } =
      await this.sessionsMutationService.create(createSessionDto);
    return session as SessionDto;
  }

  @ApiOperation({ summary: 'Complete an active session' })
  @ApiResponse({ status: 201, type: SessionDetailDto })
  @Post('complete')
  async complete(
    @Body() completeSessionDto: CompleteSessionDto,
  ): Promise<SessionDetailDto> {
    const result =
      await this.sessionsMutationService.completeSession(completeSessionDto);
    return result as SessionDetailDto;
  }

  @ApiOperation({ summary: 'List all sessions' })
  @ApiResponse({ status: 200, type: [SessionDto] })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const parsedPage = this.parseIntOrDefault(
      page,
      SESSION_CONSTANTS.PAGINATION.DEFAULT_PAGE,
    );
    const parsedLimit = this.parseIntOrDefault(
      limit,
      SESSION_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    );
    return this.sessionsQueryService.findAll(
      parsedPage,
      parsedLimit,
      this.extractScope(req),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/overview')
  async getAdminOverview(@Query('days') days?: string) {
    const parsedDays = this.parseIntOrDefault(
      days,
      SESSION_CONSTANTS.ADMIN.DEFAULT_OVERVIEW_DAYS,
    );
    return await this.adminDashboardService.getAdminOverview(parsedDays);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/activity')
  async getAdminActivity(@Query('limit') limit?: string) {
    const parsedLimit = this.parseIntOrDefault(
      limit,
      SESSION_CONSTANTS.ADMIN.DEFAULT_ACTIVITY_LIMIT,
    );
    return await this.adminDashboardService.getAdminActivity(parsedLimit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('triage')
  async triage(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const parsedPage = this.parseIntOrDefault(
      page,
      SESSION_CONSTANTS.PAGINATION.DEFAULT_PAGE,
    );
    const parsedLimit = this.parseIntOrDefault(
      limit,
      SESSION_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    );
    return this.sessionsQueryService.findTriage(
      parsedPage,
      parsedLimit,
      this.extractScope(req),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('metrics/aggregate')
  async getAggregateMetrics(
    @Query('scope') scope: string,
    @Query('id') id?: string,
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!scope || !['institution', 'global'].includes(scope)) {
      throw new BadRequestException('scope must be "institution" or "global"');
    }
    if (scope === 'institution' && !id) {
      throw new BadRequestException('id is required when scope=institution');
    }

    const parsedPeriod = this.parseIntOrDefault(period, 30);

    if (period !== undefined && (parsedPeriod < 1 || parsedPeriod > 365)) {
      throw new BadRequestException('period must be between 1 and 365');
    }

    return await this.adminDashboardService.getBehavioralTrends({
      scope,
      id,
      period: parsedPeriod,
      from,
      to,
    });
  }

  @ApiOperation({ summary: 'Get session by id' })
  @ApiResponse({ status: 200, type: SessionDetailDto })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req?: AuthenticatedRequest,
  ): Promise<SessionDetailDto> {
    const result = await this.sessionsQueryService.findOne(
      id,
      this.extractScope(req),
    );
    return result as SessionDetailDto;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/result')
  async findResult(@Param('id') id: string, @Req() req?: AuthenticatedRequest) {
    const session = await this.sessionsQueryService.findOne(
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
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/send-report')
  async sendReport(
    @Param('id') id: string,
    @Body() sendReportDto: SendReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.sessionsOrchestratorService.sendReport(
      id,
      sendReportDto.email,
      null,
      this.extractScope(req),
      sendReportDto.force,
    );

    if (!result.success) {
      throw new InternalServerErrorException(result.message);
    }

    return result;
  }

  @Get(':id/metrics')
  @UseGuards(JwtAuthGuard)
  async getSessionMetrics(
    @Param('id') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const scope = this.extractScope(req);
    const session = await this.sessionsQueryService.findOne(sessionId, scope);
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
    const scope = this.extractVoucherScope(req);
    return await this.sessionsQueryService.findVoucherSessions(
      voucherId,
      scope,
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
    const session = await this.sessionsService.findOneForReport(
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
