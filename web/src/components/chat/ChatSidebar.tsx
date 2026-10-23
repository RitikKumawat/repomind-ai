'use client';

import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Paper,
  ScrollArea,
  ActionIcon,
  Menu,
  Modal,
  TextInput,
  Select,
  Badge,
} from '@mantine/core';
import {
  IconPlus,
  IconMessage,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconGitBranch,
  IconCpu,
} from '@tabler/icons-react';
import { FButton } from '@/components/ui/FButton';
import type { ChatSessionItem } from '@/types/chat';
import type { RepositoryItem } from '@/types/repo';
import { RepoStatus } from '@/enums';

interface ChatSidebarProps {
  repos: RepositoryItem[];
  selectedRepoId: string | null;
  onSelectRepo: (repoId: string) => void;
  sessions: ChatSessionItem[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onDeleteSession: (sessionId: string) => void;
  isCreatingSession?: boolean;
}

export function ChatSidebar({
  repos,
  selectedRepoId,
  onSelectRepo,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  isCreatingSession,
}: ChatSidebarProps) {
  const [editingSession, setEditingSession] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const readyRepos = repos.filter((r) => r.status === RepoStatus.READY);
  const selectedRepo = repos.find((r) => r.id === selectedRepoId);

  const handleOpenRename = (session: ChatSessionItem) => {
    setEditingSession({ id: session.id, title: session.title });
    setNewTitle(session.title);
  };

  const handleSaveRename = () => {
    if (editingSession && newTitle.trim()) {
      onRenameSession(editingSession.id, newTitle.trim());
      setEditingSession(null);
    }
  };

  return (
    <Stack
      h="100%"
      p="md"
      gap="md"
      style={{
        borderRight: '1px solid var(--mantine-color-gray-2)',
        backgroundColor: 'var(--mantine-color-gray-0)',
      }}
    >
      {/* Repository Switcher */}
      <Stack gap={6}>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.5}>
          Active Codebase
        </Text>
        <Select
          data={readyRepos.map((r) => ({
            value: r.id,
            label: r.repoName,
          }))}
          value={selectedRepoId}
          onChange={(val) => val && onSelectRepo(val)}
          placeholder="Select an indexed repository"
          allowDeselect={false}
          size="sm"
          radius="md"
          leftSection={<IconGitBranch size={16} color="gray" />}
        />
        {selectedRepo && (
          <Group gap={6} px={4}>
            <IconCpu size={12} color="gray" />
            <Text size="xs" c="dimmed">
              {selectedRepo.totalChunks} indexed AST chunks
            </Text>
          </Group>
        )}
      </Stack>

      {/* New Chat Button */}
      <FButton
        fullWidth
        size="sm"
        leftSection={<IconPlus size={16} />}
        onClick={onCreateSession}
        loading={isCreatingSession}
        disabled={!selectedRepoId}
      >
        New Chat
      </FButton>

      {/* Session Threads List */}
      <Stack gap={6} style={{ flex: 1, overflow: 'hidden' }}>
        <Group justify="space-between" px={4}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.5}>
            Threads
          </Text>
          <Badge size="xs" variant="light" color="indigo">
            {sessions.length}
          </Badge>
        </Group>

        <ScrollArea style={{ flex: 1 }} offsetScrollbars>
          <Stack gap={6} pr={4}>
            {sessions.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" py="xl">
                No chat threads yet. Click &quot;New Chat&quot; to begin.
              </Text>
            ) : (
              sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <Paper
                    key={session.id}
                    withBorder
                    p="xs"
                    radius="md"
                    onClick={() => onSelectSession(session.id)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isActive
                        ? 'var(--mantine-color-indigo-0)'
                        : '#ffffff',
                      borderColor: isActive
                        ? 'var(--mantine-color-indigo-4)'
                        : 'var(--mantine-color-gray-2)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap" gap="xs">
                      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                        <IconMessage
                          size={16}
                          color={
                            isActive
                              ? 'var(--mantine-color-indigo-6)'
                              : 'var(--mantine-color-gray-5)'
                          }
                          style={{ flexShrink: 0 }}
                        />
                        <Text
                          size="xs"
                          fw={isActive ? 600 : 500}
                          c={isActive ? 'indigo.9' : 'gray.8'}
                          truncate
                        >
                          {session.title}
                        </Text>
                      </Group>

                      <Menu position="bottom-end" shadow="md" withinPortal>
                        <Menu.Target>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="gray"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconDotsVertical size={14} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRename(session);
                            }}
                          >
                            Rename
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                            }}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Paper>
                );
              })
            )}
          </Stack>
        </ScrollArea>
      </Stack>

      {/* Rename Modal */}
      <Modal
        opened={Boolean(editingSession)}
        onClose={() => setEditingSession(null)}
        title="Rename Chat Thread"
        size="sm"
        radius="md"
      >
        <Stack gap="md">
          <TextInput
            label="Thread Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
            data-autofocus
          />
          <Group justify="flex-end">
            <FButton variant="default" size="xs" onClick={() => setEditingSession(null)}>
              Cancel
            </FButton>
            <FButton size="xs" onClick={handleSaveRename}>
              Save
            </FButton>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
