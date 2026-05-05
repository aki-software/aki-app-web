import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { MailService } from '../../mail/mail.service';
import { PdfService } from './pdf.service';
import { ReportOrchestratorService } from '../../sessions/services/report-orchestrator.service';
import { JobNames } from '../jobs/job-names';
import { SendEmailJobPayload } from '../jobs/send-email.job';
import { SendReportJobPayload } from '../jobs/send-report.job';
import { GeneratePdfJobPayload } from '../jobs/generate-pdf.job';

@Injectable()
export class JobDispatcherService {
  private readonly logger = new Logger(JobDispatcherService.name);
  private readonly defaultTimeouts = {
    emailMs: 20_000,
    pdfMs: 60_000,
    reportMs: 90_000,
  };

  constructor(
    private readonly pdfService: PdfService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async dispatch(jobName: string, payload: unknown): Promise<unknown> {
    switch (jobName) {
      case JobNames.SendEmail:
        return await this.handleSendEmail(payload as SendEmailJobPayload);
      case JobNames.GeneratePdf:
        return await this.handleGeneratePdf(payload as GeneratePdfJobPayload);
      case JobNames.SendReport:
        return await this.handleSendReport(payload as SendReportJobPayload);
      default:
        throw new Error(`Unknown job name: ${jobName}`);
    }
  }

  async dispatchWithRetry(
    jobName: string,
    payload: unknown,
    options: {
      attempts: number;
      backoffMs: number;
      backoffType: 'fixed' | 'exponential';
      delayMs?: number;
    },
  ): Promise<void> {
    const attemptCount = Math.max(1, options.attempts);

    if (options.delayMs && options.delayMs > 0) {
      await this.delay(options.delayMs);
    }

    for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
      try {
        await this.dispatch(jobName, payload);
        return;
      } catch (error) {
        if (attempt === attemptCount) {
          throw error;
        }

        const waitMs = this.computeBackoffDelay(
          options.backoffMs,
          options.backoffType,
          attempt,
        );
        if (waitMs > 0) {
          await this.delay(waitMs);
        }
      }
    }
  }

  private async handleSendEmail(
    payload: SendEmailJobPayload,
  ): Promise<boolean> {
    const { template, payload: templatePayload, meta } = payload;
    const timeoutMs = payload.timeoutMs ?? this.defaultTimeouts.emailMs;

    return await this.runWithTimeout(timeoutMs, async () => {
      if (template === 'voucher-code') {
        return await this.getMailService().sendVoucherCode(
          meta.to,
          String(templatePayload.voucherCode ?? ''),
          typeof templatePayload.patientName === 'string'
            ? templatePayload.patientName
            : undefined,
        );
      }

      if (template === 'account-activation') {
        return await this.getMailService().sendAccountActivation(
          meta.to,
          String(templatePayload.name ?? ''),
          String(templatePayload.activationLink ?? ''),
          typeof templatePayload.institutionName === 'string'
            ? templatePayload.institutionName
            : null,
        );
      }

      throw new Error(`Unsupported email template: ${template}`);
    });
  }

  private async handleGeneratePdf(
    payload: GeneratePdfJobPayload,
  ): Promise<Buffer> {
    const timeoutMs = payload.timeoutMs ?? this.defaultTimeouts.pdfMs;
    return await this.runWithTimeout(timeoutMs, () =>
      this.pdfService.generateFromHtml(payload.html),
    );
  }

  private async handleSendReport(
    payload: SendReportJobPayload,
  ): Promise<unknown> {
    const { sessionId, targetEmail, scope } = payload;
    const timeoutMs = payload.timeoutMs ?? this.defaultTimeouts.reportMs;
    return await this.runWithTimeout(timeoutMs, () =>
      this.getReportOrchestratorService().sendReport(
        sessionId,
        targetEmail,
        scope,
      ),
    );
  }

  private runWithTimeout<T>(
    timeoutMs: number,
    task: (signal?: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error(`Job timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([task(controller.signal), timeoutPromise]).finally(
      () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      },
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private computeBackoffDelay(
    baseMs: number,
    type: 'fixed' | 'exponential',
    attempt: number,
  ): number {
    if (baseMs <= 0) return 0;
    if (type === 'fixed') return baseMs;
    return baseMs * Math.pow(2, Math.max(0, attempt - 1));
  }

  private getMailService(): MailService {
    return this.moduleRef.get(MailService, { strict: false });
  }

  private getReportOrchestratorService(): ReportOrchestratorService {
    return this.moduleRef.get(ReportOrchestratorService, { strict: false });
  }
}
