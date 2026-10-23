import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository as TypeOrmRepository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { ChatMessage, CodeCitation } from '../entities/chat-message.entity';
import { Repository } from '../entities/repository.entity';
import { RepoStatus } from '../enums';
import { AiService } from '../ai/ai.service';
import type { Response } from 'express';
import type { Readable } from 'node:stream';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: TypeOrmRepository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: TypeOrmRepository<ChatMessage>,
    @InjectRepository(Repository)
    private readonly repoRepo: TypeOrmRepository<Repository>,
    private readonly aiService: AiService,
  ) {}

  private async verifyRepoAccess(
    userId: string,
    repoId: string,
  ): Promise<Repository> {
    const repo = await this.repoRepo.findOne({
      where: { id: repoId, user: { id: userId } },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found or access denied');
    }
    return repo;
  }

  async getSessions(userId: string, repoId: string): Promise<ChatSession[]> {
    await this.verifyRepoAccess(userId, repoId);
    return this.sessionRepo.find({
      where: { repo: { id: repoId }, user: { id: userId } },
      order: { updatedAt: 'DESC' },
    });
  }

  async createSession(
    userId: string,
    repoId: string,
    title?: string,
  ): Promise<ChatSession> {
    const repo = await this.verifyRepoAccess(userId, repoId);

    const session = this.sessionRepo.create({
      user: { id: userId },
      repo: { id: repo.id },
      title: title?.trim() || 'New Chat',
    });

    return this.sessionRepo.save(session);
  }

  async getSession(userId: string, sessionId: string): Promise<ChatSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, user: { id: userId } },
      relations: { repo: true },
    });
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }
    return session;
  }

  async getSessionMessages(
    userId: string,
    sessionId: string,
  ): Promise<ChatMessage[]> {
    await this.getSession(userId, sessionId);
    return this.messageRepo.find({
      where: { session: { id: sessionId } },
      order: { createdAt: 'ASC' },
    });
  }

  async renameSession(
    userId: string,
    sessionId: string,
    title: string,
  ): Promise<ChatSession> {
    const session = await this.getSession(userId, sessionId);
    session.title = title.trim();
    return this.sessionRepo.save(session);
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.getSession(userId, sessionId);
    await this.sessionRepo.remove(session);
  }

  async streamChatMessage(
    userId: string,
    sessionId: string,
    message: string,
    res: Response,
  ): Promise<void> {
    const session = await this.getSession(userId, sessionId);
    const repo = session.repo;

    if (repo.status !== RepoStatus.READY) {
      throw new BadRequestException(
        `Repository is not ready for chat. Current status: ${repo.status}`,
      );
    }

    const isAiOnline = await this.aiService.isHealthy();
    if (!isAiOnline) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(
        `event: error\ndata: {"error": "AI Service is offline (port 8000). Please start the service and retry."}\n\n`,
      );
      res.write(`event: done\ndata: {"finishReason": "error"}\n\n`);
      res.end();
      return;
    }

    // 1. Save user query in DB immediately
    const userMsg = this.messageRepo.create({
      session: { id: session.id },
      role: 'user',
      content: message.trim(),
    });
    await this.messageRepo.save(userMsg);

    // 2. Fetch last 6 messages for multi-turn context
    const pastMessages = await this.messageRepo.find({
      where: { session: { id: session.id } },
      order: { createdAt: 'ASC' },
      take: 8,
    });

    const conversationHistory = pastMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 3. Set SSE streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let fullAssistantText = '';
    let citations: CodeCitation[] = [];

    try {
      const stream: Readable = await this.aiService.streamChat(
        repo.id,
        message,
        conversationHistory,
      );

      let buffer = '';

      stream.on('data', (chunk: Buffer | string) => {
        const text =
          typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
        res.write(text);
        buffer += text;

        // Parse SSE lines from buffer to collect citations and tokens
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            try {
              const parsed: unknown = JSON.parse(rawData);
              if (
                currentEvent === 'token' &&
                typeof parsed === 'object' &&
                parsed !== null &&
                'text' in parsed &&
                typeof parsed.text === 'string'
              ) {
                fullAssistantText += (parsed as { text: string }).text;
              } else if (
                currentEvent === 'citations' &&
                Array.isArray(parsed)
              ) {
                citations = parsed as CodeCitation[];
              }
            } catch {
              // ignore partial json
            }
          }
        }
      });

      stream.on('end', () => {
        void (async () => {
          try {
            if (fullAssistantText.trim()) {
              const assistantMsg = this.messageRepo.create({
                session: { id: session.id },
                role: 'assistant',
                content: fullAssistantText,
                citations: citations.length > 0 ? citations : null,
              });
              await this.messageRepo.save(assistantMsg);

              // Auto-title session if it is currently 'New Chat'
              if (session.title === 'New Chat') {
                const cleanTitle = message.trim().slice(0, 50);
                session.title =
                  cleanTitle.length === 50 ? `${cleanTitle}...` : cleanTitle;
              }
              session.updatedAt = new Date();
              await this.sessionRepo.save(session);
            }
          } catch (dbErr) {
            this.logger.error('Failed to save assistant message to DB', dbErr);
          } finally {
            res.end();
          }
        })();
      });

      stream.on('error', (err: unknown) => {
        this.logger.error('Error during AI chat stream', err);
        res.write(
          `event: error\ndata: {"error": "Stream disconnected unexpectedly."}\n\n`,
        );
        res.end();
      });
    } catch (streamErr) {
      this.logger.error('Failed to initiate AI chat stream', streamErr);
      res.write(
        `event: error\ndata: {"error": "Failed to connect to AI reasoning service."}\n\n`,
      );
      res.end();
    }
  }
}
