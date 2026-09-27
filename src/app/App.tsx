import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDiscordRPC } from '@/hooks/useDiscordRPC'
import { useMediaSession } from '@/hooks/useMediaSession'
import { useAudioController } from '@/hooks/useAudioController'
import Sidebar from '@/components/Sidebar'
import Player from '@/components/Player'
import TitleBar from '@/components/TitleBar'
import MobileTopBar from '@/components/MobileTopBar'
import MobileNav from '@/components/MobileNav'
import MobilePlayer from '@/components/MobilePlayer'
import ToastContainer from '@/components/ToastContainer'
import { Skeleton } from '@/core/ui/Skeleton'
import { RouteErrorBoundary } from '@/core/errorBoundary'
import { useAchievementsInit } from '@/hooks/useAchievements'
import { useAuraBackground } from '@/hooks/useAuraBackground'
import { Trophy } from 'lucide-react'
import type { Song } from '@/types'

// v10-slim: agir kabuk bilesenleri acilistan SONRA yuklenir (ilk boyamada degiller).
const HeyWave = lazy(() => import('@/components/HeyWave'))
const FriendActivityBubble = lazy(() => import('@/components/FriendActivityBubble'))
const UpdateBanner = lazy(() => import('@/components/UpdateBanner'))
const WhatsNewModal = lazy(() => import('@/components/WhatsNewModal'))

function DeferredExtras() {
  const { showLevelUp, newLevel } = useAchievementsInit()
  return (
    <>
      <Suspense fallback={null}>
        <HeyWave />
        <FriendActivityBubble />
        <UpdateBanner />
        <WhatsNewModal />
      </Suspense>
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
    </>
  )
}

// v10 canonical lazy route table. Paths identical to v9 src/App.tsx.
// Quests (gamify) has NO default export on purpose — it is not a route,
// so it is never lazy-imported here (would break the build).
const Auth = lazy(() => import('@/features/settings/pages/Auth'))
const Home = lazy(() => import('@/features/library/pages/Home'))
const Search = lazy(() => import('@/features/library/pages/Search'))
const Library = lazy(() => import('@/features/library/pages/Library'))
const Upload = lazy(() => import('@/features/library/pages/Upload'))
const Friends = lazy(() => import('@/features/social/pages/Friends'))
const PlaylistPage = lazy(() => import('@/features/library/pages/Playlist'))
const NowPlaying = lazy(() => import('@/features/player/pages/NowPlayingPage'))
const SongDetail = lazy(() => import('@/features/library/pages/SongDetail'))
const QueuePage = lazy(() => import('@/features/library/pages/Queue'))
const CreatePlaylist = lazy(() => import('@/features/studio/pages/CreatePlaylist'))
const UserProfile = lazy(() => import('@/features/social/pages/UserProfile'))
const SyncRoom = lazy(() => import('@/features/social/pages/SyncRoom'))
const History = lazy(() => import('@/features/library/pages/History'))
const Import = lazy(() => import('@/features/library/pages/Import'))
const Settings = lazy(() => import('@/features/settings/pages/Settings'))
const Admin = lazy(() => import('@/features/settings/pages/Admin'))
const ChatPage = lazy(() => import('@/features/social/pages/ChatPage'))
const ArtistPage = lazy(() => import('@/features/library/pages/ArtistPage'))

export default function App() {
  const user = useStore((state) => state.user)
  const theme = useStore((state) => state.theme)
  const setUser = useStore((state) => state.setUser)
  const setPlaylists = useStore((state) => state.setPlaylists)
  const currentSong = useStore((state) => state.currentSong)
  const navigate = useNavigate()
  const location = useLocation()
  const [mounted, setMounted] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  useAudioController()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--wave-400', '198 255 62')
    root.style.setProperty('--wave-500', '198 255 62')
  }, [])

  useKeyboardShortcuts()
  useDiscordRPC()
  useMediaSession()
  useAuraBackground()
  // Agir ekstralar ilk boyamadan SONRA (idle) yuklenir
  const [deferExtras, setDeferExtras] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setDeferExtras(true), 2500)
    return () => window.clearTimeout(t)
  }, [])

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

    // Accepts both waveify://song/:id (Electron protocol) and #/song/:id (hash form,
    // see electron/deepLink.ts deepLinkToHash). Same for playlist/:id.
    const handleDeepLinkUrl = (url: string) => {
      const song = url.match(/^(?:waveify:\/\/|#\/)song\/([0-9a-fA-F-]{36})/i)
      const playlist = url.match(/^(?:waveify:\/\/|#\/)playlist\/([0-9a-fA-F-]{36})/i)
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
      <div className="h-screen relative overflow-hidden flex items-center justify-center">
        <div className="app-orbs" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-wave-400 text-black font-display font-extrabold text-xl flex items-center justify-center shadow-[0_0_40px_rgba(198,255,62,0.45)]">W</div>
          <div className="w-8 h-8 border-2 border-wave-400/40 border-t-wave-400 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) return <Auth />

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      <div className="app-orbs" />
      <div className="app-noise" />
      <div className="hidden md:block relative z-20">
        <TitleBar />
      </div>
      <MobileTopBar />
      <div className="relative z-10 flex flex-1 overflow-hidden p-0 md:p-3 md:pt-0 md:gap-3">
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        <main className="relative flex-1 flex flex-col overflow-hidden md:rounded-[28px] md:app-main-panel">
          <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
          <Suspense fallback={<Skeleton />}>
            <RouteErrorBoundary>
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
              <Route path="/admin" element={<Admin />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/artist/:name" element={<ArtistPage />} />
              <Route path="/auth" element={<Auth />} />
            </Routes>
            </RouteErrorBoundary>
          </Suspense>
          </div>
        </main>
      </div>
      <div className="hidden md:block relative z-20 px-3 pb-3">
        <Player />
      </div>
      <MobilePlayer />
      <MobileNav />
      <ToastContainer />
      {deferExtras && <DeferredExtras />}
    </div>
  )
}
