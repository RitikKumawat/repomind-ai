import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { type Repository } from './repository.entity';

@Entity()
export class RepositoryFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne('Repository', (repo: Relation<Repository>) => repo.files)
  repo: Relation<Repository>;

  @Column()
  filePath: string;

  @Column()
  language: string;

  @Column({ default: 0 })
  chunkCount: number;
}
