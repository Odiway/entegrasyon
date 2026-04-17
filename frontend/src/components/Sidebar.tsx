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
    <aside className="w-64 h-screen fixed left-0 top-0 bg-[#0d1117] border-r border-white/[0.06] flex flex-col z-40">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/20">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-white">
              <path d="M2 4h14v3H2zM2 8h10v3H2zM2 12h12v3H2z" fill="currentColor" opacity="0.9" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">TEMSA</h1>
            <p className="text-[10px] text-slate-500 font-medium">Entegrasyon Sistemi</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span className={isActive ? 'text-blue-400' : 'text-slate-500'}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.full_name || 'Kullanıcı'}</p>
            <p className="text-[10px] text-slate-500 truncate">
              {user?.role === 'admin' ? 'Admin' : user?.role === 'designer' ? 'Tasarımcı' : 'Ent. Mühendisi'}
              {user?.uzmanlik ? ` · ${user.uzmanlik}` : ''}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
