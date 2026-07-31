import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoucherPlan } from './entities/voucher-plan.entity.js';
import { CreateVoucherPlanDto } from './dto/create-voucher-plan.dto.js';
import { UpdateVoucherPlanDto } from './dto/update-voucher-plan.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@akit/contracts';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminPaymentsController {
  constructor(
    @InjectRepository(VoucherPlan)
    private readonly voucherPlanRepo: Repository<VoucherPlan>,
  ) {}

  @Get('voucher-plans')
  @Roles(UserRole.SUPER_ADMIN)
  async findAll() {
    return this.voucherPlanRepo.find({ order: { priceArs: 'ASC' } });
  }

  @Post('voucher-plans')
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() createDto: CreateVoucherPlanDto) {
    const plan = this.voucherPlanRepo.create(createDto);
    return this.voucherPlanRepo.save(plan);
  }

  @Patch('voucher-plans/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateVoucherPlanDto,
  ) {
    const plan = await this.voucherPlanRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Voucher plan not found');
    }
    
    Object.assign(plan, updateDto);
    return this.voucherPlanRepo.save(plan);
  }

  @Delete('voucher-plans/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    const plan = await this.voucherPlanRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Voucher plan not found');
    }

    plan.isActive = false;
    return this.voucherPlanRepo.save(plan);
  }
}
