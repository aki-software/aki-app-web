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
import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Payment,
  Preference,
  SignatureFailureReason,
  WebhookSignatureValidator,
} from 'mercadopago';

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
      back_urls: {
        success: params.successUrl,
        failure: params.failureUrl,
        pending: params.failureUrl,
      },
      auto_return: 'approved',
      notification_url: params.notificationUrl,
      external_reference: params.voucherBatchId,
    };

    const result = await preference.create({
      body: payload,
      requestOptions: { idempotencyKey: params.providerIdempotencyKey },
    });

    if (!result.init_point || !result.id) {
      throw new Error('Failed to create MercadoPago preference');
    }
    if (result.external_reference !== params.voucherBatchId) {
      throw new Error('MercadoPago preference reference mismatch');
    }

    return {
      checkoutUrl: result.init_point,
      externalReference: result.id,
      merchantReference: result.external_reference,
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
    const signatureHeader = normalizeHeaderValue(headers['x-signature']);
    const requestId = normalizeHeaderValue(headers['x-request-id']);
    const dataId = normalizeQueryValue(query?.['data.id'])?.toLowerCase();
    const secret = this.configService.get<string>('MP_WEBHOOK_SECRET');

    try {
      WebhookSignatureValidator.validate({
        xSignature: signatureHeader,
        xRequestId: requestId,
        dataId,
        secret: secret ?? '',
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        this.logger.warn(
          `Mercado Pago webhook rejected: ${signatureFailureCategory(error)}`,
        );
        return Promise.resolve(false);
      }
      throw error;
    }

    if (
      !isTimestampWithinTolerance(extractSignatureTimestamp(signatureHeader))
    ) {
      this.logger.warn(
        'Mercado Pago webhook rejected: timestamp outside tolerance',
      );
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
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

  async findPaymentByMerchantReference(
    merchantReference: string,
  ): Promise<VerifiedPayment | undefined> {
    const payment = new Payment(this.client);
    const result = await payment.search({
      options: {
        external_reference: merchantReference,
        sort: 'date_created',
        criteria: 'desc',
        limit: 10,
      },
    });

    // Search results are only hints: canonical details must independently match.
    let pendingMatch: VerifiedPayment | undefined;
    for (const candidate of result.results ?? []) {
      if (!candidate.id) continue;
      const verified = await this.getPaymentStatus(String(candidate.id));
      if (verified.merchantReference !== merchantReference) continue;
      if (verified.status === 'APPROVED') return verified;
      pendingMatch ??= verified;
    }
    return pendingMatch;
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
  return normalizeHeaderValue(Array.isArray(value) ? value[0] : value);
}

function normalizeHeaderValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function extractSignatureTimestamp(
  signature: string | undefined,
): string | undefined {
  if (!signature) return undefined;

  let timestamp: string | undefined;
  for (const part of signature.split(',')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim().toLowerCase() === 'ts') {
      timestamp = part.slice(separator + 1).trim() || undefined;
    }
  }
  return timestamp;
}

function isTimestampWithinTolerance(timestamp: string | undefined): boolean {
  if (!timestamp || !/^\d+$/.test(timestamp)) return false;

  const value = Number(timestamp);
  const timestampMs = value >= 1_000_000_000_000 ? value : value * 1000;
  return (
    Number.isSafeInteger(value) &&
    Number.isFinite(timestampMs) &&
    Math.abs(Date.now() - timestampMs) <= 300_000
  );
}

function signatureFailureCategory(error: InvalidWebhookSignatureError): string {
  return error.reason === SignatureFailureReason.SignatureMismatch
    ? 'signature mismatch'
    : 'malformed input';
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
