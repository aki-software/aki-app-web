import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Institution } from '../../institutions/entities/institution.entity';
import { VoucherBatchStatus, VoucherOwnerType } from './voucher.enums';

@Entity('voucher_batches')
export class VoucherBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  unitPrice: string;

  @Column({
    name: 'total_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalPrice: string;

  @Column({ type: 'varchar', length: 3, default: 'ARS' })
  currency: string;

  @Column({
    name: 'payment_provider',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  paymentProvider: string | null;

  @Column({
    name: 'payment_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  paymentReference: string | null;

  @Column({
    type: 'enum',
    enum: VoucherBatchStatus,
    default: VoucherBatchStatus.PENDING,
  })
  status: VoucherBatchStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  // Domain Methods for Encapsulation
  markAsPaid(paymentProvider: string, paymentReference: string) {
    if (this.status === VoucherBatchStatus.CANCELLED) {
      throw new Error('Cannot pay for a cancelled batch.');
    }
    this.status = VoucherBatchStatus.PAID;
    this.paidAt = new Date();
    this.paymentProvider = paymentProvider;
    this.paymentReference = paymentReference;
  }

  cancel() {
    if (this.status === VoucherBatchStatus.PAID) {
      throw new Error('Cannot cancel an already paid batch.');
    }
    this.status = VoucherBatchStatus.CANCELLED;
  }
}
