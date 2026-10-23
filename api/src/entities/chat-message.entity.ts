import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { type ChatSession } from './chat-session.entity';

export interface CodeCitation {
  filePath: string;
  startLine: number;
  endLine: number;
  scope?: string;
}

@Entity()
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    'ChatSession',
    (session: Relation<ChatSession>) => session.messages,
    {
      onDelete: 'CASCADE',
    },
  )
  session: Relation<ChatSession>;

  @Column({
    type: 'enum',
    enum: ['user', 'assistant'],
  })
  role: 'user' | 'assistant';

  @Column('text')
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  citations?: CodeCitation[] | null;

  @CreateDateColumn()
  createdAt: Date;
}
