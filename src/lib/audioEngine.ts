import type { EqualizerSettings, AudioEffects } from '@/types'

/**
 * WaveifyLite ses motoru (v10-slim rewrite).
 * Bilerek minimal: kaynak -> gain -> analyser -> cikis.
 * EQ / reverb / delay / karaoke / 8D YOK — bu yuzden yankılanma imkansiz.
 * Efekt API'leri geriye uyumluluk icin durur ama no-op'tur.
 * AudioContext ilk play() aninda kurulur (acilis hizlansin diye).
 */

const FADE_DURATION = 0.25

class AudioEngine {
  private ctx: AudioContext | null = null
  private audio: HTMLAudioElement | null = null
  private source: MediaElementAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private analyserNode: AnalyserNode | null = null

  private onTimeupdate: ((t: number) => void) | null = null
  private onEnded: (() => void) | null = null

  private _volume = 0.7
  private _currentUrl = ''
  private _isPlaying = false
  private _intendedToPlay = false
  private _pendingPlay = false
  private _fadeFrame = 0

  constructor() {
    const retry = () => {
      if (!this._pendingPlay || !this.audio || !this._intendedToPlay) return
      this.ensureCtx()
      this.audio.play()
        .then(() => {
          this._pendingPlay = false
          this._isPlaying = true
          this.fadeTo(this._volume, FADE_DURATION)
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') retry()
    })
    window.addEventListener('focus', retry)
  }

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
    this.gainNode.gain.value = this._volume * this._volume
    this.analyserNode = c.createAnalyser()
    this.analyserNode.fftSize = 256
    this.analyserNode.smoothingTimeConstant = 0.8
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
      this.gainNode!.gain.value = start + (target * target - start) * eased
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
          this._pendingPlay = false
          this._isPlaying = true
          this.fadeTo(this._volume, FADE_DURATION)
        })
        .catch(() => {
          this._pendingPlay = true
        })
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
          this.source.connect(this.gainNode!)
        } catch {}
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

  crossfade(url: string, _duration = 3) {
    // Crossfade kaldirildi: direkt play (yankisiz, gecikmesiz)
    this.play(url)
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
      this.source.connect(this.gainNode!)
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
    this._pendingPlay = false
  }

  pause() {
    if (!this.audio || !this._isPlaying) return
    this._intendedToPlay = false
    this._pendingPlay = false
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
    if (!this.gainNode) return
    this.cancelFade()
    const ctx = this.gainNode.context
    this.gainNode.gain.cancelScheduledValues(ctx.currentTime)
    this.gainNode.gain.setTargetAtTime(vol * vol, ctx.currentTime, 0.04)
  }

  setPlaybackRate(rate: number) {
    if (this.audio) this.audio.playbackRate = rate
  }

  // --- Kaldirilan efektler: geriye uyumluluk icin no-op ---
  applyEqualizer(_settings: EqualizerSettings) {}
  setEffects(_fx: AudioEffects) {}
  setNormalize(_on: boolean) {}
  get gaplessFadeReady() { return false }

  getAnalyserData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(128)
    const data = new Uint8Array(this.analyserNode.frequencyBinCount)
    try { this.analyserNode.getByteFrequencyData(data) } catch {}
    return data
  }

  getStereoData(): { l: Uint8Array; r: Uint8Array } {
    const empty = { l: new Uint8Array(256), r: new Uint8Array(256) }
    if (!this.analyserNode) return empty
    try {
      this.analyserNode.getByteTimeDomainData(empty.l)
      empty.r.set(empty.l)
    } catch {}
    return empty
  }

  setOnTimeupdate(fn: (t: number) => void) { this.onTimeupdate = fn }
  setOnEnded(fn: () => void) { this.onEnded = fn }

  destroy() {
    this.stop()
    if (this.audio) { this.audio.src = ''; this.audio = null }
    if (this.source) { try { this.source.disconnect() } catch {}; this.source = null }
    this.gainNode = this.analyserNode = null
    if (this.ctx) { this.ctx.close(); this.ctx = null }
  }
}

export const audioEngine = new AudioEngine()
