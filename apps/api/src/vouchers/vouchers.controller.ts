import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { ResolveVoucherDto } from './dto/resolve-voucher.dto';
import { VouchersService } from './vouchers.service';
import { UserRole } from '../users/entities/user.entity';

type AuthenticatedRequest = Request & {
  user?: {
    role?: string;
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
  @Get(':code')
  async findOne(@Param('code') code: string, @Req() req?: AuthenticatedRequest) {
    this.assertAdmin(req);
    return await this.vouchersService.findByCode(code);
  }

  private assertAdmin(req?: AuthenticatedRequest) {
    if (req?.user?.role?.toUpperCase() !== UserRole.ADMIN) {
      throw new UnauthorizedException('Se requiere usuario administrador');
    }
  }
}
