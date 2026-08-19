import { mapToCreateDto } from './session-payload-mapper.util';

describe('mapToCreateDto', () => {
  it('does not map client-controlled voucher or paid entitlement assertions', () => {
    const result = mapToCreateDto(
      {
        startedAt: '2026-01-01T00:00:00.000Z',
        finishedAt: '2026-01-01T00:01:00.000Z',
        voucherId: 'voucher-1',
        paymentStatus: 'PAID',
        swipes: [],
        resultPayload: {},
      } as any,
      { inferredPatientName: 'Patient', voucher: null } as any,
    );

    expect(result.voucherId).toBeUndefined();
    expect(result.paymentStatus).toBeUndefined();
  });
});
