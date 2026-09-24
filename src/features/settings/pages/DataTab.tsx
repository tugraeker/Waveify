import { useState } from 'react';
import { useStore } from '@/store/store';
import { Button, Input } from '@/components/ui';
import OfflineMode from '@/components/OfflineMode';
import { emitToast } from '@/hooks/useToast';
import { Users, FolderOutput, Download, Upload, Sparkles, Trash2, RotateCcw, LogOut, Save } from 'lucide-react';

export default function DataTab(p: any) {
  const { resetProfile, handleLogout } = p;
  const { profileName, setProfileName, smartCache, setSmartCache } = useStore();
  const [profiles, setProfiles] = useState<Record<string, Record<string, string>>>(() => {
    try { return JSON.parse(localStorage.getItem('waveify_profiles') || '{}') } catch { return {} }
  });
  const [newProfileName, setNewProfileName] = useState('');
  function saveProfileSnapshot(name: string) {
    const snap: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('waveify_')) snap[k] = localStorage.getItem(k) || '';
    }
    const next = { ...profiles, [name]: snap };
    setProfiles(next);
    localStorage.setItem('waveify_profiles', JSON.stringify(next));
    emitToast('"' + name + '" profili kaydedildi', 'success');
  }

  function applyProfile(name: string) {
    const snap = profiles[name];
    if (!snap) return;
    Object.entries(snap).forEach(([k, v]) => localStorage.setItem(k, v));
    emitToast('"' + name + '" profili uygulandı — yeniden başlatılıyor', 'success');
    setTimeout(() => window.location.reload(), 1200);
  }

  function deleteProfile(name: string) {
    if (!confirm('"' + name + '" profili silinsin mi?')) return;
    const next = { ...profiles };
    delete next[name];
    setProfiles(next);
    localStorage.setItem('waveify_profiles', JSON.stringify(next));
  }

  function exportBackup() {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('waveify_')) data[k] = localStorage.getItem(k) || '';
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'waveify-yedek-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    emitToast('Yedek indirildi', 'success');
  }

  function importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          let n = 0;
          for (const [k, v] of Object.entries(data)) {
            if (k.startsWith('waveify_') && typeof v === 'string') {
              localStorage.setItem(k, v);
              n++;
            }
          }
          emitToast('✅ ' + n + ' ayar geri yüklendi — yeniden başlatılıyor', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } catch {
          emitToast('Hatalı yedek dosyası', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
  return (
    <>
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center"><Users size={18} className="text-cyan-400" /></div>
              <h2 className="text-lg font-semibold">Çoklu Profil</h2>
            </div>
            <p className="text-xs text-surface-400 mb-3">Her profil tüm yerel ayarlarının anlık görüntüsüdür — aile üyeleri için ideal.</p>
            <div className="flex gap-2 mb-3">
              <Input value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="Profil adı (örn. Anne, Baba…)" />
              <Button variant="outline" onClick={() => { if (!newProfileName.trim()) return; saveProfileSnapshot(newProfileName.trim()); setNewProfileName('') }}>
                <Save size={14} /> Kaydet
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              {Object.keys(profiles).length === 0 ? (
                <p className="text-xs text-surface-500 italic">Henüz kayıtlı profil yok. Mevcut ayarlarını bir isimle kaydet.</p>
              ) : Object.keys(profiles).map((name) => (
                <div key={name} className="flex items-center justify-between gap-2 bg-surface-800/50 border border-surface-700/50 rounded-xl px-3 py-2">
                  <span className={`text-sm ${profileName === name ? 'text-cyan-300 font-semibold' : 'text-surface-300'}`}>{name} {profileName === name && '✓'}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setProfileName(name); applyProfile(name) }} className="px-2.5 py-1 rounded-lg text-[11px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20">Uygula</button>
                    <button onClick={() => { setProfileName(name); saveProfileSnapshot(name) }} className="px-2.5 py-1 rounded-lg text-[11px] bg-surface-800 border border-surface-600 text-surface-400 hover:text-white">Güncelle</button>
                    <button onClick={() => deleteProfile(name)} className="px-2.5 py-1 rounded-lg text-[11px] bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20">Sil</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-800">
              <span className="text-sm text-surface-300">Akıllı Önbellek <span className="text-[10px] text-surface-500">(çalan + sıradaki şarkı otomatik iner)</span></span>
              <button onClick={() => setSmartCache(!smartCache)} className={`w-11 h-6 rounded-full transition-all ${smartCache ? 'bg-emerald-500' : 'bg-surface-700'} relative`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${smartCache ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><FolderOutput size={18} className="text-emerald-400" /></div>
              <h2 className="text-lg font-semibold">Yedekle & Geri Yükle</h2>
            </div>
            <p className="text-xs text-surface-400 mb-3">Tüm yerel ayarlarını JSON dosyası olarak yedekler / geri yükler.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportBackup}><Download size={14} /> Yedekle</Button>
              <Button variant="outline" onClick={importBackup}><Upload size={14} /> Geri Yükle</Button>
            </div>
          </div>
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 flex items-center justify-center"><Sparkles size={18} className="text-fuchsia-400" /></div>
              <h2 className="text-lg font-semibold">Versiyon Merkezi</h2>
            </div>
            <p className="text-xs text-surface-400 mb-3">Waveify v{__APP_VERSION__} — Aurora Yeniden Doğuş</p>
            <ul className="text-xs text-surface-300 space-y-1.5">
              {[
                '✦ Kökten yeniden tasarım: cam paneller + aurora sahne sistemi',
                '✦ Konser modu, plak/kaset/CD arşiv, 8D ses, oda sahneleri',
                '✦ Zombi modu, yıl tahmini, beat maker ve perde düellosu',
                '✦ Gizemli sıra, şarkı serenadı, combo patlama, canlı ısı sayacı',
                '✦ Troll uyarı sistemi: arkadaşlarına koca ekran sürprizi',
              ].map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
          <OfflineMode />
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center"><Trash2 size={18} className="text-surface-400" /></div>
              <h2 className="text-lg font-semibold">Önbellek</h2>
            </div>
            <p className="text-xs text-surface-400 mb-3">Uygulama verilerini temizle</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { localStorage.removeItem('waveify_stats'); localStorage.removeItem('waveify_xp'); window.location.reload() }}>
                <Trash2 size={14} /> İstatistikleri Sıfırla
              </Button>
              <Button variant="ghost" onClick={() => { if (confirm('Tüm önbellek temizlensin mi?')) { localStorage.clear(); window.location.reload() } }}>
                <Trash2 size={14} /> Tümünü Temizle
              </Button>
            </div>
          </div>
          <div className="bg-surface-900/60 border border-red-500/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center"><RotateCcw size={18} className="text-red-400" /></div>
              <h2 className="text-lg font-semibold">Profili Sıfırla</h2>
            </div>
            <p className="text-xs text-surface-400 mb-3">Avatar, banner, biyografi ve tüm görünüm ayarlarını sıfırlar.</p>
            <Button variant="danger" onClick={resetProfile}><RotateCcw size={14} /> Profili Sıfırla</Button>
          </div>
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-4 text-center">
            <p className="text-xs text-surface-500">Waveify v{__APP_VERSION__}</p>
            <p className="text-[10px] text-surface-600 mt-0.5">© 2026 Tugra Eker</p>
          </div>
          <div className="bg-surface-900/60 border border-red-500/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center"><LogOut size={18} className="text-red-400" /></div>
              <h2 className="text-lg font-semibold">Oturum</h2>
            </div>
            <Button variant="danger" onClick={handleLogout}><LogOut size={14} /> Çıkış Yap</Button>
          </div>
    </>
  );
}
