import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { VoucherAccessGuard } from './voucher-access.guard.js';
import { VouchersService } from '../vouchers.service.js';
import { UserRole } from '../../users/entities/user.entity.js';
import { VoucherScope } from '@akit/contracts';

describe('VoucherAccessGuard', () => {
  let guard: VoucherAccessGuard;
  let vouchersService: { findByCode: jest.Mock };

  const buildContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as any;

  beforeEach(async () => {
    vouchersService = {
      findByCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherAccessGuard,
        { provide: VouchersService, useValue: vouchersService },
      ],
    }).compile();

    guard = module.get<VoucherAccessGuard>(VoucherAccessGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should attach the voucher when the admin requests it', async () => {
    const voucher = { id: 'v-1', code: 'CODE1', ownerInstitutionId: null };
    const request: Record<string, unknown> = {
      user: { role: UserRole.ADMIN, userId: 'admin-1' },
      params: { code: 'CODE1' },
    };
    vouchersService.findByCode.mockResolvedValue(voucher);

    const allowed = await guard.canActivate(buildContext(request));

    expect(allowed).toBe(true);
    expect(vouchersService.findByCode).toHaveBeenCalledWith(
      'CODE1',
      expect.objectContaining<VoucherScope>({ role: UserRole.ADMIN }),
    );
    expect(request.voucher).toEqual(voucher);
  });

  it('should attach the voucher when the owner institution requests it', async () => {
    const voucher = {
      id: 'v-1',
      code: 'CODE1',
      ownerInstitutionId: 'inst-1',
    };
    const request: Record<string, unknown> = {
      user: {
        role: UserRole.INSTITUTION_ADMIN,
        userId: 'user-1',
        institutionId: 'inst-1',
      },
      params: { code: 'CODE1' },
    };
    vouchersService.findByCode.mockResolvedValue(voucher);

    const allowed = await guard.canActivate(buildContext(request));

    expect(allowed).toBe(true);
    expect(vouchersService.findByCode).toHaveBeenCalledWith(
      'CODE1',
      expect.objectContaining<VoucherScope>({
        role: UserRole.INSTITUTION_ADMIN,
        ownerInstitutionId: 'inst-1',
      }),
    );
    expect(request.voucher).toEqual(voucher);
  });

  it('should reject when the caller is not admin and not the owner institution', async () => {
    vouchersService.findByCode.mockImplementation(() => {
      throw new ForbiddenException('Voucher no encontrado');
    });

    const request: Record<string, unknown> = {
      user: {
        role: UserRole.THERAPIST,
        userId: 'user-2',
        institutionId: 'inst-99',
      },
      params: { code: 'CODE1' },
    };

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(
      ForbiddenException,
    );
    expect(request.voucher).toBeUndefined();
  });

  it('should throw ForbiddenException when the path param is missing', async () => {
    const request: Record<string, unknown> = {
      user: { role: UserRole.ADMIN, userId: 'admin-1' },
      params: {},
    };

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(
      ForbiddenException,
    );
    expect(vouchersService.findByCode).not.toHaveBeenCalled();
  });
});
