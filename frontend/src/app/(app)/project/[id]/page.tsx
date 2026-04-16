'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  getProject, getItems, getStats, getNav, updateItem, getItemHistory,
  exportProjectUrl, createTask, getUsers,
} from '@/lib/api';

const KALEM_OPTIONS = ['F', 'Y', 'E', 'H', 'C', 'X DETAY', 'X-Kesilerek Kullanilan'];
const BIRIM_OPTIONS = ['AD', 'KG', 'M', 'M2', 'L', 'D'];

const LEVEL_COLORS: Record<number, { badge: string; row: string }> = {
  0: { badge: 'bg-slate-700 text-slate-300', row: 'bg-slate-900/40' },
  1: { badge: 'bg-slate-700 text-slate-300', row: 'bg-slate-900/30' },
  2: { badge: 'bg-blue-600/90 text-white', row: 'bg-blue-500/[0.06]' },
  3: { badge: 'bg-emerald-500/90 text-white', row: 'bg-emerald-500/[0.04]' },
  4: { badge: 'bg-slate-700/80 text-slate-400', row: '' },
  5: { badge: 'bg-slate-800 text-slate-400', row: '' },
};

const SIP_CLR: Record<string, string> = {
  EVET: 'text-emerald-400', HAYIR: 'text-red-400/60', MONTAJ: 'text-violet-400',
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

  // Task creation state (designer)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [engineers, setEngineers] = useState<any[]>([]);
  const [taskCreating, setTaskCreating] = useState(false);
  const [taskMsg, setTaskMsg] = useState('');

  // History modal
  const [historyItem, setHistoryItem] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const isDesigner = user?.role === 'designer';
  const isEngineer = user?.role === 'integration_engineer';
  const isAdmin = user?.role === 'admin';

  const loadProject = useCallback(async () => {
    const p = await getProject(projectId);
    setProject(p);
  }, [projectId]);

  const loadStats = useCallback(async () => {
    setStats(await getStats(projectId));
  }, [projectId]);

  const loadNav = useCallback(async () => {
    setNav(await getNav(projectId));
  }, [projectId]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const p: any = { offset: page * 200, limit: 200 };
    if (filter === 'review') p.needs_review = 'true';
    if (filter === 'modified') p.status = 'modified';
    if (filterUzmanlik) p.uzmanlik = filterUzmanlik;
    if (filterLevel) p.level = filterLevel;
    if (filterMontaj) p.montaj = filterMontaj;
    if (search) p.q = search;
    const res = await getItems(projectId, p);
    setItems(res.items);
    setTotal(res.total);
    setLoading(false);
  }, [projectId, filter, filterUzmanlik, filterLevel, filterMontaj, search, page]);

  useEffect(() => { loadProject(); loadStats(); loadNav(); }, [loadProject, loadStats, loadNav]);
  useEffect(() => { loadItems(); }, [loadItems]);

  // Load engineers for task assignment
  useEffect(() => {
    if (isDesigner || isAdmin) {
      getUsers().then((users: any[]) => setEngineers(users.filter((u: any) => u.role === 'integration_engineer'))).catch(() => {});
    }
  }, [isDesigner, isAdmin]);

  const toggleSelect = (itemId: number) => {
    setSelectedItems(prev => {
      const n = new Set(prev);
      n.has(itemId) ? n.delete(itemId) : n.add(itemId);
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
      setTaskMsg('Görev oluşturuldu!');
      setSelectedItems(new Set());
      setShowTaskModal(false);
      setTaskTitle(''); setTaskDesc(''); setTaskAssignee(''); setTaskPriority('medium');
      setTimeout(() => setTaskMsg(''), 3000);
    } catch (e: any) {
      setTaskMsg('Hata: ' + (e.message || 'Görev oluşturulamadı'));
    }
    setTaskCreating(false);
  };

  const handleItemUpdate = async (item: any, field: string, value: any) => {
    await updateItem(projectId, item.id, { [field]: value });
    await loadItems();
    await loadStats();
  };

  const showHistory = async (item: any) => {
    setHistoryItem(item);
    const logs = await getItemHistory(projectId, item.id);
    setHistoryData(logs);
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const progress = project.totalRows > 0 ? Math.round(((project.totalRows - (project.unresolvedRows || 0)) / project.totalRows) * 100) : 0;

  return (
    <div className="px-6 py-6 max-w-[1600px] mx-auto">
      <div className="flex gap-5">
        {/* Nav Sidebar */}
        {navOpen && (
          <div className="w-72 shrink-0">
            <div className="sticky top-4 bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Navigasyon</span>
                  <button onClick={() => setNavOpen(false)} className="text-slate-600 hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </button>
                </div>
                <input
                  type="text" placeholder="Ara..." value={navFilter}
                  onChange={e => setNavFilter(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/30"
                />
              </div>
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                {nav.filter(n => !navFilter || n.uzmanlik?.toLowerCase().includes(navFilter.toLowerCase()) || n.montajlar?.some((m: string) => m.toLowerCase().includes(navFilter.toLowerCase()))).map((group: any) => (
                  <div key={group.uzmanlik}>
                    <button
                      onClick={() => { setFilterUzmanlik(group.uzmanlik === filterUzmanlik ? '' : group.uzmanlik); setPage(0); }}
                      className={`w-full text-left px-3 py-2 text-xs border-b border-white/[0.04] transition ${filterUzmanlik === group.uzmanlik ? 'bg-blue-500/10' : 'hover:bg-blue-500/[0.08]'}`}
                    >
                      <span className="text-blue-300/90 font-medium">{group.uzmanlik}</span>
                      <span className="text-[10px] text-zinc-600 ml-2">{group.montajlar?.length || 0} montaj</span>
                    </button>
                    {group.montajlar?.map((m: string) => (
                      <button key={m}
                        onClick={() => { setFilterMontaj(m === filterMontaj ? '' : m); setPage(0); }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] border-b border-white/[0.02] transition pl-6 ${filterMontaj === m ? 'bg-emerald-500/10' : 'hover:bg-emerald-500/[0.06]'}`}>
                        <span className="text-emerald-400/70 truncate block">{m}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              {!navOpen && (
                <button onClick={() => setNavOpen(true)} className="px-2 py-1 rounded-lg bg-white/[0.04] text-slate-500 hover:text-white text-xs mb-2">
                  ☰ Nav
                </button>
              )}
              <button onClick={() => router.push('/projects')} className="text-xs text-slate-600 hover:text-slate-400 mb-1 block">← Projeler</button>
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              {(isDesigner || isAdmin) && selectedItems.size > 0 && (
                <button onClick={() => setShowTaskModal(true)}
                  className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-sm font-medium">
                  Görev Oluştur ({selectedItems.size})
                </button>
              )}
              <a href={exportProjectUrl(projectId) + '?t=' + Date.now()} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium">
                Excel İndir
              </a>
            </div>
          </div>

          {taskMsg && (
            <div className={`mb-5 p-3 rounded-xl text-sm flex items-center gap-2 ${
              taskMsg.startsWith('Hata') ? 'bg-red-500/[0.08] border border-red-500/20 text-red-400' : 'bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400'
            }`}>
              {taskMsg.startsWith('Hata') ? '⚠' : '✓'} {taskMsg}
            </div>
          )}

          {/* Progress + Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="col-span-2 bg-[#161b22] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">İlerleme</span>
                <span className={`text-2xl font-bold ${progress === 100 ? 'text-emerald-400' : 'text-white'}`}>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} style={{ width: progress + '%' }} />
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-500">
                <span>Toplam <b className="text-white font-semibold">{project.totalRows?.toLocaleString('tr-TR')}</b></span>
                <span>Çözüldü <b className="text-emerald-400">{project.resolvedRows?.toLocaleString('tr-TR')}</b></span>
                <span>Bekliyor <b className="text-amber-400">{project.unresolvedRows?.toLocaleString('tr-TR')}</b></span>
                {stats && <span>Değişiklik <b className="text-purple-400">{stats.modifiedRows || stats.modified || 0}</b></span>}
              </div>
            </div>
            {stats && (
              <>
                <MiniStat title="Uzmanlık" data={stats.byUzmanlik?.reduce((acc: any, g: any) => ({ ...acc, [g.uzmanlik]: g.count }), {})} />
                <MiniStat title="Görevler" data={stats.taskStats?.reduce((acc: any, g: any) => ({ ...acc, [g.status]: g.count }), {})} />
              </>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {[['all', 'Tümü'], ['review', 'İncelenmesi Gereken'], ['modified', 'Değiştirilmiş']].map(([k, l]) => (
              <button key={k} onClick={() => { setFilter(k); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === k ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]'
                }`}>{l}</button>
            ))}
            <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setPage(0); }}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.03] text-slate-400 border border-white/[0.06] focus:outline-none">
              <option value="">Tüm Seviyeler</option>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Ara (title, malzeme no)..." className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.03] text-slate-300 border border-white/[0.06] focus:outline-none focus:border-blue-500/30 w-48 placeholder-slate-600" />

            <div className="ml-auto flex items-center gap-1.5">
              {filterUzmanlik && <span className="px-2.5 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">{filterUzmanlik} <button onClick={() => setFilterUzmanlik('')} className="ml-1">×</button></span>}
              {filterMontaj && <span className="px-2.5 py-1 rounded-lg text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{filterMontaj} <button onClick={() => setFilterMontaj('')} className="ml-1">×</button></span>}
              <span className="text-xs text-slate-600">{total} kayıt</span>
            </div>
          </div>

          {/* BOM Table */}
          <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-500 text-[11px]">
                    {(isDesigner || isAdmin) && <th className="px-2 py-3 w-8"><input type="checkbox" className="accent-purple-500" onChange={e => {
                      if (e.target.checked) setSelectedItems(new Set(items.map(i => i.id)));
                      else setSelectedItems(new Set());
                    }} /></th>}
                    {['#', 'Lv', 'Uzmanlık', 'Montaj', 'Title', 'MalzNo SAP', 'Kalem Tipi', 'Sipariş', 'Dağıtım', 'Birim', 'Qty', 'ToplamMik', 'Durum', ''].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={15} className="text-center py-12 text-slate-600">
                      <div className="flex items-center justify-center gap-3"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Yükleniyor...</div>
                    </td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={15} className="text-center py-12 text-slate-600">Kayıt bulunamadı</td></tr>
                  ) : items.map((item) => (
                    <ItemRow key={item.id} item={item}
                      canSelect={isDesigner || isAdmin}
                      canEdit={isEngineer || isAdmin}
                      selected={selectedItems.has(item.id)}
                      onToggleSelect={() => toggleSelect(item.id)}
                      onUpdate={handleItemUpdate}
                      onShowHistory={() => showHistory(item)} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400">← Önceki</button>
              <span className="text-xs text-slate-600">Sayfa {page + 1} · {total} kayıt</span>
              <button onClick={() => setPage(page + 1)} disabled={items.length < 200} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400">Sonraki →</button>
            </div>
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowTaskModal(false)}>
          <div className="bg-[#161b22] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Görev Oluştur</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedItems.size} kalem seçili</p>
            <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Görev başlığı"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 mb-3 focus:outline-none focus:border-blue-500/40" />
            <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Açıklama (opsiyonel)"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 mb-3 focus:outline-none focus:border-blue-500/40 h-20 resize-none" />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none">
                <option value="">Mühendis seç...</option>
                {engineers.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
              <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none">
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="critical">Kritik</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/[0.04]">İptal</button>
              <button onClick={handleCreateTask} disabled={!taskTitle || taskCreating}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50">
                {taskCreating ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setHistoryItem(null)}>
          <div className="bg-[#161b22] border border-white/[0.1] rounded-2xl p-6 w-full max-w-lg max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Değişiklik Geçmişi</h3>
            <p className="text-xs text-slate-500 mb-4">#{historyItem.rowNumber} · {historyItem.title}</p>
            {historyData.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Henüz değişiklik yok</p>
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
                      <span className="text-slate-600">→</span>
                      <span className="text-emerald-400">{log.newValue || '—'}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">{log.changedBy?.fullName}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setHistoryItem(null)} className="mt-4 px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/[0.04] w-full">Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, canSelect, canEdit, selected, onToggleSelect, onUpdate, onShowHistory }: {
  item: any; canSelect: boolean; canEdit: boolean; selected: boolean;
  onToggleSelect: () => void; onUpdate: any; onShowHistory: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [kalem, setKalem] = useState(item.kalemTipi);
  const [birim, setBirim] = useState(item.birim);
  const [siparis, setSiparis] = useState(item.siparis);
  const lvl = LEVEL_COLORS[item.level] || LEVEL_COLORS[5];
  const isL2 = item.level === 2;
  const isL3 = item.level === 3;
  const isModified = item.status === 'modified' || item.updatedAt;

  const handleSave = async () => {
    const updates: any = {};
    if (kalem !== item.kalemTipi) updates.kalemTipi = kalem;
    if (birim !== item.birim) updates.birim = birim;
    if (siparis !== item.siparis) updates.siparis = siparis;
    if (Object.keys(updates).length > 0) {
      updates.needsReview = false;
      await onUpdate(item, 'kalemTipi', kalem); // triggers full update via API
    }
    setEditing(false);
  };

  return (
    <tr id={'row-' + item.rowNumber}
      className={`border-b transition-all ${isL2 ? 'border-blue-500/20 ' + lvl.row : isL3 ? 'border-emerald-500/10 ' + lvl.row : 'border-white/[0.03]'} ${item.needsReview ? 'ring-1 ring-inset ring-amber-500/15' : ''} ${isModified ? 'ring-1 ring-inset ring-purple-500/15' : ''} hover:bg-white/[0.03]`}>
      {canSelect && (
        <td className="px-2 py-1.5">
          <input type="checkbox" checked={selected} onChange={onToggleSelect} className="accent-purple-500" />
        </td>
      )}
      <td className="px-3 py-1.5 text-slate-700 font-mono text-[11px]">{item.rowNumber}</td>
      <td className="px-3 py-1.5"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ${lvl.badge}`}>{item.level}</span></td>
      <td className={`px-3 py-1.5 text-xs ${isL2 ? 'font-semibold text-blue-300' : 'text-slate-600'}`}>{item.uzmanlik}</td>
      <td className="px-3 py-1.5 text-xs text-slate-600 max-w-[120px] truncate">{item.montaj}</td>
      <td className={`px-3 py-1.5 font-mono text-xs max-w-[240px] ${isL2 ? 'font-bold text-blue-200' : isL3 ? 'font-semibold text-emerald-300/90' : 'text-slate-500'}`}
        style={{ paddingLeft: Math.max(12, item.level * 16) }}>
        <span className="truncate block">{item.title}</span>
      </td>
      <td className="px-3 py-1.5 text-xs text-slate-600 max-w-[120px] truncate font-mono">{item.malzemeNoSap}</td>
      <td className="px-3 py-1.5">
        {canEdit && editing && item.level >= 3 ? (
          <select value={kalem} onChange={e => setKalem(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-md px-1.5 py-0.5 text-xs w-20">
            <option value="">--</option>
            {KALEM_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        ) : (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-slate-800/50 text-slate-400 border-slate-700/30">
            {item.kalemTipi || '—'}
          </span>
        )}
      </td>
      <td className="px-3 py-1.5"><span className={`text-xs font-medium ${SIP_CLR[item.siparis] || 'text-slate-500'}`}>{item.siparis}</span></td>
      <td className="px-3 py-1.5 text-xs text-slate-600">{item.dagitim}</td>
      <td className="px-3 py-1.5">
        {canEdit && editing && item.level >= 3 ? (
          <select value={birim} onChange={e => setBirim(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-md px-1.5 py-0.5 text-xs w-14">
            <option value="">--</option>
            {BIRIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        ) : <span className="text-xs text-slate-600">{item.birim}</span>}
      </td>
      <td className="px-3 py-1.5 text-xs font-mono text-slate-600">{item.quantity ?? ''}</td>
      <td className="px-3 py-1.5 text-xs font-mono text-emerald-400/80">{item.toplamMiktar ?? ''}</td>
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-1">
          {isModified && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/15 text-purple-400 border border-purple-500/20">değişti</span>
          )}
          {item.needsReview && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20">incele</span>
          )}
          {!isModified && !item.needsReview && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-500/50 text-[10px]">✓</span>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-1">
          {canEdit && item.level >= 3 && (
            editing ? (
              <div className="flex gap-1">
                <button onClick={handleSave} className="px-2 py-0.5 text-xs rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">✓</button>
                <button onClick={() => setEditing(false)} className="px-2 py-0.5 text-xs rounded-md bg-slate-700/50 text-slate-400">✗</button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="px-2 py-0.5 text-[11px] rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">Düzenle</button>
            )
          )}
          {isModified && (
            <button onClick={onShowHistory} className="px-2 py-0.5 text-[11px] rounded-md bg-purple-500/10 text-purple-400 hover:bg-purple-500/20">Geçmiş</button>
          )}
        </div>
      </td>
    </tr>
  );
}

function MiniStat({ title, data }: { title: string; data: Record<string, number> }) {
  const sorted = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-4">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{title}</span>
      <div className="mt-2 space-y-1">
        {sorted.slice(0, 6).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{k}</span>
            <span className="text-white font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
