import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import type { User } from './user.entity.js';
import { Institution } from '../../institutions/entities/institution.entity.js';

@Entity('user_institutions')
@Index('IDX_user_institutions_user_id', ['userId'])
@Index('IDX_user_institutions_institution_id', ['institutionId'])
export class UserInstitution {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'institution_id', type: 'uuid' })
  institutionId!: string;

  @Column({ type: 'text' })
  role!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('User', 'userInstitutions', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @ManyToOne(() => Institution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institution_id' })
  institution!: Institution;
}
