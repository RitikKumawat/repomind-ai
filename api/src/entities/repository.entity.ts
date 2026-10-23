import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  Unique,
  type Relation,
} from 'typeorm';
import { type User } from './user.entity';
import { type RepositoryFile } from './repository-file.entity';
import { type Chat } from './chat.entity';
import { type ChatSession } from './chat-session.entity';
import { RepoStatus, IndexingPhase } from '../enums';

@Entity()
@Unique(['user', 'githubUrl'])
export class Repository {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne('User', (user: Relation<User>) => user.repos)
  user: Relation<User>;

  @Column()
  githubUrl: string;

  @Column()
  repoName: string;

  @Column({ default: 'main' })
  defaultBranch: string;

  @Column({ default: false })
  isPrivate: boolean;

  @Column({
    type: 'enum',
    enum: RepoStatus,
    default: RepoStatus.PENDING,
  })
  status: RepoStatus;

  @Column({
    type: 'enum',
    enum: IndexingPhase,
    default: IndexingPhase.QUEUED,
  })
  indexingPhase: IndexingPhase;

  @Column({ default: 0 })
  totalFiles: number;

  @Column({ default: 0 })
  totalChunks: number;

  @Column({ default: 0 })
  processedChunks: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @OneToMany('RepositoryFile', (file: Relation<RepositoryFile>) => file.repo)
  files: Relation<RepositoryFile>[];

  @OneToMany('Chat', (chat: Relation<Chat>) => chat.repo)
  chats: Relation<Chat>[];

  @OneToMany('ChatSession', (session: Relation<ChatSession>) => session.repo)
  chatSessions: Relation<ChatSession>[];
}
