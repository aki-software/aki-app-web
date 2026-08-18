import { ReportGeneratedEvent } from '../../events/domain-events.js';
import { ReportGeneratedHandler } from './report-generated.handler';

describe('ReportGeneratedHandler', () => {
  it('logs and rethrows email failures so the delivery job can retry', async () => {
    const templateRenderer = {
      renderTemplate: jest.fn().mockReturnValue('<p>Report</p>'),
    };
    const emailService = {
      sendEmail: jest.fn().mockRejectedValue(new Error('smtp unavailable')),
    };
    const handler = new ReportGeneratedHandler(
      templateRenderer as any,
      emailService as any,
    );
    const errorLog = jest.spyOn((handler as any).logger, 'error');

    await expect(
      handler.handleReportGeneratedEvent(
        new ReportGeneratedEvent(null, 'ada@example.com', Buffer.from('pdf'), {
          primaryTitle: 'Art',
        }),
      ),
    ).rejects.toThrow('smtp unavailable');

    expect(errorLog).toHaveBeenCalledWith(
      'Failed to send report email to ada@example.com',
      expect.any(Error),
    );
  });
});
