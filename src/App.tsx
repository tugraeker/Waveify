import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDiscordRPC } from '@/hooks/useDiscordRPC'
import { useMediaSession } from '@/hooks/useMediaSession'
import Sidebar from '@/components/Sidebar'
import Player from '@/components/Player'
import TitleBar from '@/components/TitleBar'
import Auth from '@/pages/Auth'
import Home from '@/pages/Home'
import Search from '@/pages/Search'
import Library from '@/pages/Library'
import Upload from '@/pages/Upload'
import Friends from '@/pages/Friends'
import PlaylistPage from '@/pages/Playlist'
import NowPlaying from '@/pages/NowPlaying'
import SongDetail from '@/pages/SongDetail'
import QueuePage from '@/pages/Queue'
import CreatePlaylist from '@/pages/CreatePlaylist'
import UserProfile from '@/pages/UserProfile'
import SyncRoom from '@/pages/SyncRoom'
import History from '@/pages/History'
import Import from '@/pages/Import'
import Settings from '@/pages/Settings'
import Activity from '@/pages/Activity'
import ToastContainer from '@/components/ToastContainer'
import UpdateBanner from '@/components/UpdateBanner'
import Stats from '@/pages/Stats'
import Admin from '@/pages/Admin'
import ChatPage from '@/pages/Chat'
import type { AccentColor } from '@/types'

const accentPalettes: Record<AccentColor, Record<string, string>> = {
  wave:   { '50': '238 251 250', '100': '213 245 242', '200': '174 234 229', '300': '106 217 210', '400': '34 199 192', '500': '15 171 166', '600': '9 139 136', '700': '12 111 109', '800': '15 89 88', '900': '18 74 73', '950': '3 45 45' },
  purple: { '50': '250 245 255', '100': '243 232 255', '200': '233 213 255', '300': '216 180 254', '400': '168 85 247', '500': '147 51 234', '600': '124 58 237', '700': '109 40 217', '800': '91 33 182', '900': '76 29 149', '950': '30 10 60' },
  green:  { '50': '240 253 244', '100': '220 252 231', '200': '187 247 208', '300': '134 239 172', '400': '34 197 94', '500': '22 163 74', '600': '21 128 61', '700': '22 101 52', '800': '20 83 45', '900': '15 59 30', '950': '5 32 12' },
  blue:   { '50': '239 246 255', '100': '219 234 254', '200': '191 219 254', '300': '147 197 253', '400': '59 130 246', '500': '37 99 235', '600': '29 78 216', '700': '30 64 175', '800': '30 58 138', '900': '23 37 84', '950': '10 14 46' },
  warm:   { '50': '255 247 237', '100': '255 237 213', '200': '254 215 170', '300': '253 186 116', '400': '249 115 22', '500': '234 88 12', '600': '194 65 12', '700': '154 52 18', '800': '124 45 18', '900': '102 30 10', '950': '39 11 3' },
  pink:   { '50': '253 242 248', '100': '252 231 243', '200': '251 207 232', '300': '249 168 212', '400': '236 72 153', '500': '219 39 119', '600': '190 24 93', '700': '157 23 77', '800': '131 24 67', '900': '80 7 36', '950': '32 3 18' },
  classic:{ '50': '238 242 255', '100': '224 231 255', '200': '199 210 254', '300': '165 180 252', '400': '99 102 241', '500': '79 70 229', '600': '67 56 202', '700': '55 48 163', '800': '49 46 129', '900': '30 27 75', '950': '14 12 38' },
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r} ${g} ${b}`
}

export default function App() {
  const { user, theme, accentColor, setUser } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mounted, setMounted] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  useEffect(() => {
    const palette = accentPalettes[accentColor]
    if (palette) {
      const root = document.documentElement
      for (const [shade, value] of Object.entries(palette)) {
        root.style.setProperty(`--wave-${shade}`, value)
      }
    }
  }, [accentColor])

  useKeyboardShortcuts()
  useDiscordRPC()
  useMediaSession()

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
    const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).maybeSingle()
    const { data: adminCheck } = await supabase.rpc('admin_check')
    setUser({
      id: authUser.id,
      email: authUser.email || '',
      username: profile?.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
      avatar_url: profile?.avatar_url || '',
      is_admin: adminCheck === true,
      created_at: authUser.created_at,
    })
  }

  useEffect(() => {
    if (!authLoading && !user && location.pathname !== '/auth') {
      navigate('/auth')
    }
  }, [user, authLoading])

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  if (authLoading) {
    return (
      <div className="h-screen bg-surface-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-wave-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Auth />

  return (
    <div className="h-screen flex flex-col bg-surface-950">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
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
            <Route path="/activity" element={<Activity />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </main>
      </div>
      <Player />
      <ToastContainer />
      <UpdateBanner />
    </div>
  )
}
