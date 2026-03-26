import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity';
import { User } from '../../users/entities/user.entity';

export enum VoucherStatus {
  AVAILABLE = 'AVAILABLE',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 12, unique: true })
  code: string;

  @Column({ name: 'institution_id', type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution)
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({ name: 'patient_id', type: 'uuid', nullable: true })
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({
    type: 'enum',
    enum: VoucherStatus,
    default: VoucherStatus.AVAILABLE,
  })
  status: VoucherStatus = VoucherStatus.AVAILABLE;

  @Column({ name: 'report_id', type: 'uuid', nullable: true })
  reportId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'redeemed_at', type: 'timestamp', nullable: true })
  redeemedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;
}
