import { Test, TestingModule } from '@nestjs/testing';
import { VoucherNotifierService } from './voucher-notifier.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Voucher } from './entities/voucher.entity.js';
import {
  VoucherAssignedEvent,
  VoucherBatchAssignedEvent,
} from '../events/domain-events.js';

describe('VoucherNotifierService', () => {
  let service: VoucherNotifierService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    eventEmitter = {
      emit: jest.fn(),
      emitAsync: jest.fn().mockResolvedValue([]),
    } as any;

    const mockConfigService = {
      get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherNotifierService,
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<VoucherNotifierService>(VoucherNotifierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should emit voucher.assigned', async () => {
    const mockVoucher = {
      id: 'v-123',
      code: 'ABCDEF',
      assignedPatientName: 'Jane Doe',
    } as Voucher;

    const result = await service.sendVoucherEmail(mockVoucher, 'test@test.com');

    expect(result).toBe(true);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      'voucher.assigned',
      expect.any(VoucherAssignedEvent),
    );
  });

  it('should emit voucher.batch.assigned', async () => {
    const result = await service.notifyBatchAssignment(
      'test@test.com',
      'School',
      50,
      new Date(),
    );

    expect(result).toBe(true);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      'voucher.batch.assigned',
      expect.any(VoucherBatchAssignedEvent),
    );
  });
});
