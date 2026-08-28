import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Get,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CheckoutService } from './services/checkout.service.js';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto.js';
import { CheckoutRequestDto } from './dto/checkout-request.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GooglePlayPatientGuard } from '../auth/guards/google-play-patient.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CheckoutSessionResponse, UserRole } from '@akit/contracts';
import type { Request as ExpressRequest } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingPlan } from './entities/pricing-plan.entity.js';
import { RateLimit } from '../common/decorators/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { PAYMENT_RATE_LIMIT_POLICIES } from './payment-security.constants.js';

interface RequestWithUser extends ExpressRequest {
  user: {
    userId: string;
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
  @UseGuards(JwtAuthGuard, GooglePlayPatientGuard, RateLimitGuard)
  @RateLimit(
    PAYMENT_RATE_LIMIT_POLICIES.googlePlayVerify.limit,
    PAYMENT_RATE_LIMIT_POLICIES.googlePlayVerify.windowMs,
    PAYMENT_RATE_LIMIT_POLICIES.googlePlayVerify.policy,
  )
  async verifyGooglePlay(
    @Body() verifyDto: VerifyPlayPurchaseDto,
    @Request() req: RequestWithUser,
  ) {
    return this.paymentsService.verifyGooglePlayPurchase(verifyDto, {
      userId: req.user.userId,
      email: req.user.email,
      institutionId: req.user.institutionId,
    });
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(UserRole.INSTITUTION_ADMIN)
  @RateLimit(
    PAYMENT_RATE_LIMIT_POLICIES.checkout.limit,
    PAYMENT_RATE_LIMIT_POLICIES.checkout.windowMs,
    PAYMENT_RATE_LIMIT_POLICIES.checkout.policy,
  )
  async initiateCheckout(
    @Body() checkoutDto: CheckoutRequestDto,
    @Request() req: RequestWithUser,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    this.assertSingleIdempotencyHeader(req, idempotencyKey);
    const response = await this.checkoutService.initiateCheckout({
      ...checkoutDto,
      userId: req.user.userId,
      institutionId: req.user.institutionId,
      buyerEmail: req.user.email,
      idempotencyKey,
    });
    return CheckoutSessionResponse.parse(response);
  }

  private assertSingleIdempotencyHeader(
    req: ExpressRequest,
    normalizedHeader?: string,
  ): void {
    const rawHeaders = req.rawHeaders ?? [];
    const values = rawHeaders.reduce<string[]>((result, value, index) => {
      if (index % 2 === 0 && value.toLowerCase() === 'x-idempotency-key') {
        const headerValue = rawHeaders[index + 1];
        if (headerValue) result.push(headerValue);
      }
      return result;
    }, []);

    if (
      values.length !== 1 ||
      !normalizedHeader ||
      normalizedHeader.includes(',') ||
      values[0] !== normalizedHeader
    ) {
      throw new BadRequestException(
        'X-Idempotency-Key must be supplied exactly once',
      );
    }
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTITUTION_ADMIN)
  async getHistory(@Request() req: RequestWithUser) {
    return this.paymentsService.getBillingHistory(req.user.institutionId);
  }
}
