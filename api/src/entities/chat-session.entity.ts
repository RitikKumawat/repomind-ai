import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { type User } from './user.entity';
import { ChatMessage } from './chat-message.entity';
import { Repository } from './repository.entity';

@Entity()
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne('Repository', (repo: Relation<Repository>) => repo.chatSessions, {
    onDelete: 'CASCADE',
  })
  repo: Relation<Repository>;

  @ManyToOne('User', (user: Relation<User>) => user.chatSessions, {
    onDelete: 'CASCADE',
  })
  user: Relation<User>;

  @Column({ default: 'New Chat' })
  title: string;

  @OneToMany('ChatMessage', (msg: Relation<ChatMessage>) => msg.session, {
    cascade: true,
  })
  messages: Relation<ChatMessage>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
