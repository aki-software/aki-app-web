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
  gateway!: 'MERCADO_PAGO' | 'STRIPE';

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
