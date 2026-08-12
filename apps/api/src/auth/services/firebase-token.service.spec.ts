import { FirebaseTokenService } from './firebase-token.service';

describe('FirebaseTokenService', () => {
  it('rejects startup without an allowlisted Firebase project', () => {
    expect(
      () =>
        new FirebaseTokenService({
          get: jest.fn().mockReturnValue(undefined),
        } as any),
    ).toThrow('FIREBASE_PROJECT_ID');
  });

  it('rejects tokens issued for a different Firebase project', () => {
    const service = new FirebaseTokenService({
      get: jest.fn().mockReturnValue('akit-production'),
    } as any);

    expect(() =>
      service.assertFirebaseClaims({
        iss: 'https://securetoken.google.com/attacker-project',
        aud: 'attacker-project',
      } as any),
    ).toThrow('Issuer de Firebase inválido');
  });
});
