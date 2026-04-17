'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getUsers, createUser, updateUser, deleteUser } from '@/lib/api';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  { value: 'designer', label: 'Tasarımcı', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  { value: 'integration_engineer', label: 'Ent. Mühendisi', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
];

const UZMANLIK_OPTIONS = ['', 'GÖVDE', 'TRİM', 'HVAC', 'MEKANİK', 'ELEKTRİK'];

interface UserItem {
  id: number;
  email: string;
  full_name: string;
  fullName?: string;
  role: string;
  uzmanlik: string | null;
  isActive: boolean;
  createdAt?: string;
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('designer');
  const [formUzmanlik, setFormUzmanlik] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin';

  const load = async () => {
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch { setError('Kullanıcılar yüklenemedi'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setFormName(''); setFormEmail(''); setFormPassword('');
    setFormRole('designer'); setFormUzmanlik(''); setFormActive(true);
    setShowModal(true); setError('');
  };

  const openEdit = (u: UserItem) => {
    setEditingUser(u);
    setFormName(u.full_name || u.fullName || '');
    setFormEmail(u.email);
    setFormPassword('');
    setFormRole(u.role);
    setFormUzmanlik(u.uzmanlik || '');
    setFormActive(u.isActive);
    setShowModal(true); setError('');
  };

  const handleSave = async () => {
    if (!formName || !formEmail) { setError('Ad ve email gerekli'); return; }
    if (!editingUser && !formPassword) { setError('Şifre gerekli'); return; }
    if (formPassword && formPassword.length < 6) { setError('Şifre en az 6 karakter'); return; }

    setSaving(true); setError('');
    try {
      if (editingUser) {
        const data: any = {
          full_name: formName,
          email: formEmail,
          role: formRole,
          uzmanlik: formUzmanlik || null,
          isActive: formActive,
        };
        if (formPassword) data.password = formPassword;
        await updateUser(editingUser.id, data);
        setSuccess('Kullanıcı güncellendi');
      } else {
        await createUser({
          full_name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          uzmanlik: formUzmanlik || undefined,
        });
        setSuccess('Kullanıcı oluşturuldu');
      }
      setShowModal(false);
      await load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'İşlem başarısız');
    }
    setSaving(false);
  };

  const handleDelete = async (u: UserItem) => {
    if (u.id === user?.id) { setError('Kendinizi silemezsiniz'); return; }
    if (!confirm(`"${u.full_name || u.fullName}" kullanıcısını silmek istiyor musunuz?`)) return;
    try {
      await deleteUser(u.id);
      setSuccess('Kullanıcı silindi');
      await load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Silme hatası');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-slate-600">
              <rect x="6" y="12" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 12V9a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-lg text-slate-400">Bu sayfaya erişim yetkiniz yok</p>
          <p className="text-sm text-slate-600 mt-1">Sadece admin kullanıcılar erişebilir</p>
        </div>
      </div>
    );
  }

  const roleConfig = (role: string) => ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[1];

  return (
    <div className="px-8 py-6 max-w-[1200px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-slate-500 mt-1">Kullanıcı oluşturun, düzenleyin ve yönetin</p>
        </div>
        <button onClick={openCreate}
          className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Yeni Kullanıcı
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {success}
        </div>
      )}
      {error && !showModal && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" /><path d="M8 5v3M8 10v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8 stagger-children">
        {[
          { label: 'Toplam', value: users.length, icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-400">
              <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M1 17a6 6 0 0112 0" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="14" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M12 17a5 5 0 018 0" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ), gradient: 'from-slate-500/20 to-slate-600/5' },
          { label: 'Admin', value: users.filter(u => u.role === 'admin').length, icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-red-400">
              <path d="M10 2l2 4 4.5.5-3 3.5L14 15l-4-2-4 2 .5-5-3-3.5L8 6l2-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          ), gradient: 'from-red-500/20 to-red-600/5' },
          { label: 'Tasarımcı', value: users.filter(u => u.role === 'designer').length, icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-blue-400">
              <path d="M14 2l4 4-10 10H4v-4L14 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ), gradient: 'from-blue-500/20 to-blue-600/5' },
          { label: 'Mühendis', value: users.filter(u => u.role === 'integration_engineer').length, icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
              <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.22 4.22l2.12 2.12M13.66 13.66l2.12 2.12M4.22 15.78l2.12-2.12M13.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ), gradient: 'from-emerald-500/20 to-emerald-600/5' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-2xl p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-medium">{s.label}</span>
              <div className={`p-2 rounded-xl bg-gradient-to-br ${s.gradient}`}>{s.icon}</div>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                {['Kullanıcı', 'Email', 'Rol', 'Uzmanlık', 'Durum', 'İşlemler'].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-16 text-slate-600">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Yükleniyor...
                  </div>
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-slate-600">Henüz kullanıcı yok</td></tr>
              ) : users.map(u => {
                const rc = roleConfig(u.role);
                return (
                  <tr key={u.id} className="border-b border-white/[0.04] table-row-hover">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-600/10">
                          {(u.full_name || u.fullName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{u.full_name || u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 font-mono text-xs">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border ${rc.color}`}>
                        {rc.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{u.uzmanlik || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                        u.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        {u.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)}
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200" title="Düzenle">
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M9.5 2.5l3 3M2 10.5V13.5h3l8-8-3-3-8 8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        {u.id !== user?.id && (
                          <button onClick={() => handleDelete(u)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200" title="Sil">
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                              <path d="M3 4h9M5.5 4V3a1 1 0 011-1h2a1 1 0 011 1v1m1.5 0v8a1 1 0 01-1 1h-5a1 1 0 01-1-1V4h8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={() => setShowModal(false)}>
          <div className="glass-strong rounded-2xl p-7 w-full max-w-md shadow-2xl shadow-black/30 animate-slide-up relative overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
            <h3 className="text-lg font-bold gradient-text mb-1">
              {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              {editingUser ? 'Kullanıcı bilgilerini güncelleyin' : 'Sisteme yeni kullanıcı ekleyin'}
            </p>

            {error && showModal && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M7 4.5v2.5M7 9v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Ad Soyad</label>
                <input value={formName} onChange={e => setFormName(e.target.value)}
                  className="input-glass text-sm"
                  placeholder="Oğuzhan İnandı" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Email</label>
                <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                  className="input-glass text-sm"
                  placeholder="email@temsa.com" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Şifre {editingUser && <span className="text-slate-600">(boş bırakırsanız değişmez)</span>}
                </label>
                <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)}
                  className="input-glass text-sm"
                  placeholder={editingUser ? '••••••••' : 'En az 6 karakter'} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Rol</label>
                  <select value={formRole} onChange={e => setFormRole(e.target.value)}
                    className="input-glass text-sm text-slate-300">
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Uzmanlık</label>
                  <select value={formUzmanlik} onChange={e => setFormUzmanlik(e.target.value)}
                    className="input-glass text-sm text-slate-300">
                    <option value="">Seçiniz...</option>
                    {UZMANLIK_OPTIONS.filter(Boolean).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {editingUser && (
                <label className="flex items-center gap-3 p-3.5 rounded-xl glass cursor-pointer">
                  <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4" />
                  <div>
                    <span className="text-sm text-white font-medium">Aktif Kullanıcı</span>
                    <p className="text-[10px] text-slate-500">Pasif kullanıcılar sisteme giriş yapamaz</p>
                  </div>
                </label>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/[0.04] transition-all duration-200">
                İptal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-50 transition-all duration-300"
                style={{ boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
                {saving ? 'Kaydediliyor...' : editingUser ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
