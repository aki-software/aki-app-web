import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VoucherRedemptionService } from './voucher-redemption.service.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { Session } from '../../sessions/entities/session.entity.js';
import { VoucherStatus } from '../../vouchers/entities/voucher.enums.js';

describe('VoucherRedemptionService', () => {
  let service: VoucherRedemptionService;
  let voucherRepository: { findOne: jest.Mock; save: jest.Mock };
  let sessionRepository: { findOne: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };

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
    dataSource = {
      transaction: jest.fn((callback: any) =>
        callback({
          getRepository: (entity: unknown) =>
            entity === Voucher ? voucherRepository : sessionRepository,
        }),
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        VoucherRedemptionService,
        { provide: getRepositoryToken(Voucher), useValue: voucherRepository },
        { provide: getRepositoryToken(Session), useValue: sessionRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(VoucherRedemptionService);
  });

  it('preserves INVALID_CODE and ALREADY_USED as stable business errors', async () => {
    voucherRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.redeemVoucher('bad-code', 'session-1'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_CODE' }),
    });

    const usedVoucher = buildVoucher({ status: VoucherStatus.USED });
    voucherRepository.findOne.mockResolvedValueOnce(usedVoucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ALREADY_USED' }),
    });
  });

  it('returns SESSION_NOT_FOUND and VOUCHER_EXPIRED with explicit status handling', async () => {
    const voucher = buildVoucher();
    voucherRepository.findOne.mockResolvedValueOnce(voucher);
    sessionRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.redeemVoucher('AB12CD34', 'missing-session'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SESSION_NOT_FOUND' }),
    });

    const expiredVoucher = buildVoucher({
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });
    voucherRepository.findOne.mockResolvedValueOnce(expiredVoucher);
    sessionRepository.findOne.mockResolvedValueOnce(buildSession());

    await expect(
      service.redeemVoucher('AB12CD34', 'session-1'),
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
      service.redeemVoucher('AB12CD34', 'session-1'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SERVICE_UNAVAILABLE' }),
    });
  });
});
