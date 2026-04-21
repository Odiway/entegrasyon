'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { getProjects, getTasks } from '@/lib/api';
import Link from 'next/link';

const TEMSA_FLEET = [
  { src: 'https://www.temsa.com/tr/images/common/maraton-12.png', name: 'Maraton 12', type: 'ÅehirlerarasÄ±', desc: 'LÃ¼ks ve mÃ¼kemmelliÄŸin buluÅŸtuÄŸu nokta' },
  { src: 'https://www.temsa.com/tr/images/common/temsa-avenue-electron.png', name: 'Avenue Electron', type: 'Elektrikli', desc: '%100 elektrikli ÅŸehir iÃ§i otobÃ¼s' },
  { src: 'https://www.temsa.com/tr/images/common/prestij.png', name: 'Prestij', type: 'MidibÃ¼s', desc: 'Efsane yenilendi â€” gÃ¼Ã§lÃ¼ ve ÅŸÄ±k' },
  { src: 'https://www.temsa.com/tr/images/common/temsa-id-sb-plus.png', name: 'LD SB Plus', type: 'Servis', desc: 'Ä°htiyaÃ§larÄ±nÄ±z iÃ§in Ã¶zel tasarlandÄ±' },
];

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

function Sparkline({ data, color = '#2563eb', height = 38 }: { data: number[]; color?: string; height?: number }) {
  const w = 120;
  const h = height;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  const id = `sg-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function DonutRing({ value, total, color = '#2563eb', size = 140, label }: { value: number; total: number; color?: string; size?: number; label?: string }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const offset = c * (1 - pct);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(37,99,235,0.10)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold num-gradient leading-none">{Math.round(pct * 100)}<span className="text-base">%</span></span>
        {label && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{label}</span>}
      </div>
    </div>
  );
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const DAYS = ['Pazar', 'Pazartesi', 'SalÄ±', 'Ã‡arÅŸamba', 'PerÅŸembe', 'Cuma', 'Cumartesi'];
const MONTHS = ['Ocak', 'Åubat', 'Mart', 'Nisan', 'MayÄ±s', 'Haziran', 'Temmuz', 'AÄŸustos', 'EylÃ¼l', 'Ekim', 'KasÄ±m', 'AralÄ±k'];

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
    const base = (seed: number, n = 14) => {
      const out: number[] = [];
      let v = seed;
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
    if (h < 6) return 'Ä°yi geceler';
    if (h < 12) return 'GÃ¼naydÄ±n';
    if (h < 18) return 'Ä°yi gÃ¼nler';
    return 'Ä°yi akÅŸamlar';
  })();

  const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'designer' ? 'TasarÄ±mcÄ±' : 'Entegrasyon MÃ¼hendisi';

  return (
    <div className="px-8 py-6 max-w-[1500px] mx-auto animate-fade-in">
      {/* HERO */}
      <div className="relative mb-8 rounded-3xl overflow-hidden glass-hero neon-border">
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-blue-400/30 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-cyan-300/30 blur-[100px] pointer-events-none" />

        <div className="relative grid grid-cols-12 gap-8 p-8">
          <div className="col-span-7">
            <div className="flex items-center gap-2 mb-4">
              <span className="live-dot" />
              <span className="text-[11px] uppercase tracking-[0.2em] font-black text-blue-700">Komuta Merkezi Â· CanlÄ±</span>
              <span className="text-slate-400">Â·</span>
              <span className="text-[11px] text-slate-600 font-bold">{roleLabel}{user?.uzmanlik ? ` Â· ${user.uzmanlik}` : ''}</span>
            </div>
            <h1 className="text-[44px] leading-[1.05] font-black tracking-tight">
              <span className="num-gradient">{greeting},</span>
              <br />
              <span className="text-slate-900">{user?.full_name?.split(' ')[0] || 'HoÅŸ geldiniz'}.</span>
            </h1>
            <p className="text-sm text-slate-600 mt-3 max-w-xl leading-relaxed">
              TEMSA PLM â†’ SAP entegrasyonunun nabzÄ± burada. YÃ¼klemeler, gÃ¶revler, deÄŸiÅŸiklik talepleri ve tÃ¼m Ã¼retim hatlarÄ±ndaki BOM hareketleri tek ekranda.
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-6">
              <Link href="/projects" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl btn-primary shadow-lg">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                Yeni BOM YÃ¼kle
              </Link>
              <Link href="/tasks" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-all shadow-sm">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M5 7l1.5 1.5L9 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                GÃ¶revleri AÃ§
              </Link>
              <Link href="/calendar" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition-all shadow-sm">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M2 6h10M5 1.5v3M9 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                Takvim
              </Link>
            </div>

            <div className="mt-7 flex items-center gap-2 flex-wrap">
              {[
                { n: '1', label: 'PLM YÃ¼kle', color: 'from-blue-500 to-blue-600' },
                { n: '2', label: 'Ä°ncele', color: 'from-sky-500 to-sky-600' },
                { n: '3', label: 'GÃ¶rev Ata', color: 'from-indigo-500 to-indigo-600' },
                { n: '4', label: 'DÃ¼zenle', color: 'from-violet-500 to-violet-600' },
                { n: '5', label: 'Excel Export', color: 'from-emerald-500 to-emerald-600' },
              ].map((s, i, arr) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 border border-blue-100 backdrop-blur-sm shadow-sm">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black bg-gradient-to-br ${s.color}`} style={{ color: '#fff' }}>{s.n}</span>
                    <span className="text-xs font-bold text-slate-800">{s.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <svg width="14" height="8" viewBox="0 0 14 8" fill="none" className="text-blue-300"><path d="M0 4h11M9 1l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 flex items-center justify-end gap-8">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-500 mb-1">Åu an</div>
              <div className="text-5xl font-black tabular-nums num-gradient leading-none">
                {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                <span className="text-2xl text-slate-400 font-bold align-top ml-1 tabular-nums">
                  {now.toLocaleTimeString('tr-TR', { second: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-slate-700 font-bold mt-2">
                {DAYS[now.getDay()]}, {now.getDate()} {MONTHS[now.getMonth()]} {now.getFullYear()}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black text-emerald-700">SÄ°STEM Ã‡EVRÄ°MÄ°Ã‡Ä°</span>
              </div>
            </div>
            <DonutRing value={stats.doneTasks} total={Math.max(1, stats.tasks)} label="Tamamlanma" color="#2563eb" size={140} />
          </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { href: '/projects', label: 'BOM Projeleri', value: stats.projects, color: '#2563eb', tint: 'from-blue-500/15 to-blue-500/0', icon: <path d="M3 5a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5z M7 8h8M7 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />, series: series.projects },
          { href: '/tasks', label: 'Toplam GÃ¶rev', value: stats.tasks, color: '#6366f1', tint: 'from-indigo-500/15 to-indigo-500/0', icon: <path d="M5 4h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z M7 10l2 2 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />, series: series.tasks },
          { href: '/tasks', label: 'AÃ§Ä±k GÃ¶revler', value: stats.openTasks, color: '#f59e0b', tint: 'from-amber-500/15 to-amber-500/0', icon: <><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6" /><path d="M11 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>, series: series.open },
          { href: '/projects', label: 'Toplam BOM SatÄ±rÄ±', value: stats.totalRows, color: '#06b6d4', tint: 'from-cyan-500/15 to-cyan-500/0', icon: <path d="M3 6h16M3 11h16M3 16h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />, series: series.rows },
        ].map((c, i) => (
          <Link key={i} href={c.href} className="group tilt-card shine glass-hero rounded-2xl p-5 relative overflow-hidden">
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${c.tint} blur-2xl pointer-events-none`} />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{c.label}</p>
                <p className="text-4xl font-black mt-2 tabular-nums num-gradient leading-none animate-pop">
                  <CountUp value={c.value} />
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${c.color}1A`, color: c.color, border: `1px solid ${c.color}33` }}>
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none">{c.icon}</svg>
              </div>
            </div>
            <div className="mt-3 -mx-1">
              <Sparkline data={c.series} color={c.color} height={38} />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-700 inline-flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 7l3-4 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                trend yukarÄ±
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">son 14 gÃ¼n</span>
            </div>
          </Link>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-7 glass-hero rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">Son Projeler</h2>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">En son yÃ¼klenen 5 BOM dosyasÄ±</p>
            </div>
            <Link href="/projects" className="text-xs font-black text-blue-700 hover:text-blue-900 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50">
              TÃ¼mÃ¼nÃ¼ gÃ¶r
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </Link>
          </div>
          {loading ? (
            <div className="py-10 text-center"><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : recentProjects.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 22 22" fill="none" className="text-blue-500"><path d="M3 5a2.5 2.5 0 012.5-2.5h11A2.5 2.5 0 0119 5v12a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 013 17V5z" stroke="currentColor" strokeWidth="1.5" /></svg>
              </div>
              <p className="text-slate-700 text-sm font-bold">HenÃ¼z proje yok</p>
              <p className="text-xs text-slate-500 mt-1">PLM BOM dosyasÄ± yÃ¼kleyerek baÅŸlayÄ±n</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentProjects.map((p: any, idx) => (
                <Link key={p.id} href={`/project/${p.id}`} className="flex items-center gap-4 p-3 rounded-xl bg-white/60 border border-blue-100/70 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200 group">
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md" style={{ color: '#fff' }}>
                    <span className="text-base font-black">{p.name?.charAt(0) || '?'}</span>
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-blue-200 text-[9px] font-black flex items-center justify-center text-blue-700">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 group-hover:text-blue-700 truncate transition-colors">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-bold text-slate-600">{(p.totalRows || 0).toLocaleString('tr-TR')} satÄ±r</span>
                      <span className="text-slate-300">Â·</span>
                      <span className="text-[11px] text-slate-500">{p._count?.tasks || 0} gÃ¶rev</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-mono block">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR') : ''}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all inline-block mt-1"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-5 glass-hero rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">GÃ¶rev NabzÄ±</h2>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">AnlÄ±k daÄŸÄ±lÄ±m</p>
            </div>
            <Link href="/tasks" className="text-xs font-black text-indigo-700 hover:text-indigo-900 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-indigo-50">TÃ¼m gÃ¶revler â†’</Link>
          </div>

          <div className="space-y-3">
            {[
              { key: 'open', label: 'AÃ§Ä±k', color: '#2563eb', light: 'bg-blue-100' },
              { key: 'in_progress', label: 'Devam Ediyor', color: '#f59e0b', light: 'bg-amber-100' },
              { key: 'completed', label: 'TamamlandÄ±', color: '#10b981', light: 'bg-emerald-100' },
              { key: 'rejected', label: 'Reddedildi', color: '#ef4444', light: 'bg-rose-100' },
            ].map(s => {
              const count = allTasks.filter(t => t.status === s.key).length;
              const pct = allTasks.length ? (count / allTasks.length) * 100 : 0;
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 0 3px ${s.color}26` }} />
                      <span className="text-xs font-black text-slate-800">{s.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black tabular-nums text-slate-900"><CountUp value={count} /></span>
                      <span className="text-[10px] text-slate-500 font-bold tabular-nums">%{Math.round(pct)}</span>
                    </div>
                  </div>
                  <div className={`relative h-2 rounded-full overflow-hidden ${s.light}`}>
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${s.color}AA, ${s.color})` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-5 border-t border-blue-100">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">Son hareketler</div>
            {recentTasks.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">HenÃ¼z gÃ¶rev yok</p>
            ) : (
              <div className="space-y-1.5">
                {recentTasks.slice(0, 4).map(t => {
                  const colorMap: any = { open: '#2563eb', in_progress: '#f59e0b', completed: '#10b981', rejected: '#ef4444' };
                  const c = colorMap[t.status] || '#64748b';
                  return (
                    <Link key={t.id} href="/tasks" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white transition-all">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c, boxShadow: `0 0 0 3px ${c}22` }} />
                      <span className="text-xs font-bold text-slate-800 truncate flex-1">{t.title}</span>
                      <span className="text-[10px] text-slate-500 font-bold shrink-0">{t.assignedTo?.fullName?.split(' ')[0] || 'â€”'}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TEMSA FLEET */}
      <div className="glass-hero rounded-2xl p-6 relative overflow-hidden mb-6">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-cyan-300/20 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-5 relative">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700 px-2 py-0.5 rounded-md bg-cyan-100">EndÃ¼stri Lideri</span>
              <span className="live-dot" />
            </div>
            <h2 className="text-xl font-black text-slate-900">TEMSA AraÃ§ PortfÃ¶yÃ¼</h2>
            <p className="text-xs text-slate-500 font-bold mt-1">BOM entegrasyonu uygulanan Ã¼retim hatlarÄ±</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-black text-blue-800">140K+ Ã¼retim</span>
            <span className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-black text-indigo-800">70+ Ã¼lke</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 relative">
          {TEMSA_FLEET.map((bus, i) => (
            <div key={i} className="group relative rounded-xl overflow-hidden bg-white border border-blue-100 hover:border-blue-400 hover:shadow-xl transition-all duration-500 tilt-card">
              <div className="relative h-[140px] overflow-hidden bg-gradient-to-b from-blue-50 to-white p-3 flex items-center justify-center">
                <img src={bus.src} alt={bus.name} className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-700 float-slow" />
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-600" style={{ color: '#fff' }}>{bus.type}</span>
              </div>
              <div className="px-3 pb-3 pt-2 border-t border-blue-50">
                <h3 className="text-sm font-black text-slate-900">{bus.name}</h3>
                <p className="text-[11px] text-slate-600 leading-snug mt-1">{bus.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
