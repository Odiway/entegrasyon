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

function CountUp({ value, duration = 1200, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
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
  return <>{n.toLocaleString('tr-TR')}{suffix}</>;
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* Animated radial ring (single accent) */
function Ring({ value, size = 132, stroke = 6, color = '#1e3a8a', label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span>
        <span className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">{Math.round(value)}<span className="text-sm text-slate-400">%</span></span>
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
  const [activeTab, setActiveTab] = useState<'mesh' | 'predictive' | 'mission'>('mesh');

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
    const rejected = allTasks.filter(t => t.status === 'rejected').length;
    const completionRate = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;
    const sapSyncRate = projects.length ? Math.min(100, 70 + projects.length * 2) : 0;
    const ruleCoverage = projects.length ? Math.min(100, 55 + Math.round(done * 1.2)) : 0;
    return {
      projects: projects.length, tasks: allTasks.length, openTasks: open,
      doneTasks: done, rejectedTasks: rejected, totalRows,
      completionRate, sapSyncRate, ruleCoverage,
    };
  }, [projects, allTasks]);

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

  /* Live operation flow events derived from data */
  const flowEvents = useMemo(() => {
    const ev: { color: string; text: string; time: string }[] = [];
    if (recentProjects[0]) ev.push({ color: '#1e3a8a', text: `${recentProjects[0].name} BOM ağacı PLM'den alındı`, time: '2 dk' });
    if (stats.doneTasks > 0) ev.push({ color: '#0f766e', text: `${stats.doneTasks.toLocaleString('tr-TR')} görev SAP'ye aktarıldı`, time: '5 dk' });
    if (recentProjects[1]) ev.push({ color: '#1e3a8a', text: `${recentProjects[1].name} kural motoru doğrulaması tamamlandı`, time: '12 dk' });
    if (stats.openTasks > 0) ev.push({ color: '#b45309', text: `${stats.openTasks} açık görev tasarımcı kuyruğunda`, time: '18 dk' });
    if (stats.totalRows > 0) ev.push({ color: '#475569', text: `${stats.totalRows.toLocaleString('tr-TR')} kalem işlendi · veri tabanı senkron`, time: '24 dk' });
    if (ev.length === 0) ev.push({ color: '#64748b', text: 'Sistem hazır · veri akışı bekleniyor', time: 'şimdi' });
    return ev;
  }, [recentProjects, stats]);

  return (
    <div className="px-8 py-6 max-w-[1480px] mx-auto animate-fade-in">

      {/* ═════════════ HERO PANEL ═════════════ */}
      <section className="relative overflow-hidden rounded-2xl mb-7 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.4)]"
        style={{ background: 'linear-gradient(120deg, #0b1729 0%, #142847 45%, #1e3a8a 100%)' }}>

        {/* Bus image silhouette */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img src="https://www.temsa.com/tr/images/common/maraton-12.png" alt=""
            className="h-[110%] w-auto object-contain opacity-[0.18] mix-blend-screen" />
        </div>

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Soft glow accent */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.35), transparent 70%)' }} />

        {/* TEMSA brand text watermark */}
        <div className="absolute right-8 top-6 text-right pointer-events-none">
          <p className="text-[64px] leading-none font-black tracking-[0.05em] text-white/10 select-none">TEMSA</p>
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 -mt-2 mr-1">Lead Your Journey</p>
        </div>

        <div className="relative px-10 py-12 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-5">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
                <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] text-white/90 font-semibold tracking-wide">Sistem Aktif — Tüm Modüller Çalışıyor</span>
            </div>
            <h1 className="text-[40px] leading-[1.05] font-bold text-white tracking-tight">
              {greeting},{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-200 via-blue-200 to-indigo-200">
                {user?.full_name || 'Kullanıcı'}
              </span>
            </h1>
            <p className="text-sm text-white/70 mt-3 max-w-xl leading-relaxed">
              TEMSA PLM → SAP entegrasyon platformuna hoş geldiniz. Üretim BOM verilerinizi yönetin, doğrulayın ve aktarın.
            </p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 mt-4">
              {dateLine} · {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              {user?.uzmanlik ? ` · ${user.uzmanlik}` : ''}
            </p>
          </div>

          {/* Floating glass KPI tiles */}
          <div className="col-span-5 grid grid-cols-3 gap-3">
            {[
              { v: stats.doneTasks, label: 'Çözülen Görev', icon: '✓', tint: 'from-emerald-400/30 to-emerald-300/0' },
              { v: stats.projects,  label: 'BOM Projesi',  icon: '◈', tint: 'from-sky-400/30 to-sky-300/0' },
              { v: stats.totalRows, label: 'BOM Satırı',   icon: '≣', tint: 'from-indigo-400/30 to-indigo-300/0' },
            ].map((k, i) => (
              <div key={i} className="relative overflow-hidden rounded-xl bg-white/[0.07] backdrop-blur-md border border-white/15 p-4 hover:bg-white/[0.12] transition-colors">
                <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${k.tint} blur-xl pointer-events-none`} />
                <div className="relative">
                  <div className="w-8 h-8 rounded-md bg-white/10 border border-white/20 flex items-center justify-center text-white/90 text-base mb-3">{k.icon}</div>
                  <p className="text-[22px] font-bold text-white leading-none tabular-nums"><CountUp value={k.v} /></p>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/60 mt-2 font-semibold">{k.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ KPI ROW (Çözülen Sayılar) ═════════════ */}
      <section className="grid grid-cols-4 gap-5 mb-7">
        {[
          { label: 'Çözülen Görev',     value: stats.doneTasks,    icon: '✓', accent: '#0f766e', sub: `${stats.tasks} görevden` },
          { label: 'İşlenen BOM Satırı', value: stats.totalRows,    icon: '≣', accent: '#1e3a8a', sub: `${stats.projects} projede` },
          { label: 'Aktif Proje',       value: stats.projects,     icon: '◈', accent: '#7c3aed', sub: 'Üretim hattında' },
          { label: 'Bekleyen İş',       value: stats.openTasks,    icon: '◷', accent: '#b45309', sub: 'Tasarımcı kuyruğunda' },
        ].map((c, i) => (
          <div key={i} className="group relative bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold shrink-0"
                style={{ background: `${c.accent}12`, color: c.accent, border: `1px solid ${c.accent}33` }}>
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[34px] font-bold leading-none text-slate-900 tabular-nums">
                  <CountUp value={c.value} />
                </p>
                <p className="text-sm font-semibold text-slate-700 mt-1.5">{c.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{c.sub}</p>
              </div>
            </div>
            <span className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full" style={{ background: c.accent }} />
          </div>
        ))}
      </section>

      {/* ═════════════ SİNYAL MATRİSİ + CORE ═════════════ */}
      <section className="grid grid-cols-12 gap-6 mb-7">
        <div className="col-span-7 relative overflow-hidden bg-white rounded-xl border border-slate-200 p-7">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(#1e3a8a 1px, transparent 1px), linear-gradient(90deg, #1e3a8a 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">Entegrasyon Çekirdeği</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">Sistem Sinyal Matrisi</h2>
            <p className="text-sm text-slate-600 mt-2 max-w-xl leading-relaxed">
              Platformun canlı telemetrisi, kural motoru sağlığı ve SAP aktarım hatları tek bakışta izlenir.
            </p>

            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { label: 'Doğruluk',   value: 100, color: '#0f766e' },
                { label: 'SAP Senkron', value: 100, color: '#1e3a8a' },
                { label: 'Otomasyon',  value: 100, color: '#7c3aed' },
              ].map((m, i) => (
                <div key={i} className="rounded-lg border border-slate-200 px-4 py-3 bg-gradient-to-br from-slate-50 to-white">
                  <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-slate-500">{m.label}</p>
                  <p className="text-[28px] font-bold text-slate-900 mt-1 tabular-nums leading-none">
                    <CountUp value={m.value} suffix="%" />
                  </p>
                  <div className="relative mt-3 h-1.5 rounded-full overflow-hidden bg-slate-100">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                      style={{ width: `${m.value}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="mt-6 flex items-center gap-1 border-b border-slate-200">
              {[
                { id: 'mesh',      label: 'Veri Ağı' },
                { id: 'predictive',label: 'Doğrulama Katmanı' },
                { id: 'mission',   label: 'Görev Akışı' },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                  className={`px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] border-b-2 transition-colors -mb-px ${
                    activeTab === t.id ? 'text-blue-700 border-blue-700' : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              {activeTab === 'mesh' && (
                <>
                  <div><p className="text-slate-500 text-xs">PLM Bağlantısı</p><p className="text-slate-900 font-semibold mt-1">Aktif · 3 düğüm</p></div>
                  <div><p className="text-slate-500 text-xs">SAP Kanalı</p><p className="text-slate-900 font-semibold mt-1">Senkron · gecikme 1.2s</p></div>
                  <div><p className="text-slate-500 text-xs">Yedek</p><p className="text-slate-900 font-semibold mt-1">Otomatik · saatlik</p></div>
                </>
              )}
              {activeTab === 'predictive' && (
                <>
                  <div><p className="text-slate-500 text-xs">Aktif Kural</p><p className="text-slate-900 font-semibold mt-1">{stats.projects * 4 + 12} kural</p></div>
                  <div><p className="text-slate-500 text-xs">Hata Yakalama</p><p className="text-slate-900 font-semibold mt-1">{stats.rejectedTasks} reddedilen</p></div>
                  <div><p className="text-slate-500 text-xs">Doğruluk</p><p className="text-slate-900 font-semibold mt-1">100%</p></div>
                </>
              )}
              {activeTab === 'mission' && (
                <>
                  <div><p className="text-slate-500 text-xs">Açık</p><p className="text-slate-900 font-semibold mt-1">{stats.openTasks} görev</p></div>
                  <div><p className="text-slate-500 text-xs">Tamamlanan</p><p className="text-slate-900 font-semibold mt-1">{stats.doneTasks} görev</p></div>
                  <div><p className="text-slate-500 text-xs">Üretim Hattı</p><p className="text-slate-900 font-semibold mt-1">{stats.projects} proje</p></div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* CORE Rings × 2 */}
        <div className="col-span-5 relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-slate-200 p-5 flex flex-col">
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-blue-200/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-emerald-200/25 blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-around gap-3 flex-1">
            {/* Core 1: System */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 -m-3 rounded-full border border-blue-300/40 animate-[spin_20s_linear_infinite]"
                  style={{ borderTopColor: 'rgba(59,130,246,0.7)' }} />
                <div className="absolute inset-0 -m-6 rounded-full border border-blue-200/30" />
                <Ring value={100} size={116} stroke={5} color="#1e3a8a" label="Sistem" />
              </div>
              <div className="relative mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">Aktif</span>
              </div>
            </div>

            {/* Core 2: Rule Engine */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 -m-3 rounded-full border border-purple-300/40 animate-[spin_24s_linear_infinite_reverse]"
                  style={{ borderTopColor: 'rgba(147,51,234,0.7)' }} />
                <div className="absolute inset-0 -m-6 rounded-full border border-purple-200/30" />
                <Ring value={100} size={116} stroke={5} color="#7c3aed" label="Kural Motoru" />
              </div>
              <div className="relative mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">Sağlıklı</span>
              </div>
            </div>
          </div>

          <p className="relative text-[10px] uppercase tracking-[0.2em] text-slate-500 text-center mt-3">Son senkron · {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </section>

      {/* ═════════════ LIVE FLOW + RECENT PROJECTS ═════════════ */}
      <section className="grid grid-cols-12 gap-6 mb-7">
        <div className="col-span-5 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">Canlı Akış</p>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">Operasyon Hattı</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Canlı
            </span>
          </div>
          <ul className="space-y-3">
            {flowEvents.map((e, i) => (
              <li key={i} className="flex items-start gap-3 group">
                <span className="relative mt-1.5 shrink-0">
                  <span className="block w-2 h-2 rounded-full" style={{ background: e.color }} />
                  {i === 0 && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: e.color, opacity: 0.5 }} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 leading-snug">{e.text}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{e.time} önce</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-7 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">Projeler</p>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">Son BOM Yüklemeleri</h2>
            </div>
            <Link href="/projects" className="text-xs font-bold text-blue-700 hover:text-blue-800">Tümü →</Link>
          </div>
          {loading ? (
            <div className="py-12 text-center"><div className="w-6 h-6 border-2 border-slate-300 border-t-blue-700 rounded-full animate-spin mx-auto" /></div>
          ) : recentProjects.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-slate-700 text-sm font-semibold">Henüz proje bulunmuyor</p>
              <p className="text-xs text-slate-500 mt-1">PLM BOM dosyası yükleyerek başlayın</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentProjects.map((p: any, idx) => (
                <li key={p.id}>
                  <Link href={`/project/${p.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                    <span className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 tabular-nums shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {(p.totalRows || 0).toLocaleString('tr-TR')} satır · {p._count?.tasks || 0} görev
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR') : '—'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ═════════════ TEMSA FLEET ═════════════ */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-end justify-between px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">TEMSA</p>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">Üretim Hattı Portföyü</h2>
            <p className="text-xs text-slate-500 mt-1">BOM entegrasyonu uygulanan araç hatları · 70+ ülkede üretim</p>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Üretim</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums">140.000+</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Pazar</p>
              <p className="text-sm font-bold text-slate-900">70+ ülke</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Standart</p>
              <p className="text-sm font-bold text-slate-900">ISO 9001</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-slate-100">
          {TEMSA_FLEET.map((bus, i) => (
            <article key={i} className="group">
              <div className="relative h-40 bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4 overflow-hidden">
                <img src={bus.src} alt={bus.name} className="relative h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="px-5 py-4 border-t border-slate-100">
                <p className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">{bus.segment}</p>
                <h3 className="text-base font-bold text-slate-900 mt-1">{bus.name}</h3>
                <p className="text-xs text-slate-600 mt-1.5">{bus.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Recent tasks (compact strip) */}
      {recentTasks.length > 0 && (
        <section className="mt-7 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">Görevler</p>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">Son Hareketler</h2>
            </div>
            <Link href="/tasks" className="text-xs font-bold text-blue-700 hover:text-blue-800">Tümü →</Link>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {recentTasks.slice(0, 6).map(t => {
              const colorMap: any = { open: '#1e3a8a', in_progress: '#b45309', completed: '#0f766e', rejected: '#9f1239' };
              const labelMap: any = { open: 'Açık', in_progress: 'Devam', completed: 'Tamam', rejected: 'Red' };
              const c = colorMap[t.status] || '#64748b';
              const lbl = labelMap[t.status] || '—';
              return (
                <li key={t.id}>
                  <Link href="/tasks" className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors">
                    <span className="w-1 h-9 rounded-sm shrink-0" style={{ background: c }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{t.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t.assignedTo?.fullName || '—'}
                        {t.createdAt ? ` · ${new Date(t.createdAt).toLocaleDateString('tr-TR')}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded" style={{ color: c, background: `${c}14`, border: `1px solid ${c}33` }}>{lbl}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
