'use client';

import { useState } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Group,
  Text,
  Badge,
  Stack,
  ActionIcon,
  Tooltip,
  Code,
  Table,
  Divider,
  Collapse,
} from '@mantine/core';
import {
  IconHierarchy2,
  IconRoute,
  IconBrain,
  IconBook,
  IconZoomIn,
  IconZoomOut,
  IconRefresh,
  IconFileCode,
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
} from '@tabler/icons-react';
import { FButton } from '@/components/ui/FButton';

export function InteractiveSandbox() {
  const [activeTab, setActiveTab] = useState<string | null>('topology');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedRoute, setSelectedRoute] = useState<string>('insights');
  const [expandedCitation, setExpandedCitation] = useState<boolean>(false);
  const [chatCitationOpen, setChatCitationOpen] = useState<boolean>(false);

  const routes = [
    {
      id: 'insights',
      method: 'GET',
      path: '/api/v1/repos/:id/insights',
      controller: 'ReposController',
      file: 'src/modules/repos/repos.controller.ts',
      lines: '42 - 89',
      guard: 'JwtAuthGuard',
      desc: 'Retrieves pre-computed AST topology, endpoint schemas, and setup handbook for target repo.',
      snippet: `@Get(':id/insights')
@UseGuards(JwtAuthGuard)
async getRepoInsights(@Param('id') id: string) {
  const repo = await this.reposService.findOne(id);
  const insights = await this.fastApiClient.fetchInsights(repo.githubUrl);
  return { topology: insights.mermaid, endpoints: insights.routes };
}`,
    },
    {
      id: 'login',
      method: 'POST',
      path: '/api/v1/auth/login',
      controller: 'AuthController',
      file: 'src/modules/auth/auth.controller.ts',
      lines: '18 - 41',
      guard: 'Public',
      desc: 'Validates developer credentials and issues signed JWT access and refresh tokens.',
      snippet: `@Post('login')
@HttpCode(HttpStatus.OK)
async login(@Body() dto: LoginDto) {
  const user = await this.authService.validateUser(dto.email, dto.password);
  return this.authService.generateTokenPair(user);
}`,
    },
    {
      id: 'chat',
      method: 'POST',
      path: '/api/v1/chat/message',
      controller: 'ChatController',
      file: 'src/modules/chat/chat.controller.ts',
      lines: '67 - 112',
      guard: 'JwtAuthGuard + RateLimit',
      desc: 'Dispatches query to FastAPI LangGraph RAG agent with SSE streaming response.',
      snippet: `@Post('message')
@Header('Content-Type', 'text/event-stream')
async streamChatMessage(@Body() dto: ChatMessageDto, @Res() res: Response) {
  return this.chatService.streamRAGResponse(dto, res);
}`,
    },
  ];

  const currentRouteData = routes.find((r) => r.id === selectedRoute) || routes[0];

  return (
    <section
      id="sandbox"
      style={{
        paddingTop: '64px',
        paddingBottom: '80px',
        backgroundColor: '#F8F9FA',
        scrollMarginTop: '84px',
      }}
    >
      <Container size="xl">
        <Stack align="center" gap="xs" ta="center" mb="xl">
          <Badge size="md" variant="light" color="blue" radius="sm">
            LIVE PRODUCT SANDBOX
          </Badge>
          <Text fw={800} size="2.4rem" c="#0F172A" lts={-0.8}>
            Experience RepoMind Before You Deploy
          </Text>
          <Text size="md" c="#64748B" maw={640}>
            Interact with actual system output: explore the live topology graph, inspect AST-extracted API specs, and review line-level code citations.
          </Text>
        </Stack>

        {/* IDE macOS Window Frame */}
        <Paper
          withBorder
          radius="lg"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#CBD5E1',
            boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Window Title Bar */}
          <div
            style={{
              backgroundColor: '#0F172A',
              padding: '12px 20px',
              borderBottom: '1px solid #1E293B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Group gap={8}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#F59E0B',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  display: 'inline-block',
                }}
              />
              <Text size="xs" c="#94A3B8" ff="monospace" ml="sm" fw={600}>
                workspace://repomind-ai/react-core-branch-main
              </Text>
            </Group>

            <Group gap="xs">
              <Badge size="xs" variant="outline" color="gray" radius="sm" c="#CBD5E1">
                Branch: main
              </Badge>
              <Badge size="xs" color="teal" variant="light" radius="sm">
                AST Parsed (1,248 Nodes)
              </Badge>
            </Group>
          </div>

          {/* Mantine Tabs Navigation */}
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            variant="outline"
            className="sandbox-tabs"
            styles={{
              root: { display: 'flex', flexDirection: 'column' },
              list: {
                backgroundColor: '#F1F5F9',
                padding: '6px 16px 0 16px',
                borderBottom: '1px solid #E2E8F0',
                gap: 6,
              },
              tab: {
                fontWeight: 650,
                fontSize: '0.85rem',
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
                padding: '8px 16px',
              },
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="topology" leftSection={<IconHierarchy2 size={16} />}>
                Architecture Topology
              </Tabs.Tab>
              <Tabs.Tab value="api-explorer" leftSection={<IconRoute size={16} />}>
                AST API Route Explorer
              </Tabs.Tab>
              <Tabs.Tab value="rag-chat" leftSection={<IconBrain size={16} />}>
                Codebase RAG & Citations
              </Tabs.Tab>
              <Tabs.Tab value="handbook" leftSection={<IconBook size={16} />}>
                Setup Handbook
              </Tabs.Tab>
            </Tabs.List>

            {/* TAB 1: ARCHITECTURE TOPOLOGY */}
            <Tabs.Panel value="topology" p="xl" style={{ minHeight: 460 }}>
              <Group justify="space-between" mb="lg">
                <Stack gap={2}>
                  <Text fw={700} size="md" c="#0F172A">
                    Mermaid.js Distributed System Topology
                  </Text>
                  <Text size="xs" c="#64748B">
                    Dynamic DAG graph auto-generated from AST call-graphs and Docker service definitions.
                  </Text>
                </Stack>

                <Group gap="xs">
                  <Tooltip label="Zoom In" withArrow>
                    <ActionIcon
                      variant="default"
                      size="sm"
                      onClick={() => setZoomLevel((z) => Math.min(z + 0.1, 1.4))}
                      aria-label="Zoom In"
                    >
                      <IconZoomIn size={15} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Zoom Out" withArrow>
                    <ActionIcon
                      variant="default"
                      size="sm"
                      onClick={() => setZoomLevel((z) => Math.max(z - 0.1, 0.7))}
                      aria-label="Zoom Out"
                    >
                      <IconZoomOut size={15} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Reset Zoom" withArrow>
                    <ActionIcon
                      variant="default"
                      size="sm"
                      onClick={() => setZoomLevel(1)}
                      aria-label="Reset Zoom"
                    >
                      <IconRefresh size={15} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              {/* Topology SVG Graphic Display */}
              <div
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: 12,
                  padding: '32px 20px',
                  border: '1px solid #1E293B',
                  overflow: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 340,
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{ width: '100%', maxWidth: 780 }}>
                  {/* Clean Visual Architecture Graph Diagram */}
                  <svg
                    viewBox="0 0 740 280"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  >
                    <defs>
                      <linearGradient id="blueGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1C7ED6" />
                        <stop offset="100%" stopColor="#2563EB" />
                      </linearGradient>
                      <linearGradient id="purpleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#6D28D9" />
                      </linearGradient>
                      <linearGradient id="tealGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="6"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748B" />
                      </marker>
                    </defs>

                    {/* Connecting Arrows */}
                    <path
                      d="M 170 140 L 250 140"
                      stroke="#475569"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      markerEnd="url(#arrow)"
                    />
                    <path
                      d="M 410 110 L 490 60"
                      stroke="#475569"
                      strokeWidth="2"
                      markerEnd="url(#arrow)"
                    />
                    <path
                      d="M 410 140 L 490 140"
                      stroke="#475569"
                      strokeWidth="2"
                      markerEnd="url(#arrow)"
                    />
                    <path
                      d="M 410 170 L 490 220"
                      stroke="#475569"
                      strokeWidth="2"
                      markerEnd="url(#arrow)"
                    />

                    {/* Node 1: Web Client */}
                    <g transform="translate(20, 100)">
                      <rect
                        width="150"
                        height="80"
                        rx="10"
                        fill="#1E293B"
                        stroke="#38BDF8"
                        strokeWidth="2"
                      />
                      <circle cx="24" cy="24" r="6" fill="#38BDF8" />
                      <text x="36" y="28" fill="#F8FAFC" fontSize="13" fontWeight="bold">
                        Next.js 16 Web
                      </text>
                      <text x="24" y="50" fill="#94A3B8" fontSize="11">
                        React 19 + Mantine 9
                      </text>
                      <text x="24" y="66" fill="#38BDF8" fontSize="10">
                        ● SSE Stream Consumer
                      </text>
                    </g>

                    {/* Node 2: NestJS Gateway */}
                    <g transform="translate(250, 100)">
                      <rect
                        width="160"
                        height="80"
                        rx="10"
                        fill="#1E293B"
                        stroke="#1C7ED6"
                        strokeWidth="2"
                      />
                      <circle cx="24" cy="24" r="6" fill="#1C7ED6" />
                      <text x="36" y="28" fill="#F8FAFC" fontSize="13" fontWeight="bold">
                        NestJS Gateway
                      </text>
                      <text x="24" y="50" fill="#94A3B8" fontSize="11">
                        Passport JWT + BullMQ
                      </text>
                      <text x="24" y="66" fill="#60A5FA" fontSize="10">
                        Port :4000 (REST & WS)
                      </text>
                    </g>

                    {/* Node 3: FastAPI AI Service */}
                    <g transform="translate(490, 20)">
                      <rect
                        width="180"
                        height="70"
                        rx="10"
                        fill="#1E293B"
                        stroke="#8B5CF6"
                        strokeWidth="2"
                      />
                      <circle cx="20" cy="22" r="5" fill="#8B5CF6" />
                      <text x="32" y="26" fill="#F8FAFC" fontSize="12" fontWeight="bold">
                        FastAPI AI Microservice
                      </text>
                      <text x="20" y="44" fill="#94A3B8" fontSize="10">
                        Tree-sitter AST + LangGraph
                      </text>
                      <text x="20" y="58" fill="#A78BFA" fontSize="9">
                        Gemini 2.5 Flash / Pro
                      </text>
                    </g>

                    {/* Node 4: Qdrant Vector Engine */}
                    <g transform="translate(490, 105)">
                      <rect
                        width="180"
                        height="70"
                        rx="10"
                        fill="#1E293B"
                        stroke="#10B981"
                        strokeWidth="2"
                      />
                      <circle cx="20" cy="22" r="5" fill="#10B981" />
                      <text x="32" y="26" fill="#F8FAFC" fontSize="12" fontWeight="bold">
                        Qdrant Vector DB
                      </text>
                      <text x="20" y="44" fill="#94A3B8" fontSize="10">
                        HNSW Dense + Sparse BM25
                      </text>
                      <text x="20" y="58" fill="#34D399" fontSize="9">
                        Payload: repo_id, branch, AST
                      </text>
                    </g>

                    {/* Node 5: PostgreSQL & Redis */}
                    <g transform="translate(490, 190)">
                      <rect
                        width="180"
                        height="70"
                        rx="10"
                        fill="#1E293B"
                        stroke="#F59E0B"
                        strokeWidth="2"
                      />
                      <circle cx="20" cy="22" r="5" fill="#F59E0B" />
                      <text x="32" y="26" fill="#F8FAFC" fontSize="12" fontWeight="bold">
                        PostgreSQL 16 & Redis
                      </text>
                      <text x="20" y="44" fill="#94A3B8" fontSize="10">
                        Relational Auth, Cache & Queue
                      </text>
                      <text x="20" y="58" fill="#FBBF24" fontSize="9">
                        Persistent ACID Store
                      </text>
                    </g>
                  </svg>
                </div>
              </div>
            </Tabs.Panel>

            {/* TAB 2: AST API ROUTE EXPLORER */}
            <Tabs.Panel value="api-explorer" p="xl" style={{ minHeight: 460 }}>
              <Group justify="space-between" mb="md">
                <Stack gap={2}>
                  <Text fw={700} size="md" c="#0F172A">
                    Static AST Route Analysis Engine
                  </Text>
                  <Text size="xs" c="#64748B">
                    Extracted via Tree-sitter from controller decorators without executing untrusted repository code.
                  </Text>
                </Stack>
                <Badge variant="light" color="teal">
                  3 Endpoints Parsed
                </Badge>
              </Group>

              {/* Interactive Route Selector */}
              <Group gap="sm" mb="md">
                {routes.map((r) => (
                  <Paper
                    key={r.id}
                    withBorder
                    px="md"
                    py="xs"
                    radius="md"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedRoute === r.id ? '#EFF6FF' : '#FFFFFF',
                      borderColor: selectedRoute === r.id ? '#1C7ED6' : '#E2E8F0',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => {
                      setSelectedRoute(r.id);
                      setExpandedCitation(false);
                    }}
                  >
                    <Group gap="xs">
                      <Badge
                        size="xs"
                        variant="filled"
                        color={r.method === 'GET' ? 'blue' : 'teal'}
                      >
                        {r.method}
                      </Badge>
                      <Text size="xs" fw={700} ff="monospace" c="#1E293B">
                        {r.path}
                      </Text>
                    </Group>
                  </Paper>
                ))}
              </Group>

              {/* Route Details Card */}
              <Paper withBorder p="md" radius="md" bg="#FFFFFF" mb="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <Badge
                      size="sm"
                      variant="filled"
                      color={currentRouteData.method === 'GET' ? 'blue' : 'teal'}
                    >
                      {currentRouteData.method}
                    </Badge>
                    <Text fw={800} size="md" ff="monospace" c="#0F172A">
                      {currentRouteData.path}
                    </Text>
                  </Group>
                  <Badge variant="outline" color="gray" size="sm">
                    {currentRouteData.guard}
                  </Badge>
                </Group>

                <Text size="sm" c="#475569" mb="md">
                  {currentRouteData.desc}
                </Text>

                <Divider my="sm" />

                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs">
                    <IconFileCode size={16} color="#1C7ED6" />
                    <Text size="xs" c="#64748B" ff="monospace">
                      Source: <strong>{currentRouteData.file}</strong> (Lines {currentRouteData.lines})
                    </Text>
                  </Group>

                  <FButton
                    size="xs"
                    variant="light"
                    color="blue"
                    onClick={() => setExpandedCitation(!expandedCitation)}
                    rightSection={
                      expandedCitation ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />
                    }
                  >
                    {expandedCitation ? 'Hide AST Snippet' : 'View AST Citation'}
                  </FButton>
                </Group>

                {/* Collapsible AST Source Snippet */}
                <Collapse expanded={expandedCitation}>
                  <Paper
                    withBorder
                    p="xs"
                    radius="md"
                    mt="sm"
                    bg="#0F172A"
                    style={{ borderColor: '#1E293B' }}
                  >
                    <Group justify="space-between" px="xs" pb={6} style={{ borderBottom: '1px solid #1E293B' }}>
                      <Text size="xs" c="#94A3B8" ff="monospace">
                        Tree-sitter Extracted Node [method_definition]
                      </Text>
                      <Badge size="xs" color="blue" variant="light">
                        Verified AST
                      </Badge>
                    </Group>
                    <pre
                      style={{
                        margin: 0,
                        padding: '10px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#E2E8F0',
                        overflowX: 'auto',
                        lineHeight: 1.5,
                      }}
                    >
                      {currentRouteData.snippet}
                    </pre>
                  </Paper>
                </Collapse>
              </Paper>
            </Tabs.Panel>

            {/* TAB 3: CODEBASE RAG & CITATIONS */}
            <Tabs.Panel value="rag-chat" p="xl" style={{ minHeight: 460 }}>
              <Stack gap="md">
                {/* User Prompt */}
                <Group align="flex-start" gap="sm">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: '#E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#475569',
                    }}
                  >
                    DEV
                  </div>
                  <Paper
                    withBorder
                    p="sm"
                    radius="md"
                    bg="#F8FAFC"
                    style={{ maxWidth: 640 }}
                  >
                    <Text size="sm" fw={600} c="#1E293B">
                      How does RepoMind AI avoid re-indexing unchanged files when switching between repository branches?
                    </Text>
                  </Paper>
                </Group>

                {/* Assistant RAG Response */}
                <Group align="flex-start" gap="sm">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1C7ED6, #2563EB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                    }}
                  >
                    <IconBrain size={18} />
                  </div>
                  <Paper
                    withBorder
                    p="md"
                    radius="md"
                    bg="#FFFFFF"
                    style={{
                      maxWidth: 700,
                      borderColor: '#CBD5E1',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    }}
                  >
                    <Text size="sm" c="#1E293B" lh={1.6} mb="sm">
                      RepoMind implements an <strong>incremental delta-chunking pipeline</strong>. When a branch switch occurs:
                    </Text>
                    <Stack gap={6} mb="md">
                      <Group gap="xs" align="flex-start">
                        <IconCircleCheck size={16} color="#10B981" style={{ marginTop: 2 }} />
                        <Text size="xs" c="#334155">
                          <strong>Git Tree Diffing:</strong> Calculates changed file SHA blobs between <code>HEAD</code> and the target branch commit.
                        </Text>
                      </Group>
                      <Group gap="xs" align="flex-start">
                        <IconCircleCheck size={16} color="#10B981" style={{ marginTop: 2 }} />
                        <Text size="xs" c="#334155">
                          <strong>Qdrant Payload Scoping:</strong> Unchanged AST vector points are shared across branches using compound payload filters (<code>repo_id</code> + <code>blob_sha</code>).
                        </Text>
                      </Group>
                      <Group gap="xs" align="flex-start">
                        <IconCircleCheck size={16} color="#10B981" style={{ marginTop: 2 }} />
                        <Text size="xs" c="#334155">
                          <strong>Sub-second Transition:</strong> Only altered AST nodes are re-embedded, reducing indexing time by over <strong>87%</strong>.
                        </Text>
                      </Group>
                    </Stack>

                    {/* Exact Code Citation Badge (Clickable) */}
                    <Paper
                      p="xs"
                      radius="sm"
                      style={{
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        cursor: 'pointer',
                      }}
                      onClick={() => setChatCitationOpen(!chatCitationOpen)}
                    >
                      <Group justify="space-between">
                        <Group gap="xs">
                          <IconFileCode size={15} color="#1C7ED6" />
                          <Text size="xs" fw={700} c="#1E40AF" ff="monospace">
                            services/indexer/delta_chunker.py:104-138
                          </Text>
                          <Badge size="xs" color="blue" variant="filled">
                            Verified Citation
                          </Badge>
                        </Group>
                        <Text size="xs" c="#1C7ED6" fw={600}>
                          {chatCitationOpen ? 'Close Code' : 'Click to inspect snippet'}
                        </Text>
                      </Group>
                    </Paper>

                    <Collapse expanded={chatCitationOpen}>
                      <Paper p="xs" mt="xs" radius="sm" bg="#0F172A">
                        <pre
                          style={{
                            margin: 0,
                            padding: '8px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: '#E2E8F0',
                            lineHeight: 1.5,
                          }}
                        >
{`def compute_delta_blobs(repo_path: str, base_sha: str, head_sha: str) -> list[DeltaBlob]:
    diff = git.diff(base_sha, head_sha)
    changed_nodes = []
    for file in diff.modified_files:
        tree = tree_sitter_parser.parse_ast(file.path)
        changed_nodes.extend(extract_semantic_chunks(tree))
    return changed_nodes`}
                        </pre>
                      </Paper>
                    </Collapse>
                  </Paper>
                </Group>
              </Stack>
            </Tabs.Panel>

            {/* TAB 4: AUTOMATED SETUP HANDBOOK */}
            <Tabs.Panel value="handbook" p="xl" style={{ minHeight: 460 }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text fw={700} size="md" c="#0F172A">
                      Auto-Generated Developer Onboarding Guide
                    </Text>
                    <Text size="xs" c="#64748B">
                      Synthesized from Dockerfiles, package manifests, and environment templates.
                    </Text>
                  </Stack>
                  <Badge color="teal" variant="light">
                    Generated in 420ms
                  </Badge>
                </Group>

                <Paper withBorder p="md" radius="md" bg="#FFFFFF">
                  <Text fw={700} size="sm" c="#1E293B" mb="xs">
                    1. Infrastructure Prerequisites
                  </Text>
                  <Paper p="xs" radius="sm" bg="#0F172A" mb="md">
                    <Text size="xs" ff="monospace" c="#38BDF8">
                      docker-compose up -d qdrant redis postgres
                    </Text>
                  </Paper>

                  <Text fw={700} size="sm" c="#1E293B" mb="xs">
                    2. Environment Variables Verification
                  </Text>
                  <Table striped highlightOnHover withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Variable</Table.Th>
                        <Table.Th>Default</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Role</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      <Table.Tr>
                        <Table.Td><Code>QDRANT_HOST</Code></Table.Td>
                        <Table.Td>localhost:6333</Table.Td>
                        <Table.Td><Badge size="xs" color="teal">Required</Badge></Table.Td>
                        <Table.Td>HNSW Vector Database URL</Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td><Code>REDIS_URL</Code></Table.Td>
                        <Table.Td>redis://localhost:6379</Table.Td>
                        <Table.Td><Badge size="xs" color="teal">Required</Badge></Table.Td>
                        <Table.Td>BullMQ queue & session cache</Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td><Code>GEMINI_API_KEY</Code></Table.Td>
                        <Table.Td>******</Table.Td>
                        <Table.Td><Badge size="xs" color="blue">Configured</Badge></Table.Td>
                        <Table.Td>Gemini 2.5 Flash LLM Engine</Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Paper>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Container>
    </section>
  );
}
