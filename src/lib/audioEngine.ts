import type { EqualizerSettings } from '@/types'
import { EQ_BAND_FREQS, defaultEqBands } from '@/types'

type Deck = {
  audio: HTMLAudioElement
  source: MediaElementAudioSourceNode | null
  gain: GainNode | null
  filters: BiquadFilterNode[]
  url: string
  generation: number
  ready: Promise<void> | null
}

type EngineEvents = {
  timeupdate: (time: number) => void
  durationchange: (duration: number) => void
  play: () => void
  pause: () => void
  ended: () => void
  waiting: () => void
  error: (error: Error) => void
}

const EMPTY_DATA = new Uint8Array(128)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** One Web Audio graph and two reusable media decks for gapless, real crossfades. */
class AudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private analyser: AnalyserNode | null = null
  private leftAnalyser: AnalyserNode | null = null
  private rightAnalyser: AnalyserNode | null = null
  private splitter: ChannelSplitterNode | null = null
  private analysisSink: GainNode | null = null
  private decks: Deck[] = []
  private activeIndex = -1
  private volume = 0.7
  private rate = 1
  private peakProtection = false
  private eqBands = defaultEqBands()
  private frequencyData = new Uint8Array(128)
  private leftData = new Uint8Array(128)
  private rightData = new Uint8Array(128)
  private events = new Map<keyof EngineEvents, Set<(value?: any) => void>>()
  private onTimeupdate: ((time: number) => void) | null = null
  private onEnded: (() => void) | null = null
  private fadeTimer: number | null = null

  get currentUrl() { return this.activeIndex < 0 ? '' : this.decks[this.activeIndex]?.url || '' }
  get isPlayingState() { return this.isPlaying() }

  private emit<K extends keyof EngineEvents>(name: K, value?: Parameters<EngineEvents[K]>[0]) {
    this.events.get(name)?.forEach((listener) => listener(value))
    if (name === 'timeupdate' && typeof value === 'number') this.onTimeupdate?.(value)
    if (name === 'ended') this.onEnded?.()
  }

  on<K extends keyof EngineEvents>(name: K, listener: EngineEvents[K]) {
    const listeners = this.events.get(name) || new Set()
    listeners.add(listener as (value?: any) => void)
    this.events.set(name, listeners)
    return () => listeners.delete(listener as (value?: any) => void)
  }

  setOnTimeupdate(fn: ((time: number) => void) | null) { this.onTimeupdate = fn }
  setOnEnded(fn: (() => void) | null) { this.onEnded = fn }

  private ensureGraph() {
    if (this.context && this.decks.length === 2) return
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextCtor) throw new Error('Web Audio bu cihazda desteklenmiyor.')

    this.context = new AudioContextCtor()
    this.master = this.context.createGain()
    this.compressor = this.context.createDynamicsCompressor()
    this.compressor.threshold.value = -3
    this.compressor.knee.value = 8
    this.compressor.ratio.value = 3
    this.compressor.attack.value = 0.004
    this.compressor.release.value = 0.18
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.78
    this.leftAnalyser = this.context.createAnalyser()
    this.rightAnalyser = this.context.createAnalyser()
    this.leftAnalyser.fftSize = 256
    this.rightAnalyser.fftSize = 256
    this.splitter = this.context.createChannelSplitter(2)
    this.analysisSink = this.context.createGain()
    this.analysisSink.gain.value = 0
    this.master.connect(this.splitter)
    this.splitter.connect(this.leftAnalyser, 0)
    this.splitter.connect(this.rightAnalyser, 1)
    this.leftAnalyser.connect(this.analysisSink)
    this.rightAnalyser.connect(this.analysisSink)
    this.analysisSink.connect(this.context.destination)
    this.master.gain.value = this.volume
    this.connectOutput()

    this.decks = [0, 1].map((index) => {
      const audio = new Audio()
      audio.preload = 'auto'
      audio.crossOrigin = 'anonymous'
      const deck: Deck = { audio, source: null, gain: null, filters: [], url: '', generation: 0, ready: null }
      audio.addEventListener('timeupdate', () => {
        if (this.decks[this.activeIndex] === deck) this.emit('timeupdate', audio.currentTime)
      })
      audio.addEventListener('durationchange', () => {
        if (this.decks[this.activeIndex] === deck) this.emit('durationchange', Number.isFinite(audio.duration) ? audio.duration : 0)
      })
      audio.addEventListener('playing', () => {
        if (this.decks[this.activeIndex] === deck) this.emit('play')
      })
      audio.addEventListener('pause', () => {
        if (this.decks[this.activeIndex] === deck && !this.isPlaying()) this.emit('pause')
      })
      audio.addEventListener('waiting', () => {
        if (this.decks[this.activeIndex] === deck) this.emit('waiting')
      })
      audio.addEventListener('ended', () => {
        if (this.decks[this.activeIndex] === deck) this.emit('ended')
      })
      audio.addEventListener('error', () => {
        if (this.decks[this.activeIndex] === deck) {
          const detail = audio.error?.message || 'Ses kaynağı açılamadı.'
          this.emit('error', new Error(detail))
        }
      })
      const source = this.context!.createMediaElementSource(audio)
      const filters = EQ_BAND_FREQS.map((frequency, i) => {
        const filter = this.context!.createBiquadFilter()
        filter.type = i === 0 ? 'lowshelf' : i === EQ_BAND_FREQS.length - 1 ? 'highshelf' : 'peaking'
        filter.frequency.value = Math.min(frequency, this.context!.sampleRate / 2 - 1)
        filter.Q.value = i === 0 || i === EQ_BAND_FREQS.length - 1 ? 0.7 : 1.1
        filter.gain.value = this.eqBands[i] || 0
        return filter
      })
      const gain = this.context!.createGain()
      gain.gain.value = index === 0 ? 1 : 0
      source.connect(filters[0])
      for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1])
      filters[filters.length - 1].connect(gain)
      gain.connect(this.master!)
      return { ...deck, source, filters, gain }
    })
  }

  private connectOutput() {
    if (!this.master || !this.context || !this.analyser || !this.compressor) return
    this.master.disconnect()
    this.compressor.disconnect()
    this.analyser.disconnect()
    if (this.peakProtection) {
      this.master.connect(this.compressor)
      this.compressor.connect(this.analyser)
    } else {
      this.master.connect(this.analyser)
    }
    this.analyser.connect(this.context.destination)
    this.master.connect(this.splitter!)
  }

  private async unlock() {
    this.ensureGraph()
    if (this.context?.state === 'suspended') await this.context.resume()
  }

  private cancelFade() {
    if (this.fadeTimer !== null) window.clearTimeout(this.fadeTimer)
    this.fadeTimer = null
  }

  private setDeckGain(deck: Deck, value: number, duration = 0) {
    const param = deck.gain?.gain
    if (!param || !this.context) return
    const now = this.context.currentTime
    param.cancelScheduledValues(now)
    param.setValueAtTime(param.value, now)
    if (duration > 0) param.linearRampToValueAtTime(value, now + duration)
    else param.setValueAtTime(value, now)
  }

  private release(deck: Deck) {
    deck.generation++
    deck.audio.pause()
    deck.audio.removeAttribute('src')
    deck.audio.load()
    if (deck.url.startsWith('blob:')) URL.revokeObjectURL(deck.url)
    deck.url = ''
    deck.ready = null
  }

  private load(deck: Deck, url: string): Promise<void> {
    if (deck.url === url && deck.ready) return deck.ready
    if (deck.url === url && deck.audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve()
    this.release(deck)
    const generation = deck.generation
    deck.url = url
    deck.audio.crossOrigin = 'anonymous'
    const ready = new Promise<void>((resolve, reject) => {
      let timeout = 0
      const clean = () => {
        deck.audio.removeEventListener('canplay', onReady)
        deck.audio.removeEventListener('error', onError)
        window.clearTimeout(timeout)
      }
      const onReady = () => { clean(); resolve() }
      const onError = () => { clean(); reject(new Error(deck.audio.error?.message || 'Ses kaynağı yüklenemedi.')) }
      deck.audio.addEventListener('canplay', onReady, { once: true })
      deck.audio.addEventListener('error', onError, { once: true })
      timeout = window.setTimeout(() => { clean(); reject(new Error('Ses kaynağı zamanında yüklenemedi.')) }, 25000)
      deck.audio.src = url
      deck.audio.load()
    }).then(() => {
      if (deck.generation !== generation) throw new DOMException('Kaynak değiştirildi.', 'AbortError')
    }).catch((error) => {
      if (deck.generation === generation) deck.ready = null
      throw error
    })
    deck.ready = ready
    return ready
  }

  async prepare(url: string) {
    if (!url) throw new Error('Ses adresi boş.')
    await this.unlock()
    const targetIndex = this.activeIndex === 0 ? 1 : 0
    const deck = this.decks[targetIndex]
    this.setDeckGain(deck, 0)
    await this.load(deck, url)
    return targetIndex
  }

  discardPrepared(url: string) {
    const deck = this.decks.find((item) => item.url === url && item !== this.decks[this.activeIndex])
    if (deck) this.release(deck)
  }

  async play(url: string) {
    if (!url) throw new Error('Ses adresi boş.')
    await this.unlock()
    if (this.currentUrl === url && this.activeIndex >= 0) {
      await this.decks[this.activeIndex].audio.play()
      return
    }
    const oldIndex = this.activeIndex
    const targetIndex = oldIndex < 0 ? 0 : 1 - oldIndex
    const deck = this.decks[targetIndex]
    this.emit('waiting')
    await this.load(deck, url)
    deck.audio.playbackRate = this.rate
    deck.audio.currentTime = 0
    await deck.audio.play()
    this.cancelFade()
    this.activeIndex = targetIndex
    this.setDeckGain(deck, 1, oldIndex >= 0 ? 0.025 : 0)
    if (oldIndex >= 0) {
      const oldDeck = this.decks[oldIndex]
      const oldGeneration = oldDeck.generation
      this.setDeckGain(oldDeck, 0, 0.025)
      window.setTimeout(() => {
        if (oldDeck.generation === oldGeneration && oldDeck !== this.decks[this.activeIndex]) this.release(oldDeck)
      }, 60)
    }
    this.emit('play')
    this.emit('durationchange', this.getDuration())
  }

  async crossfade(url: string, duration = 3) {
    if (!url) throw new Error('Ses adresi boş.')
    await this.unlock()
    if (this.activeIndex < 0 || !this.isPlaying()) return this.play(url)
    if (this.currentUrl === url) return
    const oldIndex = this.activeIndex
    const nextIndex = 1 - oldIndex
    const incoming = this.decks[nextIndex]
    const outgoing = this.decks[oldIndex]
    this.emit('waiting')
    await this.load(incoming, url)
    incoming.audio.playbackRate = this.rate
    incoming.audio.currentTime = 0
    this.setDeckGain(incoming, 0)
    await incoming.audio.play()
    this.cancelFade()
    const fadeSeconds = clamp(duration, 0.25, 12)
    const start = this.context!.currentTime
    const oldParam = outgoing.gain!.gain
    const newParam = incoming.gain!.gain
    try {
      oldParam.cancelScheduledValues(start)
      newParam.cancelScheduledValues(start)
      oldParam.setValueAtTime(oldParam.value, start)
      newParam.setValueAtTime(0, start)
      const points = 48
      const outCurve = new Float32Array(points)
      const inCurve = new Float32Array(points)
      for (let i = 0; i < points; i++) {
        const angle = (i / (points - 1)) * Math.PI / 2
        outCurve[i] = Math.cos(angle)
        inCurve[i] = Math.sin(angle)
      }
      oldParam.setValueCurveAtTime(outCurve, start, fadeSeconds)
      newParam.setValueCurveAtTime(inCurve, start, fadeSeconds)
    } catch (error) {
      incoming.audio.pause()
      this.setDeckGain(incoming, 0)
      this.setDeckGain(outgoing, 1, 0.02)
      throw error
    }
    this.activeIndex = nextIndex
    this.emit('play')
    this.emit('durationchange', this.getDuration())
    const outgoingGeneration = outgoing.generation
    this.fadeTimer = window.setTimeout(() => {
      if (outgoing.generation === outgoingGeneration && outgoing !== this.decks[this.activeIndex]) this.release(outgoing)
      this.fadeTimer = null
    }, fadeSeconds * 1000 + 80)
  }

  pause() {
    this.decks.forEach((deck) => deck.audio.pause())
    this.emit('pause')
  }

  async resume() {
    if (this.activeIndex < 0) return
    try {
      await this.unlock()
      await this.decks[this.activeIndex].audio.play()
      this.emit('play')
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error('Oynatma başlatılamadı.'))
    }
  }

  stop() {
    this.cancelFade()
    this.decks.forEach((deck) => this.release(deck))
    this.activeIndex = -1
    this.emit('pause')
  }

  seek(time: number) {
    if (this.activeIndex < 0 || !Number.isFinite(time)) return
    const audio = this.decks[this.activeIndex].audio
    const upper = Number.isFinite(audio.duration) ? audio.duration : Math.max(0, time)
    try { audio.currentTime = clamp(time, 0, upper) } catch { /* metadata not ready yet */ }
  }

  setVolume(value: number) {
    this.volume = clamp(Number.isFinite(value) ? value : 0, 0, 1)
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.015)
  }

  setPlaybackRate(value: number) {
    this.rate = clamp(Number.isFinite(value) ? value : 1, 0.5, 2)
    this.decks.forEach((deck) => { deck.audio.playbackRate = this.rate })
  }

  setPeakProtection(enabled: boolean) {
    if (this.peakProtection === enabled) return
    this.peakProtection = enabled
    if (this.context) this.connectOutput()
  }

  applyEqualizer(settings: EqualizerSettings) {
    const bands = settings.bands || defaultEqBands()
    this.eqBands = EQ_BAND_FREQS.map((_, index) => clamp(Number(bands[index] || 0), -12, 12))
    this.decks.forEach((deck) => deck.filters.forEach((filter, index) => {
      if (this.context) filter.gain.setTargetAtTime(this.eqBands[index], this.context.currentTime, 0.025)
    }))
  }

  /** Kept for source compatibility with an obsolete screen; unsupported effects are intentionally removed. */
  setEffects(_effects: unknown) { /* The active UI no longer exposes unimplemented DSP controls. */ }

  isPlaying() { return this.activeIndex >= 0 && !this.decks[this.activeIndex].audio.paused }
  getCurrentTime() { return this.activeIndex < 0 ? 0 : this.decks[this.activeIndex].audio.currentTime || 0 }
  getDuration() {
    if (this.activeIndex < 0) return 0
    const duration = this.decks[this.activeIndex].audio.duration
    return Number.isFinite(duration) ? duration : 0
  }

  getAnalyserData() {
    if (!this.analyser) return EMPTY_DATA.slice()
    if (this.frequencyData.length !== this.analyser.frequencyBinCount) this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(this.frequencyData)
    return this.frequencyData
  }

  getStereoData() {
    if (!this.leftAnalyser || !this.rightAnalyser) return { l: EMPTY_DATA.slice(), r: EMPTY_DATA.slice() }
    if (this.leftData.length !== this.leftAnalyser.frequencyBinCount) this.leftData = new Uint8Array(this.leftAnalyser.frequencyBinCount)
    if (this.rightData.length !== this.rightAnalyser.frequencyBinCount) this.rightData = new Uint8Array(this.rightAnalyser.frequencyBinCount)
    this.leftAnalyser.getByteTimeDomainData(this.leftData)
    this.rightAnalyser.getByteTimeDomainData(this.rightData)
    return { l: this.leftData, r: this.rightData }
  }
}

export const audioEngine = new AudioEngine()
