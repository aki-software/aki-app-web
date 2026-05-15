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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../users/entities/user.entity.js';
import { CompleteSessionDto } from './dto/complete-session.dto.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { SendReportDto } from './dto/send-report.dto.js';
import { SessionCompleteMapperService } from './services/session-complete-mapper.service.js';
import { SessionMetricsService } from './services/session-metrics.service.js';
import { ReportService } from './services/report.service.js';
import { SessionsService } from './sessions.service.js';
import { SESSION_CONSTANTS } from './constants/sessions.constants.js';

type AuthenticatedRequest = Request & {
  user?: {
    userId?: string;
    role?: string;
    institutionId?: string | null;
  };
};

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionCompleteMapper: SessionCompleteMapperService,
    private readonly sessionMetricsService: SessionMetricsService,
    private readonly reportService: ReportService,
  ) {}

  @Post()
  async create(@Body() createSessionDto: CreateSessionDto) {
    const { session } = await this.sessionsService.create(createSessionDto);
    return session;
  }

  @Post('complete')
  async complete(@Body() completeSessionDto: CompleteSessionDto) {
    const mapped =
      await this.sessionCompleteMapper.toCreateSessionDto(completeSessionDto);
    const syncKey = this.sessionCompleteMapper.buildSyncKey(
      mapped.payloadId ?? null,
      mapped.payloadUserId ?? null,
      mapped.payloadStartedAt,
    );
    const { session: createdSession, duplicated } =
      await this.sessionsService.create(mapped.createSessionDto, {
        idempotencyKey: syncKey ?? undefined,
      });

    await this.sessionCompleteMapper.attachVoucherIfNeeded(
      mapped,
      createdSession.id,
    );

    return {
      id: createdSession.id,
      duplicated,
    };
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
    return this.sessionsService.findAll(parsedPage, parsedLimit, {
      role: req?.user?.role,
      therapistUserId: req?.user?.userId,
      patientId: req?.user?.userId,
      institutionId: req?.user?.institutionId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/overview')
  async getAdminOverview(
    @Req() req?: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    this.assertAdmin(req);
    const parsedDays = days
      ? parseInt(days, 10)
      : SESSION_CONSTANTS.ADMIN.DEFAULT_OVERVIEW_DAYS;
    return await this.sessionsService.getAdminOverview(parsedDays);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/activity')
  async getAdminActivity(
    @Req() req?: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    this.assertAdmin(req);
    const parsedLimit = limit
      ? parseInt(limit, 10)
      : SESSION_CONSTANTS.ADMIN.DEFAULT_ACTIVITY_LIMIT;
    return await this.sessionsService.getAdminActivity(parsedLimit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req?: AuthenticatedRequest) {
    try {
      return await this.sessionsService.findOne(id, {
        role: req?.user?.role,
        therapistUserId: req?.user?.userId,
        patientId: req?.user?.userId,
        institutionId: req?.user?.institutionId,
      });
    } catch (e) {
      throw new NotFoundException(e.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/result')
  async findResult(@Param('id') id: string, @Req() req?: AuthenticatedRequest) {
    try {
      const session = await this.sessionsService.findOne(id, {
        role: req?.user?.role,
        therapistUserId: req?.user?.userId,
        patientId: req?.user?.userId,
        institutionId: req?.user?.institutionId,
      });
      return {
        sessionId: session.id,
        results: session.results || [],
        hollandCode: session.hollandCode,
        totalTimeMs: session.totalTimeMs,
        startedAt: session.createdAt,
      };
    } catch (e) {
      throw new NotFoundException(e.message);
    }
  }

  @Post(':id/send-report')
  async sendReport(
    @Param('id') id: string,
    @Body() sendReportDto: SendReportDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    return await this.sessionsService.sendReport(
      id,
      sendReportDto.email,
      null,
      {
        role: req?.user?.role,
        therapistUserId: req?.user?.userId,
        patientId: req?.user?.userId,
        institutionId: req?.user?.institutionId,
      },
    );
  }

  private assertAdmin(req?: AuthenticatedRequest) {
    if (req?.user?.role?.toUpperCase() !== UserRole.ADMIN) {
      throw new UnauthorizedException('Se requiere usuario administrador');
    }
  }

  @Get(':id/metrics')
  @UseGuards(JwtAuthGuard)
  async getSessionMetrics(@Param('id') sessionId: string) {
    return this.sessionMetricsService.getMetricsBySessionId(sessionId);
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
      {
        role: req.user?.role,
        ownerUserId: req.user?.userId,
        ownerInstitutionId: req.user?.institutionId,
      },
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
    const session = await this.sessionsService.findOne(sessionId, {
      role: req.user?.role,
      therapistUserId: req.user?.userId,
      patientId: req.user?.userId,
      institutionId: req.user?.institutionId,
    });

    const reportData = await this.reportService.buildReportData(session);
    const html = this.reportService.renderReportPdfHtml(reportData);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="session-${sessionId}.html"`,
    );
    res.send(html);
  }
}
