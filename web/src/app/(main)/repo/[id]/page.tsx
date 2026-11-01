'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Container,
  Stack,
  Group,
  Text,
  Title,
  Badge,
  Tabs,
  Paper,
  SimpleGrid,
  Loader,
  Center,
  ThemeIcon,
  Card,
} from '@mantine/core';
import {
  IconGitBranch,
  IconArrowLeft,
  IconRefresh,
  IconTopologyStarRing3,
  IconApi,
  IconBook,
  IconMessageCode,
  IconSparkles,
} from '@tabler/icons-react';
import { FButton } from '@/components/ui/FButton';
import { useUserRepos } from '@/hooks/repo/useRepoQueries';
import {
  useRepoInsights,
  useRegenerateInsightsMutation,
} from '@/hooks/insights/useInsightsQueries';
import { MermaidViewer } from '@/components/insights/MermaidViewer';
import { ApiDocsExplorer } from '@/components/insights/ApiDocsExplorer';
import { OnboardingGuideViewer } from '@/components/insights/OnboardingGuideViewer';
import { SwitchBranchModal } from '@/components/repo/SwitchBranchModal';
import { CodeCitationDrawer } from '@/components/chat/CodeCitationDrawer';
import type { CitationItem } from '@/types/chat';
import Link from 'next/link';

export default function RepoWorkspacePage() {
  const params = useParams();
  const repoId = params?.id as string;

  const [activeTab, setActiveTab] = useState<string | null>('architecture');
  const [branchModalOpened, setBranchModalOpened] = useState(false);
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);
  const [citationDrawerOpen, setCitationDrawerOpen] = useState(false);

  const { data: userRepos, isLoading: isLoadingRepos } = useUserRepos();
  const repo = userRepos?.find((r) => r.id === repoId);

  const { data: insights, isLoading: isLoadingInsights } = useRepoInsights(
    repoId,
    Boolean(repo)
  );

  const regenerateMutation = useRegenerateInsightsMutation(repoId);

  const handleOpenCitation = (filePath: string, startLine: number, endLine: number) => {
    setActiveCitation({
      filePath,
      startLine,
      endLine,
      scope: 'Endpoint',
    });
    setCitationDrawerOpen(true);
  };

  if (isLoadingRepos) {
    return (
      <Center h="70vh">
        <Loader size="lg" color="indigo" />
      </Center>
    );
  }

  if (!repo) {
    return (
      <Container size="md" py="xl">
        <Paper withBorder p="xl" radius="md" ta="center">
          <Title order={3} mb="sm">
            Repository Not Found
          </Title>
          <Text c="dimmed" size="sm" mb="md">
            This repository may have been deleted or you do not have permission to access it.
          </Text>
          <FButton component={Link} href="/dashboard" leftSection={<IconArrowLeft size={16} />}>
            Back to Dashboard
          </FButton>
        </Paper>
      </Container>
    );
  }

  const isBusy = isLoadingInsights || regenerateMutation.isPending;

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        {/* Top Header Navigation */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <FButton
              component={Link}
              href="/dashboard"
              variant="subtle"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
            >
              Dashboard
            </FButton>
            <Text c="dimmed" size="sm">
              /
            </Text>
            <Title order={3} fw={800}>
              {repo.repoName}
            </Title>
            <Badge
              size="sm"
              variant="outline"
              color="indigo"
              leftSection={<IconGitBranch size={12} />}
              style={{ cursor: 'pointer' }}
              onClick={() => setBranchModalOpened(true)}
              title="Click to switch branch & re-index"
            >
              {repo.defaultBranch}
            </Badge>
          </Group>

          <Group gap="xs">
            <FButton
              component={Link}
              href={`/chat?repoId=${repo.id}`}
              variant="light"
              color="indigo"
              size="sm"
              leftSection={<IconMessageCode size={16} />}
            >
              Open Chat
            </FButton>

            <FButton
              variant="default"
              size="sm"
              leftSection={<IconRefresh size={14} />}
              loading={regenerateMutation.isPending}
              onClick={() => regenerateMutation.mutate('all')}
              title="Regenerate all insights using current codebase index"
            >
              Regenerate
            </FButton>
          </Group>
        </Group>

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          radius="md"
          variant="pills"
          keepMounted
          keepMountedMode="display-none"
        >
          <Tabs.List mb="md">
            <Tabs.Tab
              value="architecture"
              leftSection={<IconTopologyStarRing3 size={16} />}
            >
              Architecture & Overview
            </Tabs.Tab>
            <Tabs.Tab
              value="api-docs"
              leftSection={<IconApi size={16} />}
              rightSection={
                insights?.apiDocs ? (
                  <Badge size="xs" color="indigo" variant="filled">
                    {insights.apiDocs.length}
                  </Badge>
                ) : null
              }
            >
              API Documentation
            </Tabs.Tab>
            <Tabs.Tab value="onboarding" leftSection={<IconBook size={16} />}>
              Onboarding Guide
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: ARCHITECTURE */}
          <Tabs.Panel value="architecture">
            {isBusy ? (
              <Center py="xl" style={{ minHeight: 300 }}>
                <Stack align="center" gap="sm">
                  <Loader size="md" color="indigo" />
                  <Text size="sm" c="dimmed">
                    Analyzing architecture & generating Mermaid diagram...
                  </Text>
                </Stack>
              </Center>
            ) : !insights?.architecture ? (
              <Paper withBorder p="xl" radius="md" ta="center">
                <ThemeIcon size={44} radius="xl" color="indigo" variant="light" mb="sm">
                  <IconSparkles size={22} />
                </ThemeIcon>
                <Title order={4} mb="xs">
                  No Architecture Insights Yet
                </Title>
                <Text size="sm" c="dimmed" mb="md">
                  Click generate to analyze project structure, dependencies, and generate an interactive Mermaid diagram.
                </Text>
                <FButton
                  leftSection={<IconRefresh size={16} />}
                  onClick={() => regenerateMutation.mutate('architecture')}
                  loading={regenerateMutation.isPending}
                >
                  Generate Architecture
                </FButton>
              </Paper>
            ) : (
              <Stack gap="md">
                {/* High level overview card */}
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between" align="flex-start" mb="xs">
                    <Stack gap={4} style={{ maxWidth: '75%' }}>
                      <Text fw={700} size="md">
                        System Architecture
                      </Text>
                      <Text size="sm" c="dimmed">
                        {insights.architecture.overview}
                      </Text>
                    </Stack>
                    <Badge color="indigo" size="md">
                      {insights.architecture.systemType}
                    </Badge>
                  </Group>

                  {/* Frameworks & Tech Stack Pills */}
                  <Group gap="xs" mt="md">
                    {insights.architecture.frameworks?.map((fw, i) => (
                      <Badge key={i} color="teal" variant="light" size="sm">
                        {fw}
                      </Badge>
                    ))}
                    {insights.architecture.techStack?.map((tech, i) => (
                      <Badge key={i} color="gray" variant="outline" size="sm">
                        {tech}
                      </Badge>
                    ))}
                  </Group>
                </Paper>

                {/* Interactive Mermaid.js Diagram */}
                {insights.architecture.mermaidDiagram && (
                  <MermaidViewer chart={insights.architecture.mermaidDiagram} />
                )}

                {/* Modules Breakdown */}
                {insights.architecture.modules && insights.architecture.modules.length > 0 && (
                  <Stack gap="xs">
                    <Text fw={700} size="sm" c="dimmed">
                      MODULES & SUBSYSTEMS
                    </Text>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                      {insights.architecture.modules.map((mod, i) => (
                        <Card key={i} withBorder padding="sm" radius="md">
                          <Group justify="space-between" mb={4}>
                            <Text fw={600} size="sm">
                              {mod.name}
                            </Text>
                            <Badge size="xs" variant="light" color="indigo">
                              {mod.type}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed" lineClamp={3}>
                            {mod.description}
                          </Text>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </Stack>
                )}
              </Stack>
            )}
          </Tabs.Panel>

          {/* TAB 2: API DOCUMENTATION */}
          <Tabs.Panel value="api-docs">
            {isBusy ? (
              <Center py="xl" style={{ minHeight: 300 }}>
                <Stack align="center" gap="sm">
                  <Loader size="md" color="indigo" />
                  <Text size="sm" c="dimmed">
                    Parsing controllers, endpoints, and schemas...
                  </Text>
                </Stack>
              </Center>
            ) : !insights?.apiDocs || insights.apiDocs.length === 0 ? (
              <Paper withBorder p="xl" radius="md" ta="center">
                <ThemeIcon size={44} radius="xl" color="indigo" variant="light" mb="sm">
                  <IconApi size={22} />
                </ThemeIcon>
                <Title order={4} mb="xs">
                  No API Endpoints Detected
                </Title>
                <Text size="sm" c="dimmed" mb="md">
                  We did not detect HTTP routes in this repository, or analysis has not been run yet.
                </Text>
                <FButton
                  leftSection={<IconRefresh size={16} />}
                  onClick={() => regenerateMutation.mutate('api-docs')}
                  loading={regenerateMutation.isPending}
                >
                  Generate API Documentation
                </FButton>
              </Paper>
            ) : (
              <ApiDocsExplorer
                endpoints={insights.apiDocs}
                onOpenCodeCitation={handleOpenCitation}
              />
            )}
          </Tabs.Panel>

          {/* TAB 3: ONBOARDING GUIDE */}
          <Tabs.Panel value="onboarding">
            {isBusy ? (
              <Center py="xl" style={{ minHeight: 300 }}>
                <Stack align="center" gap="sm">
                  <Loader size="md" color="indigo" />
                  <Text size="sm" c="dimmed">
                    Synthesizing developer onboarding handbook...
                  </Text>
                </Stack>
              </Center>
            ) : !insights?.onboarding ? (
              <Paper withBorder p="xl" radius="md" ta="center">
                <ThemeIcon size={44} radius="xl" color="indigo" variant="light" mb="sm">
                  <IconBook size={22} />
                </ThemeIcon>
                <Title order={4} mb="xs">
                  No Onboarding Guide Available
                </Title>
                <Text size="sm" c="dimmed" mb="md">
                  Click below to generate step-by-step setup instructions and environment variable documentation.
                </Text>
                <FButton
                  leftSection={<IconRefresh size={16} />}
                  onClick={() => regenerateMutation.mutate('onboarding')}
                  loading={regenerateMutation.isPending}
                >
                  Generate Onboarding Guide
                </FButton>
              </Paper>
            ) : (
              <OnboardingGuideViewer markdown={insights.onboarding} />
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Switch Branch Modal */}
      <SwitchBranchModal
        opened={branchModalOpened}
        onClose={() => setBranchModalOpened(false)}
        repo={repo}
      />

      {/* Citation Drawer for inspecting endpoint code */}
      <CodeCitationDrawer
        opened={citationDrawerOpen}
        onClose={() => setCitationDrawerOpen(false)}
        citation={activeCitation}
        repoId={repo.id}
        githubUrl={repo.githubUrl}
        defaultBranch={repo.defaultBranch}
      />
    </Container>
  );
}
