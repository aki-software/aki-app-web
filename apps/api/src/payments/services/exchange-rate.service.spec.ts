import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRateService } from './exchange-rate.service';
import { Logger } from '@nestjs/common';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;

  beforeEach(async () => {
    // Reset env vars and mocks
    process.env.USD_ARS_FALLBACK_RATE = '';
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [ExchangeRateService],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);
    // Mock the internal fetch method directly for simpler testing without HttpModule overhead
    service['fetchRateFromApi'] = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch from API on first call and cache it', async () => {
    (service['fetchRateFromApi'] as jest.Mock).mockResolvedValue(1100);

    const rate1 = await service.getUsdToArsRate();
    expect(rate1).toBe(1100);
    expect(service['fetchRateFromApi']).toHaveBeenCalledTimes(1);

    // Second call should hit cache
    const rate2 = await service.getUsdToArsRate();
    expect(rate2).toBe(1100);
    expect(service['fetchRateFromApi']).toHaveBeenCalledTimes(1);
  });

  it('should invalidate cache after 60 minutes', async () => {
    (service['fetchRateFromApi'] as jest.Mock).mockResolvedValue(1100);

    await service.getUsdToArsRate();
    expect(service['fetchRateFromApi']).toHaveBeenCalledTimes(1);

    // Advance time by 61 minutes
    jest.advanceTimersByTime(61 * 60 * 1000);

    (service['fetchRateFromApi'] as jest.Mock).mockResolvedValue(1150);
    const newRate = await service.getUsdToArsRate();

    expect(newRate).toBe(1150);
    expect(service['fetchRateFromApi']).toHaveBeenCalledTimes(2);
  });

  it('should use fallback if API fails', async () => {
    (service['fetchRateFromApi'] as jest.Mock).mockRejectedValue(
      new Error('API Down'),
    );

    const rate = await service.getUsdToArsRate();
    // Default fallback is 1000
    expect(rate).toBe(1000);
  });

  it('should use env override for fallback if API fails', async () => {
    process.env.USD_ARS_FALLBACK_RATE = '1250';
    (service['fetchRateFromApi'] as jest.Mock).mockRejectedValue(
      new Error('API Down'),
    );

    const rate = await service.getUsdToArsRate();
    expect(rate).toBe(1250);
  });
});
