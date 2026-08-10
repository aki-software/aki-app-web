import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Institution } from '../../institutions/entities/institution.entity.js';
import { VoucherBatchStatus, VoucherOwnerType } from './voucher.enums.js';

@Entity('voucher_batches')
@Index('IDX_voucher_batches_owner_institution_id_status', [
  'ownerInstitutionId',
  'status',
])
@Index('IDX_voucher_batches_owner_institution_id', ['ownerInstitutionId'])
@Index('IDX_voucher_batches_short_code', ['shortCode'], { unique: true })
@Index(
  'IDX_voucher_batches_institution_idempotency',
  ['ownerInstitutionId', 'idempotencyKey'],
  { unique: true },
)
export class VoucherBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'short_code', type: 'varchar', length: 10, unique: true })
  shortCode!: string;

  @Column({
    name: 'owner_type',
    type: 'enum',
    enum: VoucherOwnerType,
  })
  ownerType!: VoucherOwnerType;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser?: User | null;

  @Column({ name: 'owner_institution_id', type: 'uuid', nullable: true })
  ownerInstitutionId!: string | null;

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'owner_institution_id' })
  ownerInstitution?: Institution | null;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  unitPrice!: string;

  @Column({
    name: 'total_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalPrice!: string;

  @Column({ type: 'varchar', length: 3, default: 'ARS' })
  currency!: string;

  @Column({ name: 'expected_amount_minor', type: 'bigint', nullable: true })
  expectedAmountMinor!: string | null;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @Column({ name: 'checkout_url', type: 'text', nullable: true })
  checkoutUrl!: string | null;

  @Column({ name: 'fulfilled_at', type: 'timestamptz', nullable: true })
  fulfilledAt!: Date | null;

  @Column({
    name: 'payment_provider',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  paymentProvider!: string | null;

  @Column({
    name: 'payment_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  paymentReference!: string | null;

  @Column({
    type: 'enum',
    enum: VoucherBatchStatus,
    default: VoucherBatchStatus.PENDING,
  })
  status!: VoucherBatchStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  // Domain Methods for Encapsulation
  markAsPaid() {
    if (this.status === VoucherBatchStatus.CANCELLED) {
      throw new Error('Cannot pay for a cancelled batch.');
    }
    this.status = VoucherBatchStatus.PAID;
    this.paidAt = new Date();
  }

  cancel() {
    if (this.status === VoucherBatchStatus.PAID) {
      throw new Error('Cannot cancel an already paid batch.');
    }
    this.status = VoucherBatchStatus.CANCELLED;
  }

  markAsFailed() {
    if (this.status === VoucherBatchStatus.PAID) {
      throw new Error('Cannot fail an already paid batch.');
    }
    this.status = VoucherBatchStatus.FAILED;
  }
}
