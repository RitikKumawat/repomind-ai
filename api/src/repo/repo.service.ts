import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository as TypeOrmRepository } from 'typeorm';
import { Repository } from '../entities/repository.entity';
import { RepoStatus, IndexingPhase } from '../enums';
import { User } from '../entities/user.entity';
import { AiService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  ImportRepoDto,
  UpdateRepoStatusWebhookDto,
  type GithubRepoItem,
} from './dto/repo.dto';

interface GitHubOAuthTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface RawGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  updated_at: string | null;
}

@Injectable()
export class RepoService {
  private readonly logger = new Logger(RepoService.name);

  constructor(
    @InjectRepository(Repository)
    private readonly repoRepo: TypeOrmRepository<Repository>,
    @InjectRepository(User)
    private readonly userRepo: TypeOrmRepository<User>,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  getGithubConnectUrl(userId: string): string {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID') || '';
    const callbackUrl =
      this.configService.get<string>('GITHUB_REPO_CALLBACK_URL') ||
      'http://localhost:4000/repo/github/connect/callback';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'repo',
      state: userId,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async handleGithubConnectCallback(
    code: string,
    stateUserId: string,
  ): Promise<void> {
    const userId = stateUserId.startsWith('connect:')
      ? stateUserId.replace('connect:', '')
      : stateUserId;
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID') || '';
    const clientSecret =
      this.configService.get<string>('GITHUB_CLIENT_SECRET') || '';
    const callbackUrl =
      this.configService.get<string>('GITHUB_REPO_CALLBACK_URL') ||
      'http://localhost:4000/repo/github/connect/callback';

    const tokenRes = await firstValueFrom(
      this.httpService.post<GitHubOAuthTokenResponse>(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: callbackUrl,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      ),
    );

    const tokenData = tokenRes.data;
    if (!tokenData.access_token) {
      throw new BadRequestException(
        tokenData.error_description || 'Failed to exchange GitHub OAuth code',
      );
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found for OAuth state');
    }

    user.githubAccessToken = tokenData.access_token;
    user.isGithubRepoConnected = true;
    await this.userRepo.save(user);
    this.logger.log(`Connected GitHub repo scope for user: ${user.email}`);
  }

  async getUserGithubRepos(userId: string): Promise<GithubRepoItem[]> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.githubAccessToken')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user || !user.githubAccessToken) {
      throw new BadRequestException(
        'GitHub account is not connected for repository access. Please connect GitHub first.',
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<RawGitHubRepo[]>(
          'https://api.github.com/user/repos?per_page=100&sort=updated',
          {
            headers: {
              Authorization: `Bearer ${user.githubAccessToken}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'RepoMind-AI',
            },
          },
        ),
      );

      return response.data.map((r: RawGitHubRepo) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        isPrivate: r.private,
        htmlUrl: r.html_url,
        description: r.description,
        defaultBranch: r.default_branch || 'main',
        language: r.language,
        updatedAt: r.updated_at,
      }));
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) {
        this.logger.warn(
          `GitHub token for user ${userId} has expired or was revoked. Resetting connection.`,
        );
        user.githubAccessToken = undefined;
        user.isGithubRepoConnected = false;
        await this.userRepo.save(user);
        throw new UnauthorizedException(
          'GitHub access token has expired or is invalid. Please reconnect your GitHub account.',
        );
      }
      this.logger.error('Failed to fetch repositories from GitHub', error);
      throw new BadRequestException('Unable to fetch repositories from GitHub');
    }
  }

  async ingest(userId: string, dto: ImportRepoDto): Promise<Repository> {
    let githubUrl = dto.githubUrl?.trim();
    let repoName = '';
    const isPrivate = dto.isPrivate ?? false;
    const defaultBranch = dto.defaultBranch?.trim() || 'main';

    if (dto.repoFullName) {
      repoName = dto.repoFullName.trim();
      githubUrl = `https://github.com/${repoName}`;
    } else if (githubUrl) {
      const parts = githubUrl
        .replace(/\.git$/, '')
        .split('/')
        .filter(Boolean);
      if (parts.length < 2) {
        throw new BadRequestException('Invalid GitHub repository URL');
      }
      repoName = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    } else {
      throw new BadRequestException(
        'Either githubUrl or repoFullName must be provided',
      );
    }

    const normalizedGithubUrl = githubUrl
      .trim()
      .replace(/\/+$/, '')
      .replace(/\.git$/, '');

    // Check if AI service is online before queuing ingestion
    const isAiOnline = await this.aiService.isHealthy();
    if (!isAiOnline) {
      throw new ServiceUnavailableException(
        'AI service is offline (http://localhost:8000). Please start the AI service worker first.',
      );
    }

    // Check for existing repository for this user to prevent duplicate ingestion
    const existingRepo = await this.repoRepo.findOne({
      where: [
        { user: { id: userId }, githubUrl: normalizedGithubUrl },
        { user: { id: userId }, repoName },
      ],
    });

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.githubAccessToken')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (existingRepo) {
      if (
        existingRepo.status === RepoStatus.IN_PROGRESS ||
        existingRepo.status === RepoStatus.PENDING
      ) {
        throw new ConflictException(
          `Repository "${repoName}" is already currently being ingested (${existingRepo.indexingPhase}).`,
        );
      }
      if (existingRepo.status === RepoStatus.READY) {
        if (defaultBranch && defaultBranch !== existingRepo.defaultBranch) {
          return this.switchBranch(userId, existingRepo.id, defaultBranch);
        }
        throw new ConflictException(
          `Repository "${repoName}" is already imported and ready on branch "${existingRepo.defaultBranch}". You can switch branches or re-index it from your dashboard.`,
        );
      }
      // If it previously FAILED, reuse existing repository record and re-trigger
      existingRepo.status = RepoStatus.PENDING;
      existingRepo.indexingPhase = IndexingPhase.QUEUED;
      existingRepo.errorMessage = null;
      existingRepo.defaultBranch = defaultBranch;
      existingRepo.isPrivate = isPrivate;
      await this.repoRepo.save(existingRepo);

      const token = user?.githubAccessToken;
      void this.aiService
        .ingestRepository(
          existingRepo.id,
          normalizedGithubUrl,
          token,
          defaultBranch,
        )
        .catch((err: unknown) => {
          this.logger.error(
            `AI Ingestion dispatch failed for ${existingRepo.id}`,
            err,
          );
          void this.repoRepo.update(existingRepo.id, {
            status: RepoStatus.FAILED,
            indexingPhase: IndexingPhase.FAILED,
            errorMessage: 'Failed to trigger AI ingestion worker',
          });
        });

      return existingRepo;
    }

    const repo = this.repoRepo.create({
      user: { id: userId },
      githubUrl: normalizedGithubUrl,
      repoName,
      defaultBranch,
      isPrivate,
      status: RepoStatus.PENDING,
      indexingPhase: IndexingPhase.QUEUED,
      totalFiles: 0,
      totalChunks: 0,
      processedChunks: 0,
    });

    await this.repoRepo.save(repo);

    const token = user?.githubAccessToken;

    // Trigger AI service in background
    void this.aiService
      .ingestRepository(repo.id, normalizedGithubUrl, token, defaultBranch)
      .catch((err: unknown) => {
        this.logger.error(`AI Ingestion dispatch failed for ${repo.id}`, err);
        void this.repoRepo.update(repo.id, {
          status: RepoStatus.FAILED,
          indexingPhase: IndexingPhase.FAILED,
          errorMessage: 'Failed to trigger AI ingestion worker',
        });
      });

    return repo;
  }

  async retryIngest(userId: string, repoId: string): Promise<Repository> {
    const isAiOnline = await this.aiService.isHealthy();
    if (!isAiOnline) {
      throw new ServiceUnavailableException(
        'AI service is offline (http://localhost:8000). Please start the AI service worker before retrying.',
      );
    }

    const repo = await this.repoRepo.findOne({
      where: { id: repoId, user: { id: userId } },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.githubAccessToken')
      .where('user.id = :id', { id: userId })
      .getOne();

    repo.status = RepoStatus.PENDING;
    repo.indexingPhase = IndexingPhase.QUEUED;
    repo.errorMessage = null;
    await this.repoRepo.save(repo);

    const token = user?.githubAccessToken;
    void this.aiService
      .ingestRepository(repo.id, repo.githubUrl, token, repo.defaultBranch)
      .catch((err: unknown) => {
        this.logger.error(`AI Ingestion retry failed for ${repo.id}`, err);
        void this.repoRepo.update(repo.id, {
          status: RepoStatus.FAILED,
          indexingPhase: IndexingPhase.FAILED,
          errorMessage: 'Failed to trigger AI ingestion worker',
        });
      });

    return repo;
  }

  async getGithubRepoBranches(
    userId: string,
    repoFullName: string,
  ): Promise<string[]> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.githubAccessToken')
      .where('user.id = :id', { id: userId })
      .getOne();

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'RepoMind-AI',
    };
    if (user?.githubAccessToken) {
      headers.Authorization = `Bearer ${user.githubAccessToken}`;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ name: string }[]>(
          `https://api.github.com/repos/${repoFullName}/branches?per_page=100`,
          { headers, timeout: 5000 },
        ),
      );
      return response.data.map((b) => b.name);
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to fetch branches for ${repoFullName}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async getImportedRepoBranches(
    userId: string,
    repoId: string,
  ): Promise<string[]> {
    const repo = await this.repoRepo.findOne({
      where: { id: repoId, user: { id: userId } },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }
    return this.getGithubRepoBranches(userId, repo.repoName);
  }

  async switchBranch(
    userId: string,
    repoId: string,
    branch: string,
  ): Promise<Repository> {
    const isAiOnline = await this.aiService.isHealthy();
    if (!isAiOnline) {
      throw new ServiceUnavailableException(
        'AI service is offline (http://localhost:8000). Please start the AI service worker first.',
      );
    }

    const repo = await this.repoRepo.findOne({
      where: { id: repoId, user: { id: userId } },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    const cleanBranch = branch?.trim();
    if (!cleanBranch) {
      throw new BadRequestException('Branch name is required');
    }

    if (
      repo.status === RepoStatus.IN_PROGRESS ||
      repo.status === RepoStatus.PENDING
    ) {
      throw new ConflictException(
        `Repository is currently being indexed. Please wait until indexing finishes before switching branches.`,
      );
    }

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.githubAccessToken')
      .where('user.id = :id', { id: userId })
      .getOne();

    repo.defaultBranch = cleanBranch;
    repo.status = RepoStatus.PENDING;
    repo.indexingPhase = IndexingPhase.QUEUED;
    repo.errorMessage = null;
    repo.totalFiles = 0;
    repo.totalChunks = 0;
    repo.processedChunks = 0;
    await this.repoRepo.save(repo);

    const token = user?.githubAccessToken;
    void this.aiService
      .ingestRepository(repo.id, repo.githubUrl, token, repo.defaultBranch)
      .catch((err: unknown) => {
        this.logger.error(
          `AI Ingestion branch switch failed for ${repo.id}`,
          err,
        );
        void this.repoRepo.update(repo.id, {
          status: RepoStatus.FAILED,
          indexingPhase: IndexingPhase.FAILED,
          errorMessage: 'Failed to trigger AI ingestion worker',
        });
      });

    return repo;
  }

  async getUserRepos(userId: string): Promise<Repository[]> {
    const repos = await this.repoRepo.find({
      where: { user: { id: userId } },
      order: { id: 'DESC' },
    });

    // Detect if AI service is offline while repositories are marked in-progress
    const activeRepos = repos.filter(
      (r) =>
        r.status === RepoStatus.IN_PROGRESS || r.status === RepoStatus.PENDING,
    );

    if (activeRepos.length > 0) {
      const isAiOnline = await this.aiService.isHealthy();
      if (!isAiOnline) {
        for (const r of activeRepos) {
          r.status = RepoStatus.FAILED;
          r.indexingPhase = IndexingPhase.FAILED;
          r.errorMessage =
            'AI service is offline or was stopped (port 8000). Start the AI service and click Retry.';
          await this.repoRepo.save(r);
        }
      }
    }

    return repos;
  }

  async getRepo(id: string): Promise<Repository | null> {
    return this.repoRepo.findOne({
      where: { id },
      relations: { files: true, chats: true },
    });
  }

  async getFileContent(
    userId: string,
    repoId: string,
    filePath: string,
  ): Promise<{ path: string; content: string }> {
    const repo = await this.repoRepo.findOne({
      where: { id: repoId, user: { id: userId } },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.githubAccessToken')
      .where('user.id = :id', { id: userId })
      .getOne();

    const cleanUrl = repo.githubUrl.replace(/\/+$/, '').replace(/\.git$/, '');
    const parts = cleanUrl.split('/').filter(Boolean);
    const owner = parts[parts.length - 2];
    const repoName = parts[parts.length - 1];
    const branch = repo.defaultBranch || 'main';

    const headers: Record<string, string> = {
      'User-Agent': 'RepoMind-AI',
    };
    if (user?.githubAccessToken) {
      headers.Authorization = `token ${user.githubAccessToken}`;
    }

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${filePath}`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<string>(rawUrl, {
          headers,
          responseType: 'text',
          timeout: 10000,
        }),
      );
      return { path: filePath, content: response.data };
    } catch {
      // Fallback with HEAD branch
      const headUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/HEAD/${filePath}`;
      try {
        const response = await firstValueFrom(
          this.httpService.get<string>(headUrl, {
            headers,
            responseType: 'text',
            timeout: 10000,
          }),
        );
        return { path: filePath, content: response.data };
      } catch (err) {
        this.logger.error(`Failed to fetch file content for ${filePath}`, err);
        throw new NotFoundException(`File ${filePath} not found in repository`);
      }
    }
  }

  async getRepoStatus(id: string): Promise<{
    id: string;
    status: RepoStatus;
    indexingPhase: IndexingPhase;
    totalFiles: number;
    totalChunks: number;
    processedChunks: number;
    errorMessage?: string | null;
  } | null> {
    const repo = await this.repoRepo.findOne({
      where: { id },
      select: {
        id: true,
        status: true,
        indexingPhase: true,
        totalFiles: true,
        totalChunks: true,
        processedChunks: true,
        errorMessage: true,
      },
    });

    if (!repo) return null;

    return {
      id: repo.id,
      status: repo.status,
      indexingPhase: repo.indexingPhase,
      totalFiles: repo.totalFiles,
      totalChunks: repo.totalChunks,
      processedChunks: repo.processedChunks || 0,
      errorMessage: repo.errorMessage,
    };
  }

  async updateWebhookStatus(dto: UpdateRepoStatusWebhookDto): Promise<void> {
    const repo = await this.repoRepo.findOne({ where: { id: dto.repoId } });
    if (!repo) {
      throw new NotFoundException(`Repository ${dto.repoId} not found`);
    }

    repo.status = dto.status;
    if (dto.indexingPhase) {
      repo.indexingPhase = dto.indexingPhase;
    }
    if (typeof dto.totalFiles === 'number') {
      repo.totalFiles = dto.totalFiles;
    }
    if (typeof dto.totalChunks === 'number') {
      repo.totalChunks = dto.totalChunks;
    }
    if (typeof dto.processedChunks === 'number') {
      repo.processedChunks = dto.processedChunks;
    }
    if (
      dto.status === RepoStatus.READY ||
      dto.status === RepoStatus.IN_PROGRESS
    ) {
      repo.errorMessage = dto.errorMessage || null;
    } else if (dto.errorMessage) {
      repo.errorMessage = dto.errorMessage;
    }

    await this.repoRepo.save(repo);
    this.logger.log(
      `Updated repo ${repo.id} status to ${dto.status} [${dto.indexingPhase}]`,
    );
  }
}
