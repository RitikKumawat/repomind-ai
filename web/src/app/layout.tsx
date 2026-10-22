import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { theme } from '../theme';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { Notifications } from '@mantine/notifications';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.scss';

const primaryFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-primary',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RepoMind AI',
  description: 'AI-powered repository intelligence platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={primaryFont.variable} data-mantine-color-scheme="light">
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <Notifications />
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
