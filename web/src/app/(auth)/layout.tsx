import { GuestGuard } from "@/components/layout/GuestGuard";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <GuestGuard>
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px 16px',
          position: 'relative',
          backgroundColor: '#F8FAFC',
          backgroundImage: `
            radial-gradient(circle at 50% 0%, rgba(28, 126, 214, 0.08) 0%, transparent 60%),
            radial-gradient(#CBD5E1 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 28px 28px',
          overflowY: 'auto',
        }}
      >
        {/* Top-Left Back to RepoMind Link */}
        <Link href="/" className="auth-back-link">
          <IconArrowLeft size={15} />
          <span>Back to RepoMind AI</span>
        </Link>

        {children}
      </div>
    </GuestGuard>
  );
}
