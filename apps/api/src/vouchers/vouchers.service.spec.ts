import { BadRequestException } from '@nestjs/common';
import { VouchersService } from './vouchers.service.js';
import { VoucherOwnerType } from './entities/voucher.enums.js';

describe('VouchersService.create', () => {
  const ownership = {
    ownerType: VoucherOwnerType.THERAPIST,
    ownerUserId: '00000000-0000-0000-0000-000000000001',
    ownerInstitutionId: null,
  };

  const setup = () => {
    const voucherRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => value),
    };
    const voucherBatchRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => ({ ...value, id: 'batch-1' })),
    };
    const codeGenerator = {
      generateUniqueBatchCode: jest.fn().mockResolvedValue('BATCH001'),
      generateUniqueCode: jest.fn().mockResolvedValue('CODE0001'),
      normalize: jest.fn((value: string) => value.trim().toUpperCase()),
    };
    const ownerResolver = {
      resolve: jest.fn().mockResolvedValue(ownership),
    };
    const service = new VouchersService(
      voucherRepository as any,
      voucherBatchRepository as any,
      { notifyBatchAssignment: jest.fn() } as any,
      {} as any,
      codeGenerator as any,
      ownerResolver as any,
      {} as any,
    );

    return {
      service,
      voucherRepository,
      voucherBatchRepository,
      codeGenerator,
    };
  };

  it('persists the requested quantity in the batch and creates that many vouchers', async () => {
    const { service, voucherRepository, voucherBatchRepository } = setup();

    const result = await service.create({
      ownerType: VoucherOwnerType.THERAPIST,
      ownerUserId: ownership.ownerUserId,
      quantity: 3,
    });

    expect(voucherBatchRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 3 }),
    );
    expect(voucherRepository.create).toHaveBeenCalledTimes(3);
    expect(result.createdCount).toBe(3);
  });

  it('defaults the batch and voucher quantity to one', async () => {
    const { service, voucherRepository, voucherBatchRepository } = setup();

    const result = await service.create({
      ownerType: VoucherOwnerType.THERAPIST,
      ownerUserId: ownership.ownerUserId,
    });

    expect(voucherBatchRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 1 }),
    );
    expect(voucherRepository.create).toHaveBeenCalledTimes(1);
    expect(result.createdCount).toBe(1);
  });

  it('does not persist a batch when quantity and a manual code conflict', async () => {
    const { service, voucherBatchRepository, codeGenerator } = setup();

    await expect(
      service.create({
        ownerType: VoucherOwnerType.THERAPIST,
        ownerUserId: ownership.ownerUserId,
        quantity: 2,
        code: 'MANUAL01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(codeGenerator.generateUniqueBatchCode).not.toHaveBeenCalled();
    expect(voucherBatchRepository.save).not.toHaveBeenCalled();
  });
});
