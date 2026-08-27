import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDiscordRPC } from '@/hooks/useDiscordRPC'
import { useMediaSession } from '@/hooks/useMediaSession'
import Sidebar from '@/components/Sidebar'
import Player from '@/components/Player'
import HeyWave from '@/components/HeyWave'
import TitleBar from '@/components/TitleBar'
import MobileTopBar from '@/components/MobileTopBar'
import MobileNav from '@/components/MobileNav'
import MobilePlayer from '@/components/MobilePlayer'
import ToastContainer from '@/components/ToastContainer'
import UpdateBanner from '@/components/UpdateBanner'
import WhatsNewModal from '@/components/WhatsNewModal'
import { useAchievementsInit } from '@/hooks/useAchievements'
import { Trophy } from 'lucide-react'
import type { Song } from '@/types'

const Auth = lazy(() => import('@/pages/Auth'))
const Home = lazy(() => import('@/pages/Home'))
const Search = lazy(() => import('@/pages/Search'))
const Library = lazy(() => import('@/pages/Library'))
const Upload = lazy(() => import('@/pages/Upload'))
const Friends = lazy(() => import('@/pages/Friends'))
const PlaylistPage = lazy(() => import('@/pages/Playlist'))
const NowPlaying = lazy(() => import('@/pages/NowPlaying'))
const SongDetail = lazy(() => import('@/pages/SongDetail'))
const QueuePage = lazy(() => import('@/pages/Queue'))
const CreatePlaylist = lazy(() => import('@/pages/CreatePlaylist'))
const UserProfile = lazy(() => import('@/pages/UserProfile'))
const SyncRoom = lazy(() => import('@/pages/SyncRoom'))
const History = lazy(() => import('@/pages/History'))
const Import = lazy(() => import('@/pages/Import'))
const Settings = lazy(() => import('@/pages/Settings'))
const Stats = lazy(() => import('@/pages/Stats'))
const Admin = lazy(() => import('@/pages/Admin'))
const ChatPage = lazy(() => import('@/pages/Chat'))
const ArtistPage = lazy(() => import('@/pages/ArtistPage'))
const Discover = lazy(() => import('@/pages/Discover'))
const BadgeGallery = lazy(() => import('@/pages/BadgeGallery'))
const PodcastPage = lazy(() => import('@/pages/Podcast'))
const RadioPage = lazy(() => import('@/pages/Radio'))
const Charts = lazy(() => import('@/pages/Charts'))
const AIDJ = lazy(() => import('@/pages/AIDJ'))
const VisualLab = lazy(() => import('@/pages/VisualLab'))
const LiveSessions = lazy(() => import('@/pages/LiveSessions'))
const Studio = lazy(() => import('@/pages/Studio'))

export default function App() {
  const { user, theme, setUser, setPlaylists, currentSong } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mounted, setMounted] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--wave-400', '139 92 246')
    root.style.setProperty('--wave-500', '139 92 246')
  }, [])

  useKeyboardShortcuts()
  useDiscordRPC()
  useMediaSession()
  const { showLevelUp, newLevel } = useAchievementsInit()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        restoreUser(session.user)
      }
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        restoreUser(session.user)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function restoreUser(authUser: any) {
    let profile: any = null
    try { const r = await supabase.from('users').select('id,username,avatar_url,bio').eq('id', authUser.id).maybeSingle(); profile = r.data } catch {}
    let isAdmin = false
    try { const r = await supabase.from('users').select('is_admin').eq('id', authUser.id).single(); isAdmin = r.data?.is_admin === true } catch {}
    setUser({
      id: authUser.id,
      email: authUser.email || '',
      username: profile?.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
      avatar_url: profile?.avatar_url || localStorage.getItem('waveify_avatar_url') || '',
      banner_url: profile?.banner_url || localStorage.getItem('waveify_banner_url') || '',
      is_admin: isAdmin,
      created_at: authUser.created_at,
    })
    try {
      const { data } = await supabase.from('playlists').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false })
      if (data) setPlaylists(data)
    } catch {}
  }

  useEffect(() => {
    const handleSongId = (songId: string) => {
      supabase
        .from('songs')
        .select('*')
        .eq('id', songId)
        .single()
        .then(({ data }) => {
          if (!data) return
          useStore.getState().setQueue([data as Song])
          useStore.getState().setCurrentSong(data as Song)
          navigate('/now-playing')
        }, () => {})
    }

    const handlePlaylistId = (playlistId: string) => {
      supabase
        .from('playlists')
        .select('*')
        .eq('id', playlistId)
        .maybeSingle()
        .then(async ({ data }) => {
          if (!data) return
          useStore.getState().setActivePlaylist(data)
          try {
            const { data: rows } = await supabase
              .from('playlist_songs')
              .select('songs(*)')
              .eq('playlist_id', playlistId)
              .order('position', { ascending: true })
            const list = (rows || []).map((r: any) => r.songs).filter(Boolean) as Song[]
            if (list.length > 0) {
              useStore.getState().setQueue(list)
              useStore.getState().setCurrentSong(list[0])
            }
          } catch {}
          navigate('/playlist')
        })
    }

    const handleDeepLinkUrl = (url: string) => {
      const song = url.match(/^waveify:\/\/song\/([0-9a-fA-F-]{36})/i)
      const playlist = url.match(/^waveify:\/\/playlist\/([0-9a-fA-F-]{36})/i)
      if (song) handleSongId(song[1])
      else if (playlist) handlePlaylistId(playlist[1])
    }

    const api = (window as any).electronAPI
    if (api?.onDeepLink) {
      api.deepLinkReady()
      api.onDeepLink(handleDeepLinkUrl)
    }

    const onAppUrlOpen = (e: any) => {
      const url: string = e?.detail?.url || ''
      handleDeepLinkUrl(url)
    }
    window.addEventListener('appUrlOpen', onAppUrlOpen)
    return () => window.removeEventListener('appUrlOpen', onAppUrlOpen)
  }, [navigate])

  useEffect(() => {
    if (!authLoading && !user && location.pathname !== '/auth') {
      navigate('/auth')
    }
  }, [user, authLoading])

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  if (authLoading) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Auth />

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] relative overflow-hidden">
      <div className="hidden md:block">
        <TitleBar />
      </div>
      <MobileTopBar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        <main className="relative flex-1 flex flex-col overflow-hidden">
          <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/library" element={<Library />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/playlist" element={<PlaylistPage />} />
              <Route path="/now-playing" element={<NowPlaying />} />
              <Route path="/song/:id" element={<SongDetail />} />
              <Route path="/queue" element={<QueuePage />} />
              <Route path="/create-playlist" element={<CreatePlaylist />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/profile/:id" element={<UserProfile />} />
              <Route path="/sync-room" element={<SyncRoom />} />
              <Route path="/history" element={<History />} />
              <Route path="/import" element={<Import />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/artist/:name" element={<ArtistPage />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/badges" element={<BadgeGallery />} />
              <Route path="/podcast" element={<PodcastPage />} />
              <Route path="/radio" element={<RadioPage />} />
              <Route path="/charts" element={<Charts />} />
              <Route path="/ai-dj" element={<AIDJ />} />
              <Route path="/visual-lab" element={<VisualLab />} />
              <Route path="/live-sessions" element={<LiveSessions />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/auth" element={<Auth />} />
            </Routes>
          </Suspense>
          </div>
        </main>
      </div>
      <div className="hidden md:block">
        <Player />
      </div>
      <MobilePlayer />
      <MobileNav />
      <HeyWave />
      <ToastContainer />
      <UpdateBanner />
      <WhatsNewModal />
      {showLevelUp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => {}}>
          <div className="text-center animate-level-up">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-yellow-500/30 animate-bounce glow-amber">
              <Trophy size={48} className="text-white" />
            </div>
            <h2 className="text-3xl font-display font-bold text-white mb-1 text-glow">Seviye Atladın!</h2>
            <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-fuchsia-400 to-cyan-400 mb-2">Seviye {newLevel}</p>
            <p className="text-surface-400 text-sm">Tebrikler! Yeni bir seviyeye ulaştın.</p>
          </div>
        </div>
      )}
    </div>
  )
}
