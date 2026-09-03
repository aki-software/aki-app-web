import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  PaymentNotificationDeliveryStatus as PaymentNotificationDeliveryStatusSchema,
  PaymentNotificationErrorClassification as PaymentNotificationErrorClassificationSchema,
  PaymentNotificationRecipientKind as PaymentNotificationRecipientKindSchema,
} from '@akit/contracts';
import type {
  PaymentNotificationContextSnapshotV1,
  PaymentNotificationDeliveryStatus,
  PaymentNotificationErrorClassification,
  PaymentNotificationRecipientKind,
} from '@akit/contracts';
import { User } from '../../users/entities/user.entity.js';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';

export const PAYMENT_NOTIFICATION_RECIPIENT_KINDS =
  PaymentNotificationRecipientKindSchema.options;
export const PAYMENT_NOTIFICATION_DELIVERY_STATUSES =
  PaymentNotificationDeliveryStatusSchema.options;
export const PAYMENT_NOTIFICATION_ERROR_CLASSIFICATIONS =
  PaymentNotificationErrorClassificationSchema.options;

@Entity('payment_notification_deliveries')
@Index(
  'UQ_payment_notification_deliveries_batch_kind',
  ['voucherBatchId', 'recipientKind'],
  { unique: true },
)
@Index('IDX_payment_notification_deliveries_recipient_user', [
  'recipientUserId',
])
export class PaymentNotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'voucher_batch_id', type: 'uuid' })
  voucherBatchId!: string;

  @ManyToOne(() => VoucherBatch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'voucher_batch_id' })
  voucherBatch!: VoucherBatch;

  @Column({ name: 'recipient_kind', type: 'text' })
  recipientKind!: PaymentNotificationRecipientKind;

  @Column({ name: 'recipient_user_id', type: 'uuid', nullable: true })
  recipientUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser!: User | null;

  @Column({ name: 'recipient_email_snapshot', type: 'text', nullable: true })
  recipientEmailSnapshot!: string | null;

  @Column({ name: 'recipient_name_snapshot', type: 'text', nullable: true })
  recipientNameSnapshot!: string | null;

  @Column({
    name: 'recipient_resolved_at',
    type: 'timestamptz',
    nullable: true,
  })
  recipientResolvedAt!: Date | null;

  @Column({ name: 'context_snapshot', type: 'jsonb' })
  contextSnapshot!: PaymentNotificationContextSnapshotV1;

  @Column({ type: 'text', default: 'PENDING' })
  status!: PaymentNotificationDeliveryStatus;

  @Column({ name: 'attempt_count', type: 'integer', default: 0 })
  attemptCount!: number;

  @Column({ name: 'enqueue_attempt_count', type: 'integer', default: 0 })
  enqueueAttemptCount!: number;

  @Column({ name: 'last_error_classification', type: 'text', nullable: true })
  lastErrorClassification!: PaymentNotificationErrorClassification | null;

  @Column({ name: 'last_error_message', type: 'text', nullable: true })
  lastErrorMessage!: string | null;

  @Column({ name: 'next_attempt_at', type: 'timestamptz', nullable: true })
  nextAttemptAt!: Date | null;

  @Column({ name: 'queued_at', type: 'timestamptz', nullable: true })
  queuedAt!: Date | null;

  @Column({ name: 'last_attempt_at', type: 'timestamptz', nullable: true })
  lastAttemptAt!: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
