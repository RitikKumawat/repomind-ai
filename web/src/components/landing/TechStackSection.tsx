'use client';

import {
  Container,
  Stack,
  Title,
  Text,
  Badge,
  SimpleGrid,
  Paper,
  Group,
  ThemeIcon,
} from '@mantine/core';
import {
  IconDeviceDesktop,
  IconServer,
  IconBrain,
  IconDatabase,
  IconCheck,
} from '@tabler/icons-react';

export function TechStackSection() {
  const categories = [
    {
      title: 'Frontend & UI',
      icon: <IconDeviceDesktop size={20} />,
      color: 'blue',
      items: [
        { name: 'Next.js 16', role: 'App Router & Server Components' },
        { name: 'React 19', role: 'Concurrent rendering & transitions' },
        { name: 'Mantine UI 9', role: 'Accessible design system & hooks' },
        { name: 'Mermaid.js', role: 'Client-side dynamic SVG rendering' },
        { name: 'React Query v5', role: 'Cache hydration & optimistic state' },
      ],
    },
    {
      title: 'API Gateway & Services',
      icon: <IconServer size={20} />,
      color: 'indigo',
      items: [
        { name: 'NestJS', role: 'Modular microservice gateway' },
        { name: 'TypeScript', role: 'End-to-end static type safety' },
        { name: 'TypeORM', role: 'Transactional PostgreSQL migrations' },
        { name: 'Passport.js', role: 'JWT dual-token auth & cookies' },
        { name: 'BullMQ', role: 'Distributed background ingestion jobs' },
      ],
    },
    {
      title: 'AI & Code AST Engine',
      icon: <IconBrain size={20} />,
      color: 'violet',
      items: [
        { name: 'FastAPI', role: 'High-throughput async Python service' },
        { name: 'Tree-sitter', role: 'Polyglot concrete syntax tree parser' },
        { name: 'LangGraph', role: 'Stateful multi-step agentic retrieval' },
        { name: 'Gemini 2.5', role: 'Flash & Pro reasoning and synthesis' },
        { name: 'BM25 + RRF', role: 'Sparse keyword reciprocal rank fusion' },
      ],
    },
    {
      title: 'Data & Infrastructure',
      icon: <IconDatabase size={20} />,
      color: 'teal',
      items: [
        { name: 'Qdrant', role: 'HNSW vector store with payload filters' },
        { name: 'PostgreSQL 16', role: 'Relational ACID user & repo storage' },
        { name: 'Redis 7', role: 'In-memory token cache & task broker' },
        { name: 'Docker Compose', role: 'Reproducible multi-container runtime' },
        { name: 'SSE Streaming', role: 'Real-time token delivery to browser' },
      ],
    },
  ];

  return (
    <section
      id="tech-stack"
      style={{
        paddingTop: '80px',
        paddingBottom: '88px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        scrollMarginTop: '84px',
      }}
    >
      <Container size="xl">
        <Stack align="center" gap="xs" ta="center" mb={48}>
          <Badge size="md" variant="light" color="blue" radius="sm">
            ENGINEERING FOUNDATION
          </Badge>
          <Title
            order={2}
            fw={800}
            c="#0F172A"
            lts={-0.8}
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.4rem)' }}
          >
            Built with Battle-Tested Technologies
          </Title>
          <Text fz={{ base: 'sm', sm: 'md' }} c="#64748B" maw={680}>
            No fragile prototype scripts. Every layer is built with production-ready, type-safe, and scalable enterprise frameworks.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          {categories.map((cat, idx) => (
            <Paper
              key={idx}
              withBorder
              p="lg"
              radius="md"
              style={{
                backgroundColor: '#F8FAFC',
                borderColor: '#E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <Group gap="xs" mb="md">
                <ThemeIcon color={cat.color} variant="light" size="md" radius="md">
                  {cat.icon}
                </ThemeIcon>
                <Text fw={700} size="sm" c="#0F172A">
                  {cat.title}
                </Text>
              </Group>

              <Stack gap="sm">
                {cat.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 6,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <Group justify="space-between" mb={2}>
                      <Text fw={700} size="xs" c="#1E293B">
                        {item.name}
                      </Text>
                      <IconCheck size={13} color="#10B981" />
                    </Group>
                    <Text size="11px" c="#64748B">
                      {item.role}
                    </Text>
                  </div>
                ))}
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Container>
    </section>
  );
}

