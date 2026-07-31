import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PaymentEventStatus } from '../enums/payment-event-status.enum.js';

@Entity('payment_event')
@Index('UQ_payment_event_gateway', ['gatewayName', 'gatewayPaymentId'], {
  unique: true,
})
export class PaymentEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'gateway_name', type: 'varchar' })
  gatewayName!: string;

  @Column({ name: 'gateway_payment_id', type: 'varchar' })
  gatewayPaymentId!: string;

  @Column({ name: 'gateway_event_type', type: 'varchar' })
  gatewayEventType!: string;

  @Column({ type: 'enum', enum: PaymentEventStatus })
  status!: PaymentEventStatus;

  @Column({ name: 'amount_paid', type: 'int' })
  amountPaid!: number;

  @Column({ type: 'varchar' })
  currency!: string;

  @Column({ name: 'voucher_plan_id', type: 'uuid', nullable: true })
  voucherPlanId!: string | null;

  @Column({ name: 'institution_id', type: 'uuid', nullable: true })
  institutionId!: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload!: Record<string, unknown> | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
