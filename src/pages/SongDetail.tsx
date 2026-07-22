import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui'
import SongEditModal from '@/components/SongEditModal'
import type { Song, Comment } from '@/types'
import { Play, Pause, Heart, MessageCircle, ArrowLeft, Edit3, Music2 } from 'lucide-react'

export default function SongDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, setCurrentSong, setQueue, currentSong, isPlaying } = useStore()
  const [song, setSong] = useState<Song | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [liked, setLiked] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    if (id) fetchSong(id)
  }, [id])

  async function fetchSong(songId: string) {
    const { data: s } = await supabase.from('songs').select('*').eq('id', songId).single()
    if (s) setSong(s)

    const { data: c } = await supabase
      .from('comments')
      .select('*, user:user_id(username)')
      .eq('song_id', songId)
      .order('created_at', { ascending: false })
    if (c) setComments(c as any)

    if (user) {
      const { data: l } = await supabase
        .from('likes').select('id').eq('user_id', user.id).eq('song_id', songId).single()
      setLiked(!!l)
    }
  }

  async function toggleLike() {
    if (!user || !song) return
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('song_id', song.id)
      setLiked(false)
    } else {
      await supabase.from('likes').insert({ user_id: user.id, song_id: song.id })
      setLiked(true)
    }
  }

  async function addComment() {
    if (!user || !song || !newComment.trim()) return
    const { data } = await supabase
      .from('comments').insert({ user_id: user.id, song_id: song.id, content: newComment.trim() })
      .select('*, user:user_id(username)').single()
    if (data) {
      setComments((prev) => [data as any, ...prev])
      setNewComment('')
    }
  }

  const playSong = () => {
    if (!song) return
    setQueue([song])
    setCurrentSong(song)
  }

  if (!song) {
    return (
      <div className="p-6 flex items-center justify-center h-full text-surface-500">
        <p>Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="bg-gradient-to-b from-surface-900 to-surface-950 p-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-surface-400 hover:text-white mb-4">
          <ArrowLeft size={18} /> Geri
        </button>

        <div className="flex items-end gap-6">
          {song.cover_url ? (
            <img src={song.cover_url} alt="" className="w-48 h-48 rounded-xl shadow-xl object-cover" />
          ) : (
            <div className="w-48 h-48 rounded-xl bg-surface-800 border border-surface-700 flex items-center justify-center">
              <Music2 size={48} className="text-surface-500" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-xs uppercase font-semibold tracking-wider text-surface-500">Şarkı</p>
            <h1 className="text-3xl font-bold mt-1">{song.title}</h1>
            <p className="text-lg text-surface-400 mt-1">{song.artist}</p>
            <div className="flex items-center gap-4 mt-4">
              <Button variant="primary" size="lg" onClick={playSong}>
                {currentSong?.id === song.id && isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" />}
                {currentSong?.id === song.id && isPlaying ? ' Durdur' : ' Çal'}
              </Button>
              <Button variant="ghost" onClick={toggleLike}>
                <Heart size={20} className={liked ? 'fill-wave-400 text-wave-400' : ''} />
              </Button>
              {song.user_id === user?.id && (
                <Button variant="ghost" onClick={() => setShowEdit(true)}>
                  <Edit3 size={18} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-surface-500">Süre:</span> <span>{formatDuration(song.duration)}</span></div>
          <div><span className="text-surface-500">Yüklenme:</span> <span>{formatDate(song.created_at)}</span></div>
          {song.album && <div><span className="text-surface-500">Albüm:</span> <span>{song.album}</span></div>}
          {song.genre && <div><span className="text-surface-500">Tür:</span> <span>{song.genre}</span></div>}
        </div>

        {song.lyrics && (
          <section>
            <h3 className="text-sm font-semibold text-surface-400 uppercase mb-3">Şarkı Sözleri</h3>
            <div className="bg-surface-900/50 rounded-xl p-4 whitespace-pre-line text-sm leading-relaxed text-surface-300">
              {song.lyrics}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-sm font-semibold text-surface-400 uppercase mb-3">Yorumlar ({comments.length})</h3>
          <div className="space-y-3">
            {user && (
              <div className="flex gap-2">
                <input
                  placeholder="Yorum yaz..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  className="flex-1 bg-surface-900 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-surface-400 focus:outline-none focus:border-wave-400/50"
                />
                <Button size="sm" variant="primary" onClick={addComment} disabled={!newComment.trim()}>
                  <MessageCircle size={14} />
                </Button>
              </div>
            )}
            {comments.map((c) => (
              <div key={c.id} className="bg-surface-900/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-wave-500/20 flex items-center justify-center text-xs font-bold text-wave-400">
                    {(c.user as any)?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-xs font-medium">{(c.user as any)?.username || 'Bilinmeyen'}</span>
                  <span className="text-xs text-surface-500">{formatDate(c.created_at)}</span>
                </div>
                <p className="text-sm ml-8">{c.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {song && (
        <SongEditModal
          song={song}
          open={showEdit}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setSong(updated) }}
          onDeleted={() => navigate('/library')}
        />
      )}
    </div>
  )
}