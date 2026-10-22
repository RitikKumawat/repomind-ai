'use client';

import { Paper, Title, Text, Anchor, Divider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconBrandGithub } from '@tabler/icons-react';
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

  const form = useForm({
    initialValues: registerInitialValues,
    validate: yupResolver(registerValidationSchema),
  });

  const handleSubmit = (values: typeof registerInitialValues) => {
    register(values);
  };

  return (
    <>
      <Title ta="center" fw={900}>
        Create an account
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{' '}
        <Anchor size="sm" component={Link} href="/login">
          Sign in
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
          Sign up with GitHub
        </FButton>
        
        <Divider label="Or sign up with email" labelPosition="center" my="lg" />
        
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
          <FPasswordInput 
            label="Confirm Password" 
            placeholder="Confirm your password" 
            mt="md" 
            {...form.getInputProps('confirmPassword')}
          />
          
          <FButton fullWidth mt="xl" type="submit" loading={isPending}>
            Create account
          </FButton>
        </form>
      </Paper>
    </>
  );
}
