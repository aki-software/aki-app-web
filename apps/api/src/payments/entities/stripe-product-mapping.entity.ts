import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum StripeCurrency {
  USD = 'usd',
  ARS = 'ars',
}

@Entity('stripe_product_mappings')
@Index('IDX_stripe_product_mappings_stripe_price_id', ['stripePriceId'], {
  unique: true,
})
export class StripeProductMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'stripe_price_id', type: 'varchar' })
  stripePriceId!: string;

  @Column({
    type: 'enum',
    enum: StripeCurrency,
  })
  currency!: StripeCurrency;

  @Column({ name: 'voucher_quantity', type: 'int' })
  voucherQuantity!: number;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
