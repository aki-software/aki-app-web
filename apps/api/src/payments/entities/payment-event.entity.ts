import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';

@Entity('payment_event')
export class PaymentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  gateway: 'MERCADO_PAGO' | 'STRIPE';

  @Column({ type: 'varchar', unique: true })
  externalPaymentId: string;

  @Column({ type: 'varchar' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

  @Column({ type: 'jsonb', nullable: true })
  rawPayload: any;

  @Column({ type: 'uuid', nullable: true })
  voucherBatchId: string;

  @ManyToOne(() => VoucherBatch, { nullable: true })
  @JoinColumn({ name: 'voucherBatchId' })
  voucherBatch: VoucherBatch;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
