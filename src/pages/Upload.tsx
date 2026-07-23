import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { Upload, Music, Check, AlertCircle, AudioWaveform, Users, Search, X } from 'lucide-react'

type AppUser = { id: string; username: string; avatar_url?: string; email?: string }

export default function UploadPage() {
  const [title, setTitle] = useState('')
  const [artistField, setArtistField] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState('')
  const [allUsers, setAllUsers] = useState<AppUser[]>([])
  const [selectedUsers, setSelectedUsers] = useState<AppUser[]>([])
  const [showUserPicker, setShowUserPicker] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useStore()

  useEffect(() => {
    if (!user) return
    supabase.from('users').select('id, username, avatar_url, email').order('username', { ascending: true }).then(({ data }) => {
      if (data) setAllUsers(data)
    })
  }, [user])

  const resetForm = () => {
    setTitle(''); setArtistField(''); setAudioFile(null); setCoverFile(null)
    setCoverPreview(''); setUploaded(false); setError(''); setSelectedUsers([])
  }

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration))
        URL.revokeObjectURL(audio.src)
      }
      audio.src = URL.createObjectURL(file)
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('audio/')) setAudioFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file?.type.startsWith('audio/')) setAudioFile(file)
  }

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)) }
  }

  function toggleUser(u: AppUser) {
    setSelectedUsers((prev) => prev.some((s) => s.id === u.id) ? prev.filter((s) => s.id !== u.id) : [...prev, u])
  }

  function removeUser(id: string) {
    setSelectedUsers((prev) => prev.filter((s) => s.id !== id))
  }

  async function handleUpload() {
    if (!audioFile || !user) return
    setUploading(true); setError('')

    try {
      const duration = await getAudioDuration(audioFile)
      const audioPath = `${user.id}/${Date.now()}_${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const { error: uploadErr } = await supabase.storage.from('songs').upload(audioPath, audioFile, {
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadErr) throw new Error(`Dosya yükleme hatası: ${uploadErr.message}`)

      const { data: { publicUrl: audioUrl } } = supabase.storage.from('songs').getPublicUrl(audioPath)

      let coverUrl = ''
      if (coverFile) {
        const coverPath = `${user.id}/covers/${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, coverFile)
        if (!coverErr) {
          const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath)
          coverUrl = publicUrl
        }
      }

      // Artist string from selected users + manual input
      const artistNames = [...new Set([
        ...selectedUsers.map((u) => u.username),
        ...artistField.split(',').map((s) => s.trim()).filter(Boolean),
      ])].join(', ')

      const { data: song, error: dbError } = await supabase.from('songs').insert({
        user_id: user.id,
        title: title || audioFile.name.replace(/\.[^/.]+$/, ''),
        artist: artistNames || user.username,
        duration,
        audio_url: audioUrl,
        cover_url: coverUrl,
      }).select().single()
      if (dbError) throw new Error(`Veritabanı hatası: ${dbError.message}`)

      // Insert song_artists for selected users
      if (song && selectedUsers.length > 0) {
        const { error: artError } = await supabase.from('song_artists').insert(
          selectedUsers.map((u) => ({ song_id: song.id, user_id: u.id }))
        )
        if (artError && artError.code !== '42501') {
          console.warn('song_artists insert warning:', artError.message)
        }
      }

      setUploaded(true)
      setTimeout(resetForm, 2500)
    } catch (err: any) {
      setError(err.message || 'Bilinmeyen hata')
    } finally {
      setUploading(false)
    }
  }

  const displayedUsers = allUsers.filter(
    (u) => !userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wave-500 to-wave-400 flex items-center justify-center shadow-lg shadow-wave-500/20">
            <AudioWaveform size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Şarkı Yükle</h1>
            <p className="text-sm text-surface-400">MP3 dosyanı sürükle veya seç</p>
          </div>
        </div>

        <div className="space-y-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${
              dragOver ? 'border-wave-400 bg-wave-500/10 scale-[1.02]' : 'border-surface-700 hover:border-surface-500 bg-surface-900/30'
            } ${audioFile ? 'border-wave-400/50 bg-wave-500/5' : ''}`}
          >
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} hidden />
            {audioFile ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-wave-500/20 flex items-center justify-center">
                  <Check size={28} className="text-wave-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{audioFile.name}</p>
                  <p className="text-xs text-surface-500 mt-1">{(audioFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center">
                  <Upload size={28} className="text-surface-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-300 font-medium">MP3 dosyanı buraya sürükle</p>
                  <p className="text-xs text-surface-500 mt-1">veya tıkla &amp; seç</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start gap-5">
            <div
              onClick={() => document.getElementById('coverInput')?.click()}
              className="w-28 h-28 rounded-2xl overflow-hidden cursor-pointer bg-surface-900 border-2 border-surface-700 hover:border-wave-400/50 transition-all flex-shrink-0 flex items-center justify-center group"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-surface-500 group-hover:text-surface-300 transition-colors">
                  <Music size={20} />
                  <span className="text-[10px]">Kapak</span>
                </div>
              )}
            </div>
            <input id="coverInput" type="file" accept="image/*" onChange={handleCoverSelect} hidden />
            <div className="flex-1 space-y-3">
              <Input placeholder="Şarkı adı" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Sanatçı (elle yaz veya aşağıdan seç)" value={artistField} onChange={(e) => setArtistField(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs text-surface-400 font-medium mb-2 block">Bu kullanıcılar adına yükle (birden çok seç)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedUsers.length === 0 && <span className="text-xs text-surface-500 py-1">Hiçbiri seçilmedi (sadece sen görüneceksin)</span>}
              {selectedUsers.map((u) => (
                <span key={u.id} className="flex items-center gap-1.5 bg-wave-500/10 text-wave-400 border border-wave-500/20 rounded-full px-2.5 py-1 text-xs font-medium">
                  {u.username}
                  <button onClick={() => removeUser(u.id)} className="hover:text-white transition-colors"><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserPicker(!showUserPicker)}
                className="w-full flex items-center gap-2 bg-surface-900 border border-surface-700 hover:border-surface-500 rounded-xl px-4 py-2.5 text-left text-sm text-surface-400 hover:text-white transition-all"
              >
                <Users size={16} />
                {selectedUsers.length > 0 ? `${selectedUsers.length} kullanıcı seçili` : 'Kullanıcı seç...'}
              </button>
              {showUserPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-900 border border-surface-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                  <div className="p-2 border-b border-surface-800">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                      <input
                        placeholder="Kullanıcı ara..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full bg-surface-800 border border-surface-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-surface-500 outline-none focus:border-wave-500/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto scrollbar-thin">
                    {displayedUsers.map((u) => {
                      const isSelected = selectedUsers.some((s) => s.id === u.id)
                      return (
                        <button
                          key={u.id}
                          onClick={() => toggleUser(u)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-800/60 transition-colors ${isSelected ? 'bg-wave-500/5' : ''}`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-wave-500 border-wave-500' : 'border-surface-600'}`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <div className="w-7 h-7 rounded-lg bg-surface-800 flex items-center justify-center text-xs font-bold text-surface-400 flex-shrink-0">
                            {u.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{u.username}</p>
                            <p className="text-xs text-surface-500 truncate">{u.email || ''}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/10 rounded-xl p-4 text-sm text-red-400">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full h-12"
            onClick={handleUpload}
            disabled={!audioFile || uploading}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Yükleniyor...
              </span>
            ) : uploaded ? (
              <span className="flex items-center gap-2"><Check size={18} /> Yüklendi!</span>
            ) : (
              'Şarkıyı Yükle'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
