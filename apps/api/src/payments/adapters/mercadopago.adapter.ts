import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import type {
  PaymentGateway,
  GatewayName,
  CreateSessionParams,
  CheckoutSessionResult,
  PaymentVerificationResult,
  WebhookEventResult,
} from '../interfaces/payment-gateway.interface.js';
import {
  parseSignatureHeader,
  validateSignature,
  parseWebhookPayload,
} from './mercadopago-webhook.validator.js';
import {
  MP_PAYMENT_STATUS_MAP,
  MP_WEBHOOK_STATUS_MAP,
} from './mercadopago-status.maps.js';

@Injectable()
export class MercadoPagoAdapter implements PaymentGateway {
  readonly name: GatewayName = 'mercadopago';
  private readonly logger = new Logger(MercadoPagoAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  private getClient(): MercadoPagoConfig {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new InternalServerErrorException(
        'MercadoPago access token not configured',
      );
    }
    return new MercadoPagoConfig({ accessToken });
  }

  async createCheckoutSession(
    params: CreateSessionParams,
  ): Promise<CheckoutSessionResult> {
    const client = this.getClient();
    const notificationUrl = this.configService.get<string>('MP_WEBHOOK_URL');

    try {
      const response = await new Preference(client).create({
        body: {
          items: [
            {
              id: params.plan.id,
              title: params.plan.name,
              description: params.plan.description ?? undefined,
              quantity: 1,
              unit_price: params.plan.priceArs / 100, // MP expects ARS as a decimal value
              currency_id: 'ARS',
            },
          ],
          back_urls: {
            success: params.successUrl,
            failure: params.cancelUrl,
            pending: params.cancelUrl,
          },
          auto_return: 'approved',
          external_reference: params.institutionId,
          metadata: {
            institution_id: params.institutionId,
            user_id: params.userId,
            plan_id: params.plan.id,
          },
          notification_url: notificationUrl,
        },
      });

      if (!response.init_point || !response.id) {
        throw new InternalServerErrorException(
          'MercadoPago returned an incomplete preference response',
        );
      }

      return {
        checkoutUrl: response.init_point,
        gatewaySessionId: response.id,
      };
    } catch (error) {
      this.logger.error('Failed to create MercadoPago preference', error);
      throw new InternalServerErrorException(
        'Failed to create checkout session',
      );
    }
  }

  async verifyPayment(
    gatewayPaymentId: string,
  ): Promise<PaymentVerificationResult> {
    try {
      const response = await new Payment(this.getClient()).get({
        id: gatewayPaymentId,
      });

      const paymentId = response.id?.toString();
      if (!paymentId) {
        throw new InternalServerErrorException(
          'MercadoPago returned a payment without an ID',
        );
      }

      return {
        status: MP_PAYMENT_STATUS_MAP[response.status ?? ''] ?? 'rejected',
        gatewayPaymentId: paymentId,
        amountPaid: Math.round((response.transaction_amount ?? 0) * 100),
        currency: response.currency_id ?? 'ARS',
      };
    } catch (error) {
      this.logger.error(
        `Error verifying MP payment ${gatewayPaymentId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  async constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<WebhookEventResult> {
    const webhookSecret = this.configService.get<string>('MP_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'MercadoPago webhook secret not configured',
      );
    }

    const { ts, v1 } = parseSignatureHeader(signature);
    const { payload, paymentId } = parseWebhookPayload(rawBody);
    validateSignature(paymentId, payload.id, ts, v1, webhookSecret, (msg) =>
      this.logger.warn(msg),
    );

    let paymentData: Awaited<ReturnType<Payment['get']>>;
    try {
      paymentData = await new Payment(this.getClient()).get({ id: paymentId });
    } catch (error) {
      this.logger.error('Failed to retrieve MP payment during webhook', error);
      throw new InternalServerErrorException(
        'Failed to verify payment webhook details',
      );
    }

    const resolvedId = paymentData.id?.toString();
    if (!resolvedId) {
      throw new InternalServerErrorException(
        'MercadoPago returned webhook data without a payment ID',
      );
    }

    const metadata = paymentData.metadata as Record<string, string> | undefined;

    return {
      type: MP_WEBHOOK_STATUS_MAP[paymentData.status ?? ''] ?? 'pending',
      gatewayPaymentId: resolvedId,
      amountPaid: Math.round((paymentData.transaction_amount ?? 0) * 100),
      currency: paymentData.currency_id ?? 'ARS',
      institutionId: metadata?.institution_id,
      userId: metadata?.user_id,
      voucherPlanId: metadata?.plan_id,
      rawPayload: payload,
    };
  }
}
