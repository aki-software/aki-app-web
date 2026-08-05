import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReportDeliveryService } from './report-delivery.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportGeneratedEvent } from '../../events/domain-events.js';

describe('ReportDeliveryService', () => {
  let service: ReportDeliveryService;
  let eventEmitter: EventEmitter2;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
  };

  beforeEach(async () => {
    eventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportDeliveryService,
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(ReportDeliveryService);
    jest.clearAllMocks();
  });

  it('emits report.generated event and returns success', async () => {
    const result = await service.deliverReport(
      'target@akit.test',
      'session-1',
      'voucher-1',
      {
        patientName: 'Test User',
        hollandCode: 'RIA',
        summary: {
          profileStrength: '',
          recommendation: '',
          primaryTitle: '',
          primaryPercentage: 0,
          rankedAreas: [],
        },
        tripletInsight: null,
        topResults: [],
        strengths: [],
      },
      Buffer.from('pdf'),
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'report.generated',
      expect.any(ReportGeneratedEvent),
    );
    expect(result).toEqual({
      success: true,
      message: 'Report generation event emitted for target@akit.test',
    });
  });
});
