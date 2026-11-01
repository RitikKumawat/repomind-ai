import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from '../entities/repository.entity';
import { RepositoryInsight } from '../entities/repository-insight.entity';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Repository, RepositoryInsight]),
    AiModule,
  ],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
