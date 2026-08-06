import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CheckoutService } from './services/checkout.service.js';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto.js';
import { CheckoutRequestDto } from './dto/checkout-request.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly checkoutService: CheckoutService,
  ) {}

  @Post('google-play/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT' as any)
  async verifyGooglePlay(@Body() verifyDto: VerifyPlayPurchaseDto) {
    return this.paymentsService.verifyGooglePlayPurchase(verifyDto);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTITUTION_ADMIN' as any)
  async initiateCheckout(
    @Body() checkoutDto: CheckoutRequestDto,
    @Request() req: any,
  ) {
    return this.checkoutService.initiateCheckout({
      ...checkoutDto,
      institutionId: req.user.institutionId,
      buyerEmail: req.user.email,
    });
  }
}
