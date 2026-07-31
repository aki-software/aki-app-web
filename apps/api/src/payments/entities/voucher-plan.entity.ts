import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('voucher_plan')
export class VoucherPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ name: 'price_ars', type: 'int' })
  priceArs!: number;

  @Column({ name: 'price_usd', type: 'int', nullable: true })
  priceUsd!: number | null;

  @Column({ name: 'voucher_quantity', type: 'int' })
  voucherQuantity!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_subscription', default: false })
  isSubscription!: boolean;

  @Column({ name: 'billing_cycle', type: 'varchar', nullable: true })
  billingCycle!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
