export interface Soundscape {
  key: string
  label: string
  emoji: string
  gradient: string
  desc: string
}

export const SOUNDSCAPES: Soundscape[] = [
  { key: 'rain', label: 'Yağmur', emoji: '🌧️', gradient: 'from-sky-600 to-blue-800', desc: 'Hafif yağmur ve damla sesleri' },
  { key: 'ocean', label: 'Okyanus', emoji: '🌊', gradient: 'from-cyan-500 to-blue-700', desc: 'Dalgaların ritmik vuruşu' },
  { key: 'wind', label: 'Rüzgar', emoji: '🍃', gradient: 'from-emerald-500 to-teal-700', desc: 'Esintiler arasında süzülen rüzgar' },
  { key: 'fire', label: 'Şömine', emoji: '🔥', gradient: 'from-orange-500 to-red-700', desc: 'Çıtırdayan ateş sesleri' },
  { key: 'forest', label: 'Orman', emoji: '🌲', gradient: 'from-green-600 to-emerald-900', desc: 'Kuş cıvıltıları ve yaprak hışırtısı' },
  { key: 'sleep', label: 'Uyku', emoji: '🌙', gradient: 'from-indigo-700 to-slate-900', desc: 'Derin uykuya dalma frekansları' },
]

let ctx: AudioContext | null = null
let master: GainNode | null = null
let activeKey: string | null = null
let activeNodes: { stop: () => void }[] = []
let timers: number[] = []
let volume = 0.6

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') ctx.resume()
    if (!master) {
      master = ctx.createGain()
      master.gain.value = volume
      master.connect(ctx.destination)
    }
    return ctx
  } catch { return null }
}

function noiseBuffer(c: AudioContext, color: 'white' | 'pink' | 'brown', seconds = 4): AudioBuffer {
  const length = Math.floor(c.sampleRate * seconds)
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (color === 'white') {
      data[i] = white
    } else if (color === 'pink') {
      b0 = 0.99765 * b0 + white * 0.0990460
      b1 = 0.96300 * b1 + white * 0.2965164
      b2 = 0.57000 * b2 + white * 1.0526913
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.15
    } else {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
  }
  return buffer
}

function loopNoise(c: AudioContext, color: 'white' | 'pink' | 'brown'): AudioBufferSourceNode {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, color)
  src.loop = true
  return src
}

function makeBlip(c: AudioContext, color: 'white' | 'brown', ms: number, filterType: BiquadFilterType, freq: number, q = 1, peak = 0.2): AudioBufferSourceNode {
  const src = c.createBufferSource()
  const length = Math.floor(c.sampleRate * (ms / 1000))
  const buf = c.createBuffer(1, length, c.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const w = Math.random() * 2 - 1
    if (color === 'brown') { last = (last + 0.02 * w) / 1.02; data[i] = last * 3.5 }
    else data[i] = w
  }
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = filterType
  filter.frequency.value = freq
  filter.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(0, c.currentTime)
  g.gain.linearRampToValueAtTime(peak, c.currentTime + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ms / 1000)
  src.connect(filter); filter.connect(g)
  return src
}

function startRain(c: AudioContext) {
  const src = loopNoise(c, 'white')
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'; hp.frequency.value = 700
  const g = c.createGain(); g.gain.value = 0.05
  src.connect(hp); hp.connect(g); g.connect(master!)
  src.start()
  activeNodes.push({ stop: () => { src.stop() } })

  const drop = () => {
    if (activeKey !== 'rain') return
    const blip = makeBlip(c, 'white', 20, 'highpass', 2500, 1.5, 0.04)
    const g2 = c.createGain(); g2.gain.value = 0.5
    blip.connect(g2); g2.connect(master!)
    blip.start()
    const t = window.setTimeout(drop, 40 + Math.random() * 160)
    timers.push(t)
  }
  drop()
}

function startOcean(c: AudioContext) {
  const src = loopNoise(c, 'brown')
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'; lp.frequency.value = 500
  const g = c.createGain(); g.gain.value = 0.15
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.07
  const lfoGain = c.createGain(); lfoGain.gain.value = 0.08
  src.connect(lp); lp.connect(g); g.connect(master!)
  lfo.connect(lfoGain); lfoGain.connect(g.gain)
  src.start(); lfo.start()
  activeNodes.push({ stop: () => { src.stop(); lfo.stop() } })
}

function startWind(c: AudioContext) {
  const src = loopNoise(c, 'pink')
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 0.8
  const g = c.createGain(); g.gain.value = 0.12
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.06
  const lfoGain = c.createGain(); lfoGain.gain.value = 450
  src.connect(bp); bp.connect(g); g.connect(master!)
  lfo.connect(lfoGain); lfoGain.connect(bp.frequency)
  src.start(); lfo.start()
  activeNodes.push({ stop: () => { src.stop(); lfo.stop() } })
}

function startFire(c: AudioContext) {
  const src = loopNoise(c, 'brown')
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'; lp.frequency.value = 900
  const g = c.createGain(); g.gain.value = 0.12
  src.connect(lp); lp.connect(g); g.connect(master!)
  src.start()
  activeNodes.push({ stop: () => { src.stop() } })

  const crackle = () => {
    if (activeKey !== 'fire') return
    const blip = makeBlip(c, 'white', 8 + Math.random() * 25, 'highpass', 2500, 2, 0.03 + Math.random() * 0.05)
    blip.connect(master!)
    blip.start()
    const t = window.setTimeout(crackle, 60 + Math.random() * 220)
    timers.push(t)
  }
  crackle()
}

function startForest(c: AudioContext) {
  const src = loopNoise(c, 'pink')
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'; lp.frequency.value = 1600
  const g = c.createGain(); g.gain.value = 0.05
  src.connect(lp); lp.connect(g); g.connect(master!)
  src.start()
  activeNodes.push({ stop: () => { src.stop() } })

  const chirp = () => {
    if (activeKey !== 'forest') return
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(2200 + Math.random() * 2000, c.currentTime)
    const g2 = c.createGain()
    g2.gain.setValueAtTime(0, c.currentTime)
    g2.gain.linearRampToValueAtTime(0.02, c.currentTime + 0.02)
    g2.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12 + Math.random() * 0.15)
    osc.connect(g2); g2.connect(master!)
    osc.start(); osc.stop(c.currentTime + 0.3)
    const t = window.setTimeout(chirp, 900 + Math.random() * 2500)
    timers.push(t)
  }
  chirp()
}

function startSleep(c: AudioContext) {
  const src = loopNoise(c, 'brown')
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'; lp.frequency.value = 300
  const g = c.createGain(); g.gain.value = 0.08
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.04
  const lfoGain = c.createGain(); lfoGain.gain.value = 0.03
  src.connect(lp); lp.connect(g); g.connect(master!)
  lfo.connect(lfoGain); lfoGain.connect(g.gain)
  src.start(); lfo.start()
  activeNodes.push({ stop: () => { src.stop(); lfo.stop() } })
}

const STARTERS: Record<string, (c: AudioContext) => void> = {
  rain: startRain,
  ocean: startOcean,
  wind: startWind,
  fire: startFire,
  forest: startForest,
  sleep: startSleep,
}

export function startSoundscape(key: string): boolean {
  const c = ensureCtx()
  if (!c || !STARTERS[key]) return false
  stopSoundscape()
  activeKey = key
  STARTERS[key](c)
  return true
}

export function stopSoundscape() {
  activeKey = null
  activeNodes.forEach((n) => { try { n.stop() } catch {} })
  activeNodes = []
  timers.forEach((t) => clearTimeout(t))
  timers = []
}

export function getActiveSoundscape(): string | null {
  return activeKey
}

export function setSoundscapeVolume(v: number) {
  volume = v
  if (master && ctx) {
    master.gain.setTargetAtTime(v, ctx.currentTime, 0.05)
  }
}
