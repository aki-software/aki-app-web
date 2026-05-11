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

  async dispatch(jobName: JobNames, payload: unknown): Promise<unknown> {
    const context = this.getJobContext(jobName, payload);
    this.logger.log(
      `job-dispatch start jobName=${jobName} jobId=${context.jobId ?? 'none'} sessionId=${context.sessionId ?? 'none'} voucherId=${context.voucherId ?? 'none'}`,
    );
    const startedAt = Date.now();

    switch (jobName) {
      case JobNames.SendEmail:
        return await this.trackJobDuration('email', startedAt, context, () =>
          this.handleSendEmail(payload as SendEmailJobPayload),
        );
      case JobNames.GeneratePdf:
        return await this.trackJobDuration('pdf', startedAt, context, () =>
          this.handleGeneratePdf(payload as GeneratePdfJobPayload),
        );
      case JobNames.SendReport:
        return await this.trackJobDuration('report', startedAt, context, () =>
          this.handleSendReport(payload as SendReportJobPayload),
        );
      default:
        throw new Error(`Unknown job name: ${String(jobName)}`);
    }
  }

  async dispatchWithRetry(
    jobName: JobNames,
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
        const { jobId, sessionId, voucherId } = this.getJobContext(
          jobName,
          payload,
        );
        this.logger.log(
          `job-dispatch attempt jobName=${jobName} attempt=${attempt}/${attemptCount} jobId=${jobId ?? 'none'} sessionId=${sessionId ?? 'none'} voucherId=${voucherId ?? 'none'}`,
        );
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
    const jobId = payload.jobId ?? 'none';
    const sessionId = meta.sessionId ?? 'none';
    const voucherId = meta.voucherId ?? 'none';

    return await this.runWithTimeout(timeoutMs, async () => {
      if (template === 'voucher-code') {
        this.logger.log(
          `job-mail voucher-code jobId=${jobId} sessionId=${sessionId} voucherId=${voucherId} to=${meta.to}`,
        );
        return await this.getMailService().sendVoucherCode(
          meta.to,
          typeof templatePayload.voucherCode === 'string'
            ? templatePayload.voucherCode
            : '',
          typeof templatePayload.patientName === 'string'
            ? templatePayload.patientName
            : undefined,
        );
      }

      if (template === 'account-activation') {
        this.logger.log(
          `job-mail account-activation jobId=${jobId} sessionId=${sessionId} voucherId=${voucherId} to=${meta.to}`,
        );
        return await this.getMailService().sendAccountActivation(
          meta.to,
          typeof templatePayload.name === 'string' ? templatePayload.name : '',
          typeof templatePayload.activationLink === 'string'
            ? templatePayload.activationLink
            : '',
          typeof templatePayload.institutionName === 'string'
            ? templatePayload.institutionName
            : null,
        );
      }

      if (template === 'password-reset') {
        this.logger.log(
          `job-mail password-reset jobId=${jobId} sessionId=${sessionId} voucherId=${voucherId} to=${meta.to}`,
        );
        return await this.getMailService().sendPasswordReset(
          meta.to,
          typeof templatePayload.name === 'string' ? templatePayload.name : '',
          typeof templatePayload.resetLink === 'string'
            ? templatePayload.resetLink
            : '',
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
    const { sessionId, targetEmail, scope, voucherId } = payload;
    const timeoutMs = payload.timeoutMs ?? this.defaultTimeouts.reportMs;
    this.logger.log(
      `job-report dispatch jobId=${payload.jobId ?? 'none'} sessionId=${sessionId} voucherId=${voucherId ?? 'none'} targetEmail=${targetEmail}`,
    );
    return await this.runWithTimeout(timeoutMs, () =>
      this.getReportOrchestratorService().sendReport(
        sessionId,
        targetEmail,
        voucherId,
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

  private getJobContext(
    jobName: JobNames,
    payload: unknown,
  ): { jobId?: string; sessionId?: string; voucherId?: string | null } {
    if (jobName === JobNames.SendEmail) {
      const jobPayload = payload as SendEmailJobPayload & { jobId?: string };
      return {
        jobId: jobPayload.jobId,
        sessionId: jobPayload.meta?.sessionId,
        voucherId: jobPayload.meta?.voucherId,
      };
    }

    if (jobName === JobNames.SendReport) {
      const jobPayload = payload as SendReportJobPayload & { jobId?: string };
      return {
        jobId: jobPayload.jobId,
        sessionId: jobPayload.sessionId,
        voucherId: jobPayload.voucherId,
      };
    }

    const jobPayload = payload as GeneratePdfJobPayload & { jobId?: string };
    return { jobId: jobPayload.jobId };
  }

  private async trackJobDuration<T>(
    jobType: 'email' | 'pdf' | 'report',
    startedAt: number,
    context: { jobId?: string; sessionId?: string; voucherId?: string | null },
    task: () => Promise<T>,
  ): Promise<T> {
    try {
      return await task();
    } finally {
      const elapsedMs = Date.now() - startedAt;
      this.logger.log(
        `job-duration type=${jobType} durationMs=${elapsedMs} jobId=${context.jobId ?? 'none'} sessionId=${context.sessionId ?? 'none'} voucherId=${context.voucherId ?? 'none'}`,
      );
    }
  }
}
