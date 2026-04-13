import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity';
import { User } from '../../users/entities/user.entity';
import { Session } from '../../sessions/entities/session.entity';
import { VoucherBatch } from './voucher-batch.entity';
import { VoucherOwnerType, VoucherStatus } from './voucher.enums';

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 8, unique: true })
  code: string;

  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @ManyToOne(() => VoucherBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: VoucherBatch;

  @Column({
    name: 'owner_type',
    type: 'enum',
    enum: VoucherOwnerType,
  })
  ownerType: VoucherOwnerType;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser?: User | null;

  @Column({ name: 'owner_institution_id', type: 'uuid', nullable: true })
  ownerInstitutionId: string | null;

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'owner_institution_id' })
  ownerInstitution?: Institution | null;

  @Column({
    type: 'enum',
    enum: VoucherStatus,
    default: VoucherStatus.AVAILABLE,
  })
  status: VoucherStatus = VoucherStatus.AVAILABLE;

  @Column({
    name: 'assigned_patient_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  assignedPatientName: string | null;

  @Column({
    name: 'assigned_patient_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  assignedPatientEmail: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'redeemed_session_id', type: 'uuid', nullable: true })
  redeemedSessionId: string | null;

  @ManyToOne(() => Session, { nullable: true })
  @JoinColumn({ name: 'redeemed_session_id' })
  redeemedSession?: Session | null;

  @Column({ name: 'redeemed_at', type: 'timestamp', nullable: true })
  redeemedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  // Domain Methods for Encapsulation
  assignToPatient(patientName: string, patientEmail: string) {
    if (this.status !== VoucherStatus.AVAILABLE) {
      throw new Error('Voucher is not available to be assigned.');
    }
    this.assignedPatientName = patientName;
    this.assignedPatientEmail = patientEmail;
    this.status = VoucherStatus.SENT;
    this.sentAt = new Date();
  }

  redeem(sessionId: string) {
    if (
      this.status !== VoucherStatus.AVAILABLE &&
      this.status !== VoucherStatus.SENT
    ) {
      throw new Error(
        `Voucher cannot be redeemed. Current status: ${this.status}`,
      );
    }
    if (this.expiresAt && new Date() > this.expiresAt) {
      this.status = VoucherStatus.EXPIRED;
      throw new Error('Voucher has expired.');
    }
    this.status = VoucherStatus.USED;
    this.redeemedSessionId = sessionId;
    this.redeemedAt = new Date();
  }

  revoke() {
    if (this.status === VoucherStatus.USED) {
      throw new Error('Cannot revoke an already used voucher.');
    }
    this.status = VoucherStatus.REVOKED;
    this.assignedPatientName = null;
    this.assignedPatientEmail = null;
  }
}
