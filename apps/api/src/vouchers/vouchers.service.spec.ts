import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { Session, SessionPaymentStatus } from '../sessions/entities/session.entity';
import { UsersService } from '../users/users.service';
import { VoucherBatch } from './entities/voucher-batch.entity';
import { Voucher } from './entities/voucher.entity';
import { VoucherStatus } from './entities/voucher.enums';
import { VouchersService } from './vouchers.service';

describe('VouchersService', () => {
  let service: VouchersService;

  const voucherRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const sessionRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const voucherBatchRepository = {
    save: jest.fn(),
    create: jest.fn(),
  };

  const usersService = {
    ensureInstitutionOwner: jest.fn(),
  };

  const mailService = {
    sendVoucherCode: jest.fn(),
  };

  const manager = {
    getRepository: jest.fn(),
  };

  const dataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VouchersService,
        {
          provide: getRepositoryToken(Voucher),
          useValue: voucherRepository,
        },
        {
          provide: getRepositoryToken(VoucherBatch),
          useValue: voucherBatchRepository,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<VouchersService>(VouchersService);

    manager.getRepository.mockImplementation((entity) => {
      if (entity === Voucher) return voucherRepository;
      if (entity === Session) return sessionRepository;
      return null;
    });

    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );
  });

  describe('redeemForSession', () => {
    it('returns idempotent success when already redeemed by same session', async () => {
      voucherRepository.findOne.mockResolvedValueOnce({
        id: 'voucher-1',
        code: 'AB12CD34',
        status: VoucherStatus.USED,
        redeemedSessionId: 'session-1',
      });
      sessionRepository.findOne.mockResolvedValueOnce({
        id: 'session-1',
        voucherId: 'voucher-1',
        paymentStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
      });
      sessionRepository.save.mockResolvedValueOnce(undefined);

      const result = await service.redeemForSession('ab12cd34', 'session-1');

      expect(result).toEqual({
        success: true,
        status: 'ALREADY_REDEEMED_BY_THIS_SESSION',
        voucherCode: 'AB12CD34',
        sessionId: 'session-1',
      });
      expect(voucherRepository.save).not.toHaveBeenCalled();
    });

    it('throws INVALID_CODE when voucher does not exist', async () => {
      voucherRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.redeemForSession('ZZ99YY88', 'session-1'),
      ).rejects.toEqual(expect.any(NotFoundException));
    });

    it('throws ALREADY_USED when voucher belongs to another session', async () => {
      voucherRepository.findOne.mockResolvedValueOnce({
        id: 'voucher-1',
        code: 'AB12CD34',
        status: VoucherStatus.USED,
        redeemedSessionId: 'session-2',
      });
      sessionRepository.findOne.mockResolvedValueOnce({ id: 'session-1' });

      await expect(
        service.redeemForSession('AB12CD34', 'session-1'),
      ).rejects.toEqual(expect.any(ConflictException));
    });

    it('redeems voucher when available', async () => {
      const voucher = {
        id: 'voucher-1',
        code: 'AB12CD34',
        status: VoucherStatus.AVAILABLE,
        redeemedSessionId: null,
        redeemedAt: null,
        ownerInstitutionId: null,
        ownerUserId: null,
        expiresAt: null,
      };

      const session = {
        id: 'session-3',
        voucherId: null,
        paymentStatus: SessionPaymentStatus.PENDING,
        reportUnlockedAt: null,
        institutionId: null,
        therapistUserId: null,
      };

      voucherRepository.findOne.mockResolvedValueOnce(voucher);
      sessionRepository.findOne.mockResolvedValueOnce(session);
      voucherRepository.save.mockResolvedValueOnce(voucher);
      sessionRepository.save.mockResolvedValueOnce(session);

      const result = await service.redeemForSession('AB12CD34', 'session-3');

      expect(voucherRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        status: 'REDEEMED',
        voucherCode: 'AB12CD34',
        sessionId: 'session-3',
      });
    });
  });
});
