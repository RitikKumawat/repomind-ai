import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository as TypeOrmRepository } from 'typeorm';
import { Repository } from '../entities/repository.entity';
import { RepositoryInsight } from '../entities/repository-insight.entity';
import { RepoStatus } from '../enums';
import { AiService } from '../ai/ai.service';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    @InjectRepository(Repository)
    private readonly repoRepo: TypeOrmRepository<Repository>,
    @InjectRepository(RepositoryInsight)
    private readonly insightRepo: TypeOrmRepository<RepositoryInsight>,
    private readonly aiService: AiService,
  ) {}

  private async getVerifiedRepo(
    userId: string,
    repoId: string,
  ): Promise<Repository> {
    const repo = await this.repoRepo.findOne({
      where: { id: repoId, user: { id: userId } },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found or access denied');
    }
    if (repo.status !== RepoStatus.READY) {
      throw new BadRequestException(
        `Repository is not ready for insights. Current status: ${repo.status}`,
      );
    }
    return repo;
  }

  private async getOrCreateInsight(
    repo: Repository,
  ): Promise<RepositoryInsight> {
    const branch = repo.defaultBranch || 'main';
    let insight = await this.insightRepo.findOne({
      where: { repo: { id: repo.id }, branch },
    });

    if (!insight) {
      insight = this.insightRepo.create({
        repo: { id: repo.id },
        branch,
      });
      insight = await this.insightRepo.save(insight);
    }

    return insight;
  }

  async getArchitecture(
    userId: string,
    repoId: string,
    regenerate = false,
  ): Promise<Record<string, unknown>> {
    const repo = await this.getVerifiedRepo(userId, repoId);
    const insight = await this.getOrCreateInsight(repo);

    if (insight.architecture && !regenerate) {
      return insight.architecture;
    }

    const isAiOnline = await this.aiService.isHealthy();
    if (!isAiOnline) {
      throw new ServiceUnavailableException(
        'AI service is offline (port 8000).',
      );
    }

    try {
      this.logger.log(
        `Generating architecture for ${repo.repoName} on branch ${repo.defaultBranch}`,
      );
      const arch = await this.aiService.generateArchitecture(
        repo.id,
        repo.defaultBranch,
      );
      insight.architecture = arch;
      await this.insightRepo.save(insight);
      return arch;
    } catch (error: unknown) {
      this.logger.error(`Architecture generation failed for ${repoId}`, error);
      throw new BadRequestException('Failed to generate architecture summary.');
    }
  }

  async getApiDocs(
    userId: string,
    repoId: string,
    regenerate = false,
  ): Promise<Record<string, unknown>[]> {
    const repo = await this.getVerifiedRepo(userId, repoId);
    const insight = await this.getOrCreateInsight(repo);

    if (insight.apiDocs && insight.apiDocs.length > 0 && !regenerate) {
      return insight.apiDocs;
    }

    const isAiOnline = await this.aiService.isHealthy();
    if (!isAiOnline) {
      throw new ServiceUnavailableException(
        'AI service is offline (port 8000).',
      );
    }

    try {
      this.logger.log(
        `Generating API docs for ${repo.repoName} on branch ${repo.defaultBranch}`,
      );
      const endpoints = await this.aiService.generateApiDocs(
        repo.id,
        repo.defaultBranch,
      );
      insight.apiDocs = endpoints;
      await this.insightRepo.save(insight);
      return endpoints;
    } catch (error: unknown) {
      this.logger.error(`API docs generation failed for ${repoId}`, error);
      throw new BadRequestException('Failed to generate API documentation.');
    }
  }

  async getOnboardingGuide(
    userId: string,
    repoId: string,
    regenerate = false,
  ): Promise<string> {
    const repo = await this.getVerifiedRepo(userId, repoId);
    const insight = await this.getOrCreateInsight(repo);

    if (insight.onboarding && !regenerate) {
      return insight.onboarding;
    }

    const isAiOnline = await this.aiService.isHealthy();
    if (!isAiOnline) {
      throw new ServiceUnavailableException(
        'AI service is offline (port 8000).',
      );
    }

    try {
      this.logger.log(
        `Generating onboarding guide for ${repo.repoName} on branch ${repo.defaultBranch}`,
      );
      const guide = await this.aiService.generateOnboardingGuide(
        repo.id,
        repo.defaultBranch,
      );
      insight.onboarding = guide;
      await this.insightRepo.save(insight);
      return guide;
    } catch (error: unknown) {
      this.logger.error(
        `Onboarding guide generation failed for ${repoId}`,
        error,
      );
      throw new BadRequestException(
        'Failed to generate developer onboarding guide.',
      );
    }
  }

  async getAllInsights(
    userId: string,
    repoId: string,
  ): Promise<{
    architecture: Record<string, unknown> | null;
    apiDocs: Record<string, unknown>[] | null;
    onboarding: string | null;
    branch: string;
    updatedAt?: Date;
  }> {
    const repo = await this.getVerifiedRepo(userId, repoId);
    const branch = repo.defaultBranch || 'main';
    const insight = await this.insightRepo.findOne({
      where: { repo: { id: repo.id }, branch },
    });

    return {
      architecture: insight?.architecture || null,
      apiDocs: insight?.apiDocs || null,
      onboarding: insight?.onboarding || null,
      branch,
      updatedAt: insight?.updatedAt,
    };
  }
}
