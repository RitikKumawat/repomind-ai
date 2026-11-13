'use client';

import { useState } from 'react';
import {
  Container,
  Group,
  Text,
  Badge,
  Burger,
  Drawer,
  Stack,
  ActionIcon,
  Tooltip,
  Paper,
  Divider,
} from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import {
  IconBrain,
  IconBrandGithub,
  IconFileText,
  IconArrowRight,
  IconHierarchy2,
  IconRoute,
  IconSparkles,
  IconChartBar,
  IconCpu,
  IconChevronRight,
  IconDownload,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { FButton } from '@/components/ui/FButton';

export function Navbar() {
  const { user } = useAuth();
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [scroll] = useWindowScroll();

  const isScrolled = scroll.y > 10;

  const navLinks = [
    {
      label: 'Architecture',
      href: '#architecture',
      icon: <IconHierarchy2 size={18} color="#1C7ED6" />,
      desc: 'Distributed microservices topology',
    },
    {
      label: 'AST vs RAG',
      href: '#rag-comparison',
      icon: <IconBrain size={18} color="#10B981" />,
      desc: 'Tree-sitter CST vs naive token slicing',
    },
    {
      label: 'API Explorer',
      href: '#api-explorer',
      icon: <IconRoute size={18} color="#8B5CF6" />,
      desc: 'Multi-framework static endpoint schemas',
    },
    {
      label: 'Sandbox',
      href: '#sandbox',
      icon: <IconSparkles size={18} color="#F59E0B" />,
      desc: 'Interactive live IDE workspace preview',
    },
    {
      label: 'Benchmarks',
      href: '#benchmarks',
      icon: <IconChartBar size={18} color="#06B6D4" />,
      desc: 'Retrieval accuracy, latency & token savings',
    },
    {
      label: 'Tech Stack',
      href: '#tech-stack',
      icon: <IconCpu size={18} color="#6366F1" />,
      desc: 'Next.js 16, NestJS, FastAPI & Qdrant',
    },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.replace('#', '');
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        const navbarHeight = 74;
        const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: elementPosition - navbarHeight,
          behavior: 'smooth',
        });
        window.history.pushState(null, '', href);
      }
    }
    setDrawerOpened(false);
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.history.pushState(null, '', '/');
    }
    setDrawerOpened(false);
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: '68px',
          zIndex: 1000,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.82)',
          borderBottom: isScrolled
            ? '1px solid rgba(203, 213, 225, 0.8)'
            : '1px solid rgba(226, 232, 240, 0.65)',
          boxShadow: isScrolled
            ? '0 4px 20px -2px rgba(15, 23, 42, 0.08)'
            : '0 1px 3px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Container size="xl" h="100%">
          <Group justify="space-between" h="100%" wrap="nowrap">
            {/* Left: Brand Logo */}
            <Link
              href="/"
              onClick={handleLogoClick}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Group gap={10} wrap="nowrap">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #1C7ED6 0%, #2563EB 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    boxShadow: '0 3px 10px rgba(28, 126, 214, 0.32)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <IconHierarchy2 size={20} stroke={2.2} />
                </div>
                <Group gap={6} wrap="nowrap">
                  <Text fw={800} size="1.15rem" lts={-0.5} c="#0F172A">
                    RepoMind
                  </Text>
                  <span
                    style={{
                      backgroundColor: 'rgba(28, 126, 214, 0.1)',
                      color: '#1C7ED6',
                      border: '1px solid rgba(28, 126, 214, 0.25)',
                      borderRadius: 4,
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      letterSpacing: '0.04em',
                      lineHeight: 1,
                    }}
                  >
                    AI
                  </span>
                </Group>
              </Group>
            </Link>

            {/* Center: Desktop Navigation Links (Visible on Large Displays) */}
            <Group gap={4} visibleFrom="lg" wrap="nowrap">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  style={{
                    textDecoration: 'none',
                    color: '#475569',
                    fontSize: '0.86rem',
                    fontWeight: 650,
                    padding: '7px 12px',
                    borderRadius: 8,
                    transition: 'all 0.15s ease',
                    letterSpacing: '-0.01em',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#1C7ED6';
                    e.currentTarget.style.backgroundColor = 'rgba(28, 126, 214, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {link.label}
                </a>
              ))}
            </Group>

            {/* Right: Actions (Visible on Large Displays) */}
            <Group gap="sm" visibleFrom="lg" wrap="nowrap">
              <Tooltip
                label="Download 4-Page Architecture Whitepaper (PDF)"
                withArrow
                position="bottom"
                offset={10}
                zIndex={2000}
              >
                <FButton
                  component="a"
                  href="/assets/RepoMind_AI_Architecture_Case_Study.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="subtle"
                  color="gray"
                  size="sm"
                  c="#475569"
                  leftSection={<IconFileText size={16} stroke={1.8} />}
                  style={{ fontWeight: 650 }}
                >
                  Whitepaper
                </FButton>
              </Tooltip>

              <Tooltip
                label="GitHub Repository"
                withArrow
                position="bottom"
                offset={10}
                zIndex={2000}
              >
                <ActionIcon
                  component="a"
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="default"
                  size="md"
                  radius="md"
                  aria-label="GitHub Repository"
                  style={{
                    borderColor: '#CBD5E1',
                    color: '#334155',
                  }}
                >
                  <IconBrandGithub size={18} stroke={1.8} />
                </ActionIcon>
              </Tooltip>

              {user ? (
                <FButton
                  component={Link}
                  href="/dashboard"
                  size="sm"
                  variant="filled"
                  rightSection={<IconArrowRight size={15} />}
                  style={{
                    boxShadow: '0 2px 8px rgba(28, 126, 214, 0.28)',
                  }}
                >
                  Dashboard
                </FButton>
              ) : (
                <Group gap={8} wrap="nowrap">
                  <FButton
                    component={Link}
                    href="/login"
                    size="sm"
                    variant="subtle"
                    c="#475569"
                  >
                    Sign In
                  </FButton>
                  <FButton
                    component={Link}
                    href="/login"
                    size="sm"
                    variant="filled"
                    rightSection={<IconArrowRight size={15} />}
                    style={{
                      boxShadow: '0 2px 8px rgba(28, 126, 214, 0.28)',
                    }}
                  >
                    Get Started
                  </FButton>
                </Group>
              )}
            </Group>

            {/* Right Mobile/Tablet: Burger Menu (Hidden on Large Displays) */}
            <Group gap="xs" hiddenFrom="lg">
              {user ? (
                <FButton
                  component={Link}
                  href="/dashboard"
                  size="xs"
                  variant="filled"
                >
                  Dashboard
                </FButton>
              ) : (
                <FButton
                  component={Link}
                  href="/login"
                  size="xs"
                  variant="light"
                >
                  Sign In
                </FButton>
              )}

              <Burger
                opened={drawerOpened}
                onClick={() => setDrawerOpened((o) => !o)}
                size="sm"
                aria-label="Toggle navigation"
                color="#0F172A"
              />
            </Group>
          </Group>
        </Container>
      </nav>

      {/* Mobile & Tablet Drawer Menu */}
      <Drawer
        opened={drawerOpened}
        onClose={() => setDrawerOpened(false)}
        size="md"
        position="right"
        padding="lg"
        title={
          <Group gap={10}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1C7ED6 0%, #2563EB 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <IconHierarchy2 size={18} />
            </div>
            <Text fw={800} size="md" c="#0F172A">
              RepoMind AI
            </Text>
            <Badge size="xs" color="blue" variant="light">
              v1.2 Prod
            </Badge>
          </Group>
        }
        styles={{
          header: {
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: 14,
          },
          body: {
            paddingTop: 16,
          },
        }}
      >
        <Stack gap="xs">
          <Text size="xs" fw={700} c="#94A3B8" tt="uppercase" lts={1} px={6}>
            Sections & Capabilities
          </Text>

          {/* List of Rich Interactive Section Cards */}
          {navLinks.map((link) => (
            <Paper
              key={link.href}
              component="a"
              href={link.href}
              onClick={(e) => handleScrollTo(e, link.href)}
              p="sm"
              radius="md"
              withBorder
              style={{
                textDecoration: 'none',
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1C7ED6';
                e.currentTarget.style.backgroundColor = '#F0F9FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {link.icon}
                  </div>
                  <div>
                    <Text fw={700} size="sm" c="#1E293B">
                      {link.label}
                    </Text>
                    <Text size="xs" c="#64748B" lineClamp={1}>
                      {link.desc}
                    </Text>
                  </div>
                </Group>
                <IconChevronRight size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
              </Group>
            </Paper>
          ))}

          <Divider my="sm" color="#E2E8F0" />

          {/* Whitepaper Card in Drawer */}
          <Paper
            component="a"
            href="/assets/RepoMind_AI_Architecture_Case_Study.pdf"
            target="_blank"
            rel="noopener noreferrer"
            p="sm"
            radius="md"
            style={{
              textDecoration: 'none',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <IconDownload size={18} color="#38BDF8" />
                <div>
                  <Text fw={700} size="xs" c="#F8FAFC">
                    Architecture Whitepaper (PDF)
                  </Text>
                  <Text size="11px" c="#94A3B8">
                    4-Page Technical Case Study
                  </Text>
                </div>
              </Group>
              <Badge size="xs" color="blue" variant="filled">
                30 KB
              </Badge>
            </Group>
          </Paper>

          {/* Bottom Auth Buttons */}
          <Stack gap="xs" mt="sm">
            {user ? (
              <FButton
                component={Link}
                href="/dashboard"
                size="md"
                variant="filled"
                rightSection={<IconArrowRight size={16} />}
                onClick={() => setDrawerOpened(false)}
              >
                Go to Dashboard
              </FButton>
            ) : (
              <>
                <FButton
                  component={Link}
                  href="/login"
                  size="md"
                  variant="filled"
                  rightSection={<IconArrowRight size={16} />}
                  onClick={() => setDrawerOpened(false)}
                >
                  Get Started Free
                </FButton>
                <FButton
                  component={Link}
                  href="/login"
                  size="md"
                  variant="default"
                  onClick={() => setDrawerOpened(false)}
                >
                  Sign In to Account
                </FButton>
              </>
            )}
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}
