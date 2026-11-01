'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import type {
  ArchitectureDoc,
  EndpointDoc,
  RepoInsightsResponse,
} from '@/types/insights';

export function useRepoInsights(repoId?: string, enabled = true) {
  return useQuery<RepoInsightsResponse>({
    queryKey: ['insights', repoId, 'all'],
    queryFn: async () => {
      if (!repoId) throw new Error('Repo ID required');
      const res = await api.get<RepoInsightsResponse>(
        `/repo/${repoId}/insights/all`
      );
      return res.data;
    },
    enabled: Boolean(repoId && enabled),
    staleTime: 5 * 60 * 1000,
  });
}

export function useArchitecture(repoId?: string, enabled = true) {
  return useQuery<ArchitectureDoc>({
    queryKey: ['insights', repoId, 'architecture'],
    queryFn: async () => {
      if (!repoId) throw new Error('Repo ID required');
      const res = await api.get<ArchitectureDoc>(
        `/repo/${repoId}/insights/architecture`
      );
      return res.data;
    },
    enabled: Boolean(repoId && enabled),
    staleTime: 5 * 60 * 1000,
  });
}

export function useApiDocs(repoId?: string, enabled = true) {
  return useQuery<EndpointDoc[]>({
    queryKey: ['insights', repoId, 'api-docs'],
    queryFn: async () => {
      if (!repoId) throw new Error('Repo ID required');
      const res = await api.get<EndpointDoc[]>(
        `/repo/${repoId}/insights/api-docs`
      );
      return res.data;
    },
    enabled: Boolean(repoId && enabled),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOnboardingGuide(repoId?: string, enabled = true) {
  return useQuery<string>({
    queryKey: ['insights', repoId, 'onboarding'],
    queryFn: async () => {
      if (!repoId) throw new Error('Repo ID required');
      const res = await api.get<string>(
        `/repo/${repoId}/insights/onboarding`
      );
      return res.data;
    },
    enabled: Boolean(repoId && enabled),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegenerateInsightsMutation(
  repoId: string,
  onSuccessCallback?: () => void
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: 'architecture' | 'api-docs' | 'onboarding' | 'all' = 'all') => {
      const res = await api.post(`/repo/${repoId}/insights/regenerate`, { type });
      return res.data;
    },
    onSuccess: (_, type) => {
      notifications.show({
        title: 'Insights Regenerated',
        message: `Successfully regenerated ${type} insights for this repository.`,
        color: 'teal',
      });
      void queryClient.invalidateQueries({ queryKey: ['insights', repoId] });
      if (onSuccessCallback) {
        onSuccessCallback();
      }
    },
    onError: (error: unknown) => {
      let message = 'Failed to generate insights.';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        message = String(error.response.data.message);
      }
      notifications.show({
        title: 'Generation Failed',
        message,
        color: 'red',
      });
    },
  });
}
