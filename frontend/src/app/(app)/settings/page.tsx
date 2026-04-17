'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchRules() {
  const token = getToken();
  const res = await fetch('/api/settings/rules', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rules, setRules] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'kalem' | 'level' | 'uzmanlik' | 'formul' | 'akis'>('kalem');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchRules().then(setRules).catch(() => {}).finally(() => setLoading(false));
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rules) {
    return <div className="p-8 text-center text-slate-500">Kurallar yüklenemedi</div>;
  }

  const tabs = [
    { key: 'kalem', label: 'Kalem Tipleri', icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3h8v2H3zM3 7h6v2H3zM3 11h7v2H3z" fill="currentColor" opacity="0.8" /></svg>
    )},
    { key: 'level', label: 'Level Kuralları', icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 11h3V5H2v6zM6 11h3V3H6v8zM10 11h3V7h-3v4z" fill="currentColor" opacity="0.8" /></svg>
    )},
    { key: 'uzmanlik', label: 'Uzmanlık & Birim', icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    )},
    { key: 'formul', label: 'Formüller', icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2h8v10H3z" stroke="currentColor" strokeWidth="1.5" rx="1" /><path d="M5 5h4M5 7h3M5 9h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>
    )},
    { key: 'akis', label: 'İş Akışı', icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="3" r="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="7" cy="11" r="2" stroke="currentColor" strokeWidth="1.5" /><path d="M7 5v4" stroke="currentColor" strokeWidth="1.5" /></svg>
    )},
  ];

  return (
    <div className="px-6 py-6 max-w-[1200px] mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold gradient-text">Ayarlar & Kurallar</h1>
        <p className="text-sm text-slate-500 mt-1">Sistemin kullandığı iş kuralları ve dönüşüm mantığı</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-white/[0.06] pb-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px] ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/[0.1]'
            }`}
          >
            <span className={activeTab === tab.key ? 'text-blue-400' : 'text-slate-600'}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Kalem Tipleri Tab */}
      {activeTab === 'kalem' && (
        <div className="space-y-4">
          <SectionCard title="Kalem Tipi → Sipariş / Dağıtım Eşleştirmesi" desc="Her kalem tipi için otomatik olarak türetilen sipariş ve dağıtım değerleri">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left py-3 px-4 text-[11px] text-slate-500 uppercase font-semibold">Kalem Tipi</th>
                  <th className="text-left py-3 px-4 text-[11px] text-slate-500 uppercase font-semibold">Anlam</th>
                  <th className="text-left py-3 px-4 text-[11px] text-slate-500 uppercase font-semibold">Sipariş</th>
                  <th className="text-left py-3 px-4 text-[11px] text-slate-500 uppercase font-semibold">Dağıtım</th>
                </tr>
              </thead>
              <tbody>
                {rules.kalemTipleri?.map((kt: any, i: number) => (
                  <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-1 rounded-md text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/20">{kt.kod}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">{kt.anlam}</td>
                    <td className="py-2.5 px-4">
                      <SiparisLabel value={kt.siparis} />
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-xs font-medium ${kt.dagitim === 'EVET' ? 'text-emerald-400' : 'text-slate-600'}`}>{kt.dagitim}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>

          <SectionCard title="Sipariş Eşleme Tablosu (SIPARIS_MAP)" desc="Backend'deki doğrudan eşleme sözlüğü">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
              {Object.entries(rules.siparisMap || {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.04]">
                  <span className="text-xs font-bold text-blue-300 bg-blue-500/15 px-1.5 py-0.5 rounded">{k}</span>
                  <span className="text-slate-600">→</span>
                  <SiparisLabel value={v as string} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Level Kuralları Tab */}
      {activeTab === 'level' && (
        <div className="space-y-4">
          <SectionCard title="Level Bazlı Karar Kuralları" desc="Her hiyerarşi seviyesi için uygulanan sipariş/dağıtım/montaj kuralları">
            <div className="space-y-0">
              {rules.levelKurallari?.map((lk: any, i: number) => (
                <div key={i} className="flex items-start gap-4 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <span className="shrink-0 mt-0.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 min-w-[70px] text-center">
                    {lk.level}
                  </span>
                  <p className="text-sm text-slate-300">{lk.kural}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Montaj Atama Mantığı" desc={rules.montajKurali}>
            <div className="px-4 py-4">
              <div className="bg-[#0d1117] rounded-xl p-4 border border-white/[0.06] font-mono text-xs text-slate-400 space-y-1">
                <p><span className="text-slate-600">// Level 0-1:</span></p>
                <p className="pl-4">Montaj = <span className="text-amber-400">"NA"</span></p>
                <p className="mt-2"><span className="text-slate-600">// Level 2:</span></p>
                <p className="pl-4"><span className="text-blue-400">if</span> KalemTipi == <span className="text-amber-400">"F"</span> → Montaj = <span className="text-emerald-400">kendi title&apos;ı</span> <span className="text-slate-600">(yeni grup)</span></p>
                <p className="pl-4"><span className="text-blue-400">else</span> → Montaj = <span className="text-emerald-400">son Level 2 title</span></p>
                <p className="mt-2"><span className="text-slate-600">// Level 3+:</span></p>
                <p className="pl-4">Montaj = <span className="text-emerald-400">level2Title</span> <span className="text-slate-600">(üstteki Level 2 F&apos;in title&apos;ı)</span></p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Uzmanlık & Birim Tab */}
      {activeTab === 'uzmanlik' && (
        <div className="space-y-4">
          <SectionCard title="Uzmanlık Alanları" desc="Level 1 title'dan anahtar kelime eşleştirmesiyle türetilir">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
              {rules.uzmanliklar?.map((uz: string) => (
                <div key={uz} className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.04]">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-white">{uz}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Uzmanlık Anahtar Kelime Eşleştirmesi" desc="Level 1 title'ında bu kelimeler aranır (case-insensitive)">
            <div className="grid grid-cols-2 gap-2 p-4">
              {Object.entries(rules.uzmanlikKeywords || {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.04]">
                  <span className="text-xs font-mono text-slate-400">&quot;{k}&quot;</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-xs font-medium text-blue-300">{v as string}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Birim Seçenekleri" desc="Kullanılabilir ölçü birimleri">
            <div className="flex flex-wrap gap-2 p-4">
              {rules.birimler?.map((b: string) => (
                <span key={b} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{b}</span>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Tasarımcı Erişim Kontrolü" desc="Tasarımcı rolündeki kullanıcılar sadece kendi uzmanlık alanlarına ait kalemleri görebilir">
            <div className="px-4 py-4 space-y-3">
              <InfoRow label="Kural" value="Designer rolündeki kullanıcı sadece kendi uzmanlik alanına ait BOM kalemlerini görür" />
              <InfoRow label="Etkilenen API'ler" value="items, stats, nav — tümü uzmanlik bazında filtrelenir" />
              <InfoRow label="Admin / Engineer" value="Tüm veriyi görür, uzmanlik kısıtlaması yoktur" />
            </div>
          </SectionCard>
        </div>
      )}

      {/* Formüller Tab */}
      {activeTab === 'formul' && (
        <div className="space-y-4">
          <SectionCard title="Toplam Miktar Hesabı" desc={rules.toplamMiktarFormul}>
            <div className="px-4 py-4">
              <div className="bg-[#0d1117] rounded-xl p-4 border border-white/[0.06] font-mono text-xs text-slate-400 space-y-2">
                <p><span className="text-slate-600">// Koşul: Level ≥ 3 VE Sipariş ∈ {"{"}&quot;EVET&quot;, &quot;KONTROL EDİLECEK&quot;{"}"}</span></p>
                <p className="text-emerald-400">ToplamMiktar = Quantity × Parent₁.Qty × Parent₂.Qty × ... × ParentN.Qty</p>
                <p className="mt-3 text-slate-600">// Örnek:</p>
                <p>Level 2: &quot;ÖN TAMPON&quot; (qty=1)</p>
                <p className="pl-4">Level 3: &quot;BRAKET&quot; (qty=2)</p>
                <p className="pl-8">Level 4: &quot;CİVATA&quot; (qty=4) → ToplamMiktar = <span className="text-amber-400">4 × 2 × 1 = 8</span></p>
                <p className="pl-8">Level 4: &quot;SOMUN&quot; (qty=4) → ToplamMiktar = <span className="text-amber-400">4 × 2 × 1 = 8</span></p>
                <p className="pl-4">Level 3: &quot;KAPAK&quot; (qty=1)</p>
                <p className="pl-8">Level 4: &quot;PERÇİN&quot; (qty=12) → ToplamMiktar = <span className="text-amber-400">12 × 1 × 1 = 12</span></p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="MalzemeNo/SAP Karşılığı" desc={rules.malzemeNoSapFormul}>
            <div className="px-4 py-4">
              <div className="bg-[#0d1117] rounded-xl p-4 border border-white/[0.06] font-mono text-xs text-slate-400 space-y-1">
                <p><span className="text-blue-400">1.</span> AnaMalzeme varsa → <span className="text-emerald-400">AnaMalzeme + &quot;Y&quot;</span></p>
                <p><span className="text-blue-400">2.</span> Title &quot;_&quot; içeriyorsa VE SAP Usage = &quot;C5P&quot; → <span className="text-emerald-400">Title.split(&quot;_&quot;)[0] + &quot;Y&quot;</span></p>
                <p><span className="text-blue-400">3.</span> Varsayılan → <span className="text-emerald-400">(MalzemeNo || Title) + &quot;Y&quot;</span></p>
                <p className="mt-2 text-slate-600">// Not: Zaten &quot;Y&quot; ile bitiyorsa eklenmez</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* İş Akışı Tab */}
      {activeTab === 'akis' && (
        <div className="space-y-4">
          <SectionCard title="Veri Akış Süreci" desc="PLM BOM dosyasından SAP Master BOM'a dönüşüm adımları">
            <div className="px-4 py-4 space-y-3">
              {[
                { step: '1', title: 'Excel Yükleme', desc: 'PLM BOM dosyası sisteme yüklenir (31 sütunlu standart format)', color: 'bg-blue-500' },
                { step: '2', title: 'Rules Engine İşleme', desc: 'Her satır için kalemTipi, sipariş, dağıtım, uzmanlık, montaj otomatik türetilir', color: 'bg-purple-500' },
                { step: '3', title: 'Operatör İnceleme', desc: 'needsReview=true olan satırlar operatör tarafından incelenir ve çözülür', color: 'bg-amber-500' },
                { step: '4', title: 'Master BOM Export', desc: 'Tüm derived alanlar hesaplanmış Excel dosyası indirilir', color: 'bg-emerald-500' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-4 bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                  <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>{s.step}</div>
                  <div>
                    <p className="text-sm font-medium text-white">{s.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Rol Bazlı Erişim" desc="Kullanıcı rollerine göre izin matrisi">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left py-3 px-4 text-[11px] text-slate-500 uppercase font-semibold">Özellik</th>
                  <th className="text-center py-3 px-4 text-[11px] text-slate-500 uppercase font-semibold">Admin</th>
                  <th className="text-center py-3 px-4 text-[11px] text-slate-500 uppercase font-semibold">Ent. Mühendisi</th>
                  <th className="text-center py-3 px-4 text-[11px] text-slate-500 uppercase font-semibold">Tasarımcı</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['BOM Görüntüleme', true, true, 'Kendi uzmanlığı'],
                  ['BOM Düzenleme', true, true, false],
                  ['Görev Oluşturma', true, false, true],
                  ['Görev Atama', true, false, true],
                  ['Proje Silme', true, false, false],
                  ['Excel İndirme', true, true, true],
                  ['Kullanıcı Yönetimi', true, false, false],
                  ['Ayarlar Sayfası', true, false, false],
                ].map(([feature, admin, eng, des], i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="py-2.5 px-4 text-slate-300">{feature as string}</td>
                    <td className="py-2.5 px-4 text-center">{admin === true ? <span className="text-emerald-400">✓</span> : typeof admin === 'string' ? <span className="text-amber-400 text-xs">{admin}</span> : <span className="text-red-400/50">✗</span>}</td>
                    <td className="py-2.5 px-4 text-center">{eng === true ? <span className="text-emerald-400">✓</span> : typeof eng === 'string' ? <span className="text-amber-400 text-xs">{eng}</span> : <span className="text-red-400/50">✗</span>}</td>
                    <td className="py-2.5 px-4 text-center">{des === true ? <span className="text-emerald-400">✓</span> : typeof des === 'string' ? <span className="text-amber-400 text-xs">{des}</span> : <span className="text-red-400/50">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {desc && <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function SiparisLabel({ value }: { value: string }) {
  const colors: Record<string, string> = {
    EVET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    HAYIR: 'bg-red-500/10 text-red-400/70 border-red-500/20',
    MONTAJ: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    'KONTROL EDİLECEK': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'HAYIR*': 'bg-red-500/10 text-red-400/70 border-red-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[value] || 'bg-slate-700/50 text-slate-400 border-slate-600/30'}`}>{value}</span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-medium text-slate-500 shrink-0 w-32">{label}:</span>
      <span className="text-xs text-slate-300">{value}</span>
    </div>
  );
}
