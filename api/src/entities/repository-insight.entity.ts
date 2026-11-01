import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { type Repository } from './repository.entity';

@Entity()
@Unique(['repo', 'branch'])
export class RepositoryInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne('Repository', (repo: Relation<Repository>) => repo.insights, {
    onDelete: 'CASCADE',
  })
  repo: Relation<Repository>;

  @Column({ default: 'main' })
  branch: string;

  @Column({ type: 'jsonb', nullable: true })
  architecture?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  apiDocs?: Record<string, unknown>[] | null;

  @Column({ type: 'text', nullable: true })
  onboarding?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
