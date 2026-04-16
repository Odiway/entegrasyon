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
          <div className="text-5xl mb-4 opacity-20">🔒</div>
          <p className="text-lg text-slate-400">Bu sayfaya erişim yetkiniz yok</p>
          <p className="text-sm text-slate-600 mt-1">Sadece admin kullanıcılar erişebilir</p>
        </div>
      </div>
    );
  }

  const roleConfig = (role: string) => ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[1];

  return (
    <div className="px-8 py-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-slate-400 mt-1">Kullanıcı oluşturun, düzenleyin ve yönetin</p>
        </div>
        <button onClick={openCreate}
          className="px-5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-600/20 transition-all flex items-center gap-2">
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
        <div className="mb-6 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm">⚠ {error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Toplam', value: users.length, icon: '👥', color: 'from-slate-600 to-slate-500' },
          { label: 'Admin', value: users.filter(u => u.role === 'admin').length, icon: '🛡️', color: 'from-red-600 to-red-500' },
          { label: 'Tasarımcı', value: users.filter(u => u.role === 'designer').length, icon: '✏️', color: 'from-blue-600 to-blue-500' },
          { label: 'Mühendis', value: users.filter(u => u.role === 'integration_engineer').length, icon: '⚙️', color: 'from-emerald-600 to-emerald-500' },
        ].map(s => (
          <div key={s.label} className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">{s.label}</span>
              <span className="text-lg">{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <div className={`mt-3 h-1 w-full rounded-full bg-gradient-to-r ${s.color} opacity-40`} />
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                {['Kullanıcı', 'Email', 'Rol', 'Uzmanlık', 'Durum', 'İşlemler'].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
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
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-600/10">
                          {(u.full_name || u.fullName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{u.full_name || u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{u.email}</td>
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
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Düzenle">
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M9.5 2.5l3 3M2 10.5V13.5h3l8-8-3-3-8 8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        {u.id !== user?.id && (
                          <button onClick={() => handleDelete(u)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Sil">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-[#161b22] border border-white/[0.1] rounded-2xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">
              {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              {editingUser ? 'Kullanıcı bilgilerini güncelleyin' : 'Sisteme yeni kullanıcı ekleyin'}
            </p>

            {error && showModal && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm">⚠ {error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Ad Soyad</label>
                <input value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-all text-sm"
                  placeholder="Oğuzhan İnandı" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-all text-sm"
                  placeholder="email@temsa.com" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Şifre {editingUser && <span className="text-slate-600">(boş bırakırsanız değişmez)</span>}
                </label>
                <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-all text-sm"
                  placeholder={editingUser ? '••••••••' : 'En az 6 karakter'} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Rol</label>
                  <select value={formRole} onChange={e => setFormRole(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500/40 transition-all text-sm">
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Uzmanlık</label>
                  <select value={formUzmanlik} onChange={e => setFormUzmanlik(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500/40 transition-all text-sm">
                    <option value="">Seçiniz...</option>
                    {UZMANLIK_OPTIONS.filter(Boolean).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {editingUser && (
                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] cursor-pointer">
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
                className="px-5 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/[0.04] transition-all">
                İptal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all">
                {saving ? 'Kaydediliyor...' : editingUser ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
