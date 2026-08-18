import { Test, TestingModule } from '@nestjs/testing';
import { SendReportProcessor } from './send-report.processor.js';
import { ModuleRef } from '@nestjs/core';
import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { ReportOrchestratorService } from '../../../sessions/services/report-orchestrator.service.js';
import { Job } from 'bullmq';
import { PROCESSOR_METADATA } from '@nestjs/bullmq/dist/bull.constants.js';
import { CommonModule } from '../../common.module.js';

describe('SendReportProcessor', () => {
  let processor: SendReportProcessor;
  let orchestrator: jest.Mocked<ReportOrchestratorService>;
  let moduleRef: jest.Mocked<ModuleRef>;

  beforeEach(async () => {
    orchestrator = { sendReport: jest.fn().mockResolvedValue('ok') } as any;
    moduleRef = { get: jest.fn().mockReturnValue(orchestrator) } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendReportProcessor,
        { provide: ModuleRef, useValue: moduleRef },
      ],
    }).compile();

    processor = module.get<SendReportProcessor>(SendReportProcessor);
  });

  it('should consume only the dedicated send-report queue', () => {
    expect(Reflect.getMetadata(PROCESSOR_METADATA, SendReportProcessor)).toEqual({
      name: 'send-report',
    });
  });

  it('should register the processor in CommonModule', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, CommonModule),
    ).toContain(SendReportProcessor);
  });

  it('should process job and call sendReport', async () => {
    const jobData = {
      sessionId: 's1',
      targetEmail: 'admin@example.com',
      scope: 'full' as const,
      voucherId: 'v1',
      jobId: 'j1',
    };

    const mockJob = { data: jobData } as Job<any, any, string>;

    const result = await processor.process(mockJob);

    expect(result).toBe('ok');
    expect(orchestrator.sendReport).toHaveBeenCalledWith(
      's1',
      'admin@example.com',
      'v1',
      'full',
    );
  });
});
