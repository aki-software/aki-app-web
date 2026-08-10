import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createVerifiedPayment,
  toMinorUnits,
  type CheckoutRequest,
  type CheckoutResponse,
  type PaymentGatewayAdapter,
  type VerifiedPayment,
} from '../interfaces/payment-gateway.adapter.js';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class MercadoPagoAdapter implements PaymentGatewayAdapter {
  private client: MercadoPagoConfig;
  private readonly logger = new Logger(MercadoPagoAdapter.name);

  constructor(private readonly configService: ConfigService) {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN is required for Mercado Pago payments');
    }
    if (!this.configService.get<string>('MP_WEBHOOK_SECRET')) {
      throw new Error(
        'MP_WEBHOOK_SECRET is required for Mercado Pago payments',
      );
    }
    this.client = new MercadoPagoConfig({
      accessToken,
    });
  }

  async createCheckout(params: CheckoutRequest): Promise<CheckoutResponse> {
    const preference = new Preference(this.client);

    if (params.priceArs === undefined) {
      throw new Error('ARS price is required for Mercado Pago checkout');
    }

    const payload = {
      items: [
        {
          id: params.voucherBatchId,
          title: params.description,
          quantity: 1,
          unit_price: params.priceArs,
          currency_id: 'ARS',
        },
      ],
      payer: { email: params.buyerEmail },
      backUrls: {
        success: params.successUrl,
        failure: params.failureUrl,
        pending: params.failureUrl,
      },
      autoReturn: 'approved',
      notificationUrl: params.notificationUrl,
      externalReference: params.voucherBatchId,
    };

    const result = await preference.create({
      body: payload,
    });

    if (!result.init_point) {
      throw new Error('Failed to create MercadoPago preference');
    }

    return {
      checkoutUrl: result.init_point,
      externalReference: result.id!,
    };
  }

  validateWebhook(
    _rawBody: Buffer,
    context:
      | {
          headers: Record<string, string | undefined>;
          query?: Record<string, string | string[] | undefined>;
        }
      | Record<string, string | undefined>,
  ): Promise<boolean> {
    const headers = verificationHeaders(context);
    const query = verificationQuery(context);
    const signatureHeader = headers['x-signature'];
    const requestId = headers['x-request-id'];
    const dataId = normalizeQueryValue(query?.['data.id']);

    if (!signatureHeader || !requestId || !dataId) {
      return Promise.resolve(false);
    }

    // signature is like: ts=12345,v1=abcdef...
    const parts = signatureHeader.split(',');
    let ts = '';
    let hash = '';
    for (const part of parts) {
      const [key, value] = part.trim().split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    }

    const secret = this.configService.get<string>('MP_WEBHOOK_SECRET');
    if (
      !secret ||
      !ts ||
      !hash ||
      !/^\d+$/.test(ts) ||
      !/^[a-f0-9]{64}$/i.test(hash)
    )
      return Promise.resolve(false);
    if (Math.abs(Date.now() - Number(ts)) > 300_000)
      return Promise.resolve(false);

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expectedHash = createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    const expected = Buffer.from(expectedHash, 'hex');
    const received = Buffer.from(hash, 'hex');
    return Promise.resolve(
      expected.length === received.length &&
        timingSafeEqual(expected, received),
    );
  }

  async getAuthenticatedWebhookPaymentId(
    rawBody: Buffer,
    context: {
      headers: Record<string, string | undefined>;
      query?: Record<string, string | string[] | undefined>;
    },
  ): Promise<string | undefined> {
    return (await this.validateWebhook(rawBody, context))
      ? normalizeQueryValue(context.query?.['data.id'])
      : undefined;
  }

  async getPaymentStatus(externalPaymentId: string): Promise<VerifiedPayment> {
    try {
      const payment = new Payment(this.client);
      const result = await payment.get({ id: externalPaymentId });

      let mappedStatus: 'APPROVED' | 'REJECTED' | 'PENDING' | 'EXPIRED' =
        'PENDING';

      switch (result.status) {
        case 'approved':
          mappedStatus = 'APPROVED';
          break;
        case 'rejected':
        case 'cancelled':
        case 'refunded':
          mappedStatus = 'REJECTED';
          break;
        case 'pending':
        case 'in_process':
        case 'authorized':
          mappedStatus = 'PENDING';
          break;
      }

      if (
        result.transaction_amount === undefined ||
        !result.currency_id ||
        !result.external_reference
      ) {
        throw new Error(
          'Mercado Pago payment is missing immutable settlement fields',
        );
      }

      return createVerifiedPayment({
        providerPaymentId: String(result.id ?? externalPaymentId),
        merchantReference: result.external_reference,
        amountMinor: toMinorUnits(
          String(result.transaction_amount),
          result.currency_id,
        ),
        currency: result.currency_id,
        status: mappedStatus,
      });
    } catch (err) {
      this.logger.error(
        `Failed to fetch payment status for ${externalPaymentId}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  extractPaymentReference(body: unknown): string | undefined {
    if (!isRecord(body) || body.type !== 'payment' || !isRecord(body.data)) {
      return undefined;
    }
    const paymentId = body.data.id;
    return typeof paymentId === 'string' || typeof paymentId === 'number'
      ? String(paymentId)
      : undefined;
  }
}

function normalizeQueryValue(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function verificationHeaders(
  context:
    | {
        headers: Record<string, string | undefined>;
        query?: Record<string, string | string[] | undefined>;
      }
    | Record<string, string | undefined>,
): Record<string, string | undefined> {
  return isVerificationContext(context) ? context.headers : context;
}

function verificationQuery(
  context:
    | {
        headers: Record<string, string | undefined>;
        query?: Record<string, string | string[] | undefined>;
      }
    | Record<string, string | undefined>,
): Record<string, string | string[] | undefined> | undefined {
  return isVerificationContext(context) ? context.query : undefined;
}

function isVerificationContext(
  context:
    | {
        headers: Record<string, string | undefined>;
        query?: Record<string, string | string[] | undefined>;
      }
    | Record<string, string | undefined>,
): context is {
  headers: Record<string, string | undefined>;
  query?: Record<string, string | string[] | undefined>;
} {
  return typeof context['headers'] === 'object' && context['headers'] !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
