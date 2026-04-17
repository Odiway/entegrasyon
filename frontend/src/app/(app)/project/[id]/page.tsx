'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  getProject, getItems, getStats, getNav, updateItem, getItemHistory,
  exportProject, createTask, getUsers, deleteProject,
} from '@/lib/api';

const KALEM_OPTIONS = ['F', 'Y', 'E', 'H', 'C', 'X DETAY', 'X-Kesilerek Kullanilan'];
const BIRIM_OPTIONS = ['AD', 'KG', 'M', 'M2', 'L', 'D', 'SET', 'LT'];

const LVL: Record<number, any> = {
  0: { badge: 'bg-slate-600/70 text-slate-200', row: '', font: 'text-slate-300 font-semibold' },
  1: { badge: 'bg-indigo-500/80 text-indigo-50', row: 'bg-indigo-500/[0.03]', font: 'text-indigo-200 font-bold text-[13px]' },
  2: { badge: 'bg-blue-500/90 text-white', row: 'bg-blue-500/[0.05]', font: 'text-blue-100 font-bold' },
  3: { badge: 'bg-emerald-500/90 text-white', row: 'bg-emerald-500/[0.04]', font: 'text-emerald-200/90 font-semibold' },
  4: { badge: 'bg-slate-500/50 text-slate-200', row: '', font: 'text-slate-300' },
  5: { badge: 'bg-slate-600/40 text-slate-300', row: '', font: 'text-slate-400' },
};

const KALEM_CLR: Record<string, string> = {
  F: 'bg-violet-500/20 text-violet-300 border-violet-400/25',
  Y: 'bg-blue-500/20 text-blue-300 border-blue-400/25',
  E: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/25',
  H: 'bg-orange-500/20 text-orange-300 border-orange-400/25',
  C: 'bg-pink-500/20 text-pink-300 border-pink-400/25',
  'X DETAY': 'bg-red-500/15 text-red-300 border-red-400/20',
};

const SIP_CLR: Record<string, string> = {
  EVET: 'text-emerald-300', HAYIR: 'text-red-300/80', MONTAJ: 'text-violet-300',
  'KONTROL ED\u0130LECEK': 'text-amber-300', NA: 'text-slate-500',
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = Number(id);
  const tableRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [nav, setNav] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [filterUzmanlik, setFilterUzmanlik] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterMontaj, setFilterMontaj] = useState('');
  const [filterSiparis, setFilterSiparis] = useState('');
  const [filterKalemTipi, setFilterKalemTipi] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(true);
  const [navFilter, setNavFilter] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [engineers, setEngineers] = useState<any[]>([]);
  const [taskCreating, setTaskCreating] = useState(false);

  const [historyItem, setHistoryItem] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const isDesigner = user?.role === 'designer';
  const isEngineer = user?.role === 'integration_engineer';
  const isAdmin = user?.role === 'admin';
  const canSelect = isDesigner || isAdmin;
  const canEdit = isEngineer || isAdmin;

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const loadProject = useCallback(async () => {
    try { setProject(await getProject(projectId)); } catch {}
  }, [projectId]);

  const loadStats = useCallback(async () => {
    try { setStats(await getStats(projectId)); } catch {}
  }, [projectId]);

  const loadNav = useCallback(async () => {
    try { setNav(await getNav(projectId)); } catch {}
  }, [projectId]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const p: any = { offset: page * 200, limit: 200 };
      if (filter === 'review') p.needs_review = 'true';
      if (filter === 'modified') p.status = 'modified';
      if (filterUzmanlik) p.uzmanlik = filterUzmanlik;
      if (filterLevel) p.level = filterLevel;
      if (filterMontaj) p.montaj = filterMontaj;
      if (filterSiparis) p.siparis = filterSiparis;
      if (filterKalemTipi) p.kalem_tipi = filterKalemTipi;
      if (search) p.q = search;
      const res = await getItems(projectId, p);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch { setItems([]); setTotal(0); }
    setLoading(false);
  }, [projectId, filter, filterUzmanlik, filterLevel, filterMontaj, filterSiparis, filterKalemTipi, search, page]);

  useEffect(() => { loadProject(); loadStats(); loadNav(); }, [loadProject, loadStats, loadNav]);
  useEffect(() => { loadItems(); }, [loadItems]);

  useEffect(() => {
    if (canSelect) {
      getUsers().then((data: any) => {
        const list = Array.isArray(data) ? data : data.users || [];
        setEngineers(list.filter((u: any) => u.role === 'integration_engineer'));
      }).catch(() => {});
    }
  }, [canSelect]);

  const activeFilters = useMemo(() => {
    const f: { key: string; label: string; color: string; onClear: () => void }[] = [];
    if (filterUzmanlik) f.push({ key: 'uz', label: filterUzmanlik, color: 'blue', onClear: () => { setFilterUzmanlik(''); setPage(0); } });
    if (filterMontaj) f.push({ key: 'mo', label: filterMontaj, color: 'emerald', onClear: () => { setFilterMontaj(''); setPage(0); } });
    if (filterSiparis) f.push({ key: 'si', label: 'Sipari\u015F: ' + filterSiparis, color: 'violet', onClear: () => { setFilterSiparis(''); setPage(0); } });
    if (filterKalemTipi) f.push({ key: 'kt', label: 'KT: ' + filterKalemTipi, color: 'amber', onClear: () => { setFilterKalemTipi(''); setPage(0); } });
    if (filterLevel) f.push({ key: 'lv', label: 'Level ' + filterLevel, color: 'orange', onClear: () => { setFilterLevel(''); setPage(0); } });
    return f;
  }, [filterUzmanlik, filterMontaj, filterSiparis, filterKalemTipi, filterLevel]);

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({
      kalemTipi: item.kalemTipi || '',
      birim: item.birim || '',
      siparis: item.siparis || '',
      dagitim: item.dagitim || '',
      malzemeNoSap: item.malzemeNoSap || '',
      quantity: item.quantity ?? '',
      toplamMiktar: item.toplamMiktar ?? '',
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (itemId: number) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      const changes: any = {};
      for (const [k, v] of Object.entries(editForm)) {
        const orig = item[k] ?? '';
        if (String(v) !== String(orig)) {
          if (k === 'quantity' || k === 'toplamMiktar') {
            const num = parseFloat(v as string);
            if (!isNaN(num)) changes[k] = num;
          } else {
            changes[k] = v;
          }
        }
      }
      if (Object.keys(changes).length === 0) { cancelEdit(); return; }
      await updateItem(projectId, itemId, changes);
      showMsg('ok', 'Kay\u0131t g\u00fcncellendi');
      cancelEdit();
      await loadItems();
      await loadStats();
    } catch (e: any) {
      showMsg('err', e.message || 'G\u00fcncelleme hatas\u0131');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedItems(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleCreateTask = async () => {
    if (!taskTitle || selectedItems.size === 0) return;
    setTaskCreating(true);
    try {
      await createTask({
        projectId,
        assignedToId: taskAssignee ? parseInt(taskAssignee) : undefined,
        title: taskTitle,
        description: taskDesc || undefined,
        priority: taskPriority,
        bomItemIds: Array.from(selectedItems),
      });
      showMsg('ok', 'G\u00f6rev olu\u015Fturuldu (' + selectedItems.size + ' kalem)');
      setSelectedItems(new Set());
      setShowTaskModal(false);
      setTaskTitle(''); setTaskDesc(''); setTaskAssignee(''); setTaskPriority('medium');
    } catch (e: any) {
      showMsg('err', e.message || 'G\u00f6rev olu\u015Fturulamad\u0131');
    }
    setTaskCreating(false);
  };

  const showHistory = async (item: any) => {
    setHistoryItem(item);
    try {
      const logs = await getItemHistory(projectId, item.id);
      setHistoryData(Array.isArray(logs) ? logs : logs.logs || []);
    } catch { setHistoryData([]); }
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportProject(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (project?.name || 'export') + '.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      showMsg('err', e.message || 'Excel indirme hatas\u0131');
    }
    setExporting(false);
  };

  const handleDeleteProject = async () => {
    if (!confirm('Bu projeyi silmek istedi\u011Finize emin misiniz?')) return;
    try {
      await deleteProject(projectId);
      router.push('/projects');
    } catch (e: any) { showMsg('err', e.message || 'Silme hatas\u0131'); }
  };

  const clearAllFilters = () => {
    setFilterUzmanlik(''); setFilterMontaj(''); setFilterSiparis('');
    setFilterKalemTipi(''); setFilterLevel(''); setFilter('all'); setSearch(''); setPage(0);
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalRows = stats?.total || project.totalRows || 0;
  const needsReview = stats?.needsReview || 0;
  const modified = stats?.modified || 0;
  const resolved = totalRows - needsReview;
  const progress = totalRows > 0 ? Math.round((resolved / totalRows) * 100) : 0;
  const totalPages = Math.max(1, Math.ceil(total / 200));

  return (
    <div className="flex h-[calc(100vh)] overflow-hidden">
      {navOpen && (
        <div className="w-72 shrink-0 border-r border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl flex flex-col">
          <div className="p-4 border-b border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Navigasyon</span>
              <button onClick={() => setNavOpen(false)} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.08]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="relative">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" /><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input type="text" placeholder="Filtrele..." value={navFilter} onChange={e => setNavFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-white/[0.05] text-slate-300 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 placeholder-slate-600 transition-all" />
            </div>
            {(filterUzmanlik || filterMontaj) && (
              <button onClick={() => { setFilterUzmanlik(''); setFilterMontaj(''); setFilterSiparis(''); setFilterKalemTipi(''); setPage(0); }}
                className="mt-2 w-full text-center text-[11px] text-red-400/80 hover:text-red-300 transition-colors py-1 rounded-lg hover:bg-red-500/10">Filtreleri temizle</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <button onClick={() => { setFilterUzmanlik(''); setFilterMontaj(''); setPage(0); }}
              className={`w-full text-left px-4 py-3 text-xs border-b border-white/[0.05] transition-all ${!filterUzmanlik && !filterMontaj ? 'bg-gradient-to-r from-blue-500/15 to-transparent text-blue-200 border-l-2 border-l-blue-400' : 'text-slate-400 hover:bg-white/[0.04]'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">T\u00fcm\u00fc</span>
                <span className="text-[10px] text-slate-500 bg-white/[0.06] px-2 py-0.5 rounded-full font-mono">{totalRows.toLocaleString('tr-TR')}</span>
              </div>
            </button>
            {nav.filter(n => !navFilter || n.uzmanlik?.toLowerCase().includes(navFilter.toLowerCase()) || n.montajlar?.some((m: string) => m.toLowerCase().includes(navFilter.toLowerCase()))).map((group: any) => (
              <div key={group.uzmanlik}>
                <button onClick={() => { setFilterUzmanlik(group.uzmanlik === filterUzmanlik ? '' : group.uzmanlik); setFilterMontaj(''); setPage(0); }}
                  className={`w-full text-left px-4 py-3 text-xs border-b border-white/[0.04] transition-all flex items-center justify-between group ${filterUzmanlik === group.uzmanlik ? 'bg-gradient-to-r from-blue-500/15 to-transparent border-l-2 border-l-blue-400' : 'hover:bg-white/[0.04]'}`}>
                  <span className="text-blue-200/90 font-semibold group-hover:text-blue-100">{group.uzmanlik || 'Di\u011Fer'}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 bg-white/[0.05] px-2 py-0.5 rounded-full">{group.montajlar?.length || 0}</span>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`text-slate-600 transition-transform ${filterUzmanlik === group.uzmanlik ? 'rotate-90' : ''}`}>
                      <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                </button>
                {(filterUzmanlik === group.uzmanlik || navFilter) && group.montajlar?.map((m: string) => (
                  <button key={m} onClick={() => { setFilterMontaj(m === filterMontaj ? '' : m); setPage(0); }}
                    className={`w-full text-left px-4 py-2 text-[11px] border-b border-white/[0.03] transition-all pl-7 ${filterMontaj === m ? 'bg-gradient-to-r from-emerald-500/15 to-transparent text-emerald-300 border-l-2 border-l-emerald-400' : 'text-slate-500 hover:bg-emerald-500/[0.05] hover:text-emerald-300/80'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${filterMontaj === m ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                      <span className="truncate">{m}</span>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 max-w-[1600px] mx-auto">
          {msg && (
            <div className={`fixed top-4 right-4 z-50 px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl flex items-center gap-2.5 animate-slide-up backdrop-blur-2xl ${msg.type === 'ok' ? 'bg-emerald-500/90 text-white shadow-[0_4px_24px_rgba(16,185,129,0.4)]' : 'bg-red-500/90 text-white shadow-[0_4px_24px_rgba(239,68,68,0.4)]'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">{msg.type === 'ok' ? '\u2713' : '!'}</span>
              {msg.text}
            </div>
          )}

          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {!navOpen && (
                <button onClick={() => setNavOpen(true)} className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.1] transition-all">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              )}
              <div>
                <button onClick={() => router.push('/projects')} className="text-[11px] text-blue-400/70 hover:text-blue-300 mb-1 transition-colors flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                  BOM Projeleri
                </button>
                <h1 className="text-2xl font-bold text-white/90 tracking-tight">{project.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-500 font-mono">{project.filename}</span>
                  <span className="text-slate-700">&middot;</span>
                  <span className="text-[11px] text-slate-500">{new Date(project.createdAt).toLocaleDateString('tr-TR')}</span>
                  <span className="text-slate-700">&middot;</span>
                  <span className="text-[11px] text-slate-500">{project.uploadedBy}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canSelect && selectedItems.size > 0 && (
                <button onClick={() => setShowTaskModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-purple-500/15 border border-purple-400/30 text-purple-300 hover:bg-purple-500/25 hover:border-purple-400/50 text-sm font-medium transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  G\u00f6rev Ata ({selectedItems.size})
                </button>
              )}
              <button onClick={handleExport} disabled={exporting}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/12 border border-emerald-400/25 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/40 text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-40">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M3 6l4 4 4-4M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {exporting ? '\u0130ndiriliyor...' : 'Excel'}
              </button>
              {isAdmin && (
                <button onClick={handleDeleteProject} className="p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Projeyi Sil">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1m2 0v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4h8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-4">
            <StatCard label="Toplam Sat\u0131r" value={totalRows} color="text-white/90" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>} />
            <StatCard label="\u0130ncelenmesi Gereken" value={needsReview} color="text-amber-300" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" /><path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>} />
            <StatCard label="De\u011Fi\u015Ftirilmi\u015F" value={modified} color="text-purple-300" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>} />
            <StatCard label="Tamamlanan" value={resolved} color="text-emerald-300" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">\u0130lerleme</p>
                <span className={`text-lg font-bold ${progress === 100 ? 'text-emerald-300' : 'text-white/90'}`}>%{progress}</span>
              </div>
              <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400'}`} style={{ width: progress + '%' }} />
              </div>
            </div>
          </div>

          {stats?.bySiparis && stats.bySiparis.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-1">Sipari\u015F:</span>
              {stats.bySiparis.map((s: any) => {
                const clr: Record<string, string> = { EVET: 'emerald', HAYIR: 'red', MONTAJ: 'violet', 'KONTROL ED\u0130LECEK': 'amber', NA: 'slate' };
                const c = clr[s.siparis] || 'slate';
                const active = filterSiparis === s.siparis;
                return (
                  <button key={s.siparis} onClick={() => { setFilterSiparis(active ? '' : s.siparis); setPage(0); }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-' + c + '-500/20 text-' + c + '-300 border border-' + c + '-400/30' : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-slate-200'}`}>
                    <span className={'w-1.5 h-1.5 rounded-full bg-' + c + '-400'} />
                    {s.siparis}
                    <span className="text-[10px] opacity-60 font-mono">{s.count.toLocaleString('tr-TR')}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
                {[['all', 'T\u00fcm\u00fc', total], ['review', '\u0130ncele', needsReview], ['modified', 'De\u011Fi\u015Fen', modified]].map(([k, l, c]) => (
                  <button key={k as string} onClick={() => { setFilter(k as string); setPage(0); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${filter === k ? 'bg-blue-500/20 text-blue-200 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                    {l} <span className="text-[10px] opacity-50 font-mono">{c}</span>
                  </button>
                ))}
              </div>

              <div className="w-px h-6 bg-white/[0.08] mx-1" />

              <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setPage(0); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-300 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 backdrop-blur-sm cursor-pointer">
                <option value="">T\u00fcm Seviyeler</option>
                {[0,1,2,3,4,5,6,7,8].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
              <select value={filterSiparis} onChange={e => { setFilterSiparis(e.target.value); setPage(0); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-300 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 backdrop-blur-sm cursor-pointer">
                <option value="">T\u00fcm Sipari\u015F</option>
                {['EVET', 'HAYIR', 'MONTAJ', 'KONTROL ED\u0130LECEK', 'NA'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterKalemTipi} onChange={e => { setFilterKalemTipi(e.target.value); setPage(0); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-300 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 backdrop-blur-sm cursor-pointer">
                <option value="">T\u00fcm Kalem Tipi</option>
                {['F', 'Y', 'E', 'H', 'C', 'X DETAY', 'X-Kesilerek Kullanilan'].map(k => <option key={k} value={k}>{k}</option>)}
              </select>

              <div className="relative flex-1 min-w-[200px]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" /><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Title, malzeme no ara..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-200 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 placeholder-slate-600 backdrop-blur-sm transition-all" />
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                {activeFilters.map(f => (
                  <span key={f.key} className={'px-2.5 py-1 rounded-lg text-[10px] font-medium bg-' + f.color + '-500/15 text-' + f.color + '-300 border border-' + f.color + '-400/20 flex items-center gap-1.5 backdrop-blur-sm'}>
                    {f.label}
                    <button onClick={f.onClear} className="hover:text-white transition-colors">&times;</button>
                  </span>
                ))}
                {activeFilters.length > 1 && (
                  <button onClick={clearAllFilters} className="text-[10px] text-red-400/70 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all">Temizle</button>
                )}
                <span className="text-[11px] text-slate-500 font-mono ml-1">{total.toLocaleString('tr-TR')} kay\u0131t</span>
              </div>
            </div>
          </div>

          <div ref={tableRef} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.1] bg-white/[0.03]">
                    {canSelect && (
                      <th className="px-3 py-3.5 w-10">
                        <input type="checkbox" className="accent-purple-400 w-3.5 h-3.5 rounded cursor-pointer" checked={selectedItems.size > 0 && selectedItems.size === items.length}
                          onChange={e => { if (e.target.checked) setSelectedItems(new Set(items.map(i => i.id))); else setSelectedItems(new Set()); }} />
                      </th>
                    )}
                    {['#','Lv','Uzmanl\u0131k','Montaj','Title','MalzNo SAP','Kalem Tipi','Sipari\u015F','Da\u011F\u0131t\u0131m','Birim','Qty','Toplam','Durum',''].map(h => (
                      <th key={h} className="px-3 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={16} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-slate-500 text-sm">Y\u00fckleniyor...</span>
                      </div>
                    </td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={16} className="text-center py-20">
                      <div className="text-5xl mb-3 opacity-20">{'\uD83D\uDCCB'}</div>
                      <p className="text-slate-400 text-sm mb-1">Kay\u0131t bulunamad\u0131</p>
                      <p className="text-slate-600 text-xs">Filtrelerinizi de\u011Fi\u015Ftirmeyi deneyin</p>
                    </td></tr>
                  ) : items.map(item => {
                    const lvl = LVL[item.level] || LVL[5];
                    const isEditing = editingId === item.id;
                    const isModified = item.status === 'modified' || item.updatedAt;
                    const kalemClr = KALEM_CLR[item.kalemTipi] || 'bg-slate-700/40 text-slate-400 border-slate-600/30';
                    return (
                      <tr key={item.id}
                        className={`border-b transition-colors duration-150 group
                          ${item.level === 2 ? 'border-blue-400/15 ' + lvl.row : item.level === 3 ? 'border-emerald-400/10 ' + lvl.row : 'border-white/[0.04]'}
                          ${item.needsReview ? 'bg-amber-500/[0.03]' : ''}
                          ${isModified ? 'bg-purple-500/[0.03]' : ''}
                          hover:bg-white/[0.06]`}>
                        {canSelect && (
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleSelect(item.id)}
                              className="accent-purple-400 w-3.5 h-3.5 rounded cursor-pointer" />
                          </td>
                        )}
                        <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{item.rowNumber}</td>
                        <td className="px-3 py-2"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ${lvl.badge}`}>{item.level}</span></td>
                        <td className="px-3 py-2 text-[11px] text-slate-400 whitespace-nowrap">{item.uzmanlik || ''}</td>
                        <td className="px-3 py-2 text-[11px] text-slate-500 max-w-[110px] truncate">{item.montaj || ''}</td>
                        <td className={`px-3 py-2 font-mono text-[11px] max-w-[250px] ${lvl.font}`} style={{ paddingLeft: Math.max(12, item.level * 14) }}>
                          <span className="truncate block">{item.title}</span>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-500 font-mono max-w-[110px] truncate">
                          {isEditing ? (
                            <input value={editForm.malzemeNoSap} onChange={e => setEditForm({...editForm, malzemeNoSap: e.target.value})}
                              className="bg-white/[0.08] border border-blue-400/30 rounded-md px-2 py-1 text-[11px] w-28 text-white focus:outline-none focus:border-blue-400/60" />
                          ) : (item.malzemeNoSap || '')}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <select value={editForm.kalemTipi} onChange={e => setEditForm({...editForm, kalemTipi: e.target.value})}
                              className="bg-white/[0.08] border border-blue-400/30 rounded-md px-1.5 py-1 text-[11px] w-20 text-white focus:outline-none">
                              <option value="">--</option>{KALEM_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                          ) : (
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${kalemClr}`}>
                              {item.kalemTipi || '\u2014'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input value={editForm.siparis} onChange={e => setEditForm({...editForm, siparis: e.target.value})}
                              className="bg-white/[0.08] border border-blue-400/30 rounded-md px-2 py-1 text-[11px] w-24 text-white focus:outline-none" />
                          ) : <span className={`text-[11px] font-semibold ${SIP_CLR[item.siparis] || 'text-slate-400'}`}>{item.siparis || ''}</span>}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input value={editForm.dagitim} onChange={e => setEditForm({...editForm, dagitim: e.target.value})}
                              className="bg-white/[0.08] border border-blue-400/30 rounded-md px-2 py-1 text-[11px] w-20 text-white focus:outline-none" />
                          ) : <span className="text-[11px] text-slate-500">{item.dagitim || ''}</span>}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <select value={editForm.birim} onChange={e => setEditForm({...editForm, birim: e.target.value})}
                              className="bg-white/[0.08] border border-blue-400/30 rounded-md px-1.5 py-1 text-[11px] w-14 text-white focus:outline-none">
                              <option value="">--</option>{BIRIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          ) : <span className="text-[11px] text-slate-500">{item.birim || ''}</span>}
                        </td>
                        <td className="px-3 py-2 text-[11px] font-mono text-slate-400">
                          {isEditing ? (
                            <input type="number" step="any" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: e.target.value})}
                              className="bg-white/[0.08] border border-blue-400/30 rounded-md px-2 py-1 text-[11px] w-18 text-white focus:outline-none" />
                          ) : (item.quantity ?? '')}
                        </td>
                        <td className="px-3 py-2 text-[11px] font-mono text-emerald-300/80 font-medium">
                          {isEditing ? (
                            <input type="number" step="any" value={editForm.toplamMiktar} onChange={e => setEditForm({...editForm, toplamMiktar: e.target.value})}
                              className="bg-white/[0.08] border border-blue-400/30 rounded-md px-2 py-1 text-[11px] w-18 text-white focus:outline-none" />
                          ) : (item.toplamMiktar ?? '')}
                        </td>
                        <td className="px-3 py-2">
                          {isModified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-400/20">
                              <span className="w-1 h-1 rounded-full bg-purple-400" /> de\u011Fi\u015Fti
                            </span>
                          )}
                          {item.needsReview && !isModified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-400/20">
                              <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" /> incele
                            </span>
                          )}
                          {!isModified && !item.needsReview && <span className="text-emerald-400/40 text-xs">{'\u2713'}</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => saveEdit(item.id)} className="px-3 py-1 text-[10px] rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold transition-all border border-emerald-400/20">Kaydet</button>
                              <button onClick={cancelEdit} className="px-2.5 py-1 text-[10px] rounded-md bg-white/[0.06] text-slate-400 hover:bg-white/[0.1] transition-all">\u0130ptal</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {canEdit && item.level >= 2 && (
                                <button onClick={() => startEdit(item)} className="px-3 py-1 text-[10px] rounded-md bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 font-semibold transition-all border border-blue-400/20">D\u00fczenle</button>
                              )}
                              {isModified && (
                                <button onClick={() => showHistory(item)} className="px-2.5 py-1 text-[10px] rounded-md bg-purple-500/12 text-purple-300 hover:bg-purple-500/20 transition-all border border-purple-400/15">Ge\u00e7mi\u015F</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.08] px-5 py-3 bg-white/[0.02]">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="px-4 py-2 text-xs rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] disabled:opacity-20 text-slate-300 transition-all font-medium flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                \u00d6nceki
              </button>
              <div className="flex items-center gap-2">
                {totalPages <= 7 ? (
                  Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === i ? 'bg-blue-500/25 text-blue-200 border border-blue-400/30' : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'}`}>
                      {i + 1}
                    </button>
                  ))
                ) : (
                  <>
                    {[0, 1].map(i => (
                      <button key={i} onClick={() => setPage(i)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === i ? 'bg-blue-500/25 text-blue-200 border border-blue-400/30' : 'text-slate-500 hover:bg-white/[0.06]'}`}>
                        {i + 1}
                      </button>
                    ))}
                    {page > 2 && <span className="text-slate-700 text-xs px-1">...</span>}
                    {page > 1 && page < totalPages - 2 && (
                      <button className="w-8 h-8 rounded-lg text-xs font-medium bg-blue-500/25 text-blue-200 border border-blue-400/30">{page + 1}</button>
                    )}
                    {page < totalPages - 3 && <span className="text-slate-700 text-xs px-1">...</span>}
                    {[totalPages - 2, totalPages - 1].filter(i => i > 1).map(i => (
                      <button key={i} onClick={() => setPage(i)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === i ? 'bg-blue-500/25 text-blue-200 border border-blue-400/30' : 'text-slate-500 hover:bg-white/[0.06]'}`}>
                        {i + 1}
                      </button>
                    ))}
                  </>
                )}
              </div>
              <button onClick={() => setPage(page + 1)} disabled={items.length < 200}
                className="px-4 py-2 text-xs rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] disabled:opacity-20 text-slate-300 transition-all font-medium flex items-center gap-1.5">
                Sonraki
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M4 2l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg" onClick={() => setShowTaskModal(false)}>
          <div className="bg-[#0d1117]/95 border border-white/[0.1] rounded-3xl p-7 w-full max-w-md shadow-2xl animate-slide-up relative backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
            <h3 className="text-xl font-bold text-white/90 mb-1">G\u00f6rev Olu\u015Ftur</h3>
            <p className="text-xs text-slate-400 mb-6">{selectedItems.size} kalem se\u00e7ili</p>
            <div className="space-y-4">
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="G\u00f6rev ba\u015Fl\u0131\u011F\u0131"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-purple-400/40 text-sm" />
              <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="A\u00e7\u0131klama (opsiyonel)"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-purple-400/40 text-sm h-24 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-300 focus:outline-none text-sm">
                  <option value="">M\u00fchendis se\u00e7...</option>
                  {engineers.map(e => <option key={e.id} value={e.id}>{e.full_name || e.fullName}</option>)}
                </select>
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-300 focus:outline-none text-sm">
                  <option value="low">D\u00fc\u015F\u00fck</option><option value="medium">Orta</option><option value="high">Y\u00fcksek</option><option value="critical">Kritik</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowTaskModal(false)} className="px-5 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/[0.06] transition-all">\u0130ptal</button>
              <button onClick={handleCreateTask} disabled={!taskTitle || taskCreating}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-purple-500/80 text-white hover:bg-purple-500 disabled:opacity-40 transition-all">
                {taskCreating ? 'Olu\u015Fturuluyor...' : 'G\u00f6rev Olu\u015Ftur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg" onClick={() => setHistoryItem(null)}>
          <div className="bg-[#0d1117]/95 border border-white/[0.1] rounded-3xl p-7 w-full max-w-lg max-h-[70vh] overflow-y-auto shadow-2xl animate-slide-up relative backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
            <h3 className="text-xl font-bold text-white/90 mb-1">De\u011Fi\u015Fiklik Ge\u00e7mi\u015Fi</h3>
            <p className="text-xs text-slate-400 mb-5">#{historyItem.rowNumber} &middot; {historyItem.title}</p>
            {historyData.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Hen\u00fcz de\u011Fi\u015Fiklik yok</p>
            ) : (
              <div className="space-y-3">
                {historyData.map((log: any, i: number) => (
                  <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-purple-300">{log.fieldName}</span>
                      <span className="text-[10px] text-slate-500">{new Date(log.changedAt).toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-300/70 line-through">{log.oldValue || '\u2014'}</span>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 5h4M5.5 3l2 2-2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>
                      <span className="text-emerald-300 font-medium">{log.newValue || '\u2014'}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">{log.changedBy?.fullName || ''}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setHistoryItem(null)} className="mt-5 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/[0.06] w-full transition-all font-medium">Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 backdrop-blur-sm hover:bg-white/[0.06] transition-all group">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-slate-500 group-hover:text-slate-400 transition-colors">{icon}</span>
        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{(value || 0).toLocaleString('tr-TR')}</p>
    </div>
  );
}