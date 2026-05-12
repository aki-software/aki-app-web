import { JobDispatcherService } from './job-dispatcher.service';
import { JobNames } from '../jobs/job-names';
import { ModuleRef } from '@nestjs/core';
import { PdfService } from './pdf.service';

describe('JobDispatcherService', () => {
  const pdfService = {
    generateFromHtml: jest.fn(),
  } as unknown as PdfService;

  const moduleRef = {
    get: jest.fn(),
  } as unknown as ModuleRef;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retries dispatch with backoff', async () => {
    jest.useFakeTimers();
    const service = new JobDispatcherService(pdfService, moduleRef);
    const dispatchSpy = jest
      .spyOn(service, 'dispatch')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(true);

    const promise = service.dispatchWithRetry('job', { id: '1' }, {
      attempts: 2,
      backoffMs: 10,
      backoffType: 'fixed',
    });

    jest.advanceTimersByTime(10);
    await promise;

    expect(dispatchSpy).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('throws on job timeout', async () => {
    jest.useFakeTimers();
    const service = new JobDispatcherService(pdfService, moduleRef);
    pdfService.generateFromHtml = jest.fn(
      () => new Promise<Buffer>(() => undefined),
    );

    const promise = service.dispatch(JobNames.GeneratePdf, {
      html: '<p>test</p>',
      timeoutMs: 10,
    });

    jest.advanceTimersByTime(10);
    await expect(promise).rejects.toThrow('Job timed out after 10ms');
    jest.useRealTimers();
  });
});
