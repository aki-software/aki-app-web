import { BadRequestException } from '@nestjs/common';
import { AdminPaymentLedgerController } from './admin-payment-ledger.controller';

describe('AdminPaymentLedgerController', () => {
  const ledger = { list: jest.fn(), detail: jest.fn() };
  const response = { setHeader: jest.fn() };
  let controller: AdminPaymentLedgerController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new AdminPaymentLedgerController(ledger as never);
  });

  it('parses the shared query defaults and disables caching', async () => {
    ledger.list.mockResolvedValue({ items: [] });
    await expect(controller.list({}, response as never)).resolves.toEqual({
      items: [],
    });
    expect(ledger.list).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 25,
        notificationRecipient: 'ANY',
      }),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
  });

  it('rejects malformed queries with 400 metadata', async () => {
    await expect(
      controller.list({ page: 'nope' }, response as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sets no-store on detail requests', async () => {
    ledger.detail.mockResolvedValue({
      voucherBatchId: '11111111-1111-4111-8111-111111111111',
    });
    await controller.detail(
      '11111111-1111-4111-8111-111111111111',
      response as never,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
  });
});
