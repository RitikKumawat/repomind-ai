'use client';

import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Paper,
  Badge,
  ActionIcon,
  Collapse,
  Tooltip,
} from '@mantine/core';
import {
  IconUser,
  IconSparkles,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconCheck,
  IconFileCode,
  IconBrain,
} from '@tabler/icons-react';
import { CodeHighlight } from '@mantine/code-highlight';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessageItem, CitationItem, ReasoningStep } from '@/types/chat';

interface ChatMessageItemProps {
  message: ChatMessageItem;
  isStreaming?: boolean;
  reasoningSteps?: ReasoningStep[];
  onCitationClick?: (citation: CitationItem) => void;
}

export function ChatMessageItemView({
  message,
  isStreaming,
  reasoningSteps,
  onCitationClick,
}: ChatMessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [reasoningOpened, setReasoningOpened] = useState(false);

  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    void navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const citations = message.citations || [];

  return (
    <Group
      align="flex-start"
      gap="md"
      wrap="nowrap"
      justify={isAssistant ? 'flex-start' : 'flex-end'}
      style={{ width: '100%' }}
    >
      {isAssistant && (
        <Paper
          radius="xl"
          p={6}
          bg="var(--mantine-color-indigo-1)"
          style={{
            border: '1px solid var(--mantine-color-indigo-2)',
            flexShrink: 0,
          }}
        >
          <IconSparkles size={18} color="var(--mantine-color-indigo-6)" />
        </Paper>
      )}

      <Stack
        gap="xs"
        style={{
          maxWidth: isAssistant ? '88%' : '75%',
          minWidth: '200px',
        }}
      >
        {/* User Message */}
        {!isAssistant ? (
          <Paper
            p="md"
            radius="lg"
            bg="var(--mantine-color-indigo-6)"
            style={{
              color: '#ffffff',
              borderBottomRightRadius: '4px',
            }}
          >
            <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {message.content}
            </Text>
          </Paper>
        ) : (
          <Paper
            withBorder
            p="md"
            radius="lg"
            bg="#ffffff"
            style={{
              borderColor: 'var(--mantine-color-gray-2)',
              borderBottomLeftRadius: '4px',
            }}
          >
            <Stack gap="sm">
              {/* Reasoning Steps Accordion (if available or streaming) */}
              {reasoningSteps && reasoningSteps.length > 0 && (
                <Paper
                  withBorder
                  p="xs"
                  radius="md"
                  bg="var(--mantine-color-gray-0)"
                  style={{ borderColor: 'var(--mantine-color-gray-2)' }}
                >
                  <Group
                    justify="space-between"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setReasoningOpened((o) => !o)}
                  >
                    <Group gap={6}>
                      <IconBrain size={14} color="var(--mantine-color-indigo-6)" />
                      <Text size="xs" fw={600} c="indigo.8">
                        Agent Reasoning Trace ({reasoningSteps.length} steps)
                      </Text>
                    </Group>
                    <ActionIcon size="xs" variant="subtle" color="gray">
                      {reasoningOpened ? (
                        <IconChevronUp size={14} />
                      ) : (
                        <IconChevronDown size={14} />
                      )}
                    </ActionIcon>
                  </Group>

                  <Collapse expanded={reasoningOpened}>
                    <Stack gap={4} mt="xs" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                      {reasoningSteps.map((step, idx) => (
                        <Group key={idx} gap={6} align="flex-start" wrap="nowrap">
                          <Badge size="xs" variant="dot" color="indigo" style={{ flexShrink: 0 }}>
                            {step.step}
                          </Badge>
                          <Text size="11px" c="dimmed">
                            {step.message}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  </Collapse>
                </Paper>
              )}

              {/* Citations Badges */}
              {citations.length > 0 && (
                <Group gap={6} wrap="wrap">
                  <Text size="xs" fw={700} c="dimmed">
                    Cited Sources:
                  </Text>
                  {citations.map((c, i) => (
                    <Badge
                      key={i}
                      size="sm"
                      variant="light"
                      color="indigo"
                      leftSection={<IconFileCode size={12} />}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onCitationClick?.(c)}
                    >
                      {c.filePath}:{c.startLine}-{c.endLine}
                    </Badge>
                  ))}
                </Group>
              )}

              {/* Rendered Markdown Body */}
              <div className="prose-chat-container">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeContent = String(children).replace(/\n$/, '');

                      if (match) {
                        return (
                          <div style={{ margin: '12px 0' }}>
                            <CodeHighlight
                              code={codeContent}
                              language={match[1]}
                              withCopyButton
                            />
                          </div>
                        );
                      }

                      return (
                        <code
                          style={{
                            backgroundColor: 'var(--mantine-color-gray-1)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    p({ children }) {
                      return (
                        <Text size="sm" style={{ lineHeight: 1.65, marginBottom: 8 }}>
                          {children}
                        </Text>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>

                {isStreaming && (
                  <Text size="xs" c="indigo" fw={600} mt={4}>
                    Generating response...
                  </Text>
                )}
              </div>

              {/* Action footer */}
              {!isStreaming && message.content && (
                <Group justify="flex-end" pt={4}>
                  <Tooltip label={copied ? 'Copied!' : 'Copy response'} withArrow>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color={copied ? 'teal' : 'gray'}
                      onClick={handleCopy}
                    >
                      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>

      {!isAssistant && (
        <Paper
          radius="xl"
          p={6}
          bg="var(--mantine-color-gray-1)"
          style={{
            border: '1px solid var(--mantine-color-gray-3)',
            flexShrink: 0,
          }}
        >
          <IconUser size={18} color="var(--mantine-color-gray-7)" />
        </Paper>
      )}
    </Group>
  );
}
