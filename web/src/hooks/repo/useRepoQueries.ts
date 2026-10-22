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
  return useQuery<GithubRepoItem[]>({
    queryKey: ['github-repos'],
    queryFn: async () => {
      const res = await api.get<GithubRepoItem[]>('/repo/github/list');
      return res.data;
    },
    enabled,
    retry: 1,
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
