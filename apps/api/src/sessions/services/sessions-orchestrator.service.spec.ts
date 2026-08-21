import { NotFoundException } from '@nestjs/common';
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
      resolveFirebaseUser: jest.fn().mockResolvedValue({ id: patientId }),
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

  it('normalizes Firebase patient scope before querying and sending a report', async () => {
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
      sessionOwnerResolverService.resolveFirebaseUser,
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

  it('fails closed without downstream calls when Firebase identity is unmapped', async () => {
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
    sessionOwnerResolverService.resolveFirebaseUser.mockRejectedValueOnce(
      new NotFoundException('Firebase patient identity is not mapped'),
    );

    await expect(
      service.sendReport('session-id', email, null, scope),
    ).rejects.toThrow('Firebase patient identity is not mapped');

    expect(sessionsQueryService.findOne).not.toHaveBeenCalled();
    expect(reportOrchestratorService.sendReport).not.toHaveBeenCalled();
  });

  it('preserves non-patient scopes without resolving Firebase identity', async () => {
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
      sessionOwnerResolverService.resolveFirebaseUser,
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
