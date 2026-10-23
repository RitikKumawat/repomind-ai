"use client";

import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Title,
  Text,
  Button,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconHome,
  IconDatabaseImport,
  IconSettings,
  IconMessageCode,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, logout } = useAuth();
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding={pathname?.startsWith('/chat') ? 0 : 'md'}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Title order={3} c="blue.6">
              RepoMind AI
            </Title>
          </Group>
          <Group>
            <Text size="sm" fw={500}>
              {user?.email || 'User'}
            </Text>
            <Button variant="light" size="xs" onClick={logout}>
              Logout
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          component={Link}
          href="/dashboard"
          label="Dashboard"
          leftSection={<IconHome size="1rem" stroke={1.5} />}
          active={pathname?.startsWith("/dashboard")}
          onClick={() => opened && toggle()}
        />
        <NavLink
          component={Link}
          href="/chat"
          label="Codebase Chat"
          leftSection={<IconMessageCode size="1rem" stroke={1.5} />}
          active={pathname?.startsWith("/chat")}
          onClick={() => opened && toggle()}
        />
        <NavLink
          component={Link}
          href="/import"
          label="Import Repository"
          leftSection={<IconDatabaseImport size="1rem" stroke={1.5} />}
          active={pathname?.startsWith("/import")}
          onClick={() => opened && toggle()}
        />
        <NavLink
          component={Link}
          href="/settings"
          label="Settings"
          leftSection={<IconSettings size="1rem" stroke={1.5} />}
          active={pathname?.startsWith("/settings")}
          onClick={() => opened && toggle()}
        />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
