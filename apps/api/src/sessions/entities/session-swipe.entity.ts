import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Session } from './session.entity';

@Entity('session_swipes')
export class SessionSwipe {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => Session, (session) => session.swipes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ name: 'card_id', type: 'varchar', length: 50 })
  cardId: string;

  @Column({ name: 'category_id', type: 'varchar', length: 50 })
  categoryId: string;

  @Column({ name: 'is_liked', type: 'boolean' })
  isLiked: boolean;

  @Column({ type: 'timestamp' })
  timestamp: Date;
}
