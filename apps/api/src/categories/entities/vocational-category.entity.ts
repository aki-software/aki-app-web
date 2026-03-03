import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vocational_category')
export class VocationalCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  categoryId: string; // Ej: ART, HUM, SERV...

  @Column()
  title: string; // Ej: Artístico

  @Column({ type: 'text' })
  description: string; // Descripción breve devuuantada en el Modal web o APP

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
