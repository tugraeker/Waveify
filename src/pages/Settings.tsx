import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import OfflineMode from '@/components/OfflineMode'
import { Save, LogOut, User, Lock, Palette, Loader2, Globe, Eye, Activity, PaintBucket, Trash2, Bell, Monitor, Moon, RotateCcw } from 'lucide-react'
import type { AccentColor } from '@/types'

const accentColors: { key: AccentColor; label: string; color: string }[] = [
  { key: 'wave', label: 'Turkuaz', color: '#14b8a6' },
  { key: 'purple', label: 'Mor', color: '#a855f7' },
  { key: 'green', label: 'Yeşil', color: '#22c55e' },
  { key: 'blue', label: 'Mavi', color: '#3b82f6' },
  { key: 'warm', label: 'Sıcak', color: '#f97316' },
  { key: 'pink', label: 'Pembe', color: '#ec4899' },
  { key: 'classic', label: 'Klasik', color: '#6366f1' },
]

export default function Settings() {
  const { user, theme, accentColor, customAccentColor, setTheme, setAccentColor, setCustomAccentColor, setUser } = useStore()
  const navigate = useNavigate()
  const [username, setUsername] = useState(user?.username || '')
  const [bio, setBio] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [bgColor, setBgColor] = useState(localStorage.getItem('waveify_bg_color') || '')
  const [customAccentInput, setCustomAccentInput] = useState(customAccentColor || '')
  const [appVersion] = useState(__APP_VERSION__)

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    setMessage('')
    try {
      const { error: err } = await supabase.from('users').update({
        username: username.trim(),
        bio: bio.trim() || null,
      }).eq('id', user.id)
      if (err) throw err
      setUser({ ...user, username: username.trim() })
      setMessage('Profil güncellendi')
    } catch (e: any) {
      setError(e.message || 'Hata')
    } finally {
      setSaving(false)
      setTimeout(() => { setMessage(''); setError('') }, 3000)
    }
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 6) { setError('Şifre en az 6 karakter olmalı'); return }
    setSavingPassword(true)
    setMessage('')
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword })
      if (err) throw err
      setMessage('Şifre değiştirildi')
      setCurrentPassword('')
      setNewPassword('')
    } catch (e: any) {
      setError(e.message || 'Hata')
    } finally {
      setSavingPassword(false)
      setTimeout(() => { setMessage(''); setError('') }, 3000)
    }
  }

  async function resetProfile() {
    if (!user) return
    if (!confirm('Profil tamamen sıfırlansın mı? Avatar, banner, biyografi ve tüm görünüm ayarları silinecek.')) return
    setSaving(true)
    try {
      await supabase.from('users').update({ avatar_url: null, banner_url: null, bio: null, accent_color: null }).eq('id', user.id)
      localStorage.removeItem('waveify_accent')
      localStorage.removeItem('waveify_custom_accent')
      localStorage.removeItem('waveify_bg_color')
      localStorage.removeItem('waveify_profile_theme')
      localStorage.removeItem('waveify_profile_font')
      localStorage.removeItem('waveify_profile_layout')
      localStorage.removeItem('waveify_profile_bg')
      localStorage.removeItem('waveify_avatar_frame')
      localStorage.removeItem('waveify_profile_view')
      localStorage.removeItem('waveify_profile_density')
      localStorage.removeItem('waveify_profile_show_stats')
      localStorage.removeItem('waveify_show_badge_names')
      setMessage('Profil sıfırlandı')
      setUser({ ...user, avatar_url: undefined, banner_url: undefined, bio: undefined })
      setTimeout(() => window.location.reload(), 1500)
    } catch (e: any) {
      setError(e.message || 'Hata')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/auth')
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Ayarlar</h1>

        {message && <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-sm text-green-400">{message}</div>}
        {error && <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">{error}</div>}

        <div className="space-y-6">
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

          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-wave-500/10 flex items-center justify-center"><Palette size={18} className="text-wave-400" /></div>
              <h2 className="text-lg font-semibold">Görünüm</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">Tema</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${theme === 'dark' ? 'bg-wave-500/10 text-wave-400 border-wave-500/20' : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'}`}>Karanlık</button>
                  <button onClick={() => setTheme('light')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${theme === 'light' ? 'bg-wave-500/10 text-wave-400 border-wave-500/20' : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'}`}>Aydınlık</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">Renk Teması</label>
                <div className="flex flex-wrap gap-2">
                  {accentColors.map((ac) => (
                    <button
                      key={ac.key}
                      onClick={() => { setAccentColor(ac.key); setCustomAccentInput('') }}
                      className={`w-9 h-9 rounded-xl transition-all border-2 ${accentColor === ac.key && !customAccentColor ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: ac.color }}
                      title={ac.label}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-xs text-surface-400">Özel renk (hex):</label>
                  <input
                    type="color"
                    value={customAccentInput || '#22c7c0'}
                    onChange={(e) => { setCustomAccentInput(e.target.value); setCustomAccentColor(e.target.value); setAccentColor('wave') }}
                    className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-surface-700"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">Arkaplan Rengi</label>
                <input
                  type="color"
                  value={bgColor || (theme === 'dark' ? '#020617' : '#ffffff')}
                  onChange={(e) => { setBgColor(e.target.value); localStorage.setItem('waveify_bg_color', e.target.value); document.documentElement.style.setProperty('--custom-bg', e.target.value) }}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-surface-700"
                />
                {bgColor && (
                  <button onClick={() => { setBgColor(''); localStorage.removeItem('waveify_bg_color'); document.documentElement.style.removeProperty('--custom-bg') }} className="ml-2 text-xs text-surface-500 hover:text-white">
                    Sıfırla
                  </button>
                )}
              </div>
            </div>
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

          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center"><Monitor size={18} className="text-surface-400" /></div>
              <h2 className="text-lg font-semibold">Görünüm</h2>
            </div>
            <div className="flex gap-3 mb-3">
              <button onClick={() => setTheme('dark')} className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${theme === 'dark' ? 'bg-wave-500/10 border-wave-500/20 text-wave-400' : 'bg-surface-800/50 border-surface-700 text-surface-400'}`}>
                <Moon size={16} className="inline mr-1.5" />Karanlık
              </button>
              <button onClick={() => setTheme('light')} className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${theme === 'light' ? 'bg-wave-500/10 border-wave-500/20 text-wave-400' : 'bg-surface-800/50 border-surface-700 text-surface-400'}`}>
                Aydınlık
              </button>
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
            <p className="text-xs text-surface-500">Waveify v{appVersion}</p>
            <p className="text-[10px] text-surface-600 mt-0.5">© 2026 Tugra Eker</p>
          </div>

          <div className="bg-surface-900/60 border border-red-500/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center"><LogOut size={18} className="text-red-400" /></div>
              <h2 className="text-lg font-semibold">Oturum</h2>
            </div>
            <Button variant="danger" onClick={handleLogout}><LogOut size={14} /> Çıkış Yap</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
