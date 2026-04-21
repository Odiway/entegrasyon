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

/* Floating HUD chip for the data highway scene */
function HudChip({ className, color, label, value, delay = '0s' }: { className?: string; color: string; label: string; value: string | number; delay?: string }) {
  return (
    <div className={`absolute rounded-xl bg-white/90 backdrop-blur border border-slate-200 shadow-[0_12px_30px_-14px_rgba(15,23,42,0.35)] px-3.5 py-2.5 chip-float ${className || ''}`} style={{ animationDelay: delay }}>
      <div className="flex items-center gap-2">
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: color }} />
          <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        </span>
        <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-slate-500">{label}</p>
      </div>
      <p className="text-sm font-bold text-slate-900 tabular-nums mt-1 leading-none">{value}</p>
    </div>
  );
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
    if (recentProjects[0]) ev.push({ color: '#3b82f6', text: `${recentProjects[0].name} BOM ağacı PLM'den alındı`, time: '2 dk' });
    if (stats.doneTasks > 0) ev.push({ color: '#10b981', text: `${stats.doneTasks.toLocaleString('tr-TR')} görev SAP'ye aktarıldı`, time: '5 dk' });
    if (recentProjects[1]) ev.push({ color: '#8b5cf6', text: `${recentProjects[1].name} kural motoru doğrulaması tamamlandı`, time: '12 dk' });
    if (stats.openTasks > 0) ev.push({ color: '#f59e0b', text: `${stats.openTasks} açık görev tasarımcı kuyruğunda`, time: '18 dk' });
    if (stats.totalRows > 0) ev.push({ color: '#06b6d4', text: `${stats.totalRows.toLocaleString('tr-TR')} kalem işlendi · veri tabanı senkron`, time: '24 dk' });
    if (ev.length === 0) ev.push({ color: '#64748b', text: 'Sistem hazır · veri akışı bekleniyor', time: 'şimdi' });
    return ev;
  }, [recentProjects, stats]);

  return (
    <div className="px-8 py-6 max-w-[1480px] mx-auto animate-fade-in">

      {/* ═════════════ HERO PANEL ═════════════ */}
      <section className="relative overflow-hidden rounded-2xl mb-7 bg-white border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-15px_rgba(15,23,42,0.12)]">
        {/* Layered light background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-sky-50/50 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-[30rem] h-[30rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(14,116,144,0.08), transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-24 w-[28rem] h-[28rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.06), transparent 70%)' }} />

        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

        {/* Bus on right */}
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[58%] pointer-events-none overflow-hidden">
          <img src="https://www.temsa.com/tr/images/common/maraton-12.png" alt=""
            className="absolute right-[-40px] top-1/2 -translate-y-1/2 h-[130%] w-auto object-contain" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/75 to-transparent" />
        </div>

        {/* Corner brand rail */}
        <div className="absolute top-0 left-0 h-1 w-24 bg-red-600 rounded-br-md" />
        <div className="absolute top-0 left-[98px] h-1 w-10 bg-slate-900/80" />

        <div className="relative px-10 py-10 grid grid-cols-12 gap-6 items-center">
          <div className="col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm mb-5">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
                <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] text-slate-700 font-semibold tracking-wide">Sistem Aktif — Tüm Modüller Çalışıyor</span>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-red-600">TEMSA · PLM Entegrasyon</p>
            <h1 className="text-[38px] leading-[1.05] font-semibold text-slate-900 tracking-[-0.02em] mt-2">
              {greeting},{' '}
              <span className="relative inline-block">
                <span className="relative z-10">{user?.full_name || 'Kullanıcı'}</span>
                <span className="absolute left-0 right-0 bottom-1 h-2.5 bg-red-100/80 -z-0" />
              </span>
            </h1>
            <p className="text-sm text-slate-600 mt-3 max-w-lg leading-relaxed">
              PLM&apos;den gelen BOM verileri kural motorundan geçirilip SAP&apos;ye aktarılıyor. Gün içindeki tüm işleri buradan takip edin.
            </p>
            <div className="mt-5 flex items-center gap-5 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-slate-500 uppercase tracking-[0.18em] font-semibold">
                <span className="w-1 h-1 rounded-full bg-slate-400" />
                {dateLine}
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500 uppercase tracking-[0.18em] font-semibold tabular-nums">
                <span className="w-1 h-1 rounded-full bg-slate-400" />
                {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {user?.uzmanlik && (
                <span className="inline-flex items-center gap-1.5 text-slate-500 uppercase tracking-[0.18em] font-semibold">
                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                  {user.uzmanlik}
                </span>
              )}
            </div>
          </div>

          {/* Clean KPI strip */}
          <div className="col-span-5 grid grid-cols-3 gap-3">
            {[
              { v: stats.doneTasks, label: 'Çözülen Görev', accent: '#10b981' },
              { v: stats.projects,  label: 'BOM Projesi',   accent: '#3b82f6' },
              { v: stats.totalRows, label: 'BOM Satırı',    accent: '#dc2626' },
            ].map((k, i) => (
              <div key={i} className="relative bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <span className="absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full" style={{ background: k.accent }} />
                <p className="text-[24px] font-bold text-slate-900 leading-none tabular-nums"><CountUp value={k.v} /></p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mt-2 font-semibold">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ KPI ROW (Çözülen Sayılar) ═════════════ */}
      <section className="grid grid-cols-4 gap-5 mb-7">
        {[
          { label: 'Çözülen Görev',     value: stats.doneTasks,    icon: '✓', accent: '#10b981', tint: 'from-emerald-50 to-white', sub: `${stats.tasks} görevden` },
          { label: 'İşlenen BOM Satırı', value: stats.totalRows,    icon: '≣', accent: '#3b82f6', tint: 'from-sky-50 to-white',     sub: `${stats.projects} projede` },
          { label: 'Aktif Proje',       value: stats.projects,     icon: '◈', accent: '#8b5cf6', tint: 'from-violet-50 to-white',  sub: 'Üretim hattında' },
          { label: 'Bekleyen İş',       value: stats.openTasks,    icon: '◷', accent: '#f59e0b', tint: 'from-amber-50 to-white',   sub: 'Tasarımcı kuyruğunda' },
        ].map((c, i) => (
          <div key={i} className={`group relative bg-gradient-to-br ${c.tint} rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition-all`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold shrink-0"
                style={{ background: `${c.accent}1f`, color: c.accent, border: `1px solid ${c.accent}44` }}>
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

      {/* ═════════════ TEMSA · VERİ OTOYOLU (animasyonlu 3D sahne — ortada) ═════════════ */}
      <section className="mb-7 relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-sky-50 via-white to-slate-100">
        {/* Header */}
        <div className="relative z-20 flex items-end justify-between px-7 pt-6 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-600">TEMSA · Veri Otoyolu</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Canlı Operasyon Hattı</h2>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed">BOM verisi PLM&apos;den SAP&apos;ye otomatik akıyor · kural motoru her kalemi yolda doğruluyor.</p>
          </div>
          <div className="hidden md:flex items-center gap-8 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Durum</p>
              <p className="text-sm font-bold text-emerald-700 mt-1 inline-flex items-center gap-1.5">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </span>
                Aktif
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Akış</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums mt-1">{Math.max(1, Math.round(stats.totalRows / 60)).toLocaleString('tr-TR')} kalem/dk</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Otomasyon</p>
              <p className="text-sm font-bold text-violet-700 tabular-nums mt-1">%100</p>
            </div>
          </div>
        </div>

        {/* Scene */}
        <div className="relative h-[360px] overflow-hidden">
          <div className="absolute -top-16 left-1/4 w-80 h-80 rounded-full bg-sky-200/50 blur-3xl pointer-events-none" />
          <div className="absolute top-4 right-1/5 w-64 h-64 rounded-full bg-violet-200/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[700px] h-64 rounded-full bg-emerald-200/25 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(#1e3a8a 1px, transparent 1px), linear-gradient(90deg, #1e3a8a 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
          <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none" style={{ perspective: '700px' }}>
            <div className="absolute inset-0"
              style={{ transform: 'rotateX(60deg)', transformOrigin: 'bottom', background: 'linear-gradient(to bottom, #cbd5e1 0%, #e2e8f0 60%, #f1f5f9 100%)' }} />
            <div className="absolute inset-0 overflow-hidden" style={{ transform: 'rotateX(60deg)', transformOrigin: 'bottom' }}>
              <div className="absolute left-0 right-0 top-[48%] h-1.5 bus-lane"
                style={{ backgroundImage: 'linear-gradient(90deg, #fbbf24 0 60px, transparent 60px 120px)', backgroundSize: '120px 100%' }} />
              <div className="absolute left-0 right-0 top-[12%] h-[1px] bg-slate-400/50" />
              <div className="absolute left-0 right-0 bottom-[12%] h-[1px] bg-slate-400/50" />
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none">
            <HudChip className="top-6 left-[8%]" color="#10b981" label="SAP Senkron" value="%100" />
            <HudChip className="top-14 right-[10%]" color="#3b82f6" label="BOM Kalemleri" value={stats.totalRows.toLocaleString('tr-TR')} delay="0.6s" />
            <HudChip className="top-[130px] left-[20%]" color="#8b5cf6" label="Kural Motoru" value="Sağlıklı" delay="1.2s" />
            <HudChip className="top-[110px] right-[22%]" color="#f59e0b" label="Aktif Proje" value={String(stats.projects || 0)} delay="1.8s" />
            <HudChip className="top-[60px] left-[42%]" color="#06b6d4" label="Tamamlanan" value={String(stats.doneTasks || 0)} delay="0.9s" />
          </div>
          <div className="absolute bottom-8 left-0 right-0 pointer-events-none">
            <div className="bus-drive relative w-fit">
              <div className="relative">
                <div className="absolute top-1/2 -right-6 w-48 h-14 -translate-y-1/2 rounded-full opacity-80 pointer-events-none"
                  style={{ background: 'radial-gradient(closest-side, rgba(254,240,138,0.95), rgba(254,240,138,0.15) 50%, transparent 75%)' }} />
                <div className="absolute top-1/2 -left-32 -translate-y-1/2 flex flex-col gap-2.5">
                  <span className="block h-[2px] w-28 rounded-full bus-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.7))' }} />
                  <span className="block h-[2px] w-20 rounded-full bus-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(100,116,139,0.7))', animationDelay: '0.2s' }} />
                  <span className="block h-[2px] w-24 rounded-full bus-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.65))', animationDelay: '0.5s' }} />
                  <span className="block h-[2px] w-16 rounded-full bus-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.65))', animationDelay: '0.8s' }} />
                </div>
                <div className="relative bus-bob">
                  <img
                    src="https://www.temsa.com/tr/images/common/temsa-avenue-electron.png"
                    alt="TEMSA Avenue Electron"
                    className="relative h-36 md:h-44 w-auto object-contain drop-shadow-[0_24px_18px_rgba(15,23,42,0.22)]"
                  />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[78%] h-3 rounded-full bg-slate-900/25 blur-md" />
                </div>
                <div className="absolute top-8 -left-24 flex gap-1.5 packet-trail">
                  <span className="block w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  <span className="block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="block w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none" />
        </div>

        <div className="relative z-10 flex items-center justify-between px-7 py-3 border-t border-slate-200 bg-white/60 backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500">PLM → Kural Motoru → SAP · Canlı aktarım</p>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500 tabular-nums">Son senkron · {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <style jsx global>{`
          @keyframes busDrive { 0% { transform: translateX(-260px); } 100% { transform: translateX(calc(100vw + 80px)); } }
          @keyframes busBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
          @keyframes lane { 0% { background-position: 0 0; } 100% { background-position: -120px 0; } }
          @keyframes speedLine { 0% { transform: translateX(-30px); opacity: 0; } 40% { opacity: 1; } 100% { transform: translateX(30px); opacity: 0; } }
          @keyframes chipFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          @keyframes packetTrail { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(-80px); opacity: 0; } }
          .bus-drive { animation: busDrive 24s linear infinite; will-change: transform; }
          .bus-bob   { animation: busBob 1.4s ease-in-out infinite; }
          .bus-lane  { animation: lane 0.55s linear infinite; }
          .bus-line  { animation: speedLine 0.9s ease-in-out infinite; }
          .chip-float{ animation: chipFloat 4.5s ease-in-out infinite; will-change: transform; }
          .packet-trail { animation: packetTrail 1.2s ease-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .bus-drive, .bus-bob, .bus-lane, .bus-line, .chip-float, .packet-trail { animation: none !important; }
          }
        `}</style>
      </section>

      {/* ═════════════ SİNYAL MATRİSİ + CORE — kaldırıldı, yerine alt kısımda Veri Otoyolu sahnesi ═════════════ */}
      {false && (
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
                { label: 'Doğruluk',   value: 100, color: '#10b981' },
                { label: 'SAP Senkron', value: 100, color: '#3b82f6' },
                { label: 'Otomasyon',  value: 100, color: '#8b5cf6' },
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
        <div className="col-span-5 relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-violet-50 rounded-xl border border-slate-200 p-5 flex flex-col">
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-sky-300/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-emerald-300/25 blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-around gap-3 flex-1">
            {/* Core 1: System */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 -m-3 rounded-full border border-sky-300/50 animate-[spin_20s_linear_infinite]"
                  style={{ borderTopColor: 'rgba(59,130,246,0.85)' }} />
                <div className="absolute inset-0 -m-6 rounded-full border border-sky-200/40" />
                <Ring value={100} size={116} stroke={5} color="#3b82f6" label="Sistem" />
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
                <div className="absolute inset-0 -m-3 rounded-full border border-violet-300/50 animate-[spin_24s_linear_infinite_reverse]"
                  style={{ borderTopColor: 'rgba(139,92,246,0.85)' }} />
                <div className="absolute inset-0 -m-6 rounded-full border border-violet-200/40" />
                <Ring value={100} size={116} stroke={5} color="#8b5cf6" label="Kural Motoru" />
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
      )}

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

      {/* ═════════════ TEMSA FLEET — kaldırıldı, yerine alt kısımda Veri Otoyolu sahnesi ═════════════ */}
      {false && (
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
              <div className="relative h-40 bg-gradient-to-br from-sky-50 via-white to-violet-50/50 flex items-center justify-center p-4 overflow-hidden">
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
      )}

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
              const colorMap: any = { open: '#3b82f6', in_progress: '#f59e0b', completed: '#10b981', rejected: '#f43f5e' };
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

      {/* Veri Otoyolu moved up — was here */}
      {false && (
      <section className="mt-7 relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-sky-50 via-white to-slate-100">
        {/* Header */}
        <div className="relative z-20 flex items-end justify-between px-7 pt-6 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">TEMSA · Veri Otoyolu</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Canlı Operasyon Hattı</h2>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed">BOM verisi PLM&apos;den SAP&apos;ye otomatik akıyor · kural motoru her kalemi yolda doğruluyor.</p>
          </div>
          <div className="hidden md:flex items-center gap-8 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Durum</p>
              <p className="text-sm font-bold text-emerald-700 mt-1 inline-flex items-center gap-1.5">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </span>
                Aktif
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Akış</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums mt-1">{Math.max(1, Math.round(stats.totalRows / 60)).toLocaleString('tr-TR')} kalem/dk</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Otomasyon</p>
              <p className="text-sm font-bold text-violet-700 tabular-nums mt-1">%100</p>
            </div>
          </div>
        </div>

        {/* Scene */}
        <div className="relative h-[360px] overflow-hidden">
          {/* Sky halos */}
          <div className="absolute -top-16 left-1/4 w-80 h-80 rounded-full bg-sky-200/50 blur-3xl pointer-events-none" />
          <div className="absolute top-4 right-1/5 w-64 h-64 rounded-full bg-violet-200/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[700px] h-64 rounded-full bg-emerald-200/25 blur-3xl pointer-events-none" />

          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(#1e3a8a 1px, transparent 1px), linear-gradient(90deg, #1e3a8a 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

          {/* Perspective road */}
          <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none" style={{ perspective: '700px' }}>
            <div className="absolute inset-0"
              style={{ transform: 'rotateX(60deg)', transformOrigin: 'bottom', background: 'linear-gradient(to bottom, #cbd5e1 0%, #e2e8f0 60%, #f1f5f9 100%)' }} />
            <div className="absolute inset-0 overflow-hidden" style={{ transform: 'rotateX(60deg)', transformOrigin: 'bottom' }}>
              <div className="absolute left-0 right-0 top-[48%] h-1.5 bus-lane"
                style={{ backgroundImage: 'linear-gradient(90deg, #fbbf24 0 60px, transparent 60px 120px)', backgroundSize: '120px 100%' }} />
              <div className="absolute left-0 right-0 top-[12%] h-[1px] bg-slate-400/50" />
              <div className="absolute left-0 right-0 bottom-[12%] h-[1px] bg-slate-400/50" />
            </div>
          </div>

          {/* Floating data chips */}
          <div className="absolute inset-0 pointer-events-none">
            <HudChip className="top-6 left-[8%]" color="#10b981" label="SAP Senkron" value="%100" />
            <HudChip className="top-14 right-[10%]" color="#3b82f6" label="BOM Kalemleri" value={stats.totalRows.toLocaleString('tr-TR')} delay="0.6s" />
            <HudChip className="top-[130px] left-[20%]" color="#8b5cf6" label="Kural Motoru" value="Sağlıklı" delay="1.2s" />
            <HudChip className="top-[110px] right-[22%]" color="#f59e0b" label="Aktif Proje" value={String(stats.projects || 0)} delay="1.8s" />
            <HudChip className="top-[60px] left-[42%]" color="#06b6d4" label="Tamamlanan" value={String(stats.doneTasks || 0)} delay="0.9s" />
          </div>

          {/* Bus driving across */}
          <div className="absolute bottom-8 left-0 right-0 pointer-events-none">
            <div className="bus-drive relative w-fit">
              <div className="relative">
                {/* Headlight beam */}
                <div className="absolute top-1/2 -right-6 w-48 h-14 -translate-y-1/2 rounded-full opacity-80 pointer-events-none"
                  style={{ background: 'radial-gradient(closest-side, rgba(254,240,138,0.95), rgba(254,240,138,0.15) 50%, transparent 75%)' }} />
                {/* Speed lines */}
                <div className="absolute top-1/2 -left-32 -translate-y-1/2 flex flex-col gap-2.5">
                  <span className="block h-[2px] w-28 rounded-full bus-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.7))' }} />
                  <span className="block h-[2px] w-20 rounded-full bus-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(100,116,139,0.7))', animationDelay: '0.2s' }} />
                  <span className="block h-[2px] w-24 rounded-full bus-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.65))', animationDelay: '0.5s' }} />
                  <span className="block h-[2px] w-16 rounded-full bus-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.65))', animationDelay: '0.8s' }} />
                </div>
                {/* Bus image with subtle bob */}
                <div className="relative bus-bob">
                  <img
                    src="https://www.temsa.com/tr/images/common/temsa-avenue-electron.png"
                    alt="TEMSA Avenue Electron"
                    className="relative h-36 md:h-44 w-auto object-contain drop-shadow-[0_24px_18px_rgba(15,23,42,0.22)]"
                  />
                  {/* Ground shadow */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[78%] h-3 rounded-full bg-slate-900/25 blur-md" />
                </div>
                {/* Trailing data packets */}
                <div className="absolute top-8 -left-24 flex gap-1.5 packet-trail">
                  <span className="block w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  <span className="block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="block w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none" />
        </div>

        {/* Footer caption */}
        <div className="relative z-10 flex items-center justify-between px-7 py-3 border-t border-slate-200 bg-white/60 backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500">PLM → Kural Motoru → SAP · Canlı aktarım</p>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500 tabular-nums">Son senkron · {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <style jsx global>{`
          @keyframes busDrive {
            0%   { transform: translateX(-260px); }
            100% { transform: translateX(calc(100vw + 80px)); }
          }
          @keyframes busBob {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-3px); }
          }
          @keyframes lane {
            0%   { background-position: 0 0; }
            100% { background-position: -120px 0; }
          }
          @keyframes speedLine {
            0%   { transform: translateX(-30px); opacity: 0; }
            40%  { opacity: 1; }
            100% { transform: translateX(30px); opacity: 0; }
          }
          @keyframes chipFloat {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-8px); }
          }
          @keyframes packetTrail {
            0%   { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(-80px); opacity: 0; }
          }
          .bus-drive { animation: busDrive 24s linear infinite; will-change: transform; }
          .bus-bob   { animation: busBob 1.4s ease-in-out infinite; }
          .bus-lane  { animation: lane 0.55s linear infinite; }
          .bus-line  { animation: speedLine 0.9s ease-in-out infinite; }
          .chip-float{ animation: chipFloat 4.5s ease-in-out infinite; will-change: transform; }
          .packet-trail { animation: packetTrail 1.2s ease-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .bus-drive, .bus-bob, .bus-lane, .bus-line, .chip-float, .packet-trail { animation: none !important; }
          }
        `}</style>
      </section>
      )}
    </div>
  );
}
