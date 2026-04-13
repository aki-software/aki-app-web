import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { ListVoucherBatchesDto } from './dto/list-voucher-batches.dto';
import { ListVouchersDto } from './dto/list-vouchers.dto';
import { ResolveVoucherDto } from './dto/resolve-voucher.dto';
import { RedeemVoucherDto } from './dto/redeem-voucher.dto';
import { SendVoucherEmailDto } from './dto/send-voucher-email.dto';
import { VouchersService } from './vouchers.service';

type AuthenticatedRequest = Request & {
  user?: {
    role?: string;
    userId?: string;
    institutionId?: string | null;
  };
};

@Controller('vouchers')
export class VouchersController {
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
    const voucher = await this.vouchersService.findById(id);
    this.assertVoucherOwnership(voucher, req, 'enviar este voucher');

    return await this.vouchersService.sendEmail(id, body.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/resend')
  async resendEmail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SendVoucherEmailDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    const voucher = await this.vouchersService.findById(id);
    this.assertVoucherOwnership(voucher, req, 'reenviar este voucher');
    return await this.vouchersService.resendEmail(id, body.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/revoke')
  async revoke(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const voucher = await this.vouchersService.findById(id);
    this.assertVoucherOwnership(voucher, req, 'revocar este voucher');
    const revoked = await this.vouchersService.revoke(id);
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
  async redeem(@Body() redeemVoucherDto: RedeemVoucherDto) {
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
    const isAdmin = req?.user?.role?.toUpperCase() === UserRole.ADMIN;
    return await this.vouchersService.findBatchSummaries(query, {
      role: req?.user?.role,
      ownerUserId: req?.user?.userId,
      ownerInstitutionId: isAdmin
        ? query.clientId || undefined
        : req?.user?.institutionId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('batches/:batchId')
  async findBatchDetail(
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const isAdmin = req?.user?.role?.toUpperCase() === UserRole.ADMIN;
    return await this.vouchersService.findBatchDetail(batchId, {
      role: req?.user?.role,
      ownerUserId: req?.user?.userId,
      ownerInstitutionId: isAdmin ? undefined : req?.user?.institutionId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query() query?: ListVouchersDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    const isAdmin = req?.user?.role?.toUpperCase() === UserRole.ADMIN;
    return await this.vouchersService.findAllFiltered(query ?? {}, {
      role: req?.user?.role,
      ownerUserId: req?.user?.userId,
      ownerInstitutionId: isAdmin
        ? query?.clientId || undefined
        : req?.user?.institutionId,
    });
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

  private assertVoucherOwnership(
    voucher: {
      ownerInstitutionId?: string | null;
      ownerUserId?: string | null;
    },
    req: AuthenticatedRequest | undefined,
    action: string,
  ) {
    const isAdmin = req?.user?.role?.toUpperCase() === UserRole.ADMIN;
    const isInstitutionOwner =
      !!voucher.ownerInstitutionId &&
      req?.user?.institutionId === voucher.ownerInstitutionId;
    const isDirectOwnerUser =
      !!voucher.ownerUserId && req?.user?.userId === voucher.ownerUserId;

    if (!isAdmin && !isInstitutionOwner && !isDirectOwnerUser) {
      throw new UnauthorizedException(`No tienes permisos para ${action}`);
    }
  }
}
