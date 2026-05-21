import { SessionPayloadMapperService } from './session-payload-mapper.service.js';
import { SessionPaymentStatus } from '../entities/session.entity.js';
import type { CompleteSessionDto } from '../dto/complete-session.dto.js';
import type { ResolvedOwnerContext } from './session-owner-resolver.service.js';

describe('SessionPayloadMapperService', () => {
  const service = new SessionPayloadMapperService();

  it('maps payload with voucher overrides and metadata enrichment', () => {
    const payload = {
      id: 'session-1',
      userId: 'user-1',
      patientId: undefined,
      therapistUserId: undefined,
      institutionId: undefined,
      voucherId: 'voucher-payload',
      voucherCode: 'VOUCHER',
      paymentStatus: 'paid',
      patientName: 'Payload Patient',
      catalogVersion: 'v1',
      startedAt: '2024-01-01T00:00:00Z',
      finishedAt: '2024-01-01T00:00:10Z',
      swipes: [
        {
          cardId: 'card-1',
          categoryId: 'A',
          liked: true,
          timestamp: '2024-01-01T00:00:01Z',
        },
      ],
      resultPayload: {
        radar: [{ categoryId: ' a ', likes: 3, total: 4, affinity: 0.5 }],
        top3: [
          {
            categoryId: 'A',
            percentage: 70,
            score: 7,
            totalPossible: 10,
            suggestedCareers: ['Designer'],
            materialSnippet: 'Snippet',
          },
        ],
        bottom3: [],
        hollandCode: 'RIA',
      },
    } as CompleteSessionDto;

    const context: ResolvedOwnerContext = {
      user: { id: 'user-1', institutionId: 'inst-1' } as any,
      voucher: {
        id: 'voucher-1',
        ownerUserId: 'owner-1',
        ownerInstitutionId: 'owner-inst',
        code: 'VOUCHER',
      } as any,
      fallbackOwner: null,
      inferredPatientName: 'Payload Patient',
      isTherapistUser: false,
      isPatientUser: true,
    };

    const result = service.mapToCreateDto(payload, context);

    expect(result).toEqual(
      expect.objectContaining({
        id: 'session-1',
        therapistUserId: 'owner-1',
        institutionId: 'owner-inst',
        patientId: 'user-1',
        patientName: 'Payload Patient',
        voucherId: 'voucher-1',
        paymentStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
        hollandCode: 'RIA',
      }),
    );
    expect(result.totalTimeMs).toBe(10000);
    expect(result.results).toEqual([
      {
        categoryId: 'A',
        score: 3,
        totalPossible: 4,
        percentage: 50,
        suggestedCareers: ['Designer'],
        materialSnippet: 'Snippet',
      },
    ]);
    expect(result.swipes).toEqual([
      {
        cardId: 'card-1',
        categoryId: 'A',
        isLiked: true,
        timestamp: new Date('2024-01-01T00:00:01Z'),
      },
    ]);
  });

  it('normalizes payment status when no voucher is present', () => {
    const payload = {
      id: 'session-2',
      userId: 'user-2',
      patientName: 'Patient',
      catalogVersion: 'v1',
      startedAt: '2024-01-01T00:00:00Z',
      finishedAt: '2024-01-01T00:00:00Z',
      paymentStatus: 'paid',
      swipes: [],
      resultPayload: { radar: [], top3: [], bottom3: [], hollandCode: 'RIA' },
    } as CompleteSessionDto;

    const context: ResolvedOwnerContext = {
      user: { id: 'user-2' } as any,
      voucher: null,
      fallbackOwner: null,
      inferredPatientName: 'Patient',
      isTherapistUser: true,
      isPatientUser: false,
    };

    const result = service.mapToCreateDto(payload, context);

    expect(result.paymentStatus).toBe(SessionPaymentStatus.PAID);
    expect(result.therapistUserId).toBe('user-2');
  });
});
