import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { User } from '../auth/decorators/user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';
import {
  CreateChatSessionDto,
  RenameChatSessionDto,
  SendChatMessageDto,
} from './dto/chat.dto';

@Controller('repo/:repoId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions')
  getSessions(
    @User() user: AuthenticatedUser,
    @Param('repoId') repoId: string,
  ) {
    return this.chatService.getSessions(user.id, repoId);
  }

  @Post('sessions')
  createSession(
    @User() user: AuthenticatedUser,
    @Param('repoId') repoId: string,
    @Body() dto: CreateChatSessionDto,
  ) {
    return this.chatService.createSession(user.id, repoId, dto.title);
  }

  @Get('sessions/:sessionId/messages')
  getSessionMessages(
    @User() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatService.getSessionMessages(user.id, sessionId);
  }

  @Patch('sessions/:sessionId')
  renameSession(
    @User() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: RenameChatSessionDto,
  ) {
    return this.chatService.renameSession(user.id, sessionId, dto.title);
  }

  @Delete('sessions/:sessionId')
  deleteSession(
    @User() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatService.deleteSession(user.id, sessionId);
  }

  @Post('sessions/:sessionId/messages/stream')
  streamMessage(
    @User() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: SendChatMessageDto,
    @Res() res: Response,
  ) {
    return this.chatService.streamChatMessage(
      user.id,
      sessionId,
      dto.message,
      res,
    );
  }
}
