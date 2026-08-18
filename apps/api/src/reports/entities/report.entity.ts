import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ReportData } from '../../common/types/report.types.js';
import type { Session } from '../../sessions/entities/session.entity.js';

export enum ReportEntitlementSource {
  GOOGLE_PLAY = 'GOOGLE_PLAY',
  VOUCHER = 'VOUCHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  AVAILABLE = 'AVAILABLE',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
  STORAGE_PENDING = 'STORAGE_PENDING',
}

export interface ReportInputSnapshot {
  generatedAt: string;
  assessmentAt: string;
  data: ReportData;
}

export interface CreatePendingReportInput {
  sessionId: string;
  entitlementSource: ReportEntitlementSource;
  entitledUserId?: string | null;
  entitledPatientId?: string | null;
  generatedAt: Date;
  inputSnapshot?: ReportInputSnapshot;
  voucherId?: string | null;
}

export interface AvailableReportObject {
  objectKey: string;
  contentHash: string;
  generatedAt: Date;
}

@Entity('reports')
@Index('IDX_reports_session_id_version', ['sessionId', 'version'], {
  unique: true,
})
@Index('IDX_reports_entitled_user_id_status', ['entitledUserId', 'status'])
@Index('IDX_reports_entitled_patient_id_status', [
  'entitledPatientId',
  'status',
])
@Index('IDX_reports_available_until', ['availableUntil'])
@Index('IDX_reports_voucher_id', ['voucherId'])
@Check(
  'CHK_reports_entitlement_voucher',
  `("entitlement_source" = 'VOUCHER' AND "voucher_id" IS NOT NULL) OR ("entitlement_source" = 'GOOGLE_PLAY' AND "voucher_id" IS NULL)`,
)
@Check(
  'CHK_reports_entitled_principal',
  `("entitled_user_id" IS NULL) <> ("entitled_patient_id" IS NULL)`,
)
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @ManyToOne('Session', 'reports', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'session_id' })
  session!: Session;

  @Column({
    name: 'entitlement_source',
    type: 'enum',
    enum: ReportEntitlementSource,
  })
  entitlementSource!: ReportEntitlementSource;

  @Column({ name: 'entitled_user_id', type: 'uuid', nullable: true })
  entitledUserId!: string | null;

  @Column({ name: 'entitled_patient_id', type: 'uuid', nullable: true })
  entitledPatientId!: string | null;

  @ManyToOne('Patient', { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'entitled_patient_id' })
  entitledPatient?: unknown;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId!: string | null;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus = ReportStatus.PENDING;

  @Column({ type: 'integer', default: 1 })
  version: number = 1;

  @Column({ name: 'input_snapshot', type: 'jsonb', nullable: true })
  inputSnapshot!: ReportInputSnapshot | null;

  @Column({ name: 'object_key', type: 'text', nullable: true })
  objectKey!: string | null;

  @Column({ name: 'content_hash', type: 'text', nullable: true })
  contentHash!: string | null;

  @Column({ name: 'generated_at', type: 'timestamptz', nullable: true })
  generatedAt!: Date | null;

  @Column({ name: 'available_until', type: 'timestamptz', nullable: true })
  availableUntil!: Date | null;

  @Column({ name: 'last_accessed_at', type: 'timestamptz', nullable: true })
  lastAccessedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  static createPending(input: CreatePendingReportInput): Report {
    const voucherId = input.voucherId ?? null;
    if (
      (input.entitlementSource === ReportEntitlementSource.VOUCHER &&
        !voucherId) ||
      (input.entitlementSource === ReportEntitlementSource.GOOGLE_PLAY &&
        voucherId)
    ) {
      throw new Error('Invalid report voucher provenance.');
    }
    const entitledUserId = input.entitledUserId ?? null;
    const entitledPatientId = input.entitledPatientId ?? null;
    if ((entitledUserId === null) === (entitledPatientId === null)) {
      throw new Error('Report requires exactly one entitled principal.');
    }
    const report = new Report();
    report.sessionId = input.sessionId;
    report.entitlementSource = input.entitlementSource;
    report.entitledUserId = entitledUserId;
    report.entitledPatientId = entitledPatientId;
    report.voucherId = voucherId;
    report.inputSnapshot = input.inputSnapshot ?? null;
    report.generatedAt = null;
    report.objectKey = null;
    report.contentHash = null;
    report.availableUntil = null;
    return report;
  }

  markAvailable(object: AvailableReportObject): void {
    if (this.status === ReportStatus.AVAILABLE) return;
    if (this.objectKey || this.contentHash || this.generatedAt) {
      throw new Error('Report metadata is immutable once available.');
    }
    this.objectKey = object.objectKey;
    this.contentHash = object.contentHash;
    this.generatedAt = object.generatedAt;
    const availableAt = object.generatedAt;
    const year = availableAt.getUTCFullYear() + 1;
    const month = availableAt.getUTCMonth();
    const finalDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    this.availableUntil = new Date(
      Date.UTC(
        year,
        month,
        Math.min(availableAt.getUTCDate(), finalDayOfMonth),
        availableAt.getUTCHours(),
        availableAt.getUTCMinutes(),
        availableAt.getUTCSeconds(),
        availableAt.getUTCMilliseconds(),
      ),
    );
    this.status = ReportStatus.AVAILABLE;
  }

  markStoragePending(): void {
    if (this.status === ReportStatus.STORAGE_PENDING) return;
    if (this.status !== ReportStatus.GENERATING) {
      throw new Error('Only generating reports can await storage.');
    }
    this.status = ReportStatus.STORAGE_PENDING;
  }

  markGenerating(): void {
    if (this.status !== ReportStatus.PENDING) {
      throw new Error('Only pending reports can be generated.');
    }
    this.status = ReportStatus.GENERATING;
  }

  markFailed(): void {
    if (
      this.status !== ReportStatus.PENDING &&
      this.status !== ReportStatus.GENERATING
    ) {
      throw new Error('Only pending or generating reports can fail.');
    }
    this.status = ReportStatus.FAILED;
  }

  retry(): void {
    if (this.status !== ReportStatus.FAILED) {
      throw new Error('Only failed reports can be retried.');
    }
    this.status = ReportStatus.PENDING;
  }
}
