'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getMaterials, createMaterial, updateMaterial, deleteMaterial,
  searchMaterials, getMaterialCount, importMM03,
} from '@/lib/api';

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const mm03Ref = useRef<HTMLInputElement>(null);
  const PER_PAGE = 50;

  const [form, setForm] = useState({
    malzeme_no: '', tanim: '', kalem_tipi: '', birim: '',
    ana_malzeme: '', ana_malzeme_tanim: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = { offset: page * PER_PAGE, limit: PER_PAGE, q: search || undefined };
    const [mRes, cRes] = await Promise.all([
      search ? searchMaterials(search, page * PER_PAGE, PER_PAGE) : getMaterials(params),
      getMaterialCount(),
    ]);
    setMaterials(mRes.data);
    setTotal(cRes.data.count || 0);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      if (editItem) {
        await updateMaterial(editItem.id, form);
        setMsg('ok:Güncellendi');
      } else {
        await createMaterial(form);
        setMsg('ok:Oluşturuldu');
      }
      setShowForm(false);
      setEditItem(null);
      load();
    } catch (err: any) {
      setMsg('err:' + (err?.response?.data?.detail || 'İşlem hatası'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await deleteMaterial(id);
    setMsg('ok:Silindi');
    load();
  };

  const handleMM03 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setMsg('');
    try {
      const res = (await importMM03(file)).data;
      setMsg('ok:MM03 içe aktarıldı — ' + res.imported + '/' + res.total + ' malzeme');
      load();
    } catch (err: any) {
      setMsg('err:' + (err?.response?.data?.detail || 'MM03 içe aktarma hatası'));
    }
    setImporting(false);
    if (mm03Ref.current) mm03Ref.current.value = '';
  };

  const openEdit = (m: any) => {
    setEditItem(m);
    setForm({
      malzeme_no: m.malzeme_no || '',
      tanim: m.tanim || '',
      kalem_tipi: m.kalem_tipi || '',
      birim: m.birim || '',
      ana_malzeme: m.ana_malzeme || '',
      ana_malzeme_tanim: m.ana_malzeme_tanim || '',
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditItem(null);
    setForm({ malzeme_no: '', tanim: '', kalem_tipi: '', birim: '', ana_malzeme: '', ana_malzeme_tanim: '' });
    setShowForm(true);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Malzeme Master</h1>
          <p className="text-sm text-slate-500 mt-1">{total.toLocaleString('tr-TR')} malzeme kayıtlı</p>
        </div>
        <div className="flex gap-2">
          <label className={`px-4 py-2 rounded-xl text-sm font-medium cursor-pointer ${
            importing ? 'bg-zinc-800 text-zinc-500' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
          }`}>
            {importing ? 'İçe Aktarılıyor...' : 'MM03 İçe Aktar'}
            <input ref={mm03Ref} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleMM03} disabled={importing} />
          </label>
          <button onClick={openNew} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
            Yeni Malzeme
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

      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Malzeme no, tanım veya ana malzeme ile ara..."
            className="w-full pl-10 pr-4 py-3 bg-[#161b22] border border-white/[0.06] rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-500 text-[11px]">
                {['Malzeme No', 'Tanım', 'Kalem Tipi', 'Birim', 'Ana Malzeme', 'Ana Malz. Tanım', 'Oluşturulma', 'İşlem'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-600">
                  <div className="flex items-center justify-center gap-3"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Yükleniyor...</div>
                </td></tr>
              ) : materials.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-600">Kayıt bulunamadı</td></tr>
              ) : materials.map((m: any) => (
                <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                  <td className="px-4 py-2.5 text-xs text-blue-300 font-mono font-medium">{m.malzeme_no}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-300 max-w-[250px] truncate">{m.tanim}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-500/15 text-violet-400 border border-violet-500/20">{m.kalem_tipi || '—'}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{m.birim || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{m.ana_malzeme || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[200px] truncate">{m.ana_malzeme_tanim || '—'}</td>
                  <td className="px-4 py-2.5 text-[10px] text-slate-700">{m.created_at ? new Date(m.created_at).toLocaleDateString('tr-TR') : '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(m)} className="px-2 py-0.5 text-xs rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">Düzenle</button>
                      <button onClick={() => handleDelete(m.id)} className="px-2 py-0.5 text-xs rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20">Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400">← Önceki</button>
          <span className="text-xs text-slate-600">Sayfa {page + 1} / {totalPages || 1}</span>
          <button onClick={() => setPage(page + 1)} disabled={(page + 1) >= totalPages} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400">Sonraki →</button>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[#161b22] border border-white/[0.1] rounded-2xl p-6 w-[500px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{editItem ? 'Malzeme Düzenle' : 'Yeni Malzeme'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { key: 'malzeme_no', label: 'Malzeme No', required: true },
                { key: 'tanim', label: 'Tanım' },
                { key: 'kalem_tipi', label: 'Kalem Tipi' },
                { key: 'birim', label: 'Birim' },
                { key: 'ana_malzeme', label: 'Ana Malzeme' },
                { key: 'ana_malzeme_tanim', label: 'Ana Malzeme Tanım' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                  <input type="text" value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    required={f.required}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40" />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-white/[0.04] text-slate-400 text-sm hover:bg-white/[0.08]">İptal</button>
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
