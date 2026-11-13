'use client';

import {
  Container,
  Paper,
  Stack,
  Title,
  Text,
  Group,
  SimpleGrid,
  Divider,
  ActionIcon,
  Badge,
} from '@mantine/core';
import {
  IconHierarchy2,
  IconArrowRight,
  IconBrandGithub,
  IconBrandLinkedin,
  IconFileText,
} from '@tabler/icons-react';
import Link from 'next/link';
import { FButton } from '@/components/ui/FButton';
import { useAuth } from '@/contexts/AuthContext';

export function Footer() {
  const { user } = useAuth();

  return (
    <footer style={{ backgroundColor: '#0F172A', color: '#F8FAFC', paddingTop: '64px' }}>
      <Container size="lg">
        {/* High-Impact CTA Card */}
        <Paper
          withBorder
          p={{ base: 'xl', md: 48 }}
          radius="xl"
          mb={64}
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            borderColor: '#334155',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.4)',
            textAlign: 'center',
          }}
        >
          <Stack align="center" gap="md">
            <Badge size="md" variant="filled" color="blue" radius="sm">
              ENGINEERED FOR MODERN CODEBASES
            </Badge>

            <Title order={2} size="2.4rem" fw={900} c="#FFFFFF" lts={-0.8} maw={680}>
              Ready to Inspect Codebases with True Architectural Clarity?
            </Title>

            <Text size="md" c="#94A3B8" maw={580} lh={1.6}>
              Deploy RepoMind locally or connect your GitHub repository to generate interactive Mermaid topologies and AST route documentation in seconds.
            </Text>

            <Group gap="md" mt="sm" wrap="wrap" justify="center">
              <FButton
                size="lg"
                radius="md"
                component={Link}
                href={user ? '/dashboard' : '/login'}
                rightSection={<IconArrowRight size={18} />}
                px="xl"
                style={{
                  boxShadow: '0 4px 14px rgba(28, 126, 214, 0.4)',
                }}
              >
                {user ? 'Open Dashboard' : 'Launch Workspace Free'}
              </FButton>

              <FButton
                size="lg"
                variant="default"
                radius="md"
                component="a"
                href="/assets/RepoMind_AI_Architecture_Case_Study.pdf"
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconFileText size={18} />}
                px="xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderColor: '#475569',
                  color: '#FFFFFF',
                }}
              >
                Download Whitepaper
              </FButton>
            </Group>
          </Stack>
        </Paper>

        {/* Footer Navigation Columns */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl" pb={48}>
          {/* Col 1: Brand & Philosophy */}
          <Stack gap="sm">
            <Group gap="xs">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #1C7ED6 0%, #1971C2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <IconHierarchy2 size={18} />
              </div>
              <Text fw={800} size="md" c="#FFFFFF">
                RepoMind AI
              </Text>
            </Group>
            <Text size="xs" c="#94A3B8" lh={1.6}>
              Production-grade repository intelligence platform combining Tree-sitter AST parsing, Qdrant hybrid retrieval, and interactive Mermaid.js diagram synthesis.
            </Text>
          </Stack>

          {/* Col 2: Architecture & Capabilities */}
          <Stack gap="xs">
            <Text fw={700} size="xs" c="#E2E8F0" tt="uppercase" lts={1}>
              Capabilities
            </Text>
            <a href="#architecture" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '0.85rem' }}>
              Microservices Blueprint
            </a>
            <a href="#rag-comparison" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '0.85rem' }}>
              AST vs Naive RAG
            </a>
            <a href="#api-explorer" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '0.85rem' }}>
              Multi-Framework Route Parser
            </a>
            <a href="#sandbox" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '0.85rem' }}>
              Live Product Sandbox
            </a>
            <a href="#benchmarks" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '0.85rem' }}>
              Empirical Benchmarks
            </a>
          </Stack>

          {/* Col 3: Core Technology */}
          <Stack gap="xs">
            <Text fw={700} size="xs" c="#E2E8F0" tt="uppercase" lts={1}>
              Core Tech
            </Text>
            <Text size="xs" c="#94A3B8">Next.js 16 (React 19)</Text>
            <Text size="xs" c="#94A3B8">NestJS API Gateway</Text>
            <Text size="xs" c="#94A3B8">FastAPI & Tree-sitter</Text>
            <Text size="xs" c="#94A3B8">Qdrant HNSW Vector DB</Text>
            <Text size="xs" c="#94A3B8">PostgreSQL 16 & Redis 7</Text>
            <Text size="xs" c="#94A3B8">Gemini 2.5 Flash & Pro</Text>
          </Stack>

          {/* Col 4: Documentation & Author */}
          <Stack gap="xs">
            <Text fw={700} size="xs" c="#E2E8F0" tt="uppercase" lts={1}>
              Documentation & Case Study
            </Text>
            <a
              href="/assets/RepoMind_AI_Architecture_Case_Study.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#38BDF8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}
            >
              📄 4-Page Whitepaper (PDF)
            </a>
            <a
              href="/assets/01_System_Architecture_Diagram.png"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '0.85rem' }}
            >
              🖼️ Architecture Blueprint (PNG)
            </a>
            <a
              href="/assets/02_Agentic_RAG_Pipeline.png"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '0.85rem' }}
            >
              🔄 RAG Pipeline Diagram (PNG)
            </a>
            <Text size="xs" c="#64748B" mt="xs">
              Architected & Built by <strong>Ritik Kumawat</strong>
            </Text>
          </Stack>
        </SimpleGrid>

        <Divider color="#1E293B" />

        {/* Bottom Bar */}
        <Group justify="space-between" py="lg" wrap="wrap">
          <Text size="xs" c="#64748B">
            © {new Date().getFullYear()} RepoMind AI. All rights reserved. Built with precision for engineering teams.
          </Text>

          <Group gap="sm">
            <ActionIcon
              component="a"
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="GitHub"
            >
              <IconBrandGithub size={16} />
            </ActionIcon>
            <ActionIcon
              component="a"
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="LinkedIn"
            >
              <IconBrandLinkedin size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Container>
    </footer>
  );
}
