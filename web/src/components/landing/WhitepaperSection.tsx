'use client';

import {
  Container,
  Paper,
  Group,
  Stack,
  Title,
  Text,
  Badge,
  SimpleGrid,
  ThemeIcon,
} from '@mantine/core';
import {
  IconDownload,
  IconExternalLink,
  IconCircleCheck,
  IconCertificate,
} from '@tabler/icons-react';
import { FButton } from '@/components/ui/FButton';

export function WhitepaperSection() {
  const chapters = [
    'Tree-sitter Concrete Syntax Tree (CST) Traversal & Chunking Algorithms',
    'Incremental Git SHA Diffing & Multi-Branch Delta Ingestion Pipeline',
    'Qdrant Vector Database Payload Schema & Cosine HNSW Indexing Strategy',
    'Dual-Retriever Reciprocal Rank Fusion (RRF) & Exact Line-Range Citation Engine',
  ];

  return (
    <section
      id="whitepaper"
      style={{
        paddingTop: '80px',
        paddingBottom: '88px',
        backgroundColor: '#F8F9FA',
        scrollMarginTop: '84px',
      }}
    >
      <Container size="lg">
        <Paper
          withBorder
          p={{ base: 'md', sm: 'xl' }}
          radius="lg"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#CBD5E1',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
          }}
        >
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" style={{ alignItems: 'center' }}>
            {/* Left Column: Whitepaper Details */}
            <Stack gap="md">
              <Group gap="xs">
                <Badge size="md" variant="filled" color="blue" radius="sm">
                  OFFICIAL WHITEPAPER
                </Badge>
                <Text size="xs" c="#64748B" fw={600}>
                  Published • 4-Page Technical Report
                </Text>
              </Group>

              <Title
                order={2}
                fw={800}
                c="#0F172A"
                lts={-0.6}
                style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}
              >
                RepoMind AI Architecture & Case Study
              </Title>

              <Text size="sm" c="#475569" lh={1.6}>
                A complete technical breakdown written for engineering leaders, architects, and technical interviewers. Discover how we eliminated RAG hallucinations on source code by replacing token windows with concrete syntax trees.
              </Text>

              <Stack gap={8} mt="xs">
                {chapters.map((chapter, i) => (
                  <Group key={i} align="flex-start" gap="xs">
                    <IconCircleCheck size={16} color="#10B981" style={{ marginTop: 2, flexShrink: 0 }} />
                    <Text size="xs" c="#334155" fw={500}>
                      {chapter}
                    </Text>
                  </Group>
                ))}
              </Stack>

              <Group gap="sm" mt="md" wrap="wrap" w={{ base: '100%', sm: 'auto' }}>
                <FButton
                  size="md"
                  radius="md"
                  component="a"
                  href="/assets/RepoMind_AI_Architecture_Case_Study.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  leftSection={<IconDownload size={18} />}
                  w={{ base: '100%', sm: 'auto' }}
                  style={{ boxShadow: '0 4px 12px rgba(28, 126, 214, 0.25)' }}
                >
                  Download PDF Whitepaper
                </FButton>

                <FButton
                  size="md"
                  variant="default"
                  radius="md"
                  component="a"
                  href="/assets/RepoMind_AI_Architecture_Case_Study.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  leftSection={<IconExternalLink size={16} />}
                  w={{ base: '100%', sm: 'auto' }}
                >
                  Read in Browser
                </FButton>
              </Group>
            </Stack>

            {/* Right Column: Visual Document Preview Card */}
            <Paper
              withBorder
              p={{ base: 'md', sm: 'xl' }}
              radius="md"
              style={{
                backgroundColor: '#0F172A',
                borderColor: '#1E293B',
                color: '#FFFFFF',
                boxShadow: '0 12px 24px rgba(15, 23, 42, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 320,
              }}
            >
              <div>
                <Group justify="space-between" mb="md">
                  <ThemeIcon color="blue" variant="filled" size="lg" radius="md">
                    <IconCertificate size={22} />
                  </ThemeIcon>
                  <Badge size="xs" color="gray" variant="outline" c="#CBD5E1">
                    v1.0 • Technical Paper
                  </Badge>
                </Group>

                <Text fw={800} size="md" c="#F8FAFC" mb={4}>
                  RepoMind AI: Agentic Codebase Intelligence
                </Text>
                <Text size="xs" c="#94A3B8" mb="lg">
                  Multi-Framework Static Route Extraction & Tree-sitter Chunking
                </Text>

                <Paper p="sm" radius="sm" bg="#1E293B" mb="md">
                  <Text size="xs" ff="monospace" c="#38BDF8" mb={2}>
                    {'// Abstract Summary'}
                  </Text>
                  <Text size="11px" c="#CBD5E1" lh={1.4}>
                    &quot;We present an enterprise system architecture that statically indexes multi-language repositories into Qdrant using hybrid vector-BM25 retrieval, achieving 99.8% AST accuracy and sub-350ms retrieval...&quot;
                  </Text>
                </Paper>
              </div>

              <Group justify="space-between" pt="sm" style={{ borderTop: '1px solid #1E293B' }}>
                <Text size="xs" c="#64748B">
                  Format: Vector PDF • 4 Pages
                </Text>
                <Badge size="xs" color="teal" variant="light">
                  Peer-Ready Specs
                </Badge>
              </Group>
            </Paper>
          </SimpleGrid>
        </Paper>
      </Container>
    </section>
  );
}
