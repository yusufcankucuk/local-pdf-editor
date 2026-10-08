# PDF editörü

Kişisel bilgi istemeyen, dosyaları cihazda işleyen yerel PDF editörü. Belge görüntüleme, sayfa işlemleri, metin/görsel düzenleme ve yerel OCR içerir.

## Çalıştırma

Node.js **22.13 veya üzeri** (24 önerilir) ve npm gerekir.

```sh
npm ci
npm run dev
```

Terminalde yazan yerel adresi açın (varsayılan `http://127.0.0.1:5173`). Başlangıçta uygulamayla gelen üç sayfalık örnek PDF görünür. “PDF aç” düğmesi veya sürükle-bırak ile kendi belgenizi açabilirsiniz.

```sh
npm test          # Dosya kabulü ve rotasyon kontrolü
npm run build    # TypeScript kontrolü + üretim çıktısı
npm run preview  # dist/ çıktısını yerelde görüntüleme
```

İlk npm kurulumu paket indirmek için internet kullanır. Kurulum sonrasında geliştirme sunucusu ve belge işlemleri internet gerektirmez. `npm ci`, PDF.js'in font, cmap ve wasm dosyalarını yerel `public/pdf-assets/` klasörüne kopyalar. Worker derlemeye dahil edilir. Üretim çıktısı `dist/` klasöründedir; bir yerel statik HTTP sunucusu ile çalıştırılır, `file://` üzerinden açılması desteklenmez.

## Bu sürümde çalışanlar

PDF açma (100 MB'a kadar), şifreli belgeleri salt okunur görüntüleme, metin seçme/arama, içindekiler gezinmesi, zoom ve sayfa küçük resimleri.

Sayfa döndürme/taşıma/çoğaltma/silme, boş sayfa, birleştirme/çıkarma, undo/redo ve düzenlenmiş PDF indirme. Metin, vurgu, şekil, çizim, PNG/JPEG ve görsel imza eklenebilir. Metin aracını seçip sayfaya tıklayın; sağdaki panelden metni, yerel veya cihazdan yüklenen yazı tipini, boyutu ve rengi düzenleyin. Eklemeler taşınır, kopyalanır ve silinir. Temel PDF formları doldurulur ve çıktıda sabitlenir. Yazdırma görünümü yerel PDF sekmesi açar.

Orijinal dosya korunur. Gömülü görsellere doğrudan tıklayın; mevcut yatay paragraflar için “PDF içeriğini düzenle” aracını seçin. Paragraf yerel Noto fontuyla yeniden yazılır; görsel taşınır, boyutlandırılır, değiştirilir veya silinir. Saydamlığı ayarlanabilir. Kalın/eğik metin desteklenir. Dikdörtgen/elips/üçgen/çizgi/ok ayrı ikonlardan seçilip çizilir. Eklemeleri öne/arkaya alın; seçili nesneyi ok tuşlarıyla 1, Shift+ok ile 10 PDF birimi taşıyın. Vurgu, şekil ve görseller köşelerinden boyutlandırılır. Türkçe/İngilizce yerel OCR ile taranmış baskı metni düzenlenebilir. Güvenli karartma ürünü ve sertifikalı dijital imza desteklenmez. Döndürülmüş ve aynalanmış görseller saydamlıkları korunarak düzenlenir. Üst üste gelen gömülü görseller ayrı nesneler olarak düzenlenir. Satır içi (inline) görseller, desen içindeki görseller ve vektör çizimleri henüz ayrı görsel olarak düzenlenmez. Belge içindekileri dışa aktarılan dosyada korunmaz.

## Gizlilik

Backend, hesap sistemi, analitik, CDN veya harici font yoktur. Seçilen PDF ve dosya adı yalnızca tarayıcı belleğinde tutulur. Sayfa yenileme oturumu bitirir. Service worker ve çevrimdışı yeniden başlatma desteği henüz eklenmedi; yerel HTTP sunucusu internet olmadan kullanılabilir.

## Geliştiriciler ve agentlar

- [Agent rehberi](AGENTS.md): çalışma ve gizlilik kuralları
- [Devir notu](docs/HANDOFF.md): güncel durum, doğrulama ve devam noktası
- [Mimari](docs/ARCHITECTURE.md): katmanlar, veri akışı ve kararlar
- [Tasarım](docs/DESIGN.md): görsel kimlik ve etkileşim ilkeleri
- [Yol haritası](docs/ROADMAP.md): geliştirme aşamaları ve kabul kriterleri

Örnek belge projeye özgü bir tasarım örneğidir. Yeniden üretmek için `python3 scripts/create-demo.py` çalıştırın; harici kütüphane gerekmez.

## Tarayıcı doğrulaması

İsteğe bağlı `playwright-cli` kuruluysa, geliştirme veya preview sunucusu açıkken:

```sh
mkdir -p artifacts
playwright-cli -s=pdf-editor open http://127.0.0.1:5173 --browser=chrome
playwright-cli -s=pdf-editor run-code --filename=tests/browser-smoke.js
playwright-cli -s=pdf-editor close
```

Kontrol; gerçek PDF çizimi, sayfa/zoom/döndürme, dosya indirme, geçersiz/bozuk dosya hataları ve şifreli belge akışı, mevcut belgeyi koruma, klavye gezinme, 320 ve 390 px görünüm ve cihaz dışına ağ isteği yapılmamasını kapsar. `artifacts/` altında ekran görüntüleri ve indirilen orijinal PDF oluşur. Şifreli test dosyası yalnızca uyumluluk örneğidir; şifresi `test` ve gerçek kullanıcı verisi içermez.

`tests/browser-smoke.js`, CLI'nin beklediği tek bir fonksiyon ifadesidir; modül olarak import edilmez ve sonunda noktalı virgül bulunmamalıdır.

Bağlamsal düzenleme testi: `playwright-cli -s=pdf-editor run-code --filename=tests/browser-context-tools.js`. Diğer akışlar `tests/browser-pages.js`, `tests/browser-annotations.js`, `tests/browser-navigation-forms.js` içindedir.

MuPDF içerik motoru yerel Web Worker içinde çalışır; AGPL-3.0-or-later lisans koşulları için [bağımlılıklar](docs/DEPENDENCIES.md) dosyasını okuyun. Yeni akışlar `tests/browser-revision-three.js`, `tests/browser-native-images.js` ve `tests/browser-image-tools.js` ve `tests/browser-ocr-paragraphs.js` ile kontrol edilir.

## Taranmış metin ve PDF içeriği

- “Taranmış yazıyı tanı” açık sayfayı cihaz içinde Türkçe + İngilizce OCR ile okur. Dil modelleri ve WASM uygulamayla gelir; CDN isteği yapılmaz. İlerleme ve iptal kontrolü vardır.
- Bulunan paragrafı seçin, metni kontrol edip düzeltin. Yazı tipi/boyutu, paragraf genişliği ve satır aralığı sağdaki metin panelinden değişir. Değiştirilen satırların eski raster pikselleri kaldırılır; sayfanın kalanı korunur. Tanıma tek başına belgeyi değiştirmez; yalnızca düzenlenen bloklar çıktıda gerçek metne dönüşür.
- Dijital PDF'de “PDF içeriğini düzenle” metni satır satır yerine hizalama, stil ve satır aralığına göre paragraf olarak seçer. Kaynakta paragraf anlamı bulunmadığından karmaşık sütunlar/tablolar yanlış gruplanabilir. Orijinal gömülü font yerine yerel Noto fontu kullanılır.
- “PDF görsellerini göster” sayfanın gömülü görsellerini önizlemelerle listeler. Görseli seçip taşıyın, boyutlandırın, değiştirin veya silin. Taramadaki fotoğraf için “Taramadan görsel alanı seç” ile çevresini sürükleyin; seçilen alan taşınır, boyutlandırılır ve silinir. Önceki düzenlemeyle kesişen bir alan tekrar kesilemez.

OCR baskı metni için tasarlanmıştır; yan taramalarda 90° adımlı yön seçilebilir. El yazısı, küçük açıyla eğik yazı ve bulanık taramalarda doğru sonuç garanti edilmez. Yazı tanıma orijinal sayfada çalışır; daha önce kaldırılan alanlar tekrar seçime sunulmaz. Sayfaya döndüğünüzde gerekirse tanımayı yeniden çalıştırın. Kâğıt rengini koru seçeneği düz zeminin rengini yaklaşık doldurur; desen/gölge ve kesişen tablo çizgilerini onarmaz. Bu işlem güvenli karartma ürünü olarak sunulmaz. Tanınan metnin kaynak aramasına eklenmesi henüz yoktur; düzenlenen metin çıktıyı yeniden açınca aranabilir.

Gömülü görsel yalnızca seçildiğinde kaynak çizimi değişmez. Boyutlandırma/değiştirme özgün çizim sırasını korur; arka plandaki görsel öndeki yazıları kapatmaz. Kaynak görsellerin katman sırası sabittir; kopyaları normal ekleme olur. Kaynak clip sınırları korunur, bazı kırpılmış görseller taşındığında bu sınırlar görünür alanı daraltabilir. Metin paneli dar ekranda sayfanın altında yer alır. Yeni regresyon kontrolü: `tests/browser-revision-six.js`.

### Staj defteri ve tablolu taramalar

“Yazı alanını seç” ile yalnızca düzeltilecek hücre veya cümlenin çevresini sürükleyin. “Tek paragraf / hücre” düzenini, dağınık alanlarda “Tablo / dağınık yazı” seçeneğini deneyin. Alan daha yüksek çözünürlükte yerel olarak tanınır. “Seçim birimi”nden Kelime, Satır veya Paragraf seçin; metne tıklayıp sağ panelde düzeltin. Ayarı değiştirdikten sonra “Alanı yeniden tanı” kullanılabilir. Yan taranmış sayfa için Yazı yönünü ayarlayın.

“Seçili alanı birlikte düzenle” tanınan blokları bir metne toplar. OCR okuyamıyorsa “Alanı elle yaz” seçilen dikdörtgeni temizleyip yeni metin oluşturur; tablo çizgileri, görseller ve imzaları bu seçimin dışında bırakın. Sarı çerçeveli sonuçlar düşük güvenlidir; metni kontrol edin. El yazısı ve çok bulanık taramalarda doğruluk garantisi yoktur.

Metin panelindeki “Times New Roman · cihazdan”, “Arial · cihazdan”, “Georgia · cihazdan” seçenekleri tarayıcının yerel font erişimiyle çalışır. Tarayıcı font erişim izni isteyebilir ve font cihazda kurulu olmalıdır. Alternatif “Font dosyası ekle” ile TTF/OTF dosyalarını yükleyin; kalın/eğik için ilgili varyantları da seçin. Gerçek font çıktıya gömülür; fontlar yalnızca açık sekmenin belleğinde kalır ve uygulama bu proprietary fontları dağıtmaz. Kısıtlı gömme izni bulunan fontlar reddedilir.

Yeni kontroller: `tests/browser-notebook-ocr.js`, `tests/browser-system-fonts.js`, `tests/browser-ocr-orientation.js`. Sentetik örnekler `node scripts/create-notebook-fixture.mjs` ile üretilir.

### Araçları kapatma ve pencereyi taşıma

Eflatun alanın sağındaki X, düzenleme araçlarını ve OCR seçim kutularını gizler; çalışan tanımayı iptal eder. Belgedeki değişiklikler korunur. Üst çubuktaki “Düzenleme araçlarını göster” veya “PDF içeriğini düzenle” ile tekrar açın.

Görsel ve diğer nesnelerin araç penceresindeki noktalı tutamacı sürükleyerek pencereyi taşıyın. Tutamaç odaktayken ok tuşları 10 px, Shift+ok 20 px taşır; nesne hareket etmez. Aynı nesnenin ayarları değişirken pencere yerini korur. Metin paneli sağ tarafta sabittir.

## GitHub'a gönderme

Yerel depo `main` dalındadır. Kaynaklar ve sentetik test dosyaları sürüm kontrolüne alınır; belgeler, test indirmeleri, cihaz fontları, kurulum/derleme çıktıları ve yerel ayarlar depoya eklenmez. GitHub'da boş bir repo oluşturduktan sonra kendi adresinizle:

```sh
git remote add origin https://github.com/KULLANICI/REPO.git
git push -u origin main
```

GitHub Actions push/PR üzerinde Node 24 ile `npm ci`, `npm test`, `npm run build` çalıştırır. Tarayıcı testleri yerel sunucu ve Playwright CLI ile ayrıca çalıştırılır; cihaz fontu testleri ilgili fontların kurulu olmasını gerektirir. Dağıtım lisansları için [bağımlılık notlarını](docs/DEPENDENCIES.md) okuyun.
