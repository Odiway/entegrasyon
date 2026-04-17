'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, fullName, password);
      } else {
        await login(email, password);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Bir hata oluştu');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-red-600/[0.07] rounded-full blur-[100px] animate-float" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-blue-600/[0.07] rounded-full blur-[100px] animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/[0.04] rounded-full blur-[120px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative w-full max-w-[420px] animate-slide-up">
        {/* Logo/Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-xl shadow-red-600/25 mb-5 relative">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="text-white">
              <path d="M4 7h22v4H4zM4 13h16v4H4zM4 19h20v4H4z" fill="currentColor" opacity="0.85" />
            </svg>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 opacity-20 blur-lg" />
          </div>
          <h1 className="text-2xl font-bold gradient-text mb-1">TEMSA Entegrasyon</h1>
          <p className="text-sm text-slate-500">BOM Dönüştürme & Yönetim Sistemi</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl shadow-black/20 relative overflow-hidden">
          {/* Card top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

          <h2 className="text-lg font-semibold text-white mb-6">
            {isRegister ? 'Hesap Oluştur' : 'Giriş Yap'}
          </h2>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3M8 10v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Ad Soyad</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-glass"
                  placeholder="Oğuzhan İnandı"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass"
                placeholder="email@temsa.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-glass"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isRegister ? (
                'Kayıt Ol'
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-sm text-slate-500 hover:text-blue-400 transition-colors duration-200"
            >
              {isRegister ? 'Zaten hesabınız var mı? Giriş yapın' : 'Hesabınız yok mu? Kayıt olun'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-700 mt-8">
          TEMSA Digital Solutions — Entegrasyon Takımı © 2026
        </p>
      </div>
    </div>
  );
}
