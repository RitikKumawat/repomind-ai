import { RepoStatus, IndexingPhase } from '@/enums';
export { RepoStatus, IndexingPhase };

export interface RepositoryItem {
  id: string;
  repoName: string;
  githubUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
  status: RepoStatus;
  indexingPhase: IndexingPhase;
  totalFiles: number;
  totalChunks: number;
  processedChunks?: number;
  errorMessage?: string;
  createdAt?: string;
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

export interface ImportRepoPayload {
  githubUrl?: string;
  repoFullName?: string;
  isPrivate?: boolean;
  defaultBranch?: string;
}
