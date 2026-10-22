'use client';

import { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  githubId?: string;
  isGithubRepoConnected?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/me');
        return res.data.user || null;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    queryClient.setQueryData(['me'], null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user: data || null, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
