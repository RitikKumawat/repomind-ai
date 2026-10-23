'use client';

import { useState } from 'react';
import {
  Modal,
  Tabs,
  Stack,
  Text,
  Badge,
  Group,
  TextInput,
  Paper,
  ScrollArea,
  ActionIcon,
  Alert,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconBrandGithub,
  IconLink,
  IconSearch,
  IconLock,
  IconWorld,
  IconArrowRight,
  IconInfoCircle,
  IconCheck,
  IconGitBranch,
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { yupResolver } from 'mantine-form-yup-resolver';
import * as yup from 'yup';
import { FButton } from '@/components/ui/FButton';
import { FInput } from '@/components/ui/FInput';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGithubRepos,
  useImportRepoMutation,
  useConnectGithub,
  useUserRepos,
} from '@/hooks/repo/useRepoQueries';
import type { GithubRepoItem, RepositoryItem } from '@/types/repo';
import { SwitchBranchModal } from './SwitchBranchModal';

interface ImportRepoModalProps {
  opened: boolean;
  onClose: () => void;
}

const urlSchema = yup.object({
  githubUrl: yup
    .string()
    .required('Repository URL is required')
    .matches(
      /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/,
      'Must be a valid GitHub URL (e.g., https://github.com/facebook/react)'
    ),
  defaultBranch: yup.string().default('main'),
});

export function ImportRepoModal({ opened, onClose }: ImportRepoModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string | null>('url');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchMap, setBranchMap] = useState<Record<string, string>>({});
  const [switchModalRepo, setSwitchModalRepo] = useState<RepositoryItem | null>(
    null
  );

  const isGithubConnected = Boolean(user?.isGithubRepoConnected);

  const { data: userRepos } = useUserRepos();

  const {
    data: githubRepos,
    isLoading: isLoadingGithub,
    isError: isGithubError,
  } = useGithubRepos(opened && isGithubConnected);

  const importMutation = useImportRepoMutation(() => {
    onClose();
  });

  const connectGithubMutation = useConnectGithub();

  const urlForm = useForm({
    initialValues: {
      githubUrl: '',
      defaultBranch: 'main',
    },
    validate: yupResolver(urlSchema),
  });

  const handleUrlSubmit = (values: {
    githubUrl: string;
    defaultBranch?: string;
  }) => {
    const cleanUrl = values.githubUrl
      .trim()
      .toLowerCase()
      .replace(/\/+$/, '')
      .replace(/\.git$/, '');

    const alreadyExists = userRepos?.some(
      (r) =>
        r.githubUrl.toLowerCase().replace(/\/+$/, '').replace(/\.git$/, '') ===
        cleanUrl
    );

    if (alreadyExists) {
      urlForm.setFieldError(
        'githubUrl',
        'This repository has already been imported and is on your dashboard.'
      );
      return;
    }

    importMutation.mutate({
      githubUrl: values.githubUrl,
      defaultBranch: values.defaultBranch || 'main',
    });
  };

  const handleSelectGithubRepo = (repo: GithubRepoItem) => {
    const targetBranch =
      branchMap[repo.fullName]?.trim() || repo.defaultBranch || 'main';
    importMutation.mutate({
      repoFullName: repo.fullName,
      isPrivate: repo.isPrivate,
      defaultBranch: targetBranch,
    });
  };

  const filteredRepos = (githubRepos || []).filter((r) =>
    r.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconBrandGithub size={20} />
          <Text fw={700} size="lg">
            Import Repository
          </Text>
        </Group>
      }
      size="lg"
      radius="md"
    >
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        variant="pills"
        radius="md"
        mb="md"
      >
        <Tabs.List grow>
          <Tabs.Tab value="url" leftSection={<IconLink size={16} />}>
            Public Git URL
          </Tabs.Tab>
          <Tabs.Tab
            value="github"
            leftSection={<IconBrandGithub size={16} />}
            rightSection={
              isGithubConnected ? (
                <Badge size="xs" color="teal" variant="light">
                  Connected
                </Badge>
              ) : null
            }
          >
            Your GitHub Account
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="url" pt="md">
          <form onSubmit={urlForm.onSubmit(handleUrlSubmit)}>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Paste any public GitHub repository URL. No GitHub account linking
                is required.
              </Text>

              <FInput
                label="GitHub Repository URL"
                placeholder="https://github.com/organization/repository"
                required
                {...urlForm.getInputProps('githubUrl')}
              />

              <FInput
                label="Default Branch"
                placeholder="main"
                {...urlForm.getInputProps('defaultBranch')}
              />

              <Group justify="flex-end" mt="md">
                <FButton variant="subtle" onClick={onClose}>
                  Cancel
                </FButton>
                <FButton
                  type="submit"
                  loading={importMutation.isPending}
                  rightSection={<IconArrowRight size={16} />}
                >
                  Start Ingestion
                </FButton>
              </Group>
            </Stack>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="github" pt="md">
          {!isGithubConnected ? (
            <Stack gap="md" py="sm">
              <Alert
                icon={<IconInfoCircle size={18} />}
                title="Connect Your GitHub Account"
                color="indigo"
                radius="md"
              >
                Connect repository permissions to list and ingest your private and
                organization repositories with one click.
              </Alert>

              <Text size="sm" c="dimmed">
                Granting repository access allows RepoMind AI to securely read
                your code files during AST chunking and vector indexing.
              </Text>

              <FButton
                size="md"
                leftSection={<IconBrandGithub size={18} />}
                loading={connectGithubMutation.isPending}
                onClick={() => connectGithubMutation.mutate()}
                fullWidth
              >
                Connect GitHub Repositories
              </FButton>
            </Stack>
          ) : (
            <Stack gap="md">
              <TextInput
                placeholder="Search your repositories..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
              />

              {isGithubError ? (
                <Stack gap="sm" py="xs">
                  <Alert
                    icon={<IconInfoCircle size={18} />}
                    title="GitHub Session Expired"
                    color="red"
                    radius="md"
                  >
                    Your GitHub access token is invalid or has expired. Please reconnect your GitHub account to refresh permissions.
                  </Alert>
                  <FButton
                    size="sm"
                    leftSection={<IconBrandGithub size={16} />}
                    loading={connectGithubMutation.isPending}
                    onClick={() => connectGithubMutation.mutate()}
                  >
                    Reconnect GitHub Account
                  </FButton>
                </Stack>
              ) : isLoadingGithub ? (
                <Center py="xl">
                  <Loader size="md" />
                </Center>
              ) : filteredRepos.length === 0 ? (
                <Text ta="center" py="xl" c="dimmed" size="sm">
                  No repositories found.
                </Text>
              ) : (
                <ScrollArea h={320} offsetScrollbars>
                  <Stack gap="xs">
                    {filteredRepos.map((repo) => {
                      const alreadyImportedRepo = userRepos?.find(
                        (r) =>
                          r.repoName.toLowerCase() ===
                          repo.fullName.toLowerCase()
                      );
                      const isAlreadyImported = Boolean(alreadyImportedRepo);

                      return (
                        <Paper
                          key={repo.id}
                          withBorder
                          p="sm"
                          radius="md"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isAlreadyImported
                              ? 'var(--mantine-color-gray-0)'
                              : undefined,
                          }}
                        >
                          <Stack gap={4} style={{ maxWidth: '70%' }}>
                            <Group gap="xs">
                              <Text fw={600} size="sm" truncate>
                                {repo.fullName}
                              </Text>
                              {isAlreadyImported ? (
                                <Badge size="xs" color="teal" variant="light">
                                  Already Imported
                                </Badge>
                              ) : repo.isPrivate ? (
                                <Badge
                                  size="xs"
                                  color="orange"
                                  variant="light"
                                  leftSection={<IconLock size={10} />}
                                >
                                  Private
                                </Badge>
                              ) : (
                                <Badge
                                  size="xs"
                                  color="gray"
                                  variant="light"
                                  leftSection={<IconWorld size={10} />}
                                >
                                  Public
                                </Badge>
                              )}
                            </Group>
                            {repo.description ? (
                              <Text size="xs" c="dimmed" truncate>
                                {repo.description}
                              </Text>
                            ) : null}
                            <Group gap="xs" align="center">
                              {repo.language ? (
                                <Badge
                                  size="xs"
                                  variant="outline"
                                  color="indigo"
                                >
                                  {repo.language}
                                </Badge>
                              ) : null}
                              <Group gap={4} align="center">
                                <IconGitBranch size={12} color="gray" />
                                <TextInput
                                  size="xs"
                                  variant="filled"
                                  radius="xs"
                                  styles={{
                                    input: {
                                      height: 20,
                                      minHeight: 20,
                                      padding: '0 4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: 'var(--mantine-color-indigo-7)',
                                      backgroundColor:
                                        'var(--mantine-color-indigo-0)',
                                      border:
                                        '1px solid var(--mantine-color-indigo-2)',
                                      width: 90,
                                    },
                                  }}
                                  value={
                                    branchMap[repo.fullName] ??
                                    repo.defaultBranch
                                  }
                                  onChange={(e) => {
                                    const val = e.currentTarget.value;
                                    setBranchMap((prev) => ({
                                      ...prev,
                                      [repo.fullName]: val,
                                    }));
                                  }}
                                  placeholder="Branch"
                                  title="Click to edit target branch"
                                />
                              </Group>
                            </Group>
                          </Stack>

                          {isAlreadyImported ? (
                            <Group gap={6}>
                              <Badge
                                color="teal"
                                variant="light"
                                size="xs"
                                leftSection={<IconCheck size={10} />}
                              >
                                {alreadyImportedRepo?.defaultBranch}
                              </Badge>
                              <FButton
                                size="xs"
                                variant="light"
                                color="indigo"
                                leftSection={<IconGitBranch size={12} />}
                                onClick={() =>
                                  setSwitchModalRepo(alreadyImportedRepo || null)
                                }
                              >
                                Switch
                              </FButton>
                            </Group>
                          ) : (
                            <ActionIcon
                              variant="filled"
                              color="indigo"
                              size="lg"
                              radius="md"
                              loading={
                                importMutation.isPending &&
                                importMutation.variables?.repoFullName ===
                                  repo.fullName
                              }
                              onClick={() => handleSelectGithubRepo(repo)}
                              title={`Import branch: ${branchMap[repo.fullName] || repo.defaultBranch}`}
                            >
                              <IconArrowRight size={18} />
                            </ActionIcon>
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
                </ScrollArea>
              )}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>

      <SwitchBranchModal
        opened={Boolean(switchModalRepo)}
        onClose={() => setSwitchModalRepo(null)}
        repo={switchModalRepo}
      />
    </Modal>
  );
}
