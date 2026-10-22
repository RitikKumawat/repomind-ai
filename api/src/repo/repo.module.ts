import { Module } from '@nestjs/common';
import { RepoService } from './repo.service';
import { RepoController } from './repo.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from '../entities/repository.entity';
import { User } from '../entities/user.entity';
import { AiModule } from '../ai/ai.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Repository, User]),
    AiModule,
    HttpModule,
    ConfigModule,
  ],
  providers: [RepoService],
  controllers: [RepoController],
})
export class RepoModule {}
