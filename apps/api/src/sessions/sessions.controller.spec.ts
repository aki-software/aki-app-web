import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

describe('SessionsController', () => {
  let controller: SessionsController;

  const mockSessionsService = {
    sendReport: jest.fn(),
  };

  const mockUsersService = {};
  const mockVouchersService = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        {
          provide: SessionsService,
          useValue: mockSessionsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: VouchersService,
          useValue: mockVouchersService,
        },
      ],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  describe('sendReport', () => {
    it('should pass authenticated scope to service', async () => {
      const req: Parameters<SessionsController['sendReport']>[2] = {
        user: {
          role: 'THERAPIST',
          userId: 'therapist-1',
          institutionId: 'institution-1',
        },
      } as Parameters<SessionsController['sendReport']>[2];

      mockSessionsService.sendReport.mockResolvedValueOnce({
        success: true,
        message: 'ok',
      });

      const result = await controller.sendReport(
        'session-1',
        { email: 'patient@test.com' },
        req,
      );

      expect(result).toEqual({ success: true, message: 'ok' });
      expect(mockSessionsService.sendReport).toHaveBeenCalledWith(
        'session-1',
        'patient@test.com',
        {
          role: 'THERAPIST',
          therapistUserId: 'therapist-1',
          patientId: 'therapist-1',
          institutionId: 'institution-1',
        },
      );
    });

    it('should bubble up not found when session is out of scope', async () => {
      const req: Parameters<SessionsController['sendReport']>[2] = {
        user: {
          role: 'THERAPIST',
          userId: 'therapist-2',
          institutionId: 'institution-2',
        },
      } as Parameters<SessionsController['sendReport']>[2];

      mockSessionsService.sendReport.mockRejectedValueOnce(
        new NotFoundException('Session not found'),
      );

      await expect(
        controller.sendReport('session-2', { email: 'patient@test.com' }, req),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
