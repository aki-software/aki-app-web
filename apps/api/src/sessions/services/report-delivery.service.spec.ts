import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReportDeliveryService } from './report-delivery.service.js';
import { MailService } from '../../mail/mail.service.js';

describe('ReportDeliveryService', () => {
  let service: ReportDeliveryService;
  const mailService = {
    send: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportDeliveryService,
        { provide: MailService, useValue: mailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(ReportDeliveryService);
    jest.clearAllMocks();
  });

  it('returns success when email is delivered', async () => {
    mailService.send.mockResolvedValue(true);

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

    expect(mailService.send).toHaveBeenCalledWith(
      'report-email.pug',
      expect.objectContaining({
        patientName: 'Test User',
        hollandCode: 'RIA',
      }),
      expect.objectContaining({
        to: 'target@akit.test',
        subject: '📊 Tu Informe Vocacional',
        attachments: expect.any(Array),
      }),
    );
    expect(result).toEqual({
      success: true,
      message: 'Email despachado hacia target@akit.test',
    });
  });

  it('returns failure when email delivery fails', async () => {
    mailService.send.mockRejectedValue(new Error('fail'));

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

    expect(mailService.send).toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: 'Hubo un error despachando el correo electrónico.',
    });
  });
});
