'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getProjects, getTasks } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ projects: 0, tasks: 0, openTasks: 0 });
  const [projects, setProjects] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          getProjects(),
          getTasks({}),
        ]);
        const pList = Array.isArray(pRes) ? pRes : [];
        const tList = Array.isArray(tRes) ? tRes : [];
        setProjects(pList.slice(0, 5));
        setRecentTasks(tList.slice(0, 5));
        setStats({
          projects: pList.length,
          tasks: tList.length,
          openTasks: tList.filter((t: any) => t.status === 'open' || t.status === 'in_progress').length,
        });
      } catch {}
      setLoading(false);
    })();
  }, []);

  const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'designer' ? 'Tasarımcı' : 'Entegrasyon Mühendisi';

  return (
    <div className="px-8 py-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Welcome */}
      <div className="relative mb-8 overflow-hidden rounded-2xl glass-card">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/[0.06] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/[0.06] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
        <div className="relative px-8 py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            <span className="text-[11px] text-slate-400 font-medium">{roleLabel}{user?.uzmanlik ? ` · ${user.uzmanlik}` : ''}</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Hoş geldiniz, {user?.full_name?.split(' ')[0]}</h1>
          <p className="text-sm text-slate-400 max-w-lg">PLM BOM dosyalarını yükleyin, inceleyin, görev atayın ve SAP Master BOM'a dönüştürün.</p>
          <div className="flex items-center gap-4 mt-8">
            {[
              { n: '1', label: 'PLM Yükle', desc: 'Admin BOM yükler', color: 'from-blue-500 to-blue-600' },
              { n: '2', label: 'İncele', desc: 'Tasarımcı kontrol', color: 'from-blue-500 to-blue-600' },
              { n: '3', label: 'Görev Ata', desc: 'Değişiklik talebi', color: 'from-amber-500 to-amber-600' },
              { n: '4', label: 'Düzenle', desc: 'Mühendis düzenler', color: 'from-amber-500 to-amber-600' },
              { n: '5', label: 'İndir', desc: 'Son Excel export', color: 'from-emerald-500 to-emerald-600' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-gradient-to-br ${step.color} text-white shadow-lg`}
                    style={{ boxShadow: `0 4px 12px ${i < 2 ? 'rgba(59,130,246,0.25)' : i < 4 ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}` }}
                  >{step.n}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{step.label}</p>
                    <p className="text-[10px] text-slate-500">{step.desc}</p>
                  </div>
                </div>
                {i < 4 && (
                  <svg width="24" height="8" viewBox="0 0 24 8" fill="none" className="text-slate-700/50 ml-1">
                    <path d="M0 4h20M18 1l3 3-3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mb-8 stagger-children">
        {[
          { href: '/projects', label: 'BOM Projeleri', value: stats.projects, icon: (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-blue-400">
              <path d="M3 5a2.5 2.5 0 012.5-2.5h11A2.5 2.5 0 0119 5v12a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 013 17V5z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 8h8M7 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ), gradient: 'from-blue-500/20 to-blue-600/5', border: 'hover:border-blue-500/25', accent: 'bg-blue-500', shadow: 'shadow-blue-500/10' },
          { href: '/tasks', label: 'Toplam Görev', value: stats.tasks, icon: (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-purple-400">
              <rect x="3" y="3" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 11l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ), gradient: 'from-purple-500/20 to-purple-600/5', border: 'hover:border-purple-500/25', accent: 'bg-purple-500', shadow: 'shadow-purple-500/10' },
          { href: '', label: 'Açık Görevler', value: stats.openTasks, icon: (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-amber-400">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ), gradient: 'from-amber-500/20 to-amber-600/5', border: 'hover:border-amber-500/25', accent: 'bg-amber-500', shadow: 'shadow-amber-500/10', isAmber: true },
        ].map((card, i) => {
          const Wrapper = card.href ? Link : 'div';
          const props = card.href ? { href: card.href } : {};
          return (
            <Wrapper key={i} {...props as any} className={`group glass-card rounded-2xl p-6 ${card.border} cursor-pointer animate-fade-in`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-2">{card.label}</p>
                  <p className={`text-3xl font-bold ${card.isAmber ? 'text-amber-400' : 'text-white'}`}>{card.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.gradient}`}>
                  {card.icon}
                </div>
              </div>
              <div className="mt-5 relative h-1 w-full rounded-full bg-white/[0.04] overflow-hidden">
                <div className={`absolute inset-y-0 left-0 rounded-full ${card.accent} transition-all duration-1000`} style={{ width: '60%', opacity: 0.5 }} />
              </div>
            </Wrapper>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold gradient-text">Son Projeler</h2>
            <Link href="/projects" className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
              Tümünü gör
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </Link>
          </div>
          {loading ? (
            <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : projects.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-blue-400/50">
                  <path d="M3 5a2.5 2.5 0 012.5-2.5h11A2.5 2.5 0 0119 5v12a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 013 17V5z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">Henüz proje yok</p>
              <p className="text-xs text-slate-600 mt-1">PLM BOM dosyası yükleyerek başlayın</p>
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map((p: any) => (
                <Link key={p.id} href={`/project/${p.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/15 flex items-center justify-center text-blue-400 text-sm font-bold">{p.name?.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-blue-300 truncate transition-colors">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.totalRows?.toLocaleString('tr-TR')} satır · {p._count?.tasks || 0} görev</p>
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR') : ''}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold gradient-text">Son Görevler</h2>
            <Link href="/tasks" className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
              Tümünü gör
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </Link>
          </div>
          {loading ? (
            <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : recentTasks.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-purple-400/50">
                  <rect x="3" y="3" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 11l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">Henüz görev yok</p>
              <p className="text-xs text-slate-600 mt-1">Proje detayından görev oluşturabilirsiniz</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTasks.map((t: any) => {
                const st: Record<string, { bg: string; text: string; label: string }> = {
                  open: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Açık' },
                  in_progress: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Devam' },
                  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Tamam' },
                  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Red' },
                };
                const s = st[t.status] || st.open;
                return (
                  <Link key={t.id} href="/tasks" className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/15 flex items-center justify-center text-purple-400 text-sm font-bold">{t._count?.items || 0}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-purple-300 truncate transition-colors">{t.title}</p>
                      <p className="text-xs text-slate-500">{t.project?.name} · {t.assignedTo?.fullName || 'Atanmadı'}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}