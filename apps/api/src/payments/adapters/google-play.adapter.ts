import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { androidpublisher_v3 } from 'googleapis';
import type {
  PaymentGateway,
  GatewayName,
  CheckoutSessionResult,
  PaymentVerificationResult,
  WebhookEventResult,
} from '../interfaces/payment-gateway.interface.js';

@Injectable()
export class GooglePlayAdapter implements PaymentGateway {
  readonly name: GatewayName = 'google_play';
  private readonly logger = new Logger(GooglePlayAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  createCheckoutSession(): Promise<CheckoutSessionResult> {
    return Promise.reject(
      new BadRequestException(
        'Google Play purchases are initiated from the mobile app',
      ),
    );
  }

  verifyPayment(): Promise<PaymentVerificationResult> {
    return Promise.reject(
      new BadRequestException(
        'Use verifyGooglePlayPurchase for Google Play transactions',
      ),
    );
  }

  constructWebhookEvent(): Promise<WebhookEventResult> {
    return Promise.reject(
      new BadRequestException('Google Play does not use webhooks'),
    );
  }

  async getAndroidPublisher(): Promise<androidpublisher_v3.Androidpublisher> {
    const { google } = await import('googleapis');

    const serviceAccountBase64 = this.configService.get<string>(
      'GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64',
    );

    if (!serviceAccountBase64) {
      this.logger.error('Google Play service account configuration is missing');
      throw new InternalServerErrorException('Payment configuration error');
    }

    const credentials = JSON.parse(
      Buffer.from(serviceAccountBase64, 'base64').toString('utf8'),
    ) as Record<string, unknown>;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    return google.androidpublisher({ version: 'v3', auth });
  }

  getPackageName(): string {
    const packageName = this.configService.get<string>('ANDROID_PACKAGE_NAME');

    if (!packageName) {
      this.logger.error('Android package name configuration is missing');
      throw new InternalServerErrorException('Payment configuration error');
    }

    return packageName;
  }
}
