import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('google-play/verify')
  @Roles('PATIENT' as any)
  async verifyGooglePlay(@Body() verifyDto: VerifyPlayPurchaseDto) {
    return this.paymentsService.verifyGooglePlayPurchase(verifyDto);
  }
}
