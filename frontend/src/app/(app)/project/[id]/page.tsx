'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  getProject, getItems, getStats, getNav, updateItem, getItemHistory,
  exportProject, createTask, getUsers, deleteProject, findItemPosition,
  getEditRequests, createEditRequest, reviewEditRequest,
} from '@/lib/api';

const KALEM_OPTIONS = ['F', 'Y', 'E', 'H', 'C', 'X DETAY', 'X-Kesilerek Kullanilan'];
const BIRIM_OPTIONS = ['AD', 'KG', 'M', 'M2', 'L', 'D', 'SET', 'LT'];
const UZMANLIK_OPTIONS = ['GÖVDE', 'TRİM', 'HVAC', 'MEKANİK', 'ELEKTRİK'];

const LVL: Record<number, any> = {
  0: { badge: 'bg-slate-500/80 text-white', row: '', font: 'text-slate-100 font-semibold' },
  1: { badge: 'bg-indigo-500/90 text-white', row: 'bg-indigo-500/[0.04]', font: 'text-indigo-100 font-bold text-[13px]' },
  2: { badge: 'bg-blue-500 text-white', row: 'bg-blue-500/[0.06]', font: 'text-blue-50 font-bold' },
  3: { badge: 'bg-emerald-500 text-white', row: 'bg-emerald-500/[0.05]', font: 'text-emerald-100 font-semibold' },
  4: { badge: 'bg-slate-500/60 text-white', row: '', font: 'text-slate-200' },
  5: { badge: 'bg-slate-600/50 text-slate-200', row: '', font: 'text-slate-300' },
};

const KALEM_CLR: Record<string, string> = {
  F: 'bg-violet-500/25 text-violet-200 border-violet-400/30',
  Y: 'bg-blue-500/25 text-blue-200 border-blue-400/30',
  E: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/30',
  H: 'bg-orange-500/25 text-orange-200 border-orange-400/30',
  C: 'bg-pink-500/25 text-pink-200 border-pink-400/30',
  'X DETAY': 'bg-red-500/20 text-red-200 border-red-400/25',
};

const SIP_CLR: Record<string, string> = {
  EVET: 'text-emerald-200 font-semibold', HAYIR: 'text-red-200 font-semibold', MONTAJ: 'text-violet-200 font-semibold',
  'KONTROL EDİLECEK': 'text-amber-200 font-semibold', NA: 'text-slate-400',
};

const UZ_CLR: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  'GÖVDE': { bg: 'bg-blue-500/15', border: 'border-blue-400/25', text: 'text-blue-200', dot: 'bg-blue-400' },
  'TRİM': { bg: 'bg-purple-500/15', border: 'border-purple-400/25', text: 'text-purple-200', dot: 'bg-purple-400' },
  'HVAC': { bg: 'bg-cyan-500/15', border: 'border-cyan-400/25', text: 'text-cyan-200', dot: 'bg-cyan-400' },
  'MEKANİK': { bg: 'bg-orange-500/15', border: 'border-orange-400/25', text: 'text-orange-200', dot: 'bg-orange-400' },
  'ELEKTRİK': { bg: 'bg-yellow-500/15', border: 'border-yellow-400/25', text: 'text-yellow-200', dot: 'bg-yellow-400' },
};

const LEVEL_EXPORT_COLORS: Record<number, string> = {
  0: '#2D3748',
  1: '#1E3A5F',
  2: '#1B4F72',
  3: '#196F3D',
  4: '#6B2D8B',
};

const CHART_BARS = ['#2E86C1', '#16A34A', '#7C3AED', '#EA580C', '#0891B2', '#DC2626', '#0EA5E9'];

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
  const [filterDagitim, setFilterDagitim] = useState('');
  const [filterPrototip2, setFilterPrototip2] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [goToRow, setGoToRow] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(true);
  const [navFilter, setNavFilter] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editMode, setEditMode] = useState<'select' | 'adet' | 'siparis_hayir' | 'malzeme_eksik' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [editValue, setEditValue] = useState('');
  const [editComment, setEditComment] = useState('');

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

  const [editRequests, setEditRequests] = useState<any[]>([]);
  const [showEditRequests, setShowEditRequests] = useState(false);

  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const isDesigner = user?.role === 'designer';
  const isEngineer = user?.role === 'integration_engineer';
  const isAdmin = user?.role === 'admin';
  const canSelect = isDesigner || isAdmin;
  const canEdit = isEngineer || isAdmin || isDesigner;

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
      if (filterDagitim) p.dagitim = filterDagitim;
      if (filterPrototip2) p.prototip2 = filterPrototip2;
      if (search) p.q = search;
      const res = await getItems(projectId, p);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch { setItems([]); setTotal(0); }
    setLoading(false);
  }, [projectId, filter, filterUzmanlik, filterLevel, filterMontaj, filterSiparis, filterKalemTipi, filterDagitim, filterPrototip2, search, page]);

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
    if (filterUzmanlik) f.push({ key: 'uz', label: 'Uzmanlık: ' + filterUzmanlik, color: 'blue', onClear: () => { setFilterUzmanlik(''); setPage(0); } });
    if (filterMontaj) f.push({ key: 'mo', label: 'Montaj: ' + filterMontaj, color: 'emerald', onClear: () => { setFilterMontaj(''); setPage(0); } });
    if (filterSiparis) f.push({ key: 'si', label: 'Sipariş: ' + filterSiparis, color: 'violet', onClear: () => { setFilterSiparis(''); setPage(0); } });
    if (filterKalemTipi) f.push({ key: 'kt', label: 'Kalem Tipi: ' + filterKalemTipi, color: 'amber', onClear: () => { setFilterKalemTipi(''); setPage(0); } });
    if (filterLevel) f.push({ key: 'lv', label: 'Level ' + filterLevel, color: 'orange', onClear: () => { setFilterLevel(''); setPage(0); } });
    if (filterDagitim) f.push({ key: 'dg', label: 'Dağıtım: ' + filterDagitim, color: 'cyan', onClear: () => { setFilterDagitim(''); setPage(0); } });
    if (filterPrototip2) f.push({ key: 'p2', label: 'Üretilecek araç: ' + filterPrototip2, color: 'rose', onClear: () => { setFilterPrototip2(''); setPage(0); } });
    return f;
  }, [filterUzmanlik, filterMontaj, filterSiparis, filterKalemTipi, filterLevel, filterDagitim, filterPrototip2]);

  const startEdit = (item: any) => {
    if (isAdmin) {
      // Admin gets inline full edit
      setEditingId(item.id);
      setEditForm({
        kalemTipi: item.kalemTipi || '',
        siparis: item.siparis || '',
        dagitim: item.dagitim || '',
        birim: item.birim || '',
        quantity: item.quantity ?? '',
        toplamMiktar: item.toplamMiktar ?? '',
        malzemeNoSap: item.malzemeNoSap || '',
        uzmanlik: item.uzmanlik || '',
        montaj: item.montaj || '',
        montajNo: item.montajNo || '',
        opsStd: item.opsStd || '',
        prototip2: item.prototip2 || '',
      });
    } else {
      // Engineer gets 3-option modal that goes to approval
      setEditItem(item);
      setEditMode('select');
      setEditValue('');
      setEditComment('');
    }
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); setEditItem(null); setEditMode(null); setEditValue(''); setEditComment(''); };

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
      showMsg('ok', 'Kayıt güncellendi');
      cancelEdit();
      await loadItems();
      await loadStats();
    } catch (e: any) {
      showMsg('err', e.message || 'Güncelleme hatası');
    }
  };

  const handleEditSubmit = async () => {
    if (!editItem) return;
    if (!editComment && editMode !== 'adet') { showMsg('err', 'Lütfen detaylı açıklama yazın'); return; }
    if (editMode === 'adet' && !editValue) { showMsg('err', 'Geçerli bir miktar girin'); return; }
    try {
      const data: any = {
        bomItemId: editItem.id,
        editType: editMode,
      };
      if (editMode === 'adet') {
        const num = parseFloat(editValue);
        if (isNaN(num) || num <= 0) { showMsg('err', 'Geçerli bir miktar girin'); return; }
        data.fieldName = 'quantity';
        data.oldValue = String(editItem.quantity ?? '');
        data.newValue = String(num);
        data.comment = editComment || undefined;
      } else if (editMode === 'siparis_hayir') {
        data.fieldName = 'siparis';
        data.oldValue = editItem.siparis || '';
        data.newValue = 'HAYIR';
        data.comment = editComment;
      } else if (editMode === 'malzeme_eksik') {
        data.fieldName = 'needsReview';
        data.oldValue = String(editItem.needsReview);
        data.newValue = 'true';
        data.comment = editComment;
      }
      await createEditRequest(projectId, data);
      showMsg('ok', 'Düzenleme talebi gönderildi — Admin onayı bekleniyor');
      cancelEdit();
    } catch (e: any) {
      showMsg('err', e.message || 'Talep oluşturulamadı');
    }
  };

  // Navigate to a specific item's position in the list
  const navigateToItem = async (item: any) => {
    // Clear all filters to show full list
    setFilterUzmanlik(''); setFilterMontaj(''); setFilterSiparis('');
    setFilterKalemTipi(''); setFilterLevel(''); setFilterDagitim('');
    setFilterPrototip2(''); setFilter('all'); setSearch('');
    setShowSearchResults(false);

    try {
      const res = await findItemPosition(projectId, item.rowNumber);
      if (res.page !== undefined) {
        setPage(res.page);
        setItems(res.items || []);
        setTotal(res.total || 0);
        // Scroll to the row after load
        setTimeout(() => {
          const row = document.getElementById(`bom-row-${item.rowNumber}`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('ring-2', 'ring-blue-400/60', 'bg-blue-500/[0.12]');
            setTimeout(() => row.classList.remove('ring-2', 'ring-blue-400/60', 'bg-blue-500/[0.12]'), 3000);
          }
        }, 200);
      }
    } catch {
      showMsg('err', 'Satır bulunamadı');
    }
  };

  const handleGoToRow = async () => {
    const rowNum = parseInt(goToRow);
    if (isNaN(rowNum) || rowNum <= 0) return;
    await navigateToItem({ rowNumber: rowNum });
    setGoToRow('');
  };

  // Search with debounced results for click-to-navigate
  const searchDebounceRef = useRef<any>(null);
  const handleSearchInput = (val: string) => {
    setSearch(val);
    setPage(0);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (val.length >= 2) {
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const res = await getItems(projectId, { q: val, limit: 20, offset: 0 });
          setSearchResults(res.items || []);
          setShowSearchResults(true);
        } catch { setSearchResults([]); }
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
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
        title: taskTitle,
        description: taskDesc || undefined,
        priority: taskPriority,
        bomItemIds: Array.from(selectedItems),
      });
      showMsg('ok', 'Ticket oluşturuldu (' + selectedItems.size + ' kalem)');
      setSelectedItems(new Set());
      setShowTaskModal(false);
      setTaskTitle(''); setTaskDesc(''); setTaskPriority('medium');
    } catch (e: any) {
      showMsg('err', e.message || 'Ticket oluşturulamadı');
    }
    setTaskCreating(false);
  };

  const openTicketForItem = (item: any) => {
    setSelectedItems(new Set([item.id]));
    setTaskTitle(`${item.title} — ${item.malzemeNo || item.montajNo || ''}`);
    setTaskDesc(`Row #${item.rowNumber} | Level ${item.level} | Kalem Tipi: ${item.kalemTipi || '-'} | Sipariş: ${item.siparis || '-'}`);
    setShowTaskModal(true);
  };

  const showHistory = async (item: any) => {
    setHistoryItem(item);
    try {
      const logs = await getItemHistory(projectId, item.id);
      setHistoryData(Array.isArray(logs) ? logs : logs.logs || []);
    } catch { setHistoryData([]); }
  };

  const loadEditRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const reqs = await getEditRequests(projectId, 'pending');
      setEditRequests(Array.isArray(reqs) ? reqs : []);
    } catch { setEditRequests([]); }
  }, [projectId, isAdmin]);

  useEffect(() => { loadEditRequests(); }, [loadEditRequests]);

  const handleReviewRequest = async (reqId: number, status: 'approved' | 'rejected') => {
    try {
      await reviewEditRequest(projectId, reqId, status);
      showMsg('ok', status === 'approved' ? 'Talep onaylandı' : 'Talep reddedildi');
      await loadEditRequests();
      if (status === 'approved') {
        await loadItems();
        await loadStats();
      }
    } catch (e: any) {
      showMsg('err', e.message || 'İşlem hatası');
    }
  };

  const hasActiveFilters = !!(filterUzmanlik || filterMontaj || filterSiparis || filterKalemTipi || filterLevel || filterDagitim || filterPrototip2 || search || filter !== 'all');

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
      showMsg('err', e.message || 'Excel indirme hatası');
    }
    setExporting(false);
  };

  const handleDeleteProject = async () => {
    if (!confirm('Bu projeyi silmek istediğinize emin misiniz?')) return;
    try {
      await deleteProject(projectId);
      router.push('/projects');
    } catch (e: any) { showMsg('err', e.message || 'Silme hatası'); }
  };

  const clearAllFilters = () => {
    setFilterUzmanlik(''); setFilterMontaj(''); setFilterSiparis('');
    setFilterKalemTipi(''); setFilterLevel(''); setFilterDagitim('');
    setFilterPrototip2(''); setFilter('all'); setSearch(''); setPage(0);
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

  const levelDistribution = useMemo(() => (stats?.byLevel || []).map((r: any) => ({
    label: `Level ${r.level}`,
    value: r.count,
    color: LEVEL_EXPORT_COLORS[r.level] || '#334155',
  })), [stats]);

  const kalemDistribution = useMemo(() => (stats?.byKalemTipi || []).map((r: any, i: number) => ({
    label: r.kalemTipi,
    value: r.count,
    color: CHART_BARS[i % CHART_BARS.length],
  })), [stats]);

  const levelFStats = useMemo(() => {
    const out: Record<number, { total: number; f: number; siparisEvet: number; siparisHayir: number }> = {};
    for (const r of (stats?.byLevelKalem || [])) {
      const lv = Number(r.level);
      if (!out[lv]) out[lv] = { total: 0, f: 0, siparisEvet: 0, siparisHayir: 0 };
      out[lv].total += r.count;
      if ((r.kalemTipi || '').toUpperCase() === 'F') out[lv].f += r.count;
    }
    for (const r of (stats?.byLevelSiparis || [])) {
      const lv = Number(r.level);
      if (!out[lv]) out[lv] = { total: 0, f: 0, siparisEvet: 0, siparisHayir: 0 };
      const sip = (r.siparis || '').toUpperCase();
      if (sip === 'EVET') out[lv].siparisEvet += r.count;
      if (sip === 'HAYIR') out[lv].siparisHayir += r.count;
    }
    return Object.entries(out)
      .map(([level, v]) => ({ level: Number(level), ...v }))
      .sort((a, b) => a.level - b.level);
  }, [stats]);

  const uzmanlikDetailedRows = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of (stats?.byUzmanlikLevelKalem || [])) {
      const uz = r.uzmanlik || 'Belirsiz';
      if (!map[uz]) map[uz] = { uzmanlik: uz, l2f: 0, l3f: 0, l2SipEvet: 0, l2SipHayir: 0, total: 0 };
      map[uz].total += r.count;
      const kalem = (r.kalemTipi || '').toUpperCase();
      if (kalem === 'F' && r.level === 2) map[uz].l2f += r.count;
      if (kalem === 'F' && r.level === 3) map[uz].l3f += r.count;
    }
    for (const r of (stats?.byUzmanlikLevelSiparis || [])) {
      const uz = r.uzmanlik || 'Belirsiz';
      if (!map[uz]) map[uz] = { uzmanlik: uz, l2f: 0, l3f: 0, l2SipEvet: 0, l2SipHayir: 0, total: 0 };
      const sip = (r.siparis || '').toUpperCase();
      if (r.level === 2 && sip === 'EVET') map[uz].l2SipEvet += r.count;
      if (r.level === 2 && sip === 'HAYIR') map[uz].l2SipHayir += r.count;
    }
    return Object.values(map).sort((a: any, b: any) => b.total - a.total);
  }, [stats]);

  return (
    <div className="flex h-[calc(100vh)] overflow-hidden">
      {/* LEFT NAV PANEL */}
      {navOpen && (
        <div className="w-72 shrink-0 border-r border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl flex flex-col">
          <div className="p-4 border-b border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Navigasyon</span>
              <button onClick={() => setNavOpen(false)} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.08]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="relative">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" /><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input type="text" placeholder="Filtrele..." value={navFilter} onChange={e => setNavFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-white/[0.05] text-slate-200 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 placeholder-slate-500 transition-all" />
            </div>
            {(filterUzmanlik || filterMontaj) && (
              <button onClick={() => { setFilterUzmanlik(''); setFilterMontaj(''); setFilterSiparis(''); setFilterKalemTipi(''); setFilterDagitim(''); setPage(0); }}
                className="mt-2 w-full text-center text-[11px] text-red-400/80 hover:text-red-300 transition-colors py-1 rounded-lg hover:bg-red-500/10">Filtreleri temizle</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <button onClick={() => { setFilterUzmanlik(''); setFilterMontaj(''); setPage(0); }}
              className={`w-full text-left px-4 py-3 text-xs border-b border-white/[0.05] transition-all ${!filterUzmanlik && !filterMontaj ? 'bg-gradient-to-r from-blue-500/15 to-transparent text-blue-200 border-l-2 border-l-blue-400' : 'text-slate-400 hover:bg-white/[0.04]'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Tümü</span>
                <span className="text-[10px] text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-full font-mono">{totalRows.toLocaleString('tr-TR')}</span>
              </div>
            </button>
            {nav.filter(n => !navFilter || n.uzmanlik?.toLowerCase().includes(navFilter.toLowerCase()) || n.montajlar?.some((m: string) => m.toLowerCase().includes(navFilter.toLowerCase()))).map((group: any) => (
              <div key={group.uzmanlik}>
                <button onClick={() => { setFilterUzmanlik(group.uzmanlik === filterUzmanlik ? '' : group.uzmanlik); setFilterMontaj(''); setPage(0); }}
                  className={`w-full text-left px-4 py-3 text-xs border-b border-white/[0.04] transition-all flex items-center justify-between group ${filterUzmanlik === group.uzmanlik ? 'bg-gradient-to-r from-blue-500/15 to-transparent border-l-2 border-l-blue-400' : 'hover:bg-white/[0.04]'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${(UZ_CLR[group.uzmanlik] || {}).dot || 'bg-slate-500'}`} />
                    <span className="text-blue-100 font-semibold group-hover:text-white">{group.uzmanlik || 'Diğer'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 bg-white/[0.05] px-2 py-0.5 rounded-full">{group.montajlar?.length || 0}</span>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`text-slate-500 transition-transform ${filterUzmanlik === group.uzmanlik ? 'rotate-90' : ''}`}>
                      <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                </button>
                {(filterUzmanlik === group.uzmanlik || navFilter) && group.montajlar?.map((m: string) => (
                  <button key={m} onClick={() => { setFilterMontaj(m === filterMontaj ? '' : m); setPage(0); }}
                    className={`w-full text-left px-4 py-2 text-[11px] border-b border-white/[0.03] transition-all pl-7 ${filterMontaj === m ? 'bg-gradient-to-r from-emerald-500/15 to-transparent text-emerald-200 border-l-2 border-l-emerald-400' : 'text-slate-400 hover:bg-emerald-500/[0.05] hover:text-emerald-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${filterMontaj === m ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span className="truncate">{m}</span>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 max-w-[1600px] mx-auto">
          {msg && (
            <div className={`fixed top-4 right-4 z-50 px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl flex items-center gap-2.5 animate-slide-up backdrop-blur-2xl ${msg.type === 'ok' ? 'bg-emerald-500/90 text-white shadow-[0_4px_24px_rgba(16,185,129,0.4)]' : 'bg-red-500/90 text-white shadow-[0_4px_24px_rgba(239,68,68,0.4)]'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">{msg.type === 'ok' ? '\u2713' : '!'}</span>
              {msg.text}
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between mb-5">
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
                <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-400 font-mono">{project.filename}</span>
                  <span className="text-slate-600">&middot;</span>
                  <span className="text-[11px] text-slate-400">{new Date(project.createdAt).toLocaleDateString('tr-TR')}</span>
                  <span className="text-slate-600">&middot;</span>
                  <span className="text-[11px] text-slate-400">{project.uploadedBy}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && editRequests.length > 0 && (
                <button onClick={() => setShowEditRequests(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400/50 text-sm font-medium transition-all flex items-center gap-2 relative">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Onay Bekleyen
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{editRequests.length}</span>
                </button>
              )}
              {canSelect && selectedItems.size > 0 && (
                <button onClick={() => setShowTaskModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-purple-500/15 border border-purple-400/30 text-purple-300 hover:bg-purple-500/25 hover:border-purple-400/50 text-sm font-medium transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  Ticket Aç ({selectedItems.size})
                </button>
              )}
              <button onClick={handleExport} disabled={exporting}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/12 border border-emerald-400/25 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/40 text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-40">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M3 6l4 4 4-4M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {exporting ? 'İndiriliyor...' : 'Excel'}
              </button>
              {isAdmin && (
                <button onClick={handleDeleteProject} className="p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Projeyi Sil">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1m2 0v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4h8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            <StatCard label="Toplam Satır" value={totalRows} color="text-white" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>} />
            <StatCard label="İncelenmesi Gereken" value={needsReview} color="text-amber-300" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" /><path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>} />
            <StatCard label="Değiştirilmiş"  value={modified} color="text-purple-300" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>} />
            <StatCard label="Tamamlanan" value={resolved} color="text-emerald-300" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wide">İlerleme</p>
                <span className={`text-lg font-bold ${progress === 100 ? 'text-emerald-300' : 'text-white'}`}>%{progress}</span>
              </div>
              <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400'}`} style={{ width: progress + '%' }} />
              </div>
            </div>
          </div>

          {/* GRAFIK + TABLOLU ISTATISTIK PANELI */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <p className="text-[11px] text-slate-300 font-bold uppercase tracking-wider mb-3">Level Dağılımı (Excel Renk Mantığı)</p>
              <HorizontalBarChart rows={levelDistribution} />
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <p className="text-[11px] text-slate-300 font-bold uppercase tracking-wider mb-3">Kalem Tipi Dağılımı</p>
              <HorizontalBarChart rows={kalemDistribution} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 overflow-hidden">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">Level Bazlı F ve Sipariş Özeti</p>
                <span className="text-[10px] text-slate-500">L2/L3 odaklı operasyon</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/[0.08]">
                      <th className="text-left py-2 px-2">Level</th>
                      <th className="text-right py-2 px-2">Toplam</th>
                      <th className="text-right py-2 px-2">F Kalem</th>
                      <th className="text-right py-2 px-2">Sipariş EVET</th>
                      <th className="text-right py-2 px-2">Sipariş HAYIR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelFStats.map((r: any) => (
                      <tr key={r.level} className="border-b border-white/[0.05] hover:bg-white/[0.03]">
                        <td className="py-2 px-2 font-semibold" style={{ color: LEVEL_EXPORT_COLORS[r.level] || '#cbd5e1' }}>Level {r.level}</td>
                        <td className="py-2 px-2 text-right text-white font-mono">{r.total.toLocaleString('tr-TR')}</td>
                        <td className="py-2 px-2 text-right text-blue-200 font-mono">{r.f.toLocaleString('tr-TR')}</td>
                        <td className="py-2 px-2 text-right text-emerald-200 font-mono">{r.siparisEvet.toLocaleString('tr-TR')}</td>
                        <td className="py-2 px-2 text-right text-red-200 font-mono">{r.siparisHayir.toLocaleString('tr-TR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 overflow-hidden">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">Uzmanlık Bazlı Kritik Göstergeler</p>
                <span className="text-[10px] text-slate-500">L2-F, L3-F, L2 Sipariş</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/[0.08]">
                      <th className="text-left py-2 px-2">Uzmanlık</th>
                      <th className="text-right py-2 px-2">L2 F</th>
                      <th className="text-right py-2 px-2">L3 F</th>
                      <th className="text-right py-2 px-2">L2 EVET</th>
                      <th className="text-right py-2 px-2">L2 HAYIR</th>
                      <th className="text-right py-2 px-2">Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uzmanlikDetailedRows.map((r: any) => (
                      <tr key={r.uzmanlik} className="border-b border-white/[0.05] hover:bg-white/[0.03]">
                        <td className="py-2 px-2 text-slate-100 font-semibold">{r.uzmanlik}</td>
                        <td className="py-2 px-2 text-right text-blue-200 font-mono">{r.l2f.toLocaleString('tr-TR')}</td>
                        <td className="py-2 px-2 text-right text-indigo-200 font-mono">{r.l3f.toLocaleString('tr-TR')}</td>
                        <td className="py-2 px-2 text-right text-emerald-200 font-mono">{r.l2SipEvet.toLocaleString('tr-TR')}</td>
                        <td className="py-2 px-2 text-right text-red-200 font-mono">{r.l2SipHayir.toLocaleString('tr-TR')}</td>
                        <td className="py-2 px-2 text-right text-white font-mono font-semibold">{r.total.toLocaleString('tr-TR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* UZMANLIK BREAKDOWN */}
          {stats?.byUzmanlik && stats.byUzmanlik.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 mb-3">
              <div className="flex items-center gap-3 mb-2.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-400"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1" opacity="0.3" /></svg>
                <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">Uzmanlık Dağılımı</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {stats.byUzmanlik.map((u: any) => {
                  const uzClr = UZ_CLR[u.uzmanlik] || { bg: 'bg-slate-500/15', border: 'border-slate-400/20', text: 'text-slate-300', dot: 'bg-slate-400' };
                  const active = filterUzmanlik === u.uzmanlik;
                  return (
                    <button key={u.uzmanlik} onClick={() => { setFilterUzmanlik(active ? '' : u.uzmanlik); setPage(0); }}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${active ? uzClr.bg + ' ' + uzClr.text + ' ' + uzClr.border + ' ring-1 ring-white/10 shadow-lg' : 'bg-white/[0.03] text-slate-300 border-white/[0.06] hover:bg-white/[0.06] hover:text-white hover:border-white/[0.12]'}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${active ? uzClr.dot : 'bg-slate-500'}`} />
                      <span>{u.uzmanlik}</span>
                      <span className="text-[10px] opacity-60 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded-md">{u.count.toLocaleString('tr-TR')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SIPARIS & KALEM TIPI BREAKDOWNS */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {stats?.bySiparis && stats.bySiparis.length > 0 && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-slate-400"><path d="M1 3h10M1 6h7M1 9h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Sipariş Durumu</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {stats.bySiparis.map((s: any) => {
                    const clr: Record<string, string> = { EVET: 'emerald', HAYIR: 'red', MONTAJ: 'violet', ['KONTROL EDİLECEK']: 'amber', NA: 'slate' };
                    const c = clr[s.siparis] || 'slate';
                    const active = filterSiparis === s.siparis;
                    return (
                      <button key={s.siparis} onClick={() => { setFilterSiparis(active ? '' : s.siparis); setPage(0); }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${active ? `bg-${c}-500/20 text-${c}-200 border border-${c}-400/30 shadow-sm` : 'bg-white/[0.03] text-slate-300 border border-white/[0.05] hover:bg-white/[0.06] hover:text-white'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full bg-${c}-400`} />
                        {s.siparis}
                        <span className="text-[9px] opacity-50 font-mono">{s.count.toLocaleString('tr-TR')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {stats?.byKalemTipi && stats.byKalemTipi.length > 0 && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-slate-400"><rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1" /><rect x="7" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1" /><rect x="1" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1" /><rect x="7" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1" /></svg>
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Kalem Tipi Dağılımı</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {stats.byKalemTipi.map((k: any) => {
                    const kClr = KALEM_CLR[k.kalemTipi] || 'bg-slate-700/40 text-slate-300 border-slate-600/30';
                    const active = filterKalemTipi === k.kalemTipi;
                    return (
                      <button key={k.kalemTipi} onClick={() => { setFilterKalemTipi(active ? '' : k.kalemTipi); setPage(0); }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${active ? kClr + ' ring-1 ring-white/10 shadow-sm' : 'bg-white/[0.03] text-slate-300 border-white/[0.05] hover:bg-white/[0.06] hover:text-white'}`}>
                        {k.kalemTipi}
                        <span className="text-[9px] opacity-50 font-mono">{k.count.toLocaleString('tr-TR')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* FILTER BAR */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
                {[['all', 'T\u00fcm\u00fc', total], ['review', '\u0130ncele', needsReview], ['modified', 'De\u011fi\u015fen', modified]].map(([k, l, c]) => (
                  <button key={k as string} onClick={() => { setFilter(k as string); setPage(0); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${filter === k ? 'bg-blue-500/20 text-blue-200 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                    {l} <span className="text-[10px] opacity-50 font-mono">{c}</span>
                  </button>
                ))}
              </div>

              <div className="w-px h-6 bg-white/[0.08] mx-1" />

              <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setPage(0); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-200 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 backdrop-blur-sm cursor-pointer">
                <option value="">Tüm Seviyeler</option>
                {[0,1,2,3,4,5,6,7,8].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
              <select value={filterSiparis} onChange={e => { setFilterSiparis(e.target.value); setPage(0); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-200 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 backdrop-blur-sm cursor-pointer">
                <option value="">Tüm Sipariş</option>
                {['EVET', 'HAYIR', 'MONTAJ', 'KONTROL EDİLECEK', 'NA'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterKalemTipi} onChange={e => { setFilterKalemTipi(e.target.value); setPage(0); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-200 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 backdrop-blur-sm cursor-pointer">
                <option value="">Tüm Kalem Tipi</option>
                {['F', 'Y', 'E', 'H', 'C', 'X DETAY', 'X-Kesilerek Kullanilan'].map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <select value={filterDagitim} onChange={e => { setFilterDagitim(e.target.value); setPage(0); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-200 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 backdrop-blur-sm cursor-pointer">
                <option value="">Tüm Dağıtım</option>
                {['EVET', 'HAYIR'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterPrototip2} onChange={e => { setFilterPrototip2(e.target.value); setPage(0); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-200 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 backdrop-blur-sm cursor-pointer">
                <option value="">Üretilecek araç</option>
                <option value="X">X (Evet)</option>
                <option value="YOK">Yok</option>
              </select>
              <select value={filterUzmanlik} onChange={e => { setFilterUzmanlik(e.target.value); setPage(0); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-200 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 backdrop-blur-sm cursor-pointer">
                <option value="">Tüm Uzmanlık</option>
                {(stats?.byUzmanlik || []).map((u: any) => <option key={u.uzmanlik} value={u.uzmanlik}>{u.uzmanlik} ({u.count})</option>)}
              </select>

              <div className="relative flex-1 min-w-[180px]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" /><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <input value={search} onChange={e => handleSearchInput(e.target.value)} onFocus={() => { if (searchResults.length > 0) setShowSearchResults(true); }} placeholder="Title, malzeme no, montaj no ara..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-200 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 placeholder-slate-500 backdrop-blur-sm transition-all" />
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl overflow-hidden shadow-2xl shadow-black/50 max-h-72 overflow-y-auto"
                    style={{ background: 'rgba(12, 16, 24, 0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Sonuçlar ({searchResults.length})</span>
                      <button onClick={() => setShowSearchResults(false)} className="text-[10px] text-slate-500 hover:text-white">&times;</button>
                    </div>
                    {searchResults.map(r => (
                      <button key={r.id} onClick={() => navigateToItem(r)}
                        className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-blue-500/[0.08] border-b border-white/[0.03] transition-colors">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold ${(LVL[r.level] || LVL[5]).badge}`}>{r.level}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-200 truncate">{r.title}</p>
                          <p className="text-[9px] text-slate-500 truncate">
                            #{r.rowNumber} {r.montajNo ? `· ${r.montajNo}` : ''} {r.malzemeNoSap ? `· ${r.malzemeNoSap}` : ''} {r.uzmanlik ? `· ${r.uzmanlik}` : ''}
                          </p>
                        </div>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-slate-500 shrink-0"><path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Go to row */}
              <div className="flex items-center gap-1">
                <input value={goToRow} onChange={e => setGoToRow(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => { if (e.key === 'Enter') handleGoToRow(); }}
                  placeholder="Satır #"
                  className="w-16 px-2 py-1.5 rounded-lg text-xs bg-white/[0.05] text-slate-200 border border-white/[0.08] focus:outline-none focus:border-blue-400/40 placeholder-slate-500 text-center" />
                <button onClick={handleGoToRow} disabled={!goToRow}
                  className="px-2 py-1.5 rounded-lg text-xs bg-blue-500/15 text-blue-300 border border-blue-400/20 hover:bg-blue-500/25 disabled:opacity-30 transition-all font-medium" title="Satıra git">
                  Git
                </button>
              </div>

              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                {activeFilters.map(f => (
                  <span key={f.key} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-${f.color}-500/15 text-${f.color}-200 border border-${f.color}-400/20 flex items-center gap-1.5 backdrop-blur-sm`}>
                    {f.label}
                    <button onClick={f.onClear} className="hover:text-white transition-colors">&times;</button>
                  </span>
                ))}
                {activeFilters.length > 1 && (
                  <button onClick={clearAllFilters} className="text-[10px] text-red-400/70 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all font-medium">Temizle</button>
                )}
                <span className="text-[11px] text-slate-400 font-mono ml-1">{total.toLocaleString('tr-TR')} kayıt</span>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div ref={tableRef} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.1] bg-white/[0.05]">
                    {canSelect && (
                      <th className="px-2 py-3 w-8">
                        <input type="checkbox" className="accent-purple-400 w-3.5 h-3.5 rounded cursor-pointer" checked={selectedItems.size > 0 && selectedItems.size === items.length}
                          onChange={e => { if (e.target.checked) setSelectedItems(new Set(items.map(i => i.id))); else setSelectedItems(new Set()); }} />
                      </th>
                    )}
                    {['#','Lv','Uzmanlık','OPS/STD','Ürt.araç','Montaj No','Montaj','Title','MalzNo SAP','Kalem','Sipariş','Dağıtım','Birim','Qty','Toplam','Durum',''].map(h => (
                      <th key={h} className="px-2 py-3 text-left text-[9px] font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={19} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-slate-400 text-sm">Yükleniyor...</span>
                      </div>
                    </td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={19} className="text-center py-20">
                      <div className="text-5xl mb-3 opacity-20">{'\uD83D\uDCCB'}</div>
                      <p className="text-slate-300 text-sm mb-1">Kayıt bulunamadı</p>
                      <p className="text-slate-500 text-xs">Filtrelerinizi değiştirmeyi deneyin</p>
                    </td></tr>
                  ) : items.map(item => {
                    const lvl = LVL[item.level] || LVL[5];
                    const isEditing = editingId === item.id;
                    const isModified = item.status === 'modified' || item.updatedAt;
                    const kalemClr = KALEM_CLR[item.kalemTipi] || 'bg-slate-700/40 text-slate-300 border-slate-600/30';
                    const uzClr = UZ_CLR[item.uzmanlik];
                    return (
                      <tr key={item.id} id={`bom-row-${item.rowNumber}`}
                        className={`border-b transition-colors duration-150 group
                          ${item.level === 2 ? 'border-blue-400/15 ' + lvl.row : item.level === 3 ? 'border-emerald-400/10 ' + lvl.row : 'border-white/[0.04]'}
                          ${item.needsReview ? 'bg-amber-500/[0.03]' : ''}
                          ${isModified ? 'bg-purple-500/[0.03]' : ''}
                          hover:bg-white/[0.06]`}>
                        {canSelect && (
                          <td className="px-2 py-1.5">
                            <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleSelect(item.id)}
                              className="accent-purple-400 w-3.5 h-3.5 rounded cursor-pointer" />
                          </td>
                        )}
                        <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{item.rowNumber}</td>
                        <td className="px-2 py-1.5"><span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[9px] font-bold ${lvl.badge}`}>{item.level}</span></td>
                        <td className="px-2 py-1.5 text-[10px] whitespace-nowrap">
                          {isEditing ? (
                            <select value={editForm.uzmanlik} onChange={e => setEditForm({ ...editForm, uzmanlik: e.target.value })}
                              className="w-20 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30">
                              <option value="">—</option>
                              {UZMANLIK_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          ) : item.uzmanlik ? (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${uzClr ? uzClr.bg + ' ' + uzClr.text + ' ' + uzClr.border : 'bg-slate-600/30 text-slate-300 border-slate-500/20'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${uzClr?.dot || 'bg-slate-400'}`} />
                              {item.uzmanlik}
                            </span>
                          ) : <span className="text-slate-500">{'\u2014'}</span>}
                        </td>
                        <td className="px-2 py-1.5 text-[10px] whitespace-nowrap">
                          {isEditing ? (
                            <select value={editForm.opsStd} onChange={e => setEditForm({ ...editForm, opsStd: e.target.value })}
                              className="w-20 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30">
                              <option value="">—</option>
                              <option value="STANDART">STANDART</option>
                              <option value="OPSİYONEL">OPSİYONEL</option>
                            </select>
                          ) : item.opsStd ? (
                            <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${item.opsStd === 'STANDART' ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25' : 'bg-amber-500/15 text-amber-200 border-amber-400/25'}`}>
                              {item.opsStd}
                            </span>
                          ) : <span className="text-slate-500">{'\u2014'}</span>}
                        </td>
                        <td className="px-2 py-1.5 text-[10px] text-center whitespace-nowrap">
                          {isEditing ? (
                            <select value={editForm.prototip2} onChange={e => setEditForm({ ...editForm, prototip2: e.target.value })}
                              className="w-14 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30">
                              <option value="">—</option>
                              <option value="X">X</option>
                            </select>
                          ) : item.prototip2 === 'X' ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold border border-rose-400/25">X</span>
                          ) : <span className="text-slate-600">{'\u2014'}</span>}
                        </td>
                        <td className="px-2 py-1.5 text-[10px] text-slate-300 font-mono max-w-[100px] truncate">
                          {isEditing ? (
                            <input value={editForm.montajNo} onChange={e => setEditForm({ ...editForm, montajNo: e.target.value })}
                              className="w-24 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30" />
                          ) : item.montajNo || ''}
                        </td>
                        <td className="px-2 py-1.5 text-[10px] text-slate-300 max-w-[90px] truncate">
                          {isEditing ? (
                            <input value={editForm.montaj} onChange={e => setEditForm({ ...editForm, montaj: e.target.value })}
                              className="w-24 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30" />
                          ) : item.montaj || ''}
                        </td>
                        <td className={`px-2 py-1.5 font-mono text-[10px] max-w-[200px] ${lvl.font}`} style={{ paddingLeft: Math.max(8, item.level * 12) }}>
                          <span className="truncate block">{item.title}</span>
                        </td>
                        <td className="px-2 py-1.5 text-[10px] text-slate-300 font-mono max-w-[90px] truncate">
                          {isEditing ? (
                            <input value={editForm.malzemeNoSap} onChange={e => setEditForm({ ...editForm, malzemeNoSap: e.target.value })}
                              className="w-24 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30" />
                          ) : item.malzemeNoSap || ''}
                        </td>
                        <td className="px-2 py-1.5">
                          {isEditing ? (
                            <select value={editForm.kalemTipi} onChange={e => setEditForm({ ...editForm, kalemTipi: e.target.value })}
                              className="w-16 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30">
                              <option value="">—</option>
                              {KALEM_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                          ) : (
                            <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${kalemClr}`}>
                              {item.kalemTipi || '\u2014'}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {isEditing ? (
                            <select value={editForm.siparis} onChange={e => setEditForm({ ...editForm, siparis: e.target.value })}
                              className="w-20 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30">
                              <option value="">—</option>
                              {['EVET','HAYIR','MONTAJ','KONTROL EDİLECEK','NA'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <span className={`text-[10px] font-semibold ${SIP_CLR[item.siparis] || 'text-slate-300'}`}>{item.siparis || ''}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {isEditing ? (
                            <select value={editForm.dagitim} onChange={e => setEditForm({ ...editForm, dagitim: e.target.value })}
                              className="w-16 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30">
                              <option value="">—</option>
                              <option value="EVET">EVET</option>
                              <option value="HAYIR">HAYIR</option>
                            </select>
                          ) : (
                            <span className="text-[10px] text-slate-300">{item.dagitim || ''}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {isEditing ? (
                            <select value={editForm.birim} onChange={e => setEditForm({ ...editForm, birim: e.target.value })}
                              className="w-14 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30">
                              <option value="">—</option>
                              {BIRIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          ) : (
                            <span className="text-[10px] text-slate-300">{item.birim || ''}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-[10px] font-mono text-slate-200">
                          {isEditing ? (
                            <input type="number" step="any" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })}
                              className="w-14 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30" />
                          ) : item.quantity ?? ''}
                        </td>
                        <td className="px-2 py-1.5 text-[10px] font-mono text-emerald-200 font-semibold">
                          {isEditing ? (
                            <input type="number" step="any" value={editForm.toplamMiktar} onChange={e => setEditForm({ ...editForm, toplamMiktar: e.target.value })}
                              className="w-14 px-1 py-0.5 rounded text-[10px] bg-white/[0.08] text-white border border-blue-400/30" />
                          ) : item.toplamMiktar ?? ''}
                        </td>
                        <td className="px-2 py-1.5">
                          {isModified && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-purple-500/15 text-purple-200 border border-purple-400/20">
                              <span className="w-1 h-1 rounded-full bg-purple-400" /> değişti
                            </span>
                          )}
                          {item.needsReview && !isModified && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-amber-500/15 text-amber-200 border border-amber-400/20">
                              <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" /> incele
                            </span>
                          )}
                          {!isModified && !item.needsReview && <span className="text-emerald-400/50 text-xs">{'\u2713'}</span>}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => saveEdit(item.id)} className="px-2 py-0.5 text-[9px] rounded bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 font-semibold border border-emerald-400/20">Kaydet</button>
                              <button onClick={cancelEdit} className="px-2 py-0.5 text-[9px] rounded bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08]">İptal</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {canEdit && item.level >= 2 && (
                                <button onClick={() => startEdit(item)} className="px-2 py-0.5 text-[9px] rounded-md bg-blue-500/15 text-blue-200 hover:bg-blue-500/25 font-semibold transition-all border border-blue-400/20">Düzenle</button>
                              )}
                              {hasActiveFilters && (
                                <button onClick={() => navigateToItem(item)} className="px-2 py-0.5 text-[9px] rounded-md bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 font-semibold transition-all border border-cyan-400/20" title="Listedeki sırasına git">
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="inline"><path d="M5 1v6M3 5l2 2 2-2M1 9h8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                                </button>
                              )}
                              {isModified && (
                                <button onClick={() => showHistory(item)} className="px-2 py-0.5 text-[9px] rounded-md bg-purple-500/12 text-purple-200 hover:bg-purple-500/20 transition-all border border-purple-400/15">Geçmiş</button>
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

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-white/[0.08] px-5 py-3 bg-white/[0.02]">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="px-4 py-2 text-xs rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] disabled:opacity-20 text-slate-200 transition-all font-medium flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                Önceki
              </button>
              <div className="flex items-center gap-2">
                {totalPages <= 7 ? (
                  Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === i ? 'bg-blue-500/25 text-blue-200 border border-blue-400/30' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'}`}>
                      {i + 1}
                    </button>
                  ))
                ) : (
                  <>
                    {[0, 1].map(i => (
                      <button key={i} onClick={() => setPage(i)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === i ? 'bg-blue-500/25 text-blue-200 border border-blue-400/30' : 'text-slate-400 hover:bg-white/[0.06]'}`}>
                        {i + 1}
                      </button>
                    ))}
                    {page > 2 && <span className="text-slate-600 text-xs px-1">...</span>}
                    {page > 1 && page < totalPages - 2 && (
                      <button className="w-8 h-8 rounded-lg text-xs font-medium bg-blue-500/25 text-blue-200 border border-blue-400/30">{page + 1}</button>
                    )}
                    {page < totalPages - 3 && <span className="text-slate-600 text-xs px-1">...</span>}
                    {[totalPages - 2, totalPages - 1].filter(i => i > 1).map(i => (
                      <button key={i} onClick={() => setPage(i)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === i ? 'bg-blue-500/25 text-blue-200 border border-blue-400/30' : 'text-slate-400 hover:bg-white/[0.06]'}`}>
                        {i + 1}
                      </button>
                    ))}
                  </>
                )}
              </div>
              <button onClick={() => setPage(page + 1)} disabled={items.length < 200}
                className="px-4 py-2 text-xs rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] disabled:opacity-20 text-slate-200 transition-all font-medium flex items-center gap-1.5">
                Sonraki
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M4 2l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL — 3 Options (Engineer → Admin Approval) */}
      {editItem && editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg" onClick={cancelEdit}>
          <div className="bg-[#0d1117]/95 border border-white/[0.1] rounded-3xl p-7 w-full max-w-md shadow-2xl animate-slide-up relative backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
            <h3 className="text-xl font-bold text-white mb-1">Düzenleme Talebi</h3>
            <p className="text-xs text-slate-400 mb-1">
              #{editItem.rowNumber} · L{editItem.level} · {editItem.title}
              {editItem.montajNo ? ` · ${editItem.montajNo}` : ''}
            </p>
            <p className="text-[10px] text-amber-300/70 mb-5 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1"/><path d="M5 3v2.5M5 7v.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
              Admin onayı gerektirir
            </p>

            {editMode === 'select' && (
              <div className="space-y-3">
                <button onClick={() => setEditMode('adet')}
                  className="w-full text-left px-5 py-4 rounded-2xl bg-blue-500/[0.08] border border-blue-400/20 hover:bg-blue-500/[0.15] hover:border-blue-400/40 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-300 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M5 9h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-blue-200 transition-colors">Adet Yanlışlığı</p>
                      <p className="text-[11px] text-slate-400">Doğru miktarı girin</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => setEditMode('siparis_hayir')}
                  className="w-full text-left px-5 py-4 rounded-2xl bg-red-500/[0.08] border border-red-400/20 hover:bg-red-500/[0.15] hover:border-red-400/40 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-300 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-red-200 transition-colors">Sipariş Edilmemeli</p>
                      <p className="text-[11px] text-slate-400">Açıklama / yorum girin</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => setEditMode('malzeme_eksik')}
                  className="w-full text-left px-5 py-4 rounded-2xl bg-amber-500/[0.08] border border-amber-400/20 hover:bg-amber-500/[0.15] hover:border-amber-400/40 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M9 6v4M9 12.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">Malzeme Eksikliği</p>
                      <p className="text-[11px] text-slate-400">İlgili montaja ait sipariş edilecek malzeme eksik</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {editMode === 'adet' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Mevcut Miktar</label>
                  <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300 text-sm font-mono">{editItem.quantity ?? '—'}</div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Doğru Miktar</label>
                  <input type="number" step="any" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-blue-400/30 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400/60 text-sm" placeholder="Doğru miktarı girin" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Açıklama <span className="text-red-400">*</span></label>
                  <textarea value={editComment} onChange={e => setEditComment(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-blue-400/40 text-sm h-20 resize-none" placeholder="Neden adet değişikliği gerekiyor?" />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button onClick={() => setEditMode('select')} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:bg-white/[0.06] transition-all">Geri</button>
                  <button onClick={handleEditSubmit} disabled={!editValue || !editComment}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-500/80 text-white hover:bg-blue-500 disabled:opacity-40 transition-all">Talep Gönder</button>
                </div>
              </div>
            )}

            {editMode === 'siparis_hayir' && (
              <div className="space-y-4">
                <div className="px-4 py-3 rounded-xl bg-red-500/[0.08] border border-red-400/15">
                  <p className="text-xs text-red-200 font-medium">Bu kalem "Sipariş Edilmemeli" olarak işaretlenecek</p>
                  <p className="text-[10px] text-red-300/60 mt-0.5">Sipariş durumu HAYIR olarak güncellenecek</p>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Açıklama <span className="text-red-400">*</span></label>
                  <textarea value={editComment} onChange={e => setEditComment(e.target.value)} autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-red-400/40 text-sm h-24 resize-none" placeholder="Neden sipariş edilmemeli? Detaylı açıklama yazın" />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button onClick={() => setEditMode('select')} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:bg-white/[0.06] transition-all">Geri</button>
                  <button onClick={handleEditSubmit} disabled={!editComment}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-red-500/80 text-white hover:bg-red-500 disabled:opacity-40 transition-all">Talep Gönder</button>
                </div>
              </div>
            )}

            {editMode === 'malzeme_eksik' && (
              <div className="space-y-4">
                <div className="px-4 py-3 rounded-xl bg-amber-500/[0.08] border border-amber-400/15">
                  <p className="text-xs text-amber-200 font-medium">İlgili montaja ait sipariş edilecek malzeme eksikliği</p>
                  <p className="text-[10px] text-amber-300/60 mt-0.5">Kalem inceleme gerektiren olarak işaretlenecek</p>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1.5">Açıklama <span className="text-red-400">*</span></label>
                  <textarea value={editComment} onChange={e => setEditComment(e.target.value)} autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/40 text-sm h-24 resize-none" placeholder="Eksik malzeme detaylarını yazın" />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button onClick={() => setEditMode('select')} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:bg-white/[0.06] transition-all">Geri</button>
                  <button onClick={handleEditSubmit} disabled={!editComment}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-amber-500/80 text-white hover:bg-amber-500 disabled:opacity-40 transition-all">Talep Gönder</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg" onClick={() => setShowTaskModal(false)}>
          <div className="bg-[#0d1117]/95 border border-white/[0.1] rounded-3xl p-7 w-full max-w-md shadow-2xl animate-slide-up relative backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
            <h3 className="text-xl font-bold text-white mb-1">Ticket Oluştur</h3>
            <p className="text-xs text-slate-400 mb-6">{selectedItems.size} kalem seçili</p>
            <div className="space-y-4">
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Ticket başlığı"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-purple-400/40 text-sm" />
              <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Açıklama (opsiyonel)"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-purple-400/40 text-sm h-24 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 text-sm flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1a6 6 0 100 12A6 6 0 007 1z" stroke="currentColor" strokeWidth="1.2"/><path d="M5 7h4M7 5v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  Admin'e atanacak
                </div>
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-200 focus:outline-none text-sm">
                  <option value="low">Düşük</option><option value="medium">Orta</option><option value="high">Yüksek</option><option value="critical">Kritik</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowTaskModal(false)} className="px-5 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/[0.06] transition-all">İptal</button>
              <button onClick={handleCreateTask} disabled={!taskTitle || taskCreating}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-purple-500/80 text-white hover:bg-purple-500 disabled:opacity-40 transition-all">
                {taskCreating ? 'Oluşturuluyor...' : 'Ticket Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT REQUESTS APPROVAL MODAL (Admin) */}
      {showEditRequests && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg" onClick={() => setShowEditRequests(false)}>
          <div className="bg-[#0d1117]/95 border border-white/[0.1] rounded-3xl p-7 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl animate-slide-up relative backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
            <h3 className="text-xl font-bold text-white mb-1">Onay Bekleyen Düzenleme Talepleri</h3>
            <p className="text-xs text-slate-400 mb-5">{editRequests.length} talep bekliyor</p>
            {editRequests.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Bekleyen talep yok</p>
            ) : (
              <div className="space-y-3">
                {editRequests.map((req: any) => {
                  const typeLabels: Record<string, { label: string; color: string; icon: string }> = {
                    adet: { label: 'Adet Yanlışlığı', color: 'blue', icon: '±' },
                    siparis_hayir: { label: 'Sipariş Edilmemeli', color: 'red', icon: '✕' },
                    malzeme_eksik: { label: 'Malzeme Eksikliği', color: 'amber', icon: '!' },
                  };
                  const t = typeLabels[req.editType] || { label: req.editType, color: 'slate', icon: '?' };
                  return (
                    <div key={req.id} className={`bg-white/[0.04] border border-${t.color}-400/20 rounded-xl p-4`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg bg-${t.color}-500/20 text-${t.color}-300 text-[10px] font-bold`}>{t.icon}</span>
                            <span className={`text-xs font-semibold text-${t.color}-200`}>{t.label}</span>
                            <span className="text-[10px] text-slate-500">{new Date(req.createdAt).toLocaleString('tr-TR')}</span>
                          </div>
                          {req.bomItem && (
                            <p className="text-[11px] text-slate-300 mb-1.5">
                              #{req.bomItem.rowNumber} · L{req.bomItem.level} · <span className="text-white font-medium">{req.bomItem.title}</span>
                              {req.bomItem.montajNo ? ` · ${req.bomItem.montajNo}` : ''}
                            </p>
                          )}
                          {req.editType === 'adet' && (
                            <div className="flex items-center gap-2 text-xs mb-1.5">
                              <span className="text-red-300/70 line-through">{req.oldValue || '—'}</span>
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 5h4M5.5 3l2 2-2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>
                              <span className="text-emerald-200 font-medium">{req.newValue || '—'}</span>
                            </div>
                          )}
                          {req.comment && (
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 mt-1.5">
                              <p className="text-[10px] text-slate-400 font-medium mb-0.5">Açıklama:</p>
                              <p className="text-[11px] text-slate-200">{req.comment}</p>
                            </div>
                          )}
                          <p className="text-[10px] text-slate-500 mt-1.5">
                            Talep eden: <span className="text-slate-300">{req.requestedByUser?.fullName || '—'}</span>
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={() => handleReviewRequest(req.id, 'approved')}
                            className="px-4 py-2 text-[11px] rounded-lg bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 font-semibold transition-all border border-emerald-400/25 flex items-center gap-1.5">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Onayla
                          </button>
                          <button onClick={() => handleReviewRequest(req.id, 'rejected')}
                            className="px-4 py-2 text-[11px] rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 font-semibold transition-all border border-red-400/20 flex items-center gap-1.5">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                            Reddet
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => setShowEditRequests(false)} className="mt-5 px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] w-full transition-all font-medium">Kapat</button>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg" onClick={() => setHistoryItem(null)}>
          <div className="bg-[#0d1117]/95 border border-white/[0.1] rounded-3xl p-7 w-full max-w-lg max-h-[70vh] overflow-y-auto shadow-2xl animate-slide-up relative backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
            <h3 className="text-xl font-bold text-white mb-1">Değişiklik Geçmişi</h3>
            <p className="text-xs text-slate-400 mb-5">#{historyItem.rowNumber} &middot; {historyItem.title}</p>
            {historyData.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Henüz değişiklik yok</p>
            ) : (
              <div className="space-y-3">
                {historyData.map((log: any, i: number) => (
                  <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-purple-200">{log.fieldName}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.changedAt).toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-300/70 line-through">{log.oldValue || '\u2014'}</span>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 5h4M5.5 3l2 2-2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>
                      <span className="text-emerald-200 font-medium">{log.newValue || '\u2014'}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">{log.changedBy?.fullName || ''}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setHistoryItem(null)} className="mt-5 px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] w-full transition-all font-medium">Kapat</button>
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
        <span className="text-slate-400 group-hover:text-slate-300 transition-colors">{icon}</span>
        <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{(value || 0).toLocaleString('tr-TR')}</p>
    </div>
  );
}

function HorizontalBarChart({ rows }: { rows: { label: string; value: number; color: string }[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);
  if (!rows.length) {
    return <p className="text-xs text-slate-500">Grafik verisi bulunamadı</p>;
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const pct = max > 0 ? Math.max(3, Math.round((r.value / max) * 100)) : 0;
        return (
          <div key={r.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-300">{r.label}</span>
              <span className="text-[11px] text-white font-mono">{r.value.toLocaleString('tr-TR')}</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.07] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: r.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
