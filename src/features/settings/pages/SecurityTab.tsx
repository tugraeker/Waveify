import { Button, Input } from '@/components/ui';
import { Lock, Loader2, Save } from 'lucide-react';

export default function SecurityTab(p: any) {
  const { newPassword, setNewPassword, savingPassword, changePassword } = p;
  return (
    <>
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-wave-500/10 flex items-center justify-center"><Lock size={18} className="text-wave-400" /></div>
              <h2 className="text-lg font-semibold">Şifre Değiştir</h2>
            </div>
            <div className="space-y-4">
              <Input type="password" placeholder="Yeni şifre (en az 6 karakter)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Button variant="primary" onClick={changePassword} disabled={savingPassword || newPassword.length < 6}>
                {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Şifreyi Güncelle
              </Button>
            </div>
          </div>
    </>
  );
}
