import { SessionsController } from './sessions.controller';

describe('SessionsController completion boundary', () => {
  it('forwards Firebase provenance to the mutation and reloads the completed session without Firebase scope', async () => {
    const sessionId = '6ed5f206-2c2f-4d5c-b1d3-376454b4a19c';
    const mutation = {
      completeSession: jest.fn().mockResolvedValue({ id: sessionId }),
    };
    const query = {
      findOne: jest.fn().mockResolvedValue({ id: sessionId }),
    };
    const controller = Object.create(SessionsController.prototype);
    controller.sessionsMutationService = mutation;
    controller.sessionsQueryService = query;
    const payload = { voucherCode: 'AB12CD34' };
    const request = {
      user: {
        userId: '9Jzd3FD8Hqhm8TR2WplhSy3I16E3',
        email: 'patient@example.com',
        isFirebaseEmailVerified: true,
        role: 'PATIENT',
      },
    };

    await expect(controller.complete(payload, request)).resolves.toEqual({
      id: sessionId,
    });
    expect(mutation.completeSession).toHaveBeenCalledWith(
      payload,
      request.user,
    );
    expect(query.findOne).toHaveBeenCalledWith(sessionId);
  });
});

describe('SessionsController send-report scope', () => {
  it('forwards the authenticated email so Firebase patient identities can be normalized', async () => {
    const orchestrator = {
      sendReport: jest.fn().mockResolvedValue({ success: true }),
    };
    const controller = Object.create(SessionsController.prototype);
    controller.sessionsOrchestratorService = orchestrator;
    const request = {
      user: {
        userId: '9Jzd3FD8Hqhm8TR2WplhSy3I16E3',
        email: 'patient@example.com',
        role: 'PATIENT',
      },
    };

    await controller.sendReport(
      'session-id',
      { email: 'patient@example.com' },
      request,
    );

    expect(orchestrator.sendReport).toHaveBeenCalledWith(
      'session-id',
      'patient@example.com',
      null,
      {
        role: 'PATIENT',
        therapistUserId: undefined,
        patientId: '9Jzd3FD8Hqhm8TR2WplhSy3I16E3',
        institutionId: undefined,
        email: 'patient@example.com',
      },
      undefined,
    );
  });
});
