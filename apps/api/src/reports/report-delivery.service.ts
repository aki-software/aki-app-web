import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportGeneratedEvent } from '../events/domain-events.js';
import { Report } from './entities/report.entity.js';
import {
  ReportDelivery,
  ReportDeliveryStatus,
} from './entities/report-delivery.entity.js';

@Injectable()
export class ReportDeliveryService {
  constructor(
    @InjectRepository(ReportDelivery)
    private readonly deliveries: Repository<ReportDelivery>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async request(
    reportId: string,
    recipientEmail: string,
  ): Promise<{ queued: boolean; idempotent: boolean }> {
    const normalizedEmail = recipientEmail.trim().toLowerCase();
    const existing = await this.find(reportId, normalizedEmail);
    if (existing)
      return {
        queued: existing.status !== ReportDeliveryStatus.DELIVERED,
        idempotent: true,
      };

    const delivery = this.deliveries.create({
      reportId,
      recipientEmail: normalizedEmail,
      status: ReportDeliveryStatus.PENDING,
      attempts: 0,
    });
    try {
      await this.deliveries.save(delivery);
      return { queued: true, idempotent: false };
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;
      return { queued: false, idempotent: true };
    }
  }

  async deliver(
    report: Report,
    recipientEmail: string | undefined,
    pdfBuffer: Buffer,
  ): Promise<void> {
    if (!recipientEmail) return;

    const delivery = await this.claim(report.id, recipientEmail);
    if (!delivery) return;

    try {
      await this.eventEmitter.emitAsync(
        'report.generated',
        new ReportGeneratedEvent(
          null,
          recipientEmail,
          pdfBuffer,
          report.inputSnapshot?.data.summary,
        ),
      );
      await this.markDelivered(delivery);
    } catch (error) {
      await this.markFailed(delivery);
      throw error;
    }
  }

  async claim(
    reportId: string,
    recipientEmail: string,
  ): Promise<ReportDelivery | null> {
    const normalizedEmail = recipientEmail.trim().toLowerCase();
    const existing = await this.find(reportId, normalizedEmail);
    if (existing?.status === ReportDeliveryStatus.DELIVERED) return null;

    if (existing) {
      existing.status = ReportDeliveryStatus.PENDING;
      existing.attempts += 1;
      return this.deliveries.save(existing);
    }

    const delivery = this.deliveries.create({
      reportId,
      recipientEmail: normalizedEmail,
      status: ReportDeliveryStatus.PENDING,
      attempts: 1,
    });

    try {
      return await this.deliveries.save(delivery);
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;

      const concurrentDelivery = await this.find(reportId, normalizedEmail);
      if (!concurrentDelivery) throw error;
      if (concurrentDelivery.status === ReportDeliveryStatus.DELIVERED) return null;
      concurrentDelivery.status = ReportDeliveryStatus.PENDING;
      concurrentDelivery.attempts += 1;
      return this.deliveries.save(concurrentDelivery);
    }
  }

  async markDelivered(delivery: ReportDelivery): Promise<void> {
    delivery.status = ReportDeliveryStatus.DELIVERED;
    await this.deliveries.save(delivery);
  }

  async markFailed(delivery: ReportDelivery): Promise<void> {
    delivery.status = ReportDeliveryStatus.FAILED;
    await this.deliveries.save(delivery);
  }

  private find(
    reportId: string,
    recipientEmail: string,
  ): Promise<ReportDelivery | null> {
    return this.deliveries.findOne({ where: { reportId, recipientEmail } });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (error as { code?: string }).code === '23505';
  }
}
