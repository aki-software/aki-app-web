import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('institutions')
@Index('IDX_institutions_name', ['name'])
export class Institution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'billing_email', type: 'varchar', nullable: true })
  billingEmail!: string | null;

  @Column({ name: 'legal_name', type: 'varchar', nullable: true })
  legalName!: string | null;

  @Column({ name: 'tax_id', type: 'varchar', nullable: true })
  taxId!: string | null;

  @Column({ name: 'tax_condition', type: 'varchar', nullable: true })
  taxCondition!: string | null;

  @Column({ name: 'billing_address', type: 'text', nullable: true })
  billingAddress!: string | null;

  @Column({
    name: 'responsible_therapist_user_id',
    type: 'uuid',
    nullable: true,
  })
  responsibleTherapistUserId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsible_therapist_user_id' })
  responsibleTherapist?: User | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, select: false })
  deletedAt!: Date | null;

  // Domain Methods for Encapsulation
  deactivate() {
    this.isActive = false;
  }

  activate() {
    this.isActive = true;
  }

  updateBillingEmail(email: string) {
    if (!email.includes('@')) {
      throw new Error('Invalid email format for billing.');
    }
    this.billingEmail = email;
  }

  updateBillingProfile(
    legalName: string | null,
    taxId: string | null,
    taxCondition: string | null,
    billingAddress: string | null,
  ) {
    this.legalName = legalName;
    this.taxId = taxId;
    this.taxCondition = taxCondition;
    this.billingAddress = billingAddress;
  }
}
