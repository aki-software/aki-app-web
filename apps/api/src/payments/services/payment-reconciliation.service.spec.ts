import { Logger } from '@nestjs/common';
import { In } from 'typeorm';
import { PaymentReconciliationService } from './payment-reconciliation.service';

describe('PaymentReconciliationService', () => {
  const approvedPayment = {
    providerPaymentId: 'payment-1',
    merchantReference: 'batch-1',
    amountMinor: 1000n,
    currency: 'ARS',
    status: 'APPROVED' as const,
  };

  function createService(options?: {
    attempts?: object[];
    findPayment?: jest.Mock;
    find?: jest.Mock;
  }) {
    const adapter = {
      findPaymentByMerchantReference:
        options?.findPayment ?? jest.fn().mockResolvedValue(approvedPayment),
    };
    const settlement = {
      settleVerifiedPayment: jest.fn().mockResolvedValue(undefined),
    };
    const repo = {
      find:
        options?.find ??
        jest.fn().mockResolvedValue(
          options?.attempts ?? [
            {
              id: 'attempt-1',
              voucherBatchId: 'batch-1',
              gateway: 'MERCADO_PAGO',
              state: 'READY',
              createdAt: new Date(),
              voucherBatch: { status: 'PENDING' },
            },
          ],
        ),
    };

    return {
      adapter,
      settlement,
      repo,
      service: new PaymentReconciliationService(
        adapter as never,
        repo as never,
        settlement as never,
      ),
    };
  }

  it('settles an approved canonical Mercado Pago payment found by batch reference', async () => {
    const { service, adapter, settlement } = createService();

    await service.reconcileRecentAttempts();

    expect(adapter.findPaymentByMerchantReference).toHaveBeenCalledWith(
      'batch-1',
    );
    expect(settlement.settleVerifiedPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        gateway: 'MERCADO_PAGO',
        payment: expect.objectContaining({ providerPaymentId: 'payment-1' }),
        rawBody: Buffer.from(
          '{"source":"mercado_pago_reconciliation","providerPaymentId":"payment-1","merchantReference":"batch-1"}',
        ),
      }),
    );
  });

  it('only queries a bounded set of recent READY or OUTCOME_UNKNOWN attempts with pending batches', async () => {
    const { service, repo } = createService({ attempts: [] });

    await service.reconcileRecentAttempts();

    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          gateway: 'MERCADO_PAGO',
          state: In(['READY', 'OUTCOME_UNKNOWN']),
          voucherBatch: { status: 'PENDING' },
          createdAt: expect.any(Object),
        }),
        relations: ['voucherBatch'],
        order: { createdAt: 'DESC' },
        take: 100,
      }),
    );
  });

  it.each([
    {
      description: 'non-approved',
      payment: { ...approvedPayment, status: 'PENDING' as const },
    },
    {
      description: 'mismatched',
      payment: { ...approvedPayment, merchantReference: 'other-batch' },
    },
  ])('does not settle a $description payment', async ({ payment }) => {
    const { service, settlement } = createService({
      findPayment: jest.fn().mockResolvedValue(payment),
    });

    await service.reconcileRecentAttempts();

    expect(settlement.settleVerifiedPayment).not.toHaveBeenCalled();
  });

  it('continues reconciling independently when one provider lookup fails', async () => {
    const findPayment = jest
      .fn()
      .mockRejectedValueOnce(new Error('provider unavailable'))
      .mockResolvedValueOnce(approvedPayment);
    const { service, settlement } = createService({
      findPayment,
      attempts: [
        {
          id: 'attempt-failed',
          voucherBatchId: 'batch-failed',
          gateway: 'MERCADO_PAGO',
          state: 'READY',
          createdAt: new Date(),
          voucherBatch: { status: 'PENDING' },
        },
        {
          id: 'attempt-1',
          voucherBatchId: 'batch-1',
          gateway: 'MERCADO_PAGO',
          state: 'READY',
          createdAt: new Date(),
          voucherBatch: { status: 'PENDING' },
        },
      ],
    });

    await service.reconcileRecentAttempts();

    expect(findPayment).toHaveBeenCalledTimes(2);
    expect(settlement.settleVerifiedPayment).toHaveBeenCalledTimes(1);
  });

  it('dispatches startup reconciliation without blocking application bootstrap', async () => {
    let resolveReconciliation!: () => void;
    const reconciliation = new Promise<void>((resolve) => {
      resolveReconciliation = resolve;
    });
    const { service } = createService();
    const reconcileRecentAttempts = jest
      .spyOn(service, 'reconcileRecentAttempts')
      .mockReturnValue(reconciliation);

    expect(service.onApplicationBootstrap()).toBeUndefined();
    expect(reconcileRecentAttempts).toHaveBeenCalledTimes(1);

    resolveReconciliation();
    await reconciliation;
  });

  it('contains top-level startup reconciliation failures', async () => {
    const errorLogger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { service } = createService();
    jest
      .spyOn(service, 'reconcileRecentAttempts')
      .mockRejectedValue(new Error('database unavailable'));

    service.onApplicationBootstrap();
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(errorLogger).toHaveBeenCalledWith(
      'Mercado Pago startup reconciliation failed',
      expect.any(String),
    );
    service.onModuleDestroy();
    errorLogger.mockRestore();
  });

  it('runs periodic recovery without overlapping scans and clears its unrefed timer on destroy', async () => {
    jest.useFakeTimers();
    let resolveScan!: (attempts: object[]) => void;
    const scan = new Promise<object[]>((resolve) => {
      resolveScan = resolve;
    });
    const { service, repo } = createService({
      find: jest.fn().mockReturnValueOnce(scan).mockResolvedValue([]),
    });

    service.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(repo.find).toHaveBeenCalledTimes(1);
    resolveScan([]);
    await scan;
    await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(repo.find).toHaveBeenCalledTimes(2);

    service.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(repo.find).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('single-flights and cools down reconciliation for an authorized unresolved attempt', async () => {
    let resolvePayment!: (value: typeof approvedPayment) => void;
    const findPayment = new Promise<typeof approvedPayment>((resolve) => {
      resolvePayment = resolve;
    });
    const { service, adapter, settlement } = createService({
      findPayment: jest.fn().mockReturnValue(findPayment),
    });
    const attempt = {
      id: 'attempt-1',
      gateway: 'MERCADO_PAGO',
      state: 'READY',
      createdAt: new Date(),
      voucherBatchId: 'batch-1',
      voucherBatch: { status: 'PENDING' },
    };

    const first = service.reconcileAuthorizedAttempt(attempt as never);
    const second = service.reconcileAuthorizedAttempt(attempt as never);
    expect(first).toBe(second);

    resolvePayment(approvedPayment);
    await first;
    await service.reconcileAuthorizedAttempt(attempt as never);

    expect(adapter.findPaymentByMerchantReference).toHaveBeenCalledTimes(1);
    expect(settlement.settleVerifiedPayment).toHaveBeenCalledTimes(1);
  });

  it('contains provider failures for a single authorized reconciliation attempt', async () => {
    const errorLogger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { service, settlement } = createService({
      findPayment: jest.fn().mockRejectedValue(new Error('provider timeout')),
    });

    await expect(
      service.reconcileAuthorizedAttempt({
        id: 'attempt-1',
        gateway: 'MERCADO_PAGO',
        state: 'OUTCOME_UNKNOWN',
        createdAt: new Date(),
        voucherBatchId: 'batch-1',
        voucherBatch: { status: 'PENDING' },
      } as never),
    ).resolves.toBeUndefined();

    expect(settlement.settleVerifiedPayment).not.toHaveBeenCalled();
    expect(errorLogger).toHaveBeenCalledWith(
      'Mercado Pago reconciliation failed for checkout attempt attempt-1',
      expect.any(String),
    );
    errorLogger.mockRestore();
  });
});
