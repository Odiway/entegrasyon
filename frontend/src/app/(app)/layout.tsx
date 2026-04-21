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
      {/* Aurora command-center background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-sky-50" />
        {/* Animated aurora blobs */}
        <div className="aurora-blob aurora-blue" />
        <div className="aurora-blob aurora-cyan" />
        <div className="aurora-blob aurora-indigo" />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.35]" style={{
          backgroundImage: 'linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at center, #000 40%, transparent 90%)',
        }} />
        {/* Top sheen */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
      </div>

      <Sidebar />
      <main className="ml-[260px] min-h-screen relative z-10">{children}</main>
    </div>
  );
}
