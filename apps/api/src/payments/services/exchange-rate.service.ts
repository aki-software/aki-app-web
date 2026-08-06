import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private cachedRate: number | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
  private readonly DEFAULT_FALLBACK_RATE = 1000;

  async getUsdToArsRate(): Promise<number> {
    const now = Date.now();

    if (
      this.cachedRate &&
      this.cacheTimestamp &&
      now - this.cacheTimestamp < this.CACHE_TTL_MS
    ) {
      this.logger.debug('Returning cached exchange rate');
      return this.cachedRate;
    }

    try {
      this.logger.debug('Fetching exchange rate from API');
      const rate = await this.fetchRateFromApi();
      this.cachedRate = rate;
      this.cacheTimestamp = now;
      return rate;
    } catch (error) {
      this.logger.error('Failed to fetch exchange rate, using fallback', error instanceof Error ? error.message : error);
      const fallbackRateStr = process.env.USD_ARS_FALLBACK_RATE;
      return fallbackRateStr ? parseFloat(fallbackRateStr) : this.DEFAULT_FALLBACK_RATE;
    }
  }

  protected async fetchRateFromApi(): Promise<number> {
    const response = await fetch('https://dolarapi.com/v1/dolares/blue');
    if (!response.ok) {
      throw new Error(`DolarAPI returned ${response.status}`);
    }
    const data = await response.json() as { venta?: number };
    if (!data.venta) {
      throw new Error('DolarAPI did not return venta field');
    }
    return data.venta;
  }
}
