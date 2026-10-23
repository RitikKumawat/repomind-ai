'use client';

import {
  Drawer,
  Stack,
  Group,
  Text,
  Badge,
  Loader,
  Center,
  Paper,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconFileCode,
  IconCopy,
  IconCheck,
  IconExternalLink,
} from '@tabler/icons-react';
import { useState } from 'react';
import { CodeHighlight } from '@mantine/code-highlight';
import { useRepoFileContent } from '@/hooks/chat/useChatQueries';
import type { CitationItem } from '@/types/chat';

interface CodeCitationDrawerProps {
  opened: boolean;
  onClose: () => void;
  citation: CitationItem | null;
  repoId: string | null;
  githubUrl?: string;
  defaultBranch?: string;
}

export function CodeCitationDrawer({
  opened,
  onClose,
  citation,
  repoId,
  githubUrl,
  defaultBranch = 'main',
}: CodeCitationDrawerProps) {
  const [copied, setCopied] = useState(false);

  const { data: fileData, isLoading, error } = useRepoFileContent(
    repoId,
    citation?.filePath || null
  );

  const handleCopyCode = () => {
    if (fileData?.content) {
      void navigator.clipboard.writeText(fileData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'tsx';
      case 'js':
      case 'jsx':
        return 'jsx';
      case 'py':
        return 'python';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      case 'json':
        return 'json';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'css':
      case 'scss':
        return 'css';
      case 'html':
        return 'html';
      default:
        return 'typescript';
    }
  };

  const githubFileUrl =
    githubUrl && citation
      ? `${githubUrl.replace(/\/+$/, '')}/blob/${defaultBranch}/${citation.filePath}#L${citation.startLine}-L${citation.endLine}`
      : undefined;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="xl"
      title={
        <Group gap="xs">
          <IconFileCode size={20} color="var(--mantine-color-indigo-6)" />
          <Text fw={700} size="sm" truncate maw={320}>
            {citation?.filePath || 'Source Code Inspection'}
          </Text>
        </Group>
      }
    >
      <Stack gap="md" h="100%">
        {/* Meta Bar */}
        {citation && (
          <Paper withBorder p="xs" radius="md" bg="var(--mantine-color-gray-0)">
            <Group justify="space-between" wrap="wrap">
              <Group gap="xs">
                <Badge color="indigo" variant="light" size="sm">
                  Lines {citation.startLine} - {citation.endLine}
                </Badge>
                {citation.scope && (
                  <Badge color="gray" variant="outline" size="sm">
                    Scope: {citation.scope}
                  </Badge>
                )}
              </Group>

              <Group gap="xs">
                {githubFileUrl && (
                  <Tooltip label="View on GitHub" withArrow>
                    <ActionIcon
                      component="a"
                      href={githubFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      size="sm"
                      variant="subtle"
                      color="gray"
                    >
                      <IconExternalLink size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
                <Tooltip label={copied ? 'Copied file!' : 'Copy full file'} withArrow>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color={copied ? 'teal' : 'gray'}
                    onClick={handleCopyCode}
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Paper>
        )}

        {/* Content Viewer */}
        {isLoading ? (
          <Center py={60}>
            <Stack align="center" gap="xs">
              <Loader size="md" color="indigo" />
              <Text size="xs" c="dimmed">
                Fetching file content from repository...
              </Text>
            </Stack>
          </Center>
        ) : error || !fileData ? (
          <Center py={60}>
            <Text size="sm" c="red">
              Could not load file content. Please verify GitHub permissions.
            </Text>
          </Center>
        ) : (
          <Paper
            withBorder
            radius="md"
            style={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <CodeHighlight
                code={fileData.content}
                language={getLanguageFromPath(citation?.filePath || '')}
                withCopyButton
              />
            </div>
          </Paper>
        )}
      </Stack>
    </Drawer>
  );
}
