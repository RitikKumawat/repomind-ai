'use client';

import { useState } from 'react';
import {
  Stack,
  Group,
  TextInput,
  Text,
  Badge,
  Paper,
  Accordion,
  Table,
  ActionIcon,
  Code,
  Tooltip,
} from '@mantine/core';
import {
  IconSearch,
  IconLock,
  IconWorld,
  IconFileCode,
  IconCopy,
  IconCheck,
} from '@tabler/icons-react';
import type { EndpointDoc } from '@/types/insights';

interface ApiDocsExplorerProps {
  endpoints: EndpointDoc[];
  onOpenCodeCitation?: (filePath: string, startLine: number, endLine: number) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'blue',
  POST: 'teal',
  PUT: 'orange',
  PATCH: 'grape',
  DELETE: 'red',
  OPTIONS: 'gray',
  HEAD: 'gray',
  QUERY: 'indigo',
  MUTATION: 'pink',
  SUBSCRIPTION: 'cyan',
  GRAPHQL: 'violet',
};

export function ApiDocsExplorer({
  endpoints,
  onOpenCodeCitation,
}: ApiDocsExplorerProps) {
  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const availableMethods = ['ALL', ...Array.from(new Set(endpoints.map((e) => e.method)))];

  const filtered = endpoints.filter((endpoint) => {
    const matchesMethod = selectedMethod === 'ALL' || endpoint.method === selectedMethod;
    const matchesSearch =
      search.trim() === '' ||
      endpoint.path.toLowerCase().includes(search.toLowerCase()) ||
      endpoint.summary.toLowerCase().includes(search.toLowerCase()) ||
      (endpoint.handler && endpoint.handler.toLowerCase().includes(search.toLowerCase()));
    return matchesMethod && matchesSearch;
  });

  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <Stack gap="md">
      {/* Search and Filters */}
      <Paper withBorder p="sm" radius="md">
        <Group justify="space-between" align="center" gap="sm">
          <TextInput
            placeholder="Search endpoints by path, description, or handler..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />

          <Group gap={6}>
            {availableMethods.map((method) => {
              const isActive = selectedMethod === method;
              return (
                <Badge
                  key={method}
                  size="sm"
                  color={method === 'ALL' ? 'indigo' : METHOD_COLORS[method] || 'gray'}
                  variant={isActive ? 'filled' : 'light'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedMethod(method)}
                >
                  {method}
                </Badge>
              );
            })}
          </Group>
        </Group>
      </Paper>

      <Group justify="space-between" px="xs">
        <Text size="xs" c="dimmed">
          Showing {filtered.length} of {endpoints.length} API endpoints
        </Text>
      </Group>

      {/* Endpoint List */}
      {filtered.length === 0 ? (
        <Paper withBorder p="xl" radius="md" ta="center">
          <Text c="dimmed" size="sm">
            No endpoints matched your search criteria.
          </Text>
        </Paper>
      ) : (
        <Accordion variant="separated" radius="md">
          {filtered.map((endpoint, idx) => {
            const methodColor = METHOD_COLORS[endpoint.method] || 'gray';
            const itemKey = `${endpoint.method}-${endpoint.path}-${idx}`;

            return (
              <Accordion.Item key={itemKey} value={itemKey}>
                <Accordion.Control>
                  <Group justify="space-between" pr="sm">
                    <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                      <Badge
                        color={methodColor}
                        variant="filled"
                        size="sm"
                        style={{ minWidth: 65, textAlign: 'center' }}
                      >
                        {endpoint.method}
                      </Badge>
                      <Text
                        fw={600}
                        size="sm"
                        ff="monospace"
                        truncate
                        style={{ maxWidth: '60%' }}
                      >
                        {endpoint.path}
                      </Text>
                      {endpoint.summary && (
                        <Text size="xs" c="dimmed" truncate style={{ maxWidth: '30%' }}>
                          — {endpoint.summary}
                        </Text>
                      )}
                    </Group>

                    <Group gap="xs">
                      {endpoint.authRequired ? (
                        <Badge
                          size="xs"
                          variant="light"
                          color="orange"
                          leftSection={<IconLock size={10} />}
                        >
                          {endpoint.authType || 'Auth'}
                        </Badge>
                      ) : (
                        <Badge
                          size="xs"
                          variant="light"
                          color="teal"
                          leftSection={<IconWorld size={10} />}
                        >
                          Public
                        </Badge>
                      )}
                    </Group>
                  </Group>
                </Accordion.Control>

                <Accordion.Panel>
                  <Stack gap="sm" pt="xs">
                    {endpoint.description ? (
                      <Text size="sm">{endpoint.description}</Text>
                    ) : null}

                    {/* Metadata bar */}
                    <Group justify="space-between" p="xs" bg="var(--mantine-color-gray-0)" style={{ borderRadius: 6 }}>
                      <Group gap="xs">
                        <Text size="xs" fw={600} c="dimmed">
                          Handler:
                        </Text>
                        <Code>{endpoint.handler || 'anonymous'}</Code>
                      </Group>

                      <Group gap="xs">
                        <Tooltip label={copiedPath === endpoint.path ? 'Copied!' : 'Copy Path'}>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="gray"
                            onClick={() => handleCopy(endpoint.path)}
                          >
                            {copiedPath === endpoint.path ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          </ActionIcon>
                        </Tooltip>

                        {endpoint.filePath && (
                          <Badge
                            size="xs"
                            variant="outline"
                            color="indigo"
                            leftSection={<IconFileCode size={12} />}
                            style={{ cursor: onOpenCodeCitation ? 'pointer' : 'default' }}
                            onClick={() =>
                              onOpenCodeCitation &&
                              onOpenCodeCitation(endpoint.filePath, endpoint.startLine, endpoint.endLine)
                            }
                          >
                            {endpoint.filePath}:{endpoint.startLine}-{endpoint.endLine}
                          </Badge>
                        )}
                      </Group>
                    </Group>

                    {/* Parameters Table */}
                    {endpoint.parameters && endpoint.parameters.length > 0 && (
                      <Stack gap={4}>
                        <Text size="xs" fw={700} c="dimmed">
                          PARAMETERS
                        </Text>
                        <Table striped withTableBorder withColumnBorders fs="xs">
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Name</Table.Th>
                              <Table.Th>In</Table.Th>
                              <Table.Th>Type</Table.Th>
                              <Table.Th>Required</Table.Th>
                              <Table.Th>Description</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {endpoint.parameters.map((param, pIdx) => (
                              <Table.Tr key={pIdx}>
                                <Table.Td fw={600}>{param.name}</Table.Td>
                                <Table.Td>
                                  <Badge size="xs" variant="light" color="gray">
                                    {param.in}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>
                                  <Code>{param.type}</Code>
                                </Table.Td>
                                <Table.Td>
                                  <Badge size="xs" color={param.required ? 'red' : 'gray'}>
                                    {param.required ? 'Yes' : 'No'}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>{param.description || '—'}</Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </Stack>
                    )}

                    {/* Request/Response Schemas */}
                    <Group grow align="flex-start" mt="xs">
                      {endpoint.requestBodySchema ? (
                        <Stack gap={4}>
                          <Text size="xs" fw={700} c="dimmed">
                            REQUEST PAYLOAD SCHEMA
                          </Text>
                          <Code block style={{ maxHeight: 150, overflowY: 'auto', fontSize: '11px' }}>
                            {typeof endpoint.requestBodySchema === 'string'
                              ? endpoint.requestBodySchema
                              : JSON.stringify(endpoint.requestBodySchema, null, 2)}
                          </Code>
                        </Stack>
                      ) : null}

                      {endpoint.responseSchema ? (
                        <Stack gap={4}>
                          <Text size="xs" fw={700} c="dimmed">
                            RESPONSE SCHEMA
                          </Text>
                          <Code block style={{ maxHeight: 150, overflowY: 'auto', fontSize: '11px' }}>
                            {typeof endpoint.responseSchema === 'string'
                              ? endpoint.responseSchema
                              : JSON.stringify(endpoint.responseSchema, null, 2)}
                          </Code>
                        </Stack>
                      ) : null}
                    </Group>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}
    </Stack>
  );
}
