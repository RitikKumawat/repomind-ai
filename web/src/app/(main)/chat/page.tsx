'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Container,
  Group,
  Stack,
  Text,
  Badge,
  Paper,
  ScrollArea,
  Loader,
  Center,
  Title,
} from '@mantine/core';
import {
  IconCpu,
  IconGitBranch,
  IconAlertCircle,
  IconMessageCode,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useUserRepos } from '@/hooks/repo/useRepoQueries';
import {
  useChatSessions,
  useChatMessages,
  useCreateSessionMutation,
  useRenameSessionMutation,
  useDeleteSessionMutation,
  useStreamChat,
} from '@/hooks/chat/useChatQueries';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatMessageItemView } from '@/components/chat/ChatMessageItem';
import { ChatInput } from '@/components/chat/ChatInput';
import { CodeCitationDrawer } from '@/components/chat/CodeCitationDrawer';
import { SwitchBranchModal } from '@/components/repo/SwitchBranchModal';
import type { CitationItem, ChatMessageItem } from '@/types/chat';
import { RepoStatus } from '@/enums';

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const repoIdParam = searchParams.get('repoId');
  const sessionIdParam = searchParams.get('sessionId');

  const { data: repos, isLoading: isLoadingRepos } = useUserRepos();

  // Ready repositories
  const readyRepos = (repos || []).filter((r) => r.status === RepoStatus.READY);

  // Derive active repository ID from query params or fallback to the first ready repo
  const selectedRepoId = repoIdParam || (readyRepos.length > 0 ? readyRepos[0].id : null);
  const currentRepo = readyRepos.find((r) => r.id === selectedRepoId);

  // Fetch sessions for selected repo
  const { data: sessions = [], isLoading: isLoadingSessions } = useChatSessions(
    selectedRepoId
  );

  // Derive active session ID from query params or fallback to the latest session
  const activeSessionId = sessionIdParam || (sessions.length > 0 ? sessions[0].id : null);
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Fetch messages for active session
  const { data: dbMessages = [] } = useChatMessages(
    selectedRepoId,
    activeSessionId
  );

  // Local state for citation drawer and optimistic messages
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);
  const [citationDrawerOpen, setCitationDrawerOpen] = useState(false);
  const [branchModalOpened, setBranchModalOpened] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessageItem[]>([]);

  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Mutations
  const createSessionMutation = useCreateSessionMutation(selectedRepoId);
  const renameSessionMutation = useRenameSessionMutation(selectedRepoId);
  const deleteSessionMutation = useDeleteSessionMutation(selectedRepoId);

  // Streaming Hook
  const {
    isStreaming,
    streamingContent,
    streamingCitations,
    reasoningSteps,
    sendMessage,
    abortStream,
  } = useStreamChat();

  // Combined messages: DB persisted + pending optimistic items
  const displayMessages: ChatMessageItem[] = [
    ...dbMessages,
    ...optimisticMessages.filter(
      (opt) => !dbMessages.some((m) => m.content === opt.content && m.role === opt.role)
    ),
  ];

  // Auto-scroll to bottom on token stream or message change
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: isStreaming ? 'auto' : 'smooth',
      });
    }
  }, [streamingContent, displayMessages.length, isStreaming]);

  const handleSelectRepo = (repoId: string) => {
    setOptimisticMessages([]);
    router.push(`/chat?repoId=${repoId}`);
  };

  const handleSelectSession = (sessionId: string) => {
    setOptimisticMessages([]);
    if (selectedRepoId) {
      router.push(`/chat?repoId=${selectedRepoId}&sessionId=${sessionId}`);
    }
  };

  const handleCreateSession = async () => {
    if (!selectedRepoId) return;
    try {
      setOptimisticMessages([]);
      const newSession = await createSessionMutation.mutateAsync();
      router.push(`/chat?repoId=${selectedRepoId}&sessionId=${newSession.id}`);
    } catch {
      // Handled in mutation onError
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSessionMutation.mutateAsync(sessionId);
    if (activeSessionId === sessionId) {
      setOptimisticMessages([]);
      const remaining = sessions.filter((s) => s.id !== sessionId);
      if (remaining.length > 0) {
        if (selectedRepoId) {
          router.replace(`/chat?repoId=${selectedRepoId}&sessionId=${remaining[0].id}`);
        }
      } else if (selectedRepoId) {
        router.replace(`/chat?repoId=${selectedRepoId}`);
      }
    }
  };

  const handleSendMessage = (messageText: string) => {
    if (!selectedRepoId) {
      notifications.show({
        title: 'No Repository',
        message: 'Please select an indexed repository first.',
        color: 'red',
      });
      return;
    }

    if (!activeSessionId) {
      // Create session first, then dispatch
      void (async () => {
        try {
          const newSession = await createSessionMutation.mutateAsync();
          router.replace(`/chat?repoId=${selectedRepoId}&sessionId=${newSession.id}`);
          sendChatMessage(selectedRepoId, newSession.id, messageText);
        } catch {
          // Handled
        }
      })();
      return;
    }

    sendChatMessage(selectedRepoId, activeSessionId, messageText);
  };

  const sendChatMessage = (repoId: string, sessionId: string, messageText: string) => {
    const tempUserMsg: ChatMessageItem = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMessages((prev) => [...prev, tempUserMsg]);

    void sendMessage({
      repoId,
      sessionId,
      message: messageText,
      onComplete: () => {
        setOptimisticMessages([]);
        void queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
        void queryClient.invalidateQueries({ queryKey: ['chat-sessions', repoId] });
      },
      onError: (err) => {
        notifications.show({
          title: 'AI Reasoning Error',
          message: err,
          color: 'red',
        });
      },
    });
  };

  const handleCitationClick = (citation: CitationItem) => {
    setActiveCitation(citation);
    setCitationDrawerOpen(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* Left Sidebar */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <ChatSidebar
          repos={repos || []}
          selectedRepoId={selectedRepoId}
          onSelectRepo={handleSelectRepo}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onRenameSession={(id, title) =>
            renameSessionMutation.mutate({ sessionId: id, title })
          }
          onDeleteSession={handleDeleteSession}
          isCreatingSession={createSessionMutation.isPending}
        />
      </div>

      {/* Main Chat Canvas */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Top Header Bar */}
        <Paper
          p="sm"
          px="lg"
          style={{
            borderBottom: '1px solid var(--mantine-color-gray-2)',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Group gap="sm">
            <IconMessageCode size={20} color="var(--mantine-color-indigo-6)" />
            <Stack gap={0}>
              <Text fw={700} size="sm">
                {activeSession?.title || 'Codebase Chat'}
              </Text>
              {currentRepo && (
                <Group gap={6}>
                  <Text size="xs" c="dimmed">
                    {currentRepo.repoName}
                  </Text>
                  <Badge
                    size="xs"
                    variant="outline"
                    color="indigo"
                    leftSection={<IconGitBranch size={10} />}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setBranchModalOpened(true)}
                    title="Click to switch branch & re-index"
                  >
                    {currentRepo.defaultBranch}
                  </Badge>
                </Group>
              )}
            </Stack>
          </Group>

          {currentRepo && (
            <Group gap="xs">
              <Badge color="indigo" variant="light" size="sm" leftSection={<IconCpu size={12} />}>
                {currentRepo.totalChunks} Chunks Grounded
              </Badge>
              <Badge color="teal" variant="light" size="sm">
                Hybrid Search + FlashRank
              </Badge>
            </Group>
          )}
        </Paper>

        {/* Message Canvas Area */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {isLoadingRepos || (isLoadingSessions && sessions.length === 0) ? (
            <Center h="100%">
              <Stack align="center" gap="sm">
                <Loader size="md" color="indigo" />
                <Text size="sm" c="dimmed">
                  Initializing codebase intelligence environment...
                </Text>
              </Stack>
            </Center>
          ) : readyRepos.length === 0 ? (
            <Center h="100%">
              <Paper withBorder p="xl" radius="md" maw={450} ta="center">
                <Stack align="center" gap="md">
                  <IconAlertCircle size={40} color="orange" />
                  <Title order={4}>No Indexed Codebase Found</Title>
                  <Text size="sm" c="dimmed">
                    To start chatting with a codebase, please import and index a repository
                    from your dashboard first.
                  </Text>
                </Stack>
              </Paper>
            </Center>
          ) : (
            <ScrollArea
              viewportRef={viewportRef}
              h="100%"
              p="lg"
              styles={{
                viewport: {
                  paddingBottom: 24,
                },
              }}
            >
              <Container size="md" p={0}>
                <Stack gap="xl">
                  {/* Previous turns */}
                  {displayMessages.map((msg) => (
                    <ChatMessageItemView
                      key={msg.id}
                      message={msg}
                      onCitationClick={handleCitationClick}
                    />
                  ))}

                  {/* Active streaming assistant message */}
                  {isStreaming && (
                    <ChatMessageItemView
                      message={{
                        id: 'streaming-live',
                        role: 'assistant',
                        content: streamingContent,
                        citations: streamingCitations,
                      }}
                      isStreaming={true}
                      reasoningSteps={reasoningSteps}
                      onCitationClick={handleCitationClick}
                    />
                  )}
                </Stack>
              </Container>
            </ScrollArea>
          )}
        </div>

        {/* Bottom Input Area */}
        <Paper
          p="md"
          px="lg"
          style={{
            borderTop: '1px solid var(--mantine-color-gray-2)',
            backgroundColor: '#ffffff',
          }}
        >
          <Container size="md" p={0}>
            <ChatInput
              onSendMessage={handleSendMessage}
              isStreaming={isStreaming}
              onAbort={abortStream}
              disabled={readyRepos.length === 0 || !selectedRepoId}
              showSuggestions={displayMessages.length === 0 && !isStreaming}
            />
          </Container>
        </Paper>
      </div>

      {/* Code Citation Inspection Drawer */}
      <CodeCitationDrawer
        opened={citationDrawerOpen}
        onClose={() => setCitationDrawerOpen(false)}
        citation={activeCitation}
        repoId={selectedRepoId}
        githubUrl={currentRepo?.githubUrl}
        defaultBranch={currentRepo?.defaultBranch}
      />

      <SwitchBranchModal
        opened={branchModalOpened}
        onClose={() => setBranchModalOpened(false)}
        repo={currentRepo || null}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <Center h="calc(100vh - 64px)">
          <Loader size="md" color="indigo" />
        </Center>
      }
    >
      <ChatContent />
    </Suspense>
  );
}

