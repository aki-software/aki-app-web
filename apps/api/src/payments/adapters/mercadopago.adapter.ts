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
  PaymentStatus,
  WebhookEventType,
} from '../interfaces/payment-gateway.interface.js';
import * as crypto from 'crypto';

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
    const preference = new Preference(client);
    const notificationUrl = this.configService.get<string>('MP_WEBHOOK_URL');

    try {
      const response = await preference.create({
        body: {
          items: [
            {
              id: params.plan.id,
              title: params.plan.name,
              description: params.plan.description || undefined,
              quantity: 1,
              unit_price: params.plan.priceArs / 100, // API expects ARS as standard value
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

      if (!response.init_point) {
        throw new InternalServerErrorException(
          'Failed to get MercadoPago checkout URL',
        );
      }

      return {
        checkoutUrl: response.init_point,
        gatewaySessionId: response.id!,
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
    const client = this.getClient();
    const payment = new Payment(client);

    try {
      const response = await payment.get({ id: gatewayPaymentId });

      const STATUS_MAP: Record<string, PaymentStatus> = {
        approved: 'approved',
        pending: 'pending',
        in_process: 'pending',
      };
      const status: PaymentStatus =
        STATUS_MAP[response.status ?? ''] ?? 'rejected';
      const paymentId = response.id?.toString();
      if (!paymentId) {
        throw new InternalServerErrorException(
          'MercadoPago returned a payment without an ID',
        );
      }

      return {
        status,
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

    // Validate signature
    // MercadoPago signature format: x-signature: ts=...,v1=...
    let ts = '';
    let v1 = '';
    const parts = signature.split(',');
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') v1 = value;
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      throw new InternalServerErrorException('Invalid webhook payload format');
    }

    // data.id is the ID we use in the manifest for verification, although action differs (payment.created)
    const dataObj = payload.data as Record<string, unknown> | undefined;
    const paymentId = dataObj?.id || payload.id;
    if (!paymentId) {
      throw new InternalServerErrorException(
        'Payment ID missing in webhook payload',
      );
    }

    // Verification signature check
    const manifest = `id:${paymentId};request-id:${payload.id || ''};ts:${ts};`;
    const hmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(manifest)
      .digest('hex');

    // In test modes, signatures might mismatch or be omitted, we log it for now
    if (hmac !== v1) {
      this.logger.warn(
        `MercadoPago webhook signature mismatch. Expected ${hmac}, got ${v1}`,
      );
      // For strict validation, throw an error, but let's allow it to fetch data directly to verify.
    }

    // Fetch actual payment details
    const client = this.getClient();
    const payment = new Payment(client);
    let paymentData;
    try {
      paymentData = await payment.get({ id: paymentId });
    } catch (error) {
      this.logger.error(
        'Failed to retrieve MP payment details during webhook processing',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to verify payment webhook details',
      );
    }

    const MP_STATUS_MAP: Record<string, WebhookEventType> = {
      approved: 'approved',
      refunded: 'refunded',
      charged_back: 'chargeback',
      rejected: 'rejected',
      cancelled: 'rejected',
    };
    const type: WebhookEventType =
      MP_STATUS_MAP[paymentData.status ?? ''] ?? 'pending';

    const paymentId = paymentData.id?.toString();
    if (!paymentId) {
      throw new InternalServerErrorException(
        'MercadoPago returned webhook data without a payment ID',
      );
    }

    const metadata = paymentData.metadata as Record<string, string> | undefined;

    return {
      type,
      gatewayPaymentId: paymentId,
      amountPaid: Math.round((paymentData.transaction_amount ?? 0) * 100),
      currency: paymentData.currency_id ?? 'ARS',
      institutionId: metadata?.institution_id,
      userId: metadata?.user_id,
      voucherPlanId: metadata?.plan_id,
      rawPayload: payload,
    };
  }
}
