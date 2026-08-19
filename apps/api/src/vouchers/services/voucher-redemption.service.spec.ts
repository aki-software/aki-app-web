import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { VoucherRedemptionService } from './voucher-redemption.service.js';
import { Voucher } from '../entities/voucher.entity.js';
import { Session } from '../../sessions/entities/session.entity.js';
import { Patient } from '../../patients/entities/patient.entity.js';
import { VoucherStatus } from '../entities/voucher.enums.js';

describe('VoucherRedemptionService', () => {
  let service: VoucherRedemptionService;
  let voucherRepository: { findOne: jest.Mock; save: jest.Mock };
  let sessionRepository: { findOne: jest.Mock; save: jest.Mock };
  let patientRepository: { findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  const verifiedPatient = {
    userId: 'patient-1',
    email: 'patient@example.com',
    isFirebaseEmailVerified: true,
  };

  const buildVoucher = (overrides: Partial<Voucher> = {}): Voucher =>
    ({
      id: 'voucher-1',
      code: 'AB12CD34',
      status: VoucherStatus.AVAILABLE,
      redeemedSessionId: null,
      redeemedAt: null,
      expiresAt: null,
      ownerInstitutionId: null,
      ownerUserId: null,
      redeem: jest.fn(),
      bindToAuthenticatedEmail: jest.fn(function (
        this: Voucher,
        email: string,
      ) {
        if (
          this.assignedPatientEmail &&
          this.assignedPatientEmail.toLowerCase() !== email.toLowerCase()
        ) {
          throw new Error('Voucher is bound to a different Android email.');
        }
        this.assignedPatientEmail ??= email;
      }),
      ...overrides,
    }) as unknown as Voucher;

  const buildSession = (overrides: Partial<Session> = {}): Session =>
    ({
      id: 'session-1',
      voucherId: null,
      paymentStatus: 'PENDING',
      reportUnlockedAt: null,
      institutionId: null,
      therapistUserId: null,
      patientId: 'patient-1',
      ...overrides,
    }) as unknown as Session;

  beforeEach(async () => {
    voucherRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    sessionRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    patientRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'patient-1' }),
    };
    dataSource = {
      transaction: jest.fn((callback: any) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === Voucher) return voucherRepository;
            if (entity === Session) return sessionRepository;
            if (entity === Patient) return patientRepository;
            throw new Error('Unexpected repository');
          },
        }),
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        VoucherRedemptionService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(VoucherRedemptionService);
  });

  it('preserves INVALID_CODE and ALREADY_USED as stable business errors', async () => {
    voucherRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.redeemVoucher('bad-code', 'session-1', verifiedPatient),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_CODE' }),
    });

    const usedVoucher = buildVoucher({ status: VoucherStatus.USED });
    voucherRepository.findOne.mockResolvedValueOnce(usedVoucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', verifiedPatient),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ALREADY_USED' }),
    });
  });

  it('returns SESSION_NOT_FOUND and VOUCHER_EXPIRED with explicit status handling', async () => {
    const voucher = buildVoucher();
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.redeemVoucher('AB12CD34', 'missing-session', verifiedPatient),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SESSION_NOT_FOUND' }),
    });

    const expiredVoucher = buildVoucher({
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });
    voucherRepository.findOne.mockResolvedValueOnce(expiredVoucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', verifiedPatient),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VOUCHER_EXPIRED' }),
    });
  });

  it('normalizes unexpected domain faults to a service-unavailable style error', async () => {
    const voucher = buildVoucher({
      redeem: jest.fn(() => {
        throw new Error('boom');
      }),
    });
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', verifiedPatient),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SERVICE_UNAVAILABLE' }),
    });
  });

  it('requires the authenticated Android email before redeeming a voucher', async () => {
    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', undefined),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'ANDROID_IDENTITY_UNVERIFIED',
      }),
    });
  });

  it('rejects local or unverified identities before voucher lookup', async () => {
    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', {
        userId: 'patient-1',
        email: 'patient@example.com',
        isFirebaseEmailVerified: false,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'ANDROID_IDENTITY_UNVERIFIED',
      }),
    });
    expect(voucherRepository.findOne).not.toHaveBeenCalled();
  });

  it('authorizes an auto-provisioned Firebase patient by firebase UID', async () => {
    const voucher = buildVoucher();
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(
      buildSession({ patientId: 'internal-patient-uuid' }),
    );
    patientRepository.findOne.mockResolvedValueOnce({
      id: 'internal-patient-uuid',
    });

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', verifiedPatient),
    ).resolves.toMatchObject({ status: 'REDEEMED' });
    expect(patientRepository.findOne).toHaveBeenCalledWith({
      where: { firebaseUid: 'patient-1' },
    });
  });

  it('falls back to normalized email when no Firebase UID mapping exists', async () => {
    const voucher = buildVoucher();
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(
      buildSession({ patientId: 'internal-patient-uuid' }),
    );
    patientRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'internal-patient-uuid' });

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', {
        ...verifiedPatient,
        email: ' Patient@Example.com ',
      }),
    ).resolves.toMatchObject({ status: 'REDEEMED' });
    expect(patientRepository.findOne).toHaveBeenNthCalledWith(2, {
      where: { email: 'patient@example.com' },
    });
  });

  it('denies an unmapped Firebase patient', async () => {
    const voucher = buildVoucher();
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());
    patientRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', verifiedPatient),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SESSION_ACCESS_DENIED' }),
    });
  });

  it('preserves therapist authorization with the internal user ID', async () => {
    const voucher = buildVoucher();
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(
      buildSession({ therapistUserId: 'therapist-1' }),
    );
    patientRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', {
        userId: 'therapist-1',
        email: 'therapist@example.com',
        isFirebaseEmailVerified: true,
      }),
    ).resolves.toMatchObject({ status: 'REDEEMED' });
  });

  it('preserves admin authorization without a patient mapping', async () => {
    const voucher = buildVoucher();
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());
    patientRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', {
        userId: 'admin-1',
        email: 'admin@example.com',
        isFirebaseEmailVerified: true,
        role: 'ADMIN',
      }),
    ).resolves.toMatchObject({ status: 'REDEEMED' });
  });

  it('rejects a caller who does not own the target patient session', async () => {
    const voucher = buildVoucher();
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(
      buildSession({ patientId: 'another-patient' }),
    );

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', verifiedPatient),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SESSION_ACCESS_DENIED' }),
    });
  });

  it('validates the bound email before returning idempotent success', async () => {
    const voucher = buildVoucher({
      redeemedSessionId: 'session-1',
      assignedPatientEmail: 'bound@example.com',
    });
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', verifiedPatient),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VOUCHER_EMAIL_MISMATCH' }),
    });
  });

  it('persists the first email binding for an idempotent legacy redemption', async () => {
    const voucher = buildVoucher({
      redeemedSessionId: 'session-1',
      assignedPatientEmail: null,
    });
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());

    await service.redeemVoucher('AB12CD34', 'session-1', verifiedPatient);

    expect(voucher.assignedPatientEmail).toBe('patient@example.com');
    expect(voucherRepository.save).toHaveBeenCalledWith(voucher);
    expect(sessionRepository.save).toHaveBeenCalled();
  });

  it('binds an unassigned voucher to the first authenticated Android email', async () => {
    const voucher = buildVoucher({ assignedPatientEmail: null });
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());

    await service.redeemVoucher('AB12CD34', 'session-1', verifiedPatient);

    expect(voucher.assignedPatientEmail).toBe('patient@example.com');
    expect(voucherRepository.findOne).toHaveBeenCalledWith({
      where: { code: 'AB12CD34' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(voucherRepository.save).toHaveBeenCalledWith(voucher);
  });

  it('rejects an authenticated Android email that does not match an assigned voucher', async () => {
    const voucher = buildVoucher({
      assignedPatientEmail: 'bound@example.com',
    });
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1', {
        ...verifiedPatient,
        email: 'other@example.com',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VOUCHER_EMAIL_MISMATCH' }),
    });
  });

  it('normalizes the first authenticated Android email before binding it', async () => {
    const voucher = buildVoucher({ assignedPatientEmail: null });
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());

    await service.redeemVoucher('AB12CD34', 'session-1', {
      ...verifiedPatient,
      email: ' Patient@Example.com ',
    });

    expect(voucher.assignedPatientEmail).toBe('patient@example.com');
  });
});
