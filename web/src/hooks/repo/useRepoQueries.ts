'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import type {
  RepositoryItem,
  GithubRepoItem,
  ImportRepoPayload,
} from '@/types/repo';
import { RepoStatus, IndexingPhase } from '@/enums';

export function useUserRepos() {
  return useQuery<RepositoryItem[]>({
    queryKey: ['repos'],
    queryFn: async () => {
      const res = await api.get<RepositoryItem[]>('/repo');
      return res.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const isIngesting = data.some(
        (repo) =>
          repo.status === RepoStatus.PENDING ||
          repo.status === RepoStatus.IN_PROGRESS ||
          (
            [
              IndexingPhase.QUEUED,
              IndexingPhase.FETCHING,
              IndexingPhase.PARSING,
              IndexingPhase.INDEXING,
            ] as IndexingPhase[]
          ).includes(repo.indexingPhase)
      );
      return isIngesting ? 1500 : false;
    },
  });
}

export function useGithubRepos(enabled: boolean) {
  const queryClient = useQueryClient();

  return useQuery<GithubRepoItem[]>({
    queryKey: ['github-repos'],
    queryFn: async () => {
      try {
        const res = await api.get<GithubRepoItem[]>('/repo/github/list');
        return res.data;
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr?.response?.status === 401) {
          queryClient.invalidateQueries({ queryKey: ['me'] });
        }
        throw err;
      }
    },
    enabled,
    retry: false,
  });
}

export function useImportRepoMutation(onSuccessCallback?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ImportRepoPayload) => {
      const res = await api.post<RepositoryItem>('/repo/import', payload);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Repository Queued',
        message: `Successfully queued ${data.repoName} for ingestion.`,
        color: 'teal',
      });
      void queryClient.invalidateQueries({ queryKey: ['repos'] });
      if (onSuccessCallback) {
        onSuccessCallback();
      }
    },
    onError: (error: unknown) => {
      let message = 'Failed to import repository.';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        message = String(error.response.data.message);
      }
      notifications.show({
        title: 'Import Failed',
        message,
        color: 'red',
      });
    },
  });
}

export function useRetryRepoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repoId: string) => {
      const res = await api.post<RepositoryItem>(`/repo/${repoId}/retry`);
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Ingestion Restarted',
        message: `Restarted ingestion pipeline for ${data.repoName}.`,
        color: 'teal',
      });
      void queryClient.invalidateQueries({ queryKey: ['repos'] });
    },
    onError: (error: unknown) => {
      let message = 'Failed to restart ingestion.';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        message = String(error.response.data.message);
      }
      notifications.show({
        title: 'Retry Failed',
        message,
        color: 'red',
      });
    },
  });
}

export function useConnectGithub() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get<{ url: string }>('/repo/github/connect');
      return res.data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      notifications.show({
        title: 'Connection Error',
        message: 'Could not initialize GitHub repository connection.',
        color: 'red',
      });
    },
  });
}

export function useRepoBranches(repoId?: string, enabled = true) {
  return useQuery<string[]>({
    queryKey: ['repo-branches', repoId],
    queryFn: async () => {
      if (!repoId) return [];
      const res = await api.get<string[]>(`/repo/${repoId}/branches`);
      return res.data;
    },
    enabled: Boolean(repoId && enabled),
    staleTime: 60000,
  });
}

export function useGithubRepoBranches(repoFullName?: string, enabled = true) {
  return useQuery<string[]>({
    queryKey: ['github-repo-branches', repoFullName],
    queryFn: async () => {
      if (!repoFullName) return [];
      const res = await api.get<string[]>(
        `/repo/github/branches?repoFullName=${encodeURIComponent(repoFullName)}`
      );
      return res.data;
    },
    enabled: Boolean(repoFullName && enabled),
    staleTime: 60000,
  });
}

export function useSwitchBranchMutation(
  onSuccessCallback?: (data: RepositoryItem) => void
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repoId,
      branch,
    }: {
      repoId: string;
      branch: string;
    }) => {
      const res = await api.post<RepositoryItem>(
        `/repo/${repoId}/switch-branch`,
        { branch }
      );
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Branch Switched',
        message: `Switched to branch "${data.defaultBranch}". Re-indexing codebase...`,
        color: 'teal',
      });
      void queryClient.invalidateQueries({ queryKey: ['repos'] });
      void queryClient.invalidateQueries({ queryKey: ['repo', data.id] });
      if (onSuccessCallback) {
        onSuccessCallback(data);
      }
    },
    onError: (error: unknown) => {
      let message = 'Failed to switch branch.';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        message = String(error.response.data.message);
      }
      notifications.show({
        title: 'Switch Failed',
        message,
        color: 'red',
      });
    },
  });
}

