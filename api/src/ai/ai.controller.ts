import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Public()
  @Post('chat')
  async chat(
    @Body('repoId') repoId: string,
    @Body('message') message: string,
  ): Promise<unknown> {
    return this.aiService.chat(repoId, message);
  }
}
