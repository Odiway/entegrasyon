import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getProjects, uploadProject, deleteProject,
  intUpload, intGetUploads, intGetUpload, intDeleteUpload,
  intGetItems, intGetItemsCount, intGetStats, intUpdateItem,
  intExportUrl, intReupload, intApprove, intGetHistory, intTemplateUrl,
} from './bomApi';

const STATUS_CFG = {
  completed:  { color: 'border-emerald-500/25', bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: '✓', label: 'Tamamlandı' },
  review:     { color: 'border-amber-500/25',   bg: 'bg-amber-500/10',   text: 'text-amber-400',   icon: '◎', label: 'İnceleme Bekliyor' },
  uploaded:   { color: 'border-blue-500/25',     bg: 'bg-blue-500/10',    text: 'text-blue-400',    icon: '↑', label: 'Yüklendi' },
  processing: { color: 'border-blue-500/20',     bg: 'bg-blue-500/10',    text: 'text-blue-300',    icon: '⟳', label: 'İşleniyor' },
};

export default function BomProjectsPanel({ onOpenProject }) {
  const [activeTab, setActiveTab] = useState('bom'); // bom | integration
  const [projects, setProjects] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  // Integration state
  const [intUploads, setIntUploads] = useState([]);
  const [intLoading, setIntLoading] = useState(true);
  const [activeIntUpload, setActiveIntUpload] = useState(null);

  const load = useCallback(async () => {
    try { setProjects((await getProjects()).data); }
    catch { setError('Sunucuya bağlanılamadı'); }
  }, []);

  const loadIntUploads = useCallback(async () => {
    setIntLoading(true);
    try { const r = await intGetUploads(); setIntUploads(r.data); }
    catch (e) { console.error(e); }
    setIntLoading(false);
  }, []);

  useEffect(() => { load(); loadIntUploads(); }, [load, loadIntUploads]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try { await uploadProject(file); await load(); }
    catch (err) { setError(err?.response?.data?.detail || 'Yükleme hatası'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleDelete = async (id) => {
    if (!confirm('Projeyi silmek istediğinize emin misiniz?')) return;
    await deleteProject(id); await load();
  };

  /* ── Integration detail sub-view ── */
  if (activeIntUpload) {
    return <IntUploadDetail uploadId={activeIntUpload} onBack={() => { setActiveIntUpload(null); loadIntUploads(); }} />;
  }

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-6">
      {/* Hero Banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative px-8 py-10 flex items-center justify-between">
          <div className="flex-1 z-10">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/[0.12] backdrop-blur-sm mb-5">
              <span className="text-[11px] text-white/80 font-semibold tracking-wide">Entegrasyon Takımı</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">BOM & Entegrasyon</h1>
            <p className="text-sm text-white/70 max-w-lg leading-relaxed">
              PLM BOM dosyalarını yükleyin, Kalem Tipi eşleştirmesiyle SAP Master BOM&apos;a otomatik dönüştürün.
              Template Excel entegrasyonu, Sipariş Durumu ve operatör onay süreçlerini tek panelden yönetin.
            </p>
          </div>
          <div className="hidden lg:block w-[340px] shrink-0 ml-8">
            <img src="/slider-1.jpg" alt="TEMSA" className="w-full h-auto object-contain opacity-40 drop-shadow-[0_10px_30px_rgba(0,0,0,0.4)]" />
          </div>
        </div>
      </div>

      {/* ═══ Tab Bar ═══ */}
      <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1 mb-6">
        {[
          { key: 'bom', label: 'BOM Projeleri', icon: '📦', count: projects.length },
          { key: 'integration', label: 'Entegrasyon', icon: '🔗', count: intUploads.length },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === t.key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <span>{t.icon}</span>{t.label}
            {t.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === t.key ? 'bg-white/20' : 'bg-white/[0.08]'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <span className="text-red-500">⚠</span> {error}
        </div>
      )}

      {/* ═══════════ BOM Tab ═══════════ */}
      {activeTab === 'bom' && (
        <>
          {/* Upload bar */}
          <div className="flex items-center gap-3 mb-6">
            <label className={`relative px-5 py-2.5 rounded-xl font-medium text-sm cursor-pointer transition-all ${
              uploading ? 'bg-slate-800 text-slate-500'
                : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-lg shadow-orange-600/20'}`}>
              {uploading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                  Yükleniyor...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v10M4 5l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  PLM Dosyası Yükle
                </span>
              )}
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            <div className="flex items-center gap-4 ml-2 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-600" />.xlsx / .xls</span>
              <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-600" />PLM BOM Format</span>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-lg text-slate-400 font-medium">Henüz proje yok</p>
              <p className="text-sm text-slate-600 mt-1 mb-8">PLM BOM dosyası yükleyerek başlayın</p>
              <div className="flex items-center gap-5 text-[11px] text-slate-600">
                {['Excel yükle', 'Kalem Tipi eşleştir', 'SAP BOM indir'].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg ${i===2?'bg-emerald-500/10 border-emerald-500/10':'bg-blue-500/10 border-blue-500/10'} border flex items-center justify-center text-xs font-bold ${i===2?'text-emerald-400/70':'text-blue-400/70'}`}>{i+1}</span>
                    <span>{s}</span>
                    {i < 2 && <svg width="20" height="8" viewBox="0 0 20 8" fill="none" className="text-slate-800 ml-3"><path d="M0 4h18M16 1l3 3-3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map(p => {
                const st = STATUS_CFG[p.status] || STATUS_CFG.uploaded;
                const progress = p.total_rows > 0 ? Math.round((p.resolved_rows / p.total_rows) * 100) : 0;
                return (
                  <div key={p.id} onClick={() => onOpenProject(p.id)}
                    className={`group cursor-pointer relative rounded-2xl border ${st.color} bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] p-6 transition-all hover:shadow-lg hover:shadow-black/20 hover:border-blue-500/20`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors truncate">{p.name}</h2>
                          <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${st.bg} ${st.text}`}>
                            <span>{st.icon}</span> {st.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-5 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-600" />{p.total_rows?.toLocaleString('tr-TR')} satır</span>
                          <span className="flex items-center gap-1.5 text-emerald-400/80"><span className="w-1 h-1 rounded-full bg-emerald-500" />{p.resolved_rows?.toLocaleString('tr-TR')} çözüldü</span>
                          {p.unresolved_rows > 0 && <span className="flex items-center gap-1.5 text-amber-400/80"><span className="w-1 h-1 rounded-full bg-amber-500" />{p.unresolved_rows?.toLocaleString('tr-TR')} bekliyor</span>}
                          <span className="text-slate-700">{new Date(p.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs font-mono text-slate-500 w-10 text-right">{progress}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-6 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                          className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Sil">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1m2 0v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4h8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                        </button>
                        <div className="p-2 rounded-lg text-slate-600 group-hover:text-blue-400 transition-colors">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════ Integration Tab ═══════════ */}
      {activeTab === 'integration' && (
        <>
          {/* Actions bar */}
          <div className="flex items-center gap-3 mb-6">
            <a href={intTemplateUrl()} download
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-slate-300 text-sm font-medium hover:bg-white/[0.1] transition-all flex items-center gap-2">
              📋 Şablon İndir
            </a>
            <IntUploadButton onUploaded={loadIntUploads} />
          </div>

          {intLoading ? (
            <div className="text-center py-20 text-slate-500">Yükleniyor...</div>
          ) : intUploads.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4 opacity-30">📁</div>
              <p className="text-slate-400 text-lg">Henüz yükleme yok</p>
              <p className="text-slate-500 text-sm mt-1">Yukarıdaki butonla Excel dosyanızı yükleyin</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {intUploads.map(u => (
                <div key={u.id}
                  className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.06] transition-all cursor-pointer flex items-center gap-5"
                  onClick={() => setActiveIntUpload(u.id)}>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-2xl flex-shrink-0">
                    📊
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{u.filename}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-slate-500">{u.total_rows} satır</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.status === 'processed' ? 'bg-emerald-500/20 text-emerald-400' :
                        u.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>{u.status}</span>
                      <span className="text-xs text-slate-500">v{u.template_version}</span>
                      <span className="text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Bu yüklemeyi silmek istediğinize emin misiniz?')) {
                      intDeleteUpload(u.id).then(loadIntUploads);
                    }
                  }} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   Integration Sub-Components (merged from IntegrationPanel)
   ═══════════════════════════════════════════════════════════ */

function IntUploadButton({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [calcQty, setCalcQty] = useState(false);
  const [showOpts, setShowOpts] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await intUpload(file, calcQty);
      onUploaded();
    } catch (err) {
      alert('Yükleme başarısız: ' + (err?.response?.data?.detail || 'Bilinmeyen hata'));
    }
    setUploading(false);
    setShowOpts(false);
    e.target.value = '';
  };

  return (
    <div className="relative">
      <button onClick={() => setShowOpts(!showOpts)}
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2">
        {uploading ? '⏳ Yükleniyor...' : '📤 Excel Yükle'}
      </button>
      {showOpts && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#1c2128] border border-white/[0.1] rounded-xl p-4 shadow-2xl z-50 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={calcQty} onChange={e => setCalcQty(e.target.checked)}
              className="rounded border-slate-600 text-blue-500 focus:ring-blue-500/30" />
            <span className="text-sm text-slate-300">Miktar Hesapla (KullanimMiktari × Qty × Montaj)</span>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500 block mb-1">Dosya Seç (.xlsx)</span>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} disabled={uploading}
              className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-medium file:cursor-pointer" />
          </label>
        </div>
      )}
    </div>
  );
}


/* ═══ Level & Style Config (matching BomProjectDetail) ═══ */
const INT_LEVEL_COLORS = {
  0: { badge: 'bg-slate-700 text-slate-300', row: 'bg-slate-900/40' },
  1: { badge: 'bg-slate-700 text-slate-300', row: 'bg-slate-900/30' },
  2: { badge: 'bg-blue-600/90 text-white', row: 'bg-blue-500/[0.06]' },
  3: { badge: 'bg-emerald-500/90 text-white', row: 'bg-emerald-500/[0.04]' },
  4: { badge: 'bg-slate-700/80 text-slate-400', row: '' },
  5: { badge: 'bg-slate-800 text-slate-400', row: '' },
  6: { badge: 'bg-slate-800 text-slate-500', row: '' },
};
function ils(level) { return INT_LEVEL_COLORS[level] || INT_LEVEL_COLORS[6]; }

const INT_KALEM_CLR = {
  'F': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  'Y': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'E': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'H': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'C': 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'NA': 'bg-slate-800/50 text-slate-600 border-slate-700/30',
};
const INT_SIP_CLR = { EVET: 'text-emerald-400', HAYIR: 'text-red-400/60', NA: 'text-slate-700' };
const INT_KALEM_OPTIONS = ['F', 'Y', 'E', 'H', 'C', 'NA'];

function IntUploadDetail({ uploadId, onBack }) {
  const [upload, setUpload] = useState(null);
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('data');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  // Filters
  const [fSiparis, setFSiparis] = useState('');
  const [fMontaj, setFMontaj] = useState('');
  const [fUzmanlik, setFUzmanlik] = useState('');
  const [fKalem, setFKalem] = useState('');
  const [fLevel, setFLevel] = useState('');
  const [fMalzeme, setFMalzeme] = useState('');

  // Navigation
  const [navOpen, setNavOpen] = useState(true);

  // Download modal
  const [showDownload, setShowDownload] = useState(false);

  // Diff & reupload
  const [diffResult, setDiffResult] = useState(null);
  const [reuploading, setReuploading] = useState(false);

  // Row tracking
  const [currentRow, setCurrentRow] = useState(0);

  const filterParams = useMemo(() => {
    const p = { offset: page * PAGE_SIZE, limit: PAGE_SIZE };
    if (fSiparis) p.siparis_durumu = fSiparis;
    if (fMontaj) p.montaj_mi = fMontaj;
    if (fUzmanlik) p.uzmanlik = fUzmanlik;
    if (fKalem) p.kalem_tipi = fKalem;
    if (fLevel) p.level = fLevel;
    if (fMalzeme) p.malzeme_no = fMalzeme;
    return p;
  }, [fSiparis, fMontaj, fUzmanlik, fKalem, fLevel, fMalzeme, page]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, s, h] = await Promise.all([intGetUpload(uploadId), intGetStats(uploadId), intGetHistory(uploadId)]);
      setUpload(u.data); setStats(s.data); setHistory(h.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [uploadId]);

  const loadItems = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([intGetItems(uploadId, filterParams), intGetItemsCount(uploadId, filterParams)]);
      setItems(r.data); setTotalCount(c.data.count);
    } catch (e) { console.error(e); }
  }, [uploadId, filterParams]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const handleItemUpdate = async (item, field, value) => {
    await intUpdateItem(item.id, { [field]: value });
    await loadItems(); await loadAll();
  };

  const handleReupload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReuploading(true);
    try {
      const r = await intReupload(uploadId, file);
      setDiffResult(r.data); setTab('diff'); loadAll();
    } catch (err) { alert('Karşılaştırma hatası: ' + (err?.response?.data?.detail || '')); }
    setReuploading(false);
    e.target.value = '';
  };

  // L2/L3 jump
  const level2Rows = useMemo(() => items.filter(i => i.level === 2).map(i => i.row_number), [items]);
  const level3Rows = useMemo(() => items.filter(i => i.level === 3).map(i => i.row_number), [items]);

  const jumpAdj = (rows, dir) => {
    const sorted = [...rows].sort((a, b) => a - b);
    const t = dir === 'next' ? sorted.find(r => r > currentRow) : [...sorted].reverse().find(r => r < currentRow);
    if (t) {
      setCurrentRow(t);
      const el = document.getElementById('int-row-' + t);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2', 'ring-blue-400/60'); setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400/60'), 2000); }
    }
  };

  const clearAllFilters = () => { setFSiparis(''); setFMontaj(''); setFKalem(''); setFLevel(''); setFUzmanlik(''); setFMalzeme(''); setPage(0); };
  const activeFilterCount = [fSiparis, fMontaj, fKalem, fLevel, fUzmanlik, fMalzeme].filter(Boolean).length;

  if (loading) return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const approvedPct = stats?.total ? Math.round((stats.approved_count / stats.total) * 100) : 0;

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition mb-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 2L3 6l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Entegrasyon
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">{upload?.filename}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{upload?.total_rows?.toLocaleString('tr-TR')} satır • {upload?.status} • v{upload?.template_version} • {new Date(upload?.created_at).toLocaleString('tr-TR')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDownload(true)} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium transition-all flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v9M4 7l3 3 3-3M2 11v1h10v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Excel İndir
          </button>
          <label className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-sm font-medium cursor-pointer transition-all flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 10V1M4 4l3-3 3 3M2 11v1h10v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {reuploading ? 'Yükleniyor...' : 'Geri Yükle'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleReupload} disabled={reuploading} />
          </label>
        </div>
      </div>

      {/* Progress + Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="col-span-2 bg-[#161b22] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Onay Durumu</span>
              <span className={'text-2xl font-bold tracking-tight ' + (approvedPct === 100 ? 'text-emerald-400' : 'text-white')}>{approvedPct}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div className={'h-full rounded-full transition-all duration-500 ' + (approvedPct === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-blue-600 to-blue-400')} style={{ width: approvedPct + '%' }} />
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <span>Toplam <b className="text-white font-semibold">{stats.total?.toLocaleString('tr-TR')}</b></span>
              <span>Onaylı <b className="text-emerald-400 font-semibold">{stats.approved_count}</b></span>
              <span>Kilitli <b className="text-amber-400 font-semibold">{stats.locked_count}</b></span>
              <span>Bekleyen <b className="text-slate-300 font-semibold">{stats.total - stats.approved_count}</b></span>
            </div>
          </div>
          <IntMiniStat title="Sipariş Durumu" data={stats.by_siparis_durumu} accent="emerald" />
          <IntMiniStat title="Kalem Tipi" data={stats.by_kalem_tipi} accent="blue" />
        </div>
      )}

      <div className="flex gap-5">
        {/* ═══ Nav Sidebar ═══ */}
        <div className={navOpen ? 'w-64 shrink-0' : 'w-10 shrink-0'} style={{ transition: 'width 0.2s' }}>
          <div className="sticky top-[72px]">
            <button onClick={() => setNavOpen(!navOpen)} className="w-9 h-9 rounded-lg border border-white/[0.06] bg-[#161b22] flex items-center justify-center text-slate-500 hover:text-white transition mb-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: navOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {navOpen && stats && (
              <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden max-h-[calc(100vh-180px)] overflow-y-auto">
                {/* Uzmanlık */}
                {Object.keys(stats.by_uzmanlik || {}).length > 0 && (
                  <div className="p-3 border-b border-white/[0.06]">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Uzmanlık</span>
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(stats.by_uzmanlik).sort((a, b) => b[1] - a[1]).map(([key, val]) => (
                        <button key={key} onClick={() => { setFUzmanlik(fUzmanlik === key ? '' : key); setPage(0); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between ${fUzmanlik === key ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:bg-white/[0.04]'}`}>
                          <span className="truncate">{key || '(boş)'}</span>
                          <span className="text-slate-600 ml-1 shrink-0">{val}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Kalem Tipi */}
                {Object.keys(stats.by_kalem_tipi || {}).length > 0 && (
                  <div className="p-3 border-b border-white/[0.06]">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Kalem Tipi</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(stats.by_kalem_tipi).sort((a, b) => b[1] - a[1]).map(([key, val]) => (
                        <button key={key} onClick={() => { setFKalem(fKalem === key ? '' : key); setPage(0); }}
                          className={`px-2 py-1 rounded-lg text-[11px] transition-all ${fKalem === key ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]'}`}>
                          {key} <span className="text-slate-600">{val}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Sipariş Durumu */}
                {Object.keys(stats.by_siparis_durumu || {}).length > 0 && (
                  <div className="p-3 border-b border-white/[0.06]">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Sipariş Durumu</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(stats.by_siparis_durumu).sort((a, b) => b[1] - a[1]).map(([key, val]) => (
                        <button key={key} onClick={() => { setFSiparis(fSiparis === key ? '' : key); setPage(0); }}
                          className={`px-2 py-1 rounded-lg text-[11px] transition-all ${fSiparis === key ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]'}`}>
                          {key} <span className="text-slate-600">{val}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Montaj mı? */}
                {Object.keys(stats.by_montaj_mi || {}).length > 0 && (
                  <div className="p-3 border-b border-white/[0.06]">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Montaj mı?</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(stats.by_montaj_mi).sort((a, b) => b[1] - a[1]).map(([key, val]) => (
                        <button key={key} onClick={() => { setFMontaj(fMontaj === key ? '' : key); setPage(0); }}
                          className={`px-2 py-1 rounded-lg text-[11px] transition-all ${fMontaj === key ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]'}`}>
                          {key} <span className="text-slate-600">{val}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Seviye */}
                {Object.keys(stats.by_level || {}).length > 0 && (
                  <div className="p-3">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Seviye</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(stats.by_level).sort((a, b) => Number(a[0]) - Number(b[0])).map(([key, val]) => (
                        <button key={key} onClick={() => { setFLevel(fLevel === key ? '' : key); setPage(0); }}
                          className={`px-2 py-1 rounded-lg text-[11px] transition-all ${fLevel === key ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]'}`}>
                          L{key} <span className="text-slate-600">{val}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══ Main Content ═══ */}
        <div className="flex-1 min-w-0">
          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1 mb-4">
            {[
              { key: 'data', label: 'Veri Tablosu', icon: '📋' },
              { key: 'stats', label: 'İstatistikler', icon: '📊' },
              { key: 'history', label: 'İşlem Geçmişi', icon: '🕐' },
              { key: 'diff', label: 'Karşılaştırma', icon: '🔍' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === t.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'}`}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* ── TAB: Data ── */}
          {tab === 'data' && (
            <div className="space-y-3">
              {/* Top filter bar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Material search */}
                <div className="relative">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" /><path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                  <input value={fMalzeme} onChange={e => { setFMalzeme(e.target.value); setPage(0); }}
                    placeholder="Malzeme No ara..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/30 w-40" />
                </div>
                <div className="h-4 w-px bg-slate-800 mx-1" />
                {/* L2/L3 navigation */}
                {[['L2', level2Rows, 'blue'], ['L3', level3Rows, 'emerald']].map(([label, rows, c]) => (
                  <div key={label} className="flex items-center gap-0.5 bg-slate-800/50 rounded-lg p-0.5">
                    <span className="text-[10px] text-slate-600 px-1.5">{label}</span>
                    <button onClick={() => jumpAdj(rows, 'prev')} className={`w-6 h-6 rounded flex items-center justify-center text-${c}-400 hover:bg-${c}-500/20 transition`}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 6l3-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    </button>
                    <button onClick={() => jumpAdj(rows, 'next')} className={`w-6 h-6 rounded flex items-center justify-center text-${c}-400 hover:bg-${c}-500/20 transition`}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                ))}
                <div className="h-4 w-px bg-slate-800 mx-1" />
                {/* Active filter badges */}
                <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                  {activeFilterCount > 0 && (
                    <button onClick={clearAllFilters} className="px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:text-white hover:bg-white/[0.06] transition">
                      Temizle ({activeFilterCount})
                    </button>
                  )}
                  {fKalem && <span className="px-2 py-0.5 rounded-lg text-[11px] bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">KT: {fKalem}<button onClick={() => setFKalem('')} className="hover:text-white">×</button></span>}
                  {fSiparis && <span className="px-2 py-0.5 rounded-lg text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">Sip: {fSiparis}<button onClick={() => setFSiparis('')} className="hover:text-white">×</button></span>}
                  {fLevel && <span className="px-2 py-0.5 rounded-lg text-[11px] bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">L{fLevel}<button onClick={() => setFLevel('')} className="hover:text-white">×</button></span>}
                  {fUzmanlik && <span className="px-2 py-0.5 rounded-lg text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">{fUzmanlik}<button onClick={() => setFUzmanlik('')} className="hover:text-white">×</button></span>}
                  {fMontaj && <span className="px-2 py-0.5 rounded-lg text-[11px] bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1">Montaj: {fMontaj}<button onClick={() => setFMontaj('')} className="hover:text-white">×</button></span>}
                  {fMalzeme && <span className="px-2 py-0.5 rounded-lg text-[11px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">Mlz: {fMalzeme}<button onClick={() => setFMalzeme('')} className="hover:text-white">×</button></span>}
                  <span className="text-[11px] text-slate-600">{totalCount.toLocaleString('tr-TR')} sonuç</span>
                </div>
              </div>

              {/* Level legend */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-slate-700 mr-0.5">Seviyeler:</span>
                {[0, 1, 2, 3, 4, 5, 6].map(l => <span key={l} className={'px-1.5 py-0.5 rounded-md ' + ils(l).badge}>L{l}</span>)}
              </div>

              {/* Table */}
              <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-slate-500 text-[11px]">
                        {['#', 'Lv', 'Uzmanlık', 'Montaj', 'Title', 'MalzemeNo', 'Kalem Tipi', 'Sipariş', 'Montaj mı?', 'Birim', 'Qty', 'Hes.Mik', 'DF TR', 'Durum'].map(h => (
                          <th key={h} className="px-3 py-3 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr><td colSpan={14} className="text-center py-12 text-slate-600">Kayıt bulunamadı</td></tr>
                      ) : items.map(item => (
                        <IntItemRow key={item.id} item={item} onUpdate={handleItemUpdate} onRowClick={setCurrentRow} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400 transition">← Önceki</button>
                  <span className="text-xs text-slate-600">Sayfa <span className="text-slate-400">{page + 1}</span> / {totalPages || 1} · {totalCount.toLocaleString('tr-TR')} satır</span>
                  <button onClick={() => setPage(page + 1)} disabled={page + 1 >= totalPages} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400 transition">Sonraki →</button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Stats ── */}
          {tab === 'stats' && stats && (
            <div className="grid grid-cols-2 gap-4">
              <IntDistCard title="Level Dağılımı" data={stats.by_level} />
              <IntDistCard title="Kalem Tipi Dağılımı" data={stats.by_kalem_tipi} />
              <IntDistCard title="Sipariş Durumu" data={stats.by_siparis_durumu} />
              <IntDistCard title="Montaj mı?" data={stats.by_montaj_mi} />
              <IntDistCard title="Uzmanlık" data={stats.by_uzmanlik} />
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5">
                <h4 className="text-sm font-semibold text-white mb-3">Onay Durumu</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Onaylı Satır</span>
                    <span className="text-emerald-400 font-medium">{stats.approved_count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Kilitli Satır</span>
                    <span className="text-amber-400 font-medium">{stats.locked_count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Bekleyen</span>
                    <span className="text-slate-300 font-medium">{stats.total - stats.approved_count}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: History ── */}
          {tab === 'history' && (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">Henüz işlem geçmişi yok</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/[0.04] text-slate-400">
                      <th className="px-3 py-2.5 text-left font-medium">Tarih</th>
                      <th className="px-3 py-2.5 text-left font-medium">İşlem</th>
                      <th className="px-3 py-2.5 text-left font-medium">Kullanıcı</th>
                      <th className="px-3 py-2.5 text-left font-medium">Filtre</th>
                      <th className="px-3 py-2.5 text-left font-medium">Detay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-slate-400">{new Date(h.created_at).toLocaleString('tr-TR')}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${h.action === 'download' ? 'bg-blue-500/20 text-blue-400' : h.action === 'reupload' ? 'bg-amber-500/20 text-amber-400' : h.action === 'approve' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>{h.action}</span>
                        </td>
                        <td className="px-3 py-2 text-white">{h.user_name || '-'}</td>
                        <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate" title={h.filter_criteria}>{h.filter_criteria || '-'}</td>
                        <td className="px-3 py-2 text-slate-300">{h.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── TAB: Diff ── */}
          {tab === 'diff' && (
            <div className="space-y-4">
              {!diffResult ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3 opacity-30">🔍</div>
                  <p className="text-slate-400">Operatör dosyasını geri yükleyerek karşılaştırma yapılabilir</p>
                  <p className="text-slate-500 text-xs mt-1">"Geri Yükle" butonunu kullanın</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <IntStatCard label="Karşılaştırılan" value={diffResult.total_compared} color="blue" />
                    <IntStatCard label="Değişiklik" value={diffResult.diffs?.length || 0} color="amber" />
                    <IntStatCard label="Onaylanan" value={diffResult.approved_count} color="emerald" />
                  </div>
                  {diffResult.diffs?.length > 0 && (
                    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/[0.04] text-slate-400">
                            <th className="px-3 py-2.5 text-left font-medium">Satır</th>
                            <th className="px-3 py-2.5 text-left font-medium">Alan</th>
                            <th className="px-3 py-2.5 text-left font-medium">🔴 Eski Değer</th>
                            <th className="px-3 py-2.5 text-left font-medium">🟢 Yeni Değer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diffResult.diffs.slice(0, 100).map((d, i) =>
                            Object.entries(d.changes).map(([field, vals]) => (
                              <tr key={`${i}-${field}`} className="border-t border-white/[0.04]">
                                <td className="px-3 py-2 text-white font-medium">{d.row_number}</td>
                                <td className="px-3 py-2 text-slate-300">{field}</td>
                                <td className="px-3 py-2 text-red-400 bg-red-500/5">{vals.old}</td>
                                <td className="px-3 py-2 text-emerald-400 bg-emerald-500/5">{vals.new}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Download Modal ═══ */}
      {showDownload && (
        <IntDownloadModal
          uploadId={uploadId}
          currentFilters={{ siparis_durumu: fSiparis, montaj_mi: fMontaj, uzmanlik: fUzmanlik, kalem_tipi: fKalem, level: fLevel, malzeme_no: fMalzeme }}
          activeFilterCount={activeFilterCount}
          onClose={() => setShowDownload(false)}
        />
      )}
    </div>
  );
}


/* ═══ IntItemRow — Editable table row (BomProjectDetail style) ═══ */
function IntItemRow({ item, onUpdate, onRowClick }) {
  const [editing, setEditing] = useState(false);
  const [kalem, setKalem] = useState(item.kalem_tipi);
  const [siparis, setSiparis] = useState(item.siparis_durumu);
  const style = ils(item.level);
  const isL2 = item.level === 2, isL3 = item.level === 3;

  return (
    <tr id={'int-row-' + item.row_number} onClick={() => onRowClick(item.row_number)}
      className={'border-b transition-all cursor-pointer ' +
        (isL2 ? 'border-blue-500/20 ' + style.row + ' hover:bg-blue-500/[0.1]' : isL3 ? 'border-emerald-500/10 ' + style.row + ' hover:bg-emerald-500/[0.06]' : 'border-white/[0.03] hover:bg-white/[0.03]') +
        (item.locked ? ' bg-emerald-900/10' : '') +
        (item.level >= 4 ? ' opacity-75' : '')}>
      <td className="px-3 py-1.5 text-slate-700 font-mono text-[11px]">{item.row_number}</td>
      <td className="px-3 py-1.5"><span className={'inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ' + style.badge}>{item.level}</span></td>
      <td className={'px-3 py-1.5 text-xs ' + (isL2 ? 'font-semibold text-blue-300' : 'text-slate-600')}>{item.uzmanlik}</td>
      <td className={'px-3 py-1.5 text-xs max-w-[120px] truncate ' + (isL2 ? 'text-blue-200/80 font-medium' : 'text-slate-600')}>{item.montaj_no}</td>
      <td className={'px-3 py-1.5 font-mono text-xs max-w-[240px] ' + (isL2 ? 'font-bold text-blue-200 text-[13px]' : isL3 ? 'font-semibold text-emerald-300/90' : 'text-slate-500')}
        style={{ paddingLeft: Math.max(12, item.level * 16) }} title={item.title}>
        <span className="truncate block">{item.title}</span>
      </td>
      <td className="px-3 py-1.5 text-xs text-slate-600 max-w-[120px] truncate font-mono">{item.malzeme_no}</td>
      <td className="px-3 py-1.5">
        {editing ? (
          <select value={kalem} onChange={e => setKalem(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-md px-1.5 py-0.5 text-xs w-16 focus:outline-none focus:border-blue-500/50">
            <option value="">--</option>{INT_KALEM_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        ) : <span className={'px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap border ' + (INT_KALEM_CLR[item.kalem_tipi] || 'bg-slate-800/50 text-slate-600 border-slate-700/30')}>{item.kalem_tipi || '—'}</span>}
      </td>
      <td className="px-3 py-1.5">
        {editing ? (
          <select value={siparis} onChange={e => setSiparis(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-md px-1.5 py-0.5 text-xs w-16 focus:outline-none focus:border-blue-500/50">
            <option value="">--</option><option value="EVET">EVET</option><option value="HAYIR">HAYIR</option>
          </select>
        ) : <span className={'text-xs font-medium ' + (INT_SIP_CLR[item.siparis_durumu] || 'text-slate-500')}>{item.siparis_durumu || '-'}</span>}
      </td>
      <td className="px-3 py-1.5">
        <span className={`text-[10px] ${item.montaj_mi === 'EVET' ? 'text-purple-400' : 'text-slate-500'}`}>{item.montaj_mi || '-'}</span>
      </td>
      <td className="px-3 py-1.5 text-xs text-slate-600">{item.birim}</td>
      <td className="px-3 py-1.5 text-xs font-mono text-slate-600">{item.quantity ?? ''}</td>
      <td className="px-3 py-1.5 text-xs font-mono text-cyan-400">{item.hesaplanan_miktar != null ? item.hesaplanan_miktar.toFixed(2) : '-'}</td>
      <td className="px-3 py-1.5 text-xs text-slate-400 max-w-[150px] truncate" title={item.df_tr}>{item.df_tr || '-'}</td>
      <td className="px-3 py-1.5">
        {editing ? (
          <div className="flex gap-1">
            <button onClick={e => { e.stopPropagation(); const updates = {}; if (kalem !== item.kalem_tipi) updates.kalem_tipi = kalem; if (siparis !== item.siparis_durumu) updates.siparis_durumu = siparis; if (Object.keys(updates).length) onUpdate(item, 'kalem_tipi', kalem); setEditing(false); }}
              className="px-2 py-0.5 text-xs rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition">Kaydet</button>
            <button onClick={e => { e.stopPropagation(); setEditing(false); setKalem(item.kalem_tipi); setSiparis(item.siparis_durumu); }}
              className="px-2 py-0.5 text-xs rounded-md bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition">X</button>
          </div>
        ) : item.locked ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="2" y="4.5" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1" /><path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="1" /></svg>
            Kilitli
          </span>
        ) : item.approved ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-blue-400">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1" /><path d="M3 5l1.5 1.5L7 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Onaylı
          </span>
        ) : (
          <button onClick={e => { e.stopPropagation(); setEditing(true); }}
            className="px-2.5 py-1 text-[11px] rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition">Düzenle</button>
        )}
      </td>
    </tr>
  );
}


/* ═══ IntDownloadModal — Export options before download ═══ */
function IntDownloadModal({ uploadId, currentFilters, activeFilterCount, onClose }) {
  const [useFilters, setUseFilters] = useState(activeFilterCount > 0);
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [lockedOnly, setLockedOnly] = useState(false);
  const [showApprovalMarks, setShowApprovalMarks] = useState(true);

  const handleDownload = () => {
    const params = {};
    if (useFilters) {
      Object.entries(currentFilters).forEach(([k, v]) => { if (v) params[k] = v; });
    }
    if (approvedOnly) params.approved_only = true;
    if (lockedOnly) params.locked_only = true;
    if (showApprovalMarks) params.show_approval_marks = true;
    window.open(intExportUrl(uploadId, params), '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1c2128] border border-white/[0.1] rounded-2xl w-[420px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <h3 className="text-lg font-bold text-white">İndirme Seçenekleri</h3>
          <p className="text-xs text-slate-500 mt-1">Excel dosyası indirmeden önce seçenekleri belirleyin</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={useFilters} onChange={e => setUseFilters(e.target.checked)}
              className="mt-0.5 rounded border-slate-600 text-blue-500 focus:ring-blue-500/30" />
            <div>
              <span className="text-sm text-white group-hover:text-blue-300 transition">Mevcut filtreleri uygula</span>
              {activeFilterCount > 0 && <p className="text-[11px] text-slate-500 mt-0.5">{activeFilterCount} aktif filtre seçili</p>}
              {activeFilterCount === 0 && <p className="text-[11px] text-slate-600 mt-0.5">Şu anda aktif filtre yok</p>}
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={approvedOnly} onChange={e => setApprovedOnly(e.target.checked)}
              className="mt-0.5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500/30" />
            <div>
              <span className="text-sm text-white group-hover:text-emerald-300 transition">Sadece onaylı satırlar</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Yalnızca onaylanmış satırları indir</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={lockedOnly} onChange={e => setLockedOnly(e.target.checked)}
              className="mt-0.5 rounded border-slate-600 text-amber-500 focus:ring-amber-500/30" />
            <div>
              <span className="text-sm text-white group-hover:text-amber-300 transition">Sadece kilitli satırlar</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Yalnızca kilitlenmiş satırları indir</p>
            </div>
          </label>
          <div className="h-px bg-white/[0.06]" />
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={showApprovalMarks} onChange={e => setShowApprovalMarks(e.target.checked)}
              className="mt-0.5 rounded border-slate-600 text-blue-500 focus:ring-blue-500/30" />
            <div>
              <span className="text-sm text-white group-hover:text-blue-300 transition">Onay durumunu göster (☑)</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Excel&apos;de onaylı satırlar kutu işareti (☑) ile gösterilir</p>
            </div>
          </label>
        </div>
        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition">İptal</button>
          <button onClick={handleDownload} className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-medium shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v9M4 7l3 3 3-3M2 11v1h10v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            İndir
          </button>
        </div>
      </div>
    </div>
  );
}


/* ═══ Helper Components ═══ */
function IntStatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-70 font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function IntMiniStat({ title, data, accent }) {
  const sorted = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const g = accent === 'blue' ? 'from-blue-500/10 to-transparent' : 'from-emerald-500/10 to-transparent';
  return (
    <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-4 relative overflow-hidden">
      <div className={'absolute inset-0 bg-gradient-to-br ' + g + ' opacity-50 pointer-events-none'} />
      <span className="relative text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{title}</span>
      <div className="relative mt-2.5 space-y-1.5">
        {sorted.slice(0, 6).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{key}</span>
            <span className="font-mono text-slate-600">{val?.toLocaleString('tr-TR')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntDistCard({ title, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5">
      <h4 className="text-sm font-semibold text-white mb-3">{title}</h4>
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-slate-400">{k || '(boş)'}</span>
              <span className="text-white font-medium">{v} <span className="text-slate-500">({total ? (v / total * 100).toFixed(1) : 0}%)</span></span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-blue-500/50 rounded-full transition-all" style={{ width: `${total ? v / total * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
