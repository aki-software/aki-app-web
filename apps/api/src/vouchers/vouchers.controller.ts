import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
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
import { VoucherQueryService } from './voucher-query.service.js';
import { VoucherBatchQueryService } from './services/voucher-batch-query.service.js';
import { type VoucherScope } from './types/voucher-query.types.js';
import { CurrentVoucherScope } from './decorators/voucher-scope.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { VoucherRedemptionService } from '../common/services/voucher-redemption.service.js';

@Controller('vouchers')
export class VouchersController {
  private readonly logger = new Logger(VouchersController.name);

  constructor(
    private readonly vouchersService: VouchersService,
    private readonly queryService: VoucherQueryService,
    private readonly batchQueryService: VoucherBatchQueryService,
    private readonly voucherRedemptionService: VoucherRedemptionService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createVoucherDto: CreateVoucherDto) {
    return await this.vouchersService.create(createVoucherDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/send-email')
  async sendEmail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SendVoucherEmailDto,
    @CurrentVoucherScope() scope: VoucherScope,
  ) {
    return await this.vouchersService.sendEmail(id, scope, body.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/resend')
  async resendEmail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SendVoucherEmailDto,
    @CurrentVoucherScope() scope: VoucherScope,
  ) {
    return await this.vouchersService.resendEmail(id, scope, body.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/revoke')
  async revoke(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentVoucherScope() scope: VoucherScope,
  ) {
    const revoked = await this.vouchersService.revoke(id, scope);
    return {
      id: revoked.id,
      code: revoked.code,
      status: revoked.status,
    };
  }

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

  @Post('redeem')
  async redeem(
    @Body() redeemVoucherDto: RedeemVoucherDto,
    @CurrentVoucherScope() scope: VoucherScope,
  ) {
    this.logger.debug(
      `redeem requested code=${redeemVoucherDto.code?.trim()?.toUpperCase()} sessionId=${redeemVoucherDto.sessionId} userId=${scope.ownerUserId} role=${scope.role}`,
    );

    return await this.voucherRedemptionService.redeemVoucher(
      redeemVoucherDto.code,
      redeemVoucherDto.sessionId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('batches')
  async findBatches(
    @Query() query: ListVoucherBatchesDto,
    @CurrentVoucherScope('clientId') scope: VoucherScope,
  ) {
    return await this.batchQueryService.findBatchSummaries(query, scope);
  }

  @UseGuards(JwtAuthGuard)
  @Get('batches/:batchId')
  async findBatchDetail(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @CurrentVoucherScope() scope: VoucherScope,
  ) {
    return await this.batchQueryService.findBatchDetail(batchId, scope);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query() query: ListVouchersDto,
    @CurrentVoucherScope('clientId') scope: VoucherScope,
  ) {
    return await this.queryService.findAllFiltered(query ?? {}, scope);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':code')
  async findOne(
    @Param('code') code: string,
    @CurrentVoucherScope() scope: VoucherScope,
  ) {
    const voucher = await this.vouchersService.findByCode(code);
    const isAdmin = scope.role?.toUpperCase() === UserRole.ADMIN;
    const isOwner =
      voucher.ownerInstitutionId &&
      scope.ownerInstitutionId === voucher.ownerInstitutionId;

    if (!isAdmin && !isOwner) {
      throw new UnauthorizedException(
        'No tienes permisos para acceder a este voucher',
      );
    }

    return voucher;
  }
}
