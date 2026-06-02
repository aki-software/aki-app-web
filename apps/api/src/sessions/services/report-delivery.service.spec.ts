import { Test, TestingModule } from '@nestjs/testing';
import { ReportDeliveryService } from './report-delivery.service.js';
import { MailService } from '../../mail/mail.service.js';

describe('ReportDeliveryService', () => {
  let service: ReportDeliveryService;
  const mailService = {
    sendVocationalReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportDeliveryService,
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(ReportDeliveryService);
    jest.clearAllMocks();
  });

  it('returns success when email is delivered', async () => {
    mailService.sendVocationalReport.mockResolvedValue(true);

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

    expect(mailService.sendVocationalReport).toHaveBeenCalledWith(
      'target@akit.test',
      'Test User',
      'RIA',
      expect.any(Buffer),
      undefined,
      expect.any(Object),
      undefined,
    );
    expect(result).toEqual({
      success: true,
      message: 'Email despachado hacia target@akit.test',
    });
  });

  it('returns failure when email delivery fails', async () => {
    mailService.sendVocationalReport.mockResolvedValue(false);

    const result = await service.deliverReport(
      'target@akit.test',
      'session-1',
      undefined,
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
    );

    expect(mailService.sendVocationalReport).toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: 'Hubo un error despachando el correo electrónico.',
    });
  });
});
