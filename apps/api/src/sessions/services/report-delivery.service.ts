import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportGeneratedEvent } from '../../events/domain-events.js';
import type { ReportData } from '../../common/types/report.types.js';

@Injectable()
export class ReportDeliveryService {
  private readonly logger = new Logger(ReportDeliveryService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async deliverReport(
    targetEmail: string,
    sessionId: string,
    voucherIdForLogging: string | undefined,
    reportData: ReportData,
    pdfBuffer?: Buffer,
  ): Promise<{ success: boolean; message: string }> {
    // Note: Since this is now decoupled, actual PDF uploading would happen elsewhere.
    // We emit the event and simulate a report URL.
    const reportUrl = `https://s3.bucket/reports/report-${sessionId}.pdf`;

    this.logger.log(
      `Emitting report.generated event for sessionId=${sessionId} targetEmail=${targetEmail}`,
    );

    this.eventEmitter.emit(
      'report.generated',
      new ReportGeneratedEvent(reportUrl, targetEmail),
    );

    return {
      success: true,
      message: `Report generation event emitted for ${targetEmail}`,
    };
  }
}
