import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SessionResult } from './session-result.entity';
import { SessionSwipe } from './session-swipe.entity';
import { Voucher } from '../../vouchers/entities/voucher.entity';
import { User } from '../../users/entities/user.entity';
import { Institution } from '../../institutions/entities/institution.entity';

export enum SessionPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  VOUCHER_REDEEMED = 'VOUCHER_REDEEMED',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'therapist_user_id', type: 'uuid', nullable: true })
  therapistUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'therapist_user_id' })
  therapist?: User | null;

  @Column({ name: 'institution_id', type: 'uuid', nullable: true })
  institutionId: string | null;

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'institution_id' })
  institution?: Institution | null;

  @Column({ name: 'patient_id', type: 'uuid', nullable: true })
  patientId: string | null;

  @Column({ name: 'patient_name', type: 'varchar', length: 255 })
  patientName: string;

  @Column({ name: 'session_date', type: 'timestamp' })
  sessionDate: Date;

  @Column({ name: 'holland_code', type: 'varchar', length: 20, nullable: true })
  hollandCode: string;

  @Column({ name: 'total_time_ms', type: 'bigint', nullable: true })
  totalTimeMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'report_url', type: 'text', nullable: true })
  reportUrl: string | null;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: SessionPaymentStatus,
    default: SessionPaymentStatus.PENDING,
  })
  paymentStatus: SessionPaymentStatus;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId: string | null;

  @ManyToOne(() => Voucher, { nullable: true })
  @JoinColumn({ name: 'voucher_id' })
  voucher?: Voucher | null;

  @Column({ name: 'report_unlocked_at', type: 'timestamp', nullable: true })
  reportUnlockedAt: Date | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'payment_reference', type: 'varchar', length: 255, nullable: true })
  paymentReference: string | null;

  @OneToMany('SessionResult', (result: any) => result.session, {
    cascade: true,
  })
  results: SessionResult[];

  @OneToMany('SessionSwipe', (swipe: any) => swipe.session, { cascade: true })
  swipes: SessionSwipe[];
}
