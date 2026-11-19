import type { Metadata, Viewport } from 'next';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { theme } from '../theme';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { Notifications } from '@mantine/notifications';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/code-highlight/styles.css';
import './globals.scss';

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '') ||
  'https://repomind.up.railway.app'
).replace(/\/$/, '');

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'RepoMind AI — AST-Aware Codebase Intelligence & Architecture Engine',
    template: '%s | RepoMind AI',
  },
  description:
    'Understand complex codebases instantly with AST-aware semantic search, interactive architectural dependency graphs, and automated API documentation extraction.',
  keywords: [
    'codebase intelligence',
    'AI code search',
    'AST chunking',
    'architecture diagram generator',
    'code analysis',
    'RAG for code',
    'developer tools',
    'hybrid search',
    'Qdrant vector search',
    'Gemini AI',
    'Next.js',
    'NestJS',
    'software engineering productivity',
  ],
  authors: [{ name: 'RepoMind AI Team', url: APP_URL }],
  creator: 'RepoMind AI',
  publisher: 'RepoMind AI',
  applicationName: 'RepoMind AI',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: 'RepoMind AI',
    title: 'RepoMind AI — AST-Aware Codebase Intelligence & Architecture Engine',
    description:
      'Transform complex legacy codebases into navigable architecture diagrams, AST-aware vector indexes, and interactive API specs in seconds.',
    images: [
      {
        url: `${APP_URL}/assets/00_Upwork_Portfolio_Thumbnail.png`,
        width: 1200,
        height: 630,
        alt: 'RepoMind AI Platform Overview and Architecture',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RepoMind AI — AST-Aware Codebase Intelligence & Architecture Engine',
    description:
      'Transform complex legacy codebases into navigable architecture diagrams, AST-aware vector indexes, and interactive API specs in seconds.',
    images: [`${APP_URL}/assets/00_Upwork_Portfolio_Thumbnail.png`],
    creator: '@repomind_ai',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  alternates: {
    canonical: APP_URL,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'RepoMind AI',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web, Cloud',
      description:
        'AST-Aware Codebase Intelligence & Architecture Engine. Understand complex codebases with hybrid vector-lexical search and interactive dependency mapping.',
      url: APP_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@type': 'Organization',
      name: 'RepoMind AI',
      url: APP_URL,
      logo: `${APP_URL}/assets/00_Upwork_Portfolio_Thumbnail.png`,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-mantine-color-scheme="light">
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
