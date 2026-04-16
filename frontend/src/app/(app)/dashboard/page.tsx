'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getProjects, getTasks, getCalendarEvents } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ projects: 0, tasks: 0, events: 0 });
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
        setProjects(pRes.slice(0, 5));
        setRecentTasks(tRes.slice(0, 5));
        setStats({
          projects: pRes.length,
          tasks: tRes.length,
          events: 0,
        });
      } catch {}
      setLoading(false);
    })();
  }, []);

  const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'designer' ? 'Tasarımcı' : 'Entegrasyon Mühendisi';

  const statCards = [
    { label: 'BOM Projeleri', value: stats.projects, icon: '📦', color: 'from-blue-600 to-blue-500', href: '/projects' },
    { label: 'Görevler', value: stats.tasks, icon: '✅', color: 'from-purple-600 to-purple-500', href: '/tasks' },
    { label: 'Takvim', value: 'Aç', icon: '📅', color: 'from-amber-600 to-amber-500', href: '/calendar' },
  ];

  return (
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      {/* Welcome Banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#161b22] to-[#1c2128]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative px-8 py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-400 font-medium">{roleLabel}{user?.uzmanlik ? ` · ${user.uzmanlik}` : ''}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Hoş geldiniz, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-400 max-w-lg">
            PLM BOM dosyalarını yükleyin, inceleyin, görev atayın ve SAP Master BOM&apos;a dönüştürün.
          </p>

          {/* Process flow */}
          <div className="flex items-center gap-4 mt-8">
            {[
              { n: '1', label: 'PLM Yükle', desc: 'Admin BOM yükler' },
              { n: '2', label: 'İncele', desc: 'Tasarımcı kontrol' },
              { n: '3', label: 'Görev Ata', desc: 'Değişiklik talebi' },
              { n: '4', label: 'Düzenle', desc: 'Mühendis düzenler' },
              { n: '5', label: 'İndir', desc: 'Son Excel export' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    i < 2 ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                    i < 4 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  }`}>{step.n}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{step.label}</p>
                    <p className="text-[10px] text-slate-500">{step.desc}</p>
                  </div>
                </div>
                {i < 4 && (
                  <svg width="20" height="8" viewBox="0 0 20 8" fill="none" className="text-slate-700 ml-1">
                    <path d="M0 4h18M16 1l3 3-3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group relative bg-[#161b22] border border-white/[0.06] rounded-2xl p-5 hover:border-blue-500/20 hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className={`mt-4 h-1 w-full rounded-full bg-gradient-to-r ${card.color} opacity-40`} />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Son Projeler</h2>
            <Link href="/projects" className="text-xs text-blue-400 hover:text-blue-300">Tümünü gör →</Link>
          </div>
          {loading ? (
            <div className="py-8 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : projects.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-slate-500">Henüz proje yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((p: any) => (
                <Link key={p.id} href={`/project/${p.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.04] transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold">
                    {p.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-blue-300 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.totalRows?.toLocaleString('tr-TR')} satır · {p._count?.tasks || 0} görev</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Son Görevler</h2>
            <Link href="/tasks" className="text-xs text-blue-400 hover:text-blue-300">Tümünü gör →</Link>
          </div>
          {loading ? (
            <div className="py-8 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-slate-500">Henüz görev yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((t: any) => {
                const statusCfg: Record<string, { bg: string; text: string; label: string }> = {
                  open: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Açık' },
                  in_progress: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Devam' },
                  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Tamam' },
                  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Red' },
                };
                const st = statusCfg[t.status] || statusCfg.open;
                return (
                  <Link key={t.id} href={`/tasks`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.04] transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/15 border border-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">
                      {t._count?.items || 0}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-purple-300 truncate">{t.title}</p>
                      <p className="text-xs text-slate-500">{t.project?.name} · {t.assignedTo?.fullName || 'Atanmadı'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text}`}>{st.label}</span>
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
