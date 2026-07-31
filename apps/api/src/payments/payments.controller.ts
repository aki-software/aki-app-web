import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@akit/contracts';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import type { GatewayName } from './interfaces/payment-gateway.interface.js';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('google-play/verify')
  @Roles(UserRole.PATIENT)
  async verifyGooglePlay(@Body() verifyDto: VerifyPlayPurchaseDto) {
    return this.paymentsService.verifyGooglePlayPurchase(verifyDto);
  }

  @Post('checkout/session')
  @Roles(UserRole.INSTITUTION_ADMIN, UserRole.THERAPIST)
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.paymentsService.createCheckoutSession(
      dto,
      user?.id ?? '',
      user?.institutionId ?? '',
    );
  }

  @Get('verify/:gatewayPaymentId')
  @Roles(UserRole.INSTITUTION_ADMIN, UserRole.THERAPIST)
  async verifyPayment(
    @Param('gatewayPaymentId') gatewayPaymentId: string,
    @Query('gateway') gateway: GatewayName,
  ) {
    return this.paymentsService.verifyPayment(gatewayPaymentId, gateway);
  }

  @Get('pricing-plans')
  @Roles(UserRole.INSTITUTION_ADMIN, UserRole.THERAPIST)
  async getPricingPlans() {
    return this.paymentsService.getPricingPlans();
  }
}
