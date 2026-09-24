import { Button, Input } from '@/components/ui';
import { User, Loader2, Save } from 'lucide-react';

export default function ProfileTab(p: any) {
  const { username, setUsername, bio, setBio, saving, saveProfile } = p;
  return (
    <>
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-wave-500/10 flex items-center justify-center"><User size={18} className="text-wave-400" /></div>
              <h2 className="text-lg font-semibold">Profil</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-surface-400 font-medium mb-1.5 block">Kullanıcı Adı</label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-surface-400 font-medium mb-1.5 block">Hakkımda</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Kendinden bahset..."
                  rows={3}
                  className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-surface-400 focus:outline-none focus:border-wave-400/50 resize-none"
                />
              </div>
              <Button variant="primary" onClick={saveProfile} disabled={saving || !username.trim()}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Kaydet
              </Button>
            </div>
          </div>
    </>
  );
}
