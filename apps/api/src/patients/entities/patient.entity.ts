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

@Entity('patients')
@Index('IDX_patients_institution_id', ['institutionId'])
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({
    name: 'firebase_uid',
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  firebaseUid!: string | null;

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

  @Column({ name: 'institution_id', type: 'uuid', nullable: true })
  institutionId!: string | null;

  @ManyToOne(() => Institution, { nullable: true })
  @JoinColumn({ name: 'institution_id' })
  institution?: Institution | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, select: false })
  deletedAt!: Date | null;
}
