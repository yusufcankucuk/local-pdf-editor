# Mimari

## Amaç ve temel kararlar

PDF editörü ilk aşamada statik bir tarayıcı uygulamasıdır. Backend, kullanıcı hesabı veya belge yükleme endpoint'i yoktur. Vite yalnızca geliştirme sunucusu ve derleme aracıdır; dağıtım çıktısı `dist/` içindeki statik dosyalardır. Yerel sunucu üzerinden uygulama ve PDF kaynakları yüklenir; belge işleme cihaz içinde gerçekleşir. Masaüstü paketleme ihtiyacı doğarsa aynı çekirdek Tauri gibi bir kabuğa alınabilir; bugün masaüstü bağımlılığı eklenmez.

React 19 arayüzü, TypeScript katman sınırlarını sağlar. PDF.js ayrıştırma ve çizim içindir; mevcut PDF metnini değiştiren bir motor değildir. Dışa aktarma pdf-lib ve yerel fontkit üzerinden tembel yüklenen yazma modülünde yapılır. Mevcut metnin font, karakter kodlama ve yerleşimini koruyarak düzenlenmesi basit bir üst katman ekleme işlemiyle eşdeğer değildir.

## Dosya haritası

```text
src/
  app/                  Uygulama kabuğu, paneller, yerleşim ve tasarım tokenları
  components/           Paylaşılan küçük arayüz bileşenleri
  features/
    document/           Oturum yaşam döngüsü, dosya kabul kuralları
    viewer/             Canvas, metin katmanı, görünüm ve bileşen orkestrasyonu
    editor/             Değişiklik modeli, geçmiş, sayfalar, eklemeler ve yerinde araçlar
    search/             Türkçe duyarlı arama ve sonuç gezinmesi
  lib/exportPdf.ts      Yeni PDF üretimi, font gömme, form sabitleme
  lib/pdf.ts            PDF.js yapılandırması ve belge açma sınırı
  assets/               Uygulamayla gelen özgün örnek PDF
scripts/
  copy-pdf-assets.mjs    Yerel cmap, font ve wasm kaynaklarını hazırlama
  create-demo.py        Deterministik örnek belge üretimi
public/
  pdf-assets/           Kurulumda üretilir; CDN kullanılmaz
```

`App.tsx` uygulama kabuğudur; görüntüleyici yerleşimi `features/viewer/Workspace.tsx`, açıklama pencereleri `components/InfoDialog.tsx` altındadır. Bir panel kendi kapsamlı davranışını kazandığında ayrıca ilgili feature dizinine ayrılır. Sırf büyüme ihtimali için servis arayüzleri, plugin sistemi, global store veya boş modüller oluşturulmaz.

## Veri akışı ve sahiplik

```text
File picker / drop
        ↓
useDocument.open(File)
        ↓
Boyut + ilk 1024 baytta PDF imzası doğrulaması
        ↓
lib/pdf.ts → yerel PDF.js worker → PDFDocumentProxy
        ↓
DocumentSession { id, pdf, file, isDemo, encrypted }
        ↓
Workspace → PdfCanvas / küçük resimler
```

Orijinal `File` oturum boyunca bellekte korunur. PDF.js ayrı bir Uint8Array alır; worker transferi orijinal dosyayı tüketmez. “Orijinali indir” aynı File üzerinden geçici object URL üretir ve URL'yi serbest bırakır. Dosya içeriği veya metadata loglanmaz ve kalıcı saklanmaz.

`useDocument` belge sahipliğini taşır. Yarışan açma işlemlerinde yalnızca en yeni istek oturumu değiştirir. Başarısız yeni dosya açılması önceki belgeyi korur. Eski veya geç gelen PDFDocumentProxy `loadingTask.destroy()` ile serbest bırakılır. Uygulama kaldırıldığında aktif belge temizlenir.

Workspace görünüm ve seçime sahiptir. useEditor sayfa dizisi, eklemeler, kaynak belgeler ve 100 anlık görüntülü geçmişi yönetir. Döndürme belge değişikliğidir ve dışa yazılır; kaynak PDF dönüşü korunur. modified orijinalden, dirty son tam dışa aktarmadan farkı gösterir.

## Çizim ve performans

PDF.js worker ana UI iş parçacığı dışında ayrıştırır. Küçük resimler IntersectionObserver ile görünür olmadan çizilmez. Ana görünüm tek sayfa çizer. Zoom/sayfa değişiminde önceki render iptal edilir; ayrı backing canvas kullanıldığı için çakışan canvas görevleri oluşmaz. Canvas başına 12 milyon piksel ve en fazla 2× cihaz piksel oranı uygulanır. Çok uzun belgelerde thumbnail DOM listesinin sanallaştırılması ölçüm sonrası eklenebilir.

## Güven ve çalışma sınırı

- En fazla 100 MB dosya kabul edilir; imza denetimi içerik güvenliği veya virüs taraması değildir.
- Şifreli PDF yerel şifre penceresiyle salt okunur açılır; şifre saklanmaz. Yazma motoru şifre çözmez.
- PDF JavaScript çalıştırılmaz; dinamik eval seçeneğini kaldıran güncel PDF.js kullanılır. Bağlantı ve interaktif annotation katmanı çizilmez.
- CSP aynı kaynaklı uygulama isteklerini sınırlar. Geliştirmede yerel HMR WebSocket bağlantısı açıktır. Üretim dağıtımında HTTP CSP başlığıyla güçlendirme ve HMR istisnasını kaldırma değerlendirilir.
- Font, cmap, wasm ve worker uygulamayla gelir. Harici font, CDN ve belge servisi kullanılmaz.
- Ağsız belge işleme, ilk yüklemeden sonra bu oturumdaki dosya işlemleri için geçerlidir. Service worker henüz yoktur; internetten yüklenen sürümün çevrimdışı yeniden başlatılması garanti edilmez. Yerel sunucu internet gerektirmez.
- PDF.js TextLayer metin seçme ve arama için canvas ile aynı viewport kullanır. Tam etiketli PDF erişilebilirliği henüz uygulanmaz. Uygulama kontrolleri klavye ve erişilebilir etiketlere sahiptir.

## Düzenleme ve bağlamsal araçlar

Eklemeler PDF birimlerinde tutulur; SVG önizleme PDF.js viewport matrisiyle dönüşür. ToolPanel metinde sağ sütunda, diğer nesnelerde body portalında ekran yönünü koruyan bir çubuktur; seçili SVG nesnesine göre konumlanır ve scroll/resize/zoom sırasında ekran sınırlarına sığar. Metin taslağı alanı terk ederken veya Escape ile tek işlem olarak kaydedilir; yerel input undo uygulama undo tarafından engellenmez. Font seçimi sans/serif/mono veya oturum font id olarak modelde tutulur; yerel Noto fontları önizlemede ve PDF çıktısında eşleşir. React metni HTML olarak çalıştırmaz.

exportPdf kaynak sayfaları kopyalar, form değerlerini kaynak belge fontuyla sabitler, eklemeleri ve dönüşü yazar. Çıktı indirilmeden PDF.js ile yeniden açılır. Orijinal File değiştirilmez. Kaynak outline dışa aktarmada yeniden oluşturulmaz.

## Mevcut PDF içeriği — v0.3

`lib/contentPdf.ts` yerel module worker istemcisidir. WASM top-level await sonrasında worker ready mesajı yollar; başlatma sırasında istekler kuyrukta bekler. Dosya ArrayBuffer transfer edilir, document içeriği ağ isteğine dönüşmez. İşlem zaman aşımı worker'ı kapatır ve bekleyen işleri hata ile sonlandırır. `contentEngine.ts` MuPDF structured text üzerinden yatay metin satırlarını çıkarıp blok/hizalama/stil/satır aralığına göre paragraflara gruplar. Görseller page.runPageContents Device callback'lerinden alınır. PDFPage.getTransform matrisi ters çevrilerek her nesne PDF koordinatlarına alınır.

EditorPage.removals orijinal nesnenin kaldırma bölgesini ve türünü taşır. Metin/görsel seçimi, kaldırma kaydı ve düzenlenebilir overlay'i tek geçmiş işleminde ekler. Silme overlay'i kaldırır; orijinal içerik geri gelmez. Undo ilk dönüşümü geri alınca orijinal yeniden görünür. Sayfa kopyaları kendi kaldırma kayıtlarını taşır; kaynak File değişmez.

Metin kaldırma bandı baseline'ın üstünde dardır; font metric bbox'larının komşu satırla çakışması nedeniyle tam satır bbox'ını kaldırma bölgesi olarak kullanmayın. MuPDF annotation.applyRedaction yalnızca oluşturulan annotation'a uygulanır; başka Redact annotation'larını topluca uygulamayın. Metin işleminde image/lineart, görsel işleminde text/lineart korunur. Görsel kaldırma artık redaction bölgesi yerine imageRewrite.ts üzerinden özgün Do çağrısını kaldırır; komşu/kesişen görseller korunur. Bu bölgesel içerik yeniden yazımı genel bir güvenli karartma özelliği olarak sunulmaz.

useNativeContent temizlenmiş tek sayfalık PDF önizlemesini açar; main canvas ve küçük resimler kaynak sayfa yerine bu preview'in 1. sayfasını kullanır. Graft page crop/rotate bilgisini korur. Export her EditorPage için kaynak kopyasına kaldırmaları uygular, ardından PDF-lib overlay'leri yazar. Kaynak sayfa cache'i başka bir çoğaltılmış sayfanın düzenlemeleriyle kirletilmez.

Orijinal gömülü font aynen yeniden kullanılmaz: yeni metin Noto Sans/Serif/Mono ile, ilk karakterin boyut/renk/stiline göre yazılır. Karışık fontlu satırın biçimi tek stile dönüşür. Sans/Serif gerçek Bold/Italic/BoldItalic fontlarını gömer; Mono eğik biçiminde yerel bold/regular fonta oblique shear uygulanır. Şekil ok/çizgi yönü modelde korunur. Resize tutamaçları screen boyutunu viewport.scale ile korur; boyutlar PDF birimlerinde saklanır.

### Doğrudan görsel seçimi ve katmanlar

Aktif sayfanın metin/görsel hedefleri araçtan bağımsız bir kez okunur; dosya ve kaynak sayfa eşleşmesi eski hedefleri engeller. Görünüm modunda sadece görseller saydam hitbox ile erişilebilir. Hitbox katmanı eklenen nesnelerin altında kalır. Şekiller ayrı ikonlardan aynı çizim motoruna gider. Form alanları temizlenmiş preview yerine orijinal PDF proxy'sine bağlanır.

Gömülü görsel dönüşümü PDF koordinatlarında saydam PNG'ye çizilir; rotasyon ve aynalama korunur. MuPDF fillImage tek başına soft maskeyi uygulamadığı için maske ayrıca aynı dönüşümle çizilip premultiplied RGBA kanallarına uygulanır. Kaynak decode bütçesi görsel başına 40 MP, sayfa başına 64 MP; PNG en uzun kenarı 2400 px'tir. Stencil maskeleri kendi rengiyle rastera çizilir. Satır içi/desen görselleri ayrı akış düzenlemesinde sınırlıdır.

Overlay dizisi çizim/dışa aktarma sırasıdır; öne/arkaya alma komşu değişimiyle undo geçmişine kaydedilir. Kaynak PDF alt katmandır. translateOverlay kopyalama ve klavyeyle taşıma için aynı koordinat mantığını kullanır. Görsel saydamlığı önizleme ve PDF çıktısında ortaktır.

### Paragraflar, OCR ve görsel çağrıları

Text overlay `textWidth` ve `lineHeight` taşır. Native paragrafın satırları tek metin kutusunda tutulur; kaynak genişliği ve satır aralığı korunur. `textLayout.ts` kelime bazlı sarma kuralını SVG (canvas font ölçümü) ve PDF (gömülen font ölçümü) için ortak kullanır. Font yükleme sonrasında SVG satırları yeniden ölçülür. Paragraf removal.rects her kaynak satır için dar bandı ayrı tutar; tek büyük bbox ile komşu yazı kaldırılmaz.

`ocr.ts` kaynak sayfayı rotasyon 0 ile en fazla 8 MP, en fazla 3× ölçekle rasterize eder. Viewport convertToPdfPoint crop koordinatlarını geri çevirir. `ocr.worker.ts` Tesseract.js 7 LSTM motorunu yerel klasik child worker ve yerel dil modelleriyle çalıştırır. Parent worker iptal/zaman aşımı/sayfa değişiminde sonlandırılır. Progress ve yalnızca küçük paragraf layout ağacı UI'ye döner; kalıcı cache yoktur. `ocrLayout.ts` düşük güvenli/eğik satırları eler, büyük satır boşluklarından paragrafları ayırır. Tanıma font/boyut/tanıma doğruluğu garantisi vermez.

`useOcr` sadece aktif sayfanın sonucu ve yaşam döngüsünü taşır. OCR değişiklik değildir; seçim mevcut replaceContent üzerinden scan removal + text overlay'i tek undo adımı olarak ekler. Scan kaldırma MuPDF REDACT_IMAGE_PIXELS ile yalnızca kaynak satırların raster piksellerini temizler, varsa aynı bölgede dijital metni kaldırır; sayfanın geri kalanı ve çizimler kalır. Seçim sonrası aynı alanın kaynak görselini dönüştürmek engellenir. Sonuç sayfa değişiminde temizlenir, gerekirse OCR yeniden çalıştırılır.

`imageRewrite.ts` PDF içerik akışının yalnızca ilgili XObject `Do` çağrısını kaldırır. Comments/literal/hex strings operatör gibi yorumlanmaz. q/Q/cm ve Form Matrix üzerinden kaynak sınırlar doğrulanır. Shared Form'lar yalnızca değişen çağrı için kopyalanır; diğer kullanımlar/sayfalar, fontlar, crop, rotation, annotation ve widget dictionary'leri aynen korunur. Kullanılmayan değişmiş kaynak adları kaldırılır. Tüm seçimler eşleşmeden page dictionary yayımlanmaz. Derinlik 24 ve akış başına 20 MB sınırı vardır; inline/desen içeriğinde tahminle başka nesne silinmez.

`ContentTools.tsx` OCR durum/iptal ve sayfadaki görsel önizleme listesidir. Belge içeriği normal React/SVG olarak çizilir; HTML çalıştırılmaz. npm postinstall OCR worker/core/model kaynaklarını `public/ocr-assets/` altında hazırlar; Vite bu kaynakları üretime kopyalar. Tesseract.js optimizeDeps.include ile ilk OCR kullanımında dev sunucusunun yeniden optimize edip oturumu sıfırlaması önlenir.

### Revizyon 6 — kaynak görsellerin çizim sırası ve tarama alanları

Native image overlay `native: { id, data }` ile kaynak removal'a bağlanır; SVG'de yalnızca saydam seçim/resize alanıdır. `imageRemovals` güncel boyut/konum/saydamlık/veriyi preview ve export için aynı değişikliklere dönüştürür. Verisi değişmediyse özgün XObject/maskeleri aynen kullanılır; değiştirilmiş PNG MuPDF addImage ile eklenir. `imageRewrite` seçilen Do çağrısını aynı çizim noktasında q/cm/Do/Q ile değiştirir; Form kaynakları değişen invocation için kopyalanmaya devam eder. Değişmemiş kaynak görsel seçimleri akış yeniden yazımını atlar. Export native overlay'i tekrar sayfanın üstüne çizmez. Kopyalamada native bağlantısı kaldırılır. Native görseller katman sırasına dahil edilmez; yeni eklemeler kendi aralarında sıralanır.

`useNativeContent` kaynak removal veya native image nesnesi değişince preview üretir; metin/şekil ayarı PDF preview'ini tekrar üretmez. PdfCanvas aynı sayfa ölçülerinde overlay katmanını yeniden monte etmez; içerik preview'i hazırlanırken devam eden gesture kaybolmaz. Boyut/rotasyon/sayfa değişince koordinat katmanı yenilenir.

Sayfanın %80'ini kapsayan raster `pageRaster` olarak işaretlenir; gizli OCR metin katmanı bulunan taramalar da bu kapsamdadır. Liste/crop için `pageRasterData` beyaz zeminde özgün sayfa çiziminden üretilir; dijital foreground metni varsa bağımsız image PNG'si composite ile değiştirilmez; stencil/Decode taramalarında siyah maske kopyası gösterilmez. Tam raster normal tıklama hedefi değildir; açık görsel listesinden ayrıca seçilebilir. “Taramadan görsel alanı seç” kaynak PNG'den canonical PDF koordinatlarına göre crop üretir. Scan removal yalnızca seçilen dikdörtgeni temizler; ayrı image overlay normal eklemedir. Önceki kaldırmalarla kesişen crop reddedilir. Async crop sonucu kaynak/viewport değiştiğinde uygulanmaz. OCR paragrafları tek edit hedefi olmaya devam eder, hitbox'lar her satır rect'ine ayrı oturur.

Metin seçildiğinde ToolPanel portal kullanmaz; Workspace'in gerçek sağ sütunundadır. Belge bilgisi paneli aynı anda gösterilmez. 760 px altında metin paneli sayfanın altında yer alır; sayfa üstünü kaplamaz. Diğer nesnelerin bağlamsal çubuğu korunur.

Önizleme zamanlaması: `useNativeContent.pending` güncel removal/image değişiklikleri motor tarafından hazırlanıp açılana kadar ekleme çizimini gizler. PdfCanvas da proxy'nin canvas render'ı tamamlanana kadar overlay stack'i gizler; bileşenleri kaldırmaz. Böylece eski raster metni ve yeni metin kısa süre üst üste gösterilmez, gesture durumu korunur. Küçük resimler aynı pending kuralını uygular. Preview hatasında eklemeler gizli kalır ve undo uyarısı görünür; kaynak dosya korunur. Revizyon 6 tarama ekran görüntüsü, source render tamamlandıktan sonra tekrar incelendi: eski metin gerçekten temizlenmiş, komşu satır korunmuştur.

### Revizyon 7 — alan OCR ve oturum fontları

`ocrOptions` analiz düzeni, yön, kontrast ve arka plan tercihini taşır. `ocr.ts` kaynak PDF koordinatlarında alanı alır, seçilen yönün viewport'una çevirir ve yalnızca crop canvas'ını render eder. Tam sayfa 4.1667×, alan 6× üst ölçek; 12 MP/10000 px sınırı vardır. Dört yöndeki kutular ve yazı baseline yönü tekrar kaynak PDF koordinatlarına çevrilir. Orijinal RGBA kâğıt örneklemesi için tutulur; histogram/grayscale kontrast kopyası yalnızca OCR'ye gider.

Worker AUTO/SINGLE_BLOCK/SPARSE_TEXT ve adaptive threshold ile tur+eng yerel modelleri çalıştırır; kelime/confidence/bbox dahil layout döner. `ocrLayout` üç seçim ayrıntısını üretir, `useOcr` bunlar arasında yeniden tanımadan geçer. Paragraf hitRects satırları, removal.rects kelimeleri kapsar; boş alanlar ve sütun araları silinmez. Düşük güvenli hedefler görsel olarak işaretlenir. Seçili alanın sonuçlarını birleştirme ve tanınamayan dikdörtgeni elle yeniden yazma alternatifleri vardır. Önceki removal'lar ile kesişen hedefler gerçek silme rect'lerine göre filtrelenir.

`fillColors` yalnızca scan removal'a eklenir. Parlak perimeter örnekleri mürekkep/çizgileri azaltarak düz kâğıt RGB'sini tahmin eder; motor raster temizleme sonrası aynı rect'lere RGB dolgusu ekler. Kaynak Contents q/Q içine alınır, patch özgün PDF koordinatlarında çalışır. Bu doku inpainting veya tablo çizgisi restorasyonu değildir.

`sessionFonts` cihaz API'si veya TTF/OTF picker'dan gerçek font byte'larını alır, fontkit ile imza/metadata/gömme izinlerini doğrular. Aile/varyantlar ve FontFace tab belleğinde kalır; CSS aile adı rastgele güvenli id'dir. Times New Roman/Arial/Georgia sistem seçeneği, desteklenmeyen tarayıcıda dosya içe aktarma alternatifi sunar. Model string font id taşır; SVG/canvas ve export aynı varyantı kullanır. pdf-lib gerçek fontu alt küme olarak gömer; eksik varyantta sahte stil üretilmez. Proprietary font dosyaları uygulama dağıtımına dahil değildir.

### Revizyon 8 — kapatılabilir araç alanı ve taşınabilir popup

Workspace, düzenleme araçlarının görünümünü belge verisinden ayrı `editingToolsHidden` state'inde tutar. Kapatma OCR'yi iptal edip seçim modlarından çıkar; sonuçları ve geçmişi değiştirmez. OCR hitbox'ları gizlenir, gömülü görsellerin doğrudan seçimi korunur. Üst toolbar yeniden açmayı sağlar; dosya/sayfa değişince görünüm sıfırlanır.

ToolPanel'deki Pointer Events tutamacı popup konumunu yalnızca UI belleğinde saklar. Pointer capture sürüklemeyi pencere dışına çıkarken sürdürür; cancel/lost capture gesture'ı temizler. Elle konum aynı seçimin güncellemeleri boyunca korunur, yeni seçim/araçta otomatik yerleşime dönülür. Viewport/ölçü değişimlerinde konum clamp edilir; klavye hareketi nesne olaylarına yayılmaz. Metin paneli gerçek sağ sütunda kalır. Marka adı/logo yoktur; dahili font adları yalnızca teknik id'dir.
