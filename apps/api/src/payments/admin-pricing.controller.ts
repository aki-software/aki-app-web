import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CreatePricingPlanDto, UpdatePricingPlanDto } from './dto/pricing-plan.dto.js';
import { PricingPlan } from './entities/pricing-plan.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@Controller('admin/pricing-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminPricingController {
  constructor(
    @InjectRepository(PricingPlan)
    private readonly pricingPlanRepo: Repository<PricingPlan>,
  ) {}

  @Get()
  async findAll() {
    return this.pricingPlanRepo.find({ order: { priceUsd: 'ASC' } });
  }

  @Post()
  async create(@Body() createDto: CreatePricingPlanDto) {
    const plan = this.pricingPlanRepo.create(createDto);
    return this.pricingPlanRepo.save(plan);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePricingPlanDto,
  ) {
    await this.pricingPlanRepo.update(id, updateDto);
    return this.pricingPlanRepo.findOneBy({ id });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.pricingPlanRepo.delete(id);
    return { success: true };
  }
}
