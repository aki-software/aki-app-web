import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity.js';
import type { CommercialSnapshot } from '@akit/contracts';

export type CompleteCommercialSnapshot = Extract<
  CommercialSnapshot,
  { kind: 'COMPLETE' }
>;

export type CheckoutAttemptState =
  | 'CREATED'
  | 'PROVIDER_CREATING'
  | 'READY'
  | 'FAILED'
  | 'OUTCOME_UNKNOWN';

@Entity('checkout_attempts')
@Index(
  'IDX_checkout_attempts_provider_idempotency_key',
  ['providerIdempotencyKey'],
  {
    unique: true,
  },
)
@Index('IDX_checkout_attempts_tenant_state', ['ownerInstitutionId', 'state'])
export class CheckoutAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_institution_id', type: 'uuid' })
  ownerInstitutionId!: string;

  @ManyToOne(() => Institution, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_institution_id' })
  ownerInstitution!: Institution;

  @Column({ name: 'buyer_user_id', type: 'uuid' })
  buyerUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'buyer_user_id' })
  buyerUser!: User;

  @Column({ type: 'text' })
  gateway!: 'MERCADO_PAGO' | 'STRIPE';

  @Column({ type: 'text', default: 'CREATED' })
  state!: CheckoutAttemptState;

  @Column({
    name: 'client_key_digest',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  clientKeyDigest!: string | null;

  @Column({ name: 'request_fingerprint', type: 'varchar', length: 64 })
  requestFingerprint!: string;

  @Column({
    name: 'provider_idempotency_key',
    type: 'varchar',
    length: 43,
  })
  providerIdempotencyKey!: string;

  @Column({ name: 'commercial_snapshot', type: 'jsonb' })
  commercialSnapshot!: CompleteCommercialSnapshot;

  @Column({ name: 'voucher_batch_id', type: 'uuid', nullable: true })
  voucherBatchId!: string | null;

  @OneToOne(() => VoucherBatch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voucher_batch_id' })
  voucherBatch!: VoucherBatch | null;

  @Column({ name: 'provider_checkout_id', type: 'text', nullable: true })
  providerCheckoutId!: string | null;

  @Column({ name: 'provider_checkout_url', type: 'text', nullable: true })
  providerCheckoutUrl!: string | null;

  @Column({ name: 'provider_error_code', type: 'text', nullable: true })
  providerErrorCode!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
