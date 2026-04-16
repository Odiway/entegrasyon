'use client';
import { useState, useEffect, useRef } from 'react';
import { getProjects, uploadProject, deleteProject } from '@/lib/api';
import Link from 'next/link';

const STATUS_CFG: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Tamamlandı' },
  review: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'İnceleme' },
  uploaded: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Yüklendi' },
  processing: { bg: 'bg-blue-500/10', text: 'text-blue-300', label: 'İşleniyor' },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setProjects(await getProjects());
    } catch {
      setError('Sunucuya bağlanılamadı');
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await uploadProject(file);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Yükleme hatası');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Projeyi silmek istediğinize emin misiniz?')) return;
    await deleteProject(id);
    await load();
  };

  return (
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">BOM Projeleri</h1>
          <p className="text-sm text-slate-400 mt-1">PLM BOM dosyalarını yükleyin, inceleyin ve görev atayın</p>
        </div>
        <label className={`relative px-5 py-2.5 rounded-xl font-medium text-sm cursor-pointer transition-all ${
          uploading
            ? 'bg-slate-800 text-slate-500'
            : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-600/20'
        }`}>
          {uploading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              Yükleniyor...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1v10M4 5l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              PLM Dosyası Yükle
            </span>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm">
          ⚠ {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
          <div className="text-6xl mb-4 opacity-20">📦</div>
          <p className="text-lg text-slate-400 font-medium">Henüz proje yok</p>
          <p className="text-sm text-slate-600 mt-1 mb-8">PLM BOM dosyası yükleyerek başlayın</p>
          <div className="flex items-center gap-5 text-[11px] text-slate-600">
            {['Excel yükle', 'İncele & Görev ata', 'Excel indir'].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold ${
                  i === 2
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400/70'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400/70'
                }`}>{i + 1}</span>
                <span>{s}</span>
                {i < 2 && (
                  <svg width="20" height="8" viewBox="0 0 20 8" fill="none" className="text-slate-800 ml-3">
                    <path d="M0 4h18M16 1l3 3-3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 animate-fade-in">
          {projects.map((p) => {
            const st = STATUS_CFG[p.status] || STATUS_CFG.uploaded;
            const progress = p.totalRows > 0 ? Math.round(((p.totalRows - (p.unresolvedRows || 0)) / p.totalRows) * 100) : 0;
            return (
              <Link key={p.id} href={`/project/${p.id}`}
                className="group cursor-pointer relative rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] p-6 transition-all hover:border-blue-500/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-lg font-semibold text-white group-hover:text-blue-300 truncate">{p.name}</h2>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-5 text-sm text-slate-500">
                      <span>{p.totalRows?.toLocaleString('tr-TR')} satır</span>
                      <span className="text-purple-400/80">{p._count?.tasks || 0} görev</span>
                      <span className="text-slate-700">{new Date(p.createdAt).toLocaleDateString('tr-TR')}</span>
                      {p.uploadedBy && <span className="text-slate-600">• {p.uploadedBy}</span>}
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-mono text-slate-500 w-10 text-right">{progress}%</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(p.id); }}
                    className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-4"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1m2 0v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4h8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
