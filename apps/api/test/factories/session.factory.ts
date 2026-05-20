import { DataSource } from 'typeorm';
import { Session } from '../../src/sessions/entities/session.entity.js';
import { SessionPaymentStatus } from '@akit/contracts';

export async function createSessionFactory(
  dataSource: DataSource,
  overrides: Partial<Session> = {},
): Promise<Session> {
  const repository = dataSource.getRepository(Session);
  const session = repository.create({
    patientName: 'John Doe',
    sessionDate: new Date(),
    syncKey: `sync-key-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    hollandCode: 'RIA',
    totalTimeMs: 120000,
    paymentStatus: SessionPaymentStatus.PENDING,
    reportUrl: null,
    reportUnlockedAt: null,
    paidAt: null,
    paymentReference: null,
    therapistUserId: null,
    institutionId: null,
    voucherId: null,
    ...overrides,
  });

  return await repository.save(session);
}
