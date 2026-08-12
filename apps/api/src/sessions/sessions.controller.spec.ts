import { SessionsController } from './sessions.controller';

describe('SessionsController completion boundary', () => {
  it('forwards verified Firebase provenance to the secure completion mutation', async () => {
    const mutation = {
      completeSession: jest.fn().mockResolvedValue({ id: 'session-1' }),
    };
    const controller = Object.create(SessionsController.prototype);
    controller.sessionsMutationService = mutation;
    const payload = { voucherCode: 'AB12CD34' };
    const request = {
      user: {
        userId: '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c',
        email: 'patient@example.com',
        isFirebaseEmailVerified: true,
        role: 'PATIENT',
      },
    };

    await expect(controller.complete(payload, request)).resolves.toEqual({
      id: 'session-1',
    });
    expect(mutation.completeSession).toHaveBeenCalledWith(
      payload,
      request.user,
    );
  });
});
