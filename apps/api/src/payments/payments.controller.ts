import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@akit/contracts';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('google-play/verify')
  @Roles(UserRole.PATIENT)
  async verifyGooglePlay(@Body() verifyDto: VerifyPlayPurchaseDto) {
    return this.paymentsService.verifyGooglePlayPurchase(verifyDto);
  }
}
