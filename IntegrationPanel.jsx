import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  intUpload, intGetUploads, intGetUpload, intDeleteUpload,
  intGetItems, intGetItemsCount, intGetStats, intUpdateItem,
  intExportUrl, intReupload, intApprove, intGetHistory, intTemplateUrl,
} from './bomApi';

/* ═══════════════════════════════════════════════════════════
   IntegrationPanel — template-driven Excel integration module
   ═══════════════════════════════════════════════════════════ */

export default function IntegrationPanel() {
  const [uploads, setUploads] = useState([]);
  const [activeUpload, setActiveUpload] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUploads = useCallback(async () => {
    setLoading(true);
    try { const r = await intGetUploads(); setUploads(r.data); }
    catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadUploads(); }, [loadUploads]);

  if (activeUpload) {
    return <UploadDetail uploadId={activeUpload} onBack={() => { setActiveUpload(null); loadUploads(); }} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            🔗 Entegrasyon Modülü
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Template-driven Excel entegrasyonu • Sipariş Durumu • Operatör onay süreci
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href={intTemplateUrl()} download
            className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-slate-300 text-sm font-medium hover:bg-white/[0.1] transition-all flex items-center gap-2">
            📋 Şablon İndir
          </a>
          <UploadButton onUploaded={loadUploads} />
        </div>
      </div>

      {/* Upload list */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">Yükleniyor...</div>
      ) : uploads.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4 opacity-30">📁</div>
          <p className="text-slate-400 text-lg">Henüz yükleme yok</p>
          <p className="text-slate-500 text-sm mt-1">Yukarıdaki butonla Excel dosyanızı yükleyin</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {uploads.map(u => (
            <div key={u.id}
              className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.06] transition-all cursor-pointer flex items-center gap-5"
              onClick={() => setActiveUpload(u.id)}>
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
                  intDeleteUpload(u.id).then(loadUploads);
                }
              }} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ───────────────────────── UploadButton ───────────────── */
function UploadButton({ onUploaded }) {
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
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2">
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


/* ───────────────────────── UploadDetail ───────────────── */
function UploadDetail({ uploadId, onBack }) {
  const [upload, setUpload] = useState(null);
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('data');     // data | stats | history | diff
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  // Filters
  const [fSiparis, setFSiparis] = useState('');
  const [fMontaj, setFMontaj] = useState('');
  const [fUzmanlik, setFUzmanlik] = useState('');
  const [fKalem, setFKalem] = useState('');
  const [fLevel, setFLevel] = useState('');

  // Diff state
  const [diffResult, setDiffResult] = useState(null);
  const [reuploading, setReuploading] = useState(false);

  const filterParams = useMemo(() => ({
    siparis_durumu: fSiparis || undefined,
    montaj_mi: fMontaj || undefined,
    uzmanlik: fUzmanlik || undefined,
    kalem_tipi: fKalem || undefined,
    level: fLevel || undefined,
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  }), [fSiparis, fMontaj, fUzmanlik, fKalem, fLevel, page]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, s, h] = await Promise.all([
        intGetUpload(uploadId),
        intGetStats(uploadId),
        intGetHistory(uploadId),
      ]);
      setUpload(u.data);
      setStats(s.data);
      setHistory(h.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [uploadId]);

  const loadItems = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([
        intGetItems(uploadId, filterParams),
        intGetItemsCount(uploadId, filterParams),
      ]);
      setItems(r.data);
      setTotalCount(c.data.count);
    } catch (e) { console.error(e); }
  }, [uploadId, filterParams]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const handleExport = () => {
    const url = intExportUrl(uploadId, {
      siparis_durumu: fSiparis, montaj_mi: fMontaj, uzmanlik: fUzmanlik,
      kalem_tipi: fKalem, level: fLevel,
    });
    window.open(url, '_blank');
  };

  const handleReupload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReuploading(true);
    try {
      const r = await intReupload(uploadId, file);
      setDiffResult(r.data);
      setTab('diff');
      loadAll();
    } catch (err) {
      alert('Karşılaştırma hatası: ' + (err?.response?.data?.detail || ''));
    }
    setReuploading(false);
    e.target.value = '';
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Yükleniyor...</div>;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Breadcrumb + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
            ← Geri
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">{upload?.filename}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{upload?.total_rows} satır • {upload?.status} • {new Date(upload?.created_at).toLocaleString('tr-TR')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all flex items-center gap-1.5">
            📥 Filtreli İndir
          </button>
          <label className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer">
            📤 {reuploading ? 'Yükleniyor...' : 'Geri Yükle (Operatör)'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleReupload} disabled={reuploading} />
          </label>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Toplam Satır" value={stats.total} color="blue" />
          <StatCard label="Sipariş EVET" value={stats.by_siparis_durumu?.EVET || 0} color="emerald" />
          <StatCard label="Sipariş HAYIR" value={stats.by_siparis_durumu?.HAYIR || 0} color="red" />
          <StatCard label="Onaylı / Kilitli" value={`${stats.approved_count} / ${stats.locked_count}`} color="amber" />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
        {[
          { key: 'data', label: 'Veri Tablosu', icon: '📋' },
          { key: 'stats', label: 'İstatistikler', icon: '📊' },
          { key: 'history', label: 'İşlem Geçmişi', icon: '🕐' },
          { key: 'diff', label: 'Karşılaştırma', icon: '🔍' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === t.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* TAB: Data Table */}
      {tab === 'data' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
            <span className="text-xs text-slate-500 font-medium">Filtre:</span>
            <select value={fSiparis} onChange={e => { setFSiparis(e.target.value); setPage(0); }}
              className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs outline-none">
              <option value="">Sipariş Durumu</option>
              <option value="EVET">EVET</option>
              <option value="HAYIR">HAYIR</option>
            </select>
            <select value={fMontaj} onChange={e => { setFMontaj(e.target.value); setPage(0); }}
              className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs outline-none">
              <option value="">Montaj mı?</option>
              <option value="EVET">EVET</option>
              <option value="HAYIR">HAYIR</option>
            </select>
            <select value={fKalem} onChange={e => { setFKalem(e.target.value); setPage(0); }}
              className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs outline-none">
              <option value="">Kalem Tipi</option>
              <option value="F">F</option>
              <option value="Y">Y</option>
              <option value="H">H</option>
              <option value="E">E</option>
              <option value="NA">NA</option>
            </select>
            <select value={fLevel} onChange={e => { setFLevel(e.target.value); setPage(0); }}
              className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs outline-none">
              <option value="">Level</option>
              {[0,1,2,3,4,5,6].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input value={fUzmanlik} onChange={e => { setFUzmanlik(e.target.value); setPage(0); }}
              placeholder="Uzmanlık..."
              className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs outline-none w-28" />
            <button onClick={() => { setFSiparis(''); setFMontaj(''); setFKalem(''); setFLevel(''); setFUzmanlik(''); setPage(0); }}
              className="px-2 py-1 rounded-lg text-slate-500 hover:text-white text-xs">Temizle</button>
            <span className="ml-auto text-xs text-slate-500">{totalCount} sonuç</span>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-white/[0.06] overflow-auto max-h-[65vh]">
            <table className="w-full text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#1c2128] text-slate-400 text-left">
                  <th className="px-2 py-2 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">L</th>
                  <th className="px-2 py-2 font-medium min-w-[200px]">Title</th>
                  <th className="px-2 py-2 font-medium">Montaj No</th>
                  <th className="px-2 py-2 font-medium">Qty</th>
                  <th className="px-2 py-2 font-medium">Kalem Tipi</th>
                  <th className="px-2 py-2 font-medium">Sipariş Durumu</th>
                  <th className="px-2 py-2 font-medium">Montaj mı?</th>
                  <th className="px-2 py-2 font-medium">Uzmanlık</th>
                  <th className="px-2 py-2 font-medium">Birim</th>
                  <th className="px-2 py-2 font-medium">MalzemeNo</th>
                  <th className="px-2 py-2 font-medium">Hes.Miktar</th>
                  <th className="px-2 py-2 font-medium">DF TR</th>
                  <th className="px-2 py-2 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} className={`border-t border-white/[0.04] transition-colors ${
                    it.locked ? 'bg-emerald-900/10' : 'hover:bg-white/[0.02]'
                  }`}>
                    <td className="px-2 py-1.5 text-slate-500">{it.row_number}</td>
                    <td className="px-2 py-1.5 text-white font-medium">{it.level}</td>
                    <td className="px-2 py-1.5 text-white" style={{ paddingLeft: `${8 + it.level * 12}px` }}>
                      {it.title}
                    </td>
                    <td className="px-2 py-1.5 text-slate-400">{it.montaj_no}</td>
                    <td className="px-2 py-1.5 text-slate-300">{it.quantity}</td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        it.kalem_tipi === 'F' ? 'bg-purple-500/20 text-purple-400' :
                        it.kalem_tipi === 'Y' ? 'bg-blue-500/20 text-blue-400' :
                        it.kalem_tipi === 'H' ? 'bg-red-500/20 text-red-400' :
                        it.kalem_tipi === 'E' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>{it.kalem_tipi || '-'}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        it.siparis_durumu === 'EVET' ? 'bg-emerald-500/20 text-emerald-400' :
                        it.siparis_durumu === 'HAYIR' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>{it.siparis_durumu || '-'}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`text-[10px] ${it.montaj_mi === 'EVET' ? 'text-purple-400' : 'text-slate-500'}`}>
                        {it.montaj_mi || '-'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-400">{it.uzmanlik || '-'}</td>
                    <td className="px-2 py-1.5 text-slate-500">{it.birim}</td>
                    <td className="px-2 py-1.5 text-slate-400">{it.malzeme_no}</td>
                    <td className="px-2 py-1.5 text-cyan-400">{it.hesaplanan_miktar != null ? it.hesaplanan_miktar.toFixed(2) : '-'}</td>
                    <td className="px-2 py-1.5 text-slate-400 max-w-[150px] truncate" title={it.df_tr}>{it.df_tr || '-'}</td>
                    <td className="px-2 py-1.5">
                      {it.locked ? <span className="text-[10px] text-emerald-400">🔒 Kilitli</span> :
                       it.approved ? <span className="text-[10px] text-blue-400">✓ Onaylı</span> :
                       <span className="text-[10px] text-slate-500">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-slate-300 text-xs hover:bg-white/[0.1] transition-all disabled:opacity-30">
                ‹ Önceki
              </button>
              <span className="text-xs text-slate-500">Sayfa {page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-slate-300 text-xs hover:bg-white/[0.1] transition-all disabled:opacity-30">
                Sonraki ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: Stats */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 gap-4">
          <DistCard title="Level Dağılımı" data={stats.by_level} />
          <DistCard title="Kalem Tipi Dağılımı" data={stats.by_kalem_tipi} />
          <DistCard title="Sipariş Durumu" data={stats.by_siparis_durumu} />
          <DistCard title="Montaj mı?" data={stats.by_montaj_mi} />
          <DistCard title="Uzmanlık" data={stats.by_uzmanlik} />
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

      {/* TAB: History */}
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        h.action === 'download' ? 'bg-blue-500/20 text-blue-400' :
                        h.action === 'reupload' ? 'bg-amber-500/20 text-amber-400' :
                        h.action === 'approve' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>{h.action}</span>
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

      {/* TAB: Diff / Comparison */}
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
                <StatCard label="Karşılaştırılan" value={diffResult.total_compared} color="blue" />
                <StatCard label="Değişiklik" value={diffResult.diffs?.length || 0} color="amber" />
                <StatCard label="Onaylanan" value={diffResult.approved_count} color="emerald" />
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
  );
}


/* ───────────────────────── Helper Components ───────────── */

function StatCard({ label, value, color }) {
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

function DistCard({ title, data }) {
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
