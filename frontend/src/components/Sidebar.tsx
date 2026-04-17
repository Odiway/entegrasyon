'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: '/projects',
    label: 'BOM Projeleri',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 7h6M7 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/tasks',
    label: 'Görevler',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M6 4h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const ADMIN_NAV = [
  {
    href: '/users',
    label: 'Kullanıcılar',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 17a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Ayarlar & Kurallar',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 1v2M10 17v2M18.36 4.64l-1.42 1.42M3.05 14.95l-1.42 1.42M19 10h-2M3 10H1M18.36 15.36l-1.42-1.42M3.05 5.05L1.63 3.63" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const items = user?.role === 'admin' ? [...NAV_ITEMS, ...ADMIN_NAV] : NAV_ITEMS;

  return (
    <aside className="w-[260px] h-screen fixed left-0 top-0 flex flex-col z-40 overflow-hidden" style={{ background: 'rgba(8, 11, 18, 0.78)', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Decorative glow */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand */}
      <div className="relative px-5 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/25">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white">
                <path d="M2 4h16v3.5H2zM2 9h12v3.5H2zM2 14h14v3.5H2z" fill="currentColor" opacity="0.9" />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0f1420]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">TEMSA</h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">PLM Entegrasyon</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Menü</p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-blue-400 shadow-sm shadow-blue-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span className={`transition-colors duration-200 ${isActive ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-300'}`}>{item.icon}</span>
              {item.label}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />}
            </Link>
          );
        })}

        {user?.role === 'admin' && (
          <>
            <div className="my-4 mx-3 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Yönetim</p>
            {ADMIN_NAV.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-blue-400 shadow-sm shadow-blue-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`transition-colors duration-200 ${isActive ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-300'}`}>{item.icon}</span>
                  {item.label}
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Bus showcase */}
      <div className="relative px-3 py-3 border-t border-white/[0.04]">
        <div className="relative rounded-xl overflow-hidden h-[80px] group">
          <img
            src="https://www.temsa.com/tr/images/common/maraton-12.png"
            alt="TEMSA Maraton"
            className="w-full h-full object-contain object-center opacity-20 group-hover:opacity-40 transition-opacity duration-500 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080b12] via-transparent to-[#080b12]/80" />
          <div className="absolute bottom-2 left-3 right-3">
            <p className="text-[9px] text-slate-500 font-medium tracking-wider uppercase">TEMSA Araçları</p>
            <p className="text-[10px] text-slate-400">140K+ araç · 70+ ülke</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="relative px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-600/15">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Kullanıcı'}</p>
            <p className="text-[10px] text-slate-500 truncate">
              {user?.role === 'admin' ? 'Admin' : user?.role === 'designer' ? 'Tasarımcı' : 'Ent. Mühendisi'}
              {user?.uzmanlik ? ` · ${user.uzmanlik}` : ''}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            title="Çıkış"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H4a2 2 0 00-2 2v8a2 2 0 002 2h2M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
