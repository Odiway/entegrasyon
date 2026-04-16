'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/api';

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const EVENT_TYPES = ['task', 'milestone', 'deadline', 'meeting'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;

const TYPE_COLORS: Record<string, { bg: string; dot: string; text: string }> = {
  task: { bg: 'bg-blue-500/10', dot: 'bg-blue-500', text: 'text-blue-400' },
  milestone: { bg: 'bg-violet-500/10', dot: 'bg-violet-500', text: 'text-violet-400' },
  deadline: { bg: 'bg-red-500/10', dot: 'bg-red-500', text: 'text-red-400' },
  meeting: { bg: 'bg-emerald-500/10', dot: 'bg-emerald-500', text: 'text-emerald-400' },
};
const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-slate-600', medium: 'border-blue-500', high: 'border-amber-500', critical: 'border-red-500',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor', in_progress: 'Devam Ediyor', completed: 'Tamamlandı', cancelled: 'İptal',
};

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, inMonth: false });
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), inMonth: true });
  }
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - startPad - lastDay.getDate() + 1);
    days.push({ date: d, inMonth: false });
  }
  return days;
}

function formatDate(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [view, setView] = useState<'month' | 'list'>('month');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [form, setForm] = useState({
    title: '', description: '', event_type: 'task' as string,
    priority: 'medium' as string, status: 'pending' as string,
    start_date: '', end_date: '', all_day: true,
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const params: any = {};
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    params.start_date = formatDate(startDate);
    params.end_date = formatDate(endDate);
    if (filterType) params.event_type = filterType;
    if (filterStatus) params.status = filterStatus;
    try {
      setEvents(await getCalendarEvents(params));
    } catch {
      setEvents([]);
    }
    setLoading(false);
  }, [year, month, filterType, filterStatus]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const ev of events) {
      const key = ev.start_date?.split('T')[0];
      if (key) { (map[key] = map[key] || []).push(ev); }
    }
    return map;
  }, [events]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };
  const goToday = () => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth()); };

  const openNewEvent = (date?: string) => {
    setEditItem(null);
    const d = date || formatDate(new Date());
    setForm({ title: '', description: '', event_type: 'task', priority: 'medium', status: 'pending', start_date: d, end_date: d, all_day: true });
    setShowForm(true);
  };

  const openEditEvent = (ev: any) => {
    setEditItem(ev);
    setForm({
      title: ev.title || '', description: ev.description || '',
      event_type: ev.event_type || 'task', priority: ev.priority || 'medium',
      status: ev.status || 'pending',
      start_date: ev.start_date?.split('T')[0] || '', end_date: ev.end_date?.split('T')[0] || '',
      all_day: ev.all_day ?? true,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    try {
      if (editItem) {
        await updateCalendarEvent(editItem.id, form);
        setMsg('ok:Güncellendi');
      } else {
        await createCalendarEvent(form);
        setMsg('ok:Oluşturuldu');
      }
      setShowForm(false);
      loadEvents();
    } catch (err: any) {
      setMsg('err:' + (err?.message || 'İşlem hatası'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await deleteCalendarEvent(id);
    loadEvents();
    setMsg('ok:Silindi');
  };

  const today = formatDate(new Date());

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Takvim</h1>
          <p className="text-sm text-slate-500 mt-1">Görev, dönüm noktası ve toplantı yönetimi</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/[0.06]">
            <button onClick={() => setView('month')} className={`px-3 py-1.5 text-xs ${view === 'month' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/[0.03] text-slate-500'}`}>Aylık</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs ${view === 'list' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/[0.03] text-slate-500'}`}>Liste</button>
          </div>
          <button onClick={() => openNewEvent()} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
            Yeni Etkinlik
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-5 p-3 rounded-xl text-sm flex items-center gap-2 ${
          msg.startsWith('ok:') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {msg.startsWith('ok:') ? '✓' : '⚠'} {msg.replace(/^(ok:|err:)/, '')}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.03] text-slate-400 border border-white/[0.06] focus:outline-none">
          <option value="">Tüm Tipler</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t === 'task' ? 'Görev' : t === 'milestone' ? 'Dönüm Noktası' : t === 'deadline' ? 'Son Tarih' : 'Toplantı'}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.03] text-slate-400 border border-white/[0.06] focus:outline-none">
          <option value="">Tüm Durumlar</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <div className="flex items-center gap-1 ml-auto">
          {EVENT_TYPES.map(t => (
            <span key={t} className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-600">
              <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[t].dot}`} />
              {t === 'task' ? 'Görev' : t === 'milestone' ? 'Dönüm N.' : t === 'deadline' ? 'Son Tarih' : 'Toplantı'}
            </span>
          ))}
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-slate-400">‹</button>
          <h2 className="text-lg font-bold text-white min-w-[180px] text-center">{MONTHS_TR[month]} {year}</h2>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-slate-400">›</button>
        </div>
        <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] hover:bg-white/[0.08] text-slate-400">Bugün</button>
      </div>

      {view === 'month' ? (
        <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.06]">
            {DAYS_TR.map(d => (
              <div key={d} className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest text-center">{d}</div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const key = formatDate(day.date);
              const isToday = key === today;
              const dayEvents = eventsByDate[key] || [];
              return (
                <div key={i}
                  onClick={() => { setSelectedDate(key); }}
                  className={`min-h-[100px] border-b border-r border-white/[0.03] p-1.5 cursor-pointer transition-all hover:bg-white/[0.02] ${
                    !day.inMonth ? 'opacity-30' : ''
                  } ${selectedDate === key ? 'bg-blue-500/[0.06] ring-1 ring-inset ring-blue-500/20' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
                      isToday ? 'bg-blue-500 text-white' : 'text-slate-500'
                    }`}>{day.date.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); openNewEvent(key); }}
                        className="w-4 h-4 rounded-full bg-white/[0.04] text-slate-600 hover:text-white text-xs flex items-center justify-center">+</button>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev: any) => {
                      const tc = TYPE_COLORS[ev.event_type] || TYPE_COLORS.task;
                      return (
                        <button key={ev.id} onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] truncate ${tc.bg} ${tc.text} hover:opacity-80 border-l-2 ${PRIORITY_COLORS[ev.priority] || ''}`}>
                          {ev.title}
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-slate-600 pl-1">+{dayEvents.length - 3} daha</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-500 text-[11px]">
                  {['Başlık', 'Tip', 'Öncelik', 'Durum', 'Tarih', 'İşlem'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-600">
                    <div className="flex items-center justify-center gap-3"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Yükleniyor...</div>
                  </td></tr>
                ) : events.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-600">Etkinlik bulunamadı</td></tr>
                ) : events.map((ev: any) => {
                  const tc = TYPE_COLORS[ev.event_type] || TYPE_COLORS.task;
                  return (
                    <tr key={ev.id} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                      <td className="px-4 py-2.5 text-sm text-white font-medium">{ev.title}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${tc.bg} ${tc.text}`}>{ev.event_type}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${PRIORITY_COLORS[ev.priority]} text-slate-400`}>{ev.priority}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{STATUS_LABELS[ev.status] || ev.status}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{ev.start_date?.split('T')[0]}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => openEditEvent(ev)} className="px-2 py-0.5 text-xs rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">Düzenle</button>
                          <button onClick={() => handleDelete(ev.id)} className="px-2 py-0.5 text-xs rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20">Sil</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected date panel */}
      {selectedDate && view === 'month' && (
        <div className="mt-5 bg-[#161b22] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">{new Date(selectedDate + 'T00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}</h3>
            <button onClick={() => openNewEvent(selectedDate)} className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20">+ Ekle</button>
          </div>
          {(eventsByDate[selectedDate] || []).length === 0 ? (
            <p className="text-sm text-slate-600">Bu günde etkinlik yok</p>
          ) : (
            <div className="space-y-2">
              {(eventsByDate[selectedDate] || []).map((ev: any) => {
                const tc = TYPE_COLORS[ev.event_type] || TYPE_COLORS.task;
                return (
                  <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-xl ${tc.bg} border-l-2 ${PRIORITY_COLORS[ev.priority]}`}>
                    <div className={`w-2 h-2 rounded-full ${tc.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{ev.title}</div>
                      {ev.description && <div className="text-xs text-slate-500 truncate">{ev.description}</div>}
                    </div>
                    <span className="text-[10px] text-slate-600">{STATUS_LABELS[ev.status]}</span>
                    <button onClick={() => openEditEvent(ev)} className="text-xs text-blue-400/60 hover:text-blue-400">Düzenle</button>
                    <button onClick={() => handleDelete(ev.id)} className="text-xs text-red-400/60 hover:text-red-400">Sil</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[#161b22] border border-white/[0.1] rounded-2xl p-6 w-[500px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{editItem ? 'Etkinlik Düzenle' : 'Yeni Etkinlik'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Başlık</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Açıklama</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tip</label>
                  <select value={form.event_type} onChange={e => setForm(p => ({ ...p, event_type: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t === 'task' ? 'Görev' : t === 'milestone' ? 'Dönüm Noktası' : t === 'deadline' ? 'Son Tarih' : 'Toplantı'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Öncelik</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                    {PRIORITIES.map(p => <option key={p} value={p}>{p === 'low' ? 'Düşük' : p === 'medium' ? 'Orta' : p === 'high' ? 'Yüksek' : 'Kritik'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Durum</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Başlangıç</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Bitiş</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-white/[0.04] text-slate-400 text-sm hover:bg-white/[0.08]">İptal</button>
                {editItem && (
                  <button type="button" onClick={() => { handleDelete(editItem.id); setShowForm(false); }}
                    className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20">Sil</button>
                )}
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
                  {editItem ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
