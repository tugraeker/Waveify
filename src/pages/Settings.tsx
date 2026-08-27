import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import OfflineMode from '@/components/OfflineMode'
import { emitToast } from '@/hooks/useToast'
import { Save, LogOut, User, Lock, Palette, Loader2, Globe, Eye, Activity, PaintBucket, Trash2, Bell, Monitor, Moon, RotateCcw, Sliders, Download, Upload, Square, Sparkles, Waves, FolderOutput, Keyboard, Users } from 'lucide-react'
import type { AccentColor, CoverStyle } from '@/types'

const accentColors: { key: AccentColor; label: string; color: string }[] = [
  { key: 'wave', label: 'Mor', color: '#8b5cf6' },
]

export default function Settings() {
  const {
    user, theme, accentColor, setTheme, setUser, setAccentColor,
    seekStep, setSeekStep, normalize, setNormalize, smartShuffle, setSmartShuffle,
    coverStyle, setCoverStyle,
    crossfade, setCrossfade, crossfadeDuration, setCrossfadeDuration,
    hotkeys, setHotkeys, profileName, setProfileName, smartCache, setSmartCache,
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
  const [customAccentInput, setCustomAccentInput] = useState('')
  const [appVersion] = useState(__APP_VERSION__)
  const [capturingAction, setCapturingAction] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Record<string, Record<string, string>>>(() => {
    try { return JSON.parse(localStorage.getItem('waveify_profiles') || '{}') } catch { return {} }
  })
  const [newProfileName, setNewProfileName] = useState('')

  useEffect(() => {
    if (!capturingAction) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation()
      const next = { ...hotkeys, [capturingAction]: e.code }
      setHotkeys(next)
      setCapturingAction(null)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [capturingAction, hotkeys, setHotkeys])

  const HOTKEY_META = [
    { action: 'playpause', label: 'Oynat / Duraklat' },
    { action: 'next', label: 'Sonraki Şarkı' },
    { action: 'prev', label: 'Önceki Şarkı' },
    { action: 'volumeup', label: 'Sesi Aç' },
    { action: 'volumedown', label: 'Sesi Kıs' },
    { action: 'mute', label: 'Sessize Al' },
    { action: 'shuffle', label: 'Karıştır' },
    { action: 'repeat', label: 'Tekrarla' },
    { action: 'highlight', label: 'Highlight Modu' },
    { action: 'instrumental', label: 'Enstrümantal Mod' },
  ]
  const keyLabel = (code: string) => {
    const m: Record<string, string> = { Space: 'Boşluk', ArrowRight: '→', ArrowLeft: '←', ArrowUp: '↑', ArrowDown: '↓' }
    if (m[code]) return m[code]
    if (code.startsWith('Key')) return code.slice(3)
    if (code.startsWith('Digit')) return code.slice(5)
    return code
  }

  function saveProfileSnapshot(name: string) {
    const snap: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('waveify_')) snap[k] = localStorage.getItem(k) || ''
    }
    const next = { ...profiles, [name]: snap }
    setProfiles(next)
    localStorage.setItem('waveify_profiles', JSON.stringify(next))
    emitToast(`"${name}" profili kaydedildi`, 'success')
  }

  function applyProfile(name: string) {
    const snap = profiles[name]
    if (!snap) return
    Object.entries(snap).forEach(([k, v]) => localStorage.setItem(k, v))
    emitToast(`"${name}" profili uygulandı — yeniden başlatılıyor`, 'success')
    setTimeout(() => window.location.reload(), 1200)
  }

  function deleteProfile(name: string) {
    if (!confirm(`"${name}" profili silinsin mi?`)) return
    const next = { ...profiles }
    delete next[name]
    setProfiles(next)
    localStorage.setItem('waveify_profiles', JSON.stringify(next))
  }

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
                      onClick={() => setAccentColor(ac.key)}
                      className={`w-9 h-9 rounded-xl transition-all border-2 ${accentColor === ac.key ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: ac.color }}
                      title={ac.label}
                    />
                  ))}
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
            </div>
          </div>

          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><Keyboard size={18} className="text-amber-400" /></div>
              <h2 className="text-lg font-semibold">Kısayol Stüdyosu</h2>
            </div>
            <p className="text-xs text-surface-400 mb-3">Her aksiyon için yeni tuşu gösterip bas. Farklı tuşlar için harf, ok veya Boşluk kullan.</p>
            <div className="flex flex-col gap-1.5">
              {HOTKEY_META.map(({ action, label }) => {
                const currentCode = Object.entries(hotkeys).find(([, a]) => a === action)?.[0]
                const capturing = capturingAction === action
                return (
                  <div key={action} className="flex items-center justify-between gap-3 bg-surface-800/50 border border-surface-700/50 rounded-xl px-3 py-2">
                    <span className="text-sm text-surface-300">{label}</span>
                    <button
                      onClick={() => setCapturingAction(capturing ? null : action)}
                      className={`min-w-[90px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${capturing ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse' : currentCode ? 'bg-wave-500/10 border-wave-500/25 text-wave-400' : 'bg-surface-800 border-surface-600 text-surface-500'}`}
                    >
                      {capturing ? 'Bas…' : currentCode ? keyLabel(currentCode) : '—'}
                    </button>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => setHotkeys({ Space: 'playpause', ArrowRight: 'next', ArrowLeft: 'prev', ArrowUp: 'volumeup', ArrowDown: 'volumedown', KeyM: 'mute', KeyN: 'shuffle', KeyR: 'repeat', KeyH: 'highlight', KeyI: 'instrumental' })}
              className="mt-3 text-xs text-surface-500 hover:text-white transition-colors"
            >
              Varsayılanlara dön
            </button>
          </div>

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
