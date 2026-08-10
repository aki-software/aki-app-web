import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../config/typeorm.config.js';
import { VoucherBatch } from '../vouchers/entities/voucher-batch.entity.js';
import { Voucher } from '../vouchers/entities/voucher.entity.js';
import {
  VoucherBatchStatus,
  VoucherOwnerType,
} from '../vouchers/entities/voucher.enums.js';
import { VoucherCodeGenerator } from '../vouchers/services/voucher-code-generator.service.js';
import { PaymentFulfillmentOutbox } from './entities/payment-fulfillment-outbox.entity.js';
import { VoucherFulfillmentProcessor } from './services/voucher-fulfillment.processor.js';

const integration = process.env.PAYMENT_POSTGRES_INTEGRATION === 'true';
const describeIntegration = integration ? describe : describe.skip;
const databaseUrl = process.env.PAYMENT_TEST_DATABASE_URL;

jest.setTimeout(30_000);

describeIntegration(
  'Phase 4 PostgreSQL VoucherFulfillmentProcessor integration',
  () => {
    let dataSource: DataSource;

    beforeAll(async () => {
      if (!databaseUrl) {
        throw new Error(
          'PAYMENT_TEST_DATABASE_URL is required when PAYMENT_POSTGRES_INTEGRATION=true',
        );
      }
      dataSource = new DataSource({
        type: 'postgres',
        url: databaseUrl,
        entities: typeOrmConfig.entities,
        synchronize: true,
        dropSchema: true,
      });
      await dataSource.initialize();
    });

    beforeEach(async () => {
      await dataSource.synchronize(true);
    });

    afterAll(async () => {
      if (dataSource?.isInitialized) await dataSource.destroy();
    });

    it('creates exactly the PAID batch quantity and atomically completes the batch and outbox', async () => {
      const { batch, outbox } = await createOutbox();

      await processor().process(job(outbox.id));

      const vouchers = await dataSource.getRepository(Voucher).find({
        where: { batchId: batch.id },
      });
      const persistedBatch = await dataSource
        .getRepository(VoucherBatch)
        .findOneByOrFail({ id: batch.id });
      const persistedOutbox = await dataSource
        .getRepository(PaymentFulfillmentOutbox)
        .findOneByOrFail({ id: outbox.id });

      expect(vouchers).toHaveLength(batch.quantity);
      expect(new Set(vouchers.map((voucher) => voucher.code)).size).toBe(
        batch.quantity,
      );
      expect(persistedBatch.fulfilledAt).toBeInstanceOf(Date);
      expect(persistedOutbox.processedAt).toBeInstanceOf(Date);
    });

    it('allows two processor instances to concurrently fulfill one outbox exactly once', async () => {
      const { batch, outbox } = await createOutbox();
      const first = processor();
      const second = processor();

      await Promise.all([
        first.process(job(outbox.id)),
        second.process(job(outbox.id)),
      ]);

      await expect(
        dataSource
          .getRepository(Voucher)
          .count({ where: { batchId: batch.id } }),
      ).resolves.toBe(batch.quantity);
      await expect(
        dataSource
          .getRepository(PaymentFulfillmentOutbox)
          .findOneByOrFail({ id: outbox.id }),
      ).resolves.toMatchObject({ processedAt: expect.any(Date) });
    });

    it('treats a completed delivery as an idempotent no-op', async () => {
      const { batch, outbox } = await createOutbox();
      const fulfillmentProcessor = processor();

      await fulfillmentProcessor.process(job(outbox.id));
      await fulfillmentProcessor.process(job(outbox.id));

      await expect(
        dataSource
          .getRepository(Voucher)
          .count({ where: { batchId: batch.id } }),
      ).resolves.toBe(batch.quantity);
    });

    it('creates only the missing vouchers when a PAID batch has a partial set', async () => {
      const { batch, outbox } = await createOutbox();
      await createExistingVouchers(batch, ['PART0001']);

      await processor().process(job(outbox.id));

      await expect(
        dataSource
          .getRepository(Voucher)
          .count({ where: { batchId: batch.id } }),
      ).resolves.toBe(batch.quantity);
      await expect(
        dataSource
          .getRepository(PaymentFulfillmentOutbox)
          .findOneByOrFail({ id: outbox.id }),
      ).resolves.toMatchObject({ processedAt: expect.any(Date) });
    });

    it('completes an exact existing voucher set without creating more', async () => {
      const { batch, outbox } = await createOutbox();
      await createExistingVouchers(batch, ['EXACT001', 'EXACT002', 'EXACT003']);
      const codeGenerator = new VoucherCodeGenerator(
        dataSource.getRepository(Voucher),
        dataSource.getRepository(VoucherBatch),
      );
      const generateCode = jest.spyOn(codeGenerator, 'generateUniqueCode');

      await new VoucherFulfillmentProcessor(dataSource, codeGenerator).process(
        job(outbox.id),
      );

      expect(generateCode).not.toHaveBeenCalled();
      await expect(
        dataSource
          .getRepository(Voucher)
          .count({ where: { batchId: batch.id } }),
      ).resolves.toBe(batch.quantity);
      await expect(
        dataSource
          .getRepository(VoucherBatch)
          .findOneByOrFail({ id: batch.id }),
      ).resolves.toMatchObject({ fulfilledAt: expect.any(Date) });
    });

    it('rejects an over-fulfilled batch without creating vouchers or completion markers', async () => {
      const { batch, outbox } = await createOutbox();
      await createExistingVouchers(batch, [
        'OVER0001',
        'OVER0002',
        'OVER0003',
        'OVER0004',
      ]);

      await expect(processor().process(job(outbox.id))).rejects.toThrow(
        'Voucher batch is over-fulfilled',
      );

      await expect(
        dataSource
          .getRepository(Voucher)
          .count({ where: { batchId: batch.id } }),
      ).resolves.toBe(4);
      await expect(
        dataSource
          .getRepository(VoucherBatch)
          .findOneByOrFail({ id: batch.id }),
      ).resolves.toMatchObject({ fulfilledAt: null });
      await expect(
        dataSource
          .getRepository(PaymentFulfillmentOutbox)
          .findOneByOrFail({ id: outbox.id }),
      ).resolves.toMatchObject({ processedAt: null });
    });

    it.each([
      VoucherBatchStatus.PENDING,
      VoucherBatchStatus.FAILED,
      VoucherBatchStatus.CANCELLED,
    ])('does not fulfill a %s batch', async (status) => {
      const { batch, outbox } = await createOutbox({ status });

      await expect(processor().process(job(outbox.id))).rejects.toThrow(
        'Voucher fulfillment requires a paid batch',
      );

      await expect(
        dataSource
          .getRepository(Voucher)
          .count({ where: { batchId: batch.id } }),
      ).resolves.toBe(0);
      const persistedBatch = await dataSource
        .getRepository(VoucherBatch)
        .findOneByOrFail({ id: batch.id });
      const persistedOutbox = await dataSource
        .getRepository(PaymentFulfillmentOutbox)
        .findOneByOrFail({ id: outbox.id });
      expect(persistedBatch.fulfilledAt).toBeNull();
      expect(persistedOutbox.processedAt).toBeNull();
    });

    it('rolls back a forced voucher insert failure and succeeds on retry', async () => {
      const { batch, outbox } = await createOutbox();
      await createExistingVouchers(batch, ['DUPL0001']);
      const failingProcessor = new VoucherFulfillmentProcessor(dataSource, {
        generateUniqueCode: jest.fn().mockResolvedValue('DUPL0001'),
      });

      await expect(failingProcessor.process(job(outbox.id))).rejects.toThrow();

      await expect(
        dataSource
          .getRepository(Voucher)
          .count({ where: { batchId: batch.id } }),
      ).resolves.toBe(1);
      await expect(
        dataSource
          .getRepository(PaymentFulfillmentOutbox)
          .findOneByOrFail({ id: outbox.id }),
      ).resolves.toMatchObject({ processedAt: null });
      await expect(
        dataSource
          .getRepository(VoucherBatch)
          .findOneByOrFail({ id: batch.id }),
      ).resolves.toMatchObject({ fulfilledAt: null });
      await processor().process(job(outbox.id));
      await expect(
        dataSource
          .getRepository(Voucher)
          .count({ where: { batchId: batch.id } }),
      ).resolves.toBe(batch.quantity);
    });

    function processor(): VoucherFulfillmentProcessor {
      return new VoucherFulfillmentProcessor(
        dataSource,
        new VoucherCodeGenerator(
          dataSource.getRepository(Voucher),
          dataSource.getRepository(VoucherBatch),
        ),
      );
    }

    function job(outboxId: string) {
      return { data: { outboxId } } as never;
    }

    async function createExistingVouchers(
      batch: VoucherBatch,
      codes: string[],
    ): Promise<void> {
      await dataSource.getRepository(Voucher).save(
        codes.map((code) => ({
          batchId: batch.id,
          code,
          ownerType: batch.ownerType,
          ownerInstitutionId: batch.ownerInstitutionId,
          ownerUserId: batch.ownerUserId,
        })),
      );
    }

    async function createOutbox({
      status = VoucherBatchStatus.PAID,
    }: {
      status?: VoucherBatchStatus;
    } = {}): Promise<{
      batch: VoucherBatch;
      outbox: PaymentFulfillmentOutbox;
    }> {
      const batch = await dataSource.getRepository(VoucherBatch).save({
        shortCode: `P4${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        ownerType: VoucherOwnerType.INSTITUTION,
        ownerUserId: null,
        ownerInstitutionId: null,
        quantity: 3,
        unitPrice: '5.00',
        totalPrice: '15.00',
        currency: 'USD',
        expectedAmountMinor: '1500',
        idempotencyKey: null,
        checkoutUrl: null,
        fulfilledAt: null,
        paymentProvider: 'STRIPE',
        paymentReference: null,
        status,
        paidAt: status === VoucherBatchStatus.PAID ? new Date() : null,
      });
      const outbox = await dataSource
        .getRepository(PaymentFulfillmentOutbox)
        .save({
          voucherBatchId: batch.id,
          processedAt: null,
        });
      return { batch, outbox };
    }
  },
);
