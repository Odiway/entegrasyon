'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { getProjects, getTasks } from '@/lib/api';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────
   TEMSA fleet (corporate showcase)
   ───────────────────────────────────────────────────────────── */
const TEMSA_FLEET = [
  { src: 'https://www.temsa.com/tr/images/common/maraton-12.png', name: 'Maraton 12', segment: 'Şehirlerarası', detail: '12,4 m · Euro 6 · 49 koltuk' },
  { src: 'https://www.temsa.com/tr/images/common/temsa-avenue-electron.png', name: 'Avenue Electron', segment: 'Elektrikli', detail: '350 kWh · Sıfır emisyon' },
  { src: 'https://www.temsa.com/tr/images/common/prestij.png', name: 'Prestij', segment: 'Midibüs', detail: '31 koltuk · ADAS' },
  { src: 'https://www.temsa.com/tr/images/common/temsa-id-sb-plus.png', name: 'LD SB Plus', segment: 'Servis', detail: 'Özel tasarım · Yüksek konfor' },
];

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/* Smooth animated counter */
function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const to = value || 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n.toLocaleString('tr-TR')}</>;
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* Refined area sparkline */
function Sparkline({ data, color = '#1e3a8a', height = 40 }: { data: number[]; color?: string; height?: number }) {
  const w = 160;
  const h = height;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  const id = `sg-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* Donut – minimal, single accent ring */
function Donut({ value, total, size = 168, color = '#1e3a8a' }: { value: number; total: number; size?: number; color?: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Tamamlanma</span>
        <span className="text-4xl font-bold tabular-nums text-slate-900 mt-1">{Math.round(pct * 100)}<span className="text-xl text-slate-400">%</span></span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const now = useNow();
  const [projects, setProjects] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, tRes] = await Promise.all([getProjects(), getTasks({})]);
        setProjects(Array.isArray(pRes) ? pRes : []);
        setAllTasks(Array.isArray(tRes) ? tRes : []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const totalRows = projects.reduce((s, p) => s + (p.totalRows || 0), 0);
    const open = allTasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const done = allTasks.filter(t => t.status === 'completed').length;
    return { projects: projects.length, tasks: allTasks.length, openTasks: open, doneTasks: done, totalRows };
  }, [projects, allTasks]);

  const series = useMemo(() => {
    const base = (seed: number, n = 16) => {
      const out: number[] = [];
      let v = Math.max(1, seed);
      for (let i = 0; i < n; i++) {
        v = Math.max(1, v + Math.sin(i * 0.7 + seed) * (seed * 0.18) + Math.cos(i * 1.3) * (seed * 0.1));
        out.push(Math.round(v));
      }
      return out;
    };
    return {
      projects: base(Math.max(4, stats.projects)),
      tasks: base(Math.max(6, stats.tasks)),
      open: base(Math.max(3, stats.openTasks)),
      rows: base(Math.max(50, Math.round(stats.totalRows / 50) || 50)),
    };
  }, [stats]);

  const recentProjects = projects.slice(0, 5);
  const recentTasks = allTasks.slice(0, 6);

  const greeting = (() => {
    const h = now.getHours();
    if (h < 6) return 'İyi geceler';
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  })();

  const dateLine = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="px-10 py-8 max-w-[1400px] mx-auto animate-fade-in">

      {/* ─── Title bar ─────────────────────────────────────── */}
      <header className="flex items-end justify-between pb-6 mb-8 border-b border-slate-200">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">TEMSA · PLM → SAP Entegrasyonu</p>
          <h1 className="text-[34px] leading-tight font-semibold tracking-tight text-slate-900 mt-2">
            {greeting}, {user?.full_name?.split(' ')[0] || 'Kullanıcı'}
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            {dateLine} · {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            {user?.uzmanlik ? ` · ${user.uzmanlik}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            Yeni BOM Yükle
          </Link>
          <Link href="/tasks" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Görevleri Aç
          </Link>
        </div>
      </header>

      {/* ─── KPI ROW ───────────────────────────────────────── */}
      <section className="grid grid-cols-4 gap-5 mb-8">
        {[
          { href: '/projects', label: 'BOM Projeleri',      value: stats.projects, accent: '#1e3a8a', series: series.projects, hint: 'Aktif proje sayısı' },
          { href: '/tasks',    label: 'Toplam Görev',       value: stats.tasks,    accent: '#0f766e', series: series.tasks,    hint: 'Sistem genelinde' },
          { href: '/tasks',    label: 'Açık Görevler',      value: stats.openTasks,accent: '#b45309', series: series.open,     hint: 'Beklemedeki iş' },
          { href: '/projects', label: 'Toplam BOM Satırı',  value: stats.totalRows,accent: '#475569', series: series.rows,     hint: 'İşlenen kalem' },
        ].map((c, i) => (
          <Link key={i} href={c.href} className="group block bg-white rounded-md border border-slate-200 p-5 hover:border-slate-400 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{c.label}</p>
                <p className="text-[34px] font-semibold mt-2 tabular-nums leading-none text-slate-900">
                  <CountUp value={c.value} />
                </p>
                <p className="text-xs text-slate-500 mt-2">{c.hint}</p>
              </div>
              <span className="w-1 self-stretch rounded-full" style={{ background: c.accent }} />
            </div>
            <div className="mt-3 -mx-1">
              <Sparkline data={c.series} color={c.accent} height={36} />
            </div>
          </Link>
        ))}
      </section>

      {/* ─── HERO PANEL: completion + status ───────────────── */}
      <section className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-5 bg-white rounded-md border border-slate-200 p-6 flex items-center gap-6">
          <Donut value={stats.doneTasks} total={Math.max(1, stats.tasks)} size={168} color="#1e3a8a" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Görev Performansı</p>
            <h2 className="text-xl font-semibold text-slate-900 mt-1">Tamamlanma Oranı</h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {stats.doneTasks.toLocaleString('tr-TR')} görev tamamlandı,
              {' '}{stats.openTasks.toLocaleString('tr-TR')} görev devam ediyor.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Tamamlandı</p>
                <p className="text-lg font-semibold text-slate-900 mt-1 tabular-nums"><CountUp value={stats.doneTasks} /></p>
              </div>
              <div className="border border-slate-200 rounded p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Açık</p>
                <p className="text-lg font-semibold text-slate-900 mt-1 tabular-nums"><CountUp value={stats.openTasks} /></p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-7 bg-white rounded-md border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Görev Durumu</p>
              <h2 className="text-xl font-semibold text-slate-900 mt-1">Statü Dağılımı</h2>
            </div>
            <Link href="/tasks" className="text-xs font-semibold text-slate-700 hover:text-slate-900">Tümünü görüntüle →</Link>
          </div>
          <div className="space-y-4">
            {[
              { key: 'open',        label: 'Açık',          color: '#1e3a8a' },
              { key: 'in_progress', label: 'Devam Ediyor',  color: '#b45309' },
              { key: 'completed',   label: 'Tamamlandı',    color: '#0f766e' },
              { key: 'rejected',    label: 'Reddedildi',    color: '#9f1239' },
            ].map(s => {
              const count = allTasks.filter(t => t.status === s.key).length;
              const pct = allTasks.length ? (count / allTasks.length) * 100 : 0;
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                      <span className="text-sm font-medium text-slate-800">{s.label}</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-sm font-semibold tabular-nums text-slate-900"><CountUp value={count} /></span>
                      <span className="text-xs text-slate-500 tabular-nums w-10 text-right">%{Math.round(pct)}</span>
                    </div>
                  </div>
                  <div className="relative h-1.5 rounded-sm overflow-hidden bg-slate-100">
                    <div className="absolute inset-y-0 left-0 transition-all duration-700"
                      style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── RECENT PROJECTS + TASKS ──────────────────────── */}
      <section className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-7 bg-white rounded-md border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Projeler</p>
              <h2 className="text-lg font-semibold text-slate-900 mt-0.5">Son BOM Yüklemeleri</h2>
            </div>
            <Link href="/projects" className="text-xs font-semibold text-slate-700 hover:text-slate-900">Tümünü görüntüle →</Link>
          </div>
          {loading ? (
            <div className="py-12 text-center"><div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto" /></div>
          ) : recentProjects.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-slate-700 text-sm font-semibold">Henüz proje bulunmuyor</p>
              <p className="text-xs text-slate-500 mt-1">PLM BOM dosyası yükleyerek başlayın</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
                  <th className="text-left px-6 py-3 w-10">#</th>
                  <th className="text-left px-2 py-3">Proje</th>
                  <th className="text-right px-2 py-3">Satır</th>
                  <th className="text-right px-2 py-3">Görev</th>
                  <th className="text-right px-6 py-3">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((p: any, idx) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 text-xs font-mono text-slate-400 tabular-nums">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="px-2 py-3.5">
                      <Link href={`/project/${p.id}`} className="text-sm font-semibold text-slate-900 hover:text-slate-700">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-2 py-3.5 text-right text-sm tabular-nums text-slate-700">{(p.totalRows || 0).toLocaleString('tr-TR')}</td>
                    <td className="px-2 py-3.5 text-right text-sm tabular-nums text-slate-700">{p._count?.tasks || 0}</td>
                    <td className="px-6 py-3.5 text-right text-xs text-slate-500 tabular-nums">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="col-span-5 bg-white rounded-md border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Görevler</p>
              <h2 className="text-lg font-semibold text-slate-900 mt-0.5">Son Hareketler</h2>
            </div>
            <Link href="/tasks" className="text-xs font-semibold text-slate-700 hover:text-slate-900">Tümü →</Link>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">Henüz görev kaydı yok</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentTasks.slice(0, 6).map(t => {
                const colorMap: any = { open: '#1e3a8a', in_progress: '#b45309', completed: '#0f766e', rejected: '#9f1239' };
                const labelMap: any = { open: 'Açık', in_progress: 'Devam', completed: 'Tamam', rejected: 'Red' };
                const c = colorMap[t.status] || '#64748b';
                const lbl = labelMap[t.status] || '—';
                return (
                  <li key={t.id}>
                    <Link href="/tasks" className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                      <span className="w-1 h-8 rounded-sm shrink-0" style={{ background: c }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {t.assignedTo?.fullName || '—'}
                          {t.createdAt ? ` · ${new Date(t.createdAt).toLocaleDateString('tr-TR')}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{ color: c, background: `${c}14`, border: `1px solid ${c}33` }}>{lbl}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ─── TEMSA FLEET ──────────────────────────────────── */}
      <section className="bg-white rounded-md border border-slate-200">
        <div className="flex items-end justify-between px-6 py-5 border-b border-slate-200">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">TEMSA</p>
            <h2 className="text-lg font-semibold text-slate-900 mt-0.5">Üretim Hattı Portföyü</h2>
            <p className="text-xs text-slate-500 mt-1">BOM entegrasyonu uygulanan araç hatları · 70+ ülkede üretim</p>
          </div>
          <div className="hidden md:flex items-center gap-6 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Üretim</p>
              <p className="text-sm font-semibold text-slate-900 tabular-nums">140.000+</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Pazar</p>
              <p className="text-sm font-semibold text-slate-900">70+ ülke</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Standart</p>
              <p className="text-sm font-semibold text-slate-900">ISO 9001</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-slate-200">
          {TEMSA_FLEET.map((bus, i) => (
            <article key={i} className="group">
              <div className="relative h-40 bg-slate-50 flex items-center justify-center p-4 overflow-hidden">
                <img src={bus.src} alt={bus.name} className="relative h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="px-5 py-4 border-t border-slate-200">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{bus.segment}</p>
                <h3 className="text-base font-semibold text-slate-900 mt-1">{bus.name}</h3>
                <p className="text-xs text-slate-600 mt-1.5">{bus.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
