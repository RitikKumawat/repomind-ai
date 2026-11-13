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
  IconX,
  IconCheck,
  IconAlertTriangle,
  IconBrain,
} from '@tabler/icons-react';

export function RagComparisonSection() {
  const naiveFlaws = [
    {
      title: 'Arbitrary Token Slicing (e.g. 500 tokens)',
      desc: 'Blindly splits code in the middle of methods or arguments, creating malformed code fragments with broken syntax.',
    },
    {
      title: 'Severed Decorator & Route Scopes',
      desc: 'Separates @Controller(), @Injectable(), or @app.get() from the handler function, wiping out routing and DI context.',
    },
    {
      title: 'No Cross-File Type Resolution',
      desc: 'Treats import statements as useless noise, leading to hallucinations about method return signatures and DTO structures.',
    },
    {
      title: 'Dense-Only Retrieval Pitfalls',
      desc: 'Pure vector similarity fails on exact symbol lookups (e.g. exact UUID regexes or specific error codes like ERR_AUTH_401).',
    },
  ];

  const repomindStrengths = [
    {
      title: 'Tree-sitter Concrete Syntax Tree (CST) Parsing',
      desc: 'Partitions code strictly at valid grammatical boundaries (classes, method definitions, interfaces, route declarations).',
    },
    {
      title: 'Payload Enrichment with Context Headers',
      desc: 'Every vector point embeds its enclosing namespace, decorators, parameter types, and line-range coordinates.',
    },
    {
      title: 'Hybrid Dense + BM25 with Reciprocal Rank Fusion',
      desc: 'Fuses semantic concept search (Qdrant HNSW) with exact token BM25 keyword matching for 99.8% precision.',
    },
    {
      title: 'Deterministic Line-Level Source Citations',
      desc: 'Every RAG answer links to exact file paths and line numbers, eliminating speculative hallucinations.',
    },
  ];

  return (
    <section
      id="rag-comparison"
      style={{
        paddingTop: '80px',
        paddingBottom: '88px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0',
        scrollMarginTop: '84px',
      }}
    >
      <Container size="lg">
        <Stack align="center" gap="xs" ta="center" mb={48}>
          <Badge size="md" variant="light" color="blue" radius="sm">
            THE ARCHITECTURAL DIFFERENCE
          </Badge>
          <Title
            order={2}
            fw={800}
            c="#0F172A"
            lts={-0.8}
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.4rem)' }}
          >
            Why Naive Code RAG Fails in Enterprise Repositories
          </Title>
          <Text fz={{ base: 'sm', sm: 'md' }} c="#64748B" maw={680}>
            Generic AI wrappers slice code by character counts. RepoMind parses concrete syntax trees so the LLM receives pristine, architecturally coherent code blocks.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
          {/* Column 1: The Naive Character-Splitting Approach */}
          <Paper
            withBorder
            p={{ base: 'md', sm: 'xl' }}
            radius="lg"
            style={{
              backgroundColor: '#FEF2F2',
              borderColor: '#FECACA',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)',
            }}
          >
            <Group justify="space-between" mb="lg">
              <Group gap="xs">
                <ThemeIcon color="red" variant="filled" size="md" radius="md">
                  <IconAlertTriangle size={18} />
                </ThemeIcon>
                <Text fw={800} size="lg" c="#991B1B">
                  Naive Token Slicing
                </Text>
              </Group>
              <Badge color="red" variant="light" size="sm">
                Generic AI Wrapper
              </Badge>
            </Group>

            <Text size="xs" c="#7F1D1D" mb="md" fw={500}>
              Typical implementation: <code>RecursiveCharacterTextSplitter(chunk_size=1000)</code>
            </Text>

            {/* Bad Snippet Visual */}
            <Paper p="xs" radius="sm" bg="#1E293B" mb="lg" style={{ opacity: 0.95 }}>
              <pre
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#F87171',
                  lineHeight: 1.4,
                  overflowX: 'auto',
                }}
              >
{`// [CHUNK #481 - CUT OFF MID-METHOD]
    user.setRefreshToken(hash);
    await this.userRepo.save(user);
    // [CHUNK ENDS HERE - MISSING RETURN AND ERROR HANDLER]`}
              </pre>
            </Paper>

            <Stack gap="md">
              {naiveFlaws.map((flaw, i) => (
                <Group key={i} align="flex-start" gap="xs">
                  <IconX size={18} color="#EF4444" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <Text fw={700} size="sm" c="#991B1B">
                      {flaw.title}
                    </Text>
                    <Text size="xs" c="#7F1D1D" mt={2} lh={1.5}>
                      {flaw.desc}
                    </Text>
                  </div>
                </Group>
              ))}
            </Stack>
          </Paper>

          {/* Column 2: The RepoMind AST-Aware Solution */}
          <Paper
            withBorder
            p={{ base: 'md', sm: 'xl' }}
            radius="lg"
            style={{
              backgroundColor: '#F0FDF4',
              borderColor: '#BBF7D0',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.06)',
            }}
          >
            <Group justify="space-between" mb="lg">
              <Group gap="xs">
                <ThemeIcon color="teal" variant="filled" size="md" radius="md">
                  <IconBrain size={18} />
                </ThemeIcon>
                <Text fw={800} size="lg" c="#166534">
                  RepoMind AST-Aware Hybrid RAG
                </Text>
              </Group>
              <Badge color="teal" variant="filled" size="sm">
                Production-Grade
              </Badge>
            </Group>

            <Text size="xs" c="#14532D" mb="md" fw={500}>
              Our implementation: <strong>Tree-sitter CST + Qdrant Dense/Sparse RRF</strong>
            </Text>

            {/* Good Snippet Visual */}
            <Paper p="xs" radius="sm" bg="#0F172A" mb="lg">
              <pre
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#4ADE80',
                  lineHeight: 1.4,
                  overflowX: 'auto',
                }}
              >
{`// [AST NODE: MethodDefinition - auth.service.ts:42-68]
@Transactional()
async rotateRefreshToken(userId: string, token: string): Promise<Tokens> {
  const user = await this.validateUser(userId);
  return this.issueTokenPair(user);
}`}
              </pre>
            </Paper>

            <Stack gap="md">
              {repomindStrengths.map((strength, i) => (
                <Group key={i} align="flex-start" gap="xs">
                  <IconCheck size={18} color="#10B981" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <Text fw={700} size="sm" c="#14532D">
                      {strength.title}
                    </Text>
                    <Text size="xs" c="#166534" mt={2} lh={1.5}>
                      {strength.desc}
                    </Text>
                  </div>
                </Group>
              ))}
            </Stack>
          </Paper>
        </SimpleGrid>
      </Container>
    </section>
  );
}
