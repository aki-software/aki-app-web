import { ConfigService } from '@nestjs/config';
import { MercadoPagoAdapter } from './mercadopago.adapter';

const mockPreferenceCreate = jest.fn();

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Preference: jest
    .fn()
    .mockImplementation(() => ({ create: mockPreferenceCreate })),
  Payment: jest.fn(),
}));

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
    expect(mockPreferenceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestOptions: { idempotencyKey: 'key-1' },
      }),
    );
  });
});
