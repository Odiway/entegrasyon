'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const BUS_IMAGES = [
  { src: 'https://www.temsa.com/tr/images/LuckyGallery/maraton_12_dis_1.jpg', name: 'Maraton 12', desc: 'Lüks ve mükemmelliğin buluştuğu nokta' },
  { src: 'https://www.temsa.com/tr/images/LuckyGallery/temsa_avenue_electron_dis_1.jpg', name: 'Avenue Electron', desc: 'Geleceğe ilk adım — %100 Elektrikli' },
  { src: 'https://www.temsa.com/tr/images/LuckyGallery/temsa_prestij_1.jpg', name: 'Prestij', desc: 'Efsane yenilendi — Güçlü ve şık' },
  { src: 'https://www.temsa.com/tr/images/LuckyGallery/temsa_id_sb_plus_dis_1.jpg', name: 'LD SB Plus', desc: 'İhtiyaçlarınız için özel tasarlandı' },
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg(prev => (prev + 1) % BUS_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="login-hero min-h-screen flex relative overflow-hidden">
      {/* Full-screen background slideshow */}
      {BUS_IMAGES.map((img, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{ opacity: currentBg === i ? 1 : 0 }}
        >
          <img
            src={img.src}
            alt={img.name}
            className="w-full h-full object-cover"
          />
        </div>
      ))}

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
      }} />

      {/* Left content area */}
      <div className="login-hero-left relative z-10 flex-1 flex flex-col justify-between p-8 lg:p-12 max-w-[600px]">
        {/* Top: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/30">
            <svg width="24" height="24" viewBox="0 0 30 30" fill="none" className="text-white">
              <path d="M4 7h22v4H4zM4 13h16v4H4zM4 19h20v4H4z" fill="currentColor" opacity="0.85" />
            </svg>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg tracking-tight">TEMSA</h2>
            <p className="text-slate-200 text-[10px] tracking-widest uppercase">Entegrasyon Sistemi</p>
          </div>
        </div>

        {/* Middle: Dynamic bus info */}
        <div className="my-auto py-12">
          <div className="mb-8">
            <p className="text-red-400 text-xs font-semibold tracking-widest uppercase mb-3">BOM Dönüştürme & Yönetim</p>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              Geleceğin<br />
              <span className="bg-gradient-to-r from-red-400 via-red-500 to-orange-400 bg-clip-text text-transparent">Mobilitesini</span><br />
              Bugünden Tasarlıyoruz
            </h1>
            <p className="text-slate-200 text-sm leading-relaxed max-w-md">
              PLM ve SAP entegrasyonu ile BOM dönüştürme süreçlerinizi dijitalleştirin.
              TEMSA mühendislik altyapısıyla güçlendirilmiş akıllı sistem.
            </p>
          </div>

          {/* Current bus showcase */}
          <div className="glass rounded-xl px-4 py-3 inline-flex items-center gap-3 transition-all duration-700">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <div>
              <p className="text-white text-sm font-semibold">{BUS_IMAGES[currentBg].name}</p>
              <p className="text-slate-200 text-xs">{BUS_IMAGES[currentBg].desc}</p>
            </div>
          </div>
        </div>

        {/* Bottom: Image indicators + stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {BUS_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentBg(i)}
                className={`transition-all duration-500 rounded-full ${currentBg === i ? 'w-8 h-2 bg-red-500' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-6 text-[11px] text-slate-200">
            <span><b className="text-white text-sm">140K+</b> üretilen araç</span>
            <span><b className="text-white text-sm">70+</b> ülke</span>
            <span><b className="text-white text-sm">60</b> yıl deneyim</span>
          </div>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="relative z-10 w-full max-w-[460px] flex items-center justify-center p-6 lg:p-12 ml-auto">
        <div className="w-full animate-slide-up">
          <div className="bg-white rounded-2xl p-8 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.5)] border border-slate-200 relative overflow-hidden">
            {/* Card top red accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600" />

            {/* TEMSA brand corner */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-sm">
                <svg width="16" height="16" viewBox="0 0 30 30" fill="none" className="text-white">
                  <path d="M4 7h22v4H4zM4 13h16v4H4zM4 19h20v4H4z" fill="currentColor" />
                </svg>
              </div>
              <span className="text-[10px] text-slate-500 tracking-[0.2em] font-semibold uppercase">Güvenli Giriş</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">
              {isRegister ? 'Hesap Oluştur' : 'Hoş Geldiniz'}
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              {isRegister ? 'Yeni TEMSA hesabı oluşturun' : 'TEMSA hesabınıza giriş yapın'}
            </p>

            {error && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 5v3M8 10v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ad Soyad</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 text-sm transition-all"
                    placeholder="Oğuzhan İnandı"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 text-sm transition-all"
                  placeholder="email@temsa.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 text-sm transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-lg font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20 hover:shadow-red-600/30 flex items-center justify-center gap-2 mt-6 transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : isRegister ? (
                  'Kayıt Ol'
                ) : (
                  'Giriş Yap'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <button
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                className="text-sm text-slate-600 hover:text-red-600 transition-colors duration-200 font-medium"
              >
                {isRegister ? 'Zaten hesabınız var mı? Giriş yapın' : 'Hesabınız yok mu? Kayıt olun'}
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-white/70 mt-6 drop-shadow">
            TEMSA Digital Solutions — Entegrasyon Takımı © 2026
          </p>
        </div>
      </div>

      {/* Bottom bus model strip */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="flex items-end justify-center gap-0 px-12">
          {[
            { src: 'https://www.temsa.com/tr/images/common/maraton-12.png', name: 'Maraton' },
            { src: 'https://www.temsa.com/tr/images/common/temsa-avenue-electron.png', name: 'Avenue Electron' },
            { src: 'https://www.temsa.com/tr/images/common/prestij.png', name: 'Prestij' },
            { src: 'https://www.temsa.com/tr/images/common/temsa-id-sb-plus.png', name: 'LD SB Plus' },
          ].map((bus, i) => (
            <div key={i} className={`transition-all duration-700 ${currentBg === i ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'}`}>
              <img
                src={bus.src}
                alt={bus.name}
                className="h-[120px] lg:h-[160px] object-contain drop-shadow-[0_5px_25px_rgba(0,0,0,0.5)]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
