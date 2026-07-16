import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';
import { ConfigService } from '@nestjs/config';

describe('PdfService', () => {
  let service: PdfService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PdfService>(PdfService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should inject ConfigService', () => {
    expect(configService).toBeDefined();
  });

  it('should read SERVERLESS from ConfigService in constructor', () => {
    expect(configService.get).toHaveBeenCalledWith('SERVERLESS');
  });

  it('should set isServerless=true when SERVERLESS=true', async () => {
    configService.get.mockReturnValue('true');

    // Re-create service with the updated mock
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    const svc = module.get<PdfService>(PdfService);
    // Access private field via any cast for testing
    expect((svc as unknown as { isServerless: boolean }).isServerless).toBe(
      true,
    );
  });

  it('should set isServerless=false when SERVERLESS is not true', async () => {
    configService.get.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    const svc = module.get<PdfService>(PdfService);
    expect((svc as unknown as { isServerless: boolean }).isServerless).toBe(
      false,
    );
  });
});
