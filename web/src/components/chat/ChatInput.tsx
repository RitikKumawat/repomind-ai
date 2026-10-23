'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Stack,
  Group,
  Textarea,
  ActionIcon,
  Paper,
  Text,
  Badge,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowUp,
  IconPlayerStop,
  IconSparkles,
} from '@tabler/icons-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isStreaming?: boolean;
  onAbort?: () => void;
  disabled?: boolean;
  showSuggestions?: boolean;
}

const SUGGESTED_PROMPTS = [
  'Explain the overall architecture and folder structure of this codebase.',
  'How is authentication and session management implemented here?',
  'Where are the database entities and schema migrations defined?',
  'List the main API endpoints and explain the request lifecycle.',
];

export function ChatInput({
  onSendMessage,
  isStreaming,
  onAbort,
  disabled,
  showSuggestions,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!disabled && !isStreaming) {
      textareaRef.current?.focus();
    }
  }, [disabled, isStreaming]);

  const handleSend = () => {
    if (input.trim() && !isStreaming && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Stack gap="xs" style={{ width: '100%' }}>
      {/* Suggested Prompts (shown on empty chat) */}
      {showSuggestions && (
        <Stack gap={6} pb="xs">
          <Group gap={6}>
            <IconSparkles size={14} color="var(--mantine-color-indigo-6)" />
            <Text size="xs" fw={700} c="dimmed">
              Suggested Questions
            </Text>
          </Group>
          <Group gap="xs" wrap="wrap">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <Badge
                key={idx}
                size="sm"
                variant="outline"
                color="indigo"
                style={{
                  cursor: 'pointer',
                  textTransform: 'none',
                  fontWeight: 500,
                  height: 'auto',
                  padding: '6px 10px',
                }}
                onClick={() => onSendMessage(prompt)}
              >
                {prompt}
              </Badge>
            ))}
          </Group>
        </Stack>
      )}

      {/* Input Box */}
      <Paper
        withBorder
        p="xs"
        radius="lg"
        bg="#ffffff"
        style={{
          borderColor: isStreaming
            ? 'var(--mantine-color-indigo-4)'
            : 'var(--mantine-color-gray-3)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <Group align="flex-end" gap="xs" wrap="nowrap">
          <Textarea
            ref={textareaRef}
            placeholder="Ask anything about this codebase... (Press Enter to send, Shift+Enter for newline)"
            autosize
            minRows={2}
            maxRows={6}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            variant="unstyled"
            style={{ flex: 1 }}
            styles={{
              input: {
                fontSize: '14px',
                lineHeight: 1.5,
                padding: '4px 6px',
              },
            }}
          />

          {isStreaming ? (
            <Tooltip label="Stop Generation" withArrow>
              <ActionIcon
                size="lg"
                radius="xl"
                color="red"
                variant="filled"
                onClick={onAbort}
              >
                <IconPlayerStop size={18} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Tooltip label="Send message (Enter)" withArrow>
              <ActionIcon
                size="lg"
                radius="xl"
                color="indigo"
                variant="filled"
                disabled={!input.trim() || disabled}
                onClick={handleSend}
              >
                <IconArrowUp size={18} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Paper>
    </Stack>
  );
}
