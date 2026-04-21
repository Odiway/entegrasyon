'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { getProjects, getTasks } from '@/lib/api';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────
   TEMSA fleet
   ───────────────────────────────────────────────────────────── */
const TEMSA_FLEET = [
  { src: 'https://www.temsa.com/tr/images/common/maraton-12.png', name: 'Maraton 12', type: 'Şehirlerarası', desc: 'Lüks ve mükemmelliğin buluştuğu nokta', kpi: '12.4m · Euro 6' },
  { src: 'https://www.temsa.com/tr/images/common/temsa-avenue-electron.png', name: 'Avenue Electron', type: 'Elektrikli', desc: '%100 elektrikli şehir içi otobüs', kpi: '350 kWh · 0 emisyon' },
  { src: 'https://www.temsa.com/tr/images/common/prestij.png', name: 'Prestij', type: 'Midibüs', desc: 'Efsane yenilendi, güçlü ve şık', kpi: '31 koltuk · ADAS' },
  { src: 'https://www.temsa.com/tr/images/common/temsa-id-sb-plus.png', name: 'LD SB Plus', type: 'Servis', desc: 'İhtiyaçlarınız için özel tasarlandı', kpi: 'Konfor + verim' },
];

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/* ─────────────────────────────────────────────────────────────
   Tiny utilities
   ───────────────────────────────────────────────────────────── */
function CountUp({ value, duration = 1200 }: { value: number; duration?: number }) {
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
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* Heartbeat ECG-style waveform that animates across */
function Heartbeat({ color = '#22d3ee', height = 70 }: { color?: string; height?: number }) {
  const ref = useRef<SVGPathElement | null>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    const onResize = () => setW(Math.max(400, window.innerWidth - 600));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // ECG segment generator
  const path = useMemo(() => {
    const seg = (x: number) => {
      // baseline → small p → big QRS → t-wave → baseline
      return [
        `L ${x + 8} ${height / 2}`,
        `L ${x + 14} ${height / 2 - 4}`,
        `L ${x + 20} ${height / 2}`,
        `L ${x + 26} ${height / 2}`,
        `L ${x + 30} ${height / 2 - 22}`,
        `L ${x + 34} ${height / 2 + 26}`,
        `L ${x + 38} ${height / 2 - 6}`,
        `L ${x + 46} ${height / 2}`,
        `L ${x + 60} ${height / 2}`,
        `L ${x + 68} ${height / 2 - 8}`,
        `L ${x + 76} ${height / 2}`,
      ].join(' ');
    };
    let d = `M 0 ${height / 2}`;
    for (let x = 0; x < w; x += 110) d += ' ' + seg(x);
    d += ` L ${w} ${height / 2}`;
    return d;
  }, [w, height]);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id="hbGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="hbGlow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path ref={ref} d={path} fill="none" stroke="url(#hbGrad)" strokeWidth="1.8" filter="url(#hbGlow)"
        style={{ animation: 'hbScan 4s linear infinite' }} />
    </svg>
  );
}

function Sparkline({ data, color = '#60a5fa', height = 44 }: { data: number[]; color?: string; height?: number }) {
  const w = 140;
  const h = height;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  const id = `sg-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* Concentric reactor ring with rotating arcs */
function ReactorCore({ value, total, size = 220 }: { value: number; total: number; size?: number }) {
  const stroke = 10;
  const r1 = (size - stroke) / 2;
  const r2 = r1 - 18;
  const r3 = r2 - 18;
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* glow halo */}
      <div className="absolute inset-0 rounded-full" style={{
        background: 'radial-gradient(circle, rgba(34,211,238,0.35) 0%, transparent 65%)',
        filter: 'blur(14px)',
      }} />
      <svg width={size} height={size} className="-rotate-90 relative">
        <defs>
          <linearGradient id="rg1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="rg2" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        {/* base tracks */}
        <circle cx={size/2} cy={size/2} r={r1} stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r2} stroke="rgba(148,163,184,0.12)" strokeWidth={4} fill="none" strokeDasharray="2 6" />
        <circle cx={size/2} cy={size/2} r={r3} stroke="rgba(148,163,184,0.10)" strokeWidth={2} fill="none" />
        {/* progress */}
        <circle cx={size/2} cy={size/2} r={r1} stroke="url(#rg1)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c1} strokeDashoffset={c1 * (1 - pct)}
          style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.7))', transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }} />
        {/* rotating arc */}
        <circle cx={size/2} cy={size/2} r={r2} stroke="url(#rg2)" strokeWidth={3} fill="none" strokeLinecap="round"
          strokeDasharray={`${c2 * 0.18} ${c2}`}
          style={{ transformOrigin: '50% 50%', animation: 'orbitSpin 6s linear infinite' }} />
        <circle cx={size/2} cy={size/2} r={r3} stroke="#22d3ee" strokeWidth={2} fill="none" strokeLinecap="round"
          strokeDasharray={`${c3 * 0.08} ${c3}`} opacity={0.6}
          style={{ transformOrigin: '50% 50%', animation: 'orbitSpin 9s linear infinite reverse' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/80">Sistem</span>
        <span className="text-5xl font-black tabular-nums leading-none mt-1"
          style={{ background: 'linear-gradient(135deg, #e0f2fe, #67e8f9 60%, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 24px rgba(34,211,238,0.35)' }}>
          {Math.round(pct * 100)}<span className="text-2xl">%</span>
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1">verim</span>
      </div>
    </div>
  );
}

/* Orbiting node ring around the core */
function OrbitField({ size = 360, count = 8 }: { size?: number; count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div className="relative" style={{ width: size, height: size, animation: 'orbitSpin 28s linear infinite' }}>
        {Array.from({ length: count }).map((_, i) => {
          const a = (i / count) * 2 * Math.PI;
          const x = Math.cos(a) * (size / 2);
          const y = Math.sin(a) * (size / 2);
          return (
            <div key={i} className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
              style={{
                transform: `translate(${x - 3}px, ${y - 3}px)`,
                background: i % 2 ? '#22d3ee' : '#a78bfa',
                boxShadow: i % 2 ? '0 0 12px #22d3ee' : '0 0 12px #a78bfa',
              }} />
          );
        })}
        {/* dashed orbit ring */}
        <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/20" />
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
    const base = (seed: number, n = 18) => {
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

  const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'designer' ? 'Tasarımcı' : 'Entegrasyon Mühendisi';

  return (
    <div className="dash-dark-scope relative px-8 py-6 max-w-[1500px] mx-auto animate-fade-in">
      {/* ─── CINEMATIC HERO ────────────────────────────────── */}
      <section className="relative mb-8 rounded-[28px] overflow-hidden hero-dark">
        {/* layered backgrounds */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#1e3a8a_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,#0e7490_0%,transparent_55%),linear-gradient(135deg,#020617_0%,#0b1228_55%,#020617_100%)]" />
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute inset-0 hero-scan pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
        <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full" style={{ background: 'radial-gradient(circle,#3b82f6 0%,transparent 60%)', opacity: 0.35, filter: 'blur(80px)' }} />
        <div className="absolute -bottom-40 -right-24 w-[560px] h-[560px] rounded-full" style={{ background: 'radial-gradient(circle,#06b6d4 0%,transparent 60%)', opacity: 0.30, filter: 'blur(90px)' }} />

        <div className="relative grid grid-cols-12 gap-8 p-9 z-10">
          {/* LEFT: identity + greeting */}
          <div className="col-span-7">
            <div className="flex items-center gap-2 mb-5">
              <span className="hud-chip"><span className="hud-dot" /> Komuta Merkezi · Canlı</span>
              <span className="hud-chip-soft">v3.0 · {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className="hud-chip-soft">{roleLabel}{user?.uzmanlik ? ` · ${user.uzmanlik}` : ''}</span>
            </div>

            <h1 className="text-[56px] leading-[1.02] font-black tracking-[-0.02em]">
              <span className="hero-h">{greeting},</span><br />
              <span className="hero-name">{user?.full_name?.split(' ')[0] || 'Operatör'}.</span>
            </h1>

            <p className="text-[15px] text-slate-300 mt-4 max-w-xl leading-relaxed">
              <span className="text-cyan-300 font-bold">TEMSA PLM → SAP</span> entegrasyonunun nabzı burada atıyor.
              Her satır, her görev, her değişiklik — gerçek zamanlı tek bir komuta ekranında.
            </p>

            {/* primary actions */}
            <div className="flex flex-wrap items-center gap-3 mt-7">
              <Link href="/projects" className="cta-glow">
                <span className="relative z-10 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  Yeni BOM Yükle
                </span>
              </Link>
              <Link href="/tasks" className="cta-ghost">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M5 7l1.5 1.5L9 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                Görevleri Aç
              </Link>
              <Link href="/calendar" className="cta-ghost">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M2 6h10M5 1.5v3M9 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                Takvim
              </Link>
            </div>

            {/* heartbeat */}
            <div className="mt-7 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.02] p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">Sistem Nabzı</span>
                  <span className="text-[10px] text-slate-400 font-mono">/dev/temsa/heartbeat</span>
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">● 72 BPM</span>
              </div>
              <Heartbeat color="#22d3ee" height={56} />
            </div>
          </div>

          {/* RIGHT: reactor core + clock */}
          <div className="col-span-5 relative flex items-center justify-center">
            <OrbitField size={340} count={10} />
            <div className="relative">
              <ReactorCore value={stats.doneTasks} total={Math.max(1, stats.tasks)} size={240} />
            </div>
            <div className="absolute top-0 right-0 text-right">
              <div className="text-[10px] uppercase tracking-[0.3em] font-black text-cyan-300/80 mb-1">Şu an</div>
              <div className="text-4xl font-black tabular-nums leading-none"
                style={{ background: 'linear-gradient(135deg,#e0f2fe,#22d3ee 60%,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[11px] text-slate-300 font-bold mt-1">
                {DAYS[now.getDay()]} · {now.getDate()} {MONTHS[now.getMonth()]}
              </div>
            </div>
            <div className="absolute bottom-0 left-0">
              <span className="hud-chip-soft">UPTIME 99.98%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── KPI HUD ROW ───────────────────────────────────── */}
      <section className="grid grid-cols-4 gap-4 mb-8">
        {[
          { href: '/projects', label: 'BOM Projeleri', value: stats.projects, color: '#22d3ee', accent: 'from-cyan-500/30 to-transparent', icon: <path d="M3 5a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5z M7 8h8M7 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />, series: series.projects, tag: 'aktif' },
          { href: '/tasks',    label: 'Toplam Görev', value: stats.tasks, color: '#a78bfa', accent: 'from-violet-500/30 to-transparent', icon: <path d="M5 4h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z M7 10l2 2 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />, series: series.tasks, tag: 'tüm' },
          { href: '/tasks',    label: 'Açık Görevler', value: stats.openTasks, color: '#f59e0b', accent: 'from-amber-500/30 to-transparent', icon: <><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6" /><path d="M11 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>, series: series.open, tag: 'beklemede' },
          { href: '/projects', label: 'BOM Satırı',    value: stats.totalRows, color: '#34d399', accent: 'from-emerald-500/30 to-transparent', icon: <path d="M3 6h16M3 11h16M3 16h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />, series: series.rows, tag: 'işlendi' },
        ].map((c, i) => (
          <Link key={i} href={c.href} className="kpi-card group">
            <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${c.accent} blur-2xl pointer-events-none`} />
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c.color}88, transparent)` }} />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full" style={{ background: c.color, boxShadow: `0 0 8px ${c.color}` }} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">{c.label}</p>
                </div>
                <p className="text-[44px] font-black mt-2 tabular-nums leading-none kpi-num" style={{ ['--c' as any]: c.color }}>
                  <CountUp value={c.value} />
                </p>
                <span className="inline-block mt-2 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ color: c.color, background: `${c.color}14`, border: `1px solid ${c.color}33` }}>{c.tag}</span>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                background: `radial-gradient(circle at 30% 30%, ${c.color}33, transparent 70%), rgba(15,23,42,0.5)`,
                color: c.color,
                border: `1px solid ${c.color}44`,
                boxShadow: `inset 0 0 12px ${c.color}22, 0 0 20px ${c.color}22`,
              }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">{c.icon}</svg>
              </div>
            </div>
            <div className="relative mt-4 -mx-1">
              <Sparkline data={c.series} color={c.color} height={42} />
            </div>
            <div className="relative mt-1 flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-400 inline-flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 7l3-4 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                trend yukarı
              </span>
              <span className="text-[10px] text-slate-500 font-mono">last 18 · live</span>
            </div>
          </Link>
        ))}
      </section>

      {/* ─── MAIN GRID ─────────────────────────────────────── */}
      <section className="grid grid-cols-12 gap-6 mb-8">
        {/* Recent projects */}
        <div className="col-span-7 panel-dark">
          <div className="flex items-center justify-between mb-5 relative">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">/projects</span>
                <span className="hud-dot" />
              </div>
              <h2 className="text-xl font-black text-white">Son BOM Yüklemeleri</h2>
            </div>
            <Link href="/projects" className="text-xs font-black text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] hover:bg-cyan-400/10 transition-all">
              Tümünü gör →
            </Link>
          </div>
          {loading ? (
            <div className="py-12 text-center"><div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : recentProjects.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 flex items-center justify-center mx-auto mb-3 border border-cyan-400/20">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-cyan-300"><path d="M3 5a2.5 2.5 0 012.5-2.5h11A2.5 2.5 0 0119 5v12a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 013 17V5z" stroke="currentColor" strokeWidth="1.5" /></svg>
              </div>
              <p className="text-slate-200 text-sm font-bold">Henüz proje yok</p>
              <p className="text-xs text-slate-500 mt-1">PLM BOM dosyası yükleyerek başlayın</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentProjects.map((p: any, idx) => (
                <li key={p.id}>
                  <Link href={`/project/${p.id}`} className="row-dark group">
                    <div className="row-rank">
                      <span>{String(idx + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="row-avatar"><span>{p.name?.charAt(0) || '?'}</span></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white group-hover:text-cyan-200 truncate transition-colors">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-cyan-300 tabular-nums">{(p.totalRows || 0).toLocaleString('tr-TR')} satır</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-[11px] text-slate-400">{p._count?.tasks || 0} görev</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-mono block">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR') : ''}</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-cyan-400/60 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all inline-block mt-1"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Task pulse */}
        <div className="col-span-5 panel-dark">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-300">/tasks</span>
                <span className="hud-dot" style={{ background: '#a78bfa', boxShadow: '0 0 0 3px rgba(167,139,250,0.25)' }} />
              </div>
              <h2 className="text-xl font-black text-white">Görev Nabzı</h2>
            </div>
            <Link href="/tasks" className="text-xs font-black text-violet-300 hover:text-violet-200 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-violet-400/20 bg-violet-400/[0.04] hover:bg-violet-400/10 transition-all">Tüm görevler →</Link>
          </div>

          <div className="space-y-3.5">
            {[
              { key: 'open', label: 'Açık', color: '#22d3ee' },
              { key: 'in_progress', label: 'Devam Ediyor', color: '#f59e0b' },
              { key: 'completed', label: 'Tamamlandı', color: '#34d399' },
              { key: 'rejected', label: 'Reddedildi', color: '#f87171' },
            ].map(s => {
              const count = allTasks.filter(t => t.status === s.key).length;
              const pct = allTasks.length ? (count / allTasks.length) * 100 : 0;
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                      <span className="text-xs font-black text-slate-100">{s.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black tabular-nums text-white"><CountUp value={count} /></span>
                      <span className="text-[10px] text-slate-400 font-bold tabular-nums">%{Math.round(pct)}</span>
                    </div>
                  </div>
                  <div className="relative h-2 rounded-full overflow-hidden bg-slate-700/40">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${s.color}, ${s.color}AA)`, boxShadow: `0 0 12px ${s.color}88` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-violet-400/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Son hareketler</span>
              <span className="text-[10px] font-mono text-slate-500">/stream</span>
            </div>
            {recentTasks.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Henüz görev yok</p>
            ) : (
              <ul className="space-y-1">
                {recentTasks.slice(0, 5).map(t => {
                  const colorMap: any = { open: '#22d3ee', in_progress: '#f59e0b', completed: '#34d399', rejected: '#f87171' };
                  const c = colorMap[t.status] || '#94a3b8';
                  return (
                    <li key={t.id}>
                      <Link href="/tasks" className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-all">
                        <span className="font-mono text-[10px] text-slate-500 w-12 shrink-0">{t.createdAt ? new Date(t.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
                        <span className="text-xs font-bold text-slate-100 truncate flex-1">{t.title}</span>
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">{t.assignedTo?.fullName?.split(' ')[0] || '—'}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ─── TEMSA FLEET SHOWCASE ─────────────────────────── */}
      <section className="panel-dark relative overflow-hidden mb-6">
        <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-cyan-300/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-72 h-72 rounded-full bg-violet-400/15 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6 relative">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">/fleet · TEMSA</span>
              <span className="hud-dot" />
            </div>
            <h2 className="text-2xl font-black text-white">Üretim Hattı Portföyü</h2>
            <p className="text-xs text-slate-400 font-bold mt-1">BOM entegrasyonu uygulanan TEMSA araç hatları · 70+ ülkede üretim</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="hud-chip-soft">140K+ üretim</span>
            <span className="hud-chip-soft">70+ ülke</span>
            <span className="hud-chip-soft">ISO 9001</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 relative">
          {TEMSA_FLEET.map((bus, i) => (
            <article key={i} className="bus-card group">
              <div className="bus-img">
                <div className="absolute inset-0 hero-grid opacity-30" />
                <img src={bus.src} alt={bus.name} className="relative h-full w-full object-contain group-hover:scale-110 transition-transform duration-700" />
                <span className="absolute top-2 right-2 hud-chip-soft" style={{ background: 'rgba(34,211,238,0.15)', borderColor: 'rgba(34,211,238,0.4)', color: '#67e8f9' }}>{bus.type}</span>
                <span className="absolute bottom-2 left-2 text-[9px] font-mono text-cyan-300/80">#{String(i + 1).padStart(3, '0')}</span>
              </div>
              <div className="px-4 pb-4 pt-3">
                <h3 className="text-base font-black text-white group-hover:text-cyan-200 transition-colors">{bus.name}</h3>
                <p className="text-[11px] text-slate-400 leading-snug mt-1">{bus.desc}</p>
                <div className="mt-3 pt-3 border-t border-cyan-400/10 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-300/80">{bus.kpi}</span>
                  <span className="text-[10px] font-black text-emerald-400 inline-flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #34d399' }} />
                    online
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── Local cinematic styles ───────────────────────── */}
      <style jsx global>{`
        /* Scope-revert the global light-mode contrast layer for this page only */
        .dash-dark-scope .text-white { color: #ffffff !important; }
        .dash-dark-scope .text-slate-100 { color: #f1f5f9 !important; }
        .dash-dark-scope .text-slate-200 { color: #e2e8f0 !important; }
        .dash-dark-scope .text-slate-300 { color: #cbd5e1 !important; }
        .dash-dark-scope .text-slate-400 { color: #94a3b8 !important; }
        .dash-dark-scope .text-slate-500 { color: #64748b !important; }
        .dash-dark-scope .text-slate-600 { color: #475569 !important; }
        .dash-dark-scope .text-cyan-200 { color: #a5f3fc !important; }
        .dash-dark-scope .text-cyan-300 { color: #67e8f9 !important; opacity: 1 !important; }
        .dash-dark-scope .text-violet-200 { color: #ddd6fe !important; }
        .dash-dark-scope .text-violet-300 { color: #c4b5fd !important; opacity: 1 !important; }
        .dash-dark-scope .text-emerald-400 { color: #34d399 !important; opacity: 1 !important; }
        .dash-dark-scope h1, .dash-dark-scope h2, .dash-dark-scope h3, .dash-dark-scope h4 { color: inherit; }
      `}</style>
      <style jsx>{`
        .hero-dark {
          background: #020617;
          border: 1px solid rgba(34,211,238,0.18);
          box-shadow:
            0 30px 80px -20px rgba(2,6,23,0.7),
            0 0 0 1px rgba(34,211,238,0.08) inset,
            0 0 80px rgba(34,211,238,0.08) inset;
        }
        .hero-grid {
          background-image:
            linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse at center, #000 30%, transparent 80%);
        }
        .hero-scan {
          background: repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 4px);
          mix-blend-mode: overlay;
          opacity: 0.6;
          animation: scanShift 8s linear infinite;
        }
        .hero-h {
          background: linear-gradient(135deg, #67e8f9 0%, #a78bfa 60%, #60a5fa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 20px rgba(34,211,238,0.25));
        }
        .hero-name {
          color: #fff;
          text-shadow: 0 0 30px rgba(167,139,250,0.35), 0 0 60px rgba(34,211,238,0.18);
        }
        .hud-chip {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.4rem 0.75rem;
          font-size: 10px; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase;
          color: #67e8f9;
          background: rgba(34,211,238,0.08);
          border: 1px solid rgba(34,211,238,0.3);
          border-radius: 999px;
          backdrop-filter: blur(10px);
        }
        .hud-chip-soft {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.35rem 0.7rem;
          font-size: 10px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase;
          color: #cbd5e1;
          background: rgba(148,163,184,0.06);
          border: 1px solid rgba(148,163,184,0.18);
          border-radius: 999px;
          backdrop-filter: blur(10px);
        }
        .hud-dot {
          display: inline-block; width: 6px; height: 6px; border-radius: 999px;
          background: #22d3ee; box-shadow: 0 0 0 3px rgba(34,211,238,0.18), 0 0 10px #22d3ee;
          animation: hudPulse 1.6s ease-out infinite;
        }
        .cta-glow {
          position: relative;
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.7rem 1.2rem;
          font-size: 13px; font-weight: 800;
          color: #ffffff !important;
          background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 12px;
          box-shadow:
            0 10px 30px -8px rgba(34,211,238,0.55),
            0 0 0 1px rgba(255,255,255,0.08) inset,
            0 1px 0 rgba(255,255,255,0.2) inset;
          overflow: hidden;
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .cta-glow::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%);
          transform: translateX(-120%);
          transition: transform .8s ease;
        }
        .cta-glow:hover { transform: translateY(-1px); box-shadow: 0 14px 38px -6px rgba(34,211,238,0.7); }
        .cta-glow:hover::before { transform: translateX(120%); }
        .cta-ghost {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.65rem 1.05rem;
          font-size: 13px; font-weight: 800;
          color: #e2e8f0 !important;
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(148,163,184,0.25);
          border-radius: 12px;
          backdrop-filter: blur(8px);
          transition: all .25s ease;
        }
        .cta-ghost:hover { color: #67e8f9 !important; border-color: rgba(34,211,238,0.5); background: rgba(34,211,238,0.08); }

        .kpi-card {
          position: relative; overflow: hidden;
          padding: 1.25rem 1.25rem 1rem;
          border-radius: 18px;
          background:
            radial-gradient(120% 120% at 0% 0%, rgba(34,211,238,0.08) 0%, transparent 55%),
            linear-gradient(155deg, rgba(15,23,42,0.92) 0%, rgba(2,6,23,0.92) 100%);
          border: 1px solid rgba(148,163,184,0.16);
          box-shadow: 0 12px 40px -16px rgba(2,6,23,0.7), 0 0 0 1px rgba(34,211,238,0.04) inset;
          transition: transform .3s ease, border-color .3s ease, box-shadow .3s ease;
        }
        .kpi-card:hover { transform: translateY(-3px); border-color: rgba(34,211,238,0.4); box-shadow: 0 20px 50px -16px rgba(34,211,238,0.35); }
        .kpi-num {
          background: linear-gradient(135deg, #ffffff 0%, var(--c, #67e8f9) 70%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          text-shadow: 0 0 30px var(--c, rgba(34,211,238,0.4));
        }

        .panel-dark {
          position: relative;
          padding: 1.5rem;
          border-radius: 22px;
          background:
            radial-gradient(120% 120% at 0% 0%, rgba(34,211,238,0.06) 0%, transparent 55%),
            linear-gradient(155deg, rgba(15,23,42,0.94) 0%, rgba(2,6,23,0.94) 100%);
          border: 1px solid rgba(148,163,184,0.15);
          box-shadow: 0 20px 60px -20px rgba(2,6,23,0.8), 0 0 0 1px rgba(34,211,238,0.04) inset;
          color: #e2e8f0;
        }
        .panel-dark::before {
          content: ''; position: absolute; inset-inline: 0; top: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(34,211,238,0.5), transparent);
        }

        .row-dark {
          display: flex; align-items: center; gap: 0.85rem;
          padding: 0.7rem 0.9rem;
          border-radius: 14px;
          background: rgba(15,23,42,0.4);
          border: 1px solid rgba(148,163,184,0.12);
          transition: all .25s ease;
        }
        .row-dark:hover {
          background: rgba(34,211,238,0.06);
          border-color: rgba(34,211,238,0.4);
          transform: translateX(2px);
          box-shadow: 0 12px 28px -10px rgba(34,211,238,0.3);
        }
        .row-rank {
          width: 32px; height: 32px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(34,211,238,0.08);
          border: 1px solid rgba(34,211,238,0.25);
          font-family: ui-monospace, monospace;
          font-size: 10px; font-weight: 900; color: #67e8f9;
        }
        .row-avatar {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #06b6d4 0%, #6366f1 100%);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 900; font-size: 16px;
          box-shadow: 0 8px 20px -6px rgba(34,211,238,0.5);
        }

        .bus-card {
          position: relative; overflow: hidden;
          border-radius: 18px;
          background: linear-gradient(155deg, rgba(15,23,42,0.92) 0%, rgba(2,6,23,0.92) 100%);
          border: 1px solid rgba(34,211,238,0.18);
          transition: all .4s ease;
        }
        .bus-card:hover {
          transform: translateY(-6px) scale(1.02);
          border-color: rgba(34,211,238,0.55);
          box-shadow: 0 25px 60px -15px rgba(34,211,238,0.45);
        }
        .bus-img {
          position: relative;
          height: 150px;
          background: radial-gradient(ellipse at center, rgba(34,211,238,0.15) 0%, transparent 70%), #020617;
          display: flex; align-items: center; justify-content: center;
          padding: 0.75rem;
          overflow: hidden;
        }
        .bus-img::after {
          content: ''; position: absolute; inset-inline: 0; bottom: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(34,211,238,0.5), transparent);
        }

        @keyframes hbScan { 0% { stroke-dasharray: 0 9999; } 50% { stroke-dasharray: 9999 0; } 100% { stroke-dasharray: 0 9999; } }
        @keyframes orbitSpin { to { transform: rotate(360deg); } }
        @keyframes scanShift { 0% { background-position: 0 0; } 100% { background-position: 0 200px; } }
        @keyframes hudPulse {
          0% { box-shadow: 0 0 0 0 rgba(34,211,238,0.6), 0 0 10px #22d3ee; }
          70% { box-shadow: 0 0 0 8px rgba(34,211,238,0), 0 0 10px #22d3ee; }
          100% { box-shadow: 0 0 0 0 rgba(34,211,238,0), 0 0 10px #22d3ee; }
        }
      `}</style>
    </div>
  );
}
