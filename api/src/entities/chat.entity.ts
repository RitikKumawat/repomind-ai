import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { type Repository } from './repository.entity';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne('Repository', (repo: Relation<Repository>) => repo.chats)
  repo: Relation<Repository>;

  @Column('text')
  userQuery: string;

  @Column('text')
  aiResponse: string;

  @CreateDateColumn()
  createdAt: Date;
}
