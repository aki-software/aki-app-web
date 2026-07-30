import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('stripe_events')
@Index('IDX_stripe_events_stripe_event_id', ['stripeEventId'], { unique: true })
export class StripeEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'stripe_event_id', type: 'varchar' })
  stripeEventId!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({
    name: 'processed_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  processedAt!: Date;

  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;
}
