import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { RepoService } from './repo.service';
import { User } from '../auth/decorators/user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';
import { Public } from '../auth/decorators/public.decorator';
import { ImportRepoDto, UpdateRepoStatusWebhookDto } from './dto/repo.dto';
import { ConfigService } from '@nestjs/config';

@Controller('repo')
export class RepoController {
  constructor(
    private readonly repoService: RepoService,
    private readonly configService: ConfigService,
  ) {}

  @Get('github/connect')
  getGithubConnectUrl(@User() user: AuthenticatedUser) {
    const url = this.repoService.getGithubConnectUrl(user.id);
    return { url };
  }

  @Public()
  @Get('github/connect/callback')
  async githubConnectCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    try {
      if (!code || !state) {
        return res.redirect(
          `${frontendUrl}/dashboard?error=missing_oauth_params`,
        );
      }

      await this.repoService.handleGithubConnectCallback(code, state);
      return res.redirect(`${frontendUrl}/dashboard?github=connected`);
    } catch {
      return res.redirect(
        `${frontendUrl}/dashboard?error=github_connect_failed`,
      );
    }
  }

  @Get('github/list')
  async getGithubRepos(@User() user: AuthenticatedUser) {
    return this.repoService.getUserGithubRepos(user.id);
  }

  @Post('import')
  async importRepo(
    @User() user: AuthenticatedUser,
    @Body() body: ImportRepoDto,
  ) {
    return this.repoService.ingest(user.id, body);
  }

  @Post(':id/retry')
  async retryRepo(@User() user: AuthenticatedUser, @Param('id') id: string) {
    return this.repoService.retryIngest(user.id, id);
  }

  @Get()
  async getRepos(@User() user: AuthenticatedUser) {
    return this.repoService.getUserRepos(user.id);
  }

  @Get(':id/status')
  async getRepoStatus(@Param('id') id: string) {
    const status = await this.repoService.getRepoStatus(id);
    if (!status) {
      throw new NotFoundException('Repository not found');
    }
    return status;
  }

  @Get(':id')
  async getRepo(@Param('id') id: string) {
    const repo = await this.repoService.getRepo(id);
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }
    return repo;
  }

  @Public()
  @Post('webhook/status')
  async webhookStatus(@Body() body: UpdateRepoStatusWebhookDto) {
    await this.repoService.updateWebhookStatus(body);
    return { success: true };
  }
}
