import { AuthUserFactory } from './auth-user.factory';

describe('AuthUserFactory Firebase provenance', () => {
  const factory = new AuthUserFactory();

  it('preserves verified Firebase email provenance', () => {
    expect(
      factory.buildUserFromPayload(
        {
          sub: 'patient-1',
          email: 'patient@example.com',
          email_verified: true,
        } as any,
        true,
      ).isFirebaseEmailVerified,
    ).toBe(true);
  });

  it('marks local API JWT identity as not Firebase verified', () => {
    expect(
      factory.buildUserFromPayload(
        {
          sub: 'patient-1',
          email: 'patient@example.com',
          email_verified: true,
        } as any,
        false,
      ).isFirebaseEmailVerified,
    ).toBe(false);
  });
});
