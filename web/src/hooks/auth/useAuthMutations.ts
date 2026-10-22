import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { loginInitialValues } from '@/form/initial-values/login';
import { registerInitialValues } from '@/form/initial-values/register';

export const useLoginMutation = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (values: typeof loginInitialValues) => {
      const res = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
      });
      return res.data;
    },
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Logged in successfully',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/dashboard');
    },
    onError: (error) => {
      const message = axios.isAxiosError(error) 
        ? error.response?.data?.message || 'Failed to login'
        : 'Failed to login';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    }
  });
};

export const useRegisterMutation = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (values: typeof registerInitialValues) => {
      const res = await api.post('/auth/register', {
        email: values.email,
        password: values.password,
      });
      return res.data;
    },
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Account created successfully',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/dashboard');
    },
    onError: (error) => {
      const message = axios.isAxiosError(error) 
        ? error.response?.data?.message || 'Failed to register'
        : 'Failed to register';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    }
  });
};
