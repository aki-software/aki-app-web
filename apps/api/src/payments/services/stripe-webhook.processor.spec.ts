import { Test, TestingModule } from '@nestjs/testing';
import { StripeWebhookProcessor } from './stripe-webhook.processor';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StripeEvent } from '../entities/stripe-event.entity';
import { StripeProductMapping } from '../entities/stripe-product-mapping.entity';
import { VouchersService } from '../../vouchers/vouchers.service';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobDispatcherService } from '../../common/services/job-dispatcher.service';

describe('StripeWebhookProcessor', () => {
  let processor: StripeWebhookProcessor;
  let stripeEventRepo: jest.Mocked<Partial<Repository<StripeEvent>>>;
  let productMappingRepo: jest.Mocked<
    Partial<Repository<StripeProductMapping>>
  >;
  let vouchersService: jest.Mocked<Partial<VouchersService>>;
  let dataSource: jest.Mocked<Partial<DataSource>>;
  let queryRunner: jest.Mocked<Partial<QueryRunner>>;
  let jobDispatcher: jest.Mocked<Partial<JobDispatcherService>>;

  beforeEach(async () => {
    stripeEventRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((event) => event),
    };

    productMappingRepo = {
      findOne: jest.fn(),
    };

    vouchersService = {
      create: jest.fn(),
    };

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    jobDispatcher = {
      dispatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookProcessor,
        {
          provide: getRepositoryToken(StripeEvent),
          useValue: stripeEventRepo,
        },
        {
          provide: getRepositoryToken(StripeProductMapping),
          useValue: productMappingRepo,
        },
        {
          provide: VouchersService,
          useValue: vouchersService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: JobDispatcherService,
          useValue: jobDispatcher,
        },
      ],
    }).compile();

    processor = module.get<StripeWebhookProcessor>(StripeWebhookProcessor);
    // spy on logger to avoid cluttering test output and to assert on it
    jest.spyOn(processor['logger'], 'error').mockImplementation(() => {});
    jest.spyOn(processor['logger'], 'warn').mockImplementation(() => {});
    jest.spyOn(processor['logger'], 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('GIVEN a valid checkout.session.completed event WHEN processed THEN vouchers are credited', async () => {
      const mockJob = {
        data: {
          id: 'evt_123',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_123',
              metadata: {
                institutionId: 'inst_1',
                priceId: 'price_1',
              },
            },
          },
        },
      } as unknown as Job;

      stripeEventRepo.findOne.mockResolvedValue(null);
      productMappingRepo.findOne.mockResolvedValue({
        voucherQuantity: 10,
      } as any);

      await processor.handle(mockJob.data);

      expect(stripeEventRepo.findOne).toHaveBeenCalledWith({
        where: { stripeEventId: 'evt_123' },
      });
      expect(productMappingRepo.findOne).toHaveBeenCalledWith({
        where: { stripePriceId: 'price_1' },
      });
      expect(vouchersService.create).toHaveBeenCalledWith({
        ownerType: 'INSTITUTION',
        ownerInstitutionId: 'inst_1',
        quantity: 10,
        name: 'Stripe Checkout cs_123',
      });
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('GIVEN the same Stripe event ID is received twice WHEN processed THEN only one voucher credit occurs (idempotency)', async () => {
      const mockJob = {
        data: {
          id: 'evt_123',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_123',
              metadata: { institutionId: 'inst_1', priceId: 'price_1' },
            },
          },
        },
      } as unknown as Job;

      stripeEventRepo.findOne.mockResolvedValue({ id: 'existing_id' } as any);

      await processor.handle(mockJob.data);

      expect(stripeEventRepo.findOne).toHaveBeenCalledWith({
        where: { stripeEventId: 'evt_123' },
      });
      expect(productMappingRepo.findOne).not.toHaveBeenCalled();
      expect(vouchersService.create).not.toHaveBeenCalled();
      expect(processor['logger'].warn).toHaveBeenCalledWith(
        'Stripe event evt_123 already processed. Skipping.',
      );
    });

    it('GIVEN a webhook with unknown priceId WHEN processed THEN an error is logged and no vouchers are credited', async () => {
      const mockJob = {
        data: {
          id: 'evt_123',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_123',
              metadata: { institutionId: 'inst_1', priceId: 'price_unknown' },
            },
          },
        },
      } as unknown as Job;

      stripeEventRepo.findOne.mockResolvedValue(null);
      productMappingRepo.findOne.mockResolvedValue(null);

      await processor.handle(mockJob.data);

      expect(productMappingRepo.findOne).toHaveBeenCalledWith({
        where: { stripePriceId: 'price_unknown' },
      });
      expect(vouchersService.create).not.toHaveBeenCalled();
      expect(processor['logger'].error).toHaveBeenCalledWith(
        'No product mapping found for event evt_123. Ensure priceId is provided in metadata.',
      );
    });
  });
});
