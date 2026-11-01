import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { User } from '../auth/decorators/user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';

@Controller('repo/:repoId/insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('all')
  getAll(@User() user: AuthenticatedUser, @Param('repoId') repoId: string) {
    return this.insightsService.getAllInsights(user.id, repoId);
  }

  @Get('architecture')
  getArchitecture(
    @User() user: AuthenticatedUser,
    @Param('repoId') repoId: string,
    @Query('regenerate') regenerate?: string,
  ) {
    return this.insightsService.getArchitecture(
      user.id,
      repoId,
      regenerate === 'true',
    );
  }

  @Get('api-docs')
  getApiDocs(
    @User() user: AuthenticatedUser,
    @Param('repoId') repoId: string,
    @Query('regenerate') regenerate?: string,
  ) {
    return this.insightsService.getApiDocs(
      user.id,
      repoId,
      regenerate === 'true',
    );
  }

  @Get('onboarding')
  getOnboarding(
    @User() user: AuthenticatedUser,
    @Param('repoId') repoId: string,
    @Query('regenerate') regenerate?: string,
  ) {
    return this.insightsService.getOnboardingGuide(
      user.id,
      repoId,
      regenerate === 'true',
    );
  }

  @Post('regenerate')
  async regenerate(
    @User() user: AuthenticatedUser,
    @Param('repoId') repoId: string,
    @Body() body: { type?: 'architecture' | 'api-docs' | 'onboarding' | 'all' },
  ) {
    const type = body?.type || 'all';
    const results: Record<string, unknown> = {};

    if (type === 'all' || type === 'architecture') {
      results.architecture = await this.insightsService.getArchitecture(
        user.id,
        repoId,
        true,
      );
    }
    if (type === 'all' || type === 'api-docs') {
      results.apiDocs = await this.insightsService.getApiDocs(
        user.id,
        repoId,
        true,
      );
    }
    if (type === 'all' || type === 'onboarding') {
      results.onboarding = await this.insightsService.getOnboardingGuide(
        user.id,
        repoId,
        true,
      );
    }

    return results;
  }
}
