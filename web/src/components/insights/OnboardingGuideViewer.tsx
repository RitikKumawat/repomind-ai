'use client';

import { useState } from 'react';
import {
  Paper,
  Stack,
  Group,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconCopy,
  IconCheck,
  IconBook,
} from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface OnboardingGuideViewerProps {
  markdown: string;
}

export function OnboardingGuideViewer({ markdown }: OnboardingGuideViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md" pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <Group gap="xs">
            <IconBook size={20} color="var(--mantine-color-indigo-6)" />
            <Text fw={700} size="md">
              Developer Onboarding Handbook
            </Text>
            <Badge color="teal" variant="light" size="xs">
              AI Generated
            </Badge>
          </Group>

          <Tooltip label={copied ? 'Copied Full Guide!' : 'Copy Markdown'}>
            <ActionIcon
              variant="light"
              color={copied ? 'teal' : 'gray'}
              onClick={handleCopy}
            >
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        </Group>

        <div style={{ lineHeight: 1.7, fontSize: '14px' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <Text fw={800} size="xl" mt="lg" mb="sm" c="indigo.9">
                  {children}
                </Text>
              ),
              h2: ({ children }) => (
                <Text fw={700} size="lg" mt="md" mb="xs" c="indigo.8">
                  {children}
                </Text>
              ),
              h3: ({ children }) => (
                <Text fw={600} size="md" mt="sm" mb="xs">
                  {children}
                </Text>
              ),
              p: ({ children }) => (
                <Text size="sm" mb="sm" c="gray.8">
                  {children}
                </Text>
              ),
              ul: ({ children }) => (
                <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ paddingLeft: '20px', marginBottom: '12px' }}>{children}</ol>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: '4px', fontSize: '14px' }}>{children}</li>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes('language-');
                if (isBlock) {
                  return (
                    <div
                      style={{
                        position: 'relative',
                        margin: '12px 0',
                        borderRadius: '6px',
                        backgroundColor: 'var(--mantine-color-dark-8, #1a1b1e)',
                        color: '#f8f9fa',
                        padding: '12px 16px',
                        overflowX: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      }}
                    >
                      <code>{children}</code>
                    </div>
                  );
                }
                return (
                  <code
                    style={{
                      backgroundColor: 'var(--mantine-color-gray-1)',
                      color: 'var(--mantine-color-indigo-8)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {children}
                  </code>
                );
              },
              table: ({ children }) => (
                <div style={{ overflowX: 'auto', margin: '14px 0' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                      textAlign: 'left',
                    }}
                  >
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th
                  style={{
                    backgroundColor: 'var(--mantine-color-gray-1)',
                    padding: '8px 12px',
                    border: '1px solid var(--mantine-color-gray-3)',
                    fontWeight: 700,
                  }}
                >
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--mantine-color-gray-2)',
                  }}
                >
                  {children}
                </td>
              ),
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </Paper>
    </Stack>
  );
}
