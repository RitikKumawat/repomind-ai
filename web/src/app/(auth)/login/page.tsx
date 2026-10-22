'use client';

import { Checkbox, Anchor, Paper, Title, Text, Group, Divider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconBrandGithub } from '@tabler/icons-react';
import Link from 'next/link';
import { FInput } from '@/components/ui/FInput';
import { FPasswordInput } from '@/components/ui/FPasswordInput';
import { FButton } from '@/components/ui/FButton';
import { loginInitialValues } from '@/form/initial-values/login';
import { loginValidationSchema } from '@/form/validation/login';
import { yupResolver } from 'mantine-form-yup-resolver';
import { useLoginMutation } from '@/hooks/auth/useAuthMutations';

export default function LoginPage() {
  const { mutate: login, isPending } = useLoginMutation();

  const form = useForm({
    initialValues: loginInitialValues,
    validate: yupResolver(loginValidationSchema),
  });

  const handleSubmit = (values: typeof loginInitialValues) => {
    login(values);
  };

  return (
    <>
      <Title ta="center" fw={900}>
        Welcome back!
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Do not have an account yet?{' '}
        <Anchor size="sm" component={Link} href="/register">
          Create account
        </Anchor>
      </Text>

      <Paper withBorder shadow="sm" p={30} mt={30} radius="md">
        <FButton 
          fullWidth 
          variant="default" 
          leftSection={<IconBrandGithub size="1rem" />}
          mb="md"
          component="a"
          href="http://localhost:4000/auth/github"
        >
          Continue with GitHub
        </FButton>
        
        <Divider label="Or continue with email" labelPosition="center" my="lg" />
        
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <FInput 
            label="Email" 
            placeholder="you@mantine.dev" 
            {...form.getInputProps('email')}
          />
          <FPasswordInput 
            label="Password" 
            placeholder="Your password" 
            mt="md" 
            {...form.getInputProps('password')}
          />
          
          <Group justify="space-between" mt="lg">
            <Checkbox label="Remember me" {...form.getInputProps('rememberMe', { type: 'checkbox' })} />
            <Anchor component="button" type="button" size="sm">
              Forgot password?
            </Anchor>
          </Group>
          
          <FButton fullWidth mt="xl" type="submit" loading={isPending}>
            Sign in
          </FButton>
        </form>
      </Paper>
    </>
  );
}
