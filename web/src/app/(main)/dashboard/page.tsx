'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  Title,
  Text,
  Container,
  Paper,
  Group,
  Stack,
  Badge,
  SimpleGrid,
  ThemeIcon,
  Card,
  Loader,
  Alert,
  Center,
  Progress,
} from '@mantine/core';
import {
  IconBrandGithub,
  IconPlus,
  IconCheck,
  IconAlertCircle,
  IconCpu,
  IconFileCode,
  IconMessageCode,
  IconGitBranch,
  IconExternalLink,
  IconRefresh,
  IconCircleCheck,
  IconCircleDot,
} from '@tabler/icons-react';
import { FButton } from '@/components/ui/FButton';
import { useAuth } from '@/contexts/AuthContext';
import {
  useUserRepos,
  useConnectGithub,
  useRetryRepoMutation,
} from '@/hooks/repo/useRepoQueries';
import { ImportRepoModal } from '@/components/repo/ImportRepoModal';
import { SwitchBranchModal } from '@/components/repo/SwitchBranchModal';
import type { RepositoryItem } from '@/types/repo';
import { RepoStatus, IndexingPhase } from '@/enums';
import Link from 'next/link';

function RepoIngestionProgress({ repo }: { repo: RepositoryItem }) {
  const phase = repo.indexingPhase;

  let phaseLabel = 'Preparing Pipeline';
  let progressPercent = 10;
  let stepDescription = 'Setting up worker environment...';
  let step = 1;

  if (phase === IndexingPhase.QUEUED) {
    phaseLabel = 'Queued';
    progressPercent = 12;
    stepDescription = 'Waiting for worker process...';
    step = 1;
  } else if (phase === IndexingPhase.FETCHING) {
    phaseLabel = 'Fetching Source Tree';
    progressPercent = 25;
    stepDescription = 'Retrieving tree & source files via GitHub Git Trees API...';
    step = 1;
  } else if (phase === IndexingPhase.PARSING) {
    phaseLabel = 'AST Semantic Chunking';
    progressPercent = 48;
    stepDescription = `Analyzing syntax scopes across ${repo.totalFiles || 'discovered'} files...`;
    step = 2;
  } else if (phase === IndexingPhase.INDEXING) {
    const total = repo.totalChunks || 1;
    const processed = repo.processedChunks || 0;
    const ratio = Math.min(1, Math.max(0, processed / total));
    progressPercent = Math.round(50 + ratio * 45);
    phaseLabel = 'Embedding & Vector Storage';
    stepDescription =
      total > 1
        ? `Batched embedding: ${processed}/${total} chunks (Qdrant + Gemini)`
        : 'Generating 768-dim dense vectors & indexing Qdrant...';
    step = 3;
  }

  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      bg="rgba(99, 102, 241, 0.04)"
      style={{ borderColor: 'rgba(99, 102, 241, 0.25)' }}
    >
      <Stack gap={10}>
        <Group justify="space-between" align="center">
          <Group gap={6}>
            <Loader size={12} color="indigo" />
            <Text size="xs" fw={700} c="indigo.8">
              {phaseLabel}
            </Text>
          </Group>
          <Badge size="xs" color="indigo" variant="filled">
            {progressPercent}%
          </Badge>
        </Group>

        <Progress
          value={progressPercent}
          size="sm"
          radius="xl"
          color="indigo"
          animated
          striped
        />

        {/* 3-Step Visual Micro Pipeline */}
        <Group justify="space-between" align="center" px={2}>
          <Group gap={4}>
            {step > 1 ? (
              <IconCircleCheck size={14} color="var(--mantine-color-teal-6)" />
            ) : step === 1 ? (
              <Loader size={12} color="indigo" />
            ) : (
              <IconCircleDot size={14} color="gray" />
            )}
            <Text
              size="11px"
              fw={step === 1 ? 700 : 500}
              c={step === 1 ? 'indigo.9' : 'dimmed'}
            >
              1. Fetch
            </Text>
          </Group>

          <Group gap={4}>
            {step > 2 ? (
              <IconCircleCheck size={14} color="var(--mantine-color-teal-6)" />
            ) : step === 2 ? (
              <Loader size={12} color="indigo" />
            ) : (
              <IconCircleDot size={14} color="gray" />
            )}
            <Text
              size="11px"
              fw={step === 2 ? 700 : 500}
              c={step === 2 ? 'indigo.9' : 'dimmed'}
            >
              2. AST Parse
            </Text>
          </Group>

          <Group gap={4}>
            {step > 3 ? (
              <IconCircleCheck size={14} color="var(--mantine-color-teal-6)" />
            ) : step === 3 ? (
              <Loader size={12} color="indigo" />
            ) : (
              <IconCircleDot size={14} color="gray" />
            )}
            <Text
              size="11px"
              fw={step === 3 ? 700 : 500}
              c={step === 3 ? 'indigo.9' : 'dimmed'}
            >
              3. Vector Index
            </Text>
          </Group>
        </Group>

        <Text size="11px" c="dimmed" ta="center">
          {stepDescription}
        </Text>
      </Stack>
    </Paper>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [modalOpened, setModalOpened] = useState(false);
  const [branchModalRepo, setBranchModalRepo] = useState<RepositoryItem | null>(
    null
  );
  const { data: repos, isLoading, error } = useUserRepos();
  const connectGithub = useConnectGithub();
  const retryMutation = useRetryRepoMutation();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const router = useRouter();

  const isGithubConnected = Boolean(user?.isGithubRepoConnected);

  useEffect(() => {
    const githubParam = searchParams.get('github');
    const errorParam = searchParams.get('error');

    if (githubParam === 'connected') {
      notifications.show({
        title: 'GitHub Connected',
        message: 'Your GitHub account has been connected with repository access!',
        color: 'teal',
      });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      void queryClient.invalidateQueries({ queryKey: ['github-repos'] });
      router.replace('/dashboard');
    } else if (errorParam) {
      notifications.show({
        title: 'Connection Failed',
        message: 'Could not connect your GitHub account. Please try again.',
        color: 'red',
      });
      router.replace('/dashboard');
    }
  }, [searchParams, queryClient, router]);

  const getStatusBadge = (repo: RepositoryItem) => {
    if (repo.status === RepoStatus.READY) {
      return (
        <Badge
          color="teal"
          variant="light"
          size="sm"
          leftSection={<IconCheck size={12} />}
        >
          Indexed & Ready
        </Badge>
      );
    }
    if (repo.status === RepoStatus.FAILED) {
      return (
        <Badge
          color="red"
          variant="light"
          size="sm"
          leftSection={<IconAlertCircle size={12} />}
        >
          Ingestion Failed
        </Badge>
      );
    }
    // In progress
    return (
      <Badge
        color="indigo"
        variant="light"
        size="sm"
        leftSection={<Loader size={10} color="indigo" />}
      >
        {repo.indexingPhase || 'INDEXING'}
      </Badge>
    );
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header Section */}
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Title order={2} fw={800} lts={-0.5}>
              Codebases & Intelligence
            </Title>
            <Text c="dimmed" size="sm">
              Semantic AST code search, automated API docs, and architecture
              intelligence.
            </Text>
          </Stack>

          <Group gap="sm">
            {!isGithubConnected ? (
              <FButton
                variant="default"
                size="sm"
                leftSection={<IconBrandGithub size={16} />}
                loading={connectGithub.isPending}
                onClick={() => connectGithub.mutate()}
              >
                Connect GitHub
              </FButton>
            ) : (
              <Badge
                color="teal"
                variant="outline"
                size="md"
                leftSection={<IconBrandGithub size={14} />}
              >
                GitHub Connected
              </Badge>
            )}

            <FButton
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => setModalOpened(true)}
            >
              Import Repository
            </FButton>
          </Group>
        </Group>

        {/* Repositories Section */}
        {isLoading ? (
          <Center py={80}>
            <Stack align="center" gap="sm">
              <Loader size="md" color="indigo" />
              <Text size="sm" c="dimmed">
                Loading codebases...
              </Text>
            </Stack>
          </Center>
        ) : error ? (
          <Alert
            icon={<IconAlertCircle size={18} />}
            title="Failed to Load Repositories"
            color="red"
            radius="md"
          >
            Could not retrieve your repositories. Please verify the API gateway
            is running.
          </Alert>
        ) : !repos || repos.length === 0 ? (
          <Paper withBorder p={60} radius="md" ta="center">
            <Stack align="center" gap="md">
              <ThemeIcon size={64} radius="xl" color="indigo" variant="light">
                <IconCpu size={32} />
              </ThemeIcon>
              <Stack gap={4}>
                <Text fw={700} size="lg">
                  No repositories ingested yet
                </Text>
                <Text c="dimmed" size="sm" maw={450}>
                  Import any public GitHub repository or connect your GitHub
                  account to unlock AST chunking and Agentic RAG exploration.
                </Text>
              </Stack>
              <FButton
                size="md"
                mt="sm"
                leftSection={<IconPlus size={18} />}
                onClick={() => setModalOpened(true)}
              >
                Import Your First Repository
              </FButton>
            </Stack>
          </Paper>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
            {repos.map((repo) => (
              <Card
                key={repo.id}
                withBorder
                padding="lg"
                radius="md"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={2} style={{ maxWidth: '70%' }}>
                      <Text fw={700} size="md" truncate>
                        {repo.repoName}
                      </Text>
                      <Group
                        gap={6}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setBranchModalRepo(repo)}
                        title="Click to switch branch & re-index"
                      >
                        <Badge
                          size="xs"
                          variant="outline"
                          color="indigo"
                          leftSection={<IconGitBranch size={10} />}
                          style={{ cursor: 'pointer' }}
                        >
                          {repo.defaultBranch || 'main'}
                        </Badge>
                      </Group>
                    </Stack>
                    {getStatusBadge(repo)}
                  </Group>

                  {/* Live Ingestion Progress (shown when in progress) */}
                  {repo.status !== RepoStatus.READY &&
                    repo.status !== RepoStatus.FAILED && (
                      <RepoIngestionProgress repo={repo} />
                    )}

                  {/* Ingestion stats */}
                  <Paper withBorder p="xs" radius="sm" bg="var(--mantine-color-gray-0)">
                    <Group justify="space-around">
                      <Group gap={6}>
                        <IconFileCode size={16} color="gray" />
                        <Stack gap={0}>
                          <Text size="xs" c="dimmed">
                            Files
                          </Text>
                          <Text fw={600} size="xs">
                            {repo.totalFiles}
                          </Text>
                        </Stack>
                      </Group>
                      <Group gap={6}>
                        <IconCpu size={16} color="gray" />
                        <Stack gap={0}>
                          <Text size="xs" c="dimmed">
                            AST Chunks
                          </Text>
                          <Text fw={600} size="xs">
                            {repo.status === RepoStatus.IN_PROGRESS &&
                            (repo.processedChunks || 0) > 0
                              ? `${repo.processedChunks} / ${repo.totalChunks}`
                              : repo.totalChunks}
                          </Text>
                        </Stack>
                      </Group>
                    </Group>
                  </Paper>

                  {repo.status === RepoStatus.FAILED && repo.errorMessage ? (
                    <Text size="xs" c="red" lineClamp={2}>
                      Error: {repo.errorMessage}
                    </Text>
                  ) : null}
                </Stack>

                {/* Card Actions */}
                <Group justify="space-between" mt="lg" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                  {repo.status === RepoStatus.FAILED ? (
                    <FButton
                      size="xs"
                      color="red"
                      variant="light"
                      leftSection={<IconRefresh size={14} />}
                      loading={retryMutation.isPending && retryMutation.variables === repo.id}
                      onClick={() => retryMutation.mutate(repo.id)}
                    >
                      Retry Ingestion
                    </FButton>
                  ) : repo.status !== RepoStatus.READY ? (
                    <FButton
                      size="xs"
                      variant="light"
                      disabled
                      leftSection={<Loader size={12} color="indigo" />}
                    >
                      Ingesting Codebase...
                    </FButton>
                  ) : (
                    <Group gap="xs">
                      <FButton
                        component={Link}
                        href={`/chat?repoId=${repo.id}`}
                        size="xs"
                        variant="light"
                        leftSection={<IconMessageCode size={14} />}
                      >
                        Codebase Chat
                      </FButton>
                      <FButton
                        size="xs"
                        variant="subtle"
                        color="indigo"
                        leftSection={<IconGitBranch size={13} />}
                        onClick={() => setBranchModalRepo(repo)}
                        title="Switch branch & re-index codebase"
                      >
                        Branch
                      </FButton>
                    </Group>
                  )}
                  <FButton
                    component="a"
                    href={repo.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    size="xs"
                    variant="subtle"
                    rightSection={<IconExternalLink size={12} />}
                  >
                    GitHub
                  </FButton>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      <ImportRepoModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
      />

      <SwitchBranchModal
        opened={Boolean(branchModalRepo)}
        onClose={() => setBranchModalRepo(null)}
        repo={branchModalRepo}
      />
    </Container>
  );
}
