import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserInstitution } from './user-institution.entity.js';
import { UserRole } from '@akit/contracts';

export { UserRole } from '@akit/contracts';

@Entity('users')
@Index('IDX_users_role', ['role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({
    name: 'password_setup_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordSetupToken!: string | null;

  @Column({
    name: 'password_setup_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  passwordSetupExpiresAt!: Date | null;

  @Column({ name: 'password_set_at', type: 'timestamptz', nullable: true })
  passwordSetAt!: Date | null;

  @Column({
    name: 'password_reset_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordResetToken!: string | null;

  @Column({
    name: 'password_reset_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  passwordResetExpiresAt!: Date | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.THERAPIST,
  })
  role!: UserRole;

  @Column({ name: 'tc_accepted_at', type: 'timestamptz', nullable: true })
  tcAcceptedAt!: Date | null;

  @OneToMany(() => UserInstitution, (userInstitution) => userInstitution.user)
  userInstitutions!: UserInstitution[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, select: false })
  deletedAt!: Date | null;
}
