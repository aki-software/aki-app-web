import { Test, TestingModule } from '@nestjs/testing';
import { SessionCompleteMapperService } from './session-complete-mapper.service.js';
import { SessionOwnerResolverService } from './session-owner-resolver.service.js';
import { SessionPayloadMapperService } from './session-payload-mapper.service.js';
import { SessionSyncKeyService } from './session-sync-key.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import type { CompleteSessionDto } from '../dto/complete-session.dto.js';

describe('SessionCompleteMapperService', () => {
  let service: SessionCompleteMapperService;
  const ownerResolver = {
    resolveContext: jest.fn(),
  };
  const payloadMapper = {
    mapToCreateDto: jest.fn(),
  };
  const syncKeyService = {
    buildSyncKey: jest.fn(),
  };
  const vouchersService = {
    attachVoucherToSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionCompleteMapperService,
        { provide: SessionOwnerResolverService, useValue: ownerResolver },
        { provide: SessionPayloadMapperService, useValue: payloadMapper },
        { provide: SessionSyncKeyService, useValue: syncKeyService },
        { provide: VouchersService, useValue: vouchersService },
      ],
    }).compile();

    service = module.get(SessionCompleteMapperService);
    jest.clearAllMocks();
  });

  it('orchestrates owner resolver and payload mapper', async () => {
    const payload = {
      id: 'payload-1',
      userId: ' user-1 ',
      therapistUserId: null,
      institutionId: null,
      voucherCode: 'VCH',
      patientName: 'Patient',
      catalogVersion: 'v1',
      startedAt: '2024-01-01T00:00:00Z',
      finishedAt: '2024-01-01T00:00:00Z',
      swipes: [],
      resultPayload: { radar: [], top3: [], bottom3: [], hollandCode: 'RIA' },
    } as CompleteSessionDto;

    const context = {
      voucher: { code: 'VCH' },
      inferredPatientName: 'Patient',
    };
    const createSessionDto = { patientName: 'Patient' };

    ownerResolver.resolveContext.mockResolvedValue(context);
    payloadMapper.mapToCreateDto.mockReturnValue(createSessionDto);

    const result = await service.toCreateSessionDto(payload);

    expect(ownerResolver.resolveContext).toHaveBeenCalledWith(
      'user-1',
      'VCH',
      null,
      null,
      'Patient',
    );
    expect(payloadMapper.mapToCreateDto).toHaveBeenCalledWith(payload, context);
    expect(result).toEqual({
      createSessionDto,
      voucher: { code: 'VCH' },
      inferredPatientName: 'Patient',
      payloadId: 'payload-1',
      payloadUserId: 'user-1',
      payloadStartedAt: payload.startedAt,
    });
  });

  it('delegates sync key building', () => {
    syncKeyService.buildSyncKey.mockReturnValue('sync-key');

    const result = service.buildSyncKey('payload-1', 'user-1', '2024-01-01');

    expect(syncKeyService.buildSyncKey).toHaveBeenCalledWith(
      'payload-1',
      'user-1',
      '2024-01-01',
    );
    expect(result).toBe('sync-key');
  });

  it('attaches voucher when present', async () => {
    await service.attachVoucherIfNeeded(
      {
        createSessionDto: { patientName: 'Patient' } as any,
        voucher: { code: 'VCH' },
        inferredPatientName: 'Patient',
      },
      'session-1',
    );

    expect(vouchersService.attachVoucherToSession).toHaveBeenCalledWith(
      'VCH',
      'session-1',
      'Patient',
    );
  });

  it('skips attaching voucher when missing', async () => {
    await service.attachVoucherIfNeeded(
      {
        createSessionDto: { patientName: 'Patient' } as any,
        voucher: null,
        inferredPatientName: 'Patient',
      },
      'session-1',
    );

    expect(vouchersService.attachVoucherToSession).not.toHaveBeenCalled();
  });
});
