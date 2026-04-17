'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getTasks, updateTask, deleteTask, getTask } from '@/lib/api';
import Link from 'next/link';

const STATUS_CFG: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  open: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Açık', dot: 'bg-blue-400' },
  in_progress: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Devam Ediyor', dot: 'bg-amber-400' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Tamamlandı', dot: 'bg-emerald-400' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Reddedildi', dot: 'bg-red-400' },
};

const PRIORITY_CFG: Record<string, { text: string; label: string }> = {
  low: { text: 'text-slate-400', label: 'Düşük' },
  medium: { text: 'text-blue-400', label: 'Orta' },
  high: { text: 'text-amber-400', label: 'Yüksek' },
  critical: { text: 'text-red-400', label: 'Kritik' },
};

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isEngineer = user?.role === 'integration_engineer';
  const isDesigner = user?.role === 'designer';

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      setTasks(await getTasks(params));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterStatus]);

  const handleStatusChange = async (taskId: number, status: string) => {
    await updateTask(taskId, { status });
    await load();
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, status });
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm('Görevi silmek istediğinize emin misiniz?')) return;
    await deleteTask(taskId);
    setSelectedTask(null);
    await load();
  };

  const openDetail = async (taskId: number) => {
    setDetailLoading(true);
    try {
      setSelectedTask(await getTask(taskId));
    } catch {}
    setDetailLoading(false);
  };

  return (
    <div className="px-8 py-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Görevler</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isDesigner ? 'Oluşturduğunuz görevleri takip edin' :
             isEngineer ? 'Size atanan görevleri yönetin' :
             'Tüm görevleri görüntüleyin'}
          </p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 mb-6">
        {[['', 'Tümü'], ['open', 'Açık'], ['in_progress', 'Devam'], ['completed', 'Tamamlandı'], ['rejected', 'Red']].map(([k, l]) => (
          <button key={k} onClick={() => setFilterStatus(k)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
              filterStatus === k
                ? 'bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-blue-300 border border-blue-500/25 shadow-sm shadow-blue-500/10'
                : 'glass text-slate-500 hover:text-slate-300 hover:border-white/[0.1]'
            }`}>{l}</button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Task List */}
        <div className="flex-1">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-slate-600">
                  <rect x="4" y="4" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M9 14l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-lg text-slate-400">Görev bulunamadı</p>
              <p className="text-sm text-slate-600 mt-1">
                {isDesigner ? 'Bir proje detayından yeni görev oluşturabilirsiniz' : 'Henüz size atanmış görev yok'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 stagger-children">
              {tasks.map((task) => {
                const st = STATUS_CFG[task.status] || STATUS_CFG.open;
                const pr = PRIORITY_CFG[task.priority] || PRIORITY_CFG.medium;
                return (
                  <div key={task.id} onClick={() => openDetail(task.id)}
                    className={`cursor-pointer glass-card rounded-2xl p-5 animate-fade-in ${
                      selectedTask?.id === task.id ? 'border-blue-500/30 !bg-blue-500/[0.06]' : 'hover:border-blue-500/20'
                    }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <h3 className="text-sm font-semibold text-white truncate">{task.title}</h3>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                          <span className={`text-[10px] font-medium ${pr.text}`}>{pr.label}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {task.project?.name} · {task._count?.items || 0} kalem · {new Date(task.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-600 mt-2 pt-2 border-t border-white/[0.04]">
                      <span>Oluşturan: <span className="text-slate-400">{task.createdBy?.fullName}</span></span>
                      <span>Atanan: <span className="text-slate-400">{task.assignedTo?.fullName || 'Atanmadı'}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Task Detail Panel */}
        {selectedTask && (
          <div className="w-96 shrink-0 animate-slide-in">
            <div className="sticky top-4 glass-strong rounded-2xl p-6 relative overflow-hidden">
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
              {detailLoading ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold gradient-text">{selectedTask.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{selectedTask.project?.name}</p>
                    </div>
                    <button onClick={() => setSelectedTask(null)} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/[0.06] transition-all">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </button>
                  </div>

                  {selectedTask.description && (
                    <p className="text-sm text-slate-400 mb-5 glass rounded-xl p-3.5">{selectedTask.description}</p>
                  )}

                  <div className="space-y-3 mb-5">
                    {[
                      { label: 'Durum', value: STATUS_CFG[selectedTask.status]?.label, cls: STATUS_CFG[selectedTask.status]?.text },
                      { label: 'Öncelik', value: PRIORITY_CFG[selectedTask.priority]?.label, cls: PRIORITY_CFG[selectedTask.priority]?.text },
                      { label: 'Oluşturan', value: selectedTask.createdBy?.fullName, cls: 'text-slate-300' },
                      { label: 'Atanan', value: selectedTask.assignedTo?.fullName || 'Atanmadı', cls: 'text-slate-300' },
                      { label: 'Oluşturulma', value: new Date(selectedTask.createdAt).toLocaleString('tr-TR'), cls: 'text-slate-400' },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">{row.label}</span>
                        <span className={row.cls}>{row.value}</span>
                      </div>
                    ))}
                    {selectedTask.completedAt && (
                      <div className="flex justify-between text-xs"><span className="text-slate-600">Tamamlanma</span><span className="text-emerald-400">{new Date(selectedTask.completedAt).toLocaleString('tr-TR')}</span></div>
                    )}
                  </div>

                  {/* Task Items */}
                  {selectedTask.items && selectedTask.items.length > 0 && (
                    <div className="mb-5">
                      <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">BOM Kalemleri ({selectedTask.items.length})</h4>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {selectedTask.items.map((ti: any) => (
                          <div key={ti.id} className="glass rounded-lg p-2.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600/90 text-white">L{ti.bomItem?.level}</span>
                              <span className="text-slate-300 truncate flex-1">{ti.bomItem?.title}</span>
                            </div>
                            <div className="text-[10px] text-slate-600 mt-1 flex gap-2">
                              <span>{ti.bomItem?.malzemeNoSap}</span>
                              {ti.bomItem?.status === 'modified' && <span className="text-purple-400">değişti</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                    {isEngineer && selectedTask.status === 'open' && (
                      <button onClick={() => handleStatusChange(selectedTask.id, 'in_progress')}
                        className="w-full px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm font-medium transition-all duration-200">
                        Göreve Başla
                      </button>
                    )}
                    {isEngineer && selectedTask.status === 'in_progress' && (
                      <>
                        <Link href={`/project/${selectedTask.projectId}`}
                          className="w-full px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-sm font-medium text-center transition-all duration-200">
                          Projeye Git & Düzenle
                        </Link>
                        <button onClick={() => handleStatusChange(selectedTask.id, 'completed')}
                          className="w-full px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium transition-all duration-200">
                          Tamamlandı
                        </button>
                      </>
                    )}
                    {(isDesigner || user?.role === 'admin') && (
                      <button onClick={() => handleDelete(selectedTask.id)}
                        className="w-full px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-all duration-200">
                        Görevi Sil
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
