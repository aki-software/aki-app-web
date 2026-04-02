import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
    Req,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendReportDto } from './dto/send-report.dto';
import { SessionPaymentStatus } from './entities/session.entity';
import { SessionsService } from './sessions.service';

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
    private readonly usersService: UsersService,
    private readonly vouchersService: VouchersService,
  ) {}

  @Post()
  create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.create(createSessionDto);
  }

  @Post('complete')
  async complete(@Body() payload: any) {
    const payloadUserId = this.nullIfBlank(payload.userId);
    const payloadPatientId = this.nullIfBlank(payload.patientId);
    const payloadTherapistUserId = this.nullIfBlank(payload.therapistUserId);
    const payloadInstitutionId = this.nullIfBlank(payload.institutionId);
    const payloadVoucherId = this.nullIfBlank(payload.voucherId);
    const payloadVoucherCode = this.nullIfBlank(payload.voucherCode);

    const user = payloadUserId
      ? await this.usersService.findOne(payloadUserId)
      : null;
    const voucher = payloadVoucherCode
      ? await this.vouchersService.resolveAvailableVoucher(payloadVoucherCode)
      : null;
    const inferredPatientName =
      payload.patientName || user?.name || 'Usuario App';
    const isTherapistUser =
      user?.role === UserRole.THERAPIST || user?.role === UserRole.ADMIN;
    const isPatientUser = user?.role === UserRole.PATIENT;
    const fallbackOwner =
      !payloadTherapistUserId &&
      !payloadInstitutionId &&
      !voucher &&
      (!user || isPatientUser)
        ? await this.usersService.getOrCreateIndividualTestsOwner()
        : null;
    const enrichedResultsByCategory = this.indexResultsMetadata(
      payload.resultPayload,
    );

    const adaptedDto = {
      therapistUserId:
        payloadTherapistUserId ||
        voucher?.ownerUserId ||
        (isTherapistUser ? user?.id : null) ||
        fallbackOwner?.id ||
        null,
      institutionId:
        payloadInstitutionId ||
        voucher?.ownerInstitutionId ||
        user?.institutionId ||
        fallbackOwner?.institutionId ||
        null,
      patientId: payloadPatientId || (isTherapistUser ? null : payloadUserId),
      patientName: inferredPatientName,
      sessionDate: new Date(payload.startedAt || new Date()),
      hollandCode: payload.resultPayload?.hollandCode,
      totalTimeMs: this.calculateDuration(
        payload.startedAt,
        payload.finishedAt,
      ),
      voucherId: voucher?.id || payloadVoucherId || null,
      paymentStatus: voucher
        ? SessionPaymentStatus.VOUCHER_REDEEMED
        : payload.paymentStatus || undefined,
      reportUnlockedAt: voucher ? new Date() : undefined,
      results: (payload.resultPayload?.radar || []).map((r: any) => ({
        categoryId: r.categoryId,
        score: r.likes || r.score || 0,
        totalPossible: r.total || 0,
        percentage: r.affinity || 0,
        suggestedCareers:
          enrichedResultsByCategory.get(r.categoryId)?.suggestedCareers ??
          undefined,
        materialSnippet:
          enrichedResultsByCategory.get(r.categoryId)?.materialSnippet ??
          undefined,
      })),
      swipes: (payload.swipes || []).map((s: any) => ({
        cardId: s.cardId,
        categoryId: s.categoryId || 'unknown',
        isLiked: s.liked,
        timestamp: new Date(s.timestamp || new Date()),
      })),
    };

    const createdSession = await this.sessionsService.create(adaptedDto as any);

    if (voucher) {
      await this.vouchersService.attachVoucherToSession(
        voucher.code,
        createdSession.id,
        inferredPatientName,
      );
    }

    return createdSession;
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.sessionsService.findAll(parsedPage, parsedLimit, {
      role: req?.user?.role,
      therapistUserId: req?.user?.userId,
      patientId: req?.user?.userId,
      institutionId: req?.user?.institutionId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/overview')
  async getAdminOverview(@Req() req?: AuthenticatedRequest) {
    this.assertAdmin(req);
    return await this.sessionsService.getAdminOverview();
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/activity')
  async getAdminActivity(
    @Req() req?: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    this.assertAdmin(req);
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/send-report')
  async sendReport(
    @Param('id') id: string,
    @Body() sendReportDto: SendReportDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    return await this.sessionsService.sendReport(id, sendReportDto.email, {
      role: req?.user?.role,
      therapistUserId: req?.user?.userId,
      patientId: req?.user?.userId,
      institutionId: req?.user?.institutionId,
    });
  }

  private calculateDuration(start?: string, end?: string): number {
    if (!start || !end) return 0;
    try {
      return new Date(end).getTime() - new Date(start).getTime();
    } catch {
      return 0;
    }
  }

  private indexResultsMetadata(
    payload: any,
  ): Map<string, { suggestedCareers?: string[]; materialSnippet?: string }> {
    const map = new Map<
      string,
      { suggestedCareers?: string[]; materialSnippet?: string }
    >();
    const detailedResults = [
      ...(payload?.top3 ?? []),
      ...(payload?.bottom3 ?? []),
    ];

    for (const result of detailedResults) {
      if (!result?.categoryId || map.has(result.categoryId)) {
        continue;
      }
      map.set(result.categoryId, {
        suggestedCareers: Array.isArray(result.suggestedCareers)
          ? result.suggestedCareers
          : undefined,
        materialSnippet:
          typeof result.materialSnippet === 'string'
            ? result.materialSnippet
            : undefined,
      });
    }

    return map;
  }

  private nullIfBlank(value: unknown): string | null {
    if (typeof value !== 'string') {
      return value == null ? null : String(value);
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private assertAdmin(req?: AuthenticatedRequest) {
    if (req?.user?.role?.toUpperCase() !== UserRole.ADMIN) {
      throw new UnauthorizedException('Se requiere usuario administrador');
    }
  }
}
