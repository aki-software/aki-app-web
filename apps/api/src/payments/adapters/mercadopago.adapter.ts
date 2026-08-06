import { Injectable, Logger } from '@nestjs/common';
import { PaymentGatewayAdapter } from '../interfaces/payment-gateway.adapter.js';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import * as crypto from 'crypto';

@Injectable()
export class MercadoPagoAdapter implements PaymentGatewayAdapter {
  private client: MercadoPagoConfig;
  private readonly logger = new Logger(MercadoPagoAdapter.name);

  constructor() {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN || 'test_token',
    });
  }

  async createCheckout(params: {
    voucherBatchId: string;
    priceUsd: number;
    priceArs?: number;
    successUrl: string;
    failureUrl: string;
    notificationUrl: string;
    buyerEmail: string;
    description: string;
  }): Promise<{ checkoutUrl: string; externalReference: string }> {
    const preference = new Preference(this.client);

    // MP always charges in ARS in Argentina
    const amount = params.priceArs ?? params.priceUsd * 1000;

    const result = await preference.create({
      body: {
        items: [
          {
            id: params.voucherBatchId,
            title: params.description,
            quantity: 1,
            unit_price: amount,
            currency_id: 'ARS',
          },
        ],
        payer: {
          email: params.buyerEmail,
        },
        back_urls: {
          success: params.successUrl,
          failure: params.failureUrl,
          pending: params.failureUrl,
        },
        auto_return: 'approved',
        notification_url: params.notificationUrl,
        external_reference: params.voucherBatchId,
      },
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
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<boolean> {
    const signatureHeader = headers['x-signature'];
    const requestId = headers['x-request-id'];
    const dataId = headers['data.id'] || '';

    if (!signatureHeader || !requestId) {
      return Promise.resolve(false);
    }

    // signature is like: ts=12345,v1=abcdef...
    const parts = signatureHeader.split(',');
    let ts = '';
    let hash = '';
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    }

    const secret = process.env.MP_WEBHOOK_SECRET || '';
    if (!secret) {
      this.logger.warn(
        'MP_WEBHOOK_SECRET not configured, bypassing signature validation',
      );
      return Promise.resolve(true); // Bypass in dev if not set
    }

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const expectedHash = hmac.digest('hex');

    return Promise.resolve(hash === expectedHash);
  }

  async getPaymentStatus(externalReference: string): Promise<{
    status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'EXPIRED';
    paidAmount?: number;
    currency?: string;
  }> {
    try {
      const payment = new Payment(this.client);
      const result = await payment.get({ id: externalReference });

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

      return {
        status: mappedStatus,
        paidAmount: result.transaction_amount,
        currency: result.currency_id,
      };
    } catch (err) {
      this.logger.error(
        `Failed to fetch payment status for ${externalReference}`,
        err,
      );
      return { status: 'PENDING' }; // Default safe fallback
    }
  }
}
