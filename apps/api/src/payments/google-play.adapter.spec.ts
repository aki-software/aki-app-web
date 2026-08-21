import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { GooglePlayAdapter } from './google-play.adapter';

describe('GooglePlayAdapter', () => {
  it.each<[string, string | undefined]>([
    ['missing service account', undefined],
    ['malformed base64 JSON', 'not-json'],
    ['missing client email', JSON.stringify({ private_key: 'private-key' })],
    [
      'missing private key',
      JSON.stringify({ client_email: 'service@example.com' }),
    ],
  ])(
    'maps %s credentials to a safe unavailable response',
    async (_label, json) => {
      const serviceAccount = json
        ? Buffer.from(json).toString('base64')
        : undefined;
      const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const adapter = new GooglePlayAdapter({
        get: jest.fn().mockReturnValue(serviceAccount),
      } as never);

      await expect(adapter.getAndroidPublisher()).rejects.toMatchObject({
        status: 503,
        response: expect.objectContaining({
          code: 'GOOGLE_PLAY_VERIFICATION_UNAVAILABLE',
        }),
      });
      expect(logger).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'google_play_configuration_failed' }),
      );
      expect(JSON.stringify(logger.mock.calls)).not.toContain(
        'service@example.com',
      );
      expect(JSON.stringify(logger.mock.calls)).not.toContain('private-key');
      logger.mockRestore();
    },
  );

  it('uses a safe unavailable exception for invalid package configuration', () => {
    const adapter = new GooglePlayAdapter({
      get: jest.fn().mockReturnValue('../bad'),
    } as never);

    expect(() => adapter.getPackageName()).toThrow(ServiceUnavailableException);
  });
});
