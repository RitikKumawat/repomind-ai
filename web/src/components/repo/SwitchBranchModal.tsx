'use client';

import { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Select,
  TextInput,
  Badge,
  Alert,
  Loader,
} from '@mantine/core';
import {
  IconGitBranch,
  IconRefresh,
  IconInfoCircle,
} from '@tabler/icons-react';
import { FButton } from '@/components/ui/FButton';
import { useRepoBranches, useSwitchBranchMutation } from '@/hooks/repo/useRepoQueries';
import type { RepositoryItem } from '@/types/repo';

interface SwitchBranchModalProps {
  opened: boolean;
  onClose: () => void;
  repo: RepositoryItem | null;
}

function SwitchBranchModalContent({
  repo,
  onClose,
}: {
  repo: RepositoryItem;
  onClose: () => void;
}) {
  const [selectedBranch, setSelectedBranch] = useState<string>(
    repo.defaultBranch || 'main'
  );
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const { data: branches, isLoading: isLoadingBranches } = useRepoBranches(
    repo.id,
    true
  );

  const switchMutation = useSwitchBranchMutation(() => {
    onClose();
  });

  const branchOptions = (branches || []).map((b) => ({
    value: b,
    label: b,
  }));

  const handleSwitch = () => {
    if (!selectedBranch.trim()) return;
    switchMutation.mutate({
      repoId: repo.id,
      branch: selectedBranch.trim(),
    });
  };

  const isCurrentBranch = selectedBranch.trim() === repo.defaultBranch;

  return (
    <Stack gap="md">
      <Alert
        icon={<IconInfoCircle size={18} />}
        color="indigo"
        variant="light"
        radius="md"
      >
        Switching branches will clean up existing vector embeddings and re-index
        the repository codebase using the selected branch.
      </Alert>

      <Group justify="space-between" py="xs">
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            Repository
          </Text>
          <Text fw={600} size="sm">
            {repo.repoName}
          </Text>
        </Stack>
        <Stack gap={2} align="flex-end">
          <Text size="xs" c="dimmed">
            Current Branch
          </Text>
          <Badge variant="outline" color="indigo" leftSection={<IconGitBranch size={12} />}>
            {repo.defaultBranch}
          </Badge>
        </Stack>
      </Group>

      {isLoadingBranches ? (
        <Group justify="center" py="md">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Fetching remote branches from GitHub...
          </Text>
        </Group>
      ) : branchOptions.length > 0 && !isCustom ? (
        <Stack gap="xs">
          <Select
            label="Select Target Branch"
            placeholder="Choose a branch"
            data={branchOptions}
            value={selectedBranch}
            onChange={(val) => val && setSelectedBranch(val)}
            searchable
            clearable={false}
            leftSection={<IconGitBranch size={16} />}
          />
          <Text
            size="xs"
            c="indigo"
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => setIsCustom(true)}
          >
            Enter branch name manually instead
          </Text>
        </Stack>
      ) : (
        <Stack gap="xs">
          <TextInput
            label="Target Branch Name"
            placeholder="e.g. develop, staging, feature-branch"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.currentTarget.value)}
            leftSection={<IconGitBranch size={16} />}
            required
          />
          {branchOptions.length > 0 ? (
            <Text
              size="xs"
              c="indigo"
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setIsCustom(false)}
            >
              Choose from detected GitHub branches
            </Text>
          ) : null}
        </Stack>
      )}

      {isCurrentBranch ? (
        <Text size="xs" c="dimmed" ta="center">
          Branch <b>{selectedBranch}</b> is currently active. Choosing a different branch will start re-indexing.
        </Text>
      ) : null}

      <Group justify="flex-end" mt="md">
        <FButton variant="subtle" onClick={onClose} disabled={switchMutation.isPending}>
          Cancel
        </FButton>
        <FButton
          onClick={handleSwitch}
          loading={switchMutation.isPending}
          disabled={!selectedBranch.trim() || isCurrentBranch}
          leftSection={<IconRefresh size={16} />}
        >
          Switch & Re-Index
        </FButton>
      </Group>
    </Stack>
  );
}

export function SwitchBranchModal({
  opened,
  onClose,
  repo,
}: SwitchBranchModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconGitBranch size={20} color="var(--mantine-color-indigo-6)" />
          <Text fw={700} size="md">
            Switch Branch & Re-Index
          </Text>
        </Group>
      }
      radius="md"
      size="md"
    >
      {repo && (
        <SwitchBranchModalContent
          key={`${repo.id}-${repo.defaultBranch}-${opened}`}
          repo={repo}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
