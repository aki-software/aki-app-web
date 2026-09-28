import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AuthTokenService } from '../services/auth-token.service.js';

const mockAuthTokenService = {
  isTokenInvalidated: jest.fn(),
};

const buildContext = (authHeader?: string): ExecutionContext => {
  const req = {
    headers: { authorization: authHeader },
    method: 'GET',
    originalUrl: '/protected',
    url: '/protected',
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard(
      mockAuthTokenService as unknown as AuthTokenService,
    );
    // Default: Passport super.canActivate returns true
    jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockResolvedValue(true);
  });

  it('throws UnauthorizedException when token is on the blacklist', async () => {
    mockAuthTokenService.isTokenInvalidated.mockResolvedValue(true);

    await expect(
      guard.canActivate(buildContext('Bearer revoked-token')),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockAuthTokenService.isTokenInvalidated).toHaveBeenCalledWith(
      'revoked-token',
    );
  });

  it('allows the request through when token is not on the blacklist', async () => {
    mockAuthTokenService.isTokenInvalidated.mockResolvedValue(false);

    const result = await guard.canActivate(buildContext('Bearer valid-token'));

    expect(result).toBe(true);
    expect(mockAuthTokenService.isTokenInvalidated).toHaveBeenCalledWith(
      'valid-token',
    );
  });

  it('skips blacklist check when no Authorization header is present', async () => {
    mockAuthTokenService.isTokenInvalidated.mockResolvedValue(false);

    const result = await guard.canActivate(buildContext(undefined));

    expect(result).toBe(true);
    expect(mockAuthTokenService.isTokenInvalidated).not.toHaveBeenCalled();
  });
});
