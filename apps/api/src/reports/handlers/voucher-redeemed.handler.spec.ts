import { Logger } from '@nestjs/common';
import { VoucherRedeemedEvent } from '../../events/domain-events.js';
import { ReportsService } from '../reports.service.js';
import { VoucherRedeemedHandler } from './voucher-redeemed.handler.js';

describe('VoucherRedeemedHandler', () => {
  const setup = () => {
    const reports = {
      requestGeneration: jest.fn().mockResolvedValue({
        reportId: 'report-1',
        jobId: 'job-1',
      }),
    };
    return {
      handler: new VoucherRedeemedHandler(reports as unknown as ReportsService),
      reports,
    };
  };

  const event = new VoucherRedeemedEvent(
    'session-1',
    'patient@example.com',
    'voucher-1',
    'patient-1',
  );

  it('requests patient report generation without force', async () => {
    const { handler, reports } = setup();

    await expect(handler.handleVoucherRedeemed(event)).resolves.toBeUndefined();

    expect(reports.requestGeneration).toHaveBeenCalledWith(
      'session-1',
      'patient@example.com',
    );
  });

  it('logs a privacy-safe success boundary after the report is enqueued', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const { handler, reports } = setup();

    await expect(handler.handleVoucherRedeemed(event)).resolves.toBeUndefined();

    expect(reports.requestGeneration).toHaveBeenCalledWith(
      'session-1',
      'patient@example.com',
    );
    expect(log).toHaveBeenLastCalledWith(
      JSON.stringify({
        event: 'voucher.redeemed',
        action: 'report_enqueued',
        sessionId: 'session-1',
        voucherId: 'voucher-1',
        reportId: 'report-1',
        jobId: 'job-1',
      }),
    );
    expect(log.mock.calls.flat().join(' ')).not.toContain(
      'patient@example.com',
    );

    log.mockRestore();
  });

  it('propagates enqueue failures so same-session redemption can repair dispatch', async () => {
    const { handler, reports } = setup();
    reports.requestGeneration.mockRejectedValueOnce(
      new Error('queue unavailable'),
    );

    await expect(handler.handleVoucherRedeemed(event)).rejects.toThrow(
      'queue unavailable',
    );
  });
});
