import {
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  Headers,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service.js';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@akit/contracts';
import { JobDispatcherService } from '../common/services/job-dispatcher.service.js';
import { JobNames } from '../common/jobs/job-names.js';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
    private readonly jobDispatcher: JobDispatcherService,
  ) {}

  @Post('google-play/verify')
  @Roles(UserRole.PATIENT)
  async verifyGooglePlay(@Body() verifyDto: VerifyPlayPurchaseDto) {
    return this.paymentsService.verifyGooglePlayPurchase(verifyDto);
  }

  @Post('stripe/webhook')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(
        this.configService.get<string>('STRIPE_SECRET_KEY') ?? '',
      );
      event = stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(
        `Webhook Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (event.type === 'checkout.session.completed') {
      await this.jobDispatcher.dispatchWithRetry(
        JobNames.ProcessStripeWebhook,
        event,
        { attempts: 3, backoffMs: 1000, backoffType: 'exponential' },
      );
    }

    return { received: true };
  }

  @Post('stripe/checkout-session')
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
}
