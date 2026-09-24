import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '../../../core/supabaseClient'
import { Button, Input } from '@/components/ui'
import OfflineMode from '@/components/OfflineMode'
import ProfileTab from './ProfileTab';
import SecurityTab from './SecurityTab';
import AppearanceTab from './AppearanceTab';
import PlaybackTab from './PlaybackTab';
import HotkeysTab from './HotkeysTab';
import DataTab from './DataTab';
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
          <ProfileTab
            username={username}
            setUsername={setUsername}
            bio={bio}
            setBio={setBio}
            saving={saving}
            saveProfile={saveProfile}
          />

          <SecurityTab
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            savingPassword={savingPassword}
            changePassword={changePassword}
          />

          <AppearanceTab
            theme={theme}
            setTheme={setTheme}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            bgColor={bgColor}
            setBgColor={setBgColor}
          />

          <PlaybackTab
            seekStep={seekStep}
            setSeekStep={setSeekStep}
            coverStyle={coverStyle}
            setCoverStyle={setCoverStyle}
            normalize={normalize}
            setNormalize={setNormalize}
            smartShuffle={smartShuffle}
            setSmartShuffle={setSmartShuffle}
            crossfade={crossfade}
            setCrossfade={setCrossfade}
            crossfadeDuration={crossfadeDuration}
            setCrossfadeDuration={setCrossfadeDuration}
          />

          <HotkeysTab />

          <DataTab resetProfile={resetProfile} handleLogout={handleLogout} />
        </div>
      </div>
    </div>
  )
}
