import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import type { UserInstitution } from '../../users/entities/user-institution.entity.js';

@Entity('institutions')
@Index('IDX_institutions_name', ['name'])
export class Institution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'billing_email', type: 'varchar', nullable: true })
  billingEmail!: string | null;

  @Column({ name: 'logo_url', type: 'varchar', nullable: true })
  logoUrl!: string | null;

  @Column({
    name: 'responsible_therapist_user_id',
    type: 'uuid',
    nullable: true,
  })
  responsibleTherapistUserId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsible_therapist_user_id' })
  responsibleTherapist?: User | null;

  @OneToMany('UserInstitution', 'institution')
  userInstitutions!: Relation<UserInstitution>[];

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
}
