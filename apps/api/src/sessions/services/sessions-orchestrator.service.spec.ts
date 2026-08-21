import { ReportOrchestratorService } from './report-orchestrator.service.js';
import { SessionOwnerResolverService } from './session-owner-resolver.service.js';
import { SessionsOrchestratorService } from './sessions-orchestrator.service.js';
import { SessionsQueryService } from './sessions-query.service.js';
import { SessionScope } from '../types/session-scope.type.js';

describe('SessionsOrchestratorService', () => {
  const firebaseUid = '9Jzd3FD8Hqhm8TR2WplhSy3I16E3';
  const email = 'agyaniri@gmail.com';
  const patientId = '3b178f2a-0252-4ef1-b886-c0335830cc2e';
  const session = { id: 'session-id' };

  const createService = () => {
    const sessionsQueryService = {
      findOne: jest.fn().mockResolvedValue(session),
    };
    const reportOrchestratorService = {
      sendReport: jest.fn().mockResolvedValue({
        success: true,
        message: 'Report sent',
      }),
    };
    const sessionOwnerResolverService = {
      resolveFirebasePatient: jest.fn().mockResolvedValue({ id: patientId }),
    };
    const Service = SessionsOrchestratorService as unknown as new (
      sessionsQueryService: SessionsQueryService,
      reportOrchestratorService: ReportOrchestratorService,
      sessionOwnerResolverService: SessionOwnerResolverService,
    ) => SessionsOrchestratorService;

    return {
      service: new Service(
        sessionsQueryService as unknown as SessionsQueryService,
        reportOrchestratorService as unknown as ReportOrchestratorService,
        sessionOwnerResolverService as unknown as SessionOwnerResolverService,
      ),
      sessionsQueryService,
      reportOrchestratorService,
      sessionOwnerResolverService,
    };
  };

  it('normalizes a Firebase patient scope to its canonical patient ID before sending a report', async () => {
    const {
      service,
      sessionsQueryService,
      reportOrchestratorService,
      sessionOwnerResolverService,
    } = createService();
    const scope = {
      role: 'PATIENT',
      patientId: firebaseUid,
      email,
    } as SessionScope;

    await service.sendReport('session-id', email, null, scope, true);

    const normalizedScope = { ...scope, patientId };
    expect(
      sessionOwnerResolverService.resolveFirebasePatient,
    ).toHaveBeenCalledWith({ uid: firebaseUid, email }, false);
    expect(sessionsQueryService.findOne).toHaveBeenCalledWith(
      'session-id',
      normalizedScope,
    );
    expect(reportOrchestratorService.sendReport).toHaveBeenCalledWith(
      'session-id',
      email,
      null,
      normalizedScope,
      true,
    );
  });

  it('fails closed without downstream calls when the Firebase patient is unmapped', async () => {
    const {
      service,
      sessionsQueryService,
      reportOrchestratorService,
      sessionOwnerResolverService,
    } = createService();
    const scope = {
      role: 'PATIENT',
      patientId: firebaseUid,
      email,
    } as SessionScope;
    sessionOwnerResolverService.resolveFirebasePatient.mockResolvedValueOnce(
      null,
    );

    await expect(
      service.sendReport('session-id', email, null, scope),
    ).rejects.toThrow('Firebase patient identity is not mapped');

    expect(sessionsQueryService.findOne).not.toHaveBeenCalled();
    expect(reportOrchestratorService.sendReport).not.toHaveBeenCalled();
  });

  it('preserves therapist scopes without resolving patient identity', async () => {
    const {
      service,
      sessionsQueryService,
      reportOrchestratorService,
      sessionOwnerResolverService,
    } = createService();
    const scope = {
      role: 'THERAPIST',
      therapistId: 'therapist-id',
    } as SessionScope;

    await service.sendReport('session-id', email, null, scope, true);

    expect(
      sessionOwnerResolverService.resolveFirebasePatient,
    ).not.toHaveBeenCalled();
    expect(sessionsQueryService.findOne).toHaveBeenCalledWith(
      'session-id',
      scope,
    );
    expect(reportOrchestratorService.sendReport).toHaveBeenCalledWith(
      'session-id',
      email,
      null,
      scope,
      true,
    );
  });
});
