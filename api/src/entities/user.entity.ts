import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  type Relation,
} from 'typeorm';
import { Repository } from './repository.entity';
import { type ChatSession } from './chat-session.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @Column({ nullable: true })
  githubId?: string;

  @Column({ nullable: true, select: false })
  githubAccessToken?: string;

  @Column({ default: false })
  isGithubRepoConnected: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany('Repository', (repo: Relation<Repository>) => repo.user)
  repos: Relation<Repository>[];

  @OneToMany('ChatSession', (session: Relation<ChatSession>) => session.user)
  chatSessions: Relation<ChatSession>[];
}
