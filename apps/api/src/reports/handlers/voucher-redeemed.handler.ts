import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VoucherRedeemedEvent } from '../../events/domain-events.js';
import { ReportsService } from '../reports.service.js';

@Injectable()
export class VoucherRedeemedHandler {
  private readonly logger = new Logger(VoucherRedeemedHandler.name);

  constructor(private readonly reportsService: ReportsService) {}

  @OnEvent('voucher.redeemed', { suppressErrors: false })
  async handleVoucherRedeemed(event: VoucherRedeemedEvent): Promise<void> {
    this.logger.log(
      JSON.stringify({
        event: 'voucher.redeemed',
        sessionId: event.sessionId,
        voucherId: event.voucherId,
        action: 'enqueueing_report',
      }),
    );
    try {
      const { reportId, jobId } = await this.reportsService.requestGeneration(
        event.sessionId,
        event.recipientEmail,
      );
      this.logger.log(
        JSON.stringify({
          event: 'voucher.redeemed',
          action: 'report_enqueued',
          sessionId: event.sessionId,
          voucherId: event.voucherId,
          reportId,
          jobId,
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'voucher.redeemed',
          sessionId: event.sessionId,
          voucherId: event.voucherId,
          action: 'report_enqueue_failed',
        }),
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
