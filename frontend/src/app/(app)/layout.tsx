'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

const BG_BUSES = [
  'https://www.temsa.com/tr/images/LuckyGallery/maraton_12_dis_1.jpg',
  'https://www.temsa.com/tr/images/LuckyGallery/temsa_avenue_electron_dis_1.jpg',
  'https://www.temsa.com/tr/images/LuckyGallery/temsa_prestij_1.jpg',
  'https://www.temsa.com/tr/images/LuckyGallery/temsa_id_sb_plus_dis_1.jpg',
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const timer = setInterval(() => setBgIndex(p => (p + 1) % BG_BUSES.length), 12000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen relative">
      {/* TEMSA Bus Background Slideshow */}
      <div className="fixed inset-0 z-0">
        {BG_BUSES.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
            style={{ opacity: bgIndex === i ? 1 : 0 }}
          >
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        {/* Dark overlay — lighter so buses are visible */}
        <div className="absolute inset-0 bg-[#080b12]/[0.72]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080b12]/85 via-[#080b12]/65 to-[#080b12]/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080b12]/50 via-transparent to-[#080b12]/70" />
        {/* Subtle vignette */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(8,11,18,0.5) 100%)'
        }} />
      </div>

      <Sidebar />
      <main className="ml-[260px] min-h-screen relative z-10">{children}</main>
    </div>
  );
}
