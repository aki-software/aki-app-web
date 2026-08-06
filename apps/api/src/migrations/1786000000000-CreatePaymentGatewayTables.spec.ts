import { CreatePaymentGatewayTables1786000000000 } from './1786000000000-CreatePaymentGatewayTables';
import { QueryRunner } from 'typeorm';

describe('CreatePaymentGatewayTables Migration', () => {
  let migration: CreatePaymentGatewayTables1786000000000;
  let queryRunnerMock: jest.Mocked<QueryRunner>;

  beforeEach(() => {
    migration = new CreatePaymentGatewayTables1786000000000();

    queryRunnerMock = {
      createTable: jest.fn(),
      dropTable: jest.fn(),
      createForeignKey: jest.fn(),
      dropForeignKey: jest.fn(),
      getTable: jest.fn().mockResolvedValue({
        foreignKeys: [{ columnNames: ['voucherBatchId'] }],
      }),
    } as unknown as jest.Mocked<QueryRunner>;
  });

  it('should be defined', () => {
    expect(migration).toBeDefined();
  });

  it('should run up', async () => {
    await migration.up(queryRunnerMock);
    expect(queryRunnerMock.createTable).toHaveBeenCalledTimes(2);
    expect(queryRunnerMock.createForeignKey).toHaveBeenCalledTimes(1);
  });

  it('should run down', async () => {
    await migration.down(queryRunnerMock);
    expect(queryRunnerMock.dropForeignKey).toHaveBeenCalledTimes(1);
    expect(queryRunnerMock.dropTable).toHaveBeenCalledTimes(2);
  });
});
