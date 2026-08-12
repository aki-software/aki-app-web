import { createHash } from 'node:crypto';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ReportGrantScope =
  | 'PATIENT'
  | 'THERAPIST'
  | 'INSTITUTION'
  | 'ADMIN';

export interface CreateReportGrantInput {
  reportId: string;
  token: string;
  expiresAt: Date;
  scope: ReportGrantScope;
}

@Entity('report_grants')
@Index('IDX_report_grants_report_id', ['reportId'])
@Index('IDX_report_grants_token_hash', ['tokenHash'], { unique: true })
@Index('IDX_report_grants_expires_at', ['expiresAt'])
export class ReportGrant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId!: string;

  @Column({ name: 'token_hash', type: 'text' })
  tokenHash!: string;

  @Column({ type: 'text' })
  scope!: ReportGrantScope;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  static create(input: CreateReportGrantInput): ReportGrant {
    const grant = new ReportGrant();
    grant.reportId = input.reportId;
    grant.tokenHash = createHash('sha256').update(input.token).digest('hex');
    grant.scope = input.scope;
    grant.expiresAt = input.expiresAt;
    grant.usedAt = null;
    return grant;
  }

  consume(at: Date): boolean {
    if (this.usedAt || this.expiresAt.getTime() <= at.getTime()) {
      return false;
    }

    this.usedAt = at;
    return true;
  }
}
