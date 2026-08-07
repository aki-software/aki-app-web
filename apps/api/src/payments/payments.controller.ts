import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CheckoutService } from './services/checkout.service.js';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto.js';
import { CheckoutRequestDto } from './dto/checkout-request.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@akit/contracts';
import type { Request as ExpressRequest } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingPlan } from './entities/pricing-plan.entity.js';

interface RequestWithUser extends ExpressRequest {
  user: {
    id: string;
    email: string;
    institutionId: string;
    role: UserRole;
  };
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly checkoutService: CheckoutService,
    @InjectRepository(PricingPlan)
    private readonly pricingPlanRepo: Repository<PricingPlan>,
  ) {}

  @Get('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTION_ADMIN)
  async getPlans() {
    return this.pricingPlanRepo.find({
      where: { isActive: true },
      order: { priceUsd: 'ASC' },
    });
  }

  @Post('google-play/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  async verifyGooglePlay(@Body() verifyDto: VerifyPlayPurchaseDto) {
    return this.paymentsService.verifyGooglePlayPurchase(verifyDto);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTION_ADMIN)
  async initiateCheckout(
    @Body() checkoutDto: CheckoutRequestDto,
    @Request() req: RequestWithUser,
  ) {
    return this.checkoutService.initiateCheckout({
      ...checkoutDto,
      institutionId: req.user.institutionId,
      buyerEmail: req.user.email,
    });
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTION_ADMIN)
  async getHistory(@Request() req: RequestWithUser) {
    return this.paymentsService.getBillingHistory(req.user.institutionId);
  }
}
