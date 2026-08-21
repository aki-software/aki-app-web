import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { androidpublisher_v3 } from 'googleapis';

@Injectable()
export class GooglePlayAdapter {
  private readonly logger = new Logger(GooglePlayAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async getAndroidPublisher(): Promise<androidpublisher_v3.Androidpublisher> {
    const serviceAccountBase64 = this.configService.get<string>(
      'GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64',
    );
    if (!serviceAccountBase64) {
      this.throwConfigurationFailure('MISSING_SERVICE_ACCOUNT');
    }

    let credentials: { client_email: string; private_key: string };
    try {
      const parsed: unknown = JSON.parse(
        Buffer.from(serviceAccountBase64, 'base64').toString('utf8'),
      );
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        typeof (parsed as { client_email?: unknown }).client_email !==
          'string' ||
        !(parsed as { client_email: string }).client_email.trim() ||
        typeof (parsed as { private_key?: unknown }).private_key !== 'string' ||
        !(parsed as { private_key: string }).private_key.trim()
      ) {
        this.throwConfigurationFailure('INVALID_SERVICE_ACCOUNT');
      }
      credentials = parsed as { client_email: string; private_key: string };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.throwConfigurationFailure('INVALID_SERVICE_ACCOUNT');
    }

    const { google } = await import('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    return google.androidpublisher({ version: 'v3', auth });
  }

  getPackageName(): string {
    const packageName = this.configService.get<string>(
      'GOOGLE_PLAY_PACKAGE_NAME',
    );

    if (
      !packageName ||
      !/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(packageName)
    ) {
      this.throwConfigurationFailure('INVALID_PACKAGE_NAME');
    }

    return packageName;
  }

  getReportUnlockSku(): string {
    const sku = this.configService.get<string>('GOOGLE_PLAY_REPORT_SKU');
    if (sku !== 'report_unlock_v2') {
      this.throwConfigurationFailure('INVALID_REPORT_SKU');
    }
    return sku;
  }

  private throwConfigurationFailure(category: string): never {
    this.logger.error({
      event: 'google_play_configuration_failed',
      category,
    });
    throw new ServiceUnavailableException({
      code: 'GOOGLE_PLAY_VERIFICATION_UNAVAILABLE',
      message: 'Google Play verification is temporarily unavailable',
    });
  }
}
