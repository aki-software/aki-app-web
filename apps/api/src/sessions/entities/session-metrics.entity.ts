import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Session } from './session.entity.js';

@Entity('session_metrics')
export class SessionMetrics {
  @PrimaryColumn({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @OneToOne(() => Session, (session) => session.metrics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session!: Session;

  @Column({ name: 'total_duration_ms', type: 'bigint' })
  totalDurationMs!: number;

  @Column({ name: 'total_swipes', type: 'int' })
  totalSwipes!: number;

  @Column({ name: 'unique_cards', type: 'int' })
  uniqueCards!: number;

  @Column({ name: 'reverted_matches', type: 'int' })
  revertedMatches!: number;

  @Column({ name: 'avg_time_between_swipes_ms', type: 'int' })
  avgTimeBetweenSwipesMs!: number;

  @Column({ name: 'min_time_between_swipes_ms', type: 'int' })
  minTimeBetweenSwipesMs!: number;

  @Column({ name: 'max_time_between_swipes_ms', type: 'int' })
  maxTimeBetweenSwipesMs!: number;

  @Column({
    name: 'reliability_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  reliabilityScore!: number;

  @Column({ name: 'reliability_level', type: 'varchar', length: 20 })
  reliabilityLevel!: string;

  // Behavioral metrics
  @Column({
    name: 'like_ratio',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v != null ? parseFloat(v) : null),
    },
  })
  likeRatio!: number | null;

  @Column({
    name: 'selectivity_level',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  selectivityLevel!: string | null;

  @Column({
    name: 'first_half_like_rate',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v != null ? parseFloat(v) : null),
    },
  })
  firstHalfLikeRate!: number | null;

  @Column({
    name: 'last_half_like_rate',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v != null ? parseFloat(v) : null),
    },
  })
  lastHalfLikeRate!: number | null;

  @Column({
    name: 'consistency_level',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  consistencyLevel!: string | null;

  @Column({ name: 'fatigue_detected', type: 'boolean', nullable: true })
  fatigueDetected!: boolean | null;

  @Column({ name: 'rush_detected', type: 'boolean', nullable: true })
  rushDetected!: boolean | null;

  @Column({ name: 'response_time_histogram', type: 'jsonb', nullable: true })
  responseTimeHistogram!: Array<{ bucket: number; count: number }> | null;

  @Column({
    name: 'reverted_direction',
    type: 'jsonb',
    nullable: true,
    default: () => '\'{ "likedToDisliked": 0, "dislikedToLiked": 0 }\'::jsonb',
  })
  revertedDirection!: {
    likedToDisliked: number;
    dislikedToLiked: number;
  } | null;

  @CreateDateColumn({ name: 'calculated_at', type: 'timestamptz' })
  calculatedAt!: Date;
}
