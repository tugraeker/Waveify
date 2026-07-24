import type { EqualizerSettings } from '@/types'

const FADE_DURATION = 0.3

class AudioEngine {
  private ctx: AudioContext | null = null
  private audio: HTMLAudioElement | null = null
  private source: MediaElementAudioSourceNode | null = null

  private bassFilter: BiquadFilterNode | null = null
  private midFilter: BiquadFilterNode | null = null
  private trebleFilter: BiquadFilterNode | null = null
  private gainNode: GainNode | null = null
  private analyserNode: AnalyserNode | null = null

  private onTimeupdate: ((t: number) => void) | null = null
  private onEnded: (() => void) | null = null

  private _volume = 0.7
  private _currentUrl = ''
  private _isPlaying = false
  private _intendedToPlay = false
  private _fadeFrame = 0

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
    this.bassFilter = c.createBiquadFilter()
    this.bassFilter.type = 'lowshelf'
    this.bassFilter.frequency.value = 250
    this.bassFilter.gain.value = 0
    this.midFilter = c.createBiquadFilter()
    this.midFilter.type = 'peaking'
    this.midFilter.frequency.value = 1000
    this.midFilter.Q.value = 1
    this.midFilter.gain.value = 0
    this.trebleFilter = c.createBiquadFilter()
    this.trebleFilter.type = 'highshelf'
    this.trebleFilter.frequency.value = 4000
    this.trebleFilter.gain.value = 0
    this.gainNode = c.createGain()
    this.gainNode.gain.value = this._volume
    this.analyserNode = c.createAnalyser()
    this.analyserNode.fftSize = 256
    this.bassFilter.connect(this.midFilter)
    this.midFilter.connect(this.trebleFilter)
    this.trebleFilter.connect(this.gainNode)
    this.gainNode.connect(this.analyserNode)
    this.analyserNode.connect(c.destination)
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
          this.source.connect(this.bassFilter!)
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
      this.source.connect(this.bassFilter!)
    }
    if (startTime > 0) this.audio!.currentTime = startTime
    this.gainNode!.gain.value = 0
    this.audio!.src = url
    this.audio!.load()
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
    if (!this.bassFilter || !this.midFilter || !this.trebleFilter) {
      setTimeout(() => this.applyEqualizer(settings), 100)
      return
    }
    try {
      this.bassFilter.gain.value = settings.bass * 2
      this.midFilter.gain.value = settings.mid * 2
      this.trebleFilter.gain.value = settings.treble * 2
    } catch (e) {
      console.warn('EQ apply failed:', e)
    }
  }

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
    if (this.audio) { this.audio.src = ''; this.audio = null }
    if (this.source) { try { this.source.disconnect() } catch {}; this.source = null }
    this.bassFilter = this.midFilter = this.trebleFilter = null
    this.gainNode = this.analyserNode = null
    if (this.ctx) { this.ctx.close(); this.ctx = null }
  }
}

export const audioEngine = new AudioEngine()
