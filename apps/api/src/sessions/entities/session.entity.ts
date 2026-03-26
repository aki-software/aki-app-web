import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { SessionResult } from './session-result.entity';
import { SessionSwipe } from './session-swipe.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'varchar', nullable: true })
  patientId: string;

  @Column({ name: 'patient_name', type: 'varchar', length: 255 })
  patientName: string;

  @Column({ name: 'session_date', type: 'timestamp' })
  sessionDate: Date;

  @Column({ name: 'holland_code', type: 'varchar', length: 20, nullable: true })
  hollandCode: string;

  @Column({ name: 'total_time_ms', type: 'bigint', nullable: true })
  totalTimeMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'report_url', type: 'text', nullable: true })
  reportUrl: string;

  @OneToMany('SessionResult', (result: any) => result.session, {
    cascade: true,
  })
  results: SessionResult[];

  @OneToMany('SessionSwipe', (swipe: any) => swipe.session, { cascade: true })
  swipes: SessionSwipe[];
}
