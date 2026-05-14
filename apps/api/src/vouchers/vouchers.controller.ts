import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../users/entities/user.entity.js';
import {
  CreateVoucherDto,
  ListVoucherBatchesDto,
  ListVouchersDto,
  RedeemVoucherDto,
  ResolveVoucherDto,
  SendVoucherEmailDto,
} from './dto/voucher.dto.js';
import { VouchersService } from './vouchers.service.js';
import { VoucherScope } from './voucher-query.service.js';

type AuthenticatedRequest = Request & {
  user?: {
    role?: string;
    userId?: string;
    institutionId?: string | null;
  };
};

@Controller('vouchers')
export class VouchersController {
  private readonly logger = new Logger(VouchersController.name);

  constructor(private readonly vouchersService: VouchersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createVoucherDto: CreateVoucherDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return await this.vouchersService.create(createVoucherDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/send-email')
  async sendEmail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SendVoucherEmailDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    return await this.vouchersService.sendEmail(
      id,
      this.getVoucherScope(req),
      body.email,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/resend')
  async resendEmail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SendVoucherEmailDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    return await this.vouchersService.resendEmail(
      id,
      this.getVoucherScope(req),
      body.email,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/revoke')
  async revoke(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const revoked = await this.vouchersService.revoke(
      id,
      this.getVoucherScope(req),
    );
    return {
      id: revoked.id,
      code: revoked.code,
      status: revoked.status,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('resolve')
  async resolve(@Body() resolveVoucherDto: ResolveVoucherDto) {
    const voucher = await this.vouchersService.resolveAvailableVoucher(
      resolveVoucherDto.code,
    );
    return {
      id: voucher.id,
      code: voucher.code,
      ownerType: voucher.ownerType,
      ownerUserId: voucher.ownerUserId,
      ownerInstitutionId: voucher.ownerInstitutionId,
      assignedPatientName: voucher.assignedPatientName,
      assignedPatientEmail: voucher.assignedPatientEmail,
      expiresAt: voucher.expiresAt,
      status: voucher.status,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('redeem')
  async redeem(
    @Body() redeemVoucherDto: RedeemVoucherDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    this.logger.debug(
      `redeem requested code=${redeemVoucherDto.code?.trim()?.toUpperCase()} sessionId=${redeemVoucherDto.sessionId} userId=${req?.user?.userId ?? 'none'} role=${req?.user?.role ?? 'none'} institutionId=${req?.user?.institutionId ?? 'none'}`,
    );

    return await this.vouchersService.redeemForSession(
      redeemVoucherDto.code,
      redeemVoucherDto.sessionId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('batches')
  async findBatches(
    @Query() query: ListVoucherBatchesDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    return await this.vouchersService.findBatchSummaries(
      query,
      this.getVoucherScope(req, query.clientId),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('batches/:batchId')
  async findBatchDetail(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    return await this.vouchersService.findBatchDetail(
      batchId,
      this.getVoucherScope(req),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query() query?: ListVouchersDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    return await this.vouchersService.findAllFiltered(
      query ?? {},
      this.getVoucherScope(req, query?.clientId),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':code')
  async findOne(
    @Param('code') code: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const voucher = await this.vouchersService.findByCode(code);
    const isAdmin = req?.user?.role?.toUpperCase() === UserRole.ADMIN;
    const isOwner =
      voucher.ownerInstitutionId &&
      req?.user?.institutionId === voucher.ownerInstitutionId;

    if (!isAdmin && !isOwner) {
      throw new UnauthorizedException(
        'No tienes permisos para acceder a este voucher',
      );
    }

    return voucher;
  }

  private assertAdmin(req?: AuthenticatedRequest) {
    if (req?.user?.role?.toUpperCase() !== UserRole.ADMIN) {
      throw new UnauthorizedException('Se requiere usuario administrador');
    }
  }

  private getVoucherScope(
    req?: AuthenticatedRequest,
    clientId?: string,
  ): VoucherScope {
    const isAdmin = req?.user?.role?.toUpperCase() === UserRole.ADMIN;
    return {
      role: req?.user?.role,
      ownerUserId: req?.user?.userId,
      ownerInstitutionId: isAdmin ? clientId : req?.user?.institutionId,
    };
  }
}
