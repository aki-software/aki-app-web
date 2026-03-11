import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Session } from './session.entity';

@Entity('session_results')
export class SessionResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => Session, (session) => session.results, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ name: 'category_id', type: 'varchar', length: 50 })
  categoryId: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ name: 'total_possible', type: 'int' })
  totalPossible: number;

  @Column({ name: 'percentage', type: 'int' })
  percentage: number;

  @Column({ name: 'suggested_careers', type: 'json', nullable: true })
  suggestedCareers?: string[];

  @Column({ name: 'material_snippet', type: 'text', nullable: true })
  materialSnippet?: string;
}
