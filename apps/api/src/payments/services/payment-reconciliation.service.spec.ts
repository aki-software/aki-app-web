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
        { id: 'attempt-failed', voucherBatchId: 'batch-failed' },
        { id: 'attempt-1', voucherBatchId: 'batch-1' },
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
    errorLogger.mockRestore();
  });
});
