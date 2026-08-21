import { ReportGeneratedEvent } from '../../events/domain-events.js';
import { ReportGeneratedHandler } from './report-generated.handler';

describe('ReportGeneratedHandler', () => {
  it.each([
    ['PATIENT', 'report-email.pug', 'Tu informe vocacional está listo - Orient A.ki'],
    [
      'EVALUATOR',
      'report-evaluator-email.pug',
      'Informe vocacional para evaluación profesional - Orient A.ki',
    ],
  ] as const)('selects the %s email template and subject', async (audience, template, subject) => {
    const templateRenderer = {
      renderTemplate: jest.fn().mockReturnValue('<p>Report</p>'),
    };
    const emailService = { sendEmail: jest.fn() };
    const handler = new ReportGeneratedHandler(
      templateRenderer as any,
      emailService as any,
    );

    await handler.handleReportGeneratedEvent(
      new ReportGeneratedEvent(null, 'ada@example.com', Buffer.from('pdf'), undefined, audience),
    );

    expect(templateRenderer.renderTemplate).toHaveBeenCalledWith(template, expect.any(Object));
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'ada@example.com',
      subject,
      '<p>Report</p>',
      expect.arrayContaining([
        expect.objectContaining({
          filename: 'Informe_Vocacional.pdf',
          content: Buffer.from('pdf'),
        }),
      ]),
    );
  });

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
