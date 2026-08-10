import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payment_fulfillment_outbox')
@Index('IDX_payment_fulfillment_outbox_batch', ['voucherBatchId'], {
  unique: true,
})
export class PaymentFulfillmentOutbox {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'voucher_batch_id', type: 'uuid' })
  voucherBatchId!: string;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
