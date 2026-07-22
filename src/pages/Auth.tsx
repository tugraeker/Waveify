import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { Logo } from '@/components/Logo'
import { CheckCircle } from 'lucide-react'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signedUp, setSignedUp] = useState(false)
  const { setUser } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Listen for session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle()
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: profile?.username || session.user.email?.split('@')[0] || 'User',
          avatar_url: profile?.avatar_url || '',
          created_at: session.user.created_at,
        })
        navigate('/')
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate, setUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.user) {
          const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).maybeSingle()
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            username: profile?.username || data.user.email?.split('@')[0] || 'User',
            avatar_url: profile?.avatar_url || '',
            created_at: data.user.created_at,
          })
          navigate('/')
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { username } },
        })
        if (error) throw error
        if (data.user?.identities?.length === 0) { setSignedUp(true); return }
        if (data.user) {
          setUser({
            id: data.user.id, email: data.user.email || '', username,
            avatar_url: '',
            created_at: data.user.created_at,
          })
          navigate('/')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (signedUp) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-wave-500 to-wave-400 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-wave-500/20">
            <CheckCircle size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Kayıt Başarılı!</h2>
          <p className="text-sm text-surface-400 mb-6 leading-relaxed">
            E-posta adresine bir onay linki gönderdik. Lütfen onayladıktan sonra giriş yap.
          </p>
          <Button variant="primary" onClick={() => { setSignedUp(false); setIsLogin(true) }}>
            Giriş Yap
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-wave-500/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-wave-400/5 blur-[100px]" />
      </div>

      <div className="w-full max-w-sm animate-fade-in relative">
        <div className="flex flex-col items-center gap-3 mb-10">
          <Logo size={56} className="shadow-2xl shadow-wave-500/20" />
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gradient tracking-tight">Waveify</h1>
            <p className="text-sm text-surface-400 mt-1">Müziğini paylaş, birlikte dinle</p>
          </div>
        </div>

        <div className="bg-surface-900/60 backdrop-blur-xl border border-surface-800/50 rounded-2xl p-8 shadow-xl">
        <h2 className="text-lg font-semibold mb-6">
            {isLogin ? 'Tekrar Hoş Geldin' : 'Hesap Oluştur'}
        </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {!isLogin && (
              <Input placeholder="Kullanıcı Adı" value={username} onChange={(e) => setUsername(e.target.value)} required />
            )}
            <Input type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-lg p-3 border border-red-500/10">{error}</p>}
            <Button type="submit" variant="primary" size="lg" className="w-full mt-1" disabled={loading}>
              {loading ? 'Lütfen bekleyin...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
            </Button>
          </form>

          <p className="text-sm text-surface-500 text-center mt-6">
            {isLogin ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}{' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-wave-400 hover:text-wave-300 font-medium transition-colors">
              {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
