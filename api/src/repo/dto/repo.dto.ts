import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { RepoStatus, IndexingPhase } from '../../enums';

export class ImportRepoDto {
  @IsOptional()
  @IsString()
  githubUrl?: string;

  @IsOptional()
  @IsString()
  repoFullName?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  defaultBranch?: string;
}

export class UpdateRepoStatusWebhookDto {
  @IsNotEmpty()
  @IsString()
  repoId: string;

  @IsNotEmpty()
  @IsEnum(RepoStatus)
  status: RepoStatus;

  @IsOptional()
  @IsEnum(IndexingPhase)
  indexingPhase?: IndexingPhase;

  @IsOptional()
  @IsNumber()
  totalFiles?: number;

  @IsOptional()
  @IsNumber()
  totalChunks?: number;

  @IsOptional()
  @IsNumber()
  processedChunks?: number;

  @IsOptional()
  errorMessage?: string | null;
}

export interface GithubRepoItem {
  id: number;
  name: string;
  fullName: string;
  isPrivate: boolean;
  htmlUrl: string;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  updatedAt: string | null;
}

export class SwitchBranchDto {
  @IsNotEmpty()
  @IsString()
  branch: string;
}

