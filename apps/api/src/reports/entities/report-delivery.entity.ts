import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReportDeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

@Entity('report_deliveries')
@Index(
  'UQ_report_deliveries_report_recipient',
  ['reportId', 'recipientEmail'],
  {
    unique: true,
  },
)
export class ReportDelivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId!: string;

  @Column({ name: 'recipient_email', type: 'text' })
  recipientEmail!: string;

  @Column({
    type: 'enum',
    enum: ReportDeliveryStatus,
    default: ReportDeliveryStatus.PENDING,
  })
  status!: ReportDeliveryStatus;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
