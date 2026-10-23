'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { notifications } from '@mantine/notifications';
import type {
  ChatSessionItem,
  ChatMessageItem,
  CitationItem,
  ReasoningStep,
} from '@/types/chat';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useChatSessions(repoId: string | null) {
  return useQuery<ChatSessionItem[]>({
    queryKey: ['chat-sessions', repoId],
    queryFn: async () => {
      if (!repoId) return [];
      const res = await api.get<ChatSessionItem[]>(`/repo/${repoId}/chat/sessions`);
      return res.data;
    },
    enabled: Boolean(repoId),
  });
}

export function useChatMessages(repoId: string | null, sessionId: string | null) {
  return useQuery<ChatMessageItem[]>({
    queryKey: ['chat-messages', sessionId],
    queryFn: async () => {
      if (!repoId || !sessionId) return [];
      const res = await api.get<ChatMessageItem[]>(
        `/repo/${repoId}/chat/sessions/${sessionId}/messages`
      );
      return res.data;
    },
    enabled: Boolean(repoId && sessionId),
  });
}

export function useCreateSessionMutation(repoId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title?: string) => {
      if (!repoId) throw new Error('No repository selected');
      const res = await api.post<ChatSessionItem>(`/repo/${repoId}/chat/sessions`, {
        title,
      });
      return res.data;
    },
    onSuccess: (newSession) => {
      void queryClient.invalidateQueries({ queryKey: ['chat-sessions', repoId] });
      return newSession;
    },
    onError: () => {
      notifications.show({
        title: 'Session Error',
        message: 'Could not create new chat session.',
        color: 'red',
      });
    },
  });
}

export function useRenameSessionMutation(repoId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      title,
    }: {
      sessionId: string;
      title: string;
    }) => {
      if (!repoId) throw new Error('No repository selected');
      const res = await api.patch<ChatSessionItem>(
        `/repo/${repoId}/chat/sessions/${sessionId}`,
        { title }
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-sessions', repoId] });
      notifications.show({
        title: 'Session Renamed',
        message: 'Chat title updated successfully.',
        color: 'teal',
      });
    },
  });
}

export function useDeleteSessionMutation(repoId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!repoId) throw new Error('No repository selected');
      await api.delete(`/repo/${repoId}/chat/sessions/${sessionId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-sessions', repoId] });
      notifications.show({
        title: 'Session Deleted',
        message: 'Chat session removed.',
        color: 'gray',
      });
    },
  });
}

export function useRepoFileContent(repoId: string | null, filePath: string | null) {
  return useQuery<{ path: string; content: string }>({
    queryKey: ['repo-file', repoId, filePath],
    queryFn: async () => {
      if (!repoId || !filePath) throw new Error('Missing repo or file path');
      const res = await api.get<{ path: string; content: string }>(
        `/repo/${repoId}/file?path=${encodeURIComponent(filePath)}`
      );
      return res.data;
    },
    enabled: Boolean(repoId && filePath),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStreamChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingCitations, setStreamingCitations] = useState<CitationItem[]>([]);
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const sendMessage = useCallback(
    async ({
      repoId,
      sessionId,
      message,
      onComplete,
      onError,
    }: {
      repoId: string;
      sessionId: string;
      message: string;
      onComplete?: () => void;
      onError?: (err: string) => void;
    }) => {
      setIsStreaming(true);
      setStreamingContent('');
      setStreamingCitations([]);
      setReasoningSteps([]);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(
          `${API_BASE_URL}/repo/${repoId}/chat/sessions/${sessionId}/messages/stream`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ message }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        if (!response.body) {
          throw new Error('ReadableStream not supported by browser or response');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const rawData = line.slice(6).trim();
              try {
                const parsed: unknown = JSON.parse(rawData);

                if (currentEvent === 'status') {
                  const statusObj = parsed as {
                    step: ReasoningStep['step'];
                    message: string;
                  };
                  setReasoningSteps((prev) => [
                    ...prev,
                    {
                      step: statusObj.step || 'analyzing',
                      message: statusObj.message,
                      timestamp: Date.now(),
                    },
                  ]);
                } else if (currentEvent === 'citations') {
                  if (Array.isArray(parsed)) {
                    setStreamingCitations(parsed as CitationItem[]);
                  }
                } else if (currentEvent === 'token') {
                  const tokenObj = parsed as { text: string };
                  if (tokenObj.text) {
                    setStreamingContent((prev) => prev + tokenObj.text);
                  }
                } else if (currentEvent === 'error') {
                  const errObj = parsed as { error: string };
                  onError?.(errObj.error || 'Stream error occurred.');
                }
              } catch {
                // ignore partial json
              }
            }
          }
        }

        setIsStreaming(false);
        abortControllerRef.current = null;
        onComplete?.();
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          setIsStreaming(false);
          return;
        }
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to stream response.';
        setIsStreaming(false);
        abortControllerRef.current = null;
        onError?.(errorMsg);
      }
    },
    []
  );

  return {
    isStreaming,
    streamingContent,
    streamingCitations,
    reasoningSteps,
    sendMessage,
    abortStream,
  };
}
