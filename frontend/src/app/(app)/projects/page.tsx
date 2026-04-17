'use client';
import { useState, useEffect, useRef } from 'react';
import { getProjects, uploadProject, deleteProject } from '@/lib/api';
import Link from 'next/link';

const STATUS_CFG: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Tamamlandı', dot: 'bg-emerald-400' },
  review: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'İnceleme', dot: 'bg-amber-400' },
  uploaded: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Yüklendi', dot: 'bg-blue-400' },
  processing: { bg: 'bg-blue-500/10', text: 'text-blue-300', label: 'İşleniyor', dot: 'bg-blue-300' },
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
    <div className="px-8 py-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold gradient-text">BOM Projeleri</h1>
          <p className="text-sm text-slate-500 mt-1">PLM BOM dosyalarını yükleyin, inceleyin ve görev atayın</p>
        </div>
        <label className={`relative cursor-pointer transition-all duration-300 ${
          uploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}>
          {uploading ? (
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium glass text-slate-400">
              <span className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              Yükleniyor...
            </span>
          ) : (
            <span className="btn-primary inline-flex items-center gap-2">
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
        <div className="mb-6 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" /><path d="M8 5v3M8 10v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center mb-5">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="text-slate-600">
              <path d="M6 10a4 4 0 014-4h16a4 4 0 014 4v16a4 4 0 01-4 4H10a4 4 0 01-4-4V10z" stroke="currentColor" strokeWidth="2" />
              <path d="M13 14h10M13 19h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-lg text-slate-400 font-medium">Henüz proje yok</p>
          <p className="text-sm text-slate-600 mt-1 mb-8">PLM BOM dosyası yükleyerek başlayın</p>
          <div className="flex items-center gap-5 text-[11px] text-slate-600">
            {['Excel yükle', 'İncele & Görev ata', 'Excel indir'].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-gradient-to-br ${
                  i === 2 ? 'from-emerald-500 to-emerald-600' : 'from-blue-500 to-blue-600'
                } text-white shadow-lg`}>{i + 1}</span>
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
        <div className="grid gap-4 animate-fade-in stagger-children">
          {projects.map((p) => {
            const st = STATUS_CFG[p.status] || STATUS_CFG.uploaded;
            const progress = p.totalRows > 0 ? Math.round(((p.totalRows - (p.unresolvedRows || 0)) / p.totalRows) * 100) : 0;
            return (
              <Link key={p.id} href={`/project/${p.id}`}
                className="group glass-card rounded-2xl p-6 hover:border-blue-500/20 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/15 flex items-center justify-center text-blue-400 text-sm font-bold shrink-0">
                        {p.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-white group-hover:text-blue-300 truncate transition-colors duration-200">{p.name}</h2>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-0.5">
                          <span>{p.totalRows?.toLocaleString('tr-TR')} satır</span>
                          <span className="text-purple-400/80">{p._count?.tasks || 0} görev</span>
                          <span className="text-slate-600 font-mono">{new Date(p.createdAt).toLocaleDateString('tr-TR')}</span>
                          {p.uploadedBy && <span className="text-slate-600">• {p.uploadedBy}</span>}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${st.bg} ${st.text} ml-2`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 ml-[52px]">
                      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-mono text-slate-500 w-10 text-right">{progress}%</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(p.id); }}
                    className="p-2.5 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 ml-4"
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
