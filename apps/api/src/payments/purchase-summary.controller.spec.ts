import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PurchaseSummaryController } from './purchase-summary.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

const response = { setHeader: jest.fn() };
describe('PurchaseSummaryController', () => {
  const summary = { get: jest.fn() };
  let controller: PurchaseSummaryController;
  beforeEach(() => {
    jest.resetAllMocks();
    controller = new PurchaseSummaryController(summary as never);
  });

  it('allows only admin roles in guard metadata', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PurchaseSummaryController)).toEqual([
      'ADMIN',
      'INSTITUTION_ADMIN',
    ]);
  });

  it('gives ADMIN platform scope and disables caching', async () => {
    summary.get.mockResolvedValue({ scope: 'PLATFORM' });
    await controller.get(
      {},
      { user: { role: 'ADMIN' } } as never,
      response as never,
    );
    expect(summary.get).toHaveBeenCalledWith(
      { periodDays: 7 },
      { scope: 'PLATFORM' },
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
  });
  it('limits an institution admin to their authenticated institution', async () => {
    await controller.get(
      { periodDays: '30' },
      {
        user: { role: 'INSTITUTION_ADMIN', institutionId: 'institution-1' },
      } as never,
      response as never,
    );
    expect(summary.get).toHaveBeenCalledWith(
      { periodDays: 30 },
      { scope: 'INSTITUTION', institutionId: 'institution-1' },
    );
  });
  it('rejects missing institution identity and invalid queries', async () => {
    await expect(
      controller.get(
        {},
        { user: { role: 'INSTITUTION_ADMIN' } } as never,
        response as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.get(
        { periodDays: '8' },
        { user: { role: 'ADMIN' } } as never,
        response as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
