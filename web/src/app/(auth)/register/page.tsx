'use client';

import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Paper,
  Divider,
  Anchor,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconBrandGithub,
  IconMail,
  IconLock,
  IconShieldCheck,
  IconArrowRight,
  IconHierarchy2,
} from '@tabler/icons-react';
import Link from 'next/link';
import { FInput } from '@/components/ui/FInput';
import { FPasswordInput } from '@/components/ui/FPasswordInput';
import { FButton } from '@/components/ui/FButton';
import { registerInitialValues } from '@/form/initial-values/register';
import { registerValidationSchema } from '@/form/validation/register';
import { yupResolver } from 'mantine-form-yup-resolver';
import { useRegisterMutation } from '@/hooks/auth/useAuthMutations';

export default function RegisterPage() {
  const { mutate: register, isPending } = useRegisterMutation();
  const githubAuthUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/github`;

  const form = useForm({
    initialValues: registerInitialValues,
    validate: yupResolver(registerValidationSchema),
  });

  const handleSubmit = (values: typeof registerInitialValues) => {
    register(values);
  };

  return (
    <Box style={{ width: '100%', maxWidth: 400 }}>
      {/* Brand Header */}
      <Group gap={8} justify="center" mb="xs">
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
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
              boxShadow: '0 2px 8px rgba(28, 126, 214, 0.35)',
              transition: 'transform 0.15s ease',
            }}
          >
            <IconHierarchy2 size={18} stroke={2.2} />
          </div>
        </Link>
        <Text fw={800} size="1.2rem" lts={-0.4} c="#0F172A">
          RepoMind AI
        </Text>
        <span
          style={{
            backgroundColor: 'rgba(28, 126, 214, 0.1)',
            color: '#1C7ED6',
            border: '1px solid rgba(28, 126, 214, 0.25)',
            borderRadius: 4,
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 5px',
            lineHeight: 1,
          }}
        >
          v1.2
        </span>
      </Group>

      {/* Main Authentication Card */}
      <Paper
        withBorder
        p={{ base: 20, sm: 26 }}
        radius="lg"
        style={{
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderColor: '#E2E8F0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02), 0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 20px 48px -12px rgba(15, 23, 42, 0.06)',
        }}
      >
        <Stack gap={2} mb="md" ta="center">
          <Title order={2} size="1.3rem" fw={800} c="#0F172A" lts={-0.4}>
            Create your workspace
          </Title>
          <Text size="xs" c="#64748B">
            Start analyzing codebases with AST intelligence
          </Text>
        </Stack>

        {/* GitHub Button */}
        <FButton
          fullWidth
          radius="md"
          variant="default"
          leftSection={<IconBrandGithub size={17} stroke={1.8} />}
          component="a"
          href={githubAuthUrl}
          style={{
            height: 38,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderColor: '#0F172A',
            fontSize: '13.5px',
            fontWeight: 650,
            transition: 'background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1E293B';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#0F172A';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Sign up with GitHub
        </FButton>

        {/* Divider */}
        <Divider
          label="OR REGISTER WITH EMAIL"
          labelPosition="center"
          my="md"
          styles={{
            label: {
              color: '#94A3B8',
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '0.06em',
            },
          }}
        />

        {/* Registration Form */}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap={10}>
            <FInput
              className="auth-input"
              label="Work email"
              placeholder="you@company.com"
              leftSection={<IconMail size={15} color="#94A3B8" stroke={1.8} />}
              {...form.getInputProps('email')}
            />

            <FPasswordInput
              className="auth-input"
              label="Password"
              placeholder="At least 6 characters"
              leftSection={<IconLock size={15} color="#94A3B8" stroke={1.8} />}
              {...form.getInputProps('password')}
            />

            <FPasswordInput
              className="auth-input"
              label="Confirm password"
              placeholder="Re-enter your password"
              leftSection={<IconShieldCheck size={15} color="#94A3B8" stroke={1.8} />}
              {...form.getInputProps('confirmPassword')}
            />

            <Text size="11px" c="#64748B" mt={-2}>
              By signing up, you agree to our Terms of Service & Privacy Policy.
            </Text>

            <FButton
              fullWidth
              mt={4}
              type="submit"
              loading={isPending}
              rightSection={<IconArrowRight size={15} />}
              style={{
                height: 38,
                fontSize: '13.5px',
                fontWeight: 650,
                background: 'linear-gradient(135deg, #1C7ED6 0%, #2563EB 100%)',
                boxShadow: '0 4px 14px rgba(28, 126, 214, 0.35)',
              }}
            >
              Create Free Account
            </FButton>
          </Stack>
        </form>

        {/* Footer switch to Login */}
        <Box mt="md" pt="xs" style={{ borderTop: '1px solid #F1F5F9' }} ta="center">
          <Text size="xs" c="#64748B">
            Already have an account?{' '}
            <Anchor component={Link} href="/login" fw={700} c="#1C7ED6" size="xs">
              Sign in →
            </Anchor>
          </Text>
        </Box>
      </Paper>

      {/* Exterior Security Trust Note */}
      <Group justify="center" gap={6} mt="xs">
        <IconShieldCheck size={14} color="#10B981" />
        <Text size="11px" c="#94A3B8" fw={500}>
          256-bit SSL encrypted • Zero Code Retention Policy
        </Text>
      </Group>
    </Box>
  );
}
