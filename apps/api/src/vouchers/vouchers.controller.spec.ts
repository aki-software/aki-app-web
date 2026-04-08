import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../users/entities/user.entity';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';

describe('VouchersController', () => {
  let controller: VouchersController;

  const mockVouchersService = {
    findById: jest.fn(),
    sendEmail: jest.fn(),
    resendEmail: jest.fn(),
    revoke: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VouchersController],
      providers: [
        {
          provide: VouchersService,
          useValue: mockVouchersService,
        },
      ],
    }).compile();

    controller = module.get<VouchersController>(VouchersController);
  });

  describe('sendEmail', () => {
    it('should allow admin to send email', async () => {
      const req: Parameters<VouchersController['sendEmail']>[2] = {
        user: {
          role: UserRole.ADMIN,
          userId: 'admin-1',
          institutionId: null,
        },
      } as Parameters<VouchersController['sendEmail']>[2];

      mockVouchersService.findById.mockResolvedValueOnce({
        id: 'voucher-1',
        ownerInstitutionId: 'institution-a',
        ownerUserId: null,
      });
      mockVouchersService.sendEmail.mockResolvedValueOnce(true);

      const result = await controller.sendEmail(
        'voucher-1',
        'patient@test.com',
        req,
      );

      expect(result).toBe(true);
      expect(mockVouchersService.sendEmail).toHaveBeenCalledWith(
        'voucher-1',
        'patient@test.com',
      );
    });

    it('should allow institution owner to send email', async () => {
      const req: Parameters<VouchersController['sendEmail']>[2] = {
        user: {
          role: UserRole.THERAPIST,
          userId: 'therapist-1',
          institutionId: 'institution-1',
        },
      } as Parameters<VouchersController['sendEmail']>[2];

      mockVouchersService.findById.mockResolvedValueOnce({
        id: 'voucher-2',
        ownerInstitutionId: 'institution-1',
        ownerUserId: null,
      });
      mockVouchersService.sendEmail.mockResolvedValueOnce(true);

      const result = await controller.sendEmail(
        'voucher-2',
        'patient@test.com',
        req,
      );

      expect(result).toBe(true);
      expect(mockVouchersService.sendEmail).toHaveBeenCalledWith(
        'voucher-2',
        'patient@test.com',
      );
    });

    it('should reject user outside ownership scope', async () => {
      const req: Parameters<VouchersController['sendEmail']>[2] = {
        user: {
          role: UserRole.THERAPIST,
          userId: 'therapist-x',
          institutionId: 'institution-other',
        },
      } as Parameters<VouchersController['sendEmail']>[2];

      mockVouchersService.findById.mockResolvedValueOnce({
        id: 'voucher-3',
        ownerInstitutionId: 'institution-owner',
        ownerUserId: null,
      });

      await expect(
        controller.sendEmail('voucher-3', 'patient@test.com', req),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockVouchersService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('resendEmail', () => {
    it('should allow owner to resend email', async () => {
      const req: Parameters<VouchersController['resendEmail']>[2] = {
        user: {
          role: UserRole.THERAPIST,
          userId: 'therapist-1',
          institutionId: 'institution-1',
        },
      } as Parameters<VouchersController['resendEmail']>[2];

      mockVouchersService.findById.mockResolvedValueOnce({
        id: 'voucher-4',
        ownerInstitutionId: 'institution-1',
        ownerUserId: null,
      });
      mockVouchersService.resendEmail.mockResolvedValueOnce(true);

      const result = await controller.resendEmail(
        'voucher-4',
        'patient@test.com',
        req,
      );

      expect(result).toBe(true);
      expect(mockVouchersService.resendEmail).toHaveBeenCalledWith(
        'voucher-4',
        'patient@test.com',
      );
    });
  });

  describe('revoke', () => {
    it('should reject revocation when user is outside ownership scope', async () => {
      const req: Parameters<VouchersController['revoke']>[1] = {
        user: {
          role: UserRole.THERAPIST,
          userId: 'therapist-x',
          institutionId: 'institution-other',
        },
      } as Parameters<VouchersController['revoke']>[1];

      mockVouchersService.findById.mockResolvedValueOnce({
        id: 'voucher-5',
        ownerInstitutionId: 'institution-owner',
        ownerUserId: null,
      });

      await expect(controller.revoke('voucher-5', req)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(mockVouchersService.revoke).not.toHaveBeenCalled();
    });
  });
});
