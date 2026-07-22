import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import type { Song } from '@/types'
import { Check, Music2, Search, X } from 'lucide-react'

export default function CreatePlaylist() {
  const navigate = useNavigate()
  const { user, playlists, setPlaylists } = useStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set())
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('songs').select('*').limit(100).then(({ data }) => {
      if (data) setAllSongs(data)
    })
  }, [])

  const toggleSong = (id: string) => {
    setSelectedSongs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    if (!user || !name.trim() || selectedSongs.size === 0) return
    setSaving(true)

    const { data: playlist } = await supabase
      .from('playlists')
      .insert({ user_id: user.id, name: name.trim(), description, type: 'custom' })
      .select()
      .single()

    if (playlist) {
      const songsArr = Array.from(selectedSongs)
      await supabase.from('playlist_songs').insert(
        songsArr.map((songId, i) => ({
          playlist_id: playlist.id,
          song_id: songId,
          position: i,
        }))
      )
      setPlaylists([...playlists, { ...playlist, type: 'custom' }])
      navigate('/playlist')
    }
    setSaving(false)
  }

  const filtered = search
    ? allSongs.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.artist.toLowerCase().includes(search.toLowerCase())
      )
    : allSongs

  return (
    <div className="p-6 overflow-y-auto h-full scrollbar-thin">
      <h1 className="text-2xl font-bold mb-6">Yeni Çalma Listesi</h1>

      <div className="max-w-lg space-y-4 mb-6">
        <Input
          placeholder="Liste adı..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Açıklama (opsiyonel)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-spotify-gray" />
          <Input
            placeholder="Şarkı ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-spotify-lightgray">{selectedSongs.size} şarkı seçildi</span>
        <Button
          variant="primary"
          onClick={save}
          disabled={!name.trim() || selectedSongs.size === 0 || saving}
        >
          {saving ? 'Kaydediliyor...' : 'Listeyi Oluştur'}
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        {filtered.map((song) => (
          <div
            key={song.id}
            onClick={() => toggleSong(song.id)}
            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
              selectedSongs.has(song.id)
                ? 'bg-spotify-green/10 border border-spotify-green/30'
                : 'hover:bg-spotify-lightdark/60'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              selectedSongs.has(song.id)
                ? 'bg-spotify-green border-spotify-green'
                : 'border-spotify-gray'
            }`}>
              {selectedSongs.has(song.id) && <Check size={12} className="text-black" />}
            </div>
            {song.cover_url ? (
              <img src={song.cover_url} alt="" className="w-9 h-9 rounded object-cover" />
            ) : (
              <div className="w-9 h-9 rounded bg-spotify-lightdark flex items-center justify-center">
                <Music2 size={14} className="text-spotify-gray" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{song.title}</p>
              <p className="text-xs text-spotify-lightgray truncate">{song.artist}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
