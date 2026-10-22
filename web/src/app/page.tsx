'use client';

import { Container, Group, Title, Text, Stack } from '@mantine/core';
import { IconArrowRight, IconBook } from '@tabler/icons-react';
import { FButton } from '@/components/ui/FButton';
import Link from 'next/link';
import { GuestGuard } from '@/components/layout/GuestGuard';

export default function Home() {
  return (
    <GuestGuard>
      <Container size="md" pt={120}>
        <Stack align="center" mt="xl" gap="lg">
          <Title order={1} ta="center" size="3.5rem" fw={900} lts={-1}>
            RepoMind AI
          </Title>
          <Text c="dimmed" ta="center" size="xl" maw={650} lh={1.6}>
            Analyze GitHub repositories and automatically generate architecture insights, API documentation, and onboarding guides using AI.
          </Text>
          <Group mt="xl" gap="md">
            <FButton 
              size="md" 
              radius="md" 
              rightSection={<IconArrowRight size="1.1rem" />}
              component={Link}
              href="/login"
              px="xl"
            >
              Get Started
            </FButton>
            <FButton 
              size="md" 
              variant="default" 
              radius="md"
              leftSection={<IconBook size="1.1rem" />}
              component={Link}
              href="/import"
              px="xl"
            >
              View Demo
            </FButton>
          </Group>
        </Stack>
      </Container>
    </GuestGuard>
  );
}
