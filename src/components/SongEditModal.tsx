import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import type { Song } from '@/types'
import { X, Save, Music, Loader2 } from 'lucide-react'

interface Props {
  song: Song
  open: boolean
  onClose: () => void
  onSaved: (updated: Song) => void
  onDeleted: () => void
}

export default function SongEditModal({ song, open, onClose, onSaved, onDeleted }: Props) {
  const [title, setTitle] = useState(song.title)
  const [artist, setArtist] = useState(song.artist)
  const [album, setAlbum] = useState(song.album || '')
  const [genre, setGenre] = useState(song.genre || '')
  const [lyrics, setLyrics] = useState(song.lyrics || '')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState(song.cover_url || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(song.title)
      setArtist(song.artist)
      setAlbum(song.album || '')
      setGenre(song.genre || '')
      setLyrics(song.lyrics || '')
      setCoverPreview(song.cover_url || '')
      setCoverFile(null)
    }
  }, [open, song])

  if (!open) return null

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      let coverUrl = song.cover_url || ''
      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        const path = `${song.user_id}/covers/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('covers').upload(path, coverFile, { upsert: true })
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
          coverUrl = publicUrl
        }
      }
      const { data, error } = await supabase.from('songs').update({
        title: title.trim(),
        artist: artist.trim() || song.artist,
        album: album.trim() || null,
        genre: genre.trim() || null,
        lyrics: lyrics.trim() || null,
        cover_url: coverUrl || null,
      }).eq('id', song.id).select().single()
      if (error) throw error
      if (data) onSaved(data as Song)
      onClose()
    } catch (e) {
      console.error('Save error:', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Bu şarkıyı kalıcı olarak silmek istediğine emin misin?')) return
    setDeleting(true)
    try {
      await supabase.from('songs').delete().eq('id', song.id)
      onDeleted()
      onClose()
    } catch (e) {
      console.error('Delete error:', e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Şarkıyı Düzenle</h2>
          <button onClick={onClose} className="text-surface-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <label className="relative w-24 h-24 rounded-2xl overflow-hidden cursor-pointer bg-surface-800 border-2 border-surface-700 hover:border-wave-400/50 transition-all flex-shrink-0 flex items-center justify-center group">
              {coverPreview ? (
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music size={24} className="text-surface-500 group-hover:text-surface-300 transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs text-white font-medium">Değiştir</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)) }
              }} />
            </label>
            <div className="flex-1 space-y-3">
              <Input placeholder="Şarkı adı" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Sanatçı" value={artist} onChange={(e) => setArtist(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Albüm" value={album} onChange={(e) => setAlbum(e.target.value)} />
            <Input placeholder="Tür" value={genre} onChange={(e) => setGenre(e.target.value)} />
          </div>

          <div>
            <textarea
              placeholder="Şarkı sözleri..."
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              rows={5}
              className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-surface-400 focus:outline-none focus:border-wave-400/50 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Kaydet
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : null}
              Sil
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}