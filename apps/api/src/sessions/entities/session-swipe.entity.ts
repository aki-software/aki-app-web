import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Session } from './session.entity.js';

/**
 * RETENTION STRATEGY:
 * Individual `session_swipes` are transactional logs used specifically to calculate
 * `session_metrics` (fatigue, rush, selectivity, etc.) at the end of a session.
 * Once these metrics are calculated and consolidated, the swipe-level data becomes obsolete.
 *
 * Recommended cleanup strategy (e.g., via cron job or background worker):
 * DELETE FROM session_swipes WHERE timestamp < NOW() - INTERVAL '30 days';
 */
@Entity('session_swipes')
export class SessionSwipe {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @ManyToOne(() => Session, (session) => session.swipes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: Session = new Session();

  @Column({ name: 'card_id', type: 'varchar', length: 50 })
  cardId!: string;

  @Column({ name: 'category_id', type: 'varchar', length: 50 })
  categoryId!: string;

  @Column({ name: 'is_liked', type: 'boolean' })
  isLiked: boolean = false;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;
}
