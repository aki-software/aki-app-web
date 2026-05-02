import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Session } from './session.entity';

@Entity('session_metrics')
export class SessionMetrics {
  @PrimaryColumn({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @OneToOne(() => Session, (session) => session.metrics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ name: 'total_duration_ms', type: 'bigint' })
  totalDurationMs: number;

  @Column({ name: 'total_swipes', type: 'int' })
  totalSwipes: number;

  @Column({ name: 'unique_cards', type: 'int' })
  uniqueCards: number;

  @Column({ name: 'reverted_matches', type: 'int' })
  revertedMatches: number;

  @Column({ name: 'avg_time_between_swipes_ms', type: 'int' })
  avgTimeBetweenSwipesMs: number;

  @Column({ name: 'min_time_between_swipes_ms', type: 'int' })
  minTimeBetweenSwipesMs: number;

  @Column({ name: 'max_time_between_swipes_ms', type: 'int' })
  maxTimeBetweenSwipesMs: number;

  @Column({ name: 'reliability_score', type: 'decimal', precision: 5, scale: 2 })
  reliabilityScore: number;

  @Column({ name: 'reliability_level', type: 'varchar', length: 20 })
  reliabilityLevel: string;

  @CreateDateColumn({ name: 'calculated_at' })
  calculatedAt: Date;
}
