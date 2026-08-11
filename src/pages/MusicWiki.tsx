import { useState } from 'react'
import { BookOpen, Landmark, Search } from 'lucide-react'

/* 21 + 195 — Müzik Sözlüğü */
const TERMS: { term: string; cat: string; def: string }[] = [
  { term: 'Reverb (Yankı)', cat: 'Efekt', def: 'Sesin mekân duygusunu taklit eden efekttir; ses dalgalarının yüzeylerden yansımasıyla oluşur. Katedralden stüdyoya, her ortamın kendi yankısı vardır.' },
  { term: 'Delay (Eko)', cat: 'Efekt', def: 'Sinyali gecikmeli olarak tekrarlayan efekt. Kısa gecikmeler (slapback) 50lerin rock-n-roll imzasıdır.' },
  { term: 'Ekolayzer (EQ)', cat: 'Ses', def: 'Frekans bantlarının seviyesini ayarlayan devre. Bas, orta, tiz üçgeni her karışımın temelidir.' },
  { term: 'Compressor', cat: 'Ses', def: 'Yüksek sesleri kısıp alçakları yükselterek dinamik aralığı daraltır; radyoda "sürekli ses" hissinin sırrı.' },
  { term: 'BPM', cat: 'Ritim', def: 'Beats Per Minute — dakikadaki vuruş sayısı. 60-90 rahat, 120-140 dans, 170+ hız metal.' },
  { term: 'Beat (Vuruş)', cat: 'Ritim', def: 'Müziğin temel zaman birimi; metronomun tıkladığı nokta. Davul ve basın kalp atışı.' },
  { term: 'Ostinato', cat: 'Ritim', def: 'Sürekli tekrarlanan kısa ritmik veya melodik kalıp. Minimalist müziğin ve tekno basın temeli.' },
  { term: 'Köprü (Bridge)', cat: 'Yapı', def: 'Nakaratlar arasındaki zıtlık bölümü; genelde farklı akorlara geçer ve gerilimi artırır.' },
  { term: 'Nakarat (Chorus)', cat: 'Yapı', def: 'Şarkının en akılda kalıcı, tekrarlanan bölümü. Pop şarkıların en önemli yapı taşı.' },
  { term: 'Verse (Kıta)', cat: 'Yapı', def: 'Hikâyeyi anlatan, nakarata hazırlayan bölüm. Şarkı sözlerinin evi.' },
  { term: 'Vokal', cat: 'Ses', def: 'İnsan sesiyle yapılan müzik. Solo, armoni, koroya kadar geniş bir yelpaze.' },
  { term: 'Armoni', cat: 'Teori', def: 'İki veya daha fazla sesin aynı anda duyulması. Akorların sanatı.' },
  { term: 'Akor (Chord)', cat: 'Teori', def: 'En az üç sesin aynı anda çalınması. Majör akorlar aydınlık, minör akorlar hüzünlü hissettirir.' },
  { term: 'Ton (Anahtar)', cat: 'Teori', def: 'Parçanın merkezi nota seti; örneğin Do majör. Ton, melodinin "evi"dir.' },
  { term: 'Pitch (Perde)', cat: 'Teori', def: 'Bir sesin frekansına göre algılanan tizliği. 440 Hz = La notası, orkestraların akort standardı.' },
  { term: 'Tempo', cat: 'Ritim', def: 'Parçanın hızı. Largo (yavaş)dan Prestoya (çok hızlı) kadar İtalyanca terimlerle gösterilir.' },
  { term: 'Gain (Kazanç)', cat: 'Ses', def: 'Sinyal seviyesinin yükseltilmesi. Fazla gain bozulma (distortion) demektir.' },
  { term: 'Distorsiyon', cat: 'Efekt', def: 'Sinyalin kasıtlı olarak bozulması; rock gitarının kalbi. Tube overdrive, fuzzy, crunch...' },
  { term: 'Pan (Kaydırma)', cat: 'Ses', def: 'Sinyalin sol-sağ konumlandırılması. Stereo hayalin yapı taşı.' },
  { term: 'Sesin Katmanları (Layering)', cat: 'Prodüksiyon', def: 'Aynı anda çalan birden çok ses kaynağının üst üste bindirilmesi; dolgun sesin sırrı.' },
  { term: 'Sylable (Hece) Vokal', cat: 'Prodüksiyon', def: 'Sözcük olmayan vokal sesleriyle ritmik doku oluşturma tekniği.' },
  { term: 'Sample (Örnek)', cat: 'Prodüksiyon', def: 'Başka bir kayıttan alınıp yeniden kullanılan ses parçası. Hip-hop kültürünün temeli.' },
  { term: 'Loop', cat: 'Prodüksiyon', def: 'Sonsuz tekrarlanan ses döngüsü; elektronik müziğin yapı taşı.' },
  { term: 'Mastering', cat: 'Prodüksiyon', def: 'Parçanın yayına hazır son aşaması; ses seviyesi, frekans dengesi ve sıralama burada oturur.' },
]

/* 189 — Sanal Müzik Müzesi */
const MUSEUM: { name: string; year: string; emoji: string; story: string }[] = [
  { name: 'Stratocaster', year: '1954', emoji: '🎸', story: 'Leo Fender\'in efsanesi: üç single-coil manyetik, çift gövde kesimli tasarım. Jimi Hendrix\'ten Eric Clapton\'a, rock tarihinin en çok el değiştiren gitarı.' },
  { name: 'TR-808 Davul Makinesi', year: '1980', emoji: '🥁', story: 'Roland, sesi "plastik" bulduğu için üretimi durdurdu. Ama hip-hop ve house üreticileri onu benimsedi; bugün batarya vuruşu müziğin DNA\'sı.' },
  { name: 'Moog Synthesizer', year: '1964', emoji: '🎛️', story: 'Robert Moog\'un modüler dev makinesi. "Switched-On Bach" albümüyle klasik müziği bile sentezle çaldırdı; elektronik çağın resmi başlangıcı.' },
  { name: 'Akai MPC60', year: '1988', emoji: '🎹', story: 'Sample alma + drum machine birleşimi. Dokunma hissi sayesinde 90\'lar hip-hop prodüksiyonunun tahtı; bugün hâlâ efsane.' },
  { name: 'Kazoo', year: '1840', emoji: '🎺', story: 'Tarihin en basit enstrümanı: bir boru, bir zar. Ama her çalanı anında müzisyen hissettiren şeytan tüyü.' },
  { name: 'Theremin', year: '1928', emoji: '👽', story: 'Dokunmadan çalınan ilk elektronik enstrüman. Bilim kurgu filmlerinin korku sesinin kaynağı, gerçek bir matematik mucizesi.' },
  { name: 'Vinyl Plak', year: '1948', emoji: '💿', story: '33 1/3 rpm, 12 inç. Analog sesin sıcaklığı ve kapak sanatı; dijital çağda bile yeniden yükselişte.' },
  { name: 'Compact Disc', year: '1982', emoji: '💽', story: 'Philip\'in "Red Book" standardı: 16 bit, 44.1 kHz. Kaseti devirdi, 30 yıl tahtta kaldı, şimdi koleksiyonculukta.' },
  { name: 'Walkman', year: '1979', emoji: '📼', story: 'Müziği ceplere taşıyan devrim. Sony\'nin bu kaseti çalarları sayesinde müzik artık her yerdeydi.' },
  { name: 'Les Paul Gibson', year: '1952', emoji: '🎸', story: 'Humbucker manyetikleriyle gürültüsüz, kalın, sürdürülebilir ses. Hard rock ve metal gitar tonunun atası.' },
  { name: 'Hammond Organ', year: '1935', emoji: '🎹', story: 'Tonewheel üretimiyle evlere "katedral sesi" getirdi. Leslie hoparlörüyle birlikte caz ve rock efsanesi.' },
  { name: 'Gramofon', year: '1887', emoji: '📯', story: 'Emil Berliner\'ın silindiri plakla değiştiren icadı. Müziği evlere taşıyan ilk kitle aracı.' },
]

export default function MusicWiki() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Tümü')
  const cats = ['Tümü', 'Efekt', 'Ses', 'Ritim', 'Yapı', 'Teori', 'Prodüksiyon']
  const filtered = TERMS.filter((t) =>
    (cat === 'Tümü' || t.cat === cat) &&
    (!q || t.term.toLowerCase().includes(q.toLowerCase()) || t.def.toLowerCase().includes(q.toLowerCase()))
  )
  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20"><BookOpen size={20} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-display font-bold">Müzik Sözlüğü</h1>
            <p className="text-sm text-surface-400">Terimler, teknikler ve efsaneler</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Terim ara: reverb, akor, sample..." className="w-full h-10 rounded-xl bg-surface-800 border border-surface-700 pl-9 pr-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-amber-400/50" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${cat === c ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-surface-800/60 text-surface-400 border border-surface-700/60 hover:text-white'}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((t) => (
            <div key={t.term} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300/90">{t.cat}</span>
                <p className="text-sm font-bold text-white">{t.term}</p>
              </div>
              <p className="text-xs text-surface-400 leading-relaxed">{t.def}</p>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-surface-500 col-span-2 text-center py-8">Sonuç bulunamadı</p>}
        </div>

        {/* 189 — Sanal Müzik Müzesi */}
        <div className="pt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20"><Landmark size={20} className="text-white" /></div>
            <div>
              <h2 className="text-xl font-display font-bold">Sanal Müzik Müzesi</h2>
              <p className="text-sm text-surface-400">Müzik tarihini değiştiren 12 eser</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {MUSEUM.map((m) => (
              <div key={m.name} className="glass rounded-2xl p-4 hover:border-purple-500/30 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{m.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{m.name}</p>
                    <p className="text-[10px] text-surface-500">{m.year} · Müze Koleksiyonu</p>
                  </div>
                </div>
                <p className="text-xs text-surface-400 leading-relaxed">{m.story}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
