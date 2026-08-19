import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  it('allows a missing Authorization header without invoking JWT validation', () => {
    const guard = new OptionalJwtAuthGuard() as any;
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    };

    expect(guard.canActivate(context)).toBe(true);
  });

  it('delegates supplied credentials to the parent JWT guard', () => {
    const parent = jest
      .spyOn(JwtAuthGuard.prototype, 'canActivate')
      .mockReturnValue(true);
    const guard = new OptionalJwtAuthGuard() as any;
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer valid' } }),
      }),
    };

    expect(guard.canActivate(context)).toBe(true);
    expect(parent).toHaveBeenCalledWith(context);
  });

  it('propagates parent JWT rejection for an invalid supplied credential', () => {
    jest.spyOn(JwtAuthGuard.prototype, 'canActivate').mockImplementation(() => {
      throw new Error('Unauthorized');
    });
    const guard = new OptionalJwtAuthGuard() as any;
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer invalid' } }),
      }),
    };

    expect(() => guard.canActivate(context)).toThrow('Unauthorized');
  });
});
