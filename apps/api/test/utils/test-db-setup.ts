import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Session } from '../../src/sessions/entities/session.entity.js';
import { SessionResult } from '../../src/sessions/entities/session-result.entity.js';
import { SessionSwipe } from '../../src/sessions/entities/session-swipe.entity.js';
import { SessionMetrics } from '../../src/sessions/entities/session-metrics.entity.js';
import { VocationalCategory } from '../../src/categories/entities/vocational-category.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import { Institution } from '../../src/institutions/entities/institution.entity.js';
import { Voucher } from '../../src/vouchers/entities/voucher.entity.js';
import { VoucherBatch } from '../../src/vouchers/entities/voucher-batch.entity.js';
import { TresAreasCombination } from '../../src/tres-areas/entities/tres-areas-combination.entity.js';

export const testEntities = [
  Session,
  SessionResult,
  SessionSwipe,
  SessionMetrics,
  VocationalCategory,
  User,
  Institution,
  Voucher,
  VoucherBatch,
  TresAreasCombination,
];

export async function createTestConnection(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: testEntities,
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
}

export async function closeTestConnection(
  dataSource: DataSource,
): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
}

export async function clearDatabase(dataSource: DataSource): Promise<void> {
  if (!dataSource || !dataSource.isInitialized) return;

  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    try {
      await repository.clear();
    } catch {
      // In SQLite, sometimes .clear() fails if there are active foreign keys or cascade locks.
      // Fallback to a raw query if necessary.
      await repository.query(`DELETE FROM ${entity.tableName};`);
    }
  }
}
