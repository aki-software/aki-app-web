import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, androidpublisher_v3 } from 'googleapis';

@Injectable()
export class GooglePlayAdapter {
  private readonly logger = new Logger(GooglePlayAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  getAndroidPublisher(): androidpublisher_v3.Androidpublisher {
    const serviceAccountBase64 = this.configService.get<string>(
      'GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64',
    );

    if (!serviceAccountBase64) {
      this.logger.error('Google Play service account configuration is missing');
      throw new InternalServerErrorException('Payment configuration error');
    }

    const credentials = JSON.parse(
      Buffer.from(serviceAccountBase64, 'base64').toString('utf8'),
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    return google.androidpublisher({ version: 'v3', auth });
  }

  // Comentario para forzar recarga de .env
  getPackageName(): string {
    const packageName = this.configService.get<string>('ANDROID_PACKAGE_NAME');

    if (!packageName) {
      this.logger.error('Android package name configuration is missing');
      throw new InternalServerErrorException('Payment configuration error');
    }

    return packageName;
  }
}
