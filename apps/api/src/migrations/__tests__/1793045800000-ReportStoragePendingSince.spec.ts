import { QueryRunner } from 'typeorm';
import { ReportStoragePendingSince1793045800000 } from '../1793045800000-ReportStoragePendingSince';

describe('ReportStoragePendingSince1793045800000', () => {
  it('adds a nullable timestamp without backfilling historical status ages', async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };
    const migration = new ReportStoragePendingSince1793045800000();

    await migration.up(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).toHaveBeenCalledTimes(1);
    expect(queryRunner.query.mock.calls[0][0]).toMatch(
      /ADD COLUMN IF NOT EXISTS "storage_pending_since" TIMESTAMPTZ/i,
    );
    expect(queryRunner.query.mock.calls[0][0]).not.toMatch(/DEFAULT|UPDATE/i);
  });

  it('drops only its own nullable timestamp on rollback', async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };
    const migration = new ReportStoragePendingSince1793045800000();

    await migration.down(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringMatching(/DROP COLUMN IF EXISTS "storage_pending_since"/i),
    );
  });
});
