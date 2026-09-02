import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookProcessorService } from './webhook-processor.service';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from '../interfaces/payment-gateway.adapter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import type { PaymentGatewayAdapter } from '../interfaces/payment-gateway.adapter';
import { WebhookController } from '../webhook.controller';
import { PaymentEvent } from '../entities/payment-event.entity';
import { CheckoutAttempt } from '../entities/checkout-attempt.entity';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity';
import { VoucherBatchStatus } from '../../vouchers/entities/voucher.enums';

const paymentGatewayAdapterMock = (): jest.Mocked<PaymentGatewayAdapter> => ({
  createCheckout: jest.fn(),
  validateWebhook: jest.fn().mockResolvedValue(true),
  getPaymentStatus: jest.fn(),
  extractPaymentReference: jest.fn(),
});

describe('WebhookProcessorService', () => {
  let service: WebhookProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessorService,
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { createQueryRunner: jest.fn() },
        },
        {
          provide: PAYMENT_GATEWAY_MP,
          useValue: paymentGatewayAdapterMock(),
        },
        {
          provide: PAYMENT_GATEWAY_STRIPE,
          useValue: paymentGatewayAdapterMock(),
        },
      ],
    }).compile();
    service = module.get<WebhookProcessorService>(WebhookProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('emits the checkout buyer email for an institution-owned batch after settlement commits', async () => {
    const eventEmitter = { emit: jest.fn() };
    const voucherBatch = Object.assign(new VoucherBatch(), {
      id: 'batch-id',
      ownerInstitutionId: 'institution-id',
      ownerUser: undefined,
      quantity: 3,
      status: VoucherBatchStatus.PENDING,
      expectedAmountMinor: '1000',
      currency: 'USD',
      paymentProvider: 'STRIPE',
    });
    const manager = {
      findOne: jest.fn((entity) => {
        if (entity === PaymentEvent) return Promise.resolve(null);
        if (entity === VoucherBatch) return Promise.resolve(voucherBatch);
        if (entity === CheckoutAttempt)
          return Promise.resolve({ buyerUser: { email: 'buyer@akit.test' } });
        return Promise.resolve(null);
      }),
      save: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_entity: unknown, value: unknown) => value),
    };
    const queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager,
    };
    const stripeAdapter = paymentGatewayAdapterMock();
    stripeAdapter.extractPaymentReference.mockReturnValue('payment-id');
    stripeAdapter.getPaymentStatus.mockResolvedValue({
      status: 'APPROVED',
      merchantReference: 'batch-id',
      providerPaymentId: 'payment-id',
      amountMinor: 1000n,
      currency: 'USD',
    });
    const service = new WebhookProcessorService(
      eventEmitter as never,
      paymentGatewayAdapterMock(),
      stripeAdapter,
      { createQueryRunner: jest.fn(() => queryRunner) } as never,
    );

    await service.processWebhook({
      gateway: 'STRIPE',
      rawBody: Buffer.from('{}'),
      headers: {},
      body: { id: 'payment-id' },
    });

    expect(
      queryRunner.commitTransaction.mock.invocationCallOrder[0],
    ).toBeLessThan(eventEmitter.emit.mock.invocationCallOrder[0]);
    expect(manager.findOne).toHaveBeenCalledWith(CheckoutAttempt, {
      where: { voucherBatchId: 'batch-id' },
      relations: ['buyerUser'],
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'payment.completed',
      expect.objectContaining({ buyerEmail: 'buyer@akit.test' }),
    );
  });

  it('rejects Stripe webhooks before processing when Mercado Pago is active', async () => {
    const processWebhook = jest.fn();
    const controller = new WebhookController({ processWebhook } as never);
    const originalGateway = process.env.PAYMENT_GATEWAY;
    process.env.PAYMENT_GATEWAY = 'MERCADO_PAGO';

    try {
      await expect(
        controller.handleWebhook(
          'stripe',
          { rawBody: Buffer.from('{}'), body: {}, query: {} } as never,
          {},
        ),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(processWebhook).not.toHaveBeenCalled();
    } finally {
      if (originalGateway === undefined) delete process.env.PAYMENT_GATEWAY;
      else process.env.PAYMENT_GATEWAY = originalGateway;
    }
  });
});
