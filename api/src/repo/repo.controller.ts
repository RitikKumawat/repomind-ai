import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { RepoService } from './repo.service';
import { User } from '../auth/decorators/user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';
import { Public } from '../auth/decorators/public.decorator';
import {
  ImportRepoDto,
  UpdateRepoStatusWebhookDto,
  SwitchBranchDto,
} from './dto/repo.dto';
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

  @Get('github/branches')
  async getGithubBranches(
    @User() user: AuthenticatedUser,
    @Query('repoFullName') repoFullName: string,
  ) {
    if (!repoFullName) {
      throw new BadRequestException('repoFullName query parameter is required');
    }
    return this.repoService.getGithubRepoBranches(user.id, repoFullName);
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

  @Get(':id/branches')
  async getRepoBranches(
    @User() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.repoService.getImportedRepoBranches(user.id, id);
  }

  @Post(':id/switch-branch')
  async switchBranch(
    @User() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SwitchBranchDto,
  ) {
    return this.repoService.switchBranch(user.id, id, body.branch);
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

  @Get(':id/file')
  async getFile(
    @User() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('path') filePath: string,
  ) {
    if (!filePath) {
      throw new BadRequestException('Query parameter "path" is required');
    }
    return this.repoService.getFileContent(user.id, id, filePath);
  }

  @Public()
  @Post('webhook/status')
  async webhookStatus(@Body() body: UpdateRepoStatusWebhookDto) {
    await this.repoService.updateWebhookStatus(body);
    return { success: true };
  }
}
