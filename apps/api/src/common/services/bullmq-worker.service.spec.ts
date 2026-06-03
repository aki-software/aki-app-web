import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BullMQWorkerService } from './bullmq-worker.service.js';
import { JobDispatcherService } from './job-dispatcher.service.js';
import { Worker } from 'bullmq';

jest.mock('bullmq', () => {
  return {
    Worker: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('BullMQWorkerService', () => {
  let service: BullMQWorkerService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockJobDispatcherService = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BullMQWorkerService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JobDispatcherService, useValue: mockJobDispatcherService },
      ],
    }).compile();

    service = module.get<BullMQWorkerService>(BullMQWorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should not initialize worker if ENABLE_BULLMQ is not true', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_BULLMQ') return 'false';
        return undefined;
      });

      await service.onModuleInit();

      expect(service.getWorker()).toBeNull();
      expect(Worker).not.toHaveBeenCalled();
    });

    it('should not initialize worker if ENABLE_BULLMQ is true but no Redis config exists', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_BULLMQ') return 'true';
        return undefined;
      });

      await service.onModuleInit();

      expect(service.getWorker()).toBeNull();
      expect(Worker).not.toHaveBeenCalled();
    });

    it('should initialize worker if ENABLE_BULLMQ is true and Redis URL config exists', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_BULLMQ') return 'true';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      await service.onModuleInit();

      expect(service.getWorker()).not.toBeNull();
      expect(Worker).toHaveBeenCalledWith('akit-jobs', expect.any(Function), {
        connection: { url: 'redis://localhost:6379' },
      });
    });

    it('should dispatch job through JobDispatcherService when worker processes job', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_BULLMQ') return 'true';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      let workerProcessor: any;
      (Worker as unknown as jest.Mock).mockImplementation(
        (_name, processor) => {
          workerProcessor = processor;
          return {
            on: jest.fn(),
            close: jest.fn().mockResolvedValue(undefined),
          };
        },
      );

      await service.onModuleInit();

      expect(workerProcessor).toBeDefined();
      const mockJob = {
        name: 'send_email',
        data: { to: 'test@example.com' },
        id: '1',
      };
      await workerProcessor(mockJob);

      expect(mockJobDispatcherService.dispatch).toHaveBeenCalledWith(
        'send_email',
        { to: 'test@example.com' },
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should close worker if it is running', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_BULLMQ') return 'true';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      const mockClose = jest.fn().mockResolvedValue(undefined);
      (Worker as unknown as jest.Mock).mockImplementation(() => {
        return {
          on: jest.fn(),
          close: mockClose,
        };
      });

      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockClose).toHaveBeenCalled();
      expect(service.getWorker()).toBeNull();
    });
  });
});
