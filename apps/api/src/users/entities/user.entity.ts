import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  THERAPIST = 'THERAPIST',
  PATIENT = 'PATIENT',
}

@Entity('users')
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
}
