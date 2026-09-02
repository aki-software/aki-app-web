import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoAdapter } from './mercadopago.adapter';

const mockPreferenceCreate = jest.fn();

jest.mock('mercadopago', () => {
  const actual = jest.requireActual(
    'mercadopago',
  ) as unknown as typeof import('mercadopago');
  return {
    ...actual,
    MercadoPagoConfig: jest.fn(),
    Preference: jest
      .fn()
      .mockImplementation(() => ({ create: mockPreferenceCreate })),
    Payment: jest.fn(),
  };
});

describe('MercadoPagoAdapter', () => {
  beforeEach(() => {
    mockPreferenceCreate.mockReset();
  });

  it('passes the durable provider key through the SDK requestOptions', async () => {
    mockPreferenceCreate.mockResolvedValue({
      id: 'preference-1',
      init_point: 'https://mp.example/checkout',
      external_reference: 'batch-1',
    });
    const config = {
      get: jest.fn((key: string) =>
        key.startsWith('MP_') ? 'secret' : undefined,
      ),
    } as unknown as ConfigService;
    const adapter = new MercadoPagoAdapter(config);

    await expect(
      adapter.createCheckout({
        voucherBatchId: 'batch-1',
        priceUsd: 10,
        priceArs: 15000,
        successUrl: 'https://app.example/success',
        failureUrl: 'https://app.example/failure',
        notificationUrl: 'https://api.example/webhook',
        buyerEmail: 'buyer@example.com',
        description: 'Vouchers',
        providerIdempotencyKey: 'key-1',
      }),
    ).resolves.toEqual({
      checkoutUrl: 'https://mp.example/checkout',
      externalReference: 'preference-1',
      merchantReference: 'batch-1',
    });
    expect(mockPreferenceCreate).toHaveBeenCalledWith({
      body: {
        items: [
          {
            id: 'batch-1',
            title: 'Vouchers',
            quantity: 1,
            unit_price: 15000,
            currency_id: 'ARS',
          },
        ],
        payer: { email: 'buyer@example.com' },
        back_urls: {
          success: 'https://app.example/success',
          failure: 'https://app.example/failure',
          pending: 'https://app.example/failure',
        },
        auto_return: 'approved',
        external_reference: 'batch-1',
        notification_url: 'https://api.example/webhook',
      },
      requestOptions: { idempotencyKey: 'key-1' },
    });
  });

  it('rejects a preference with a mismatched merchant reference', async () => {
    mockPreferenceCreate.mockResolvedValue({
      id: 'preference-1',
      init_point: 'https://mp.example/checkout',
      external_reference: 'different-batch',
    });
    const config = {
      get: jest.fn((key: string) =>
        key.startsWith('MP_') ? 'secret' : undefined,
      ),
    } as unknown as ConfigService;
    const adapter = new MercadoPagoAdapter(config);

    await expect(
      adapter.createCheckout({
        voucherBatchId: 'batch-1',
        priceUsd: 10,
        priceArs: 15000,
        successUrl: 'https://app.example/success',
        failureUrl: 'https://app.example/failure',
        notificationUrl: 'https://api.example/webhook',
        buyerEmail: 'buyer@example.com',
        description: 'Vouchers',
        providerIdempotencyKey: 'key-1',
      }),
    ).rejects.toThrow('MercadoPago preference reference mismatch');
  });

  describe('validateWebhook', () => {
    const secret = 'webhook-secret';
    const dataId = 'payment-1';
    const requestId = 'request-1';

    function signedContext(
      ts: string,
      options: { dataId?: string; requestId?: string } = {},
    ) {
      const signedDataId = options.dataId ?? dataId;
      const signedRequestId = options.requestId ?? requestId;
      const manifest = [
        signedDataId ? `id:${signedDataId}` : undefined,
        signedRequestId ? `request-id:${signedRequestId}` : undefined,
        `ts:${ts}`,
      ]
        .filter(Boolean)
        .join(';')
        .concat(';');
      const hash = createHmac('sha256', secret).update(manifest).digest('hex');

      return {
        headers: {
          ...(signedRequestId ? { 'x-request-id': signedRequestId } : {}),
          'x-signature': `ts=${ts},v1=${hash}`,
        },
        query: signedDataId ? { 'data.id': signedDataId } : {},
      };
    }

    function createAdapter() {
      const config = {
        get: jest.fn((key: string) =>
          key === 'MP_ACCESS_TOKEN' || key === 'MP_WEBHOOK_SECRET'
            ? secret
            : undefined,
        ),
      } as unknown as ConfigService;
      return new MercadoPagoAdapter(config);
    }

    function silenceLogs(adapter: MercadoPagoAdapter) {
      const logger = (
        adapter as unknown as {
          logger: {
            debug: (...args: unknown[]) => void;
            warn: (...args: unknown[]) => void;
            error: (...args: unknown[]) => void;
          };
        }
      ).logger;
      return [
        jest.spyOn(logger, 'debug').mockImplementation(() => undefined),
        jest.spyOn(logger, 'warn').mockImplementation(() => undefined),
        jest.spyOn(logger, 'error').mockImplementation(() => undefined),
      ];
    }

    it('accepts a valid signature with a current Unix-seconds timestamp', async () => {
      const timestamp = String(Math.floor(Date.now() / 1000));

      await expect(
        createAdapter().validateWebhook(
          Buffer.alloc(0),
          signedContext(timestamp),
        ),
      ).resolves.toBe(true);
    });

    it('accepts a valid signature with a current Unix-milliseconds timestamp', async () => {
      const timestamp = String(Date.now());

      await expect(
        createAdapter().validateWebhook(
          Buffer.alloc(0),
          signedContext(timestamp),
        ),
      ).resolves.toBe(true);
    });

    it('normalizes whitespace and validates uppercase alphanumeric data IDs as lowercase', async () => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const context = signedContext(timestamp, { dataId: 'paymentabc123' });
      context.headers['x-request-id'] = ` ${requestId} `;
      context.headers['x-signature'] = ` ${context.headers['x-signature']} `;
      context.query['data.id'] = 'PAYMENTABC123';

      await expect(
        createAdapter().validateWebhook(Buffer.alloc(0), context),
      ).resolves.toBe(true);
    });

    it('allows the SDK documented optional manifest components', async () => {
      const timestamp = String(Math.floor(Date.now() / 1000));

      await expect(
        createAdapter().validateWebhook(
          Buffer.alloc(0),
          signedContext(timestamp, { dataId: '', requestId: '' }),
        ),
      ).resolves.toBe(true);
    });

    it.each([
      { headers: {}, query: {} },
      {
        headers: { 'x-signature': 'ts=nope,v1=bad' },
        query: { 'data.id': dataId },
      },
    ])('rejects malformed or missing signature input', async (context) => {
      await expect(
        createAdapter().validateWebhook(Buffer.alloc(0), context),
      ).resolves.toBe(false);
    });

    it.each([
      () => String(Math.floor((Date.now() - 301_000) / 1000)),
      () => String(Date.now() - 301_000),
    ])('rejects a timestamp older than five minutes', async (timestamp) => {
      await expect(
        createAdapter().validateWebhook(
          Buffer.alloc(0),
          signedContext(timestamp()),
        ),
      ).resolves.toBe(false);
    });

    it('rejects a bad signature', async () => {
      const context = signedContext(String(Math.floor(Date.now() / 1000)));
      context.headers['x-signature'] = replaceLastHashCharacter(
        context.headers['x-signature'],
      );

      await expect(
        createAdapter().validateWebhook(Buffer.alloc(0), context),
      ).resolves.toBe(false);
    });

    it('logs only a generic failure category without sensitive components', async () => {
      const adapter = createAdapter();
      const logs = silenceLogs(adapter);
      const context = signedContext(String(Math.floor(Date.now() / 1000)));
      context.headers['x-signature'] = replaceLastHashCharacter(
        context.headers['x-signature'],
      );

      await expect(
        adapter.validateWebhook(Buffer.alloc(0), context),
      ).resolves.toBe(false);

      const messages = logs.flatMap((log) =>
        log.mock.calls.map(([message]) => String(message)),
      );
      expect(messages).toEqual([
        'Mercado Pago webhook rejected: signature mismatch',
      ]);
      for (const message of messages) {
        expect(message).not.toContain(secret);
        expect(message).not.toContain(dataId);
        expect(message).not.toContain(requestId);
        expect(message).not.toContain(context.headers['x-signature']);
      }
    });
  });
});

function replaceLastHashCharacter(signature: string): string {
  const lastCharacter = signature.at(-1);
  return `${signature.slice(0, -1)}${lastCharacter === '0' ? '1' : '0'}`;
}
