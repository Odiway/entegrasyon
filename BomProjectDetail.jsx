import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getProject, getItems, getStats, updateItem, bulkResolve,
  exportProject, uploadKalemTipi, reprocessProject, getNav,
} from './bomApi';

const KALEM_OPTIONS = ['F','Y','E','H','C','X DETAY','X-Kesilerek Kullanilan','Kesilerek kullaniliyor'];
const BIRIM_OPTIONS = ['AD','KG','M','M2','L','D'];

const LEVEL_COLORS = {
  0: { badge: 'bg-slate-700 text-slate-300', row: 'bg-slate-900/40' },
  1: { badge: 'bg-slate-700 text-slate-300', row: 'bg-slate-900/30' },
  2: { badge: 'bg-blue-600/90 text-white', row: 'bg-blue-500/[0.06]' },
  3: { badge: 'bg-emerald-500/90 text-white', row: 'bg-emerald-500/[0.04]' },
  4: { badge: 'bg-slate-700/80 text-slate-400', row: '' },
  5: { badge: 'bg-slate-800 text-slate-400', row: '' },
  6: { badge: 'bg-slate-800 text-slate-500', row: '' },
  7: { badge: 'bg-slate-800/80 text-slate-500', row: '' },
  8: { badge: 'bg-slate-800/60 text-slate-600', row: '' },
};
function ls(level) { return LEVEL_COLORS[level] || LEVEL_COLORS[8]; }

const KALEM_CLR = {
  'F': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  'Y': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'E': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'H': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'C': 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'X DETAY': 'bg-red-500/10 text-red-400/80 border-red-500/15',
  'NA': 'bg-slate-800/50 text-slate-600 border-slate-700/30',
};
const SIP_CLR = { EVET:'text-emerald-400', HAYIR:'text-red-400/60', MONTAJ:'text-violet-400', 'KONTROL EDILECEK':'text-amber-400', IPTAL:'text-slate-600', NA:'text-slate-700' };
const DAG_CLR = { EVET:'text-emerald-400/70', HAYIR:'text-red-400/50' };

const KESILEREK_TYPES = new Set(['X-Kesilerek Kullanilan', 'Kesilerek kullaniliyor']);

function parseUsageAmount(val) {
  if (val == null || val === '') return null;
  const num = parseFloat(String(val).replace(',', '.').replace(/\s/g, ''));
  return isNaN(num) ? null : num;
}

function isZeroUsage(val) {
  const num = parseUsageAmount(val);
  return num !== null && num === 0;
}

export default function BomProjectDetail({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [nav, setNav] = useState([]);
  const [filter, setFilter] = useState('all');
  const [filterUzmanlik, setFilterUzmanlik] = useState('');
  const [filterKalemTipi, setFilterKalemTipi] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterSiparis, setFilterSiparis] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadingKalem, setUploadingKalem] = useState(false);
  const [kalemMsg, setKalemMsg] = useState('');
  const [navOpen, setNavOpen] = useState(true);
  const [navFilter, setNavFilter] = useState('');
  const [expandedL2, setExpandedL2] = useState(new Set());
  const [currentRow, setCurrentRow] = useState(0);
  const [filterHesaplanan, setFilterHesaplanan] = useState(false);
  const kalemFileRef = useRef(null);
  const navScrollRef = useRef(null);

  const loadProject = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([getProject(projectId), getStats(projectId)]);
    setProject(pRes.data); setStats(sRes.data);
  }, [projectId]);

  const loadNav = useCallback(async () => { setNav((await getNav(projectId)).data); }, [projectId]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const p = { offset: page * 500, limit: 500 };
    if (filter === 'review') p.needs_review = true;
    if (filter === 'resolved') p.needs_review = false;
    if (filterUzmanlik) p.uzmanlik = filterUzmanlik;
    if (filterKalemTipi) p.kalem_tipi = filterKalemTipi;
    if (filterLevel) p.level = filterLevel;
    if (filterSiparis) p.siparis = filterSiparis;
    setItems((await getItems(projectId, p)).data);
    setLoading(false);
  }, [projectId, filter, filterUzmanlik, filterKalemTipi, filterLevel, filterSiparis, page]);

  useEffect(() => { loadProject(); loadNav(); }, [loadProject, loadNav]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const navTree = useMemo(() => {
    const tree = []; let cur = null;
    for (const n of nav) {
      if (n.level === 2) { cur = { l2: n, l3s: [] }; tree.push(cur); }
      else if (n.level === 3 && cur) cur.l3s.push(n);
    }
    return tree;
  }, [nav]);

  const filteredNavTree = useMemo(() => {
    if (!navFilter) return navTree;
    const q = navFilter.toLowerCase();
    return navTree.filter(g => g.l2.title.toLowerCase().includes(q) || g.l3s.some(l3 => l3.title.toLowerCase().includes(q)));
  }, [navTree, navFilter]);

  const scrollNavIntoView = (rowNumber) => {
    setTimeout(() => {
      const navEl = document.getElementById('nav-' + rowNumber);
      if (navEl && navScrollRef.current) {
        const container = navScrollRef.current;
        const elRect = navEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
          container.scrollTop += elRect.top - containerRect.top - container.clientHeight / 3;
        }
      }
    }, 100);
  };

  const jumpToRow = (rowNumber) => {
    const targetPage = Math.floor((rowNumber - 1) / 500);
    if (filter !== 'all') { setFilter('all'); setFilterUzmanlik(''); }
    if (filterHesaplanan) setFilterHesaplanan(false);
    if (targetPage !== page) setPage(targetPage);
    scrollNavIntoView(rowNumber);
    setTimeout(() => {
      const el = document.getElementById('row-' + rowNumber);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2','ring-blue-400/60'); setTimeout(() => el.classList.remove('ring-2','ring-blue-400/60'), 2500); }
    }, 400);
  };

  const level2Rows = useMemo(() => items.filter(i => i.level === 2).map(i => i.row_number), [items]);
  const level3Rows = useMemo(() => items.filter(i => i.level === 3).map(i => i.row_number), [items]);

  const jumpAdj = (rows, dir) => {
    const sorted = [...rows].sort((a,b) => a - b);
    const t = dir === 'next' ? sorted.find(r => r > currentRow) : [...sorted].reverse().find(r => r < currentRow);
    if (t) { setCurrentRow(t); const el = document.getElementById('row-' + t); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2','ring-blue-400/60'); setTimeout(() => el.classList.remove('ring-2','ring-blue-400/60'), 2000); } }
  };

  const toggleL2 = (row) => setExpandedL2(prev => { const n = new Set(prev); if (n.has(row)) n.delete(row); else n.add(row); return n; });

  const handleItemUpdate = async (item, field, value) => {
    const data = { [field]: value }; if (field === 'kalem_tipi') data.needs_review = false;
    await updateItem(projectId, item.id, data); await loadItems(); await loadProject();
  };

  const handleBulkResolve = async (materialNo, kalemTipi, birim) => {
    await bulkResolve(projectId, { material_no: materialNo, kalem_tipi: kalemTipi, birim: birim || undefined, save_to_master: true });
    await loadItems(); await loadProject();
  };

  const handleKalemUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingKalem(true); setKalemMsg('');
    try {
      const d = (await uploadKalemTipi(projectId, file)).data;
      setKalemMsg('ok:' + (d.import?.total||0) + ' malzeme yuklendi, ' + (d.reprocess?.resolved||0) + '/' + (d.reprocess?.total||0) + ' satir cozuldu');
      await loadProject(); await loadItems(); await loadNav();
    } catch (err) { setKalemMsg('err:' + (err?.response?.data?.detail || 'Yukleme basarisiz')); }
    finally { setUploadingKalem(false); if (kalemFileRef.current) kalemFileRef.current.value = ''; }
  };

  const handleReprocess = async () => {
    setKalemMsg('');
    try { const d = (await reprocessProject(projectId)).data; setKalemMsg('ok:Yeniden islendi: ' + d.resolved + '/' + d.total + ' satir cozuldu'); await loadProject(); await loadItems(); }
    catch { setKalemMsg('err:Yeniden isleme hatasi'); }
  };

  if (!project) return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const progress = project.total_rows > 0 ? Math.round((project.resolved_rows / project.total_rows) * 100) : 0;

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-6">
      <div className="flex gap-5">
        {/* Nav Sidebar */}
        <div className={navOpen ? 'w-72 shrink-0' : 'w-10 shrink-0'} style={{ transition: 'width 0.2s' }}>
          <div className="sticky top-[72px]">
            <button onClick={() => setNavOpen(!navOpen)} className="w-9 h-9 rounded-lg border border-white/[0.06] bg-[#161b22] flex items-center justify-center text-slate-500 hover:text-white transition mb-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: navOpen?'rotate(180deg)':'none', transition:'transform 0.2s' }}><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {navOpen && (
              <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Navigasyon</span>
                    <span className="text-[10px] text-slate-700">{navTree.length} grup</span>
                  </div>
                  <div className="relative">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/><path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    <input type="text" placeholder="Ara..." value={navFilter} onChange={e => setNavFilter(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-7 pr-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/30" />
                  </div>
                </div>
                <div ref={navScrollRef} className="max-h-[calc(100vh-180px)] overflow-y-auto">
                  {filteredNavTree.map(group => (
                    <div key={group.l2.row_number}>
                      <button id={'nav-' + group.l2.row_number} onClick={() => { jumpToRow(group.l2.row_number); toggleL2(group.l2.row_number); }} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-500/[0.08] border-b border-white/[0.04] transition">
                        <div className="flex items-center gap-2">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="shrink-0 text-zinc-600" style={{ transform: expandedL2.has(group.l2.row_number)?'rotate(90deg)':'none', transition:'transform 0.15s' }}><path d="M2 1l4 3-4 3" fill="currentColor"/></svg>
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600/90 text-white">L2</span>
                          <span className="text-blue-300/90 font-medium truncate">{group.l2.title}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-5 mt-0.5">
                          <span className="text-[10px] text-zinc-600">{group.l2.uzmanlik}</span>
                          <span className="text-[10px] text-zinc-700">#{group.l2.row_number}</span>
                          <span className="text-[10px] text-zinc-700">{group.l3s.length} alt</span>
                        </div>
                      </button>
                      {expandedL2.has(group.l2.row_number) && group.l3s.map(l3 => (
                        <button id={'nav-' + l3.row_number} key={l3.row_number} onClick={() => jumpToRow(l3.row_number)} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-emerald-500/[0.06] border-b border-white/[0.02] transition pl-8">
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 w-1 h-1 rounded-full bg-emerald-500/60" />
                            <span className="text-emerald-400/70 truncate hover:text-emerald-300">{l3.title}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition mb-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 2L3 6l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Projeler
              </button>
              <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <label className={'px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ' + (uploadingKalem ? 'bg-zinc-800 text-zinc-500' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20')}>
                {uploadingKalem ? 'Yukleniyor...' : 'Kalem Tipi Yukle'}
                <input ref={kalemFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleKalemUpload} disabled={uploadingKalem} />
              </label>
              <button onClick={handleReprocess} className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-sm font-medium transition-all">Yeniden Isle</button>
              <a href={exportProject(projectId) + '?t=' + Date.now()} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium transition-all">Excel Indir</a>
            </div>
          </div>

          {kalemMsg && (
            <div className={'mb-5 p-4 rounded-xl text-sm flex items-center gap-2 ' + (kalemMsg.startsWith('ok:') ? 'bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400' : 'bg-red-500/[0.08] border border-red-500/20 text-red-400')}>
              <span>{kalemMsg.startsWith('ok:') ? '✓' : '⚠'}</span>{kalemMsg.replace(/^(ok:|err:)/, '')}
            </div>
          )}

          {/* Progress + Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="col-span-2 bg-[#161b22] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ilerleme</span>
                <span className={'text-2xl font-bold tracking-tight ' + (progress===100?'text-emerald-400':'text-white')}>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div className={'h-full rounded-full transition-all duration-500 ' + (progress===100?'bg-gradient-to-r from-emerald-500 to-emerald-400':'bg-gradient-to-r from-blue-600 to-blue-400')} style={{ width: progress+'%' }} />
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-500">
                <span>Toplam <b className="text-white font-semibold">{project.total_rows?.toLocaleString('tr-TR')}</b></span>
                <span>Cozuldu <b className="text-emerald-400 font-semibold">{project.resolved_rows?.toLocaleString('tr-TR')}</b></span>
                <span>Bekliyor <b className="text-amber-400 font-semibold">{project.unresolved_rows?.toLocaleString('tr-TR')}</b></span>
              </div>
            </div>
            {stats && <>
              <MiniStat title="Kalem Tipi" data={stats.by_kalem_tipi} accent="blue" />
              <MiniStat title="Siparis" data={stats.by_siparis} accent="emerald" />
            </>}
          </div>

          {/* Uzmanlik Stats */}
          {stats && Object.keys(stats.by_uzmanlik || {}).length > 1 && (
            <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-4 mb-6">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Uzmanlik Dagilimi</span>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {Object.entries(stats.by_uzmanlik).sort((a,b) => b[1] - a[1]).slice(0,12).map(([key, val]) => (
                  <button key={key} onClick={() => { setFilterUzmanlik(key === filterUzmanlik ? '' : (key === 'N/A' ? '' : key)); setPage(0); }}
                    className={'px-2.5 py-1 rounded-lg text-xs transition-all ' + (filterUzmanlik === key ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]')}>
                    {key} <span className="text-slate-600 ml-1">{val}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kalem Tipi Filter */}
          {stats && Object.keys(stats.by_kalem_tipi || {}).length > 0 && (
            <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-4 mb-6">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Kalem Tipi Filtre</span>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {Object.entries(stats.by_kalem_tipi).sort((a,b) => b[1] - a[1]).map(([key, val]) => (
                  <button key={key} onClick={() => { setFilterKalemTipi(key === filterKalemTipi ? '' : key); setPage(0); }}
                    className={'px-2.5 py-1 rounded-lg text-xs transition-all ' + (filterKalemTipi === key ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]')}>
                    {key} <span className="text-slate-600 ml-1">{val}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Siparis Durumu Filter */}
          {stats && Object.keys(stats.by_siparis || {}).length > 0 && (
            <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-4 mb-6">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Sipariş Durumu Filtre</span>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {Object.entries(stats.by_siparis).sort((a,b) => b[1] - a[1]).map(([key, val]) => (
                  <button key={key} onClick={() => { setFilterSiparis(key === filterSiparis ? '' : key); setPage(0); }}
                    className={'px-2.5 py-1 rounded-lg text-xs transition-all ' + (filterSiparis === key ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]')}>
                    {key} <span className="text-slate-600 ml-1">{val}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {[['all','Tumu'],['review',`Inceleme (${project.unresolved_rows})`],['resolved','Cozulenler']].map(([k,l]) => (
              <button key={k} onClick={() => { setFilter(k); setFilterHesaplanan(false); setPage(0); }} className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' + (filter===k && !filterHesaplanan ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]')}>{l}</button>
            ))}
            <button onClick={() => { setFilterHesaplanan(!filterHesaplanan); setPage(0); }} className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' + (filterHesaplanan ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]')}>Miktar Hesaplananlar</button>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            {/* Level filter dropdown */}
            <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setPage(0); }}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.03] text-slate-400 border border-white/[0.06] focus:outline-none focus:border-purple-500/40 appearance-none cursor-pointer"
              style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '22px'}}>
              <option value="">Tum Seviyeler</option>
              {[0,1,2,3,4,5,6,7,8].map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            {[['L2', level2Rows, 'blue'],['L3', level3Rows, 'emerald']].map(([label, rows, c]) => (
              <div key={label} className="flex items-center gap-0.5 bg-slate-800/50 rounded-lg p-0.5">
                <span className="text-[10px] text-slate-600 px-1.5">{label}</span>
                <button onClick={() => jumpAdj(rows, 'prev')} className={`w-6 h-6 rounded flex items-center justify-center text-${c}-400 hover:bg-${c}-500/20 transition`}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 6l3-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </button>
                <button onClick={() => jumpAdj(rows, 'next')} className={`w-6 h-6 rounded flex items-center justify-center text-${c}-400 hover:bg-${c}-500/20 transition`}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
            {/* Active filter badges */}
            <div className="ml-auto flex items-center gap-1.5">
              {filterKalemTipi && <span className="px-2.5 py-1 rounded-lg text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">KT: {filterKalemTipi}<button onClick={() => setFilterKalemTipi('')} className="text-purple-400 hover:text-white">×</button></span>}
              {filterSiparis && <span className="px-2.5 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">Sip: {filterSiparis}<button onClick={() => setFilterSiparis('')} className="text-amber-400 hover:text-white">×</button></span>}
              {filterLevel && <span className="px-2.5 py-1 rounded-lg text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1.5">L{filterLevel}<button onClick={() => setFilterLevel('')} className="text-orange-400 hover:text-white">×</button></span>}
              {filterUzmanlik && <span className="px-2.5 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">{filterUzmanlik}<button onClick={() => setFilterUzmanlik('')} className="text-blue-400 hover:text-white">×</button></span>}
            </div>
          </div>

          {/* Level legend */}
          <div className="flex items-center gap-1.5 mb-3 text-[10px]">
            <span className="text-slate-700 mr-0.5">Seviyeler:</span>
            {[0,1,2,3,4,5,6,7,8].map(l => <span key={l} className={'px-1.5 py-0.5 rounded-md ' + ls(l).badge}>L{l}</span>)}
          </div>

          {/* Table */}
          <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-500 text-[11px]">
                    {['#','Lv','Uzmanlik','Montaj','Title','MalzNo/SAP','Kalem Tipi','Siparis','Dagitim','Birim','Qty','Kul.Mik','Hes.Mik','Durum'].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={14} className="text-center py-12 text-slate-600">
                      <div className="flex items-center justify-center gap-3"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Yukleniyor...</div>
                    </td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={14} className="text-center py-12 text-slate-600">Kayit bulunamadi</td></tr>
                  ) : (filterHesaplanan ? items.filter(it => it.level >= 3 && it.toplam_miktar != null && (!KESILEREK_TYPES.has(it.kalem_tipi) || parseUsageAmount(it.kullanim_miktari) > 0)) : items).map(item => (
                    <ItemRow key={item.id} item={item} onUpdate={handleItemUpdate} onBulkResolve={handleBulkResolve} onRowClick={setCurrentRow} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400 transition">← Onceki</button>
              <span className="text-xs text-slate-600">Sayfa <span className="text-slate-400">{page + 1}</span> · Satir {(page*500+1).toLocaleString('tr-TR')}-{Math.min((page+1)*500, project.total_rows).toLocaleString('tr-TR')}</span>
              <button onClick={() => setPage(page + 1)} disabled={items.length < 500} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400 transition">Sonraki →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ItemRow({ item, onUpdate, onBulkResolve, onRowClick }) {
  const [editing, setEditing] = useState(false);
  const [kalem, setKalem] = useState(item.kalem_tipi);
  const [birim, setBirim] = useState(item.birim);
  const style = ls(item.level);
  const isL2 = item.level === 2, isL3 = item.level === 3;

  const isKesilerek = KESILEREK_TYPES.has(item.kalem_tipi);
  const zeroUsage = item.level >= 3 && isZeroUsage(item.kullanim_miktari);
  const usageNum = parseUsageAmount(item.kullanim_miktari);

  // ── Quantity Hesaplama ──
  // X-Kesilerek: Q × ParentQ × Kullanım Miktarı (usage=0 ise HATA)
  // Normal:     Adet × Q × ParentQ  (= toplam_miktar, backend zaten hesaplıyor)
  let hesaplananMik = null;
  let hesapFormul = '';
  if (item.toplam_miktar != null && item.level >= 3) {
    if (isKesilerek) {
      if (usageNum != null && usageNum > 0) {
        hesaplananMik = item.toplam_miktar * usageNum;
        hesapFormul = `${item.toplam_miktar} (Q\u00D7ParentQ) \u00D7 ${usageNum} (Kul.Mik) = ${hesaplananMik}`;
      } else if (zeroUsage) {
        hesapFormul = 'Kullan\u0131m miktar\u0131 0 \u2014 PLM hatas\u0131';
      }
    } else {
      hesaplananMik = item.toplam_miktar;
      hesapFormul = `Adet \u00D7 Q \u00D7 ParentQ = ${hesaplananMik}`;
    }
  }

  const hasWarning = zeroUsage;

  return (
    <tr id={'row-' + item.row_number} onClick={() => onRowClick(item.row_number)}
      className={'border-b transition-all cursor-pointer ' +
        (isL2 ? 'border-blue-500/20 ' + style.row + ' hover:bg-blue-500/[0.1]' : isL3 ? 'border-emerald-500/10 ' + style.row + ' hover:bg-emerald-500/[0.06]' : 'border-white/[0.03] hover:bg-white/[0.03]') +
        (item.needs_review ? ' ring-1 ring-inset ring-amber-500/15' : '') +
        (hasWarning ? ' ring-1 ring-inset ring-red-500/20' : '') +
        (item.level >= 4 ? ' opacity-75' : '')}>
      <td className="px-3 py-1.5 text-slate-700 font-mono text-[11px]">{item.row_number}</td>
      <td className="px-3 py-1.5"><span className={'inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ' + style.badge}>{item.level}</span></td>
      <td className={'px-3 py-1.5 text-xs ' + (isL2 ? 'font-semibold text-blue-300' : 'text-slate-600')}>{item.uzmanlik}</td>
      <td className={'px-3 py-1.5 text-xs max-w-[120px] truncate ' + (isL2 ? 'text-blue-200/80 font-medium' : 'text-slate-600')}>{item.montaj}</td>
      <td className={'px-3 py-1.5 font-mono text-xs max-w-[240px] ' + (isL2 ? 'font-bold text-blue-200 text-[13px]' : isL3 ? 'font-semibold text-emerald-300/90' : 'text-slate-500')}
        style={{ paddingLeft: Math.max(12, item.level * 16) }} title={item.title}>
        <div className="flex items-center gap-1.5 truncate">
          <span className="truncate">{item.title}</span>
        </div>
      </td>
      <td className="px-3 py-1.5 text-xs text-slate-600 max-w-[120px] truncate font-mono">{item.malzeme_no_sap}</td>
      <td className="px-3 py-1.5">
        {item.level >= 3 && editing ? (
          <select value={kalem} onChange={e => setKalem(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-md px-1.5 py-0.5 text-xs w-20 focus:outline-none focus:border-blue-500/50">
            <option value="">--</option>{KALEM_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        ) : <span className={'px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap border ' + (KALEM_CLR[item.kalem_tipi] || 'bg-slate-800/50 text-slate-600 border-slate-700/30')}>{item.kalem_tipi || '—'}</span>}
      </td>
      <td className="px-3 py-1.5"><span className={'text-xs font-medium ' + (SIP_CLR[item.siparis] || 'text-slate-500')}>{item.siparis}</span></td>
      <td className="px-3 py-1.5"><span className={'text-xs ' + (DAG_CLR[item.dagitim] || 'text-slate-600')}>{item.dagitim}</span></td>
      <td className="px-3 py-1.5">
        {item.level >= 3 && editing ? (
          <select value={birim} onChange={e => setBirim(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-md px-1.5 py-0.5 text-xs w-14 focus:outline-none focus:border-blue-500/50">
            <option value="">--</option>{BIRIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        ) : <span className="text-xs text-slate-600">{item.birim}</span>}
      </td>
      <td className="px-3 py-1.5 text-xs font-mono text-slate-600">{item.quantity ?? ''}</td>
      <td className="px-3 py-1.5">
        {item.level >= 3 && item.kullanim_miktari != null && item.kullanim_miktari !== '' ? (
          <span className={'text-xs font-mono ' + (zeroUsage ? 'text-red-400 font-semibold' : 'text-slate-600')}>
            {item.kullanim_miktari}
            {zeroUsage && <span className="ml-1 px-1 py-0.5 rounded text-[8px] font-bold bg-red-500/15 text-red-400 border border-red-500/20" title="Kullanım miktarı 0 — PLM hatası, kontrol edilmesi gerekiyor">KONTROL EDİLMELİ</span>}
          </span>
        ) : <span className="text-xs text-slate-700">{item.kullanim_miktari ?? ''}</span>}
      </td>
      <td className="px-3 py-1.5">
        {hesaplananMik != null ? (
          <span className="text-xs font-mono text-emerald-400/80 font-medium cursor-help" title={hesapFormul}>
            {Number.isInteger(hesaplananMik) ? hesaplananMik : hesaplananMik.toFixed(2)}
          </span>
        ) : isKesilerek && zeroUsage ? (
          <span className="text-[9px] text-red-400 font-semibold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20" title="Kullanım miktarı 0 olduğu için hesaplanamaz \u2014 PLM hatas\u0131">HATA</span>
        ) : <span className="text-xs text-slate-700">{item.toplam_miktar ?? ''}</span>}
      </td>
      <td className="px-3 py-1.5">
        {item.needs_review && item.level >= 3 ? (
          editing ? (
            <div className="flex gap-1">
              <button onClick={e => { e.stopPropagation(); onBulkResolve(item.malzeme_no || item.title, kalem, birim); setEditing(false); }} className="px-2 py-0.5 text-xs rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition">Kaydet</button>
              <button onClick={e => { e.stopPropagation(); setEditing(false); }} className="px-2 py-0.5 text-xs rounded-md bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition">X</button>
            </div>
          ) : <button onClick={e => { e.stopPropagation(); setEditing(true); }} className="px-2.5 py-1 text-[11px] rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition">Duzenle</button>
        ) : <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-500/50 text-[10px]">✓</span>}
      </td>
    </tr>
  );
}

function MiniStat({ title, data, accent }) {
  const sorted = Object.entries(data || {}).sort((a,b) => b[1] - a[1]);
  const g = accent === 'blue' ? 'from-blue-500/10 to-transparent' : 'from-emerald-500/10 to-transparent';
  return (
    <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-4 relative overflow-hidden">
      <div className={'absolute inset-0 bg-gradient-to-br ' + g + ' opacity-50 pointer-events-none'} />
      <span className="relative text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{title}</span>
      <div className="relative mt-2.5 space-y-1.5">
        {sorted.slice(0,6).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{key}</span>
            <span className="font-mono text-slate-600">{val?.toLocaleString('tr-TR')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
