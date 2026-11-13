'use client';

import {
  Container,
  Stack,
  Title,
  Text,
  Group,
  Badge,
  Paper,
  SimpleGrid,
  CopyButton,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowRight,
  IconDownload,
  IconCopy,
  IconCheck,
  IconTerminal2,
  IconBolt,
  IconTargetArrow,
  IconLayersLinked,
  IconCoin,
  IconSparkles,
} from '@tabler/icons-react';
import Link from 'next/link';
import { FButton } from '@/components/ui/FButton';
import { useAuth } from '@/contexts/AuthContext';

export function HeroSection() {
  const { user } = useAuth();
  const cliCommand = 'npx repomind-ai analyze https://github.com/facebook/react';

  const metrics = [
    {
      value: '< 350ms',
      label: 'Hybrid Retrieval Latency',
      sublabel: 'Dense vectors + BM25 fused via RRF',
      icon: <IconBolt size={20} color="#1C7ED6" />,
    },
    {
      value: '99.8%',
      label: 'AST Extraction Precision',
      sublabel: 'Zero sandbox execution vulnerabilities',
      icon: <IconTargetArrow size={20} color="#10B981" />,
    },
    {
      value: '5+ Frameworks',
      label: 'Native Polyglot AST',
      sublabel: 'NestJS, Express, FastAPI, Spring, Go',
      icon: <IconLayersLinked size={20} color="#8B5CF6" />,
    },
    {
      value: '62% Less',
      label: 'LLM Token Overhead',
      sublabel: 'Strict semantic boundary pruning',
      icon: <IconCoin size={20} color="#F59E0B" />,
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        paddingTop: '64px',
        paddingBottom: '72px',
        overflow: 'hidden',
        background: `
          radial-gradient(circle at 50% 0%, rgba(28, 126, 214, 0.08) 0%, transparent 65%),
          radial-gradient(#CBD5E1 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 28px 28px',
        borderBottom: '1px solid #E2E8F0',
      }}
    >
      <Container size="lg">
        <Stack align="center" gap="xl" ta="center">
          {/* Engineering Status Pill */}
          <Group
            gap={8}
            px={14}
            py={6}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 9999,
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
                display: 'inline-block',
              }}
            />
            <Text size="xs" fw={700} c="#334155" lts={0.5}>
              AST-AWARE CODEBASE INTELLIGENCE & ARCHITECTURE ENGINE
            </Text>
            <Badge size="xs" variant="light" color="blue" radius="xl">
              v1.2 Prod
            </Badge>
          </Group>

          {/* Differentiated Hero Headline */}
          <Title
            order={1}
            fw={900}
            lts={-1.5}
            lh={1.12}
            c="#0F172A"
            maw={840}
            style={{
              fontSize: 'clamp(2.25rem, 5.5vw, 3.6rem)',
            }}
          >
            Don&apos;t just query codebases.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #1C7ED6 20%, #2563EB 80%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block',
              }}
            >
              Understand their architecture.
            </span>
          </Title>

          {/* Technical Subheadline */}
          <Text size="xl" c="#64748B" maw={740} lh={1.6} fw={450}>
            An enterprise repository intelligence platform that statically extracts{' '}
            <strong style={{ color: '#1E293B', fontWeight: 650 }}>
              Abstract Syntax Trees (AST)
            </strong>
            , indexes code into Qdrant using{' '}
            <strong style={{ color: '#1E293B', fontWeight: 650 }}>
              hybrid vector + BM25 retrieval
            </strong>
            , and auto-generates interactive Mermaid diagrams, API specs, and developer onboarding handbooks.
          </Text>

          {/* Action CTAs */}
          <Group gap="md" mt="sm" wrap="wrap" justify="center">
            <FButton
              size="lg"
              radius="md"
              component={Link}
              href={user ? '/dashboard' : '/login'}
              rightSection={<IconArrowRight size={18} />}
              px="xl"
              style={{
                boxShadow: '0 4px 14px rgba(28, 126, 214, 0.35)',
              }}
            >
              {user ? 'Open Dashboard' : 'Get Started Free'}
            </FButton>

            <FButton
              size="lg"
              variant="default"
              radius="md"
              component="a"
              href="#sandbox"
              leftSection={<IconSparkles size={18} color="#1C7ED6" />}
              px="xl"
            >
              Explore Live Sandbox
            </FButton>

            <FButton
              size="lg"
              variant="subtle"
              color="gray"
              radius="md"
              component="a"
              href="/assets/RepoMind_AI_Architecture_Case_Study.pdf"
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<IconDownload size={18} />}
            >
              Whitepaper (PDF)
            </FButton>
          </Group>

          {/* macOS Terminal Quick-Run Snippet */}
          <Paper
            withBorder
            p="xs"
            px="md"
            radius="md"
            mt="md"
            style={{
              backgroundColor: '#0F172A',
              borderColor: '#1E293B',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
              maxWidth: 620,
              width: '100%',
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap={8} wrap="nowrap">
                <Group gap={6} mr="xs">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: '#EF4444',
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: '#F59E0B',
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      display: 'inline-block',
                      backgroundColor: '#10B981',
                    }}
                  />
                </Group>
                <IconTerminal2 size={16} color="#64748B" />
                <Text
                  size="xs"
                  ff="monospace"
                  c="#E2E8F0"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ color: '#38BDF8' }}>$</span> {cliCommand}
                </Text>
              </Group>

              <CopyButton value={cliCommand} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied to clipboard' : 'Copy command'} withArrow>
                    <ActionIcon
                      color={copied ? 'teal' : 'gray'}
                      variant="subtle"
                      onClick={copy}
                      size="sm"
                      aria-label="Copy CLI command"
                    >
                      {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Paper>

          {/* Key Engineering Metrics Grid */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mt="xl" w="100%">
            {metrics.map((m, idx) => (
              <Paper
                key={idx}
                p="md"
                radius="md"
                withBorder
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  textAlign: 'left',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                }}
              >
                <Group justify="space-between" mb={6}>
                  <Text fw={800} size="1.4rem" c="#0F172A" lts={-0.5}>
                    {m.value}
                  </Text>
                  {m.icon}
                </Group>
                <Text fw={700} size="sm" c="#1E293B">
                  {m.label}
                </Text>
                <Text size="xs" c="#64748B" mt={2}>
                  {m.sublabel}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </div>
  );
}

