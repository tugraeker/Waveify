import type { EqualizerSettings, AudioEffects } from '@/types'

const FADE_DURATION = 0.3

class AudioEngine {
  private ctx: AudioContext | null = null
  private audio: HTMLAudioElement | null = null
  private source: MediaElementAudioSourceNode | null = null

  private eqFilters: BiquadFilterNode[] = []
  private gainNode: GainNode | null = null
  private analyserNode: AnalyserNode | null = null
  private bassFilter: BiquadFilterNode | null = null
  private reverbWet: GainNode | null = null
  private delayWet: GainNode | null = null
  private midGain: GainNode | null = null
  private sideGain: GainNode | null = null
  private convolver: ConvolverNode | null = null
  private panner: StereoPannerNode | null = null
  private _effects: AudioEffects = { bass: 0, reverb: 0, spatial: 0, vocal: 0, vocalIso: false, eightD: 0 }

  private onTimeupdate: ((t: number) => void) | null = null
  private onEnded: (() => void) | null = null

  private _volume = 0.7
  private _currentUrl = ''
  private _isPlaying = false
  private _intendedToPlay = false
  private _fadeFrame = 0
  private _normalize = false
  private _eightDInterval: number | null = null

  get volume() { return this._volume }
  get currentUrl() { return this._currentUrl }
  get isPlayingState() { return this._isPlaying }

  private ensureCtx() {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  private ensureGraph() {
    if (this.ctx) return
    this.ensureCtx()
    const c = this.ctx!
    this.gainNode = c.createGain()
    this.gainNode.gain.value = this._volume
    this.panner = c.createStereoPanner()
    this.panner.pan.value = 0
    this.analyserNode = c.createAnalyser()
    this.analyserNode.fftSize = 256
    this.gainNode.connect(this.panner)
    this.panner.connect(this.analyserNode)
    this.analyserNode.connect(c.destination)
    this.createEqFilters(c)
    this.createEffects(c)
    this.createVocalStage(c)
  }

  private createEffects(ctx: AudioContext) {
    this.bassFilter = ctx.createBiquadFilter()
    this.bassFilter.type = 'lowshelf'
    this.bassFilter.frequency.value = 150
    this.bassFilter.gain.value = 0

    const length = Math.floor(ctx.sampleRate * 1.8)
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.4)
      }
    }
    const convolver = ctx.createConvolver()
    convolver.buffer = impulse
    convolver.normalize = true
    this.convolver = convolver

    this.reverbWet = ctx.createGain()
    this.reverbWet.gain.value = 0
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.018
    const feedback = ctx.createGain()
    feedback.gain.value = 0.35
    this.delayWet = ctx.createGain()
    this.delayWet.gain.value = 0

    if (this.eqFilters.length > 0) {
      this.eqFilters[this.eqFilters.length - 1].disconnect(this.gainNode!)
      this.eqFilters[this.eqFilters.length - 1].connect(this.bassFilter)
    }
    this.bassFilter.connect(this.gainNode!)
    this.bassFilter.connect(convolver)
    convolver.connect(this.reverbWet)
    this.reverbWet.connect(this.gainNode!)
    this.bassFilter.connect(delay)
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(this.delayWet)
    this.delayWet.connect(this.gainNode!)

    this.bassFilter.gain.value = this._effects.bass * 1.2
    this.reverbWet.gain.value = this._effects.reverb * 0.6
    this.delayWet.gain.value = this._effects.spatial * 0.5
  }

  // Mid-side vocal stage: full mix = mid + side, karaoke = side only, iso = mid only
  private createVocalStage(ctx: AudioContext) {
    const splitter = ctx.createChannelSplitter(2)
    const midBus = ctx.createChannelMerger(2)
    const sideBus = ctx.createChannelMerger(2)
    const mid = ctx.createGain()
    const side = ctx.createGain()
    const halfL = ctx.createGain(); halfL.gain.value = 0.5
    const halfR = ctx.createGain(); halfR.gain.value = 0.5
    const negR = ctx.createGain(); negR.gain.value = -0.5
    const out = ctx.createGain()

    // mid bus: both channels get (L + R) / 2
    splitter.connect(halfL, 0)
    splitter.connect(halfR, 1)
    halfL.connect(midBus, 0, 0)
    halfL.connect(midBus, 0, 1)
    halfR.connect(midBus, 0, 0)
    halfR.connect(midBus, 0, 1)
    // side bus: both channels get (L - R) / 2
    halfL.connect(sideBus, 0, 0)
    halfL.connect(sideBus, 0, 1)
    splitter.connect(negR, 1)
    negR.connect(sideBus, 0, 0)
    negR.connect(sideBus, 0, 1)

    midBus.connect(mid)
    mid.connect(out)
    sideBus.connect(side)
    side.connect(out)
    out.connect(this.gainNode!)

    this.bassFilter!.connect(splitter)
    this.midGain = mid
    this.sideGain = side
    this.applyVocal(this._effects.vocal || 0, !!this._effects.vocalIso)
  }

  private applyVocal(k: number, iso: boolean) {
    if (!this.midGain || !this.sideGain) return
    const kk = Math.max(0, Math.min(1, k))
    if (iso) {
      this.midGain.gain.value = 1
      this.sideGain.gain.value = 0
    } else {
      this.midGain.gain.value = 0.5 - kk * 0.5
      this.sideGain.gain.value = 0.5 + kk * 0.5
    }
  }

  private applyPanSweep() {
    if (this._eightDInterval) { window.clearInterval(this._eightDInterval); this._eightDInterval = null }
    const level = this._effects.eightD || 0
    const p = this.panner
    if (!p || !this.ctx || level <= 0) { if (p) p.pan.value = 0; return }
    const ctx = this.ctx
    p.pan.value = 0
    this._eightDInterval = window.setInterval(() => {
      if (!ctx || ctx.state !== 'running') return
      const t = ctx.currentTime
      p.pan.value = Math.sin(t * Math.PI * 2 / 9) * level
    }, 90)
  }

  private createEqFilters(ctx: AudioContext) {
    const freqs = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    this.eqFilters = freqs.map((freq) => {
      const filter = ctx.createBiquadFilter()
      filter.type = 'peaking'
      filter.frequency.value = freq
      filter.Q.value = 1.4
      filter.gain.value = 0
      return filter
    })
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1])
    }
    if (this.eqFilters.length > 0) {
      this.eqFilters[this.eqFilters.length - 1].connect(this.gainNode!)
    }
  }

  private cancelFade() {
    if (this._fadeFrame) { cancelAnimationFrame(this._fadeFrame); this._fadeFrame = 0 }
  }

  private fadeTo(target: number, duration: number, onDone?: () => void) {
    this.cancelFade()
    if (!this.gainNode) { onDone?.(); return }
    const start = this.gainNode.gain.value
    const startTime = performance.now()
    const step = () => {
      const elapsed = (performance.now() - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      this.gainNode!.gain.value = start + (target - start) * eased
      if (progress < 1) { this._fadeFrame = requestAnimationFrame(step) }
      else { this._fadeFrame = 0; onDone?.() }
    }
    this._fadeFrame = requestAnimationFrame(step)
  }

  private initAudio() {
    if (this.audio) return
    this.audio = new Audio()
    this.audio.crossOrigin = 'anonymous'
    this.audio.preload = 'auto'
    this.audio.addEventListener('loadedmetadata', () => {
      if (!this._intendedToPlay) return
      this.gainNode!.gain.value = 0
      this.audio!.play()
        .then(() => {
          this._isPlaying = true
          this.fadeTo(this._volume, FADE_DURATION)
        })
        .catch((e) => { console.warn('[Audio] play() rejected:', e) })
    })
    this.audio.addEventListener('timeupdate', () => {
      this.onTimeupdate?.(this.audio!.currentTime)
    })
    this.audio.addEventListener('play', () => {
      this._isPlaying = true
      if (!this.source) {
        try {
          const c = this.ctx || new AudioContext()
          this.ctx = c
          this.source = c.createMediaElementSource(this.audio!)
          if (this.eqFilters.length > 0) {
            this.source.connect(this.eqFilters[0])
          } else {
            this.source.connect(this.gainNode!)
          }
        } catch (e) {
          console.warn('Source connection failed, retrying', e)
        }
      }
    })
    this.audio.addEventListener('ended', () => {
      this._isPlaying = false
      this.onEnded?.()
    })
    this.audio.addEventListener('error', () => {
      console.error('Audio error:', this.audio?.error)
    })
  }

  crossfade(url: string, duration = 3) {
    if (!url || !this.audio || !this.gainNode) { this.play(url); return }
    this.cancelFade()
    const oldAudio = this.audio
    const oldGain = this.gainNode.gain.value
    const oldSource = this.source
    this.fadeTo(0, duration * 0.4, () => {
      if (oldAudio) { oldAudio.pause(); oldAudio.src = '' }
      if (oldSource) { try { oldSource.disconnect() } catch {} }
      this.audio = null
      this.source = null
      this._currentUrl = ''
      this._intendedToPlay = false
      this._isPlaying = false
      this.initAudio()
      this.ensureGraph()
      this._currentUrl = url
      this._intendedToPlay = true
      this.gainNode!.gain.value = 0
      this.audio!.src = url
      this.audio!.load()
      this.audio!.addEventListener('canplay', () => {
        this.audio!.play().then(() => {
          this._isPlaying = true
          this.fadeTo(this._volume, duration * 0.6)
        }).catch(() => {})
      }, { once: true })
    })
  }

  play(url: string, startTime = 0) {
    if (!url) return
    if (this._currentUrl === url && this._isPlaying && !startTime) return
    if (this.audio) {
      this.cancelFade()
      this.audio.pause()
    }
    this._currentUrl = url
    this._intendedToPlay = true
    this.ensureGraph()
    this.initAudio()
    if (this.source) {
      try { this.source.disconnect() } catch {}
      if (this.eqFilters.length > 0) {
        this.source.connect(this.eqFilters[0])
      } else {
        this.source.connect(this.gainNode!)
      }
    }
    if (startTime > 0) this.audio!.currentTime = startTime
    this.gainNode!.gain.value = 0
    this.audio!.src = url
    this.audio!.load()
    if (startTime > 0) {
      this.audio!.addEventListener('loadedmetadata', () => {
        if (this.audio) {
          const seekTo = Math.min(startTime, Math.max(0, (this.audio.duration || startTime) - 0.1))
          if (this.audio.readyState > 0) this.audio.currentTime = seekTo
        }
      }, { once: true })
    }
  }

  stop() {
    this.cancelFade()
    if (this.audio) this.audio.pause()
    this._currentUrl = ''
    this._isPlaying = false
    this._intendedToPlay = false
  }

  pause() {
    if (!this.audio || !this._isPlaying) return
    this._intendedToPlay = false
    this.fadeTo(0, FADE_DURATION, () => {
      this.audio?.pause()
      this._isPlaying = false
    })
  }

  resume() {
    if (!this.audio) return
    this._intendedToPlay = true
    this.ensureCtx()
    this.audio.play().then(() => {
      this._isPlaying = true
      this.fadeTo(this._volume, FADE_DURATION)
    }).catch(() => {})
  }

  seek(time: number) {
    if (this.audio) this.audio.currentTime = time
  }

  getCurrentTime(): number {
    return this.audio?.currentTime || 0
  }

  getDuration(): number {
    return this.audio?.duration || 0
  }

  isPlaying(): boolean {
    return this._isPlaying
  }

  setVolume(vol: number) {
    this._volume = vol
    if (this.gainNode && !this._fadeFrame) this.gainNode.gain.value = vol
  }

  setPlaybackRate(rate: number) {
    if (this.audio) this.audio.playbackRate = rate
  }

  applyEqualizer(settings: EqualizerSettings) {
    if (this.eqFilters.length === 0) {
      setTimeout(() => this.applyEqualizer(settings), 100)
      return
    }
    try {
      if (settings.bands && settings.bands.length === 10) {
        settings.bands.forEach((gain, i) => {
          if (i < this.eqFilters.length) {
            this.eqFilters[i].gain.value = gain * 1.5
          }
        })
      } else {
        this.eqFilters.forEach((f, i) => {
          const map = [3, 5, 7]
          const idx = Math.min(i, map.length - 1)
          const val = idx === 0 ? settings.bass : idx === 1 ? settings.mid : settings.treble
          f.gain.value = val * 2
        })
      }
    } catch (e) {
      console.warn('EQ apply failed:', e)
    }
  }

  setEffects(fx: AudioEffects) {
    this._effects = fx
    try {
      if (this.bassFilter) this.bassFilter.gain.value = fx.bass * 1.2
      if (this.reverbWet) this.reverbWet.gain.value = fx.reverb * 0.6
      if (this.delayWet) this.delayWet.gain.value = fx.spatial * 0.5
      this.applyVocal(fx.vocal || 0, !!fx.vocalIso)
      this.applyPanSweep()
      if (fx.room && this.convolver && this.ctx) {
        this.rebuildRoomImpulse(this.ctx, fx.room)
      }
    } catch {}
  }

  private rebuildRoomImpulse(ctx: AudioContext, preset: 'hall' | 'cathedral' | 'garage' | 'canyon') {
    const mix: Record<string, { decay: number; wet: number }> = {
      hall: { decay: 1.6, wet: 0.35 },
      cathedral: { decay: 3.2, wet: 0.5 },
      garage: { decay: 0.7, wet: 0.25 },
      canyon: { decay: 2.3, wet: 0.4 },
    }
    const p = mix[preset]
    if (!p) return
    const length = Math.floor(ctx.sampleRate * p.decay)
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.2) * (i < 100 ? 0.25 : 1)
      }
    }
    this.convolver!.buffer = impulse
    if (this.reverbWet) {
      this.reverbWet.gain.value = Math.max(this._effects.reverb * 0.6, p.wet * 0.55)
    }
  }

  setNormalize(on: boolean) {
    this._normalize = on
    if (this.gainNode && this._isPlaying) {
      this.fadeTo(this._volume * (on ? 0.85 : 1), 0.4)
    }
  }

  get gaplessFadeReady() { return this._normalize }

  getAnalyserData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(128)
    const data = new Uint8Array(this.analyserNode.frequencyBinCount)
    try { this.analyserNode.getByteFrequencyData(data) } catch {}
    return data
  }

  setOnTimeupdate(fn: (t: number) => void) { this.onTimeupdate = fn }
  setOnEnded(fn: () => void) { this.onEnded = fn }

  destroy() {
    this.stop()
    if (this._eightDInterval) { window.clearInterval(this._eightDInterval); this._eightDInterval = null }
    if (this.audio) { this.audio.src = ''; this.audio = null }
    if (this.source) { try { this.source.disconnect() } catch {}; this.source = null }
    this.eqFilters = []
    this.bassFilter = this.reverbWet = this.delayWet = null
    this.midGain = this.sideGain = null
    this.gainNode = this.analyserNode = null
    this.panner = this.convolver = null
    if (this.ctx) { this.ctx.close(); this.ctx = null }
  }
}

export const audioEngine = new AudioEngine()
