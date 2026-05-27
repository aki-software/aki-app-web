import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('google-play/verify')
  async verifyGooglePlay(@Body() verifyDto: VerifyPlayPurchaseDto) {
    return this.paymentsService.verifyGooglePlayPurchase(verifyDto);
  }
}
