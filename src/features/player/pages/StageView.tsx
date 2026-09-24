import Visualizer from '@/components/Visualizer';
import { Goniometer } from '@/components/NowPlayingExtras';
import {
  BarChart3, Waves, Circle, Flame, Maximize2, Star, Zap, Palette, Activity, Music2, Pencil, Check,
} from 'lucide-react';
import type { VisualizerMode, VisualizerColorTheme, CoverStyle } from '@/types';

const VISUALIZER_MODES: { key: VisualizerMode; label: string; icon: typeof BarChart3 }[] = [
  { key: 'bars', label: 'Çubuk', icon: BarChart3 },
  { key: 'wave', label: 'Dalga', icon: Waves },
  { key: 'circle', label: 'Daire', icon: Circle },
  { key: 'fire', label: 'Ateş', icon: Flame },
  { key: 'party', label: 'Parti', icon: Maximize2 },
  { key: 'spectrum', label: 'Spektrum', icon: BarChart3 },
  { key: 'particles', label: 'Parçacık', icon: Circle },
  { key: 'dual', label: 'Çift', icon: Waves },
  { key: 'stars', label: 'Yıldız', icon: Star },
  { key: 'concert', label: 'Konser', icon: Zap },
]

const COVER_STYLES: { key: CoverStyle; label: string; emoji: string }[] = [
  { key: 'vinyl', label: 'Plak', emoji: '💿' },
  { key: 'cassette', label: 'Kaset', emoji: '📼' },
  { key: 'cd', label: 'CD', emoji: '💽' },
  { key: 'polaroid', label: 'Polaroid', emoji: '📷' },
]

const VIZ_COLOR_THEMES: { key: VisualizerColorTheme; label: string }[] = [
  { key: 'wave', label: 'Wave' },
  { key: 'rainbow', label: 'Gökkuşağı' },
  { key: 'fire', label: 'Ateş' },
  { key: 'ice', label: 'Buz' },
  { key: 'neon', label: 'Neon' },
  { key: 'pastel', label: 'Pastel' },
  { key: 'mono', label: 'Tek Renk' },
]

export default function StageView(p: any) {
  const { currentSong, isPlaying, analyserData, coverStyle, setCoverStyle, editingCover, setEditingCover, coverUrlInput, setCoverUrlInput, saveCover, editingMetadata, setEditingMetadata, metaTitle, setMetaTitle, metaArtist, setMetaArtist, metaAlbum, setMetaAlbum, metaGenre, setMetaGenre, saveMetadata, currentRating, handleRating, visualizerMode, setVisualizerMode, visualizerColorTheme, setVisualizerColorTheme, visualizerSensitivity, setVisualizerSensitivity, showGonio, setShowGonio } = p;
  return (
    <>
          {/* Cover art */}
          <div className="relative flex-shrink-0 group">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-wave-500/25 via-fuchsia-500/15 to-amber-400/20 blur-2xl pointer-events-none" />
            {currentSong.cover_url ? (
              <>
                {coverStyle === 'vinyl' && (
                  <img src={currentSong.cover_url} alt="" className={`relative w-72 h-72 md:w-80 md:h-80 rounded-full shadow-2xl shadow-wave-500/10 ring-1 ring-white/15 object-cover ${isPlaying ? 'animate-spin-slow' : ''}`} />
                )}
                {coverStyle === 'cd' && (
                  <div className={`relative w-72 h-72 md:w-80 md:h-80 rounded-full shadow-2xl shadow-cyan-500/10 overflow-hidden ${isPlaying ? 'animate-spin-slow' : ''}`}>
                    <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover rounded-full" style={{ clipPath: 'circle(46% at 50% 50%)' }} />
                    <div className="absolute inset-0 rounded-full" style={{ background: 'repeating-radial-gradient(circle at 50% 50%, rgba(220,240,255,0.12) 0px, rgba(220,240,255,0.12) 1.5px, transparent 2px, transparent 4px)' }} />
                    <div className="absolute inset-[38%] rounded-full bg-gradient-to-br from-slate-200 via-white to-slate-400 shadow-inner" />
                    <div className="absolute inset-[44%] rounded-full bg-surface-950" />
                  </div>
                )}
                {coverStyle === 'cassette' && (
                  <div className="relative w-72 h-72 md:w-80 md:h-80 rotate-1 rounded-2xl border border-surface-700 shadow-2xl shadow-fuchsia-500/10 overflow-hidden" style={{ background: '#15151f' }}>
                    <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-r from-fuchsia-600 via-amber-500 to-cyan-500 opacity-80" />
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-amber-500 opacity-80" />
                    <img src={currentSong.cover_url} alt="" className="absolute inset-x-5 top-14 bottom-14 rounded-md object-cover" />
                    <div className="absolute inset-x-0 top-[44%] h-8 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-6 rounded-sm bg-white/80" />
                        <div className="w-4 h-6 rounded-sm bg-white/80" />
                      </div>
                    </div>
                  </div>
                )}
                {coverStyle === 'polaroid' && (
                  <div className="relative w-72 h-72 md:w-80 md:h-80 -rotate-2 rounded-md bg-gradient-to-br from-white to-slate-200 p-3 pb-10 shadow-2xl shadow-amber-500/10">
                    <img src={currentSong.cover_url} alt="" className="w-full h-full rounded-sm object-cover" />
                    <p className="absolute bottom-2 inset-x-0 text-center text-[10px] font-display tracking-[0.2em] text-surface-800 uppercase">waveify · {currentSong.title.split(' ')[0] || 'anı'}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="relative w-72 h-72 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 flex items-center justify-center">
                <Music2 size={64} className="text-surface-500" />
              </div>
            )}
            {isPlaying && currentSong.cover_url && coverStyle !== 'polaroid' && coverStyle !== 'cassette' && (
              <div className="absolute inset-0 rounded-full pointer-events-none flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-surface-950/70 backdrop-blur-sm border-2 border-white/25 shadow-xl shadow-black/40 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-black/50 border border-white/20" />
                </div>
              </div>
            )}
            <button onClick={() => setEditingCover(!editingCover)} className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity text-white">
              <Pencil size={14} />
            </button>
          </div>

          {/* Cover style picker */}
          <div className="flex items-center gap-1.5">
            {COVER_STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => setCoverStyle(s.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  coverStyle === s.key
                    ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                    : 'text-surface-500 hover:text-white border border-transparent'
                }`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>

          {editingCover && (
            <div className="w-full max-w-md flex gap-2 animate-fade-in">
              <input type="text" value={coverUrlInput} onChange={(e) => setCoverUrlInput(e.target.value)} placeholder="Kapak URL'si" className="flex-1 h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-400/50" />
              <button onClick={saveCover} className="h-9 px-3 rounded-xl bg-wave-500 text-white text-xs font-medium hover:bg-wave-400 transition-colors"><Check size={14} /></button>
            </div>
          )}

          {/* Song title & artist */}
          <div className="text-center max-w-md flex-shrink-0">
            {editingMetadata ? (
              <div className="space-y-2 animate-fade-in">
                <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="w-full h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white text-center" placeholder="Başlık" />
                <input type="text" value={metaArtist} onChange={(e) => setMetaArtist(e.target.value)} className="w-full h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white text-center" placeholder="Sanatçı" />
                <div className="flex gap-2">
                  <input type="text" value={metaAlbum} onChange={(e) => setMetaAlbum(e.target.value)} className="flex-1 h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white" placeholder="Albüm" />
                  <input type="text" value={metaGenre} onChange={(e) => setMetaGenre(e.target.value)} className="flex-1 h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white" placeholder="Tür" />
                </div>
                <div className="flex gap-2 justify-center">
                  <button onClick={saveMetadata} className="h-8 px-4 rounded-lg bg-wave-500 text-white text-xs font-medium"><Check size={14} className="inline mr-1" />Kaydet</button>
                  <button onClick={() => setEditingMetadata(false)} className="h-8 px-4 rounded-lg bg-surface-800 text-surface-300 text-xs font-medium">İptal</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-display font-bold truncate">{currentSong.title}</h1>
                <p className="text-sm text-surface-400 mt-1.5 truncate">{currentSong.artist}</p>
                {currentSong.album && <p className="text-xs text-surface-500 mt-0.5">{currentSong.album}</p>}
              </>
            )}
            {!editingMetadata && (
              <button onClick={() => setEditingMetadata(true)} className="text-xs text-surface-500 hover:text-wave-400 mt-1 transition-colors">
                <Pencil size={12} className="inline mr-1" />Düzenle
              </button>
            )}
          </div>

          {/* Star Rating (Feature 4) */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => handleRating(star)} className="transition-transform hover:scale-110">
                <Star size={22} className={star <= currentRating ? 'fill-yellow-400 text-yellow-400' : 'text-surface-600'} />
              </button>
            ))}
            {currentRating > 0 && <span className="text-xs text-surface-400 ml-2">{currentRating}/5</span>}
          </div>

          {/* Visualizer */}
          <div className="w-full max-w-md">
            {showGonio ? <Goniometer /> : <Visualizer analyserData={analyserData} isPlaying={isPlaying} className="w-full h-16 rounded-xl" />}
          </div>

          {/* Visualizer controls */}
          <div className="flex flex-wrap gap-2 items-center justify-center">
            {VISUALIZER_MODES.map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    setVisualizerMode(m.key)
                    if (m.key === 'party') {
                      document.documentElement.requestFullscreen?.()
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    visualizerMode === m.key
                      ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                      : 'text-surface-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon size={14} className="inline mr-1" />
                  {m.label}
                </button>
              )
            })}
            {visualizerMode === 'party' && document.fullscreenElement && (
              <button
                onClick={() => document.exitFullscreen()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10"
              >
                Tam Ekrandan Çık
              </button>
            )}
            <button
              onClick={() => setShowGonio(!showGonio)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showGonio
                  ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                  : 'text-surface-400 hover:text-white border border-transparent'
              }`}
            >
              <Activity size={14} className="inline mr-1" />Gonyometre
            </button>
          </div>

          {/* Visualizer color theme + sensitivity (Feature 12) */}
          <div className="flex flex-wrap gap-3 items-center justify-center w-full max-w-md">
            <div className="flex flex-wrap gap-1.5">
              {VIZ_COLOR_THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setVisualizerColorTheme(t.key)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    visualizerColorTheme === t.key
                      ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                      : 'text-surface-500 border border-transparent hover:text-white'
                  }`}
                >
                  <Palette size={10} className="inline mr-1" />{t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-surface-500">Hassasiyet</span>
              <input type="range" min={0.2} max={2} step={0.1} value={visualizerSensitivity}
                onChange={(e) => setVisualizerSensitivity(Number(e.target.value))}
                className="w-16 accent-wave-400" />
            </div>
          </div>
    </>
  );
}
