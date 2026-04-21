'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-blue-50 via-white to-sky-50">
      {/* Clean base background for maximum readability */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-sky-50" />
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
      </div>

      <Sidebar />
      <main className="ml-[260px] min-h-screen relative z-10">{children}</main>
    </div>
  );
}
