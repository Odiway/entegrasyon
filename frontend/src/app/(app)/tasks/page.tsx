'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getTasks, updateTask, deleteTask, getTask } from '@/lib/api';
import Link from 'next/link';

const STATUS_CFG: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Açık' },
  in_progress: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Devam Ediyor' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Tamamlandı' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Reddedildi' },
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
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Görevler</h1>
          <p className="text-sm text-slate-400 mt-1">
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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === k ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04] hover:bg-white/[0.06]'
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
            <div className="py-12 text-center">
              <div className="text-5xl mb-3 opacity-20">📋</div>
              <p className="text-lg text-slate-400">Görev bulunamadı</p>
              <p className="text-sm text-slate-600 mt-1">
                {isDesigner ? 'Bir proje detayından yeni görev oluşturabilirsiniz' : 'Henüz size atanmış görev yok'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const st = STATUS_CFG[task.status] || STATUS_CFG.open;
                const pr = PRIORITY_CFG[task.priority] || PRIORITY_CFG.medium;
                return (
                  <div key={task.id} onClick={() => openDetail(task.id)}
                    className={`cursor-pointer rounded-2xl border bg-white/[0.03] p-5 transition-all hover:bg-white/[0.06] ${
                      selectedTask?.id === task.id ? 'border-blue-500/30 bg-blue-500/[0.04]' : 'border-white/[0.06] hover:border-blue-500/20'
                    }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white truncate">{task.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                          <span className={`text-[10px] font-medium ${pr.text}`}>{pr.label}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {task.project?.name} · {task._count?.items || 0} kalem · {new Date(task.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
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
          <div className="w-96 shrink-0">
            <div className="sticky top-4 bg-[#161b22] border border-white/[0.06] rounded-2xl p-5">
              {detailLoading ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedTask.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{selectedTask.project?.name}</p>
                    </div>
                    <button onClick={() => setSelectedTask(null)} className="text-slate-600 hover:text-white">✕</button>
                  </div>

                  {selectedTask.description && (
                    <p className="text-sm text-slate-400 mb-4 bg-white/[0.03] rounded-lg p-3">{selectedTask.description}</p>
                  )}

                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex justify-between"><span className="text-slate-600">Durum</span><span className={STATUS_CFG[selectedTask.status]?.text}>{STATUS_CFG[selectedTask.status]?.label}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Öncelik</span><span className={PRIORITY_CFG[selectedTask.priority]?.text}>{PRIORITY_CFG[selectedTask.priority]?.label}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Oluşturan</span><span className="text-slate-400">{selectedTask.createdBy?.fullName}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Atanan</span><span className="text-slate-400">{selectedTask.assignedTo?.fullName || 'Atanmadı'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Oluşturulma</span><span className="text-slate-400">{new Date(selectedTask.createdAt).toLocaleString('tr-TR')}</span></div>
                    {selectedTask.completedAt && (
                      <div className="flex justify-between"><span className="text-slate-600">Tamamlanma</span><span className="text-emerald-400">{new Date(selectedTask.completedAt).toLocaleString('tr-TR')}</span></div>
                    )}
                  </div>

                  {/* Task Items */}
                  {selectedTask.items && selectedTask.items.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">BOM Kalemleri ({selectedTask.items.length})</h4>
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {selectedTask.items.map((ti: any) => (
                          <div key={ti.id} className="bg-white/[0.03] rounded-lg p-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600/90 text-white">L{ti.bomItem?.level}</span>
                              <span className="text-slate-300 truncate flex-1">{ti.bomItem?.title}</span>
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5 flex gap-2">
                              <span>{ti.bomItem?.malzemeNoSap}</span>
                              {ti.bomItem?.status === 'modified' && <span className="text-purple-400">değişti</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {isEngineer && selectedTask.status === 'open' && (
                      <button onClick={() => handleStatusChange(selectedTask.id, 'in_progress')}
                        className="w-full px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm font-medium">
                        Göreve Başla
                      </button>
                    )}
                    {isEngineer && selectedTask.status === 'in_progress' && (
                      <>
                        <Link href={`/project/${selectedTask.projectId}`}
                          className="w-full px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-sm font-medium text-center">
                          Projeye Git & Düzenle
                        </Link>
                        <button onClick={() => handleStatusChange(selectedTask.id, 'completed')}
                          className="w-full px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium">
                          Tamamlandı
                        </button>
                      </>
                    )}
                    {(isDesigner || user?.role === 'admin') && (
                      <button onClick={() => handleDelete(selectedTask.id)}
                        className="w-full px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium">
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
