'use client';

import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { InteractiveSandbox } from '@/components/landing/InteractiveSandbox';
import { RagComparisonSection } from '@/components/landing/RagComparisonSection';
import { ArchitectureSection } from '@/components/landing/ArchitectureSection';
import { FrameworkExtractorSection } from '@/components/landing/FrameworkExtractorSection';
import { BenchmarksSection } from '@/components/landing/BenchmarksSection';
import { TechStackSection } from '@/components/landing/TechStackSection';
import { WhitepaperSection } from '@/components/landing/WhitepaperSection';
import { Footer } from '@/components/landing/Footer';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        color: '#212529',
        overflowX: 'clip',
        paddingTop: '68px',
      }}
    >
      {/* 1. Sticky Navigation Bar */}
      <Navbar />

      {/* 2. Hero Section with Differentiated Copy & CLI Bar */}
      <HeroSection />

      {/* 3. Live Interactive IDE Sandbox */}
      <InteractiveSandbox />

      {/* 4. Why Naive Code RAG Fails (AST vs Token Splitting) */}
      <RagComparisonSection />

      {/* 5. Distributed Microservices Architecture */}
      <ArchitectureSection />

      {/* 6. Multi-Framework Static Route AST Extractor */}
      <FrameworkExtractorSection />

      {/* 7. Empirical Benchmarks & Performance Metrics */}
      <BenchmarksSection />

      {/* 8. Battle-Tested Technology Stack Matrix */}
      <TechStackSection />

      {/* 9. Official Architecture Whitepaper Showcase */}
      <WhitepaperSection />

      {/* 10. Call to Action & Engineering Footer */}
      <Footer />
    </main>
  );
}
