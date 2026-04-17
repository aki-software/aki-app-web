import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tres_areas_combinations')
@Index('UQ_tres_areas_combinations_combination_key', ['combinationKey'], {
  unique: true,
})
export class TresAreasCombination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'combination_key', type: 'varchar', length: 255 })
  combinationKey: string;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'area_1', type: 'varchar', length: 120 })
  area1: string;

  @Column({ name: 'area_2', type: 'varchar', length: 120 })
  area2: string;

  @Column({ name: 'area_3', type: 'varchar', length: 120 })
  area3: string;

  @Column({ name: 'narrative', type: 'text' })
  narrative: string;

  @Column({ name: 'tendencies', type: 'text', array: true, default: '{}' })
  tendencies: string[];

  @Column({ name: 'possible_jobs', type: 'text' })
  possibleJobs: string;

  @Column({ name: 'related_professions', type: 'text' })
  relatedProfessions: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
