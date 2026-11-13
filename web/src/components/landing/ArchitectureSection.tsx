'use client';

import { useState } from 'react';
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
  Modal,
  Image,
} from '@mantine/core';
import {
  IconCpu,
  IconServer,
  IconDatabase,
  IconDeviceDesktop,
  IconArrowsExchange,
  IconMaximize,
  IconDownload,
} from '@tabler/icons-react';
import { FButton } from '@/components/ui/FButton';

export function ArchitectureSection() {
  const [modalOpened, setModalOpened] = useState(false);

  const tiers = [
    {
      title: 'Next.js 16 Web Dashboard',
      subtitle: 'Presentation & Real-Time Visualization',
      icon: <IconDeviceDesktop size={22} />,
      color: 'blue',
      points: [
        'React 19 Server & Client Components with Mantine UI 9',
        'Dynamic Mermaid.js SVG topology engine with zoom/pan',
        'Server-Sent Events (SSE) streaming chat renderer',
        'Optimistic branch switching via React Query v5',
      ],
      techBadge: 'Next.js 16 • React 19 • Mantine 9',
    },
    {
      title: 'NestJS API Gateway',
      subtitle: 'Auth, Ingestion Queue & Rate Limiting',
      icon: <IconServer size={22} />,
      color: 'indigo',
      points: [
        'Passport.js dual-token JWT authentication with rotation',
        'BullMQ asynchronous job queue backed by Redis',
        'Rate limiting, request deduplication, and input sanitation',
        'TypeORM transactional data layer for repositories and users',
      ],
      techBadge: 'NestJS • TypeScript • TypeORM • BullMQ',
    },
    {
      title: 'Python FastAPI AI Engine',
      subtitle: 'Tree-sitter AST & Agentic Workflows',
      icon: <IconCpu size={22} />,
      color: 'violet',
      points: [
        'Tree-sitter concrete syntax tree parser across 5+ languages',
        'LangGraph multi-step agentic retrieval & citation pipeline',
        'Gemini 2.5 Flash / Pro integration with streaming tokens',
        'Automatic setup handbook & route inventory synthesis',
      ],
      techBadge: 'FastAPI • Tree-sitter • LangGraph • Gemini 2.5',
    },
    {
      title: 'Qdrant & PostgreSQL Storage',
      subtitle: 'Hybrid Vector Indexing & ACID Persistence',
      icon: <IconDatabase size={22} />,
      color: 'teal',
      points: [
        'Qdrant HNSW vector index with cosine similarity metric',
        'Sparse BM25 token index fused via Reciprocal Rank Fusion',
        'PostgreSQL 16 relational store for user, repo, and chat data',
        'Redis 7 in-memory cache for fast session & delta lookups',
      ],
      techBadge: 'Qdrant • PostgreSQL 16 • Redis 7',
    },
  ];

  return (
    <section
      id="architecture"
      style={{
        paddingTop: '80px',
        paddingBottom: '88px',
        backgroundColor: '#F8F9FA',
        scrollMarginTop: '84px',
      }}
    >
      <Container size="xl">
        <Stack align="center" gap="xs" ta="center" mb={48}>
          <Badge size="md" variant="light" color="blue" radius="sm">
            SYSTEM ARCHITECTURE
          </Badge>
          <Title order={2} size="2.4rem" fw={800} c="#0F172A" lts={-0.8}>
            Engineered as a Scalable Distributed Microservices System
          </Title>
          <Text size="md" c="#64748B" maw={680}>
            RepoMind decouples static code analysis, background queuing, and vector search into specialized services built with the right tools for each workload.
          </Text>
        </Stack>

        {/* 4 Tiers Grid */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="xl">
          {tiers.map((tier, idx) => (
            <Paper
              key={idx}
              withBorder
              p="xl"
              radius="md"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <ThemeIcon color={tier.color} variant="light" size="lg" radius="md">
                      {tier.icon}
                    </ThemeIcon>
                    <div>
                      <Text fw={800} size="md" c="#0F172A">
                        {tier.title}
                      </Text>
                      <Text size="xs" c="#64748B">
                        {tier.subtitle}
                      </Text>
                    </div>
                  </Group>
                </Group>

                <Stack gap={8} mt="md">
                  {tier.points.map((pt, pIdx) => (
                    <Group key={pIdx} align="flex-start" gap="xs">
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: '#1C7ED6',
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <Text size="xs" c="#334155" lh={1.5}>
                        {pt}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                <Badge size="xs" variant="outline" color="gray" radius="sm">
                  {tier.techBadge}
                </Badge>
              </div>
            </Paper>
          ))}
        </SimpleGrid>

        {/* High-Resolution System Architecture Blueprint Preview Card */}
        <Paper
          withBorder
          p="lg"
          radius="lg"
          style={{
            backgroundColor: '#0F172A',
            borderColor: '#1E293B',
            color: '#FFFFFF',
          }}
        >
          <Group justify="space-between" mb="md" wrap="wrap">
            <Group gap="xs">
              <ThemeIcon color="blue" variant="filled" size="md" radius="sm">
                <IconArrowsExchange size={18} />
              </ThemeIcon>
              <div>
                <Text fw={700} size="sm" c="#F8FAFC">
                  Production Architecture Blueprint & Ingestion Lifecycle
                </Text>
                <Text size="xs" c="#94A3B8">
                  From GitHub Webhook triggers down to Tree-sitter AST nodes and Qdrant HNSW payloads.
                </Text>
              </div>
            </Group>

            <Group gap="xs">
              <FButton
                size="xs"
                variant="light"
                color="blue"
                leftSection={<IconMaximize size={14} />}
                onClick={() => setModalOpened(true)}
              >
                Expand Blueprint
              </FButton>
              <FButton
                size="xs"
                variant="subtle"
                color="gray"
                component="a"
                href="/assets/RepoMind_AI_Architecture_Case_Study.pdf"
                target="_blank"
                leftSection={<IconDownload size={14} />}
              >
                Download Whitepaper
              </FButton>
            </Group>
          </Group>

          {/* Blueprint Image Preview Thumbnail */}
          <div
            style={{
              position: 'relative',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid #334155',
              cursor: 'pointer',
              backgroundColor: '#020617',
            }}
            onClick={() => setModalOpened(true)}
          >
            <Image
              src="/assets/01_System_Architecture_Diagram.png"
              alt="RepoMind AI System Architecture Diagram"
              radius="sm"
              fit="contain"
              h={280}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.2s ease',
              }}
            >
              <Badge size="md" color="blue" variant="filled">
                Click to inspect full high-resolution diagram
              </Badge>
            </div>
          </div>
        </Paper>

        {/* Full Image Modal */}
        <Modal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          size="90%"
          title={
            <Group gap="xs">
              <Text fw={700}>System Architecture Diagram (High Resolution)</Text>
              <Badge size="xs" color="blue">Production Topology</Badge>
            </Group>
          }
          centered
        >
          <div style={{ backgroundColor: '#0F172A', padding: 12, borderRadius: 8 }}>
            <Image
              src="/assets/01_System_Architecture_Diagram.png"
              alt="Full RepoMind AI System Architecture"
              fit="contain"
            />
          </div>
        </Modal>
      </Container>
    </section>
  );
}
