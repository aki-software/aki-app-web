import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SessionPaymentStatus } from '@akit/contracts';
export { SessionPaymentStatus };
import { SessionResult } from './session-result.entity.js';
import { SessionSwipe } from './session-swipe.entity.js';
import type { SessionMetrics } from './session-metrics.entity.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Institution } from '../../institutions/entities/institution.entity.js';

@Entity('sessions')
@Index('IDX_sessions_institution_id', ['institutionId'])
@Index('IDX_sessions_therapist_user_id', ['therapistUserId'])
@Index('IDX_sessions_payment_status', ['paymentStatus'])
@Index('IDX_sessions_voucher_id', ['voucherId'])
@Index('IDX_sessions_institution_id_created_at', ['institutionId', 'createdAt'])
@Index('IDX_sessions_payment_reference_unique', ['paymentReference'], {
  unique: true,
  where: 'payment_reference IS NOT NULL',
})
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'therapist_user_id', type: 'uuid', nullable: true })
  therapistUserId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'therapist_user_id' })
  therapist?: User | null;

  @Column({ name: 'institution_id', type: 'uuid', nullable: true })
  institutionId!: string | null;

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'institution_id' })
  institution?: Institution | null;

  @Column({ name: 'patient_id', type: 'uuid', nullable: true })
  patientId!: string | null;

  @Column({ name: 'patient_name', type: 'varchar', length: 255 })
  patientName!: string;

  @Column({ name: 'session_date', type: 'timestamptz' })
  sessionDate!: Date;

  @Column({
    name: 'sync_key',
    type: 'varchar',
    length: 128,
    nullable: true,
    unique: true,
    select: false,
  })
  syncKey!: string | null;

  @Column({ name: 'holland_code', type: 'varchar', length: 20, nullable: true })
  hollandCode!: string;

  @Column({ name: 'total_time_ms', type: 'bigint', nullable: true })
  totalTimeMs!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'report_url', type: 'text', nullable: true })
  reportUrl!: string | null;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: SessionPaymentStatus,
    default: SessionPaymentStatus.PENDING,
  })
  paymentStatus!: SessionPaymentStatus;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId!: string | null;

  @ManyToOne(() => Voucher, { nullable: true })
  @JoinColumn({ name: 'voucher_id' })
  voucher?: Voucher | null;

  @Column({ name: 'report_unlocked_at', type: 'timestamptz', nullable: true })
  reportUnlockedAt!: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({
    name: 'payment_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  paymentReference!: string | null;

  @OneToMany('SessionResult', (result: any) => result.session, {
    cascade: true,
  })
  results!: SessionResult[];

  @OneToMany('SessionSwipe', (swipe: any) => swipe.session, { cascade: true })
  swipes!: SessionSwipe[];

  @OneToOne('SessionMetrics', 'session', {
    cascade: true,
  })
  metrics?: SessionMetrics;
}
