import { Test, TestingModule } from '@nestjs/testing';
import { SessionOwnerResolverService } from './session-owner-resolver.service.js';
import { UsersService } from '../../users/users.service.js';
import { UserRegistrationService } from '../../users/user-registration.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Patient } from '../../patients/entities/patient.entity.js';
import { UserRole } from '@akit/contracts';

describe('SessionOwnerResolverService', () => {
  let service: SessionOwnerResolverService;
  const usersService = { findByEmail: jest.fn(), findOne: jest.fn() };
  const patientRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const userRegistrationService = {
    getOrCreateIndividualTestsOwner: jest.fn(),
  };
  const vouchersService = { resolveAvailableVoucher: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionOwnerResolverService,
        { provide: UsersService, useValue: usersService },
        { provide: UserRegistrationService, useValue: userRegistrationService },
        { provide: VouchersService, useValue: vouchersService },
        { provide: getRepositoryToken(Patient), useValue: patientRepository },
      ],
    }).compile();
    service = module.get(SessionOwnerResolverService);
    jest.clearAllMocks();
  });

  it('resolves an existing therapist before patient provisioning', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      institutionId: 'institution-1',
      role: UserRole.THERAPIST,
    });

    await expect(
      service.resolveFirebaseUser(
        { uid: 'firebase-user-1', email: '  THERAPIST@example.com  ' },
        false,
      ),
    ).resolves.toEqual({ id: 'user-1', institutionId: 'institution-1' });
    expect(usersService.findByEmail).toHaveBeenCalledWith(
      'therapist@example.com',
    );
    expect(patientRepository.findOne).not.toHaveBeenCalled();
  });

  it('resolves a Firebase patient before a same-email internal user', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      institutionId: 'institution-1',
      role: UserRole.THERAPIST,
    });
    patientRepository.findOne.mockResolvedValueOnce({
      id: 'patient-1',
      institutionId: 'institution-1',
      firebaseUid: 'firebase-patient-1',
    });

    await expect(
      service.resolveFirebaseUser(
        { uid: 'firebase-patient-1', email: 'patient@example.com' },
        true,
      ),
    ).resolves.toEqual({ id: 'patient-1', institutionId: 'institution-1' });
    expect(usersService.findByEmail).not.toHaveBeenCalled();
    expect(patientRepository.findOne).toHaveBeenCalledWith({
      select: { id: true, institutionId: true, firebaseUid: true },
      where: { firebaseUid: 'firebase-patient-1' },
    });
  });

  it('provisions a Firebase patient instead of returning a same-email internal user', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      institutionId: 'institution-1',
      role: UserRole.THERAPIST,
    });
    patientRepository.findOne.mockResolvedValue(null);
    patientRepository.create.mockImplementation((patient) => patient);
    patientRepository.save.mockResolvedValue({
      id: 'patient-1',
      institutionId: null,
    });

    await expect(
      service.resolveFirebaseUser(
        { uid: 'firebase-patient-1', email: 'patient@example.com' },
        true,
      ),
    ).resolves.toEqual({ id: 'patient-1', institutionId: null });
    expect(usersService.findByEmail).not.toHaveBeenCalled();
    expect(patientRepository.create).toHaveBeenCalledWith({
      email: 'patient@example.com',
      firebaseUid: 'firebase-patient-1',
      name: 'Usuario App',
      passwordHash: 'firebase-only-no-password',
    });
  });

  it('resolves an existing patient by Firebase UID', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    patientRepository.findOne.mockResolvedValue({
      id: 'patient-1',
      institutionId: 'institution-1',
    });

    await expect(
      service.resolveFirebaseUser(
        { uid: 'firebase-patient-1', email: 'patient@example.com' },
        true,
      ),
    ).resolves.toEqual({ id: 'patient-1', institutionId: 'institution-1' });
    expect(patientRepository.findOne).toHaveBeenCalledWith({
      select: { id: true, institutionId: true, firebaseUid: true },
      where: { firebaseUid: 'firebase-patient-1' },
    });
  });

  it('links an existing patient found by normalized email to the Firebase UID', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    patientRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'patient-1',
        institutionId: null,
        firebaseUid: null,
      });
    patientRepository.update.mockResolvedValue({ affected: 1 });

    await expect(
      service.resolveFirebaseUser(
        { uid: 'firebase-patient-1', email: '  PATIENT@example.com  ' },
        true,
      ),
    ).resolves.toEqual({ id: 'patient-1', institutionId: null });
    expect(patientRepository.update).toHaveBeenCalledWith(
      { id: 'patient-1', firebaseUid: null },
      { firebaseUid: 'firebase-patient-1' },
    );
  });

  it('creates a first-time Firebase patient with verified identity data', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    patientRepository.findOne.mockResolvedValue(null);
    patientRepository.create.mockImplementation((patient) => patient);
    patientRepository.save.mockResolvedValue({
      id: 'patient-1',
      institutionId: null,
    });

    await expect(
      service.resolveFirebaseUser(
        {
          uid: 'firebase-patient-1',
          email: '  PATIENT@example.com  ',
          displayName: 'Verified Patient',
        },
        true,
      ),
    ).resolves.toEqual({ id: 'patient-1', institutionId: null });
    expect(patientRepository.create).toHaveBeenCalledWith({
      email: 'patient@example.com',
      firebaseUid: 'firebase-patient-1',
      name: 'Verified Patient',
      passwordHash: 'firebase-only-no-password',
    });
  });

  it('does not create a patient when provisioning is disallowed', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    patientRepository.findOne.mockResolvedValue(null);

    await expect(
      service.resolveFirebaseUser(
        { uid: 'firebase-therapist-1', email: 'therapist@example.com' },
        false,
      ),
    ).resolves.toBeNull();
    expect(patientRepository.create).not.toHaveBeenCalled();
    expect(patientRepository.save).not.toHaveBeenCalled();
  });

  it('re-reads a patient after a concurrent unique conflict', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    patientRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'patient-1',
        institutionId: null,
        firebaseUid: 'firebase-patient-1',
      });
    patientRepository.create.mockImplementation((patient) => patient);
    patientRepository.save.mockRejectedValue({
      driverError: { code: '23505' },
    });

    await expect(
      service.resolveFirebaseUser(
        { uid: 'firebase-patient-1', email: 'patient@example.com' },
        true,
      ),
    ).resolves.toEqual({ id: 'patient-1', institutionId: null });
  });

  it('resolves user and voucher without fallback owner', async () => {
    const user = { id: 'user-1', name: 'Therapist', role: UserRole.THERAPIST };
    const voucher = { id: 'voucher-1', code: 'VCH' };
    usersService.findOne.mockResolvedValue(user);
    vouchersService.resolveAvailableVoucher.mockResolvedValue(voucher);

    const result = await service.resolveContext(
      'user-1',
      'VCH',
      'therapist-1',
      null,
      'Provided Name',
    );

    expect(usersService.findOne).toHaveBeenCalledWith('user-1');
    expect(vouchersService.resolveAvailableVoucher).toHaveBeenCalledWith('VCH');
    expect(
      userRegistrationService.getOrCreateIndividualTestsOwner,
    ).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        user,
        voucher,
        fallbackOwner: null,
        inferredPatientName: 'Provided Name',
        isTherapistUser: true,
        isPatientUser: false,
      }),
    );
  });

  it('treats an institution administrator as an authenticated owner', async () => {
    usersService.findOne.mockResolvedValue({
      id: 'institution-admin',
      role: UserRole.INSTITUTION_ADMIN,
    });

    const result = await service.resolveContext(
      'institution-admin',
      null,
      'institution-admin',
      'institution-1',
    );

    expect(result).toEqual(
      expect.objectContaining({ isTherapistUser: true, fallbackOwner: null }),
    );
    expect(
      userRegistrationService.getOrCreateIndividualTestsOwner,
    ).not.toHaveBeenCalled();
  });

  it('uses fallback owner for individual tests', async () => {
    const fallbackOwner = { id: 'owner-1' };
    userRegistrationService.getOrCreateIndividualTestsOwner.mockResolvedValue(
      fallbackOwner,
    );

    const result = await service.resolveContext(
      null,
      null,
      null,
      null,
      undefined,
    );

    expect(usersService.findOne).not.toHaveBeenCalled();
    expect(vouchersService.resolveAvailableVoucher).not.toHaveBeenCalled();
    expect(
      userRegistrationService.getOrCreateIndividualTestsOwner,
    ).toHaveBeenCalled();
    expect(result.fallbackOwner).toBe(fallbackOwner);
    expect(result.inferredPatientName).toBe('Usuario App');
    expect(result.isTherapistUser).toBe(false);
    expect(result.isPatientUser).toBe(false);
  });

  it('resolves canonical patient identity without choosing a same-email user', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'internal-user-1' });
    patientRepository.findOne.mockResolvedValue({
      id: 'patient-1',
      institutionId: null,
      firebaseUid: 'firebase-patient-1',
    });

    await expect(
      service.resolveFirebasePatient(
        { uid: 'firebase-patient-1', email: 'patient@example.com' },
        false,
      ),
    ).resolves.toEqual({ id: 'patient-1', institutionId: null });
    expect(usersService.findByEmail).not.toHaveBeenCalled();
  });
});
