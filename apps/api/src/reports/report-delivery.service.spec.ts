import { ReportDeliveryService } from './report-delivery.service';
import { ReportDeliveryStatus } from './entities/report-delivery.entity';

describe('ReportDeliveryService', () => {
  const setup = () => {
    const deliveries: Array<{
      reportId: string;
      recipientEmail: string;
      status: ReportDeliveryStatus;
      attempts: number;
    }> = [];
    const repository = {
      findOne: jest.fn(({ where }) =>
        Promise.resolve(
          deliveries.find(
            (delivery) =>
              delivery.reportId === where.reportId &&
              delivery.recipientEmail === where.recipientEmail,
          ),
        ),
      ),
      create: jest.fn((input) => input),
      save: jest.fn((delivery) => {
        const existing = deliveries.find(
          (candidate) =>
            candidate.reportId === delivery.reportId &&
            candidate.recipientEmail === delivery.recipientEmail,
        );
        if (!existing) deliveries.push(delivery);
        return Promise.resolve(delivery);
      }),
    };
    return {
      service: new ReportDeliveryService(repository as any, {} as any),
      repository,
    };
  };

  it('returns an idempotent result for the same alternate recipient', async () => {
    const { service } = setup();

    await expect(
      (service as any).request('report-1', 'Ada@Example.com'),
    ).resolves.toEqual({
      queued: true,
      idempotent: false,
    });
    await expect(
      (service as any).request('report-1', 'ada@example.com'),
    ).resolves.toEqual({
      queued: true,
      idempotent: true,
    });
  });

  it('skips an already delivered report-recipient pair across delivery paths', async () => {
    const { service } = setup();

    const delivery = await service.claim('report-1', 'Ada@Example.com');
    await service.markDelivered(delivery!);

    await expect(
      service.claim('report-1', 'ada@example.com'),
    ).resolves.toBeNull();
  });

  it('retains failed delivery records so BullMQ retries can claim them', async () => {
    const { service } = setup();

    const delivery = await service.claim('report-1', 'ada@example.com');
    await service.markFailed(delivery!);

    await expect(service.claim('report-1', 'ada@example.com')).resolves.toEqual(
      expect.objectContaining({
        status: ReportDeliveryStatus.PENDING,
        attempts: 2,
      }),
    );
  });
});
