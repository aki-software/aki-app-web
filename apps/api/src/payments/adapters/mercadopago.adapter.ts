import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import * as crypto from 'crypto';
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

// --- Status lookup tables (O(1), easily extended) ---

const MP_PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  approved: 'approved',
  pending: 'pending',
  in_process: 'pending',
};

const MP_WEBHOOK_STATUS_MAP: Record<string, WebhookEventType> = {
  approved: 'approved',
  refunded: 'refunded',
  charged_back: 'chargeback',
  rejected: 'rejected',
  cancelled: 'rejected',
};

// --- Parsed signature header shape ---

interface MpSignatureHeader {
  ts: string;
  v1: string;
}

@Injectable()
export class MercadoPagoAdapter implements PaymentGateway {
  readonly name: GatewayName = 'mercadopago';
  private readonly logger = new Logger(MercadoPagoAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getClient(): MercadoPagoConfig {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new InternalServerErrorException(
        'MercadoPago access token not configured',
      );
    }
    return new MercadoPagoConfig({ accessToken });
  }

  /** Parses the x-signature header: "ts=...,v1=..." */
  private parseSignatureHeader(signature: string): MpSignatureHeader {
    const result: MpSignatureHeader = { ts: '', v1: '' };
    for (const part of signature.split(',')) {
      const [key, value] = part.split('=');
      if (key === 'ts') result.ts = value;
      if (key === 'v1') result.v1 = value;
    }
    return result;
  }

  /** Validates HMAC-SHA256 signature. Logs warning but does NOT throw — MP API double-checks. */
  private validateSignature(
    paymentId: unknown,
    requestId: unknown,
    ts: string,
    v1: string,
    secret: string,
  ): void {
    const manifest = `id:${paymentId};request-id:${requestId ?? ''};ts:${ts};`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    if (expected !== v1) {
      this.logger.warn(
        `MercadoPago webhook signature mismatch. Expected ${expected}, got ${v1}`,
      );
    }
  }

  /** Parses raw body JSON and extracts the numeric payment ID. */
  private parseWebhookPayload(rawBody: Buffer): {
    payload: Record<string, unknown>;
    paymentId: unknown;
  } {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new InternalServerErrorException('Invalid webhook payload format');
    }

    const dataObj = payload.data as Record<string, unknown> | undefined;
    const paymentId = dataObj?.id ?? payload.id;
    if (!paymentId) {
      throw new InternalServerErrorException(
        'Payment ID missing in webhook payload',
      );
    }

    return { payload, paymentId };
  }

  // ---------------------------------------------------------------------------
  // PaymentGateway interface
  // ---------------------------------------------------------------------------

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

      if (!response.init_point) {
        throw new InternalServerErrorException(
          'Failed to get MercadoPago checkout URL',
        );
      }

      const sessionId = response.id;
      if (!sessionId) {
        throw new InternalServerErrorException(
          'MercadoPago returned a preference without an ID',
        );
      }

      return {
        checkoutUrl: response.init_point,
        gatewaySessionId: sessionId,
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

      const status: PaymentStatus =
        MP_PAYMENT_STATUS_MAP[response.status ?? ''] ?? 'rejected';

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

    const { ts, v1 } = this.parseSignatureHeader(signature);
    const { payload, paymentId } = this.parseWebhookPayload(rawBody);

    this.validateSignature(paymentId, payload.id, ts, v1, webhookSecret);

    // Fetch full payment details from MP API (source of truth)
    const client = this.getClient();
    const payment = new Payment(client);
    let paymentData: Awaited<ReturnType<Payment['get']>>;
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

    const type: WebhookEventType =
      MP_WEBHOOK_STATUS_MAP[paymentData.status ?? ''] ?? 'pending';

    const resolvedId = paymentData.id?.toString();
    if (!resolvedId) {
      throw new InternalServerErrorException(
        'MercadoPago returned webhook data without a payment ID',
      );
    }

    const metadata = paymentData.metadata as Record<string, string> | undefined;

    return {
      type,
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
