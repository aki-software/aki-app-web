import { StripeAdapter } from './stripe.adapter';
import { ConfigService } from '@nestjs/config';

describe('StripeAdapter', () => {
  it('should be defined', () => {
    const configService = new ConfigService();
    jest.spyOn(configService, 'get').mockReturnValue('mock');
    expect(new StripeAdapter(configService)).toBeDefined();
  });
});
