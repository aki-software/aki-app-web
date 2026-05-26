import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { SessionsService } from '../sessions/sessions.service';
import { ConfigService } from '@nestjs/config';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let sessionsService: SessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: SessionsService,
          useValue: {
            findOne: jest.fn(),
            updatePaymentStatus: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    sessionsService = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Pending implementation of Google API
});
