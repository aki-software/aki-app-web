import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy Firebase identity hydration', () => {
  it('uses the internal user role and institution instead of token-supplied scope', async () => {
    const strategy = Object.create(JwtStrategy.prototype) as JwtStrategy;
    const tokenUser = {
      userId: 'firebase-user-id',
      email: 'therapist@example.com',
      role: 'ADMIN',
      institutionId: 'attacker-institution',
      isFirebaseEmailVerified: true,
    };
    (strategy as any).firebaseTokenService = {
      assertFirebaseClaims: jest.fn(),
    };
    (strategy as any).authUserFactory = {
      buildUserFromPayload: jest.fn().mockReturnValue(tokenUser),
    };
    (strategy as any).usersService = {
      findByEmail: jest.fn().mockResolvedValue({
        id: '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c',
        role: 'THERAPIST',
        institutionId: '92177e63-49f2-46f8-a76f-406fd8f8b438',
      }),
    };

    const result = await strategy.validate({
      iss: 'https://securetoken.google.com/akit-production',
      email: 'therapist@example.com',
      email_verified: true,
      role: 'ADMIN',
      institutionId: 'attacker-institution',
    } as any);

    expect(result).toMatchObject({
      userId: '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c',
      role: 'THERAPIST',
      institutionId: '92177e63-49f2-46f8-a76f-406fd8f8b438',
    });
  });

  it('rejects a Firebase token without an email to map to an internal user', async () => {
    const strategy = Object.create(JwtStrategy.prototype) as JwtStrategy;
    (strategy as any).firebaseTokenService = {
      assertFirebaseClaims: jest.fn(),
    };
    (strategy as any).authUserFactory = {
      buildUserFromPayload: jest.fn().mockReturnValue({
        userId: 'firebase-user-id',
        role: 'ADMIN',
        institutionId: 'attacker-institution',
        isFirebaseEmailVerified: true,
      }),
    };
    (strategy as any).usersService = { findByEmail: jest.fn() };

    await expect(
      strategy.validate({
        iss: 'https://securetoken.google.com/akit-production',
        email_verified: true,
      } as any),
    ).rejects.toThrow('Firebase user is not registered.');
  });

  it('rejects an unverified Firebase email before looking up internal scope', async () => {
    const strategy = Object.create(JwtStrategy.prototype) as JwtStrategy;
    const findByEmail = jest.fn();
    (strategy as any).firebaseTokenService = {
      assertFirebaseClaims: jest.fn(),
    };
    (strategy as any).authUserFactory = {
      buildUserFromPayload: jest.fn().mockReturnValue({
        userId: 'firebase-user-id',
        email: 'victim@example.com',
        role: 'ADMIN',
        institutionId: 'attacker-institution',
        isFirebaseEmailVerified: true,
      }),
    };
    (strategy as any).usersService = { findByEmail };

    await expect(
      strategy.validate({
        iss: 'https://securetoken.google.com/akit-production',
        email: 'victim@example.com',
        email_verified: false,
      } as any),
    ).rejects.toThrow('Firebase email must be verified.');

    expect(findByEmail).not.toHaveBeenCalled();
  });

  it('preserves local JWT validation without Firebase email verification', async () => {
    const strategy = Object.create(JwtStrategy.prototype) as JwtStrategy;
    const localUser = {
      userId: 'local-user-id',
      role: 'THERAPIST',
      institutionId: 'local-institution',
    };
    (strategy as any).authUserFactory = {
      buildUserFromPayload: jest.fn().mockReturnValue(localUser),
    };
    (strategy as any).firebaseTokenService = {
      assertFirebaseClaims: jest.fn(),
    };

    await expect(
      strategy.validate({ sub: 'local-user-id', role: 'THERAPIST' } as any),
    ).resolves.toEqual(localUser);
    expect(
      (strategy as any).firebaseTokenService.assertFirebaseClaims,
    ).not.toHaveBeenCalled();
  });
});
