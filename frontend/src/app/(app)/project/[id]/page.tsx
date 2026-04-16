'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  getProject, getItems, getStats, getNav, updateItem, getItemHistory,
  exportProjectUrl, createTask, getUsers, deleteProject,
} from '@/lib/api';

const KALEM_OPTIONS = ['F', 'Y', 'E', 'H', 'C', 'X DETAY', 'X-Kesilerek Kullanilan'];
const BIRIM_OPTIONS = ['AD', 'KG', 'M', 'M2', 'L', 'D', 'SET', 'LT'];

const LVL: Record<number, any> = {
  0: { badge: 'bg-slate-700/80 text-slate-300', row: 'bg-slate-800/30', font: 'text-slate-400 font-semibold' },
  1: { badge: 'bg-indigo-600/80 text-indigo-100', row: 'bg-indigo-500/[0.04]', font: 'text-indigo-300 font-bold text-[13px]' },
  2: { badge: 'bg-blue-600/90 text-white', row: 'bg-blue-500/[0.06]', font: 'text-blue-200 font-bold' },
  3: { badge: 'bg-emerald-500/90 text-white', row: 'bg-emerald-500/[0.04]', font: 'text-emerald-300/90 font-semibold' },
  4: { badge: 'bg-slate-600/60 text-slate-300', row: '', font: 'text-slate-400' },
  5: { badge: 'bg-slate-700/50 text-slate-400', row: '', font: 'text-slate-500' },
};

const SIP_CLR: Record<string, string> = {
  EVET: 'text-emerald-400', HAYIR: 'text-red-400/70', MONTAJ: 'text-violet-400',
  'KONTROL EDİLECEK': 'text-amber-400', NA: 'text-slate-700',
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = Number(id);

  const [project, setProject] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [nav, setNav] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [filterUzmanlik, setFilterUzmanlik] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterMontaj, setFilterMontaj] = useState('');
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
      if (search) p.q = search;
      const res = await getItems(projectId, p);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch { setItems([]); setTotal(0); }
    setLoading(false);
  }, [projectId, filter, filterUzmanlik, filterLevel, filterMontaj, search, page]);

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

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({
      kalemTipi: item.kalemTipi || '',
      birim: item.birim || '',
      siparis: item.siparis || '',
      dagitim: item.dagitim || '',
      malzemeNoSap: item.malzemeNoSap || '',
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (itemId: number) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      const changes: any = {};
      for (const [k, v] of Object.entries(editForm)) {
        if (v !== (item[k] || '')) changes[k] = v;
      }
      if (Object.keys(changes).length === 0) { cancelEdit(); return; }
      await updateItem(projectId, itemId, changes);
      showMsg('ok', 'Kayıt güncellendi');
      cancelEdit();
      await loadItems();
      await loadStats();
    } catch (e: any) {
      showMsg('err', e.message || 'Güncelleme hatası');
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
      showMsg('ok', `Görev oluşturuldu (${selectedItems.size} kalem)`);
      setSelectedItems(new Set());
      setShowTaskModal(false);
      setTaskTitle(''); setTaskDesc(''); setTaskAssignee(''); setTaskPriority('medium');
    } catch (e: any) {
      showMsg('err', e.message || 'Görev oluşturulamadı');
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

  const handleDeleteProject = async () => {
    if (!confirm('Bu projeyi silmek istediğinize emin misiniz?')) return;
    try {
      await deleteProject(projectId);
      router.push('/projects');
    } catch (e: any) { showMsg('err', e.message || 'Silme hatası'); }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalRows = stats?.total || project.totalRows || 0;
  const needsReview = stats?.needsReview || 0;
  const modified = stats?.modified || 0;
  const resolved = totalRows - needsReview;
  const progress = totalRows > 0 ? Math.round((resolved / totalRows) * 100) : 0;

  return (
    <div className="flex h-[calc(100vh)] overflow-hidden">
      {navOpen && (
        <div className="w-64 shrink-0 border-r border-white/[0.06] bg-[#0d1117] flex flex-col">
          <div className="p-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Uzmanlık / Montaj</span>
              <button onClick={() => setNavOpen(false)} className="text-slate-600 hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <input type="text" placeholder="Filtrele..." value={navFilter} onChange={e => setNavFilter(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/30" />
            {(filterUzmanlik || filterMontaj) && (
              <button onClick={() => { setFilterUzmanlik(''); setFilterMontaj(''); setPage(0); }}
                className="mt-2 w-full text-center text-[10px] text-red-400/70 hover:text-red-400">Filtreleri temizle</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <button onClick={() => { setFilterUzmanlik(''); setFilterMontaj(''); setPage(0); }}
              className={`w-full text-left px-3 py-2 text-xs border-b border-white/[0.04] transition ${!filterUzmanlik && !filterMontaj ? 'bg-blue-500/10 text-blue-300' : 'text-slate-500 hover:bg-white/[0.03]'}`}>
              Tümü <span className="text-[10px] text-slate-600 ml-1">({totalRows})</span>
            </button>
            {nav.filter(n => !navFilter || n.uzmanlik?.toLowerCase().includes(navFilter.toLowerCase()) || n.montajlar?.some((m: string) => m.toLowerCase().includes(navFilter.toLowerCase()))).map((group: any) => (
              <div key={group.uzmanlik}>
                <button onClick={() => { setFilterUzmanlik(group.uzmanlik === filterUzmanlik ? '' : group.uzmanlik); setFilterMontaj(''); setPage(0); }}
                  className={`w-full text-left px-3 py-2 text-xs border-b border-white/[0.04] transition flex items-center justify-between ${filterUzmanlik === group.uzmanlik ? 'bg-blue-500/10' : 'hover:bg-white/[0.03]'}`}>
                  <span className="text-blue-300/90 font-medium">{group.uzmanlik || 'Diğer'}</span>
                  <span className="text-[10px] text-slate-600">{group.montajlar?.length || 0}</span>
                </button>
                {(filterUzmanlik === group.uzmanlik || navFilter) && group.montajlar?.map((m: string) => (
                  <button key={m} onClick={() => { setFilterMontaj(m === filterMontaj ? '' : m); setPage(0); }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] border-b border-white/[0.02] transition pl-6 ${filterMontaj === m ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:bg-emerald-500/[0.04] hover:text-emerald-400/70'}`}>
                    <span className="truncate block">{m}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 max-w-[1500px] mx-auto">
          {msg && (
            <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl flex items-center gap-2 ${msg.type === 'ok' ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'}`}>
              {msg.type === 'ok' ? '✓' : '⚠'} {msg.text}
            </div>
          )}

          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              {!navOpen && (
                <button onClick={() => setNavOpen(true)} className="p-2 rounded-lg bg-white/[0.04] text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              )}
              <div>
                <button onClick={() => router.push('/projects')} className="text-[11px] text-slate-600 hover:text-blue-400 mb-0.5 block transition-colors">← BOM Projeleri</button>
                <h1 className="text-xl font-bold text-white">{project.name}</h1>
                <p className="text-[11px] text-slate-600 mt-0.5">{project.filename} · {new Date(project.createdAt).toLocaleDateString('tr-TR')} · {project.uploadedBy}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canSelect && selectedItems.size > 0 && (
                <button onClick={() => setShowTaskModal(true)}
                  className="px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 text-sm font-medium transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  Görev Ata ({selectedItems.size})
                </button>
              )}
              <a href={exportProjectUrl(projectId) + '?t=' + Date.now()}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium transition-all flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M3 6l4 4 4-4M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Excel
              </a>
              {isAdmin && (
                <button onClick={handleDeleteProject} className="p-2 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Projeyi Sil">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1m2 0v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4h8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-5">
            <StatCard label="Toplam Satır" value={totalRows} color="text-white" />
            <StatCard label="İncelenmesi Gereken" value={needsReview} color="text-amber-400" />
            <StatCard label="Değiştirilmiş" value={modified} color="text-purple-400" />
            <StatCard label="Tamamlanan" value={resolved} color="text-emerald-400" />
            <div className="bg-[#161b22] border border-white/[0.06] rounded-xl p-3">
              <p className="text-[10px] text-slate-500 font-medium mb-1.5">İlerleme</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} style={{ width: progress + '%' }} />
                </div>
                <span className={`text-sm font-bold ${progress === 100 ? 'text-emerald-400' : 'text-white'}`}>%{progress}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {[['all', 'Tümü', total], ['review', 'İncele', needsReview], ['modified', 'Değişen', modified]].map(([k, l, c]) => (
              <button key={k as string} onClick={() => { setFilter(k as string); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${filter === k ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]'}`}>
                {l} <span className="text-[10px] opacity-60">{c}</span>
              </button>
            ))}
            <div className="w-px h-5 bg-white/[0.06] mx-1" />
            <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setPage(0); }}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.03] text-slate-400 border border-white/[0.06] focus:outline-none focus:border-blue-500/30">
              <option value="">Tüm Seviyeler</option>
              {[0,1,2,3,4,5,6,7,8].map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
            <div className="relative flex-1 max-w-xs">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" /><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Title, malzeme no ara..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/[0.03] text-slate-300 border border-white/[0.06] focus:outline-none focus:border-blue-500/30 placeholder-slate-600" />
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {filterUzmanlik && <span className="px-2 py-1 rounded-md text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/20 flex items-center gap-1">{filterUzmanlik} <button onClick={() => { setFilterUzmanlik(''); setPage(0); }} className="hover:text-white">×</button></span>}
              {filterMontaj && <span className="px-2 py-1 rounded-md text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">{filterMontaj} <button onClick={() => { setFilterMontaj(''); setPage(0); }} className="hover:text-white">×</button></span>}
              <span className="text-[11px] text-slate-600 font-mono">{total.toLocaleString('tr-TR')} kayıt</span>
            </div>
          </div>

          <div className="bg-[#161b22] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#0d1117]/60">
                    {canSelect && <th className="px-2 py-3 w-8"><input type="checkbox" className="accent-purple-500 w-3.5 h-3.5" checked={selectedItems.size > 0 && selectedItems.size === items.length} onChange={e => { if (e.target.checked) setSelectedItems(new Set(items.map(i => i.id))); else setSelectedItems(new Set()); }} /></th>}
                    {['#','Lv','Uzmanlık','Montaj','Title','MalzNo SAP','Kalem Tipi','Sipariş','Dağıtım','Birim','Qty','Toplam','Durum',''].map(h => (
                      <th key={h} className="px-2 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={16} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /><span className="text-slate-600 text-[11px]">Yükleniyor...</span></div>
                    </td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={16} className="text-center py-16"><div className="text-4xl mb-3 opacity-10">📋</div><p className="text-slate-600 text-sm">Kayıt bulunamadı</p></td></tr>
                  ) : items.map(item => {
                    const lvl = LVL[item.level] || LVL[5];
                    const isEditing = editingId === item.id;
                    const isModified = item.status === 'modified' || item.updatedAt;
                    return (
                      <tr key={item.id} className={`border-b transition-all ${item.level === 2 ? 'border-blue-500/15 ' + lvl.row : item.level === 3 ? 'border-emerald-500/10 ' + lvl.row : 'border-white/[0.03]'} ${item.needsReview ? 'ring-1 ring-inset ring-amber-500/10' : ''} ${isModified ? 'ring-1 ring-inset ring-purple-500/10' : ''} hover:bg-white/[0.02]`}>
                        {canSelect && <td className="px-2 py-1"><input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleSelect(item.id)} className="accent-purple-500 w-3.5 h-3.5" /></td>}
                        <td className="px-2 py-1 text-slate-700 font-mono text-[10px]">{item.rowNumber}</td>
                        <td className="px-2 py-1"><span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold ${lvl.badge}`}>{item.level}</span></td>
                        <td className="px-2 py-1 text-[11px] text-slate-500 whitespace-nowrap">{item.uzmanlik || ''}</td>
                        <td className="px-2 py-1 text-[11px] text-slate-600 max-w-[100px] truncate">{item.montaj || ''}</td>
                        <td className={`px-2 py-1 font-mono text-[11px] max-w-[220px] ${lvl.font}`} style={{ paddingLeft: Math.max(8, item.level * 12) }}><span className="truncate block">{item.title}</span></td>
                        <td className="px-2 py-1 text-[11px] text-slate-600 font-mono max-w-[100px] truncate">{isEditing ? <input value={editForm.malzemeNoSap} onChange={e => setEditForm({...editForm, malzemeNoSap: e.target.value})} className="bg-slate-800 border border-blue-500/30 rounded px-1.5 py-0.5 text-[11px] w-24 text-white focus:outline-none" /> : (item.malzemeNoSap || '')}</td>
                        <td className="px-2 py-1">{isEditing ? <select value={editForm.kalemTipi} onChange={e => setEditForm({...editForm, kalemTipi: e.target.value})} className="bg-slate-800 border border-blue-500/30 rounded px-1 py-0.5 text-[11px] w-16 text-white focus:outline-none"><option value="">--</option>{KALEM_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}</select> : <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800/50 text-slate-400 border border-slate-700/30">{item.kalemTipi || '—'}</span>}</td>
                        <td className="px-2 py-1">{isEditing ? <input value={editForm.siparis} onChange={e => setEditForm({...editForm, siparis: e.target.value})} className="bg-slate-800 border border-blue-500/30 rounded px-1.5 py-0.5 text-[11px] w-20 text-white focus:outline-none" /> : <span className={`text-[11px] font-medium ${SIP_CLR[item.siparis] || 'text-slate-500'}`}>{item.siparis || ''}</span>}</td>
                        <td className="px-2 py-1">{isEditing ? <input value={editForm.dagitim} onChange={e => setEditForm({...editForm, dagitim: e.target.value})} className="bg-slate-800 border border-blue-500/30 rounded px-1.5 py-0.5 text-[11px] w-16 text-white focus:outline-none" /> : <span className="text-[11px] text-slate-600">{item.dagitim || ''}</span>}</td>
                        <td className="px-2 py-1">{isEditing ? <select value={editForm.birim} onChange={e => setEditForm({...editForm, birim: e.target.value})} className="bg-slate-800 border border-blue-500/30 rounded px-1 py-0.5 text-[11px] w-12 text-white focus:outline-none"><option value="">--</option>{BIRIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}</select> : <span className="text-[11px] text-slate-600">{item.birim || ''}</span>}</td>
                        <td className="px-2 py-1 text-[11px] font-mono text-slate-600">{item.quantity ?? ''}</td>
                        <td className="px-2 py-1 text-[11px] font-mono text-emerald-400/80">{item.toplamMiktar ?? ''}</td>
                        <td className="px-2 py-1">{isModified && <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/15 text-purple-400 border border-purple-500/20">değişti</span>}{item.needsReview && !isModified && <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20">incele</span>}{!isModified && !item.needsReview && <span className="text-emerald-500/30 text-[10px]">✓</span>}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{isEditing ? (<div className="flex items-center gap-1"><button onClick={() => saveEdit(item.id)} className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-medium">Kaydet</button><button onClick={cancelEdit} className="px-2 py-0.5 text-[10px] rounded bg-slate-700/50 text-slate-400 hover:bg-slate-700">İptal</button></div>) : (<div className="flex items-center gap-1">{canEdit && item.level >= 2 && <button onClick={() => startEdit(item)} className="px-2 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-medium transition-all">Düzenle</button>}{isModified && <button onClick={() => showHistory(item)} className="px-2 py-0.5 text-[10px] rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all">Geçmiş</button>}</div>)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400 transition-all">← Önceki</button>
              <span className="text-[11px] text-slate-600">Sayfa <b className="text-slate-400">{page + 1}</b> / {Math.max(1, Math.ceil(total / 200))} · {total.toLocaleString('tr-TR')} kayıt</span>
              <button onClick={() => setPage(page + 1)} disabled={items.length < 200} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400 transition-all">Sonraki →</button>
            </div>
          </div>
        </div>
      </div>

      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowTaskModal(false)}>
          <div className="bg-[#161b22] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Görev Oluştur</h3>
            <p className="text-xs text-slate-500 mb-5">{selectedItems.size} kalem seçili</p>
            <div className="space-y-3">
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Görev başlığı" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40" />
              <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Açıklama (opsiyonel)" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 h-20 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500/40"><option value="">Mühendis seç...</option>{engineers.map(e => <option key={e.id} value={e.id}>{e.full_name || e.fullName}</option>)}</select>
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500/40"><option value="low">Düşük</option><option value="medium">Orta</option><option value="high">Yüksek</option><option value="critical">Kritik</option></select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:bg-white/[0.04]">İptal</button>
              <button onClick={handleCreateTask} disabled={!taskTitle || taskCreating} className="px-5 py-2 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 transition-all">{taskCreating ? 'Oluşturuluyor...' : 'Görev Oluştur'}</button>
            </div>
          </div>
        </div>
      )}

      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setHistoryItem(null)}>
          <div className="bg-[#161b22] border border-white/[0.1] rounded-2xl p-6 w-full max-w-lg max-h-[70vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Değişiklik Geçmişi</h3>
            <p className="text-xs text-slate-500 mb-4">#{historyItem.rowNumber} · {historyItem.title}</p>
            {historyData.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Henüz değişiklik yok</p>
            ) : (
              <div className="space-y-2">
                {historyData.map((log: any, i: number) => (
                  <div key={i} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-purple-400">{log.fieldName}</span>
                      <span className="text-[10px] text-slate-600">{new Date(log.changedAt).toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-400/60 line-through">{log.oldValue || '—'}</span>
                      <span className="text-slate-700">→</span>
                      <span className="text-emerald-400">{log.newValue || '—'}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">{log.changedBy?.fullName || ''}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setHistoryItem(null)} className="mt-4 px-4 py-2 rounded-xl text-sm text-slate-400 hover:bg-white/[0.04] w-full transition-all">Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#161b22] border border-white/[0.06] rounded-xl p-3">
      <p className="text-[10px] text-slate-500 font-medium mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{(value || 0).toLocaleString('tr-TR')}</p>
    </div>
  );
}