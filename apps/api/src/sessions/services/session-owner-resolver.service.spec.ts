import { Test, TestingModule } from '@nestjs/testing';
import { SessionOwnerResolverService } from './session-owner-resolver.service.js';
import { UsersService } from '../../users/users.service.js';
import { UserRegistrationService } from '../../users/user-registration.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { UserRole } from '../../users/entities/user.entity.js';

describe('SessionOwnerResolverService', () => {
  let service: SessionOwnerResolverService;
  const usersService = {
    findOne: jest.fn(),
  };
  const userRegistrationService = {
    getOrCreateIndividualTestsOwner: jest.fn(),
  };
  const vouchersService = {
    resolveAvailableVoucher: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionOwnerResolverService,
        { provide: UsersService, useValue: usersService },
        { provide: UserRegistrationService, useValue: userRegistrationService },
        { provide: VouchersService, useValue: vouchersService },
      ],
    }).compile();

    service = module.get(SessionOwnerResolverService);
    jest.clearAllMocks();
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
});
