import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ReportGrantScope } from './report-grant.entity.js';

export enum ReportAccessAuditEvent {
  GRANT_ISSUED = 'REPORT_GRANT_ISSUED',
  GRANT_RENEWED = 'REPORT_GRANT_RENEWED',
  GRANT_CONSUMED = 'REPORT_GRANT_CONSUMED',
  DOWNLOAD_ACCESSED = 'REPORT_DOWNLOAD_ACCESSED',
  DELIVERY_AUTHORIZED = 'REPORT_DELIVERY_AUTHORIZED',
}

export interface CreateReportAccessAuditInput {
  eventType: ReportAccessAuditEvent;
  reportId: string;
  grantId: string | null;
  actorUserId: string | null;
  scope: ReportGrantScope;
  operationKey: string;
  occurredAt: Date;
  recipientEmail?: string | null;
  outcome?: string | null;
}

@Entity('report_access_audits')
@Index('IDX_report_access_audits_report_id_occurred_at', [
  'reportId',
  'occurredAt',
])
@Index('IDX_report_access_audits_operation_key', ['operationKey'], {
  unique: true,
})
export class ReportAccessAudit {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'report_id', type: 'uuid' }) reportId!: string;
  @Column({ name: 'grant_id', type: 'uuid', nullable: true }) grantId!:
    | string
    | null;
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId!: string | null;
  @Column({ name: 'event_type', type: 'enum', enum: ReportAccessAuditEvent })
  eventType!: ReportAccessAuditEvent;
  @Column({ type: 'text' }) scope!: ReportGrantScope;
  @Column({ name: 'operation_key', type: 'text' }) operationKey!: string;
  @Column({ name: 'occurred_at', type: 'timestamptz' }) occurredAt!: Date;
  @Column({ name: 'recipient_email', type: 'text', nullable: true })
  recipientEmail!: string | null;
  @Column({ type: 'text', nullable: true }) outcome!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  static create(input: CreateReportAccessAuditInput): ReportAccessAudit {
    return Object.assign(new ReportAccessAudit(), input);
  }
}
