import {
    Body,
    Controller,
    Get,
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
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { ResolveVoucherDto } from './dto/resolve-voucher.dto';
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
    @Param('id') id: string,
    @Body('email') email?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const voucher = await this.vouchersService.findById(id);
    const isAdmin = req?.user?.role?.toUpperCase() === UserRole.ADMIN;
    const isInstitutionOwner =
      !!voucher.ownerInstitutionId &&
      req?.user?.institutionId === voucher.ownerInstitutionId;
    const isDirectOwnerUser =
      !!voucher.ownerUserId && req?.user?.userId === voucher.ownerUserId;

    if (!isAdmin && !isInstitutionOwner && !isDirectOwnerUser) {
      throw new UnauthorizedException(
        'No tienes permisos para enviar este voucher',
      );
    }

    return await this.vouchersService.sendEmail(id, email);
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

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query('institutionId') institutionId?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const isAdmin = req?.user?.role?.toUpperCase() === UserRole.ADMIN;
    return await this.vouchersService.findAll({
      role: req?.user?.role,
      ownerUserId: req?.user?.userId,
      ownerInstitutionId: isAdmin
        ? institutionId || undefined
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
}
