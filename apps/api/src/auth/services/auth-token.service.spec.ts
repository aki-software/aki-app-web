import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthTokenService } from './auth-token.service';

const mockQuit = jest.fn();

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => ({ quit: mockQuit })),
}));

describe('AuthTokenService', () => {
  beforeEach(() => {
    mockQuit.mockClear();
    mockQuit.mockResolvedValue('OK');
  });

  it('closes its Redis client during module destruction', async () => {
    const service = new AuthTokenService(
      { sign: jest.fn() } as unknown as JwtService,
      {
        get: jest.fn().mockReturnValue('redis://127.0.0.1:6379/15'),
      } as unknown as ConfigService,
    );

    await service.onModuleDestroy();

    expect(mockQuit).toHaveBeenCalledTimes(1);
  });

  it('does not close the Redis client twice', async () => {
    const service = new AuthTokenService(
      { sign: jest.fn() } as unknown as JwtService,
      {
        get: jest.fn().mockReturnValue('redis://127.0.0.1:6379/15'),
      } as unknown as ConfigService,
    );

    await service.onModuleDestroy();
    await service.onModuleDestroy();

    expect(mockQuit).toHaveBeenCalledTimes(1);
  });
});
