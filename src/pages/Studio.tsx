import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/store'
import { resolveAudioUrl } from '@/lib/offline'
import { emitToast } from '@/hooks/useToast'
import { SlidersHorizontal, Guitar, Timer, Grid3x3, FileOutput, AudioWaveform, CassetteTape, Waves, Activity, Disc3, Highlighter, PenLine } from 'lucide-react'
import type { Song } from '@/types'
import { defaultEqBands } from '@/types'

let studioCtx: AudioContext | null = null
async function ctx(): Promise<AudioContext> {
  if (!studioCtx) studioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (studioCtx.state === 'suspended') await studioCtx.resume()
  return studioCtx
}
function midiFreq(m: number) { return 440 * Math.pow(2, (m - 69) / 12) }

const TOOLS = [
  { id: 'synth', name: 'Synth Pad', icon: SlidersHorizontal, desc: 'Dokunmatik sentez pedi' },
  { id: 'tuner', name: 'Gitar Akordu', icon: Guitar, desc: 'Referans sesler + mikrofon ölçer' },
  { id: 'metronom', name: 'Metronom', icon: Timer, desc: 'Hassas tempo ayarı' },
  { id: 'launchpad', name: 'Launchpad', icon: Grid3x3, desc: '16 adımlık beat sequencer' },
  { id: 'convert', name: 'Format Dönüştürücü', icon: FileOutput, desc: 'Şarkıyı WAV olarak dışa aktar' },
  { id: 'binaural', name: 'Binaural Beats', icon: AudioWaveform, desc: 'Odak ve uyku frekansları' },
  { id: 'tape', name: 'Kaset Efekti', icon: CassetteTape, desc: 'Wow/flutter + doygunluk' },
  { id: 'room', name: 'Ortam Akustiği', icon: Waves, desc: 'Yapay oda yankısı' },
  { id: 'analyze', name: 'BPM & Ton', icon: Activity, desc: 'Şarkı analizi' },
  { id: 'center', name: 'Enstrümantal Mod', icon: Disc3, desc: 'Vokali merkezden sil' },
  { id: 'abloop', name: 'Highlight Döngüsü', icon: Highlighter, desc: 'A-B tekrar bölgesi' },
  { id: 'eqdraw', name: 'EQ Çizimi', icon: PenLine, desc: 'Eğri çizerek ekolayzer ayarla' },
]

export default function Studio() {
  const [active, setActive] = useState<string | null>(null)
  const songs = useStore((s) => s.songs)
  const [pool, setPool] = useState<Song[]>([])
  useEffect(() => {
    let cancelled = false
    if (songs.length >= 1) { setPool(songs); return }
    supabase.from('songs').select('id,title,artist,cover_url,audio_url').not('audio_url', 'is', null).limit(300).then(({ data }) => {
      if (!cancelled && data?.length) { setPool(data as Song[]); useStore.getState().setSongs(data as Song[]) }
    })
    return () => { cancelled = true }
  }, [songs.length])

  useEffect(() => () => { if (studioCtx) studioCtx.close().catch(() => {}); studioCtx = null }, [])

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"><SlidersHorizontal size={20} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-display font-bold">Studio</h1>
            <p className="text-sm text-surface-400">12 profesyonel araç — sentez, analiz ve dışa aktarma</p>
          </div>
        </div>

        {!active && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TOOLS.map((t) => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setActive(t.id)} className="text-left bg-surface-900/50 border border-surface-800 hover:border-cyan-500/40 rounded-2xl p-4 transition-all hover:-translate-y-0.5 group">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3 group-hover:bg-cyan-500/20 transition-colors"><Icon size={18} className="text-cyan-400" /></div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{t.desc}</p>
                </button>
              )
            })}
          </div>
        )}

        {active && (
          <div>
            <button onClick={() => setActive(null)} className="mb-4 text-xs text-surface-400 hover:text-white transition-colors">← Araçlara dön</button>
            {active === 'synth' && <SynthPad />}
            {active === 'tuner' && <TunerTool />}
            {active === 'metronom' && <MetronomeTool />}
            {active === 'launchpad' && <LaunchpadTool />}
            {active === 'convert' && <ConvertTool pool={pool} />}
            {active === 'binaural' && <BinauralTool />}
            {active === 'tape' && <TapeTool pool={pool} />}
            {active === 'room' && <RoomTool pool={pool} />}
            {active === 'analyze' && <AnalyzeTool pool={pool} />}
            {active === 'center' && <CenterCancel pool={pool} />}
            {active === 'abloop' && <ABLoop pool={pool} />}
            {active === 'eqdraw' && <EqDrawTool />}
          </div>
        )}
      </div>
    </div>
  )
}

function SongPicker({ pool, value, onChange }: { pool: Song[]; value: string; onChange: (id: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
    >
      <option value="">Şarkı seç…</option>
      {pool.map((s) => <option key={s.id} value={s.id}>{s.title} — {s.artist}</option>)}
    </select>
  )
}

async function fetchAudioBuffer(url: string): Promise<AudioBuffer> {
  const resolved = await resolveAudioUrl(url)
  const res = await fetch(resolved)
  if (!res.ok) throw new Error('fetch failed')
  const ab = await res.arrayBuffer()
  const ac = await ctx()
  return await ac.decodeAudioData(ab)
}

function encodeWav(buffer: AudioBuffer): Blob {
  const ch = buffer.numberOfChannels
  const sr = buffer.sampleRate
  const len = buffer.length
  const data = new Float32Array(ch * len)
  for (let c = 0; c < ch; c++) data.set(buffer.getChannelData(c), c * len)
  const bytes = new Uint8Array(44 + data.length * 2)
  const dv = new DataView(bytes.buffer)
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i) }
  ws(0, 'RIFF'); dv.setUint32(4, 36 + data.length * 2, true); ws(8, 'WAVE')
  ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true)
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true)
  ws(36, 'data'); dv.setUint32(40, data.length * 2, true)
  let off = 44
  for (let i = 0; i < data.length; i++) { const s = Math.max(-1, Math.min(1, data[i])); bytes[off++] = (s * 0x7fff) & 0xff; bytes[off++] = ((s * 0x7fff) >> 8) & 0xff }
  return new Blob([bytes], { type: 'audio/wav' })
}

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

/* 31 — Synth Pad */
function SynthPad() {
  const [wave, setWave] = useState<OscillatorType>('sine')
  const pads: number[][] = []
  const root = 60
  for (let r = 0; r < 4; r++) { const row: number[] = []; for (let c = 0; c < 4; c++) row.push(root + r * 2 + (c % 4)); pads.push(row) }
    const playPad = async (midi: number) => {
      const ac = await ctx()
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = wave
      osc.frequency.value = midiFreq(midi)
      g.gain.setValueAtTime(0.0001, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.7)
      osc.connect(g).connect(ac.destination)
      osc.start()
      osc.stop(ac.currentTime + 0.8)
    }
    const playPadRef = useRef(playPad)
    playPadRef.current = playPad
    const [midiConnected, setMidiConnected] = useState(false)
    useEffect(() => {
      const nav: any = navigator
      if (!nav.requestMIDIAccess) return
      let cleanup = false
      nav.requestMIDIAccess().then((access: any) => {
        if (cleanup) return
        const inputs: any[] = [...access.inputs.values()]
        if (inputs.length > 0) setMidiConnected(true)
        inputs.forEach((input: any) => {
          input.onmidimessage = (e: any) => {
            const data: number[] = e.data
            if (data.length < 3) return
            const [status, note, vel] = data
            if (status >= 144 && status < 160 && vel > 0) playPadRef.current(note)
          }
        })
      }).catch(() => {})
      return () => { cleanup = true }
    }, [])
  return (
    <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-surface-400">Dalga:</span>
          {(['sine', 'triangle', 'square', 'sawtooth'] as OscillatorType[]).map((w) => (
            <button key={w} onClick={() => setWave(w)} className={`px-3 py-1 rounded-lg text-xs border transition-colors ${wave === w ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-surface-800 border-surface-700 text-surface-400'}`}>{w}</button>
          ))}
          {midiConnected && <span className="ml-auto text-[10px] px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 animate-fade-in">🎹 MIDI cihaz bağlı</span>}
        </div>
      <div className="grid grid-cols-4 gap-2">
        {pads.map((row, ri) => row.map((m) => (
          <button key={m} onMouseDown={() => playPad(m)} onTouchStart={(e) => { e.preventDefault(); playPad(m) }} className="h-20 rounded-2xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 active:scale-95 transition-transform hover:border-cyan-500/50 text-sm text-surface-300 font-semibold">
            {['C', 'D', 'E', 'F', 'G', 'A', 'B'][m % 12 >= 11 ? 6 : (m % 12) % 7]}{Math.floor(m / 12) - 1}
          </button>
        )))}
      </div>
      <p className="text-xs text-surface-500 mt-3">Pedlere bas ya da dokun — 16 notalık sentez klavyesi.</p>
    </div>
  )
}

/* 35 — Gitar Akordu */
function TunerTool() {
  const [freq, setFreq] = useState(0)
  const [cents, setCents] = useState(0)
  const [mic, setMic] = useState(false)
  const strings: [string, number][] = [['E2', 82.41], ['A2', 110], ['D3', 146.83], ['G3', 196], ['B3', 246.94], ['E4', 329.63]]
  const playRef = async (f: number) => {
    const ac = await ctx()
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.2, ac.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 2.2)
    o.connect(g).connect(ac.destination)
    o.start(); o.stop(ac.currentTime + 2.3)
  }
  const nearest = (f: number) => { if (!f) return null; const m = Math.round(69 + 12 * Math.log2(f / 440)); return { name: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12] + (Math.floor(m / 12) - 1), f: midiFreq(m), cents: Math.round(1200 * Math.log2(f / midiFreq(m))) } }
  const tune = nearest(freq)
  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ac = await ctx()
      const src = ac.createMediaStreamSource(stream)
      const an = ac.createAnalyser()
      an.fftSize = 4096
      src.connect(an)
      setMic(true)
      const buf = new Float32Array(an.fftSize)
      let alive = true
      const loop = () => {
        if (!alive) return
        an.getFloatTimeDomainData(buf)
        let best = 0, bestScore = 0
        for (let lag = 40; lag < 1500; lag++) {
          let sum = 0, denom = 0
          for (let i = 0; i < an.fftSize - lag; i++) { sum += buf[i] * buf[i + lag]; denom += buf[i] * buf[i] }
          const score = denom > 0 ? sum / denom : 0
          if (score > bestScore) { bestScore = score; best = lag }
        }
        if (bestScore > 0.8 && best > 0) {
          const f = ac.sampleRate / best
          if (f > 60 && f < 1200) { setFreq(f); setCents(nearest(f)?.cents || 0) }
        }
        requestAnimationFrame(loop)
      }
      loop()
      return () => { alive = false; stream.getTracks().forEach((t) => t.stop()) }
    } catch { emitToast('Mikrofona erişilemedi', 'error') }
  }
  useEffect(() => () => { if (mic) navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {}) }, [mic])
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {strings.map(([name, f]) => <button key={name} onClick={() => playRef(f)} className="px-4 py-2 rounded-xl bg-surface-800 border border-surface-700 hover:border-cyan-500/40 text-sm font-bold text-white">{name}</button>)}
      </div>
      {!mic ? (
        <button onClick={startMic} className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-sm font-semibold">Mikrofonla ölç</button>
      ) : (
        <div className="bg-surface-800/60 border border-surface-700 rounded-2xl p-4 text-center">
          <p className="text-5xl font-extrabold text-white font-mono">{freq > 0 ? freq.toFixed(1) : '—'} Hz</p>
          {tune ? (
            <div>
              <p className="mt-2 text-lg font-bold text-cyan-300">{tune.name}</p>
              <div className="mt-3 h-2 bg-surface-700 rounded-full overflow-hidden mx-auto max-w-xs">
                <div className={`h-full ${Math.abs(tune.cents) < 10 ? 'bg-emerald-400' : 'bg-amber-400'} transition-all`} style={{ width: `${Math.min(100, Math.abs(tune.cents))}%`, marginLeft: tune.cents < 0 ? `${Math.min(50, Math.max(0, 50 + tune.cents / 2))}%` : '50%' }} />
              </div>
              <p className={`mt-2 text-xs ${Math.abs(tune.cents) < 10 ? 'text-emerald-400' : 'text-amber-400'}`}>{tune.cents >= 0 ? '+' : ''}{tune.cents} cent — {Math.abs(tune.cents) < 10 ? 'akort tamam' : tune.cents > 0 ? 'sıkıştır' : 'gevşet'}</p>
            </div>
          ) : <p className="mt-2 text-xs text-surface-500">Nota duyulmuyor…</p>}
        </div>
      )}
    </div>
  )
}

/* 36 — Metronom */
function MetronomeTool() {
  const [bpm, setBpm] = useState(100)
  const [accent, setAccent] = useState(true)
  const [on, setOn] = useState(false)
  const timer = useRef<number>(0)
  useEffect(() => {
    if (!on) return
    const ac = studioCtx
    if (!ac) return
    let next = ac.currentTime + 0.05
    let beat = 0
    const tick = () => {
      while (next < ac.currentTime + 0.2) {
        const g = ac.createGain()
        const o = ac.createOscillator()
        o.type = 'square'
        o.frequency.value = accent && beat % 4 === 0 ? 1320 : 880
        g.gain.setValueAtTime(accent && beat % 4 === 0 ? 0.25 : 0.15, next)
        g.gain.exponentialRampToValueAtTime(0.0001, next + 0.05)
        o.connect(g).connect(ac.destination)
        o.start(next); o.stop(next + 0.06)
        beat++
        next += 60 / bpm
      }
    }
    tick()
    timer.current = window.setInterval(tick, 100)
    return () => window.clearInterval(timer.current)
  }, [on, bpm, accent])
  return (
    <div className="max-w-sm">
      <input type="range" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-full accent-cyan-400" />
      <p className="text-center text-4xl font-extrabold font-mono text-white mb-4">{bpm} <span className="text-sm text-surface-500">BPM</span></p>
      <label className="flex items-center gap-2 mb-4 text-sm text-surface-400"><input type="checkbox" checked={accent} onChange={(e) => setAccent(e.target.checked)} className="accent-cyan-400" /> Aksan vurgusu (ilk vuruş)</label>
      <button onClick={() => setOn(!on)} className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${on ? 'bg-red-500/20 border border-red-500/40 text-red-300' : 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300'}`}>{on ? 'Durdur' : 'Başlat'}</button>
    </div>
  )
}

/* 37 — Launchpad */
function LaunchpadTool() {
  const [bpm, setBpm] = useState(120)
  const [on, setOn] = useState(false)
  const [steps, setSteps] = useState<boolean[][]>(Array.from({ length: 4 }, () => Array(16).fill(false)))
  const timer = useRef<number>(0)
  const stepRef = useRef(0)
  const voices = [
    (ac: AudioContext, t: number) => { const o = ac.createOscillator(); const g = ac.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.08); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.12) },
    (ac: AudioContext, t: number) => { const len = ac.sampleRate * 0.08; const buf = ac.createBuffer(1, len, ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.12)); const s = ac.createBufferSource(); const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; const g = ac.createGain(); g.gain.value = 0.25; s.buffer = buf; s.connect(f).connect(g).connect(ac.destination); s.start(t) },
    (ac: AudioContext, t: number) => { const len = ac.sampleRate * 0.03; const buf = ac.createBuffer(1, len, ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000; const g = ac.createGain(); g.gain.value = 0.12; s.buffer = buf; s.connect(f).connect(g).connect(ac.destination); s.start(t) },
    (ac: AudioContext, t: number) => { const o = ac.createOscillator(); const g = ac.createGain(); o.type = 'square'; o.frequency.value = 440; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.09) },
  ]
  useEffect(() => {
    if (!on) return
    const ac = studioCtx
    if (!ac) return
    let next = ac.currentTime + 0.05
    const tick = () => {
      while (next < ac.currentTime + 0.3) {
        const s = stepRef.current
        for (let r = 0; r < 4; r++) if (steps[r][s]) voices[r](ac, next)
        stepRef.current = (s + 1) % 16
        next += 60 / bpm / 4
      }
    }
    tick()
    timer.current = window.setInterval(tick, 100)
    return () => window.clearInterval(timer.current)
  }, [on, bpm, steps])
  const rowNames = ['Kick', 'Snare', 'Hi-hat', 'Lead']
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input type="range" min={60} max={180} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="flex-1 accent-cyan-400" />
        <span className="text-sm font-bold text-white w-16">{bpm} BPM</span>
        <button onClick={() => setOn(!on)} className={`px-4 py-2 rounded-xl text-sm font-bold ${on ? 'bg-red-500/20 border border-red-500/40 text-red-300' : 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300'}`}>{on ? 'Durdur' : 'Çal'}</button>
      </div>
      <div className="grid grid-cols-17 gap-1" style={{ gridTemplateColumns: '80px repeat(16, 1fr)' }}>
        {rowNames.map((name, r) => (
          <div key={name}>
            <p className="text-[10px] text-surface-500 mb-1 pl-1 h-6">{name}</p>
            <div className="grid grid-cols-16 gap-1" style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}>
              {steps[r].map((v, c) => (
                <button key={c} onClick={() => { const n = steps.map((row) => [...row]); n[r][c] = !n[r][c]; setSteps(n) }} className={`h-8 rounded ${c % 4 === 0 ? 'bg-surface-700/80' : 'bg-surface-800/80'} ${v ? 'bg-cyan-500/70 border border-cyan-400' : 'border border-surface-700'} transition-colors`} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-surface-500 mt-3">Kareye tıkla — 16 adımlık 4 parçalı davul makinesi.</p>
    </div>
  )
}

/* 38 — Format Dönüştürücü */
function ConvertTool({ pool }: { pool: Song[] }) {
  const [songId, setSongId] = useState('')
  const [sr, setSr] = useState(44100)
  const [busy, setBusy] = useState(false)
  const convert = async () => {
    const song = pool.find((s) => s.id === songId)
    if (!song || !song.audio_url) { emitToast('Şarkı seç', 'error'); return }
    setBusy(true)
    try {
      const buf = await fetchAudioBuffer(song.audio_url)
      const off = new OfflineAudioContext(2, Math.ceil(buf.duration * sr), sr)
      const src = off.createBufferSource()
      src.buffer = buf
      src.connect(off.destination)
      src.start()
      const out = await off.startRendering()
      downloadBlob(encodeWav(out), `${song.title.replace(/[^\w\u00C0-\uFFFF]+/g, '_')}_${sr}hz.wav`)
      emitToast('WAV indirildi ✓', 'success')
    } catch { emitToast('Dönüştürme başarısız', 'error') } finally { setBusy(false) }
  }
  return (
    <div className="max-w-md space-y-4">
      <SongPicker pool={pool} value={songId} onChange={setSongId} />
      <div className="flex items-center gap-3">
        <span className="text-xs text-surface-400">Örnek hızı:</span>
        {[44100, 22050, 11025].map((v) => <button key={v} onClick={() => setSr(v)} className={`px-3 py-1 rounded-lg text-xs border ${sr === v ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-surface-800 border-surface-700 text-surface-400'}`}>{v / 1000} kHz</button>)}
      </div>
      <button onClick={convert} disabled={busy} className="w-full py-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-sm font-bold disabled:opacity-50">{busy ? 'Dönüştürülüyor…' : 'WAV olarak indir'}</button>
    </div>
  )
}

/* 40 — Binaural Beats */
function BinauralTool() {
  const presets = [['Delta', 2, 'Derin uyku'], ['Theta', 5, 'Meditasyon'], ['Alpha', 10, 'Rahatlama'], ['Beta', 18, 'Odaklanma'], ['Gamma', 40, 'Konsantrasyon']] as const
  const [beat, setBeat] = useState(10)
  const [carrier, setCarrier] = useState(240)
  const [on, setOn] = useState(false)
  const [nodes, setNodes] = useState<{ l: OscillatorNode; r: OscillatorNode; g: GainNode } | null>(null)
  const stop = () => {
    if (nodes) { try { nodes.l.stop(); nodes.r.stop() } catch {}; try { nodes.g.disconnect() } catch {}; setNodes(null) }
    setOn(false)
  }
  const start = async () => {
    const ac = await ctx()
    const l = ac.createOscillator(); const r = ac.createOscillator(); const g = ac.createGain()
    l.frequency.value = carrier; r.frequency.value = carrier + beat
    g.gain.value = 0.15
    const pl = ac.createStereoPanner(); const pr = ac.createStereoPanner()
    pl.pan.value = -1; pr.pan.value = 1
    l.connect(pl).connect(g); r.connect(pr).connect(g); g.connect(ac.destination)
    l.start(); r.start()
    setNodes({ l, r, g })
    setOn(true)
  }
  useEffect(() => () => stop(), [])
  return (
    <div className="max-w-md space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {presets.map(([name, hz, desc]) => (
          <button key={name} onClick={() => { const prev = on; stop(); if (prev) setBeat(hz); else { setBeat(hz) } }} className={`p-2 rounded-xl border text-center ${beat === hz ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-surface-800 border-surface-700'}`}>
            <p className="text-xs font-bold text-white">{name}</p>
            <p className="text-[10px] text-surface-500">{hz} Hz</p>
          </button>
        ))}
      </div>
      <div>
        <p className="text-xs text-surface-400 mb-1">Taşıyıcı: {carrier} Hz</p>
        <input type="range" min={150} max={400} value={carrier} onChange={(e) => setCarrier(Number(e.target.value))} className="w-full accent-cyan-400" />
      </div>
      <button onClick={on ? stop : start} className={`w-full py-3 rounded-xl text-sm font-bold ${on ? 'bg-red-500/20 border border-red-500/40 text-red-300' : 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300'}`}>{on ? 'Durdur' : `Başlat (${beat} Hz beat)`}</button>
      <p className="text-xs text-surface-500">En iyi sonuç için kulaklık kullan. Sol ve sağ kanal arasındaki fark beyni o frekansa senkronlar.</p>
    </div>
  )
}

/* 42 — Kaset Efekti */
function TapeTool({ pool }: { pool: Song[] }) {
  const [songId, setSongId] = useState('')
  const [wobble, setWobble] = useState(0.5)
  const [hiss, setHiss] = useState(0.3)
  const [saturation, setSaturation] = useState(0.4)
  const [busy, setBusy] = useState(false)
  const render = async () => {
    const song = pool.find((s) => s.id === songId)
    if (!song || !song.audio_url) { emitToast('Şarkı seç', 'error'); return }
    setBusy(true)
    try {
      const buf = await fetchAudioBuffer(song.audio_url)
      const off = new OfflineAudioContext(2, buf.length, buf.sampleRate)
      const src = off.createBufferSource(); src.buffer = buf
      const delay = off.createDelay(2); delay.delayTime.value = 0.3
      const lfo = off.createOscillator(); const lfoG = off.createGain()
      lfo.frequency.value = 4; lfoG.gain.value = wobble * 0.003
      lfo.connect(lfoG).connect(delay.delayTime)
      const ws = off.createWaveShaper()
      const curve = new Float32Array(256)
      for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.tanh(x * (1 + saturation * 2)) / Math.tanh(1 + saturation * 2) }
      ws.curve = curve
      const hissLen = off.sampleRate * 2
      const hbuf = off.createBuffer(1, hissLen, off.sampleRate)
      const hd = hbuf.getChannelData(0)
      for (let i = 0; i < hissLen; i++) hd[i] = Math.random() * 2 - 1
      const hissSrc = off.createBufferSource(); hissSrc.buffer = hbuf; hissSrc.loop = true
      const hp = off.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000
      const hissG = off.createGain(); hissG.gain.value = hiss * 0.03
      src.connect(delay); delay.connect(ws); src.connect(ws); ws.connect(off.destination)
      hissSrc.connect(hp).connect(hissG).connect(off.destination)
      lfo.start(); hissSrc.start(); src.start()
      const out = await off.startRendering()
      downloadBlob(encodeWav(out), `${song.title.replace(/[^\w\u00C0-\uFFFF]+/g, '_')}_kaset.wav`)
      emitToast('Kaset efekti uygulandı ✓', 'success')
    } catch { emitToast('İşleme başarısız', 'error') } finally { setBusy(false) }
  }
  const sliders: [string, number, (v: number) => void, number][] = [
    ['Wow/flutter (titreşim)', wobble, setWobble, 2], ['Tıslama', hiss, setHiss, 1], ['Doygunluk', saturation, setSaturation, 1],
  ]
  return (
    <div className="max-w-md space-y-4">
      <SongPicker pool={pool} value={songId} onChange={setSongId} />
      {sliders.map(([label, val, set, max]) => (
        <div key={label}>
          <p className="text-xs text-surface-400 mb-1">{label}: {val.toFixed(2)}</p>
          <input type="range" min={0} max={max} step={0.01} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full accent-cyan-400" />
        </div>
      ))}
      <button onClick={render} disabled={busy} className="w-full py-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-sm font-bold disabled:opacity-50">{busy ? 'Bant dönüyor…' : 'Kaset versiyonunu indir'}</button>
    </div>
  )
}

/* 43 — Ortam Akustiği */
function RoomTool({ pool }: { pool: Song[] }) {
  const [songId, setSongId] = useState('')
  const [size, setSize] = useState(1.2)
  const [wet, setWet] = useState(0.4)
  const [busy, setBusy] = useState(false)
  const render = async () => {
    const song = pool.find((s) => s.id === songId)
    if (!song || !song.audio_url) { emitToast('Şarkı seç', 'error'); return }
    setBusy(true)
    try {
      const buf = await fetchAudioBuffer(song.audio_url)
      const irLen = Math.floor(buf.sampleRate * size)
      const ir = new AudioBuffer({ numberOfChannels: 2, length: irLen, sampleRate: buf.sampleRate })
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let decay = 1; for (let i = 0; i < irLen; i++) { d[i] = (Math.random() * 2 - 1) * decay; decay *= 0.9985 } }
      const off = new OfflineAudioContext(2, buf.length, buf.sampleRate)
      const src = off.createBufferSource(); src.buffer = buf
      const dry = off.createGain(); const wetG = off.createGain()
      dry.gain.value = 1 - wet; wetG.gain.value = wet
      const conv = off.createConvolver(); conv.buffer = ir
      const low = off.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 4000
      src.connect(dry).connect(off.destination)
      src.connect(conv).connect(low).connect(wetG).connect(off.destination)
      src.start()
      const out = await off.startRendering()
      downloadBlob(encodeWav(out), `${song.title.replace(/[^\w\u00C0-\uFFFF]+/g, '_')}_oda.wav`)
      emitToast('Oda akustiği uygulandı ✓', 'success')
    } catch { emitToast('İşleme başarısız', 'error') } finally { setBusy(false) }
  }
  return (
    <div className="max-w-md space-y-4">
      <SongPicker pool={pool} value={songId} onChange={setSongId} />
      <div>
        <p className="text-xs text-surface-400 mb-1">Oda boyutu: {size.toFixed(1)} sn</p>
        <input type="range" min={0.2} max={3} step={0.1} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-cyan-400" />
      </div>
      <div>
        <p className="text-xs text-surface-400 mb-1">Yankı oranı: {Math.round(wet * 100)}%</p>
        <input type="range" min={0} max={1} step={0.05} value={wet} onChange={(e) => setWet(Number(e.target.value))} className="w-full accent-cyan-400" />
      </div>
      <button onClick={render} disabled={busy} className="w-full py-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-sm font-bold disabled:opacity-50">{busy ? 'Yankı hesaplanıyor…' : 'Oda akustiğini indir'}</button>
    </div>
  )
}

/* 49 — BPM & Ton */
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
function AnalyzeTool({ pool }: { pool: Song[] }) {
  const [songId, setSongId] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ bpm: number; key: string; mode: string; confidence: number } | null>(null)
  const analyze = async () => {
    const song = pool.find((s) => s.id === songId)
    if (!song || !song.audio_url) { emitToast('Şarkı seç', 'error'); return }
    setBusy(true); setResult(null)
    try {
      const buf = await fetchAudioBuffer(song.audio_url)
      const data = buf.getChannelData(0)
      const sr = buf.sampleRate
      const hop = Math.floor(sr * 0.0232)
      const nFrames = Math.max(1, Math.floor((data.length - hop) / hop))
      const energy: number[] = []
      for (let i = 0; i < nFrames; i++) {
        let e = 0
        for (let j = 0; j < hop; j++) { const v = data[i * hop + j]; e += v * v }
        energy.push(e / hop)
      }
      const onset: number[] = []
      for (let i = 1; i < energy.length; i++) onset.push(Math.max(0, energy[i] - energy[i - 1]))
      let bpm = 0, bestScore = 0
      for (let b = 50; b <= 200; b++) {
        const lag = Math.round(sr * 60 / b / hop)
        if (lag < 2) continue
        let score = 0
        for (let i = 0; i < onset.length - lag; i++) score += onset[i] * onset[i + lag]
        const norm = score / onset.length
        if (norm > bestScore) { bestScore = norm; bpm = b }
      }
      const chroma = new Array(12).fill(0)
      const nfft = 2048
      const windowFn = new Float32Array(nfft)
      for (let i = 0; i < nfft; i++) windowFn[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (nfft - 1)))
      for (let start = 0; start + nfft < data.length; start += hop) {
        const re = new Float32Array(nfft); const im = new Float32Array(nfft)
        for (let i = 0; i < nfft; i++) re[i] = data[start + i] * windowFn[i]
        const step = 2 * Math.PI / nfft
        for (let k = 0; k < nfft / 2; k++) {
          let r = 0, imAcc = 0
          for (let i = 0; i < nfft; i++) { r += re[i] * Math.cos(step * k * i); imAcc -= re[i] * Math.sin(step * k * i) }
          const freq = k * sr / nfft
          if (freq < 60 || freq > 4000) continue
          const mag = Math.sqrt(r * r + imAcc * imAcc)
          if (mag > 0) {
            const midi = 69 + 12 * Math.log2(freq / 440)
            if (midi > 0 && midi < 127) chroma[Math.round(midi) % 12] += mag
          }
        }
      }
      const total = chroma.reduce((a, b) => a + b, 0) || 1
      const norm = chroma.map((v) => v / total)
      let bestKey = 0, bestMode = 'major', bestCorr = 0
      for (let root = 0; root < 12; root++) {
        const cmaj = KS_MAJOR.reduce((a, p, i) => a + p * norm[(root + i) % 12], 0)
        const cmin = KS_MINOR.reduce((a, p, i) => a + p * norm[(root + i) % 12], 0)
        if (cmaj > bestCorr) { bestCorr = cmaj; bestKey = root; bestMode = 'major' }
        if (cmin > bestCorr) { bestCorr = cmin; bestKey = root; bestMode = 'minor' }
      }
      setResult({ bpm: bpm || 120, key: NOTE_NAMES[bestKey], mode: bestMode, confidence: Math.min(1, bestCorr) })
    } catch { emitToast('Analiz başarısız', 'error') } finally { setBusy(false) }
  }
  return (
    <div className="max-w-md space-y-4">
      <SongPicker pool={pool} value={songId} onChange={setSongId} />
      <button onClick={analyze} disabled={busy} className="w-full py-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-sm font-bold disabled:opacity-50">{busy ? 'Analiz ediliyor…' : 'Analiz et'}</button>
      {result && (
        <div className="bg-surface-800/60 border border-surface-700 rounded-2xl p-4 grid grid-cols-3 gap-3 text-center">
          <div><p className="text-3xl font-extrabold text-white">{result.bpm}</p><p className="text-xs text-surface-500">BPM</p></div>
          <div><p className="text-3xl font-extrabold text-cyan-300">{result.key}{result.mode === 'minor' ? 'm' : ''}</p><p className="text-xs text-surface-500">Ton</p></div>
          <div><p className="text-3xl font-extrabold text-white">{Math.round(result.confidence * 100)}%</p><p className="text-xs text-surface-500">Güven</p></div>
        </div>
      )}
    </div>
  )
}

/* 140 — Enstrümantal Mod (vokal silme) */
function CenterCancel({ pool }: { pool: Song[] }) {
  const [songId, setSongId] = useState('')
  const [strength, setStrength] = useState(0.7)
  const [playing, setPlaying] = useState(false)
  const { setInstrumentalMode, instrumentalMode } = useStore()
  const [ctxRef, setCtxRef] = useState<{ ac: AudioContext; nodes: AudioNode[] } | null>(null)
  const stop = () => {
    if (ctxRef) { ctxRef.nodes.forEach((n) => { try { (n as any).stop?.() } catch {}; try { n.disconnect() } catch {} }) }
    setCtxRef(null); setPlaying(false)
  }
  const play = async () => {
    const song = pool.find((s) => s.id === songId)
    if (!song || !song.audio_url) { emitToast('Şarkı seç', 'error'); return }
    stop()
    try {
      const ac = await ctx()
      const src = ac.createBufferSource()
      src.buffer = await fetchAudioBuffer(song.audio_url)
      const split = ac.createChannelSplitter(2)
      const gL = ac.createGain(); const gR = ac.createGain()
      gL.gain.value = 1 - strength; gR.gain.value = strength
      const inv = ac.createGain(); inv.gain.value = -1
      const sum = ac.createGain(); sum.gain.value = 1.4
      const merge = ac.createChannelMerger(2)
      src.connect(split)
      split.connect(gL, 0); split.connect(gR, 1); split.connect(inv, 1)
      gL.connect(merge, 0, 0); gL.connect(merge, 0, 1)
      gR.connect(sum); inv.connect(sum); sum.connect(merge, 0, 0); sum.connect(merge, 0, 1)
      merge.connect(ac.destination)
      src.start()
      setCtxRef({ ac, nodes: [src, split, gL, gR, inv, sum, merge] })
      setPlaying(true)
      setInstrumentalMode(true)
      src.onended = () => setPlaying(false)
    } catch { emitToast('Oynatma başarısız', 'error') }
  }
  useEffect(() => () => stop(), [])
  return (
    <div className="max-w-md space-y-4">
      <SongPicker pool={pool} value={songId} onChange={setSongId} />
      <div>
        <p className="text-xs text-surface-400 mb-1">Vokal silme gücü: {Math.round(strength * 100)}%</p>
        <input type="range" min={0.3} max={1} step={0.05} value={strength} onChange={(e) => setStrength(Number(e.target.value))} className="w-full accent-cyan-400" />
      </div>
      <div className="flex gap-2">
        <button onClick={playing ? stop : play} className={`flex-1 py-3 rounded-xl text-sm font-bold ${playing ? 'bg-red-500/20 border border-red-500/40 text-red-300' : 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300'}`}>{playing ? 'Durdur' : 'Önizle'}</button>
        <button onClick={() => setInstrumentalMode(!instrumentalMode)} className={`flex-1 py-3 rounded-xl text-sm font-bold border ${instrumentalMode ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-surface-800 border-surface-700 text-surface-400'}`}>{instrumentalMode ? 'Enstrümantal: AÇIK' : 'Enstrümantal: KAPALI'}</button>
      </div>
      <p className="text-xs text-surface-500">Merkezdeki vokal kanalı ters fazla birleştirilerek azaltılır. Güç arttıkça bas kaybı da artar.</p>
    </div>
  )
}

/* 145 — Highlight A-B Döngüsü */
function ABLoop({ pool }: { pool: Song[] }) {
  const [songId, setSongId] = useState('')
  const [buf, setBuf] = useState<AudioBuffer | null>(null)
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  const [playing, setPlaying] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const srcRef = useRef<AudioBufferSourceNode | null>(null)
  const { setHighlightMode, highlightMode } = useStore()
  const load = async () => {
    const song = pool.find((s) => s.id === songId)
    if (!song || !song.audio_url) { emitToast('Şarkı seç', 'error'); return }
    try {
      const buffer = await fetchAudioBuffer(song.audio_url)
      setBuf(buffer); setA(0); setB(Math.min(10, buffer.duration))
      stopPlay()
    } catch { emitToast('Yükleme başarısız', 'error') }
  }
  useEffect(() => {
    if (!buf || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr
    ctx.scale(dpr, dpr)
    const w = canvas.clientWidth, h = canvas.clientHeight
    const data = buf.getChannelData(0)
    const perPix = Math.floor(data.length / w)
    ctx.fillStyle = '#0f1418'
    ctx.fillRect(0, 0, w, h)
    ctx.beginPath()
    for (let x = 0; x < w; x++) {
      let peak = 0
      for (let i = x * perPix; i < (x + 1) * perPix; i++) { const v = Math.abs(data[i]); if (v > peak) peak = v }
      const y = h / 2 - peak * h * 0.45
      ctx.moveTo(x, h / 2); ctx.lineTo(x, y)
    }
    ctx.strokeStyle = '#22d3ee'
    ctx.stroke()
    const ax = (a / buf.duration) * w, bx = (b / buf.duration) * w
    ctx.fillStyle = 'rgba(34,211,238,0.15)'
    ctx.fillRect(ax, 0, bx - ax, h)
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(ax - 1, 0, 2, h); ctx.fillRect(bx - 1, 0, 2, h)
  }, [buf, a, b])
  const stopPlay = () => { if (srcRef.current) { try { srcRef.current.stop() } catch {} }; srcRef.current = null; setPlaying(false) }
  const playLoop = async () => {
    if (!buf) return
    if (playing) { stopPlay(); return }
    const ac = await ctx()
    const src = ac.createBufferSource()
    src.buffer = buf
    src.loop = true
    src.loopStart = a; src.loopEnd = Math.min(b, buf.duration)
    src.connect(ac.destination)
    src.start(0, a)
    srcRef.current = src
    setPlaying(true)
    setHighlightMode(true)
    src.onended = () => { srcRef.current = null; setPlaying(false) }
  }
  const zoom = (factor: number) => {
    if (!buf) return
    const span = b - a
    const center = (a + b) / 2
    const ns = Math.max(2, span / factor)
    setA(Math.max(0, center - ns / 2)); setB(Math.min(buf.duration, center + ns / 2))
  }
  return (
    <div className="space-y-4">
      <div className="max-w-md"><SongPicker pool={pool} value={songId} onChange={setSongId} /></div>
      <button onClick={load} className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-sm font-semibold">Dalga formunu yükle</button>
      {buf && (
        <div>
          <canvas ref={canvasRef} className="w-full h-28 bg-surface-900 rounded-xl border border-surface-700 cursor-pointer" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const t = ((e.clientX - rect.left) / rect.width) * buf.duration
            if (Math.abs(t - a) > Math.abs(t - b)) setB(t); else setA(t)
          }} />
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-amber-300 font-mono">A: {a.toFixed(1)}s</span>
            <span className="text-xs text-cyan-300 font-mono">B: {b.toFixed(1)}s</span>
            <button onClick={() => zoom(2)} className="px-3 py-1 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-300">Yakınlaş</button>
            <button onClick={() => zoom(0.5)} className="px-3 py-1 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-300">Uzaklaş</button>
            <button onClick={playLoop} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${playing ? 'bg-red-500/20 border border-red-500/40 text-red-300' : 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300'}`}>{playing ? 'Durdur' : 'Döngüyü çal'}</button>
            <button onClick={() => setHighlightMode(!highlightMode)} className={`px-4 py-1.5 rounded-lg text-xs font-bold border ${highlightMode ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-surface-800 border-surface-700 text-surface-400'}`}>{highlightMode ? 'Highlight: AÇIK' : 'Highlight: KAPALI'}</button>
          </div>
          <p className="text-xs text-surface-500 mt-2">Dalga formuna tıkla — en yakın uç (A/B) taşınır. A ve B arası sonsuz döngü.</p>
        </div>
      )}
    </div>
  )
}

/* 95 — EQ Çizimi: eğri çizerek ekolayzer ayarla */
const EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
function EqDrawTool() {
  const { equalizer, setEqualizer } = useStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const curveRef = useRef<number[]>([])
  const W = 640, H = 240, PAD = 28
  const bands = equalizer.bands || defaultEqBands()
  const bandX = (i: number) => PAD + (i * (W - PAD * 2)) / 9
  const yToVal = (y: number) => Math.max(-10, Math.min(10, Math.round((10 - (y - PAD) / ((H - PAD * 2) / 20)) * 10) / 10))
  const valToY = (v: number) => PAD + (10 - v) * ((H - PAD * 2) / 20)

  function draw(vals: number[]) {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0b1220'
    ctx.fillRect(0, 0, W, H)
    for (let g = 0; g <= 4; g++) {
      const v = -10 + g * 5
      const y = valToY(v)
      ctx.strokeStyle = v === 0 ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.12)'
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
      ctx.fillStyle = 'rgba(148,163,184,0.6)'
      ctx.font = '10px monospace'
      ctx.fillText(`${v > 0 ? '+' : ''}${v}`, 4, y + 3)
    }
    ctx.fillStyle = 'rgba(34,211,238,0.8)'
    ctx.font = '9px monospace'
    EQ_FREQS.forEach((f, i) => ctx.fillText(f >= 1000 ? `${f / 1000}k` : String(f), bandX(i) - 8, H - 8))
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    vals.forEach((v, i) => { const x = bandX(i), y = valToY(v); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y) })
    ctx.stroke()
    ctx.lineTo(bandX(9), valToY(vals[9])); ctx.lineTo(bandX(9), valToY(0)); ctx.lineTo(bandX(0), valToY(0)); ctx.closePath()
    ctx.fillStyle = 'rgba(34,211,238,0.08)'
    ctx.fill()
    vals.forEach((v, i) => {
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(bandX(i), valToY(v), 3.5, 0, Math.PI * 2); ctx.fill()
    })
  }
  useEffect(() => { if (!drawing.current) draw(bands) }, [bands])

  function onMove(e: React.PointerEvent) {
    if (!drawing.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    const y = ((e.clientY - rect.top) / rect.height) * H
    const i = Math.max(0, Math.min(9, Math.round((x - PAD) / ((W - PAD * 2) / 9))))
    const curve = [...curveRef.current]
    curve[i] = yToVal(y)
    let lastSet = i
    for (let j = i - 1; j >= 0; j--) { if (curve[j] !== null) { for (let k = j + 1; k < lastSet; k++) curve[k] = curve[j] + ((curve[lastSet] - curve[j]) * (k - j)) / (lastSet - j); break } }
    for (let j = i + 1; j < 10; j++) { if (curve[j] !== null) { for (let k = lastSet + 1; k < j; k++) curve[k] = curve[lastSet] + ((curve[j] - curve[lastSet]) * (k - lastSet)) / (j - lastSet); break } }
    curveRef.current = curve
    draw(curve)
    setEqualizer({ ...equalizer, bands: curve })
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">🎨 Ekolayzer Eğrisi Çiz</p>
        <div className="flex gap-2">
          <button onClick={() => setEqualizer({ ...equalizer, bands: defaultEqBands() })} className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-400 hover:text-white">Sıfırla</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={W} height={H}
        className="w-full h-48 rounded-xl border border-surface-700 cursor-crosshair touch-none"
        onPointerDown={(e) => { drawing.current = true; curveRef.current = [...(equalizer.bands || defaultEqBands())]; (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId); onMove(e) }}
        onPointerMove={onMove}
        onPointerUp={() => { drawing.current = false }}
      />
      <p className="text-xs text-surface-500">Eğriyi sürükleyerek çiz — 10 bant (31 Hz – 16 kHz) anında güncellenir. Müzik çalarken deneyin.</p>
    </div>
  )
}
