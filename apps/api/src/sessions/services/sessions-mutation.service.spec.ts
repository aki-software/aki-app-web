import { SessionsMutationService } from './sessions-mutation.service';

describe('SessionsMutationService completion boundary', () => {
  it('rejects voucher completion without verified Firebase provenance', async () => {
    const service = Object.create(
      SessionsMutationService.prototype,
    ) as SessionsMutationService;

    await expect(
      service.completeSession({ voucherCode: 'AB12CD34' } as any, {
        userId: 'patient-1',
        email: 'patient@example.com',
        isFirebaseEmailVerified: false,
      }),
    ).rejects.toThrow('Verified Firebase identity is required');
  });

  it.each([
    ['THERAPIST', 'trusted-therapist'],
    ['ADMIN', 'trusted-admin'],
    ['INSTITUTION_ADMIN', 'trusted-institution-admin'],
  ])(
    'persists authenticated %s ownership instead of conflicting client IDs',
    async (role, trustedUserId) => {
      const resolver = {
        resolveContext: jest.fn().mockResolvedValue({
          inferredPatientName: 'Patient',
          voucher: null,
          isTherapistUser: true,
        }),
      };
      const service = Object.create(SessionsMutationService.prototype);
      service.ownerResolver = resolver;
      service.create = jest
        .fn()
        .mockResolvedValue({ session: { id: 'session-1' }, duplicated: false });

      await service.completeSession(
        {
          startedAt: new Date().toISOString(),
          therapistUserId: 'client-therapist',
          institutionId: 'client-institution',
          swipes: [],
          resultPayload: {},
        },
        {
          userId: trustedUserId,
          institutionId: 'trusted-institution',
          role,
        },
      );

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          therapistUserId: trustedUserId,
          institutionId: 'trusted-institution',
        }),
        expect.anything(),
      );
    },
  );

  it('persists internal owner UUIDs for a Firebase therapist identity', async () => {
    const resolver = {
      resolveFirebaseUser: jest.fn().mockResolvedValue({
        id: '2dfd0db2-2ca1-4ef7-aa3b-9ace5286ecaa',
        institutionId: '4e0ba2f8-1d62-4d13-a01c-1b7025a6195c',
      }),
      resolveContext: jest.fn().mockResolvedValue({
        inferredPatientName: 'Patient',
        voucher: null,
        isTherapistUser: true,
      }),
    };
    const service = Object.create(SessionsMutationService.prototype);
    service.ownerResolver = resolver;
    service.create = jest
      .fn()
      .mockResolvedValue({ session: { id: 'session-1' }, duplicated: false });

    await service.completeSession(
      {
        startedAt: new Date().toISOString(),
        therapistUserId: 'client-therapist',
        institutionId: 'client-institution',
        swipes: [],
        resultPayload: {},
      },
      {
        userId: 'firebase-non-uuid-therapist-id',
        email: 'therapist@example.com',
        institutionId: 'client-institution',
        isFirebaseEmailVerified: true,
        role: 'THERAPIST',
      },
    );

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        therapistUserId: '2dfd0db2-2ca1-4ef7-aa3b-9ace5286ecaa',
        institutionId: '4e0ba2f8-1d62-4d13-a01c-1b7025a6195c',
      }),
      expect.anything(),
    );
    expect(resolver.resolveContext).toHaveBeenCalledWith(
      '2dfd0db2-2ca1-4ef7-aa3b-9ace5286ecaa',
      null,
      '2dfd0db2-2ca1-4ef7-aa3b-9ace5286ecaa',
      '4e0ba2f8-1d62-4d13-a01c-1b7025a6195c',
      undefined,
    );
  });

  it('clears anonymous client identity and owner fields before persistence', async () => {
    const service = Object.create(SessionsMutationService.prototype);
    service.ownerResolver = {
      resolveContext: jest.fn().mockResolvedValue({
        inferredPatientName: 'Patient',
        voucher: null,
        isTherapistUser: false,
        fallbackOwner: { id: '92177e63-49f2-46f8-a76f-406fd8f8b438' },
      }),
    };
    service.create = jest
      .fn()
      .mockResolvedValue({ session: { id: 'session-1' }, duplicated: false });

    await expect(
      service.completeSession({
        startedAt: new Date().toISOString(),
        userId: '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c',
        patientId: '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c',
        therapistUserId: '71cdd6c3-32e7-40aa-967e-b06d52f84aa8',
        institutionId: '0f2e5f24-d49e-492c-b8ca-41d671009d2d',
        swipes: [],
        resultPayload: {},
      }),
    ).resolves.toEqual({ id: 'session-1', duplicated: false });
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: undefined,
        therapistUserId: '92177e63-49f2-46f8-a76f-406fd8f8b438',
        institutionId: undefined,
      }),
      expect.anything(),
    );
  });

  it.each([
    ['PATIENT', 'patientId', 'a0ae48b2-0e46-4855-9a74-36e03c373f83'],
    ['THERAPIST', 'therapistUserId', '71cdd6c3-32e7-40aa-967e-b06d52f84aa8'],
    ['ADMIN', 'therapistUserId', '4d4f0e8a-8a4a-489e-9926-f753d1774f3e'],
    [
      'INSTITUTION_ADMIN',
      'therapistUserId',
      'ded279d2-0ea0-436f-997d-1b23c06d79b9',
    ],
  ])(
    'persists local %s UUID identity without Firebase resolution',
    async (role, field, userId) => {
      const resolver = {
        resolveFirebaseUser: jest.fn(),
        resolveContext: jest.fn().mockResolvedValue({
          inferredPatientName: 'Patient',
          voucher: null,
          isTherapistUser: role !== 'PATIENT',
          fallbackOwner: { id: '9e9ed44f-d1cf-4d92-9f90-c37b7765d79d' },
        }),
      };
      const service = Object.create(SessionsMutationService.prototype);
      service.ownerResolver = resolver;
      service.create = jest
        .fn()
        .mockResolvedValue({ session: { id: 'session-1' }, duplicated: false });

      await service.completeSession(
        {
          startedAt: new Date().toISOString(),
          therapistUserId: 'client-therapist',
          institutionId: 'client-institution',
          swipes: [],
          resultPayload: {},
        },
        {
          userId,
          institutionId: '0f2e5f24-d49e-492c-b8ca-41d671009d2d',
          isFirebaseEmailVerified: false,
          role,
        },
      );

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ [field]: userId }),
        expect.anything(),
      );
      expect(resolver.resolveFirebaseUser).not.toHaveBeenCalled();
    },
  );

  it.each(['THERAPIST', 'ADMIN', 'INSTITUTION_ADMIN'])(
    'rejects an unmapped verified Firebase %s without provisioning a patient',
    async (role) => {
      const resolver = {
        resolveFirebaseUser: jest.fn().mockResolvedValue(null),
        resolveContext: jest.fn(),
      };
      const service = Object.create(SessionsMutationService.prototype);
      service.ownerResolver = resolver;
      service.create = jest.fn();

      await expect(
        service.completeSession(
          { startedAt: new Date().toISOString(), swipes: [], resultPayload: {} },
          {
            userId: 'firebase-non-uuid-owner-id',
            email: 'owner@example.com',
            isFirebaseEmailVerified: true,
            role,
          },
        ),
      ).rejects.toThrow('not linked to an internal user');

      expect(resolver.resolveFirebaseUser).toHaveBeenCalledWith(
        {
          uid: 'firebase-non-uuid-owner-id',
          email: 'owner@example.com',
          displayName: undefined,
        },
        false,
      );
      expect(service.create).not.toHaveBeenCalled();
      expect(resolver.resolveContext).not.toHaveBeenCalled();
    },
  );

  it('persists authenticated patient and fallback owner despite conflicting client IDs', async () => {
    const resolver = {
      resolveContext: jest.fn().mockResolvedValue({
        inferredPatientName: 'Patient',
        voucher: null,
        isTherapistUser: false,
        fallbackOwner: { id: '92177e63-49f2-46f8-a76f-406fd8f8b438' },
      }),
      resolveFirebaseUser: jest.fn().mockResolvedValue({
        id: '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c',
      }),
    };
    const service = Object.create(SessionsMutationService.prototype);
    service.ownerResolver = resolver;
    service.create = jest
      .fn()
      .mockResolvedValue({ session: { id: 'session-1' }, duplicated: false });

    await service.completeSession(
      {
        startedAt: new Date().toISOString(),
        userId: 'client',
        patientId: 'client',
        therapistUserId: 'client-therapist',
        institutionId: 'client-institution',
        swipes: [],
        resultPayload: {},
      },
      {
        userId: 'firebase-non-uuid-user-id',
        email: 'patient@example.com',
        isFirebaseEmailVerified: true,
        role: 'PATIENT',
      },
    );
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c',
        therapistUserId: '92177e63-49f2-46f8-a76f-406fd8f8b438',
        institutionId: undefined,
      }),
      expect.anything(),
    );
    expect(resolver.resolveFirebaseUser).toHaveBeenCalledWith(
      {
        uid: 'firebase-non-uuid-user-id',
        email: 'patient@example.com',
        displayName: undefined,
      },
      true,
    );
  });

  it('rejects an unmapped verified Firebase patient before persistence', async () => {
    const resolver = {
      resolveFirebaseUser: jest.fn().mockResolvedValue(null),
      resolveContext: jest.fn(),
    };
    const service = Object.create(SessionsMutationService.prototype);
    service.ownerResolver = resolver;
    service.create = jest.fn();

    await expect(
      service.completeSession(
        { startedAt: new Date().toISOString(), swipes: [], resultPayload: {} },
        {
          userId: 'firebase-non-uuid-user-id',
          email: 'unmapped@example.com',
          isFirebaseEmailVerified: true,
          role: 'PATIENT',
        },
      ),
    ).rejects.toThrow('not linked to an internal user');

    expect(service.create).not.toHaveBeenCalled();
    expect(resolver.resolveContext).not.toHaveBeenCalled();
  });

  it('persists a safe pending session before secure voucher redemption', async () => {
    const resolver = {
      resolveFirebaseUser: jest.fn().mockResolvedValue({
        id: '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c',
      }),
      resolveContext: jest.fn().mockResolvedValue({
        inferredPatientName: 'Patient',
        voucher: null,
        isTherapistUser: false,
        fallbackOwner: { id: '92177e63-49f2-46f8-a76f-406fd8f8b438' },
      }),
    };
    const redemption = { redeemVoucher: jest.fn().mockResolvedValue({}) };
    const service = Object.create(SessionsMutationService.prototype);
    service.ownerResolver = resolver;
    service.voucherRedemptionService = redemption;
    service.create = jest
      .fn()
      .mockResolvedValue({ session: { id: 'session-1' }, duplicated: false });

    await service.completeSession(
      {
        id: '1ec23e73-4734-4dfc-8f6b-530e87c4b2d6',
        startedAt: '2026-08-11T12:00:00.000Z',
        voucherCode: 'AB12CD34',
        voucherId: '5b61a5cd-648d-4c6a-9b20-6f7c2da21f6f',
        paymentStatus: 'PAID',
        swipes: [],
        resultPayload: {},
      },
      {
        userId: 'firebase-non-uuid-user-id',
        email: 'patient@example.com',
        isFirebaseEmailVerified: true,
        role: 'PATIENT',
      },
    );

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c',
        voucherId: undefined,
        paymentStatus: 'PENDING',
      }),
      expect.anything(),
    );
    expect(redemption.redeemVoucher).toHaveBeenCalledWith(
      'AB12CD34',
      'session-1',
      {
        userId: '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c',
        email: 'patient@example.com',
        isFirebaseEmailVerified: true,
      },
    );
  });

  it('retries redemption using the recovered safe session after a failure', async () => {
    const resolver = {
      resolveFirebaseUser: jest.fn().mockResolvedValue({
        id: '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c',
      }),
      resolveContext: jest.fn().mockResolvedValue({
        inferredPatientName: 'Patient',
        voucher: null,
        isTherapistUser: false,
      }),
    };
    const redemption = {
      redeemVoucher: jest
        .fn()
        .mockRejectedValueOnce(new Error('temporary failure'))
        .mockResolvedValueOnce({}),
    };
    const service = Object.create(SessionsMutationService.prototype);
    service.ownerResolver = resolver;
    service.voucherRedemptionService = redemption;
    service.create = jest
      .fn()
      .mockResolvedValueOnce({
        session: { id: 'session-1' },
        duplicated: false,
      })
      .mockResolvedValueOnce({
        session: { id: 'session-1' },
        duplicated: true,
      });
    const payload = {
      id: '1ec23e73-4734-4dfc-8f6b-530e87c4b2d6',
      startedAt: '2026-08-11T12:00:00.000Z',
      voucherCode: 'AB12CD34',
      swipes: [],
      resultPayload: {},
    };
    const identity = {
      userId: 'firebase-non-uuid-user-id',
      email: 'patient@example.com',
      isFirebaseEmailVerified: true,
      role: 'PATIENT',
    };

    await expect(service.completeSession(payload, identity)).rejects.toThrow(
      'temporary failure',
    );
    await expect(service.completeSession(payload, identity)).resolves.toEqual({
      id: 'session-1',
      duplicated: true,
    });

    expect(service.create).toHaveBeenCalledTimes(2);
    expect(redemption.redeemVoucher).toHaveBeenCalledTimes(2);
  });
});
