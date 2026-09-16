import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';
import { CheckoutAttempt } from './checkout-attempt.entity.js';
import type { Session } from '../../sessions/entities/session.entity.js';

@Entity('payment_event')
@Index(
  'IDX_payment_event_gateway_external_payment',
  ['gateway', 'externalPaymentId'],
  {
    unique: true,
  },
)
export class PaymentEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  gateway!: 'MERCADO_PAGO' | 'STRIPE' | 'GOOGLE_PLAY';

  @Column({ type: 'varchar' })
  externalPaymentId!: string;

  @Column({ type: 'varchar' })
  status!: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

  @Column({
    name: 'payload_digest',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  payloadDigest!: string | null;

  @Column({ type: 'uuid', nullable: true })
  voucherBatchId!: string;

  @ManyToOne(() => VoucherBatch, { nullable: true })
  @JoinColumn({ name: 'voucherBatchId' })
  voucherBatch!: VoucherBatch;

  @Column({ name: 'checkout_attempt_id', type: 'uuid', nullable: true })
  checkoutAttemptId!: string | null;

  @ManyToOne(() => CheckoutAttempt, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'checkout_attempt_id' })
  checkoutAttempt!: CheckoutAttempt | null;

  /** Set for B2C Google Play payments; links the event to the session whose
   *  report was unlocked by this purchase. NULL for B2B voucher-batch payments. */
  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId!: string | null;

  @ManyToOne('Session', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'session_id' })
  session!: Session | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
