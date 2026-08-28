import { Injectable, Logger } from '@nestjs/common';

export interface UsdToArsQuote {
  rate: string;
  quotedAt: Date;
  source: 'DOLARAPI_BLUE' | 'FALLBACK';
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private cachedQuote: UsdToArsQuote | null = null;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;
  private readonly DEFAULT_FALLBACK_RATE = '1000';

  async getUsdToArsQuote(): Promise<UsdToArsQuote> {
    const now = Date.now();
    if (
      this.cachedQuote &&
      now - this.cachedQuote.quotedAt.getTime() < this.CACHE_TTL_MS
    )
      return this.cachedQuote;
    try {
      const rate = await this.fetchRateFromApi();
      this.cachedQuote = {
        rate: String(rate),
        quotedAt: new Date(now),
        source: 'DOLARAPI_BLUE',
      };
      return this.cachedQuote;
    } catch (error) {
      this.logger.error(
        'Failed to fetch exchange rate, using fallback',
        (error as Error).stack || error,
      );
      return {
        rate: process.env.USD_ARS_FALLBACK_RATE || this.DEFAULT_FALLBACK_RATE,
        quotedAt: new Date(now),
        source: 'FALLBACK',
      };
    }
  }

  async getUsdToArsRate(): Promise<number> {
    return Number((await this.getUsdToArsQuote()).rate);
  }

  protected async fetchRateFromApi(): Promise<number> {
    const response = await fetch('https://dolarapi.com/v1/dolares/blue');
    if (!response.ok) throw new Error(`DolarAPI returned ${response.status}`);
    const data = (await response.json()) as { venta?: number };
    if (!data.venta) throw new Error('DolarAPI did not return venta field');
    return data.venta;
  }
}
