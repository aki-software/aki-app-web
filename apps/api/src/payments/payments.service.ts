import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { VerifyPlayPurchaseDto } from './dto/verify-play-purchase.dto';
import { SessionsService } from '../sessions/sessions.service';
import { SessionPaymentStatus } from '@akit/contracts';
import { google, androidpublisher_v3 } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) {}

  async verifyGooglePlayPurchase(dto: VerifyPlayPurchaseDto) {
    this.logger.log(`Verifying purchase for session ${dto.sessionId}`);

    const session = await this.sessionsService.findOne(dto.sessionId);
    if (!session) {
      throw new BadRequestException('Sesión no encontrada');
    }

    if (this.isAlreadyProcessed(session, dto.purchaseToken)) {
      this.logger.log(`Session ${session.id} is already PAID with this token`);
      return { success: true, valid: true };
    }

    const existingSession = await this.sessionsService.findByPaymentToken(
      dto.purchaseToken,
    );
    if (existingSession && existingSession.id !== session.id) {
      this.logger.warn(
        `Purchase token ${dto.purchaseToken} is already used by session ${existingSession.id}. Rejecting for session ${session.id}.`,
      );
      return { success: false, valid: false, reason: 'ALREADY_CONSUMED' };
    }

    const { packageName, serviceAccountBase64 } = this.getPlayBillingConfig();

    try {
      const androidPublisher = this.getAndroidPublisher(serviceAccountBase64);
      return await this.verifyAndProcessPurchase(
        androidPublisher,
        packageName,
        dto,
        session,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error verifying Google Play purchase: ${errorMessage}`,
      );
      throw new BadRequestException('Error verificando la compra');
    }
  }

  private isAlreadyProcessed(session: any, token: string): boolean {
    return (
      session.paymentReference === token &&
      session.paymentStatus === SessionPaymentStatus.PAID
    );
  }

  private getPlayBillingConfig(): {
    packageName: string;
    serviceAccountBase64: string;
  } {
    const packageName = this.configService.get<string>('ANDROID_PACKAGE_NAME');
    const serviceAccountBase64 = this.configService.get<string>(
      'GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64',
    );

    if (!packageName || !serviceAccountBase64) {
      this.logger.error('Google Play Billing configuration is missing');
      throw new InternalServerErrorException('Payment configuration error');
    }

    return { packageName, serviceAccountBase64 };
  }

  private getAndroidPublisher(
    serviceAccountBase64: string,
  ): androidpublisher_v3.Androidpublisher {
    const credentials = JSON.parse(
      Buffer.from(serviceAccountBase64, 'base64').toString('utf8'),
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    return google.androidpublisher({ version: 'v3', auth });
  }

  private async verifyAndProcessPurchase(
    publisher: androidpublisher_v3.Androidpublisher,
    packageName: string,
    dto: VerifyPlayPurchaseDto,
    session: {
      id: string;
      paymentReference?: string | null;
      paymentStatus?: SessionPaymentStatus;
    },
  ) {
    let purchase: androidpublisher_v3.Schema$ProductPurchase;

    try {
      const response = await publisher.purchases.products.get({
        packageName,
        productId: dto.productId,
        token: dto.purchaseToken,
      });
      purchase = response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Google Play already consumed / detached the token. If our session already
      // references this token, treat it as an idempotent success instead of failing
      // the unlock flow again on retries or duplicate callbacks.
      if (
        errorMessage.toLowerCase().includes('not owned by the user') &&
        (session.paymentReference === dto.purchaseToken ||
          session.paymentStatus === SessionPaymentStatus.PAID)
      ) {
        this.logger.warn(
          `Purchase token ${dto.purchaseToken} is no longer owned but session ${session.id} already references it. Treating as idempotent success.`,
        );
        return { success: true, valid: true };
      }

      throw error;
    }

    if (purchase.purchaseState !== 0) {
      this.logger.warn(
        `Purchase state is not Purchased: ${purchase.purchaseState}`,
      );
      return { success: false, valid: false, reason: 'PURCHASE_NOT_VALID' };
    }

    // El consumo de la compra lo realiza EXCLUSIVAMENTE el cliente de Android
    // (billingRepository.consumePurchase) después de recibir una respuesta exitosa
    // de este endpoint. Consumir aquí en el backend destruye la idempotencia:
    // si la DB falla post-consume, el token desaparece de Google Play pero la
    // sesión queda en PENDING. En el reintento, Google retorna "not owned" y
    // la compra se pierde. Al delegar el consume al cliente, este endpoint
    // puede ser reintentado de forma segura ante cualquier falla de red o DB.
    await this.sessionsService.updatePaymentStatus(
      session.id,
      SessionPaymentStatus.PAID,
      dto.purchaseToken,
    );
    return { success: true, valid: true };
  }
}
