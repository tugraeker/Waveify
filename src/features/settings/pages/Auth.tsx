import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '../../../core/supabaseClient'
import { Button, Input } from '@/components/ui'
import { Logo } from '@/components/Logo'
import { CheckCircle, Chrome, Headphones, Disc3, Sparkles, ArrowUpRight } from 'lucide-react'

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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
        <div className="app-orbs" />
        <div className="app-noise" />
        <div className="glass-panel relative z-10 w-full max-w-md animate-fade-in overflow-hidden rounded-[32px] p-8 text-center sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-wave-300/10 blur-3xl" />
          <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] border border-wave-200/30 bg-gradient-to-br from-wave-200 to-wave-500 shadow-[0_12px_38px_rgba(198,255,62,.2)]">
            <CheckCircle size={32} className="text-black" />
          </div>
          <h2 className="relative mb-3 font-display text-2xl font-bold tracking-tight text-white">Güzel şeyler başlıyor.</h2>
          <p className="relative mb-6 text-sm leading-relaxed text-white/55">E-posta adresine bir onay linki gönderdik. Lütfen onayladıktan sonra giriş yap.</p>
          <Button variant="primary" onClick={() => { setSignedUp(false); setIsLogin(true) }}>Giriş Yap</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="app-orbs" />
      <div className="app-noise" />

      <div className="relative z-10 grid w-full max-w-[1000px] animate-fade-in items-center gap-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
        <section className="relative hidden min-h-[570px] flex-col justify-between overflow-hidden rounded-[34px] border border-white/10 bg-[#0b0e18]/60 p-9 shadow-[0_28px_100px_rgba(0,0,0,.22)] backdrop-blur-2xl lg:flex xl:p-11">
          <div className="pointer-events-none absolute -left-28 -top-24 h-[360px] w-[360px] rounded-full bg-violet-500/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-[340px] w-[340px] rounded-full bg-cyan-300/15 blur-[95px]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:radial-gradient(rgba(255,255,255,.65)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(140deg,black,transparent_64%)]" />
          <div className="relative flex items-center gap-3">
            <Logo size={42} className="shadow-[0_0_34px_rgba(198,255,62,0.28)]" />
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-white">Waveify</p>
              <p className="text-[9px] font-semibold uppercase tracking-[.2em] text-white/35">MÜZİĞİNLE BİRLİKTE</p>
            </div>
          </div>
          <div className="relative py-9">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-white/65"><Sparkles size={13} className="text-wave-200" /> BİR ŞARKIYLA BAŞLAR</span>
            <h1 className="max-w-lg font-display text-[clamp(2.7rem,5vw,4.8rem)] font-bold leading-[.98] tracking-[-.065em] text-white">Sesini aç.<br /><span className="bg-gradient-to-r from-wave-200 via-cyan-200 to-violet-300 bg-clip-text text-transparent">Dünyanı paylaş.</span></h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/50">Kendi arşivini kur, yeni favoriler keşfet ve arkadaşlarınla aynı anda dinle.</p>
          </div>
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-violet-500/15 via-white/[0.045] to-cyan-400/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-cyan-100"><Headphones size={22} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white/85">Dinlediğin her şarkı bir iz bırakır</p>
                <p className="mt-1 text-[10px] text-white/40">Kendi ritmin, kendi topluluğun.</p>
              </div>
              <div className="flex h-7 items-center gap-1" aria-hidden="true">{[10, 20, 13, 24, 16, 21, 11, 18, 8].map((height, i) => <span key={i} className="w-[3px] rounded-full bg-gradient-to-t from-wave-300/60 to-cyan-200" style={{ height }} />)}</div>
            </div>
          </div>
          <Disc3 size={160} strokeWidth={0.45} className="pointer-events-none absolute -bottom-10 -right-12 rotate-[-18deg] text-white/[0.035]" />
        </section>

        <div className="mx-auto w-full max-w-[440px] lg:max-w-none">
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <Logo size={44} className="shadow-[0_0_38px_rgba(198,255,62,0.3)]" />
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-white">Waveify</h1>
              <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/40">MÜZİĞİNLE BİRLİKTE</p>
            </div>
          </div>
          <div className="glass-panel relative overflow-hidden rounded-[30px] p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-400/[0.11] blur-[85px]" />
            <div className="relative mb-7">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-wave-200/70">HOŞ GELDİN</p>
              <h2 className="font-display text-[26px] font-bold tracking-tight text-white">{isLogin ? 'Ritmine geri dön.' : 'Yerini al.'}</h2>
              <p className="mt-1 text-sm text-white/45">{isLogin ? 'Hesabına giriş yap ve kaldığın yerden devam et.' : 'Waveify topluluğuna katıl, müziğini paylaş.'}</p>
            </div>

            <form onSubmit={handleSubmit} className="relative flex flex-col gap-3.5">
              {!isLogin && <Input placeholder="Kullanıcı Adı" value={username} onChange={(e) => setUsername(e.target.value)} required />}
              <Input type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              {error && <p className="rounded-xl border border-red-400/15 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
              <Button type="submit" variant="primary" size="lg" className="mt-1 w-full" disabled={loading}>{loading ? 'Lütfen bekleyin...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</Button>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-[#11131c]/80 px-3 text-white/35 backdrop-blur">veya</span></div>
              </div>
              <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })} className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-medium text-white/85 transition-all hover:border-white/20 hover:bg-white/[0.09]" type="button">
                <Chrome size={17} /> Google ile devam et <ArrowUpRight size={14} className="ml-auto text-white/35" />
              </button>
            </form>

            <p className="relative mt-6 text-center text-sm text-white/40">{isLogin ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}{' '}
              <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-wave-200 transition-colors hover:text-white">{isLogin ? 'Kayıt Ol' : 'Giriş Yap'}</button>
            </p>
          </div>
          <p className="mt-4 text-center text-[10px] text-white/25">Müziğin en güzel hali birlikte.</p>
        </div>
      </div>
    </div>
  )
}
