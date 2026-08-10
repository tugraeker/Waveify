import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import OfflineMode from '@/components/OfflineMode'
import { emitToast } from '@/hooks/useToast'
import { Save, LogOut, User, Lock, Palette, Loader2, Globe, Eye, Activity, PaintBucket, Trash2, Bell, Monitor, Moon, RotateCcw, Sliders, Download, Upload, Square, Sparkles, Waves, FolderOutput } from 'lucide-react'
import type { AccentColor, CoverStyle } from '@/types'

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
  const {
    user, theme, accentColor, customAccentColor, setTheme, setAccentColor, setCustomAccentColor, setUser,
    seekStep, setSeekStep, normalize, setNormalize, smartShuffle, setSmartShuffle,
    coverStyle, setCoverStyle, retroMode, setRetroMode, lowLightMode, setLowLightMode,
    crossfade, setCrossfade, crossfadeDuration, setCrossfadeDuration,
  } = useStore()
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

  const coverStyles: { key: CoverStyle; label: string }[] = [
    { key: 'vinyl', label: '💿 Plak' },
    { key: 'cd', label: '💽 CD' },
    { key: 'cassette', label: '📼 Kaset' },
    { key: 'polaroid', label: '📷 Polaroid' },
  ]

  function exportBackup() {
    const data: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('waveify_')) data[k] = localStorage.getItem(k) || ''
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `waveify-yedek-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    emitToast('Yedek indirildi', 'success')
  }

  function importBackup() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result))
          let n = 0
          for (const [k, v] of Object.entries(data)) {
            if (k.startsWith('waveify_') && typeof v === 'string') {
              localStorage.setItem(k, v)
              n++
            }
          }
          emitToast(`✅ ${n} ayar geri yüklendi — yeniden başlatılıyor`, 'success')
          setTimeout(() => window.location.reload(), 1500)
        } catch {
          emitToast('Hatalı yedek dosyası', 'error')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

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
      try { await supabase.from('users').update({ avatar_url: null, bio: null }).eq('id', user.id) } catch {}
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
        <h1 className="text-2xl font-display font-bold mb-8">Ayarlar</h1>

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

          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-wave-500/10 flex items-center justify-center"><Sliders size={18} className="text-wave-400" /></div>
              <h2 className="text-lg font-semibold">Oynatma & Sahneler</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">İleri/Geri Zıplama Adımı</label>
                <div className="flex items-center gap-2">
                  {[5, 10, 15, 30].map((s) => (
                    <button key={s} onClick={() => setSeekStep(s)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${seekStep === s ? 'bg-wave-500/10 text-wave-400 border-wave-500/20' : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'}`}>{s}sn</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">Kapak Tarzı</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {coverStyles.map((c) => (
                    <button key={c.key} onClick={() => setCoverStyle(c.key)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${coverStyle === c.key ? 'bg-wave-500/10 text-wave-400 border-wave-500/20' : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'}`}>{c.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-300">Ses Normalleştirme</span>
                <button onClick={() => setNormalize(!normalize)} className={`w-11 h-6 rounded-full transition-all ${normalize ? 'bg-wave-500' : 'bg-surface-700'} relative`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${normalize ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-300">Akıllı Karıştırma <span className="text-[10px] text-surface-500">(aynı sanatçıya takılmaz)</span></span>
                <button onClick={() => setSmartShuffle(!smartShuffle)} className={`w-11 h-6 rounded-full transition-all ${smartShuffle ? 'bg-wave-500' : 'bg-surface-700'} relative`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${smartShuffle ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">Geçiş (Crossfade)</label>
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => setCrossfade(!crossfade)} className={`w-11 h-6 rounded-full transition-all ${crossfade ? 'bg-wave-500' : 'bg-surface-700'} relative flex-shrink-0`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${crossfade ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                  <input
                    type="range" min={0} max={8} step={1} value={crossfadeDuration}
                    onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                    disabled={!crossfade}
                    className="flex-1 accent-wave-400 disabled:opacity-30"
                  />
                  <span className="text-xs text-wave-400 font-mono tabular-nums w-10 text-right">{crossfadeDuration}sn</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-300">Retro 2006 Modu <span className="text-[10px] text-surface-500">(eski okul hissi)</span></span>
                <button onClick={() => setRetroMode(!retroMode)} className={`w-11 h-6 rounded-full transition-all ${retroMode ? 'bg-amber-500' : 'bg-surface-700'} relative`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${retroMode ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-300">Düşük Işık <span className="text-[10px] text-surface-500">(göz dostu gece)</span></span>
                <button onClick={() => setLowLightMode(!lowLightMode)} className={`w-11 h-6 rounded-full transition-all ${lowLightMode ? 'bg-indigo-500' : 'bg-surface-700'} relative`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${lowLightMode ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
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
            <p className="text-xs text-surface-400 mb-3">Waveify v{appVersion} — Aurora Yeniden Doğuş</p>
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
