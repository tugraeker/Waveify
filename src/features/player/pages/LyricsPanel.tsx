import SyncedLyrics from '@/components/SyncedLyrics';
import { Save, Pencil, Plus } from 'lucide-react';

export default function LyricsPanel(p: any) {
  const { currentSong, currentTime, seek, editingLyrics, setEditingLyrics, lyricsText, setLyricsText, saveLyrics } = p;
  return (
    <>
          {/* Synced Lyrics with edit (Feature 10) */}
          {currentSong.lyrics || editingLyrics ? (
            editingLyrics ? (
              <div className="w-full max-w-md animate-fade-in">
                <textarea value={lyricsText} onChange={(e) => setLyricsText(e.target.value)}
                  className="w-full h-40 rounded-xl bg-surface-800 border border-surface-700 p-3 text-sm text-white resize-none"
                  placeholder="Şarkı sözlerini buraya girin... [mm:ss.xx] ile zaman damgası ekleyin" />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveLyrics} className="h-8 px-4 rounded-lg bg-wave-500 text-white text-xs font-medium"><Save size={12} className="inline mr-1" />Kaydet</button>
                  <button onClick={() => setEditingLyrics(false)} className="h-8 px-4 rounded-lg bg-surface-800 text-surface-300 text-xs font-medium">İptal</button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md">
                <SyncedLyrics lyrics={currentSong.lyrics || ''} currentTime={currentTime} onSeek={seek} />
                <button onClick={() => setEditingLyrics(true)} className="text-xs text-surface-500 hover:text-wave-400 mt-1 transition-colors">
                  <Pencil size={12} className="inline mr-1" />Sözleri Düzenle
                </button>
              </div>
            )
          ) : (
            <button onClick={() => { setEditingLyrics(true); setLyricsText('') }} className="text-xs text-surface-500 hover:text-wave-400 border border-dashed border-surface-700 rounded-lg px-4 py-2 transition-colors">
              <Plus size={12} className="inline mr-1" />Söz Ekle
            </button>
          )}
    </>
  );
}
