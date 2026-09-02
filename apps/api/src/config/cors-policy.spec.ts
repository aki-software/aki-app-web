import { createCorsOptions } from './cors-policy';

describe('createCorsOptions', () => {
  const isOriginAllowed = (
    environment: NodeJS.ProcessEnv,
    origin: string | undefined,
  ): boolean => {
    const { origin: originOption } = createCorsOptions(environment);
    if (typeof originOption !== 'function') {
      throw new Error('Expected a CORS origin callback');
    }

    let allowed = false;
    originOption(origin, (error, result) => {
      expect(error).toBeNull();
      allowed = result === true;
    });
    return allowed;
  };

  it('trims configured origins', () => {
    expect(
      isOriginAllowed(
        {
          NODE_ENV: 'production',
          CORS_ORIGIN: ' https://web.example.com, https://qa.example.com ',
        },
        'https://qa.example.com',
      ),
    ).toBe(true);
  });

  it('allows localhost origins only outside production', () => {
    expect(
      isOriginAllowed({ NODE_ENV: 'development' }, 'http://localhost:5173'),
    ).toBe(true);

    const { origin } = createCorsOptions({ NODE_ENV: 'production' });
    if (typeof origin !== 'function') {
      throw new Error('Expected a CORS origin callback');
    }
    origin('http://localhost:5173', (error) => {
      expect(error).toEqual(new Error('Not allowed by CORS'));
    });
  });

  it('does not trust arbitrary Vercel origins', () => {
    const { origin } = createCorsOptions({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://web.example.com',
    });
    if (typeof origin !== 'function') {
      throw new Error('Expected a CORS origin callback');
    }
    origin('https://untrusted.vercel.app', (error) => {
      expect(error).toEqual(new Error('Not allowed by CORS'));
    });
  });
});
