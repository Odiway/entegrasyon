'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getIntegrationUploads, uploadIntegration, deleteIntegration,
  getIntegrationDetail, getIntegrationItems, getIntegrationStats,
  updateIntegrationItem, exportIntegration, reuploadIntegration,
  approveIntegration, getIntegrationHistory, downloadIntegrationTemplate,
} from '@/lib/api';

export default function IntegrationPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<'data' | 'stats' | 'history' | 'diff'>('data');
  const [filter, setFilter] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const reuploadRef = useRef<HTMLInputElement>(null);
  const [diff, setDiff] = useState<any>(null);

  const loadUploads = useCallback(async () => {
    setUploads((await getIntegrationUploads()).data);
  }, []);

  useEffect(() => { loadUploads(); }, [loadUploads]);

  const loadDetail = useCallback(async (id: number) => {
    setLoading(true);
    const [d, s, h] = await Promise.all([
      getIntegrationDetail(id),
      getIntegrationStats(id),
      getIntegrationHistory(id),
    ]);
    setDetail(d.data);
    setStats(s.data);
    setHistory(h.data);
    setLoading(false);
  }, []);

  const loadItems = useCallback(async () => {
    if (!selected) return;
    const params: any = { offset: page * 500, limit: 500, ...filter };
    setItems((await getIntegrationItems(selected, params)).data);
  }, [selected, page, filter]);

  useEffect(() => { if (selected) { loadDetail(selected); } }, [selected, loadDetail]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMsg('');
    try {
      const res = (await uploadIntegration(file)).data;
      setMsg('ok:Yüklendi — ' + res.item_count + ' satır işlendi');
      await loadUploads();
      setSelected(res.id);
    } catch (err: any) {
      setMsg('err:' + (err?.response?.data?.detail || 'Yükleme hatası'));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleReupload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setMsg('');
    try {
      const res = (await reuploadIntegration(selected, file)).data;
      setDiff(res);
      setTab('diff');
      setMsg('ok:Yeniden yüklendi — ' + (res.changes?.length || 0) + ' değişiklik tespit edildi');
      loadDetail(selected);
      loadItems();
    } catch (err: any) {
      setMsg('err:' + (err?.response?.data?.detail || 'Yeniden yükleme hatası'));
    }
    if (reuploadRef.current) reuploadRef.current.value = '';
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await deleteIntegration(id);
    if (selected === id) { setSelected(null); setDetail(null); setItems([]); }
    await loadUploads();
  };

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await approveIntegration(selected);
      setMsg('ok:Onaylandı');
      loadDetail(selected);
    } catch (err: any) {
      setMsg('err:' + (err?.response?.data?.detail || 'Onay hatası'));
    }
  };

  return (
    <div className="px-6 py-6 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Entegrasyon</h1>
          <p className="text-sm text-slate-500 mt-1">Şablon tabanlı entegrasyon yönetimi</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadIntegrationTemplate()} className="px-4 py-2 rounded-xl bg-slate-700/50 border border-slate-600/30 text-slate-400 hover:text-white text-sm font-medium">
            Şablon İndir
          </button>
          <label className={`px-4 py-2 rounded-xl text-sm font-medium cursor-pointer ${
            uploading ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}>
            {uploading ? 'Yükleniyor...' : 'Dosya Yükle'}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {msg && (
        <div className={`mb-5 p-3 rounded-xl text-sm flex items-center gap-2 ${
          msg.startsWith('ok:') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {msg.startsWith('ok:') ? '✓' : '⚠'} {msg.replace(/^(ok:|err:)/, '')}
        </div>
      )}

      <div className="flex gap-5">
        {/* Sidebar - Upload list */}
        <div className="w-72 shrink-0">
          <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="p-3 border-b border-white/[0.06]">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Yüklemeler</span>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {uploads.length === 0 ? (
                <div className="p-4 text-center text-slate-600 text-sm">Henüz yükleme yok</div>
              ) : uploads.map((u) => (
                <div key={u.id} onClick={() => { setSelected(u.id); setTab('data'); setPage(0); setFilter({}); }}
                  className={`px-3 py-3 border-b border-white/[0.04] cursor-pointer transition-all ${
                    selected === u.id ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-white/[0.03]'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white truncate max-w-[180px]">{u.file_name}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(u.id); }}
                      className="text-slate-700 hover:text-red-400 text-xs">×</button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <span>{u.item_count} satır</span>
                    <span>•</span>
                    <span>{new Date(u.created_at).toLocaleDateString('tr-TR')}</span>
                    {u.is_approved && <span className="text-emerald-500 ml-auto">✓ Onaylı</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="flex items-center justify-center h-64 bg-[#161b22] border border-white/[0.06] rounded-2xl">
              <div className="text-center">
                <div className="text-4xl text-slate-800 mb-3">📋</div>
                <p className="text-slate-600 text-sm">Bir yükleme seçin veya yeni dosya yükleyin</p>
              </div>
            </div>
          ) : loading && !detail ? (
            <div className="flex items-center justify-center h-64 bg-[#161b22] border border-white/[0.06] rounded-2xl">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-5 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{detail?.file_name}</h2>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{detail?.item_count} satır</span>
                      <span>Yükleyen: {detail?.uploaded_by_name}</span>
                      <span>{new Date(detail?.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <label className="px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20">
                      Yeniden Yükle
                      <input ref={reuploadRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleReupload} />
                    </label>
                    <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002'}/integration/${selected}/export?t=${Date.now()}`}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20">
                      Excel İndir
                    </a>
                    {!detail?.is_approved && (
                      <button onClick={handleApprove} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white">Onayla</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4">
                {(['data', 'stats', 'history', 'diff'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    tab === t ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]'
                  }`}>{t === 'data' ? 'Veri' : t === 'stats' ? 'İstatistik' : t === 'history' ? 'Geçmiş' : 'Diff'}</button>
                ))}
              </div>

              {tab === 'data' && (
                <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-slate-500 text-[11px]">
                          {['#', 'MalzNo', 'Tanım', 'Sipariş D.', 'M. Flag', 'Miktar', 'Birim', 'Beklenen', 'Fark', 'Güncelleyen'].map(h => (
                            <th key={h} className="px-3 py-3 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it: any) => (
                          <tr key={it.id} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                            <td className="px-3 py-1.5 text-[11px] text-slate-700 font-mono">{it.row_number}</td>
                            <td className="px-3 py-1.5 text-xs text-slate-400 font-mono">{it.malzeme_no}</td>
                            <td className="px-3 py-1.5 text-xs text-slate-300 max-w-[220px] truncate">{it.tanim}</td>
                            <td className="px-3 py-1.5">
                              <span className={`text-xs font-medium ${
                                it.siparis_durumu === 'SİPARİŞ VERİLECEK' ? 'text-emerald-400' :
                                it.siparis_durumu === 'SİPARİŞ VERİLMEYECEK' ? 'text-red-400/60' :
                                it.siparis_durumu === 'STOKTAN KARŞILANACAK' ? 'text-blue-400' : 'text-slate-600'
                              }`}>{it.siparis_durumu}</span>
                            </td>
                            <td className="px-3 py-1.5 text-xs text-slate-500">{it.montaj_flag ? 'MONTAJ' : '—'}</td>
                            <td className="px-3 py-1.5 text-xs text-white font-mono">{it.miktar}</td>
                            <td className="px-3 py-1.5 text-xs text-slate-600">{it.birim}</td>
                            <td className="px-3 py-1.5 text-xs text-slate-600 font-mono">{it.beklenen_miktar}</td>
                            <td className={`px-3 py-1.5 text-xs font-mono font-medium ${
                              (it.fark || 0) > 0 ? 'text-red-400' : (it.fark || 0) < 0 ? 'text-emerald-400' : 'text-slate-700'
                            }`}>{it.fark || '—'}</td>
                            <td className="px-3 py-1.5 text-[10px] text-slate-700">{it.updated_by_name}</td>
                          </tr>
                        ))}
                        {items.length === 0 && <tr><td colSpan={10} className="text-center py-12 text-slate-600">Kayıt yok</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
                    <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400">← Önceki</button>
                    <span className="text-xs text-slate-600">Sayfa {page + 1}</span>
                    <button onClick={() => setPage(page + 1)} disabled={items.length < 500} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400">Sonraki →</button>
                  </div>
                </div>
              )}

              {tab === 'stats' && stats && (
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-5">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Sipariş Durumu Dağılımı</h3>
                    {Object.entries(stats.by_siparis_durumu || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                        <span className="text-sm text-slate-400">{k}</span>
                        <span className="text-sm font-semibold text-white">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-5">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Montaj Dağılımı</h3>
                    {Object.entries(stats.by_montaj || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                        <span className="text-sm text-slate-400">{k}</span>
                        <span className="text-sm font-semibold text-white">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="col-span-2 bg-[#161b22] border border-white/[0.06] rounded-2xl p-5">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Özet</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center"><div className="text-2xl font-bold text-white">{stats.total || 0}</div><div className="text-xs text-slate-600">Toplam</div></div>
                      <div className="text-center"><div className="text-2xl font-bold text-emerald-400">{stats.approved || 0}</div><div className="text-xs text-slate-600">Onaylı</div></div>
                      <div className="text-center"><div className="text-2xl font-bold text-amber-400">{stats.pending || 0}</div><div className="text-xs text-slate-600">Bekleyen</div></div>
                      <div className="text-center"><div className="text-2xl font-bold text-red-400">{stats.rejected || 0}</div><div className="text-xs text-slate-600">Reddedilen</div></div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'history' && (
                <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">İşlem Geçmişi</h3>
                  {history.length === 0 ? (
                    <p className="text-slate-600 text-sm text-center py-8">Geçmiş kaydı yok</p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((h: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 py-2 border-b border-white/[0.04]">
                          <div className="w-2 h-2 rounded-full mt-1.5 bg-blue-500 shrink-0" />
                          <div>
                            <p className="text-sm text-slate-300">{h.action}</p>
                            <p className="text-xs text-slate-600">{h.user_name} • {new Date(h.created_at).toLocaleString('tr-TR')}</p>
                            {h.details && <p className="text-xs text-slate-700 mt-1">{h.details}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'diff' && (
                <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Yeniden Yükleme Karşılaştırması</h3>
                  {!diff ? (
                    <p className="text-slate-600 text-sm text-center py-8">Karşılaştırma verisi yok. Yeniden yükleme yapın.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                          <div className="text-lg font-bold text-emerald-400">{diff.added || 0}</div>
                          <div className="text-xs text-slate-600">Yeni</div>
                        </div>
                        <div className="bg-amber-500/10 rounded-xl p-3 text-center">
                          <div className="text-lg font-bold text-amber-400">{diff.changed || 0}</div>
                          <div className="text-xs text-slate-600">Değişen</div>
                        </div>
                        <div className="bg-red-500/10 rounded-xl p-3 text-center">
                          <div className="text-lg font-bold text-red-400">{diff.removed || 0}</div>
                          <div className="text-xs text-slate-600">Silinen</div>
                        </div>
                      </div>
                      {diff.changes && diff.changes.length > 0 && (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.08] text-slate-500 text-[11px]">
                              <th className="px-3 py-2 text-left">MalzNo</th>
                              <th className="px-3 py-2 text-left">Alan</th>
                              <th className="px-3 py-2 text-left">Eski</th>
                              <th className="px-3 py-2 text-left">Yeni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diff.changes.slice(0, 100).map((c: any, i: number) => (
                              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                                <td className="px-3 py-1.5 text-xs text-slate-400 font-mono">{c.malzeme_no}</td>
                                <td className="px-3 py-1.5 text-xs text-slate-500">{c.field}</td>
                                <td className="px-3 py-1.5 text-xs text-red-400/70">{c.old_value}</td>
                                <td className="px-3 py-1.5 text-xs text-emerald-400">{c.new_value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
