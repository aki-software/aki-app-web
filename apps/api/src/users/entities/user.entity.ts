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
import { Institution } from '../../institutions/entities/institution.entity.js';
import { UserRole } from '@akit/contracts';

export { UserRole } from '@akit/contracts';

@Entity('users')
@Index('IDX_users_institution_id', ['institutionId'])
@Index('IDX_users_role', ['role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({
    name: 'password_setup_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordSetupToken: string | null;

  @Column({
    name: 'password_setup_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  passwordSetupExpiresAt: Date | null;

  @Column({ name: 'password_set_at', type: 'timestamp', nullable: true })
  passwordSetAt: Date | null;

  @Column({
    name: 'password_reset_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordResetToken: string | null;

  @Column({
    name: 'password_reset_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  passwordResetExpiresAt: Date | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.THERAPIST,
  })
  role: UserRole;

  @Column({ name: 'institution_id', type: 'uuid', nullable: true })
  institutionId: string | null;

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'institution_id' })
  institution?: Institution | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, select: false })
  deletedAt: Date | null;
}
