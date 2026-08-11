import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { emitToast } from '@/hooks/useToast'
import { CloudUpload, CloudDownload, Activity, Loader2, HardDrive, Database, Wifi, Users, Music } from 'lucide-react'

/* 171 — Bulut Senkron: kullanıcı ayarları üzerinden localStorage yedeği */
const SYNC_KEY = 'waveify_cloud_sync'

export function CloudSync() {
  const { user } = useStore()
  const [busy, setBusy] = useState<string | null>(null)

  const payload = () => {
    const keys = [
      'waveify_likes', 'waveify_playlists', 'waveify_listen_history_local',
      'waveify_arcade_best', 'waveify_strobe', 'waveify_zen',
    ]
    const data: Record<string, unknown> = {}
    for (const k of keys) {
      const v = localStorage.getItem(k)
      if (v) data[k] = JSON.parse(v)
    }
    return data
  }

  async function upload() {
    if (!user) return
    setBusy('up')
    try {
      const { data: profile } = await supabase.from('users').select('display_settings').eq('id', user.id).maybeSingle()
      const settings = profile?.display_settings || {}
      const { error } = await supabase.from('users').update({ display_settings: { ...settings, cloudData: payload(), cloudAt: new Date().toISOString() } }).eq('id', user.id)
      if (error) throw error
      emitToast('☁️ Yerel veriler buluta yüklendi', 'success')
    } catch { emitToast('Yükleme başarısız', 'error') }
    setBusy(null)
  }

  async function download() {
    if (!user) return
    setBusy('down')
    try {
      const { data: profile } = await supabase.from('users').select('display_settings').eq('id', user.id).maybeSingle()
      const cloud = profile?.display_settings?.cloudData
      if (!cloud || !Object.keys(cloud).length) { emitToast('Bulutta yedek yok', 'info'); setBusy(null); return }
      for (const [k, v] of Object.entries(cloud)) {
        localStorage.setItem(k, JSON.stringify(v))
      }
      emitToast('☁️ Bulut verileri cihaza geri yüklendi', 'success')
    } catch { emitToast('İndirme başarısız', 'error') }
    setBusy(null)
  }

  return (
    <div className="glass rounded-2xl p-5 border border-sky-500/15">
      <div className="flex items-center gap-2 mb-1">
        <CloudUpload size={15} className="text-sky-400" />
        <p className="text-sm font-bold text-white">Bulut Senkron</p>
      </div>
      <p className="text-[11px] text-surface-500 mb-3">Beğeniler, çalma listeleri ve istatistiklerin cihazlar arası yedeği</p>
      <div className="flex gap-2">
        <button onClick={upload} disabled={busy !== null} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5">
          {busy === 'up' ? <Loader2 size={12} className="animate-spin" /> : <CloudUpload size={12} />} Yükle
        </button>
        <button onClick={download} disabled={busy !== null} className="flex-1 py-2 rounded-xl bg-surface-800 border border-surface-700 text-surface-200 text-xs font-bold hover:border-sky-500/40 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
          {busy === 'down' ? <Loader2 size={12} className="animate-spin" /> : <CloudDownload size={12} />} Geri Yükle
        </button>
      </div>
    </div>
  )
}

/* 200 — Sistem Durumu */
export function SystemStatus() {
  const { user } = useStore()
  const [info, setInfo] = useState<{ songs: number; users: number; dbOk: boolean; latency: number } | null>(null)
  const [keys, setKeys] = useState(0)

  useEffect(() => {
    const t0 = performance.now()
    Promise.allSettled([
      supabase.from('songs').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
    ]).then(([s, u]) => {
      const dbOk = s.status === 'fulfilled' && u.status === 'fulfilled'
      setInfo({
        songs: s.status === 'fulfilled' ? s.value.count || 0 : 0,
        users: u.status === 'fulfilled' ? u.value.count || 0 : 0,
        dbOk,
        latency: Math.round(performance.now() - t0),
      })
    })
    let n = 0
    for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith('waveify_')) n++
    setKeys(n)
  }, [])

  const rows = [
    { label: 'Veritabanı', value: info ? (info.dbOk ? 'Çevrimiçi' : 'Erişilemiyor') : 'Kontrol ediliyor...', ok: info?.dbOk, icon: <Database size={13} className={info?.dbOk ? 'text-emerald-400' : 'text-red-400'} /> },
    { label: 'Şarkı sayısı', value: info ? String(info.songs) : '...', ok: undefined, icon: <Music size={13} className="text-wave-400" /> },
    { label: 'Kayıtlı kullanıcı', value: info ? String(info.users) : '...', ok: undefined, icon: <Users size={13} className="text-cyan-400" /> },
    { label: 'Bağlantı gecikmesi', value: info ? `${info.latency} ms` : '...', ok: info ? info.latency < 500 : undefined, icon: <Wifi size={13} className="text-violet-400" /> },
    { label: 'Yerel veri anahtarı', value: `${keys} waveify_*`, ok: undefined, icon: <HardDrive size={13} className="text-amber-400" /> },
    { label: 'Oturum', value: user ? (user.username || 'Giriş yapıldı') : 'Misafir', ok: !!user, icon: <Activity size={13} className="text-rose-400" /> },
  ]

  return (
    <div className="glass rounded-2xl p-5 border border-emerald-500/15">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={15} className="text-emerald-400" />
        <p className="text-sm font-bold text-white">Sistem Durumu</p>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${info?.dbOk ? 'bg-emerald-500/15 text-emerald-300' : 'bg-surface-800 text-surface-500'}`}>
          {info?.dbOk ? '● TÜM SİSTEMLER ÇALIŞIYOR' : 'KONTROL EDİLİYOR'}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-1 px-2 rounded-lg bg-surface-900/40">
            <span className="flex items-center gap-2 text-[11px] text-surface-400">{r.icon} {r.label}</span>
            <span className={`text-[11px] font-semibold ${r.ok === undefined ? 'text-surface-300' : r.ok ? 'text-emerald-400' : 'text-red-400'}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
