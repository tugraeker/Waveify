import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { emitToast } from '@/hooks/useToast'
import type { Song } from '@/types'
import { ListPlus, X, Check, Music } from 'lucide-react'

interface Props {
  song: Song
  onClose: () => void
}

export default function AddToPlaylistModal({ song, onClose }: Props) {
  const { user, playlists } = useStore()
  const [adding, setAdding] = useState<string | null>(null)

  const customPlaylists = playlists.filter((p) => p.type === 'custom')

  async function addToPlaylist(playlistId: string) {
    setAdding(playlistId)
    // Get max position
    const { data: posData } = await supabase.from('playlist_songs').select('position').eq('playlist_id', playlistId).order('position', { ascending: false }).limit(1)
    const position = (posData && posData.length > 0) ? posData[0].position + 1 : 0
    const { error } = await supabase.from('playlist_songs').insert({ playlist_id: playlistId, song_id: song.id, position })
    if (error) {
      if (error.code === '23505') emitToast('Zaten listede', 'info')
      else emitToast('Hata: ' + error.message, 'error')
    } else {
      emitToast('Listeye eklendi', 'success')
    }
    setAdding(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-sm animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center overflow-hidden">
              {song.cover_url ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" /> : <Music size={16} className="text-surface-500" />}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{song.title}</p>
              <p className="text-xs text-surface-400">{song.artist}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-surface-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-3">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-2 mb-2">Listeye Ekle</p>
          {customPlaylists.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">Henüz listen yok</p>
          ) : (
            <div className="flex flex-col gap-1">
              {customPlaylists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => addToPlaylist(pl.id)}
                  disabled={adding === pl.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
                    <ListPlus size={14} className="text-surface-400" />
                  </div>
                  <span className="text-sm text-surface-200 flex-1 truncate">{pl.name}</span>
                  {adding === pl.id && <Check size={14} className="text-wave-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
